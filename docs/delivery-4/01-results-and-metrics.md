# 01 — Results and Metrics

All values below are **measured**, not estimated. Sources are linked.
Cells marked "not measured" are gaps to acknowledge, not placeholders.

## 1. KPIs vs. targets

| KPI | Target | Measured | Source | Status |
|---|---|---|---|---|
| RAGAS Faithfulness | > 0.80 | **0.938** | [`ragas_results.json`](../../ai-service/reports/ragas_results.json) | Pass |
| RAGAS Context Precision | > 0.75 | **1.000** | same | Pass |
| RAGAS Answer Relevancy | > 0.75 | **0.964** | same | Pass |
| RAGAS Context Recall | > 0.70 | **1.000** | same | Pass |
| Event persistence write p95 | < 50 ms | **14.45 ms** | [load test §1](../../ai-service/reports/2026-04-30/load_test_report.md) | Pass |
| Event persistence throughput | ≥ 50 writes/s | **712 writes/s** | same | Pass |
| WebSocket connect time (median) | < 500 ms | **59 ms** | [load test §2](../../ai-service/reports/2026-04-30/load_test_report.md) | Pass |
| WebSocket streaming throughput | ≥ 50 events/s | **0 events/s** | same | **Fail (OI-1)** |
| WebSocket reconnection success | ≥ 90% | **0/3** | [load test §3](../../ai-service/reports/2026-04-30/load_test_report.md) | **Fail (OI-1)** |
| `/api/v1/query` p95 under 10 VUs | < 3 s | n/a — 88% failure rate | [load test §4](../../ai-service/reports/2026-04-30/load_test_report.md) | **Fail (OI-2)** |
| Realtime transcription p95 | < 2 s | not measured end-to-end (blocked by OI-1) | — | Pending |
| Realtime extraction p95 | < 3 s | not measured end-to-end (blocked by OI-1) | — | Pending |
| Critical-alert latency p95 | < 1 s | not measured end-to-end (blocked by OI-1) | — | Pending |
| AI-service unit-test coverage | ≥ 60% | see `make coverage` output | [`reports/coverage.xml`](../../ai-service/reports/) | Run on demand |

The headline RAGAS numbers come from a synthetic 8-question fixture
(`tests/ragas/conftest.py`) — they validate that the RAG pipeline is
faithful to retrieved contexts but do **not** prove production quality on
real consultations. Treat them as a regression guardrail, not a quality
claim.

## 2. RAGAS — full breakdown

Run date: **2026-04-30 21:57 UTC** · Judge: OpenAI (RAGAS 0.1.4 default) ·
Dataset: synthetic Spanish medical Q&A, 8 questions, fixed contexts and
answers (no live retrieval).

| Metric | Score | Threshold | Status |
|---|---|---|---|
| Faithfulness | 0.938 | > 0.80 (RF-009) | Pass |
| Context Precision | 1.000 | > 0.75 (RF-012) | Pass |
| Answer Relevancy | 0.964 | — | Reference |
| Context Recall | 1.000 | — | Reference |

**Test suite:** 8 passed, 1 failed, 8 deselected (61.80 s).
The single failure is `test_diagnosis_quality` (faithfulness 0.500 on two
diagnosis questions whose synthetic answers contain facts not present in
the synthetic contexts). Documented as a fixture-quality issue, not a
regression — see [`ragas_run_summary.md`](../../ai-service/reports/ragas_run_summary.md).

**Not yet covered:**
- `-m live` — skipped (no `AI_SERVICE_TOKEN`; live RAG endpoint contract
  still under verification per the AI-service contract memory).
- `-m performance` — skipped (the perf module needs
  `RAGValidationCoordinator.validate_entity*` to be exposed first).

## 3. Load test results — 2026-04-30

Full report: [`reports/2026-04-30/load_test_report.md`](../../ai-service/reports/2026-04-30/load_test_report.md).
The four scenarios produced two strong passes and three failures rooted in
two distinct server-side bugs (OI-1, OI-2).

### 3.1 Event persistence (passes)

```
python tests/load/event_persistence_load.py --sessions 10 --events 100
```

| Metric | Value |
|---|---|
| Write latency median / p95 / p99 | 10.09 / 14.45 / 262.24 ms |
| Throughput | 712 writes/s |
| Error rate | 0.00% (0/1000) |
| Total time | 1.40 s |

The p99 spike (262 ms) is consistent with a single connection-pool flush
under burst writes. The table sustains the target write rate comfortably.

### 3.2 WebSocket connection handshake (passes)

| Metric | Value |
|---|---|
| Connection time min / median / max | 57.29 / 59.00 / 79.27 ms |

### 3.3 WebSocket streaming (fails — OI-1)

Zero events received, six `no close frame received or sent` errors.
Root cause: `StreamProcessor.__init__` in
[`streaming.py:109`](../../ai-service/src/api/websocket/streaming.py#L109)
imports `silero_vad → torchaudio`, which fails on `_load_lib("_torchaudio")`
in the current image. Because the connection slot is registered at line 71
but the cleanup `disconnect()` lives in the `finally` at line 247
(unreachable from above the `try` at line 187), the slot leaks on every
connect attempt and reconnects are rejected with WS close code `4002`.

**Fix outline (tracked in OI-1):**
1. Pin a compatible `torchaudio` wheel in the AI-service Dockerfile.
2. Move processor/diarizer/extractor/coordinator construction inside the
   existing `try` block at line 187, or wrap them in their own
   `try/except` that calls `connection_manager.disconnect(session_id)` on
   failure. Both fixes are needed — one closes the leak, the other
   restores the dependency.

### 3.4 Locust — RAG queries (fails — OI-2)

10 concurrent VUs / 30 s against `POST /api/v1/query`:

| Endpoint | Reqs | Fails | Median | p95 | p99 | RPS |
|---|---|---|---|---|---|---|
| `POST /api/v1/query` | 74 | **74 (100%)** | 9 ms | 49 ms | 210 ms | 2.97 |
| `GET /health` | 10 | 0 | 570 ms | 880 ms | 880 ms | 0.40 |

Failure breakdown: 44× HTTP 429, 30× HTTP 500. The rate limiter rejects
the majority of requests before they reach the handler, so the latency
columns above are not a meaningful reading of the handler itself.

**Action items (OI-2 + OI-3):**
- Re-tune the `slowapi` rate limit on `/api/v1/query` (current limit is
  too aggressive for the smoke profile).
- Capture one of the 500 stack traces from the AI-service logs and fix
  the underlying error.
- Split `/health` into a cached liveness probe and `/health/deep` that
  performs the OpenAI roundtrip; uptime probes should hit the cached one.

## 4. What "not measured" means here

The latency numbers the original prompt asked for (1.8 s realtime
transcription, 2.5 s realtime extraction, 0.7 s critical alerts) require
end-to-end runs through the streaming WebSocket. Until OI-1 is fixed,
those measurements cannot be taken honestly. The unit-test fixtures
exercise each stage in isolation but do not produce a defensible E2E p95.

This is a deliberate choice: a measured "blocked" is more useful for the
instructor than an unmeasured number that looks plausible.
