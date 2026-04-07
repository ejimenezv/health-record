# Prompt 16: Implement Observability Stack

## Objective
Implement comprehensive observability for the AI service including structured logging, metrics collection, distributed tracing, and health checks as required by BSG.

## Context
BSG requires observability capabilities:
- Structured logging with context propagation (HTTP + WebSocket sessions)
- Metrics for monitoring system health and performance
- Real-time streaming metrics (WebSocket latency, event flow, session state)
- Health endpoints for container orchestration
- Cost tracking and usage metrics

**Real-Time Architecture:** The AI Service uses WebSocket bidirectional streaming for real-time transcription and extraction. Observability must track WebSocket connection lifecycle, streaming latency (p50/p95/p99), event buffering, and session state.

## Tasks

### 1. Create Structured Logging Configuration
Create `src/core/logging.py`:

```python
import structlog
import logging
import sys
from typing import Optional
from contextvars import ContextVar

from src.core.config import settings

# Context variables for request tracking
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
session_id_var: ContextVar[Optional[str]] = ContextVar("session_id", default=None)
connection_id_var: ContextVar[Optional[str]] = ContextVar("connection_id", default=None)  # WebSocket connection tracking


def add_context_vars(logger, method_name, event_dict):
    """Add context variables to log entries."""
    request_id = request_id_var.get()
    user_id = user_id_var.get()
    session_id = session_id_var.get()
    connection_id = connection_id_var.get()

    if request_id:
        event_dict["request_id"] = request_id
    if user_id:
        event_dict["user_id"] = user_id
    if session_id:
        event_dict["session_id"] = session_id
    if connection_id:
        event_dict["connection_id"] = connection_id

    return event_dict


def configure_logging():
    """Configure structured logging for the application."""
    # Determine log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Configure structlog processors
    processors = [
        structlog.contextvars.merge_contextvars,
        add_context_vars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Add JSON or console renderer based on environment
    if settings.ENVIRONMENT == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)


def get_logger(name: Optional[str] = None) -> structlog.BoundLogger:
    """Get a configured logger instance."""
    return structlog.get_logger(name)


class LogContext:
    """Context manager for setting log context."""

    def __init__(
        self,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        connection_id: Optional[str] = None
    ):
        self.request_id = request_id
        self.user_id = user_id
        self.session_id = session_id
        self.connection_id = connection_id
        self._tokens = []

    def __enter__(self):
        if self.request_id:
            self._tokens.append(request_id_var.set(self.request_id))
        if self.user_id:
            self._tokens.append(user_id_var.set(self.user_id))
        if self.session_id:
            self._tokens.append(session_id_var.set(self.session_id))
        if self.connection_id:
            self._tokens.append(connection_id_var.set(self.connection_id))
        return self

    def __exit__(self, *args):
        for token in self._tokens:
            # Reset context vars
            pass
```

### 2. Create Logging Middleware
Create `src/api/middleware/logging.py`:

```python
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from src.core.logging import request_id_var, user_id_var

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request logging and context propagation."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(request_id)

        # Extract user ID from auth if available
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            user_id_var.set(user_id)

        # Log request start
        start_time = time.time()
        logger.info(
            "Request started",
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else None
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log exception
            logger.exception(
                "Request failed with exception",
                method=request.method,
                path=request.url.path,
                error=str(e)
            )
            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log request completion
        logger.info(
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2)
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response
```

### 3. Create Metrics Collector
Create `src/core/metrics.py`:

```python
from typing import Dict, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import threading
import time


@dataclass
class MetricValue:
    """Represents a metric value with timestamp."""
    value: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    labels: Dict[str, str] = field(default_factory=dict)


class Counter:
    """Thread-safe counter metric."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._values: Dict[str, float] = {}
        self._lock = threading.Lock()

    def inc(self, amount: float = 1, labels: Optional[Dict[str, str]] = None):
        """Increment the counter."""
        key = self._labels_key(labels or {})
        with self._lock:
            self._values[key] = self._values.get(key, 0) + amount

    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        """Get current value."""
        key = self._labels_key(labels or {})
        return self._values.get(key, 0)

    def _labels_key(self, labels: Dict[str, str]) -> str:
        return str(sorted(labels.items()))


class Gauge:
    """Thread-safe gauge metric."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._values: Dict[str, float] = {}
        self._lock = threading.Lock()

    def set(self, value: float, labels: Optional[Dict[str, str]] = None):
        """Set the gauge value."""
        key = self._labels_key(labels or {})
        with self._lock:
            self._values[key] = value

    def inc(self, amount: float = 1, labels: Optional[Dict[str, str]] = None):
        """Increment the gauge."""
        key = self._labels_key(labels or {})
        with self._lock:
            self._values[key] = self._values.get(key, 0) + amount

    def dec(self, amount: float = 1, labels: Optional[Dict[str, str]] = None):
        """Decrement the gauge."""
        self.inc(-amount, labels)

    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        """Get current value."""
        key = self._labels_key(labels or {})
        return self._values.get(key, 0)

    def _labels_key(self, labels: Dict[str, str]) -> str:
        return str(sorted(labels.items()))


class Histogram:
    """Histogram metric for tracking distributions."""

    def __init__(
        self,
        name: str,
        description: str,
        buckets: List[float] = None
    ):
        self.name = name
        self.description = description
        self.buckets = buckets or [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
        self._values: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def observe(self, value: float, labels: Optional[Dict[str, str]] = None):
        """Record an observation."""
        key = self._labels_key(labels or {})
        with self._lock:
            if key not in self._values:
                self._values[key] = []
            self._values[key].append(value)

    def get_stats(self, labels: Optional[Dict[str, str]] = None) -> Dict:
        """Get histogram statistics."""
        key = self._labels_key(labels or {})
        values = self._values.get(key, [])
        if not values:
            return {"count": 0, "sum": 0, "avg": 0, "min": 0, "max": 0}

        return {
            "count": len(values),
            "sum": sum(values),
            "avg": sum(values) / len(values),
            "min": min(values),
            "max": max(values)
        }

    def _labels_key(self, labels: Dict[str, str]) -> str:
        return str(sorted(labels.items()))


class MetricsCollector:
    """Central metrics collector for the application."""

    def __init__(self):
        # Request metrics
        self.requests_total = Counter(
            "http_requests_total",
            "Total HTTP requests"
        )
        self.request_duration = Histogram(
            "http_request_duration_seconds",
            "HTTP request duration"
        )

        # AI service metrics
        self.transcription_requests = Counter(
            "transcription_requests_total",
            "Total transcription requests"
        )
        self.transcription_duration = Histogram(
            "transcription_duration_seconds",
            "Transcription processing time"
        )
        self.transcription_audio_seconds = Counter(
            "transcription_audio_seconds_total",
            "Total audio seconds transcribed"
        )

        self.extraction_requests = Counter(
            "extraction_requests_total",
            "Total extraction requests"
        )
        self.extraction_duration = Histogram(
            "extraction_duration_seconds",
            "Extraction processing time"
        )

        self.rag_queries = Counter(
            "rag_queries_total",
            "Total RAG queries"
        )
        self.rag_query_duration = Histogram(
            "rag_query_duration_seconds",
            "RAG query processing time"
        )

        # Cost metrics
        self.api_cost_usd = Counter(
            "api_cost_usd_total",
            "Total API costs in USD"
        )
        self.tokens_used = Counter(
            "tokens_used_total",
            "Total tokens used"
        )

        # System metrics
        self.active_sessions = Gauge(
            "active_sessions",
            "Currently active transcription sessions"
        )
        self.websocket_connections = Gauge(
            "websocket_connections",
            "Active WebSocket connections"
        )

        # WebSocket streaming metrics (Real-Time)
        self.websocket_connections_total = Counter(
            "websocket_connections_total",
            "Total WebSocket connections established"
        )
        self.websocket_message_latency = Histogram(
            "websocket_message_latency_seconds",
            "WebSocket message round-trip latency",
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2]
        )
        self.websocket_events_sent = Counter(
            "websocket_events_sent_total",
            "Total WebSocket events sent by type"
        )
        self.stream_processor_buffer_size = Gauge(
            "stream_processor_buffer_bytes",
            "Current audio buffer size in bytes"
        )
        self.entity_matching_similarity = Histogram(
            "entity_matching_similarity_score",
            "Entity matching similarity scores",
            buckets=[0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]
        )

        # Real-time latency tracking (end-to-end)
        self.realtime_e2e_latency = Histogram(
            "realtime_e2e_latency_seconds",
            "End-to-end latency: audio received -> event sent",
            buckets=[0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10]
        )

    def get_all_metrics(self) -> Dict:
        """Get all metrics as dictionary."""
        return {
            "http": {
                "requests_total": self.requests_total._values,
                "request_duration": {
                    k: self.request_duration.get_stats(dict(eval(k)) if k != "()" else None)
                    for k in self.request_duration._values
                }
            },
            "transcription": {
                "requests_total": self.transcription_requests._values,
                "duration_stats": self.transcription_duration.get_stats(),
                "audio_seconds_total": self.transcription_audio_seconds._values
            },
            "extraction": {
                "requests_total": self.extraction_requests._values,
                "duration_stats": self.extraction_duration.get_stats()
            },
            "rag": {
                "queries_total": self.rag_queries._values,
                "duration_stats": self.rag_query_duration.get_stats()
            },
            "costs": {
                "api_cost_usd": self.api_cost_usd._values,
                "tokens_used": self.tokens_used._values
            },
            "system": {
                "active_sessions": self.active_sessions._values,
                "websocket_connections": self.websocket_connections._values
            },
            "websocket": {
                "connections_total": self.websocket_connections_total._values,
                "message_latency": self.websocket_message_latency.get_stats(),
                "events_sent": self.websocket_events_sent._values,
                "buffer_size_bytes": self.stream_processor_buffer_size._values
            },
            "realtime": {
                "e2e_latency_stats": self.realtime_e2e_latency.get_stats(),
                "entity_matching_similarity": self.entity_matching_similarity.get_stats()
            }
        }


# Singleton instance
metrics = MetricsCollector()
```

### 4. Create Health Check Service
Create `src/core/health.py`:

```python
import structlog
from typing import Dict, Optional, List
from dataclasses import dataclass
from enum import Enum
import asyncio
import time

logger = structlog.get_logger()


class HealthStatus(str, Enum):
    """Health status values."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class ComponentHealth:
    """Health status of a single component."""
    name: str
    status: HealthStatus
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    details: Optional[Dict] = None


@dataclass
class SystemHealth:
    """Overall system health."""
    status: HealthStatus
    components: List[ComponentHealth]
    version: str
    uptime_seconds: float


class HealthChecker:
    """Checks health of system components."""

    def __init__(self):
        self._start_time = time.time()
        self._checks = {}

    def register_check(self, name: str, check_fn):
        """Register a health check function."""
        self._checks[name] = check_fn

    async def check_all(self) -> SystemHealth:
        """Run all health checks."""
        from src.core.config import settings

        components = []
        overall_status = HealthStatus.HEALTHY

        # Run all checks concurrently
        tasks = []
        for name, check_fn in self._checks.items():
            tasks.append(self._run_check(name, check_fn))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                components.append(ComponentHealth(
                    name="unknown",
                    status=HealthStatus.UNHEALTHY,
                    message=str(result)
                ))
                overall_status = HealthStatus.UNHEALTHY
            else:
                components.append(result)
                if result.status == HealthStatus.UNHEALTHY:
                    overall_status = HealthStatus.UNHEALTHY
                elif result.status == HealthStatus.DEGRADED and overall_status == HealthStatus.HEALTHY:
                    overall_status = HealthStatus.DEGRADED

        return SystemHealth(
            status=overall_status,
            components=components,
            version=settings.VERSION,
            uptime_seconds=time.time() - self._start_time
        )

    async def _run_check(self, name: str, check_fn) -> ComponentHealth:
        """Run a single health check with timing."""
        start = time.time()
        try:
            result = await check_fn()
            latency = (time.time() - start) * 1000

            if isinstance(result, ComponentHealth):
                result.latency_ms = latency
                return result

            return ComponentHealth(
                name=name,
                status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                latency_ms=latency
            )
        except Exception as e:
            logger.error(f"Health check failed: {name}", error=str(e))
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                latency_ms=(time.time() - start) * 1000,
                message=str(e)
            )

    async def check_database(self) -> ComponentHealth:
        """Check database connectivity."""
        from src.db.session import get_db_session

        try:
            async with get_db_session() as session:
                await session.execute("SELECT 1")
            return ComponentHealth(
                name="database",
                status=HealthStatus.HEALTHY
            )
        except Exception as e:
            return ComponentHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )

    async def check_vector_store(self) -> ComponentHealth:
        """Check vector store connectivity."""
        from src.rag.vector_store import get_vector_store

        try:
            store = get_vector_store()
            # Simple connectivity check
            count = await store.count()
            return ComponentHealth(
                name="vector_store",
                status=HealthStatus.HEALTHY,
                details={"document_count": count}
            )
        except Exception as e:
            return ComponentHealth(
                name="vector_store",
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )

    async def check_openai(self) -> ComponentHealth:
        """Check OpenAI API connectivity."""
        from src.core.config import settings
        import httpx

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    timeout=5.0
                )
                if response.status_code == 200:
                    return ComponentHealth(
                        name="openai_api",
                        status=HealthStatus.HEALTHY
                    )
                else:
                    return ComponentHealth(
                        name="openai_api",
                        status=HealthStatus.DEGRADED,
                        message=f"Status code: {response.status_code}"
                    )
        except Exception as e:
            return ComponentHealth(
                name="openai_api",
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )

    async def check_redis(self) -> ComponentHealth:
        """Check Redis connectivity and session state."""
        from src.core.config import settings
        import redis.asyncio as aioredis

        try:
            redis_client = aioredis.from_url(
                f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                encoding="utf-8",
                decode_responses=True
            )

            # Test ping
            await redis_client.ping()

            # Check memory usage
            info = await redis_client.info("memory")
            used_memory_mb = info.get("used_memory", 0) / (1024 * 1024)

            await redis_client.close()

            return ComponentHealth(
                name="redis",
                status=HealthStatus.HEALTHY,
                details={
                    "used_memory_mb": round(used_memory_mb, 2)
                }
            )
        except Exception as e:
            return ComponentHealth(
                name="redis",
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )


# Singleton instance
health_checker = HealthChecker()


def setup_health_checks():
    """Register all health checks."""
    health_checker.register_check("database", health_checker.check_database)
    health_checker.register_check("vector_store", health_checker.check_vector_store)
    health_checker.register_check("openai_api", health_checker.check_openai)
    health_checker.register_check("redis", health_checker.check_redis)  # Critical for real-time
```

### 5. Create Health Endpoints
Create `src/api/endpoints/health.py`:

```python
from fastapi import APIRouter, Response
from typing import Dict
import structlog

from src.core.health import health_checker, HealthStatus, SystemHealth
from src.core.metrics import metrics

logger = structlog.get_logger()
router = APIRouter()


@router.get("/health")
async def health_check() -> Dict:
    """
    Comprehensive health check endpoint.

    Returns detailed health status of all components.
    BSG Required Endpoint.
    """
    system_health = await health_checker.check_all()

    return {
        "status": system_health.status.value,
        "version": system_health.version,
        "uptime_seconds": round(system_health.uptime_seconds, 2),
        "components": [
            {
                "name": c.name,
                "status": c.status.value,
                "latency_ms": round(c.latency_ms, 2) if c.latency_ms else None,
                "message": c.message,
                "details": c.details
            }
            for c in system_health.components
        ]
    }


@router.get("/health/live")
async def liveness_probe(response: Response) -> Dict:
    """
    Kubernetes liveness probe.

    Returns 200 if the service is running.
    Used by container orchestrators.
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe(response: Response) -> Dict:
    """
    Kubernetes readiness probe.

    Returns 200 if the service is ready to accept traffic.
    Checks critical dependencies.
    """
    system_health = await health_checker.check_all()

    if system_health.status == HealthStatus.UNHEALTHY:
        response.status_code = 503
        return {
            "status": "not_ready",
            "reason": "Critical components unhealthy"
        }

    return {"status": "ready"}


@router.get("/metrics")
async def get_metrics() -> Dict:
    """
    Prometheus-compatible metrics endpoint.

    Returns all collected metrics.
    """
    return metrics.get_all_metrics()


@router.get("/metrics/costs")
async def get_cost_metrics() -> Dict:
    """
    Cost-specific metrics endpoint.

    Returns API usage and cost breakdown.
    """
    return {
        "total_cost_usd": sum(metrics.api_cost_usd._values.values()),
        "total_tokens": sum(metrics.tokens_used._values.values()),
        "transcription": {
            "requests": sum(metrics.transcription_requests._values.values()),
            "audio_seconds": sum(metrics.transcription_audio_seconds._values.values())
        },
        "extraction": {
            "requests": sum(metrics.extraction_requests._values.values())
        },
        "rag": {
            "queries": sum(metrics.rag_queries._values.values())
        }
    }
```

### 6. Create Metrics Middleware
Create `src/api/middleware/metrics.py`:

```python
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.metrics import metrics


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for collecting request metrics."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Record request
        labels = {
            "method": request.method,
            "path": self._normalize_path(request.url.path)
        }

        start_time = time.time()

        try:
            response = await call_next(request)
            labels["status"] = str(response.status_code)
        except Exception:
            labels["status"] = "500"
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time
            metrics.requests_total.inc(labels=labels)
            metrics.request_duration.observe(duration, labels=labels)

        return response

    def _normalize_path(self, path: str) -> str:
        """Normalize path for metric labels (remove IDs)."""
        parts = path.split("/")
        normalized = []
        for part in parts:
            # Replace UUIDs and numeric IDs with placeholders
            if self._is_id(part):
                normalized.append("{id}")
            else:
                normalized.append(part)
        return "/".join(normalized)

    def _is_id(self, part: str) -> bool:
        """Check if path part looks like an ID."""
        if not part:
            return False
        # UUID pattern
        if len(part) == 36 and part.count("-") == 4:
            return True
        # Numeric ID
        if part.isdigit():
            return True
        return False
```

### 7. Write Observability Tests
Create `tests/unit/test_observability.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch

from src.core.metrics import Counter, Gauge, Histogram, MetricsCollector
from src.core.health import HealthChecker, HealthStatus, ComponentHealth


class TestCounter:
    """Tests for Counter metric."""

    def test_increment(self):
        counter = Counter("test", "Test counter")
        counter.inc()
        assert counter.get() == 1

    def test_increment_with_amount(self):
        counter = Counter("test", "Test counter")
        counter.inc(5)
        assert counter.get() == 5

    def test_increment_with_labels(self):
        counter = Counter("test", "Test counter")
        counter.inc(labels={"method": "GET"})
        counter.inc(labels={"method": "POST"})
        assert counter.get(labels={"method": "GET"}) == 1
        assert counter.get(labels={"method": "POST"}) == 1


class TestGauge:
    """Tests for Gauge metric."""

    def test_set(self):
        gauge = Gauge("test", "Test gauge")
        gauge.set(10)
        assert gauge.get() == 10

    def test_inc_dec(self):
        gauge = Gauge("test", "Test gauge")
        gauge.inc()
        gauge.inc()
        gauge.dec()
        assert gauge.get() == 1


class TestHistogram:
    """Tests for Histogram metric."""

    def test_observe(self):
        histogram = Histogram("test", "Test histogram")
        histogram.observe(0.5)
        histogram.observe(1.0)
        histogram.observe(1.5)

        stats = histogram.get_stats()
        assert stats["count"] == 3
        assert stats["sum"] == 3.0
        assert stats["avg"] == 1.0


class TestHealthChecker:
    """Tests for health checker."""

    @pytest.fixture
    def checker(self):
        return HealthChecker()

    @pytest.mark.asyncio
    async def test_healthy_check(self, checker):
        async def healthy_check():
            return ComponentHealth(
                name="test",
                status=HealthStatus.HEALTHY
            )

        checker.register_check("test", healthy_check)
        result = await checker.check_all()

        assert result.status == HealthStatus.HEALTHY
        assert len(result.components) == 1

    @pytest.mark.asyncio
    async def test_unhealthy_check(self, checker):
        async def unhealthy_check():
            return ComponentHealth(
                name="test",
                status=HealthStatus.UNHEALTHY,
                message="Connection failed"
            )

        checker.register_check("test", unhealthy_check)
        result = await checker.check_all()

        assert result.status == HealthStatus.UNHEALTHY

    @pytest.mark.asyncio
    async def test_check_exception(self, checker):
        async def failing_check():
            raise Exception("Check failed")

        checker.register_check("test", failing_check)
        result = await checker.check_all()

        assert result.status == HealthStatus.UNHEALTHY
```

## Expected Deliverables
- `src/core/logging.py` - Structured logging configuration
- `src/core/metrics.py` - Metrics collector
- `src/core/health.py` - Health check service
- `src/api/middleware/logging.py` - Logging middleware
- `src/api/middleware/metrics.py` - Metrics middleware
- `src/api/endpoints/health.py` - Health endpoints
- `tests/unit/test_observability.py` - Unit tests

## Verification Steps
1. Structured logs include request_id, user_id, session_id, connection_id
2. Metrics are collected for all API requests (HTTP + WebSocket)
3. WebSocket-specific metrics tracked (latency, events, buffer size)
4. Health endpoint returns component status (including Redis)
5. Liveness/readiness probes work correctly
6. Cost metrics are tracked accurately
7. Logs are JSON-formatted in production
8. Real-time latency metrics (p50/p95/p99) are captured
9. Entity matching similarity scores are tracked

## Notes
- Use structlog for consistent structured logging
- Context variables propagate across async calls (HTTP + WebSocket)
- Health checks are non-blocking with timeouts
- Metrics can be scraped by Prometheus
- **WebSocket Observability:** Track connection lifecycle, message latency, event flow
- **Real-Time Latency:** Monitor p50/p95/p99 for end-to-end streaming
- **Redis Health:** Critical for session state - include in readiness probe
- **Entity Matching:** Track similarity scores to tune thresholds (0.70/0.85/1.0)
