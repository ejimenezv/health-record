"""Unit tests for src/core/health.py."""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.core.health import (
    ComponentHealth,
    HealthChecker,
    HealthStatus,
    setup_health_checks,
)


@pytest.fixture
def checker():
    return HealthChecker()


@pytest.mark.asyncio
async def test_check_all_with_no_components(checker):
    result = await checker.check_all()
    assert result.status == HealthStatus.HEALTHY
    assert result.components == []


@pytest.mark.asyncio
async def test_check_all_with_healthy_component(checker):
    async def healthy_check():
        return ComponentHealth(name="db", status=HealthStatus.HEALTHY)

    checker.register_check("db", healthy_check)
    result = await checker.check_all()

    assert result.status == HealthStatus.HEALTHY
    assert len(result.components) == 1
    assert result.components[0].name == "db"


@pytest.mark.asyncio
async def test_check_all_with_degraded_component(checker):
    async def degraded_check():
        return ComponentHealth(name="cache", status=HealthStatus.DEGRADED)

    checker.register_check("cache", degraded_check)
    result = await checker.check_all()
    assert result.status == HealthStatus.DEGRADED


@pytest.mark.asyncio
async def test_check_all_with_unhealthy_component(checker):
    async def unhealthy_check():
        return ComponentHealth(name="api", status=HealthStatus.UNHEALTHY)

    async def healthy_check():
        return ComponentHealth(name="db", status=HealthStatus.HEALTHY)

    checker.register_check("api", unhealthy_check)
    checker.register_check("db", healthy_check)
    result = await checker.check_all()
    assert result.status == HealthStatus.UNHEALTHY


@pytest.mark.asyncio
async def test_check_all_handles_exception(checker):
    async def failing_check():
        raise RuntimeError("boom")

    checker.register_check("bad", failing_check)
    result = await checker.check_all()

    assert result.status == HealthStatus.UNHEALTHY
    assert any("boom" in (c.message or "") for c in result.components)


@pytest.mark.asyncio
async def test_check_returning_truthy_value(checker):
    async def truthy():
        return True

    async def falsy():
        return False

    checker.register_check("truthy", truthy)
    checker.register_check("falsy", falsy)
    result = await checker.check_all()
    statuses = {c.name: c.status for c in result.components}
    assert statuses["truthy"] == HealthStatus.HEALTHY
    assert statuses["falsy"] == HealthStatus.UNHEALTHY


@pytest.mark.asyncio
async def test_check_openai_healthy(checker):
    fake_response = MagicMock(status_code=200)
    fake_client = MagicMock()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    fake_client.get = AsyncMock(return_value=fake_response)

    with patch.object(httpx, "AsyncClient", return_value=fake_client):
        result = await checker.check_openai()

    assert result.status == HealthStatus.HEALTHY


@pytest.mark.asyncio
async def test_check_openai_degraded(checker):
    fake_response = MagicMock(status_code=500)
    fake_client = MagicMock()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    fake_client.get = AsyncMock(return_value=fake_response)

    with patch.object(httpx, "AsyncClient", return_value=fake_client):
        result = await checker.check_openai()

    assert result.status == HealthStatus.DEGRADED


@pytest.mark.asyncio
async def test_check_openai_unhealthy_on_exception(checker):
    fake_client = MagicMock()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    fake_client.get = AsyncMock(side_effect=Exception("network"))

    with patch.object(httpx, "AsyncClient", return_value=fake_client):
        result = await checker.check_openai()

    assert result.status == HealthStatus.UNHEALTHY
    assert "network" in (result.message or "")


@pytest.mark.asyncio
async def test_check_vector_store_healthy(checker):
    fake_response = MagicMock(status_code=200)
    fake_client = MagicMock()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    fake_client.get = AsyncMock(return_value=fake_response)

    with patch.object(httpx, "AsyncClient", return_value=fake_client):
        result = await checker.check_vector_store()

    assert result.status == HealthStatus.HEALTHY


@pytest.mark.asyncio
async def test_check_vector_store_unhealthy_on_exception(checker):
    fake_client = MagicMock()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    fake_client.get = AsyncMock(side_effect=Exception("connection refused"))

    with patch.object(httpx, "AsyncClient", return_value=fake_client):
        result = await checker.check_vector_store()

    assert result.status == HealthStatus.UNHEALTHY


def test_setup_health_checks_idempotent():
    setup_health_checks()
    setup_health_checks()  # second call should not duplicate
    from src.core.health import health_checker
    assert "openai_api" in health_checker._checks
    assert "vector_store" in health_checker._checks
