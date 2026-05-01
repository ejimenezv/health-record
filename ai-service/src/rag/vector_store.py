"""
Cliente asíncrono para ChromaDB vector store.
Gestiona colecciones y operaciones CRUD de embeddings con soporte async.
"""
import asyncio
from functools import partial
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.core.config import get_settings
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class VectorStoreClient:
    """
    Cliente para interactuar con ChromaDB con soporte async.

    ChromaDB client es sincrónico, pero exponemos interface async
    para uso en pipeline real-time usando run_in_executor.
    """

    def __init__(self, client: Any | None = None, collection_name: str | None = None):
        self.client = client or chromadb.HttpClient(
            host=settings.chromadb_host,
            port=settings.chromadb_port,
            settings=ChromaSettings(
                anonymized_telemetry=False,
            ),
        )
        self.collection_name = collection_name or settings.chromadb_collection_name
        self._collection = None

    @property
    def collection(self):
        """Get or create the collection (sync operation)."""
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={
                    "description": "Spanish medical knowledge base",
                    "language": "es",
                    "hnsw:space": "cosine",
                },
            )
            logger.info(f"Using collection: {self.collection_name}")
        return self._collection

    def add_documents(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """Add documents to the vector store (sync, batch ingestion)."""
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(ids)} documents to collection")

    async def query_async(
        self,
        query_embedding: list[float],
        n_results: int = 5,
        where: dict[str, Any] | None = None,
        where_document: dict[str, Any] | None = None,
    ) -> dict:
        """Query the vector store for similar documents (async, real-time).

        Why we omit None kwargs: the chroma server (0.5.x) rejects
        ``where_document=None`` as 'expected one operator, got {}'.
        We only pass filter kwargs when they're non-empty so the
        client/server stay compatible across the 0.4 / 0.5 boundary.
        """
        loop = asyncio.get_event_loop()
        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where
        if where_document:
            kwargs["where_document"] = where_document
        results = await loop.run_in_executor(
            None, partial(self.collection.query, **kwargs)
        )
        return results

    def query(
        self,
        query_embedding: list[float],
        n_results: int = 5,
        where: dict[str, Any] | None = None,
        where_document: dict[str, Any] | None = None,
    ) -> dict:
        """Query the vector store for similar documents (sync version)."""
        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where
        if where_document:
            kwargs["where_document"] = where_document
        return self.collection.query(**kwargs)

    def delete(self, ids: list[str]) -> None:
        """Delete documents by ID."""
        self.collection.delete(ids=ids)
        logger.info(f"Deleted {len(ids)} documents")

    def count(self) -> int:
        """Get total document count."""
        return self.collection.count()

    def reset(self) -> None:
        """Delete and recreate the collection."""
        self.client.delete_collection(self.collection_name)
        self._collection = None
        logger.warning(f"Reset collection: {self.collection_name}")
