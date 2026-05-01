"""
Dependency injection for API services.
Provides shared instances of services used across WebSocket and REST endpoints.
"""
from dataclasses import dataclass
from typing import Optional

import redis.asyncio as redis

from src.core.config import get_settings
from src.rag.embeddings import EmbeddingsService
from src.rag.retriever import RetrieverService
from src.services.cache import ResponseCache

settings = get_settings()


@dataclass
class Services:
    """Container for shared service instances."""
    redis: redis.Redis
    cache: ResponseCache
    rag_retriever: RetrieverService
    embeddings: EmbeddingsService


_services: Optional[Services] = None


async def get_services() -> Services:
    """Get or create shared service instances."""
    global _services

    if _services is None:
        redis_url = settings.redis_url or "redis://redis:6379"
        redis_client = await redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=False,
        )

        cache = ResponseCache(redis_url=redis_url)
        rag_retriever = RetrieverService(cache=cache)
        embeddings = EmbeddingsService()

        _services = Services(
            redis=redis_client,
            cache=cache,
            rag_retriever=rag_retriever,
            embeddings=embeddings,
        )

    return _services


async def cleanup_services() -> None:
    """Cleanup services on shutdown."""
    global _services
    if _services and _services.redis:
        await _services.redis.close()
    _services = None
