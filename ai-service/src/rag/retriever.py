"""
Servicio asíncrono de retrieval semántico para RAG real-time.
Busca documentos relevantes en el vector store con latencia <200ms.

INTEGRACIÓN: Llamado por RAGValidationCoordinator (Prompt 21) desde workers async.
"""
import time
from dataclasses import dataclass
from typing import Any

from src.core.config import get_settings
from src.rag.embeddings import EmbeddingsService
from src.rag.vector_store import VectorStoreClient
from src.services.cache import ResponseCache
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


@dataclass
class RetrievedDocument:
    """Documento recuperado con score de relevancia."""
    content: str
    metadata: dict[str, Any]
    similarity_score: float
    chunk_id: str


@dataclass
class RetrievalResult:
    """Resultado de una búsqueda."""
    documents: list[RetrievedDocument]
    query: str
    total_found: int
    latency_ms: float


class RetrieverService:
    """
    Servicio de retrieval semántico ASÍNCRONO para real-time validation.

    Latency target: <200ms per query (to support <1s validation in Prompt 21).
    """

    def __init__(
        self,
        vector_store: VectorStoreClient | None = None,
        embeddings_service: EmbeddingsService | None = None,
        cache: ResponseCache | None = None,
    ):
        self.vector_store = vector_store or VectorStoreClient()
        self.embeddings = embeddings_service or EmbeddingsService()
        self.cache = cache or ResponseCache()
        self.top_k = settings.rag_top_k
        self.similarity_threshold = settings.rag_similarity_threshold

    async def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        doc_type_filter: str | None = None,
        similarity_threshold: float | None = None,
    ) -> RetrievalResult:
        """Recupera documentos relevantes para una query (ASYNC)."""
        start_time = time.time()

        top_k = top_k or self.top_k
        if similarity_threshold is None:
            similarity_threshold = self.similarity_threshold

        query_embedding = await self.embeddings.generate_query_embedding_async(query)

        where_filter = None
        if doc_type_filter:
            where_filter = {"doc_type": doc_type_filter}

        results = await self.vector_store.query_async(
            query_embedding=query_embedding,
            n_results=top_k,
            where=where_filter,
        )

        documents: list[RetrievedDocument] = []
        if results.get("ids") and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i] if results.get("distances") else 0
                similarity = 1 - distance

                if similarity >= similarity_threshold:
                    documents.append(RetrievedDocument(
                        content=results["documents"][0][i] if results.get("documents") else "",
                        metadata=results["metadatas"][0][i] if results.get("metadatas") else {},
                        similarity_score=similarity,
                        chunk_id=chunk_id,
                    ))

        documents.sort(key=lambda d: d.similarity_score, reverse=True)

        latency_ms = (time.time() - start_time) * 1000

        logger.info(
            "Retrieval completed (async)",
            extra={
                "query_length": len(query),
                "results_count": len(documents),
                "top_similarity": documents[0].similarity_score if documents else 0,
                "latency_ms": round(latency_ms, 1),
                "within_target": latency_ms < 200,
            },
        )

        return RetrievalResult(
            documents=documents,
            query=query,
            total_found=len(documents),
            latency_ms=latency_ms,
        )

    async def retrieve_medications(
        self,
        medication_name: str,
        top_k: int = 3,
    ) -> list[RetrievedDocument]:
        """Retrieve medication information with caching (ASYNC, target <150ms)."""
        cached = await self.cache.get_medication_validation(medication_name)
        if cached:
            return [RetrievedDocument(**doc) for doc in cached.get("documents", [])]

        result = await self.retrieve(
            query=f"medicamento {medication_name}",
            top_k=top_k,
            doc_type_filter="medication",
        )

        await self.cache.set_medication_validation(
            medication_name=medication_name,
            validation_result={
                "documents": [
                    {
                        "content": doc.content,
                        "metadata": doc.metadata,
                        "similarity_score": doc.similarity_score,
                        "chunk_id": doc.chunk_id,
                    }
                    for doc in result.documents
                ]
            },
        )

        return result.documents

    async def retrieve_interactions(
        self,
        med1: str,
        med2: str,
        top_k: int = 5,
    ) -> list[RetrievedDocument]:
        """
        Retrieve drug interaction information with safe-result caching (ASYNC).

        IMPORTANT: Only caches if no interaction found (safety-critical).
        """
        cached = await self.cache.get_drug_interaction(med1, med2)
        if cached:
            return [RetrievedDocument(**doc) for doc in cached.get("documents", [])]

        result = await self.retrieve(
            query=f"interacción medicamentosa entre {med1} y {med2}",
            top_k=top_k,
            doc_type_filter="drug_interaction",
        )

        has_interaction = any(
            doc.similarity_score > 0.8
            and doc.metadata.get("severidad") in ["CRITICA", "MAYOR"]
            for doc in result.documents
        )

        if not has_interaction:
            await self.cache.set_drug_interaction(
                med1=med1,
                med2=med2,
                interaction_result={
                    "has_interaction": False,
                    "documents": [
                        {
                            "content": doc.content,
                            "metadata": doc.metadata,
                            "similarity_score": doc.similarity_score,
                            "chunk_id": doc.chunk_id,
                        }
                        for doc in result.documents
                    ],
                },
            )

        return result.documents

    async def retrieve_cie10(
        self,
        symptoms: str,
        top_k: int = 5,
    ) -> list[RetrievedDocument]:
        """Retrieve CIE-10 codes for symptoms (ASYNC, target <150ms)."""
        result = await self.retrieve(
            query=f"código CIE-10 para {symptoms}",
            top_k=top_k,
            doc_type_filter="cie10_code",
        )
        return result.documents

    async def optimized_rag_query(
        self,
        query: str,
        filters: dict,
        top_k: int = 5,
        similarity_threshold: float = 0.75,
    ) -> list[RetrievedDocument]:
        """Optimized RAG query with metadata filters and similarity threshold."""
        query_embedding = await self.embeddings.generate_query_embedding_async(query)

        results = await self.vector_store.query_async(
            query_embedding=query_embedding,
            n_results=top_k,
            where=filters,
            where_document=None,
        )

        documents: list[RetrievedDocument] = []
        if results.get("ids") and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i] if results.get("distances") else 0
                similarity = 1 - distance

                if similarity >= similarity_threshold:
                    documents.append(RetrievedDocument(
                        content=results["documents"][0][i] if results.get("documents") else "",
                        metadata=results["metadatas"][0][i] if results.get("metadatas") else {},
                        similarity_score=similarity,
                        chunk_id=chunk_id,
                    ))

        return documents

    def format_context(self, documents: list[RetrievedDocument]) -> str:
        """Format retrieved documents as context for LLM."""
        if not documents:
            return "No se encontró información relevante en la base de conocimiento."

        context_parts = []
        for i, doc in enumerate(documents, 1):
            context_parts.append(f"[Fuente {i}] (Relevancia: {doc.similarity_score:.2f})")
            context_parts.append(doc.content)
            context_parts.append("")

        return "\n".join(context_parts)

    async def close(self):
        """Close async resources."""
        await self.embeddings.close_async()
