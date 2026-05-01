"""Unit tests for Stream Processor."""
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest


@pytest.fixture(autouse=True)
def _stub_optional_deps():
    """Stub optional heavy deps so imports succeed without the packages installed."""
    for name in ("silero_vad", "torch", "pydub"):
        if name not in sys.modules:
            stub = MagicMock()
            sys.modules[name] = stub

    silero = sys.modules["silero_vad"]
    silero.load_silero_vad = MagicMock(
        return_value=MagicMock(
            return_value=MagicMock(item=MagicMock(return_value=0.8))
        )
    )
    silero.get_speech_timestamps = MagicMock()

    torch_stub = sys.modules["torch"]
    torch_stub.from_numpy = MagicMock(
        return_value=MagicMock(float=MagicMock(return_value=MagicMock()))
    )
    yield


@pytest.fixture
def vad():
    from src.services.stream_processor import SileroVAD
    return SileroVAD(sample_rate=16000)


class TestSileroVAD:
    def test_detect_voice_activity_with_voice(self, vad):
        audio_chunk = np.random.randn(16000).astype(np.float32) * 0.5
        voice_detected, confidence = vad.detect_voice_activity(audio_chunk)
        assert isinstance(voice_detected, bool)
        assert 0 <= confidence <= 1

    def test_detect_voice_activity_empty_audio(self, vad):
        audio_chunk = np.array([]).astype(np.float32)
        voice_detected, confidence = vad.detect_voice_activity(audio_chunk)
        assert voice_detected is False
        assert confidence == 0.0


@pytest.fixture
def processor():
    import src.services.stream_processor as sp
    with patch.object(sp, "SileroVAD"):
        return sp.StreamProcessor(
            session_id="test-session",
            transcription_callback=AsyncMock(),
        )


class TestStreamProcessor:
    def test_make_buffer_decision_voice_detected(self, processor):
        from src.services.stream_processor import BufferDecision

        processor.last_send_timestamp = 0.0
        processor.last_voice_timestamp = 5.0

        decision = processor._make_buffer_decision(
            voice_detected=True,
            current_timestamp=6.0,
        )
        assert decision == BufferDecision.SEND_CHUNK

    def test_make_buffer_decision_voice_too_soon(self, processor):
        from src.services.stream_processor import BufferDecision

        processor.last_send_timestamp = 4.0
        decision = processor._make_buffer_decision(
            voice_detected=True,
            current_timestamp=6.0,
        )
        assert decision == BufferDecision.BUFFER_WAIT

    def test_make_buffer_decision_short_silence(self, processor):
        from src.services.stream_processor import BufferDecision

        processor.last_voice_timestamp = 0.0
        decision = processor._make_buffer_decision(
            voice_detected=False,
            current_timestamp=1.0,
        )
        assert decision == BufferDecision.BUFFER_WAIT

    def test_make_buffer_decision_medium_silence(self, processor):
        from src.services.stream_processor import BufferDecision

        processor.last_voice_timestamp = 0.0
        decision = processor._make_buffer_decision(
            voice_detected=False,
            current_timestamp=5.0,
        )
        assert decision == BufferDecision.BATCH_SEND

    def test_make_buffer_decision_long_silence(self, processor):
        from src.services.stream_processor import BufferDecision

        processor.last_voice_timestamp = 0.0
        decision = processor._make_buffer_decision(
            voice_detected=False,
            current_timestamp=12.0,
        )
        assert decision == BufferDecision.SKIP

    def test_get_stats(self, processor):
        processor.total_processed_ms = 10000
        processor.total_sent_ms = 6500
        processor.total_skipped_ms = 3500

        stats = processor.get_stats()
        assert stats["total_processed_ms"] == 10000
        assert stats["total_sent_ms"] == 6500
        assert stats["total_skipped_ms"] == 3500
        assert stats["savings_percent"] == 35.0
        assert stats["session_id"] == "test-session"
