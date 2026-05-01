"""
Pipeline de ingesta de documentos para el RAG.
Maneja carga, chunking y almacenamiento de documentos médicos en español.

NOTA: Este pipeline es SINCRÓNICO y se usa para ingesta batch inicial.
Para retrieval real-time, usar RetrieverService (async).
"""
import csv
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langchain.text_splitter import RecursiveCharacterTextSplitter

from src.core.config import get_settings
from src.rag.embeddings import EmbeddingsService
from src.rag.vector_store import VectorStoreClient
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


@dataclass
class Document:
    """Documento a ingestar."""
    content: str
    metadata: dict[str, Any]
    doc_id: str | None = None

    def __post_init__(self):
        if self.doc_id is None:
            self.doc_id = hashlib.md5(self.content.encode()).hexdigest()[:12]


@dataclass
class Chunk:
    """Chunk de documento."""
    content: str
    metadata: dict[str, Any]
    chunk_id: str
    doc_id: str


class DocumentChunker:
    """Chunker de documentos con estrategias específicas para contenido médico."""

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ):
        self.chunk_size = chunk_size or settings.rag_chunk_size
        self.chunk_overlap = chunk_overlap or settings.rag_chunk_overlap

        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", ", ", " ", ""],
            length_function=len,
        )

    def chunk_document(self, document: Document) -> list[Chunk]:
        """Divide un documento en chunks."""
        texts = self.splitter.split_text(document.content)

        chunks = []
        for i, text in enumerate(texts):
            chunk_id = f"{document.doc_id}_chunk_{i:04d}"
            chunks.append(Chunk(
                content=text,
                metadata={
                    **document.metadata,
                    "chunk_index": i,
                    "total_chunks": len(texts),
                    "doc_id": document.doc_id,
                },
                chunk_id=chunk_id,
                doc_id=document.doc_id,
            ))

        return chunks


class IngestionPipeline:
    """Pipeline completo de ingesta de documentos (BATCH/SYNC)."""

    def __init__(
        self,
        vector_store: VectorStoreClient | None = None,
        embeddings_service: EmbeddingsService | None = None,
        chunker: DocumentChunker | None = None,
    ):
        self.vector_store = vector_store or VectorStoreClient()
        self.embeddings = embeddings_service or EmbeddingsService()
        self.chunker = chunker or DocumentChunker()

    def ingest_documents(
        self,
        documents: list[Document],
        batch_size: int = 50,
    ) -> dict[str, Any]:
        """Ingesta una lista de documentos."""
        logger.info(f"Starting ingestion of {len(documents)} documents")

        all_chunks: list[Chunk] = []
        for doc in documents:
            chunks = self.chunker.chunk_document(doc)
            all_chunks.extend(chunks)

        logger.info(f"Created {len(all_chunks)} chunks from {len(documents)} documents")

        chunk_texts = [c.content for c in all_chunks]
        embeddings = self.embeddings.generate(chunk_texts)

        self.vector_store.add_documents(
            ids=[c.chunk_id for c in all_chunks],
            embeddings=embeddings,
            documents=chunk_texts,
            metadatas=[c.metadata for c in all_chunks],
        )

        stats = {
            "documents_processed": len(documents),
            "chunks_created": len(all_chunks),
            "embeddings_generated": len(embeddings),
        }

        logger.info("Ingestion completed", extra=stats)
        return stats

    def ingest_from_json(self, json_path: Path | str) -> dict[str, Any]:
        """Ingesta documentos desde un archivo JSON."""
        path = Path(json_path)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        documents = [
            Document(
                content=item["content"],
                metadata=item.get("metadata", {}),
            )
            for item in data
        ]

        return self.ingest_documents(documents)

    def ingest_medications_csv(self, csv_path: Path | str) -> dict[str, Any]:
        """Ingesta medicamentos desde un archivo CSV."""
        documents = []
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                content = (
                    f"Medicamento: {row.get('nombre_comercial', '')}\n"
                    f"Principio activo: {row.get('principio_activo', '')}\n"
                    f"Indicaciones: {row.get('indicaciones', '')}\n"
                    f"Contraindicaciones: {row.get('contraindicaciones', '')}\n"
                    f"Posología: {row.get('posologia', '')}"
                ).strip()

                documents.append(Document(
                    content=content,
                    metadata={
                        "doc_type": "medication",
                        "nombre_comercial": row.get('nombre_comercial', ''),
                        "principio_activo": row.get('principio_activo', ''),
                        "source": "csv_import",
                        "language": "es",
                    },
                ))

        return self.ingest_documents(documents)
