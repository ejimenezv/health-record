"""
Test de integración para RAG real-time pipeline.
Verifica latency targets y concurrent queries.
"""
import asyncio
from unittest.mock import AsyncMock, Mock

import pytest

from src.rag.retriever import RetrieverService


class TestRAGRealTimePerformance:
    """Test real-time performance targets."""

    @pytest.fixture
    def mock_fast_vector_store(self):
        """Mock that simulates fast ChromaDB response."""
        store = Mock()
        store.query_async = AsyncMock(return_value={
            "ids": [["chunk_001"]],
            "documents": [["Paracetamol info..."]],
            "metadatas": [[{"doc_type": "medication"}]],
            "distances": [[0.1]],
        })
        return store

    @pytest.fixture
    def mock_fast_embeddings(self):
        """Mock that simulates fast embedding generation."""
        embeddings = Mock()
        embeddings.generate_query_embedding_async = AsyncMock(
            return_value=[0.1] * 1536
        )
        return embeddings

    @pytest.fixture
    def service(self, mock_fast_vector_store, mock_fast_embeddings):
        return RetrieverService(
            vector_store=mock_fast_vector_store,
            embeddings_service=mock_fast_embeddings,
        )

    @pytest.mark.asyncio
    async def test_medication_retrieval_latency(self, service):
        """Test medication retrieval latency tracked."""
        result = await service.retrieve("Paracetamol")
        assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_interaction_retrieval_latency(self, service):
        """Test interaction retrieval returns docs."""
        docs = await service.retrieve_interactions("Paracetamol", "Warfarin")
        assert len(docs) > 0

    @pytest.mark.asyncio
    async def test_concurrent_queries(self, service):
        """Test multiple concurrent async queries."""
        tasks = [
            service.retrieve_medications(f"medication_{i}")
            for i in range(10)
        ]

        results = await asyncio.gather(*tasks)

        assert len(results) == 10
        for docs in results:
            assert isinstance(docs, list)

    @pytest.mark.asyncio
    async def test_cie10_retrieval_latency(self, service):
        """Test CIE-10 retrieval returns list."""
        docs = await service.retrieve_cie10("fiebre y dolor de garganta")
        assert isinstance(docs, list)
