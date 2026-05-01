"""WebSocket connection manager for transcription sessions."""
from typing import Dict, Optional, Set
from fastapi import WebSocket
import structlog
import asyncio
from datetime import datetime

logger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections for transcription sessions."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
    ) -> bool:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()

        async with self._lock:
            if session_id in self.active_connections:
                logger.warning(
                    "Session already has active connection",
                    session_id=session_id,
                )
                return False

            self.active_connections[session_id] = websocket
            self.session_data[session_id] = {
                "user_id": user_id,
                "connected_at": datetime.utcnow(),
                "chunks_received": 0,
                "total_audio_ms": 0,
            }

            logger.info(
                "WebSocket connected",
                session_id=session_id,
                user_id=user_id,
            )
            return True

    async def disconnect(self, session_id: str):
        """Remove a WebSocket connection."""
        async with self._lock:
            if session_id in self.active_connections:
                del self.active_connections[session_id]
                del self.session_data[session_id]
                logger.info("WebSocket disconnected", session_id=session_id)

    async def send_json(self, session_id: str, data: dict):
        """Send JSON data to a specific session."""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(data)
            except Exception as e:
                logger.error(
                    "Failed to send WebSocket message",
                    session_id=session_id,
                    error=str(e),
                )
                await self.disconnect(session_id)

    async def broadcast(self, data: dict, exclude: Optional[Set[str]] = None):
        """Broadcast message to all connected sessions."""
        exclude = exclude or set()
        for session_id in list(self.active_connections.keys()):
            if session_id not in exclude:
                await self.send_json(session_id, data)

    def is_connected(self, session_id: str) -> bool:
        """Check if session has active connection."""
        return session_id in self.active_connections

    def get_session_stats(self, session_id: str) -> Optional[dict]:
        """Get statistics for a session."""
        return self.session_data.get(session_id)


connection_manager = ConnectionManager()
