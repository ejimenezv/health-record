# Prompt 07: Architecture Design - Data Flow and RAG Strategy

## Objective
Document the data flow diagrams and RAG strategy for MedRecord AI. This continues Delivery 2 and maps to Sections 3.3 and 3.4 of the BSG template.

## Context
This prompt focuses on:
- How data flows through the system
- The RAG pipeline design with Spanish medical knowledge
- Integration of RAG with medical extraction
- Prompt engineering strategy

## Tasks

### 1. Create Real-Time Data Flow Document
Create `docs/delivery-2/02-data-flow-design.md`:

```markdown
# Diseño de Flujo de Datos en Tiempo Real - MedRecord AI

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

```
┌──────────────────────────────────────────────────────────────────────────┐
│              PIPELINE DE PROCESAMIENTO DE AUDIO (STREAMING)              │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Audio Streaming │
│ (WebSocket)     │
│ Opus encoded    │
│ chunks 100-200ms│
└───────┬─────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    1. DECODIFICACIÓN Y BUFFER CIRCULAR                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ • Decodificar Opus → PCM 16kHz mono                                 ││
│  │ • Almacenar en buffer circular (10 segundos)                        ││
│  │ • Normalizar amplitud en tiempo real                                ││
│  │ • Latencia de decodificación: < 10ms                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. VAD STREAMING + DECISION TREE                      │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Silero VAD analiza cada chunk en tiempo real (< 100ms latencia)     ││
│  │                                                                      ││
│  │ DECISION TREE:                                                       ││
│  │ ┌─────────────────────────────────────────────────────────────────┐ ││
│  │ │ VOZ ACTIVA (continuous)                                         │ ││
│  │ │ └─▶ Acumular en buffer, enviar cada 5s a Whisper                │ ││
│  │ │     Latencia: ~2s (prioridad baja latencia)                     │ ││
│  │ ├─────────────────────────────────────────────────────────────────┤ ││
│  │ │ SILENCIO CORTO (0-2s) - Pausa natural del habla                 │ ││
│  │ │ └─▶ Continuar buffer, NO enviar aún                             │ ││
│  │ │     El hablante probablemente sigue                             │ ││
│  │ ├─────────────────────────────────────────────────────────────────┤ ││
│  │ │ SILENCIO MEDIO (2-10s) - Fin de turno                           │ ││
│  │ │ └─▶ Enviar buffer acumulado como BATCH a Whisper                │ ││
│  │ │     Latencia: +2-3s (aceptable, optimiza costo)                 │ ││
│  │ ├─────────────────────────────────────────────────────────────────┤ ││
│  │ │ SILENCIO LARGO (>10s) - Examen físico, espera                   │ ││
│  │ │ └─▶ SKIP - No enviar audio silencioso                           │ ││
│  │ │     AHORRO: 20-30% del costo Whisper                            │ ││
│  │ └─────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  MÉTRICAS:                                                               │
│  • 60 min consulta típica:                                              │
│  •   Voz activa: ~28 min (47%) → Streaming 5s chunks                    │
│  •   Pausas: ~7 min (12%) → Incluido en batch                           │
│  •   Fin de turno: ~10 min (17%) → Batch mode                           │
│  •   Silencio largo: ~15 min (25%) → SKIPPED (ahorro!)                  │
│  • Audio procesado: 45 min (vs 60 min = 25% ahorro)                     │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    3. TRANSCRIPCIÓN STREAMING (CHUNKS 5s)                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Whisper API con chunks de 5 segundos (durante voz activa)           ││
│  │                                                                      ││
│  │ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                 ││
│  │ │ Chunk 1 │──│ Chunk 2 │──│ Chunk 3 │──│ Chunk N │──▶ ...          ││
│  │ │ (5s)    │  │ (5s)    │  │ (5s)    │  │ (5s)    │                 ││
│  │ └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                 ││
│  │      │            │            │            │                       ││
│  │      ▼ 1-1.5s     ▼ 1-1.5s     ▼ 1-1.5s     ▼                      ││
│  │ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                 ││
│  │ │ Trans.  │  │ Trans.  │  │ Trans.  │  │ Trans.  │                 ││
│  │ │ parcial │  │ parcial │  │ parcial │  │ parcial │                 ││
│  │ └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                 ││
│  │      │            │            │            │                       ││
│  │      └────────────┴────────────┴────────────┘                       ││
│  │                         │                                            ││
│  │                         ▼                                            ││
│  │               CONTEXT WINDOW (últimos 200 chars)                    ││
│  │               para mejorar continuidad de Whisper                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  LATENCIA END-TO-END: < 2 segundos (desde hablar hasta UI)             │
│  WebSocket event: transcription_update                                  │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       4. DIARIZACIÓN INCREMENTAL                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Heurísticas aplicadas a cada chunk de transcripción:                ││
│  │                                                                      ││
│  │ 1. Análisis de turnos de habla (streaming)                          ││
│  │    • Detectar cambio de hablante en tiempo real                     ││
│  │    • Usar patrón pregunta-respuesta                                 ││
│  │                                                                      ││
│  │ 2. Análisis de vocabulario (español médico)                         ││
│  │    • DOCTOR: "diagnóstico", "receto", "prescribo", "examen"         ││
│  │    • PACIENTE: "me duele", "siento", "tengo", "desde hace"          ││
│  │    • ACOMPAÑANTE: "mi madre", "el paciente", "le duele"             ││
│  │                                                                      ││
│  │ 3. ACTUALIZACIÓN RETROACTIVA                                        ││
│  │    • Si más adelante se determina speaker correcto                  ││
│  │    • Enviar evento de corrección al frontend                        ││
│  │                                                                      ││
│  │ Speakers soportados: DOCTOR / PACIENTE / ACOMPAÑANTE / DESCONOCIDO  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Precisión target: > 90% (2-4 speakers)                                 │
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
```

## Expected Deliverables
- `docs/delivery-2/02-data-flow-design.md` - Complete data flow documentation

## Verification Steps
1. All major flows are documented
2. Sequence diagrams are clear
3. RAG integration is well explained
4. Data model supports all use cases
5. State transitions are defined
6. Spanish medical context is evident

## Notes
- Flows show Spanish-specific elements (vocabulary, examples)
- RAG integration is clearly shown as value-add, not just compliance
- Data model supports audit and cost tracking
- This maps to Section 3.3 of BSG template
