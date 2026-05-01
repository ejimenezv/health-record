"""Unit tests for src/api/dependencies.py service container."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.api import dependencies as deps


@pytest.fixture(autouse=True)
def _reset_services():
    """Ensure each test starts with a fresh singleton."""
    deps._services = None
    yield
    deps._services = None


@pytest.mark.asyncio
async def test_get_services_creates_singleton():
    fake_redis = MagicMock()
    fake_redis.close = AsyncMock()

    with patch.object(deps.redis, "from_url", new=AsyncMock(return_value=fake_redis)), \
         patch.object(deps, "ResponseCache") as mock_cache_cls, \
         patch.object(deps, "RetrieverService") as mock_retriever_cls, \
         patch.object(deps, "EmbeddingsService") as mock_embeddings_cls:
        mock_cache_cls.return_value = MagicMock()
        mock_retriever_cls.return_value = MagicMock()
        mock_embeddings_cls.return_value = MagicMock()

        services_a = await deps.get_services()
        services_b = await deps.get_services()

    assert services_a is services_b
    assert services_a.redis is fake_redis
    assert services_a.cache is mock_cache_cls.return_value
    assert services_a.rag_retriever is mock_retriever_cls.return_value


@pytest.mark.asyncio
async def test_cleanup_services_closes_redis_and_clears_singleton():
    fake_redis = MagicMock()
    fake_redis.close = AsyncMock()

    with patch.object(deps.redis, "from_url", new=AsyncMock(return_value=fake_redis)), \
         patch.object(deps, "ResponseCache"), \
         patch.object(deps, "RetrieverService"), \
         patch.object(deps, "EmbeddingsService"):
        await deps.get_services()

    await deps.cleanup_services()

    fake_redis.close.assert_awaited_once()
    assert deps._services is None


@pytest.mark.asyncio
async def test_cleanup_services_no_op_when_not_initialized():
    await deps.cleanup_services()
    assert deps._services is None
