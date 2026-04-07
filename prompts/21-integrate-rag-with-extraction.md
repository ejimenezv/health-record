# Prompt 21: Event-Driven RAG Validation Coordinator

## Objective
Implement **event-driven RAG validation coordinator** that asynchronously validates extracted medical entities in real-time, with priority-based processing for critical alerts (drug interactions <1s, symptoms <3s).

## Context

**⚠️ REAL-TIME STREAMING ARCHITECTURE**

This service coordinates **async RAG validation** triggered by entity extraction events from the Incremental Extractor (Prompt 19), not as batch processing at the end.

**Integration Points:**
- **Input:** Entity extraction events from Incremental Extractor (Prompt 19)
- **Output:** Validation events emitted to WebSocket Gateway for real-time feedback
- **State:** Maintains validation state in Redis with priority queue

**Why Event-Driven RAG Validation:**
- **Safety Critical:** Drug interaction alerts in <1s can prevent prescription errors
- **Non-blocking:** Doesn't block extraction pipeline, validation happens async
- **Priority-based:** CRITICAL validations (drug interactions) get <1s latency
- **Real-time feedback:** Doctor receives alerts during consultation, not after

**Priority Queue Levels:**
- **CRITICAL (<1s):** Drug interactions, contraindications
- **HIGH (<2s):** Medication validation, dosage verification
- **MEDIUM (<3s):** CIE-10 code suggestions, symptom matching

## Reference Documents
- `docs/delivery-2/rag-knowledge-base-design.md` - RAG integration design
- Prompt 19 (Incremental Extraction) - Entity extraction events
- Prompt 19-A (Entity Matching Engine) - Entity deduplication
- Prompt 20 (RAG Pipeline) - Vector retrieval

## Tasks

### 1. Create Event-Driven RAG Coordinator

Create `src/rag/validation_coordinator.py`:

```python
"""
Event-Driven RAG Validation Coordinator.
Asynchronously validates extracted medical entities with priority-based processing.
"""
import structlog
import asyncio
from typing import Optional, Callable, Dict, List
from enum import Enum
from pydantic import BaseModel, Field
import time
import uuid

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
    medication_id: str  # From Entity Matching Engine
    medication_name: str
    is_valid: bool
    rag_confidence: float = Field(0.0, ge=0.0, le=1.0)
    correct_dosage_range: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    source: Optional[str] = None
    validated_at: float  # Timestamp


class DrugInteraction(BaseModel):
    """Drug interaction detected by RAG."""
    medication_a_id: str
    medication_b_id: str
    medication_a_name: str
    medication_b_name: str
    severity: str  # CRITICA, MAYOR, MODERADA, MENOR
    description: str
    recommendation: str
    rag_confidence: float
    detected_at: float  # Timestamp


class CIE10Suggestion(BaseModel):
    """CIE-10 code suggestion based on symptoms."""
    code: str
    description: str
    confidence: float
    matched_symptom: str
    suggested_at: float  # Timestamp


class ValidationTask(BaseModel):
    """Validation task in priority queue."""
    task_id: str
    session_id: str
    priority: ValidationPriority
    task_type: str  # "medication", "interaction", "cie10"
    entity_data: Dict
    status: ValidationStatus = ValidationStatus.PENDING
    created_at: float = Field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Optional[Dict] = None


class ValidationEvent(BaseModel):
    """Validation event emitted to WebSocket."""
    type: str  # "medication_validated", "interaction_alert", "cie10_suggested"
    priority: ValidationPriority
    data: Dict
    timestamp: float
    session_id: str
    processing_time_ms: float = 0.0  # Time taken to process validation


class ValidationSummary(BaseModel):
    """Summary of all validations for a session."""
    session_id: str
    total_validations: int = 0
    medications: Dict[str, Dict] = Field(default_factory=dict)  # medication_name -> validation result
    drug_interactions: List["DrugInteraction"] = Field(default_factory=list)
    cie10_suggestions: List["CIE10Suggestion"] = Field(default_factory=list)
    completed_at: Optional[float] = None


class RAGValidationCoordinator:
    """
    Event-driven coordinator for async RAG validation.

    Strategy:
    1. Listens to entity extraction events from Incremental Extractor
    2. Creates validation tasks with priority (CRITICAL/HIGH/MEDIUM)
    3. Processes tasks async with priority queue
    4. Emits validation events to WebSocket Gateway
    """

    # Latency targets by priority
    LATENCY_TARGETS = {
        ValidationPriority.CRITICAL: 1.0,   # <1s for drug interactions
        ValidationPriority.HIGH: 2.0,       # <2s for medication validation
        ValidationPriority.MEDIUM: 3.0,     # <3s for CIE-10 suggestions
    }

    # Number of workers per priority
    WORKERS_PER_PRIORITY = {
        ValidationPriority.CRITICAL: 3,  # More workers for critical tasks
        ValidationPriority.HIGH: 2,
        ValidationPriority.MEDIUM: 1,
    }

    def __init__(
        self,
        retriever_service,
        redis_client,
        event_callback: Optional[Callable] = None
    ):
        """
        Initialize RAG validation coordinator.

        Args:
            retriever_service: RAG retriever service (Prompt 20)
            redis_client: Redis client for task queue state
            event_callback: Callback to emit validation events to WebSocket
        """
        self.retriever = retriever_service
        self.redis = redis_client
        self.event_callback = event_callback

        # Priority queues (in-memory, backed by Redis)
        self.task_queues: Dict[ValidationPriority, asyncio.Queue] = {
            ValidationPriority.CRITICAL: asyncio.Queue(),
            ValidationPriority.HIGH: asyncio.Queue(),
            ValidationPriority.MEDIUM: asyncio.Queue(),
        }

        # Background workers
        self.workers: List[asyncio.Task] = []
        self.running = False

        # Session state (medication tracking for interaction checks)
        self.session_medications: Dict[str, List[str]] = {}  # session_id -> [med_ids]

    async def start(self):
        """Start background workers for processing validation tasks."""
        if self.running:
            logger.warning("Coordinator already running")
            return

        self.running = True

        # Spawn workers for each priority level
        for priority in ValidationPriority:
            num_workers = self.WORKERS_PER_PRIORITY[priority]
            for i in range(num_workers):
                worker = asyncio.create_task(
                    self._worker(priority, worker_id=i)
                )
                self.workers.append(worker)

        logger.info(
            "RAG validation coordinator started",
            total_workers=len(self.workers)
        )

    async def stop(self):
        """Stop background workers gracefully."""
        if not self.running:
            return

        self.running = False

        # Cancel all workers
        for worker in self.workers:
            worker.cancel()

        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()

        logger.info("RAG validation coordinator stopped")

    async def on_entity_extracted(
        self,
        entity_type: str,
        entity_data: Dict,
        session_id: str
    ):
        """
        Handle entity extraction event from Incremental Extractor.

        Args:
            entity_type: Type of entity ("medication", "symptom", etc.)
            entity_data: Entity data from extraction
            session_id: Session identifier
        """
        if entity_type == "medication":
            await self._handle_medication_extracted(entity_data, session_id)
        elif entity_type == "symptom":
            await self._handle_symptom_extracted(entity_data, session_id)

    async def _handle_medication_extracted(
        self,
        medication_data: Dict,
        session_id: str
    ):
        """
        Handle medication extraction event.

        Creates:
        1. HIGH priority task: Validate medication
        2. CRITICAL priority task: Check interactions (if multiple meds)
        """
        medication_id = medication_data.get("id")
        medication_name = medication_data.get("name")

        # Task 1: Validate medication (HIGH priority)
        validation_task = ValidationTask(
            task_id=str(uuid.uuid4()),
            session_id=session_id,
            priority=ValidationPriority.HIGH,
            task_type="medication",
            entity_data=medication_data
        )

        await self.task_queues[ValidationPriority.HIGH].put(validation_task)

        logger.info(
            "Medication validation task queued",
            medication_id=medication_id,
            medication_name=medication_name,
            priority="HIGH"
        )

        # Track medication for interaction checking
        if session_id not in self.session_medications:
            self.session_medications[session_id] = []
        self.session_medications[session_id].append(medication_id)

        # Task 2: Check interactions (CRITICAL priority, if >1 medication)
        if len(self.session_medications[session_id]) >= 2:
            interaction_task = ValidationTask(
                task_id=str(uuid.uuid4()),
                session_id=session_id,
                priority=ValidationPriority.CRITICAL,
                task_type="interaction",
                entity_data={
                    "new_medication_id": medication_id,
                    "new_medication_name": medication_name,
                    "existing_medication_ids": self.session_medications[session_id][:-1]
                }
            )

            await self.task_queues[ValidationPriority.CRITICAL].put(interaction_task)

            logger.info(
                "Drug interaction check task queued",
                new_medication_id=medication_id,
                total_medications=len(self.session_medications[session_id]),
                priority="CRITICAL"
            )

    async def _handle_symptom_extracted(
        self,
        symptom_data: Dict,
        session_id: str
    ):
        """
        Handle symptom extraction event.

        Creates:
        - MEDIUM priority task: Suggest CIE-10 codes
        """
        cie10_task = ValidationTask(
            task_id=str(uuid.uuid4()),
            session_id=session_id,
            priority=ValidationPriority.MEDIUM,
            task_type="cie10",
            entity_data=symptom_data
        )

        await self.task_queues[ValidationPriority.MEDIUM].put(cie10_task)

        logger.info(
            "CIE-10 suggestion task queued",
            symptom=symptom_data.get("description", "")[:50],
            priority="MEDIUM"
        )

    async def _worker(self, priority: ValidationPriority, worker_id: int):
        """
        Background worker that processes validation tasks for a priority level.

        Args:
            priority: Priority level to process
            worker_id: Worker identifier
        """
        logger.info(
            "Validation worker started",
            priority=priority.value,
            worker_id=worker_id
        )

        while self.running:
            try:
                # Get task from queue (blocks until available)
                task = await asyncio.wait_for(
                    self.task_queues[priority].get(),
                    timeout=1.0
                )

                # Process task
                await self._process_task(task)

            except asyncio.TimeoutError:
                # No task available, continue
                continue
            except asyncio.CancelledError:
                # Worker cancelled, exit
                break
            except Exception as e:
                logger.error(
                    "Worker error",
                    priority=priority.value,
                    worker_id=worker_id,
                    error=str(e)
                )

        logger.info(
            "Validation worker stopped",
            priority=priority.value,
            worker_id=worker_id
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
            priority=task.priority.value
        )

        try:
            # Route to appropriate handler
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

            # Check latency against target
            latency = task.completed_at - task.started_at

            # Emit validation event to WebSocket
            if self.event_callback and result:
                event = ValidationEvent(
                    type=event_type,
                    priority=task.priority,
                    data=result,
                    timestamp=time.time(),
                    session_id=task.session_id,
                    processing_time_ms=round(latency * 1000, 2)
                )
                await self.event_callback(event)

            # Store validation result for session summary
            await self._store_validation_result(task.session_id, task.task_type, result)
            target = self.LATENCY_TARGETS[task.priority]

            logger.info(
                "Validation task completed",
                task_id=task.task_id,
                task_type=task.task_type,
                priority=task.priority.value,
                latency_ms=round(latency * 1000, 1),
                target_ms=target * 1000,
                within_target=latency <= target
            )

        except Exception as e:
            task.status = ValidationStatus.FAILED
            task.completed_at = time.time()

            logger.error(
                "Validation task failed",
                task_id=task.task_id,
                task_type=task.task_type,
                error=str(e)
            )

    async def _validate_medication(self, medication_data: Dict) -> Dict:
        """
        Validate medication against RAG knowledge base.

        Returns validation result.
        """
        medication_name = medication_data.get("name")
        medication_id = medication_data.get("id")
        dosage = medication_data.get("dosage")

        # Query RAG for medication info
        docs = await self.retriever.retrieve_medications(
            medication_name=medication_name,
            top_k=3
        )

        if not docs:
            return {
                "medication_id": medication_id,
                "medication_name": medication_name,
                "is_valid": False,
                "rag_confidence": 0.0,
                "warnings": ["Medicamento no encontrado en base de datos"],
                "validated_at": time.time()
            }

        best_match = docs[0]
        warnings = []

        # Check dosage
        correct_dosage = best_match.metadata.get("posologia")
        if dosage and correct_dosage:
            if dosage.lower() not in correct_dosage.lower():
                warnings.append(
                    f"Verificar dosis: indicada {dosage}, referencia: {correct_dosage}"
                )

        # Check contraindications
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
            "validated_at": time.time()
        }

    async def _check_drug_interaction(self, interaction_data: Dict) -> Optional[Dict]:
        """
        Check for drug interactions between medications.

        Returns interaction alert if found, None otherwise.
        """
        new_med_id = interaction_data.get("new_medication_id")
        new_med_name = interaction_data.get("new_medication_name")
        existing_med_ids = interaction_data.get("existing_medication_ids", [])

        # For each existing medication, check interaction
        # In practice, you'd get medication names from entity matching engine
        for existing_med_id in existing_med_ids:
            # Simplified: would fetch actual medication name
            existing_med_name = f"MED_{existing_med_id}"

            # Query RAG for interaction
            docs = await self.retriever.retrieve_interactions(
                med1=new_med_name,
                med2=existing_med_name,
                top_k=3
            )

            # Check for high-confidence interactions
            for doc in docs:
                if doc.similarity_score > 0.8:  # High confidence
                    severity = doc.metadata.get("severidad", "DESCONOCIDA")

                    # Return first CRITICAL or MAJOR interaction found
                    if severity in ["CRITICA", "MAYOR"]:
                        return {
                            "medication_a_id": new_med_id,
                            "medication_b_id": existing_med_id,
                            "medication_a_name": new_med_name,
                            "medication_b_name": existing_med_name,
                            "severity": severity,
                            "description": doc.content[:200],
                            "recommendation": doc.metadata.get("recomendacion", "Consultar con farmacéutico"),
                            "rag_confidence": doc.similarity_score,
                            "detected_at": time.time()
                        }

        return None  # No critical interactions found

    async def _suggest_cie10(self, symptom_data: Dict) -> Dict:
        """
        Suggest CIE-10 codes based on symptoms.

        Returns CIE-10 suggestions.
        """
        symptom_description = symptom_data.get("description", "")

        # Query RAG for CIE-10 codes
        docs = await self.retriever.retrieve_cie10(
            symptoms=symptom_description,
            top_k=5
        )

        # Filter and format suggestions
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
                    "suggested_at": time.time()
                })
                seen_codes.add(code)

                if len(suggestions) >= 3:  # Top 3
                    break

        return {
            "symptom_id": symptom_data.get("id"),
            "suggestions": suggestions
        }

    async def _store_validation_result(
        self,
        session_id: str,
        task_type: str,
        result: Dict
    ) -> None:
        """
        Store validation result in Redis for session summary.

        Args:
            session_id: Session identifier
            task_type: Type of validation (medication, interaction, cie10)
            result: Validation result data
        """
        import json

        key = f"validation_results:{session_id}"

        # Get existing results
        existing = await self.redis.get(key)
        if existing:
            results = json.loads(existing)
        else:
            results = {
                "medications": {},
                "interactions": [],
                "cie10_suggestions": []
            }

        # Add new result
        if task_type == "medication":
            med_name = result.get("medication_name", "unknown")
            results["medications"][med_name] = result
        elif task_type == "interaction" and result:
            results["interactions"].append(result)
        elif task_type == "cie10":
            suggestions = result.get("suggestions", [])
            results["cie10_suggestions"].extend(suggestions)

        # Store with 2-hour TTL
        await self.redis.setex(key, 7200, json.dumps(results))

    async def get_session_summary(self, session_id: str) -> ValidationSummary:
        """
        Get validation summary for a session.

        Args:
            session_id: Session identifier

        Returns:
            ValidationSummary with all validation results
        """
        import json

        key = f"validation_results:{session_id}"
        existing = await self.redis.get(key)

        if not existing:
            return ValidationSummary(
                session_id=session_id,
                total_validations=0
            )

        results = json.loads(existing)

        # Convert to typed models
        medications = results.get("medications", {})
        interactions = [
            DrugInteraction(**i) for i in results.get("interactions", [])
            if i  # Skip None values
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
            completed_at=time.time()
        )

    async def enqueue_validation(
        self,
        entity_type: str,
        entity: Dict,
        session_id: str,
        timestamp: float
    ) -> None:
        """
        Enqueue entity for validation (public API used by WebSocket handler).

        Args:
            entity_type: Type of entity (medication, symptom, diagnosis)
            entity: Entity data to validate
            session_id: Session identifier
            timestamp: When entity was extracted
        """
        await self.on_entity_extracted(
            entity_type=entity_type,
            entity_data={**entity, "extracted_at": timestamp},
            session_id=session_id
        )
```

### 2. Create Validation Event Handlers

Create `src/rag/event_handlers.py`:

```python
"""
Event handlers for RAG validation integration with Incremental Extractor.
"""
import structlog
from typing import Optional

from src.rag.validation_coordinator import RAGValidationCoordinator

logger = structlog.get_logger()


class RAGEventHandler:
    """
    Bridges Incremental Extractor events to RAG Validation Coordinator.
    """

    def __init__(self, coordinator: RAGValidationCoordinator):
        """
        Initialize event handler.

        Args:
            coordinator: RAG validation coordinator instance
        """
        self.coordinator = coordinator

    async def handle_medication_extracted(
        self,
        medication_data: dict,
        session_id: str
    ):
        """
        Handle medication extraction event.

        Args:
            medication_data: Medication entity data
            session_id: Session identifier
        """
        await self.coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data=medication_data,
            session_id=session_id
        )

    async def handle_symptom_extracted(
        self,
        symptom_data: dict,
        session_id: str
    ):
        """
        Handle symptom extraction event.

        Args:
            symptom_data: Symptom entity data
            session_id: Session identifier
        """
        await self.coordinator.on_entity_extracted(
            entity_type="symptom",
            entity_data=symptom_data,
            session_id=session_id
        )

    async def handle_diagnosis_extracted(
        self,
        diagnosis_data: dict,
        session_id: str
    ):
        """
        Handle diagnosis extraction event.

        Args:
            diagnosis_data: Diagnosis entity data
            session_id: Session identifier
        """
        # Diagnoses can also trigger CIE-10 suggestions
        await self.coordinator.on_entity_extracted(
            entity_type="symptom",  # Treat similarly to symptoms for CIE-10
            entity_data=diagnosis_data,
            session_id=session_id
        )
```

### 3. Create Batched Validation for Efficiency

Create `src/rag/batched_validator.py`:

```python
"""
Batched RAG validator for efficient validation of multiple entities.
Accumulates entities and processes them in batches to reduce API calls.
"""
import asyncio
from typing import List, Tuple, Dict, Callable, Optional
import structlog

logger = structlog.get_logger()


class BatchedRAGValidator:
    """
    Batches validation queries for efficiency.

    When multiple entities are extracted in quick succession, accumulates
    them and processes in a single batch to reduce latency and API calls.
    """

    def __init__(
        self,
        process_callback: Callable,
        batch_timeout: float = 0.5,
        max_batch_size: int = 5
    ):
        """
        Initialize batched validator.

        Args:
            process_callback: Async function to process validation
            batch_timeout: Max time to wait for batch accumulation (seconds)
            max_batch_size: Max entities per batch before forced processing
        """
        self.process_callback = process_callback
        self.batch_timeout = batch_timeout
        self.max_batch_size = max_batch_size
        self.pending_validations: List[Tuple[Dict, Dict]] = []
        self._batch_lock = asyncio.Lock()
        self._batch_timer: Optional[asyncio.Task] = None

    async def validate_entity_batched(
        self,
        entity: Dict,
        context: Dict
    ):
        """
        Add entity to batch for validation.

        Accumulates validations and processes in batch when either:
        - max_batch_size is reached (immediate processing)
        - batch_timeout expires (delayed processing)

        Args:
            entity: Entity data to validate
            context: Validation context (session info, other entities)
        """
        async with self._batch_lock:
            self.pending_validations.append((entity, context))

            # If batch is full, process immediately
            if len(self.pending_validations) >= self.max_batch_size:
                await self._process_batch()
            else:
                # Start/reset timer for batch processing
                if self._batch_timer:
                    self._batch_timer.cancel()

                self._batch_timer = asyncio.create_task(
                    self._wait_and_process()
                )

    async def _wait_and_process(self):
        """Wait for timeout then process accumulated batch."""
        await asyncio.sleep(self.batch_timeout)

        async with self._batch_lock:
            if self.pending_validations:
                await self._process_batch()

    async def _process_batch(self):
        """Process current batch of validations in parallel."""
        if not self.pending_validations:
            return

        batch = self.pending_validations.copy()
        self.pending_validations = []

        logger.info(
            "Processing validation batch",
            batch_size=len(batch)
        )

        # Execute validations in parallel
        tasks = [
            self.process_callback(entity, context)
            for entity, context in batch
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Log results
        successful = sum(1 for r in results if not isinstance(r, Exception))
        failed = len(results) - successful

        logger.info(
            "Batch validation completed",
            successful=successful,
            failed=failed
        )

        return results
```

### 4. Create RAG Prefetcher for Common Medications

Create `src/rag/prefetcher.py`:

```python
"""
RAG Prefetcher for preloading common medical knowledge.
Pre-fetches frequently used medications and diagnoses during idle time.
"""
import asyncio
from typing import Dict, Optional
import structlog

logger = structlog.get_logger()


class RAGPrefetcher:
    """
    Prefetches common medical knowledge to reduce lookup latency.

    Pre-loads frequently used medications and diagnoses into memory
    cache during idle time (session start, low activity periods).
    """

    # Top 100 most common medications in Spanish healthcare
    COMMON_MEDICATIONS = [
        "Paracetamol", "Ibuprofeno", "Amoxicilina",
        "Omeprazol", "Metformina", "Atorvastatina",
        "Enalapril", "Losartán", "Amlodipino",
        "Levotiroxina", "Simvastatina", "Pantoprazol",
        "Bisoprolol", "Furosemida", "Hidroclorotiazida",
        "Diclofenaco", "Tramadol", "Metamizol",
        "Lorazepam", "Alprazolam", "Diazepam",
        "Prednisona", "Dexametasona", "Azitromicina",
        "Ciprofloxacino", "Levofloxacino", "Ceftriaxona",
        "Insulina", "Glibenclamida", "Sitagliptina",
        # Add more as needed based on usage analytics
    ]

    def __init__(self, retriever_service):
        """
        Initialize prefetcher.

        Args:
            retriever_service: RAG retriever service instance
        """
        self.retriever = retriever_service
        self.common_medications: Dict[str, Dict] = {}
        self.common_diagnoses: Dict[str, Dict] = {}
        self._prefetch_complete = False
        self._prefetch_task: Optional[asyncio.Task] = None

    async def start_prefetch(self):
        """
        Start background prefetching of common knowledge.

        Should be called during session initialization or idle time.
        """
        if self._prefetch_task and not self._prefetch_task.done():
            logger.debug("Prefetch already in progress")
            return

        self._prefetch_task = asyncio.create_task(
            self._prefetch_common_knowledge()
        )

    async def _prefetch_common_knowledge(self):
        """
        Pre-fetch common medications from RAG.

        Runs as background task to not block main operations.
        """
        logger.info(
            "Starting RAG prefetch",
            medications_count=len(self.COMMON_MEDICATIONS)
        )

        prefetched = 0
        for medication in self.COMMON_MEDICATIONS:
            try:
                # Query RAG for medication info
                docs = await self.retriever.retrieve_medications(
                    medication_name=medication,
                    top_k=1
                )

                if docs:
                    self.common_medications[medication.lower()] = {
                        "content": docs[0].content,
                        "metadata": docs[0].metadata,
                        "similarity": docs[0].similarity_score
                    }
                    prefetched += 1

            except Exception as e:
                logger.warning(
                    "Prefetch failed for medication",
                    medication=medication,
                    error=str(e)
                )

            # Small delay to avoid overwhelming the system
            await asyncio.sleep(0.05)

        self._prefetch_complete = True

        logger.info(
            "RAG prefetch completed",
            prefetched=prefetched,
            total=len(self.COMMON_MEDICATIONS)
        )

    def get_prefetched_medication(self, medication_name: str) -> Optional[Dict]:
        """
        Get prefetched medication data.

        Args:
            medication_name: Medication to look up

        Returns:
            Prefetched data if available, None otherwise
        """
        normalized = medication_name.lower().strip()
        return self.common_medications.get(normalized)

    def is_prefetched(self, medication_name: str) -> bool:
        """Check if medication is in prefetch cache."""
        return medication_name.lower().strip() in self.common_medications

    @property
    def prefetch_complete(self) -> bool:
        """Check if initial prefetch is complete."""
        return self._prefetch_complete

    @property
    def cache_size(self) -> int:
        """Get number of prefetched medications."""
        return len(self.common_medications)
```

### 5. Create Integration Tests

Create `tests/integration/test_rag_validation_coordinator.py`:

```python
"""
Integration tests for RAG Validation Coordinator.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock

from src.rag.validation_coordinator import (
    RAGValidationCoordinator,
    ValidationPriority,
    ValidationEvent
)


class TestRAGValidationCoordinator:
    """Integration tests for RAG validation coordinator."""

    @pytest.fixture
    def mock_retriever(self):
        """Mock RAG retriever service."""
        retriever = MagicMock()

        # Mock medication retrieval
        retriever.retrieve_medications = AsyncMock(return_value=[
            MagicMock(
                content="Paracetamol 500mg",
                metadata={
                    "posologia": "500mg cada 6-8 horas",
                    "source": "CIMA"
                },
                similarity_score=0.92
            )
        ])

        # Mock interaction retrieval
        retriever.retrieve_interactions = AsyncMock(return_value=[])

        # Mock CIE-10 retrieval
        retriever.retrieve_cie10 = AsyncMock(return_value=[
            MagicMock(
                content="R51 - Cefalea",
                metadata={"code": "R51", "descripcion": "Cefalea"},
                similarity_score=0.88
            )
        ])

        return retriever

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        return MagicMock()

    @pytest.fixture
    async def coordinator(self, mock_retriever, mock_redis):
        """Create coordinator instance."""
        events_emitted = []

        async def event_callback(event: ValidationEvent):
            events_emitted.append(event)

        coord = RAGValidationCoordinator(
            retriever_service=mock_retriever,
            redis_client=mock_redis,
            event_callback=event_callback
        )
        coord._events_emitted = events_emitted  # For test assertions

        await coord.start()
        yield coord
        await coord.stop()

    @pytest.mark.asyncio
    async def test_medication_validation_task_created(self, coordinator):
        """Test that medication extraction creates HIGH priority validation task."""
        medication_data = {
            "id": "MED_001",
            "name": "Paracetamol",
            "dosage": "500mg"
        }

        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data=medication_data,
            session_id="test-session-1"
        )

        # Give worker time to process
        await asyncio.sleep(0.5)

        # Check that validation event was emitted
        assert len(coordinator._events_emitted) >= 1
        assert coordinator._events_emitted[0].type == "medication_validated"
        assert coordinator._events_emitted[0].priority == ValidationPriority.HIGH

    @pytest.mark.asyncio
    async def test_drug_interaction_check_triggered(self, coordinator, mock_retriever):
        """Test that second medication triggers CRITICAL interaction check."""
        # First medication
        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data={"id": "MED_001", "name": "Paracetamol"},
            session_id="test-session-2"
        )

        await asyncio.sleep(0.5)

        # Second medication - should trigger interaction check
        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data={"id": "MED_002", "name": "Warfarina"},
            session_id="test-session-2"
        )

        await asyncio.sleep(0.5)

        # Should have called interaction retrieval
        assert mock_retriever.retrieve_interactions.called

    @pytest.mark.asyncio
    async def test_symptom_triggers_cie10_suggestion(self, coordinator):
        """Test that symptom extraction triggers MEDIUM priority CIE-10 suggestion."""
        symptom_data = {
            "id": "SYM_001",
            "description": "Dolor de cabeza intenso"
        }

        await coordinator.on_entity_extracted(
            entity_type="symptom",
            entity_data=symptom_data,
            session_id="test-session-3"
        )

        await asyncio.sleep(0.5)

        # Check that CIE-10 event was emitted
        events = [e for e in coordinator._events_emitted if e.type == "cie10_suggested"]
        assert len(events) >= 1
        assert events[0].priority == ValidationPriority.MEDIUM

    @pytest.mark.asyncio
    async def test_latency_targets_met(self, coordinator):
        """Test that validation tasks meet latency targets."""
        medication_data = {
            "id": "MED_003",
            "name": "Ibuprofeno"
        }

        start_time = asyncio.get_event_loop().time()

        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data=medication_data,
            session_id="test-session-4"
        )

        # Wait for processing
        await asyncio.sleep(0.5)

        elapsed = asyncio.get_event_loop().time() - start_time

        # HIGH priority target is <2s
        assert elapsed < 2.0
```

## Expected Deliverables

1. `src/rag/validation_coordinator.py` - Event-driven RAG coordinator
2. `src/rag/event_handlers.py` - Event handlers for extraction integration
3. `src/rag/batched_validator.py` - Batched validation for efficiency
4. `src/rag/prefetcher.py` - RAG prefetcher for common medications
5. `tests/integration/test_rag_validation_coordinator.py` - Integration tests

## Verification Steps

### Functional Requirements
1. **Event-driven processing**: Coordinator listens to extraction events
2. **Priority-based queuing**: CRITICAL/HIGH/MEDIUM tasks properly queued
3. **Async validation**: Validation doesn't block extraction pipeline
4. **Event emission**: Validation results emitted to WebSocket Gateway

### Integration Requirements
5. **Extraction integration**: Receives events from Incremental Extractor (Prompt 19)
6. **WebSocket integration**: Emits validation events to Gateway (Prompt 16-A)
7. **RAG integration**: Uses retriever service from Prompt 20
8. **Redis state**: Tracks session medications for interaction checking

### Performance Requirements
9. **CRITICAL latency**: Drug interactions validated in <1s (p95)
10. **HIGH latency**: Medication validation in <2s (p95)
11. **MEDIUM latency**: CIE-10 suggestions in <3s (p95)
12. **Throughput**: Handles concurrent validations across multiple sessions

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **CRITICAL validation** | <1s (p95) | Drug interactions |
| **HIGH validation** | <2s (p95) | Medication validation |
| **MEDIUM validation** | <3s (p95) | CIE-10 suggestions |
| **Concurrent sessions** | ≥10 sessions | Multiple consultations simultaneously |
| **Event emission latency** | <100ms | To WebSocket Gateway |

## Integration Flow

```
Incremental Extractor (Prompt 19)
    │
    │ Entity Extraction Event
    │ (medication/symptom/diagnosis)
    ▼
┌────────────────────────────────────────┐
│  RAG Validation Coordinator            │
│                                        │
│  1. Route to priority queue            │
│     CRITICAL: Drug interactions        │
│     HIGH: Medication validation        │
│     MEDIUM: CIE-10 suggestions         │
│                                        │
│  2. Background workers process         │
│     3 workers for CRITICAL             │
│     2 workers for HIGH                 │
│     1 worker for MEDIUM                │
│                                        │
│  3. Query RAG retriever (Prompt 20)    │
│     - retrieve_medications()           │
│     - retrieve_interactions()          │
│     - retrieve_cie10()                 │
│                                        │
│  4. Emit validation event              │
└────────────────────────────────────────┘
    │
    │ Validation Event
    │ (medication_validated, interaction_alert, cie10_suggested)
    ▼
WebSocket Gateway (Prompt 16-A)
(Send real-time alert to doctor's UI)
```

## Notes

### Event-Driven Architecture Benefits
- **Non-blocking**: Extraction continues while validation happens async
- **Priority-based**: Critical alerts (drug interactions) get <1s latency
- **Scalable**: Independent workers can be scaled per priority level
- **Real-time feedback**: Doctor receives alerts during consultation

### Cost Optimization
- **No LLM calls**: Validation uses only RAG retrieval (embeddings already cached)
- **Incremental validation**: Only validates new entities, not entire consultation
- **Priority-based**: Resources allocated based on medical criticality
- **Batched validation**: Groups queries when multiple entities extracted quickly
- **Prefetching**: Common medications pre-loaded to reduce lookup latency

### Safety Critical Design
- **Drug interactions**: Highest priority (<1s) to prevent prescription errors
- **Multiple workers**: 3 workers for CRITICAL tasks ensure low latency
- **Event emission**: Immediate WebSocket notification for critical alerts

### Redis State Management
- **Session medications**: Tracks medications per session for interaction checking
- **Task persistence**: Can optionally persist tasks to Redis for recovery
- **TTL cleanup**: Session state expires after consultation ends
