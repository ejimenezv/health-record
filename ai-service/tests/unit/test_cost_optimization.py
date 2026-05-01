"""Tests for cost optimization (cache, cost tracker, model selector, dashboard)."""
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock

import pytest

from src.services.cache import InMemoryCache, ResponseCache
from src.services.cost_dashboard import CostDashboard
from src.services.cost_tracker import CostEvent, CostTracker
from src.services.model_selector import MODEL_CONFIGS, ModelSelector, ModelTier


# ────────────────────────── ResponseCache (Redis mocked) ──────────────────────


@pytest.fixture
def fake_redis_client():
    store: dict[str, str] = {}

    client = Mock()

    async def _get(key):
        return store.get(key)

    async def _setex(key, ttl, value):
        store[key] = value

    async def _scan_iter(pattern):
        for k in list(store.keys()):
            yield k

    client.get = AsyncMock(side_effect=_get)
    client.setex = AsyncMock(side_effect=_setex)
    client.scan_iter = _scan_iter
    return client


@pytest.fixture
def response_cache(fake_redis_client):
    cache = ResponseCache()
    cache._client = fake_redis_client
    return cache


class TestResponseCache:
    @pytest.mark.asyncio
    async def test_chunk_transcription_roundtrip(self, response_cache):
        await response_cache.set_chunk_transcription("hash123", "hola doctor")
        result = await response_cache.get_chunk_transcription("hash123")
        assert result == "hola doctor"

    @pytest.mark.asyncio
    async def test_chunk_transcription_miss(self, response_cache):
        assert await response_cache.get_chunk_transcription("missing") is None

    @pytest.mark.asyncio
    async def test_entity_extraction_roundtrip(self, response_cache):
        text = "Paciente toma paracetamol 500mg cada 8 horas"
        await response_cache.set_entity_extraction(
            text, "medication", {"name": "paracetamol", "dose": "500mg"}
        )
        result = await response_cache.get_entity_extraction(text, "medication")
        assert result == {"name": "paracetamol", "dose": "500mg"}

    @pytest.mark.asyncio
    async def test_medication_validation_roundtrip(self, response_cache):
        await response_cache.set_medication_validation(
            "Paracetamol", {"documents": [{"content": "info"}]}
        )
        # Case-insensitive
        result = await response_cache.get_medication_validation("paracetamol")
        assert result == {"documents": [{"content": "info"}]}

    @pytest.mark.asyncio
    async def test_safe_drug_interaction_cached(self, response_cache):
        await response_cache.set_drug_interaction(
            "Paracetamol", "Ibuprofeno", {"has_interaction": False, "documents": []}
        )
        # Order-independent
        result = await response_cache.get_drug_interaction("ibuprofeno", "paracetamol")
        assert result is not None
        assert result["has_interaction"] is False

    @pytest.mark.asyncio
    async def test_unsafe_drug_interaction_not_cached(self, response_cache):
        await response_cache.set_drug_interaction(
            "warfarina", "aspirina", {"has_interaction": True, "severity": "CRITICA"}
        )
        # Should NOT have been stored
        result = await response_cache.get_drug_interaction("warfarina", "aspirina")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_cache_stats(self, response_cache):
        await response_cache.set_chunk_transcription("h1", "txt")
        await response_cache.set_entity_extraction("text1", "medication", {"x": 1})
        await response_cache.set_medication_validation("aspirina", {"documents": []})
        await response_cache.set_drug_interaction(
            "a", "b", {"has_interaction": False, "documents": []}
        )
        await response_cache.set_embedding("hello", [0.1, 0.2])

        stats = await response_cache.get_cache_stats()
        assert stats["transcription_chunks"] == 1
        assert stats["entity_extractions"] == 1
        assert stats["medication_validations"] == 1
        assert stats["drug_interactions"] == 1
        assert stats["embeddings"] == 1
        assert stats["total_keys"] == 5


class TestInMemoryCache:
    @pytest.mark.asyncio
    async def test_set_and_get(self):
        cache = InMemoryCache()
        await cache.set("entity", "some text", {"value": 42})
        result = await cache.get("entity", "some text")
        assert result == {"value": 42}

    @pytest.mark.asyncio
    async def test_miss(self):
        cache = InMemoryCache()
        assert await cache.get("entity", "nope") is None

    @pytest.mark.asyncio
    async def test_expired_entry_returns_none(self):
        cache = InMemoryCache()
        await cache.set("p", "content", "val", ttl_hours=0)
        # ttl_hours=0 → expiry == now → expired
        assert await cache.get("p", "content") is None


# ────────────────────────────── CostTracker ──────────────────────────────────


class TestCostTracker:
    def test_track_and_summary(self):
        tracker = CostTracker(monthly_budget_usd=10.0)
        tracker.track("transcription", "whisper_chunk", 0.50)
        tracker.track("extraction", "incremental", 1.50)
        tracker.track("rag", "med_lookup", 0.25)

        summary = tracker.get_summary()
        assert summary.total_cost_usd == pytest.approx(2.25)
        assert summary.by_service["transcription"] == pytest.approx(0.50)
        assert summary.by_service["extraction"] == pytest.approx(1.50)
        assert summary.events_count == 3
        assert summary.budget_remaining_usd == pytest.approx(7.75)
        assert summary.budget_percent_used == pytest.approx(22.5)

    def test_summary_filters_by_since(self):
        tracker = CostTracker()
        old = CostEvent("rag", "x", 1.0, timestamp=datetime.now() - timedelta(days=60))
        tracker.events.append(old)
        tracker.track("rag", "y", 2.0)

        summary = tracker.get_summary(since=datetime.now() - timedelta(days=1))
        assert summary.total_cost_usd == pytest.approx(2.0)
        assert summary.events_count == 1


# ────────────────────────────── ModelSelector ────────────────────────────────


class TestModelSelector:
    def test_simple_task_uses_cheap_tier(self):
        selector = ModelSelector(CostTracker())
        cfg = selector.select_model("medication_lookup", input_length=100)
        assert cfg.model_id == "gpt-4o-mini"

    def test_full_extraction_uses_balanced(self):
        selector = ModelSelector(CostTracker())
        cfg = selector.select_model("full_extraction", input_length=2000)
        assert cfg.model_id == "gpt-4o"

    def test_complex_task_uses_premium_when_budget_low_usage(self):
        selector = ModelSelector(CostTracker(monthly_budget_usd=100))
        cfg = selector.select_model("differential_diagnosis", input_length=500)
        assert cfg.model_id == "gpt-4-turbo"

    def test_force_tier_overrides_logic(self):
        selector = ModelSelector(CostTracker())
        cfg = selector.select_model(
            "full_extraction", 1000, force_tier=ModelTier.FAST_CHEAP
        )
        assert cfg.model_id == "gpt-4o-mini"

    def test_budget_pressure_downgrades_to_cheap(self):
        tracker = CostTracker(monthly_budget_usd=10.0)
        tracker.track("rag", "x", 9.0)  # 90% used
        selector = ModelSelector(tracker)
        cfg = selector.select_model("full_extraction", input_length=1000)
        assert cfg.model_id == "gpt-4o-mini"

    def test_high_session_cost_downgrades(self):
        tracker = CostTracker(monthly_budget_usd=100.0)
        tracker.track("rag", "x", 0.60, metadata={"session_id": "sess-1"})
        selector = ModelSelector(tracker)
        cfg = selector.select_model(
            "full_extraction", input_length=1000, session_id="sess-1"
        )
        assert cfg.model_id == "gpt-4o-mini"

    def test_estimate_cost_returns_all_tiers(self):
        selector = ModelSelector(CostTracker())
        estimates = selector.estimate_cost("full_extraction", 1000, 500)
        assert "gpt-4o-mini" in estimates
        assert "gpt-4o" in estimates
        assert "gpt-4-turbo" in estimates
        # Cheap < balanced < premium
        assert estimates["gpt-4o-mini"] < estimates["gpt-4o"] < estimates["gpt-4-turbo"]


# ────────────────────────────── CostDashboard ────────────────────────────────


class TestCostDashboard:
    def test_get_analytics_empty(self):
        dashboard = CostDashboard(CostTracker())
        analytics = dashboard.get_analytics()
        assert analytics.current_month.total_cost_usd == 0
        assert analytics.cost_per_session == 0
        assert analytics.recent_sessions == []

    def test_session_breakdown_categorizes_by_service(self):
        tracker = CostTracker()
        tracker.track("transcription", "whisper", 0.10, {"session_id": "s1"})
        tracker.track("extraction", "incr", 0.30, {"session_id": "s1"})
        tracker.track("rag", "med", 0.05, {"session_id": "s1"})
        tracker.track("validation", "val", 0.02, {"session_id": "s1"})

        dashboard = CostDashboard(tracker)
        breakdown = dashboard.get_session_cost("s1")
        assert breakdown is not None
        assert breakdown.transcription_cost == pytest.approx(0.10)
        assert breakdown.extraction_cost == pytest.approx(0.30)
        assert breakdown.rag_cost == pytest.approx(0.05)
        assert breakdown.validation_cost == pytest.approx(0.02)
        assert breakdown.total_cost == pytest.approx(0.47)

    def test_budget_alert_warning_at_80_to_90(self):
        tracker = CostTracker(monthly_budget_usd=10.0)
        tracker.track("rag", "x", 8.5)  # 85% used
        dashboard = CostDashboard(tracker)
        alert = dashboard.check_budget_alert()
        assert alert is not None
        assert alert["level"] == "warning"

    def test_budget_alert_critical_above_90(self):
        tracker = CostTracker(monthly_budget_usd=10.0)
        tracker.track("rag", "x", 9.5)  # 95% used
        dashboard = CostDashboard(tracker)
        alert = dashboard.check_budget_alert()
        assert alert is not None
        assert alert["level"] == "critical"

    def test_no_alert_below_threshold(self):
        tracker = CostTracker(monthly_budget_usd=10.0)
        tracker.track("rag", "x", 5.0)
        dashboard = CostDashboard(tracker)
        assert dashboard.check_budget_alert() is None

    def test_cost_breakdown_dict_shape(self):
        tracker = CostTracker(monthly_budget_usd=50.0)
        tracker.track("rag", "med", 1.0, {"session_id": "s1"})
        dashboard = CostDashboard(tracker)
        out = dashboard.get_cost_breakdown()
        assert "summary" in out
        assert "streaming_metrics" in out
        assert "by_service" in out
        assert "top_drivers" in out
        assert out["summary"]["total_spent"] == pytest.approx(1.0)
        assert len(out["streaming_metrics"]["recent_sessions"]) == 1


# ─────────────────────── RAG retriever caching integration ───────────────────


class TestRetrieverCacheIntegration:
    @pytest.fixture
    def mock_vector_store(self):
        store = Mock()
        store.query_async = AsyncMock(return_value={
            "ids": [["c1"]],
            "documents": [["Paracetamol info"]],
            "metadatas": [[{"doc_type": "medication"}]],
            "distances": [[0.1]],
        })
        return store

    @pytest.fixture
    def mock_embeddings(self):
        e = Mock()
        e.generate_query_embedding_async = AsyncMock(return_value=[0.1] * 1536)
        return e

    @pytest.mark.asyncio
    async def test_medication_cache_hit_skips_retrieval(
        self, mock_vector_store, mock_embeddings
    ):
        from src.rag.retriever import RetrieverService

        cache = Mock()
        cache.get_medication_validation = AsyncMock(return_value={
            "documents": [
                {
                    "content": "cached",
                    "metadata": {"doc_type": "medication"},
                    "similarity_score": 0.9,
                    "chunk_id": "cached_id",
                }
            ]
        })
        cache.set_medication_validation = AsyncMock()

        service = RetrieverService(
            vector_store=mock_vector_store,
            embeddings_service=mock_embeddings,
            cache=cache,
        )
        docs = await service.retrieve_medications("Paracetamol")

        assert docs[0].content == "cached"
        mock_vector_store.query_async.assert_not_called()
        cache.set_medication_validation.assert_not_called()

    @pytest.mark.asyncio
    async def test_medication_cache_miss_populates_cache(
        self, mock_vector_store, mock_embeddings
    ):
        from src.rag.retriever import RetrieverService

        cache = Mock()
        cache.get_medication_validation = AsyncMock(return_value=None)
        cache.set_medication_validation = AsyncMock()

        service = RetrieverService(
            vector_store=mock_vector_store,
            embeddings_service=mock_embeddings,
            cache=cache,
        )
        docs = await service.retrieve_medications("Paracetamol")

        assert len(docs) == 1
        mock_vector_store.query_async.assert_called_once()
        cache.set_medication_validation.assert_called_once()

    @pytest.mark.asyncio
    async def test_safe_interaction_caches_result(
        self, mock_vector_store, mock_embeddings
    ):
        from src.rag.retriever import RetrieverService

        # Low severity → no real interaction → should cache
        mock_vector_store.query_async.return_value = {
            "ids": [["c1"]],
            "documents": [["benign"]],
            "metadatas": [[{"doc_type": "drug_interaction", "severidad": "MENOR"}]],
            "distances": [[0.1]],
        }

        cache = Mock()
        cache.get_drug_interaction = AsyncMock(return_value=None)
        cache.set_drug_interaction = AsyncMock()

        service = RetrieverService(
            vector_store=mock_vector_store,
            embeddings_service=mock_embeddings,
            cache=cache,
        )
        await service.retrieve_interactions("a", "b")
        cache.set_drug_interaction.assert_called_once()
        kwargs = cache.set_drug_interaction.call_args.kwargs
        assert kwargs["interaction_result"]["has_interaction"] is False

    @pytest.mark.asyncio
    async def test_critical_interaction_not_cached(
        self, mock_vector_store, mock_embeddings
    ):
        from src.rag.retriever import RetrieverService

        # High similarity + CRITICA severity → has_interaction → NOT cached
        mock_vector_store.query_async.return_value = {
            "ids": [["c1"]],
            "documents": [["dangerous"]],
            "metadatas": [[{"doc_type": "drug_interaction", "severidad": "CRITICA"}]],
            "distances": [[0.05]],  # similarity 0.95 > 0.8
        }

        cache = Mock()
        cache.get_drug_interaction = AsyncMock(return_value=None)
        cache.set_drug_interaction = AsyncMock()

        service = RetrieverService(
            vector_store=mock_vector_store,
            embeddings_service=mock_embeddings,
            cache=cache,
        )
        await service.retrieve_interactions("warfarina", "aspirina")
        cache.set_drug_interaction.assert_not_called()
