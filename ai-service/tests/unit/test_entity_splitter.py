"""Tests for the LLM-based atomic entity splitter."""
from unittest.mock import AsyncMock, patch

import pytest

from src.services.entity_splitter import (
    AtomicEntitySplitter,
    _looks_compound,
)


class TestHeuristic:
    @pytest.mark.parametrize(
        "phrase",
        [
            "fiebre y dolor de cabeza",
            "tos, fiebre, malestar",
            "fiebre e ictericia",
            "dolor de cabeza junto con náuseas",
            "tos; congestión; fiebre",
        ],
    )
    def test_marks_compound(self, phrase):
        assert _looks_compound(phrase)

    @pytest.mark.parametrize(
        "phrase",
        [
            "fiebre",
            "dolor de cabeza",
            "paracetamol 500mg",
            "presión arterial 140/90",
            "resfriado común",
            "temperatura de 38 grados",
        ],
    )
    def test_marks_atomic(self, phrase):
        assert not _looks_compound(phrase)


class TestSplitShortCircuit:
    @pytest.mark.asyncio
    async def test_atomic_phrase_no_llm_call(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter, "_llm_split", AsyncMock(return_value=["x"])
        ) as mock_llm:
            result = await splitter.split("fiebre", "symptom")
        assert result == ["fiebre"]
        mock_llm.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_empty_returns_empty(self):
        splitter = AtomicEntitySplitter()
        result = await splitter.split("   ", "symptom")
        assert result == []


class TestSplitCompound:
    @pytest.mark.asyncio
    async def test_compound_calls_llm(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter,
            "_llm_split",
            AsyncMock(return_value=["fiebre", "dolor de cabeza"]),
        ):
            result = await splitter.split("fiebre y dolor de cabeza", "symptom")
        assert result == ["fiebre", "dolor de cabeza"]

    @pytest.mark.asyncio
    async def test_three_part_compound(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter,
            "_llm_split",
            AsyncMock(return_value=["tos", "fiebre", "malestar"]),
        ):
            result = await splitter.split("tos, fiebre, malestar", "symptom")
        assert result == ["tos", "fiebre", "malestar"]

    @pytest.mark.asyncio
    async def test_dedupes_llm_output(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter,
            "_llm_split",
            AsyncMock(return_value=["fiebre", "Fiebre", "fiebre"]),
        ):
            result = await splitter.split("fiebre y fiebre", "symptom")
        assert result == ["fiebre"]


class TestErrorHandling:
    @pytest.mark.asyncio
    async def test_llm_returns_none_falls_back_to_original(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter, "_llm_split", AsyncMock(return_value=None)
        ):
            result = await splitter.split("fiebre y dolor de cabeza", "symptom")
        assert result == ["fiebre y dolor de cabeza"]

    @pytest.mark.asyncio
    async def test_llm_returns_empty_list_falls_back(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter, "_llm_split", AsyncMock(return_value=[])
        ):
            result = await splitter.split("fiebre y dolor de cabeza", "symptom")
        assert result == ["fiebre y dolor de cabeza"]


class TestDoseDoesntSplit:
    """Ensure the LLM contract: dose specifiers stay together as one atomic.
    Mocked because we don't want to hit the network in unit tests, but the
    prompt explicitly demonstrates this behaviour."""

    @pytest.mark.asyncio
    async def test_dose_kept_together_when_llm_returns_one(self):
        splitter = AtomicEntitySplitter()
        with patch.object(
            AtomicEntitySplitter,
            "_llm_split",
            AsyncMock(return_value=["paracetamol 500mg cada 8 horas"]),
        ):
            # Has " y " so it would normally trigger the LLM; the mock
            # represents the LLM correctly returning a single atomic.
            result = await splitter.split(
                "paracetamol 500mg y reposo", "prescription"
            )
        assert result == ["paracetamol 500mg cada 8 horas"]
