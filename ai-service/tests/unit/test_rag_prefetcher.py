"""Unit tests for src/rag/prefetcher.py."""
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.rag.prefetcher import RAGPrefetcher


def _make_doc(content="content", metadata=None, similarity=0.9):
    doc = MagicMock()
    doc.content = content
    doc.metadata = metadata or {}
    doc.similarity_score = similarity
    return doc


@pytest.fixture
def retriever():
    r = MagicMock()
    r.retrieve_medications = AsyncMock(return_value=[_make_doc()])
    return r


@pytest.fixture
def prefetcher(retriever):
    p = RAGPrefetcher(retriever)
    # Limit to 2 medications to keep tests fast
    p.COMMON_MEDICATIONS = ["Paracetamol", "Ibuprofeno"]
    return p


@pytest.mark.asyncio
async def test_prefetch_populates_cache(prefetcher, retriever):
    await prefetcher._prefetch_common_knowledge()

    assert prefetcher.prefetch_complete is True
    assert prefetcher.cache_size == 2
    assert prefetcher.is_prefetched("paracetamol")
    assert prefetcher.is_prefetched("Ibuprofeno")
    assert retriever.retrieve_medications.await_count == 2


@pytest.mark.asyncio
async def test_get_prefetched_medication(prefetcher):
    await prefetcher._prefetch_common_knowledge()

    data = prefetcher.get_prefetched_medication("PARACETAMOL")
    assert data is not None
    assert data["content"] == "content"
    assert "similarity" in data


@pytest.mark.asyncio
async def test_unknown_medication_returns_none(prefetcher):
    await prefetcher._prefetch_common_knowledge()
    assert prefetcher.get_prefetched_medication("Aspirin") is None
    assert not prefetcher.is_prefetched("Aspirin")


@pytest.mark.asyncio
async def test_prefetch_handles_retriever_failure():
    retriever = MagicMock()
    retriever.retrieve_medications = AsyncMock(side_effect=RuntimeError("network"))
    p = RAGPrefetcher(retriever)
    p.COMMON_MEDICATIONS = ["Paracetamol"]

    await p._prefetch_common_knowledge()

    assert p.prefetch_complete is True
    assert p.cache_size == 0


@pytest.mark.asyncio
async def test_start_prefetch_skips_when_already_running(prefetcher):
    await prefetcher.start_prefetch()
    first_task = prefetcher._prefetch_task

    await prefetcher.start_prefetch()
    # Should be the same task object (not started a new one)
    assert prefetcher._prefetch_task is first_task

    await first_task
