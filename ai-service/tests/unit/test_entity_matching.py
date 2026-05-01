"""Unit tests for the Entity Matching Engine."""
from __future__ import annotations

from typing import Dict, List

import pytest

from src.models.entity import Entity
from src.services.entity_matching import (
    EntityMatchingEngine,
    InMemoryEntityStore,
)


def make_embedding_fn(mapping: Dict[str, List[float]]):
    async def _fn(text: str) -> List[float]:
        if text not in mapping:
            raise KeyError(f"No embedding configured for {text!r}")
        return mapping[text]

    return _fn


@pytest.mark.asyncio
async def test_strong_semantic_match_triggers_merge() -> None:
    embeddings = {
        "me duele la cabeza": [1.0, 0.0, 0.0],
        "el dolor de cabeza es muy fuerte": [0.99, 0.05, 0.0],
    }
    engine = EntityMatchingEngine(
        embedding_fn=make_embedding_fn(embeddings),
        store=InMemoryEntityStore(),
    )

    existing = Entity(
        type="symptom",
        session_id="sess_123",
        text="me duele la cabeza",
        symptom_name="cefalea",
        location="cabeza",
        embedding=embeddings["me duele la cabeza"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom",
        session_id="sess_123",
        text="el dolor de cabeza es muy fuerte",
        symptom_name="cefalea",
        severity=8,
    )

    result = await engine.match_entity(incoming, "sess_123")

    assert result.action == "MERGE"
    assert result.confidence > EntityMatchingEngine.STRONG_MATCH
    assert result.target_entity is not None
    assert result.target_entity.entity_id == existing.entity_id


@pytest.mark.asyncio
async def test_no_existing_entities_creates_new() -> None:
    engine = EntityMatchingEngine(
        embedding_fn=make_embedding_fn({"primer sintoma": [1.0, 0.0]}),
    )
    incoming = Entity(
        type="symptom",
        session_id="sess_empty",
        text="primer sintoma",
        symptom_name="cefalea",
    )

    result = await engine.match_entity(incoming, "sess_empty")

    assert result.action == "CREATE_NEW"
    assert result.confidence == 1.0
    assert result.target_entity is None


@pytest.mark.asyncio
async def test_low_similarity_creates_new() -> None:
    embeddings = {
        "me duele la cabeza": [1.0, 0.0, 0.0],
        "tambien tengo dolor en el estomago": [0.0, 1.0, 0.0],
    }
    engine = EntityMatchingEngine(embedding_fn=make_embedding_fn(embeddings))

    existing = Entity(
        type="symptom",
        session_id="s",
        text="me duele la cabeza",
        symptom_name="cefalea",
        location="cabeza",
        embedding=embeddings["me duele la cabeza"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom",
        session_id="s",
        text="tambien tengo dolor en el estomago",
        symptom_name="dolor abdominal",
        location="estomago",
    )

    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"
    assert "Low semantic similarity" in result.reason


@pytest.mark.asyncio
async def test_uncertain_band_business_rule_merges_prescription_dose_update() -> None:
    embeddings = {
        "Ibuprofeno 400mg": [1.0, 0.0, 0.0],
        "mejor 600mg": [0.78, 0.62, 0.0],  # cosine ~0.78, in uncertain band
    }
    engine = EntityMatchingEngine(embedding_fn=make_embedding_fn(embeddings))

    existing = Entity(
        type="prescription",
        session_id="rx",
        text="Ibuprofeno 400mg",
        medication_name="Ibuprofeno",
        dose="400mg",
        embedding=embeddings["Ibuprofeno 400mg"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="prescription",
        session_id="rx",
        text="mejor 600mg",
        medication_name="Ibuprofeno",
        dose="600mg",
    )

    result = await engine.match_entity(incoming, "rx")
    assert result.action == "MERGE"
    assert "Same medication" in result.reason

    merged = await engine.merge_entities(existing, incoming, result)
    assert merged.dose == "600mg"
    assert merged.version == 2
    assert len(merged.changelog) == 1
    assert merged.changelog[0]["changed_fields"]["dose"] == {"old": "400mg", "new": "600mg"}


@pytest.mark.asyncio
async def test_uncertain_band_different_medications_creates_new() -> None:
    embeddings = {
        "paracetamol 500mg": [1.0, 0.0, 0.0],
        "ibuprofeno 400mg": [0.78, 0.62, 0.0],
    }
    engine = EntityMatchingEngine(embedding_fn=make_embedding_fn(embeddings))

    existing = Entity(
        type="prescription",
        session_id="rx2",
        text="paracetamol 500mg",
        medication_name="Paracetamol",
        dose="500mg",
        embedding=embeddings["paracetamol 500mg"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="prescription",
        session_id="rx2",
        text="ibuprofeno 400mg",
        medication_name="Ibuprofeno",
        dose="400mg",
    )

    result = await engine.match_entity(incoming, "rx2")
    assert result.action == "CREATE_NEW"
    assert "Different medications" in result.reason


@pytest.mark.asyncio
async def test_diagnosis_icd10_match_in_uncertain_band() -> None:
    embeddings = {
        "hipertension arterial": [1.0, 0.0, 0.0],
        "HTA": [0.75, 0.66, 0.0],  # uncertain band
    }
    engine = EntityMatchingEngine(embedding_fn=make_embedding_fn(embeddings))

    existing = Entity(
        type="diagnosis",
        session_id="dx",
        text="hipertension arterial",
        diagnosis_name="Hipertension arterial",
        icd10_code="I10",
        embedding=embeddings["hipertension arterial"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="diagnosis",
        session_id="dx",
        text="HTA",
        diagnosis_name="HTA",
        icd10_code="I10",
    )

    result = await engine.match_entity(incoming, "dx")
    assert result.action == "MERGE"
    assert "I10" in result.reason


@pytest.mark.asyncio
async def test_symptom_merge_updates_severity_and_increments_version() -> None:
    embeddings = {
        "dolor de cabeza": [1.0, 0.0, 0.0],
        "cefalea muy intensa 9 de 10": [0.97, 0.0, 0.0],
    }
    engine = EntityMatchingEngine(embedding_fn=make_embedding_fn(embeddings))

    existing = Entity(
        type="symptom",
        session_id="s2",
        text="dolor de cabeza",
        symptom_name="cefalea",
        location="cabeza",
        embedding=embeddings["dolor de cabeza"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom",
        session_id="s2",
        text="cefalea muy intensa 9 de 10",
        symptom_name="cefalea",
        location="cabeza frontal",
        severity=9,
    )

    result = await engine.match_entity(incoming, "s2")
    assert result.action == "MERGE"

    merged = await engine.merge_entities(existing, incoming, result)
    assert merged.version == 2
    assert merged.severity == 9
    assert merged.location == "cabeza frontal"
    assert merged.changelog[-1]["changed_fields"].keys() >= {"severity", "location"}


@pytest.mark.asyncio
async def test_merge_with_no_field_changes_does_not_increment_version() -> None:
    embeddings = {
        "fiebre": [1.0, 0.0, 0.0],
        "tiene fiebre": [0.99, 0.0, 0.0],
    }
    engine = EntityMatchingEngine(embedding_fn=make_embedding_fn(embeddings))

    existing = Entity(
        type="symptom",
        session_id="s3",
        text="fiebre",
        symptom_name="fiebre",
        embedding=embeddings["fiebre"],
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom",
        session_id="s3",
        text="tiene fiebre",
        symptom_name="fiebre",
    )
    result = await engine.match_entity(incoming, "s3")
    merged = await engine.merge_entities(existing, incoming, result)

    assert merged.version == 1
    assert merged.changelog == []
