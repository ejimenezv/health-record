# Prompt 06: Architecture Design - High Level

## Objective
Create the high-level architecture design for MedRecord AI. This starts Delivery 2 and maps to Sections 3.1 and 3.2 of the BSG template.

## Context
**BSG Delivery 2 Requirements:**
> "Materializa las decisiones de diseño del sistema. Es el blueprint técnico que permite que cualquier ingeniero competente pueda implementar el sistema sin ambigüedades."

This prompt focuses on the general architecture, component descriptions, and technology justifications.

## Tasks

### 1. Create Architecture Design Document
Create `docs/delivery-2/01-architecture-design.md`:

```markdown
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

| Componente | Tecnología | Responsabilidad | Justificación |
|------------|------------|-----------------|---------------|
| **API Gateway** | FastAPI | Enrutamiento REST, autenticación, rate limiting, documentación OpenAPI | Framework Python moderno con async nativo, validación Pydantic, docs automáticas. Requisito BSG usar Python. |
| **★ WebSocket Gateway** | FastAPI WebSockets + Opus | **Conexión bidireccional** para streaming de audio y eventos en tiempo real. Maneja reconexión, autenticación WS, event broadcasting | FastAPI tiene WebSocket nativo, Opus codec reduce bandwidth 70% vs PCM (16kHz Opus ≈ 24-32 kbps). Latencia crítica <500ms. |
| **★ Stream Processor** | Silero VAD + NumPy | **Procesamiento inteligente de audio streaming**: VAD en tiempo real, buffering adaptivo (voz: 5s, silencio: batch/skip), decisión de envío a Whisper | Silero VAD <100ms latency, buffering inteligente ahorra 20-30% costos Whisper sin sacrificar UX. |
| **Transcription Service** | OpenAI Whisper API (streaming chunks) | Conversión de audio a texto en español con chunks de 5s o batches | Mejor precisión para español (>95%), timestamps incluidos, API madura. Chunks pequeños = baja latencia. |
| **Diarization Service** | Heurísticas + LLM (incremental) | Identificación de hablantes (médico/paciente) de forma incremental | Evita costos de servicios de diarización externos. Heurísticas basadas en turnos y vocabulario médico, actualiza en streaming. |
| **Extraction Service** | GPT-4o-mini (60%) + GPT-4o (40%) | **Extracción incremental estructurada** de datos médicos: síntomas, diagnósticos, prescripciones, motivo consulta | Multi-tier: GPT-4o-mini para extracciones simples (cost savings), GPT-4o para críticas (prescripciones). Latencia <3s. |
| **★ Entity Matching Engine** | text-embedding-3-small + reglas de negocio | **Matching semántico y resolución de conflictos**: detecta si nueva mención se refiere a entidad existente, fusiona/actualiza según umbral (0.70-0.85-1.0) | Evita duplicados, mantiene coherencia. Embeddings + business rules (medication name, symptom location, ICD-10). Versionado con changelog. |
| **RAG Pipeline** | LangChain + ChromaDB | **Validación asíncrona incremental**: priority queue (CRITICAL/HIGH/MEDIUM), cache Redis (60-70% hit rate) | ChromaDB es gratuito y local. Validación no-bloqueante con timeouts por prioridad (1s/2s/3s). |
| **Vector Store** | ChromaDB | Almacenamiento y búsqueda de embeddings para RAG | Open source, fácil setup local, suficiente para volumen esperado (<1M chunks). |
| **Embedding Service** | OpenAI text-embedding-3-small | Generación de embeddings para RAG y entity matching | Buen balance costo/calidad, 1536 dimensiones, soporte multilingüe. Usado tanto en RAG como matching. |
| **Database** | PostgreSQL | Metadatos, sesiones, usuarios, audit logs, version history de entidades | Robusto, ACID, soporte JSON para changelogs, estándar de industria. |
| **Session State + Cache** | Redis | **CRÍTICO para real-time**: WebSocket session state, event buffering (reconexión), RAG cache (300ms→5ms), priority queue | Latencia <5ms, persistencia de sesión para reconexión (60s window), cache con TTL 30min. ESENCIAL para streaming. |
| **Auth Service** | JWT + bcrypt | Autenticación REST y WebSocket (token en handshake) | Estándar de industria, stateless, fácil de implementar. WebSocket usa mismo JWT en upgrade request. |
| **Observability** | structlog + Prometheus | Logging estructurado, métricas de latencia (p50/p95/p99), trazas de eventos WS | Configuración estándar, compatible con Grafana. Crítico monitorear latencias real-time. |

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

### 4.4 Diarización Heurística

**Decisión:** Usar heurísticas basadas en patrones de conversación en lugar de modelos de diarización por voz.

**Justificación:**
- Evita costos de APIs de diarización ($$$)
- Contexto médico ayuda a identificar roles
- Precisión suficiente (>90%) para 2 hablantes
- Puede mejorarse con LLM si es necesario

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
```

## Expected Deliverables
- `docs/delivery-2/01-architecture-design.md` - High-level architecture design

## Verification Steps
1. C4 diagrams are clear and complete
2. All components are described with justifications
3. External services are identified with costs
4. Key architectural decisions are documented
5. Security considerations are included
6. Patterns are identified and applied appropriately

## Notes
- This is Delivery 2 content - technical blueprint
- Diagrams should be ASCII for portability (can convert to images later)
- Every decision needs justification
- Focus on the AI Service as the core deliverable
- Integration with existing frontend/backend is documented
- This maps to Sections 3.1 and 3.2 of BSG template
