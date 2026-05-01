"""
Caching layer for streaming LLM responses, embeddings, and RAG results.
Optimized for real-time incremental operations.
"""
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any

import redis.asyncio as redis

from src.core.config import get_settings
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class ResponseCache:
    """
    Cache for LLM responses with TTL, optimized for streaming pipeline.
    """

    def __init__(
        self,
        redis_url: str | None = None,
        default_ttl_hours: int = 24,
    ):
        self.redis_url = redis_url or "redis://redis:6379"
        self.default_ttl = timedelta(hours=default_ttl_hours)
        self._client: redis.Redis | None = None

    async def get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    def _generate_key(self, prefix: str, content: str) -> str:
        """Generate cache key from content hash."""
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"medrecord:{prefix}:{content_hash}"

    # ============================================================
    # STREAMING TRANSCRIPTION CACHING
    # ============================================================

    async def get_chunk_transcription(self, audio_chunk_hash: str) -> str | None:
        """
        Get cached transcription for audio chunk.

        Used by StreamingTranscriptionService to avoid re-transcribing
        identical audio chunks (e.g., repeated silence detection).
        """
        key = f"medrecord:transcription:chunk:{audio_chunk_hash}"
        client = await self.get_client()
        data = await client.get(key)
        if data:
            logger.debug("Cache hit for transcription chunk", extra={"hash": audio_chunk_hash[:12]})
            return data
        return None

    async def set_chunk_transcription(
        self,
        audio_chunk_hash: str,
        transcription: str,
        ttl: timedelta | None = None,
    ) -> None:
        """Cache audio chunk transcription."""
        key = f"medrecord:transcription:chunk:{audio_chunk_hash}"
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(hours=1),
            transcription,
        )

    # ============================================================
    # INCREMENTAL EXTRACTION CACHING
    # ============================================================

    async def get_entity_extraction(self, text_chunk: str, entity_type: str) -> dict | None:
        """
        Get cached entity extraction for text chunk.

        Used by IncrementalExtractor to avoid re-extracting
        identical text segments.
        """
        key = self._generate_key(f"entity:{entity_type}", text_chunk)
        client = await self.get_client()
        data = await client.get(key)
        if data:
            logger.info("Cache hit for entity extraction", extra={
                "entity_type": entity_type,
                "key": key[:30]
            })
            return json.loads(data)
        return None

    async def set_entity_extraction(
        self,
        text_chunk: str,
        entity_type: str,
        extraction: dict,
        ttl: timedelta | None = None,
    ) -> None:
        """Cache entity extraction result."""
        key = self._generate_key(f"entity:{entity_type}", text_chunk)
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(hours=24),
            json.dumps(extraction),
        )
        logger.debug("Cached entity extraction", extra={"entity_type": entity_type})

    # ============================================================
    # RAG VALIDATION CACHING
    # ============================================================

    async def get_medication_validation(self, medication_name: str) -> dict | None:
        """
        Get cached medication validation from RAG.

        High-value cache: Same medications queried frequently across sessions.
        """
        key = f"medrecord:rag:medication:{medication_name.lower()}"
        client = await self.get_client()
        data = await client.get(key)
        if data:
            logger.info("Cache hit for medication validation", extra={
                "medication": medication_name
            })
            return json.loads(data)
        return None

    async def set_medication_validation(
        self,
        medication_name: str,
        validation_result: dict,
        ttl: timedelta | None = None,
    ) -> None:
        """
        Cache medication validation result.

        TTL: 7 days (medical knowledge changes slowly).
        """
        key = f"medrecord:rag:medication:{medication_name.lower()}"
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(days=7),
            json.dumps(validation_result),
        )

    async def get_drug_interaction(self, med1: str, med2: str) -> dict | None:
        """
        Get cached drug interaction result.

        CRITICAL: Cache ONLY safe (no interaction) results.
        Never cache interaction alerts to ensure fresh validation.
        """
        meds = sorted([med1.lower(), med2.lower()])
        key = f"medrecord:rag:interaction:{meds[0]}:{meds[1]}"
        client = await self.get_client()
        data = await client.get(key)

        if data:
            result = json.loads(data)
            if result.get("has_interaction") is False:
                logger.info("Cache hit for safe drug interaction", extra={
                    "med1": med1,
                    "med2": med2
                })
                return result

        return None

    async def set_drug_interaction(
        self,
        med1: str,
        med2: str,
        interaction_result: dict,
        ttl: timedelta | None = None,
    ) -> None:
        """
        Cache drug interaction result.

        IMPORTANT: Only cache if no interaction found (has_interaction=False).
        """
        if interaction_result.get("has_interaction") is False:
            meds = sorted([med1.lower(), med2.lower()])
            key = f"medrecord:rag:interaction:{meds[0]}:{meds[1]}"
            client = await self.get_client()
            await client.setex(
                key,
                ttl or timedelta(days=7),
                json.dumps(interaction_result),
            )

    async def get_embedding(self, text: str) -> list[float] | None:
        """Get cached embedding."""
        key = self._generate_key("embedding", text)
        client = await self.get_client()
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_embedding(
        self,
        text: str,
        embedding: list[float],
        ttl: timedelta | None = None,
    ) -> None:
        """Cache embedding (long TTL since embeddings are deterministic)."""
        key = self._generate_key("embedding", text)
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(days=30),
            json.dumps(embedding),
        )

    async def get_rag_result(self, query: str, doc_type: str | None = None) -> dict | None:
        """Get cached RAG result."""
        key = self._generate_key("rag", f"{query}:{doc_type or 'all'}")
        client = await self.get_client()
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_rag_result(
        self,
        query: str,
        result: dict,
        doc_type: str | None = None,
        ttl: timedelta | None = None,
    ) -> None:
        """Cache RAG result."""
        key = self._generate_key("rag", f"{query}:{doc_type or 'all'}")
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(hours=12),
            json.dumps(result),
        )

    async def get_cache_stats(self) -> dict[str, int]:
        """Get cache statistics for monitoring."""
        client = await self.get_client()

        stats = {
            "total_keys": 0,
            "transcription_chunks": 0,
            "entity_extractions": 0,
            "medication_validations": 0,
            "drug_interactions": 0,
            "embeddings": 0,
        }

        async for key in client.scan_iter("medrecord:*"):
            stats["total_keys"] += 1
            if ":transcription:chunk:" in key:
                stats["transcription_chunks"] += 1
            elif ":entity:" in key:
                stats["entity_extractions"] += 1
            elif ":rag:medication:" in key:
                stats["medication_validations"] += 1
            elif ":rag:interaction:" in key:
                stats["drug_interactions"] += 1
            elif ":embedding:" in key:
                stats["embeddings"] += 1

        return stats


class InMemoryCache:
    """
    Simple in-memory cache for development/testing.
    Thread-safe for async operations.
    """

    def __init__(self, max_size: int = 1000):
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self.max_size = max_size

    def _generate_key(self, prefix: str, content: str) -> str:
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"{prefix}:{content_hash}"

    def _cleanup(self) -> None:
        """Remove expired entries."""
        now = datetime.now()
        expired = [k for k, (_, exp) in self._cache.items() if exp < now]
        for k in expired:
            del self._cache[k]

        if len(self._cache) > self.max_size:
            sorted_keys = sorted(
                self._cache.keys(),
                key=lambda k: self._cache[k][1]
            )
            for k in sorted_keys[:len(self._cache) - self.max_size]:
                del self._cache[k]

    async def get(self, prefix: str, content: str) -> Any | None:
        key = self._generate_key(prefix, content)
        if key in self._cache:
            value, expiry = self._cache[key]
            if expiry > datetime.now():
                return value
            del self._cache[key]
        return None

    async def set(
        self,
        prefix: str,
        content: str,
        value: Any,
        ttl_hours: int = 24,
    ) -> None:
        self._cleanup()
        key = self._generate_key(prefix, content)
        expiry = datetime.now() + timedelta(hours=ttl_hours)
        self._cache[key] = (value, expiry)
