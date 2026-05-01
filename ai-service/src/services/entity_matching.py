"""
Entity Matching Engine.

Hybrid approach combining semantic similarity (cosine over embeddings) with
type-specific business rules. See docs/delivery-2/07-entity-matching-engine.md
for design details.

Persistence is abstracted behind ``EntityStore``; the default
``InMemoryEntityStore`` is sufficient for unit tests and current single-process
operation. A Redis-backed store can be added later without touching engine
logic.
"""
from __future__ import annotations

from datetime import datetime
from typing import Awaitable, Callable, Dict, List, Optional, Protocol, Tuple

import numpy as np

from src.core.logging import get_logger
from src.core.metrics import metrics
from src.models.entity import (
    ActionType,
    ChangelogEntry,
    Entity,
    EntityType,
    MatchResult,
)

logger = get_logger(__name__)

EmbeddingFn = Callable[[str], Awaitable[List[float]]]


class EntityStore(Protocol):
    async def get_by_session_and_type(
        self, session_id: str, entity_type: EntityType
    ) -> List[Entity]: ...

    async def save(self, entity: Entity) -> None: ...


class InMemoryEntityStore:
    """Process-local entity store keyed by (session_id, type)."""

    def __init__(self) -> None:
        self._by_session_type: Dict[Tuple[str, str], Dict[str, Entity]] = {}

    async def get_by_session_and_type(
        self, session_id: str, entity_type: EntityType
    ) -> List[Entity]:
        return list(self._by_session_type.get((session_id, entity_type), {}).values())

    async def save(self, entity: Entity) -> None:
        bucket = self._by_session_type.setdefault((entity.session_id, entity.type), {})
        bucket[entity.entity_id] = entity


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    va = np.asarray(a, dtype=np.float64)
    vb = np.asarray(b, dtype=np.float64)
    na = np.linalg.norm(va)
    nb = np.linalg.norm(vb)
    if na == 0.0 or nb == 0.0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


class EntityMatchingEngine:
    """Match newly-extracted entities against existing ones for a session."""

    STRONG_MATCH = 0.85
    UNCERTAIN_MIN = 0.70

    def __init__(
        self,
        embedding_fn: EmbeddingFn,
        store: Optional[EntityStore] = None,
        changelog_limit: int = 10,
    ) -> None:
        self._embedding_fn = embedding_fn
        self._store: EntityStore = store or InMemoryEntityStore()
        self._changelog_limit = changelog_limit

    async def match_entity(self, new_entity: Entity, session_id: str) -> MatchResult:
        if new_entity.embedding is None:
            new_entity.embedding = await self._embedding_fn(new_entity.text)

        existing = await self._store.get_by_session_and_type(session_id, new_entity.type)
        if not existing:
            return MatchResult(
                action="CREATE_NEW",
                confidence=1.0,
                reason="No existing entities of this type",
            )

        best_match, similarity = self._find_best_match(new_entity, existing)
        metrics.entity_matching_similarity.observe(
            similarity, labels={"entity_type": new_entity.type}
        )

        logger.debug(
            "entity_matching_similarity",
            new_text=new_entity.text,
            best_match_text=best_match.text if best_match else None,
            similarity=similarity,
        )

        if similarity > self.STRONG_MATCH:
            return MatchResult(
                action="MERGE",
                confidence=similarity,
                target_entity=best_match,
                reason=f"Strong semantic match (similarity={similarity:.3f})",
                match_details={"similarity": similarity, "threshold": "strong_match"},
            )

        if similarity >= self.UNCERTAIN_MIN and best_match is not None:
            is_match, rule_reason = self._apply_business_rules(new_entity, best_match)
            if is_match:
                return MatchResult(
                    action="MERGE",
                    confidence=similarity,
                    target_entity=best_match,
                    reason=f"Business rule match: {rule_reason}",
                    match_details={
                        "similarity": similarity,
                        "threshold": "uncertain",
                        "business_rule": rule_reason,
                    },
                )
            return MatchResult(
                action="CREATE_NEW",
                confidence=1.0 - similarity,
                reason=f"Business rule rejected: {rule_reason}",
                match_details={
                    "similarity": similarity,
                    "business_rule_failed": rule_reason,
                },
            )

        return MatchResult(
            action="CREATE_NEW",
            confidence=1.0 - similarity,
            reason=f"Low semantic similarity (similarity={similarity:.3f})",
            match_details={"similarity": similarity, "threshold": "below_minimum"},
        )

    def _find_best_match(
        self, new_entity: Entity, existing_entities: List[Entity]
    ) -> Tuple[Optional[Entity], float]:
        best_match: Optional[Entity] = None
        best_similarity = 0.0
        if new_entity.embedding is None:
            return None, 0.0

        for existing in existing_entities:
            if not existing.embedding:
                continue
            similarity = _cosine_similarity(new_entity.embedding, existing.embedding)
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = existing

        return best_match, best_similarity

    # ------------------------------------------------------------------
    # Business rules
    # ------------------------------------------------------------------
    def _apply_business_rules(
        self, new_entity: Entity, existing_entity: Entity
    ) -> Tuple[bool, str]:
        if new_entity.type == "symptom":
            return self._match_symptom_rules(new_entity, existing_entity)
        if new_entity.type == "diagnosis":
            return self._match_diagnosis_rules(new_entity, existing_entity)
        if new_entity.type == "prescription":
            return self._match_prescription_rules(new_entity, existing_entity)
        return False, f"No business rules for type {new_entity.type}"

    @staticmethod
    def _match_symptom_rules(new: Entity, existing: Entity) -> Tuple[bool, str]:
        new_name = (new.symptom_name or "").lower().strip()
        existing_name = (existing.symptom_name or "").lower().strip()

        if new_name and existing_name and new_name != existing_name:
            return False, f"Different symptom names: '{new_name}' vs '{existing_name}'"

        new_loc = new.location.lower().strip() if new.location else None
        existing_loc = existing.location.lower().strip() if existing.location else None
        if new_loc and existing_loc:
            if new_loc in existing_loc or existing_loc in new_loc:
                return True, "Same symptom with compatible location"
            return False, f"Different locations: '{new_loc}' vs '{existing_loc}'"

        return True, "Same symptom (location compatible or unspecified)"

    @staticmethod
    def _match_diagnosis_rules(new: Entity, existing: Entity) -> Tuple[bool, str]:
        if new.icd10_code and existing.icd10_code:
            if new.icd10_code == existing.icd10_code:
                return True, f"Same ICD-10 code: {new.icd10_code}"
            return False, (
                f"Different ICD-10 codes: {new.icd10_code} vs {existing.icd10_code}"
            )

        new_name = (new.diagnosis_name or "").lower().strip()
        existing_name = (existing.diagnosis_name or "").lower().strip()
        if new_name and existing_name:
            if new_name in existing_name or existing_name in new_name:
                return True, "Similar diagnosis names"
            return False, "Different diagnosis names"

        return False, "Insufficient information to match diagnosis"

    @staticmethod
    def _match_prescription_rules(new: Entity, existing: Entity) -> Tuple[bool, str]:
        new_med = (new.medication_name or "").lower().strip()
        existing_med = (existing.medication_name or "").lower().strip()
        if not new_med or not existing_med:
            return False, "Medication name missing"

        if new_med == existing_med or new_med in existing_med or existing_med in new_med:
            if new.dose != existing.dose:
                return True, f"Same medication '{new_med}', dose updated"
            return True, f"Same medication '{new_med}'"
        return False, f"Different medications: '{new_med}' vs '{existing_med}'"

    # ------------------------------------------------------------------
    # Merge logic
    # ------------------------------------------------------------------
    async def merge_entities(
        self, existing: Entity, new: Entity, match_result: MatchResult
    ) -> Entity:
        if existing.type == "symptom":
            changed = self._merge_symptom_fields(existing, new)
        elif existing.type == "diagnosis":
            changed = self._merge_diagnosis_fields(existing, new)
        elif existing.type == "prescription":
            changed = self._merge_prescription_fields(existing, new)
        else:
            changed = {}

        if not changed:
            logger.debug("entity_merge_no_changes", entity_id=existing.entity_id)
            return existing

        existing.version += 1
        existing.updated_at = datetime.utcnow()

        entry = ChangelogEntry(
            version=existing.version,
            timestamp=existing.updated_at,
            action="merged",
            changed_fields=changed,
            reason=match_result.reason,
            source_text=new.text,
        )
        existing.changelog.append(entry.model_dump(mode="json"))
        if len(existing.changelog) > self._changelog_limit:
            existing.changelog = existing.changelog[-self._changelog_limit :]

        logger.info(
            "entity_merged",
            entity_id=existing.entity_id,
            version=existing.version,
            changed_fields=list(changed.keys()),
        )
        return existing

    @staticmethod
    def _merge_symptom_fields(existing: Entity, new: Entity) -> Dict[str, Dict[str, object]]:
        changed: Dict[str, Dict[str, object]] = {}

        if new.severity is not None and new.severity != existing.severity:
            changed["severity"] = {"old": existing.severity, "new": new.severity}
            existing.severity = new.severity

        if new.location and new.location != existing.location:
            if not existing.location or len(new.location) > len(existing.location):
                changed["location"] = {"old": existing.location, "new": new.location}
                existing.location = new.location

        if new.duration and new.duration != existing.duration:
            changed["duration"] = {"old": existing.duration, "new": new.duration}
            existing.duration = new.duration

        return changed

    @staticmethod
    def _merge_diagnosis_fields(existing: Entity, new: Entity) -> Dict[str, Dict[str, object]]:
        changed: Dict[str, Dict[str, object]] = {}

        if new.icd10_code and new.icd10_code != existing.icd10_code:
            changed["icd10_code"] = {"old": existing.icd10_code, "new": new.icd10_code}
            existing.icd10_code = new.icd10_code

        if new.confidence is not None:
            if existing.confidence is None or new.confidence > existing.confidence:
                changed["confidence"] = {"old": existing.confidence, "new": new.confidence}
                existing.confidence = new.confidence

        return changed

    @staticmethod
    def _merge_prescription_fields(existing: Entity, new: Entity) -> Dict[str, Dict[str, object]]:
        changed: Dict[str, Dict[str, object]] = {}

        if new.dose and new.dose != existing.dose:
            changed["dose"] = {"old": existing.dose, "new": new.dose}
            existing.dose = new.dose

        if new.frequency and new.frequency != existing.frequency:
            changed["frequency"] = {"old": existing.frequency, "new": new.frequency}
            existing.frequency = new.frequency

        if new.duration_days and new.duration_days != existing.duration_days:
            changed["duration_days"] = {
                "old": existing.duration_days,
                "new": new.duration_days,
            }
            existing.duration_days = new.duration_days

        return changed

    # ------------------------------------------------------------------
    # Storage passthrough
    # ------------------------------------------------------------------
    async def save_entity(self, entity: Entity) -> None:
        await self._store.save(entity)
        logger.debug("entity_saved", entity_id=entity.entity_id, version=entity.version)


__all__ = [
    "EntityMatchingEngine",
    "EntityStore",
    "InMemoryEntityStore",
    "EmbeddingFn",
    "ActionType",
]
