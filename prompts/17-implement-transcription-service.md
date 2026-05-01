# Prompt 17: Implement Stream Processor with Intelligent VAD Buffering

## Objective
Implement the real-time audio Stream Processor using Silero VAD and intelligent buffering for cost-optimized streaming transcription with OpenAI Whisper API.

## Context
**Real-Time Streaming Architecture:** This service is a critical component of the WebSocket streaming pipeline.

This service will:
- Receive audio chunks from WebSocket Gateway in real-time (Opus-encoded)
- Use **Silero VAD** for real-time voice activity detection (<100ms latency)
- Implement **intelligent buffering decision tree** for cost optimization:
  - **Voice detected**: Send chunk to Whisper every 5s
  - **Silence 0-2s**: Buffer (wait for more speech)
  - **Silence 2-10s**: Batch send
  - **Silence >10s**: SKIP (cost savings)
- Send audio chunks to Whisper API for streaming transcription
- Emit partial transcription results back to WebSocket Gateway
- Track transcription costs in real-time

**Cost Optimization Goal:** Achieve 20-30% savings vs pure streaming ($0.36) while maintaining <2s end-to-end latency.

## Reference Documents
- `PROMPT-11-STREAMING-COST-OPTIMIZATION.md` - VAD decision tree design
- `PROMPT-07-REALTIME-PIPELINE.md` - Real-time architecture
- `docs/architecture/c4-container-diagram.md` - Stream Processor component

## Tasks

### 1. Create Stream Processor Service

Create `ai-service/src/services/stream_processor.py`:

```python
"""
Stream Processor con VAD inteligente para transcripción en tiempo real.
Utiliza Silero VAD + intelligent buffering para optimizar costos.
"""
import asyncio
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator, Callable

import numpy as np
import torch
from pydub import AudioSegment

from src.core.config import get_settings
from src.core.logging import get_logger
from src.core.metrics import metrics

settings = get_settings()
logger = get_logger(__name__)


class BufferDecision(str, Enum):
    """Decisión de buffering basada en VAD."""
    SEND_CHUNK = "send_chunk"          # Voice: send every 5s
    BUFFER_WAIT = "buffer_wait"        # Silence 0-2s: wait
    BATCH_SEND = "batch_send"          # Silence 2-10s: batch
    SKIP = "skip"                       # Silence >10s: skip


@dataclass
class AudioBuffer:
    """Buffer de audio con metadata."""
    audio_data: bytes
    duration_ms: int
    timestamp_start: float
    timestamp_end: float
    voice_detected: bool = False
    decision: BufferDecision = BufferDecision.BUFFER_WAIT


@dataclass
class TranscriptionChunk:
    """Chunk de transcripción parcial."""
    text: str
    start_time: float
    end_time: float
    is_partial: bool = True
    confidence: float = 0.0


class SileroVAD:
    """
    Detector de actividad de voz usando Silero VAD.
    Latencia <100ms, optimizado para real-time.
    """

    def __init__(self, sample_rate: int = 16000):
        """
        Initialize Silero VAD model.

        Args:
            sample_rate: Audio sample rate (8000 or 16000)
        """
        self.sample_rate = sample_rate

        # Load Silero VAD model (lightweight, CPU-friendly)
        # silero-vad 5.x exposes a top-level package; no torch.hub needed.
        from silero_vad import load_silero_vad, get_speech_timestamps

        self.model = load_silero_vad()
        self.get_speech_timestamps = get_speech_timestamps

        logger.info(f"Silero VAD initialized (sample_rate={sample_rate}Hz)")

    def detect_voice_activity(self, audio_chunk: np.ndarray) -> tuple[bool, float]:
        """
        Detect voice activity in audio chunk.

        Args:
            audio_chunk: NumPy array of audio samples (float32, -1 to 1)

        Returns:
            Tuple of (voice_detected: bool, confidence: float)
        """
        try:
            # Convert to torch tensor
            if len(audio_chunk) == 0:
                return False, 0.0

            audio_tensor = torch.from_numpy(audio_chunk).float()

            # Get VAD probability (single chunk)
            speech_prob = self.model(audio_tensor, self.sample_rate).item()

            # Threshold: 0.5 is standard, adjust for medical speech
            voice_detected = speech_prob > 0.5

            return voice_detected, speech_prob

        except Exception as e:
            logger.error(f"VAD error: {e}")
            return False, 0.0

    def process_audio_segment(self, audio_bytes: bytes, format: str = "opus") -> tuple[bool, float]:
        """
        Process audio segment (convenience method).

        Args:
            audio_bytes: Raw audio bytes
            format: Audio format (opus, wav, etc.)

        Returns:
            Tuple of (voice_detected, confidence)
        """
        # Convert to AudioSegment
        audio = AudioSegment.from_file(
            io.BytesIO(audio_bytes),
            format=format
        )

        # Convert to 16kHz mono for VAD
        audio = audio.set_frame_rate(self.sample_rate).set_channels(1)

        # Convert to numpy array (float32, normalized to -1 to 1)
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        samples = samples / (2**15)  # Normalize 16-bit to float

        return self.detect_voice_activity(samples)


class StreamProcessor:
    """
    Procesador de audio streaming con VAD inteligente.

    Implementa el árbol de decisión:
    - Voice: send every 5s
    - Silence 0-2s: buffer (wait)
    - Silence 2-10s: batch
    - Silence >10s: skip
    """

    # Decision tree thresholds (milliseconds)
    VOICE_CHUNK_INTERVAL_MS = 5000      # Send every 5s when voice
    SILENCE_BUFFER_THRESHOLD_MS = 2000  # Buffer up to 2s silence
    SILENCE_BATCH_THRESHOLD_MS = 10000  # Batch up to 10s silence
    SILENCE_SKIP_THRESHOLD_MS = 10000   # Skip after 10s silence

    def __init__(
        self,
        session_id: str,
        transcription_callback: Callable[[TranscriptionChunk], None],
        cost_tracker = None
    ):
        """
        Initialize Stream Processor.

        Args:
            session_id: WebSocket session ID
            transcription_callback: Callback for transcription results
            cost_tracker: Optional cost tracker
        """
        self.session_id = session_id
        self.transcription_callback = transcription_callback
        self.cost_tracker = cost_tracker

        # Initialize VAD
        self.vad = SileroVAD(sample_rate=16000)

        # Buffer state
        self.buffer: list[AudioBuffer] = []
        self.last_voice_timestamp = 0.0
        self.last_send_timestamp = 0.0
        self.total_processed_ms = 0
        self.total_sent_ms = 0
        self.total_skipped_ms = 0

        logger.info(f"Stream Processor initialized (session={session_id})")

    async def process_audio_chunk(
        self,
        audio_bytes: bytes,
        timestamp: float,
        format: str = "opus"
    ) -> BufferDecision:
        """
        Process incoming audio chunk from WebSocket.

        Args:
            audio_bytes: Raw audio bytes (Opus-encoded)
            timestamp: Timestamp of chunk
            format: Audio format

        Returns:
            BufferDecision taken
        """
        start_time = time.time()

        # Detect voice activity
        voice_detected, confidence = self.vad.process_audio_segment(audio_bytes, format)

        # Calculate duration
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=format)
        duration_ms = len(audio)

        # Create buffer entry
        buffer_entry = AudioBuffer(
            audio_data=audio_bytes,
            duration_ms=duration_ms,
            timestamp_start=timestamp,
            timestamp_end=timestamp + duration_ms / 1000,
            voice_detected=voice_detected
        )

        # Make buffering decision
        decision = self._make_buffer_decision(
            voice_detected=voice_detected,
            current_timestamp=timestamp
        )

        buffer_entry.decision = decision

        # Execute decision
        if decision == BufferDecision.SEND_CHUNK:
            await self._send_to_whisper(buffer_entry)
            self.buffer.clear()
            self.last_send_timestamp = timestamp
            self.total_sent_ms += duration_ms

        elif decision == BufferDecision.BUFFER_WAIT:
            self.buffer.append(buffer_entry)

        elif decision == BufferDecision.BATCH_SEND:
            self.buffer.append(buffer_entry)
            await self._send_batch_to_whisper()
            self.buffer.clear()
            self.last_send_timestamp = timestamp

        elif decision == BufferDecision.SKIP:
            self.total_skipped_ms += duration_ms
            logger.debug(f"Skipping {duration_ms}ms of silence (total skipped: {self.total_skipped_ms}ms)")

        # Update metrics
        self.total_processed_ms += duration_ms

        if voice_detected:
            self.last_voice_timestamp = timestamp

        # Track buffer size
        buffer_size_bytes = sum(len(b.audio_data) for b in self.buffer)
        metrics.stream_processor_buffer_size.set(buffer_size_bytes)

        # Track processing latency
        processing_latency = time.time() - start_time
        logger.debug(
            f"Processed chunk: decision={decision.value}, voice={voice_detected}, "
            f"latency={processing_latency*1000:.1f}ms"
        )

        return decision

    def _make_buffer_decision(
        self,
        voice_detected: bool,
        current_timestamp: float
    ) -> BufferDecision:
        """
        Implement intelligent buffering decision tree.

        Decision tree:
        1. If voice detected:
           - If 5s since last send → SEND_CHUNK
           - Else → BUFFER_WAIT
        2. If silence detected:
           - If <2s since last voice → BUFFER_WAIT
           - If 2s-10s since last voice → BATCH_SEND
           - If >10s since last voice → SKIP
        """
        time_since_last_send_ms = (current_timestamp - self.last_send_timestamp) * 1000
        time_since_last_voice_ms = (current_timestamp - self.last_voice_timestamp) * 1000

        if voice_detected:
            # Voice detected
            if time_since_last_send_ms >= self.VOICE_CHUNK_INTERVAL_MS:
                return BufferDecision.SEND_CHUNK
            else:
                return BufferDecision.BUFFER_WAIT
        else:
            # Silence detected
            if time_since_last_voice_ms < self.SILENCE_BUFFER_THRESHOLD_MS:
                return BufferDecision.BUFFER_WAIT
            elif time_since_last_voice_ms < self.SILENCE_BATCH_THRESHOLD_MS:
                return BufferDecision.BATCH_SEND
            else:
                return BufferDecision.SKIP

    async def _send_to_whisper(self, audio_buffer: AudioBuffer):
        """Send single buffer to Whisper API."""
        await self._transcribe_audio([audio_buffer])

    async def _send_batch_to_whisper(self):
        """Send batched buffers to Whisper API."""
        if not self.buffer:
            return

        await self._transcribe_audio(self.buffer)

    async def _transcribe_audio(self, buffers: list[AudioBuffer]):
        """
        Transcribe audio buffers using Whisper API.

        Args:
            buffers: List of audio buffers to transcribe
        """
        if not buffers:
            return

        try:
            # Concatenate audio
            combined_audio = AudioSegment.empty()
            for buffer in buffers:
                audio = AudioSegment.from_file(
                    io.BytesIO(buffer.audio_data),
                    format="opus"
                )
                combined_audio += audio

            # Convert to WAV for Whisper
            wav_buffer = io.BytesIO()
            combined_audio.export(wav_buffer, format="wav")
            wav_buffer.seek(0)

            # Call Whisper API
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=("chunk.wav", wav_buffer, "audio/wav"),
                language="es",
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )

            # Process response
            if response.text:
                chunk = TranscriptionChunk(
                    text=response.text,
                    start_time=buffers[0].timestamp_start,
                    end_time=buffers[-1].timestamp_end,
                    is_partial=True,
                    confidence=1.0  # Whisper doesn't provide confidence
                )

                # Callback to WebSocket Gateway
                await self.transcription_callback(chunk)

                # Track cost
                duration_minutes = sum(b.duration_ms for b in buffers) / 1000 / 60
                cost_usd = duration_minutes * 0.006  # $0.006/min

                if self.cost_tracker:
                    await self.cost_tracker.track_transcription(
                        session_id=self.session_id,
                        duration_seconds=duration_minutes * 60,
                        cost_usd=cost_usd
                    )

                logger.info(
                    f"Transcription chunk: text_length={len(response.text)}, "
                    f"cost=${cost_usd:.4f}"
                )

        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)

    def get_stats(self) -> dict:
        """Get processor statistics."""
        savings_percent = (
            (self.total_skipped_ms / self.total_processed_ms * 100)
            if self.total_processed_ms > 0 else 0
        )

        return {
            "session_id": self.session_id,
            "total_processed_ms": self.total_processed_ms,
            "total_sent_ms": self.total_sent_ms,
            "total_skipped_ms": self.total_skipped_ms,
            "savings_percent": round(savings_percent, 1),
            "buffer_count": len(self.buffer),
            "buffer_duration_ms": sum(b.duration_ms for b in self.buffer)
        }
```

### 2. Create Stream Processor Tests

Create `ai-service/tests/unit/test_stream_processor.py`:

```python
"""
Tests unitarios para Stream Processor.
"""
import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.stream_processor import (
    StreamProcessor,
    SileroVAD,
    BufferDecision,
    TranscriptionChunk
)


class TestSileroVAD:
    """Tests for Silero VAD."""

    @pytest.fixture
    def vad(self):
        with patch('torch.hub.load') as mock_load:
            # Mock model
            mock_model = MagicMock()
            mock_model.return_value.item.return_value = 0.8  # High speech probability
            mock_utils = [MagicMock()]
            mock_load.return_value = (mock_model, mock_utils)

            yield SileroVAD(sample_rate=16000)

    def test_detect_voice_activity_with_voice(self, vad):
        """Test voice detection with speech."""
        # Simulate audio with voice (high amplitude)
        audio_chunk = np.random.randn(16000).astype(np.float32) * 0.5

        voice_detected, confidence = vad.detect_voice_activity(audio_chunk)

        assert isinstance(voice_detected, bool)
        assert 0 <= confidence <= 1

    def test_detect_voice_activity_empty_audio(self, vad):
        """Test VAD with empty audio."""
        audio_chunk = np.array([]).astype(np.float32)

        voice_detected, confidence = vad.detect_voice_activity(audio_chunk)

        assert voice_detected == False
        assert confidence == 0.0


class TestStreamProcessor:
    """Tests for Stream Processor."""

    @pytest.fixture
    def mock_callback(self):
        return AsyncMock()

    @pytest.fixture
    def processor(self, mock_callback):
        with patch('src.services.stream_processor.SileroVAD'):
            return StreamProcessor(
                session_id="test-session",
                transcription_callback=mock_callback
            )

    def test_make_buffer_decision_voice_detected(self, processor):
        """Test decision tree: voice detected after 5s."""
        processor.last_send_timestamp = 0.0
        processor.last_voice_timestamp = 5.0

        decision = processor._make_buffer_decision(
            voice_detected=True,
            current_timestamp=6.0  # 6s since last send
        )

        assert decision == BufferDecision.SEND_CHUNK

    def test_make_buffer_decision_short_silence(self, processor):
        """Test decision tree: silence <2s."""
        processor.last_voice_timestamp = 0.0

        decision = processor._make_buffer_decision(
            voice_detected=False,
            current_timestamp=1.0  # 1s silence
        )

        assert decision == BufferDecision.BUFFER_WAIT

    def test_make_buffer_decision_medium_silence(self, processor):
        """Test decision tree: silence 2-10s."""
        processor.last_voice_timestamp = 0.0

        decision = processor._make_buffer_decision(
            voice_detected=False,
            current_timestamp=5.0  # 5s silence
        )

        assert decision == BufferDecision.BATCH_SEND

    def test_make_buffer_decision_long_silence(self, processor):
        """Test decision tree: silence >10s."""
        processor.last_voice_timestamp = 0.0

        decision = processor._make_buffer_decision(
            voice_detected=False,
            current_timestamp=12.0  # 12s silence
        )

        assert decision == BufferDecision.SKIP

    def test_get_stats(self, processor):
        """Test statistics collection."""
        processor.total_processed_ms = 10000
        processor.total_sent_ms = 6500
        processor.total_skipped_ms = 3500

        stats = processor.get_stats()

        assert stats["total_processed_ms"] == 10000
        assert stats["total_sent_ms"] == 6500
        assert stats["total_skipped_ms"] == 3500
        assert stats["savings_percent"] == 35.0  # 3500/10000
```

### 3. Add Integration with WebSocket Gateway

Update `ai-service/src/services/websocket_gateway.py` (to be created in Prompt 16-A):

```python
# Add to WebSocket Gateway

async def handle_audio_stream(self, websocket, session_id: str):
    """Handle incoming audio stream."""

    # Initialize Stream Processor
    async def transcription_callback(chunk: TranscriptionChunk):
        # Send transcription event back to client
        await websocket.send_json({
            "event": "transcription_update",
            "data": {
                "text": chunk.text,
                "start_time": chunk.start_time,
                "end_time": chunk.end_time,
                "is_partial": chunk.is_partial
            }
        })

    processor = StreamProcessor(
        session_id=session_id,
        transcription_callback=transcription_callback
    )

    try:
        async for message in websocket.iter_bytes():
            # Process audio chunk
            decision = await processor.process_audio_chunk(
                audio_bytes=message,
                timestamp=time.time(),
                format="opus"
            )

            # Optionally send decision event for debugging
            if settings.DEBUG:
                await websocket.send_json({
                    "event": "vad_decision",
                    "data": {"decision": decision.value}
                })

    finally:
        # Log statistics
        stats = processor.get_stats()
        logger.info(f"Session ended: {stats}")
```

## Expected Deliverables

1. `ai-service/src/services/stream_processor.py` - Stream Processor with intelligent VAD
2. `ai-service/tests/unit/test_stream_processor.py` - Unit tests
3. Integration with WebSocket Gateway (Prompt 16-A)

## Verification Steps

1. Silero VAD loads and detects voice activity (<100ms latency)
2. Intelligent buffering decision tree works correctly:
   - Voice: sends every 5s
   - Silence 0-2s: buffers
   - Silence 2-10s: batches
   - Silence >10s: skips
3. Audio chunks sent to Whisper API successfully
4. Transcription callbacks trigger correctly
5. Cost savings 20-30% vs pure streaming
6. Unit tests pass with `pytest tests/unit/test_stream_processor.py`
7. Metrics tracked (buffer size, latency, savings)

## Notes

- **Silero VAD** instead of WebRTC VAD for real-time capability (<100ms)
- **Intelligent buffering** implements PROMPT-11 decision tree
- **Opus codec** for 70% bandwidth reduction (handled by WebSocket Gateway)
- **Cost target**: $0.27-0.32 per 60-min consultation (vs $0.36 pure streaming)
- **Latency target**: <2s end-to-end (VAD <100ms, buffering ~5s, Whisper ~1s)
- **Dependencies**: `silero-vad==5.1.2`, `torch==2.2.0` (CPU-only), `numpy==1.26.4`
- Stream Processor is session-scoped (one instance per WebSocket connection)
- Statistics tracked for cost monitoring and optimization tuning
