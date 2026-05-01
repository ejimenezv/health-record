# Pipeline de Transcripción Real-Time — Diagrama de Componentes

**Propósito:** Mostrar las capas internas del AI Service que procesan audio streaming. Refleja el estado post-prompts 27.x descrito en [`streaming-transcription-architecture.md`](../streaming-transcription-architecture.md).

```mermaid
%%{init: {'theme':'neutral'}}%%
flowchart TB
    classDef client fill:#2E7D32,stroke:#1B5E20,color:#fff
    classDef gw fill:#388E3C,stroke:#1B5E20,color:#fff
    classDef stage fill:#43A047,stroke:#1B5E20,color:#fff
    classDef llm fill:#999,stroke:#666,color:#fff
    classDef store fill:#F9A825,stroke:#F57F17,color:#000
    classDef alert fill:#C62828,stroke:#8E0000,color:#fff

    react["<b>React</b><br/>MediaRecorder webm/opus<br/>timeslice = 5000 ms"]:::client
    nodews["<b>Node Gateway</b><br/>Persiste a PostgreSQL +<br/>forward al AI service"]:::gw

    subgraph slice ["📥 _slice_and_transcribe — streaming.py"]
        accum["session_audio (bytearray)<br/>acumulación + decode webm completo"]:::stage
        overlap["Slice con overlap 1.5 s<br/>desde last_processed_ms"]:::stage
        tail["Layer 1<br/>Tail floor (finalize only)<br/>drop si new_ms < 500"]:::stage
        vad["Layer 2<br/>Silero VAD pre-check<br/>voice_prob < 0.5 → skip"]:::stage
        whisper["Layer 3<br/>Whisper API<br/>verbose_json + segments[]"]:::llm
        segdedup["Layer 4<br/>Segment-level overlap dedup<br/>seg.end > overlap_sec"]:::stage
        hallu["Layer 5<br/>HallucinationFilter (6 sub-capas)<br/>patterns / repetition / sound markers /<br/>low conf / dup-with-prev / pleasantry"]:::stage
    end

    boundary["<b>on_transcript_chunk</b><br/>Layer 6 — text-level boundary dedup<br/>strip prefix == suffix de last_emitted"]:::stage

    subgraph diar ["🎙️ AudioFeatureDiarizer"]
        embed["Resemblyzer.embed(audio)<br/>256-d L2-normed"]:::stage
        cluster["Cosine vs centroides en Redis<br/>≥ 0.70 → match (EMA update)<br/>< 0.70 → SPEAKER_N nuevo (cap 4)"]:::stage
        role["Role: keyword DOCTOR/PATIENT<br/>sobre transcript"]:::stage
    end

    subgraph extr ["🧠 IncrementalExtractor"]
        ctx["Rolling 3-chunk text context"]:::stage
        gpt1["gpt-4o extract_simple +<br/>gpt-4o extract_critical"]:::llm
        events["ExtractionEvent[] por entidad"]:::stage
    end

    subgraph dedup ["🧹 Pipeline de dedup (5 capas)"]
        la["Layer A — AtomicEntitySplitter<br/>'fiebre y dolor de cabeza' → ['fiebre',…]<br/>(gpt-4o-mini)"]:::stage
        lb["Layer B — Forbidden-prefix<br/>'diagnóstico de…' nunca síntoma"]:::stage
        lc["Layer C — EntityTypeValidator<br/>gpt-4o-mini reclasifica"]:::stage
        ld["Layer D — Heuristic dedup<br/>exact / containment per type"]:::stage
        le["Layer E — EntitySemanticDeduper<br/>OpenAI embeddings + cosine ≥ 0.86"]:::stage
    end

    subgraph rag ["🔍 RAGValidationCoordinator"]
        qcrit["Queue CRITICAL<br/>(drug interactions)"]:::alert
        qhigh["Queue HIGH<br/>(medication validate)"]:::stage
        qmed["Queue MEDIUM<br/>(CIE-10 suggest)"]:::stage
        chroma[("ChromaDB<br/>vademécum<br/>medications +<br/>interactions +<br/>cie10")]:::store
    end

    pg[("PostgreSQL<br/>transcription_events<br/>extraction_events<br/>validation_alerts<br/>cost_events")]:::store
    redis[("Redis<br/>session state<br/>speaker centroids<br/>event buffer 60s")]:::store

    react -- "binary frames over WS" --> nodews
    nodews -. "forward verbatim" .-> accum
    nodews ==> pg

    accum --> overlap --> tail --> vad --> whisper --> segdedup --> hallu --> boundary

    boundary -. "transcript_update<br/>(WS event)" .-> react
    boundary --> embed
    boundary --> ctx

    embed --> cluster --> role
    role -. "speaker_changed<br/>(WS event)" .-> react
    cluster <--> redis

    ctx --> gpt1 --> events --> la --> lb --> lc --> ld --> le

    le -. "extraction_update<br/>(WS event)" .-> react
    le ==> qcrit
    le --> qhigh
    le --> qmed

    qcrit & qhigh & qmed <--> chroma
    qcrit ==> alertOut["validation_alert<br/>(CRITICAL — &lt; 1s target)"]:::alert
    qhigh -. "entity_validated" .-> react
    qmed -. "entity_validated" .-> react
    alertOut -. WS .-> react

    le --> pg
    boundary --> pg
    role --> pg
    alertOut --> pg
```

## Modelos cargados al startup (warm-up)

`ai-service/src/api/main.py`:

1. `silero_vad.load_silero_vad()` — VAD ~32 ms windows a 16 kHz.
2. `resemblyzer.VoiceEncoder()` — JIT inicial ~24 s (librosa+numba); subsiguientes < 50 ms.

Sin warm-up el primer slice tomaba > 30 s y disparaba timeouts del WebSocket en algunos navegadores.

## Targets de latencia

| Evento | Target | Medido típicamente |
|---|---|---|
| `transcript_update` (desde fin de habla a UI) | < 2 s | ~1.2-1.8 s |
| `extraction_update` | < 3 s | ~2-2.5 s |
| `validation_alert` (CRITICAL — drug interaction) | < 1 s desde extracción | ~0.4-0.8 s |
| Reconexión + replay (event buffer 60 s) | < 5 s | ~1-3 s |

## Persistencia y reconexión

- **Cada evento** emitido al cliente se escribe a PostgreSQL (Backend, `event-persistence.service.ts`) **y** se buffer-ea en Redis con TTL 60 s.
- En desconexión, el cliente reconecta con `last_event_id`; el Backend replica los eventos faltantes desde Redis (rápido) o desde PostgreSQL (fallback si pasaron > 60 s).

## Costos (resumen)

Tracker: `services/cost_tracker.py`. Por sesión típica de 15 min:
- Whisper: ~$0.09 (15 min × $0.006/min)
- GPT-4o extracción: ~$0.05–0.15 (depende de cantidad de entidades)
- GPT-4o-mini (splitter + type validator): ~$0.005
- Embeddings (semantic dedup + RAG): ~$0.001
- **Total ~$0.15–0.25 por consulta de 15 min.**
