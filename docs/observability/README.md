# Observability — MedRecord AI Service

This document describes the observability stack implemented in the AI service to satisfy BSG requirements (structured logging, health checks, cost monitoring, distributed tracing).

## Stack

| Concern | Implementation | Source |
|---|---|---|
| Structured logging | structlog with JSON renderer in production, console renderer in development | [`src/core/logging.py`](../../ai-service/src/core/logging.py) |
| Request/trace propagation | `X-Request-ID` header + `request_id_var` ContextVar | [`src/api/middleware/logging.py`](../../ai-service/src/api/middleware/logging.py) |
| Health checks | Component health aggregator (OpenAI, ChromaDB, custom) | [`src/core/health.py`](../../ai-service/src/core/health.py), [`src/api/endpoints/health.py`](../../ai-service/src/api/endpoints/health.py) |
| Metrics | In-process counters / gauges / histograms (HTTP, transcription, extraction, RAG, WebSocket, real-time E2E latency) | [`src/core/metrics.py`](../../ai-service/src/core/metrics.py), [`src/api/middleware/metrics.py`](../../ai-service/src/api/middleware/metrics.py) |
| Cost tracking | Per-event cost ledger + dashboard analytics | [`src/services/cost_tracker.py`](../../ai-service/src/services/cost_tracker.py), [`src/services/cost_dashboard.py`](../../ai-service/src/services/cost_dashboard.py) |
| Cost endpoint | BSG RF-018 dashboard shape | [`src/api/endpoints/costs.py`](../../ai-service/src/api/endpoints/costs.py) |

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Comprehensive component health (status, latency_ms, message, details). |
| `GET /health/live` | Kubernetes liveness probe. Always returns 200 if the process is up. |
| `GET /health/ready` | Kubernetes readiness probe. Returns 503 when critical components are unhealthy. |
| `GET /metrics` | All in-memory metrics (HTTP, transcription, extraction, RAG, WebSocket, real-time). |
| `GET /metrics/costs` | Compact cost / token rollup from the metrics counters. |
| `GET /api/v1/costs` | BSG RF-018 dashboard: period, total, budget %, projected month-end, per-service and batch-vs-realtime breakdowns, consultations processed, avg cost per consultation. |

### `/health` response shape

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 1284.31,
  "components": [
    { "name": "openai_api", "status": "healthy", "latency_ms": 156.4 },
    { "name": "vector_store", "status": "healthy", "latency_ms": 42.8 }
  ]
}
```

Overall status is `unhealthy` if any component is unhealthy, `degraded` if any is degraded, otherwise `healthy`.

### `/api/v1/costs` response shape

```json
{
  "period": "2026-05",
  "total_cost": 18.45,
  "budget": 50.0,
  "percent_used": 36.9,
  "projected_monthly": 55.35,
  "breakdown": { "whisper": 8.2, "gpt-4o": 7.15, "gpt-4o-mini": 2.3, "embeddings": 0.8 },
  "mode_breakdown": { "batch": 10.15, "realtime": 8.30 },
  "consultations_processed": 52,
  "avg_cost_per_consultation": 0.35,
  "cache_hit_rate": 0.0
}
```

Budget is sourced from `settings.monthly_budget_usd` (env: `MONTHLY_BUDGET_USD`).

## Structured Logging

Logs are emitted via `structlog` and include contextvars set by middleware (`request_id`, `user_id`, `session_id`, `connection_id`). In production (`ENVIRONMENT=production`) the renderer is JSON; in development it is colorized console output.

Example JSON record:

```json
{
  "timestamp": "2026-05-01T14:30:45.123Z",
  "level": "info",
  "service": "ai-service",
  "request_id": "req_abc123",
  "session_id": "session_xyz",
  "event": "Transcription chunk processed",
  "chunk_index": 42,
  "transcription_latency_ms": 1850
}
```

### Usage

```python
from src.core.logging import get_logger, LogContext

logger = get_logger(__name__)

with LogContext(request_id="req_abc123", session_id="sess_42"):
    logger.info("Transcription completed", duration=78.2, tokens=2500, cost_usd=0.18)
```

## Trace ID Propagation

The `LoggingMiddleware` reads `X-Request-ID` from the inbound request (or generates a UUID), stores it in a ContextVar so every log line in the request scope carries it, and echoes it back in the response. Internal calls forward this header to keep traces correlated across the frontend → backend → AI-service path.

## Metrics

The `MetricsCollector` is a process-local in-memory store (counters, gauges, histograms with p50/p95/p99). It is read by `/metrics` and partially aggregated by `/api/v1/costs`. For multi-replica production, swap in Prometheus client and export `/metrics` in the Prometheus text format — the collector's API is shaped to make that drop-in.

Real-time latency-relevant series:

- `realtime_e2e_latency_seconds` — audio received → event sent.
- `websocket_message_latency_seconds` — server → client delivery.
- `transcription_duration_seconds`, `extraction_duration_seconds` — per-stage processing time.
- `entity_matching_similarity_score` — distribution of entity match similarity values.

## Cost Tracking

`CostTracker` records each billable API event. `CostDashboard` derives session-level breakdowns, projected month-end spend, top cost drivers, and savings (cache, VAD). The `/api/v1/costs` endpoint exposes the BSG-shaped summary for the doctor-facing dashboard; richer analytics live in `CostDashboard.get_cost_breakdown()` and can be exposed when richer UI is built.

Budget alerts: `CostDashboard.check_budget_alert()` returns `warning` at >80% and `critical` at >90% of `monthly_budget_usd`.

## Reviewing Logs

```bash
# Production (JSON)
docker logs medrecord-ai-service 2>&1 | jq 'select(.level=="error")'
docker logs medrecord-ai-service 2>&1 | jq 'select(.request_id=="req_abc123")'

# Development (console renderer): logs are already colorized and human-readable.
ENVIRONMENT=development docker compose up
```

## Future Work

- Export `/metrics` in Prometheus text format for Grafana dashboards.
- Wire the `CostTracker` as a process-wide singleton and have stream/extraction services depend on it directly so `/api/v1/costs` can serve `CostDashboard.get_cost_breakdown()` instead of metrics-derived counters.
- Integrate Langfuse for prompt/response tracing (env scaffolding already present in `Settings`).
