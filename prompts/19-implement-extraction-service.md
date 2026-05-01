# Prompt 19: Implement Incremental Medical Extraction with Entity Matching

## Objective
Implement the incremental medical information extraction service using GPT-4o/GPT-4o-mini tiering, with Entity Matching Engine for conflict resolution and async RAG validation, optimized for Spanish medical terminology in real-time streaming context.

## Context
**Real-Time Streaming Architecture:** This service is a critical component of the real-time extraction pipeline.

This service will:
- **Process partial transcripts** incrementally as they arrive from Stream Processor
- Use **multi-tier LLM strategy**:
  - GPT-4o-mini (60%): Simple extractions (symptoms, chief complaint)
  - GPT-4o (40%): Critical extractions (prescriptions, diagnoses)
- **Integrate Entity Matching Engine** (Prompt 19-A) for duplicate detection and conflict resolution
- **Emit extraction events** back to WebSocket Gateway in real-time
- **Trigger async RAG validation** with priority queue (CRITICAL/HIGH/MEDIUM)
- Track extraction costs and latency

**Latency Target:** <3s for extraction + entity matching + event emission

## Reference Documents
- `Prompt 19-A` - Entity Matching Engine design
- `PROMPT-12-INCREMENTAL-RAG.md` - Async RAG validation
- `PROMPT-07-REALTIME-PIPELINE.md` - Real-time architecture
- `docs/architecture/c4-container-diagram.md` - Extraction Module component

## Tasks

### 1. Create Incremental Extraction Models

Create `ai-service/src/services/extraction/models.py`:

```python
"""
Modelos de datos para extracción incremental médica.
"""
from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class EntityType(str, Enum):
    """Tipos de entidades médicas."""
    MEDICATION = "medication"
    SYMPTOM = "symptom"
    DIAGNOSIS = "diagnosis"
    PROCEDURE = "procedure"
    VITAL_SIGN = "vital_sign"
    ALLERGY = "allergy"
    CHIEF_COMPLAINT = "chief_complaint"


class ExtractionPriority(str, Enum):
    """Prioridad para RAG validation."""
    CRITICAL = "critical"  # Prescriptions, drug interactions - <1s
    HIGH = "high"          # Diagnoses, procedures - <2s
    MEDIUM = "medium"      # Symptoms, vital signs - <3s


class MedicationEntity(BaseModel):
    """Medicamento extraído."""
    id: Optional[str] = None  # Assigned by Entity Matching Engine
    name: str = Field(description="Nombre del medicamento")
    dosage: Optional[str] = Field(None, description="Dosis, ej: '500mg'")
    frequency: Optional[str] = Field(None, description="Frecuencia, ej: 'cada 8h'")
    duration: Optional[str] = Field(None, description="Duración del tratamiento")
    route: Optional[str] = Field(None, description="Vía: oral, IV, IM, etc.")
    instructions: Optional[str] = Field(None, description="Instrucciones adicionales")
    is_new_prescription: bool = Field(True, description="Nueva prescripción o continuación")
    extracted_from: Optional[str] = Field(None, description="Snippet de transcripción")
    timestamp: float = Field(description="Timestamp de extracción")
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class SymptomEntity(BaseModel):
    """Síntoma extraído."""
    id: Optional[str] = None
    description: str = Field(description="Descripción del síntoma")
    location: Optional[str] = Field(None, description="Localización corporal")
    severity: Optional[str] = Field(None, description="leve, moderado, severo")
    duration: Optional[str] = Field(None, description="Duración del síntoma")
    frequency: Optional[str] = Field(None, description="constante, intermitente, etc.")
    extracted_from: Optional[str] = None
    timestamp: float
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class DiagnosisEntity(BaseModel):
    """Diagnóstico extraído."""
    id: Optional[str] = None
    description: str = Field(description="Descripción del diagnóstico")
    status: str = Field(description="confirmado, sospechado, descartado, antecedente")
    icd10_code: Optional[str] = Field(None, description="Código CIE-10 si es obvio")
    extracted_from: Optional[str] = None
    timestamp: float
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ChiefComplaintEntity(BaseModel):
    """Motivo principal de consulta."""
    id: Optional[str] = None
    complaint: str = Field(description="Motivo principal")
    extracted_from: Optional[str] = None
    timestamp: float
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ExtractionEvent(BaseModel):
    """Evento de extracción para WebSocket."""
    event_type: str  # e.g., "medication_extracted", "symptom_updated"
    entity_type: EntityType
    entity_data: dict
    priority: ExtractionPriority
    timestamp: float
    session_id: str
```

### 2. Create Incremental Extraction Service

Create `ai-service/src/services/extraction/incremental_extractor.py`:

```python
"""
Servicio de extracción incremental para streaming.
Procesa transcripciones parciales y emite entidades conforme se extraen.
"""
import asyncio
import time
import uuid
from typing import Callable, Optional

from openai import AsyncOpenAI
from pydantic import BaseModel

from src.core.config import get_settings
from src.core.logging import get_logger
from src.core.metrics import metrics
from src.services.extraction.models import (
    EntityType,
    ExtractionPriority,
    ExtractionEvent,
    MedicationEntity,
    SymptomEntity,
    DiagnosisEntity,
    ChiefComplaintEntity
)

settings = get_settings()
logger = get_logger(__name__)


class IncrementalExtractor:
    """
    Extractor incremental con multi-tier LLM y Entity Matching.

    Strategy:
    - GPT-4o-mini (60%): Symptoms, chief complaint, vital signs
    - GPT-4o (40%): Medications, diagnoses (critical)
    """

    # Multi-tier model selection
    MODEL_SIMPLE = "gpt-4o-mini"  # 60% of extractions
    MODEL_CRITICAL = "gpt-4o"     # 40% of extractions

    # System prompts
    SYSTEM_PROMPT_SIMPLE = """Eres un asistente médico que extrae síntomas y motivos de consulta de transcripciones parciales en español.

Extrae SOLO:
- Síntomas reportados por el paciente
- Motivo principal de consulta

Reglas:
1. NO inventes información
2. Si no hay síntomas nuevos, devuelve lista vacía
3. Incluye localización y severidad si se mencionan
4. Responde con JSON válido"""

    SYSTEM_PROMPT_CRITICAL = """Eres un asistente médico especializado que extrae información CRÍTICA de transcripciones en español:
- Medicamentos prescritos (ALTA PRECISIÓN)
- Diagnósticos (confirmados o sospechados)

Reglas CRÍTICAS:
1. Para medicamentos: nombre exacto, dosis, frecuencia
2. Para diagnósticos: estado (confirmado/sospechado)
3. NO inventes dosis o frecuencias
4. Si hay ambigüedad, indica baja confianza
5. Responde con JSON válido"""

    def __init__(
        self,
        session_id: str,
        entity_matching_engine,  # EntityMatchingEngine instance
        extraction_callback: Callable[[ExtractionEvent], None],
        cost_tracker=None
    ):
        """
        Initialize Incremental Extractor.

        Args:
            session_id: WebSocket session ID
            entity_matching_engine: Instance of Entity Matching Engine
            extraction_callback: Callback for extraction events
            cost_tracker: Optional cost tracker
        """
        self.session_id = session_id
        self.entity_matcher = entity_matching_engine
        self.extraction_callback = extraction_callback
        self.cost_tracker = cost_tracker

        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Track extracted entities (session state)
        self.medications: dict[str, MedicationEntity] = {}
        self.symptoms: dict[str, SymptomEntity] = {}
        self.diagnoses: dict[str, DiagnosisEntity] = {}
        self.chief_complaint: Optional[ChiefComplaintEntity] = None

        # Buffer for context (last N transcript chunks)
        self.context_buffer: list[str] = []
        self.max_context_chunks = 3

        logger.info(f"Incremental Extractor initialized (session={session_id})")

    async def process_transcript_chunk(
        self,
        transcript_text: str,
        timestamp: float,
        is_partial: bool = True
    ):
        """
        Process incoming transcript chunk and extract entities.

        Args:
            transcript_text: Partial transcript from Stream Processor
            timestamp: Timestamp of transcript
            is_partial: If this is a partial transcript
        """
        start_time = time.time()

        # Update context buffer
        self.context_buffer.append(transcript_text)
        if len(self.context_buffer) > self.max_context_chunks:
            self.context_buffer.pop(0)

        # Build context for extraction
        full_context = " ".join(self.context_buffer)

        # Run extractions in parallel (simple + critical)
        tasks = [
            self._extract_simple_entities(full_context, timestamp),
            self._extract_critical_entities(full_context, timestamp)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Extraction error: {result}", exc_info=True)

        # Track latency
        extraction_latency = time.time() - start_time
        logger.debug(f"Extraction chunk processed: latency={extraction_latency*1000:.1f}ms")

    async def _extract_simple_entities(self, context: str, timestamp: float):
        """Extract simple entities using GPT-4o-mini (symptoms, chief complaint)."""
        try:
            # Prepare extraction prompt
            prompt = f"""Analiza esta transcripción PARCIAL y extrae síntomas y motivo de consulta:

Transcripción:
{context}

Responde con JSON:
{{
  "symptoms": [
    {{"description": "...", "location": "...", "severity": "...", "duration": "...", "confidence": 0.0-1.0}}
  ],
  "chief_complaint": {{"complaint": "...", "confidence": 0.0-1.0}} o null
}}"""

            response = await self.client.chat.completions.create(
                model=self.MODEL_SIMPLE,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT_SIMPLE},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=500
            )

            # Parse response
            import json
            data = json.loads(response.choices[0].message.content)

            # Process symptoms
            for symptom_data in data.get("symptoms", []):
                await self._process_symptom(symptom_data, timestamp, context)

            # Process chief complaint
            if data.get("chief_complaint"):
                await self._process_chief_complaint(data["chief_complaint"], timestamp, context)

            # Track cost
            if self.cost_tracker:
                tokens = response.usage.total_tokens if response.usage else 0
                cost = tokens * 0.00015 / 1000  # GPT-4o-mini pricing
                await self.cost_tracker.track_extraction(
                    session_id=self.session_id,
                    model=self.MODEL_SIMPLE,
                    tokens=tokens,
                    cost_usd=cost
                )

        except Exception as e:
            logger.error(f"Simple extraction error: {e}", exc_info=True)

    async def _extract_critical_entities(self, context: str, timestamp: float):
        """Extract critical entities using GPT-4o (medications, diagnoses)."""
        try:
            # Prepare extraction prompt
            prompt = f"""Analiza esta transcripción PARCIAL y extrae SOLO medicamentos y diagnósticos mencionados:

Transcripción:
{context}

Responde con JSON:
{{
  "medications": [
    {{"name": "...", "dosage": "...", "frequency": "...", "route": "...", "is_new_prescription": true/false, "confidence": 0.0-1.0}}
  ],
  "diagnoses": [
    {{"description": "...", "status": "confirmado/sospechado/descartado", "icd10_code": "..." o null, "confidence": 0.0-1.0}}
  ]
}}"""

            response = await self.client.chat.completions.create(
                model=self.MODEL_CRITICAL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT_CRITICAL},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,  # Lower temperature for critical extractions
                max_tokens=800
            )

            # Parse response
            import json
            data = json.loads(response.choices[0].message.content)

            # Process medications
            for med_data in data.get("medications", []):
                await self._process_medication(med_data, timestamp, context)

            # Process diagnoses
            for diag_data in data.get("diagnoses", []):
                await self._process_diagnosis(diag_data, timestamp, context)

            # Track cost
            if self.cost_tracker:
                tokens = response.usage.total_tokens if response.usage else 0
                cost = (
                    response.usage.prompt_tokens * 0.005 / 1000 +
                    response.usage.completion_tokens * 0.015 / 1000
                )
                await self.cost_tracker.track_extraction(
                    session_id=self.session_id,
                    model=self.MODEL_CRITICAL,
                    tokens=tokens,
                    cost_usd=cost
                )

        except Exception as e:
            logger.error(f"Critical extraction error: {e}", exc_info=True)

    async def _process_medication(self, med_data: dict, timestamp: float, context: str):
        """Process extracted medication with Entity Matching."""
        # Create entity
        medication = MedicationEntity(
            name=med_data["name"],
            dosage=med_data.get("dosage"),
            frequency=med_data.get("frequency"),
            route=med_data.get("route"),
            is_new_prescription=med_data.get("is_new_prescription", True),
            extracted_from=context[-200:],  # Last 200 chars
            timestamp=timestamp,
            confidence=med_data.get("confidence", 0.0)
        )

        # Entity Matching: check if this is new or update to existing
        match_result = await self.entity_matcher.match_medication(
            new_medication=medication,
            existing_medications=list(self.medications.values())
        )

        if match_result.action == "MERGE":
            # Update existing medication
            existing_id = match_result.matched_entity_id
            merged_entity = match_result.merged_entity
            self.medications[existing_id] = merged_entity

            # Emit update event
            event = ExtractionEvent(
                event_type="medication_updated",
                entity_type=EntityType.MEDICATION,
                entity_data=merged_entity.dict(),
                priority=ExtractionPriority.CRITICAL,
                timestamp=timestamp,
                session_id=self.session_id
            )

        else:  # CREATE_NEW
            # Add new medication
            new_id = str(uuid.uuid4())
            medication.id = new_id
            self.medications[new_id] = medication

            # Emit new entity event
            event = ExtractionEvent(
                event_type="medication_extracted",
                entity_type=EntityType.MEDICATION,
                entity_data=medication.dict(),
                priority=ExtractionPriority.CRITICAL,
                timestamp=timestamp,
                session_id=self.session_id
            )

        # Callback to WebSocket Gateway
        await self.extraction_callback(event)

        # Track metric
        metrics.entity_matching_similarity.observe(match_result.similarity_score)

        logger.info(
            f"Medication processed: action={match_result.action}, "
            f"similarity={match_result.similarity_score:.2f}, name={medication.name}"
        )

    async def _process_symptom(self, symptom_data: dict, timestamp: float, context: str):
        """Process extracted symptom with Entity Matching."""
        symptom = SymptomEntity(
            description=symptom_data["description"],
            location=symptom_data.get("location"),
            severity=symptom_data.get("severity"),
            duration=symptom_data.get("duration"),
            extracted_from=context[-200:],
            timestamp=timestamp,
            confidence=symptom_data.get("confidence", 0.0)
        )

        # Entity Matching for symptoms
        match_result = await self.entity_matcher.match_symptom(
            new_symptom=symptom,
            existing_symptoms=list(self.symptoms.values())
        )

        if match_result.action == "MERGE":
            existing_id = match_result.matched_entity_id
            merged_entity = match_result.merged_entity
            self.symptoms[existing_id] = merged_entity

            event = ExtractionEvent(
                event_type="symptom_updated",
                entity_type=EntityType.SYMPTOM,
                entity_data=merged_entity.dict(),
                priority=ExtractionPriority.MEDIUM,
                timestamp=timestamp,
                session_id=self.session_id
            )

        else:
            new_id = str(uuid.uuid4())
            symptom.id = new_id
            self.symptoms[new_id] = symptom

            event = ExtractionEvent(
                event_type="symptom_extracted",
                entity_type=EntityType.SYMPTOM,
                entity_data=symptom.dict(),
                priority=ExtractionPriority.MEDIUM,
                timestamp=timestamp,
                session_id=self.session_id
            )

        await self.extraction_callback(event)
        metrics.entity_matching_similarity.observe(match_result.similarity_score)

    async def _process_diagnosis(self, diag_data: dict, timestamp: float, context: str):
        """Process extracted diagnosis with Entity Matching."""
        diagnosis = DiagnosisEntity(
            description=diag_data["description"],
            status=diag_data["status"],
            icd10_code=diag_data.get("icd10_code"),
            extracted_from=context[-200:],
            timestamp=timestamp,
            confidence=diag_data.get("confidence", 0.0)
        )

        # Entity Matching for diagnoses
        match_result = await self.entity_matcher.match_diagnosis(
            new_diagnosis=diagnosis,
            existing_diagnoses=list(self.diagnoses.values())
        )

        if match_result.action == "MERGE":
            existing_id = match_result.matched_entity_id
            merged_entity = match_result.merged_entity
            self.diagnoses[existing_id] = merged_entity

            event = ExtractionEvent(
                event_type="diagnosis_updated",
                entity_type=EntityType.DIAGNOSIS,
                entity_data=merged_entity.dict(),
                priority=ExtractionPriority.HIGH,
                timestamp=timestamp,
                session_id=self.session_id
            )

        else:
            new_id = str(uuid.uuid4())
            diagnosis.id = new_id
            self.diagnoses[new_id] = diagnosis

            event = ExtractionEvent(
                event_type="diagnosis_detected",
                entity_type=EntityType.DIAGNOSIS,
                entity_data=diagnosis.dict(),
                priority=ExtractionPriority.HIGH,
                timestamp=timestamp,
                session_id=self.session_id
            )

        await self.extraction_callback(event)
        metrics.entity_matching_similarity.observe(match_result.similarity_score)

    async def _process_chief_complaint(self, complaint_data: dict, timestamp: float, context: str):
        """Process chief complaint (typically extracted once at start)."""
        if self.chief_complaint is None:
            complaint = ChiefComplaintEntity(
                id=str(uuid.uuid4()),
                complaint=complaint_data["complaint"],
                extracted_from=context[-200:],
                timestamp=timestamp,
                confidence=complaint_data.get("confidence", 0.0)
            )

            self.chief_complaint = complaint

            event = ExtractionEvent(
                event_type="chief_complaint_identified",
                entity_type=EntityType.CHIEF_COMPLAINT,
                entity_data=complaint.dict(),
                priority=ExtractionPriority.MEDIUM,
                timestamp=timestamp,
                session_id=self.session_id
            )

            await self.extraction_callback(event)

    def get_session_summary(self) -> dict:
        """Get summary of extracted entities for this session."""
        return {
            "session_id": self.session_id,
            "medications": [m.dict() for m in self.medications.values()],
            "symptoms": [s.dict() for s in self.symptoms.values()],
            "diagnoses": [d.dict() for d in self.diagnoses.values()],
            "chief_complaint": self.chief_complaint.dict() if self.chief_complaint else None,
            "total_entities": (
                len(self.medications) +
                len(self.symptoms) +
                len(self.diagnoses) +
                (1 if self.chief_complaint else 0)
            )
        }
```

### 3. Integration with WebSocket Gateway

Update `ai-service/src/services/websocket_gateway.py` (add to existing file):

```python
# Add to WebSocket Gateway

from src.services.extraction.incremental_extractor import IncrementalExtractor
from src.services.entity_matching import EntityMatchingEngine  # From Prompt 19-A

async def handle_session(self, websocket, session_id: str):
    """Handle complete WebSocket session with transcription + extraction."""

    # Initialize Entity Matching Engine
    entity_matcher = EntityMatchingEngine()

    # Extraction callback
    async def extraction_callback(event: ExtractionEvent):
        # Send extraction event back to client
        await websocket.send_json({
            "event": event.event_type,
            "data": event.entity_data,
            "priority": event.priority.value,
            "timestamp": event.timestamp
        })

        # Trigger async RAG validation
        if event.priority == ExtractionPriority.CRITICAL:
            await trigger_rag_validation(
                entity=event.entity_data,
                entity_type=event.entity_type,
                timeout_ms=1000  # 1s for CRITICAL
            )

    # Initialize Incremental Extractor
    extractor = IncrementalExtractor(
        session_id=session_id,
        entity_matching_engine=entity_matcher,
        extraction_callback=extraction_callback
    )

    # Transcription callback (from Stream Processor)
    async def transcription_callback(chunk: TranscriptionChunk):
        # Send transcription to client
        await websocket.send_json({
            "event": "transcription_update",
            "data": {
                "text": chunk.text,
                "start_time": chunk.start_time,
                "is_partial": chunk.is_partial
            }
        })

        # Trigger incremental extraction
        await extractor.process_transcript_chunk(
            transcript_text=chunk.text,
            timestamp=chunk.start_time,
            is_partial=chunk.is_partial
        )

    # Initialize Stream Processor (from Prompt 17)
    processor = StreamProcessor(
        session_id=session_id,
        transcription_callback=transcription_callback
    )

    # ... rest of WebSocket handling
```

## Expected Deliverables

1. `ai-service/src/services/extraction/models.py` - Extraction data models
2. `ai-service/src/services/extraction/incremental_extractor.py` - Incremental extraction service
3. Integration with WebSocket Gateway
4. Integration with Entity Matching Engine (Prompt 19-A)

## Verification Steps

1. Incremental extraction processes partial transcripts correctly
2. Multi-tier LLM strategy works (GPT-4o-mini for simple, GPT-4o for critical)
3. Entity Matching Engine prevents duplicates
4. Extraction events emitted to WebSocket Gateway
5. Latency <3s for extraction + matching + event emission
6. Cost tracking works for both models
7. Session summary captures all extracted entities
8. Context buffer maintains last 3 transcript chunks

## Notes

- **Multi-tier LLM**: GPT-4o-mini (60%) saves costs, GPT-4o (40%) for critical accuracy
- **Incremental extraction**: Processes chunks as they arrive (streaming)
- **Entity Matching**: Prevents duplicates, handles conflicts (see Prompt 19-A)
- **Event-driven**: Emits events immediately as entities extracted
- **Priority queue**: CRITICAL (medications) <1s, HIGH (diagnoses) <2s, MEDIUM (symptoms) <3s
- **Context buffer**: Maintains last 3 chunks for extraction context
- **Cost target**: ~$0.05-0.10 per 60-min consultation (extraction only)
- **Latency target**: <3s end-to-end per extraction cycle
- **Dependencies**: Requires Entity Matching Engine (Prompt 19-A), RAG validation (PROMPT-12)
- Extractor is session-scoped (one instance per WebSocket connection)
- Session state maintained in-memory during active connection
