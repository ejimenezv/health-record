"""
Event-Driven RAG Validation Coordinator.
Asynchronously validates extracted medical entities with priority-based processing.
"""
import asyncio
import time
import uuid
from enum import Enum
from typing import Callable, Dict, List, Optional

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class ValidationPriority(str, Enum):
    """Priority levels for RAG validation."""
    CRITICAL = "critical"  # Drug interactions - <1s
    HIGH = "high"          # Medication validation - <2s
    MEDIUM = "medium"      # CIE-10 suggestions - <3s


class ValidationStatus(str, Enum):
    """Status of validation task."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class MedicationValidation(BaseModel):
    """Result of medication validation against RAG."""
    medication_id: str
    medication_name: str
    is_valid: bool
    rag_confidence: float = Field(0.0, ge=0.0, le=1.0)
    correct_dosage_range: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    source: Optional[str] = None
    validated_at: float


class DrugInteraction(BaseModel):
    """Drug interaction detected by RAG."""
    medication_a_id: str
    medication_b_id: str
    medication_a_name: str
    medication_b_name: str
    severity: str
    description: str
    recommendation: str
    rag_confidence: float
    detected_at: float


class CIE10Suggestion(BaseModel):
    """CIE-10 code suggestion based on symptoms."""
    code: str
    description: str
    confidence: float
    matched_symptom: str
    suggested_at: float


class ValidationTask(BaseModel):
    """Validation task in priority queue."""
    task_id: str
    session_id: str
    priority: ValidationPriority
    task_type: str
    entity_data: Dict
    status: ValidationStatus = ValidationStatus.PENDING
    created_at: float = Field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Optional[Dict] = None


class ValidationEvent(BaseModel):
    """Validation event emitted to WebSocket."""
    type: str
    priority: ValidationPriority
    data: Dict
    timestamp: float
    session_id: str
    processing_time_ms: float = 0.0


class ValidationSummary(BaseModel):
    """Summary of all validations for a session."""
    session_id: str
    total_validations: int = 0
    medications: Dict[str, Dict] = Field(default_factory=dict)
    drug_interactions: List[DrugInteraction] = Field(default_factory=list)
    cie10_suggestions: List[CIE10Suggestion] = Field(default_factory=list)
    completed_at: Optional[float] = None


class RAGValidationCoordinator:
    """Event-driven coordinator for async RAG validation."""

    LATENCY_TARGETS = {
        ValidationPriority.CRITICAL: 1.0,
        ValidationPriority.HIGH: 2.0,
        ValidationPriority.MEDIUM: 3.0,
    }

    WORKERS_PER_PRIORITY = {
        ValidationPriority.CRITICAL: 3,
        ValidationPriority.HIGH: 2,
        ValidationPriority.MEDIUM: 1,
    }

    def __init__(
        self,
        retriever_service,
        redis_client,
        event_callback: Optional[Callable] = None,
    ):
        self.retriever = retriever_service
        self.redis = redis_client
        self.event_callback = event_callback

        self.task_queues: Dict[ValidationPriority, asyncio.Queue] = {
            ValidationPriority.CRITICAL: asyncio.Queue(),
            ValidationPriority.HIGH: asyncio.Queue(),
            ValidationPriority.MEDIUM: asyncio.Queue(),
        }

        self.workers: List[asyncio.Task] = []
        self.running = False

        # Per-session list of (medication_id, medication_name). Storing the
        # name lets _check_drug_interaction() embed real names ("paracetamol",
        # "ibuprofeno") instead of the synthetic "MED_<uuid>" placeholder
        # that never matches anything in the vector store.
        self.session_medications: Dict[str, List[tuple[str, str]]] = {}

    async def start(self):
        """Start background workers for processing validation tasks."""
        if self.running:
            logger.warning("Coordinator already running")
            return

        self.running = True

        for priority in ValidationPriority:
            num_workers = self.WORKERS_PER_PRIORITY[priority]
            for i in range(num_workers):
                worker = asyncio.create_task(
                    self._worker(priority, worker_id=i)
                )
                self.workers.append(worker)

        logger.info(
            "RAG validation coordinator started",
            total_workers=len(self.workers),
        )

    async def stop(self):
        """Stop background workers gracefully."""
        if not self.running:
            return

        self.running = False

        for worker in self.workers:
            worker.cancel()

        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()

        logger.info("RAG validation coordinator stopped")

    async def on_entity_extracted(
        self,
        entity_type: str,
        entity_data: Dict,
        session_id: str,
    ):
        """Handle entity extraction event from Incremental Extractor."""
        if entity_type == "medication":
            await self._handle_medication_extracted(entity_data, session_id)
        elif entity_type == "symptom":
            await self._handle_symptom_extracted(entity_data, session_id)

    async def _handle_medication_extracted(
        self,
        medication_data: Dict,
        session_id: str,
    ):
        """Handle medication extraction event."""
        medication_id = medication_data.get("id")
        medication_name = medication_data.get("name")

        validation_task = ValidationTask(
            task_id=str(uuid.uuid4()),
            session_id=session_id,
            priority=ValidationPriority.HIGH,
            task_type="medication",
            entity_data=medication_data,
        )

        await self.task_queues[ValidationPriority.HIGH].put(validation_task)

        logger.info(
            "Medication validation task queued",
            medication_id=medication_id,
            medication_name=medication_name,
            priority="HIGH",
        )

        if session_id not in self.session_medications:
            self.session_medications[session_id] = []
        self.session_medications[session_id].append((medication_id, medication_name))

        if len(self.session_medications[session_id]) >= 2:
            interaction_task = ValidationTask(
                task_id=str(uuid.uuid4()),
                session_id=session_id,
                priority=ValidationPriority.CRITICAL,
                task_type="interaction",
                entity_data={
                    "new_medication_id": medication_id,
                    "new_medication_name": medication_name,
                    # List of (id, name) tuples for previously-seen meds.
                    # The interaction checker uses real names for the RAG
                    # query so the vector store can actually match.
                    "existing_medications": self.session_medications[session_id][:-1],
                },
            )

            await self.task_queues[ValidationPriority.CRITICAL].put(interaction_task)

            logger.info(
                "Drug interaction check task queued",
                new_medication_id=medication_id,
                total_medications=len(self.session_medications[session_id]),
                priority="CRITICAL",
            )

    async def _handle_symptom_extracted(
        self,
        symptom_data: Dict,
        session_id: str,
    ):
        """Handle symptom extraction event."""
        cie10_task = ValidationTask(
            task_id=str(uuid.uuid4()),
            session_id=session_id,
            priority=ValidationPriority.MEDIUM,
            task_type="cie10",
            entity_data=symptom_data,
        )

        await self.task_queues[ValidationPriority.MEDIUM].put(cie10_task)

        logger.info(
            "CIE-10 suggestion task queued",
            symptom=symptom_data.get("description", "")[:50],
            priority="MEDIUM",
        )

    async def _worker(self, priority: ValidationPriority, worker_id: int):
        """Background worker that processes validation tasks for a priority level."""
        logger.info(
            "Validation worker started",
            priority=priority.value,
            worker_id=worker_id,
        )

        while self.running:
            try:
                task = await asyncio.wait_for(
                    self.task_queues[priority].get(),
                    timeout=1.0,
                )

                await self._process_task(task)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Worker error",
                    priority=priority.value,
                    worker_id=worker_id,
                    error=str(e),
                )

        logger.info(
            "Validation worker stopped",
            priority=priority.value,
            worker_id=worker_id,
        )

    async def _process_task(self, task: ValidationTask):
        """Process a single validation task."""
        start_time = time.time()
        task.status = ValidationStatus.IN_PROGRESS
        task.started_at = start_time

        logger.info(
            "Processing validation task",
            task_id=task.task_id,
            task_type=task.task_type,
            priority=task.priority.value,
        )

        try:
            if task.task_type == "medication":
                result = await self._validate_medication(task.entity_data)
                event_type = "medication_validated"
            elif task.task_type == "interaction":
                result = await self._check_drug_interaction(task.entity_data)
                event_type = "interaction_alert"
            elif task.task_type == "cie10":
                result = await self._suggest_cie10(task.entity_data)
                event_type = "cie10_suggested"
            else:
                raise ValueError(f"Unknown task type: {task.task_type}")

            task.status = ValidationStatus.COMPLETED
            task.result = result
            task.completed_at = time.time()

            latency = task.completed_at - task.started_at

            if self.event_callback and result:
                event = ValidationEvent(
                    type=event_type,
                    priority=task.priority,
                    data=result,
                    timestamp=time.time(),
                    session_id=task.session_id,
                    processing_time_ms=round(latency * 1000, 2),
                )
                await self.event_callback(event)

            await self._store_validation_result(task.session_id, task.task_type, result)
            target = self.LATENCY_TARGETS[task.priority]

            logger.info(
                "Validation task completed",
                task_id=task.task_id,
                task_type=task.task_type,
                priority=task.priority.value,
                latency_ms=round(latency * 1000, 1),
                target_ms=target * 1000,
                within_target=latency <= target,
            )

        except Exception as e:
            task.status = ValidationStatus.FAILED
            task.completed_at = time.time()

            logger.error(
                "Validation task failed",
                task_id=task.task_id,
                task_type=task.task_type,
                error=str(e),
            )

    async def _validate_medication(self, medication_data: Dict) -> Dict:
        """Validate medication against RAG knowledge base."""
        medication_name = medication_data.get("name")
        medication_id = medication_data.get("id")
        dosage = medication_data.get("dosage")

        docs = await self.retriever.retrieve_medications(
            medication_name=medication_name,
            top_k=3,
        )

        if not docs:
            return {
                "medication_id": medication_id,
                "medication_name": medication_name,
                "is_valid": False,
                "rag_confidence": 0.0,
                "warnings": ["Medicamento no encontrado en base de datos"],
                "validated_at": time.time(),
            }

        best_match = docs[0]
        warnings = []

        correct_dosage = best_match.metadata.get("posologia")
        if dosage and correct_dosage:
            if dosage.lower() not in correct_dosage.lower():
                warnings.append(
                    f"Verificar dosis: indicada {dosage}, referencia: {correct_dosage}"
                )

        if "contraindicaciones" in best_match.metadata:
            contraindications = best_match.metadata["contraindicaciones"]
            if contraindications:
                warnings.append(f"Contraindicaciones: {contraindications[:100]}")

        return {
            "medication_id": medication_id,
            "medication_name": medication_name,
            "is_valid": True,
            "rag_confidence": best_match.similarity_score,
            "correct_dosage_range": correct_dosage,
            "warnings": warnings,
            "source": best_match.metadata.get("source", "KB"),
            "validated_at": time.time(),
        }

    async def _check_drug_interaction(self, interaction_data: Dict) -> Optional[Dict]:
        """Check for drug interactions between medications.

        Uses real medication NAMES in the RAG query so the embedding
        search can actually match interaction documents in ChromaDB.
        Backwards-compatible with callers that still pass
        ``existing_medication_ids`` (those produce no useful query).
        """
        new_med_id = interaction_data.get("new_medication_id")
        new_med_name = interaction_data.get("new_medication_name")
        existing_meds: list[tuple[str, str]] = interaction_data.get(
            "existing_medications", []
        )

        for existing_med_id, existing_med_name in existing_meds:
            docs = await self.retriever.retrieve_interactions(
                med1=new_med_name,
                med2=existing_med_name,
                top_k=3,
            )

            for doc in docs:
                if doc.similarity_score > 0.8:
                    severity = doc.metadata.get("severidad", "DESCONOCIDA")

                    if severity in ["CRITICA", "MAYOR"]:
                        return {
                            "medication_a_id": new_med_id,
                            "medication_b_id": existing_med_id,
                            "medication_a_name": new_med_name,
                            "medication_b_name": existing_med_name,
                            "severity": severity,
                            "description": doc.content[:200],
                            "recommendation": doc.metadata.get(
                                "recomendacion", "Consultar con farmacéutico"
                            ),
                            "rag_confidence": doc.similarity_score,
                            "detected_at": time.time(),
                        }

        return None

    async def _suggest_cie10(self, symptom_data: Dict) -> Dict:
        """Suggest CIE-10 codes based on symptoms."""
        symptom_description = symptom_data.get("description", "")

        docs = await self.retriever.retrieve_cie10(
            symptoms=symptom_description,
            top_k=5,
        )

        suggestions = []
        seen_codes = set()

        for doc in docs:
            code = doc.metadata.get("code", "")
            if code and code not in seen_codes and doc.similarity_score > 0.7:
                suggestions.append({
                    "code": code,
                    "description": doc.metadata.get("descripcion", doc.content[:100]),
                    "confidence": doc.similarity_score,
                    "matched_symptom": symptom_description[:50],
                    "suggested_at": time.time(),
                })
                seen_codes.add(code)

                if len(suggestions) >= 3:
                    break

        return {
            "symptom_id": symptom_data.get("id"),
            "suggestions": suggestions,
        }

    async def _store_validation_result(
        self,
        session_id: str,
        task_type: str,
        result: Dict,
    ) -> None:
        """Store validation result in Redis for session summary."""
        import json

        key = f"validation_results:{session_id}"

        existing = await self.redis.get(key)
        if existing:
            results = json.loads(existing)
        else:
            results = {
                "medications": {},
                "interactions": [],
                "cie10_suggestions": [],
            }

        if task_type == "medication":
            med_name = result.get("medication_name", "unknown")
            results["medications"][med_name] = result
        elif task_type == "interaction" and result:
            results["interactions"].append(result)
        elif task_type == "cie10":
            suggestions = result.get("suggestions", [])
            results["cie10_suggestions"].extend(suggestions)

        await self.redis.setex(key, 7200, json.dumps(results))

    async def get_session_summary(self, session_id: str) -> ValidationSummary:
        """Get validation summary for a session."""
        import json

        key = f"validation_results:{session_id}"
        existing = await self.redis.get(key)

        if not existing:
            return ValidationSummary(
                session_id=session_id,
                total_validations=0,
            )

        results = json.loads(existing)

        medications = results.get("medications", {})
        interactions = [
            DrugInteraction(**i) for i in results.get("interactions", [])
            if i
        ]
        cie10_suggestions = [
            CIE10Suggestion(**s) for s in results.get("cie10_suggestions", [])
        ]

        total = len(medications) + len(interactions) + len(cie10_suggestions)

        return ValidationSummary(
            session_id=session_id,
            total_validations=total,
            medications=medications,
            drug_interactions=interactions,
            cie10_suggestions=cie10_suggestions,
            completed_at=time.time(),
        )

    async def enqueue_validation(
        self,
        entity_type: str,
        entity: Dict,
        session_id: str,
        timestamp: float,
    ) -> None:
        """Enqueue entity for validation (public API used by WebSocket handler)."""
        await self.on_entity_extracted(
            entity_type=entity_type,
            entity_data={**entity, "extracted_at": timestamp},
            session_id=session_id,
        )
