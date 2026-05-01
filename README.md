# MedRecord - Medical Records System

Sistema de registros medicos con transcripcion de consultas mediante IA en
tiempo real (español): WebSocket bidireccional, extracción incremental de
síntomas / diagnósticos / prescripciones, alertas de interacciones
medicamentosas en <1 s, validación con RAG sobre vademécum y CIE-10.

> 📘 **Entrega final BSG:** la documentación oficial consolidada (12
> secciones + anexos, llenada con datos reales de este repositorio) está
> en **[AI_LLM_Project_Delivery.md](AI_LLM_Project_Delivery.md)**.
> Resultados medidos, open issues, conclusiones, roadmap y rúbrica de
> auto-evaluación incluidos.

> 🎥 **Video de presentación:** <https://www.youtube.com/watch?v=ezQXaWdaTKk>
> (≤ 30 min — demo funcional, arquitectura, resultados medidos y reflexión).

## Project Structure

This project consists of three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| `frontend/` | React + TypeScript | User interface for medical records |
| `backend/` | Node.js + Express | API and data persistence |
| `ai-service/` | Python + FastAPI | AI transcription and extraction |

### Documentation

- **[AI_LLM_Project_Delivery.md](AI_LLM_Project_Delivery.md)** — consolidated BSG final delivery document (12 sections + anexos), assembled from the sources below
- [docs/delivery-1/](docs/delivery-1/) — E1 sources: business problem, scope, RF/RNF
- [docs/delivery-2/](docs/delivery-2/) — E2 sources: architecture, data flow, API design, security, RAG
- [docs/delivery-4/](docs/delivery-4/) — E4 results: measured metrics, cost analysis, observability, conclusions, lessons learned, roadmap
- [docs/adr/](docs/adr/) — 7 Architecture Decision Records
- [docs/architecture/diagrams/](docs/architecture/diagrams/) — C4 context/container, sequence diagrams, multi-cloud equivalences
- [docs/api/openapi.yaml](docs/api/openapi.yaml) — OpenAPI specification
- [docs/security/threat-model.md](docs/security/threat-model.md) — STRIDE threat model (8 threats)
- [docs/observability/README.md](docs/observability/README.md) — observability stack
- [docs/PRE_DELIVERY_CHECKLIST.md](docs/PRE_DELIVERY_CHECKLIST.md) — final delivery checklist
- [README-BSG.md](README-BSG.md) · [AI_LLM_Project_Template.md](AI_LLM_Project_Template.md) — original BSG template references

## Run Locally

End-to-end local setup. Two Postgres instances run side by side: the
AI-service stack uses its own Postgres on host port `5433` (db
`medrecord_dev`); the Node backend uses a separate Postgres on `5432`
(db `healthrecord`). They are intentionally isolated — see
[ADR-002](docs/adr/ADR-002-vector-store-selection.md) and the data-flow
design in [docs/delivery-2/02-data-flow-design.md](docs/delivery-2/02-data-flow-design.md).

### Prerequisites

- Docker + Docker Compose
- Node.js 18+ and pnpm
- Python 3.11+ (only if you need to run AI-service tests outside Docker)
- An OpenAI API key

### 1. Configure environment files

Three `.env.example` files are tracked. Copy each to `.env` (never commit
`.env`) and fill in real values.

```bash
# AI service (Python / FastAPI / Whisper / GPT-4o / ChromaDB)
cp ai-service/.env.example ai-service/.env

# Node backend (Express + Prisma + Postgres)
cp packages/backend/.env.example packages/backend/.env

# React frontend (Vite)
cp packages/frontend/.env.example packages/frontend/.env
```

**Where to put the OpenAI API key.** It goes in **`ai-service/.env`** —
this is the only service that calls OpenAI directly (Whisper, GPT-4o,
embeddings):

```bash
# ai-service/.env
OPENAI_API_KEY=sk-proj-...your-real-key...
```

The `OPENAI_API_KEY` line in `packages/backend/.env.example` is legacy
from earlier prompts; the Node backend does **not** call OpenAI directly,
it forwards to the AI service. You can leave that backend variable as
the placeholder.

**Other variables to align across the two services** (the values must
match on both sides for JWT validation to work):

| Variable | AI service (`ai-service/.env`) | Backend (`packages/backend/.env`) |
|---|---|---|
| Shared JWT secret | `JWT_SECRET_KEY=<min 32 chars>` | `AI_SERVICE_JWT_SECRET=<same value>` |
| AI service URL | (n/a — it serves on 8000) | `AI_SERVICE_URL=http://localhost:8000` and `AI_SERVICE_WS_URL=ws://localhost:8000` |

`MONTHLY_BUDGET_USD` (in `ai-service/.env`) drives the cost circuit
breaker — set it to your real cap; warnings fire at 80%, critical at
90%.

### 2. Start the AI service stack (Docker)

This brings up the AI service (port `8000`), its own Postgres (host port
`5433`), ChromaDB (port `8001`), and Redis (port `6379`).

```bash
cd ai-service
docker compose up -d --build

# Tail logs until you see "Application startup complete"
docker compose logs -f ai-service
```

Verify:

```bash
curl http://localhost:8000/health
# expect: {"status":"healthy", ...}
```

Optional — seed the medical knowledge base into ChromaDB (vademécum,
CIE-10, interactions):

```bash
docker exec medrecord-ai-service python -m scripts.ingest_vademecum
```

### 3. Start the backend Postgres (Docker)

The Node backend uses a **separate** Postgres instance on port `5432`.
There is a small compose file at `docker/docker-compose.yml` for exactly
this:

```bash
# From the repo root
docker compose -f docker/docker-compose.yml up -d

# Verify
docker exec health-record-postgres pg_isready -U healthrecord
# expect: accepting connections
```

### 4. Run the Node backend

```bash
# From the repo root — install monorepo deps once
pnpm install

# Generate Prisma client + apply migrations
pnpm --filter backend db:generate
pnpm --filter backend db:migrate

# (Optional) seed sample data
pnpm --filter backend db:seed

# Start the dev server (port 3001)
pnpm --filter backend dev
```

Verify:

```bash
curl http://localhost:3001/api/v1/health
```

### 5. Run the React frontend

In a new terminal:

```bash
pnpm --filter frontend dev
# Vite serves on http://localhost:5173
```

Open <http://localhost:5173>. To enable the live-streaming consultation
mode, set `VITE_ENABLE_REALTIME=true` in `packages/frontend/.env` and
restart the Vite dev server.

### Endpoint cheat sheet

| Service | URL | Notes |
|---|---|---|
| Frontend (Vite) | <http://localhost:5173> | |
| Backend API | <http://localhost:3001/api/v1> | Express + Prisma |
| AI Service API | <http://localhost:8000> | FastAPI |
| AI Service docs | <http://localhost:8000/docs> | Swagger UI |
| AI Service health | <http://localhost:8000/health> | Component status (note: live OpenAI probe — see open issue OI-3) |
| AI Service costs | <http://localhost:8000/api/v1/costs> | Requires JWT |
| ChromaDB | <http://localhost:8001> | Vector store |
| Backend Postgres | `localhost:5432` (db `healthrecord`) | `docker/docker-compose.yml` |
| AI Postgres | `localhost:5433` (db `medrecord_dev`) | `ai-service/docker-compose.yml` |
| Redis | `localhost:6379` | |

### Tearing down

```bash
# Stop AI stack
cd ai-service && docker compose down

# Stop backend Postgres
docker compose -f docker/docker-compose.yml down

# Add -v to either command to also delete the volume (DESTROYS DATA)
```

### Troubleshooting

- **Port 5432 already in use:** another Postgres is running locally.
  Either stop it or change the port mapping in
  `docker/docker-compose.yml`.
- **`401 Unauthorized` from the AI service:** `JWT_SECRET_KEY` (AI side)
  and `AI_SERVICE_JWT_SECRET` (backend side) don't match. They must be
  byte-identical.
- **WebSocket disconnects with code `4002`:** known issue **OI-1** in
  [docs/delivery-4/README.md](docs/delivery-4/README.md#open-issues) —
  the streaming handler leaks the connection slot when the `torchaudio`
  import fails. Fix is tracked; non-streaming endpoints work fine.
- **`/api/v1/query` returns mostly `429`/`500` under load:** known
  issue **OI-2** — `slowapi` rate-limit needs recalibration to the
  documented 50 qps target.

## Features

- Patient registration and management
- Appointment scheduling
- Medical records with SOAP notes
- AI-powered consultation transcription (Spanish)
- Automatic medical data extraction
- RAG-based knowledge validation

## Results (measured)

All values come from the reports in `ai-service/reports/`. Cells marked
"blocked" are not measurable today because of the open issues listed
below — they are documented honestly rather than estimated.

| Metric | Target | Measured | Source | Status |
|---|---|---|---|---|
| RAGAS Faithfulness | > 0.80 | **0.938** | [`ragas_results.json`](ai-service/reports/ragas_results.json) | Pass |
| RAGAS Context Precision | > 0.75 | **1.000** | same | Pass |
| RAGAS Answer Relevancy | — | 0.964 | same | Reference |
| RAGAS Context Recall | — | 1.000 | same | Reference |
| Event-persistence write p95 | < 50 ms | **14.45 ms** | [load test §1](ai-service/reports/2026-04-30/load_test_report.md) | Pass |
| Event-persistence throughput | ≥ 50 writes/s | **712 writes/s** | same | Pass |
| WebSocket connect (median) | < 500 ms | **59 ms** | [load test §2](ai-service/reports/2026-04-30/load_test_report.md) | Pass |
| WebSocket streaming throughput | ≥ 50 events/s | 0 events/s | same | **Blocked (OI-1)** |
| WebSocket reconnection success | ≥ 90% | 0/3 | same | **Blocked (OI-1)** |
| `/api/v1/query` p95 @ 10 VUs | < 3 s | n/a — 88% failure rate | [load test §4](ai-service/reports/2026-04-30/load_test_report.md) | **Blocked (OI-2)** |
| Realtime transcription p95 | < 2 s | not measured (depends on OI-1) | — | Pending |
| Realtime extraction p95 | < 3 s | not measured (depends on OI-1) | — | Pending |
| Critical-alert latency p95 | < 1 s | not measured (depends on OI-1) | — | Pending |

The full E4 deliverable lives in [`docs/delivery-4/`](docs/delivery-4/),
including the cost analysis, observability summary, technical
conclusions, lessons learned, and roadmap. Open issues are tracked in
[`docs/delivery-4/README.md#open-issues`](docs/delivery-4/README.md#open-issues).

## Requirements

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL
- OpenAI API Key

## Comandos disponibles (Makefile)

El proyecto usa un Makefile en la raíz para estandarizar la ejecución:

```bash
make help          # Listar todos los targets
make install       # Instalar dependencias (pnpm + pip)
make dev           # Levantar el stack del AI service (Docker)
make test          # Tests unitarios + integración + RAGAS
make lint          # Ruff + ESLint (backend y frontend)
make typecheck     # MyPy + tsc
make health        # Estado de los servicios locales
make pre-delivery  # Verificación completa antes de entrega BSG
```

| Comando | Descripción |
|---------|-------------|
| `make install` | Instala dependencias del monorepo (frontend, backend, AI service) |
| `make dev` | Levanta el stack del AI service vía Docker; backend/frontend se corren con `pnpm --filter` |
| `make test` | Ejecuta tests unitarios, integración y RAGAS |
| `make test-load` | Locust con 50 usuarios concurrentes (2 min) |
| `make test-websocket` | Tests de WebSocket en AI service y backend |
| `make coverage` | Reporte HTML de cobertura del AI service |
| `make security-scan` | Bandit + pip-audit + pnpm audit + gitleaks |
| `make check-files` | Verifica los archivos mínimos exigidos por BSG |
| `make pre-delivery` | Encadena `check-files`, `lint`, `typecheck`, `test`, `security-scan` |

Targets específicos del AI service: `cd ai-service && make help`.
Backend / frontend: `pnpm --filter backend <script>` / `pnpm --filter frontend <script>`.

## Security

The full threat model (STRIDE, 8 amenazas, plan de respuesta) lives at
[docs/security/threat-model.md](docs/security/threat-model.md). Implementation
notes for each control: [docs/delivery-2/04-security-design.md](docs/delivery-2/04-security-design.md).

```bash
# Install Python security tooling (bandit, pip-audit)
make security-install

# Run the full scan: bandit + pip-audit + pnpm audit + gitleaks
make security-scan

# Reports land in reports/security/
```

CI runs the same tools on every push (see [.github/workflows/security.yml](.github/workflows/security.yml)).
Secret detection (`gitleaks`) and container scanning (`trivy`) require a
manual install locally.

**Operational rules:**

1. Never commit `.env*` files — only `*.env.example` is tracked.
2. Rotate `OPENAI_API_KEY` and `AI_SERVICE_JWT_SECRET` every 90 days.
3. `/health` and `/metrics` are the only AI-service endpoints without JWT.
4. Run `make security-scan` before tagging a release.

## License

MIT
