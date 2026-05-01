# ADR-004: Arquitectura del servicio AI (FastAPI + WebSockets + Redis)

**Fecha:** 01/05/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

## Contexto

El servicio AI es responsable de transcripción, diarización, extracción de entidades médicas y validación RAG. Se ejecuta como contenedor independiente (`medrecord-ai-service`) e integra con el backend Node.js mediante HTTP + WebSocket (ver ADR-003).

**Requerimientos clave:**

- Streaming bidireccional de audio (cliente → servicio) y eventos JSON (servicio → cliente) con latencia p95 < 2 s
- Procesamiento incremental: la extracción debe entregar resultados parciales mientras la consulta avanza, no al final
- Sesiones de hasta 90 minutos con estado mutable (transcripción acumulada, entidades detectadas, presupuesto consumido)
- Reconexión sin pérdida de eventos
- Stack debe ser Python (ecosistema AI/ML maduro: OpenAI SDK, Whisper, Silero VAD, ChromaDB)

## Decisión

**Stack:**

- **Framework HTTP/WS**: **FastAPI** con WebSockets nativos
- **Estado de sesión y buffer de eventos**: **Redis** (TTL 1 h, AOF persistence en producción)
- **Vector store**: **ChromaDB** (ver ADR-002)
- **Cola de tareas pesadas**: ninguna — el procesamiento es streaming, no batch
- **Embeddings y LLM**: OpenAI SDK directo (ver ADR-001)

**Estructura modular** (ver [ai-service/src/](../../ai-service/src/)):

```
src/
├── api/
│   ├── endpoints/         # routers REST: sessions, transcription, extraction, health
│   ├── websocket/         # streaming.py (handler principal), manager.py (registro de conexiones)
│   ├── middleware/        # auth JWT, request-id, logging estructurado
│   └── schemas.py         # Pydantic models compartidos
├── core/                  # config, logging, settings (12-factor)
├── transcription/
│   ├── diarization/       # ver ADR-005: audio_feature_diarizer, llm_validator, incremental_*
│   └── hallucination_filter.py
├── services/
│   ├── extraction/        # incremental_extractor.py + models.py
│   ├── entity_matching.py # dedup semántico de entidades repetidas
│   ├── entity_dedup.py
│   ├── model_selector.py  # tiering FAST_CHEAP / BALANCED / PREMIUM
│   ├── cost_tracker.py    # presupuesto por sesión
│   ├── stream_processor.py
│   └── cache.py
├── rag/
│   ├── embeddings.py
│   ├── vector_store.py    # interfaz + adapter ChromaDB
│   ├── retriever.py
│   ├── batched_validator.py
│   ├── prefetcher.py
│   └── validation_coordinator.py
├── security/              # JWT validation, rate limiting
└── models/                # Pydantic domain models (Symptom, Diagnosis, Prescription, ...)
```

**Justificación:**

- **FastAPI** sobre Flask/Django: async/await nativo (crítico para llamadas concurrentes a OpenAI), validación Pydantic gratis, OpenAPI generado automáticamente, WebSocket de primera clase.
- **Redis** sobre cualquier cola tradicional (Celery/RQ/Kafka): el caso de uso es **streaming de eventos en una sesión activa**, no jobs offline. Redis cubre buffer de reconexión, caché de embeddings, dedupe keys y rate-limit counters con un solo dependency. Una cola añadiría latencia y complejidad operacional sin resolver un problema real.
- **Sin Celery** explícitamente: no hay tareas que sobrevivan al ciclo de vida de la conexión. Si en el futuro se añade procesamiento batch (p. ej. re-RAG de transcripciones históricas), se reevaluará.
- **Estructura modular por dominio** (no por tipo): `transcription/`, `services/extraction/`, `rag/` son carpetas autocontenidas con sus propios modelos y tests; favorece refactors localizados.

## Opciones evaluadas

| Stack | Async | WS nativo | Ecosistema AI/ML | OpenAPI | Curva de aprendizaje | Veredicto |
|---|---|---|---|---|---|---|
| **FastAPI + Redis (elegido)** | Sí | Sí | Excelente | Automático | Baja | Elegido |
| Flask + Celery + Redis | Limitado | Vía Flask-SocketIO | Excelente | Manual | Media | Rechazado: async forzado, WS de segunda |
| Django + Channels | Sí | Sí (Channels) | Excelente | Vía DRF | Alta | Rechazado: overkill, ORM no necesario |
| Node.js + ws | Sí | Sí | Limitado para Whisper/diarización | Vía Swagger manual | Baja | Rechazado: Python AI/ML domina; mantener dos stacks ya es decisión consciente (ADR-003) |
| Go + gorilla/websocket + Temporal | Sí | Sí | Pobre | Manual | Alta | Rechazado: ecosistema LLM/audio inmaduro |

## Consecuencias positivas

- **OpenAPI spec automática** publicada en `/api/v1/openapi.json` — usada como fuente de verdad para el cliente Node.js (ver ADR-003).
- **Type safety** end-to-end con Pydantic; los schemas de WebSocket events se validan tanto al emitir como al recibir.
- **Observabilidad simple**: structlog + request-id middleware → logs correlacionables con la sesión y los eventos persistidos en Postgres.
- **Footprint bajo**: la imagen runtime de [ai-service/Dockerfile](../../ai-service/Dockerfile) cabe en una réplica de 1 GB (ver `docker-compose.prod.yml`).
- **Dev loop rápido**: `docker compose up` levanta ai-service + ChromaDB + Redis + Postgres en < 30 s.

## Consecuencias negativas / Trade-offs

- **Dos lenguajes** en el stack (Node.js para backend de negocio, Python para AI). Asumido conscientemente en ADR-003.
- **Sin retry persistente**: si el contenedor se reinicia mid-sesión, los chunks en `session_audio` se pierden — solo sobreviven los eventos ya enviados al gateway de Node.js (que sí los persiste en Postgres). Aceptable para MVP; revisar si las sesiones son críticas.
- **WebSocket testing es más complejo** que REST. Mitigado con tests async usando `httpx.AsyncClient` + `websockets`.
- **Estado por sesión vive en memoria del proceso** (`session_audio: bytearray`, diarizador incremental, extractor) → un único proceso atiende cada sesión. No es horizontal-scalable sin sticky sessions o mover el estado a Redis.

## Criterios de revisión

| Trigger | Acción |
|---|---|
| > 50 sesiones concurrentes | Mover estado de sesión a Redis y permitir scaling horizontal con sticky LB |
| Aparecen jobs offline (re-RAG, re-evaluación batch) | Introducir cola (Celery o Arq) — no antes |
| Latencia de FastAPI/uvicorn deja de ser despreciable vs. tiempo de modelo | Considerar Granian o un servidor ASGI alternativo |
| Necesidad de gRPC para integración con un cliente no-browser | Añadir endpoint gRPC sin reemplazar WebSocket |

## Referencias

- Estructura del servicio: [ai-service/src/](../../ai-service/src/)
- Handler WebSocket principal: [ai-service/src/api/websocket/streaming.py](../../ai-service/src/api/websocket/streaming.py)
- Manager de conexiones: [ai-service/src/api/websocket/manager.py](../../ai-service/src/api/websocket/manager.py)
- Compose de runtime: [ai-service/docker-compose.yml](../../ai-service/docker-compose.yml), [ai-service/docker-compose.prod.yml](../../ai-service/docker-compose.prod.yml)
- Documento de pipeline: [docs/architecture/streaming-transcription-architecture.md](../architecture/streaming-transcription-architecture.md)
- ADR-001: Selección del modelo LLM
- ADR-002: Selección del vector store
- ADR-003: Integración Node↔Python
- ADR-006: Arquitectura de streaming en tiempo real
