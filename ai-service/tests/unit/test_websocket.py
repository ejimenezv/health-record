"""Unit tests for the WebSocket connection manager and authentication."""
from unittest.mock import AsyncMock

import pytest
from jose import jwt

from src.api.websocket.manager import ConnectionManager
from src.core.config import get_settings
from src.security.websocket_auth import verify_websocket_token


class TestConnectionManager:
    """Tests for the WebSocket connection manager."""

    @pytest.fixture
    def manager(self):
        return ConnectionManager()

    @pytest.mark.asyncio
    async def test_connect_new_session(self, manager):
        mock_ws = AsyncMock()

        result = await manager.connect(mock_ws, "session_1", "user_1")

        assert result is True
        assert manager.is_connected("session_1")
        mock_ws.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_duplicate_session(self, manager):
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()

        await manager.connect(mock_ws1, "session_1", "user_1")
        result = await manager.connect(mock_ws2, "session_1", "user_2")

        assert result is False

    @pytest.mark.asyncio
    async def test_disconnect(self, manager):
        mock_ws = AsyncMock()
        await manager.connect(mock_ws, "session_1", "user_1")

        await manager.disconnect("session_1")

        assert not manager.is_connected("session_1")

    @pytest.mark.asyncio
    async def test_send_json(self, manager):
        mock_ws = AsyncMock()
        await manager.connect(mock_ws, "session_1", "user_1")

        await manager.send_json("session_1", {"type": "test"})

        mock_ws.send_json.assert_called_once_with({"type": "test"})

    @pytest.mark.asyncio
    async def test_send_json_handles_failure(self, manager):
        mock_ws = AsyncMock()
        mock_ws.send_json.side_effect = RuntimeError("connection closed")
        await manager.connect(mock_ws, "session_1", "user_1")

        await manager.send_json("session_1", {"type": "test"})

        assert not manager.is_connected("session_1")

    @pytest.mark.asyncio
    async def test_get_session_stats(self, manager):
        mock_ws = AsyncMock()
        await manager.connect(mock_ws, "session_1", "user_1")

        stats = manager.get_session_stats("session_1")

        assert stats is not None
        assert stats["user_id"] == "user_1"
        assert stats["chunks_received"] == 0


class TestWebSocketAuth:
    """Tests for the WebSocket JWT verification."""

    @pytest.mark.asyncio
    async def test_verify_valid_token(self):
        settings = get_settings()
        token = jwt.encode(
            {"sub": "user_1", "username": "alice", "roles": ["doctor"]},
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )

        token_data = await verify_websocket_token(token)

        assert token_data.user_id == "user_1"
        assert token_data.username == "alice"
        assert token_data.roles == ["doctor"]

    @pytest.mark.asyncio
    async def test_verify_invalid_token_raises(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException):
            await verify_websocket_token("not-a-valid-token")
