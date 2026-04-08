# Diseño de APIs - MedRecord AI

## 1. Especificación de Endpoints

### 1.1 Endpoints Principales

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/v1/query` | POST | Consulta RAG sobre conocimiento médico | JWT |
| `/api/v1/ingest` | POST | Ingesta documentos al vector store | JWT (admin) |
| `/api/v1/sessions/stream` | POST | **Crear sesión de streaming en tiempo real** | JWT |
| `/api/v1/sessions/{id}/stream` | **WS** | **WebSocket bidireccional para audio + eventos** | JWT (handshake) |
| `/api/v1/sessions/{id}` | GET | Obtener estado/resultado de sesión | JWT |
| `/api/v1/sessions/{id}/pause` | POST | **Pausar streaming sin desconectar** | JWT |
| `/api/v1/sessions/{id}/resume` | POST | **Reanudar streaming** | JWT |
| `/api/v1/sessions/{id}/finalize` | POST | Finalizar y generar nota SOAP final | JWT |
| `/api/v1/auth/token` | POST | Obtener token de acceso | None |
| `/api/v1/auth/refresh` | POST | Refrescar token | Refresh Token |
| `/health` | GET | Health check del sistema | None |
| `/metrics` | GET | Métricas Prometheus | None (internal) |

### 1.2 Detalle de Endpoints

#### POST /api/v1/query

Consulta la base de conocimiento médico usando RAG.

**Request:**
```json
{
  "query": "¿Cuáles son las contraindicaciones del ibuprofeno?",
  "session_id": "uuid-opcional-para-contexto",
  "filters": {
    "source_type": ["vademecum", "cie10"],
    "language": "es"
  },
  "top_k": 5
}
```

**Response (200 OK):**
```json
{
  "response": "Las principales contraindicaciones del ibuprofeno incluyen: úlcera péptica activa, insuficiencia cardíaca grave, insuficiencia renal severa, y tercer trimestre del embarazo.",
  "sources": [
    {
      "document": "vademecum_es_2024.pdf",
      "chunk_id": "chunk_145",
      "content_preview": "Ibuprofeno - Contraindicaciones...",
      "relevance_score": 0.92
    }
  ],
  "metadata": {
    "tokens_used": 1250,
    "latency_ms": 1850,
    "model": "gpt-4o"
  }
}
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| 400 | Query vacía o inválida |
| 401 | Token inválido o expirado |
| 429 | Rate limit excedido |
| 500 | Error interno |

---

#### POST /api/v1/ingest

Ingesta documentos a la base de conocimiento.

**Request:**
```json
{
  "documents": [
    {
      "content": "Contenido del documento médico...",
      "metadata": {
        "source": "guia_clinica_migraña_2024",
        "type": "clinical_guideline",
        "language": "es",
        "version": "1.0"
      }
    }
  ],
  "chunking_config": {
    "chunk_size": 1000,
    "chunk_overlap": 200
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "indexed_documents": 1,
  "total_chunks": 45,
  "embeddings_generated": 45,
  "errors": [],
  "metadata": {
    "processing_time_ms": 3500,
    "collection": "medical_knowledge_es"
  }
}
```

**Autorización:** Solo rol `admin`

---

#### POST /api/v1/transcription/sessions

Crea una nueva sesión de transcripción.

**Request:**
```json
{
  "patient_id": "PAT-2024-001",
  "appointment_type": "consultation",
  "expected_duration_minutes": 60,
  "expected_speakers": 2,
  "language": "es",
  "metadata": {
    "clinic_id": "CL-001",
    "doctor_id": "DOC-001"
  }
}
```

**Response (201 Created):**
```json
{
  "session_id": "sess_abc123def456",
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z",
  "upload_url": "/api/v1/transcription/sessions/sess_abc123def456/audio",
  "expires_at": "2024-01-15T11:30:00Z"
}
```

---

#### POST /api/v1/transcription/sessions/{id}/audio

Sube archivo de audio a una sesión existente.

**Request:**
- Content-Type: `multipart/form-data`
- Body: archivo de audio (WAV, MP3, M4A, WEBM)
- Max size: 500MB

**Response (200 OK):**
```json
{
  "session_id": "sess_abc123def456",
  "status": "uploaded",
  "audio_info": {
    "duration_seconds": 3540,
    "format": "wav",
    "sample_rate": 16000,
    "file_size_bytes": 113280000
  }
}
```

---

#### POST /api/v1/transcription/sessions/{id}/finalize

Finaliza la sesión e inicia el procesamiento.

**Request:**
```json
{
  "webhook_url": "https://backend.example.com/webhooks/transcription",
  "processing_options": {
    "enable_diarization": true,
    "enable_extraction": true,
    "enable_rag_validation": true
  }
}
```

**Response (202 Accepted):**
```json
{
  "session_id": "sess_abc123def456",
  "status": "processing",
  "estimated_completion_seconds": 90,
  "job_id": "job_xyz789"
}
```

---

#### GET /api/v1/transcription/sessions/{id}

Obtiene el estado y resultado de una sesión.

**Response (200 OK) - Completada:**
```json
{
  "session_id": "sess_abc123def456",
  "status": "completed",
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:30Z",
  "result": {
    "transcript": {
      "full_text": "DOCTOR: Buenos días...",
      "segments": [
        {
          "speaker": "DOCTOR",
          "text": "Buenos días, ¿cómo se siente?",
          "start_time": 0.0,
          "end_time": 2.5,
          "confidence": 0.95
        }
      ],
      "word_count": 1250,
      "duration_seconds": 3540
    },
    "extraction": {
      "soap_note": {
        "subjective": {
          "chief_complaint": "Dolor de cabeza intenso",
          "history": "Paciente refiere cefalea de 3 días de evolución..."
        },
        "objective": {
          "findings": "No se mencionan hallazgos físicos específicos"
        },
        "assessment": {
          "diagnosis": "Migraña",
          "icd10_code": "G43.9",
          "differential": []
        },
        "plan": {
          "treatment": "Ibuprofeno 400mg cada 8 horas por 5 días",
          "follow_up": "Regresar si persiste el dolor"
        }
      },
      "symptoms": [],
      "prescriptions": [],
      "rag_validations": [
        {
          "field": "prescriptions[0].medication",
          "value": "Ibuprofeno",
          "validated": true,
          "source": "vademecum_es"
        }
      ]
    },
    "cost_summary": {
      "whisper_cost_usd": 0.21,
      "gpt4_cost_usd": 0.18,
      "embeddings_cost_usd": 0.002,
      "total_cost_usd": 0.392
    }
  }
}
```

---

#### WS /api/v1/sessions/{id}/stream

**WebSocket bidireccional para streaming de audio y eventos en tiempo real.**

**Conexión:**
```
wss://api.medrecord.ai/api/v1/sessions/{session_id}/stream
Headers:
  Authorization: Bearer <jwt_token>
  X-Session-Token: <session_specific_token>
```

**Autenticación:** JWT validado en handshake inicial. Si el token expira durante la sesión, el servidor envía un evento `auth_expiring` 5 minutos antes.

**Mensajes Cliente → Servidor:**

```json
// 1. Audio chunk (binary frame con header)
{
  "type": "audio_chunk",
  "sequence": 42,
  "timestamp_ms": 15000,
  "is_voice_active": true,
  "payload": "<base64_opus_audio>"
}

// 2. Control de sesión
{
  "type": "control",
  "action": "pause | resume | finalize",
  "timestamp_ms": 45000
}

// 3. Heartbeat (cada 30s)
{
  "type": "ping",
  "timestamp_ms": 45000
}
```

**Mensajes Servidor → Cliente:**

```json
// 1. Transcripción incremental (< 2s latencia)
{
  "type": "transcription_update",
  "sequence": 42,
  "text": "Buenos días doctor",
  "speaker": "PATIENT",
  "confidence": 0.94,
  "is_final": false,
  "timestamp_ms": 15000
}

// 2. Extracción de síntoma (< 1s tras transcripción)
{
  "type": "symptom_extracted",
  "symptom": {
    "name": "cefalea",
    "icd10": "R51",
    "severity": "moderado",
    "duration": "3 días",
    "confidence": 0.89
  },
  "source_text": "Me duele la cabeza desde hace tres días",
  "timestamp_ms": 15500
}

// 3. Diagnóstico detectado
{
  "type": "diagnosis_detected",
  "diagnosis": {
    "name": "Migraña sin aura",
    "icd10": "G43.0",
    "confidence": 0.85
  },
  "timestamp_ms": 45200
}

// 4. Prescripción agregada
{
  "type": "prescription_added",
  "prescription": {
    "medication": "Ibuprofeno",
    "dosage": "400mg",
    "frequency": "cada 8 horas",
    "duration": "5 días",
    "rag_validated": true
  },
  "timestamp_ms": 52000
}

// 5. Alerta de interacción medicamentosa
{
  "type": "interaction_warning",
  "severity": "moderate",
  "medications": ["Ibuprofeno", "Aspirina"],
  "warning": "Riesgo aumentado de sangrado gastrointestinal",
  "source": "vademecum_es",
  "timestamp_ms": 52100
}

// 6. Heartbeat response
{
  "type": "pong",
  "server_time_ms": 1705312200000
}

// 7. Token expiring warning
{
  "type": "auth_expiring",
  "expires_in_seconds": 300,
  "refresh_url": "/api/v1/auth/refresh"
}

// 8. Error
{
  "type": "error",
  "code": "AUDIO_FORMAT_INVALID",
  "message": "Audio debe ser Opus 16kHz mono",
  "recoverable": true
}
```

**Protocolo de Reconexión:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  PROTOCOLO DE RECONEXIÓN                        │
└─────────────────────────────────────────────────────────────────┘

Cliente desconectado
        │
        ▼
┌───────────────────┐
│  Guardar último   │
│  sequence_number  │
└────────┬──────────┘
        │
        ▼
┌───────────────────┐     Fallo
│   Reconectar con  │────────────┐
│   backoff exp.    │            │
└────────┬──────────┘            │
        │ Éxito                  │
        ▼                        ▼
┌───────────────────┐    ┌───────────────────┐
│  Enviar mensaje   │    │  Retry (max 5x)   │
│  "reconnect"      │    │  1s, 2s, 4s, 8s,  │
└────────┬──────────┘    │  16s              │
        │                └───────────────────┘
        ▼
┌───────────────────┐
│  Servidor replay  │
│  eventos perdidos │
│  desde sequence   │
└───────────────────┘
```

**Mensaje de reconexión:**
```json
{
  "type": "reconnect",
  "last_sequence": 42,
  "session_id": "sess_abc123"
}
```

**Respuesta del servidor:**
```json
{
  "type": "reconnect_ack",
  "replay_from": 43,
  "events_to_replay": 5,
  "session_state": "STREAMING"
}
// Seguido de los eventos perdidos en orden
```

**Estados de la Sesión WebSocket:**

| Estado | Descripción |
|--------|-------------|
| `CONNECTING` | Handshake en progreso |
| `STREAMING` | Recibiendo audio activamente |
| `PAUSED` | Pausado por usuario, conexión activa |
| `RECONNECTING` | Cliente reconectando |
| `FINALIZING` | Generando nota SOAP final |
| `COMPLETED` | Sesión terminada |
| `ERROR` | Error no recuperable |

---

#### POST /api/v1/auth/token

Obtiene token de acceso JWT.

**Request:**
```
Content-Type: application/x-www-form-urlencoded

username=doctor@clinic.com&password=securepassword
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 1.3 Códigos de Error Comunes

| Código | Significado | Ejemplo |
|--------|-------------|---------|
| 400 | Bad Request | Formato de audio no soportado |
| 401 | Unauthorized | Token expirado |
| 403 | Forbidden | Rol sin permisos |
| 404 | Not Found | Sesión no existe |
| 413 | Payload Too Large | Audio > 500MB |
| 422 | Unprocessable Entity | Validación fallida |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Server Error | Error no manejado |
| 503 | Service Unavailable | Dependencia caída |

---

## 2. Autenticación y Autorización

### 2.1 Mecanismo de Autenticación

| Campo | Valor |
|-------|-------|
| **Tipo** | JWT Bearer Token + Refresh Token |
| **Algoritmo** | HS256 (HMAC SHA-256) |
| **Expiración Access Token** | 30 minutos |
| **Expiración Refresh Token** | 7 días |
| **Header** | `Authorization: Bearer <token>` |

### 2.2 Estructura del JWT

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "user_id_uuid",
  "username": "doctor@clinic.com",
  "role": "doctor",
  "permissions": ["read", "write", "transcribe"],
  "iat": 1705312200,
  "exp": 1705314000,
  "jti": "unique_token_id"
}
```

### 2.3 Roles y Permisos (RBAC)

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| `admin` | `*` | Acceso total, incluyendo ingesta RAG |
| `doctor` | `read`, `write`, `transcribe`, `query` | Uso completo del sistema |
| `readonly` | `read`, `query` | Solo consulta, sin transcripción |

### 2.4 Matriz de Permisos por Endpoint

| Endpoint | admin | doctor | readonly |
|----------|-------|--------|----------|
| POST /query | ✅ | ✅ | ✅ |
| POST /ingest | ✅ | ❌ | ❌ |
| POST /sessions | ✅ | ✅ | ❌ |
| GET /sessions/{id} | ✅ | ✅* | ✅* |
| POST /sessions/{id}/audio | ✅ | ✅ | ❌ |
| POST /sessions/{id}/finalize | ✅ | ✅ | ❌ |

*Solo sesiones propias

### 2.5 Rate Limiting

| Categoría | Límite | Ventana |
|-----------|--------|---------|
| Auth endpoints | 10 requests | 1 minuto |
| Query endpoint | 100 requests | 1 minuto |
| Transcription | 20 sesiones | 1 hora |
| Ingest | 10 requests | 1 hora |
| Global por usuario | 1000 requests | 1 hora |
| **WebSocket conexiones** | 3 concurrentes | Por usuario |
| **WebSocket audio chunks** | 100 chunks | 10 segundos |
| **WebSocket mensajes** | 500 mensajes | 1 minuto |

### 2.6 Seguridad WebSocket

| Control | Implementación |
|---------|----------------|
| **Autenticación** | JWT validado en handshake inicial |
| **Re-autenticación** | Evento `auth_expiring` 5 min antes de expiración |
| **Cifrado** | WSS obligatorio (TLS 1.3) |
| **Origin validation** | Solo dominios permitidos |
| **Message size limit** | Max 64KB por mensaje |
| **Idle timeout** | 2 minutos sin actividad → ping/pong |
| **Session binding** | Token vinculado a session_id |
| **Replay protection** | Sequence numbers con ventana deslizante |

**Flujo de autenticación WebSocket:**

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTENTICACIÓN WEBSOCKET EN TIEMPO REAL             │
└─────────────────────────────────────────────────────────────────┘

Cliente                                              Servidor
   │                                                     │
   │  1. WSS handshake + JWT en header                   │
   │────────────────────────────────────────────────────▶│
   │                                                     │
   │                    2. Validar JWT                   │
   │                    ├─ Firma válida?                 │
   │                    ├─ No expirado?                  │
   │                    ├─ Permisos suficientes?         │
   │                    └─ Session_id coincide?          │
   │                                                     │
   │  3. Connection accepted + session_state             │
   │◀────────────────────────────────────────────────────│
   │                                                     │
   │  4. Audio chunks (binario Opus)                     │
   │════════════════════════════════════════════════════▶│
   │                                                     │
   │  5. Transcription + extraction events               │
   │◀════════════════════════════════════════════════════│
   │                                                     │
   │         [Token expira en 5 min]                     │
   │                                                     │
   │  6. auth_expiring event                             │
   │◀────────────────────────────────────────────────────│
   │                                                     │
   │  7. POST /auth/refresh (HTTP paralelo)              │
   │────────────────────────────────────────────────────▶│
   │                                                     │
   │  8. Nuevo JWT                                       │
   │◀────────────────────────────────────────────────────│
   │                                                     │
   │  9. token_refresh message con nuevo JWT             │
   │────────────────────────────────────────────────────▶│
   │                                                     │
   │  10. token_accepted (sesión continúa)               │
   │◀────────────────────────────────────────────────────│
   │                                                     │
```
