# Implementación de WebSocket Gateway - MedRecord AI

## 1. Arquitectura de WebSocket

### 1.1 Flujo de Conexión

```
Cliente                     Backend               AI Service (WebSocket Gateway)
  │                           │                            │
  │  POST /sessions/stream    │                            │
  ├──────────────────────────>│                            │
  │  201 {session_id, ws_url, token}                       │
  │<───────────────────────────┤                            │
  │                           │                            │
  │  WebSocket Upgrade (wss://...?token=...)               │
  ├────────────────────────────────────────────────────────>│
  │                           │                            │
  │                           │  Validate JWT token        │
  │                           │  Create session in Redis   │
  │                           │                            │
  │  {type: "connection_established"}                      │
  │<────────────────────────────────────────────────────────┤
  │                           │                            │
  │  {type: "audio_chunk", data: <opus_bytes>}             │
  ├────────────────────────────────────────────────────────>│
  │                           │                            │
  │  {type: "transcription_update", data: {...}}           │
  │<────────────────────────────────────────────────────────┤
  │                           │                            │
  │  {type: "symptom_extracted", data: {...}}              │
  │<────────────────────────────────────────────────────────┤
```

### 1.2 Stack Tecnológico

| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **WebSocket Server** | FastAPI WebSockets | 0.109+ | Async nativo, integración con FastAPI existente |
| **Audio Codec** | Opus (opuslib) | 3.0+ | 70% bandwidth reduction (24-32 kbps @ 16kHz) vs PCM (256 kbps) |
| **Session State** | Redis | 7.0+ | <5ms latency, TTL automático, pub/sub para broadcasting |
| **Serialization** | JSON (orjson) | 3.9+ | 2-3x faster than stdlib json, type safety |
| **Concurrency** | asyncio | Python 3.11+ | Native async/await, concurrent connection handling |

## 2. Implementación del WebSocket Gateway

### 2.1 Endpoint de Inicialización de Sesión

**Archivo:** `ai-service/app/api/v1/sessions.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import secrets
from datetime import datetime, timedelta
from app.core.auth import create_websocket_token
from app.core.redis_client import redis_client

router = APIRouter()

class CreateStreamSessionRequest(BaseModel):
    appointment_id: str
    patient_id: str
    doctor_id: str
    audio_config: dict = {
        "codec": "opus",
        "sample_rate": 16000,
        "channels": 1,
        "frame_duration_ms": 20
    }

class CreateStreamSessionResponse(BaseModel):
    session_id: str
    websocket_url: str
    websocket_token: str
    config: dict
    expires_at: str

@router.post("/sessions/stream", response_model=CreateStreamSessionResponse, status_code=201)
async def create_stream_session(
    request: CreateStreamSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Inicializa una sesión de streaming en tiempo real.

    Returns:
        - session_id: Identificador único de la sesión
        - websocket_url: URL completa del WebSocket endpoint
        - websocket_token: JWT token para autenticación WebSocket
        - config: Configuración de audio (codec, sample rate, etc.)
        - expires_at: Timestamp de expiración (2 horas)
    """
    # Generate session ID
    session_id = f"sess_rt_{secrets.token_urlsafe(16)}"

    # Create WebSocket JWT (expires in 2 hours)
    websocket_token = create_websocket_token(
        session_id=session_id,
        user_id=current_user["user_id"],
        appointment_id=request.appointment_id,
        expires_delta=timedelta(hours=2)
    )

    # Initialize session state in Redis
    session_data = {
        "session_id": session_id,
        "appointment_id": request.appointment_id,
        "patient_id": request.patient_id,
        "doctor_id": request.doctor_id,
        "user_id": current_user["user_id"],
        "status": "initialized",
        "created_at": datetime.utcnow().isoformat(),
        "last_activity": datetime.utcnow().isoformat(),
        "audio_config": request.audio_config,
        "event_sequence": 0,
        "total_audio_bytes": 0,
        "total_events_sent": 0
    }

    # Store in Redis with 2-hour TTL
    await redis_client.setex(
        f"session:{session_id}",
        7200,  # 2 hours
        orjson.dumps(session_data)
    )

    # Construct WebSocket URL
    ws_base_url = os.getenv("WEBSOCKET_BASE_URL", "wss://api.medrecord.ai")
    websocket_url = f"{ws_base_url}/api/v1/sessions/{session_id}/stream"

    return CreateStreamSessionResponse(
        session_id=session_id,
        websocket_url=websocket_url,
        websocket_token=websocket_token,
        config=request.audio_config,
        expires_at=(datetime.utcnow() + timedelta(hours=2)).isoformat()
    )
```

### 2.2 WebSocket Connection Handler

**Archivo:** `ai-service/app/api/v1/websocket.py`

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.exceptions import WebSocketException
import opuslib
import numpy as np
import orjson
from typing import Optional
from app.core.auth import verify_websocket_token
from app.core.redis_client import redis_client
from app.services.stream_processor import StreamProcessor
import structlog

router = APIRouter()
logger = structlog.get_logger()

class WebSocketManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.stream_processors: dict[str, StreamProcessor] = {}
        self.opus_decoders: dict[str, opuslib.Decoder] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        """Accept WebSocket connection and initialize decoder"""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        # Initialize Opus decoder (16kHz, mono)
        self.opus_decoders[session_id] = opuslib.Decoder(16000, 1)

        # Initialize Stream Processor
        self.stream_processors[session_id] = StreamProcessor(
            session_id=session_id,
            event_callback=lambda event: self.broadcast_event(session_id, event)
        )

        logger.info("websocket_connected", session_id=session_id)

    async def disconnect(self, session_id: str):
        """Clean up connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.opus_decoders:
            del self.opus_decoders[session_id]
        if session_id in self.stream_processors:
            await self.stream_processors[session_id].cleanup()
            del self.stream_processors[session_id]

        logger.info("websocket_disconnected", session_id=session_id)

    async def broadcast_event(self, session_id: str, event: dict):
        """Send event to client and buffer in Redis for reconnection"""
        if session_id not in self.active_connections:
            logger.warning("no_active_connection", session_id=session_id)
            return

        websocket = self.active_connections[session_id]

        # Add sequence number
        sequence = await self._get_next_sequence(session_id)
        event["sequence"] = sequence
        event["timestamp"] = datetime.utcnow().isoformat()

        # Buffer event in Redis (for reconnection, TTL 60s)
        await redis_client.lpush(
            f"session:{session_id}:events",
            orjson.dumps(event)
        )
        await redis_client.expire(f"session:{session_id}:events", 60)

        # Send to client
        try:
            await websocket.send_text(orjson.dumps(event).decode())
            logger.debug("event_sent", session_id=session_id, type=event["type"], sequence=sequence)
        except Exception as e:
            logger.error("event_send_failed", session_id=session_id, error=str(e))

    async def _get_next_sequence(self, session_id: str) -> int:
        """Increment and return event sequence number"""
        return await redis_client.incr(f"session:{session_id}:sequence")

    async def handle_audio_chunk(self, session_id: str, opus_data: bytes):
        """Decode Opus audio and pass to Stream Processor"""
        decoder = self.opus_decoders.get(session_id)
        if not decoder:
            logger.error("no_decoder", session_id=session_id)
            return

        processor = self.stream_processors.get(session_id)
        if not processor:
            logger.error("no_processor", session_id=session_id)
            return

        # Decode Opus to PCM (16-bit, 16kHz, mono)
        try:
            pcm_data = decoder.decode(opus_data, frame_size=320)  # 20ms @ 16kHz
            audio_array = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0

            # Update session stats
            await redis_client.hincrby(f"session:{session_id}", "total_audio_bytes", len(opus_data))

            # Process audio chunk
            await processor.process_audio_chunk(audio_array)

        except Exception as e:
            logger.error("opus_decode_failed", session_id=session_id, error=str(e))

manager = WebSocketManager()

@router.websocket("/sessions/{session_id}/stream")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time audio streaming and event broadcasting.

    Protocol:
        Client → Server:
            - {type: "audio_chunk", data: <base64_opus_bytes>}
            - {type: "auth_reconnect", token: <jwt>, last_event_id: <id>, last_sequence: <num>}

        Server → Client:
            - {type: "connection_established", session_id: <id>}
            - {type: "transcription_update", data: {...}, sequence: <num>}
            - {type: "symptom_extracted", data: {...}, sequence: <num>}
            - {type: "symptom_updated", data: {...}, sequence: <num>}
            - {type: "diagnosis_detected", data: {...}, sequence: <num>}
            - {type: "prescription_added", data: {...}, sequence: <num>}
            - {type: "interaction_warning", severity: "MAJOR", data: {...}, sequence: <num>}
            - {type: "chief_complaint_identified", data: {...}, sequence: <num>}
            - {type: "entity_validated", data: {...}, sequence: <num>}
            - {type: "error", code: <num>, message: <str>}
    """
    # Verify JWT token
    try:
        token_data = verify_websocket_token(token)
        if token_data["session_id"] != session_id:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Session ID mismatch")
    except Exception as e:
        logger.warning("websocket_auth_failed", session_id=session_id, error=str(e))
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")

    # Check session exists in Redis
    session_data = await redis_client.get(f"session:{session_id}")
    if not session_data:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found or expired")

    # Accept connection
    await manager.connect(session_id, websocket)

    # Send connection established event
    await manager.broadcast_event(session_id, {
        "type": "connection_established",
        "session_id": session_id,
        "server_time": datetime.utcnow().isoformat()
    })

    # Update session status
    await redis_client.hset(f"session:{session_id}", "status", "streaming")

    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()

            try:
                data = orjson.loads(message)
                msg_type = data.get("type")

                if msg_type == "audio_chunk":
                    # Decode base64 Opus data
                    import base64
                    opus_bytes = base64.b64decode(data["data"])
                    await manager.handle_audio_chunk(session_id, opus_bytes)

                elif msg_type == "auth_reconnect":
                    # Handle reconnection with event replay
                    last_sequence = data.get("last_sequence", 0)
                    await handle_reconnection(session_id, websocket, last_sequence)

                elif msg_type == "ping":
                    # Heartbeat
                    await websocket.send_text(orjson.dumps({"type": "pong"}).decode())

                else:
                    logger.warning("unknown_message_type", session_id=session_id, type=msg_type)

            except orjson.JSONDecodeError:
                logger.error("invalid_json", session_id=session_id)
                await websocket.send_text(orjson.dumps({
                    "type": "error",
                    "code": 4001,
                    "message": "Invalid JSON"
                }).decode())

    except WebSocketDisconnect:
        logger.info("client_disconnected", session_id=session_id)
        await manager.disconnect(session_id)

        # Update session status
        await redis_client.hset(f"session:{session_id}", "status", "disconnected")

async def handle_reconnection(session_id: str, websocket: WebSocket, last_sequence: int):
    """Replay missed events during reconnection"""
    # Get buffered events from Redis
    events_json = await redis_client.lrange(f"session:{session_id}:events", 0, -1)

    missed_events = []
    for event_json in reversed(events_json):  # Redis stores newest first
        event = orjson.loads(event_json)
        if event["sequence"] > last_sequence:
            missed_events.append(event)

    # Send reconnection success with missed events
    await websocket.send_text(orjson.dumps({
        "type": "reconnect_success",
        "missed_events": missed_events,
        "server_sequence": await redis_client.get(f"session:{session_id}:sequence") or 0,
        "message": f"Replayed {len(missed_events)} missed events, ready to continue"
    }).decode())

    logger.info("reconnection_handled", session_id=session_id, missed_events=len(missed_events))
```

## 3. Cliente JavaScript (Referencia)

**Archivo:** `frontend/src/services/websocket-client.ts`

```typescript
export class MedRecordWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private wsToken: string;
  private wsUrl: string;
  private lastSequence: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;

  constructor(sessionId: string, wsUrl: string, wsToken: string) {
    this.sessionId = sessionId;
    this.wsUrl = wsUrl;
    this.wsToken = wsToken;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.wsUrl}?token=${this.wsToken}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to session ${this.sessionId}`);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.lastSequence = data.sequence || this.lastSequence;
        this.handleEvent(data);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
        this.handleReconnection();
      };
    });
  }

  sendAudioChunk(opusBytes: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const base64Data = btoa(String.fromCharCode(...opusBytes));
      this.ws.send(JSON.stringify({
        type: 'audio_chunk',
        data: base64Data
      }));
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().then(() => {
        // Send reconnection message with last sequence
        this.ws?.send(JSON.stringify({
          type: 'auth_reconnect',
          token: this.wsToken,
          last_sequence: this.lastSequence
        }));
      });
    }, delay);
  }

  private handleEvent(event: any): void {
    switch (event.type) {
      case 'connection_established':
        console.log('[WebSocket] Connection established');
        break;
      case 'transcription_update':
        // Update UI with transcription
        break;
      case 'symptom_extracted':
      case 'symptom_updated':
        // Update symptoms list
        break;
      case 'interaction_warning':
        // Show critical alert
        alert(`WARNING: ${event.data.description}`);
        break;
      // ... other event types
    }
  }

  disconnect(): void {
    this.ws?.close();
  }
}
```

## 4. Seguridad WebSocket

### 4.1 Autenticación

- JWT token en query parameter durante WebSocket upgrade
- Token tiene 2 horas de validez
- Token contiene: session_id, user_id, appointment_id
- Verificación en cada conexión/reconexión

### 4.2 Rate Limiting

```python
# ai-service/app/middleware/websocket_rate_limit.py
from fastapi import WebSocketException, status
from app.core.redis_client import redis_client

async def check_websocket_rate_limit(session_id: str, limit_type: str) -> bool:
    """
    Rate limits:
        - audio_chunks: 10/second (max 200ms chunks)
        - events: 300/minute (5/second average)
        - reconnections: 5/5min (prevent abuse)
    """
    limits = {
        "audio_chunks": (10, 1),      # (count, seconds)
        "events": (300, 60),
        "reconnections": (5, 300)
    }

    count, window = limits[limit_type]
    key = f"rate_limit:{session_id}:{limit_type}"

    current = await redis_client.incr(key)
    if current == 1:
        await redis_client.expire(key, window)

    if current > count:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=f"Rate limit exceeded: {limit_type}"
        )

    return True
```

### 4.3 Códigos de Error WebSocket

| Code | Nombre | Razón | Acción Cliente |
|------|--------|-------|----------------|
| 4000 | Session Expired | Sesión expiró (>2h) | Crear nueva sesión |
| 4001 | Invalid Message | JSON malformado | Revisar formato |
| 4002 | Invalid Audio | Opus decode falló | Revisar encoder |
| 4003 | Rate Limit | Demasiados mensajes | Esperar y reintentar |
| 4004 | Session Not Found | session_id no existe | Crear nueva sesión |
| 4008 | Policy Violation | Token inválido o expirado | Re-autenticar |
| 4009 | Internal Error | Error interno servidor | Reintentar |

## 5. Métricas y Observabilidad

### 5.1 Métricas Clave

```python
# ai-service/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# WebSocket metrics
websocket_connections_total = Counter(
    'websocket_connections_total',
    'Total WebSocket connections',
    ['status']  # 'accepted', 'rejected'
)

websocket_active_connections = Gauge(
    'websocket_active_connections',
    'Currently active WebSocket connections'
)

websocket_message_latency = Histogram(
    'websocket_message_latency_seconds',
    'WebSocket message latency',
    ['message_type'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]  # 1ms to 1s
)

websocket_audio_bytes_received = Counter(
    'websocket_audio_bytes_received_total',
    'Total audio bytes received via WebSocket'
)

websocket_events_sent = Counter(
    'websocket_events_sent_total',
    'Total events sent to clients',
    ['event_type']
)
```

### 5.2 Logging Estructurado

```python
logger.info(
    "websocket_event_sent",
    session_id=session_id,
    event_type=event["type"],
    sequence=sequence,
    latency_ms=latency,
    payload_size=len(orjson.dumps(event))
)
```

## 6. Testing

### 6.1 Test de Conexión Básica

```python
# tests/test_websocket.py
import pytest
from fastapi.testclient import TestClient

def test_websocket_connection(test_client: TestClient, auth_token: str):
    # Create session
    response = test_client.post(
        "/api/v1/sessions/stream",
        json={
            "appointment_id": "appt_123",
            "patient_id": "pat_456",
            "doctor_id": "doc_789"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 201
    data = response.json()

    # Connect WebSocket
    with test_client.websocket_connect(
        f"/api/v1/sessions/{data['session_id']}/stream?token={data['websocket_token']}"
    ) as websocket:
        # Should receive connection_established
        event = websocket.receive_json()
        assert event["type"] == "connection_established"
```

### 6.2 Test de Reconexión

```python
def test_websocket_reconnection(test_client: TestClient, session_data: dict):
    with test_client.websocket_connect(
        f"/api/v1/sessions/{session_data['session_id']}/stream?token={session_data['websocket_token']}"
    ) as websocket:
        # Receive some events
        event1 = websocket.receive_json()
        event2 = websocket.receive_json()
        last_seq = event2["sequence"]

    # Disconnect and reconnect
    with test_client.websocket_connect(
        f"/api/v1/sessions/{session_data['session_id']}/stream?token={session_data['websocket_token']}"
    ) as websocket:
        # Send reconnect message
        websocket.send_json({
            "type": "auth_reconnect",
            "token": session_data['websocket_token'],
            "last_sequence": last_seq
        })

        # Should receive missed events
        reconnect_response = websocket.receive_json()
        assert reconnect_response["type"] == "reconnect_success"
        assert len(reconnect_response["missed_events"]) >= 0
```

## 7. Deployment Considerations

### 7.1 Sticky Sessions

Para MVP, usar sticky sessions (session affinity) en load balancer:
- Nginx: `ip_hash` o `sticky cookie`
- AWS ALB: Target Group Stickiness
- Garantiza que reconexiones lleguen al mismo servidor

### 7.2 Escalado (Futuro)

Para producción con múltiples instancias:
- Redis Pub/Sub para broadcasting entre instancias
- WebSocket connections pueden estar en diferentes servidores
- Eventos se publican a canal Redis y todas las instancias escuchan

```python
# Future: Redis Pub/Sub for multi-instance
async def broadcast_event_multi_instance(session_id: str, event: dict):
    # Publish to Redis channel
    await redis_client.publish(
        f"session:{session_id}:events",
        orjson.dumps(event)
    )

# Each instance subscribes
async def listen_for_events(session_id: str):
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"session:{session_id}:events")

    async for message in pubsub.listen():
        if message["type"] == "message":
            event = orjson.loads(message["data"])
            await send_to_local_connection(session_id, event)
```
