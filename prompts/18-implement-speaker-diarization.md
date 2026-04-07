# Prompt 18: Implement Incremental Speaker Diarization

## Objective
Implement **incremental speaker diarization** for real-time streaming transcription, identifying speakers (doctor, patient, others) as the consultation progresses and enabling accurate attribution of medical information during live consultations.

## Context

**⚠️ REAL-TIME STREAMING ARCHITECTURE**

This service processes diarization **incrementally** as transcript chunks arrive from the Stream Processor (Prompt 17), not as batch at the end of consultation.

**Integration Points:**
- **Input:** Receives transcript chunks from Stream Processor (Prompt 17)
- **Output:** Updates speaker assignments and emits to Incremental Extractor (Prompt 19)
- **State:** Maintains speaker state in Redis session

**Why Incremental Diarization:**
- Attribution of symptoms/prescriptions to correct speaker in real-time
- Enables speaker-specific extraction (doctor's notes vs patient's symptoms)
- Improves extraction accuracy by separating question/answer context
- Critical for live consultation interface (show who is speaking)

**Cost Efficiency:**
- Start with simple heuristics (pause detection + turn-taking)
- Incrementally build role confidence using medical terminology indicators
- Optional LLM validation only when confidence is low (<0.7) after 30 seconds

## Tasks

### 1. Create Incremental Diarization Data Models
Create `src/transcription/diarization/models.py`:

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime


class SpeakerRole(str, Enum):
    """Roles for speakers in medical consultations."""
    DOCTOR = "doctor"
    PATIENT = "patient"
    FAMILY_MEMBER = "family_member"
    NURSE = "nurse"
    OTHER = "other"
    UNKNOWN = "unknown"


class Speaker(BaseModel):
    """Represents an identified speaker with incremental confidence."""
    id: str  # e.g., "SPEAKER_0", "SPEAKER_1"
    role: SpeakerRole = SpeakerRole.UNKNOWN
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    name: Optional[str] = None
    total_speech_duration: float = 0.0  # Total seconds spoken (for confidence)
    last_seen_at: float = 0.0  # Last timestamp this speaker was detected


class SpeakerSegment(BaseModel):
    """A segment of speech from a single speaker."""
    speaker_id: str
    start_time: float  # seconds from consultation start
    end_time: float  # seconds from consultation start
    text: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    chunk_index: int = 0  # Which transcript chunk this came from

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time


class DiarizedSegment(BaseModel):
    """Transcript segment with speaker information."""
    text: str
    speaker: Speaker
    start_time: float
    end_time: float
    words: Optional[List[dict]] = None


# NEW: Incremental diarization state
class SpeakerState(BaseModel):
    """
    Maintains speaker state across streaming chunks.
    Stored in Redis for session persistence.
    """
    session_id: str
    current_speaker_id: str = "SPEAKER_0"  # Who is speaking now
    speakers: Dict[str, Speaker] = Field(default_factory=dict)  # speaker_id -> Speaker
    speaker_history: List[str] = Field(default_factory=list)  # Sequence of speaker turns

    # Incremental role confidence scores
    role_indicators: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    # Format: {speaker_id: {"doctor": count, "patient": count}}

    last_speaker_change_time: float = 0.0
    total_chunks_processed: int = 0
    confidence_threshold_met: bool = False  # True when confidence > 0.85


class IncrementalDiarizationResult(BaseModel):
    """
    Result of incremental diarization on a single chunk.
    """
    chunk_index: int
    speaker_id: str  # Current speaker for this chunk
    speaker_changed: bool  # Did speaker change from previous chunk?
    role: SpeakerRole
    role_confidence: float
    processing_time_ms: float

    # Cumulative session state
    total_speakers_detected: int
    session_duration_seconds: float


class DiarizationResult(BaseModel):
    """Result of speaker diarization (legacy for batch compatibility)."""
    speakers: List[Speaker]
    segments: List[SpeakerSegment]
    num_speakers: int
    processing_time_seconds: float
    method: str = "incremental"  # "incremental", "simple", "pyannote"


class SpeakerAssignment(BaseModel):
    """Assignment of roles to speakers."""
    speakers: Dict[str, SpeakerRole]  # speaker_id -> role
    confidence: float
    method: str  # "incremental_heuristic", "heuristic", "llm", "manual"
    reasoning: Optional[str] = None


class DiarizedTranscript(BaseModel):
    """Complete diarized transcript (built incrementally)."""
    segments: List[DiarizedSegment]
    speakers: List[Speaker]
    full_text: str
    text_by_speaker: Dict[str, str]  # speaker_id -> concatenated text
    timeline: List[DiarizedSegment]  # Chronological order
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConsultationContext(BaseModel):
    """Context for speaker identification."""
    appointment_type: str = "consultation"
    expected_speakers: int = 2
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    language: str = "es"


# NEW: WebSocket event for speaker changes
class SpeakerChangeEvent(BaseModel):
    """Emitted when speaker changes during streaming."""
    type: str = "speaker_changed"
    previous_speaker_id: str
    new_speaker_id: str
    new_speaker_role: SpeakerRole
    confidence: float
    timestamp: float
```

### 2. Create Incremental Diarization Service Interface
Create `src/transcription/diarization/base.py`:

```python
from abc import ABC, abstractmethod
from typing import Optional, Callable

from src.transcription.diarization.models import (
    IncrementalDiarizationResult,
    SpeakerState,
    SpeakerChangeEvent,
    ConsultationContext
)


class BaseIncrementalDiarizer(ABC):
    """
    Abstract base class for incremental speaker diarization services.

    Processes diarization on streaming transcript chunks, maintaining
    speaker state across chunks.
    """

    @abstractmethod
    async def process_chunk(
        self,
        transcript_text: str,
        timestamp: float,
        session_id: str,
        context: Optional[ConsultationContext] = None
    ) -> IncrementalDiarizationResult:
        """
        Process a single transcript chunk for speaker diarization.

        Args:
            transcript_text: Text from this chunk
            timestamp: Consultation timestamp (seconds from start)
            session_id: Session identifier for state persistence
            context: Optional consultation context

        Returns:
            IncrementalDiarizationResult with speaker info for this chunk
        """
        pass

    @abstractmethod
    async def get_speaker_state(self, session_id: str) -> Optional[SpeakerState]:
        """
        Retrieve current speaker state for a session.

        Args:
            session_id: Session identifier

        Returns:
            Current SpeakerState or None if not found
        """
        pass

    @abstractmethod
    async def finalize_session(self, session_id: str) -> SpeakerState:
        """
        Finalize diarization for a completed session.

        Args:
            session_id: Session identifier

        Returns:
            Final SpeakerState with complete speaker assignments
        """
        pass
```

### 3. Implement Incremental Diarization Service
Create `src/transcription/diarization/incremental_diarizer.py`:

```python
import structlog
from typing import Optional, Dict
import time
import json

from src.transcription.diarization.base import BaseIncrementalDiarizer
from src.transcription.diarization.models import (
    IncrementalDiarizationResult,
    SpeakerState,
    Speaker,
    SpeakerRole,
    SpeakerChangeEvent,
    ConsultationContext
)

logger = structlog.get_logger()


class IncrementalDiarizer(BaseIncrementalDiarizer):
    """
    Incremental speaker diarization for streaming transcription.

    Strategy:
    1. Detect speaker changes using silence/turn-taking patterns in chunks
    2. Incrementally build role confidence using medical terminology
    3. Update speaker assignments as more evidence accumulates
    4. Emit speaker change events for WebSocket notification
    """

    # Thresholds
    MIN_SILENCE_FOR_TURN_MS = 1500  # 1.5s silence suggests speaker change
    CONFIDENCE_THRESHOLD_HIGH = 0.85  # High confidence role assignment
    CONFIDENCE_THRESHOLD_MED = 0.70   # Medium confidence
    MIN_CHUNKS_FOR_LLM_VALIDATION = 6  # After 6 chunks (~30s), consider LLM validation

    # Medical terminology indicators (Spanish)
    DOCTOR_INDICATORS = [
        "diagnóstico", "receto", "prescrib", "medicamento", "dosis",
        "tratamiento", "examen", "análisis", "radiografía", "resonancia",
        "voy a recetarle", "debe tomar", "le recomiendo", "tiene que",
        "¿desde cuándo", "¿cómo se siente", "¿tiene algún",
        "miligramos", "cada 8 horas", "cada 12 horas", "mg", "ml",
        "vía oral", "intravenoso", "subcutáneo"
    ]

    PATIENT_INDICATORS = [
        "me duele", "tengo dolor", "siento", "me siento",
        "no puedo", "me cuesta", "desde hace", "empecé a",
        "molestia", "malestar", "síntoma", "preocupa",
        "gracias doctor", "muchas gracias", "me encuentro"
    ]

    def __init__(self, redis_client, event_callback=None):
        """
        Initialize incremental diarizer.

        Args:
            redis_client: Redis client for session state persistence
            event_callback: Optional callback for speaker change events
        """
        self.redis = redis_client
        self.event_callback = event_callback

    async def process_chunk(
        self,
        transcript_text: str,
        timestamp: float,
        session_id: str,
        context: Optional[ConsultationContext] = None
    ) -> IncrementalDiarizationResult:
        """
        Process a single transcript chunk for speaker identification.

        Steps:
        1. Load or initialize speaker state
        2. Detect if speaker has changed (based on content/patterns)
        3. Update role indicators incrementally
        4. Update speaker confidence scores
        5. Persist state to Redis
        6. Emit event if speaker changed
        """
        start_time = time.time()

        # 1. Load speaker state from Redis
        state = await self._load_state(session_id)
        if state is None:
            state = SpeakerState(
                session_id=session_id,
                current_speaker_id="SPEAKER_0",
                speakers={
                    "SPEAKER_0": Speaker(id="SPEAKER_0", role=SpeakerRole.UNKNOWN),
                    "SPEAKER_1": Speaker(id="SPEAKER_1", role=SpeakerRole.UNKNOWN)
                },
                role_indicators={
                    "SPEAKER_0": {"doctor": 0, "patient": 0},
                    "SPEAKER_1": {"doctor": 0, "patient": 0}
                }
            )

        # 2. Detect speaker change (heuristic: long silence in previous chunk)
        # In streaming, we use a simple heuristic:
        # - If chunk starts with patient indicators, likely patient speaking
        # - If chunk starts with doctor indicators/questions, likely doctor
        # - Otherwise, assume current speaker continues

        previous_speaker = state.current_speaker_id
        detected_speaker = self._detect_current_speaker(transcript_text, state)

        speaker_changed = (detected_speaker != previous_speaker)

        if speaker_changed:
            logger.info(
                "Speaker change detected",
                session_id=session_id,
                previous=previous_speaker,
                new=detected_speaker,
                chunk_index=state.total_chunks_processed
            )
            state.current_speaker_id = detected_speaker
            state.last_speaker_change_time = timestamp
            state.speaker_history.append(detected_speaker)

        # 3. Update role indicators for current speaker
        self._update_role_indicators(state, detected_speaker, transcript_text)

        # 4. Update speaker confidence based on accumulated indicators
        current_role, current_confidence = self._calculate_role_confidence(
            state, detected_speaker
        )

        # Update speaker object
        state.speakers[detected_speaker].role = current_role
        state.speakers[detected_speaker].confidence = current_confidence
        state.speakers[detected_speaker].last_seen_at = timestamp
        state.speakers[detected_speaker].total_speech_duration += 5.0  # Assuming ~5s chunks

        # Check if confidence threshold met
        if current_confidence >= self.CONFIDENCE_THRESHOLD_HIGH:
            state.confidence_threshold_met = True

        # 5. Increment chunk counter
        state.total_chunks_processed += 1

        # 6. Persist state to Redis
        await self._save_state(state)

        # 7. Emit speaker change event if changed
        if speaker_changed and self.event_callback:
            event = SpeakerChangeEvent(
                previous_speaker_id=previous_speaker,
                new_speaker_id=detected_speaker,
                new_speaker_role=current_role,
                confidence=current_confidence,
                timestamp=timestamp
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
            processing_ms=round(processing_time_ms, 1)
        )

        return IncrementalDiarizationResult(
            chunk_index=state.total_chunks_processed - 1,
            speaker_id=detected_speaker,
            speaker_changed=speaker_changed,
            role=current_role,
            role_confidence=current_confidence,
            processing_time_ms=processing_time_ms,
            total_speakers_detected=len(state.speakers),
            session_duration_seconds=timestamp
        )

    def _detect_current_speaker(
        self,
        text: str,
        state: SpeakerState
    ) -> str:
        """
        Detect which speaker is currently speaking in this chunk.

        Simple heuristic:
        - Count doctor vs patient indicators in this chunk
        - If strong signal, may indicate speaker change
        - Otherwise, assume current speaker continues
        """
        text_lower = text.lower()

        doctor_count = sum(1 for ind in self.DOCTOR_INDICATORS if ind in text_lower)
        patient_count = sum(1 for ind in self.PATIENT_INDICATORS if ind in text_lower)

        # Strong doctor signal (questions, prescriptions)
        if doctor_count >= 2:
            # Find speaker most likely to be doctor
            return self._get_most_likely_speaker(state, SpeakerRole.DOCTOR)

        # Strong patient signal (symptoms, pain)
        if patient_count >= 2:
            # Find speaker most likely to be patient
            return self._get_most_likely_speaker(state, SpeakerRole.PATIENT)

        # No strong signal, continue with current speaker
        return state.current_speaker_id

    def _get_most_likely_speaker(
        self,
        state: SpeakerState,
        target_role: SpeakerRole
    ) -> str:
        """
        Get speaker ID most likely to have the target role.
        """
        # If we already have role assignments, use them
        for speaker_id, speaker in state.speakers.items():
            if speaker.role == target_role and speaker.confidence > 0.6:
                return speaker_id

        # Otherwise, check indicators
        best_speaker = None
        best_score = -1

        role_key = "doctor" if target_role == SpeakerRole.DOCTOR else "patient"

        for speaker_id in state.speakers.keys():
            score = state.role_indicators.get(speaker_id, {}).get(role_key, 0)
            if score > best_score:
                best_score = score
                best_speaker = speaker_id

        # Default to alternating speaker
        if best_speaker is None:
            return "SPEAKER_1" if state.current_speaker_id == "SPEAKER_0" else "SPEAKER_0"

        return best_speaker

    def _update_role_indicators(
        self,
        state: SpeakerState,
        speaker_id: str,
        text: str
    ) -> None:
        """
        Update role indicator counts for the speaker based on text content.
        """
        text_lower = text.lower()

        # Ensure speaker exists in role_indicators
        if speaker_id not in state.role_indicators:
            state.role_indicators[speaker_id] = {"doctor": 0, "patient": 0}

        # Count doctor indicators
        for indicator in self.DOCTOR_INDICATORS:
            if indicator in text_lower:
                state.role_indicators[speaker_id]["doctor"] += 1

        # Count patient indicators
        for indicator in self.PATIENT_INDICATORS:
            if indicator in text_lower:
                state.role_indicators[speaker_id]["patient"] += 1

    def _calculate_role_confidence(
        self,
        state: SpeakerState,
        speaker_id: str
    ) -> tuple[SpeakerRole, float]:
        """
        Calculate role and confidence based on accumulated indicators.

        Returns:
            (role, confidence) tuple
        """
        indicators = state.role_indicators.get(speaker_id, {"doctor": 0, "patient": 0})
        doctor_score = indicators["doctor"]
        patient_score = indicators["patient"]
        total = doctor_score + patient_score

        if total == 0:
            # No indicators yet, use defaults
            # First speaker (SPEAKER_0) defaults to doctor with low confidence
            if speaker_id == "SPEAKER_0":
                return SpeakerRole.DOCTOR, 0.5
            else:
                return SpeakerRole.PATIENT, 0.5

        # Calculate confidence based on score ratio
        if doctor_score > patient_score:
            role = SpeakerRole.DOCTOR
            confidence = doctor_score / total
        else:
            role = SpeakerRole.PATIENT
            confidence = patient_score / total

        # Boost confidence if we have many indicators
        if total >= 10:
            confidence = min(confidence + 0.1, 1.0)
        if total >= 20:
            confidence = min(confidence + 0.1, 1.0)

        return role, confidence

    async def get_speaker_state(self, session_id: str) -> Optional[SpeakerState]:
        """Retrieve current speaker state from Redis."""
        return await self._load_state(session_id)

    async def finalize_session(self, session_id: str) -> SpeakerState:
        """
        Finalize diarization for completed session.

        - Ensure both speakers have roles assigned
        - Calculate final confidence scores
        - Clean up Redis state
        """
        state = await self._load_state(session_id)
        if state is None:
            raise ValueError(f"No speaker state found for session {session_id}")

        # Ensure complementary role assignment
        # If one speaker is DOCTOR, the other should be PATIENT
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
            confidence={k: round(v.confidence, 2) for k, v in state.speakers.items()}
        )

        return state

    # Redis state management
    async def _load_state(self, session_id: str) -> Optional[SpeakerState]:
        """Load speaker state from Redis."""
        key = f"speaker_state:{session_id}"
        data = await self.redis.get(key)
        if data:
            return SpeakerState.parse_raw(data)
        return None

    async def _save_state(self, state: SpeakerState) -> None:
        """Save speaker state to Redis."""
        key = f"speaker_state:{state.session_id}"
        # TTL: 2 hours (long consultations + buffer)
        await self.redis.setex(key, 7200, state.json())
```

### 4. Implement LLM-Based Speaker Validation (Optional)
Create `src/transcription/diarization/llm_validator.py`:

```python
import structlog
from typing import List, Optional
import json

from src.core.llm.client import LLMClient
from src.transcription.diarization.models import (
    SpeakerState,
    SpeakerAssignment,
    SpeakerRole,
    ConsultationContext
)

logger = structlog.get_logger()


class LLMSpeakerValidator:
    """
    Uses LLM to validate/improve speaker role assignments when confidence is low.

    Strategy:
    - Only invoked when incremental heuristics yield low confidence (<0.70) after ~30s
    - Analyzes recent transcript history (not full consultation)
    - Cost: ~$0.01 per validation (uses GPT-4o-mini)
    """

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def validate_roles(
        self,
        state: SpeakerState,
        recent_transcript: str,
        context: Optional[ConsultationContext] = None
    ) -> SpeakerAssignment:
        """
        Use LLM to validate or improve role assignments when heuristic confidence is low.

        Args:
            state: Current speaker state with incremental assignments
            recent_transcript: Recent transcript text (last ~30s)
            context: Optional consultation context

        Returns:
            SpeakerAssignment with improved roles and confidence
        """
        # Build prompt with current assignments and recent transcript
        prompt = self._build_validation_prompt(state, recent_transcript, context)

        try:
            response = await self.llm_client.complete(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                model="gpt-4o-mini",  # Cheaper model for validation
                max_tokens=300,
                temperature=0.1  # Low temperature for consistent results
            )

            # Parse response
            result = self._parse_response(response.content)

            logger.info(
                "LLM speaker validation complete",
                assignments=result.speakers,
                confidence=result.confidence,
                improved_from={k: v.role.value for k, v in state.speakers.items()}
            )

            return result

        except Exception as e:
            logger.error("LLM speaker validation failed", error=str(e))
            # Fallback to current state assignments
            current_assignments = {k: v.role for k, v in state.speakers.items()}
            return SpeakerAssignment(
                speakers=current_assignments,
                confidence=0.5,
                method="llm_validation_failed",
                reasoning=f"LLM validation failed: {str(e)}, using heuristic assignments"
            )

    def _get_system_prompt(self) -> str:
        return """Eres un experto en análisis de conversaciones médicas.
Tu tarea es validar o corregir la asignación de roles (médico vs paciente) en una transcripción en progreso.

Analiza el contenido, el tipo de preguntas, las respuestas, y el uso de terminología médica para determinar si las asignaciones actuales son correctas.

Responde SIEMPRE en formato JSON válido."""

    def _build_validation_prompt(
        self,
        state: SpeakerState,
        recent_transcript: str,
        context: Optional[ConsultationContext] = None
    ) -> str:
        # Get current assignments
        current_assignments = {k: v.role.value for k, v in state.speakers.items()}
        current_confidence = {k: round(v.confidence, 2) for k, v in state.speakers.items()}

        context_info = ""
        if context:
            context_info = f"""
Contexto adicional:
- Tipo de cita: {context.appointment_type}
- Participantes esperados: {context.expected_speakers}
"""

        return f"""Estamos procesando una consulta médica en tiempo real.
Nuestro sistema heurístico ha asignado los siguientes roles a los hablantes, pero la confianza es baja:

Asignaciones actuales:
{json.dumps(current_assignments, indent=2)}

Nivel de confianza:
{json.dumps(current_confidence, indent=2)}

{context_info}

Transcripción reciente (últimos ~30 segundos):
{recent_transcript}

Por favor valida o corrige estas asignaciones de roles.

Responde en formato JSON con la siguiente estructura:
{{
    "speakers": {{
        "SPEAKER_0": "doctor" o "patient",
        "SPEAKER_1": "doctor" o "patient"
    }},
    "confidence": 0.0 a 1.0,
    "reasoning": "Explicación breve de por qué validaste o corregiste los roles"
}}

Analiza:
1. ¿Las asignaciones actuales son correctas según el contenido?
2. ¿Hay evidencia clara de quién hace preguntas vs quién describe síntomas?
3. ¿El uso de terminología médica coincide con el rol asignado?
"""

    def _parse_response(self, response: str) -> SpeakerAssignment:
        """Parse LLM response into SpeakerAssignment."""
        try:
            # Extract JSON from response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)

                speakers = {}
                for speaker_id, role in data.get("speakers", {}).items():
                    if role.lower() == "doctor":
                        speakers[speaker_id] = SpeakerRole.DOCTOR
                    elif role.lower() == "patient":
                        speakers[speaker_id] = SpeakerRole.PATIENT
                    else:
                        speakers[speaker_id] = SpeakerRole.OTHER

                return SpeakerAssignment(
                    speakers=speakers,
                    confidence=data.get("confidence", 0.8),
                    method="llm",
                    reasoning=data.get("reasoning", "")
                )
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("Failed to parse LLM response", error=str(e))

        # Default assignment
        return SpeakerAssignment(
            speakers={
                "SPEAKER_0": SpeakerRole.DOCTOR,
                "SPEAKER_1": SpeakerRole.PATIENT
            },
            confidence=0.5,
            method="llm_parse_error"
        )
```

### 5. Implement Incremental Transcript Builder
Create `src/transcription/diarization/incremental_builder.py`:

```python
import structlog
from typing import List, Optional

from src.transcription.diarization.models import (
    DiarizedSegment,
    DiarizedTranscript,
    SpeakerState,
    Speaker,
    SpeakerRole
)

logger = structlog.get_logger()


class IncrementalTranscriptBuilder:
    """
    Builds diarized transcript incrementally as chunks arrive.

    Maintains cumulative state and can produce a DiarizedTranscript at any point.
    """

    def __init__(self, redis_client):
        """
        Initialize incremental builder.

        Args:
            redis_client: Redis client for storing incremental transcript state
        """
        self.redis = redis_client

    async def add_chunk(
        self,
        session_id: str,
        text: str,
        speaker_id: str,
        speaker_role: SpeakerRole,
        start_time: float,
        end_time: float
    ) -> DiarizedSegment:
        """
        Add a new transcript chunk to the incremental transcript.

        Args:
            session_id: Session identifier
            text: Transcript text for this chunk
            speaker_id: Speaker ID (e.g., "SPEAKER_0")
            speaker_role: Speaker role
            start_time: Start timestamp (seconds)
            end_time: End timestamp (seconds)

        Returns:
            DiarizedSegment that was added
        """
        # Load existing transcript state
        transcript_state = await self._load_transcript_state(session_id)

        if transcript_state is None:
            transcript_state = {
                "segments": [],
                "speakers_seen": set()
            }

        # Create diarized segment
        segment = DiarizedSegment(
            text=text,
            speaker=Speaker(id=speaker_id, role=speaker_role),
            start_time=start_time,
            end_time=end_time
        )

        # Add to segments
        transcript_state["segments"].append(segment.dict())
        transcript_state["speakers_seen"].add(speaker_id)

        # Save updated state
        await self._save_transcript_state(session_id, transcript_state)

        logger.debug(
            "Added chunk to incremental transcript",
            session_id=session_id,
            speaker=speaker_id,
            role=speaker_role.value,
            total_segments=len(transcript_state["segments"])
        )

        return segment

    async def get_current_transcript(
        self,
        session_id: str,
        speaker_state: SpeakerState
    ) -> DiarizedTranscript:
        """
        Get current diarized transcript state.

        Args:
            session_id: Session identifier
            speaker_state: Current speaker state with role assignments

        Returns:
            Current DiarizedTranscript
        """
        transcript_state = await self._load_transcript_state(session_id)

        if transcript_state is None:
            return DiarizedTranscript(
                segments=[],
                speakers=[],
                full_text="",
                text_by_speaker={},
                timeline=[]
            )

        # Rebuild segments with updated speaker info from state
        segments = []
        for seg_dict in transcript_state["segments"]:
            speaker_id = seg_dict["speaker"]["id"]
            # Get updated speaker from state
            speaker = speaker_state.speakers.get(
                speaker_id,
                Speaker(id=speaker_id, role=SpeakerRole.UNKNOWN)
            )
            segments.append(DiarizedSegment(
                text=seg_dict["text"],
                speaker=speaker,
                start_time=seg_dict["start_time"],
                end_time=seg_dict["end_time"]
            ))

        # Build text by speaker
        text_by_speaker = {}
        for speaker_id in speaker_state.speakers.keys():
            texts = [
                seg.text for seg in segments
                if seg.speaker.id == speaker_id and seg.text
            ]
            text_by_speaker[speaker_id] = " ".join(texts)

        # Full text
        full_text = " ".join(seg.text for seg in segments if seg.text)

        # Timeline (chronological)
        timeline = sorted(segments, key=lambda x: x.start_time)

        return DiarizedTranscript(
            segments=segments,
            speakers=list(speaker_state.speakers.values()),
            full_text=full_text,
            text_by_speaker=text_by_speaker,
            timeline=timeline
        )

    async def _load_transcript_state(self, session_id: str) -> Optional[dict]:
        """Load incremental transcript state from Redis."""
        key = f"transcript_state:{session_id}"
        data = await self.redis.get(key)
        if data:
            import json
            return json.loads(data)
        return None

    async def _save_transcript_state(self, session_id: str, state: dict) -> None:
        """Save incremental transcript state to Redis."""
        import json
        key = f"transcript_state:{session_id}"
        # Convert set to list for JSON serialization
        state["speakers_seen"] = list(state["speakers_seen"])
        # TTL: 2 hours
        await self.redis.setex(key, 7200, json.dumps(state))


class ConversationFormatter:
    """Formats diarized transcript as readable conversation."""

    @staticmethod
    def format_conversation(
        transcript: DiarizedTranscript,
        include_timestamps: bool = False,
        use_role_labels: bool = True
    ) -> str:
        """
        Format diarized transcript as readable conversation.

        Args:
            transcript: Diarized transcript
            include_timestamps: Include time markers
            use_role_labels: Use "Doctor"/"Paciente" instead of speaker IDs

        Returns:
            Formatted conversation string
        """
        lines = []

        for segment in transcript.timeline:
            # Determine label
            if use_role_labels:
                if segment.speaker.role == SpeakerRole.DOCTOR:
                    label = "Doctor"
                elif segment.speaker.role == SpeakerRole.PATIENT:
                    label = "Paciente"
                else:
                    label = segment.speaker.id
            else:
                label = segment.speaker.id

            # Format line
            if include_timestamps:
                time_str = f"[{segment.start_time:.1f}s]"
                lines.append(f"{time_str} {label}: {segment.text}")
            else:
                lines.append(f"{label}: {segment.text}")

        return "\n\n".join(lines)

    @staticmethod
    def format_speaker_summary(speaker_state: SpeakerState) -> str:
        """
        Format summary of speaker assignments.

        Args:
            speaker_state: Current speaker state

        Returns:
            Formatted summary string
        """
        lines = ["Speaker Assignments:"]
        for speaker_id, speaker in speaker_state.speakers.items():
            lines.append(
                f"  {speaker_id}: {speaker.role.value} "
                f"(confidence: {speaker.confidence:.2f}, "
                f"duration: {speaker.total_speech_duration:.1f}s)"
            )
        return "\n".join(lines)
```

### 6. Create Diarization Module Exports
Create `src/transcription/diarization/__init__.py`:

```python
from src.transcription.diarization.models import (
    Speaker,
    SpeakerRole,
    SpeakerState,
    SpeakerSegment,
    SpeakerChangeEvent,
    IncrementalDiarizationResult,
    DiarizationResult,
    SpeakerAssignment,
    DiarizedSegment,
    DiarizedTranscript,
    ConsultationContext
)
from src.transcription.diarization.incremental_diarizer import IncrementalDiarizer
from src.transcription.diarization.llm_validator import LLMSpeakerValidator
from src.transcription.diarization.incremental_builder import (
    IncrementalTranscriptBuilder,
    ConversationFormatter
)

__all__ = [
    # Models
    "Speaker",
    "SpeakerRole",
    "SpeakerState",
    "SpeakerSegment",
    "SpeakerChangeEvent",
    "IncrementalDiarizationResult",
    "DiarizationResult",
    "SpeakerAssignment",
    "DiarizedSegment",
    "DiarizedTranscript",
    "ConsultationContext",

    # Services
    "IncrementalDiarizer",
    "LLMSpeakerValidator",
    "IncrementalTranscriptBuilder",
    "ConversationFormatter",
]
```

### 7. Write Incremental Diarization Tests
Create `tests/unit/test_incremental_diarization.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.transcription.diarization import (
    IncrementalDiarizer,
    IncrementalTranscriptBuilder,
    ConversationFormatter,
    Speaker,
    SpeakerRole,
    SpeakerState,
    IncrementalDiarizationResult,
    SpeakerChangeEvent,
    DiarizedTranscript,
    ConsultationContext
)


class TestIncrementalDiarizer:
    """Tests for incremental diarization."""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        redis = AsyncMock()
        redis.get = AsyncMock(return_value=None)
        redis.setex = AsyncMock()
        return redis

    @pytest.fixture
    def diarizer(self, mock_redis):
        """Create diarizer with mocked Redis."""
        return IncrementalDiarizer(redis_client=mock_redis)

    @pytest.mark.asyncio
    async def test_process_first_chunk_initializes_state(self, diarizer, mock_redis):
        """Test that first chunk initializes speaker state."""
        result = await diarizer.process_chunk(
            transcript_text="Buenos días, ¿cómo se encuentra?",
            timestamp=1.0,
            session_id="test-session-1"
        )

        assert result.chunk_index == 0
        assert result.speaker_id in ["SPEAKER_0", "SPEAKER_1"]
        assert result.speaker_changed is False  # First chunk, no change
        assert mock_redis.setex.called

    @pytest.mark.asyncio
    async def test_process_chunk_detects_doctor_speaker(self, diarizer, mock_redis):
        """Test detection of doctor based on medical terminology."""
        result = await diarizer.process_chunk(
            transcript_text="Voy a recetarle ibuprofeno 400 miligramos cada 8 horas.",
            timestamp=5.0,
            session_id="test-session-2"
        )

        # After this chunk, should have doctor indicators
        state = await diarizer.get_speaker_state("test-session-2")
        speaker = state.speakers[result.speaker_id]

        # Should have doctor indicators counted
        assert state.role_indicators[result.speaker_id]["doctor"] > 0

    @pytest.mark.asyncio
    async def test_process_chunk_detects_patient_speaker(self, diarizer, mock_redis):
        """Test detection of patient based on symptom descriptions."""
        result = await diarizer.process_chunk(
            transcript_text="Me duele mucho la cabeza desde hace tres días.",
            timestamp=10.0,
            session_id="test-session-3"
        )

        state = await diarizer.get_speaker_state("test-session-3")
        speaker = state.speakers[result.speaker_id]

        # Should have patient indicators counted
        assert state.role_indicators[result.speaker_id]["patient"] > 0

    @pytest.mark.asyncio
    async def test_speaker_change_emits_event(self, diarizer, mock_redis):
        """Test that speaker changes emit events."""
        events_emitted = []

        async def event_callback(event: SpeakerChangeEvent):
            events_emitted.append(event)

        diarizer.event_callback = event_callback

        # Process first chunk (doctor greeting)
        await diarizer.process_chunk(
            transcript_text="Buenos días, ¿cómo está?",
            timestamp=1.0,
            session_id="test-session-4"
        )

        # Process second chunk (patient response)
        await diarizer.process_chunk(
            transcript_text="Hola doctor, me duele la cabeza.",
            timestamp=6.0,
            session_id="test-session-4"
        )

        # Should have detected speaker change and emitted event
        # (exact behavior depends on heuristic, may or may not change on 2nd chunk)

    @pytest.mark.asyncio
    async def test_confidence_increases_with_more_indicators(self, diarizer, mock_redis):
        """Test that confidence increases as more indicators accumulate."""
        session_id = "test-session-5"

        # First chunk
        result1 = await diarizer.process_chunk(
            transcript_text="Voy a recetarle",
            timestamp=1.0,
            session_id=session_id
        )
        confidence1 = result1.role_confidence

        # Second chunk with more doctor indicators
        result2 = await diarizer.process_chunk(
            transcript_text="este medicamento de 400 miligramos",
            timestamp=6.0,
            session_id=session_id
        )
        confidence2 = result2.role_confidence

        # Confidence should increase with more evidence
        # (may not be true if speaker changed, so check same speaker)
        if result1.speaker_id == result2.speaker_id:
            assert confidence2 >= confidence1


class TestIncrementalTranscriptBuilder:
    """Tests for incremental transcript builder."""

    @pytest.fixture
    def mock_redis(self):
        redis = AsyncMock()
        redis.get = AsyncMock(return_value=None)
        redis.setex = AsyncMock()
        return redis

    @pytest.fixture
    def builder(self, mock_redis):
        return IncrementalTranscriptBuilder(redis_client=mock_redis)

    @pytest.mark.asyncio
    async def test_add_chunk_creates_segment(self, builder):
        """Test adding a chunk creates a diarized segment."""
        segment = await builder.add_chunk(
            session_id="test-session-6",
            text="Buenos días.",
            speaker_id="SPEAKER_0",
            speaker_role=SpeakerRole.DOCTOR,
            start_time=0.0,
            end_time=2.0
        )

        assert segment.text == "Buenos días."
        assert segment.speaker.id == "SPEAKER_0"
        assert segment.speaker.role == SpeakerRole.DOCTOR

    @pytest.mark.asyncio
    async def test_get_current_transcript_builds_full_transcript(self, builder, mock_redis):
        """Test getting current transcript builds complete state."""
        session_id = "test-session-7"

        # Add multiple chunks
        await builder.add_chunk(
            session_id=session_id,
            text="Buenos días.",
            speaker_id="SPEAKER_0",
            speaker_role=SpeakerRole.DOCTOR,
            start_time=0.0,
            end_time=2.0
        )

        await builder.add_chunk(
            session_id=session_id,
            text="Hola doctor.",
            speaker_id="SPEAKER_1",
            speaker_role=SpeakerRole.PATIENT,
            start_time=3.0,
            end_time=5.0
        )

        # Create speaker state
        speaker_state = SpeakerState(
            session_id=session_id,
            speakers={
                "SPEAKER_0": Speaker(id="SPEAKER_0", role=SpeakerRole.DOCTOR),
                "SPEAKER_1": Speaker(id="SPEAKER_1", role=SpeakerRole.PATIENT)
            }
        )

        # Get current transcript
        transcript = await builder.get_current_transcript(session_id, speaker_state)

        assert len(transcript.segments) == 2
        assert "Buenos días" in transcript.full_text
        assert "Hola doctor" in transcript.full_text


class TestConversationFormatter:
    """Tests for conversation formatter."""

    def test_format_conversation_with_roles(self):
        """Test formatting with role labels."""
        transcript = DiarizedTranscript(
            segments=[],
            speakers=[
                Speaker(id="SPEAKER_0", role=SpeakerRole.DOCTOR),
                Speaker(id="SPEAKER_1", role=SpeakerRole.PATIENT)
            ],
            full_text="",
            text_by_speaker={},
            timeline=[
                DiarizedSegment(
                    text="Buenos días.",
                    speaker=Speaker(id="SPEAKER_0", role=SpeakerRole.DOCTOR),
                    start_time=0, end_time=1
                ),
                DiarizedSegment(
                    text="Hola doctor.",
                    speaker=Speaker(id="SPEAKER_1", role=SpeakerRole.PATIENT),
                    start_time=2, end_time=3
                ),
            ]
        )

        formatted = ConversationFormatter.format_conversation(transcript)

        assert "Doctor: Buenos días." in formatted
        assert "Paciente: Hola doctor." in formatted

    def test_format_speaker_summary(self):
        """Test formatting speaker summary."""
        state = SpeakerState(
            session_id="test",
            speakers={
                "SPEAKER_0": Speaker(
                    id="SPEAKER_0",
                    role=SpeakerRole.DOCTOR,
                    confidence=0.92,
                    total_speech_duration=45.5
                ),
                "SPEAKER_1": Speaker(
                    id="SPEAKER_1",
                    role=SpeakerRole.PATIENT,
                    confidence=0.88,
                    total_speech_duration=38.2
                )
            }
        )

        summary = ConversationFormatter.format_speaker_summary(state)

        assert "SPEAKER_0" in summary
        assert "doctor" in summary
        assert "0.92" in summary
        assert "45.5s" in summary
```

## Expected Deliverables
- `src/transcription/diarization/__init__.py` - Module exports
- `src/transcription/diarization/models.py` - Data models (with incremental state)
- `src/transcription/diarization/base.py` - Interface for incremental diarizer
- `src/transcription/diarization/incremental_diarizer.py` - Incremental implementation
- `src/transcription/diarization/llm_validator.py` - LLM-based validation (optional)
- `src/transcription/diarization/incremental_builder.py` - Incremental transcript builder
- `tests/unit/test_incremental_diarization.py` - Unit tests

## Verification Steps

### Functional Requirements
1. **Incremental processing**: Diarizer processes chunks in <50ms (p95)
2. **Speaker detection**: Detects speaker changes based on content indicators
3. **Role confidence**: Confidence increases incrementally with more evidence
4. **State persistence**: Speaker state persists in Redis across chunks
5. **Event emission**: Speaker change events emitted to WebSocket Gateway
6. **Transcript building**: Incremental transcript builder maintains cumulative state

### Integration Requirements
7. **Stream Processor integration**: Receives chunks from Prompt 17
8. **Incremental Extractor integration**: Sends speaker-tagged chunks to Prompt 19
9. **Redis session state**: Maintains state with 2-hour TTL
10. **LLM validation**: Optional validation for low-confidence scenarios (<0.70 after 30s)

### Quality Requirements
11. **Accuracy**: >85% correct speaker role assignment after 30s of consultation
12. **Latency**: Diarization processing adds <50ms per chunk (p95)
13. **Cost optimization**: Heuristic approach costs $0 (LLM validation ~$0.01 if triggered)

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Chunk processing latency** | <50ms (p95) | Incremental diarization overhead |
| **Speaker detection accuracy** | >85% after 30s | Role assignment correctness |
| **Confidence threshold** | >0.85 | High confidence role assignment |
| **State persistence** | Redis, 2h TTL | Session speaker state |
| **Cost per consultation** | $0 - $0.01 | $0 heuristic, $0.01 if LLM validation |

## Integration Flow

```
Stream Processor (Prompt 17)
    │
    │ transcript_chunk (5s audio transcribed)
    ▼
┌───────────────────────────────────────┐
│   Incremental Diarizer                │
│                                       │
│   1. Load speaker state (Redis)       │
│   2. Detect current speaker           │
│   3. Update role indicators           │
│   4. Calculate confidence             │
│   5. Save state (Redis)               │
│   6. Emit speaker_change_event        │
└───────────────────────────────────────┘
    │
    │ speaker_id, role, confidence
    ▼
Incremental Extractor (Prompt 19)
(Extract entities with speaker attribution)
```

## Notes

### Cost Optimization Strategy
- **Heuristic-first**: Start with zero-cost medical terminology indicators
- **Incremental confidence**: Build confidence gradually over chunks
- **Optional LLM validation**: Only invoke LLM when confidence <0.70 after 30s (~20% of cases)
- **Expected cost**: $0 for 80% consultations, $0.01 for 20% requiring validation

### Spanish Medical Terminology
- Doctor indicators: "diagnóstico", "receto", "prescrib", "medicamento", "dosis", "tratamiento"
- Patient indicators: "me duele", "tengo dolor", "siento", "me siento", "molestia"
- Default assumption: 2 speakers (doctor + patient)

### Real-Time Considerations
- **State persistence**: Redis ensures state survives WebSocket reconnections
- **Speaker change events**: Immediate WebSocket notification for UI updates
- **Incremental building**: Diarized transcript available at any point during consultation
- **Session cleanup**: 2-hour Redis TTL prevents state leakage
