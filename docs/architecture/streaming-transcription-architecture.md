# Arquitectura de Transcripción en Streaming

> **Estado:** Documenta el pipeline tal como está implementado tras la
> serie de prompts 27.1–27.3 y los follow-ups (overlap dedup, audio
> diarizer, hallucination filter, entity dedup pipeline, RAG vademecum).
> El árbol de decisión VAD original (sección "Apéndice A") fue
> reemplazado durante la implementación por uno más simple basado en
> overlap; se conserva el documento de diseño anterior porque varias
> decisiones (skip de silencio, contexto de 5 s) se mantienen.
>
> Companion: [`realtime-operational-notes.md`](../guides/realtime-operational-notes.md),
> [`realtime-pipeline-audit.md`](realtime-pipeline-audit.md),
> [`rag-vademecum-setup.md`](../guides/rag-vademecum-setup.md).

---

## 1. Pipeline real (post-27.3)

### 1.1 Visión general

```
React (MediaRecorder webm/opus, timeslice=5000ms)
  │
  │   binary frames over WebSocket
  ▼
Node Gateway  ──persist────▶  PostgreSQL (transcription_events,
  │                              extraction_events, validation_alerts,
  │                              cost_events)
  │   forward verbatim
  ▼
Python AI Service WebSocket handler (ai-service/src/api/websocket/streaming.py)
  │
  │   accumulate bytes → session_audio: bytearray
  ▼
┌──────────────────────────── _slice_and_transcribe ────────────────────────────┐
│                                                                                │
│  every audio msg arrives:                                                      │
│    1. decode FULL session_audio webm → AudioSegment                            │
│    2. new_ms = current_ms - last_processed_ms                                  │
│    3. if new_ms < 5000 (or < 100 on finalize): return                          │
│    4. slice with 1.5 s backward overlap →                                      │
│         audio_to_send = full_audio[max(0, last_processed_ms - 1500) : current] │
│                                                                                │
│  Layer 1 — Tail floor (finalize only)                                          │
│    if new_ms < 500: drop, return last_processed_ms                             │
│                                                                                │
│  Layer 2 — Silero VAD pre-check                                                │
│    voice_prob = vad(audio_to_send)                                             │
│    if voice_prob < 0.5: return new_last  (no Whisper call, $$ saved)           │
│                                                                                │
│  Layer 3 — Whisper API (verbose_json)                                          │
│    response.text + response.segments[{start,end,text,no_speech_prob,...}]      │
│                                                                                │
│  Layer 4 — Segment-level overlap dedup                                         │
│    keep only segments with seg.end > overlap_sec                               │
│                                                                                │
│  Layer 5 — HallucinationFilter (transcription/hallucination_filter.py)         │
│    drop if pattern / repetition / sound-marker / low confidence /              │
│    same-as-previous-slice / standalone pleasantry                              │
│                                                                                │
│  emit TranscriptionChunk(text, audio_samples, ...) → on_transcript_chunk       │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────── on_transcript_chunk (closure) ──────────────────────────┐
│                                                                                │
│  Layer 6 — Text-level boundary dedup (_strip_overlap_text)                     │
│    strip prefix of new text that matches suffix of last_emitted_text           │
│    ("…miligramos." then "miligramos y jarabe…" → "y jarabe…")                  │
│                                                                                │
│  emit transcript_update event to React (chunk_index, text, is_final, ...)     │
│                                                                                │
│  fan out to:                                                                   │
│    • diarizer.process_chunk(text, timestamp, audio_samples=...)                │
│    • extractor.process_transcript_chunk(text, timestamp, is_partial)           │
│                                                                                │
│  also: seed initial speaker_changed event after first chunk                    │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                          ▼
┌────────────── AudioFeatureDiarizer ─────┐   ┌───── IncrementalExtractor ─────┐
│ (transcription/diarization/             │   │ (services/extraction/          │
│  audio_feature_diarizer.py)             │   │  incremental_extractor.py)     │
│                                         │   │                                │
│ Resemblyzer.embed(audio_samples) →      │   │ rolling 3-chunk text context   │
│ 256-dim L2-normed vector                │   │ → gpt-4o (extract_simple) +    │
│                                         │   │   gpt-4o (extract_critical)    │
│ cosine vs per-speaker centroids in      │   │ → ExtractionEvent per entity   │
│ Redis (state.speaker_embeddings):       │   │                                │
│   ≥ 0.70 → match, EMA update            │   │ for medications:               │
│   < 0.70 → new SPEAKER_N (cap 4)        │   │   match against EntityMatching │
│                                         │   │   Engine (semantic embeddings) │
│ role still keyword-based (DOCTOR /      │   │                                │
│ PATIENT indicators on transcript)       │   └────────────┬───────────────────┘
│                                         │                │
│ → speaker_changed event                 │                ▼
└─────────────────────────────────────────┘   ┌──── on_extraction_update ──────┐
                                              │ (closure in streaming.py)      │
                                              │                                │
                                              │ Layer A — AtomicEntitySplitter │
                                              │   compound? → split via        │
                                              │   gpt-4o-mini                  │
                                              │   ("fiebre y dolor de cabeza"  │
                                              │    → ["fiebre", "dolor de      │
                                              │     cabeza"])                  │
                                              │                                │
                                              │ Layer B — Forbidden-prefix     │
                                              │   "diagnóstico de…" cannot be  │
                                              │   a symptom; drop              │
                                              │                                │
                                              │ Layer C — EntityTypeValidator  │
                                              │   gpt-4o-mini reclassifies     │
                                              │   wrong-type entities          │
                                              │                                │
                                              │ Layer D — Heuristic dedup      │
                                              │   exact / containment per type │
                                              │                                │
                                              │ Layer E — EntitySemanticDeduper│
                                              │   OpenAI embeddings + cosine   │
                                              │   ≥ 0.86 → drop                │
                                              │                                │
                                              │ → extraction_update event      │
                                              │ → validation_coordinator       │
                                              │     .enqueue_validation()      │
                                              └────────────────────────────────┘
                                                          │
                                                          ▼
                                              ┌─── RAGValidationCoordinator ───┐
                                              │ (rag/validation_coordinator.py)│
                                              │                                │
                                              │ async queues per priority:     │
                                              │   CRITICAL (interactions)      │
                                              │   HIGH (medication validate)   │
                                              │   MEDIUM (CIE-10 suggest)      │
                                              │                                │
                                              │ workers retrieve from ChromaDB │
                                              │ (Spanish vademecum + drug      │
                                              │  interactions + CIE-10 codes,  │
                                              │  see rag-vademecum-setup.md)   │
                                              │                                │
                                              │ → ValidationEvent              │
                                              └────────────┬───────────────────┘
                                                           │
                                                           ▼
                                              on_validation_event maps to:
                                                • validation_alert (CRITICAL)
                                                • entity_validated (HIGH/MEDIUM)
```

### 1.2 Por qué este pipeline (vs. el original)

El diseño original (apéndice A) asumía que cada chunk de audio que
llega por WebSocket es **independientemente decodable**. Eso es falso
para `MediaRecorder` con WebM/Opus: solo el primer chunk lleva el
header EBML/Tracks; los siguientes son clusters huérfanos. El árbol de
decisión "voz/pausa corta/pausa larga/skip" sobre chunks de 200 ms no
podía funcionar sin un re-empaquetado costoso por chunk.

Cambios estructurales reales:

| Original | Implementación actual |
|---|---|
| Chunks de 200 ms decodificados individualmente con Silero VAD por chunk | `session_audio` cumulativo decodificado entero cada tick; VAD aplicado solo al *slice* (ventana de 5–6.5 s) antes de llamar Whisper |
| Decisión por chunk: voz / pausa corta / pausa larga / skip | Decisión por slice de 5 s: VAD activo → Whisper, VAD silencio → skip |
| Buffer circular en memoria de 10 s con overlap implícito | Acumulador `bytearray` por sesión, slicing explícito con overlap de 1.5 s |
| Solapamiento implícito al concatenar chunks | Solapamiento explícito + dedupe basado en timestamps de segments de Whisper + dedupe de texto en boundary |
| Sin protección contra hallucinations | Filtro multilayer: substring patterns, ALL-CAPS subtítulos, marcadores de sonido, repetición, mismo-que-previo, low-confidence (`no_speech_prob`/`avg_logprob`) |
| Diarizer keyword-only | AudioFeatureDiarizer (Resemblyzer embeddings + clustering online); keyword fallback solo si falla embedding |
| Entidades emitidas tal como las extrae el LLM | Pipeline de 5 capas: split de compuestos → forbidden-prefix → type-validator (LLM) → exact/containment dedup → semantic dedup (OpenAI embeddings) |

El `StreamProcessor` (`services/stream_processor.py`) **ya no está en
la ruta de audio**. Su `SileroVAD` se reutiliza directamente desde el
WS handler como singleton de proceso (`_get_vad()`); el resto de la
clase quedó como referencia para cuando se conecte un `CostTracker`
real (follow-up #2).

### 1.3 Componentes y archivos

| Componente | Archivo | Función |
|---|---|---|
| WS handler | `ai-service/src/api/websocket/streaming.py` | Orquesta todo el flujo de la sesión |
| Slice + Whisper | `_slice_and_transcribe` (mismo archivo) | Decode → overlap → VAD → Whisper → segment dedup |
| Hallucination filter | `ai-service/src/transcription/hallucination_filter.py` | 6 capas de detección de salidas espurias de Whisper |
| Audio diarizer | `ai-service/src/transcription/diarization/audio_feature_diarizer.py` | Speaker embeddings + clustering online |
| Atomic splitter | `ai-service/src/services/entity_splitter.py` | Divide entidades compuestas vía LLM |
| Type validator | `ai-service/src/services/entity_type_validator.py` | Reclasifica entidades mal tipificadas vía LLM |
| Semantic deduper | `ai-service/src/services/entity_dedup.py` | Dedup de sinónimos por embeddings |
| Validation coordinator | `ai-service/src/rag/validation_coordinator.py` | Workers async para validación RAG |
| Vademecum corpus | `ai-service/data/vademecum/*.json` | 30 medicamentos + 25 interacciones + 40 CIE-10 |
| Ingestión RAG | `ai-service/scripts/ingest_vademecum.py` | Embed + load to ChromaDB |

### 1.4 Modelos cargados al startup

`ai-service/src/api/main.py` precalienta:

1. `silero_vad.load_silero_vad()` — VAD para pre-check de slice (~32 ms windows a 16 kHz, sliding aggregation).
2. `resemblyzer.VoiceEncoder()` — speaker embeddings (~24 s primera vez por JIT de librosa+numba; subsiguientes <50 ms).

Sin warm-up la primera sesión observada esperaba >30 s con el WebSocket
abierto (timeout en algunos navegadores). Con warm-up el primer slice
agrega ~150 ms de latencia.

---

## 2. Configuración del cliente (React)

`packages/frontend/src/hooks/useRealtimeSession.ts`:

| Parámetro | Valor | Por qué |
|---|---|---|
| `MediaRecorder` `mimeType` | `audio/webm;codecs=opus` | Compatibilidad amplia (Chrome/Firefox desktop) |
| `mediaRecorder.start(timeslice)` | `5000` ms | Coincide con `_WHISPER_SLICE_MS`. Evita inundar el WS de fragmentos sub-200 ms que el server no podía decodificar individualmente |
| Cierre `stopRecording()` | `await new Promise(...stop event)` | Garantiza que el último blob de audio salga al WS antes de `finalize` |
| `finalizeSession()` orden | (1) await stopRecording (2) WS `{type:'finalize'}` (3) wait ≤ 8 s for `session_complete` (4) REST close | El servidor flushea con `min_ms=0` solo si recibe el WS finalize; sin él la cola final se perdía |

`VITE_ENABLE_REALTIME=true` activa el flujo. El default en `.env.example`
sigue en `false` mientras la feature esté en estado pilot-only (ver
[realtime-operational-notes.md](../guides/realtime-operational-notes.md)).

---

## 3. Whisper API: configuración

```python
client.audio.transcriptions.create(
    model=settings.whisper_model,         # whisper-1
    file=("slice.wav", wav_buf, "audio/wav"),
    language=settings.whisper_language,   # es
    response_format="verbose_json",        # imprescindible: necesitamos segments[]
)
```

`response_format="verbose_json"` es load-bearing para dos cosas:
1. La capa 4 (segment-level overlap dedup) usa `segments[i].end`.
2. La hallucination filter usa `segments[i].no_speech_prob` y
   `avg_logprob` para detectar Whisper produciendo texto sobre silencio.

El audio se exporta como WAV PCM 16 kHz mono justo antes de subirlo —
este reencoding es barato (~5 ms para 5 s) y elimina dependencia de
ffmpeg en el path de Whisper (Whisper acepta opus pero pide tamaño
mínimo y semántica de container que el slice no garantiza).

---

## 4. Costos

### 4.1 Por slice

| Llamada | Modelo | Costo aprox |
|---|---|---|
| Whisper ASR | whisper-1 | $0.006 / min de audio enviado |
| OpenAI embedding (entidad) | text-embedding-3-small | ~$0.0000002 por entidad (dedup semántico) |
| OpenAI embedding (consulta RAG) | text-embedding-3-small | ~$0.0000002 por consulta |
| LLM splitter (compuestos) | gpt-4o-mini | ~$0.0001 por entidad compuesta |
| LLM type validator | gpt-4o-mini | ~$0.0001 por entidad |
| Extractor (críticos) | gpt-4o | ~$0.001-0.002 por slice (300-500 input tokens) |
| Extractor (simples) | gpt-4o-mini | ~$0.0001 por slice |

### 4.2 Por sesión (proyección 5 min)

| Concepto | Cantidad | Subtotal |
|---|---|---|
| Whisper (5 min × 5 s slice cada 5 s + 1.5 s overlap por llamada) | ~10 slices × 6.5 s = 65 s ≈ 1.1 min | $0.007 |
| Extracciones (LLM) | ~10 slices × $0.0015 | $0.015 |
| Splitter + validator + dedup | ~20 entidades × $0.0002 | $0.004 |
| RAG (embedding + ChromaDB query) | ~5 medicamentos | < $0.001 |
| **Total** | | **~$0.027** |

### 4.3 Optimizaciones de costo aplicadas

- **VAD pre-check** elimina ~25–30 % de slices silentes antes de
  llamar a Whisper.
- **HallucinationFilter** evita que entidades extraídas sobre texto
  espurio (créditos de YouTube, repeticiones) inflamen el costo del
  extractor sin valor clínico.
- **Entity dedup pipeline** evita re-extracciones y re-validaciones
  de la misma entidad clínica (ahorro lineal en RAG queries).

---

## 5. Métricas a monitorear

| Métrica | Target | Alerta |
|---|---|---|
| Latencia end-to-end transcript_update (p95) | < 7 s desde habla | > 10 s |
| Whisper API failure rate | < 1 % | > 5 % |
| % slices saltados por VAD | 15-30 % | < 10 % o > 50 % |
| % slices descartados por hallucination filter | < 5 % | > 15 % (señala problema upstream de Whisper) |
| Entity dedup hit rate (capa B+C+D+E) | 30-60 % | < 10 % (dedup roto) o > 80 % (over-merging) |
| Speaker embedding similarity intra-speaker (p50) | > 0.80 | < 0.65 (modelo descalibrado) |
| Validation alert latency (interaction, p95) | < 1.5 s | > 3 s |
| ChromaDB collection size | > 100 docs | 0 docs (vademecum no ingestado) |

Logs estructurados (`structlog`) emiten todos estos puntos con tags
`session_id`, `slice_idx`, `method`. Ejemplos relevantes para grep:

- `Skipped silent slice (VAD)` — slice descartado pre-Whisper
- `Overlap dedup` — capa 4 con counts antes/después
- `Stripped boundary overlap` — capa 6
- `Dropped Whisper hallucination` con `reason=…`
- `Speaker change detected method=audio similarity=…` — diarizer
- `Dropped semantic duplicate matched=… similarity=…`
- `Reclassified entity from_type=… to_type=…`
- `Dropped type-mismatched entity offending_prefix=…`
- `Drug interaction check task queued priority=CRITICAL`

---

## 6. Limitaciones conocidas

Reproducidas de [realtime-operational-notes.md](../guides/realtime-operational-notes.md)
para autocontener este documento; ese doc tiene la lista canónica.

1. **MediaRecorder webm streaming es frágil.** El handler cumulativo
   asume que los chunks subsiguientes pertenecen al mismo recorder.
   Safari y mobile WebKit pueden producir cortes que invalidan el
   acumulador. La solución estructural es AudioWorklet + PCM crudo
   (follow-up #1).
2. **Cost reporting es cero.** No hay `CostTracker` cableado. El UI
   oculta el panel; `audio_duration_seconds` sí es correcto. Follow-up
   #2.
3. **Diarizer cap fijo en 4 speakers.** Más de 4 voces se mergean al
   centroid más cercano. Suficiente para consultas 1-doctor / 1-2
   pacientes / familiar.
4. **Hallucination patterns son estáticos.** Nuevos artefactos de
   Whisper (que aparecen con cambios de modelo) requieren añadir el
   patrón a `_WHISPER_HALLUCINATION_SUBSTRINGS` o
   `_WHISPER_PLEASANTRY_FULL_MATCHES`.
5. **EntitySemanticDeduper es per-WS.** No comparte estado entre
   réplicas del servicio AI. Multi-pod necesita externalizarlo a
   Redis (follow-up #7).

---

## 7. Gateway Node.js y persistencia de eventos

> Esta sección documenta cómo el backend Node.js se inserta entre el
> frontend React y el servicio Python para añadir persistencia,
> auditoría y control del dominio público. La sección no cambió tras
> 27.3 — el gateway forwardea eventos verbatim sin conocer la
> implementación interna del pipeline Python.

### 7.1 Topología

```
┌─────────────────┐     WebSocket      ┌──────────────────┐     WebSocket      ┌──────────────────┐
│  React Frontend │  ←─────────────→   │  Node.js Gateway │  ←─────────────→   │  Python AI       │
│                 │   /ws/session/:id  │  (proxy + sink)  │   /ws/session?…    │  Service         │
└─────────────────┘                     └────────┬─────────┘                     └──────────────────┘
                                                 │ persistencia asíncrona
                                                 ▼
                                          ┌──────────────────┐
                                          │   PostgreSQL     │
                                          │   ai_sessions    │
                                          │   *_events       │
                                          │   validation_*   │
                                          └──────────────────┘
```

El frontend nunca se conecta directamente a Python. El controlador
Node.js (`createSession`) descarta el `websocket_url` que devuelve
Python y entrega al frontend una URL del propio gateway. Ver
[ADR-003](../adr/ADR-003-nodejs-python-ai-integration.md) para la
justificación completa.

### 7.2 Responsabilidades del Gateway

El gateway (`packages/backend/src/websocket/ai-session-gateway.ts`) es
un proxy bidireccional con tres trabajos:

| Dirección | Tipo de mensaje | Acción |
|---|---|---|
| Cliente → Python | Binario (audio Opus) | Forward sin modificar |
| Cliente → Python | JSON (control: start, stop, finalize) | Forward sin modificar |
| Python → Cliente | JSON (eventos del pipeline) | **(1)** Persistir asíncronamente en PostgreSQL **(2)** Forward al cliente |
| Python → Cliente | Cualquier otro | Forward sin modificar (sin persistencia) |

Errores upstream (Python) cierran la conexión cliente con código
`4500`. Tokens inválidos o ausentes cierran con `4001` antes de abrir
la conexión upstream.

### 7.3 Tipos de Evento Persistidos

| Evento (de Python) | Tabla | Mutación adicional sobre `ai_sessions` |
|---|---|---|
| `transcript_update` | `transcription_events` | — |
| `speaker_changed` | `transcription_events` | — |
| `extraction_update` | `extraction_events` | — |
| `entity_validated` | `extraction_events` | — |
| `validation_alert` | `validation_alerts` | — (logging extra si severity = CRITICAL) |
| `cost_update` | `cost_events` | `totalCostUsd` actualizado en transacción |
| `session_complete` | — | `status`, `finalTranscript`, `totalCostUsd`, `audioDurationSeconds`, `completedAt` |
| `error` (recoverable=false) | `transcription_events` | `status = 'failed'` |
| `error` (recoverable=true) | `transcription_events` | — |

La persistencia se ejecuta en background
(`eventPersistence.persist().catch(...)`) para que un fallo de DB
nunca bloquee el forward al cliente — el frontend siempre recibe el
evento aunque la persistencia falle.

### 7.4 Autenticación

Dos saltos de autenticación independientes:

1. **Cliente → Node.js**: query param `token` en la URL del
   WebSocket. Validado contra `JWT_SECRET` (esquema de usuarios del
   backend).
2. **Node.js → Python**: header `Authorization: Bearer <token>`
   minted on-the-fly por el cliente HTTP. Firmado con
   `AI_SERVICE_JWT_SECRET` (HS256, claim `sub` = `req.userId`,
   `exp` = 5 min).

Los dos secretos son distintos por diseño. Ver [ADR-003](../adr/ADR-003-nodejs-python-ai-integration.md),
Decisión 1.

### 7.5 Coexistencia con el Handler Legacy de Socket.IO

El backend mantiene dos sistemas WebSocket en paralelo sobre el mismo
`httpServer`:

| Componente | Path | Protocolo | Propósito |
|---|---|---|---|
| `setupTranscriptionWebSocket` | `/socket.io/...` (namespace `/transcription`) | Socket.IO | **Legacy:** transcripción directa contra OpenAI Whisper desde Node.js |
| `setupAiSessionGateway` | `/ws/session/:sessionId` | `ws` (raw WebSocket) | **Nuevo:** proxy hacia el servicio Python con pipeline completo |

### 7.6 Endpoints REST del Backend

`POST /api/v1/ai/sessions/:id/finalize` no es un proxy directo —
agrega `DELETE` upstream + lectura del estado persistido. Ver
[ADR-003](../adr/ADR-003-nodejs-python-ai-integration.md), Decisión 3.
Documentación completa en [api/nodejs-ai-integration-endpoints.md](../api/nodejs-ai-integration-endpoints.md).

### 7.7 Métricas a Monitorear (capa Node.js)

Adicionales a los KPIs de la sección 5:

| Métrica | Target | Alerta |
|---|---|---|
| Latencia persistencia evento (p95) | < 50ms | > 200ms |
| Errores de persistencia | 0% | > 0.1% |
| Sesiones huérfanas (active > 2h sin eventos) | 0 | > 0 |
| Alertas CRITICAL no acknowledged > 5 min | 0 | > 0 |

---

## Apéndice A — Diseño original (superseded)

> El diseño original asumía decodificación per-chunk con un árbol de
> decisión VAD que distinguía pausas naturales (<2 s), fines de turno
> (2-10 s) y silencios largos (>10 s). En la práctica, MediaRecorder
> webm/opus solo emite el header EBML/Tracks en el primer chunk, así
> que decodificar chunks individuales era inviable. El árbol de
> decisión fue reemplazado por el flujo descrito en la sección 1.
>
> Se conserva por dos razones: (1) las **constantes derivadas**
> (umbral 5 s para enviar voz a Whisper, ahorro objetivo 25 % por VAD)
> siguen siendo válidas y guían las elecciones actuales; (2) los
> **cálculos de costo** de la sección original son la referencia de
> orden de magnitud.
>
> El árbol de decisión completo y el código del `StreamingVAD`
> original están disponibles en el git log (commits previos a la serie
> 27.x) y en `ai-service/src/services/stream_processor.py` para
> consulta histórica.

### A.1 Distribución temporal típica (sigue siendo la asunción de cálculo de costo)

```
Total: 60 minutos
├─ Voz activa continua: 28 min (47%)
├─ Pausas naturales (<2s): 7 min (12%)  → Bufferizadas con voz
├─ Silencios fin turno (2-10s): 10 min (17%)  → Enviadas como batch
└─ Silencios largos (>10s): 15 min (25%)  → NO enviadas (ahorro)
```

### A.2 Cálculo de costo histórico

```
Streaming puro (sin optimización):  60 min × $0.006/min = $0.36
Streaming con VAD (skip 25%):       45 min × $0.006/min = $0.27
Ahorro: $0.09 por consulta (25%)
```

La implementación actual logra un ahorro similar a través del VAD
pre-check sobre el slice de 5 s (Layer 2 del pipeline real), aunque
con menos granularidad: si una sola palabra cae dentro del slice, el
slice entero se envía a Whisper.
