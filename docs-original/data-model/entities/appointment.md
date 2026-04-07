# Entity: Appointment

## Overview

The Appointment entity represents a patient visit to the healthcare provider. It links patients to their medical records and tracks the appointment lifecycle from scheduling through completion.

---

## Schema Definition

```prisma
model Appointment {
  id              String            @id @default(uuid())
  patientId       String
  patient         Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  providerId      String
  provider        Provider          @relation(fields: [providerId], references: [id])
  appointmentDate DateTime
  appointmentType AppointmentType
  reasonForVisit  String?
  durationMinutes Int?              @default(30)
  status          AppointmentStatus @default(scheduled)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  medicalRecord   MedicalRecord?
  vitalSigns      VitalSigns?

  @@index([patientId])
  @@index([providerId])
  @@index([appointmentDate])
  @@index([status])
  @@map("appointments")
}
```

---

## Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `patientId` | UUID | Yes | FK, NOT NULL | Reference to patient |
| `providerId` | UUID | Yes | FK, NOT NULL | Reference to provider |
| `appointmentDate` | DateTime | Yes | NOT NULL | Scheduled date and time |
| `appointmentType` | Enum | Yes | NOT NULL | Type of appointment |
| `reasonForVisit` | String | No | NULL | Chief complaint / reason |
| `durationMinutes` | Int | No | DEFAULT 30 | Expected duration |
| `status` | Enum | Yes | DEFAULT scheduled | Current status |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Record creation timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated | Last modification timestamp |

---

## AppointmentType Enum

| Value | Description | Use Case |
|-------|-------------|----------|
| `new_patient` | First visit | New patient registration |
| `follow_up` | Follow-up visit | Post-treatment check |
| `routine_checkup` | Routine examination | Annual physical, wellness |
| `sick_visit` | Illness-related | Acute symptoms |
| `telehealth` | Remote consultation | Video/phone visit |

---

## AppointmentStatus Enum

| Value | Description | Next States |
|-------|-------------|-------------|
| `scheduled` | Upcoming appointment | checked_in, cancelled, no_show |
| `checked_in` | Patient arrived | in_progress, no_show |
| `in_progress` | Currently consulting | completed |
| `completed` | Appointment finished | (terminal) |
| `cancelled` | Appointment cancelled | (terminal) |
| `no_show` | Patient didn't attend | (terminal) |

### Status Transition Diagram

```
scheduled ──┬──> checked_in ──> in_progress ──> completed
            │
            ├──> cancelled
            │
            └──> no_show
```

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `patientId` | Valid patient exists | "Patient not found" |
| `providerId` | Valid provider exists | "Provider not found" |
| `appointmentDate` | Valid datetime | "Invalid appointment date" |
| `appointmentType` | Valid enum value | "Invalid appointment type" |
| `reasonForVisit` | Max 500 characters | "Reason for visit too long" |
| `durationMinutes` | 5-480 minutes | "Invalid duration" |
| `status` | Valid enum value | "Invalid status" |

---

## Relationships

| Relation | Type | Target | Description |
|----------|------|--------|-------------|
| `patient` | N:1 | Patient | Patient being seen |
| `provider` | N:1 | Provider | Provider conducting appointment |
| `medicalRecord` | 1:1 | MedicalRecord | Clinical documentation |
| `vitalSigns` | 1:1 | VitalSigns | Vital measurements |

---

## Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Record lookup |
| Foreign Key | `patientId` | Non-unique | Patient appointments |
| Foreign Key | `providerId` | Non-unique | Provider schedule |
| Single | `appointmentDate` | Non-unique | Date filtering |
| Single | `status` | Non-unique | Status filtering |

---

## Default Values

| Field | Default Value |
|-------|---------------|
| `id` | `uuid()` |
| `durationMinutes` | `30` |
| `status` | `scheduled` |
| `createdAt` | `now()` |
| `reasonForVisit` | `null` |

---

## Business Rules

1. **Patient Required**: Every appointment must be linked to a patient
2. **Provider Required**: Every appointment must be linked to a provider
3. **Status Progression**: Status follows defined state machine
4. **Complete on Finish**: Medical record should exist before marking completed
5. **MVP Simplification**: Appointments start as "in_progress" when created during visit

---

## Example Data

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "patientId": "660e8400-e29b-41d4-a716-446655440001",
  "providerId": "550e8400-e29b-41d4-a716-446655440000",
  "appointmentDate": "2024-01-20T14:30:00Z",
  "appointmentType": "sick_visit",
  "reasonForVisit": "Persistent headache for 3 days",
  "durationMinutes": 30,
  "status": "completed",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T15:05:00Z"
}
```

---

## API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List by Patient | `/api/patients/:patientId/appointments` | GET |
| Get Appointment | `/api/appointments/:id` | GET |
| Create Appointment | `/api/appointments` | POST |
| Update Appointment | `/api/appointments/:id` | PATCH |
| Update Status | `/api/appointments/:id/status` | PATCH |

---

## References

- [ER Design](../er-design.md)
- [Prisma Schema](../prisma-schema.md)
- [Features](../../product/features.md)
