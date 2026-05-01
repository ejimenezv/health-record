"""Unit tests for src/transcription/diarization/llm_validator.py."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.transcription.diarization.llm_validator import LLMSpeakerValidator
from src.transcription.diarization.models import (
    ConsultationContext,
    Speaker,
    SpeakerRole,
    SpeakerState,
)


def _make_state():
    return SpeakerState(
        session_id="s1",
        speakers={
            "SPEAKER_0": Speaker(id="SPEAKER_0", role=SpeakerRole.UNKNOWN, confidence=0.4),
            "SPEAKER_1": Speaker(id="SPEAKER_1", role=SpeakerRole.UNKNOWN, confidence=0.4),
        },
    )


@pytest.mark.asyncio
async def test_validate_roles_success():
    fake_response = SimpleNamespace(
        content='{"speakers": {"SPEAKER_0": "doctor", "SPEAKER_1": "patient"}, '
                '"confidence": 0.9, "reasoning": "clear medical terminology"}'
    )
    llm = AsyncMock()
    llm.complete = AsyncMock(return_value=fake_response)

    validator = LLMSpeakerValidator(llm)
    result = await validator.validate_roles(_make_state(), "Doctor: ¿Qué le duele?")

    assert result.speakers["SPEAKER_0"] == SpeakerRole.DOCTOR
    assert result.speakers["SPEAKER_1"] == SpeakerRole.PATIENT
    assert result.confidence == 0.9
    assert result.method == "llm"


@pytest.mark.asyncio
async def test_validate_roles_handles_string_response():
    """Response can be a plain string (not an object with .content)."""
    json_str = '{"speakers": {"SPEAKER_0": "patient"}, "confidence": 0.7}'
    llm = AsyncMock()
    llm.complete = AsyncMock(return_value=json_str)

    validator = LLMSpeakerValidator(llm)
    result = await validator.validate_roles(_make_state(), "transcript")

    assert result.speakers["SPEAKER_0"] == SpeakerRole.PATIENT


@pytest.mark.asyncio
async def test_validate_roles_falls_back_on_exception():
    llm = AsyncMock()
    llm.complete = AsyncMock(side_effect=RuntimeError("LLM down"))

    validator = LLMSpeakerValidator(llm)
    result = await validator.validate_roles(_make_state(), "transcript")

    assert result.method == "llm_validation_failed"
    assert result.confidence == 0.5


@pytest.mark.asyncio
async def test_validate_roles_with_context():
    fake_response = SimpleNamespace(
        content='{"speakers": {"SPEAKER_0": "doctor"}, "confidence": 0.85}'
    )
    llm = AsyncMock()
    llm.complete = AsyncMock(return_value=fake_response)

    context = ConsultationContext(
        appointment_type="cardiología",
        expected_speakers=2,
    )

    validator = LLMSpeakerValidator(llm)
    result = await validator.validate_roles(_make_state(), "transcript", context)

    assert result.speakers["SPEAKER_0"] == SpeakerRole.DOCTOR
    # Verify context was included in prompt
    call_args = llm.complete.await_args
    prompt = call_args.kwargs["prompt"]
    assert "cardiología" in prompt


@pytest.mark.asyncio
async def test_parse_response_handles_invalid_json():
    """If LLM returns garbage, fall back to default assignment."""
    llm = AsyncMock()
    llm.complete = AsyncMock(return_value=SimpleNamespace(content="not json at all"))

    validator = LLMSpeakerValidator(llm)
    result = await validator.validate_roles(_make_state(), "transcript")

    assert result.method == "llm_parse_error"
    assert result.confidence == 0.5
    assert result.speakers["SPEAKER_0"] == SpeakerRole.DOCTOR


@pytest.mark.asyncio
async def test_parse_response_with_unknown_role():
    fake_response = SimpleNamespace(
        content='{"speakers": {"SPEAKER_0": "alien"}, "confidence": 0.6}'
    )
    llm = AsyncMock()
    llm.complete = AsyncMock(return_value=fake_response)

    validator = LLMSpeakerValidator(llm)
    result = await validator.validate_roles(_make_state(), "transcript")

    assert result.speakers["SPEAKER_0"] == SpeakerRole.OTHER
