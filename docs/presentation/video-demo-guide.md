# Video Demo Guide — MedRecord (BSG Entregable V)

> Operative guide for recording the final 30-minute project video.
> Adapted to the **actual** repository state as of 2026-05-01, not the
> aspirational design from earlier prompts.

## 0. Ground rules

- **Hard cap: 30 minutes.** Anything past 30:00 is not graded.
- **Honesty rules.** The headline rubric criterion is intellectual
  honesty. Lead with measured numbers, name the open issues (OI-1, OI-2)
  out loud, do not paint over gaps.
- **Production demo.** AWS deployment is template-only today
  (`infrastructure/aws/`). If AWS is not live by recording day, demo
  against `make up` locally and **say so on camera** — do not pretend
  localhost is AWS.
- **Project name on screen:** *MedRecord* (the repo dir is
  `health-record`, the product is MedRecord).

---

## 1. What is real vs. aspirational

Use this as the source of truth when scripting. If it is not in the
"Real" column, do not demo it as working.

| Area | Real (demo this) | Aspirational (do not demo as working) |
|---|---|---|
| Auth | JWT login (`POST /api/v1/auth/login`) | OAuth, multi-tenant SSO |
| Patients / Appointments | Full CRUD via frontend + backend | — |
| Medical Record page | `/appointments/:id/record` exists, gated by `VITE_ENABLE_REALTIME` | End-to-end realtime transcription (blocked by **OI-1**) |
| Batch transcription | `POST /api/v1/transcription` (backend) → AI service Whisper | — |
| RAG `/api/v1/query` | Single-request path works; **88% error rate at 10 concurrent** (OI-2) | High-concurrency querying |
| RAG ingestion | `POST /api/v1/ingest`; vademécum seeded via `scripts/ingest_vademecum` | Auto-ingest pipeline |
| Cost dashboard | `GET /api/v1/costs` (in-memory metrics, JWT required) | Real AWS billing integration (gap OI-5) |
| WebSocket streaming | Endpoint exists at `ws://localhost:8000/ws/session?session_id=...`; **blocked by OI-1** (torchaudio import) | Live realtime transcription, drug-interaction alerts <1s |
| Diarization | Resemblyzer + text-based fallback | — |
| RAGAS evaluation | Faithfulness 0.938, Ctx Precision 1.000, Answer Rel 0.964 (synthetic 8-Q fixture) | Production-quality validation on real consultations |
| Observability | Structured logs, in-process metrics | Grafana / Prometheus dashboards |

Source of truth for numbers: [`docs/delivery-4/01-results-and-metrics.md`](../delivery-4/01-results-and-metrics.md)
and [`ai-service/reports/`](../../ai-service/reports/).

---

## 2. Endpoints and URLs (cheat sheet)

Local (default; replace host if AWS is live):

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:3001/api/v1` |
| Backend health | `http://localhost:3001/api/v1/health` |
| AI service | `http://localhost:8000` |
| AI health | `http://localhost:8000/health` |
| AI Swagger | `http://localhost:8000/docs` |
| AI cost dashboard | `http://localhost:8000/api/v1/costs` (JWT) |
| AI WebSocket | `ws://localhost:8000/ws/session?session_id={id}` |
| ChromaDB | `http://localhost:8001` |

> The original prompt referenced `/api/v1/health` on port 8000 and a
> `/streaming` frontend route. **Neither exists.** Use the table above.

---

## 3. Pre-recording checklist

```bash
# 1. Bring stack up
make up                    # or docker compose up in ai-service/ + backend

# 2. Verify health
curl -s http://localhost:3001/api/v1/health | jq
curl -s http://localhost:8000/health | jq

# 3. Seed the vademécum (only first time)
docker exec medrecord-ai-service python -m scripts.ingest_vademecum

# 4. Confirm RAGAS baseline still passes
docker exec medrecord-ai-service pytest tests/ragas -m "not live and not performance"

# 5. Create a test user + a patient + an appointment via the UI
#    so the demo has navigable data.
```

Browser tabs to pin (in order):

1. Frontend `/login`
2. Frontend `/dashboard`
3. Frontend `/patients`
4. Frontend `/appointments/:id/record` (one prepared)
5. AI Swagger `/docs`
6. AI `/api/v1/costs` (logged in)
7. `docs/delivery-4/01-results-and-metrics.md` rendered

System hygiene: Do Not Disturb on, close mail/chat, hide bookmark bar
with personal links.

---

## 4. Script structure (28-30 min target)

| # | Segment | Time |
|---|---|---|
| 1 | Opening | 1:30 |
| 2 | Live demo (stable path) | 7-8 |
| 3 | Realtime + known issues | 3-4 |
| 4 | Architecture & ADRs | 7-8 |
| 5 | Measured results | 4-5 |
| 6 | Honest reflection | 3-4 |
| 7 | Close | 0:30 |

### Segment 1 — Opening (1-2 min)

Cover, in this order:

- Name: **MedRecord** — Spanish-language medical consultation
  documentation system.
- Problem in two sentences: physicians spend 30-40% of post-consult time
  on paperwork; MedRecord turns the audio of a consultation into
  structured notes (transcription, entity extraction, CIE-10,
  SOAP draft) plus a RAG-validated reference layer over a vademécum.
- Stack: React + TypeScript (Vite), Node.js + Express + Prisma,
  Python + FastAPI, ChromaDB, Redis, PostgreSQL, OpenAI (Whisper +
  GPT-4o family + `text-embedding-3-small`), Docker Compose; AWS
  deployment via Terraform templates.
- Two intended modes: **batch** (working today), **realtime streaming**
  (architecture in place, blocked by OI-1 — will be shown and
  acknowledged).
- Cohort line: AI/LLM Solution Architect.

### Segment 2 — Live demo, stable path (7-8 min)

Stick to flows that work end-to-end. Recommended order:

1. **Health checks** (~30 s)
   - `curl http://localhost:3001/api/v1/health | jq`
   - `curl http://localhost:8000/health | jq`
   - Narrate: backend, AI service, Postgres, Redis, ChromaDB, OpenAI.

2. **Auth + dashboard** (~1 min)
   - Log in via `/login`, land on `/dashboard`.
   - Note JWT-only auth; both services share `JWT_SECRET` byte-for-byte
     (ADR-003).

3. **Patient + appointment** (~2 min)
   - Create a patient, schedule an appointment, open the appointment.
   - This is the data layer (`/api/v1/patients`,
     `/api/v1/appointments`, Prisma + Postgres).

4. **Batch transcription + extraction** (~3 min)
   - Open the appointment's medical-record page.
   - Upload a prepared 5-8 min Spanish consult audio (synthetic — no
     real PII).
   - Show the resulting transcript, the extracted entities (symptoms,
     diagnoses, CIE-10 candidates), and the SOAP draft.
   - Narrate the pipeline: Whisper transcription → diarization
     (Resemblyzer + text fallback, ADR-005) → entity extraction
     (GPT-4o) → RAG validation against the vademécum (ChromaDB,
     ADR-002).

5. **RAG query** (~1 min)
   - In Swagger, run one `POST /api/v1/query` such as
     `"¿Cuáles son las contraindicaciones del ibuprofeno?"`.
   - Show the answer + sources + similarity scores.
   - **Do not** drive concurrent queries — OI-2 makes this fail loudly.

6. **Cost dashboard** (~1 min)
   - `GET /api/v1/costs` (with JWT).
   - State explicitly: "These figures come from the in-process metrics
     collector. Real AWS-billing integration is open issue OI-5."

### Segment 3 — Realtime, with honesty (3-4 min)

Two valid options — pick one before recording.

**Option A (preferred if OI-1 is fixed by recording day):**
Open the medical-record page with `VITE_ENABLE_REALTIME=true`, start a
session via `POST /api/v1/sessions`, connect to
`ws://localhost:8000/ws/session?session_id=...`, stream a short audio
clip, show incremental transcription + entity events arriving on the
WebSocket panel.

**Option B (if OI-1 is still open):**
1. Open `docs/architecture/diagrams/` and walk the streaming sequence
   diagram (ADR-006).
2. Show the implemented endpoint surface (`POST /api/v1/sessions`,
   `GET /ws/session`, session lifecycle in
   `ai-service/src/api/websocket/streaming.py`).
3. Show the load-test evidence: handshake median 59 ms, throughput 0
   events/s blocked by OI-1.
4. State plainly: "The streaming pipeline is wired end-to-end but a
   torchaudio import in the encoder leaks the connection; the fix is
   tracked as OI-1. I am not going to fake a working demo."

That last sentence is worth more rubric points than a flaky live demo.

### Segment 4 — Architecture & 3 key decisions (7-8 min)

Open the C4 diagram from `docs/architecture/diagrams/`. Walk:

- Frontend ↔ Backend (REST + JWT) ↔ AI service (REST + WebSocket).
- Data plane: PostgreSQL (clinical metadata), Redis (session +
  event buffer), ChromaDB (vector store).
- External: OpenAI (Whisper, GPT-4o family, embeddings).

Then walk three ADRs with **trade-offs** (not just choices):

1. **ADR-001 — Multi-tier LLM selection.** Why GPT-4o is the default,
   GPT-4o-mini for cheap validations, escalation policy. Trade-off:
   cost vs extraction precision on dosages.
2. **ADR-002 — ChromaDB over Pinecone.** Trade-off: zero ops cost and
   sufficient throughput at our document volume vs no managed
   replication / no auto-backup. Documented review trigger: > 80k
   vectors or retrieval p95 > 500 ms.
3. **ADR-006 — WebSocket streaming with intelligent buffering.** VAD-
   gated chunking, Redis event buffer for replay, entity matching to
   avoid duplicate extractions on incremental updates. Trade-off:
   complexity vs <1 s critical-alert latency budget.

Optional fourth if time allows: **ADR-005 (heuristic diarization)** or
**ADR-007 (cloud provider selection)**.

### Segment 5 — Measured results (4-5 min)

Pull straight from `docs/delivery-4/01-results-and-metrics.md`. Read
**measured** values, not targets:

- RAGAS (synthetic 8-Q fixture, 2026-04-30):
  Faithfulness **0.938**, Context Precision **1.000**, Answer
  Relevancy **0.964**, Context Recall **1.000**. Caveat out loud:
  this is a regression guardrail, not a production-quality claim.
- Event persistence load test: write p95 **14.45 ms**, throughput
  **712 writes/s** at 0% error.
- WebSocket handshake median **59 ms** (passes); streaming throughput
  **0 events/s** — fails, blocked by **OI-1**.
- `/api/v1/query` at 10 VUs: **88% failure rate** — fails, blocked by
  **OI-2** (slowapi miscalibration).
- Cost figures: cite the in-process numbers from
  `docs/delivery-4/02-cost-analysis.md` and the gap (OI-5).
- Coverage: state the actual `make coverage` output from the day of
  recording — do not invent a number.

### Segment 6 — Honest reflection (3-4 min)

Three things that worked, three that did not, three lessons.

**Worked:**
- Multi-tier LLM strategy (ADR-001) kept cost below baseline.
- ChromaDB local was the right call at this volume.
- RAGAS as a regression gate caught faithfulness drift early.

**Did not work as planned:**
- **OI-1:** torchaudio import in the streaming encoder leaks the
  WebSocket connection. Blocks realtime end-to-end measurement.
- **OI-2:** `/api/v1/query` rate limiter is miscalibrated; 88% errors at
  10 concurrent VUs.
- **OI-5:** Cost dashboard is in-process only — no AWS billing
  reconciliation yet.
- AWS: deployment templates exist in `infrastructure/aws/` but the
  stack is not live in the demo (if still true on recording day).

**Lessons:**
- Streaming has to be designed and load-tested from day 1; retrofitting
  is expensive.
- "RAGAS green" on a synthetic fixture is a guardrail, not a quality
  claim — be explicit about that to the audience.
- Cost telemetry is a non-functional requirement, not a feature; the
  gap to real billing matters.

### Segment 7 — Close (30 s)

- Repo URL.
- Pointer to `docs/delivery-4/` for measured results, `docs/adr/` for
  decisions, `docs/PRE_DELIVERY_CHECKLIST.md` for entrega status.
- Thank-you, name, cohort.

---

## 5. Slide deck (recommended)

Build in PowerPoint / Google Slides / Marp. Suggested slides:

1. Title — MedRecord, cohort, your name.
2. Problem + two-mode value prop.
3. Stack diagram with logos.
4. C4 container diagram (export from `docs/architecture/diagrams/`).
5. ADR-001 trade-off table (LLM tiers).
6. ADR-002 trade-off table (vector store).
7. ADR-006 streaming flow.
8. RAGAS table (measured).
9. Load-test table with OI-1 / OI-2 marked red.
10. Cost breakdown (cite source: in-process metrics).
11. What worked / what didn't / lessons.
12. Roadmap (link to `docs/delivery-4/06-roadmap.md`).
13. Close + repo URL.

Keep slides text-light; the spoken narration carries the points.

---

## 6. Recording setup

- **Software:** OBS Studio (1080p, 30 fps, MP4/H.264, ~5000 kbps) or
  Loom Pro for the 30-min cap.
- **Audio:** headset mic, quiet room, do a 30 s test pass first.
- **Layout:** slides on the left, terminal/browser on the right; or
  full-screen with deliberate transitions. Do not alt-tab chaotically.
- **Timer:** keep a visible timer (OBS overlay or phone) — the 30:00
  mark is hard.

Do-not-disturb on, hide notifications, hide personal bookmarks, hide
any browser tab that isn't part of the script.

---

## 7. Post-production

Minimal edits only:

- Trim silences > 5 s.
- Cut takes where you restarted a sentence.
- Title card (3 s) at the start: name, cohort.
- Optional captions on key numbers (RAGAS 0.938, OI-1, etc.).
- Export MP4, verify total runtime ≤ 30:00.

No music, no fancy transitions.

---

## 8. Distribution

1. Upload to YouTube (Unlisted) — or Google Drive with
   "Anyone with the link can view" — or Loom.
2. Verify the link plays in an incognito window with no login prompt.
3. Add a `## Video de Presentación` section to [`README.md`](../../README.md)
   with the URL and the recording date.
4. Commit: `docs: add final presentation video link (EV)`.

---

## 9. Self-check before submitting

Demo (12 pts):
- [ ] System actually runs in the video (cloud preferred; local + honest disclosure acceptable).
- [ ] Health, query, ingest are exercised.
- [ ] At least 3 representative flows (CRUD, batch transcription + extraction, RAG query).
- [ ] At least one error / out-of-scope path shown.

Architecture (10 pts):
- [ ] C4 diagram on screen and walked.
- [ ] 3 ADRs explained with trade-offs, not just decisions.
- [ ] RAG pipeline walked step by step.
- [ ] Security model (JWT, rate limiting) named.

Results & reflection (8 pts):
- [ ] Measured RAGAS numbers shown (0.938 faithfulness, etc.).
- [ ] Measured load-test numbers shown — including the failures.
- [ ] OI-1, OI-2, OI-5 named on camera.
- [ ] Concrete v2 priorities, not generic "we will improve X".

Logistics:
- [ ] Runtime ≤ 30:00.
- [ ] Link works in incognito.
- [ ] Link is in `README.md` and committed.
