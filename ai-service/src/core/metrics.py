"""
In-memory metrics collector for HTTP, AI service, and real-time WebSocket telemetry.
"""
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class MetricValue:
    value: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    labels: Dict[str, str] = field(default_factory=dict)


def _labels_key(labels: Dict[str, str]) -> str:
    return str(sorted(labels.items()))


class Counter:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._values: Dict[str, float] = {}
        self._lock = threading.Lock()

    def inc(self, amount: float = 1, labels: Optional[Dict[str, str]] = None):
        key = _labels_key(labels or {})
        with self._lock:
            self._values[key] = self._values.get(key, 0) + amount

    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        return self._values.get(_labels_key(labels or {}), 0)


class Gauge:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._values: Dict[str, float] = {}
        self._lock = threading.Lock()

    def set(self, value: float, labels: Optional[Dict[str, str]] = None):
        key = _labels_key(labels or {})
        with self._lock:
            self._values[key] = value

    def inc(self, amount: float = 1, labels: Optional[Dict[str, str]] = None):
        key = _labels_key(labels or {})
        with self._lock:
            self._values[key] = self._values.get(key, 0) + amount

    def dec(self, amount: float = 1, labels: Optional[Dict[str, str]] = None):
        self.inc(-amount, labels)

    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        return self._values.get(_labels_key(labels or {}), 0)


class Histogram:
    DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

    def __init__(self, name: str, description: str, buckets: Optional[List[float]] = None):
        self.name = name
        self.description = description
        self.buckets = buckets or self.DEFAULT_BUCKETS
        self._values: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def observe(self, value: float, labels: Optional[Dict[str, str]] = None):
        key = _labels_key(labels or {})
        with self._lock:
            self._values.setdefault(key, []).append(value)

    def get_stats(self, labels: Optional[Dict[str, str]] = None) -> Dict:
        if labels is None and self._values:
            values: List[float] = []
            for v in self._values.values():
                values.extend(v)
        else:
            key = _labels_key(labels or {})
            values = self._values.get(key, [])
        if not values:
            return {"count": 0, "sum": 0, "avg": 0, "min": 0, "max": 0, "p50": 0, "p95": 0, "p99": 0}

        sorted_values = sorted(values)
        n = len(sorted_values)

        def pct(p: float) -> float:
            idx = min(n - 1, int(round(p * (n - 1))))
            return sorted_values[idx]

        return {
            "count": n,
            "sum": sum(values),
            "avg": sum(values) / n,
            "min": sorted_values[0],
            "max": sorted_values[-1],
            "p50": pct(0.50),
            "p95": pct(0.95),
            "p99": pct(0.99),
        }


class MetricsCollector:
    """Central metrics collector."""

    def __init__(self):
        # HTTP
        self.requests_total = Counter("http_requests_total", "Total HTTP requests")
        self.request_duration = Histogram("http_request_duration_seconds", "HTTP request duration")

        # Transcription
        self.transcription_requests = Counter("transcription_requests_total", "Total transcription requests")
        self.transcription_duration = Histogram("transcription_duration_seconds", "Transcription processing time")
        self.transcription_audio_seconds = Counter(
            "transcription_audio_seconds_total", "Total audio seconds transcribed"
        )

        # Extraction
        self.extraction_requests = Counter("extraction_requests_total", "Total extraction requests")
        self.extraction_duration = Histogram("extraction_duration_seconds", "Extraction processing time")

        # RAG
        self.rag_queries = Counter("rag_queries_total", "Total RAG queries")
        self.rag_query_duration = Histogram("rag_query_duration_seconds", "RAG query processing time")

        # Cost
        self.api_cost_usd = Counter("api_cost_usd_total", "Total API costs in USD")
        self.tokens_used = Counter("tokens_used_total", "Total tokens used")

        # System
        self.active_sessions = Gauge("active_sessions", "Currently active transcription sessions")
        self.websocket_connections = Gauge("websocket_connections", "Active WebSocket connections")

        # WebSocket streaming (real-time)
        self.websocket_connections_total = Counter(
            "websocket_connections_total", "Total WebSocket connections established"
        )
        self.websocket_message_latency = Histogram(
            "websocket_message_latency_seconds",
            "WebSocket message round-trip latency",
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
        )
        self.websocket_events_sent = Counter("websocket_events_sent_total", "Total WebSocket events sent")
        self.stream_processor_buffer_size = Gauge(
            "stream_processor_buffer_bytes", "Current audio buffer size in bytes"
        )
        self.entity_matching_similarity = Histogram(
            "entity_matching_similarity_score",
            "Entity matching similarity scores",
            buckets=[0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
        )
        self.realtime_e2e_latency = Histogram(
            "realtime_e2e_latency_seconds",
            "End-to-end latency: audio received -> event sent",
            buckets=[0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10],
        )

    def get_all_metrics(self) -> Dict:
        return {
            "http": {
                "requests_total": self.requests_total._values,
                "request_duration": self.request_duration.get_stats(),
            },
            "transcription": {
                "requests_total": self.transcription_requests._values,
                "duration_stats": self.transcription_duration.get_stats(),
                "audio_seconds_total": self.transcription_audio_seconds._values,
            },
            "extraction": {
                "requests_total": self.extraction_requests._values,
                "duration_stats": self.extraction_duration.get_stats(),
            },
            "rag": {
                "queries_total": self.rag_queries._values,
                "duration_stats": self.rag_query_duration.get_stats(),
            },
            "costs": {
                "api_cost_usd": self.api_cost_usd._values,
                "tokens_used": self.tokens_used._values,
            },
            "system": {
                "active_sessions": self.active_sessions._values,
                "websocket_connections": self.websocket_connections._values,
            },
            "websocket": {
                "connections_total": self.websocket_connections_total._values,
                "message_latency": self.websocket_message_latency.get_stats(),
                "events_sent": self.websocket_events_sent._values,
                "buffer_size_bytes": self.stream_processor_buffer_size._values,
            },
            "realtime": {
                "e2e_latency_stats": self.realtime_e2e_latency.get_stats(),
                "entity_matching_similarity": self.entity_matching_similarity.get_stats(),
            },
        }


metrics = MetricsCollector()
