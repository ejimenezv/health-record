"""Tests for the LLM-based entity type validator."""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.entity_type_validator import (
    EntityTypeValidator,
    ValidationResult,
)


def _mock_openai_response(payload: dict):
    """Build a fake AsyncOpenAI client returning the given JSON payload."""
    fake_response = MagicMock()
    choice = MagicMock()
    choice.message.content = json.dumps(payload)
    fake_response.choices = [choice]
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_response)
    return fake_client


@pytest.fixture
def validator() -> EntityTypeValidator:
    return EntityTypeValidator()


class TestCorrectClassification:
    @pytest.mark.asyncio
    async def test_symptom_passes(self, validator):
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": True, "actual_type": "symptom", "confidence": 0.95}
            ),
        ):
            result = await validator.validate("dolor de cabeza", "symptom")
        assert result.is_correct
        assert result.suggested_type == "symptom"

    @pytest.mark.asyncio
    async def test_diagnosis_passes(self, validator):
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": True, "actual_type": "diagnosis", "confidence": 0.9}
            ),
        ):
            result = await validator.validate("resfriado común", "diagnosis")
        assert result.is_correct


class TestMisclassification:
    @pytest.mark.asyncio
    async def test_diagnosis_in_symptom_slot_caught(self, validator):
        """resfriado común classified as symptom -> validator says diagnosis."""
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": False, "actual_type": "diagnosis", "confidence": 0.92}
            ),
        ):
            result = await validator.validate("resfriado común", "symptom")
        assert not result.is_correct
        assert result.suggested_type == "diagnosis"

    @pytest.mark.asyncio
    async def test_medication_in_symptom_slot_caught(self, validator):
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": False, "actual_type": "medication", "confidence": 0.97}
            ),
        ):
            result = await validator.validate(
                "paracetamol 500mg", "symptom"
            )
        assert not result.is_correct
        assert result.suggested_type == "medication"


class TestUnknownSuggestionFallsBack:
    @pytest.mark.asyncio
    async def test_unknown_actual_type_becomes_none(self, validator):
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": False, "actual_type": "WEIRD_NEW_TYPE", "confidence": 0.5}
            ),
        ):
            result = await validator.validate("foo", "symptom")
        assert not result.is_correct
        assert result.suggested_type is None


class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_empty_content_rejected(self, validator):
        result = await validator.validate("", "symptom")
        assert not result.is_correct
        assert result.reason == "empty"

    @pytest.mark.asyncio
    async def test_unknown_candidate_type_passes(self, validator):
        result = await validator.validate("foo", "not_a_real_type")
        assert result.is_correct
        assert result.reason == "unknown_candidate_type"

    @pytest.mark.asyncio
    async def test_llm_error_keeps_entity(self, validator):
        """Errors must default to is_correct=True so we never silently drop a real finding."""
        fake_client = MagicMock()
        fake_client.chat.completions.create = AsyncMock(
            side_effect=RuntimeError("network down")
        )
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=fake_client,
        ):
            result = await validator.validate("dolor de cabeza", "symptom")
        assert result.is_correct
        assert result.reason == "llm_error"


class TestConfidenceParsing:
    @pytest.mark.asyncio
    async def test_string_confidence_coerced(self, validator):
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": True, "actual_type": "symptom", "confidence": "0.8"}
            ),
        ):
            result = await validator.validate("foo", "symptom")
        assert result.confidence == pytest.approx(0.8)

    @pytest.mark.asyncio
    async def test_garbage_confidence_becomes_zero(self, validator):
        with patch(
            "src.services.entity_type_validator.AsyncOpenAI",
            return_value=_mock_openai_response(
                {"correct": True, "actual_type": "symptom", "confidence": "abc"}
            ),
        ):
            result = await validator.validate("foo", "symptom")
        assert result.confidence == 0.0


class TestDecisionTruthiness:
    def test_truthy_when_correct(self):
        assert bool(ValidationResult(True)) is True

    def test_falsy_when_misclassified(self):
        assert bool(ValidationResult(False)) is False
