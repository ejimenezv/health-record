"""Unit tests for the Incremental Extractor."""
from __future__ import annotations

import json
from typing import Dict, List
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.entity_matching import EntityMatchingEngine, InMemoryEntityStore
from src.services.extraction import (
    EntityType,
    ExtractionEvent,
    ExtractionPriority,
    IncrementalExtractor,
)


def _embedding_fn(mapping: Dict[str, List[float]]):
    async def _fn(text: str) -> List[float]:
        # Best-effort lookup; fallback to a deterministic vector if missing.
        if text in mapping:
            return mapping[text]
        for key, vec in mapping.items():
            if key in text or text in key:
                return vec
        return [0.0, 0.0, 1.0]

    return _fn


def _mock_chat_response(content: dict, usage_tokens: int = 100):
    """Build a fake openai chat completion response."""
    msg = MagicMock()
    msg.content = json.dumps(content)
    choice = MagicMock()
    choice.message = msg
    usage = MagicMock()
    usage.total_tokens = usage_tokens
    usage.prompt_tokens = usage_tokens // 2
    usage.completion_tokens = usage_tokens // 2
    response = MagicMock()
    response.choices = [choice]
    response.usage = usage
    return response


def _build_client(simple_payload: dict, critical_payload: dict):
    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()

    async def _create(*, model, **_kwargs):
        if model == IncrementalExtractor.MODEL_SIMPLE:
            return _mock_chat_response(simple_payload)
        return _mock_chat_response(critical_payload)

    client.chat.completions.create = AsyncMock(side_effect=_create)
    return client


def _build_engine() -> EntityMatchingEngine:
    embeddings = {
        "paracetamol 500mg cada 8h": [1.0, 0.0, 0.0],
        "paracetamol 1g cada 8h": [0.999, 0.01, 0.0],
        "dolor de cabeza": [0.0, 1.0, 0.0],
        "dolor de cabeza intenso": [0.01, 0.999, 0.0],
        "hipertensión": [0.0, 0.0, 1.0],
    }
    return EntityMatchingEngine(
        embedding_fn=_embedding_fn(embeddings),
        store=InMemoryEntityStore(),
    )


@pytest.mark.asyncio
async def test_process_chunk_emits_events_for_new_entities():
    captured: List[ExtractionEvent] = []

    async def callback(event: ExtractionEvent) -> None:
        captured.append(event)

    client = _build_client(
        simple_payload={
            "symptoms": [
                {
                    "description": "dolor de cabeza",
                    "location": "frontal",
                    "severity": "moderado",
                    "confidence": 0.9,
                }
            ],
            "chief_complaint": {
                "complaint": "cefalea de 3 días",
                "confidence": 0.85,
            },
        },
        critical_payload={
            "medications": [
                {
                    "name": "paracetamol",
                    "dosage": "500mg",
                    "frequency": "cada 8h",
                    "route": "oral",
                    "is_new_prescription": True,
                    "confidence": 0.95,
                }
            ],
            "diagnoses": [
                {
                    "description": "hipertensión",
                    "status": "sospechado",
                    "icd10_code": None,
                    "confidence": 0.7,
                }
            ],
        },
    )

    extractor = IncrementalExtractor(
        session_id="sess-1",
        entity_matching_engine=_build_engine(),
        extraction_callback=callback,
        openai_client=client,
    )

    await extractor.process_transcript_chunk(
        transcript_text="El paciente tiene dolor de cabeza, le doy paracetamol 500mg cada 8h",
        timestamp=1.0,
    )

    event_types = {e.event_type for e in captured}
    assert "medication_extracted" in event_types
    assert "symptom_extracted" in event_types
    assert "diagnosis_detected" in event_types
    assert "chief_complaint_identified" in event_types

    summary = extractor.get_session_summary()
    assert summary["total_entities"] == 4
    assert len(summary["medications"]) == 1
    assert summary["medications"][0]["id"] is not None


@pytest.mark.asyncio
async def test_chief_complaint_only_emitted_once():
    captured: List[ExtractionEvent] = []

    async def callback(event: ExtractionEvent) -> None:
        captured.append(event)

    client = _build_client(
        simple_payload={
            "symptoms": [],
            "chief_complaint": {"complaint": "cefalea", "confidence": 0.9},
        },
        critical_payload={"medications": [], "diagnoses": []},
    )

    extractor = IncrementalExtractor(
        session_id="sess-2",
        entity_matching_engine=_build_engine(),
        extraction_callback=callback,
        openai_client=client,
    )

    await extractor.process_transcript_chunk("dolor de cabeza", timestamp=1.0)
    await extractor.process_transcript_chunk("dolor de cabeza", timestamp=2.0)

    cc_events = [e for e in captured if e.event_type == "chief_complaint_identified"]
    assert len(cc_events) == 1


@pytest.mark.asyncio
async def test_duplicate_medication_merges_via_entity_matching():
    captured: List[ExtractionEvent] = []

    async def callback(event: ExtractionEvent) -> None:
        captured.append(event)

    # Two near-identical medications across two chunks; engine should merge.
    payloads = [
        {
            "name": "paracetamol",
            "dosage": "500mg",
            "frequency": "cada 8h",
            "route": "oral",
            "is_new_prescription": True,
            "confidence": 0.95,
        },
        {
            "name": "paracetamol",
            "dosage": "1g",
            "frequency": "cada 8h",
            "route": "oral",
            "is_new_prescription": True,
            "confidence": 0.9,
        },
    ]

    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    critical_idx = {"n": 0}

    async def _create(*, model, **_kwargs):
        if model == IncrementalExtractor.MODEL_SIMPLE:
            return _mock_chat_response({"symptoms": [], "chief_complaint": None})
        idx = min(critical_idx["n"], len(payloads) - 1)
        critical_idx["n"] += 1
        return _mock_chat_response(
            {"medications": [payloads[idx]], "diagnoses": []}
        )

    client.chat.completions.create = AsyncMock(side_effect=_create)

    extractor = IncrementalExtractor(
        session_id="sess-3",
        entity_matching_engine=_build_engine(),
        extraction_callback=callback,
        openai_client=client,
    )

    await extractor.process_transcript_chunk(
        "paracetamol 500mg cada 8h", timestamp=1.0
    )
    await extractor.process_transcript_chunk(
        "paracetamol 1g cada 8h", timestamp=2.0
    )

    assert len(extractor.medications) == 1
    med_events = [e for e in captured if e.entity_type == EntityType.MEDICATION]
    assert any(e.event_type == "medication_extracted" for e in med_events)
    assert any(e.event_type == "medication_updated" for e in med_events)
    only_med = next(iter(extractor.medications.values()))
    assert only_med.dosage == "1g"


@pytest.mark.asyncio
async def test_context_buffer_keeps_last_n_chunks():
    async def callback(event: ExtractionEvent) -> None:
        return None

    client = _build_client(
        simple_payload={"symptoms": [], "chief_complaint": None},
        critical_payload={"medications": [], "diagnoses": []},
    )

    extractor = IncrementalExtractor(
        session_id="sess-4",
        entity_matching_engine=_build_engine(),
        extraction_callback=callback,
        openai_client=client,
        max_context_chunks=3,
    )

    for i, text in enumerate(["a", "b", "c", "d", "e"]):
        await extractor.process_transcript_chunk(text, timestamp=float(i))

    assert extractor.context_buffer == ["c", "d", "e"]


@pytest.mark.asyncio
async def test_critical_priority_for_medications():
    captured: List[ExtractionEvent] = []

    async def callback(event: ExtractionEvent) -> None:
        captured.append(event)

    client = _build_client(
        simple_payload={"symptoms": [], "chief_complaint": None},
        critical_payload={
            "medications": [
                {
                    "name": "metformina",
                    "dosage": "850mg",
                    "frequency": "cada 12h",
                    "is_new_prescription": True,
                    "confidence": 0.9,
                }
            ],
            "diagnoses": [
                {
                    "description": "diabetes tipo 2",
                    "status": "confirmado",
                    "confidence": 0.9,
                }
            ],
        },
    )

    extractor = IncrementalExtractor(
        session_id="sess-5",
        entity_matching_engine=_build_engine(),
        extraction_callback=callback,
        openai_client=client,
    )

    await extractor.process_transcript_chunk("metformina 850mg", timestamp=1.0)

    by_type = {e.entity_type: e for e in captured}
    assert by_type[EntityType.MEDICATION].priority == ExtractionPriority.CRITICAL
    assert by_type[EntityType.DIAGNOSIS].priority == ExtractionPriority.HIGH


@pytest.mark.asyncio
async def test_cost_tracker_called_for_both_models():
    cost_tracker = MagicMock()
    cost_tracker.track_extraction = AsyncMock()

    client = _build_client(
        simple_payload={"symptoms": [], "chief_complaint": None},
        critical_payload={"medications": [], "diagnoses": []},
    )

    extractor = IncrementalExtractor(
        session_id="sess-6",
        entity_matching_engine=_build_engine(),
        extraction_callback=AsyncMock(),
        openai_client=client,
        cost_tracker=cost_tracker,
    )

    await extractor.process_transcript_chunk("hola", timestamp=1.0)

    models_tracked = {
        call.kwargs["model"] for call in cost_tracker.track_extraction.await_args_list
    }
    assert IncrementalExtractor.MODEL_SIMPLE in models_tracked
    assert IncrementalExtractor.MODEL_CRITICAL in models_tracked


@pytest.mark.asyncio
async def test_invalid_json_does_not_raise():
    captured: List[ExtractionEvent] = []

    async def callback(event: ExtractionEvent) -> None:
        captured.append(event)

    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()

    async def _create(*, model, **_kwargs):
        bad = MagicMock()
        bad.content = "not json {{"
        choice = MagicMock()
        choice.message = bad
        usage = MagicMock()
        usage.total_tokens = 0
        usage.prompt_tokens = 0
        usage.completion_tokens = 0
        resp = MagicMock()
        resp.choices = [choice]
        resp.usage = usage
        return resp

    client.chat.completions.create = AsyncMock(side_effect=_create)

    extractor = IncrementalExtractor(
        session_id="sess-7",
        entity_matching_engine=_build_engine(),
        extraction_callback=callback,
        openai_client=client,
    )

    await extractor.process_transcript_chunk("texto irrelevante", timestamp=1.0)
    assert captured == []
    assert extractor.get_session_summary()["total_entities"] == 0
