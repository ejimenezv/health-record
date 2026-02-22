# Entity: Prescription

## Overview

The Prescription entity stores medication prescriptions issued during patient appointments. It captures all necessary prescription details including medication name, dosage, frequency, and instructions. Prescriptions can be entered manually or extracted from AI transcription.

---

## Schema Definition

```prisma
model Prescription {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  medicationName  String
  strength        String
  dosage          String
  frequency       String
  duration        String?
  quantity        Int?
  refills         Int?          @default(0)
  instructions    String        @db.Text
  indication      String?
  isAIExtracted   Boolean       @default(false)
  createdAt       DateTime      @default(now())

  @@index([medicalRecordId])
  @@map("prescriptions")
}
```

---

## Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `medicalRecordId` | UUID | Yes | FK, NOT NULL | Reference to medical record |
| `medicationName` | String | Yes | NOT NULL | Medication name (brand/generic) |
| `strength` | String | Yes | NOT NULL | Medication strength (e.g., "400mg") |
| `dosage` | String | Yes | NOT NULL | Amount per dose (e.g., "1 tablet") |
| `frequency` | String | Yes | NOT NULL | How often (e.g., "twice daily") |
| `duration` | String | No | NULL | Treatment duration (e.g., "7 days") |
| `quantity` | Int | No | NULL | Total quantity to dispense |
| `refills` | Int | No | DEFAULT 0 | Number of refills authorized |
| `instructions` | Text | Yes | NOT NULL | Patient instructions |
| `indication` | String | No | NULL | Reason for medication |
| `isAIExtracted` | Boolean | Yes | DEFAULT false | AI extraction flag |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Record creation timestamp |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `medicalRecordId` | Valid record exists | "Medical record not found" |
| `medicationName` | 2-200 characters | "Medication name must be 2-200 characters" |
| `strength` | 1-50 characters | "Strength must be 1-50 characters" |
| `dosage` | 1-100 characters | "Dosage must be 1-100 characters" |
| `frequency` | 1-100 characters | "Frequency must be 1-100 characters" |
| `duration` | Max 50 characters | "Duration too long" |
| `quantity` | Positive integer | "Quantity must be positive" |
| `refills` | 0-12 range | "Refills must be 0-12" |
| `instructions` | 1-1000 characters | "Instructions required" |
| `indication` | Max 200 characters | "Indication too long" |

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
| Foreign Key | `medicalRecordId` | Non-unique | Record prescriptions lookup |

---

## Default Values

| Field | Default Value |
|-------|---------------|
| `id` | `uuid()` |
| `refills` | `0` |
| `isAIExtracted` | `false` |
| `createdAt` | `now()` |
| `duration` | `null` |
| `quantity` | `null` |
| `indication` | `null` |

---

## AI Extraction

### AI-Fillable Fields

| Field | Extraction Confidence | Notes |
|-------|----------------------|-------|
| `medicationName` | High | Explicitly mentioned |
| `strength` | High | Usually stated with medication |
| `dosage` | High | Amount specified |
| `frequency` | High | Timing specified |
| `duration` | Medium | Sometimes mentioned |
| `instructions` | Medium | May need synthesis |
| `indication` | Low | Context-dependent |

### AI Flag Usage

The `isAIExtracted` field indicates:
- `false`: Manually entered by provider
- `true`: Extracted from AI transcription

---

## Medication Format Guidelines

### Medication Name
- Use generic name when possible
- Include brand name in parentheses if relevant
- Example: "Ibuprofen (Advil)"

### Strength
- Include numeric value and unit
- Examples: "400mg", "500mg/5ml", "0.5%"

### Dosage
- Specify amount per administration
- Examples: "1 tablet", "2 capsules", "5ml", "Apply thin layer"

### Frequency
- Use standard medical abbreviations or plain English
- Examples: "twice daily", "every 8 hours", "three times daily with meals"

### Duration
- Specify total treatment length
- Examples: "7 days", "2 weeks", "until finished", "as needed"

### Instructions
- Clear patient instructions
- Include timing, food requirements, warnings
- Example: "Take with food. Avoid alcohol. May cause drowsiness."

---

## Business Rules

1. **Required Fields**: medicationName, strength, dosage, frequency, instructions are required
2. **Multiple Prescriptions**: One medical record can have many prescriptions
3. **AI Review**: AI-extracted prescriptions must be reviewed before saving
4. **No Drug Interaction Check**: MVP does not include drug interaction validation

---

## Example Data

```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "medicalRecordId": "880e8400-e29b-41d4-a716-446655440003",
  "medicationName": "Ibuprofen",
  "strength": "400mg",
  "dosage": "1 tablet",
  "frequency": "Every 6-8 hours as needed",
  "duration": "5 days",
  "quantity": 20,
  "refills": 0,
  "instructions": "Take with food. Do not exceed 1200mg per day. Stop if stomach upset occurs.",
  "indication": "Headache pain relief",
  "isAIExtracted": true,
  "createdAt": "2024-01-20T14:50:00Z"
}
```

---

## API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List Prescriptions | `/api/records/:recordId/prescriptions` | GET |
| Add Prescription | `/api/records/:recordId/prescriptions` | POST |
| Update Prescription | `/api/records/:recordId/prescriptions/:id` | PATCH |
| Delete Prescription | `/api/records/:recordId/prescriptions/:id` | DELETE |

---

## Excluded Fields (MVP)

| Field | Reason |
|-------|--------|
| `rxnormCode` | Standardized codes not needed for MVP |
| `ndcCode` | National Drug Code not required |
| `pharmacy` | E-prescribing out of scope |
| `status` | Active/completed tracking deferred |
| `startDate`, `endDate` | Date tracking deferred |

---

## References

- [ER Design](../er-design.md)
- [Prisma Schema](../prisma-schema.md)
- [MVP Fields Selection](../../research/mvp-fields-selection.md)
