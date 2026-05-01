# Load Test Report — 2026-04-30

Run from the `medrecord-ai-service` Docker container against the live local
stack (AI service @ `localhost:8000`, Postgres backend DB on port `5432`).
Tokens minted in-process via `src.security.auth.create_token` (JWT-only
contract — no `/auth/token` endpoint).

## Summary

| Test | Result | Headline metric |
|---|---|---|
| Event persistence | **PASS** | p95 14.45ms, 712 writes/sec, 0 errors |
| WebSocket connect | **PASS** | median connect 59ms (target <500ms) |
| WebSocket streaming | **FAIL** | 0 events/sec — server-side bug |
| WebSocket reconnection | **FAIL** | 0/3 reconnects — same server-side bug |
| Locust RAG (10 VUs / 30s) | **FAIL** | 88% failure rate on `/api/v1/query` |

## 1. Event persistence

Command:
```
python tests/load/event_persistence_load.py \
  --db postgresql://healthrecord:healthrecord_dev@host.docker.internal:5432/healthrecord \
  --sessions 10 --events 100
```

| Metric | Value | Target | Verdict |
|---|---|---|---|
| Write latency min | 6.57ms | — | — |
| Write latency median | 10.09ms | — | — |
| Write latency mean | 13.72ms | — | — |
| Write latency p95 | **14.45ms** | <50ms | PASS |
| Write latency p99 | 262.24ms | — | — |
| Write latency max | 360.99ms | — | — |
| Throughput | **712.09 writes/sec** | ≥50 | PASS |
| Error rate | **0.00%** (0 / 1000) | <1% | PASS |
| Total time | 1.40s for 1000 events | — | — |

The p99 spike (262ms) likely reflects connection-pool contention or a single
checkpoint flush; the table itself sustains the target write rate
comfortably.

## 2. WebSocket streaming load

Command:
```
python tests/load/websocket_load_test.py --url http://localhost:8000 \
  --sessions 3 --duration 10
```

| Metric | Value | Target | Verdict |
|---|---|---|---|
| Connection time min | 57.29ms | — | — |
| Connection time median | **59.00ms** | <500ms | PASS |
| Connection time mean | 65.19ms | — | — |
| Connection time max | 79.27ms | — | — |
| Events received | **0 / total** | — | FAIL |
| Event throughput | 0.00 events/sec | ≥50 | FAIL |
| Errors | 6 (`no close frame received or sent`) | — | FAIL |

The handshake is fast and well under target. Zero events came back because
the server crashes mid-handler before the receive loop starts (see Server
bugs §A below).

## 3. WebSocket reconnection

Command:
```
python tests/load/websocket_reconnection_test.py --url http://localhost:8000 --reconnects 3
```

| Metric | Value | Target | Verdict |
|---|---|---|---|
| Successful reconnects | 0 / 3 | ≥90% | FAIL |
| Server response | `4002 Session already active` after first attempt | — | — |

The first attempt fails the close handshake (`no close frame received or
sent`); attempts 2-3 are rejected outright with WS close code `4002`. Same
root cause as §2 — the connection-slot leak documented in Server bugs §A.

## 4. Locust — RAG queries (10 VUs, 30s)

Command (from `/app/`):
```
locust -f tests/load/locustfile.py --headless \
  --users 10 --spawn-rate 2 --run-time 30s \
  --host http://localhost:8000 \
  --csv reports/load_test_smoke RAGQueryUser
```

CSVs in this directory:
- [load_test_smoke_stats.csv](load_test_smoke_stats.csv)
- [load_test_smoke_failures.csv](load_test_smoke_failures.csv)
- [load_test_smoke_stats_history.csv](load_test_smoke_stats_history.csv)
- [load_test_smoke_exceptions.csv](load_test_smoke_exceptions.csv)

| Endpoint | Reqs | Fails | Median | p95 | p99 | RPS |
|---|---|---|---|---|---|---|
| `POST /api/v1/query` | 74 | **74 (100%)** | 9ms | 49ms | 210ms | 2.97 |
| `GET /health` | 10 | 0 (0%) | 570ms | 880ms | 880ms | 0.40 |
| **Aggregated** | 84 | 74 (88%) | 11ms | 610ms | 880ms | 3.37 |

Failure breakdown for `/api/v1/query`:
- 44 × HTTP 429 (rate-limited)
- 30 × HTTP 500

`/api/v1/query` does not meet NFR-003 (<3s p95) at this load — it can't be
evaluated meaningfully because the rate limiter rejects the majority of
requests before they reach the handler. `/health` is well under failure
thresholds but slow (~570ms median) because it issues a live OpenAI probe
on every call.

## Server bugs surfaced

### A. WebSocket handler leaks the connection slot on construction failure

When any error occurs between `connection_manager.connect(...)` at
[`streaming.py:71`](../../src/api/websocket/streaming.py#L71) and the `try`
block at [`streaming.py:187`](../../src/api/websocket/streaming.py#L187),
the slot is never released — `connection_manager.disconnect(...)` lives in
the `finally` at line 247, which is unreachable from above the `try`.

In this run, the trigger is a broken `torchaudio` install in the AI service
image: `StreamProcessor.__init__` at
[`streaming.py:109`](../../src/api/websocket/streaming.py#L109) imports
`silero_vad` → `torchaudio`, which fails on `_load_lib("_torchaudio")`.
Every WebSocket connect therefore registers a slot, then aborts, then
rejects every reconnect for that session with WS `4002`.

Two distinct fixes:
1. Fix the `torchaudio` install (or pin a compatible wheel) in the
   AI-service Docker image.
2. Move the processor/diarizer/extractor/coordinator construction inside
   the existing `try` block at line 187, OR wrap them in their own
   `try/except` that calls `connection_manager.disconnect(session_id)` on
   failure.

Either fix on its own is insufficient — the leak should be closed even if
the dependency is healthy, and the dependency needs fixing regardless so
sessions can actually stream.

### B. `/api/v1/query` rate limiter and 500s under low load

10 concurrent VUs in 30s produced 44 rate-limit responses (429) and 30
internal-server errors (500). At BSG's NFR-004 target of 50 queries/sec
this is unworkable. Worth checking the `slowapi` configuration on the
`/query` endpoint and capturing one of the 500 stack traces from the
service logs.

### C. `/health` includes a live OpenAI roundtrip

Median 570ms for `/health`. If this is the endpoint used by uptime probes
and load balancers, the OpenAI roundtrip should move to a separate
`/health/deep` (or run on a background timer with cached status).

## Test infrastructure notes

- All tests authenticate via `tests.load._auth.mint_token` — no manual
  token storage. The helper imports `src.security.auth.create_token` and
  signs with whatever `JWT_SECRET_KEY` the service was started with.
- Run from `ai-service/` (or with `PYTHONPATH=ai-service`) so the
  `tests.load._auth` import resolves.
- `locust` is **not** in `requirements.txt`. Installed ad-hoc for this run
  via `docker exec -u root medrecord-ai-service pip install locust`. If
  load testing should be reproducible in CI, add it to a dev/extras group.
- The event-persistence test points at the **backend** Prisma database
  (port 5432, db `healthrecord`), not the AI service's own DB
  (`medrecord_dev`). The `transcription_events` and `ai_sessions` tables
  are owned by the backend.
