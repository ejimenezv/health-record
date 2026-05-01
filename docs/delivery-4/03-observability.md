# 03 — Observability

The implemented stack is documented in
[`docs/observability/README.md`](../observability/README.md). This file
summarises it for E4 and points at what is **not** yet wired.

## What is implemented

| Concern | How | Source |
|---|---|---|
| Structured logging | `structlog` with JSON renderer in production, console in dev. ContextVars for `request_id`, `user_id`, `session_id`, `connection_id`. | [`src/core/logging.py`](../../ai-service/src/core/logging.py), [`src/api/middleware/logging.py`](../../ai-service/src/api/middleware/logging.py) |
| Trace propagation | `X-Request-ID` header read inbound, stored in a `ContextVar`, echoed in response, forwarded between services. | [`src/api/middleware/logging.py`](../../ai-service/src/api/middleware/logging.py) |
| Health checks | Component aggregator (OpenAI, ChromaDB, custom). `/health`, `/health/live`, `/health/ready`. | [`src/core/health.py`](../../ai-service/src/core/health.py), [`src/api/endpoints/health.py`](../../ai-service/src/api/endpoints/health.py) |
| Metrics | In-process counters / gauges / histograms (HTTP, transcription, extraction, RAG, WebSocket, real-time E2E). API-shape compatible with Prometheus client. | [`src/core/metrics.py`](../../ai-service/src/core/metrics.py), [`src/api/middleware/metrics.py`](../../ai-service/src/api/middleware/metrics.py) |
| Cost tracking + endpoint | Per-event ledger, BSG RF-018 dashboard at `GET /api/v1/costs`. | [`src/services/cost_tracker.py`](../../ai-service/src/services/cost_tracker.py), [`src/services/cost_dashboard.py`](../../ai-service/src/services/cost_dashboard.py), [`src/api/endpoints/costs.py`](../../ai-service/src/api/endpoints/costs.py) |
| Real-time series | `realtime_e2e_latency_seconds`, `websocket_message_latency_seconds`, `transcription_duration_seconds`, `extraction_duration_seconds`, `entity_matching_similarity_score`. | [`src/core/metrics.py`](../../ai-service/src/core/metrics.py) |

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Component health (status, latency_ms, message). Currently issues a live OpenAI roundtrip — see [OI-3](README.md#open-issues). |
| `GET /health/live` | K8s liveness — 200 if process is up. |
| `GET /health/ready` | K8s readiness — 503 when critical components are unhealthy. |
| `GET /metrics` | All in-memory metrics. |
| `GET /metrics/costs` | Compact cost / token rollup. |
| `GET /api/v1/costs` | BSG RF-018 dashboard (period, total, budget %, projected month-end, per-service & batch-vs-realtime breakdowns, consultations, avg cost/consultation). |

## What is **not** wired

These are deliberate v1 exclusions, listed here so they don't surface as
gaps later:

- **Prometheus / Grafana** — the `MetricsCollector` API is shaped to be a
  drop-in target for the Prometheus client, but the text-format exporter
  and a Grafana dashboard are not built. Tracked in
  [06-roadmap.md](06-roadmap.md).
- **Langfuse** — environment scaffolding exists in `Settings` but the
  client is not initialized and no spans are emitted.
- **CloudWatch alarms** — depends on the AWS deployment that is not yet
  provisioned (see [02-cost-analysis.md §3](02-cost-analysis.md#3-what-is-not-measured)).
- **Distributed tracing across services** — request IDs are propagated
  but there is no OpenTelemetry collector or trace store. Logs correlate
  by `request_id`; spans do not.

## SLOs and how they are observed today

| SLO | Observed via |
|---|---|
| `transcription_duration` p95 | `transcription_duration_seconds` histogram → `/metrics` |
| `extraction_duration` p95 | `extraction_duration_seconds` histogram → `/metrics` |
| Real-time E2E p95 | `realtime_e2e_latency_seconds` histogram → `/metrics` (currently empty — OI-1 blocks streaming sessions) |
| Cost budget | `/api/v1/costs` `percent_used` field; `CostDashboard.check_budget_alert()` returns `warning` >80%, `critical` >90% |
| Service health | `/health` aggregated status (`healthy` / `degraded` / `unhealthy`) |

## Reviewing logs

```bash
# Production (JSON)
docker logs medrecord-ai-service 2>&1 | jq 'select(.level=="error")'
docker logs medrecord-ai-service 2>&1 | jq 'select(.request_id=="req_abc123")'

# Development: console renderer (already colorized)
ENVIRONMENT=development docker compose up
```
