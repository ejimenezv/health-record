"""Unit tests for src/rag/event_handlers.py."""
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.rag.event_handlers import RAGEventHandler


@pytest.fixture
def coordinator():
    coord = MagicMock()
    coord.on_entity_extracted = AsyncMock()
    return coord


@pytest.fixture
def handler(coordinator):
    return RAGEventHandler(coordinator)


@pytest.mark.asyncio
async def test_handle_medication_extracted(handler, coordinator):
    await handler.handle_medication_extracted(
        medication_data={"name": "Paracetamol"},
        session_id="s1",
    )

    coordinator.on_entity_extracted.assert_awaited_once_with(
        entity_type="medication",
        entity_data={"name": "Paracetamol"},
        session_id="s1",
    )


@pytest.mark.asyncio
async def test_handle_symptom_extracted(handler, coordinator):
    await handler.handle_symptom_extracted(
        symptom_data={"description": "headache"},
        session_id="s1",
    )

    coordinator.on_entity_extracted.assert_awaited_once_with(
        entity_type="symptom",
        entity_data={"description": "headache"},
        session_id="s1",
    )


@pytest.mark.asyncio
async def test_handle_diagnosis_extracted(handler, coordinator):
    await handler.handle_diagnosis_extracted(
        diagnosis_data={"icd10": "J00"},
        session_id="s1",
    )

    coordinator.on_entity_extracted.assert_awaited_once()
    args = coordinator.on_entity_extracted.await_args.kwargs
    assert args["entity_data"] == {"icd10": "J00"}
    assert args["session_id"] == "s1"
