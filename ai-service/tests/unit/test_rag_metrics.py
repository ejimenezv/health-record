"""Unit tests for src/rag/metrics.py."""
from src.rag.metrics import RAGMetrics


def test_initial_state_returns_zeros():
    m = RAGMetrics()
    stats = m.get_stats()
    assert stats["queries_total"] == 0
    assert stats["cache_hit_rate"] == 0
    assert stats["avg_latency_ms"] == 0
    assert stats["p95_latency_ms"] == 0
    assert stats["p99_latency_ms"] == 0


def test_record_cached_query_increments_cache_count():
    m = RAGMetrics()
    m.record_query(cached=True, latency_ms=100)
    m.record_query(cached=True, latency_ms=200)

    stats = m.get_stats()
    assert stats["queries_total"] == 2
    assert stats["cache_hit_rate"] == 1.0
    assert stats["avg_latency_ms"] == 0  # cached queries don't add to latencies


def test_record_executed_query_tracks_latency():
    m = RAGMetrics()
    m.record_query(cached=False, latency_ms=100)
    m.record_query(cached=False, latency_ms=200)
    m.record_query(cached=False, latency_ms=300)

    stats = m.get_stats()
    assert stats["queries_total"] == 3
    assert stats["cache_hit_rate"] == 0.0
    assert stats["avg_latency_ms"] == 200.0
    assert stats["p95_latency_ms"] > 0


def test_mixed_cached_and_executed():
    m = RAGMetrics()
    m.record_query(cached=True, latency_ms=10)
    m.record_query(cached=False, latency_ms=200)

    stats = m.get_stats()
    assert stats["queries_total"] == 2
    assert stats["cache_hit_rate"] == 0.5
    assert stats["avg_latency_ms"] == 200.0


def test_reset_clears_all_state():
    m = RAGMetrics()
    m.record_query(cached=True, latency_ms=100)
    m.record_query(cached=False, latency_ms=200)

    m.reset()

    stats = m.get_stats()
    assert stats["queries_total"] == 0
    assert stats["avg_latency_ms"] == 0
