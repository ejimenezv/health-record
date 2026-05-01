import time
from typing import Optional, Tuple

import structlog

from src.transcription.diarization.base import BaseIncrementalDiarizer
from src.transcription.diarization.models import (
    ConsultationContext,
    IncrementalDiarizationResult,
    Speaker,
    SpeakerChangeEvent,
    SpeakerRole,
    SpeakerState,
)

logger = structlog.get_logger()


class IncrementalDiarizer(BaseIncrementalDiarizer):
    MIN_SILENCE_FOR_TURN_MS = 1500
    CONFIDENCE_THRESHOLD_HIGH = 0.85
    CONFIDENCE_THRESHOLD_MED = 0.70
    MIN_CHUNKS_FOR_LLM_VALIDATION = 6

    DOCTOR_INDICATORS = [
        "diagnóstico", "receto", "prescrib", "medicamento", "dosis",
        "tratamiento", "examen", "análisis", "radiografía", "resonancia",
        "voy a recetarle", "debe tomar", "le recomiendo", "tiene que",
        "¿desde cuándo", "¿cómo se siente", "¿tiene algún",
        "miligramos", "cada 8 horas", "cada 12 horas", "mg", "ml",
        "vía oral", "intravenoso", "subcutáneo",
    ]

    PATIENT_INDICATORS = [
        "me duele", "tengo dolor", "siento", "me siento",
        "no puedo", "me cuesta", "desde hace", "empecé a",
        "molestia", "malestar", "síntoma", "preocupa",
        "gracias doctor", "muchas gracias", "me encuentro",
    ]

    def __init__(self, redis_client, event_callback=None):
        self.redis = redis_client
        self.event_callback = event_callback

    async def process_chunk(
        self,
        transcript_text: str,
        timestamp: float,
        session_id: str,
        context: Optional[ConsultationContext] = None,
    ) -> IncrementalDiarizationResult:
        start_time = time.time()

        state = await self._load_state(session_id)
        if state is None:
            state = SpeakerState(
                session_id=session_id,
                current_speaker_id="SPEAKER_0",
                speakers={
                    "SPEAKER_0": Speaker(id="SPEAKER_0", role=SpeakerRole.UNKNOWN),
                    "SPEAKER_1": Speaker(id="SPEAKER_1", role=SpeakerRole.UNKNOWN),
                },
                role_indicators={
                    "SPEAKER_0": {"doctor": 0, "patient": 0},
                    "SPEAKER_1": {"doctor": 0, "patient": 0},
                },
            )

        previous_speaker = state.current_speaker_id
        detected_speaker = self._detect_current_speaker(transcript_text, state)
        speaker_changed = detected_speaker != previous_speaker

        if speaker_changed:
            logger.info(
                "Speaker change detected",
                session_id=session_id,
                previous=previous_speaker,
                new=detected_speaker,
                chunk_index=state.total_chunks_processed,
            )
            state.current_speaker_id = detected_speaker
            state.last_speaker_change_time = timestamp
            state.speaker_history.append(detected_speaker)

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

        logger.info(
            "Incremental diarization processed",
            session_id=session_id,
            speaker=detected_speaker,
            role=current_role.value,
            confidence=round(current_confidence, 2),
            speaker_changed=speaker_changed,
            processing_ms=round(processing_time_ms, 1),
        )

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

    def _detect_current_speaker(self, text: str, state: SpeakerState) -> str:
        text_lower = text.lower()
        doctor_count = sum(1 for ind in self.DOCTOR_INDICATORS if ind in text_lower)
        patient_count = sum(1 for ind in self.PATIENT_INDICATORS if ind in text_lower)

        if doctor_count >= 2:
            return self._get_most_likely_speaker(state, SpeakerRole.DOCTOR)
        if patient_count >= 2:
            return self._get_most_likely_speaker(state, SpeakerRole.PATIENT)
        return state.current_speaker_id

    def _get_most_likely_speaker(
        self, state: SpeakerState, target_role: SpeakerRole
    ) -> str:
        for speaker_id, speaker in state.speakers.items():
            if speaker.role == target_role and speaker.confidence > 0.6:
                return speaker_id

        opposite = (
            SpeakerRole.PATIENT if target_role == SpeakerRole.DOCTOR else SpeakerRole.DOCTOR
        )
        candidates = [
            sid
            for sid, sp in state.speakers.items()
            if not (sp.role == opposite and sp.confidence > 0.6)
        ] or list(state.speakers.keys())

        role_key = "doctor" if target_role == SpeakerRole.DOCTOR else "patient"
        best_speaker = None
        best_score = -1
        for sid in candidates:
            score = state.role_indicators.get(sid, {}).get(role_key, 0)
            if score > best_score:
                best_score = score
                best_speaker = sid

        if best_speaker is None:
            return "SPEAKER_1" if state.current_speaker_id == "SPEAKER_0" else "SPEAKER_0"
        return best_speaker

    def _update_role_indicators(
        self, state: SpeakerState, speaker_id: str, text: str
    ) -> None:
        text_lower = text.lower()
        if speaker_id not in state.role_indicators:
            state.role_indicators[speaker_id] = {"doctor": 0, "patient": 0}

        for indicator in self.DOCTOR_INDICATORS:
            if indicator in text_lower:
                state.role_indicators[speaker_id]["doctor"] += 1

        for indicator in self.PATIENT_INDICATORS:
            if indicator in text_lower:
                state.role_indicators[speaker_id]["patient"] += 1

    def _calculate_role_confidence(
        self, state: SpeakerState, speaker_id: str
    ) -> Tuple[SpeakerRole, float]:
        indicators = state.role_indicators.get(speaker_id, {"doctor": 0, "patient": 0})
        doctor_score = indicators["doctor"]
        patient_score = indicators["patient"]
        total = doctor_score + patient_score

        if total == 0:
            if speaker_id == "SPEAKER_0":
                return SpeakerRole.DOCTOR, 0.5
            return SpeakerRole.PATIENT, 0.5

        if doctor_score > patient_score:
            role = SpeakerRole.DOCTOR
            confidence = doctor_score / total
        else:
            role = SpeakerRole.PATIENT
            confidence = patient_score / total

        if total >= 10:
            confidence = min(confidence + 0.1, 1.0)
        if total >= 20:
            confidence = min(confidence + 0.1, 1.0)

        return role, confidence

    async def get_speaker_state(self, session_id: str) -> Optional[SpeakerState]:
        return await self._load_state(session_id)

    async def finalize_session(self, session_id: str) -> SpeakerState:
        state = await self._load_state(session_id)
        if state is None:
            raise ValueError(f"No speaker state found for session {session_id}")

        speaker_ids = list(state.speakers.keys())
        if len(speaker_ids) >= 2:
            s0_role = state.speakers[speaker_ids[0]].role
            s1_role = state.speakers[speaker_ids[1]].role

            if s0_role == SpeakerRole.DOCTOR and s1_role == SpeakerRole.UNKNOWN:
                state.speakers[speaker_ids[1]].role = SpeakerRole.PATIENT
                state.speakers[speaker_ids[1]].confidence = 0.7

            if s0_role == SpeakerRole.PATIENT and s1_role == SpeakerRole.UNKNOWN:
                state.speakers[speaker_ids[1]].role = SpeakerRole.DOCTOR
                state.speakers[speaker_ids[1]].confidence = 0.7

        logger.info(
            "Session diarization finalized",
            session_id=session_id,
            total_chunks=state.total_chunks_processed,
            speakers={k: v.role.value for k, v in state.speakers.items()},
            confidence={k: round(v.confidence, 2) for k, v in state.speakers.items()},
        )

        return state

    async def _load_state(self, session_id: str) -> Optional[SpeakerState]:
        key = f"speaker_state:{session_id}"
        data = await self.redis.get(key)
        if data:
            return SpeakerState.model_validate_json(data)
        return None

    async def _save_state(self, state: SpeakerState) -> None:
        key = f"speaker_state:{state.session_id}"
        await self.redis.setex(key, 7200, state.model_dump_json())
