# Diagrama de Secuencia — Flujo Real-Time (WebSocket Streaming)

**Propósito:** Ciclo completo de una consulta médica en modo real-time, desde la creación de sesión hasta la finalización, incluyendo el escenario de reconexión.

```mermaid
%%{init: {'theme':'neutral'}}%%
sequenceDiagram
    autonumber
    actor M as 👤 Médico
    participant FE as Frontend React<br/>(useRealtimeSession)
    participant NX as Nginx
    participant BE as Backend Node.js<br/>(WS Gateway)
    participant AI as AI Service<br/>(streaming.py)
    participant R as Redis
    participant PG as PostgreSQL
    participant OAI as OpenAI API
    participant CH as ChromaDB

    Note over M,CH: 1. Creación de sesión + handshake WebSocket

    M->>FE: Click "Iniciar consulta"
    FE->>+NX: POST /api/v1/ai/sessions<br/>{appointment_id, mode:"streaming"}<br/>JWT Bearer
    NX->>+BE: forward
    BE->>BE: Valida JWT, crea ai_session
    BE->>PG: INSERT ai_sessions
    BE->>+AI: POST /sessions
    AI->>R: SET session:{id} state
    AI-->>-BE: {session_id}
    BE-->>-NX: {session_id, ws_url}
    NX-->>-FE: 201 Created

    FE->>NX: WSS /ws/ai-session/{id}<br/>Upgrade
    NX->>BE: WS upgrade
    BE->>AI: WS upgrade (proxy interno)
    AI->>AI: Inicializa VAD, buffers
    AI-->>FE: ws_open

    M->>FE: 👁️ "Grabando..."

    Note over M,CH: 2. Loop de streaming (cada 5 s)

    loop cada timeslice = 5000 ms
        M->>FE: Habla
        FE->>FE: MediaRecorder webm/opus chunk
        FE-->>NX: WS binary frame
        NX-->>BE: WS binary
        BE->>PG: INSERT transcription_events (raw)
        BE-->>AI: forward verbatim

        AI->>AI: append a session_audio (bytearray)
        AI->>AI: decode webm completo, slice con overlap 1.5s

        alt new_ms < 5000
            AI->>AI: return (espera más audio)
        else
            AI->>AI: Layer 1 — tail floor
            AI->>AI: Layer 2 — Silero VAD pre-check
            alt voice_prob < 0.5
                AI->>AI: skip (💰 Whisper no llamado)
            else
                AI->>+OAI: POST audio/transcriptions<br/>verbose_json
                OAI-->>-AI: text + segments[]
                AI->>AI: Layer 4 — segment overlap dedup
                AI->>AI: Layer 5 — HallucinationFilter (6)
                AI->>AI: Layer 6 — boundary text dedup

                AI-->>BE: event transcript_update
                BE->>PG: persist event
                BE->>R: buffer event (TTL 60s)
                BE-->>FE: WS transcript_update
                FE-->>M: 🖥️ Texto en pantalla<br/>(latency &lt; 2s)

                par Diarización
                    AI->>AI: Resemblyzer.embed(audio)
                    AI->>R: get speaker_centroids
                    AI->>AI: cosine vs centroides<br/>(match ≥ 0.70 / new SPEAKER_N)
                    AI->>R: update centroide (EMA)
                    AI-->>BE: speaker_changed
                    BE->>PG: persist
                    BE-->>FE: WS speaker_changed
                and Extracción
                    AI->>AI: append a rolling 3-chunk context
                    AI->>+OAI: gpt-4o extract_simple +<br/>extract_critical
                    OAI-->>-AI: ExtractionEvent[]
                    AI->>+OAI: Layer A — splitter (gpt-4o-mini)
                    OAI-->>-AI: split entities
                    AI->>AI: Layer B — forbidden-prefix
                    AI->>+OAI: Layer C — type-validator<br/>(gpt-4o-mini)
                    OAI-->>-AI: reclassified
                    AI->>AI: Layer D — heuristic dedup
                    AI->>+OAI: Layer E — embeddings (cosine ≥ 0.86)
                    OAI-->>-AI: dedup result

                    AI-->>BE: extraction_update
                    BE->>PG: persist
                    BE-->>FE: WS extraction_update<br/>(latency &lt; 3s)
                    FE-->>M: 🖥️ Síntoma/Dx/Rx en panel
                end

                AI->>AI: enqueue validation<br/>(CRITICAL/HIGH/MEDIUM)

                par RAG Validation (async, no-bloqueante)
                    AI->>CH: query medications/<br/>interactions/cie10
                    CH-->>AI: top-k matches
                    alt CRITICAL — drug interaction
                        AI-->>BE: validation_alert
                        BE->>PG: persist alert
                        BE-->>FE: WS validation_alert
                        FE-->>M: 🚨 ALERTA crítica<br/>(target &lt; 1s)
                    else HIGH/MEDIUM
                        AI-->>BE: entity_validated
                        BE-->>FE: WS entity_validated
                        FE-->>M: ✓ Validación
                    end
                end

                AI-->>BE: cost_event (tokens, $)
                BE->>PG: persist cost_event
            end
        end
    end

    Note over M,CH: 3. Escenario de reconexión

    FE--xNX: 🔌 Conexión perdida
    FE->>FE: Detecta close
    FE->>NX: WSS reconnect<br/>?last_event_id={n}
    NX->>BE: WS upgrade
    BE->>R: GET event_buffer<br/>desde last_event_id
    alt buffer existe (< 60s)
        R-->>BE: missed events
    else
        BE->>PG: SELECT events<br/>WHERE seq > last_event_id
        PG-->>BE: missed events
    end
    BE-->>FE: replay events
    FE-->>M: Estado reconstruido

    Note over M,CH: 4. Finalización

    M->>FE: Click "Finalizar"
    FE->>FE: stopRecording (await)
    FE->>BE: WS {type:"finalize"}
    BE->>AI: forward finalize
    AI->>AI: flush último slice (min_ms=0)
    AI->>+OAI: gpt-4o generate SOAP
    OAI-->>-AI: nota SOAP estructurada
    AI->>PG: persist soap_note
    AI-->>BE: session_complete<br/>{soap, costs, duration}
    BE->>PG: UPDATE ai_sessions<br/>status='completed'
    BE-->>FE: WS session_complete
    FE-->>M: 📋 SOAP + costos + resumen
    FE->>BE: REST DELETE /sessions/{id}
    BE-->>FE: 200
```

## Tipos de eventos WebSocket

| Evento | Dirección | Latencia objetivo | Payload |
|---|---|---|---|
| (binary frame) | Client → Server | — | webm/opus 5s timeslice |
| `finalize` | Client → Server | — | `{type:"finalize"}` |
| `transcript_update` | Server → Client | < 2 s | `{chunk_index, text, is_final, speaker_hint, ts}` |
| `speaker_changed` | Server → Client | < 2 s | `{speaker_id, role, embedding_distance}` |
| `extraction_update` | Server → Client | < 3 s | `{entity_type, name, attrs, action: created\|updated, confidence}` |
| `validation_alert` | Server → Client | < 1 s | `{severity: CRITICAL, medications, recommendation, sources}` |
| `entity_validated` | Server → Client | < 5 s | `{entity_id, rag_result, sources}` |
| `cost_event` | Server → Client | — | `{model, tokens_in, tokens_out, usd}` |
| `session_complete` | Server → Client | — | `{soap, costs, duration_ms}` |
| `error` | Server → Client | — | `{code, message}` |

## Notas de implementación

- **Backend persiste antes de procesar:** los eventos `transcription_events` se escriben en cuanto entran del frontend; esto garantiza recuperabilidad incluso si el AI Service muere mid-sesión.
- **Reconexión con replay** usa Redis preferentemente (rápido); fallback a PostgreSQL si el buffer expiró.
- **El `finalize` es load-bearing:** sin él el último slice no se procesa porque no alcanza los 5000 ms (`stopRecording()` en `useRealtimeSession.ts` espera al evento `stop` del MediaRecorder antes de enviar `finalize`).
