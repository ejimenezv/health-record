"""AIOrchestrator — RAG query path used by POST /api/v1/query.

Minimal implementation: retrieve via RetrieverService, synthesize an answer
with the configured chat model, return both for the route to package.
"""
from __future__ import annotations

import logging
from typing import Any

from openai import AsyncOpenAI

from src.core.config import get_settings
from src.rag.retriever import RetrievedDocument, RetrieverService

settings = get_settings()

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "Eres un asistente clínico que responde preguntas médicas en español "
    "usando exclusivamente el contexto proporcionado. Si el contexto no "
    "contiene la respuesta, dilo explícitamente. Cita información concreta "
    "del contexto, no inventes datos. Mantén un tono profesional y conciso."
)


class AIOrchestrator:
    """Coordinates retrieval + answer synthesis for the /query endpoint."""

    def __init__(
        self,
        retriever: RetrieverService | None = None,
        client: AsyncOpenAI | None = None,
        model: str | None = None,
    ) -> None:
        self.retriever = retriever or RetrieverService()
        self.client = client or AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = model or settings.openai_model

    async def query_with_rag(
        self,
        query: str,
        doc_type: str | None = None,
    ) -> dict[str, Any]:
        """Retrieve relevant chunks and synthesize an answer.

        Returns a dict with ``documents`` (list of dicts as expected by the
        route) and ``context`` (the synthesized answer string).
        """
        result = await self.retriever.retrieve(
            query=query,
            doc_type_filter=doc_type,
            similarity_threshold=0.5,
        )

        if not result.documents:
            return {
                "documents": [],
                "context": "No se encontró información relevante en la base de conocimiento.",
            }

        answer = await self._synthesize(query, result.documents)

        return {
            "documents": [
                {
                    "content": d.content,
                    "metadata": d.metadata,
                    "similarity_score": d.similarity_score,
                    "chunk_id": d.chunk_id,
                }
                for d in result.documents
            ],
            "context": answer,
        }

    async def _synthesize(self, query: str, docs: list[RetrievedDocument]) -> str:
        context_block = "\n\n".join(
            f"[Fuente {i + 1}] {d.content}" for i, d in enumerate(docs)
        )
        user_prompt = (
            f"Contexto:\n{context_block}\n\n"
            f"Pregunta: {query}\n\n"
            "Responde usando solo el contexto anterior."
        )
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        return (response.choices[0].message.content or "").strip()
