# WebSocket Events

This document defines the WebSocket events for real-time transcription in the MedRecord AI API.

---

## Overview

The WebSocket connection enables real-time audio streaming and transcription updates during medical consultations. This provides immediate feedback as the doctor speaks, showing transcribed text in near-real-time.

---

## Connection

### WebSocket URL

```
wss://api.medrecord.app/api/v1/transcription/{sessionId}
```

**Development**: `ws://localhost:3001/api/v1/transcription/{sessionId}`

### Connection Parameters

| Parameter | Description |
|-----------|-------------|
| `sessionId` | Session ID from `/transcription/start` endpoint |

### Authentication

Include the JWT token in the connection request:

```javascript
const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Or via query parameter (fallback)
const ws = new WebSocket(`${wsUrl}?token=${accessToken}`);
```

### Connection Lifecycle

```
1. Client calls POST /transcription/start
2. Server returns sessionId and wsUrl
3. Client connects to WebSocket
4. Server sends 'connected' event
5. Client streams audio chunks
6. Server sends transcription updates
7. Client sends 'stop_recording' or disconnects
8. Server finalizes and closes connection
```

---

## Client to Server Events

### audio_chunk

Send audio data for transcription.

```typescript
interface AudioChunkEvent {
  type: "audio_chunk";
  data: {
    /** Base64-encoded audio data */
    audio: string;
    /** Sequential chunk index (0-based) */
    chunkIndex: number;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Whether this is the final chunk */
    isFinal?: boolean;
  };
}
```

**Example:**

```json
{
  "type": "audio_chunk",
  "data": {
    "audio": "T2dnUwACAAAAAAAAAADnbgAAA...",
    "chunkIndex": 0,
    "timestamp": 1705761234567,
    "isFinal": false
  }
}
```

**Notes:**
- Audio should be in WebM/Opus format
- Recommended chunk size: 1-5 seconds of audio
- Maximum chunk size: 5MB
- Chunks must be sent in order (by chunkIndex)

---

### stop_recording

Signal the end of recording.

```typescript
interface StopRecordingEvent {
  type: "stop_recording";
  data?: {
    /** Save audio file with medical record */
    saveAudio?: boolean;
    /** Trigger final field extraction */
    extractFields?: boolean;
  };
}
```

**Example:**

```json
{
  "type": "stop_recording",
  "data": {
    "saveAudio": true,
    "extractFields": true
  }
}
```

---

### ping

Keep connection alive.

```typescript
interface PingEvent {
  type: "ping";
  data: {
    timestamp: number;
  };
}
```

**Example:**

```json
{
  "type": "ping",
  "data": {
    "timestamp": 1705761234567
  }
}
```

---

## Server to Client Events

### connected

Connection established successfully.

```typescript
interface ConnectedEvent {
  type: "connected";
  data: {
    sessionId: string;
    config: {
      sampleRate: number;
      channelCount: number;
      maxDuration: number;
      chunkInterval: number;
    };
  };
}
```

**Example:**

```json
{
  "type": "connected",
  "data": {
    "sessionId": "ts_abc123xyz789",
    "config": {
      "sampleRate": 16000,
      "channelCount": 1,
      "maxDuration": 3600000,
      "chunkInterval": 30000
    }
  }
}
```

---

### transcription_update

Real-time transcription results.

```typescript
interface TranscriptionUpdateEvent {
  type: "transcription_update";
  data: {
    /** Transcribed text for this segment */
    text: string;
    /** Whether this is the final result for this segment */
    isFinal: boolean;
    /** Chunk index this transcription corresponds to */
    chunkIndex: number;
    /** Start time in seconds */
    startTime?: number;
    /** End time in seconds */
    endTime?: number;
    /** Detected speaker (if applicable) */
    speaker?: "doctor" | "patient" | "unknown";
    /** Confidence score (0-1) */
    confidence?: number;
  };
}
```

**Example (Interim Result):**

```json
{
  "type": "transcription_update",
  "data": {
    "text": "What brings you in",
    "isFinal": false,
    "chunkIndex": 0
  }
}
```

**Example (Final Result):**

```json
{
  "type": "transcription_update",
  "data": {
    "text": "What brings you in today?",
    "isFinal": true,
    "chunkIndex": 0,
    "startTime": 0.0,
    "endTime": 2.5,
    "speaker": "doctor",
    "confidence": 0.95
  }
}
```

---

### field_extraction

Real-time field extraction updates (when enabled).

```typescript
interface FieldExtractionEvent {
  type: "field_extraction";
  data: {
    /** Partial extraction results */
    symptoms?: Array<{
      symptomName: string;
      bodySite?: string;
      severity?: number;
      duration?: string;
      confidence: number;
    }>;
    diagnosis?: {
      description: string;
      confidence: number;
    };
    prescriptions?: Array<{
      medicationName: string;
      strength?: string;
      dosage?: string;
      frequency?: string;
      confidence: number;
    }>;
    chiefComplaint?: {
      value: string;
      confidence: number;
    };
    /** Whether this is a partial or complete extraction */
    isPartial: boolean;
  };
}
```

**Example:**

```json
{
  "type": "field_extraction",
  "data": {
    "symptoms": [
      {
        "symptomName": "Headache",
        "bodySite": "Temples",
        "severity": 6,
        "duration": "3 days",
        "confidence": 0.92
      }
    ],
    "chiefComplaint": {
      "value": "Persistent headache for 3 days",
      "confidence": 0.95
    },
    "isPartial": true
  }
}
```

---

### status

Session status updates.

```typescript
interface StatusEvent {
  type: "status";
  data: {
    status: "recording" | "processing" | "extracting" | "completed" | "error";
    message?: string;
    progress?: number;
  };
}
```

**Example:**

```json
{
  "type": "status",
  "data": {
    "status": "processing",
    "message": "Finalizing transcription...",
    "progress": 0.85
  }
}
```

---

### error

Error notification.

```typescript
interface ErrorEvent {
  type: "error";
  data: {
    code: string;
    message: string;
    retryable: boolean;
    details?: string;
  };
}
```

**Error Codes:**

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_AUDIO` | Audio format not supported | No |
| `CHUNK_TOO_LARGE` | Audio chunk exceeds size limit | No |
| `TRANSCRIPTION_FAILED` | Transcription service error | Yes |
| `EXTRACTION_FAILED` | Field extraction error | Yes |
| `RATE_LIMITED` | Too many requests | Yes |
| `SESSION_EXPIRED` | Session timed out | No |
| `CONNECTION_ERROR` | Network issue | Yes |

**Example:**

```json
{
  "type": "error",
  "data": {
    "code": "TRANSCRIPTION_FAILED",
    "message": "Transcription service temporarily unavailable",
    "retryable": true,
    "details": "Please retry in a few seconds"
  }
}
```

---

### completed

Transcription session completed.

```typescript
interface CompletedEvent {
  type: "completed";
  data: {
    sessionId: string;
    transcript: string;
    segments: Array<{
      startTime: number;
      endTime: number;
      text: string;
      speaker?: string;
    }>;
    duration: number;
    audioFileUrl?: string;
    extractedFields?: ExtractedFields;
  };
}
```

**Example:**

```json
{
  "type": "completed",
  "data": {
    "sessionId": "ts_abc123xyz789",
    "transcript": "Doctor: What brings you in today?\nPatient: I've had this headache...",
    "segments": [
      {
        "startTime": 0.0,
        "endTime": 2.5,
        "text": "What brings you in today?",
        "speaker": "doctor"
      }
    ],
    "duration": 1847.5,
    "audioFileUrl": "/uploads/audio/880e8400.webm",
    "extractedFields": {
      "symptoms": [...],
      "diagnosis": {...},
      "prescriptions": [...]
    }
  }
}
```

---

### pong

Response to ping.

```typescript
interface PongEvent {
  type: "pong";
  data: {
    timestamp: number;
    serverTime: number;
  };
}
```

---

## Client Implementation Example

### JavaScript/TypeScript

```typescript
class TranscriptionWebSocket {
  private ws: WebSocket;
  private sessionId: string;

  async connect(sessionId: string, token: string) {
    this.sessionId = sessionId;
    const wsUrl = `wss://api.medrecord.app/api/v1/transcription/${sessionId}`;

    this.ws = new WebSocket(wsUrl);

    // Set auth header via first message
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({
        type: 'auth',
        data: { token }
      }));
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    };
  }

  sendAudioChunk(audioData: ArrayBuffer, chunkIndex: number) {
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioData))
    );

    this.ws.send(JSON.stringify({
      type: 'audio_chunk',
      data: {
        audio: base64Audio,
        chunkIndex,
        timestamp: Date.now()
      }
    }));
  }

  stopRecording(options?: { saveAudio?: boolean; extractFields?: boolean }) {
    this.ws.send(JSON.stringify({
      type: 'stop_recording',
      data: options
    }));
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'connected':
        console.log('Connected to session:', message.data.sessionId);
        break;

      case 'transcription_update':
        if (message.data.isFinal) {
          this.onTranscriptUpdate(message.data.text);
        } else {
          this.onInterimResult(message.data.text);
        }
        break;

      case 'field_extraction':
        this.onFieldsExtracted(message.data);
        break;

      case 'completed':
        this.onSessionComplete(message.data);
        break;

      case 'error':
        this.onError(message.data);
        break;
    }
  }

  // Event handlers to be overridden
  onTranscriptUpdate(text: string) {}
  onInterimResult(text: string) {}
  onFieldsExtracted(fields: any) {}
  onSessionComplete(data: any) {}
  onError(error: any) {}
}
```

---

## Connection Timeouts

| Timeout | Duration | Description |
|---------|----------|-------------|
| Idle | 5 minutes | No audio received |
| Session | 60 minutes | Maximum session length |
| Ping | 30 seconds | Keepalive interval |

---

## Best Practices

1. **Chunk Size**: Send audio in 1-5 second chunks for optimal latency
2. **Keepalive**: Send ping events every 30 seconds to prevent disconnection
3. **Error Handling**: Implement reconnection logic for retryable errors
4. **Buffer Management**: Buffer audio locally if connection is temporarily lost
5. **Final Chunk**: Always send `stop_recording` to properly finalize the session

---

## References

- [Transcription Endpoints](./endpoints/transcription.md)
- [AI Integration Interfaces](../ai-integration/interfaces.md)
- [Audio Capture Specification](../ai-integration/audio-capture.md)
