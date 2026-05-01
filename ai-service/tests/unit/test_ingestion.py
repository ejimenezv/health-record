"""Unit tests for the document ingestion pipeline."""
from unittest.mock import Mock

import pytest

from src.rag.ingestion import Chunk, Document, DocumentChunker, IngestionPipeline


class TestDocument:
    def test_doc_id_generated_from_content(self):
        doc = Document(content="hello world", metadata={"a": 1})
        assert doc.doc_id is not None
        assert len(doc.doc_id) == 12

    def test_doc_id_deterministic(self):
        doc1 = Document(content="same content", metadata={})
        doc2 = Document(content="same content", metadata={})
        assert doc1.doc_id == doc2.doc_id


class TestDocumentChunker:
    def test_chunk_short_document(self):
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=20)
        doc = Document(content="A short medical note.", metadata={"doc_type": "note"})

        chunks = chunker.chunk_document(doc)

        assert len(chunks) >= 1
        assert isinstance(chunks[0], Chunk)
        assert chunks[0].metadata["doc_type"] == "note"
        assert chunks[0].metadata["doc_id"] == doc.doc_id
        assert chunks[0].chunk_id.startswith(doc.doc_id)

    def test_chunk_long_document_creates_multiple_chunks(self):
        chunker = DocumentChunker(chunk_size=50, chunk_overlap=5)
        long_text = ". ".join([f"Sentence number {i} about medicine" for i in range(20)])
        doc = Document(content=long_text, metadata={"doc_type": "medication"})

        chunks = chunker.chunk_document(doc)

        assert len(chunks) > 1
        for i, chunk in enumerate(chunks):
            assert chunk.metadata["chunk_index"] == i
            assert chunk.metadata["total_chunks"] == len(chunks)


class TestIngestionPipeline:
    @pytest.fixture
    def mock_vector_store(self):
        return Mock()

    @pytest.fixture
    def mock_embeddings(self):
        embeddings = Mock()
        embeddings.generate.return_value = [[0.1] * 1536]
        return embeddings

    @pytest.fixture
    def pipeline(self, mock_vector_store, mock_embeddings):
        return IngestionPipeline(
            vector_store=mock_vector_store,
            embeddings_service=mock_embeddings,
            chunker=DocumentChunker(chunk_size=500, chunk_overlap=50),
        )

    def test_ingest_documents_returns_stats(self, pipeline, mock_embeddings, mock_vector_store):
        docs = [Document(content="Paracetamol 500mg analgésico", metadata={"doc_type": "medication"})]
        mock_embeddings.generate.return_value = [[0.1] * 1536]

        stats = pipeline.ingest_documents(docs)

        assert stats["documents_processed"] == 1
        assert stats["chunks_created"] >= 1
        mock_vector_store.add_documents.assert_called_once()
