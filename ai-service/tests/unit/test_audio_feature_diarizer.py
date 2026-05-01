"""Tests for the audio-feature diarizer.

The Resemblyzer encoder is expensive to load; we replace it with a fake
that returns canned embeddings keyed off a "voice tag" we attach to
audio arrays (so two slices from the same fake speaker produce the same
embedding). Redis is faked in-memory.
"""
from __future__ import annotations

from typing import Dict
from unittest.mock import AsyncMock

import numpy as np
import pytest

from src.transcription.diarization.audio_feature_diarizer import (
    AudioFeatureDiarizer,
    _cosine,
)


# ─── Helpers ────────────────────────────────────────────────────


class FakeRedis:
    """Minimal async Redis stand-in: dict-backed get/setex."""

    def __init__(self):
        self._kv: Dict[str, str] = {}

    async def get(self, key):
        v = self._kv.get(key)
        return v.encode() if isinstance(v, str) else v

    async def setex(self, key, _ttl, value):
        if isinstance(value, bytes):
            value = value.decode()
        self._kv[key] = value


class FakeEncoder:
    """Returns a pre-set embedding based on the array's first sample.

    By convention in tests we encode the speaker tag in the *first
    sample* of the audio array (e.g. samples[0]=1.0 means voice A,
    samples[0]=2.0 means voice B). The encoder produces orthogonal
    base vectors per tag with tiny noise so successive calls are not
    bit-identical (mirrors real Resemblyzer behaviour).
    """

    def __init__(self):
        self._counter = 0

    def embed_utterance(self, samples: np.ndarray) -> np.ndarray:
        tag = int(round(float(samples[0])))
        base = np.zeros(8, dtype=np.float32)
        idx = (tag - 1) % 8
        base[idx] = 1.0
        # Add a tiny per-call wobble so consecutive calls differ slightly.
        self._counter += 1
        wobble = np.zeros(8, dtype=np.float32)
        wobble[(idx + 1) % 8] = 0.01 * (self._counter % 5)
        v = base + wobble
        v /= np.linalg.norm(v)
        return v


def _voice(tag: int, duration_sec: float = 2.0) -> np.ndarray:
    """1.0/tag-second mono float32 audio. First sample encodes tag."""
    n = int(duration_sec * 16000)
    arr = np.zeros(n, dtype=np.float32)
    arr[0] = float(tag)
    return arr


@pytest.fixture
def diarizer():
    d = AudioFeatureDiarizer(redis_client=FakeRedis(), event_callback=AsyncMock())
    d._encoder = FakeEncoder()
    return d


# ─── Tests ──────────────────────────────────────────────────────


class TestCosineHelper:
    def test_orthogonal(self):
        assert _cosine(np.array([1, 0]), np.array([0, 1])) == pytest.approx(0.0)

    def test_identical(self):
        v = np.array([1.0, 2.0, 3.0])
        assert _cosine(v, v) == pytest.approx(1.0)

    def test_zero_returns_zero(self):
        assert _cosine(np.array([0, 0]), np.array([1, 1])) == 0.0


class TestSingleSpeaker:
    @pytest.mark.asyncio
    async def test_first_chunk_creates_speaker_zero(self, diarizer):
        result = await diarizer.process_chunk(
            transcript_text="hola doctor",
            timestamp=0.0,
            session_id="s1",
            audio_samples=_voice(1),
        )
        assert result.speaker_id == "SPEAKER_0"
        assert result.total_speakers_detected == 1
        assert not result.speaker_changed  # first chunk: no transition

    @pytest.mark.asyncio
    async def test_second_chunk_same_voice_no_change(self, diarizer):
        await diarizer.process_chunk(
            transcript_text="hola",
            timestamp=0.0,
            session_id="s1",
            audio_samples=_voice(1),
        )
        result = await diarizer.process_chunk(
            transcript_text="me duele la cabeza",
            timestamp=5.0,
            session_id="s1",
            audio_samples=_voice(1),
        )
        assert result.speaker_id == "SPEAKER_0"
        assert not result.speaker_changed
        assert result.total_speakers_detected == 1


class TestSpeakerChange:
    @pytest.mark.asyncio
    async def test_different_voice_creates_new_speaker(self, diarizer):
        await diarizer.process_chunk(
            transcript_text="¿desde cuándo le duele?",
            timestamp=0.0,
            session_id="s1",
            audio_samples=_voice(1),
        )
        result = await diarizer.process_chunk(
            transcript_text="me duele desde ayer",
            timestamp=5.0,
            session_id="s1",
            audio_samples=_voice(2),  # different voice tag
        )
        assert result.speaker_id != "SPEAKER_0"
        assert result.speaker_changed
        assert result.total_speakers_detected == 2
        # Event callback fired for the change.
        assert diarizer.event_callback.await_count == 1

    @pytest.mark.asyncio
    async def test_voice_returns_to_first_speaker(self, diarizer):
        await diarizer.process_chunk(
            transcript_text="a", timestamp=0.0, session_id="s1", audio_samples=_voice(1)
        )
        await diarizer.process_chunk(
            transcript_text="b", timestamp=5.0, session_id="s1", audio_samples=_voice(2)
        )
        result = await diarizer.process_chunk(
            transcript_text="c", timestamp=10.0, session_id="s1", audio_samples=_voice(1)
        )
        assert result.speaker_id == "SPEAKER_0"
        assert result.speaker_changed
        assert result.total_speakers_detected == 2  # didn't spawn a 3rd


class TestMaxSpeakersCap:
    @pytest.mark.asyncio
    async def test_cap_merges_into_closest(self, diarizer):
        diarizer.max_speakers = 2
        await diarizer.process_chunk(
            transcript_text="a", timestamp=0.0, session_id="s1", audio_samples=_voice(1)
        )
        await diarizer.process_chunk(
            transcript_text="b", timestamp=5.0, session_id="s1", audio_samples=_voice(2)
        )
        # Third distinct voice — should merge into closest existing speaker
        # rather than spawn SPEAKER_2.
        result = await diarizer.process_chunk(
            transcript_text="c",
            timestamp=10.0,
            session_id="s1",
            audio_samples=_voice(3),
        )
        assert result.total_speakers_detected == 2
        assert result.speaker_id in ("SPEAKER_0", "SPEAKER_1")


class TestFallbackToKeywordWhenNoAudio:
    @pytest.mark.asyncio
    async def test_no_audio_falls_back(self, diarizer):
        # Without audio, the audio path is skipped and parent's keyword
        # detection runs. With no DOCTOR/PATIENT cues in the text, it
        # stays on SPEAKER_0 and no event fires.
        result = await diarizer.process_chunk(
            transcript_text="hola",
            timestamp=0.0,
            session_id="s1",
            audio_samples=None,
        )
        assert result.speaker_id == "SPEAKER_0"
        assert not result.speaker_changed

    @pytest.mark.asyncio
    async def test_too_short_audio_falls_back(self, diarizer):
        # 0.5s of audio is below the 1s minimum; should fall back to
        # keyword detection rather than producing a noisy embedding.
        too_short = np.zeros(8000, dtype=np.float32)  # 0.5s @ 16kHz
        too_short[0] = 1.0
        result = await diarizer.process_chunk(
            transcript_text="hola",
            timestamp=0.0,
            session_id="s1",
            audio_samples=too_short,
        )
        assert result.speaker_id == "SPEAKER_0"


class TestRoleAssignment:
    @pytest.mark.asyncio
    async def test_doctor_keywords_assign_doctor_role(self, diarizer):
        # Multiple doctor indicators in the transcript — role should be DOCTOR.
        for i in range(3):
            await diarizer.process_chunk(
                transcript_text="le voy a recetar miligramos cada 8 horas",
                timestamp=i * 5.0,
                session_id="s1",
                audio_samples=_voice(1),
            )
        state = await diarizer.get_speaker_state("s1")
        assert state is not None
        assert state.speakers["SPEAKER_0"].role.value == "doctor"


class TestEmbeddingFailureDoesNotCrash:
    @pytest.mark.asyncio
    async def test_encoder_exception_keeps_current_speaker(self, diarizer):
        class BoomEncoder:
            def embed_utterance(self, x):
                raise RuntimeError("boom")

        diarizer._encoder = BoomEncoder()
        result = await diarizer.process_chunk(
            transcript_text="hola",
            timestamp=0.0,
            session_id="s1",
            audio_samples=_voice(1),
        )
        # Falls back to current_speaker (SPEAKER_0 by default state seed).
        assert result.speaker_id == "SPEAKER_0"
