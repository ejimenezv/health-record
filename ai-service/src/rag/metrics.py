"""
RAG performance metrics for monitoring cache hits, latency, and query performance.
"""
from typing import Dict

import numpy as np


class RAGMetrics:
    """Tracks RAG query performance metrics (cache hit rate and latency)."""

    def __init__(self):
        self.queries_total = 0
        self.queries_cached = 0
        self.queries_executed = 0
        self.latencies: list[float] = []

    def record_query(self, cached: bool, latency_ms: float):
        """Record a RAG query for metrics."""
        self.queries_total += 1
        if cached:
            self.queries_cached += 1
        else:
            self.queries_executed += 1
            self.latencies.append(latency_ms)

    def get_stats(self) -> Dict:
        """Get aggregated performance statistics."""
        return {
            "queries_total": self.queries_total,
            "cache_hit_rate": (
                self.queries_cached / self.queries_total
                if self.queries_total > 0
                else 0
            ),
            "avg_latency_ms": float(np.mean(self.latencies)) if self.latencies else 0,
            "p95_latency_ms": float(np.percentile(self.latencies, 95)) if self.latencies else 0,
            "p99_latency_ms": float(np.percentile(self.latencies, 99)) if self.latencies else 0,
        }

    def reset(self):
        """Reset all metrics."""
        self.queries_total = 0
        self.queries_cached = 0
        self.queries_executed = 0
        self.latencies = []
