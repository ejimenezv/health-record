# Endpoints de Integración Node.js ↔ Python AI Service

Endpoints REST y WebSocket expuestos por el backend Node.js para consumir el servicio Python (Prompts 14-25). Estos endpoints **envuelven** los del servicio Python y añaden persistencia, validación de usuario y abstracciones útiles para el frontend.

> **Nota:** este documento describe la API del backend Node.js. La API del servicio Python está en [openapi.yaml](openapi.yaml) y en runtime en `http://localhost:8000/api/v1/openapi.json`.

## Autenticación

Todos los endpoints requieren `Authorization: Bearer <jwt>` con un token emitido por `POST /api/v1/auth/login` del propio backend. El backend valida el token con `JWT_SECRET` y, si llama al servicio Python, emite internamente un token de servicio firmado con `AI_SERVICE_JWT_SECRET`. Ver [ADR-003](../adr/ADR-003-nodejs-python-ai-integration.md).

## Convención de Respuestas

Todas las respuestas siguen `{ success: boolean, data?: object, message?: string }`. Errores siguen el handler central (`error.middleware.ts`).

---

## Sesiones de Streaming

### `POST /api/v1/ai/sessions`

Crea una sesión de streaming en tiempo real. Internamente llama a `POST /api/v1/sessions` del servicio Python, persiste un registro espejo en `ai_sessions`, y devuelve la URL del **gateway WebSocket de Node.js** (no la de Python).

**Request body:**
```json
{
  "patientId": "uuid",          // opcional
  "appointmentId": "uuid",       // opcional
  "appointmentType": "string",   // opcional, almacenado solo en Node
  "specialty": "medicina general", // opcional, enviado a Python (default si se omite)
  "metadata": {}                 // opcional, pass-through a Python
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-row-en-ai_sessions",
    "sessionId": "session_4032f1cf662c",
    "websocketUrl": "/ws/session/session_4032f1cf662c",
    "status": "active",
    "specialty": "medicina general",
    "createdAt": "2026-04-30T14:52:22.632Z"
  }
}
```

> **El frontend debe conectarse a `websocketUrl` (relativo al backend Node.js), nunca a la URL de Python directamente.** Ver [ADR-003 Decisión 2](../adr/ADR-003-nodejs-python-ai-integration.md).

### `POST /api/v1/ai/sessions/:sessionId/finalize`

"Finaliza" una sesión. Esta operación es una **abstracción del backend Node.js** — no hay endpoint equivalente en Python. Hace:

1. `DELETE /api/v1/sessions/:sessionId` en Python (404-tolerante).
2. Lee `ai_sessions` y eventos persistidos.
3. Devuelve estado consolidado + log de eventos.

Es idempotente: puede llamarse aunque `session_complete` ya haya cerrado la sesión vía WebSocket.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_4032f1cf662c",
    "status": "success",
    "finalTranscript": "Transcripción completa...",
    "totalCostUsd": 0.12,
    "audioDurationSeconds": 180,
    "completedAt": "2026-04-30T14:55:00.000Z",
    "events": {
      "transcriptEvents": [...],
      "extractionEvents": [...],
      "validationAlerts": [...],
      "costEvents": [...]
    }
  }
}
```

### `GET /api/v1/ai/sessions/:sessionId/events`

Devuelve el log completo de eventos persistidos de una sesión, ordenados por timestamp ascendente. Útil para playback y auditoría.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transcriptEvents": [...],
    "extractionEvents": [...],
    "validationAlerts": [...],
    "costEvents": [...]
  }
}
```

---

## Validation Alerts

### `POST /api/v1/ai/alerts/:alertId/acknowledge`

Marca una alerta de validación (drug interaction, allergy conflict, etc.) como confirmada por el usuario actual. Útil para flujos clínicos donde una alerta CRITICAL bloquea el siguiente paso hasta acknowledge.

**Response 200:**
```json
{ "success": true, "message": "Alerta confirmada" }
```

Tras esta llamada, `validation_alerts.acknowledged = true`, `acknowledged_by = req.userId`, `acknowledged_at = NOW()`.

---

## RAG

### `POST /api/v1/ai/query`

Proxy del endpoint `POST /api/v1/query` de Python con autenticación traducida. La respuesta se renombra a camelCase.

**Request body:**
```json
{
  "query": "¿Cuáles son los síntomas de diabetes tipo 2?",
  "sessionId": "session_...",   // opcional, contexto conversacional
  "contextFilter": {},          // opcional, filtros sobre el vector store
  "includeSources": true        // opcional, default true
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "response": "...",
    "sources": [
      {
        "documentId": "doc_123",
        "chunkText": "...",
        "similarityScore": 0.87,
        "metadata": {}
      }
    ],
    "tokensUsed": 850,
    "latencyMs": 420,
    "sessionId": "session_..."
  }
}
```

---

## Health

### `GET /api/v1/ai/python/health`

Proxy del endpoint `/health` del servicio Python. **No** requiere auth en Python pero sí en Node.js (consistencia: cualquier endpoint del backend Node.js requiere usuario autenticado).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "healthy" | "degraded",
    "components": [
      { "name": "openai_api", "status": "healthy", "latency_ms": 80, "message": null },
      { "name": "vector_store", "status": "healthy", "latency_ms": 18, "message": null }
    ]
  }
}
```

> Para chequear la salud **del propio backend Node.js**, usar `GET /api/v1/health` (no `/ai/python/health`).

---

## WebSocket Gateway

### `ws://<backend>/ws/session/:sessionId?token=<jwt>`

Gateway WebSocket bidireccional hacia el servicio Python. Se conecta tras un `POST /api/v1/ai/sessions` exitoso.

**Auth:** query param `token=<jwt>` (mismo JWT que se usa para REST). Si falta o es inválido el gateway cierra con código `4001` antes de conectar a Python.

**Mensajes del cliente al servidor:**

| Tipo | Contenido | Forwarded a |
|---|---|---|
| Binary | Audio Opus | Python (sin modificar) |
| Text/JSON | Mensajes de control (start, stop, etc.) | Python (sin modificar) |

**Mensajes del servidor al cliente:**

8 tipos de evento JSON, todos forwarded desde Python tras persistirse en PostgreSQL. Schema completo en [packages/backend/src/types/websocket-events.ts](../../packages/backend/src/types/websocket-events.ts).

| Evento | Descripción |
|---|---|
| `transcript_update` | Chunk de transcripción (interim o final). |
| `speaker_changed` | Cambio de hablante con rol detectado (DOCTOR / PATIENT / UNKNOWN). |
| `extraction_update` | Entidad médica extraída (síntoma, diagnóstico, prescripción, etc.). |
| `entity_validated` | Resultado de validación de una entidad previamente extraída. |
| `validation_alert` | Alerta clínica (drug_interaction, allergy_conflict, etc.) con severity CRITICAL/HIGH/MEDIUM/LOW. |
| `cost_update` | Costo acumulado de la sesión. |
| `session_complete` | Resumen final de la sesión. Tras este evento, `ai_sessions.status` queda actualizado. |
| `error` | Error en el pipeline. Si `recoverable=false`, la sesión queda marcada como `failed`. |

**Códigos de cierre:**

| Código | Razón |
|---|---|
| `1000` | Cierre normal (cliente o servidor). |
| `4001` | Token ausente o inválido. |
| `4500` | Error en el servicio Python upstream. |

---

## Diferencias con la Especificación Original (Prompt 26)

Tres divergencias intencionales contra la especificación del Prompt 26, documentadas en [ADR-003](../adr/ADR-003-nodejs-python-ai-integration.md):

1. **Sin `/auth/token`** — el backend mintea tokens de servicio localmente en vez de hacer login contra Python.
2. **`websocketUrl` reescrito** — el backend devuelve la URL de su propio gateway, no la de Python.
3. **`finalize` no es proxy directo** — es una abstracción de Node.js que envuelve `DELETE` + lectura de estado persistido.
