"""Unit tests for health, liveness, readiness, and metrics endpoints."""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.endpoints.health import router
from src.core.health import ComponentHealth, HealthStatus, SystemHealth


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _system_health(status: HealthStatus) -> SystemHealth:
    return SystemHealth(
        status=status,
        components=[
            ComponentHealth(
                name="openai_api",
                status=status,
                latency_ms=12.34,
                message="ok",
                details={"foo": "bar"},
            )
        ],
        version="0.1.0",
        uptime_seconds=42.5,
    )


class TestHealthEndpoints:
    def test_liveness_probe(self, client):
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "alive"}

    def test_health_check_healthy(self, client):
        with patch(
            "src.api.endpoints.health.health_checker.check_all",
            new=AsyncMock(return_value=_system_health(HealthStatus.HEALTHY)),
        ):
            response = client.get("/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert body["version"] == "0.1.0"
        assert body["components"][0]["name"] == "openai_api"
        assert body["components"][0]["latency_ms"] == 12.34

    def test_readiness_probe_ready(self, client):
        with patch(
            "src.api.endpoints.health.health_checker.check_all",
            new=AsyncMock(return_value=_system_health(HealthStatus.HEALTHY)),
        ):
            response = client.get("/health/ready")

        assert response.status_code == 200
        assert response.json() == {"status": "ready"}

    def test_readiness_probe_not_ready_when_unhealthy(self, client):
        with patch(
            "src.api.endpoints.health.health_checker.check_all",
            new=AsyncMock(return_value=_system_health(HealthStatus.UNHEALTHY)),
        ):
            response = client.get("/health/ready")

        assert response.status_code == 503
        assert response.json()["status"] == "not_ready"


class TestMetricsEndpoints:
    def test_get_metrics(self, client):
        response = client.get("/metrics")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

    def test_get_cost_metrics(self, client):
        response = client.get("/metrics/costs")
        assert response.status_code == 200
        body = response.json()
        for key in ("total_cost_usd", "total_tokens", "transcription", "extraction", "rag"):
            assert key in body
