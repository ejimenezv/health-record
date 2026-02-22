# Entity: Symptom

## Overview

The Symptom entity captures individual symptoms documented during a patient appointment. Symptoms can be entered manually by the provider or extracted automatically from AI transcription.

---

## Schema Definition

```prisma
model Symptom {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  symptomName     String
  bodySite        String?
  severity        Int?          @db.SmallInt
  duration        String?
  notes           String?       @db.Text
  isAIExtracted   Boolean       @default(false)
  createdAt       DateTime      @default(now())

  @@index([medicalRecordId])
  @@map("symptoms")
}
```

---

## Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `medicalRecordId` | UUID | Yes | FK, NOT NULL | Reference to medical record |
| `symptomName` | String | Yes | NOT NULL | Name of the symptom |
| `bodySite` | String | No | NULL | Body location affected |
| `severity` | SmallInt | No | NULL, 1-10 | Severity scale |
| `duration` | String | No | NULL | How long symptom present |
| `notes` | Text | No | NULL | Additional details |
| `isAIExtracted` | Boolean | Yes | DEFAULT false | AI extraction flag |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Record creation timestamp |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `medicalRecordId` | Valid record exists | "Medical record not found" |
| `symptomName` | 2-200 characters | "Symptom name must be 2-200 characters" |
| `bodySite` | Max 100 characters | "Body site too long" |
| `severity` | 1-10 range | "Severity must be between 1 and 10" |
| `duration` | Max 100 characters | "Duration description too long" |

---

## Relationships

| Relation | Type | Target | Cascade |
|----------|------|--------|---------|
| `medicalRecord` | N:1 | MedicalRecord | Parent deletes this |

---

## Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Record lookup |
| Foreign Key | `medicalRecordId` | Non-unique | Record symptoms lookup |

---

## Default Values

| Field | Default Value |
|-------|---------------|
| `id` | `uuid()` |
| `isAIExtracted` | `false` |
| `createdAt` | `now()` |
| `bodySite` | `null` |
| `severity` | `null` |
| `duration` | `null` |
| `notes` | `null` |

---

## AI Extraction

### AI-Fillable Fields

| Field | Extraction Confidence | Source |
|-------|----------------------|--------|
| `symptomName` | High | Explicitly mentioned |
| `bodySite` | Medium | Often specified |
| `severity` | Medium | Sometimes mentioned numerically |
| `duration` | Medium | Usually mentioned |
| `notes` | Low | Contextual synthesis |

### AI Flag Usage

The `isAIExtracted` field indicates whether the symptom was:
- `false`: Manually entered by the provider
- `true`: Extracted from AI transcription

This allows the UI to visually distinguish AI-suggested symptoms for provider review.

---

## Severity Scale

| Value | Description | Examples |
|-------|-------------|----------|
| 1-2 | Minimal | Barely noticeable |
| 3-4 | Mild | Noticeable but not interfering |
| 5-6 | Moderate | Interferes with daily activities |
| 7-8 | Severe | Significantly limiting |
| 9-10 | Extreme | Incapacitating |

---

## Common Body Sites

| Category | Examples |
|----------|----------|
| Head | Head, forehead, temple, eyes, ears, nose, throat |
| Torso | Chest, upper back, lower back, abdomen |
| Upper Extremity | Shoulder, arm, elbow, wrist, hand, fingers |
| Lower Extremity | Hip, thigh, knee, calf, ankle, foot, toes |
| General | Whole body, multiple areas, diffuse |

---

## Business Rules

1. **Required Name**: Every symptom must have a name
2. **Multiple Symptoms**: One medical record can have many symptoms
3. **Optional Details**: Severity, duration, and body site are optional
4. **AI Review**: AI-extracted symptoms should be reviewed before saving

---

## Example Data

```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "medicalRecordId": "880e8400-e29b-41d4-a716-446655440003",
  "symptomName": "Headache",
  "bodySite": "Bilateral temporal region",
  "severity": 6,
  "duration": "3 days",
  "notes": "Dull, throbbing quality. Worse in the morning.",
  "isAIExtracted": true,
  "createdAt": "2024-01-20T14:40:00Z"
}
```

---

## API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List Symptoms | `/api/records/:recordId/symptoms` | GET |
| Add Symptom | `/api/records/:recordId/symptoms` | POST |
| Update Symptom | `/api/records/:recordId/symptoms/:id` | PATCH |
| Delete Symptom | `/api/records/:recordId/symptoms/:id` | DELETE |

---

## References

- [ER Design](../er-design.md)
- [Prisma Schema](../prisma-schema.md)
- [MVP Fields Selection](../../research/mvp-fields-selection.md)
