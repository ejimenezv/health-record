# MedRecord AI Service

Servicio de IA para transcripcion y extraccion de datos medicos de consultas en espanol.

## Caracteristicas

- **Transcripcion en streaming** vía Whisper API con overlap de 1.5 s y dedup
  por timestamps de segmentos (sin duplicados ni palabras cortadas en
  fronteras de slice).
- **Filtro de hallucinations** server-side (Amara.org, "Subtítulos por…",
  "Muchas gracias", marcadores de sonido, repeticiones, low confidence).
  Ver [`src/transcription/hallucination_filter.py`](src/transcription/hallucination_filter.py).
- **Diarización por audio-features** (Resemblyzer): detecta cambio de
  hablante por timbre, no por keywords. Fallback a keywords si falta audio.
  Ver [`src/transcription/diarization/audio_feature_diarizer.py`](src/transcription/diarization/audio_feature_diarizer.py).
- **Extracción incremental** (gpt-4o + gpt-4o-mini) con pipeline anti-duplicados:
  splitter de compuestos → forbidden-prefix → type-validator (LLM) →
  dedup heurístico → dedup semántico (OpenAI embeddings).
- **RAG médico en español**: vademecum, interacciones medicamentosas y
  códigos CIE-10 indexados en ChromaDB. Corpus semilla curado en
  [`data/vademecum/`](data/vademecum/); guía de carga en
  [`../docs/guides/rag-vademecum-setup.md`](../docs/guides/rag-vademecum-setup.md).
- **Validación clínica en tiempo real**: `RAGValidationCoordinator`
  enqueues drug-interaction y dose checks contra el RAG; emite alertas
  CRITICAL/HIGH al WebSocket.
- **VAD pre-check** (Silero VAD) elimina ~25-30 % de slices silentes
  antes de llamar Whisper.

## Requisitos

- Python 3.11+
- Docker y Docker Compose
- OpenAI API Key

## Inicio Rapido

### Docker (recommended)

This is the supported development workflow. The dev image installs both
`requirements.txt` and `requirements-dev.txt` and mounts `./src` and `./tests`
into the container so changes hot-reload via `uvicorn --reload`.

```bash
cd ai-service
cp .env.example .env            # add a real OPENAI_API_KEY
docker compose up -d            # builds image + starts the full stack
```

Stack started by `docker compose up`:

| Container               | Host port | Purpose                                        |
| ----------------------- | --------- | ---------------------------------------------- |
| `medrecord-ai-service`  | 8000      | FastAPI app (`uvicorn --reload`)               |
| `medrecord-postgres`    | 5433      | App database (5433 to avoid colliding with the Node backend on 5432) |
| `medrecord-redis`       | 6379      | Session state, RAG cache                       |
| `medrecord-chromadb`    | 8001      | Vector store                                   |
| `medrecord-adminer`     | 8080      | Postgres web UI                                |

URLs once the stack is up:

- Service info: <http://localhost:8000/>
- Swagger / OpenAPI: <http://localhost:8000/docs>
- Health: <http://localhost:8000/health>
- Adminer: <http://localhost:8080>

### Day-to-day commands

```bash
# Run the full unit test suite inside the container
docker exec medrecord-ai-service pytest tests/unit/

# Run one test file
docker exec medrecord-ai-service pytest tests/unit/test_stream_processor.py -v

# Tail logs (uvicorn + structlog)
docker logs -f medrecord-ai-service

# Open a shell in the container
docker exec -it medrecord-ai-service bash

# Restart just the AI service (e.g. after dependency changes)
docker compose restart ai-service

# Rebuild the image after Dockerfile or requirements changes
docker compose up -d --build ai-service

# Stop the stack
docker compose down

# Stop and wipe volumes (Postgres, ChromaDB, Redis data)
docker compose down -v

# Populate ChromaDB with the curated Spanish vademecum + interactions + CIE-10
# Required after a clean deploy or `docker compose down -v`. See
# ../docs/guides/rag-vademecum-setup.md for the full guide.
make ingest-vademecum-reset
make vademecum-counts
```

### Local venv (alternative)

Only use this if you specifically need to run the service outside Docker.
Requires Python 3.11 (the pinned versions in `requirements.txt` do not all
support 3.13+):

```bash
cd ai-service
py -3.11 -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn src.api.main:app --reload
```

## API Endpoints

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/v1/query` | POST | Consultar base de conocimiento medico |
| `/api/v1/ingest` | POST | Ingestar documentos al RAG |
| `/api/v1/transcription/sessions` | POST | Crear sesion de transcripcion |
| `/api/v1/transcription/sessions/{id}/audio` | POST | Subir audio |
| `/api/v1/transcription/sessions/{id}/finalize` | POST | Finalizar y extraer |
| `/health` | GET | Health check |

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │
│   (React)       │────▶│   (Node.js)     │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   AI Service (Python)  │
                    │   - Transcription      │
                    │   - Extraction         │
                    │   - RAG                │
                    └────────────────────────┘
```

## Documentacion

- [Documentacion del Proyecto](../docs/)
- [Arquitectura del pipeline de streaming](../docs/architecture/streaming-transcription-architecture.md) — diseño actual del pipeline real-time (post-27.3)
- [Realtime operational notes](../docs/guides/realtime-operational-notes.md) — known limitations, follow-ups, smoke tests, decisión pilot/prod
- [RAG vademecum setup](../docs/guides/rag-vademecum-setup.md) — cómo poblar ChromaDB en un deploy limpio
- [Realtime pipeline audit + post-implementation status](../docs/architecture/realtime-pipeline-audit.md) — auditoría 27.1 con resoluciones
