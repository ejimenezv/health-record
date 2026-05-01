# Diseño de Arquitectura - MedRecord AI

## 1. Diagrama de Arquitectura General (C4 - Nivel Contexto)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA MEDRECORD AI                          │
│                                                                         │
│   ┌─────────────┐                                    ┌──────────────┐  │
│   │   Médico    │                                    │  Paciente    │  │
│   │  (Usuario)  │                                    │  (Indirecto) │  │
│   └──────┬──────┘                                    └──────────────┘  │
│          │                                                              │
│          │ Usa interfaz web                                            │
│          ▼                                                              │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                    Frontend (React)                               │ │
│   │    Captura audio + visualización en tiempo real                   │ │
│   └────────┬───────────────────────────────────────┬─────────────────┘ │
│            │                                       │                    │
│            │ REST API (auth, sessions)             │ WebSocket          │
│            │                                       │ (audio + events)   │
│            ▼                                       ▼                    │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                   Backend (Node.js)                               │ │
│   │         Gestión de datos, usuarios, citas                         │ │
│   └─────────────────────────────┬────────────────────────────────────┘ │
│                                 │                                       │
│                  REST API        │         WebSocket (proxy)            │
│                  (queries)       │         (streaming bidirectional)    │
│                                 ▼                                       │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │          ★ AI Service (Python/FastAPI) - REAL-TIME ★              │ │
│   │  WebSocket Gateway │ Transcripción Streaming │ Extracción         │ │
│   │  Incremental │ RAG │ Entity Matching │ Validación                 │ │
│   └─────────────────────────────┬────────────────────────────────────┘ │
│                                 │                                       │
│              ┌──────────────────┼──────────────────┬─────────────┐     │
│              ▼                  ▼                  ▼             ▼     │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ ┌─────────┐ │
│   │   OpenAI     │   │  ChromaDB    │   │  PostgreSQL  │ │  Redis  │ │
│   │   Whisper    │   │  (Vectors)   │   │  (Metadata)  │ │ (State) │ │
│   │   GPT-4      │   │              │   │              │ │ (Cache) │ │
│   └──────────────┘   └──────────────┘   └──────────────┘ └─────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Diagrama de Contenedores (C4 - Nivel Contenedor) - ARQUITECTURA REAL-TIME

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         AI SERVICE (REAL-TIME STREAMING)                        │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                         FastAPI Application                               │ │
│  │                                                                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │ │
│  │  │  /health    │  │  /auth      │  │  /query     │  │ /sessions/    │   │ │
│  │  │  /metrics   │  │  /token     │  │  /ingest    │  │   stream      │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │  (WebSocket)  │   │ │
│  │                                                      └───────┬───────┘   │ │
│  │                                                              │           │ │
│  │                                      ┌───────────────────────▼────────┐  │ │
│  │                                      │  ★ WebSocket Gateway ★         │  │ │
│  │                                      │  - Connection management       │  │ │
│  │                                      │  - Opus codec (encode/decode)  │  │ │
│  │                                      │  - Event broadcasting          │  │ │
│  │                                      │  - Reconnection handling       │  │ │
│  │                                      │  - Session state (Redis)       │  │ │
│  │                                      └───────┬────────────────────────┘  │ │
│  │                                              │ Audio chunks + events    │ │
│  │                                              ▼                           │ │
│  │                                      ┌────────────────────────────────┐  │ │
│  │                                      │  ★ Stream Processor ★          │  │ │
│  │                                      │  ┌──────────────────────────┐  │  │ │
│  │                                      │  │  Streaming VAD           │  │  │ │
│  │                                      │  │  (Silero - real-time)    │  │  │ │
│  │                                      │  └────────┬─────────────────┘  │  │ │
│  │                                      │           │                    │  │ │
│  │                                      │  ┌────────▼─────────────────┐  │  │ │
│  │                                      │  │ Intelligent Buffering    │  │  │ │
│  │                                      │  │ - Voice: send every 5s   │  │  │ │
│  │                                      │  │ - Silence 0-2s: buffer   │  │  │ │
│  │                                      │  │ - Silence 2-10s: batch   │  │  │ │
│  │                                      │  │ - Silence >10s: SKIP     │  │  │ │
│  │                                      │  └────────┬─────────────────┘  │  │ │
│  │                                      └───────────┼────────────────────┘  │ │
│  │                                                  │                       │ │
│  │              ┌───────────────────────────────────┼────────────┐          │ │
│  │              ▼                                   ▼            ▼          │ │
│  │  ┌──────────────────────┐         ┌──────────────────────────────────┐  │ │
│  │  │ Transcription Module │         │  Incremental Extraction Module   │  │ │
│  │  │                      │         │                                  │  │ │
│  │  │ ┌──────────────────┐ │         │  ┌────────────────────────────┐  │  │ │
│  │  │ │ Whisper Streaming│ │         │  │ Incremental Diarization   │  │  │ │
│  │  │ │ (5s chunks)      │──────────▶│  │ (Speaker identification)   │  │  │ │
│  │  │ └──────────────────┘ │         │  └────────┬───────────────────┘  │  │ │
│  │  │                      │         │           │                      │  │ │
│  │  │ ┌──────────────────┐ │         │  ┌────────▼───────────────────┐  │  │ │
│  │  │ │ Partial Results  │ │         │  │ Extractor (GPT-4o/mini)   │  │  │ │
│  │  │ │ (streaming text) │──────────▶│  │ - Symptoms                 │  │  │ │
│  │  │ └──────────────────┘ │         │  │ - Diagnoses                │  │  │ │
│  │  │                      │         │  │ - Prescriptions            │  │  │ │
│  │  └──────────────────────┘         │  │ - Chief complaint          │  │  │ │
│  │                                    │  └────────┬───────────────────┘  │  │ │
│  │                                    └───────────┼──────────────────────┘  │ │
│  │                                                │ New entities            │ │
│  │                                                ▼                         │ │
│  │                                    ┌─────────────────────────────────┐   │ │
│  │                                    │ ★ Entity Matching Engine ★      │   │ │
│  │                                    │                                 │   │ │
│  │                                    │ ┌─────────────────────────────┐ │   │ │
│  │                                    │ │ Semantic Similarity         │ │   │ │
│  │                                    │ │ (Embeddings + Cosine)       │ │   │ │
│  │                                    │ │ Threshold: 0.70-0.85-1.00   │ │   │ │
│  │                                    │ └──────────┬──────────────────┘ │   │ │
│  │                                    │            │                    │   │ │
│  │                                    │ ┌──────────▼──────────────────┐ │   │ │
│  │                                    │ │ Business Rules Engine       │ │   │ │
│  │                                    │ │ - Medication name matching  │ │   │ │
│  │                                    │ │ - Symptom location matching │ │   │ │
│  │                                    │ │ - ICD-10 code matching      │ │   │ │
│  │                                    │ └──────────┬──────────────────┘ │   │ │
│  │                                    │            │                    │   │ │
│  │                                    │ ┌──────────▼──────────────────┐ │   │ │
│  │                                    │ │ Conflict Resolution         │ │   │ │
│  │                                    │ │ - MERGE / CREATE_NEW        │ │   │ │
│  │                                    │ │ - Version history           │ │   │ │
│  │                                    │ │ - Changelog with timestamps │ │   │ │
│  │                                    │ └─────────────────────────────┘ │   │ │
│  │                                    └────────┬────────────────────────┘   │ │
│  │                                             │ Updated entities           │ │
│  │                                             ▼                            │ │
│  │                                    ┌─────────────────────────────────┐   │ │
│  │                                    │ Async RAG Validation            │   │ │
│  │                                    │                                 │   │ │
│  │                                    │ ┌─────────────────────────────┐ │   │ │
│  │                                    │ │ Priority Queue              │ │   │ │
│  │                                    │ │ CRITICAL: <1s (Rx interact.)│ │   │ │
│  │                                    │ │ HIGH: <2s (Diagnoses)       │ │   │ │
│  │                                    │ │ MEDIUM: <3s (Symptoms)      │ │   │ │
│  │                                    │ └──────────┬──────────────────┘ │   │ │
│  │                                    │            │                    │   │ │
│  │                                    │ ┌──────────▼──────────────────┐ │   │ │
│  │                                    │ │ RAG Query + Cache (Redis)   │ │   │ │
│  │                                    │ │ - Medication validation     │ │   │ │
│  │                                    │ │ - Drug interactions         │ │   │ │
│  │                                    │ │ - ICD-10 codes              │ │   │ │
│  │                                    │ │ Cache hit: 60-70%           │ │   │ │
│  │                                    │ └─────────────────────────────┘ │   │ │
│  │                                    └─────────────────────────────────┘   │ │
│  │                                                                          │ │
│  │  Events flow back to WebSocket Gateway:                                 │ │
│  │  - transcription_update                                                 │ │
│  │  - symptom_extracted / symptom_updated                                  │ │
│  │  - diagnosis_detected                                                   │ │
│  │  - prescription_added                                                   │ │
│  │  - interaction_warning (CRITICAL <1s)                                   │ │
│  │  - chief_complaint_identified                                           │ │
│  │  - entity_validated                                                     │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                         External Services                                 │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │ │
│  │  │  OpenAI     │  │  ChromaDB   │  │ PostgreSQL  │  │   Redis          │ │ │
│  │  │  - Whisper  │  │  - Vectors  │  │ - Sessions  │  │  - Session state │ │ │
│  │  │  - GPT-4o   │  │  - RAG docs │  │ - Audit     │  │  - Event buffer  │ │ │
│  │  │  - GPT-mini │  │  - Search   │  │ - Users     │  │  - RAG cache     │ │ │
│  │  │  - Embed    │  │             │  │             │  │  - Priority queue│ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Descripción de Componentes Arquitectónicos

### 3.1 Componentes Principales (Arquitectura Real-Time)

> **Nota de implementación (post-Prompt 27.3):** Varios componentes
> evolucionaron durante la implementación. Esta tabla refleja el estado
> actual; ver columna "Notas" para deltas vs. el diseño inicial.

| Componente | Tecnología | Responsabilidad | Notas |
|------------|------------|-----------------|---------------|
| **API Gateway** | FastAPI | Enrutamiento REST, autenticación, rate limiting, documentación OpenAPI | Sin cambios |
| **★ WebSocket Gateway** | FastAPI WebSockets | **Conexión bidireccional** para streaming de audio y eventos en tiempo real. Audio en formato `audio/webm;codecs=opus` (MediaRecorder) | Cambio: el cliente envía webm container, no Opus crudo. La descodificación se hace via pydub+ffmpeg sobre un acumulador cumulativo de sesión. |
| **★ Stream slicer + VAD pre-check** | Silero VAD (singleton de proceso) + pydub | Slicing acumulativo con overlap de 1.5 s; VAD pre-check descarta slices silentes antes de Whisper | El `StreamProcessor` original (con árbol de decisión por chunk) **fue retirado**: era incompatible con la naturaleza no-decodable de chunks webm subsiguientes. Ver [streaming-transcription-architecture.md](../architecture/streaming-transcription-architecture.md). |
| **Transcription Service** | OpenAI Whisper API (`verbose_json`) | ASR con segments + timestamps. Slicing con overlap permite dedup por timestamps de segmentos | Sin cambios funcionales. `verbose_json` es ahora load-bearing (necesario para overlap dedup y hallucination filter). |
| **★ Hallucination filter** | Patrones + heurísticas + low-confidence checks | Descarta salidas espurias de Whisper sobre silencio (créditos YouTube, "Muchas gracias", `[Música]`, repeticiones, segments con `no_speech_prob` alto) | **Nuevo (follow-up #3):** [`src/transcription/hallucination_filter.py`](../../ai-service/src/transcription/hallucination_filter.py). 6 capas de detección, 40 unit tests. |
| **★ AudioFeatureDiarizer** | Resemblyzer (256-dim L2-normed) + clustering online | Identificación de hablantes por **timbre** (embeddings de voz + cosine similarity ≥ 0.70). Rol DOCTOR/PATIENT por keywords sobre transcript | **Nuevo (follow-up #5)**, reemplaza diarizer keyword-only. Centroides en Redis (EMA update). Cap 4 speakers/sesión. |
| **Extraction Service** | gpt-4o-mini (simple) + gpt-4o (críticas) | Extracción incremental (síntomas, diagnósticos, prescripciones) sobre rolling 3-chunk text context | Sin cambios estructurales; prompt de simple-extraction reforzado para no clasificar diagnósticos como síntomas. |
| **★ Entity Matching Engine** | text-embedding-3-small + reglas de negocio | Matching semántico interno al `IncrementalExtractor`: nueva mención vs entidad existente | Sin cambios — sigue invocándose dentro del extractor. Las nuevas capas siguientes operan **encima** de su salida. |
| **★ Atomic Entity Splitter** | gpt-4o-mini + heurística de short-circuit | Divide entidades compuestas ("fiebre y dolor de cabeza") en atómicas antes de UI/dedup | **Nuevo:** [`src/services/entity_splitter.py`](../../ai-service/src/services/entity_splitter.py). |
| **★ Entity Type Validator** | gpt-4o-mini con strict JSON | Reclasifica entidades mal tipificadas por el extractor ("resfriado común" como síntoma → diagnóstico) | **Nuevo:** [`src/services/entity_type_validator.py`](../../ai-service/src/services/entity_type_validator.py). Confianza ≥ 0.7 para reclasificar; menor → keep original. |
| **★ Entity Semantic Deduper** | text-embedding-3-small + cosine | Dedup semántico cross-mention de sinónimos ("Cefalea" ↔ "dolor de cabeza"); per-tipo, por sesión | **Nuevo:** [`src/services/entity_dedup.py`](../../ai-service/src/services/entity_dedup.py). Threshold 0.86; opcional LLM tiebreaker para borderline. |
| **RAG Pipeline** | ChromaDB 0.5.23 + RetrieverService + cache Redis | Validación asíncrona priority-queue (CRITICAL/HIGH/MEDIUM); corpus = vademecum semilla (30 meds) + interacciones (25) + CIE-10 (40) | Cliente y servidor ChromaDB ahora alineados (0.5.23). Bug fix: interacciones se buscan por nombre real, no por `MED_<uuid>`. |
| **Vector Store** | ChromaDB 0.5.23 | Almacenamiento de embeddings RAG | Sin cambios estructurales; pin de versión actualizado para alinear cliente/servidor. |
| **Embedding Service** | OpenAI text-embedding-3-small | Embeddings para RAG, EntityMatchingEngine, Entity Semantic Deduper | Reusado en 4 componentes; hoist a `Services` singleton es follow-up #7. |
| **Database** | PostgreSQL | Metadatos, sesiones, audit logs, persistencia de eventos del WS gateway | Sin cambios |
| **Session State + Cache** | Redis | WS session state, RAG cache, **per-session speaker centroides del diarizer** | Speaker embeddings añadidos a `SpeakerState.speaker_embeddings`. |
| **Auth Service** | JWT + bcrypt | Autenticación REST + WebSocket (dos secretos: usuario y service-to-service) | Sin cambios |
| **Observability** | structlog + Prometheus | Logs estructurados con keys consistentes (`session_id`, `slice_idx`, `method`, `reason`) | Eventos clave loggeados: `Skipped silent slice`, `Overlap dedup`, `Stripped boundary overlap`, `Dropped Whisper hallucination`, `Speaker change detected method=audio`, `Dropped semantic duplicate`, `Reclassified entity` |

### 3.2 Servicios Externos

| Servicio | Proveedor | Uso | Costo Estimado |
|----------|-----------|-----|----------------|
| Speech-to-Text | OpenAI Whisper | Transcripción de audio | $0.006/min |
| LLM | OpenAI GPT-4o | Extracción y queries | $2.50/1M input, $10/1M output |
| Embeddings | OpenAI text-embedding-3-small | Vectorización para RAG | $0.02/1M tokens |

### 3.3 Componentes de Infraestructura

| Componente | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| Container Runtime | Docker | Empaquetado de servicios |
| Orchestration | Docker Compose (dev) / Kubernetes (prod) | Gestión de contenedores |
| CI/CD | GitHub Actions | Build, test, deploy automático |
| IaC | Terraform | Provisioning de infraestructura cloud |
| Secrets | Environment variables / Vault | Gestión de secretos |

## 4. Decisiones Arquitectónicas Clave

### 4.1 Separación de AI Service

**Decisión:** Crear un servicio Python separado para AI en lugar de integrar en el backend Node.js existente.

**Justificación:**
- Requisito BSG: usar Python para el proyecto
- Mejor ecosistema de ML/AI en Python
- Independencia de deployment y scaling
- El frontend/backend existente solo actúan como bridge

### 4.2 RAG Integrado con Extracción

**Decisión:** El RAG no es solo un endpoint separado, sino que se integra activamente en el proceso de extracción médica.

**Justificación:**
- Validación de medicamentos en español
- Sugerencia de códigos CIE-10
- Detección de interacciones medicamentosas
- Mejora la precisión y confiabilidad de extracciones

### 4.3 Procesamiento Real-time Streaming (DECISIÓN CRÍTICA)

**Decisión:** Procesar audio mediante **streaming en tiempo real** con WebSocket bidireccional, transcripción incremental y extracción continua.

**Justificación:**
- **Requisito de negocio MUST-HAVE**: El médico necesita ver transcripción y extracciones durante la consulta, no después
- **UX superior**: Feedback inmediato permite al médico corregir/aclarar información en el momento
- **Safety crítica**: Alertas de interacciones medicamentosas en <1s pueden prevenir errores de prescripción
- **Costo optimizado**: Intelligent buffering con VAD mantiene costo similar a batch (+14-52% vs batch, pero -11% vs streaming puro)
  - 60 min consulta: Batch $0.21, Real-time $0.27-0.32, Streaming puro $0.36
  - VAD decision tree (voz→5s, silence 0-2s→buffer, 2-10s→batch, >10s→skip) ahorra 20-30%
- **Complejidad manejable**: FastAPI WebSockets nativo, Opus codec estándar, Redis para state management
- **Latencia target alcanzable**: <2s end-to-end (VAD <100ms, Whisper chunks 5s, extraction <3s, WS <500ms)

### 4.4 Diarización: keywords + audio-features (revisada en 27.3)

**Decisión original:** Heurísticas keyword-only sobre el transcript.

**Decisión actual (post follow-up #5):** Diarización híbrida.
- **Identificación de hablante (¿es la misma persona o distinta?)**: por
  embeddings de voz (Resemblyzer 256-dim, MIT, modelo bundled, ~30 ms/slice
  en CPU). Clustering online: cosine similarity vs centroides en Redis
  con EMA update; threshold 0.70; cap 4 speakers/sesión.
- **Asignación de rol (DOCTOR/PATIENT/UNKNOWN)**: keywords médicos en
  español sobre el transcript (la lógica original no se reemplazó —
  funcionaba bien para el rol; el problema era distinguir voces).

**Justificación del cambio:**
- El diarizer keyword-only no detectaba cambios cuando ambos hablantes
  usaban vocabulario similar.
- En sesiones con un solo hablante mayormente listening (consultas tipo
  anamnesis), nunca emitía `speaker_changed`.
- Resemblyzer evita la dependencia de servicios de diarización pagos y
  no requiere HF token (modelo bundled en el wheel).

**Limitaciones aceptadas:**
- Cap fijo de 4 speakers; voces adicionales se mergean en el centroid
  más cercano.
- Asignación de rol sigue dependiendo de keywords — sesiones cortas o
  con vocabulario atípico pueden quedar en `UNKNOWN`.

### 4.5 Pipeline anti-duplicados de entidades (nuevo en 27.3)

**Decisión:** Insertar 5 capas de procesamiento entre el extractor y la
emisión a la UI/persistencia.

```
ExtractionEvent (del extractor)
  ↓
Layer A — AtomicEntitySplitter (LLM)
  ↓
Layer B — Forbidden-prefix (string heurística)
  ↓
Layer C — EntityTypeValidator (LLM)
  ↓
Layer D — Heuristic dedup (exact / containment per-type)
  ↓
Layer E — EntitySemanticDeduper (embeddings + cosine)
  ↓
emit extraction_update event
```

**Justificación:** El UI de React es append-only — una entidad
incorrecta o duplicada no se puede retractar. Cada capa atrapa un modo
de fallo distinto del extractor LLM:

| Capa | Modo de fallo que atrapa |
|---|---|
| A | Compuestos como "fiebre y dolor de cabeza" emitidos junto con sus átomos |
| B | Frases ofensivas obvias ("diagnóstico de…" como síntoma) |
| C | Misclasificaciones sutiles ("resfriado común" como síntoma) |
| D | Repeticiones exactas o contenciones |
| E | Sinónimos médicos ("Cefalea" ↔ "dolor de cabeza") |

**Costo:** ~$0.0002/entidad en LLM calls (gpt-4o-mini), ~$0.0000002 en
embeddings. Despreciable vs el valor de una historia clínica limpia.

### 4.6 Filtro de hallucinations Whisper (nuevo en 27.3)

**Decisión:** Filtrar salidas de Whisper sobre silencio antes de
propagar al transcript visible.

**Justificación:** Whisper, sobre audio cuasi-silente, alucina frases
de su corpus de entrenamiento (créditos de YouTube, "Muchas gracias",
"[Música]", repeticiones de pleasantries). Estas frases **nunca** las
dijo el doctor. Persistirlas en la historia clínica es un riesgo de
data integrity.

Implementación: 6 capas en
[`src/transcription/hallucination_filter.py`](../../ai-service/src/transcription/hallucination_filter.py).

### 4.7 RAG corpus seed curado (nuevo en RAG seeding)

**Decisión:** Embarcar un dataset semilla curado manualmente (30
medicamentos, 25 interacciones, 40 CIE-10) en el repo, con script de
ingestión idempotente (`make ingest-vademecum-reset`).

**Justificación:** Sin RAG poblado, el flujo de validación clínica
nunca emite alertas y el panel "Alertas de Validación" parece roto. El
dataset semilla cubre las interacciones críticas más comunes
(warfarina + AINE, omeprazol + clopidogrel, etc.) y demuestra el flujo
end-to-end. La sustitución por una fuente real (CIMA, Vademecum.es) es
un swap de archivos JSON; el esquema y el flujo de retrieval no
cambian.

Detalles operativos: [`../guides/rag-vademecum-setup.md`](../guides/rag-vademecum-setup.md).

## 5. Patrones Arquitectónicos Aplicados

| Patrón | Aplicación |
|--------|------------|
| **Microservices** | AI Service como servicio independiente |
| **API Gateway** | FastAPI como punto de entrada único |
| **Repository Pattern** | Abstracción de acceso a datos |
| **Factory Pattern** | Creación de clientes LLM/embedding |
| **Strategy Pattern** | Diferentes estrategias de chunking |
| **Circuit Breaker** | Resiliencia ante fallos de APIs externas |
| **Event-Driven** | Webhooks para notificación de procesamiento |

## 6. Consideraciones de Seguridad en Arquitectura

| Aspecto | Implementación |
|---------|----------------|
| **Autenticación** | JWT tokens en cada request |
| **Autorización** | RBAC con roles admin/doctor/readonly |
| **Datos en tránsito** | TLS 1.2+ obligatorio |
| **Datos en reposo** | Encryption at rest en DB |
| **Secretos** | No en código, env vars o vault |
| **Input validation** | Pydantic schemas estrictos |
| **Output filtering** | No PII en logs |
| **Rate limiting** | Por usuario y global |
