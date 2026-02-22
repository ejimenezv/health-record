# Entity: Transcription

## Overview

Transcription data is embedded within the MedicalRecord entity for the MVP. This document describes the transcription-related fields and their usage for storing AI-generated conversation transcripts.

---

## Current Implementation (MVP)

In the MVP, transcription data is stored as fields within the `MedicalRecord` model:

```prisma
model MedicalRecord {
  // ... other fields
  audioFileUrl  String?
  transcript    String? @db.Text
  isAIGenerated Boolean @default(false)
  // ... other fields
}
```

---

## Transcription Fields in MedicalRecord

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `audioFileUrl` | String | No | NULL | Path/URL to audio file |
| `transcript` | Text | No | NULL | Full transcription text |
| `isAIGenerated` | Boolean | Yes | DEFAULT false | AI-assisted flag |

---

## Future Entity Design (Post-MVP)

For advanced transcription features:

```prisma
model Transcription {
  id               String        @id @default(uuid())
  appointmentId    String        @unique
  appointment      Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  fullText         String        @db.Text
  segments         Json
  language         String        @default("en")
  durationSeconds  Int
  audioFileUrl     String?
  status           TranscriptionStatus @default(pending)
  startedAt        DateTime?
  completedAt      DateTime?
  processingTime   Int?
  errorMessage     String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@map("transcriptions")
}

enum TranscriptionStatus {
  pending
  processing
  completed
  failed
}
```

---

## Fields (Future Design)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK | Unique identifier |
| `appointmentId` | UUID | Yes | FK, UNIQUE | Reference to appointment |
| `fullText` | Text | Yes | NOT NULL | Complete transcript |
| `segments` | JSON | Yes | NOT NULL | Timestamped segments |
| `language` | String | Yes | DEFAULT "en" | Detected language |
| `durationSeconds` | Int | Yes | NOT NULL | Audio duration |
| `audioFileUrl` | String | No | NULL | Audio file path |
| `status` | Enum | Yes | DEFAULT pending | Processing status |
| `startedAt` | DateTime | No | NULL | Processing start time |
| `completedAt` | DateTime | No | NULL | Processing end time |
| `processingTime` | Int | No | NULL | Processing duration (ms) |
| `errorMessage` | String | No | NULL | Error if failed |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Creation timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated | Last update timestamp |

---

## Segments JSON Structure

The `segments` field stores timestamped transcript segments:

```typescript
interface TranscriptSegment {
  id: number;
  startTime: number;    // seconds
  endTime: number;      // seconds
  text: string;
  speaker?: 'doctor' | 'patient' | 'unknown';
}

// Example
[
  {
    "id": 1,
    "startTime": 0.0,
    "endTime": 3.5,
    "text": "Good afternoon, how are you feeling today?",
    "speaker": "doctor"
  },
  {
    "id": 2,
    "startTime": 3.8,
    "endTime": 8.2,
    "text": "I've been having these headaches for about three days now.",
    "speaker": "patient"
  }
]
```

---

## Status Transitions

```
pending ──> processing ──> completed
                │
                └─────────> failed
```

| Status | Description |
|--------|-------------|
| `pending` | Audio uploaded, waiting to process |
| `processing` | Transcription in progress |
| `completed` | Transcription successful |
| `failed` | Transcription failed |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `audioFileUrl` | Valid file path/URL | "Invalid audio file path" |
| `language` | ISO 639-1 code | "Invalid language code" |
| `durationSeconds` | Positive integer | "Invalid duration" |

---

## AI Integration

### Whisper API Usage

The transcription uses OpenAI Whisper API:

```typescript
interface WhisperRequest {
  file: Buffer;
  model: 'whisper-1';
  language?: 'en' | 'es';
  response_format?: 'json' | 'verbose_json';
  prompt?: string;
}
```

### Medical Terminology Prompt

A medical terminology prompt improves transcription accuracy:

```
"This is a medical consultation between a doctor and patient.
Common terms include: symptoms, diagnosis, prescription, medication,
dosage, follow-up, treatment plan."
```

---

## Business Rules

1. **One Transcription Per Appointment**: Enforced by unique constraint
2. **Audio Storage**: Audio files stored in `/uploads/audio/` directory
3. **Processing Timeout**: Transcription times out after 5 minutes
4. **Retry Logic**: Failed transcriptions can be retried up to 3 times

---

## Example Data (Current MVP)

Within MedicalRecord:

```json
{
  "audioFileUrl": "/uploads/audio/880e8400-e29b-41d4.webm",
  "transcript": "Doctor: Good afternoon, how are you feeling today?\n\nPatient: I've been having these headaches for about three days now. They started Sunday morning...",
  "isAIGenerated": true
}
```

---

## Example Data (Future Design)

```json
{
  "id": "cc0e8400-e29b-41d4-a716-446655440007",
  "appointmentId": "770e8400-e29b-41d4-a716-446655440002",
  "fullText": "Doctor: Good afternoon, how are you feeling today?\n\nPatient: I've been having these headaches...",
  "segments": [
    {
      "id": 1,
      "startTime": 0.0,
      "endTime": 3.5,
      "text": "Good afternoon, how are you feeling today?",
      "speaker": "doctor"
    }
  ],
  "language": "en",
  "durationSeconds": 1245,
  "audioFileUrl": "/uploads/audio/cc0e8400-e29b-41d4.webm",
  "status": "completed",
  "startedAt": "2024-01-20T14:30:05Z",
  "completedAt": "2024-01-20T14:30:45Z",
  "processingTime": 40000,
  "createdAt": "2024-01-20T14:30:00Z",
  "updatedAt": "2024-01-20T14:30:45Z"
}
```

---

## API Operations (Current)

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Upload Audio | `/api/appointments/:id/transcribe` | POST |
| Get Transcript | `/api/appointments/:id/record` | GET |

---

## Audio File Handling

### Supported Formats

| Format | MIME Type | Notes |
|--------|-----------|-------|
| WebM | audio/webm | Browser recording default |
| MP3 | audio/mpeg | Uploaded files |
| WAV | audio/wav | High quality |
| M4A | audio/mp4 | iOS recordings |

### File Size Limits

| Constraint | Value |
|------------|-------|
| Max file size | 25 MB |
| Max duration | 60 minutes |
| Sample rate | 16 kHz (recommended) |

---

## References

- [ER Design](../er-design.md)
- [Medical Record Entity](./medical-record.md)
- [AI Integration - Audio Capture](../../ai-integration/audio-capture.md)
- [AI Integration - Transcription Pipeline](../../ai-integration/transcription-pipeline.md)
