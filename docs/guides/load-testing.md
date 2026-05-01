# Load Testing Guide

How to run the AI service load and performance suite, what each script
exercises, and where to find historical results.

## Suite layout

All scripts live in [`ai-service/tests/load/`](../../ai-service/tests/load/):

| File | Type | Purpose |
|---|---|---|
| [`_auth.py`](../../ai-service/tests/load/_auth.py) | helper | Mints JWTs in-process via `src.security.auth.create_token`. No `/auth/token` endpoint exists in the live contract. |
| [`locustfile.py`](../../ai-service/tests/load/locustfile.py) | Locust | REST scenarios: `StreamingSessionUser`, `BatchTranscriptionUser`, `RAGQueryUser`, `AdminUser`. |
| [`benchmark.py`](../../ai-service/tests/load/benchmark.py) | pytest | Per-component micro-benchmarks (VAD, embedding, vector search, extraction, concurrency). |
| [`websocket_load_test.py`](../../ai-service/tests/load/websocket_load_test.py) | asyncio | N concurrent WebSocket sessions streaming 20ms PCM frames. |
| [`websocket_reconnection_test.py`](../../ai-service/tests/load/websocket_reconnection_test.py) | asyncio | Repeated reconnect to the same session. |
| [`event_persistence_load.py`](../../ai-service/tests/load/event_persistence_load.py) | asyncio | Concurrent INSERTs into `transcription_events` (backend Postgres). |
| [`run_load_test.sh`](../../ai-service/tests/load/run_load_test.sh) | shell | Runs the canonical Locust scenarios in sequence. |
| [`analyze_results.py`](../../ai-service/tests/load/analyze_results.py) | helper | Converts Locust `*_stats.csv` into a markdown report. |
| [`load_test.js`](../../ai-service/tests/load/load_test.js) | k6 | Minimal BSG smoke (≥10 VUs against `/api/v1/health`). |

## Targets

| Surface | Target | Source |
|---|---|---|
| WebSocket connect (median) | <500ms | NFR-real-time |
| End-to-end stream latency (p95) | <2s | NFR-real-time |
| CRITICAL alert delivery | <1s | NFR-real-time |
| Event throughput | ≥50 events/sec across all sessions | NFR-real-time |
| Event persistence write (p95) | <50ms | NFR-real-time |
| RAG query (p95) | <3s | NFR-003 |
| Concurrent transcriptions | ≥10 | NFR-004 |
| Batch transcription completion | <120s | NFR-001 |

## Prerequisites

1. **Stack up**: AI service, Postgres (backend DB), Redis. Docker Compose
   in [`ai-service/`](../../ai-service/) brings up the AI side; the
   backend Prisma DB lives on host port `5432` and is what the persistence
   test writes to (the AI service's own DB does **not** have those
   tables).
2. **Locust**: not in [`requirements.txt`](../../ai-service/requirements.txt).
   Install once in the container:
   ```bash
   docker exec -u root medrecord-ai-service pip install locust
   ```
3. **JWT_SECRET_KEY**: tests sign tokens with whatever value is in the
   running service's environment, so no extra config is needed — the
   helper imports the same module the service uses.

## Running

All commands assume the working directory is the repo root and the AI
service container is named `medrecord-ai-service`.

### REST suite (Locust)

```bash
docker exec medrecord-ai-service bash -lc '
cd /app && mkdir -p reports && \
locust -f tests/load/locustfile.py --headless \
  --users 10 --spawn-rate 2 --run-time 30s \
  --host http://localhost:8000 \
  --csv reports/<run_name> RAGQueryUser'
```

To run the full canonical sweep (5 scenarios, ~12 minutes):

```bash
docker exec medrecord-ai-service bash -lc 'cd /app && tests/load/run_load_test.sh'
```

User classes available: `StreamingSessionUser`, `BatchTranscriptionUser`,
`RAGQueryUser`, `AdminUser`. Pass an empty class name for the mixed-load
default.

### WebSocket streaming load

```bash
docker exec medrecord-ai-service bash -lc \
  'cd /app && python tests/load/websocket_load_test.py \
    --url http://localhost:8000 --sessions 10 --duration 30'
```

`--token` overrides the auto-minted JWT. `--sub` and `--role` shape the
minted token's claims.

### WebSocket reconnection

```bash
docker exec medrecord-ai-service bash -lc \
  'cd /app && python tests/load/websocket_reconnection_test.py \
    --url http://localhost:8000 --reconnects 5'
```

The 5-second wait between attempts is intentional — the server's
`connection_manager.disconnect` runs in a `finally` block that lags the
client close by hundreds of ms.

### Event persistence

Points at the **backend** Prisma database, not the AI service's DB:

```bash
docker exec medrecord-ai-service bash -lc \
  'cd /app && python tests/load/event_persistence_load.py \
    --db postgresql://healthrecord:healthrecord_dev@host.docker.internal:5432/healthrecord \
    --sessions 10 --events 100'
```

Or set `DATABASE_URL` in the environment and omit `--db`.

### k6 BSG smoke

```bash
k6 run ai-service/tests/load/load_test.js
```

## Auth model

There is **no** `/auth/token` endpoint on the AI service. Tokens are
minted in-process by [`tests/load/_auth.py`](../../ai-service/tests/load/_auth.py),
which calls `src.security.auth.create_token` — the same helper the
integration tests use ([`tests/integration/conftest.py`](../../ai-service/tests/integration/conftest.py)).

Override with `LOADTEST_JWT=<token>` if you want a specific identity.

## Live REST contract (relevant subset)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/v1/sessions` | Body: `{patient_id?, doctor_id?, appointment_id?, specialty, metadata?}`. Response wrapped: `{session: {session_id, websocket_url, ...}, message}`. |
| `GET` | `/api/v1/sessions/{id}` | Returns session status. |
| `DELETE` | `/api/v1/sessions/{id}` | Ends the session. There is **no** `/finalize` endpoint. |
| `GET` | `/api/v1/sessions` | Paginated list. |
| `POST` | `/api/v1/query` | RAG. Body: `{query, top_k}`. |
| `POST` | `/api/v1/ingest` | Body: `{documents: [{content, metadata}]}`. |
| `POST` | `/api/v1/transcribe` | Legacy batch. Body: `{audio_base64, language, use_vad}`. |
| `WS` | `/ws/session?session_id=…&token=…` | 20ms PCM frames at 16kHz mono = 640-byte chunks. |

## Adding a new scenario

1. If it fits Locust, add a `HttpUser` subclass to
   [`locustfile.py`](../../ai-service/tests/load/locustfile.py); call
   `auth_headers(...)` in `on_start`.
2. If it needs a WebSocket or DB, write a stand-alone asyncio script next
   to [`websocket_load_test.py`](../../ai-service/tests/load/websocket_load_test.py),
   import `mint_token` from `tests.load._auth`, and follow the existing
   pattern (seed via REST → exercise → cleanup).
3. Save results under `ai-service/reports/<YYYY-MM-DD>/` and link them
   from a fresh markdown summary alongside the CSVs.

## Historical results

- **2026-04-30** — [load_test_report.md](../../ai-service/reports/2026-04-30/load_test_report.md).
  Event persistence PASS (p95 14.45ms, 712 writes/sec). WebSocket and
  Locust runs surfaced three live-system issues (WS slot leak on
  `StreamProcessor.__init__` failure, `/query` rate-limit/500 storm under
  10 VUs, slow `/health` due to live OpenAI probe).

## Known issues that affect tests today

- **Broken `torchaudio` in the AI-service Docker image** — every WS
  connect crashes inside `StreamProcessor.__init__`. Until this is fixed,
  the WebSocket streaming and reconnection tests cannot pass even when
  the test logic itself is correct.
- **WS slot leak on construction failure** — see
  [`streaming.py:71`](../../ai-service/src/api/websocket/streaming.py#L71)
  vs the `try` block at line 187. Any error between the `connect()` call
  and the `try:` leaves the slot held. Move the processor construction
  inside the `try` (or wrap it).
- **`/api/v1/query` 500 + 429 under modest load** — the slowapi limiter
  rejects the majority of requests at 10 VUs / ~3 RPS. Either raise the
  limit or run RAG load tests with fewer concurrent users until tuned.
- **`/health` does a live OpenAI roundtrip** — adds ~570ms to every
  call. Keep this in mind when interpreting `/health` latencies, or move
  the deep check to a separate path.
