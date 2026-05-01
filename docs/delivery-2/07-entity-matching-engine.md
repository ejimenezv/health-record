# Entity Matching Engine - MedRecord AI

## 1. Arquitectura del Entity Matching Engine

### 1.1 Flujo de Matching

```
Nueva Entidad Extraída
        │
        ▼
┌────────────────────┐
│ Get Embeddings     │ ← OpenAI text-embedding-3-small
│ (1536 dimensions)  │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Buscar Entidades Existentes        │
│ del mismo tipo (symptom/dx/rx)     │
│ en sesión actual                   │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Calcular Similaridad Semántica     │
│ cosine_similarity(new, existing)   │
└────────┬───────────────────────────┘
         │
         ├─────────────────┬─────────────────┬─────────────────┐
         │                 │                 │                 │
    similarity          similarity      similarity          similarity
       > 0.85         0.70 - 0.85         0.70 - 0.85         < 0.70
    (strong match)   (uncertain)       (uncertain)      (no match)
         │                 │                 │                 │
         │                 ▼                 ▼                 │
         │        ┌──────────────────┐      │                 │
         │        │ Apply Business   │      │                 │
         │        │ Rules            │──────┤                 │
         │        └──────────────────┘      │                 │
         │                 │                │                 │
         │            Match │           No match              │
         │                 │                │                 │
         ├─────────────────┴────────────────┘                 │
         │                                                    │
         ▼                                                    ▼
┌────────────────────────────────────┐        ┌────────────────────────────┐
│ MERGE                              │        │ CREATE_NEW                 │
│ - Update existing entity           │        │ - Add as new entity        │
│ - Increment version                │        │ - version = 1              │
│ - Add changelog entry              │        │ - Initialize changelog     │
└────────────────────────────────────┘        └────────────────────────────┘
```

### 1.2 Thresholds y Decisiones

| Rango Similaridad | Decisión | Acción | Justificación |
|-------------------|----------|--------|---------------|
| **> 0.85** | MERGE automático | Fusionar sin validación adicional | Alta confianza, claramente misma entidad |
| **0.70 - 0.85** | Validar con reglas | Aplicar business rules específicas por tipo | Zona gris, necesita contexto adicional |
| **< 0.70** | CREATE_NEW | Crear nueva entidad | Baja similaridad, probablemente diferente |

## 2. Implementación Core del Engine

### 2.1 Modelos de Datos

**Archivo:** `ai-service/app/models/entity.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
import uuid

EntityType = Literal["symptom", "diagnosis", "prescription", "chief_complaint"]
ActionType = Literal["MERGE", "CREATE_NEW", "SKIP"]

class Entity(BaseModel):
    entity_id: str = Field(default_factory=lambda: f"ent_{uuid.uuid4().hex[:12]}")
    type: EntityType
    session_id: str
    version: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Common fields
    text: str  # Original text mention
    embedding: Optional[List[float]] = None  # 1536-dim vector

    # Type-specific fields
    # Symptom fields
    symptom_name: Optional[str] = None
    location: Optional[str] = None
    severity: Optional[int] = None  # 0-10
    duration: Optional[str] = None
    onset: Optional[str] = None

    # Diagnosis fields
    diagnosis_name: Optional[str] = None
    icd10_code: Optional[str] = None
    confidence: Optional[float] = None  # 0.0-1.0

    # Prescription fields
    medication_name: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None
    route: Optional[str] = None

    # Version control
    changelog: List[dict] = Field(default_factory=list)

class ChangelogEntry(BaseModel):
    version: int
    timestamp: datetime
    action: str  # "created", "updated", "merged"
    changed_fields: dict
    reason: str
    source_text: Optional[str] = None

class MatchResult(BaseModel):
    action: ActionType
    confidence: float  # 0.0-1.0
    target_entity: Optional[Entity] = None
    reason: str
    match_details: dict = {}
```

### 2.2 Entity Matching Engine

**Archivo:** `ai-service/app/services/entity_matching_engine.py`

```python
import numpy as np
from typing import List, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from app.models.entity import Entity, MatchResult, EntityType, ChangelogEntry
from app.services.embedding_service import EmbeddingService
from app.core.redis_client import redis_client
import structlog
import orjson
from datetime import datetime

logger = structlog.get_logger()

class EntityMatchingEngine:
    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service
        self.thresholds = {
            "strong_match": 0.85,
            "uncertain_min": 0.70
        }

    async def match_entity(
        self,
        new_entity: Entity,
        session_id: str
    ) -> MatchResult:
        """
        Determina si una nueva entidad es un match con entidades existentes.

        Returns:
            MatchResult con acción MERGE o CREATE_NEW
        """
        # 1. Generate embedding if not present
        if not new_entity.embedding:
            new_entity.embedding = await self.embedding_service.get_embedding(
                new_entity.text
            )

        # 2. Get existing entities of same type
        existing_entities = await self._get_existing_entities(
            session_id,
            new_entity.type
        )

        if not existing_entities:
            return MatchResult(
                action="CREATE_NEW",
                confidence=1.0,
                reason="No existing entities of this type"
            )

        # 3. Calculate semantic similarities
        best_match, best_similarity = await self._find_best_match(
            new_entity,
            existing_entities
        )

        logger.debug(
            "similarity_calculated",
            new_text=new_entity.text,
            best_match_text=best_match.text if best_match else None,
            similarity=best_similarity
        )

        # 4. Apply threshold-based decision tree
        if best_similarity > self.thresholds["strong_match"]:
            # Strong match → MERGE automatically
            return MatchResult(
                action="MERGE",
                confidence=best_similarity,
                target_entity=best_match,
                reason=f"Strong semantic match (similarity={best_similarity:.3f})",
                match_details={
                    "similarity": best_similarity,
                    "threshold": "strong_match"
                }
            )

        elif best_similarity >= self.thresholds["uncertain_min"]:
            # Uncertain → Apply business rules
            is_match, rule_reason = await self._apply_business_rules(
                new_entity,
                best_match
            )

            if is_match:
                return MatchResult(
                    action="MERGE",
                    confidence=best_similarity,
                    target_entity=best_match,
                    reason=f"Business rule match: {rule_reason}",
                    match_details={
                        "similarity": best_similarity,
                        "threshold": "uncertain",
                        "business_rule": rule_reason
                    }
                )
            else:
                return MatchResult(
                    action="CREATE_NEW",
                    confidence=1.0 - best_similarity,
                    reason=f"Business rule rejected: {rule_reason}",
                    match_details={
                        "similarity": best_similarity,
                        "business_rule_failed": rule_reason
                    }
                )

        else:
            # Low similarity → CREATE_NEW
            return MatchResult(
                action="CREATE_NEW",
                confidence=1.0 - best_similarity,
                reason=f"Low semantic similarity (similarity={best_similarity:.3f})",
                match_details={
                    "similarity": best_similarity,
                    "threshold": "below_minimum"
                }
            )

    async def _find_best_match(
        self,
        new_entity: Entity,
        existing_entities: List[Entity]
    ) -> Tuple[Optional[Entity], float]:
        """
        Encuentra la entidad existente con mayor similaridad semántica.
        """
        if not existing_entities:
            return None, 0.0

        new_embedding = np.array(new_entity.embedding).reshape(1, -1)

        best_match = None
        best_similarity = 0.0

        for existing in existing_entities:
            if not existing.embedding:
                continue

            existing_embedding = np.array(existing.embedding).reshape(1, -1)
            similarity = cosine_similarity(new_embedding, existing_embedding)[0][0]

            if similarity > best_similarity:
                best_similarity = similarity
                best_match = existing

        return best_match, float(best_similarity)

    async def _apply_business_rules(
        self,
        new_entity: Entity,
        existing_entity: Entity
    ) -> Tuple[bool, str]:
        """
        Aplica reglas de negocio específicas por tipo de entidad.

        Returns:
            (is_match: bool, reason: str)
        """
        entity_type = new_entity.type

        if entity_type == "symptom":
            return self._match_symptom_rules(new_entity, existing_entity)
        elif entity_type == "diagnosis":
            return self._match_diagnosis_rules(new_entity, existing_entity)
        elif entity_type == "prescription":
            return self._match_prescription_rules(new_entity, existing_entity)
        else:
            return False, f"No business rules for type {entity_type}"

    def _match_symptom_rules(
        self,
        new: Entity,
        existing: Entity
    ) -> Tuple[bool, str]:
        """
        Reglas para síntomas:
        - Mismo nombre de síntoma (normalized)
        - Misma localización (si está especificada)
        """
        # Normalize names
        new_name = new.symptom_name.lower().strip() if new.symptom_name else ""
        existing_name = existing.symptom_name.lower().strip() if existing.symptom_name else ""

        if new_name and existing_name and new_name != existing_name:
            return False, f"Different symptom names: '{new_name}' vs '{existing_name}'"

        # Check location if specified
        new_location = new.location.lower().strip() if new.location else None
        existing_location = existing.location.lower().strip() if existing.location else None

        if new_location and existing_location:
            # Location must match or be compatible
            if new_location in existing_location or existing_location in new_location:
                return True, f"Same symptom with compatible location"
            else:
                return False, f"Different locations: '{new_location}' vs '{existing_location}'"

        # If location not specified in both, consider it a match
        return True, "Same symptom (location compatible or unspecified)"

    def _match_diagnosis_rules(
        self,
        new: Entity,
        existing: Entity
    ) -> Tuple[bool, str]:
        """
        Reglas para diagnósticos:
        - Mismo código ICD-10 (si está presente)
        - Nombres similares de diagnóstico
        """
        # Check ICD-10 code (strongest signal)
        if new.icd10_code and existing.icd10_code:
            if new.icd10_code == existing.icd10_code:
                return True, f"Same ICD-10 code: {new.icd10_code}"
            else:
                return False, f"Different ICD-10 codes: {new.icd10_code} vs {existing.icd10_code}"

        # Check diagnosis name
        new_name = new.diagnosis_name.lower().strip() if new.diagnosis_name else ""
        existing_name = existing.diagnosis_name.lower().strip() if existing.diagnosis_name else ""

        if new_name and existing_name:
            # Allow substring matching for diagnoses
            if new_name in existing_name or existing_name in new_name:
                return True, f"Similar diagnosis names"
            else:
                return False, f"Different diagnosis names"

        return False, "Insufficient information to match diagnosis"

    def _match_prescription_rules(
        self,
        new: Entity,
        existing: Entity
    ) -> Tuple[bool, str]:
        """
        Reglas para prescripciones:
        - Mismo nombre de medicamento (normalized)
        - Dosis PUEDE cambiar (médico corrigiendo)
        """
        # Normalize medication names
        new_med = new.medication_name.lower().strip() if new.medication_name else ""
        existing_med = existing.medication_name.lower().strip() if existing.medication_name else ""

        if not new_med or not existing_med:
            return False, "Medication name missing"

        # Check if same medication (allow slight variations)
        if new_med == existing_med or new_med in existing_med or existing_med in new_med:
            # Same medication → MERGE
            # Dose can change (doctor correcting dosage)
            if new.dose != existing.dose:
                return True, f"Same medication '{new_med}', dose updated"
            else:
                return True, f"Same medication '{new_med}'"
        else:
            return False, f"Different medications: '{new_med}' vs '{existing_med}'"

    async def merge_entities(
        self,
        existing: Entity,
        new: Entity,
        match_result: MatchResult
    ) -> Entity:
        """
        Fusiona nueva información en entidad existente.

        Returns:
            Entidad actualizada con nuevo version number y changelog
        """
        changed_fields = {}

        # Update type-specific fields
        if existing.type == "symptom":
            changed_fields.update(self._merge_symptom_fields(existing, new))
        elif existing.type == "diagnosis":
            changed_fields.update(self._merge_diagnosis_fields(existing, new))
        elif existing.type == "prescription":
            changed_fields.update(self._merge_prescription_fields(existing, new))

        # Only update if there are actual changes
        if not changed_fields:
            logger.debug("no_fields_changed", entity_id=existing.entity_id)
            return existing

        # Increment version
        existing.version += 1
        existing.updated_at = datetime.utcnow()

        # Add changelog entry
        changelog_entry = ChangelogEntry(
            version=existing.version,
            timestamp=existing.updated_at,
            action="merged",
            changed_fields=changed_fields,
            reason=match_result.reason,
            source_text=new.text
        )
        existing.changelog.append(changelog_entry.dict())

        logger.info(
            "entity_merged",
            entity_id=existing.entity_id,
            version=existing.version,
            changed_fields=list(changed_fields.keys())
        )

        return existing

    def _merge_symptom_fields(self, existing: Entity, new: Entity) -> dict:
        """Merge symptom-specific fields, tracking changes"""
        changed = {}

        # Update severity if new value is different and present
        if new.severity is not None and new.severity != existing.severity:
            changed["severity"] = {
                "old": existing.severity,
                "new": new.severity
            }
            existing.severity = new.severity

        # Update location if new value is more specific
        if new.location and new.location != existing.location:
            if not existing.location or len(new.location) > len(existing.location):
                changed["location"] = {
                    "old": existing.location,
                    "new": new.location
                }
                existing.location = new.location

        # Update duration if specified
        if new.duration and new.duration != existing.duration:
            changed["duration"] = {
                "old": existing.duration,
                "new": new.duration
            }
            existing.duration = new.duration

        return changed

    def _merge_diagnosis_fields(self, existing: Entity, new: Entity) -> dict:
        """Merge diagnosis-specific fields"""
        changed = {}

        # Update ICD-10 code if new one is provided
        if new.icd10_code and new.icd10_code != existing.icd10_code:
            changed["icd10_code"] = {
                "old": existing.icd10_code,
                "new": new.icd10_code
            }
            existing.icd10_code = new.icd10_code

        # Update confidence if new value is higher
        if new.confidence is not None:
            if existing.confidence is None or new.confidence > existing.confidence:
                changed["confidence"] = {
                    "old": existing.confidence,
                    "new": new.confidence
                }
                existing.confidence = new.confidence

        return changed

    def _merge_prescription_fields(self, existing: Entity, new: Entity) -> dict:
        """Merge prescription-specific fields"""
        changed = {}

        # Update dose (common correction scenario)
        if new.dose and new.dose != existing.dose:
            changed["dose"] = {
                "old": existing.dose,
                "new": new.dose
            }
            existing.dose = new.dose

        # Update frequency
        if new.frequency and new.frequency != existing.frequency:
            changed["frequency"] = {
                "old": existing.frequency,
                "new": new.frequency
            }
            existing.frequency = new.frequency

        # Update duration
        if new.duration_days and new.duration_days != existing.duration_days:
            changed["duration_days"] = {
                "old": existing.duration_days,
                "new": new.duration_days
            }
            existing.duration_days = new.duration_days

        return changed

    async def _get_existing_entities(
        self,
        session_id: str,
        entity_type: EntityType
    ) -> List[Entity]:
        """
        Recupera entidades existentes del mismo tipo desde Redis.
        """
        # Get all entity IDs for this session and type
        entity_ids = await redis_client.smembers(
            f"session:{session_id}:entities:{entity_type}"
        )

        entities = []
        for entity_id in entity_ids:
            entity_json = await redis_client.get(f"entity:{entity_id}")
            if entity_json:
                entity = Entity(**orjson.loads(entity_json))
                entities.append(entity)

        return entities

    async def save_entity(self, entity: Entity) -> None:
        """
        Guarda entidad en Redis con índice por tipo.
        """
        # Save entity
        await redis_client.set(
            f"entity:{entity.entity_id}",
            orjson.dumps(entity.dict())
        )

        # Add to session index by type
        await redis_client.sadd(
            f"session:{entity.session_id}:entities:{entity.type}",
            entity.entity_id
        )

        # Set TTL (2 hours, matching session)
        await redis_client.expire(f"entity:{entity.entity_id}", 7200)
        await redis_client.expire(
            f"session:{entity.session_id}:entities:{entity.type}",
            7200
        )

        logger.debug("entity_saved", entity_id=entity.entity_id, version=entity.version)
```

### 2.3 Integración con Extraction Service

**Archivo:** `ai-service/app/services/extraction_service.py`

```python
from app.services.entity_matching_engine import EntityMatchingEngine
from app.models.entity import Entity

class ExtractionService:
    def __init__(
        self,
        llm_service: LLMService,
        matching_engine: EntityMatchingEngine,
        event_callback: callable
    ):
        self.llm_service = llm_service
        self.matching_engine = matching_engine
        self.event_callback = event_callback

    async def extract_and_match_symptom(
        self,
        session_id: str,
        transcript_segment: str
    ) -> Optional[Entity]:
        """
        Extrae síntoma del texto y aplica entity matching.
        """
        # 1. Extract symptom using LLM
        extracted = await self.llm_service.extract_symptom(transcript_segment)

        if not extracted:
            return None

        # 2. Create new entity object
        new_entity = Entity(
            type="symptom",
            session_id=session_id,
            text=transcript_segment,
            symptom_name=extracted.get("name"),
            location=extracted.get("location"),
            severity=extracted.get("severity"),
            duration=extracted.get("duration")
        )

        # 3. Apply entity matching
        match_result = await self.matching_engine.match_entity(
            new_entity,
            session_id
        )

        # 4. Handle result
        if match_result.action == "MERGE":
            # Update existing entity
            updated_entity = await self.matching_engine.merge_entities(
                match_result.target_entity,
                new_entity,
                match_result
            )
            await self.matching_engine.save_entity(updated_entity)

            # Send symptom_updated event
            await self.event_callback({
                "type": "symptom_updated",
                "data": {
                    "symptom_id": updated_entity.entity_id,
                    "version": updated_entity.version,
                    "action": "updated",
                    "changes": updated_entity.changelog[-1]["changed_fields"],
                    "reason": match_result.reason,
                    **updated_entity.dict(exclude={"embedding", "changelog"})
                }
            })

            return updated_entity

        else:  # CREATE_NEW
            # Save new entity
            await self.matching_engine.save_entity(new_entity)

            # Send symptom_extracted event
            await self.event_callback({
                "type": "symptom_extracted",
                "data": {
                    "symptom_id": new_entity.entity_id,
                    "version": 1,
                    "action": "created",
                    "source_text": transcript_segment,
                    **new_entity.dict(exclude={"embedding", "changelog"})
                }
            })

            return new_entity
```

## 3. Ejemplos de Matching

### 3.1 Caso 1: Síntoma con Clarificación

```
Transcripción:
T1 (00:30): "Me duele la cabeza"
T2 (01:45): "El dolor es en la parte frontal, muy intenso, como un 9/10"

Flujo:
1. T1 → Extract symptom
   - Entity 1: {symptom_name: "cefalea", location: "cabeza", severity: null}
   - Action: CREATE_NEW (no existing entities)
   - Event: symptom_extracted

2. T2 → Extract symptom
   - New entity: {symptom_name: "cefalea", location: "cabeza frontal", severity: 9}
   - Similarity with Entity 1: 0.92 (> 0.85)
   - Action: MERGE
   - Changes: {location: "cabeza" → "cabeza frontal", severity: null → 9}
   - Version: 1 → 2
   - Event: symptom_updated
```

### 3.2 Caso 2: Medicamento con Corrección de Dosis

```
Transcripción:
T1 (15:20): "Voy a recetar Ibuprofeno 400mg cada 8 horas"
T2 (15:35): "Mejor que sea 600mg"

Flujo:
1. T1 → Extract prescription
   - Entity 1: {medication: "Ibuprofeno", dose: "400mg", frequency: "cada 8 horas"}
   - Action: CREATE_NEW
   - Event: prescription_added

2. T2 → Extract prescription
   - New entity: {medication: "Ibuprofeno", dose: "600mg"}
   - Similarity: 0.88
   - Business rule: Same medication name → MERGE
   - Changes: {dose: "400mg" → "600mg"}
   - Version: 1 → 2
   - Event: symptom_updated (with dose change)
```

### 3.3 Caso 3: Síntomas Diferentes (No Match)

```
Transcripción:
T1: "Me duele la cabeza"
T2: "También tengo dolor en el estómago"

Flujo:
1. T1 → Entity 1: {symptom: "cefalea", location: "cabeza"}
2. T2 → New entity: {symptom: "dolor abdominal", location: "estómago"}
   - Similarity: 0.45 (< 0.70)
   - Action: CREATE_NEW
   - Result: 2 separate symptom entities
```

## 4. Testing

### 4.1 Test de Matching Fuerte (>0.85)

```python
@pytest.mark.asyncio
async def test_strong_semantic_match():
    engine = EntityMatchingEngine(embedding_service)

    existing = Entity(
        type="symptom",
        session_id="sess_123",
        text="me duele la cabeza",
        symptom_name="cefalea",
        location="cabeza",
        embedding=[0.1, 0.2, ...]  # Mock embedding
    )
    await engine.save_entity(existing)

    new = Entity(
        type="symptom",
        session_id="sess_123",
        text="el dolor de cabeza es muy fuerte",
        symptom_name="cefalea",
        severity=8,
        embedding=[0.12, 0.19, ...]  # Similar embedding
    )

    result = await engine.match_entity(new, "sess_123")

    assert result.action == "MERGE"
    assert result.confidence > 0.85
    assert result.target_entity.entity_id == existing.entity_id
```

### 4.2 Test de Business Rules (Prescription)

```python
@pytest.mark.asyncio
async def test_prescription_dose_update():
    engine = EntityMatchingEngine(embedding_service)

    existing = Entity(
        type="prescription",
        session_id="sess_456",
        text="Ibuprofeno 400mg",
        medication_name="Ibuprofeno",
        dose="400mg",
        embedding=[...]
    )
    await engine.save_entity(existing)

    new = Entity(
        type="prescription",
        session_id="sess_456",
        text="mejor 600mg",
        medication_name="Ibuprofeno",
        dose="600mg",
        embedding=[...]  # Moderate similarity (0.75)
    )

    result = await engine.match_entity(new, "sess_456")

    assert result.action == "MERGE"
    assert "Same medication" in result.reason

    merged = await engine.merge_entities(existing, new, result)
    assert merged.dose == "600mg"
    assert merged.version == 2
    assert len(merged.changelog) == 1
```

## 5. Métricas y Observabilidad

### 5.1 Métricas Clave

```python
from prometheus_client import Counter, Histogram

entity_matching_total = Counter(
    'entity_matching_total',
    'Total entity matching operations',
    ['entity_type', 'action']  # action: MERGE, CREATE_NEW
)

entity_matching_similarity = Histogram(
    'entity_matching_similarity',
    'Semantic similarity scores',
    ['entity_type'],
    buckets=[0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]
)

entity_version_count = Histogram(
    'entity_version_count',
    'Number of versions per entity',
    ['entity_type'],
    buckets=[1, 2, 3, 5, 10, 20]
)
```

## 6. Deployment Considerations

### 6.1 Embeddings Cache

- Cache embeddings de entidades existentes en Redis
- TTL: 2 horas (matching session)
- Key: `entity:{entity_id}:embedding`
- Reduce llamadas a OpenAI embeddings API

### 6.2 Version History Limits

- Por defecto: mantener changelog completo
- Para producción: limitar a últimas 10 versiones
- Changelog completo puede guardarse en PostgreSQL para audit trail

```python
# Limit changelog to last 10 entries
if len(existing.changelog) > 10:
    existing.changelog = existing.changelog[-10:]
```
