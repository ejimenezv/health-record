"""
Servicio asíncrono de generación de embeddings.
Utiliza OpenAI text-embedding-3-small optimizado para español.
Soporta batch sync (ingestion) y async single query (real-time).
"""
from typing import Any, Sequence

from openai import AsyncOpenAI, OpenAI

from src.core.config import get_settings
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class EmbeddingsService:
    """
    Servicio para generar embeddings de texto con soporte async.
    """

    COST_PER_1M_TOKENS = 0.02  # text-embedding-3-small

    def __init__(self, cost_tracker: Any | None = None):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.async_client = AsyncOpenAI(api_key=settings.openai_api_key)

        self.model = settings.embeddings_model
        self.dimensions = settings.embeddings_dimensions
        self.batch_size = settings.embeddings_batch_size
        self.cost_tracker = cost_tracker

    def generate(self, texts: str | Sequence[str]) -> list[list[float]]:
        """Generate embeddings for one or more texts (sync for batch ingestion)."""
        if isinstance(texts, str):
            texts = [texts]

        all_embeddings: list[list[float]] = []
        total_tokens = 0

        for i in range(0, len(texts), self.batch_size):
            batch = list(texts[i:i + self.batch_size])

            response = self.client.embeddings.create(
                model=self.model,
                input=batch,
                dimensions=self.dimensions,
            )

            for item in response.data:
                all_embeddings.append(item.embedding)

            total_tokens += response.usage.total_tokens

        cost_usd = (total_tokens / 1_000_000) * self.COST_PER_1M_TOKENS

        logger.info(
            "Generated embeddings",
            extra={
                "texts_count": len(texts),
                "tokens_used": total_tokens,
                "cost_usd": round(cost_usd, 6),
            },
        )

        return all_embeddings

    def generate_query_embedding(self, query: str) -> list[float]:
        """Generate embedding for a single query (sync)."""
        return self.generate(query)[0]

    async def generate_query_embedding_async(self, query: str) -> list[float]:
        """Generate embedding for a single query (async, real-time, <100ms target)."""
        response = await self.async_client.embeddings.create(
            model=self.model,
            input=[query],
            dimensions=self.dimensions,
        )

        total_tokens = response.usage.total_tokens
        cost_usd = (total_tokens / 1_000_000) * self.COST_PER_1M_TOKENS

        logger.debug(
            "Generated query embedding (async)",
            extra={
                "tokens_used": total_tokens,
                "cost_usd": round(cost_usd, 6),
            },
        )

        return response.data[0].embedding

    async def close_async(self):
        """Close async client."""
        await self.async_client.close()
