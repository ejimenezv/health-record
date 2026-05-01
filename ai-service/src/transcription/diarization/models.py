from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class SpeakerRole(str, Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"
    FAMILY_MEMBER = "family_member"
    NURSE = "nurse"
    OTHER = "other"
    UNKNOWN = "unknown"


class Speaker(BaseModel):
    id: str
    role: SpeakerRole = SpeakerRole.UNKNOWN
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    name: Optional[str] = None
    total_speech_duration: float = 0.0
    last_seen_at: float = 0.0


class SpeakerSegment(BaseModel):
    speaker_id: str
    start_time: float
    end_time: float
    text: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    chunk_index: int = 0

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time


class DiarizedSegment(BaseModel):
    text: str
    speaker: Speaker
    start_time: float
    end_time: float
    words: Optional[List[dict]] = None


class SpeakerState(BaseModel):
    session_id: str
    current_speaker_id: str = "SPEAKER_0"
    speakers: Dict[str, Speaker] = Field(default_factory=dict)
    speaker_history: List[str] = Field(default_factory=list)
    role_indicators: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    last_speaker_change_time: float = 0.0
    total_chunks_processed: int = 0
    confidence_threshold_met: bool = False
    # Per-speaker centroid embeddings (running mean of slice-level
    # speaker embeddings). Empty for the keyword-only diarizer; populated
    # by the audio-feature diarizer.
    speaker_embeddings: Dict[str, List[float]] = Field(default_factory=dict)


class IncrementalDiarizationResult(BaseModel):
    chunk_index: int
    speaker_id: str
    speaker_changed: bool
    role: SpeakerRole
    role_confidence: float
    processing_time_ms: float
    total_speakers_detected: int
    session_duration_seconds: float


class DiarizationResult(BaseModel):
    speakers: List[Speaker]
    segments: List[SpeakerSegment]
    num_speakers: int
    processing_time_seconds: float
    method: str = "incremental"


class SpeakerAssignment(BaseModel):
    speakers: Dict[str, SpeakerRole]
    confidence: float
    method: str
    reasoning: Optional[str] = None


class DiarizedTranscript(BaseModel):
    segments: List[DiarizedSegment]
    speakers: List[Speaker]
    full_text: str
    text_by_speaker: Dict[str, str]
    timeline: List[DiarizedSegment]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConsultationContext(BaseModel):
    appointment_type: str = "consultation"
    expected_speakers: int = 2
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    language: str = "es"


class SpeakerChangeEvent(BaseModel):
    type: str = "speaker_changed"
    previous_speaker_id: str
    new_speaker_id: str
    new_speaker_role: SpeakerRole
    confidence: float
    timestamp: float
