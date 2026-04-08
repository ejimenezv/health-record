# Alcance del Proyecto - MedRecord AI

## 1. Alcance Delimitado

### 1.1 EN SCOPE (Incluido)

| Categoría | Funcionalidad | Detalle |
|-----------|---------------|---------|
| **🔴 Tiempo Real** | Transcripción streaming | WebSocket bidireccional, latencia < 2s |
| **🔴 Tiempo Real** | Extracción incremental | Síntomas/diagnósticos/Rx mientras se habla |
| **🔴 Tiempo Real** | Alertas de seguridad | Interacciones medicamentosas < 1s |
| **🔴 Tiempo Real** | Entity matching | Resolución de conflictos semántica |
| **Transcripción** | Procesamiento de audio | Streaming Opus hasta 90 minutos |
| **Transcripción** | Idioma | Español (todas variantes LATAM y España) |
| **Transcripción** | VAD streaming | Buffering inteligente (20-30% ahorro) |
| **Diarización** | Identificación de hablantes | 2-4 hablantes: médico/paciente/acompañante |
| **Extracción** | Chief Complaint | Motivo de consulta en primeros 5 min |
| **Extracción** | Síntomas | Nombre, ubicación, severidad, duración + matching |
| **Extracción** | Diagnósticos | Principal y diferenciales + CIE-10 |
| **Extracción** | Prescripciones | Medicamento, dosis, frecuencia + validación |
| **Extracción** | Nota SOAP | Generación incremental en vivo |
| **RAG** | Base de conocimiento | Medicamentos español, CIE-10, interacciones |
| **RAG** | Validación asíncrona | Priority queue, caching Redis |
| **RAG** | Endpoint /query | Consultas sobre conocimiento médico |
| **RAG** | Endpoint /ingest | Ingesta de documentos |
| **API** | REST + WebSocket | FastAPI con OpenAPI docs + WS bidireccional |
| **API** | Autenticación | JWT con refresh tokens |
| **API** | Eventos real-time | WebSocket events + fallback SSE |
| **Integración** | Backend existente | Conexión Node.js → AI Service |
| **Integración** | Frontend existente | UI con WebSocket para streaming |
| **Despliegue** | Containerización | Docker y Docker Compose |
| **Despliegue** | CI/CD | GitHub Actions pipeline |
| **Despliegue** | Cloud-ready | Terraform para AWS/GCP/Azure |
| **Testing** | Cobertura | >80% unit, integration, load tests |
| **Testing** | Tests real-time | Latencia, reconexión, concurrencia |
| **Testing** | Evaluación LLM | RAGAS para calidad RAG |
| **Documentación** | Técnica | ADRs, OpenAPI, diagramas C4 |
| **Documentación** | Usuario | Guía de uso, ejemplos |

### 1.2 OUT OF SCOPE (Excluido)

| Categoría | Funcionalidad | Razón de Exclusión |
|-----------|---------------|-------------------|
| **Transcripción** | Otros idiomas | Foco en español como diferenciador |
| **Diarización** | Más de 4 hablantes | Complejidad de diarización |
| **Diarización** | Identificación biométrica por voz | Requiere entrenamiento específico |
| **Extracción** | Fine-tuning de modelos | Usar APIs existentes optimizadas |
| **Extracción** | Imágenes médicas | Solo procesamiento de audio |
| **RAG** | Entrenamiento custom de embeddings | Usar modelos pre-entrenados |
| **Integración** | EHR externos (Epic, Cerner) | Requiere partnerships específicos |
| **Integración** | HL7/FHIR | Complejidad de estándares |
| **Aplicación** | App móvil nativa | Solo web API + frontend demo |
| **Compliance** | Certificación HIPAA formal | Proceso regulatorio largo |
| **Compliance** | Certificación ISO 27001 | Fuera de alcance temporal |
| **Infraestructura** | Multi-región activa | Una región suficiente para demo |
| **Infraestructura** | DR automatizado | Básico para MVP |
| **Operación** | Modo offline | Requiere conexión a Internet |

### 1.3 Límites del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DENTRO DEL ALCANCE                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     AI Service (Python FastAPI)                     │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│  │  │ WebSocket   │  │ Streaming   │  │ Incremental │  │ Entity    │ │  │
│  │  │ Server      │──│ VAD +       │──│ Extraction  │──│ Matching  │ │  │
│  │  │ (bidirec.)  │  │ Transcribe  │  │ (GPT-4o)    │  │ Engine    │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │  │
│  │         │                                                  │       │  │
│  │         │              ┌──────────────────────────────────┐│       │  │
│  │         │              │       RAG Pipeline (async)       ││       │  │
│  │         │              │  ┌──────────┐  ┌──────────────┐ ││       │  │
│  │         │              │  │ ChromaDB │  │ Redis Cache  │ ││       │  │
│  │         │              │  │ (Spanish │  │ (60-70% hit) │ ││       │  │
│  │         │              │  │  KB)     │  └──────────────┘ ││       │  │
│  │         │              │  └──────────┘                    ││       │  │
│  │         │              └──────────────────────────────────┘│       │  │
│  │         │                                                  │       │  │
│  │         ▼ WebSocket Events (< 500ms)                       ▼       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │   FastAPI REST + WebSocket + JWT Auth + Observability       │  │  │
│  │  │   • POST /query, /ingest (BSG)                               │  │  │
│  │  │   • WS /sessions/{id}/stream (real-time)                     │  │  │
│  │  │   • Events: transcription, extraction, alerts                │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Frontend (React)    │◀────────▶│ Backend (Node.js)              │    │
│  │ • WebSocket client  │  REST    │ • Bridge to AI Svc             │    │
│  │ • Real-time UI      │          │ • PostgreSQL                   │    │
│  │ • Audio streaming   │          │ • Session mgmt                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │         Infraestructura (Docker, CI/CD, IaC, Redis, Postgres)      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        FUERA DEL ALCANCE                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │ EHR      │  │ Otros    │  │ App      │  │ Certific. │  │ Multi-  │ │
│  │ Externos │  │ idiomas  │  │ Móvil    │  │ HIPAA/ISO │  │ región  │ │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Entregables del Proyecto

### 2.1 Entregables de Código

| Entregable | Descripción | Criterio de Aceptación |
|------------|-------------|----------------------|
| AI Service | Servicio Python FastAPI completo | Tests pasan, cobertura >80% |
| **WebSocket Server** | Streaming bidireccional | Latencia < 500ms, reconexión funcional |
| **Streaming Pipeline** | VAD + Transcripción | Latencia < 2s, ahorro >20% |
| **Entity Matching** | Matching semántico | Threshold 0.85, versionado |
| **RAG Async** | Validación con caché | Cache hit >60%, alertas < 1s |
| API REST + WebSocket | Endpoints documentados | OpenAPI spec válida |
| Docker | Containerización | docker-compose up funcional |
| CI/CD | Pipeline GitHub Actions | Build, test, deploy automático |
| IaC | Terraform modules | Desplegable en cloud |

### 2.2 Entregables de Documentación

| Entregable | Descripción | Ubicación |
|------------|-------------|-----------|
| Documento Final | AI_LLM_Project completo | Raíz del proyecto |
| ADRs | Decisiones arquitectónicas (5+) | docs/adr/ |
| OpenAPI Spec | Especificación de API | docs/api/ |
| Diagramas | C4, secuencia, despliegue | docs/architecture/ |
| README | Guía de inicio rápido | ai-service/README.md |
| Guía Usuario | Documentación de uso | docs/guides/ |

### 2.3 Entregables de Video

| Entregable | Duración | Contenido |
|------------|----------|-----------|
| Video Demo | Max 30 min | Arquitectura, demo funcional, código |

## 3. KPIs del Proyecto

| KPI | Línea Base | Meta | Medición |
|-----|-----------|------|----------|
| **🔴 Latencia end-to-end (real-time)** | N/A | <2s (p95) | Timestamps WebSocket |
| **🔴 Latencia extracción incremental** | N/A | <3s (p95) | Métricas eventos |
| **🔴 Latencia alertas críticas** | N/A | <1s (p95) | Métricas eventos |
| Precisión transcripción (WER) | N/A | <10% | Evaluación en muestra |
| Precisión extracción (F1) | N/A | >0.85 | RAGAS evaluation |
| Faithfulness RAG | N/A | >0.80 | RAGAS metrics |
| Cache hit rate RAG | N/A | >60% | Redis metrics |
| Costo por consulta 60min | N/A | <$0.30 | Tracking integrado |
| Ahorro vs streaming puro | N/A | >20% | Comparación |
| Cobertura de tests | 0% | >80% | pytest-cov |
| Uptime en pruebas | N/A | >99% | Monitoreo |
| Sesiones concurrentes | N/A | ≥10 | Load tests |
