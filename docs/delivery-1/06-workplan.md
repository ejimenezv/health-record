# Plan de Trabajo - MedRecord AI

## 1. Cronograma General

**Duración total:** 12 semanas (Semanas 1-12)

```
Semana 1-2:  Documentación y Diseño (Delivery 1 & 2)
Semana 3-4:  Infraestructura Core + WebSocket
Semana 5-6:  Streaming Pipeline (VAD, Transcripción)
Semana 7-8:  Extracción Incremental + Entity Matching
Semana 9-10: RAG Async + Validación + Alertas
Semana 11:   Integración Frontend/Backend + Testing
Semana 12:   Documentación Final y Video
```

## 2. Plan Detallado por Semana

### Semana 1: Documentación Fundacional (Delivery 1)

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Definir problema empresarial y caso de uso | 01-business-problem.md, 02-ai-use-case.md |
| 3-4 | Documentar requerimientos funcionales (real-time) | 03-functional-requirements.md |
| 5 | Documentar requerimientos no funcionales (latencia) | 04-non-functional-requirements.md |
| 6-7 | Definir alcance y plan de trabajo | 05-scope-definition.md, 06-workplan.md |

**Entrega Semana 1:** Delivery 1 completo
- Problema empresarial definido
- Caso de uso AI/LLM con tiempo real seleccionado
- Requerimientos funcionales y no funcionales (incluye latencia)
- Alcance delimitado (incluye streaming)
- Plan de trabajo 12 semanas

### Semana 2: Diseño de Arquitectura (Delivery 2)

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Diseño arquitectura C4 (incluye WebSocket) | 07-architecture-design.md |
| 3-4 | Diseño flujo datos streaming + RAG | 08-data-flow-rag-design.md |
| 5-6 | Diseño APIs REST + WebSocket + seguridad | 09-api-security-design.md |
| 7 | Configuración de proyecto y entorno | Estructura carpetas, configs |

**Entrega Semana 2:** Delivery 2 completo
- Arquitectura documentada (C4 con WebSocket)
- Flujo streaming definido
- Estrategia RAG asíncrona diseñada
- APIs REST + WebSocket especificadas
- Modelo de seguridad definido

### Semana 3: Infraestructura Core + WebSocket Setup

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Setup proyecto Python FastAPI | ai-service/ estructura |
| 3-4 | Implementar WebSocket server (FastAPI native) | src/api/websocket.py |
| 5-6 | Setup Redis para caché y session state | docker-compose + config |
| 7 | WebSocket echo test + reconexión básica | tests/unit/test_websocket.py |

**Hitos:**
- Proyecto Python configurado
- WebSocket bidireccional funcional
- Redis conectado y funcionando
- Test de latencia WebSocket < 500ms

### Semana 4: Codec de Audio y Buffer Circular

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Implementar Opus codec encoding/decoding | src/transcription/codec.py |
| 3-4 | Implementar buffer circular (10s) | src/transcription/buffer.py |
| 5-6 | Integrar recepción WebSocket → buffer | src/api/handlers/audio.py |
| 7 | Tests de codec y buffer | tests/unit/test_audio.py |

**Hitos:**
- Opus codec funcional (70% bandwidth savings)
- Buffer circular eficiente
- Audio flow: WebSocket → Decode → Buffer

### Semana 5: VAD Streaming + Decision Tree

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Implementar Silero VAD con streaming | src/transcription/vad.py |
| 3-4 | Implementar decision tree (voice/silence/skip) | src/transcription/chunking.py |
| 5-6 | Implementar intelligent buffering logic | src/transcription/buffer_manager.py |
| 7 | Tests de VAD + medición ahorro | tests/unit/test_vad.py |

**Hitos:**
- VAD con latencia < 100ms
- Decision tree: voz activa → 5s chunks, silencio → batch, >10s → skip
- Ahorro medido: >20% audio skipped

### Semana 6: Transcripción Streaming + Context

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Integrar Whisper API con chunks | src/transcription/transcriber.py |
| 3-4 | Implementar context prompt (últimos 200 chars) | src/transcription/context.py |
| 5-6 | Implementar normalización español médico | src/transcription/normalizer.py |
| 7 | Tests latencia transcripción | tests/integration/test_transcription.py |

**Hitos:**
- Transcripción funcional con WER < 10%
- Context window mejora continuidad
- Latencia transcripción: 1-1.5s por chunk
- WebSocket event: transcription_update

### Semana 7: Extracción Incremental + Diarización

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Implementar diarización incremental | src/transcription/diarizer.py |
| 3-4 | Implementar extracción GPT-4o-mini/4o (tiering) | src/extraction/extractor.py |
| 5-6 | Implementar chief complaint detection | src/extraction/chief_complaint.py |
| 7 | Tests extracción + events | tests/unit/test_extraction.py |

**Hitos:**
- Diarización 2-4 speakers con >90% precisión
- Extracción síntomas/diagnósticos/prescripciones < 3s
- Chief complaint detectado en primeros 5 min
- WebSocket events: symptom_extracted, diagnosis_detected, prescription_added

### Semana 8: Entity Matching Engine

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Implementar embedding generation | src/extraction/embeddings.py |
| 3-4 | Implementar similarity search + threshold | src/extraction/matcher.py |
| 5-6 | Implementar business rules (síntomas, Rx, Dx) | src/extraction/rules.py |
| 7 | Implementar version history + changelog | src/extraction/versioning.py |

**Hitos:**
- Matching con similarity > 0.85 → merge
- Business rules por tipo de entidad
- Versionado con timestamps
- WebSocket events: symptom_updated (con changes)

### Semana 9: RAG Pipeline Asíncrono

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Setup ChromaDB + Spanish medical KB | src/rag/vectorstore.py |
| 3-4 | Implementar priority queue validation | src/rag/validator.py |
| 5-6 | Implementar Redis caching (30min TTL) | src/rag/cache.py |
| 7 | Implementar /query y /ingest endpoints (BSG) | src/api/routers/rag.py |

**Hitos:**
- ChromaDB con KB español médico
- Priority: Rx (1s) > Dx (2s) > Sx (3s)
- Cache hit rate > 60%
- Endpoints BSG funcionales

### Semana 10: Alertas Críticas + Validación

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Implementar drug interaction detection | src/rag/interactions.py |
| 3-4 | Implementar alerta inmediata (< 1s) | src/api/alerts.py |
| 5-6 | Implementar CIE-10 suggestion | src/rag/cie10.py |
| 7 | Tests de alertas + latencia | tests/integration/test_alerts.py |

**Hitos:**
- Interacciones MAJOR detectadas
- Alerta WebSocket < 1s desde prescripción
- CIE-10 sugerido para diagnósticos
- WebSocket event: interaction_warning

### Semana 11: Integración Full Stack + Testing

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1-2 | Integrar frontend WebSocket client | packages/frontend/ updates |
| 3-4 | Integrar backend Node.js bridge | packages/backend/ updates |
| 5-6 | Tests de integración end-to-end | tests/integration/*.py |
| 7 | Tests de carga (10+ sesiones) | tests/load/*.py |

**Hitos:**
- Frontend muestra transcripción en vivo
- Frontend muestra extracciones en tiempo real
- Frontend muestra alertas de interacción
- 10+ sesiones concurrentes sin degradación
- Cobertura tests > 80%

### Semana 12: Despliegue, Docs y Video

| Día | Actividad | Entregable |
|-----|-----------|------------|
| 1 | Configurar Docker + docker-compose final | Dockerfile, docker-compose.yml |
| 2 | Configurar CI/CD pipeline | .github/workflows/*.yml |
| 3 | Implementar observabilidad | Logging, métricas, Grafana |
| 4 | Completar ADRs | docs/adr/*.md |
| 5 | Generar documento final | AI_LLM_Project_FINAL.md |
| 6-7 | Preparar y grabar video | Video demo (max 30 min) |

**Hitos:**
- Docker funcionando localmente
- CI/CD ejecutando en push
- Documento final completo
- Video mostrando:
  - Arquitectura real-time
  - Demo de transcripción en vivo
  - Demo de extracción incremental
  - Demo de alerta de interacción
  - Métricas de latencia y costo

## 3. Gestión de Riesgos del Plan

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Latencia WebSocket > 2s** | Media | Alto | Buffer tuning, test temprano en semana 3-4 |
| **Entity matching impreciso** | Media | Alto | Threshold tuning (0.85), business rules |
| Precisión insuficiente en español | Media | Alto | Iniciar pruebas temprano, ajustar prompts |
| Integración WebSocket frontend compleja | Media | Medio | Librería estándar, fallback SSE |
| Costos API exceden presupuesto | Media | Alto | VAD skip, caching, tracking día 1 |
| Concurrencia WebSocket baja | Baja | Medio | Redis pub/sub, sticky sessions |
| Tiempo insuficiente (12 semanas) | Media | Alto | Priorizar core real-time, scope flexible |

## 4. Criterios de Éxito por Delivery

### Delivery 1 (Semana 1)
- [ ] Problema empresarial cuantificado
- [ ] Caso de uso AI con tiempo real definido
- [ ] Requerimientos funcionales (streaming, latencia)
- [ ] Requerimientos no funcionales (< 2s latencia)
- [ ] Alcance delimitado (incluye real-time)
- [ ] Plan de trabajo 12 semanas aprobado

### Delivery 2 (Semana 2)
- [ ] Arquitectura C4 documentada (incluye WebSocket)
- [ ] Flujo de datos streaming definido
- [ ] Estrategia RAG asíncrona diseñada
- [ ] APIs REST + WebSocket especificadas
- [ ] Blueprint técnico completo

### Checkpoint Semana 6 (Mitad del Proyecto)
- [ ] WebSocket funcional con latencia < 500ms
- [ ] VAD streaming con >20% ahorro
- [ ] Transcripción con WER < 10%
- [ ] Al menos 1 tipo de extracción funcionando

### Delivery Final (Semana 12)
- [ ] **Latencia end-to-end < 2s** (p95)
- [ ] **Extracción incremental < 3s** (p95)
- [ ] **Alertas críticas < 1s** (p95)
- [ ] Entity matching funcional
- [ ] RAG con cache > 60% hit rate
- [ ] Código funcional y testeado
- [ ] API documentada (OpenAPI + WebSocket)
- [ ] Despliegue containerizado
- [ ] Cobertura tests >80%
- [ ] Video demo <30 min
- [ ] Documento final completo

## 5. Dependencias Externas

| Dependencia | Responsable | Fecha Límite |
|-------------|-------------|--------------|
| API Key OpenAI (Whisper + GPT-4o) | Yo | Semana 1 |
| Redis server (local o cloud) | Yo | Semana 3 |
| Datos de prueba (audio español consultas) | Yo | Semana 5 |
| Knowledge base médica español (medicamentos, CIE-10) | Yo | Semana 9 |
| Cuenta cloud (AWS/GCP) | Yo | Semana 11 |
| Librería Silero VAD | Yo | Semana 5 |
| Opus codec library | Yo | Semana 4 |
