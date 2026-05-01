"""Unit tests for src/api/websocket/streaming.py helpers and auth flow."""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from starlette.websockets import WebSocketDisconnect

from src.api.websocket import streaming
from src.api.websocket.streaming import (
    _safe_call,
    _to_dict,
    finalize_session,
    process_audio_chunk,
    router,
)
from src.core.config import get_settings


def _make_token(payload: dict) -> str:
    settings = get_settings()
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestHelpers:
    def test_to_dict_returns_none_for_none(self):
        assert _to_dict(None) is None

    def test_to_dict_uses_pydantic_dict_method(self):
        obj = MagicMock()
        obj.dict.return_value = {"a": 1}
        assert _to_dict(obj) == {"a": 1}

    def test_to_dict_falls_back_to_dunder_dict(self):
        class Plain:
            def __init__(self):
                self.x = 1
                self._private = "hidden"

        result = _to_dict(Plain())
        assert result == {"x": 1}

    def test_to_dict_passthrough_for_primitives(self):
        assert _to_dict(42) == 42
        assert _to_dict("foo") == "foo"

    def test_safe_call_returns_none_for_missing_method(self):
        assert _safe_call(object(), "nonexistent") is None

    def test_safe_call_returns_method_result(self):
        obj = MagicMock()
        obj.do_thing.return_value = "result"
        assert _safe_call(obj, "do_thing") == "result"

    def test_safe_call_swallows_exceptions(self):
        obj = MagicMock()
        obj.do_thing.side_effect = RuntimeError("boom")
        assert _safe_call(obj, "do_thing") is None


class TestAuthFlow:
    def test_invalid_token_closes_connection(self, client):
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect(
                "/ws/session?session_id=s1&token=bad-token"
            ) as ws:
                ws.receive_text()
        assert exc_info.value.code == 4001


@pytest.mark.asyncio
class TestProcessAudioChunk:
    async def test_calls_stream_processor(self, monkeypatch):
        send_json_mock = AsyncMock()
        monkeypatch.setattr(streaming.connection_manager, "send_json", send_json_mock)

        stream_processor = MagicMock()
        stream_processor.process_audio_chunk = AsyncMock()

        await process_audio_chunk(
            session_id="s1",
            audio_data=b"audio",
            chunk_index=0,
            stream_processor=stream_processor,
            diarizer=MagicMock(),
            extractor=MagicMock(),
            validation_coordinator=MagicMock(),
        )

        stream_processor.process_audio_chunk.assert_awaited_once()

    async def test_emits_cost_update_every_5_chunks(self, monkeypatch):
        send_json_mock = AsyncMock()
        monkeypatch.setattr(streaming.connection_manager, "send_json", send_json_mock)

        cost_summary = MagicMock(
            transcription_cost=0.01,
            extraction_cost=0.02,
            validation_cost=0.03,
            total_cost=0.06,
            audio_duration_seconds=10.0,
        )
        stream_processor = MagicMock()
        stream_processor.process_audio_chunk = AsyncMock()
        stream_processor.get_cost_summary = MagicMock(return_value=cost_summary)

        await process_audio_chunk(
            session_id="s1",
            audio_data=b"a",
            chunk_index=5,
            stream_processor=stream_processor,
            diarizer=MagicMock(),
            extractor=MagicMock(),
            validation_coordinator=MagicMock(),
        )

        cost_calls = [
            c for c in send_json_mock.await_args_list
            if c.args[1].get("type") == "cost_update"
        ]
        assert len(cost_calls) == 1
        assert cost_calls[0].args[1]["total_cost_usd"] == 0.06

    async def test_emits_error_event_on_failure(self, monkeypatch):
        send_json_mock = AsyncMock()
        monkeypatch.setattr(streaming.connection_manager, "send_json", send_json_mock)

        stream_processor = MagicMock()
        stream_processor.process_audio_chunk = AsyncMock(side_effect=RuntimeError("fail"))

        await process_audio_chunk(
            session_id="s1",
            audio_data=b"a",
            chunk_index=0,
            stream_processor=stream_processor,
            diarizer=MagicMock(),
            extractor=MagicMock(),
            validation_coordinator=MagicMock(),
        )

        error_calls = [
            c for c in send_json_mock.await_args_list
            if c.args[1].get("type") == "error"
        ]
        assert len(error_calls) == 1


@pytest.mark.asyncio
class TestFinalizeSession:
    async def test_aggregates_state_from_all_services(self):
        stream_processor = MagicMock()
        stream_processor.finalize = AsyncMock()

        diarizer = MagicMock()
        speaker_state = MagicMock()
        speaker_state.dict.return_value = {"speakers": {}}
        diarizer.finalize_session = AsyncMock(return_value=speaker_state)

        extractor = MagicMock()
        extractor.get_session_summary = MagicMock(return_value={"medications": []})

        validation_coordinator = MagicMock()
        validation_summary = MagicMock()
        validation_summary.dict.return_value = {"total_validations": 0}
        validation_coordinator.get_session_summary = AsyncMock(return_value=validation_summary)

        result = await finalize_session(
            session_id="s1",
            stream_processor=stream_processor,
            diarizer=diarizer,
            extractor=extractor,
            validation_coordinator=validation_coordinator,
        )

        assert result["session_id"] == "s1"
        assert result["speaker_state"] == {"speakers": {}}
        assert result["extraction"] == {"medications": []}
        assert result["validation_summary"] == {"total_validations": 0}

    async def test_swallows_service_failures(self):
        stream_processor = MagicMock()
        stream_processor.finalize = AsyncMock(side_effect=RuntimeError("fail"))
        diarizer = MagicMock()
        diarizer.finalize_session = AsyncMock(side_effect=RuntimeError("fail"))
        extractor = MagicMock()
        extractor.get_session_summary = MagicMock(side_effect=RuntimeError("fail"))
        validation_coordinator = MagicMock()
        validation_coordinator.get_session_summary = AsyncMock(side_effect=RuntimeError("fail"))

        result = await finalize_session(
            session_id="s1",
            stream_processor=stream_processor,
            diarizer=diarizer,
            extractor=extractor,
            validation_coordinator=validation_coordinator,
        )

        assert result["session_id"] == "s1"
        assert result["speaker_state"] is None
        assert result["extraction"] is None
        assert result["validation_summary"] is None


def test_import_pipeline_services_returns_classes():
    services = streaming._import_pipeline_services()
    expected = {
        "StreamProcessor",
        "IncrementalDiarizer",
        "SpeakerChangeEvent",
        "IncrementalExtractor",
        "RAGValidationCoordinator",
        "ValidationEvent",
    }
    assert expected.issubset(services.keys())
