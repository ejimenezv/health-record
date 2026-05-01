"""
Integration test configuration and fixtures.

Adapted to the actual AI service architecture:
- Session storage is Redis-backed (not SQLAlchemy). FakeRedis fixture stubs it.
- Auth is JWT-only via src.security.auth.create_token (no /auth/token endpoint).
- WebSocket lives on the Python service at /ws/session (not via Node gateway).
"""
from __future__ import annotations

import json
import struct
import wave
from typing import AsyncIterator, Generator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api import routes as routes_mod
from src.api.routes import router as api_router
from src.security import auth


class FakeRedis:
    """Minimal in-memory Redis stub for the methods routes.py uses."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self.store[key] = value

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self.store:
                del self.store[key]
                deleted += 1
        return deleted

    async def scan(self, cursor: int, match: str | None = None, count: int = 100):
        # Simple, single-pass scan — returns cursor=0 to signal done.
        keys = list(self.store.keys())
        if match:
            import fnmatch
            keys = [k for k in keys if fnmatch.fnmatch(k, match)]
        return 0, keys


@pytest.fixture
def fake_redis() -> FakeRedis:
    return FakeRedis()


@pytest.fixture
def app(fake_redis: FakeRedis, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    """Build a fresh FastAPI app with the API router and a stubbed Redis."""
    # Reset module-level singletons so each test starts clean
    routes_mod._redis_client = fake_redis  # type: ignore[assignment]
    routes_mod._orchestrator = None
    routes_mod._ingestion_pipeline = None

    async def _get_redis_client():
        return fake_redis

    monkeypatch.setattr(routes_mod, "get_redis_client", _get_redis_client)

    application = FastAPI()
    application.state.limiter = routes_mod.limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    application.include_router(api_router, prefix="/api/v1")

    yield application

    routes_mod._redis_client = None
    routes_mod._orchestrator = None
    routes_mod._ingestion_pipeline = None


@pytest.fixture
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture
async def async_client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_token() -> str:
    """JWT for a regular doctor user."""
    return auth.create_token({"sub": "test-doctor", "role": "doctor"})


@pytest.fixture
def admin_token() -> str:
    """JWT for an admin user."""
    return auth.create_token({"sub": "test-admin", "role": "admin"})


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_audio_file(tmp_path) -> str:
    """5 seconds of silent 16kHz mono WAV."""
    audio_path = tmp_path / "test_audio.wav"
    with wave.open(str(audio_path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        for _ in range(16000 * 5):
            wav.writeframes(struct.pack("h", 0))
    return str(audio_path)


@pytest.fixture
def sample_audio_bytes(sample_audio_file: str) -> bytes:
    with open(sample_audio_file, "rb") as f:
        return f.read()


@pytest.fixture
def sample_document_content() -> str:
    return """
    # Ibuprofeno

    ## Descripción
    Ibuprofeno es un antiinflamatorio no esteroideo (AINE) utilizado para
    el tratamiento del dolor leve a moderado.

    ## Dosis
    - Adultos: 400-800mg cada 6-8 horas
    - Dosis máxima: 3200mg/día

    ## Contraindicaciones
    - Úlcera péptica activa
    - Insuficiencia renal severa
    - Alergia conocida a AINEs
    - Tercer trimestre del embarazo
    """


@pytest.fixture
def created_session(client: TestClient, auth_headers: dict[str, str]) -> dict:
    """Create a session and return the unwrapped session payload."""
    resp = client.post("/api/v1/sessions", json={"patient_id": "patient-test"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["session"]
