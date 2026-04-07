# Entity: Diagnosis

## Overview

Diagnosis information is embedded within the MedicalRecord entity for the MVP. This document describes the diagnosis fields and their usage. A separate Diagnosis entity may be extracted in future versions to support multiple diagnoses per appointment.

---

## Current Implementation (MVP)

In the MVP, diagnosis is stored as fields within the `MedicalRecord` model:

```prisma
model MedicalRecord {
  // ... other fields
  diagnosis      String?
  diagnosisNotes String? @db.Text
  // ... other fields
}
```

---

## Diagnosis Fields in MedicalRecord

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `diagnosis` | String | No | Max 500 chars | Primary diagnosis text |
| `diagnosisNotes` | Text | No | NULL | Additional diagnostic context |

---

## Future Entity Design (Post-MVP)

For future multi-diagnosis support:

```prisma
model Diagnosis {
  id              String        @id @default(uuid())
  medicalRecordId String        @unique
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  description     String
  icdCode         String?
  type            DiagnosisType @default(primary)
  severity        String?
  confidence      Float?
  isAIGenerated   Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("diagnoses")
}

enum DiagnosisType {
  primary
  secondary
  differential
}
```

---

## Fields (Future Design)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `medicalRecordId` | UUID | Yes | FK, UNIQUE | Reference to medical record |
| `description` | String | Yes | NOT NULL | Diagnosis description |
| `icdCode` | String | No | NULL | ICD-10 code (optional for MVP) |
| `type` | Enum | Yes | DEFAULT primary | Diagnosis type |
| `severity` | String | No | NULL | Severity descriptor |
| `confidence` | Float | No | NULL, 0-1 | AI confidence score |
| `isAIGenerated` | Boolean | Yes | DEFAULT false | AI generation flag |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Creation timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated | Last modification timestamp |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `diagnosis` | Max 500 characters | "Diagnosis description too long" |
| `diagnosisNotes` | No limit | - |
| `icdCode` (future) | Valid ICD-10 format | "Invalid ICD code format" |
| `confidence` (future) | 0.0 - 1.0 range | "Confidence must be between 0 and 1" |

---

## ICD Code Handling (Future)

| Aspect | MVP Approach | Future Approach |
|--------|--------------|-----------------|
| ICD-10 Code | Not required | Optional lookup |
| Code Validation | None | Format validation |
| Auto-suggest | None | AI suggestion |

The MVP uses free-text diagnosis to avoid the complexity of ICD-10 code management.

---

## AI Extraction

### Extraction Confidence

| Confidence Level | Description | Action |
|------------------|-------------|--------|
| High (0.8-1.0) | Doctor clearly stated | Auto-populate |
| Medium (0.5-0.8) | Implied from context | Suggest with review |
| Low (0-0.5) | Uncertain | Manual entry required |

### AI-Fillable Fields

| Field | Extraction Confidence |
|-------|----------------------|
| `diagnosis` | Medium-High |
| `diagnosisNotes` | Medium |

---

## Business Rules

1. **Single Diagnosis (MVP)**: One primary diagnosis per medical record
2. **Required for Completion**: Diagnosis should be present before marking appointment complete
3. **Free Text**: No ICD-10 coding required for MVP
4. **AI Review**: AI-extracted diagnoses must be reviewed by provider

---

## Example Data (Current MVP)

Within MedicalRecord:

```json
{
  "diagnosis": "Tension headache",
  "diagnosisNotes": "Likely stress-related. No red flags for secondary causes. Patient reports recent work stress."
}
```

---

## Example Data (Future Design)

```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "medicalRecordId": "880e8400-e29b-41d4-a716-446655440003",
  "description": "Tension headache",
  "icdCode": "G44.2",
  "type": "primary",
  "severity": "moderate",
  "confidence": 0.85,
  "isAIGenerated": true,
  "createdAt": "2024-01-20T14:45:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

---

## API Operations (Current)

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Get/Update | `/api/appointments/:id/record` | GET/PUT |

Diagnosis is updated as part of the medical record update.

---

## References

- [ER Design](../er-design.md)
- [Medical Record Entity](./medical-record.md)
- [MVP Fields Selection](../../research/mvp-fields-selection.md)
