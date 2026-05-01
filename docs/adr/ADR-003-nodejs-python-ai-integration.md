# ADR-003: Integración Node.js Backend ↔ Python AI Service

**Fecha:** 30/04/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

## Contexto

El Prompt 26 (`prompts/26-integrate-nodejs-backend.md`) especifica un cliente HTTP y un gateway WebSocket en el backend Node.js para integrarse con el servicio Python (Prompts 14-25). Sin embargo, al implementar la integración contra el contenedor real (`medrecord-ai-service` en Docker), se detectaron tres divergencias entre la especificación del Prompt 26 y la API real expuesta por el servicio Python.

Estas divergencias deben resolverse de forma intencional y documentada para evitar que un futuro mantenedor las "corrija" volviendo a la especificación obsoleta.

## Decisiones

Adoptamos el contrato real del servicio Python como fuente de verdad. El Prompt 26 queda como contexto histórico, no como especificación normativa. Tres decisiones concretas se derivan de esto:

### Decisión 1: Autenticación JWT por secreto compartido (sin endpoint de login)

El servicio Python valida un JWT firmado con `JWT_SECRET_KEY` (HS256, claim `sub`, claim `exp`). **No** expone `POST /auth/token` ni ningún endpoint de login.

El backend Node.js mantiene un secreto **independiente y diferente** para sus propios usuarios (`JWT_SECRET`) y un secreto **dedicado y compartido con Python** (`AI_SERVICE_JWT_SECRET`). Para cada llamada al servicio Python, Node.js firma un token de servicio efímero (`expiresIn: 300s`) con el segundo secreto y lo envía como `Authorization: Bearer <token>`.

**Por qué:**
- Evita un round-trip de login que el servicio Python no implementa.
- Permite atribuir la llamada al usuario real (`sub = req.userId`) sin que el servicio Python sepa nada del esquema de usuarios de Node.js.
- Aísla los dominios de confianza: comprometer `JWT_SECRET` (tokens de usuario) no compromete `AI_SERVICE_JWT_SECRET` (tokens de servicio) ni viceversa.

**Consecuencia operativa:** los dos secretos deben coordinarse en despliegues. En desarrollo se usa el mismo placeholder (`change-this-to-a-secure-secret-key-min-32-chars`) que viene en `ai-service/.env.example` y se replica en `packages/backend/.env`. En producción se gestionan vía gestor de secretos.

### Decisión 2: URL del WebSocket sintetizada en Node.js (no proxy directo del valor de Python)

`POST /api/v1/sessions` del servicio Python devuelve un `session.websocket_url` apuntando a sí mismo (`ws://localhost:8000/ws/session?session_id=...`). El controlador de Node.js **descarta intencionalmente** ese valor y devuelve al frontend `/ws/session/<session_id>` (la URL del gateway de Node.js).

**Por qué:**
- Si el frontend se conectara directamente al WebSocket de Python, los eventos (`transcript_update`, `validation_alert`, `cost_update`, etc.) **no se persistirían** en PostgreSQL — perderíamos historial, auditoría y la capacidad de hacer playback de la sesión.
- El gateway de Node.js es un proxy bidireccional que forwardea audio binario hacia Python y eventos JSON hacia el cliente, **persistiendo cada evento de forma asíncrona** mediante `EventPersistenceService`.
- Mantiene el dominio de exposición: en producción, el servicio Python vive en una red privada y no es accesible desde el navegador. Node.js es el único punto público.

**Consecuencia operativa:** todo nuevo tipo de evento WebSocket que añada el servicio Python debe tener un handler de persistencia en `EventPersistenceService` y entrar en el `switch` de `persistEvent()` del gateway, o quedará sin guardar.

### Decisión 3: "Finalizar sesión" es una abstracción Node.js sobre `DELETE` + evento `session_complete`

El Prompt 26 asume un endpoint `POST /api/v1/sessions/:id/finalize` que devolvería el resumen final. **Ese endpoint no existe** en el servicio Python. El ciclo de vida real es:

1. Cliente cierra la conexión WebSocket o el servidor decide terminar.
2. Python emite `session_complete` por WebSocket con el resumen final (`final_transcript`, `final_cost_summary`, etc.).
3. El gateway de Node.js persiste ese evento en `ai_sessions` (status, finalTranscript, totalCostUsd, audioDurationSeconds).
4. Cliente puede llamar `DELETE /api/v1/sessions/:id` para liberar recursos en Python.

El controlador `aiSessionController.finalizeSession` (mapeado a `POST /api/v1/ai/sessions/:id/finalize` en el lado Node.js) **agrega** estos pasos:

```
1. DELETE /api/v1/sessions/:id en Python (404-tolerante: la sesión puede ya estar cerrada)
2. Leer ai_sessions y eventos persistidos desde nuestra DB
3. Devolver al frontend el estado consolidado + log de eventos
```

**Por qué:**
- La operación "finalizar" tiene semántica útil para el frontend (un solo POST consolidado) que no existe en Python.
- 404-tolerar hace la operación idempotente: el frontend puede llamarla incluso si `session_complete` ya cerró todo.
- La fuente de verdad del resumen final es nuestra DB (`ai_sessions` row), no Python — Python ya no tiene la sesión cuando finalize se invoca explícitamente.

**Consecuencia operativa:** si Python eventualmente añade un endpoint `/finalize`, esta abstracción puede colapsarse en un proxy directo, pero la persistencia de eventos sigue siendo responsabilidad del gateway.

## Alternativas Consideradas

### Alt 1: Esperar/forzar que Python implemente el contrato del Prompt 26

- **Pros:** un solo contrato canónico.
- **Contras:** bloquea la integración indefinidamente; el Prompt 26 fue escrito antes que la implementación de Python evolucionara y no refleja decisiones legítimas del equipo Python (separar lifecycle en `DELETE` + evento es una API más simple).
- **Veredicto:** rechazado.

### Alt 2: Conectar el frontend directamente al WebSocket de Python

- **Pros:** menos saltos, menos código en Node.js.
- **Contras:** rompe la persistencia de eventos, expone Python a la red pública, complica auth (Python tendría que validar tokens del esquema de usuarios de Node.js).
- **Veredicto:** rechazado.

### Alt 3: Usar el mismo `JWT_SECRET` para usuarios y servicio

- **Pros:** un secreto menos.
- **Contras:** acopla los dominios de confianza; un token de usuario válido de Node.js sería automáticamente válido contra el servicio Python con privilegios de servicio.
- **Veredicto:** rechazado.

## Consecuencias

### Positivas

- **Integración real funcional** verificada con smoke test contra el contenedor en vivo (sesión `session_4032f1cf662c` creada exitosamente con JWT de Node.js).
- **Persistencia garantizada** de todos los eventos WebSocket en PostgreSQL.
- **Dominio público controlado**: solo el backend Node.js es accesible desde Internet.
- **Aislamiento de credenciales**: tokens de usuario y de servicio firman con secretos distintos.
- **Idempotencia** de la operación finalize.

### Negativas / Trade-offs

- **Dos secretos JWT** que mantener en sincronía (Node.js ↔ Python).
- **Acoplamiento de eventos**: cualquier nuevo tipo de evento WebSocket en Python requiere un cambio coordinado en `EventPersistenceService`.
- **Doble fuente de verdad temporal** durante una sesión activa: Python tiene el estado en memoria, Node.js tiene los eventos persistidos. Resolución: tras `session_complete`, la fuente de verdad es Node.js.

## Implementación

Archivos relevantes:

| Componente | Ubicación |
|---|---|
| Cliente HTTP con JWT minting | [packages/backend/src/services/ai-service.client.ts](../../packages/backend/src/services/ai-service.client.ts) |
| Gateway WebSocket (proxy + persistencia) | [packages/backend/src/websocket/ai-session-gateway.ts](../../packages/backend/src/websocket/ai-session-gateway.ts) |
| Persistencia de eventos | [packages/backend/src/services/event-persistence.service.ts](../../packages/backend/src/services/event-persistence.service.ts) |
| Controlador de sesiones | [packages/backend/src/controllers/ai-session.controller.ts](../../packages/backend/src/controllers/ai-session.controller.ts) |
| Esquema de DB (Prisma) | [packages/backend/prisma/schema.prisma](../../packages/backend/prisma/schema.prisma) — modelos `AiSession`, `TranscriptionEvent`, `ExtractionEvent`, `ValidationAlert`, `CostEvent` |
| Variables de entorno | `AI_SERVICE_URL`, `AI_SERVICE_WS_URL`, `AI_SERVICE_JWT_SECRET`, `AI_SERVICE_SUBJECT` |

Tests de integración:

- [packages/backend/tests/integration/ai-session-persistence.test.ts](../../packages/backend/tests/integration/ai-session-persistence.test.ts) — 8 casos cubriendo todos los tipos de evento.
- [packages/backend/tests/integration/ai-session-gateway.test.ts](../../packages/backend/tests/integration/ai-session-gateway.test.ts) — 3 casos cubriendo auth, rechazo de tokens inválidos, y proxy bidireccional con persistencia.

## Criterios de Revisión

Esta decisión se revisará si ocurre cualquiera de las siguientes condiciones:

| Trigger | Acción |
|---|---|
| Python expone `/auth/token` | Considerar si Node.js debería usar login real en vez de minting local |
| Python expone `/api/v1/sessions/:id/finalize` | Colapsar la abstracción `finalizeSession` en un proxy directo |
| Frontend necesita conectarse a Python sin pasar por Node.js | Reevaluar el modelo de persistencia (¿webhooks?, ¿read-replica?) |
| Auditoría regulatoria requiere firma criptográfica de eventos | Añadir HMAC firmado por Python a cada evento WebSocket |

## Referencias

- Prompt original: [prompts/26-integrate-nodejs-backend.md](../../prompts/26-integrate-nodejs-backend.md)
- OpenAPI del servicio Python: `http://localhost:8000/api/v1/openapi.json` (en runtime)
- Documento relacionado: [streaming-transcription-architecture.md](../architecture/streaming-transcription-architecture.md) — sección "7. Gateway Node.js y Persistencia de Eventos"
- Documento relacionado: [api/nodejs-ai-integration-endpoints.md](../api/nodejs-ai-integration-endpoints.md)
