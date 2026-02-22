# 4. Especificación de la API

## Visión General

La API REST de MedRecord AI sigue el estándar OpenAPI 3.0 y utiliza autenticación mediante tokens JWT. Todos los endpoints requieren autenticación excepto los de registro e inicio de sesión.

**URL Base**: `/api/v1`

**Formato de Respuesta**: JSON

**Autenticación**: Bearer Token (JWT)

---

## Endpoint 1: Crear Paciente

**POST** `/api/v1/patients`

**Descripción:** Crea un nuevo paciente en el sistema, incluyendo información demográfica, contacto de emergencia, alergias y condiciones crónicas.

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Sí |
| `Content-Type` | `application/json` | Sí |

### Request Body

```json
{
  "firstName": "Juan",
  "lastName": "García",
  "dateOfBirth": "1985-03-15",
  "sex": "male",
  "phone": "+34612345678",
  "email": "juan.garcia@email.com",
  "address": "Calle Mayor 123, Madrid, 28001",
  "emergencyContactName": "María García",
  "emergencyContactPhone": "+34612345679",
  "emergencyContactRelationship": "Esposa",
  "allergies": [
    {
      "allergen": "Penicilina",
      "reaction": "Urticaria",
      "severity": "moderate"
    }
  ],
  "chronicConditions": [
    {
      "conditionName": "Diabetes tipo 2",
      "diagnosisDate": "2020-05-10",
      "status": "active",
      "notes": "Controlada con metformina"
    }
  ]
}
```

### Campos del Request

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `firstName` | string | Sí | Nombre del paciente (2-50 caracteres) |
| `lastName` | string | Sí | Apellido del paciente (2-50 caracteres) |
| `dateOfBirth` | date | Sí | Fecha de nacimiento (ISO 8601) |
| `sex` | enum | Sí | `male`, `female`, `other` |
| `phone` | string | Sí | Teléfono de contacto |
| `email` | string | No | Correo electrónico |
| `address` | string | No | Dirección completa |
| `emergencyContactName` | string | Sí | Nombre del contacto de emergencia |
| `emergencyContactPhone` | string | Sí | Teléfono del contacto de emergencia |
| `emergencyContactRelationship` | string | No | Relación con el paciente |
| `allergies` | array | No | Lista de alergias |
| `chronicConditions` | array | No | Lista de condiciones crónicas |

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "firstName": "Juan",
    "lastName": "García",
    "dateOfBirth": "1985-03-15",
    "sex": "male",
    "phone": "+34612345678",
    "email": "juan.garcia@email.com",
    "address": "Calle Mayor 123, Madrid, 28001",
    "emergencyContactName": "María García",
    "emergencyContactPhone": "+34612345679",
    "emergencyContactRelationship": "Esposa",
    "allergies": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440010",
        "allergen": "Penicilina",
        "reaction": "Urticaria",
        "severity": "moderate"
      }
    ],
    "chronicConditions": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440020",
        "conditionName": "Diabetes tipo 2",
        "diagnosisDate": "2020-05-10",
        "status": "active",
        "notes": "Controlada con metformina"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Paciente creado exitosamente"
}
```

### Posibles Errores

| Código | Descripción |
|--------|-------------|
| 401 | Token inválido o expirado |
| 409 | Paciente duplicado (mismo nombre y fecha de nacimiento) |
| 422 | Error de validación en los campos |

---

## Endpoint 2: Obtener Historial de Citas del Paciente

**GET** `/api/v1/patients/{id}/appointments`

**Descripción:** Obtiene el historial completo de citas y registros médicos de un paciente, incluyendo diagnósticos, síntomas y prescripciones de cada visita.

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Sí |

### Parámetros de URL

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | uuid | ID del paciente |

### Parámetros de Query

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `status` | string | - | Filtrar por estado de cita |
| `startDate` | date | - | Fecha de inicio del rango |
| `endDate` | date | - | Fecha de fin del rango |
| `page` | integer | 1 | Número de página |
| `limit` | integer | 10 | Elementos por página |

### Ejemplo de Solicitud

```
GET /api/v1/patients/660e8400.../appointments?status=completed&page=1&limit=10
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "appointmentDate": "2024-01-20T14:30:00.000Z",
      "appointmentType": "sick_visit",
      "reasonForVisit": "Dolor de cabeza persistente durante 3 días",
      "status": "completed",
      "durationMinutes": 30,
      "medicalRecord": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "chiefComplaint": "Dolor de cabeza persistente",
        "diagnosis": "Cefalea tensional",
        "symptomsCount": 2,
        "prescriptionsCount": 1,
        "isAIGenerated": true
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "appointmentDate": "2023-12-10T10:00:00.000Z",
      "appointmentType": "routine_checkup",
      "reasonForVisit": "Revisión anual",
      "status": "completed",
      "durationMinutes": 45,
      "medicalRecord": {
        "id": "880e8400-e29b-41d4-a716-446655440004",
        "chiefComplaint": "Revisión general",
        "diagnosis": "Sin hallazgos patológicos",
        "symptomsCount": 0,
        "prescriptionsCount": 0,
        "isAIGenerated": false
      },
      "createdAt": "2023-12-01T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "message": "Historial de citas obtenido exitosamente"
}
```

### Posibles Errores

| Código | Descripción |
|--------|-------------|
| 401 | Token inválido o expirado |
| 404 | Paciente no encontrado |

---

## Endpoint 3: Iniciar Transcripción de Cita

**POST** `/api/v1/appointments/{appointmentId}/transcription/start`

**Descripción:** Inicia una sesión de transcripción en tiempo real para una cita médica. Devuelve un ID de sesión y la URL de WebSocket para la comunicación en tiempo real.

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Sí |
| `Content-Type` | `application/json` | No |

### Parámetros de URL

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `appointmentId` | uuid | ID de la cita |

### Request Body (Opcional)

```json
{
  "language": "es",
  "realTimeExtraction": true
}
```

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `language` | string | `en` | Idioma de la transcripción (`en`, `es`) |
| `realTimeExtraction` | boolean | `false` | Habilitar extracción de campos en tiempo real |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "sessionId": "ts_abc123xyz789",
    "wsUrl": "wss://api.medrecord.app/api/v1/transcription/ts_abc123xyz789",
    "expiresAt": "2024-01-20T16:30:00.000Z",
    "config": {
      "sampleRate": 16000,
      "channelCount": 1,
      "mimeType": "audio/webm;codecs=opus",
      "maxDuration": 3600000,
      "chunkInterval": 30000
    }
  },
  "message": "Sesión de transcripción iniciada"
}
```

### Campos de Respuesta

| Campo | Descripción |
|-------|-------------|
| `sessionId` | Identificador único de la sesión |
| `wsUrl` | URL de WebSocket para streaming de audio |
| `expiresAt` | Fecha de expiración de la sesión |
| `config.sampleRate` | Frecuencia de muestreo recomendada (Hz) |
| `config.channelCount` | Número de canales de audio |
| `config.mimeType` | Formato de audio recomendado |
| `config.maxDuration` | Duración máxima en milisegundos |
| `config.chunkInterval` | Intervalo de envío recomendado |

### Posibles Errores

| Código | Descripción |
|--------|-------------|
| 401 | Token inválido o expirado |
| 404 | Cita no encontrada |
| 409 | Ya existe una sesión de transcripción activa para esta cita |

---

## Eventos de WebSocket

Una vez iniciada la sesión, el cliente se conecta al WebSocket para enviar audio y recibir transcripciones.

### Eventos del Cliente al Servidor

**Enviar chunk de audio:**

```json
{
  "type": "audio_chunk",
  "data": {
    "audio": "base64_encoded_audio",
    "chunkIndex": 0,
    "timestamp": 1705761234567
  }
}
```

**Detener grabación:**

```json
{
  "type": "stop_recording",
  "data": {
    "saveAudio": true,
    "extractFields": true
  }
}
```

### Eventos del Servidor al Cliente

**Actualización de transcripción:**

```json
{
  "type": "transcription_update",
  "data": {
    "text": "El paciente refiere dolor de cabeza desde hace tres días",
    "isFinal": true,
    "chunkIndex": 0,
    "startTime": 0.0,
    "endTime": 4.5,
    "speaker": "patient",
    "confidence": 0.95
  }
}
```

**Extracción de campos (cuando está habilitada):**

```json
{
  "type": "field_extraction",
  "data": {
    "symptoms": [
      {
        "symptomName": "Dolor de cabeza",
        "bodySite": "Región temporal bilateral",
        "severity": 6,
        "duration": "3 días",
        "confidence": 0.92
      }
    ],
    "chiefComplaint": {
      "value": "Dolor de cabeza persistente durante 3 días",
      "confidence": 0.95
    },
    "isPartial": true
  }
}
```

**Error:**

```json
{
  "type": "error",
  "data": {
    "code": "TRANSCRIPTION_FAILED",
    "message": "Error al procesar el audio",
    "retryable": true
  }
}
```

---

## Códigos de Estado HTTP

| Código | Nombre | Descripción |
|--------|--------|-------------|
| 200 | OK | Solicitud exitosa |
| 201 | Created | Recurso creado exitosamente |
| 204 | No Content | Eliminación exitosa |
| 400 | Bad Request | Sintaxis de solicitud inválida |
| 401 | Unauthorized | Autenticación requerida o inválida |
| 403 | Forbidden | Sin permisos suficientes |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto con estado actual |
| 422 | Unprocessable Entity | Error de validación |
| 429 | Too Many Requests | Límite de tasa excedido |
| 500 | Internal Server Error | Error interno del servidor |

---

## Formato de Error Estándar

Todas las respuestas de error siguen este formato:

```json
{
  "success": false,
  "data": null,
  "message": "Descripción del error",
  "errors": [
    {
      "field": "email",
      "message": "Formato de email inválido"
    },
    {
      "field": "dateOfBirth",
      "message": "La fecha de nacimiento no puede ser futura"
    }
  ]
}
```

---

## Resumen de Endpoints

| Categoría | Método | Endpoint | Descripción |
|-----------|--------|----------|-------------|
| **Auth** | POST | `/auth/register` | Registrar nuevo proveedor |
| | POST | `/auth/login` | Iniciar sesión |
| | GET | `/auth/me` | Obtener perfil actual |
| **Pacientes** | GET | `/patients` | Listar pacientes |
| | POST | `/patients` | Crear paciente |
| | GET | `/patients/{id}` | Obtener paciente |
| | PUT | `/patients/{id}` | Actualizar paciente |
| | DELETE | `/patients/{id}` | Eliminar paciente |
| | GET | `/patients/{id}/appointments` | Historial de citas |
| **Citas** | GET | `/appointments` | Listar citas |
| | POST | `/appointments` | Crear cita |
| | GET | `/appointments/{id}` | Obtener cita |
| | PUT | `/appointments/{id}` | Actualizar cita |
| | PATCH | `/appointments/{id}/status` | Actualizar estado |
| **Registros** | GET | `/appointments/{id}/record` | Obtener registro médico |
| | PUT | `/appointments/{id}/record` | Guardar registro médico |
| | POST | `/appointments/{id}/record/symptoms` | Agregar síntoma |
| | POST | `/appointments/{id}/record/prescriptions` | Agregar prescripción |
| **Transcripción** | POST | `/appointments/{id}/transcription/start` | Iniciar transcripción |
| | POST | `/appointments/{id}/transcription/stop` | Detener transcripción |
| | GET | `/appointments/{id}/transcription` | Obtener transcripción |
| | POST | `/appointments/{id}/extract-fields` | Extraer campos con IA |

---

## Referencias

- [Especificación OpenAPI completa](../api/openapi.yaml)
- [Documentación de Schemas](../api/schemas.md)
- [Eventos de WebSocket](../api/websocket.md)
