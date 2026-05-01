"""Unit tests for src/services/stream_processor.py decision tree and helpers."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.stream_processor import (
    AudioBuffer,
    BufferDecision,
    StreamProcessor,
    TranscriptionChunk,
)


@pytest.fixture
def processor():
    """StreamProcessor with SileroVAD mocked out (heavy ML import)."""
    with patch("src.services.stream_processor.SileroVAD") as MockVAD:
        MockVAD.return_value = MagicMock()
        sp = StreamProcessor(
            session_id="test-session",
            transcription_callback=AsyncMock(),
        )
    return sp


class TestBufferDecisionTree:
    def test_voice_with_recent_send_buffers(self, processor):
        processor.last_send_timestamp = 10.0
        processor.last_voice_timestamp = 10.0
        decision = processor._make_buffer_decision(voice_detected=True, current_timestamp=11.0)
        assert decision == BufferDecision.BUFFER_WAIT

    def test_voice_after_send_interval_sends(self, processor):
        processor.last_send_timestamp = 0.0
        processor.last_voice_timestamp = 0.0
        decision = processor._make_buffer_decision(voice_detected=True, current_timestamp=6.0)
        assert decision == BufferDecision.SEND_CHUNK

    def test_short_silence_buffers(self, processor):
        processor.last_voice_timestamp = 10.0
        processor.last_send_timestamp = 10.0
        decision = processor._make_buffer_decision(voice_detected=False, current_timestamp=11.0)
        assert decision == BufferDecision.BUFFER_WAIT

    def test_medium_silence_batches(self, processor):
        processor.last_voice_timestamp = 0.0
        processor.last_send_timestamp = 0.0
        decision = processor._make_buffer_decision(voice_detected=False, current_timestamp=5.0)
        assert decision == BufferDecision.BATCH_SEND

    def test_long_silence_skips(self, processor):
        processor.last_voice_timestamp = 0.0
        processor.last_send_timestamp = 0.0
        decision = processor._make_buffer_decision(voice_detected=False, current_timestamp=15.0)
        assert decision == BufferDecision.SKIP


class TestStats:
    def test_get_stats_initial(self, processor):
        stats = processor.get_stats()
        assert stats["session_id"] == "test-session"
        assert stats["total_processed_ms"] == 0
        assert stats["savings_percent"] == 0
        assert stats["buffer_count"] == 0

    def test_get_stats_with_savings(self, processor):
        processor.total_processed_ms = 1000
        processor.total_skipped_ms = 250
        stats = processor.get_stats()
        assert stats["savings_percent"] == 25.0

    def test_get_stats_includes_buffer_state(self, processor):
        processor.buffer.append(AudioBuffer(
            audio_data=b"x", duration_ms=500, timestamp_start=0, timestamp_end=0.5
        ))
        processor.buffer.append(AudioBuffer(
            audio_data=b"y", duration_ms=300, timestamp_start=0.5, timestamp_end=0.8
        ))
        stats = processor.get_stats()
        assert stats["buffer_count"] == 2
        assert stats["buffer_duration_ms"] == 800


class TestTranscribeAudio:
    @pytest.mark.asyncio
    async def test_transcribe_audio_skips_empty_buffers(self, processor):
        await processor._transcribe_audio([])
        # Callback should not have been called
        processor.transcription_callback.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_batch_skips_when_buffer_empty(self, processor):
        processor.buffer = []
        await processor._send_batch_to_whisper()
        processor.transcription_callback.assert_not_called()

    @pytest.mark.asyncio
    async def test_transcribe_audio_handles_exceptions(self, processor):
        """Failures in transcription should be swallowed (logged)."""
        buffer = AudioBuffer(
            audio_data=b"invalid-audio-bytes",
            duration_ms=1000,
            timestamp_start=0,
            timestamp_end=1,
        )
        # AudioSegment.from_file will fail on invalid bytes — which is fine,
        # the method must catch the exception and not propagate.
        await processor._transcribe_audio([buffer])
        # Did not raise — pass


def test_transcription_chunk_dataclass():
    chunk = TranscriptionChunk(
        text="hello",
        start_time=1.0,
        end_time=2.0,
    )
    assert chunk.text == "hello"
    assert chunk.is_partial is True
    assert chunk.confidence == 0.0


def test_audio_buffer_dataclass():
    buf = AudioBuffer(
        audio_data=b"data",
        duration_ms=500,
        timestamp_start=0,
        timestamp_end=0.5,
    )
    assert buf.voice_detected is False
    assert buf.decision == BufferDecision.BUFFER_WAIT


def test_buffer_decision_enum_values():
    assert BufferDecision.SEND_CHUNK.value == "send_chunk"
    assert BufferDecision.SKIP.value == "skip"


class TestProcessAudioChunk:
    """Drive process_audio_chunk through all 4 decision paths with audio mocked."""

    @pytest.fixture
    def fake_audio_segment(self):
        """Mock AudioSegment.from_file to avoid real audio decoding."""
        seg = MagicMock()
        seg.__len__ = MagicMock(return_value=1000)  # 1000ms
        return seg

    @pytest.mark.asyncio
    async def test_voice_after_interval_sends(self, processor, fake_audio_segment):
        processor.vad.process_audio_segment = MagicMock(return_value=(True, 0.9))
        processor._send_to_whisper = AsyncMock()

        with patch(
            "src.services.stream_processor.AudioSegment.from_file",
            return_value=fake_audio_segment,
        ):
            decision = await processor.process_audio_chunk(b"audio", timestamp=10.0)

        assert decision == BufferDecision.SEND_CHUNK
        processor._send_to_whisper.assert_awaited_once()
        assert processor.last_voice_timestamp == 10.0

    @pytest.mark.asyncio
    async def test_voice_within_interval_buffers(self, processor, fake_audio_segment):
        processor.last_send_timestamp = 10.0
        processor.last_voice_timestamp = 10.0
        processor.vad.process_audio_segment = MagicMock(return_value=(True, 0.9))

        with patch(
            "src.services.stream_processor.AudioSegment.from_file",
            return_value=fake_audio_segment,
        ):
            decision = await processor.process_audio_chunk(b"audio", timestamp=11.0)

        assert decision == BufferDecision.BUFFER_WAIT
        assert len(processor.buffer) == 1

    @pytest.mark.asyncio
    async def test_long_silence_skips(self, processor, fake_audio_segment):
        processor.last_voice_timestamp = 0.0
        processor.last_send_timestamp = 0.0
        processor.vad.process_audio_segment = MagicMock(return_value=(False, 0.1))

        with patch(
            "src.services.stream_processor.AudioSegment.from_file",
            return_value=fake_audio_segment,
        ):
            decision = await processor.process_audio_chunk(b"audio", timestamp=15.0)

        assert decision == BufferDecision.SKIP
        assert processor.total_skipped_ms == 1000

    @pytest.mark.asyncio
    async def test_medium_silence_batches(self, processor, fake_audio_segment):
        processor.last_voice_timestamp = 0.0
        processor.last_send_timestamp = 0.0
        processor.vad.process_audio_segment = MagicMock(return_value=(False, 0.1))
        processor._send_batch_to_whisper = AsyncMock()

        with patch(
            "src.services.stream_processor.AudioSegment.from_file",
            return_value=fake_audio_segment,
        ):
            decision = await processor.process_audio_chunk(b"audio", timestamp=5.0)

        assert decision == BufferDecision.BATCH_SEND
        processor._send_batch_to_whisper.assert_awaited_once()


class TestSileroVAD:
    """Tests for SileroVAD's audio segment processing without loading the model."""

    def test_detect_voice_activity_handles_empty_array(self):
        """An empty audio chunk returns (False, 0.0) without invoking the model."""
        from src.services.stream_processor import SileroVAD
        import numpy as np

        with patch("src.services.stream_processor.SileroVAD.__init__", return_value=None):
            vad = SileroVAD.__new__(SileroVAD)
            vad.sample_rate = 16000
            vad.model = MagicMock()
            voice, prob = vad.detect_voice_activity(np.array([]))

        assert voice is False
        assert prob == 0.0
        vad.model.assert_not_called()

    def test_detect_voice_activity_handles_model_exception(self):
        from src.services.stream_processor import SileroVAD
        import numpy as np

        with patch("src.services.stream_processor.SileroVAD.__init__", return_value=None):
            vad = SileroVAD.__new__(SileroVAD)
            vad.sample_rate = 16000
            vad.model = MagicMock(side_effect=RuntimeError("model crashed"))
            voice, prob = vad.detect_voice_activity(np.array([0.1, 0.2, 0.3]))

        assert voice is False
        assert prob == 0.0
