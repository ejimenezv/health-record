"""Unit tests for src/api/main.py FastAPI app wiring."""
import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert "service" in body
    assert "version" in body
    assert body["docs"] == "/docs"


def test_openapi_schema_available(client):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()


def test_websocket_route_registered():
    paths = [getattr(r, "path", None) for r in app.routes]
    assert "/ws/session" in paths


def test_health_route_registered():
    paths = [getattr(r, "path", None) for r in app.routes]
    assert "/health" in paths
    assert "/health/live" in paths


def test_lifespan_runs_startup_and_shutdown():
    """The lifespan context manager logs and runs without raising."""
    with TestClient(app) as c:
        response = c.get("/")
        assert response.status_code == 200


def test_global_exception_handler_returns_500():
    """An unhandled exception in a route should be caught and return JSON 500."""
    @app.get("/_test_boom")
    async def _boom():
        raise RuntimeError("kaboom")

    # raise_server_exceptions=False lets the registered handler convert it to 500
    with TestClient(app, raise_server_exceptions=False) as c:
        response = c.get("/_test_boom")

    assert response.status_code == 500
    body = response.json()
    assert body["detail"] == "Internal server error"
    assert body["error_type"] == "RuntimeError"
