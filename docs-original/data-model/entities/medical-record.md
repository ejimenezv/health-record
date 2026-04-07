# Entity: MedicalRecord

## Overview

The MedicalRecord entity stores clinical documentation for each appointment using a simplified SOAP (Subjective, Objective, Assessment, Plan) format. It supports both manual entry and AI-assisted transcription with field extraction.

---

## Schema Definition

```prisma
model MedicalRecord {
  id                      String         @id @default(uuid())
  appointmentId           String         @unique
  appointment             Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  // Subjective
  chiefComplaint          String?
  historyOfPresentIllness String?        @db.Text
  // Objective
  physicalExamNotes       String?        @db.Text
  // Assessment
  diagnosis               String?
  diagnosisNotes          String?        @db.Text
  // Plan
  treatmentPlan           String?        @db.Text
  followUpInstructions    String?        @db.Text
  patientEducation        String?        @db.Text
  // AI Integration
  audioFileUrl            String?
  transcript              String?        @db.Text
  isAIGenerated           Boolean        @default(false)
  isDraft                 Boolean        @default(true)
  // Timestamps
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt
  // Relations
  symptoms                Symptom[]
  prescriptions           Prescription[]

  @@map("medical_records")
}
```

---

## SOAP Structure

### Subjective (S)

| Field | Type | Description |
|-------|------|-------------|
| `chiefComplaint` | String | Primary reason for visit |
| `historyOfPresentIllness` | Text | Detailed symptom description |

### Objective (O)

| Field | Type | Description |
|-------|------|-------------|
| `physicalExamNotes` | Text | Physical examination findings |

### Assessment (A)

| Field | Type | Description |
|-------|------|-------------|
| `diagnosis` | String | Primary diagnosis (free text) |
| `diagnosisNotes` | Text | Additional diagnostic notes |

### Plan (P)

| Field | Type | Description |
|-------|------|-------------|
| `treatmentPlan` | Text | Treatment approach |
| `followUpInstructions` | Text | Follow-up care instructions |
| `patientEducation` | Text | Information given to patient |

---

## Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `appointmentId` | UUID | Yes | FK, UNIQUE | Reference to appointment |
| `chiefComplaint` | String | No | NULL | Primary reason for visit |
| `historyOfPresentIllness` | Text | No | NULL | Detailed symptom history |
| `physicalExamNotes` | Text | No | NULL | Physical exam findings |
| `diagnosis` | String | No | NULL | Primary diagnosis |
| `diagnosisNotes` | Text | No | NULL | Additional diagnosis notes |
| `treatmentPlan` | Text | No | NULL | Treatment plan details |
| `followUpInstructions` | Text | No | NULL | Follow-up instructions |
| `patientEducation` | Text | No | NULL | Patient education provided |
| `audioFileUrl` | String | No | NULL | URL to audio recording |
| `transcript` | Text | No | NULL | Full conversation transcript |
| `isAIGenerated` | Boolean | Yes | DEFAULT false | AI-assisted flag |
| `isDraft` | Boolean | Yes | DEFAULT true | Completion status |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Record creation timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated | Last modification timestamp |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `appointmentId` | Valid appointment exists | "Appointment not found" |
| `appointmentId` | Unique (1:1 relationship) | "Medical record already exists for this appointment" |
| `chiefComplaint` | Max 500 characters | "Chief complaint too long" |
| `diagnosis` | Max 500 characters | "Diagnosis too long" |

---

## Relationships

| Relation | Type | Target | Cascade |
|----------|------|--------|---------|
| `appointment` | 1:1 | Appointment | Child (FK here) |
| `symptoms` | 1:N | Symptom | DELETE |
| `prescriptions` | 1:N | Prescription | DELETE |

---

## Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Record lookup |
| Unique | `appointmentId` | Unique | 1:1 relationship enforcement |

---

## Default Values

| Field | Default Value |
|-------|---------------|
| `id` | `uuid()` |
| `isAIGenerated` | `false` |
| `isDraft` | `true` |
| `createdAt` | `now()` |

---

## AI Integration

### AI-Fillable Fields

| Field | Confidence | Notes |
|-------|------------|-------|
| `chiefComplaint` | High | Usually stated clearly at start |
| `historyOfPresentIllness` | Medium | Requires synthesis |
| `diagnosis` | Medium | Doctor's stated conclusion |
| `treatmentPlan` | Medium | Synthesized from discussion |
| `followUpInstructions` | Low | Context-dependent |

### Transcript Storage

The `transcript` field stores the raw transcription text. Segments with timestamps are stored in JSON format within the AI extraction process, not in this table.

---

## Business Rules

1. **One Record Per Appointment**: Enforced by unique constraint on `appointmentId`
2. **Draft vs Complete**: `isDraft` indicates if record can still be edited
3. **AI Flag**: `isAIGenerated` set to `true` if any field was AI-populated
4. **Required for Completion**: Diagnosis required before marking appointment as completed

---

## Cascading Behavior

When a MedicalRecord is deleted:
- All associated Symptoms are deleted
- All associated Prescriptions are deleted

When an Appointment is deleted:
- The associated MedicalRecord is deleted (cascade)

---

## Example Data

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "appointmentId": "770e8400-e29b-41d4-a716-446655440002",
  "chiefComplaint": "Persistent headache for 3 days",
  "historyOfPresentIllness": "Patient reports dull, throbbing headache starting Sunday morning. Pain rated 6/10. No visual disturbances. Tylenol provided minimal relief.",
  "physicalExamNotes": "Alert and oriented. No focal neurological deficits. Mild tenderness in temporal region bilaterally.",
  "diagnosis": "Tension headache",
  "diagnosisNotes": "Likely stress-related. No red flags for secondary causes.",
  "treatmentPlan": "Rest, hydration, OTC ibuprofen as needed. Consider stress reduction techniques.",
  "followUpInstructions": "Return if symptoms worsen or persist beyond 1 week.",
  "patientEducation": "Discussed headache triggers, importance of sleep hygiene and hydration.",
  "audioFileUrl": "/uploads/audio/880e8400-e29b-41d4-a716-446655440003.webm",
  "transcript": "Doctor: What brings you in today? Patient: I've had this headache for three days now...",
  "isAIGenerated": true,
  "isDraft": false,
  "createdAt": "2024-01-20T14:35:00Z",
  "updatedAt": "2024-01-20T15:00:00Z"
}
```

---

## API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Get Record | `/api/appointments/:appointmentId/record` | GET |
| Create/Update Record | `/api/appointments/:appointmentId/record` | PUT |
| Save Draft | `/api/appointments/:appointmentId/record/draft` | PATCH |
| Complete Record | `/api/appointments/:appointmentId/record/complete` | POST |

---

## References

- [ER Design](../er-design.md)
- [Prisma Schema](../prisma-schema.md)
- [AI Integration Interfaces](../../ai-integration/interfaces.md)
