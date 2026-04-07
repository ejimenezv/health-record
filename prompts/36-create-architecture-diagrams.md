# Prompt 36: Create Architecture Diagrams

## Objective
Create comprehensive, professional architecture diagrams that clearly communicate the system design, data flows, and technical decisions, meeting BSG requirements for high-quality technical documentation.

## Context
BSG requires:
- **C4 diagrams** (Contexto + Contenedor levels) with all components
- **Sequence/data flow diagram** showing complete request → response cycle
- **Multi-cloud equivalences** visual representation
- **High resolution exports** (minimum 150 dpi, PNG or SVG)
- **Self-explanatory diagrams** that don't require additional text
- All diagrams must show: actores, API Gateway, LLM orchestration, vector store, data sources, security/IAM, observability

This prompt guides the creation of all required diagrams for the BSG final delivery.

## Tasks

### 1. Setup Diagram Tools

Choose one of the following tools:
- **Draw.io** (recommended, free, exportable sources)
- **Lucidchart** (collaborative, professional templates)
- **Excalidraw** (simple, hand-drawn style)
- **PlantUML** (code-based, version controllable)
- **Miro** (collaborative whiteboarding)

Create diagram directory structure:
```
docs/
├── architecture/
│   ├── README.md                                    # Diagram index
│   ├── architecture-c4-context.png                  # C4 Level 1
│   ├── architecture-c4-container.png                # C4 Level 2
│   ├── sequence-diagram-transcription-flow.png      # Sequence diagram (batch)
│   ├── sequence-diagram-realtime-streaming.png      # Sequence diagram (real-time)
│   ├── multi-cloud-equivalences.png                 # Cloud mapping
│   ├── architecture-c4-context.drawio               # Source files
│   ├── architecture-c4-container.drawio
│   ├── sequence-diagram-transcription-flow.drawio
│   └── sequence-diagram-realtime-streaming.drawio
```

### 2. Create Diagram Index

**File:** `docs/architecture/README.md`

**Content:**
```markdown
# Diagramas de Arquitectura — MedRecord AI

Este directorio contiene los diagramas arquitectónicos del sistema MedRecord AI para consultas médicas con IA.

## Índice de Diagramas

| Diagrama | Tipo | Descripción | Archivo | Última Actualización |
|----------|------|-------------|---------|---------------------|
| [Contexto C4](#diagrama-c4---contexto) | C4 Nivel 1 | Vista de alto nivel del sistema y actores | `architecture-c4-context.png` | DD/MM/2025 |
| [Contenedor C4](#diagrama-c4---contenedor) | C4 Nivel 2 | Componentes técnicos y sus relaciones (incluye WebSocket) | `architecture-c4-container.png` | DD/MM/2025 |
| [Flujo de Transcripción (Batch)](#diagrama-de-secuencia---flujo-de-transcripción) | Secuencia | Ciclo completo de procesamiento batch de audio | `sequence-diagram-transcription-flow.png` | DD/MM/2025 |
| [Flujo Real-Time Streaming](#diagrama-de-secuencia---flujo-real-time) | Secuencia | Streaming WebSocket con extracción incremental | `sequence-diagram-realtime-streaming.png` | DD/MM/2025 |
| [Equivalencias Multi-Cloud](#equivalencias-multi-cloud) | Mapping | Servicios AWS ↔ GCP ↔ Azure | `multi-cloud-equivalences.png` | DD/MM/2025 |

## Diagrama C4 - Contexto

**Propósito:** Muestra el sistema MedRecord AI y sus actores externos (usuarios, sistemas externos, APIs de terceros).

**Elementos clave:**
- Actores: Médico, Paciente (indirectamente), Administrador del sistema
- Sistema: MedRecord AI
- Sistemas externos: OpenAI API, Bases de conocimiento médico

![Diagrama C4 Contexto](architecture-c4-context.png)

---

## Diagrama C4 - Contenedor

**Propósito:** Desglosa MedRecord AI en sus contenedores técnicos (aplicaciones, bases de datos, servicios).

**Elementos clave:**
- Frontend React (SPA) con WebSocket client
- Backend Node.js (API REST + WebSocket Gateway)
- AI Service Python (FastAPI + Celery + WebSocket)
- PostgreSQL (datos estructurados + eventos persistidos)
- ChromaDB (vector store)
- Redis (cache + broker Celery + event buffering + session state)
- Nginx (reverse proxy + SSL termination + WebSocket proxy)

**Flujos de comunicación:**
- HTTP REST: Operaciones CRUD, autenticación, consultas históricas
- WebSocket bidireccional: Streaming de audio (cliente→servidor) y eventos en tiempo real (servidor→cliente)

![Diagrama C4 Contenedor](architecture-c4-container.png)

---

## Diagrama de Secuencia - Flujo de Transcripción (Batch)

**Propósito:** Muestra el flujo completo de una consulta médica en modo batch (audio completo post-consulta).

**Fases:**
1. Carga de audio y creación de sesión
2. Procesamiento asíncrono (Celery worker)
3. Transcripción con Whisper API
4. Diarización (VAD + LLM validation)
5. Extracción médica (síntomas, diagnósticos, prescripciones)
6. RAG para validación y enriquecimiento
7. Generación de nota SOAP estructurada
8. Notificación al frontend vía polling

![Diagrama de Secuencia Batch](sequence-diagram-transcription-flow.png)

---

## Diagrama de Secuencia - Flujo Real-Time

**Propósito:** Muestra el flujo de streaming en tiempo real durante una consulta médica activa.

**Características clave:**
- WebSocket bidireccional para audio y eventos
- Latencia < 2s para transcripción
- Latencia < 3s para extracción de entidades
- Latencia < 1s para alertas críticas (drug interactions)
- Entity matching para evitar duplicados
- Reconexión automática con event replay

**Fases:**
1. Establecimiento de conexión WebSocket
2. Streaming de audio (chunks Opus 20ms)
3. VAD + buffering inteligente (5-10s chunks)
4. Transcripción incremental con Whisper
5. Diarización incremental (speaker tags)
6. Extracción incremental + entity matching
7. RAG validation (async, non-blocking)
8. Eventos WebSocket a frontend en tiempo real
9. Reconexión y event replay si se pierde conexión

![Diagrama de Secuencia Real-Time](sequence-diagram-realtime-streaming.png)

---

## Equivalencias Multi-Cloud

**Propósito:** Demuestra pensamiento arquitectónico vendor-agnostic mostrando equivalencias entre AWS, GCP y Azure.

**Categorías mapeadas:**
- Compute (VMs, containers, serverless)
- Base de datos (SQL managed)
- Storage (object storage)
- Networking (load balancers, DNS)
- Observability (logging, monitoring)
- Secrets management
- CI/CD

![Equivalencias Multi-Cloud](multi-cloud-equivalences.png)

---

## Convenciones de Notación

### C4 Model

**Colores por tipo de componente:**
- 🔵 **Azul**: Sistemas externos (OpenAI API, bases de conocimiento)
- 🟢 **Verde**: Aplicaciones propias (Frontend, Backend, AI Service)
- 🟡 **Amarillo**: Bases de datos y almacenamiento (PostgreSQL, ChromaDB, Redis)
- 🟠 **Naranja**: Infraestructura (Nginx, AWS EC2, redes)

**Flechas:**
- Línea sólida →: Llamadas síncronas (HTTP REST)
- Línea punteada ⇢: Llamadas asíncronas (Celery tasks, WebSocket)
- Flecha doble ↔: Comunicación bidireccional

### Sequence Diagrams

**Participantes:**
- **Actor humano**: Médico (stick figure)
- **UI/Cliente**: Frontend React (caja rectangular)
- **APIs**: Backend Node.js, AI Service FastAPI (cajas con API label)
- **Servicios externos**: OpenAI API, ChromaDB (cajas con borde punteado)
- **Procesos**: Celery Workers (cajas con engranaje)
- **Almacenamiento**: Bases de datos (cilindros)

## Herramientas Utilizadas

- **Draw.io** (archivos `.drawio` editables incluidos)
- **Exportación**: PNG 300 dpi para alta calidad en impresión
- **Fuentes**: Arial 10-12pt para labels, 14-16pt para títulos

## Cómo Actualizar los Diagramas

1. Abrir el archivo `.drawio` correspondiente en [app.diagrams.net](https://app.diagrams.net/)
2. Realizar modificaciones visuales
3. Exportar como PNG con configuración:
   - Resolución: 300 dpi
   - Background: Blanco (no transparente para documentos PDF)
   - Border: 10px padding
4. Guardar ambos archivos (`.drawio` fuente + `.png` export)
5. Actualizar fecha en este README.md

## Referencias

- [C4 Model Specification](https://c4model.com/)
- [Draw.io C4 Templates](https://github.com/tobiashochguertel/c4-draw.io)
- [Sequence Diagram Best Practices](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/sequence-diagram-tutorial/)
```

### 3. Create C4 Context Diagram

**Diagram Specifications for `architecture-c4-context.png`:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                     DIAGRAMA C4 - CONTEXTO                          │
│                          MedRecord AI                               │
│                                                                     │
│                                                                     │
│  ┌────────┐                                                         │
│  │Médico  │ ◄──────────┐                                           │
│  │(Actor) │            │                                           │
│  └────────┘            │ Usa sistema para                          │
│                        │ transcribir consultas                      │
│                        │ y generar notas médicas                    │
│                        ▼                                            │
│              ┌──────────────────────────┐                           │
│              │                          │                           │
│              │     MedRecord AI         │──────┐                    │
│              │   Sistema de Gestión     │      │                    │
│              │   de Consultas Médicas   │      │ Consume API       │
│              │   con IA                 │      │                    │
│              │                          │      ▼                    │
│              └──────────────────────────┘   ┌───────────────┐       │
│                        │                    │  OpenAI API   │       │
│                        │                    │ (GPT-4o,      │       │
│                        │ Consulta           │  Whisper)     │       │
│                        │ bases de           └───────────────┘       │
│                        │ conocimiento                               │
│                        ▼                                            │
│              ┌──────────────────────────┐                           │
│              │ Bases de Conocimiento    │                           │
│              │ Médico                   │                           │
│              │ (Guías clínicas, CIE-10, │                           │
│              │  vademécums)             │                           │
│              └──────────────────────────┘                           │
│                                                                     │
│  ┌────────────┐                                                     │
│  │Administrador│───────┐                                            │
│  │ Sistema    │       │ Configura sistema,                         │
│  └────────────┘       │ monitorea costos y uso                     │
│                       │                                             │
└───────────────────────┴─────────────────────────────────────────────┘

LEYENDA:
  [Actor]  = Usuario humano
  [Sistema] = Sistema de software completo
  ────────> = Uso/Interacción
```

**Key Elements to Include:**
1. **Actores:**
   - Médico (principal usuario): Transcribe consultas, revisa extracciones
   - Administrador: Monitorea sistema, revisa costos, configura parámetros

2. **Sistema Principal:**
   - MedRecord AI (caja grande central)
   - Descripción: "Sistema de gestión de consultas médicas con transcripción automática y extracción de información mediante IA"

3. **Sistemas Externos:**
   - OpenAI API (GPT-4o para extracción, Whisper para transcripción)
   - Bases de Conocimiento Médico (guías clínicas, CIE-10, vademécums farmacológicos)

4. **Relaciones:**
   - Médico → MedRecord AI: "Carga audio, revisa transcripciones, valida extracciones"
   - MedRecord AI → OpenAI API: "Envía audio para transcripción, envía texto para extracción estructurada"
   - MedRecord AI → Bases Conocimiento: "Consulta vía RAG para validar diagnósticos e interacciones medicamentosas"
   - Administrador → MedRecord AI: "Monitorea costos, configura presupuestos, revisa métricas de calidad"

### 4. Create C4 Container Diagram

**Diagram Specifications for `architecture-c4-container.png`:**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        DIAGRAMA C4 - CONTENEDOR                                 │
│                             MedRecord AI                                        │
│                                                                                 │
│  ┌─────────┐                                                                    │
│  │ Médico  │                                                                    │
│  └────┬────┘                                                                    │
│       │                                                                         │
│       │ HTTPS                                                                   │
│       ▼                                                                         │
│  ┌──────────────────────┐                                                       │
│  │ Navegador Web        │                                                       │
│  │ (Chrome, Firefox)    │                                                       │
│  └─────────┬────────────┘                                                       │
│            │                                                                    │
│            │ HTTPS                                                              │
│            ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         SERVIDOR AWS EC2                                 │   │
│  │                                                                          │   │
│  │  ┌────────────────┐                                                      │   │
│  │  │ Nginx          │ ← SSL Termination (Let's Encrypt)                   │   │
│  │  │ Reverse Proxy  │                                                      │   │
│  │  └───┬────────┬───┘                                                      │   │
│  │      │        │                                                          │   │
│  │      │        │                                                          │   │
│  │  ┌───▼──────┐ │ ┌────────────────────────┐                              │   │
│  │  │Frontend  │ │ │Backend Node.js         │                              │   │
│  │  │React SPA │ │ │(Express API)           │                              │   │
│  │  │(Static)  │ │ │Port 3000               │◄──────┐                      │   │
│  │  └──────────┘ │ └───┬────────────────────┘       │                      │   │
│  │               │     │ HTTP                        │ HTTP                 │   │
│  │               │     │                             │                      │   │
│  │               │ ┌───▼────────────────────────┐   │                      │   │
│  │               │ │AI Service FastAPI          │   │                      │   │
│  │               │ │(Transcription, RAG)        │   │                      │   │
│  │               │ │Port 8000                   │───┤                      │   │
│  │               │ └───┬──────┬────────┬────────┘   │                      │   │
│  │               │     │      │        │            │                      │   │
│  │               │     │      │        │            │                      │   │
│  │  ┌────────────▼─────▼──┐  │  ┌─────▼─────────┐  │                      │   │
│  │  │ PostgreSQL          │  │  │ ChromaDB      │  │                      │   │
│  │  │ (Users, Sessions,   │  │  │ (Vector Store)│  │                      │   │
│  │  │  Consultations)     │  │  │ Port 8001     │  │                      │   │
│  │  │ Port 5432           │  │  └───────────────┘  │                      │   │
│  │  └─────────────────────┘  │                     │                      │   │
│  │                           │  ┌──────────────┐   │                      │   │
│  │                           └─►│ Redis        │◄──┘                      │   │
│  │                              │ (Cache +     │                          │   │
│  │                              │  Celery)     │                          │   │
│  │                              │ Port 6379    │                          │   │
│  │                              └──────▲───────┘                          │   │
│  │                                     │                                  │   │
│  │                              ┌──────┴───────┐                          │   │
│  │                              │ Celery Worker│                          │   │
│  │                              │ (Async tasks)│                          │   │
│  │                              └──────────────┘                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     │ HTTPS API calls                        │
│                                     ▼                                        │
│                          ┌──────────────────────┐                            │
│                          │  OpenAI API          │                            │
│                          │  (Whisper, GPT-4o)   │                            │
│                          └──────────────────────┘                            │
└────────────────────────────────────────────────────────────────────────────┘

LEYENDA:
  ┌─────┐ = Aplicación / Servicio
  [DB]    = Base de datos
  ────>   = Comunicación HTTP/HTTPS
  ····>   = Comunicación asíncrona
```

**Key Components with Descriptions:**

| Componente | Tecnología | Puerto | Responsabilidad |
|------------|------------|--------|-----------------|
| **Nginx** | Nginx 1.25 | 80, 443 | Reverse proxy, SSL termination, rate limiting, **WebSocket proxy** (`/ws/*`) |
| **Frontend** | React 18, TypeScript | - | SPA para médicos: carga audio, visualiza transcripciones, **WebSocket client para real-time** |
| **Backend** | Node.js 20, Express 4 | 3001 | API REST + **WebSocket Gateway**: autenticación, session management, event persistence |
| **AI Service** | Python 3.11, FastAPI, Celery | 8000 | Transcripción, diarización, extracción médica, RAG, SOAP, **WebSocket streaming** |
| **PostgreSQL** | PostgreSQL 15 | 5432 | Datos estructurados: usuarios, sesiones, consultas, extracciones, **transcript_events**, audit logs |
| **ChromaDB** | ChromaDB 0.4 | 8001 | Vector store para RAG: embeddings de guías clínicas, CIE-10, vademécums |
| **Redis** | Redis 7 | 6379 | Cache de respuestas LLM, broker de Celery, **session state**, **event buffering (60s)** |
| **Celery Worker** | Celery + Python | - | Procesamiento asíncrono de audio (batch), transcripción, extracción (tareas largas) |

**Protocols & Data Flow:**

**HTTP/REST Flow (Batch processing):**
- Usuario → Nginx: HTTPS (443)
- Nginx → Frontend: HTTP (static files)
- Frontend → Backend: HTTP REST API (JSON)
- Backend → AI Service: HTTP REST API (JSON)
- AI Service → PostgreSQL: PostgreSQL wire protocol (SQL queries)
- AI Service → ChromaDB: HTTP REST API (vector search)
- AI Service → Redis: Redis protocol (cache get/set, task queues)
- Celery Worker ← Redis: Task consumption from queue
- Celery Worker → OpenAI API: HTTPS REST API (Whisper, GPT-4o)

**WebSocket Flow (Real-time streaming):**
- Frontend ↔ Nginx: WSS (443) - `/ws/session/{id}`
- Nginx ↔ Backend: WS (3001) - WebSocket proxy with Upgrade headers
- Backend ↔ AI Service: WS (8000) - Internal WebSocket for streaming
- Frontend → Backend: Audio chunks (Opus encoded, 20ms frames)
- Backend → Frontend: Real-time events (transcription_update, symptom_extracted, etc.)
- AI Service → Redis: Session state + event buffering (60s window for reconnection)

### 5. Create Sequence Diagram: Transcription Flow

**Diagram Specifications for `sequence-diagram-transcription-flow.png`:**

**Participants:**
1. Médico (actor)
2. Frontend React
3. Backend Node.js
4. AI Service FastAPI
5. Celery Worker
6. Redis (cache/broker)
7. OpenAI API (Whisper, GPT-4o)
8. ChromaDB (vector store)
9. PostgreSQL

**Sequence Flow:**

```
Médico  Frontend  Backend  AI Service  Celery  Redis  OpenAI  ChromaDB  PostgreSQL
  │        │         │         │          │       │      │       │         │
  │ 1. Upload audio file (60 min MP3, 120 MB)
  ├───────►│         │         │          │       │      │       │         │
  │        │ 2. POST /api/consultations/upload
  │        ├────────►│         │          │       │      │       │         │
  │        │         │ 3. Validate user auth & permissions
  │        │         ├─────────────────────────────────────────────────────►│
  │        │         │         │          │       │      │       │         │
  │        │         │ 4. POST /ai/sessions (create session)
  │        │         ├────────►│          │       │      │       │         │
  │        │         │         │ 5. Generate session_id
  │        │         │         │          │       │      │       │         │
  │        │         │         │ 6. Enqueue transcription task
  │        │         │         ├─────────►│       │      │       │         │
  │        │         │         │          │ 7. Store task in queue
  │        │         │         │          ├──────►│      │       │         │
  │        │         │         │          │       │      │       │         │
  │        │         │ 8. Return {session_id, status: "processing"}
  │        │◄────────┴─────────┘          │       │      │       │         │
  │        │         │         │          │       │      │       │         │
  │ 9. Display "Processing... (polling every 5s)"
  │◄───────┤         │         │          │       │      │       │         │
  │        │         │         │          │       │      │       │         │
  │        │         │    ┌────┴──────────┴───────┴──────┴───────┴─────────┤
  │        │         │    │ ASYNC PROCESSING (Celery Worker)               │
  │        │         │    │                                                 │
  │        │         │    │ 10. Consume task from Redis queue              │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 11. Send audio to OpenAI Whisper API           │
  │        │         │    │          ├──────────────►│       │         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 12. Return transcription text (Spanish)        │
  │        │         │    │          │◄──────────────┤       │         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 13. Diarization (VAD + heuristics)             │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 14. Validate speaker attribution with GPT-4o-mini│
  │        │         │    │          ├──────────────►│       │         │    │
  │        │         │    │          │◄──────────────┤       │         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 15. Extract medical entities with GPT-4o       │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │          │ (symptoms, diagnoses, prescriptions)│    │
  │        │         │    │          ├──────────────►│       │         │    │
  │        │         │    │          │◄──────────────┤       │         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 16. RAG: Search similar cases in ChromaDB      │
  │        │         │    │          ├─────────────────────►│         │    │
  │        │         │    │          │◄─────────────────────┤         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 17. Validate drug interactions via RAG         │
  │        │         │    │          ├──────────────►│◄──────────────►│    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 18. Generate SOAP note with GPT-4o             │
  │        │         │    │          ├──────────────►│       │         │    │
  │        │         │    │          │◄──────────────┤       │         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 19. Store results in PostgreSQL                │
  │        │         │    │          ├─────────────────────────────────►│    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 20. Cache extraction in Redis (24h TTL)        │
  │        │         │    │          ├──────►│      │       │         │    │
  │        │         │    │          │       │      │       │         │    │
  │        │         │    │ 21. Update session status = "completed"        │
  │        │         │    │          ├─────────────────────────────────►│    │
  │        │         │    └──────────┴───────┴──────┴───────┴─────────┘    │
  │        │         │         │          │       │      │       │         │
  │ 22. Poll GET /ai/sessions/{id} every 5s
  │        ├────────►├────────►│          │       │      │       │         │
  │        │         │         │ 23. Check session status in DB
  │        │         │         ├─────────────────────────────────────────►│
  │        │         │         │          │       │      │       │         │
  │        │         │ 24. Return {status: "completed", transcription: {...}, extraction: {...}}
  │        │◄────────┴─────────┘          │       │      │       │         │
  │        │         │         │          │       │      │       │         │
  │ 25. Display transcription + extracted entities + SOAP note
  │◄───────┤         │         │          │       │      │       │         │
  │        │         │         │          │       │      │       │         │
```

**Timing annotations:**
- Steps 1-9: ~3-5 seconds (upload + session creation)
- Steps 10-21 (async): 120-180 seconds (transcription + processing)
- Steps 22-25 (polling): Executes every 5 seconds until status = "completed"

### 5.5 Create Sequence Diagram: Real-Time Streaming Flow

**Diagram Specifications for `sequence-diagram-realtime-streaming.png`:**

**Participants:**
1. Médico (actor)
2. Frontend React (WebSocket client)
3. Nginx (WebSocket proxy)
4. Backend Node.js (WebSocket Gateway)
5. AI Service FastAPI (WebSocket + Streaming)
6. Redis (session state + event buffer)
7. OpenAI API (Whisper streaming, GPT-4o)
8. ChromaDB (vector store)
9. PostgreSQL (event persistence)

**Sequence Flow:**

```
Médico  Frontend  Nginx  Backend  AI Service  Redis  OpenAI  ChromaDB  PostgreSQL
  │        │        │       │          │         │       │       │         │
  │ 1. Click "Start Consultation" (real-time mode)
  ├───────►│        │       │          │         │       │       │         │
  │        │ 2. POST /api/v1/sessions/stream (create streaming session)
  │        ├───────►├──────►│          │         │       │       │         │
  │        │        │       │ 3. Generate session_id, store in Redis
  │        │        │       ├──────────┴────────►│       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │ 4. Return {session_id, ws_url: "/ws/session/{id}"}
  │        │◄───────┴───────┤          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │ 5. Connect WebSocket: WSS /ws/session/{id}
  │        ├───────►├──────►│          │         │       │       │         │
  │        │        │       │ 6. Validate session, establish WS to AI Service
  │        │        │       ├─────────►│         │       │       │         │
  │        │        │       │          │ 7. Initialize VAD, buffers
  │        │        │       │          │         │       │       │         │
  │ 8. Display "Recording..." indicator
  │◄───────┤        │       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ ═══════════════════════════════════════════════════════════════════════│
  │ REAL-TIME STREAMING LOOP (continuous during consultation)             │
  │ ═══════════════════════════════════════════════════════════════════════│
  │        │        │       │          │         │       │       │         │
  │ 9. Médico speaks (continuous audio capture)
  ├───────►│        │       │          │         │       │       │         │
  │        │ 10. Send audio_chunk (Opus encoded, 20ms frames)
  │        ├───────►├──────►├─────────►│         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 11. VAD analysis (< 100ms)
  │        │        │       │          │ IF voice_active && buffer >= 5s:
  │        │        │       │          │   → Send to Whisper
  │        │        │       │          ├────────────────►│       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 12. Whisper returns transcription (1-1.5s)
  │        │        │       │          │◄────────────────┤       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 13. Incremental diarization (speaker tag)
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 14. WebSocket event: transcription_update
  │        │◄───────┴───────┴─────────►│         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ 15. Display transcription in real-time (latency < 2s)
  │◄───────┤        │       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 16. Extract entities (GPT-4o-mini/GPT-4o)
  │        │        │       │          ├────────────────►│       │         │
  │        │        │       │          │◄────────────────┤       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 17. Entity matching (similarity search)
  │        │        │       │          │ IF new entity:  → symptom_extracted
  │        │        │       │          │ IF match > 0.85: → symptom_updated
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 18. WebSocket event: symptom_extracted/updated
  │        │◄───────┴───────┴─────────►│         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ 19. Display extracted entity (latency < 3s from mention)
  │◄───────┤        │       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 20. RAG validation (async, non-blocking)
  │        │        │       │          ├─────────────────────────►│         │
  │        │        │       │          │◄─────────────────────────┤         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 21. IF drug interaction detected:
  │        │        │       │          │   → WebSocket: interaction_warning (< 1s)
  │        │◄───────┴───────┴─────────►│         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ 22. Display CRITICAL ALERT if interaction (< 1s)
  │◄───────┤        │       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 23. Persist event to PostgreSQL
  │        │        │       │          ├───────────────────────────────────►│
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 24. Buffer event in Redis (60s TTL)
  │        │        │       │          ├────────►│       │       │         │
  │        │        │       │          │         │       │       │         │
  │ ═══════════════════════════════════════════════════════════════════════│
  │ RECONNECTION SCENARIO (if WebSocket drops)                            │
  │ ═══════════════════════════════════════════════════════════════════════│
  │        │        │       │          │         │       │       │         │
  │        │ 25. Connection lost (network issue)
  │        │───X────│       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │ 26. Reconnect with last_event_id in handshake
  │        ├───────►├──────►│          │         │       │       │         │
  │        │        │       │ 27. Fetch missed events from Redis buffer
  │        │        │       ├──────────┴────────►│       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │ 28. Replay missed events to client
  │        │◄───────┴───────┤          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ 29. Client reconstructs state, continues streaming
  │◄───────┤        │       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ ═══════════════════════════════════════════════════════════════════════│
  │ END OF CONSULTATION                                                    │
  │ ═══════════════════════════════════════════════════════════════════════│
  │        │        │       │          │         │       │       │         │
  │ 30. Click "End Consultation"
  ├───────►│        │       │          │         │       │       │         │
  │        │ 31. Send end_session message via WebSocket
  │        ├───────►├──────►├─────────►│         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 32. Generate final SOAP note
  │        │        │       │          ├────────────────►│       │         │
  │        │        │       │          │◄────────────────┤       │         │
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 33. Persist final state to PostgreSQL
  │        │        │       │          ├───────────────────────────────────►│
  │        │        │       │          │         │       │       │         │
  │        │        │       │          │ 34. WebSocket: session_complete
  │        │◄───────┴───────┴─────────►│         │       │       │         │
  │        │        │       │          │         │       │       │         │
  │ 35. Display complete consultation summary + SOAP note
  │◄───────┤        │       │          │         │       │       │         │
  │        │        │       │          │         │       │       │         │
```

**Timing annotations (Real-Time):**
- Step 1-8: ~2 seconds (session creation + WebSocket handshake)
- Steps 9-24 (streaming loop): Continuous, latency targets:
  - Transcription: < 2s from speech to display
  - Entity extraction: < 3s from mention to display
  - Critical alerts: < 1s (drug interactions)
- Steps 25-29 (reconnection): < 5s to restore state
- Steps 30-35 (end): ~3-5s (final SOAP generation)

**WebSocket Message Types:**

| Event | Direction | Latency Target | Data |
|-------|-----------|----------------|------|
| `audio_chunk` | Client → Server | N/A | Base64 Opus audio |
| `transcription_update` | Server → Client | < 2s | `{text, speaker, is_final, timestamp}` |
| `symptom_extracted` | Server → Client | < 3s | `{name, severity, action: "created"}` |
| `symptom_updated` | Server → Client | < 3s | `{id, changes, action: "updated"}` |
| `diagnosis_detected` | Server → Client | < 3s | `{name, cie10, confidence}` |
| `prescription_added` | Server → Client | < 3s | `{medication, dose, frequency}` |
| `interaction_warning` | Server → Client | < 1s | `{severity: "MAJOR", medications, recommendation}` |
| `entity_validated` | Server → Client | < 5s | `{entity_id, rag_result}` |
| `session_complete` | Server → Client | N/A | `{soap, costs, duration}` |
| `error` | Server → Client | N/A | `{code, message}` |

### 6. Create Multi-Cloud Equivalences Diagram

**Diagram Specifications for `multi-cloud-equivalences.png`:**

**Content:** Visual table showing service mappings across AWS, GCP, Azure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              EQUIVALENCIAS MULTI-CLOUD — MedRecord AI                        │
│                                                                              │
│  Componente Arquitectónico    │    AWS         │    GCP           │  Azure  │
│───────────────────────────────┼────────────────┼──────────────────┼─────────┤
│                               │                │                  │         │
│  🖥️ COMPUTE (Containers)       │                │                  │         │
│   Single VM + Docker           │  EC2 t3.medium │ Compute Engine   │ Azure VM│
│                               │                │  e2-medium       │  B2s    │
│   Managed Kubernetes          │  EKS           │  GKE             │  AKS    │
│   Serverless Containers       │  ECS Fargate   │  Cloud Run       │ Container│
│                               │  Lambda        │  Cloud Functions │  Apps   │
│                               │                │                  │         │
│  💾 DATABASE                   │                │                  │         │
│   PostgreSQL Managed          │  RDS PostgreSQL│ Cloud SQL        │ Azure DB│
│                               │                │  PostgreSQL      │PostgreSQL│
│   Object Storage              │  S3            │  Cloud Storage   │  Blob   │
│                               │                │  (GCS)           │ Storage │
│                               │                │                  │         │
│  🔐 SEGURIDAD                  │                │                  │         │
│   Secrets Management          │  Secrets       │  Secret Manager  │   Key   │
│                               │  Manager       │                  │  Vault  │
│   Identity & Access           │  IAM + Cognito │  IAM + Identity  │ Azure AD│
│                               │                │  Platform        │+ Entra ID│
│                               │                │                  │         │
│  📊 OBSERVABILIDAD             │                │                  │         │
│   Logging & Monitoring        │  CloudWatch    │ Cloud Logging +  │  Azure  │
│                               │                │  Cloud Monitoring│ Monitor │
│   Application Performance     │  X-Ray         │  Cloud Trace     │ App     │
│   Monitoring (APM)            │                │                  │ Insights│
│                               │                │                  │         │
│  🌐 NETWORKING                 │                │                  │         │
│   Load Balancer               │  ALB / NLB     │ Cloud Load       │ Azure LB│
│                               │                │  Balancing       │         │
│   DNS                         │  Route 53      │  Cloud DNS       │ Azure   │
│                               │                │                  │  DNS    │
│   CDN                         │  CloudFront    │  Cloud CDN       │ Azure   │
│                               │                │                  │  CDN    │
│                               │                │                  │         │
│  🔧 CI/CD                      │                │                  │         │
│   Managed CI/CD               │  CodePipeline  │  Cloud Build +   │ Azure   │
│                               │  + CodeDeploy  │  Cloud Deploy    │ DevOps  │
│   Infrastructure as Code      │     Terraform (Cloud-agnostic)    │         │
│                               │                │                  │         │
└─────────────────────────────────────────────────────────────────────────────┘

NOTAS:
  - Implementación actual: AWS EC2 t3.medium + Docker Compose
  - Migración estimada a GCP/Azure: 2-3 días (solo Terraform + configuración)
  - Código de aplicación: 0% de cambios (vendor-agnostic mediante variables de entorno)
```

### 7. Diagram Export Settings

For all diagrams, use these export settings:

**PNG Export (for docs/architecture/):**
- Resolution: 300 dpi
- Format: PNG
- Background: White (not transparent)
- Border width: 10px padding
- Compression: Medium (balance quality vs. file size)

**SVG Export (optional, for web viewing):**
- Format: SVG
- Embed fonts: Yes
- Include metadata: Yes

**Draw.io Source Files:**
- Save all `.drawio` files for future editing
- Use consistent styling (colors, fonts, shapes)
- Add version number in diagram footer (v1.0)

### 8. Diagram Review Checklist

Before finalizing diagrams, verify:

**C4 Context:**
- [ ] Shows all external actors (Médico, Administrador)
- [ ] Shows external systems (OpenAI API, Bases de Conocimiento)
- [ ] MedRecord AI is clearly the central system
- [ ] All relationships are labeled with purpose
- [ ] Legend explains notation

**C4 Container:**
- [ ] All containers present: Frontend, Backend, AI Service, DBs, Redis, Nginx
- [ ] Protocols labeled on all arrows (HTTP, HTTPS, PostgreSQL, Redis)
- [ ] Ports documented for each service
- [ ] Technology names included (React, Node.js, FastAPI, PostgreSQL, etc.)
- [ ] Color coding consistent (apps vs. databases vs. infrastructure)
- [ ] AWS EC2 boundary box clearly shows what's inside the server
- [ ] External systems (OpenAI API) outside the EC2 box

**Sequence Diagram (Batch):**
- [ ] All 25 steps numbered sequentially
- [ ] Async processing clearly separated with different visual style
- [ ] Timing annotations included (upload: 3-5s, processing: 120-180s, polling: 5s)
- [ ] Error handling shown for at least one failure case (optional but recommended)
- [ ] Return messages match request messages

**Sequence Diagram (Real-Time):**
- [ ] All 35 steps numbered sequentially
- [ ] WebSocket bidirectional flow clearly shown
- [ ] Streaming loop section visually separated
- [ ] Reconnection scenario included
- [ ] Latency targets annotated (transcription <2s, extraction <3s, alerts <1s)
- [ ] All WebSocket message types documented in table
- [ ] Entity matching flow shown (new vs. update)
- [ ] Critical alert flow highlighted (drug interactions <1s)

**Multi-Cloud:**
- [ ] All 7 categories present (Compute, Database, Security, Observability, Networking, CI/CD, IaC)
- [ ] Equivalent services correctly mapped across AWS, GCP, Azure
- [ ] Current implementation highlighted (AWS EC2 + Docker Compose)
- [ ] Migration notes included

**General:**
- [ ] High resolution (300 dpi minimum)
- [ ] Readable fonts (minimum 10pt)
- [ ] Consistent color scheme across all diagrams
- [ ] Title and version on each diagram
- [ ] Legend/notation guide included
- [ ] No spelling errors in labels

## Expected Deliverables

After completing this prompt:

- ✅ `docs/architecture/README.md` - Diagram index and descriptions
- ✅ `docs/architecture/architecture-c4-context.png` - C4 Level 1 (300 dpi)
- ✅ `docs/architecture/architecture-c4-container.png` - C4 Level 2 with WebSocket components (300 dpi)
- ✅ `docs/architecture/sequence-diagram-transcription-flow.png` - Batch processing flow (300 dpi)
- ✅ `docs/architecture/sequence-diagram-realtime-streaming.png` - Real-time WebSocket flow (300 dpi)
- ✅ `docs/architecture/multi-cloud-equivalences.png` - AWS ↔ GCP ↔ Azure mapping
- ✅ `docs/architecture/*.drawio` - Source files for all diagrams

## BSG Compliance

This prompt ensures:
- ✅ **C4 diagrams** at Context + Container levels (required)
- ✅ **Sequence diagrams** showing both batch and real-time streaming flows
- ✅ **High resolution** exports (300 dpi exceeds 150 dpi minimum)
- ✅ **All required components** visible: actors, API Gateway, LLM, vector store, data sources, security, observability
- ✅ **WebSocket architecture** clearly shown in C4 Container and real-time sequence diagram
- ✅ **Self-explanatory diagrams** with legends and labels
- ✅ **Multi-cloud equivalences** demonstrate vendor-agnostic thinking (BSG requirement)
- ✅ **Editable source files** (.drawio) for future updates

## Notes

- Diagrams should be created AFTER ADRs are completed (to ensure consistency)
- Use C4 model notation strictly for Context and Container diagrams
- Batch sequence diagram shows traditional polling-based flow
- Real-time sequence diagram shows WebSocket streaming with entity matching and critical alerts
- Multi-cloud diagram demonstrates architectural thinking even with AWS-only implementation
- Include version numbers on diagrams for traceability
- Export both PNG (for documents) and SVG (for web) if possible
- Real-time diagram should clearly show latency targets: <2s transcription, <3s extraction, <1s critical alerts
