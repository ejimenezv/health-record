# Diagrama de Secuencia — Flujo Batch (subida de audio)

**Propósito:** Mostrar el flujo alternativo donde el médico sube un archivo de audio completo después de la consulta, en lugar de transmitir en tiempo real.

> **Nota:** A diferencia del diseño original (Prompt 36), **no hay Celery worker**. El batch reutiliza la misma infraestructura del pipeline streaming: el AI Service alimenta el archivo a través del mismo `_slice_and_transcribe` y emite eventos. El cliente puede consumirlos por WebSocket (preferido) o hacer polling REST.

```mermaid
%%{init: {'theme':'neutral'}}%%
sequenceDiagram
    autonumber
    actor M as 👤 Médico
    participant FE as Frontend React
    participant BE as Backend Node.js
    participant AI as AI Service<br/>(streaming.py)
    participant PG as PostgreSQL
    participant OAI as OpenAI API
    participant CH as ChromaDB

    M->>FE: Selecciona archivo audio<br/>(mp3/m4a/wav/webm)
    FE->>+BE: POST /api/v1/ai/sessions/upload<br/>multipart/form-data<br/>JWT Bearer
    BE->>BE: Valida tamaño (≤ 100MB),<br/>tipo MIME, JWT
    BE->>PG: INSERT ai_sessions<br/>status='processing', mode='batch'
    BE->>+AI: POST /sessions + audio bytes
    AI->>AI: persiste a /tmp + metadatos
    AI-->>-BE: {session_id}
    BE-->>-FE: 202 Accepted<br/>{session_id, ws_url, status:"processing"}

    M->>FE: 👁️ "Procesando..."

    par Procesamiento async (in-process, NO Celery)
        AI->>AI: alimenta archivo a<br/>_slice_and_transcribe<br/>en chunks de 5s

        loop por cada slice
            AI->>AI: Layer 2 — Silero VAD
            alt voz detectada
                AI->>+OAI: Whisper (verbose_json)
                OAI-->>-AI: transcripción
                AI->>AI: Layers 4-6 (dedup + halluc + boundary)
                AI-->>BE: transcript_update<br/>(WS si conectado)
                BE->>PG: persist event

                par
                    AI->>AI: Resemblyzer + clustering<br/>→ speaker_changed
                and
                    AI->>+OAI: gpt-4o extracción +<br/>splitter + type-validator
                    OAI-->>-AI: entidades
                    AI->>AI: pipeline de dedup (5 capas)
                    AI-->>BE: extraction_update
                    BE->>PG: persist
                end

                AI->>+CH: RAG validation queries
                CH-->>-AI: top-k
                AI-->>BE: validation_alert / entity_validated
                BE->>PG: persist
            else
                AI->>AI: skip (sin Whisper)
            end
        end

        AI->>+OAI: gpt-4o generate SOAP final
        OAI-->>-AI: nota SOAP
        AI->>PG: persist soap_note
        AI->>PG: UPDATE ai_sessions<br/>status='completed'
    and Cliente puede esperar por WS o polling
        alt Cliente conectó WebSocket
            FE->>BE: WSS /ws/ai-session/{id}
            BE-->>FE: replay eventos persistidos<br/>+ stream nuevos en vivo
            FE-->>M: 🖥️ Resultados en tiempo real
        else Polling REST
            loop cada 5 s
                FE->>+BE: GET /api/v1/ai/sessions/{id}
                BE->>PG: SELECT session + events
                PG-->>BE: estado actual
                BE-->>-FE: {status, progress, partial_results}
                alt status === "completed"
                    FE->>FE: detiene polling
                end
            end
        end
    end

    BE-->>FE: WS session_complete<br/>O respuesta GET con status="completed"
    FE->>+BE: GET /api/v1/ai/sessions/{id}/full
    BE->>PG: SELECT all events + soap_note
    PG-->>BE: dataset completo
    BE-->>-FE: {transcription, entities, soap, costs}
    FE-->>M: 📋 Transcripción + entidades + SOAP
```

## Diferencias con el flujo real-time

| Aspecto | Real-time | Batch |
|---|---|---|
| Origen del audio | MediaRecorder webm/opus, 5 s timeslice | Archivo completo subido vía REST |
| Disparador | `audio` events sobre WS | POST a `/sessions/upload` |
| Latencia percibida | < 2 s por chunk | ~tiempo total de audio × 0.3-0.5 |
| Notificación al cliente | WebSocket (primario) | WebSocket o polling REST |
| `finalize` | Mensaje WS explícito | Implícito al terminar el archivo |
| Persistencia | Idéntica (mismos `*_events`) | Idéntica |

## Endpoints REST involucrados

| Método | Ruta | Propósito |
|---|---|---|
| `POST` | `/api/v1/ai/sessions/upload` | Crear sesión + subir audio (multipart) |
| `GET` | `/api/v1/ai/sessions/{id}` | Estado actual + progreso |
| `GET` | `/api/v1/ai/sessions/{id}/full` | Dataset completo cuando `status=completed` |
| `DELETE` | `/api/v1/ai/sessions/{id}` | Cierre / limpieza |

> Ver [`ai_service_contract.md`](../../../memory/ai_service_contract.md) para detalles del contrato real (JWT-only, no `/auth/token`, no `/finalize`).
