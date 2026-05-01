# C4 — Nivel 2: Contenedor

**Sistema:** MedRecord AI
**Propósito:** Mostrar los contenedores técnicos que componen el sistema, sus tecnologías, puertos y los flujos REST + WebSocket reales.

```mermaid
%%{init: {'theme':'neutral', 'flowchart':{'curve':'basis'}}}%%
flowchart TB
    classDef person fill:#08427B,stroke:#052E56,color:#fff
    classDef webapp fill:#2E7D32,stroke:#1B5E20,color:#fff
    classDef api fill:#388E3C,stroke:#1B5E20,color:#fff
    classDef ai fill:#43A047,stroke:#1B5E20,color:#fff
    classDef store fill:#F9A825,stroke:#F57F17,color:#000
    classDef infra fill:#EF6C00,stroke:#E65100,color:#fff
    classDef external fill:#999,stroke:#666,color:#fff

    medico["👤 Médico"]:::person

    subgraph browser ["🌐 Navegador (Chrome / Firefox)"]
        frontend["<b>Frontend SPA</b><br/>React 18 + TypeScript + Vite<br/>MediaRecorder webm/opus 5s<br/>WebSocket client + Zustand<br/><i>useRealtimeSession.ts</i>"]:::webapp
    end

    subgraph host ["🐳 Docker host (dev) / AWS EC2 (prod)"]
        nginx["<b>Nginx</b><br/>Reverse proxy + TLS termination<br/>WebSocket upgrade /ws/*<br/><i>:80 / :443</i>"]:::infra

        backend["<b>Backend API + WS Gateway</b><br/>Node.js 20 + Express + ws<br/>JWT auth, Prisma ORM<br/>WebSocket gateway hacia AI<br/><i>:3001 — packages/backend</i>"]:::api

        aiservice["<b>AI Service</b><br/>Python 3.11 + FastAPI + asyncio<br/>WebSocket streaming + RAG<br/>Pipeline: VAD → Whisper →<br/>Diarizer → Extractor → RAG<br/><i>:8000 — ai-service</i>"]:::ai

        postgres[("<b>PostgreSQL 15</b><br/>users, patients, appointments,<br/>medical_records, ai_sessions,<br/>transcription_events,<br/>extraction_events,<br/>validation_alerts, cost_events<br/><i>:5432</i>")]:::store

        chromadb[("<b>ChromaDB 0.5</b><br/>Vector store<br/>Colecciones: medications,<br/>drug_interactions, cie10<br/><i>:8001 host / :8000 internal</i>")]:::store

        redis[("<b>Redis 7</b><br/>Session state, speaker centroids,<br/>extraction context, event buffer<br/>(ventana 60s reconexión)<br/><i>:6379</i>")]:::store
    end

    openai["OpenAI API<br/><i>whisper-1, gpt-4o,<br/>gpt-4o-mini, embeddings</i>"]:::external

    medico -- "HTTPS / WSS" --> nginx
    nginx -- "HTTP estático /<br/>SPA assets" --> frontend
    frontend -- "REST /api/v1/*<br/>JWT Bearer" --> nginx
    frontend -. "WSS /ws/ai-session/:id<br/>audio binary + JSON events" .-> nginx

    nginx -- "REST" --> backend
    nginx -. "WS upgrade" .-> backend

    backend -- "REST /sessions, /transcribe,<br/>/extractions, /costs<br/>(internal HTTP)" --> aiservice
    backend -. "WS proxy: forward audio<br/>frames + relay events" .-> aiservice

    backend -- "Prisma SQL" --> postgres
    aiservice -- "asyncpg<br/>(persiste events, reads<br/>sessions, costs)" --> postgres
    aiservice -- "REST API<br/>(query + ingest)" --> chromadb
    aiservice -- "session state +<br/>event buffer (60s TTL)" --> redis
    backend -- "session cache" --> redis

    aiservice -- "HTTPS<br/>(Whisper, GPT-4o,<br/>embeddings)" ==> openai
```

## Contenedores

| Contenedor | Tecnología | Puerto | Responsabilidad |
|---|---|---|---|
| **Frontend SPA** | React 18, TypeScript, Vite, Zustand | servido por Nginx | UI de consulta. Captura audio con `MediaRecorder` (webm/opus, timeslice 5000 ms), renderiza transcripción + entidades + alertas en tiempo real. Hook clave: `packages/frontend/src/hooks/useRealtimeSession.ts`. |
| **Nginx** | Nginx 1.25 | 80, 443 | Reverse proxy, TLS (Let's Encrypt en prod), upgrade WebSocket para `/ws/*`, rate limiting. |
| **Backend API + WS Gateway** | Node.js 20, Express 4, `ws`, Prisma | 3001 | API REST (auth JWT, pacientes, citas, expedientes, sesiones de IA), gateway WebSocket que reenvía audio binario al AI service y persiste eventos (`event-persistence.service.ts`, `ai-session-gateway.ts`). |
| **AI Service** | Python 3.11, FastAPI, asyncio | 8000 | Núcleo del pipeline: VAD (Silero), Whisper, hallucination filter (6 capas), diarización por embeddings (Resemblyzer), extracción incremental (gpt-4o), pipeline de dedup (5 capas), validación RAG (`RAGValidationCoordinator` con colas async), generación de SOAP final. |
| **PostgreSQL 15** | PostgreSQL 15 | 5432 (root) / 5433 (ai-service compose) | Datos estructurados: usuarios, pacientes, citas, expedientes, sesiones IA y los **eventos persistidos** (`transcription_events`, `extraction_events`, `validation_alerts`, `cost_events` — migración `20260430142852_add_ai_session_events`). |
| **ChromaDB 0.5** | ChromaDB 0.5.23 | 8001 host / 8000 internal | Vector store del corpus vademécum español: 30 medicamentos, 25 interacciones, 40 códigos CIE-10. Ingesta vía `ai-service/scripts/ingest_vademecum.py`. |
| **Redis 7** | Redis 7 | 6379 | Estado de sesión, centroides de speaker (Resemblyzer), contexto rolling de extracción, **buffer de eventos con TTL 60 s** para replay en reconexión WS. |

## Flujos de comunicación

### REST (operaciones CRUD y batch)
- Navegador → Nginx (HTTPS 443) → Frontend (estático) o Backend (`:3001`)
- Backend → AI Service (`:8000`, REST interno): crear sesión, ingestar audio batch, finalizar sesión, consultar costos
- Backend → PostgreSQL: Prisma queries
- AI Service → PostgreSQL: persistencia de eventos vía `asyncpg`
- AI Service → ChromaDB: queries del cliente HTTP de chromadb
- AI Service → OpenAI: `https://api.openai.com/v1/...`

### WebSocket (streaming)
- Frontend ↔ Nginx (WSS) ↔ Backend (`/ws/ai-session/:id`)
- Backend ↔ AI Service (WS interno) — forward verbatim de frames binarios webm/opus
- Frames: bloques webm/opus de 5000 ms del MediaRecorder
- Eventos: `transcript_update`, `speaker_changed`, `extraction_update`, `validation_alert`, `entity_validated`, `session_complete`, `error`
- **Persistencia**: cada evento se escribe a PostgreSQL (Backend) y se buffer-ea en Redis 60s para replay

## Componentes destacados del AI Service

> Diagrama de componentes detallado: ver [pipeline-realtime.md](pipeline-realtime.md).

```
ai-service/src/
├── api/
│   ├── main.py                    # FastAPI app, warm-up Silero VAD + Resemblyzer
│   ├── endpoints/                 # REST: health, sessions, costs
│   └── websocket/
│       ├── manager.py             # Conexiones por sesión
│       └── streaming.py           # Orquestador del pipeline real-time
├── transcription/
│   ├── hallucination_filter.py    # 6 capas
│   └── diarization/
│       ├── audio_feature_diarizer.py    # Resemblyzer + clustering
│       ├── llm_validator.py             # gpt-4o-mini speaker validation
│       └── incremental_diarizer.py
├── services/
│   ├── extraction/
│   │   └── incremental_extractor.py     # rolling 3-chunk context
│   ├── entity_splitter.py               # Layer A: split de compuestos
│   ├── entity_type_validator.py         # Layer C: reclasificación
│   ├── entity_dedup.py                  # Layer E: semantic dedup
│   ├── stream_processor.py              # singleton VAD
│   ├── cost_tracker.py + cost_dashboard.py
│   └── model_selector.py
└── rag/
    ├── retriever.py
    ├── validation_coordinator.py        # colas async CRITICAL/HIGH/MEDIUM
    ├── batched_validator.py
    └── prefetcher.py
```
