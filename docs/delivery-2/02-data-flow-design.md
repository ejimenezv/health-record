# Diseño de Flujo de Datos en Tiempo Real - MedRecord AI

> **Nota de estado (post-Prompt 27.3):** Las secciones 1 y 2 capturan la
> visión lógica del flujo (frontend → backend → AI service → external) y
> los objetivos de optimización por VAD. La implementación real difiere
> en detalles importantes: el `StreamProcessor` quedó fuera de la ruta
> de audio, el árbol de decisión por chunk de 200 ms fue reemplazado
> por slicing acumulativo con overlap, y el pipeline de entidades creció
> con 5 capas adicionales (split de compuestos, validador de tipo por
> LLM, dedupe semántico, etc.). El **source-of-truth para la
> implementación actual** es
> [`../architecture/streaming-transcription-architecture.md`](../architecture/streaming-transcription-architecture.md).
> Las secciones 3-6 de este documento (RAG, modelo de datos, estados de
> sesión) siguen siendo precisas.

## 1. Flujo Principal: Streaming de Transcripción y Extracción Incremental

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│              FLUJO DE TRANSCRIPCIÓN Y EXTRACCIÓN EN TIEMPO REAL                    │
└────────────────────────────────────────────────────────────────────────────────────┘

   Frontend                Backend                AI Service                  External
      │                       │                        │                         │
      │  1. Inicia consulta   │                        │                         │
      │──────────────────────▶│                        │                         │
      │                       │  2. POST /sessions/stream                        │
      │                       │     {patient_id, type} │                         │
      │                       │───────────────────────▶│                         │
      │                       │                        │                         │
      │                       │  3. {session_id,       │                         │
      │                       │     websocket_url}     │                         │
      │                       │◀───────────────────────│                         │
      │                       │                        │                         │
      │  4. websocket_url     │                        │                         │
      │◀──────────────────────│                        │                         │
      │                       │                        │                         │
      │  5. WebSocket CONNECT ────────────────────────▶│                         │
      │         (audio)       │                        │                         │
      │◀═══════════════════════════════════════════════│                         │
      │                       │                        │                         │
      │  ┌────────────────────────────── STREAMING CONTINUO ─────────────────────┐
      │  │                    │                        │                         │
      │  │  Audio chunks      │                        │                         │
      │  │  (cada 100-200ms)  │                        │                         │
      │  │════════════════════════════▶               │                         │
      │  │                    │                        │                         │
      │  │                    │        ┌───────────────┴─────────────┐           │
      │  │                    │        │  PIPELINE TIEMPO REAL       │           │
      │  │                    │        │                             │           │
      │  │                    │        │  • VAD en streaming         │           │
      │  │                    │        │  • Buffer inteligente       │           │
      │  │                    │        │    (5-10s de audio)         │           │
      │  │                    │        │  • Detección silencios      │           │
      │  │                    │        │                             │           │
      │  │                    │        │  AL DETECTAR VOZ:           │           │
      │  │                    │        │  ├─ Whisper streaming ──────┼──▶ OpenAI │
      │  │                    │        │  ├─ Diarización incremental │           │
      │  │                    │        │  └─ Transcripción parcial   │           │
      │  │                    │        │            │                │           │
      │  │                    │        │            ▼                │           │
      │  │                    │        │  CONTEXTO ACUMULADO         │           │
      │  │                    │        │  (últimos 30s transcritos)  │           │
      │  │                    │        │            │                │           │
      │  │                    │        │            ▼                │           │
      │  │                    │        │  EXTRACCIÓN INCREMENTAL     │           │
      │  │                    │        │  • Matching vs existentes   │           │
      │  │                    │        │  • Si nuevo: extraer        │◀──Whisper │
      │  │                    │        │  • Si match: actualizar     │           │
      │  │                    │        │  • RAG validation  ─────────┼──▶ChromaDB│
      │  │                    │        │                             │           │
      │  │                    │        └─────────────┬───────────────┘           │
      │  │                    │                      │                           │
      │  │  EVENT: transcription_update              │                           │
      │  │  {text, speaker, timestamp}               │                           │
      │  │◀══════════════════════════════════════════│                           │
      │  │                    │                      │                           │
      │  │  EVENT: symptom_extracted                 │                           │
      │  │  {name, location, severity, version}      │                           │
      │  │◀══════════════════════════════════════════│                           │
      │  │                    │                      │                           │
      │  │  EVENT: diagnosis_detected                │                           │
      │  │  {diagnosis, icd10, confidence}           │                           │
      │  │◀══════════════════════════════════════════│                           │
      │  │                    │                      │                           │
      │  │  EVENT: prescription_added                │                           │
      │  │  {medication, dose, frequency}            │                           │
      │  │◀══════════════════════════════════════════│                           │
      │  │                    │                      │                           │
      │  │  EVENT: interaction_warning (si aplica)   │                           │
      │  │  {severity: MAYOR, medications, action}   │                           │
      │  │◀══════════════════════════════════════════│                           │
      │  │                    │                      │                           │
      │  │  [UI se actualiza en tiempo real]         │                           │
      │  │                    │                      │                           │
      │  └───────────────────────────────────────────────────────────────────────┘
      │                       │                      │                           │
      │  6. Finaliza consulta │                      │                           │
      │──────────────────────▶│                      │                           │
      │                       │  WebSocket: END_SESSION                          │
      │                       │─────────────────────▶│                           │
      │                       │                      │                           │
      │                       │  Final results       │                           │
      │                       │  + cost_summary      │                           │
      │◀──────────────────────│◀─────────────────────│                           │
      │                       │                      │                           │
```

## 2. Flujo de Datos Interno: Procesamiento de Audio en Streaming

> **El diagrama lógico de esta sección refleja la implementación actual
> a alto nivel.** Para los detalles concretos (overlap window, capas de
> dedup, hallucination filter, etc.) consultar
> [`../architecture/streaming-transcription-architecture.md`](../architecture/streaming-transcription-architecture.md).
> El árbol de decisión "voz/pausa corta/pausa media/silencio largo" del
> diseño original se simplificó a un VAD pre-check sobre slices de 5 s
> (ver Apéndice A de ese documento para el motivo).

```
┌──────────────────────────────────────────────────────────────────────────┐
│              PIPELINE DE PROCESAMIENTO DE AUDIO (STREAMING)              │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Audio Streaming │
│ (WebSocket)     │
│ MediaRecorder   │
│ webm/opus       │
│ timeslice 5000ms│
└───────┬─────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│       1. ACUMULADOR DE SESIÓN (cumulative session_audio bytearray)       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ • Acumula TODOS los bytes webm de la sesión                         ││
│  │ • Cada llamada decodifica el buffer entero (es válido siempre)      ││
│  │ • Slicing con overlap: [last_processed_ms − 1500, current_ms]       ││
│  │ • Latencia decode: ~50-150ms por slice de 5s                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              2. VAD PRE-CHECK + WHISPER + DEDUP DE OVERLAP                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Layer 1: Tail floor — drop si < 500ms (solo en finalize)            ││
│  │                                                                      ││
│  │ Layer 2: Silero VAD sobre el slice (32 ms windows aggregadas)       ││
│  │   voice_prob < 0.5 → SKIP, no se llama Whisper (ahorro de costo)    ││
│  │                                                                      ││
│  │ Layer 3: Whisper API (verbose_json) sobre el slice WAV              ││
│  │   response.text + response.segments[{start,end,text,                ││
│  │                                       no_speech_prob, avg_logprob}] ││
│  │                                                                      ││
│  │ Layer 4: Dedup de overlap por timestamps de Whisper                 ││
│  │   conserva solo segmentos con seg.end > 1.5s                        ││
│  │                                                                      ││
│  │ Layer 5: HallucinationFilter                                        ││
│  │   patterns ("Subtítulos por…"), repetición, sound markers,          ││
│  │   mismo-que-anterior-slice, low confidence → drop                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  MÉTRICAS objetivo:                                                      │
│  • % slices saltados por VAD: 15-30%                                    │
│  • % slices descartados por hallucination filter: < 5%                  │
│  • Costo por sesión 5min: ~$0.027                                       │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             3. CALLBACK on_transcript_chunk (closure por sesión)          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Layer 6: Dedup de boundary a nivel texto (_strip_overlap_text)      ││
│  │   strip prefijo del nuevo texto que coincide con sufijo del previo  ││
│  │                                                                      ││
│  │ → emit transcript_update event (chunk_index, text, is_final, …)     ││
│  │                                                                      ││
│  │ Fan out:                                                             ││
│  │   • diarizer.process_chunk(text, audio_samples=...)                 ││
│  │   • extractor.process_transcript_chunk(text, is_partial)            ││
│  │                                                                      ││
│  │ Seed inicial: emite speaker_changed tras el primer chunk            ││
│  │ (para que la UI muestre Hablante Actual desde el inicio)            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  LATENCIA END-TO-END: ~5-8s desde hablar hasta UI                       │
│  (limitado por Whisper API; reducción a <1s requiere faster-whisper)    │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              4. DIARIZACIÓN INCREMENTAL (audio-feature primary)          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ AudioFeatureDiarizer (Resemblyzer):                                 ││
│  │  • embed(audio_samples) → vector 256-dim L2-normed                  ││
│  │  • cosine vs centroides por speaker (Redis state)                   ││
│  │    ≥ 0.70 → match (EMA update del centroide)                        ││
│  │    < 0.70 → nuevo SPEAKER_N (cap en 4 speakers/sesión)              ││
│  │                                                                      ││
│  │ Asignación de rol (DOCTOR / PATIENT / UNKNOWN):                     ││
│  │  • Aún por keywords sobre el transcript (no audio):                 ││
│  │    DOCTOR: "diagnóstico", "receto", "prescribo", "miligramos"       ││
│  │    PATIENT: "me duele", "siento", "tengo", "desde hace"             ││
│  │  • Confianza por agregación de indicadores                          ││
│  │                                                                      ││
│  │ Fallback keyword-only si audio_samples ausente o < 1s               ││
│  │                                                                      ││
│  │ Speakers soportados: DOCTOR / PATIENT / UNKNOWN                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Precisión: alta para voces espectralmente distintas (timbre).          │
│  Rol DOCTOR/PATIENT depende de la riqueza de keywords en la sesión.     │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              5. PIPELINE DE ENTIDADES (sobre cada ExtractionEvent)       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Layer A — AtomicEntitySplitter (gpt-4o-mini, solo si compuesto)     ││
│  │   "fiebre y dolor de cabeza" → ["fiebre", "dolor de cabeza"]        ││
│  │                                                                      ││
│  │ Layer B — Forbidden-prefix (string sanity)                          ││
│  │   "diagnóstico de…" no puede ser síntoma → drop                     ││
│  │                                                                      ││
│  │ Layer C — EntityTypeValidator (gpt-4o-mini)                         ││
│  │   reclasifica entidades mal tipificadas con confianza ≥ 0.7         ││
│  │                                                                      ││
│  │ Layer D — Dedup heurístico per-tipo                                 ││
│  │   exact match / containment                                         ││
│  │                                                                      ││
│  │ Layer E — EntitySemanticDeduper                                     ││
│  │   OpenAI text-embedding-3-small + cosine ≥ 0.86                     ││
│  │   captura sinónimos: "Cefalea" ↔ "dolor de cabeza"                  ││
│  │                                                                      ││
│  │ → emit extraction_update event                                      ││
│  │ → validation_coordinator.enqueue_validation()                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

## 3. Flujo de RAG Query

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE QUERY RAG                               │
└──────────────────────────────────────────────────────────────────────────┘

    Usuario                                 AI Service
       │                                        │
       │  POST /api/v1/query                    │
       │  {                                     │
       │    "query": "¿Cuáles son las          │
       │     contraindicaciones del             │
       │     ibuprofeno?"                       │
       │  }                                     │
       │───────────────────────────────────────▶│
       │                                        │
       │                          ┌─────────────┴─────────────┐
       │                          │     PIPELINE RAG          │
       │                          │                           │
       │                          │  1. Generar embedding     │
       │                          │     de la query           │
       │                          │     (text-embedding-3)    │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  2. Búsqueda vectorial    │
       │                          │     en ChromaDB           │
       │                          │     (top_k=5)             │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  3. Filtrar por score     │
       │                          │     (min_score=0.75)      │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  4. Construir contexto    │
       │                          │     con chunks relevantes │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  5. Prompt a GPT-4        │
       │                          │     con contexto RAG      │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  6. Generar respuesta     │
       │                          │     citando fuentes       │
       │                          │                           │
       │                          └─────────────┬─────────────┘
       │                                        │
       │  {                                     │
       │    "response": "Las principales       │
       │     contraindicaciones del ibuprofeno │
       │     incluyen...",                     │
       │    "sources": [                       │
       │      {"doc": "vademecum_es.pdf",      │
       │       "chunk": 145, "score": 0.89}    │
       │    ],                                  │
       │    "tokens_used": 1250,               │
       │    "latency_ms": 1850                 │
       │  }                                     │
       │◀──────────────────────────────────────│
       │                                        │
```

## 4. Flujo de Ingesta RAG

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE INGESTA RAG                             │
└──────────────────────────────────────────────────────────────────────────┘

    Admin                                   AI Service
       │                                        │
       │  POST /api/v1/ingest                   │
       │  {                                     │
       │    "documents": [                      │
       │      {"content": "...",                │
       │       "metadata": {"source": "CIE-10"}}│
       │    ]                                   │
       │  }                                     │
       │───────────────────────────────────────▶│
       │                                        │
       │                          ┌─────────────┴─────────────┐
       │                          │   PIPELINE INGESTA        │
       │                          │                           │
       │                          │  1. Validar documentos    │
       │                          │     (formato, tamaño)     │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  2. Chunking              │
       │                          │     - Tamaño: 1000 chars  │
       │                          │     - Overlap: 200 chars  │
       │                          │     - Preservar párrafos  │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  3. Generar embeddings    │
       │                          │     (batch de 100)        │
       │                          │            │              │
       │                          │            ▼              │
       │                          │  4. Almacenar en ChromaDB │
       │                          │     con metadata          │
       │                          │                           │
       │                          └─────────────┬─────────────┘
       │                                        │
       │  {                                     │
       │    "status": "success",               │
       │    "indexed_docs": 1,                 │
       │    "total_chunks": 45,                │
       │    "errors": []                       │
       │  }                                     │
       │◀──────────────────────────────────────│
       │                                        │
```

## 5. Flujo de Integración RAG con Extracción

```
┌──────────────────────────────────────────────────────────────────────────┐
│               INTEGRACIÓN RAG EN EXTRACCIÓN MÉDICA                       │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     TRANSCRIPCIÓN DIARIZADA                              │
│                                                                          │
│  DOCTOR: Buenos días, ¿cómo se siente?                                  │
│  PACIENTE: Tengo dolor de cabeza muy fuerte desde hace 3 días.          │
│  DOCTOR: ¿Ha tomado algo para el dolor?                                 │
│  PACIENTE: Sí, paracetamol pero no me alivia.                           │
│  DOCTOR: Por los síntomas parece una migraña. Le voy a recetar          │
│          ibuprofeno de 400mg cada 8 horas.                              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PASO 1: IDENTIFICACIÓN DE TÉRMINOS                    │
│                                                                          │
│  Términos médicos detectados:                                           │
│  • "dolor de cabeza" → síntoma                                          │
│  • "paracetamol" → medicamento                                          │
│  • "migraña" → diagnóstico                                              │
│  • "ibuprofeno 400mg" → prescripción                                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PASO 2: CONSULTAS RAG ESPECÍFICAS                     │
│                                                                          │
│  Query 1: "ibuprofeno información médica dosis"                         │
│  → Recupera: dosificación estándar, contraindicaciones                  │
│                                                                          │
│  Query 2: "migraña diagnóstico CIE-10"                                  │
│  → Recupera: G43.9 - Migraña, sin especificación                        │
│                                                                          │
│  Query 3: "ibuprofeno paracetamol interacción"                          │
│  → Recupera: información de interacciones (ninguna significativa)       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PASO 3: PROMPT DE EXTRACCIÓN ENRIQUECIDO              │
│                                                                          │
│  System Prompt:                                                          │
│  """                                                                     │
│  Eres un asistente de extracción médica. Extrae información             │
│  estructurada de la transcripción.                                       │
│                                                                          │
│  CONTEXTO MÉDICO (de la base de conocimiento):                          │
│  - Ibuprofeno: AINE, dosis adulto 400-800mg cada 6-8h                   │
│  - Migraña: CIE-10 G43.9, cefalea recurrente pulsátil                   │
│  - Interacciones: Ibuprofeno + Paracetamol = sin interacción mayor      │
│                                                                          │
│  VALIDACIONES:                                                           │
│  - Verificar que medicamentos existen                                    │
│  - Verificar que dosis son razonables                                   │
│  - Agregar código CIE-10 si el diagnóstico coincide                     │
│  """                                                                     │
│                                                                          │
│  User Prompt: [Transcripción completa + schema de extracción]           │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PASO 4: EXTRACCIÓN VALIDADA                           │
│                                                                          │
│  {                                                                       │
│    "symptoms": [{                                                        │
│      "name": "cefalea",                                                  │
│      "location": "cabeza",                                               │
│      "duration": "3 días",                                              │
│      "severity": null,                                                   │
│      "confidence": "high"                                                │
│    }],                                                                   │
│    "diagnoses": [{                                                       │
│      "name": "Migraña",                                                  │
│      "icd10_code": "G43.9",  ◀── RAG sugirió código                     │
│      "confidence": "high"                                                │
│    }],                                                                   │
│    "prescriptions": [{                                                   │
│      "medication": "Ibuprofeno",                                         │
│      "dose": "400mg",                                                    │
│      "frequency": "cada 8 horas",                                        │
│      "validated": true,  ◀── RAG validó que existe y dosis razonable   │
│      "warnings": []                                                      │
│    }]                                                                    │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Modelo de Datos

### 6.1 Entidades Principales

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MODELO DE DATOS                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      User        │       │    Session       │       │   Transcription  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id: UUID         │       │ id: UUID         │       │ id: UUID         │
│ username: str    │──1:N─▶│ user_id: UUID    │──1:1─▶│ session_id: UUID │
│ email: str       │       │ patient_id: str  │       │ raw_text: text   │
│ password_hash    │       │ type: enum       │       │ segments: json[] │
│ role: enum       │       │ language: str    │       │ duration_sec: int│
│ created_at       │       │ status: enum     │       │ word_count: int  │
└──────────────────┘       │ created_at       │       │ timestamps: json │
                           │ completed_at     │       │ created_at       │
                           └────────┬─────────┘       └──────────────────┘
                                    │
                                    │ 1:1
                                    ▼
                           ┌──────────────────┐
                           │   Extraction     │
                           ├──────────────────┤
                           │ id: UUID         │
                           │ session_id: UUID │
                           │ soap_note: json  │
                           │ symptoms: json[] │
                           │ diagnoses: json[]│
                           │ prescriptions:[] │
                           │ confidence: enum │
                           │ tokens_used: int │
                           │ cost_usd: float  │
                           │ created_at       │
                           └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   AuditLog       │       │   CostTracking   │
├──────────────────┤       ├──────────────────┤
│ id: UUID         │       │ id: UUID         │
│ user_id: UUID    │       │ session_id: UUID │
│ action: str      │       │ service: str     │
│ resource: str    │       │ operation: str   │
│ details: json    │       │ tokens_input: int│
│ ip_address: str  │       │ tokens_output:int│
│ timestamp        │       │ cost_usd: float  │
└──────────────────┘       │ timestamp        │
                           └──────────────────┘
```

### 6.2 Estados de Sesión (Real-Time Streaming)

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
│ CREATED  │────▶│ STREAMING │────▶│ PAUSED   │────▶│ STREAMING │
└──────────┘     └─────┬─────┘     └──────────┘     └─────┬─────┘
                       │                                   │
                       │ (finalizar consulta)              │
                       ▼                                   │
                 ┌────────────┐                            │
                 │ FINALIZING │◀───────────────────────────┘
                 └─────┬──────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             │             ▼
   ┌───────────┐       │       ┌──────────┐
   │ COMPLETED │       │       │  FAILED  │
   └───────────┘       │       └──────────┘
                       │
                       ▼
                ┌────────────┐
                │ RECONNECTING│ (WebSocket perdió conexión)
                │ (60s max)  │
                └────────────┘

ESTADOS:
• CREATED: Sesión creada, esperando conexión WebSocket
• STREAMING: Audio fluyendo, transcripción y extracción en tiempo real
• PAUSED: WebSocket conectado pero audio pausado (ej: médico pausa)
• RECONNECTING: WebSocket desconectado, esperando reconexión (60s máx)
• FINALIZING: Procesando extracción final y generando nota SOAP completa
• COMPLETED: Todos los resultados disponibles, sesión cerrada
• FAILED: Error irrecuperable
```
