"""Additional tests for src/services/entity_matching.py business rules and merges."""
import pytest

from src.models.entity import Entity, MatchResult
from src.services.entity_matching import (
    EntityMatchingEngine,
    InMemoryEntityStore,
    _cosine_similarity,
)


# Vectors crafted to land in the UNCERTAIN_MIN..STRONG_MATCH band (~0.78).
# cos(38°) ≈ 0.788, which is between 0.70 (UNCERTAIN_MIN) and 0.85 (STRONG_MATCH).
UNCERTAIN_A = [1.0, 0.0]
UNCERTAIN_B = [0.788, 0.616]


def _embed_fn(mapping):
    async def _fn(text: str):
        return mapping.get(text, [0.0, 0.0])
    return _fn


def test_cosine_similarity_zero_vectors():
    assert _cosine_similarity([0, 0, 0], [1, 1, 1]) == 0.0
    assert _cosine_similarity([1, 1, 1], [0, 0, 0]) == 0.0


def test_cosine_similarity_orthogonal():
    assert _cosine_similarity([1, 0, 0], [0, 1, 0]) == pytest.approx(0.0)


def test_cosine_similarity_identical():
    assert _cosine_similarity([1, 1, 1], [1, 1, 1]) == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_find_best_match_no_embedding_returns_none():
    engine = EntityMatchingEngine(embedding_fn=_embed_fn({}), store=InMemoryEntityStore())
    new = Entity(type="symptom", session_id="s", text="x", embedding=None)
    best, sim = engine._find_best_match(new, [])
    assert best is None
    assert sim == 0.0


@pytest.mark.asyncio
async def test_find_best_match_skips_existing_without_embedding():
    engine = EntityMatchingEngine(embedding_fn=_embed_fn({}), store=InMemoryEntityStore())
    new = Entity(type="symptom", session_id="s", text="x", embedding=[1, 0, 0])
    existing_no_emb = Entity(type="symptom", session_id="s", text="y", embedding=None)
    existing_with_emb = Entity(type="symptom", session_id="s", text="z", embedding=[1, 0, 0])

    best, sim = engine._find_best_match(new, [existing_no_emb, existing_with_emb])
    assert best is existing_with_emb
    assert sim == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_symptom_rules_different_names_rejects():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="symptom", session_id="s", text="a",
        symptom_name="cefalea", embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom", session_id="s", text="b",
        symptom_name="gastralgia",
    )
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"
    assert "rejected" in result.reason.lower()


@pytest.mark.asyncio
async def test_symptom_rules_different_locations_rejects():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="symptom", session_id="s", text="a",
        symptom_name="dolor", location="cabeza",
        embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom", session_id="s", text="b",
        symptom_name="dolor", location="pierna",
    )
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"


@pytest.mark.asyncio
async def test_symptom_rules_compatible_locations_merges():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="symptom", session_id="s", text="a",
        symptom_name="dolor", location="cabeza frontal",
        embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="symptom", session_id="s", text="b",
        symptom_name="dolor", location="cabeza",
    )
    result = await engine.match_entity(incoming, "s")
    assert result.action == "MERGE"


@pytest.mark.asyncio
async def test_diagnosis_rules_different_icd10_rejects():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="diagnosis", session_id="s", text="a",
        diagnosis_name="hipertensión", icd10_code="I10",
        embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="diagnosis", session_id="s", text="b",
        diagnosis_name="diabetes", icd10_code="E11",
    )
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"


@pytest.mark.asyncio
async def test_diagnosis_rules_insufficient_info_rejects():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(type="diagnosis", session_id="s", text="a", embedding=UNCERTAIN_A)
    await engine.save_entity(existing)

    incoming = Entity(type="diagnosis", session_id="s", text="b")
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"


@pytest.mark.asyncio
async def test_prescription_missing_med_name_rejects():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="prescription", session_id="s", text="a",
        medication_name="paracetamol", embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(type="prescription", session_id="s", text="b", medication_name=None)
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"


@pytest.mark.asyncio
async def test_prescription_different_meds_rejects():
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="prescription", session_id="s", text="a",
        medication_name="paracetamol", embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(
        type="prescription", session_id="s", text="b", medication_name="ibuprofeno"
    )
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"


@pytest.mark.asyncio
async def test_chief_complaint_no_business_rules_creates_new():
    """`chief_complaint` has no business rules → falls through CREATE_NEW."""
    embeddings = {"a": UNCERTAIN_A, "b": UNCERTAIN_B}
    engine = EntityMatchingEngine(embedding_fn=_embed_fn(embeddings), store=InMemoryEntityStore())
    existing = Entity(
        type="chief_complaint", session_id="s", text="a", embedding=UNCERTAIN_A,
    )
    await engine.save_entity(existing)

    incoming = Entity(type="chief_complaint", session_id="s", text="b")
    result = await engine.match_entity(incoming, "s")
    assert result.action == "CREATE_NEW"


@pytest.mark.asyncio
async def test_merge_diagnosis_updates_icd10_and_confidence():
    engine = EntityMatchingEngine(embedding_fn=_embed_fn({}), store=InMemoryEntityStore())
    existing = Entity(
        type="diagnosis", session_id="s", text="diag",
        diagnosis_name="hta", icd10_code="I10", confidence=0.6,
    )
    new = Entity(
        type="diagnosis", session_id="s", text="diag",
        diagnosis_name="hta", icd10_code="I11", confidence=0.9,
    )

    match = MatchResult(action="MERGE", confidence=0.9, reason="test")
    merged = await engine.merge_entities(existing, new, match)

    assert merged.icd10_code == "I11"
    assert merged.confidence == 0.9
    assert merged.version == 2  # incremented from default 1


@pytest.mark.asyncio
async def test_merge_prescription_updates_dose_and_duration():
    engine = EntityMatchingEngine(embedding_fn=_embed_fn({}), store=InMemoryEntityStore())
    existing = Entity(
        type="prescription", session_id="s", text="rx",
        medication_name="paracetamol", dose="500mg", duration_days=5,
    )
    new = Entity(
        type="prescription", session_id="s", text="rx",
        medication_name="paracetamol", dose="1000mg",
        frequency="cada 6h", duration_days=7,
    )

    match = MatchResult(action="MERGE", confidence=0.9, reason="test")
    merged = await engine.merge_entities(existing, new, match)

    assert merged.dose == "1000mg"
    assert merged.frequency == "cada 6h"
    assert merged.duration_days == 7


@pytest.mark.asyncio
async def test_merge_chief_complaint_no_field_changes():
    """`chief_complaint` has no merge fields → no version bump, no changelog entry."""
    engine = EntityMatchingEngine(embedding_fn=_embed_fn({}), store=InMemoryEntityStore())
    existing = Entity(type="chief_complaint", session_id="s", text="x")
    new = Entity(type="chief_complaint", session_id="s", text="x")
    match = MatchResult(action="MERGE", confidence=0.9, reason="test")
    merged = await engine.merge_entities(existing, new, match)
    assert merged.version == 1  # unchanged


@pytest.mark.asyncio
async def test_in_memory_store_filters_by_session_and_type():
    store = InMemoryEntityStore()
    e1 = Entity(type="symptom", session_id="s1", text="a")
    e2 = Entity(type="symptom", session_id="s2", text="b")
    e3 = Entity(type="diagnosis", session_id="s1", text="c")

    await store.save(e1)
    await store.save(e2)
    await store.save(e3)

    s1_symptoms = await store.get_by_session_and_type("s1", "symptom")
    assert len(s1_symptoms) == 1
    assert s1_symptoms[0].entity_id == e1.entity_id
