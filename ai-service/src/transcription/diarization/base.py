from abc import ABC, abstractmethod
from typing import Optional

from src.transcription.diarization.models import (
    ConsultationContext,
    IncrementalDiarizationResult,
    SpeakerState,
)


class BaseIncrementalDiarizer(ABC):
    @abstractmethod
    async def process_chunk(
        self,
        transcript_text: str,
        timestamp: float,
        session_id: str,
        context: Optional[ConsultationContext] = None,
    ) -> IncrementalDiarizationResult:
        ...

    @abstractmethod
    async def get_speaker_state(self, session_id: str) -> Optional[SpeakerState]:
        ...

    @abstractmethod
    async def finalize_session(self, session_id: str) -> SpeakerState:
        ...
