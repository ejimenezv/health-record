# Transcription Endpoints

This document defines the AI transcription and field extraction endpoints for the MedRecord AI API.

---

## Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/appointments/:appointmentId/transcription/start` | Start transcription session | Yes |
| POST | `/api/v1/appointments/:appointmentId/transcription/audio` | Upload audio chunk | Yes |
| POST | `/api/v1/appointments/:appointmentId/transcription/stop` | Stop transcription session | Yes |
| GET | `/api/v1/appointments/:appointmentId/transcription` | Get transcription data | Yes |
| POST | `/api/v1/appointments/:appointmentId/extract-fields` | Extract medical fields from transcript | Yes |

---

## POST /api/v1/appointments/:appointmentId/transcription/start

Start a real-time transcription session for an appointment.

### Request

```yaml
/api/v1/appointments/{appointmentId}/transcription/start:
  post:
    summary: Start transcription session
    description: Initializes a transcription session and returns WebSocket connection details
    tags:
      - Transcription
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: false
      content:
        application/json:
          schema:
            type: object
            properties:
              language:
                type: string
                enum: [en, es]
                default: en
                description: Language hint for transcription
              realTimeExtraction:
                type: boolean
                default: false
                description: Enable real-time field extraction during transcription
```

### Request Body (Optional)

```json
{
  "language": "en",
  "realTimeExtraction": true
}
```

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
  "message": "Transcription session started"
}
```

### Error Responses

**409 Conflict (Session Already Active)**

```json
{
  "success": false,
  "data": {
    "existingSessionId": "ts_existing123"
  },
  "message": "An active transcription session already exists for this appointment",
  "errors": []
}
```

**404 Not Found**

```json
{
  "success": false,
  "data": null,
  "message": "Appointment not found",
  "errors": []
}
```

---

## POST /api/v1/appointments/:appointmentId/transcription/audio

Upload an audio chunk for transcription (alternative to WebSocket streaming).

### Request

```yaml
/api/v1/appointments/{appointmentId}/transcription/audio:
  post:
    summary: Upload audio chunk for transcription
    tags:
      - Transcription
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            required:
              - audio
            properties:
              audio:
                type: string
                format: binary
                description: Audio file (WebM, WAV, MP3)
              chunkIndex:
                type: integer
                description: Sequential chunk index
              sessionId:
                type: string
                description: Active session ID
```

### cURL Example

```bash
curl -X POST \
  "https://api.medrecord.app/api/v1/appointments/770e8400.../transcription/audio" \
  -H "Authorization: Bearer <token>" \
  -F "audio=@recording.webm" \
  -F "chunkIndex=0" \
  -F "sessionId=ts_abc123xyz789"
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "chunkIndex": 0,
    "status": "processing",
    "estimatedDuration": 30.5
  },
  "message": "Audio chunk received and being processed"
}
```

### Error Responses

**400 Bad Request**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid audio format. Supported: WebM, WAV, MP3",
  "errors": []
}
```

**413 Payload Too Large**

```json
{
  "success": false,
  "data": null,
  "message": "Audio file too large. Maximum size: 25MB per chunk",
  "errors": []
}
```

---

## POST /api/v1/appointments/:appointmentId/transcription/stop

Stop an active transcription session and finalize processing.

### Request

```yaml
/api/v1/appointments/{appointmentId}/transcription/stop:
  post:
    summary: Stop transcription session
    tags:
      - Transcription
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: false
      content:
        application/json:
          schema:
            type: object
            properties:
              sessionId:
                type: string
                description: Session ID to stop
              saveAudio:
                type: boolean
                default: true
                description: Save audio file with medical record
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "sessionId": "ts_abc123xyz789",
    "status": "completed",
    "transcript": "Doctor: What brings you in today?\nPatient: I've had this headache for three days now. It started on Sunday morning and hasn't gone away.\nDoctor: Can you describe the pain?...",
    "segments": [
      {
        "startTime": 0.0,
        "endTime": 2.5,
        "text": "What brings you in today?",
        "speaker": "doctor"
      },
      {
        "startTime": 3.0,
        "endTime": 8.5,
        "text": "I've had this headache for three days now. It started on Sunday morning and hasn't gone away.",
        "speaker": "patient"
      }
    ],
    "duration": 1847.5,
    "language": "en",
    "audioFileUrl": "/uploads/audio/880e8400.webm",
    "processingTime": 12500
  },
  "message": "Transcription completed"
}
```

### Error Responses

**404 Not Found (No Active Session)**

```json
{
  "success": false,
  "data": null,
  "message": "No active transcription session found",
  "errors": []
}
```

---

## GET /api/v1/appointments/:appointmentId/transcription

Get transcription data for an appointment.

### Request

```yaml
/api/v1/appointments/{appointmentId}/transcription:
  get:
    summary: Get transcription for appointment
    tags:
      - Transcription
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: includeSegments
        in: query
        description: Include timestamped segments
        schema:
          type: boolean
          default: true
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "transcript": "Doctor: What brings you in today?\nPatient: I've had this headache...",
    "segments": [
      {
        "startTime": 0.0,
        "endTime": 2.5,
        "text": "What brings you in today?",
        "speaker": "doctor"
      },
      {
        "startTime": 3.0,
        "endTime": 8.5,
        "text": "I've had this headache for three days now.",
        "speaker": "patient"
      }
    ],
    "duration": 1847.5,
    "language": "en",
    "audioFileUrl": "/uploads/audio/880e8400.webm",
    "createdAt": "2024-01-20T14:35:00.000Z"
  },
  "message": "Success"
}
```

### Response (404 - No Transcription)

```json
{
  "success": true,
  "data": null,
  "message": "No transcription exists for this appointment"
}
```

---

## POST /api/v1/appointments/:appointmentId/extract-fields

Extract medical fields from transcription text using AI.

### Request

```yaml
/api/v1/appointments/{appointmentId}/extract-fields:
  post:
    summary: Extract medical fields from transcription using AI
    tags:
      - Transcription
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - transcriptionText
            properties:
              transcriptionText:
                type: string
                description: Full transcription text to analyze
              previousContext:
                type: string
                description: Context from previous visit/record
              language:
                type: string
                enum: [en, es]
                default: en
              options:
                type: object
                properties:
                  includeConfidence:
                    type: boolean
                    default: true
                  includeSourceText:
                    type: boolean
                    default: true
                  strictMode:
                    type: boolean
                    default: false
```

### Request Body

```json
{
  "transcriptionText": "Doctor: What brings you in today?\nPatient: I've had this headache for three days now. It started on Sunday morning and hasn't gone away. The pain is about a 6 out of 10, mostly in my temples.\nDoctor: Any other symptoms?\nPatient: Some light sensitivity, but no nausea or vomiting.\nDoctor: Based on your description, this sounds like a tension headache. I'm going to prescribe ibuprofen 400mg, take one tablet every 6 to 8 hours as needed with food. Don't exceed 1200mg per day.",
  "previousContext": null,
  "language": "en",
  "options": {
    "includeConfidence": true,
    "includeSourceText": true,
    "strictMode": false
  }
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "extractionId": "ex_def456uvw",
    "chiefComplaint": {
      "value": "Headache for three days",
      "confidence": 0.95,
      "sourceText": "I've had this headache for three days now"
    },
    "historyOfPresentIllness": {
      "value": "Patient reports headache starting Sunday morning, persistent for 3 days. Pain rated 6/10, localized to temples. Associated light sensitivity. No nausea or vomiting.",
      "confidence": 0.88,
      "sourceText": null
    },
    "symptoms": [
      {
        "value": {
          "symptomName": "Headache",
          "bodySite": "Temples (bilateral)",
          "severity": 6,
          "duration": "3 days",
          "notes": "Started Sunday morning, persistent"
        },
        "confidence": 0.92,
        "sourceText": "I've had this headache for three days now... about a 6 out of 10, mostly in my temples"
      },
      {
        "value": {
          "symptomName": "Light sensitivity",
          "bodySite": "Eyes",
          "severity": null,
          "duration": null,
          "notes": null
        },
        "confidence": 0.85,
        "sourceText": "Some light sensitivity"
      }
    ],
    "diagnosis": {
      "value": {
        "description": "Tension headache",
        "type": "primary",
        "certainty": "suspected"
      },
      "confidence": 0.90,
      "sourceText": "this sounds like a tension headache"
    },
    "prescriptions": [
      {
        "value": {
          "medicationName": "Ibuprofen",
          "strength": "400mg",
          "dosage": "1 tablet",
          "frequency": "Every 6-8 hours as needed",
          "duration": null,
          "instructions": "Take with food. Do not exceed 1200mg per day."
        },
        "confidence": 0.95,
        "sourceText": "prescribe ibuprofen 400mg, take one tablet every 6 to 8 hours as needed with food. Don't exceed 1200mg per day"
      }
    ],
    "treatmentPlan": {
      "value": "OTC ibuprofen for pain management as prescribed",
      "confidence": 0.75,
      "sourceText": null
    },
    "followUp": null,
    "vitalSigns": null,
    "allergiesNoted": [],
    "currentMedications": [],
    "overallConfidence": 0.88,
    "flags": [
      {
        "field": "followUp",
        "reason": "No follow-up instructions detected in transcript",
        "suggestedAction": "Consider adding follow-up instructions manually"
      }
    ],
    "processingTime": 2350,
    "tokensUsed": {
      "prompt": 450,
      "completion": 380,
      "total": 830
    }
  },
  "message": "Fields extracted successfully"
}
```

### Error Responses

**400 Bad Request**

```json
{
  "success": false,
  "data": null,
  "message": "Transcription text is required",
  "errors": [
    {
      "field": "transcriptionText",
      "message": "Field is required"
    }
  ]
}
```

**422 Processing Error**

```json
{
  "success": false,
  "data": null,
  "message": "Failed to extract fields from transcription",
  "errors": [
    {
      "field": "extraction",
      "message": "AI service temporarily unavailable"
    }
  ]
}
```

**429 Rate Limit**

```json
{
  "success": false,
  "data": null,
  "message": "AI extraction rate limit exceeded. Please wait before trying again.",
  "errors": []
}
```

---

## Apply Extracted Fields

### POST /api/v1/appointments/:appointmentId/record/apply-extraction

Apply extracted fields to the medical record.

### Request Body

```json
{
  "extractionId": "ex_def456uvw",
  "fieldsToApply": ["chiefComplaint", "symptoms", "diagnosis", "prescriptions"],
  "overwriteExisting": false
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "appliedFields": ["chiefComplaint", "diagnosis"],
    "addedSymptoms": 2,
    "addedPrescriptions": 1,
    "skippedFields": []
  },
  "message": "Extraction applied to medical record"
}
```

---

## Audio Validation

### POST /api/v1/transcription/validate-audio

Validate an audio file before uploading.

### Request

```yaml
/api/v1/transcription/validate-audio:
  post:
    summary: Validate audio file
    tags:
      - Transcription
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              audio:
                type: string
                format: binary
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "duration": 1847.5,
    "size": 15234567,
    "format": "audio/webm;codecs=opus",
    "errors": []
  },
  "message": "Audio file is valid"
}
```

### Response (422 Invalid Audio)

```json
{
  "success": false,
  "data": {
    "isValid": false,
    "duration": 0,
    "size": 0,
    "format": "unknown",
    "errors": [
      "Unsupported audio format",
      "File appears to be corrupted"
    ]
  },
  "message": "Audio validation failed",
  "errors": []
}
```

---

## Supported Audio Formats

| Format | MIME Type | Max Size | Max Duration |
|--------|-----------|----------|--------------|
| WebM/Opus | `audio/webm;codecs=opus` | 25MB/chunk | 60 minutes total |
| WAV | `audio/wav` | 25MB/chunk | 60 minutes total |
| MP3 | `audio/mpeg` | 25MB/chunk | 60 minutes total |

---

## Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Start session | 5 | per minute |
| Audio upload | 30 | per minute |
| Field extraction | 10 | per minute |

---

## References

- [API Overview](../overview.md)
- [WebSocket Events](../websocket.md)
- [AI Integration Interfaces](../../ai-integration/interfaces.md)
- [Medical Record Endpoints](./medical-records.md)
- [Schemas](../schemas.md)
