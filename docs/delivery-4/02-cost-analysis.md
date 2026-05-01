# 02 — Cost Analysis

## 1. What is implemented

| Concern | Implementation | Source |
|---|---|---|
| Per-event cost ledger | `CostTracker` records every billable API call (Whisper, GPT-4o, GPT-4o-mini, embeddings) with tokens, mode (batch/realtime), and `cost_usd` | [`ai-service/src/services/cost_tracker.py`](../../ai-service/src/services/cost_tracker.py) |
| Session / month rollups | `CostDashboard` derives session-level breakdowns, projected month-end spend, top cost drivers, and savings (cache, VAD) | [`ai-service/src/services/cost_dashboard.py`](../../ai-service/src/services/cost_dashboard.py) |
| BSG RF-018 endpoint | `GET /api/v1/costs` returns the dashboard shape: period, total, budget %, projected, per-service and batch-vs-realtime breakdowns, consultations, avg cost/consultation | [`ai-service/src/api/endpoints/costs.py`](../../ai-service/src/api/endpoints/costs.py) |
| Compact metrics rollup | `GET /metrics/costs` for ops dashboards | same |
| Budget alerts | `CostDashboard.check_budget_alert()` returns `warning` at >80% and `critical` at >90% of `MONTHLY_BUDGET_USD` | [`cost_dashboard.py`](../../ai-service/src/services/cost_dashboard.py) |
| Model degradation | Settings expose `enable_cost_optimization` and per-tier model selection so the dashboard can drive a budget-aware switch | [`ai-service/src/core/config.py`](../../ai-service/src/core/config.py) |

The cost surface is wired and tested. What it lacks is **measured volume
under real production load** — see §3.

## 2. Per-event pricing used by the tracker

These come from the OpenAI public price list as of 2026-04 and are the
values the tracker uses to compute `cost_usd` on every call. They are the
ground truth for any number this document quotes per consultation.

| Service | Unit | Price (USD) |
|---|---|---|
| Whisper API (transcription) | per minute of audio | 0.006 |
| GPT-4o (extraction / RAG) | per 1M input tokens | 2.50 |
| GPT-4o (extraction / RAG) | per 1M output tokens | 10.00 |
| GPT-4o-mini (validation, fallback) | per 1M input tokens | 0.15 |
| GPT-4o-mini (validation, fallback) | per 1M output tokens | 0.60 |
| `text-embedding-3-small` | per 1M tokens | 0.020 |

Refer to `cost_tracker.py` for the authoritative table — if pricing
shifts, the source there is the one to trust.

## 3. What is **not** measured

| Claim the original plan made | Status today |
|---|---|
| "AWS billing for 2 months at $91.50/mo" | Not measured. There is no AWS deployment yet — the system runs in Docker locally and has not been promoted. |
| "$0.21–0.23 per consultation in batch mode" | Not measured at scale. The tracker computes this per session, but the corpus of completed sessions is too small to publish an average. |
| "$0.25–0.28 per consultation in realtime mode" | Not measured. Realtime streaming is blocked on OI-1; no realtime sessions have completed end to end. |
| "EC2 t3.medium $30.50/mo" | Not measured. Infrastructure-as-code is in `infrastructure/aws/terraform/` but has not been applied. |

The original prompt assumed an AWS deployment with two months of
operational data. That is the gap to close before final submission.

## 4. Modeled cost per consultation (analytic, not measured)

Useful as a planning tool — these come from the per-event prices in §2
applied to the workload assumptions in [`docs/delivery-2/01-architecture-design.md`](../delivery-2/01-architecture-design.md).
They are **not** a substitute for measurement.

Assumptions for a 45-minute consultation:
- 45 min audio → Whisper API: 45 × $0.006 = **$0.270**
- Diarization adds ~5K input + 1K output GPT-4o-mini tokens: $0.001
- Extraction (GPT-4o): ~3K input + 2K output → $0.0275
- RAG retrieval (embeddings + GPT-4o): ~500 embed + 4K in + 1.5K out → ~$0.025
- Real-time streaming overhead (per-chunk extraction every ~30 s of voice):
  ~25 chunks × ~1K tokens GPT-4o-mini → ~$0.020 incremental over batch.

| Mode | Modeled per consultation |
|---|---|
| Batch | ~ $0.32 |
| Realtime (with VAD) | ~ $0.34 |
| Pure streaming (no VAD) | ~ $0.42 |

The VAD savings (~20% vs. pure streaming) are an analytic prediction
based on typical 30–35% silence in clinical conversation, not a measured
value from this codebase.

These figures bracket the original prompt's $0.21–0.30 range but trend
higher because Whisper at $0.006/min already accounts for 80%+ of the
per-consultation cost — there is no silver-bullet optimization on the
managed-API path.

## 5. Optimizations actually implemented

| # | Optimization | Where | Verifiable result |
|---|---|---|---|
| 1 | Multi-tier model selection (GPT-4o, GPT-4o-mini, fallback) | [`config.py`](../../ai-service/src/core/config.py) + extraction service | Configured, not yet load-tested |
| 2 | Embeddings cache | RAG service | Implemented; cache hit rate exposed via `/api/v1/costs` (`cache_hit_rate` field) |
| 3 | VAD pre-filtering of silence before streaming to Whisper | Streaming path (currently broken — OI-1) | Will reduce Whisper cost once OI-1 is fixed |
| 4 | ChromaDB local instead of managed vector DB | `docker-compose.yml` | Avoids Pinecone-class fees (~$50/mo at this volume) |
| 5 | Budget circuit breaker | `CostDashboard.check_budget_alert()` | `warning` >80%, `critical` >90% of `MONTHLY_BUDGET_USD` |

## 6. To close before final submission

1. Apply the Terraform stack in `infrastructure/aws/terraform/` and run a
   small batch of consultations end to end.
2. Pull two days of `/api/v1/costs` output to populate this document with
   measured per-consultation cost.
3. Cross-check against the AWS Billing Dashboard for the same period to
   reconcile the in-process tracker with vendor-billed cost.
