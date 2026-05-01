"""
Stream Processor con VAD inteligente para transcripción en tiempo real.
Utiliza Silero VAD + intelligent buffering para optimizar costos.
"""
import io
import time
from dataclasses import dataclass
from enum import Enum
from typing import Awaitable, Callable, Optional

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
    # 16 kHz mono float32 samples for the audio that produced this
    # transcript. Optional — only populated by the streaming WS handler
    # so the audio-feature diarizer can compute a speaker embedding.
    audio_samples: object = None


class SileroVAD:
    """
    Detector de actividad de voz usando Silero VAD.
    Latencia <100ms, optimizado para real-time.
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

        from silero_vad import load_silero_vad, get_speech_timestamps

        self.model = load_silero_vad()
        self.get_speech_timestamps = get_speech_timestamps

        logger.info(f"Silero VAD initialized (sample_rate={sample_rate}Hz)")

    def detect_voice_activity(self, audio_chunk: np.ndarray) -> tuple[bool, float]:
        """Detect voice activity in audio chunk.

        Why: Silero VAD's TorchScript model only accepts fixed window sizes
        (512 samples at 16kHz, 256 at 8kHz). Streaming chunks are arbitrary
        length, so we slide a window across the chunk and aggregate.
        """
        try:
            if len(audio_chunk) == 0:
                return False, 0.0

            window_size = 512 if self.sample_rate == 16000 else 256
            self.model.reset_states()
            audio_tensor = torch.from_numpy(audio_chunk).float()
            max_prob = 0.0
            for start in range(0, len(audio_tensor) - window_size + 1, window_size):
                window = audio_tensor[start : start + window_size]
                prob = self.model(window, self.sample_rate).item()
                if prob > max_prob:
                    max_prob = prob
            voice_detected = max_prob > 0.5
            return voice_detected, max_prob

        except Exception as e:
            logger.error(f"VAD error: {e}")
            return False, 0.0

    def process_audio_segment(self, audio_bytes: bytes, format: str = "webm") -> tuple[bool, float]:
        """Process audio segment (convenience method)."""
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=format)
        audio = audio.set_frame_rate(self.sample_rate).set_channels(1)

        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        samples = samples / (2 ** 15)

        return self.detect_voice_activity(samples)


class StreamProcessor:
    """
    Procesador de audio streaming con VAD inteligente.

    Decision tree:
    - Voice: send every 5s
    - Silence 0-2s: buffer (wait)
    - Silence 2-10s: batch
    - Silence >10s: skip
    """

    VOICE_CHUNK_INTERVAL_MS = 5000
    SILENCE_BUFFER_THRESHOLD_MS = 2000
    SILENCE_BATCH_THRESHOLD_MS = 10000
    SILENCE_SKIP_THRESHOLD_MS = 10000

    def __init__(
        self,
        session_id: str,
        transcription_callback: Callable[[TranscriptionChunk], Awaitable[None]],
        cost_tracker=None,
    ):
        self.session_id = session_id
        self.transcription_callback = transcription_callback
        self.cost_tracker = cost_tracker

        self.vad = SileroVAD(sample_rate=16000)

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
        format: str = "webm",
    ) -> BufferDecision:
        """Process incoming audio chunk from WebSocket."""
        start_time = time.time()

        voice_detected, _confidence = self.vad.process_audio_segment(audio_bytes, format)

        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=format)
        duration_ms = len(audio)

        buffer_entry = AudioBuffer(
            audio_data=audio_bytes,
            duration_ms=duration_ms,
            timestamp_start=timestamp,
            timestamp_end=timestamp + duration_ms / 1000,
            voice_detected=voice_detected,
        )

        decision = self._make_buffer_decision(
            voice_detected=voice_detected,
            current_timestamp=timestamp,
        )
        buffer_entry.decision = decision

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
            logger.debug(
                f"Skipping {duration_ms}ms of silence "
                f"(total skipped: {self.total_skipped_ms}ms)"
            )

        self.total_processed_ms += duration_ms

        if voice_detected:
            self.last_voice_timestamp = timestamp

        buffer_size_bytes = sum(len(b.audio_data) for b in self.buffer)
        metrics.stream_processor_buffer_size.set(buffer_size_bytes)

        processing_latency = time.time() - start_time
        logger.debug(
            f"Processed chunk: decision={decision.value}, voice={voice_detected}, "
            f"latency={processing_latency * 1000:.1f}ms"
        )

        return decision

    def _make_buffer_decision(
        self,
        voice_detected: bool,
        current_timestamp: float,
    ) -> BufferDecision:
        """Implement intelligent buffering decision tree."""
        time_since_last_send_ms = (current_timestamp - self.last_send_timestamp) * 1000
        time_since_last_voice_ms = (current_timestamp - self.last_voice_timestamp) * 1000

        if voice_detected:
            if time_since_last_send_ms >= self.VOICE_CHUNK_INTERVAL_MS:
                return BufferDecision.SEND_CHUNK
            return BufferDecision.BUFFER_WAIT

        if time_since_last_voice_ms < self.SILENCE_BUFFER_THRESHOLD_MS:
            return BufferDecision.BUFFER_WAIT
        if time_since_last_voice_ms < self.SILENCE_BATCH_THRESHOLD_MS:
            return BufferDecision.BATCH_SEND
        return BufferDecision.SKIP

    async def _send_to_whisper(self, audio_buffer: AudioBuffer) -> None:
        await self._transcribe_audio([audio_buffer])

    async def _send_batch_to_whisper(self) -> None:
        if not self.buffer:
            return
        await self._transcribe_audio(self.buffer)

    async def _transcribe_audio(self, buffers: list[AudioBuffer]) -> None:
        """Transcribe audio buffers using Whisper API."""
        if not buffers:
            return

        try:
            combined_audio = AudioSegment.empty()
            for buffer in buffers:
                audio = AudioSegment.from_file(
                    io.BytesIO(buffer.audio_data),
                    format="webm",
                )
                combined_audio += audio

            wav_buffer = io.BytesIO()
            combined_audio.export(wav_buffer, format="wav")
            wav_buffer.seek(0)

            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)

            response = await client.audio.transcriptions.create(
                model=settings.whisper_model,
                file=("chunk.wav", wav_buffer, "audio/wav"),
                language=settings.whisper_language,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

            if response.text:
                chunk = TranscriptionChunk(
                    text=response.text,
                    start_time=buffers[0].timestamp_start,
                    end_time=buffers[-1].timestamp_end,
                    is_partial=True,
                    confidence=1.0,
                )

                await self.transcription_callback(chunk)

                duration_minutes = sum(b.duration_ms for b in buffers) / 1000 / 60
                cost_usd = duration_minutes * 0.006

                if self.cost_tracker:
                    await self.cost_tracker.track_transcription(
                        session_id=self.session_id,
                        duration_seconds=duration_minutes * 60,
                        cost_usd=cost_usd,
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
            if self.total_processed_ms > 0
            else 0
        )

        return {
            "session_id": self.session_id,
            "total_processed_ms": self.total_processed_ms,
            "total_sent_ms": self.total_sent_ms,
            "total_skipped_ms": self.total_skipped_ms,
            "savings_percent": round(savings_percent, 1),
            "buffer_count": len(self.buffer),
            "buffer_duration_ms": sum(b.duration_ms for b in self.buffer),
        }
