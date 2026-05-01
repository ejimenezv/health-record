"""Additional ResponseCache and InMemoryCache coverage."""
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock

import pytest

from src.services.cache import InMemoryCache, ResponseCache


@pytest.fixture
def fake_redis_client():
    store: dict[str, str] = {}

    client = Mock()

    async def _get(key):
        return store.get(key)

    async def _setex(key, ttl, value):
        store[key] = value

    client.get = AsyncMock(side_effect=_get)
    client.setex = AsyncMock(side_effect=_setex)
    return client


@pytest.fixture
def cache(fake_redis_client):
    c = ResponseCache()
    c._client = fake_redis_client
    return c


class TestEntityExtractionCache:
    @pytest.mark.asyncio
    async def test_entity_extraction_roundtrip(self, cache):
        await cache.set_entity_extraction(
            "El paciente tiene fiebre", "symptom", {"name": "fiebre"}
        )
        result = await cache.get_entity_extraction(
            "El paciente tiene fiebre", "symptom"
        )
        assert result == {"name": "fiebre"}

    @pytest.mark.asyncio
    async def test_entity_extraction_miss(self, cache):
        assert await cache.get_entity_extraction("nothing", "symptom") is None


class TestMedicationValidationCache:
    @pytest.mark.asyncio
    async def test_medication_validation_roundtrip(self, cache):
        await cache.set_medication_validation("Paracetamol", {"valid": True})
        result = await cache.get_medication_validation("PARACETAMOL")
        assert result == {"valid": True}

    @pytest.mark.asyncio
    async def test_medication_validation_miss(self, cache):
        assert await cache.get_medication_validation("Unknown") is None


class TestDrugInteractionCache:
    @pytest.mark.asyncio
    async def test_safe_interaction_cached(self, cache):
        await cache.set_drug_interaction(
            "Paracetamol", "Ibuprofeno",
            {"has_interaction": False},
        )
        result = await cache.get_drug_interaction("Ibuprofeno", "Paracetamol")
        assert result["has_interaction"] is False

    @pytest.mark.asyncio
    async def test_unsafe_interaction_not_cached(self, cache):
        await cache.set_drug_interaction(
            "Warfarina", "Aspirina",
            {"has_interaction": True, "severity": "HIGH"},
        )
        # Should NOT be cached
        result = await cache.get_drug_interaction("Warfarina", "Aspirina")
        assert result is None


class TestEmbeddingCache:
    @pytest.mark.asyncio
    async def test_embedding_roundtrip(self, cache):
        await cache.set_embedding("hello", [0.1, 0.2, 0.3])
        result = await cache.get_embedding("hello")
        assert result == [0.1, 0.2, 0.3]

    @pytest.mark.asyncio
    async def test_embedding_miss(self, cache):
        assert await cache.get_embedding("missing") is None


class TestRagResultCache:
    @pytest.mark.asyncio
    async def test_rag_result_roundtrip(self, cache):
        await cache.set_rag_result(
            "what is paracetamol", {"answer": "analgesic"}, doc_type="med"
        )
        result = await cache.get_rag_result("what is paracetamol", doc_type="med")
        assert result == {"answer": "analgesic"}

    @pytest.mark.asyncio
    async def test_rag_result_miss(self, cache):
        assert await cache.get_rag_result("missing") is None

    @pytest.mark.asyncio
    async def test_rag_result_doc_type_segregation(self, cache):
        await cache.set_rag_result("query", {"a": 1}, doc_type="med")
        assert await cache.get_rag_result("query", doc_type="diagnosis") is None


class TestInMemoryCacheEviction:
    @pytest.mark.asyncio
    async def test_expired_entries_purged_on_get(self):
        c = InMemoryCache(max_size=10)
        c._cache["foo:abc"] = ("value", datetime.now() - timedelta(hours=1))

        result = await c.get("foo", "abc")
        assert result is None

    @pytest.mark.asyncio
    async def test_max_size_eviction(self):
        c = InMemoryCache(max_size=2)
        for i in range(5):
            await c.set("p", f"key{i}", i, ttl_hours=1)
        # _cleanup runs before each set, so cache stays bounded to max_size + 1
        assert len(c._cache) <= 3

    @pytest.mark.asyncio
    async def test_set_and_get_roundtrip(self):
        c = InMemoryCache()
        await c.set("p", "key", "value", ttl_hours=1)
        assert await c.get("p", "key") == "value"

    @pytest.mark.asyncio
    async def test_cleanup_removes_only_expired(self):
        c = InMemoryCache(max_size=10)
        c._cache["fresh:1"] = ("a", datetime.now() + timedelta(hours=1))
        c._cache["stale:1"] = ("b", datetime.now() - timedelta(hours=1))
        c._cleanup()
        assert "fresh:1" in c._cache
        assert "stale:1" not in c._cache
