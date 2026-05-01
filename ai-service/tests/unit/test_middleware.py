"""Unit tests for logging and metrics HTTP middleware."""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.api.middleware.logging import LoggingMiddleware
from src.api.middleware.metrics import MetricsMiddleware


@pytest.fixture
def app_with_middleware():
    app = FastAPI()
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(LoggingMiddleware)

    @app.get("/ping")
    async def ping():
        return {"ok": True}

    @app.get("/items/{item_id}")
    async def items(item_id: str):
        return {"id": item_id}

    @app.get("/boom")
    async def boom():
        raise HTTPException(status_code=500, detail="kaboom")

    return app


@pytest.fixture
def client(app_with_middleware):
    return TestClient(app_with_middleware, raise_server_exceptions=False)


class TestLoggingMiddleware:
    def test_request_id_generated_when_absent(self, client):
        response = client.get("/ping")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0

    def test_request_id_propagated_when_provided(self, client):
        response = client.get("/ping", headers={"X-Request-ID": "abc-123"})
        assert response.headers["X-Request-ID"] == "abc-123"

    def test_logging_handles_exceptions(self, client):
        response = client.get("/boom")
        assert response.status_code == 500


class TestMetricsMiddleware:
    def test_metrics_recorded_for_success(self, client):
        response = client.get("/ping")
        assert response.status_code == 200

    def test_path_normalization_for_numeric_id(self, app_with_middleware):
        mw = MetricsMiddleware(app_with_middleware)
        normalized = mw._normalize_path("/items/12345")
        assert normalized == "/items/{id}"

    def test_path_normalization_for_uuid(self, app_with_middleware):
        mw = MetricsMiddleware(app_with_middleware)
        normalized = mw._normalize_path("/items/550e8400-e29b-41d4-a716-446655440000")
        assert normalized == "/items/{id}"

    def test_path_normalization_keeps_text_segments(self, app_with_middleware):
        mw = MetricsMiddleware(app_with_middleware)
        normalized = mw._normalize_path("/api/v1/sessions")
        assert normalized == "/api/v1/sessions"

    def test_is_id_helpers(self):
        assert MetricsMiddleware._is_id("12345")
        assert MetricsMiddleware._is_id("550e8400-e29b-41d4-a716-446655440000")
        assert not MetricsMiddleware._is_id("sessions")
        assert not MetricsMiddleware._is_id("")
