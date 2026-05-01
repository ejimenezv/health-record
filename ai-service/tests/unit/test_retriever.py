"""
Tests unitarios para el servicio de retrieval asíncrono.
"""
from unittest.mock import AsyncMock, Mock

import pytest

from src.rag.retriever import RetrievedDocument, RetrievalResult, RetrieverService


class TestRetrieverService:
    """Tests for async RetrieverService."""

    @pytest.fixture
    def mock_vector_store(self):
        store = Mock()
        store.query_async = AsyncMock(return_value={
            "ids": [["chunk_001", "chunk_002"]],
            "documents": [["Paracetamol 500mg...", "Ibuprofeno 400mg..."]],
            "metadatas": [[
                {"doc_type": "medication", "nombre_comercial": "Paracetamol"},
                {"doc_type": "medication", "nombre_comercial": "Ibuprofeno"},
            ]],
            "distances": [[0.15, 0.25]],
        })
        return store

    @pytest.fixture
    def mock_embeddings(self):
        embeddings = Mock()
        embeddings.generate_query_embedding_async = AsyncMock(
            return_value=[0.1] * 1536
        )
        return embeddings

    @pytest.fixture
    def mock_cache(self):
        cache = Mock()
        cache.get_medication_validation = AsyncMock(return_value=None)
        cache.set_medication_validation = AsyncMock(return_value=None)
        cache.get_drug_interaction = AsyncMock(return_value=None)
        cache.set_drug_interaction = AsyncMock(return_value=None)
        return cache

    @pytest.fixture
    def service(self, mock_vector_store, mock_embeddings, mock_cache):
        return RetrieverService(
            vector_store=mock_vector_store,
            embeddings_service=mock_embeddings,
            cache=mock_cache,
        )

    @pytest.mark.asyncio
    async def test_retrieve_returns_result(self, service):
        """Test basic async retrieval."""
        result = await service.retrieve("paracetamol dosificación")

        assert isinstance(result, RetrievalResult)
        assert len(result.documents) == 2
        assert result.documents[0].similarity_score == pytest.approx(0.85)
        assert result.latency_ms > 0

    @pytest.mark.asyncio
    async def test_retrieve_filters_by_threshold(self, service, mock_vector_store):
        """Test that low-similarity results are filtered."""
        mock_vector_store.query_async.return_value = {
            "ids": [["chunk_001", "chunk_002"]],
            "documents": [["doc1", "doc2"]],
            "metadatas": [[{"doc_type": "medication"}, {"doc_type": "medication"}]],
            "distances": [[0.3, 0.6]],
        }

        result = await service.retrieve("test query", similarity_threshold=0.6)

        assert len(result.documents) == 1
        assert result.documents[0].similarity_score == pytest.approx(0.7)

    @pytest.mark.asyncio
    async def test_retrieve_medications(self, service):
        """Test medication-specific async retrieval."""
        docs = await service.retrieve_medications("Paracetamol")

        assert len(docs) <= 3
        service.vector_store.query_async.assert_called_once()

        call_args = service.vector_store.query_async.call_args
        assert call_args.kwargs.get("where") == {"doc_type": "medication"}

    @pytest.mark.asyncio
    async def test_retrieve_interactions(self, service):
        """Test drug interaction async retrieval."""
        docs = await service.retrieve_interactions("Paracetamol", "Ibuprofeno")

        assert len(docs) <= 5
        service.vector_store.query_async.assert_called_once()

        call_args = service.embeddings.generate_query_embedding_async.call_args
        query = call_args.args[0]
        assert "Paracetamol" in query
        assert "Ibuprofeno" in query

    @pytest.mark.asyncio
    async def test_retrieve_cie10(self, service):
        """Test CIE-10 async retrieval."""
        docs = await service.retrieve_cie10("dolor de cabeza severo")

        assert len(docs) <= 5
        service.vector_store.query_async.assert_called_once()

        call_args = service.vector_store.query_async.call_args
        assert call_args.kwargs.get("where") == {"doc_type": "cie10_code"}

    @pytest.mark.asyncio
    async def test_latency_logged(self, service):
        """Test that retrieval latency is tracked."""
        result = await service.retrieve("test query")

        assert result.latency_ms > 0
        assert result.latency_ms < 5000

    def test_format_context(self, service):
        """Test context formatting for LLM."""
        docs = [
            RetrievedDocument(
                content="Paracetamol: analgésico",
                metadata={"doc_type": "medication"},
                similarity_score=0.9,
                chunk_id="c1",
            ),
        ]

        context = service.format_context(docs)

        assert "[Fuente 1]" in context
        assert "Paracetamol: analgésico" in context
        assert "0.90" in context

    def test_format_context_empty(self, service):
        """Test context formatting with no results."""
        context = service.format_context([])

        assert "No se encontró información relevante" in context
