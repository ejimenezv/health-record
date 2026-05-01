"""
Integration tests for the real-time WebSocket streaming endpoint.

These tests focus on what we can validate without spinning up the full
pipeline (StreamProcessor, IncrementalDiarizer, IncrementalExtractor,
RAGValidationCoordinator) — namely:

  * authentication on the WebSocket handshake
  * the connection manager's session-ID uniqueness contract
  * graceful disconnect handling

Tests that exercise the full audio -> transcript -> extraction -> validation
event flow are marked as `realtime_e2e` and skipped by default; they require
a running AI service container with the pipeline and Redis available, and
should be run via `pytest -m realtime_e2e` against a live deployment.
"""
from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from src.api.websocket.manager import connection_manager
from src.api.websocket.streaming import router as ws_router
from src.security import auth


@pytest.fixture
def ws_app(app: FastAPI) -> FastAPI:
    """Mount the WebSocket router on top of the API app."""
    app.include_router(ws_router)
    yield app
    # Drain any leftover state from the singleton connection manager so tests
    # don't poison each other.
    connection_manager.active_connections.clear()
    connection_manager.session_data.clear()


@pytest.fixture
def ws_client(ws_app: FastAPI):
    with TestClient(ws_app) as client:
        yield client


class TestWebSocketAuthentication:
    def test_invalid_token_closes_connection(self, ws_client):
        with pytest.raises(WebSocketDisconnect) as exc:
            with ws_client.websocket_connect(
                "/ws/session?session_id=session_x&token=garbage"
            ) as ws:
                ws.receive_text()
        assert exc.value.code == 4001

    def test_missing_token_returns_handshake_error(self, ws_client):
        # FastAPI rejects the handshake before our handler runs because `token`
        # is a required query parameter — the client sees a connection failure.
        with pytest.raises(Exception):
            with ws_client.websocket_connect("/ws/session?session_id=session_x"):
                pass

    def test_token_signed_with_wrong_secret_rejected(self, ws_client):
        from jose import jwt
        from src.core.config import get_settings

        settings = get_settings()
        bad = jwt.encode({"sub": "u"}, "different-secret", algorithm=settings.jwt_algorithm)

        with pytest.raises(WebSocketDisconnect) as exc:
            with ws_client.websocket_connect(
                f"/ws/session?session_id=session_x&token={bad}"
            ) as ws:
                ws.receive_text()
        assert exc.value.code == 4001


class TestWebSocketConnectionLifecycle:
    """Exercises connection_manager directly to avoid pipeline dependencies."""

    @pytest.mark.asyncio
    async def test_connect_registers_session(self):
        from unittest.mock import AsyncMock, MagicMock

        ws = MagicMock()
        ws.accept = AsyncMock()

        ok = await connection_manager.connect(ws, "session_lifecycle_1", "user-a")
        assert ok is True
        assert "session_lifecycle_1" in connection_manager.active_connections

        await connection_manager.disconnect("session_lifecycle_1")
        assert "session_lifecycle_1" not in connection_manager.active_connections

    @pytest.mark.asyncio
    async def test_duplicate_session_rejected(self):
        from unittest.mock import AsyncMock, MagicMock

        ws1 = MagicMock(); ws1.accept = AsyncMock()
        ws2 = MagicMock(); ws2.accept = AsyncMock()

        first = await connection_manager.connect(ws1, "session_dup", "user-a")
        second = await connection_manager.connect(ws2, "session_dup", "user-b")

        assert first is True
        assert second is False

        await connection_manager.disconnect("session_dup")

    def test_is_connected_reports_status(self):
        from unittest.mock import MagicMock

        connection_manager.active_connections["session_isconn"] = MagicMock()
        assert connection_manager.is_connected("session_isconn") is True
        assert connection_manager.is_connected("nonexistent") is False
        del connection_manager.active_connections["session_isconn"]


class TestSessionIsolation:
    """Two sessions must not see each other's events."""

    @pytest.mark.asyncio
    async def test_send_json_only_reaches_target_session(self):
        from unittest.mock import AsyncMock, MagicMock

        ws_a = MagicMock(); ws_a.accept = AsyncMock(); ws_a.send_json = AsyncMock()
        ws_b = MagicMock(); ws_b.accept = AsyncMock(); ws_b.send_json = AsyncMock()

        await connection_manager.connect(ws_a, "session_iso_a", "user-a")
        await connection_manager.connect(ws_b, "session_iso_b", "user-b")

        await connection_manager.send_json("session_iso_a", {"type": "transcript_update"})

        ws_a.send_json.assert_awaited_once()
        ws_b.send_json.assert_not_called()

        await connection_manager.disconnect("session_iso_a")
        await connection_manager.disconnect("session_iso_b")


# ---------------------------------------------------------------------------
# End-to-end realtime tests against a live deployment.
# Skipped by default; run with: pytest -m realtime_e2e
# ---------------------------------------------------------------------------

@pytest.mark.realtime_e2e
@pytest.mark.skip(reason="Requires live ai-service container with full pipeline")
class TestRealtimeEventFlowE2E:
    """Full audio -> transcript -> extraction -> validation event flow.

    These tests document the expected event contract:

      transcript_update     {text, is_final, timestamp, chunk_index}
      speaker_changed       {new_speaker_role in {DOCTOR, PATIENT}, confidence}
      extraction_update     {entity_type in {SYMPTOM, DIAGNOSIS, MEDICATION,
                            PROCEDURE, ALLERGY}, entity, speaker_id}
      validation_alert      {severity in {CRITICAL, HIGH, MEDIUM, LOW}, ...}
      entity_validated      {entity_id, validation_status}
      cost_update           {operation, cost_usd, cumulative_cost_usd}
      session_complete      {total_duration_sec, total_cost_usd, ...}
      error                 {error_code, message}
    """

    def test_audio_chunk_produces_transcript_update(self):
        ...

    def test_speaker_change_emits_speaker_changed(self):
        ...

    def test_critical_alert_delivered_within_one_second(self):
        ...

    def test_session_complete_contains_summary(self):
        ...
