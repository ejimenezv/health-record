"""
Servicio de extracción incremental para streaming.

Procesa transcripciones parciales conforme llegan del Stream Processor y emite
eventos de entidades extraídas en tiempo real. Integra con la
``EntityMatchingEngine`` existente para deduplicación y resolución de
conflictos.

Strategy:
    - GPT-4o-mini (≈60% del volumen): síntomas, motivo de consulta
    - GPT-4o (≈40% del volumen): medicamentos, diagnósticos (alta precisión)

Latency target: <3s por ciclo (extracción + matching + emisión).
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Awaitable, Callable, Dict, List, Optional

from openai import AsyncOpenAI

from src.core.config import get_settings
from src.core.logging import get_logger
from src.core.metrics import metrics
from src.models.entity import Entity, MatchResult
from src.services.entity_matching import EntityMatchingEngine
from src.services.extraction.models import (
    ChiefComplaintEntity,
    DiagnosisEntity,
    EntityType,
    ExtractionEvent,
    ExtractionPriority,
    MedicationEntity,
    SymptomEntity,
)

settings = get_settings()
logger = get_logger(__name__)


ExtractionCallback = Callable[[ExtractionEvent], Awaitable[None]]


# GPT-4o-mini pricing (USD per 1k tokens, blended approximation).
_MINI_BLENDED_COST_PER_TOKEN = 0.00015 / 1000
# GPT-4o pricing (USD per 1k tokens).
_GPT4O_PROMPT_COST_PER_TOKEN = 0.005 / 1000
_GPT4O_COMPLETION_COST_PER_TOKEN = 0.015 / 1000


class IncrementalExtractor:
    """
    Extractor incremental con multi-tier LLM y Entity Matching.
    """

    MODEL_SIMPLE = "gpt-4o-mini"
    MODEL_CRITICAL = "gpt-4o"

    SYSTEM_PROMPT_SIMPLE = (
        "Eres un asistente médico que extrae síntomas y motivos de consulta de "
        "transcripciones parciales en español.\n\n"
        "Extrae SOLO:\n"
        "- Síntomas reportados por el paciente (lo que el paciente SIENTE o EXPERIMENTA)\n"
        "- Motivo principal de consulta\n\n"
        "Reglas:\n"
        "1. NO inventes información\n"
        "2. NO incluyas diagnósticos como síntomas. Frases como "
        "'diagnóstico de X', 'se le diagnostica X', 'se sospecha X' son "
        "DIAGNÓSTICOS, NO síntomas — déjalos fuera.\n"
        "3. NO incluyas medicamentos, recetas, ni instrucciones del médico "
        "como síntomas. Frases como 'se le receta', 'tomar X' son "
        "PRESCRIPCIONES, NO síntomas — déjalos fuera.\n"
        "4. Un síntoma describe lo que el paciente siente: 'dolor de cabeza', "
        "'fiebre', 'tos', 'náuseas'. Nunca empieces un síntoma con "
        "'diagnóstico', 'se le', 'el médico'.\n"
        "5. Si no hay síntomas nuevos, devuelve lista vacía\n"
        "6. Incluye localización y severidad si se mencionan\n"
        "7. Responde con JSON válido"
    )

    SYSTEM_PROMPT_CRITICAL = (
        "Eres un asistente médico especializado que extrae información CRÍTICA "
        "de transcripciones en español:\n"
        "- Medicamentos prescritos (ALTA PRECISIÓN)\n"
        "- Diagnósticos (confirmados o sospechados)\n\n"
        "Reglas CRÍTICAS:\n"
        "1. Para medicamentos: nombre exacto, dosis, frecuencia\n"
        "2. Para diagnósticos: estado (confirmado/sospechado)\n"
        "3. NO inventes dosis o frecuencias\n"
        "4. Si hay ambigüedad, indica baja confianza\n"
        "5. Responde con JSON válido"
    )

    def __init__(
        self,
        session_id: str,
        entity_matching_engine: EntityMatchingEngine,
        extraction_callback: ExtractionCallback,
        cost_tracker=None,
        openai_client: Optional[AsyncOpenAI] = None,
        max_context_chunks: int = 3,
    ) -> None:
        self.session_id = session_id
        self.entity_matcher = entity_matching_engine
        self.extraction_callback = extraction_callback
        self.cost_tracker = cost_tracker

        self.client = openai_client or AsyncOpenAI(api_key=settings.openai_api_key)

        self.medications: Dict[str, MedicationEntity] = {}
        self.symptoms: Dict[str, SymptomEntity] = {}
        self.diagnoses: Dict[str, DiagnosisEntity] = {}
        self.chief_complaint: Optional[ChiefComplaintEntity] = None

        self.context_buffer: List[str] = []
        self.max_context_chunks = max_context_chunks

        logger.info(f"Incremental Extractor initialized (session={session_id})")

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    async def process_transcript_chunk(
        self,
        transcript_text: str,
        timestamp: float,
        is_partial: bool = True,
    ) -> None:
        """Process incoming transcript chunk and extract entities."""
        start_time = time.time()

        self.context_buffer.append(transcript_text)
        if len(self.context_buffer) > self.max_context_chunks:
            self.context_buffer.pop(0)

        full_context = " ".join(self.context_buffer)

        results = await asyncio.gather(
            self._extract_simple_entities(full_context, timestamp),
            self._extract_critical_entities(full_context, timestamp),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Extraction error: {result}", exc_info=result)

        extraction_latency = time.time() - start_time
        metrics.extraction_duration.observe(extraction_latency)
        logger.debug(
            f"Extraction chunk processed: latency={extraction_latency * 1000:.1f}ms"
        )

    # ------------------------------------------------------------------
    # LLM calls
    # ------------------------------------------------------------------
    async def _extract_simple_entities(self, context: str, timestamp: float) -> None:
        prompt = (
            "Analiza esta transcripción PARCIAL y extrae síntomas y motivo de consulta:\n\n"
            f"Transcripción:\n{context}\n\n"
            "Responde con JSON:\n"
            "{\n"
            '  "symptoms": [\n'
            '    {"description": "...", "location": "...", "severity": "...", '
            '"duration": "...", "confidence": 0.0-1.0}\n'
            "  ],\n"
            '  "chief_complaint": {"complaint": "...", "confidence": 0.0-1.0} o null\n'
            "}"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.MODEL_SIMPLE,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT_SIMPLE},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=500,
            )
        except Exception as e:
            logger.error(f"Simple extraction LLM call failed: {e}", exc_info=True)
            return

        try:
            data = json.loads(response.choices[0].message.content or "{}")
        except json.JSONDecodeError as e:
            logger.error(f"Simple extraction returned invalid JSON: {e}")
            return

        for symptom_data in data.get("symptoms") or []:
            try:
                await self._process_symptom(symptom_data, timestamp, context)
            except Exception as e:
                logger.error(f"Symptom processing error: {e}", exc_info=True)

        complaint_data = data.get("chief_complaint")
        if complaint_data:
            try:
                await self._process_chief_complaint(complaint_data, timestamp, context)
            except Exception as e:
                logger.error(f"Chief complaint processing error: {e}", exc_info=True)

        await self._track_cost_simple(response)

    async def _extract_critical_entities(self, context: str, timestamp: float) -> None:
        prompt = (
            "Analiza esta transcripción PARCIAL y extrae SOLO medicamentos y "
            "diagnósticos mencionados:\n\n"
            f"Transcripción:\n{context}\n\n"
            "Responde con JSON:\n"
            "{\n"
            '  "medications": [\n'
            '    {"name": "...", "dosage": "...", "frequency": "...", "route": "...", '
            '"is_new_prescription": true, "confidence": 0.0-1.0}\n'
            "  ],\n"
            '  "diagnoses": [\n'
            '    {"description": "...", "status": "confirmado/sospechado/descartado", '
            '"icd10_code": null, "confidence": 0.0-1.0}\n'
            "  ]\n"
            "}"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.MODEL_CRITICAL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT_CRITICAL},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=800,
            )
        except Exception as e:
            logger.error(f"Critical extraction LLM call failed: {e}", exc_info=True)
            return

        try:
            data = json.loads(response.choices[0].message.content or "{}")
        except json.JSONDecodeError as e:
            logger.error(f"Critical extraction returned invalid JSON: {e}")
            return

        for med_data in data.get("medications") or []:
            try:
                await self._process_medication(med_data, timestamp, context)
            except Exception as e:
                logger.error(f"Medication processing error: {e}", exc_info=True)

        for diag_data in data.get("diagnoses") or []:
            try:
                await self._process_diagnosis(diag_data, timestamp, context)
            except Exception as e:
                logger.error(f"Diagnosis processing error: {e}", exc_info=True)

        await self._track_cost_critical(response)

    # ------------------------------------------------------------------
    # Entity processing (with Entity Matching)
    # ------------------------------------------------------------------
    async def _process_medication(
        self, med_data: dict, timestamp: float, context: str
    ) -> None:
        medication = MedicationEntity(
            name=med_data["name"],
            dosage=med_data.get("dosage"),
            frequency=med_data.get("frequency"),
            duration=med_data.get("duration"),
            route=med_data.get("route"),
            instructions=med_data.get("instructions"),
            is_new_prescription=med_data.get("is_new_prescription", True),
            extracted_from=context[-200:],
            timestamp=timestamp,
            confidence=float(med_data.get("confidence", 0.0)),
        )

        generic = Entity(
            type="prescription",
            session_id=self.session_id,
            text=self._medication_text(medication),
            medication_name=medication.name,
            dose=medication.dosage,
            frequency=medication.frequency,
            route=medication.route,
            confidence=medication.confidence,
        )

        match_result = await self.entity_matcher.match_entity(generic, self.session_id)
        action, similarity, persisted = await self._apply_match(generic, match_result)
        medication.id = persisted.entity_id
        self.medications[persisted.entity_id] = medication

        event = ExtractionEvent(
            event_type=(
                "medication_updated" if action == "MERGE" else "medication_extracted"
            ),
            entity_type=EntityType.MEDICATION,
            entity_data=medication.model_dump(),
            priority=ExtractionPriority.CRITICAL,
            timestamp=timestamp,
            session_id=self.session_id,
        )
        await self.extraction_callback(event)

        logger.info(
            "Medication processed: action=%s similarity=%.2f name=%s",
            action,
            similarity,
            medication.name,
        )

    async def _process_symptom(
        self, symptom_data: dict, timestamp: float, context: str
    ) -> None:
        symptom = SymptomEntity(
            description=symptom_data["description"],
            location=symptom_data.get("location"),
            severity=symptom_data.get("severity"),
            duration=symptom_data.get("duration"),
            frequency=symptom_data.get("frequency"),
            extracted_from=context[-200:],
            timestamp=timestamp,
            confidence=float(symptom_data.get("confidence", 0.0)),
        )

        generic = Entity(
            type="symptom",
            session_id=self.session_id,
            text=symptom.description,
            symptom_name=symptom.description,
            location=symptom.location,
            severity=_severity_to_int(symptom.severity),
            duration=symptom.duration,
        )

        match_result = await self.entity_matcher.match_entity(generic, self.session_id)
        action, _similarity, persisted = await self._apply_match(generic, match_result)
        symptom.id = persisted.entity_id
        self.symptoms[persisted.entity_id] = symptom

        event = ExtractionEvent(
            event_type="symptom_updated" if action == "MERGE" else "symptom_extracted",
            entity_type=EntityType.SYMPTOM,
            entity_data=symptom.model_dump(),
            priority=ExtractionPriority.MEDIUM,
            timestamp=timestamp,
            session_id=self.session_id,
        )
        await self.extraction_callback(event)

    async def _process_diagnosis(
        self, diag_data: dict, timestamp: float, context: str
    ) -> None:
        diagnosis = DiagnosisEntity(
            description=diag_data["description"],
            status=diag_data.get("status", "sospechado"),
            icd10_code=diag_data.get("icd10_code"),
            extracted_from=context[-200:],
            timestamp=timestamp,
            confidence=float(diag_data.get("confidence", 0.0)),
        )

        generic = Entity(
            type="diagnosis",
            session_id=self.session_id,
            text=diagnosis.description,
            diagnosis_name=diagnosis.description,
            icd10_code=diagnosis.icd10_code,
            confidence=diagnosis.confidence,
        )

        match_result = await self.entity_matcher.match_entity(generic, self.session_id)
        action, _similarity, persisted = await self._apply_match(generic, match_result)
        diagnosis.id = persisted.entity_id
        self.diagnoses[persisted.entity_id] = diagnosis

        event = ExtractionEvent(
            event_type=(
                "diagnosis_updated" if action == "MERGE" else "diagnosis_detected"
            ),
            entity_type=EntityType.DIAGNOSIS,
            entity_data=diagnosis.model_dump(),
            priority=ExtractionPriority.HIGH,
            timestamp=timestamp,
            session_id=self.session_id,
        )
        await self.extraction_callback(event)

    async def _process_chief_complaint(
        self, complaint_data: dict, timestamp: float, context: str
    ) -> None:
        if self.chief_complaint is not None:
            return

        complaint = ChiefComplaintEntity(
            complaint=complaint_data["complaint"],
            extracted_from=context[-200:],
            timestamp=timestamp,
            confidence=float(complaint_data.get("confidence", 0.0)),
        )

        generic = Entity(
            type="chief_complaint",
            session_id=self.session_id,
            text=complaint.complaint,
        )

        match_result = await self.entity_matcher.match_entity(generic, self.session_id)
        _action, _similarity, persisted = await self._apply_match(generic, match_result)
        complaint.id = persisted.entity_id
        self.chief_complaint = complaint

        event = ExtractionEvent(
            event_type="chief_complaint_identified",
            entity_type=EntityType.CHIEF_COMPLAINT,
            entity_data=complaint.model_dump(),
            priority=ExtractionPriority.MEDIUM,
            timestamp=timestamp,
            session_id=self.session_id,
        )
        await self.extraction_callback(event)

    # ------------------------------------------------------------------
    # Entity Matching bridge
    # ------------------------------------------------------------------
    async def _apply_match(
        self, new_generic: Entity, match_result: MatchResult
    ) -> tuple[str, float, Entity]:
        """Persist the result of a match and return (action, similarity, entity)."""
        similarity = float(
            match_result.match_details.get("similarity", match_result.confidence)
        )

        if match_result.action == "MERGE" and match_result.target_entity is not None:
            merged = await self.entity_matcher.merge_entities(
                match_result.target_entity, new_generic, match_result
            )
            await self.entity_matcher.save_entity(merged)
            return "MERGE", similarity, merged

        await self.entity_matcher.save_entity(new_generic)
        return "CREATE_NEW", similarity, new_generic

    # ------------------------------------------------------------------
    # Cost tracking helpers
    # ------------------------------------------------------------------
    async def _track_cost_simple(self, response) -> None:
        if not self.cost_tracker or not getattr(response, "usage", None):
            return
        tokens = response.usage.total_tokens or 0
        cost = tokens * _MINI_BLENDED_COST_PER_TOKEN
        await self.cost_tracker.track_extraction(
            session_id=self.session_id,
            model=self.MODEL_SIMPLE,
            tokens=tokens,
            cost_usd=cost,
        )

    async def _track_cost_critical(self, response) -> None:
        if not self.cost_tracker or not getattr(response, "usage", None):
            return
        prompt_tokens = response.usage.prompt_tokens or 0
        completion_tokens = response.usage.completion_tokens or 0
        cost = (
            prompt_tokens * _GPT4O_PROMPT_COST_PER_TOKEN
            + completion_tokens * _GPT4O_COMPLETION_COST_PER_TOKEN
        )
        await self.cost_tracker.track_extraction(
            session_id=self.session_id,
            model=self.MODEL_CRITICAL,
            tokens=prompt_tokens + completion_tokens,
            cost_usd=cost,
        )

    # ------------------------------------------------------------------
    # Misc helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _medication_text(med: MedicationEntity) -> str:
        parts = [med.name]
        if med.dosage:
            parts.append(med.dosage)
        if med.frequency:
            parts.append(med.frequency)
        if med.route:
            parts.append(f"vía {med.route}")
        return " ".join(parts)

    def get_session_summary(self) -> dict:
        """Get summary of extracted entities for this session."""
        return {
            "session_id": self.session_id,
            "medications": [m.model_dump() for m in self.medications.values()],
            "symptoms": [s.model_dump() for s in self.symptoms.values()],
            "diagnoses": [d.model_dump() for d in self.diagnoses.values()],
            "chief_complaint": (
                self.chief_complaint.model_dump() if self.chief_complaint else None
            ),
            "total_entities": (
                len(self.medications)
                + len(self.symptoms)
                + len(self.diagnoses)
                + (1 if self.chief_complaint else 0)
            ),
        }


_SEVERITY_MAP = {
    "leve": 3,
    "moderado": 6,
    "moderada": 6,
    "severo": 9,
    "severa": 9,
    "fuerte": 8,
    "intenso": 8,
}


def _severity_to_int(severity: Optional[str]) -> Optional[int]:
    if severity is None:
        return None
    key = severity.strip().lower()
    if key in _SEVERITY_MAP:
        return _SEVERITY_MAP[key]
    try:
        return int(key)
    except ValueError:
        return None
