"""Audio-feature based incremental diarizer.

Replaces the keyword-only ``IncrementalDiarizer`` for speaker-id assignment.
Uses Resemblyzer's pretrained speaker-embedding network to extract a
256-dim L2-normalised vector per audio slice, then maintains running
speaker centroids per session in Redis. Online clustering: a new slice
is matched to the most-similar existing centroid via cosine similarity;
if no centroid is close enough, a new speaker is created.

Role assignment (DOCTOR / PATIENT / UNKNOWN) is still derived from the
Spanish keyword indicators in :class:`IncrementalDiarizer` — that logic
is orthogonal and we reuse it directly.

Why this matters: the keyword-only diarizer can't tell two different
doctors apart, fails when both speakers say similar things, and never
fires a speaker_changed event in Spanish consultations where the doctor
mostly listens. Audio embeddings work even on overlapping vocabularies.

Cost / latency: ~30 ms per slice on CPU after model warm-up.
Resemblyzer's pretrained encoder is bundled in the wheel — no auth, no
download at runtime.
"""
from __future__ import annotations

import time
from typing import List, Optional, Tuple

import numpy as np
import structlog

from src.transcription.diarization.incremental_diarizer import IncrementalDiarizer
from src.transcription.diarization.models import (
    ConsultationContext,
    IncrementalDiarizationResult,
    Speaker,
    SpeakerChangeEvent,
    SpeakerRole,
    SpeakerState,
)

logger = structlog.get_logger()


# Cosine similarity threshold for "this slice is the same speaker as
# centroid X". Resemblyzer embeddings on clearly-different voices
# typically score < 0.6; same speaker scores > 0.75. 0.70 is a safe
# middle ground; tune via logged similarities after real sessions.
DEFAULT_SAME_SPEAKER_THRESHOLD = 0.70

# Max speakers we'll auto-create per session. Beyond this, we re-use the
# closest existing centroid even if below threshold (a third unknown
# voice is rare in a consultation; better to merge into an existing
# bucket than to spawn endless SPEAKER_N ids).
DEFAULT_MAX_SPEAKERS = 4

# EMA factor for centroid updates. New embedding contributes (1 - alpha);
# higher alpha = slower drift.
DEFAULT_CENTROID_EMA = 0.7

# Below this many samples the embedding network produces noisy output.
# At 16 kHz, 16000 samples = 1.0 s. Skip the embedding step on very
# short slices and fall back to keyword-only detection.
MIN_SAMPLES_FOR_EMBEDDING = 16000


class AudioFeatureDiarizer(IncrementalDiarizer):
    """Speaker-aware diarizer using Resemblyzer embeddings."""

    def __init__(
        self,
        redis_client,
        event_callback=None,
        same_speaker_threshold: float = DEFAULT_SAME_SPEAKER_THRESHOLD,
        max_speakers: int = DEFAULT_MAX_SPEAKERS,
        centroid_ema: float = DEFAULT_CENTROID_EMA,
    ):
        super().__init__(redis_client=redis_client, event_callback=event_callback)
        self.same_speaker_threshold = same_speaker_threshold
        self.max_speakers = max_speakers
        self.centroid_ema = centroid_ema
        self._encoder = None  # lazy-loaded; warm at startup if you can

    def _get_encoder(self):
        """Lazily import + cache the Resemblyzer encoder.

        Lazy because the import touches torch/numba and we don't want
        every test that imports this module to pay that cost.
        """
        if self._encoder is None:
            from resemblyzer import VoiceEncoder

            self._encoder = VoiceEncoder(verbose=False)
            logger.info("AudioFeatureDiarizer encoder loaded")
        return self._encoder

    async def process_chunk(  # type: ignore[override]
        self,
        transcript_text: str,
        timestamp: float,
        session_id: str,
        context: Optional[ConsultationContext] = None,
        audio_samples: Optional[np.ndarray] = None,
    ) -> IncrementalDiarizationResult:
        """Process one slice and update per-session speaker state.

        Args:
            transcript_text: text the slice transcribed to (for keyword role).
            timestamp: slice start in seconds.
            session_id: WS session id.
            context: optional consultation hints (unused here).
            audio_samples: 16 kHz mono float32 numpy array of the slice.
                If absent or too short, we fall back to keyword-only
                detection (the parent class's behaviour).
        """
        start_time = time.time()

        state = await self._load_state(session_id)
        if state is None:
            state = SpeakerState(
                session_id=session_id,
                current_speaker_id="SPEAKER_0",
                speakers={"SPEAKER_0": Speaker(id="SPEAKER_0", role=SpeakerRole.UNKNOWN)},
                role_indicators={"SPEAKER_0": {"doctor": 0, "patient": 0}},
            )

        previous_speaker = state.current_speaker_id

        if audio_samples is not None and len(audio_samples) >= MIN_SAMPLES_FOR_EMBEDDING:
            detected_speaker, similarity = self._assign_speaker_from_audio(
                state, audio_samples
            )
            method = "audio"
        else:
            # Fallback when audio isn't passed (e.g. caller is the
            # text-only legacy path). Keyword detection below.
            detected_speaker = self._detect_current_speaker(transcript_text, state)
            similarity = 0.0
            method = "keyword"

        speaker_changed = detected_speaker != previous_speaker
        if speaker_changed:
            logger.info(
                "Speaker change detected",
                session_id=session_id,
                previous=previous_speaker,
                new=detected_speaker,
                method=method,
                similarity=round(similarity, 3),
                chunk_index=state.total_chunks_processed,
            )
            state.current_speaker_id = detected_speaker
            state.last_speaker_change_time = timestamp
            state.speaker_history.append(detected_speaker)

        if detected_speaker not in state.role_indicators:
            state.role_indicators[detected_speaker] = {"doctor": 0, "patient": 0}
        if detected_speaker not in state.speakers:
            state.speakers[detected_speaker] = Speaker(
                id=detected_speaker, role=SpeakerRole.UNKNOWN
            )

        self._update_role_indicators(state, detected_speaker, transcript_text)
        current_role, current_confidence = self._calculate_role_confidence(
            state, detected_speaker
        )
        state.speakers[detected_speaker].role = current_role
        state.speakers[detected_speaker].confidence = current_confidence
        state.speakers[detected_speaker].last_seen_at = timestamp
        state.speakers[detected_speaker].total_speech_duration += 5.0

        if current_confidence >= self.CONFIDENCE_THRESHOLD_HIGH:
            state.confidence_threshold_met = True

        state.total_chunks_processed += 1

        await self._save_state(state)

        if speaker_changed and self.event_callback:
            event = SpeakerChangeEvent(
                previous_speaker_id=previous_speaker,
                new_speaker_id=detected_speaker,
                new_speaker_role=current_role,
                confidence=current_confidence,
                timestamp=timestamp,
            )
            await self.event_callback(event)

        processing_time_ms = (time.time() - start_time) * 1000
        return IncrementalDiarizationResult(
            chunk_index=state.total_chunks_processed - 1,
            speaker_id=detected_speaker,
            speaker_changed=speaker_changed,
            role=current_role,
            role_confidence=current_confidence,
            processing_time_ms=processing_time_ms,
            total_speakers_detected=len(state.speakers),
            session_duration_seconds=timestamp,
        )

    def _assign_speaker_from_audio(
        self, state: SpeakerState, audio_samples: np.ndarray
    ) -> Tuple[str, float]:
        """Embed the slice; match to closest centroid or create new speaker.

        Returns (speaker_id, similarity_to_chosen_centroid).
        """
        encoder = self._get_encoder()
        try:
            embedding = encoder.embed_utterance(audio_samples.astype(np.float32))
        except Exception:
            logger.exception("Embedding failed; falling back to current speaker")
            return state.current_speaker_id, 0.0

        new_emb = np.asarray(embedding, dtype=np.float32)

        # Bootstrap: the WS handler seeds SPEAKER_0 (no embedding yet) on
        # first connect. The very first audio chunk should attach its
        # embedding to that seeded speaker rather than spawn SPEAKER_1.
        # In general, if any existing speaker has no centroid yet, attach
        # this chunk's embedding there before considering "is this a new
        # voice?" — otherwise the first chunk always looks like a new voice.
        for sid, sp in state.speakers.items():
            if not state.speaker_embeddings.get(sid):
                state.speaker_embeddings[sid] = new_emb.tolist()
                return sid, 1.0

        # Cosine similarity against every existing centroid.
        best_id: Optional[str] = None
        best_sim = -1.0
        for sid, centroid_list in state.speaker_embeddings.items():
            if not centroid_list:
                continue
            centroid = np.asarray(centroid_list, dtype=np.float32)
            sim = _cosine(new_emb, centroid)
            if sim > best_sim:
                best_sim = sim
                best_id = sid

        if best_id is not None and best_sim >= self.same_speaker_threshold:
            # Match — update centroid via EMA.
            old = np.asarray(state.speaker_embeddings[best_id], dtype=np.float32)
            updated = self.centroid_ema * old + (1.0 - self.centroid_ema) * new_emb
            # Renormalize to keep cosine geometry consistent.
            n = float(np.linalg.norm(updated))
            if n > 0:
                updated = updated / n
            state.speaker_embeddings[best_id] = updated.tolist()
            return best_id, float(best_sim)

        # No close match.
        if len(state.speakers) >= self.max_speakers and best_id is not None:
            # Cap reached — merge into the closest existing speaker.
            return best_id, float(best_sim if best_sim > 0 else 0.0)

        # Spawn a new speaker id (SPEAKER_N where N is the next index).
        existing_ids = sorted(state.speakers.keys())
        idx = 0
        while f"SPEAKER_{idx}" in state.speakers:
            idx += 1
        new_id = f"SPEAKER_{idx}"
        state.speakers[new_id] = Speaker(id=new_id, role=SpeakerRole.UNKNOWN)
        state.role_indicators[new_id] = {"doctor": 0, "patient": 0}
        state.speaker_embeddings[new_id] = new_emb.tolist()
        return new_id, 1.0


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity for two 1-D float arrays."""
    if a.size == 0 or b.size == 0 or a.shape != b.shape:
        return 0.0
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))
