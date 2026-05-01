"""Unit tests for src/rag/embeddings.py."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.rag.embeddings import EmbeddingsService


def _make_response(embeddings, total_tokens=10):
    data = [SimpleNamespace(embedding=e) for e in embeddings]
    usage = SimpleNamespace(total_tokens=total_tokens)
    return SimpleNamespace(data=data, usage=usage)


@pytest.fixture
def service():
    with patch("src.rag.embeddings.OpenAI"), patch("src.rag.embeddings.AsyncOpenAI"):
        return EmbeddingsService()


def test_generate_single_text(service):
    fake_response = _make_response([[0.1, 0.2, 0.3]], total_tokens=5)
    service.client = MagicMock()
    service.client.embeddings.create = MagicMock(return_value=fake_response)

    result = service.generate("hello")
    assert result == [[0.1, 0.2, 0.3]]
    service.client.embeddings.create.assert_called_once()


def test_generate_multiple_texts(service):
    fake_response = _make_response([[0.1] * 3, [0.2] * 3], total_tokens=10)
    service.client = MagicMock()
    service.client.embeddings.create = MagicMock(return_value=fake_response)

    result = service.generate(["text1", "text2"])
    assert len(result) == 2


def test_generate_batches_when_over_batch_size(service):
    service.batch_size = 2
    response_a = _make_response([[0.1] * 3, [0.2] * 3])
    response_b = _make_response([[0.3] * 3])
    service.client = MagicMock()
    service.client.embeddings.create = MagicMock(side_effect=[response_a, response_b])

    result = service.generate(["a", "b", "c"])
    assert len(result) == 3
    assert service.client.embeddings.create.call_count == 2


def test_generate_query_embedding(service):
    fake_response = _make_response([[0.5, 0.5, 0.5]])
    service.client = MagicMock()
    service.client.embeddings.create = MagicMock(return_value=fake_response)

    result = service.generate_query_embedding("a query")
    assert result == [0.5, 0.5, 0.5]


@pytest.mark.asyncio
async def test_generate_query_embedding_async(service):
    fake_response = _make_response([[0.7, 0.8, 0.9]], total_tokens=3)
    service.async_client = MagicMock()
    service.async_client.embeddings.create = AsyncMock(return_value=fake_response)

    result = await service.generate_query_embedding_async("query")
    assert result == [0.7, 0.8, 0.9]


@pytest.mark.asyncio
async def test_close_async(service):
    service.async_client = MagicMock()
    service.async_client.close = AsyncMock()

    await service.close_async()
    service.async_client.close.assert_awaited_once()
