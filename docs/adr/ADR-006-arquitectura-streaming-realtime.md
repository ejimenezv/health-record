# ADR-006: Arquitectura de streaming bidireccional en tiempo real

**Fecha:** 01/05/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

## Contexto

MedRecord AI debe procesar consultas médicas **mientras ocurren**, no al final. El médico ve transcripción, entidades extraídas y alertas críticas (interacciones medicamentosas) en vivo, y puede corregir o complementar.

**Requerimientos cuantificables:**

| Requerimiento | Objetivo |
|---|---|
| Latencia transcripción visible | < 2 s (p95) |
| Latencia alerta crítica de interacción | < 1 s (p95) |
| Sesiones soportadas | hasta 90 min |
| Reconexión sin pérdida de eventos | sí, con buffer de ≥ 60 s |
| Bandwidth overhead vs. PCM crudo | ≥ 60 % de ahorro |
| Costo adicional vs. batch puro | < +30 % |

## Decisión

**Arquitectura: WebSocket bidireccional con buffering inteligente y proxy persistente.**

### Topología

```
React (MediaRecorder webm/opus, timeslice 5 s)
   │  binary frames
   ▼
Node.js Gateway  ──persist─▶  PostgreSQL
   │                          (transcription_events,
   │                           extraction_events,
   │                           validation_alerts,
   │                           cost_events)
   │  forward verbatim
   ▼
Python AI Service WebSocket handler
 ai-service/src/api/websocket/streaming.py
```

El cliente nunca habla con Python directamente — el gateway de Node.js es proxy bidireccional **y** capa de persistencia (ver ADR-003 para la justificación).

### Pipeline en el handler de Python

Por cada mensaje binario, el handler acumula bytes y ejecuta `_slice_and_transcribe`, descrito en detalle en [docs/architecture/streaming-transcription-architecture.md](../architecture/streaming-transcription-architecture.md). Las capas son:

1. **Layer 1 — Tail floor**: en finalize, descartar audio < 500 ms.
2. **Layer 2 — Silero VAD pre-check**: si `voice_prob < 0.5`, no se llama a Whisper. Ahorro directo de tokens.
3. **Layer 3 — Whisper API verbose**: se envía la ventana con 1.5 s de overlap hacia atrás.
4. **Layer 4 — Overlap dedup a nivel de segmento**: solo se conservan segmentos con `seg.end > overlap_sec`.
5. **Layer 5 — `HallucinationFilter`**: descarta repeticiones, sound markers, pleasantries aisladas y baja confianza.
6. **Layer 6 — Text-level boundary dedup**: en el closure `on_transcript_chunk`, se quita el prefijo del texto nuevo que coincide con el sufijo del último emitido.

Después se hace fan-out a:

- `IncrementalDiarizer` (ver ADR-005)
- `IncrementalExtractor` (entidades médicas)
- `entity_matching` + `entity_dedup` (resolver duplicados/actualizaciones)
- `validation_coordinator` (RAG + alertas críticas)
- `cost_tracker` (presupuesto por sesión)

### Buffering inteligente (ahorro de costo)

| Patrón observado | Acción | % aproximado del audio |
|---|---|---|
| Voz activa | Buffer 5 s y enviar a Whisper | ~47 % |
| Pausa < 2 s | Continuar acumulando | ~12 % |
| Pausa 2–10 s | Enviar batch acumulado | ~17 % |
| Pausa > 10 s (exploración física, escritura, silencio) | **Skip** — no se envía | ~25 % |

El skip de pausas largas es la mayor fuente de ahorro: ~25 % del audio nunca consume tokens de Whisper. Se reconoce con Silero VAD operando sobre la ventana candidata.

### Tiering de LLM

Heredado de ADR-001:

| Tier | Cuándo |
|---|---|
| `FAST_CHEAP` (gpt-4o-mini) | Validación de diarización, lookups, dedup semántico |
| `BALANCED` (gpt-4o) | Extracción incremental, generación SOAP |
| `PREMIUM` (gpt-4-turbo) | Validación de interacciones medicamentosas (latencia objetivo < 1 s) |

### Codec y formato

- **Cliente**: `MediaRecorder` produce `audio/webm; codecs=opus` con timeslice 5000 ms.
- **Wire**: WebSocket binario, frames opaques.
- **Servidor**: decodifica con `pydub` + `ffmpeg` a `AudioSegment` antes de slicear.

### Eventos WebSocket (Python → cliente)

| Evento | Payload mínimo | Persistido en |
|---|---|---|
| `transcript_update` | `chunk_index`, `text`, `is_final`, `speaker?` | `transcription_events` |
| `speaker_changed` | `speaker`, `from_chunk`, `to_chunk` | dentro de `transcription_events` |
| `symptom_extracted` / `symptom_updated` | `name`, `severity`, `action` | `extraction_events` |
| `diagnosis_detected` | `name`, `cie10`, `confidence` | `extraction_events` |
| `prescription_added` | `medication`, `dose`, `frequency` | `extraction_events` |
| `interaction_warning` | `severity`, `medications`, `recommendation` | `validation_alerts` |
| `entity_validated` | `entity_id`, `rag_result` | `extraction_events` (linked) |
| `cost_update` | `tokens_in`, `tokens_out`, `usd_delta` | `cost_events` |
| `session_complete` | `final_transcript`, `final_cost_summary`, `summary` | `ai_sessions` (status update) |

### Reconexión

```
1. Cliente detecta close → backoff exponencial (1, 2, 4, 8, max 30 s).
2. Reconecta enviando last_received_event_id.
3. Servidor (vía Redis buffer, TTL 60 s) replay de eventos faltantes.
4. Si la ventana de buffer expiró: el cliente puede leer desde Postgres (gateway expone GET sobre los events).
```

## Opciones evaluadas

| Opción | Latencia p95 | Costo/60 min | Bidireccional | Reconexión | Veredicto |
|---|---|---|---|---|---|
| **WebSocket + VAD buffering (elegido)** | ~2 s | $0.27–$0.32 | Sí | Replay + DB | Elegido |
| WebSocket sin buffering | ~1.5 s | $0.36 (+33 %) | Sí | Replay | Rechazado: ROI negativo |
| Server-Sent Events + POST audio | ~2.5 s | $0.27 | No (audio por POST aparte) | DB | Rechazado: dos canales, complejidad similar a WS sin ventajas |
| Polling cada 5 s | ~7.5 s | $0.23 | N/A | Stateless | Rechazado: incumple latencia |
| gRPC bidireccional | ~1.2 s | $0.30 | Sí | Custom | Rechazado: sin soporte nativo en navegador, complejidad alta |

## Consecuencias positivas

- **Latencia clínicamente útil**: el médico ve la transcripción y las entidades extraídas en vivo, y las alertas de interacción en < 1 s.
- **Costo controlado**: ~25 % de skip por silencios + dedup multi-capa mantiene el costo dentro de presupuesto.
- **Auditoría completa**: cada evento se persiste en Postgres antes (o en paralelo) de llegar al cliente; reproducción de sesión es trivial.
- **Reconexión robusta**: el cliente puede caer y recuperarse sin reiniciar la sesión.
- **Un solo canal binario** simplifica el contrato del frontend.

## Consecuencias negativas / Trade-offs

- **Complejidad arquitectónica alta** comparada con un endpoint REST batch. Documentación extensa requerida (este ADR + `streaming-transcription-architecture.md`).
- **Estado en memoria del proceso Python** (audio acumulado, diarizador, extractor) → no escala horizontalmente sin sticky sessions o externalizar estado a Redis.
- **Backpressure**: si el cliente sube audio más rápido de lo que se procesa, el `session_audio` crece sin límite. Mitigación: cap por tamaño y close graceful.
- **Tests más caros**: integración WebSocket end-to-end requiere fixtures con audio real o sintetizado.
- **Precisión streaming < precisión batch** (ver ADR-005) — aceptado a cambio de tiempo real.
- **Doble fuente de verdad transitoria**: durante la sesión el estado en RAM de Python y los eventos persistidos en Postgres coexisten; tras `session_complete` la fuente de verdad pasa a Postgres (ver ADR-003).

## Criterios de revisión

| Trigger | Acción |
|---|---|
| Latencia p95 > 3 s sostenida | Revisar codec, ventana de slicing, modelo Whisper |
| Costo > $0.40 por consulta de 60 min | Reentonar buffering inteligente o tiering LLM |
| > 50 sesiones concurrentes | Externalizar estado a Redis y habilitar scaling con sticky LB |
| Necesidad de < 500 ms latencia | Considerar edge processing o Whisper local |
| Pérdida de eventos > 0.1 % en producción | Reforzar replay; añadir ack por evento |

## Referencias

- Pipeline detallado: [docs/architecture/streaming-transcription-architecture.md](../architecture/streaming-transcription-architecture.md)
- Auditoría de pipeline: [docs/architecture/realtime-pipeline-audit.md](../architecture/realtime-pipeline-audit.md)
- Handler Python: [ai-service/src/api/websocket/streaming.py](../../ai-service/src/api/websocket/streaming.py)
- Gateway Node.js: [packages/backend/src/websocket/ai-session-gateway.ts](../../packages/backend/src/websocket/ai-session-gateway.ts)
- Persistencia de eventos: [packages/backend/src/services/event-persistence.service.ts](../../packages/backend/src/services/event-persistence.service.ts)
- Diseño WebSocket: [docs/delivery-2/06-websocket-implementation.md](../delivery-2/06-websocket-implementation.md)
- Entity matching: [docs/delivery-2/07-entity-matching-engine.md](../delivery-2/07-entity-matching-engine.md)
- ADR-001: Selección del modelo LLM (tiering)
- ADR-003: Integración Node↔Python (proxy + persistencia)
- ADR-004: Arquitectura del servicio AI (FastAPI/Redis)
- ADR-005: Estrategia de diarización
