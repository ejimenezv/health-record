# Data Model Summary

## Overview

This document provides a high-level summary of the Medical Record System MVP data model. It serves as a quick reference for developers and stakeholders.

---

## Entity Count

| Category | Entity | Description |
|----------|--------|-------------|
| **Users** | Provider | Healthcare provider (doctor) |
| **Patient Data** | Patient | Patient demographics |
| | Allergy | Patient allergies |
| | ChronicCondition | Patient chronic conditions |
| **Appointments** | Appointment | Patient visits |
| | VitalSigns | Vital measurements |
| **Clinical Records** | MedicalRecord | SOAP documentation |
| | Symptom | Documented symptoms |
| | Prescription | Prescribed medications |

**Total: 9 entities**

---

## Quick Relationship Reference

```
Provider (1) ──────────────────────────────┐
                                            │ creates (1:N)
                                            ▼
Patient (1) ────┬──── has (1:N) ──── Allergy
                │
                ├──── has (1:N) ──── ChronicCondition
                │
                └──── has (1:N) ────────────────────┐
                                                    ▼
Appointment (1) ────┬──── contains (1:1) ──── MedicalRecord
                    │                               │
                    │                               ├── includes (1:N) ── Symptom
                    │                               │
                    │                               └── includes (1:N) ── Prescription
                    │
                    └──── has (1:0..1) ──── VitalSigns
```

---

## Key Schema Files

| File | Location | Purpose |
|------|----------|---------|
| Prisma Schema | `prisma/schema.prisma` | Database schema definition |
| Migrations | `prisma/migrations/` | Database migration history |
| Seed Script | `prisma/seed.ts` | Test data generation |

---

## Database Technology

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 15 |
| ORM | Prisma 5.x |
| ID Format | UUID v4 |
| Timestamps | DateTime (UTC) |

---

## Enum Values

### Sex
`male` | `female` | `other`

### AllergySeverity
`mild` | `moderate` | `severe` | `life_threatening`

### AppointmentType
`new_patient` | `follow_up` | `routine_checkup` | `sick_visit` | `telehealth`

### AppointmentStatus
`scheduled` | `checked_in` | `in_progress` | `completed` | `cancelled` | `no_show`

---

## AI Integration Fields

| Entity | AI Fields |
|--------|-----------|
| MedicalRecord | `isAIGenerated`, `transcript`, `audioFileUrl` |
| Symptom | `isAIExtracted` |
| Prescription | `isAIExtracted` |

---

## Key Indexes

| Purpose | Table | Index |
|---------|-------|-------|
| Patient Search | patients | `[lastName, firstName]` |
| Patient Lookup | patients | `[phone]`, `[email]` |
| Appointment History | appointments | `[patientId]` |
| Date Filtering | appointments | `[appointmentDate]` |
| Status Filtering | appointments | `[status]` |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or pnpm

### Database Setup

```bash
# 1. Set environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/medrecord"

# 2. Generate Prisma Client
npx prisma generate

# 3. Run migrations
npx prisma migrate dev

# 4. Seed database
npx prisma db seed
```

### Prisma Commands

```bash
# Create new migration
npx prisma migrate dev --name description

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

---

## Documentation Index

### Core Documentation

- [ER Design](./er-design.md) - Entity-relationship design
- [ER Diagram](./diagrams/er-diagram.md) - Visual ER diagram
- [Prisma Schema](./prisma-schema.md) - Complete Prisma schema

### Entity Details

- [Provider](./entities/provider.md)
- [Patient](./entities/patient.md)
- [Appointment](./entities/appointment.md)
- [Medical Record](./entities/medical-record.md)
- [Symptom](./entities/symptom.md)
- [Diagnosis](./entities/diagnosis.md)
- [Prescription](./entities/prescription.md)
- [Transcription](./entities/transcription.md)

### Operations

- [Indexes](./indexes.md) - Database indexing strategy
- [Migrations](./migrations.md) - Migration workflow
- [Seed Data](./seed-data.md) - Test data generation

### Deliverables

- [Section 3 - Modelo de Datos](../deliverables/section-3-modelo-datos.md) - Spanish documentation

---

## MVP Scale Expectations

| Metric | Expected Value |
|--------|----------------|
| Providers | 1 (single-user MVP) |
| Patients | < 500 |
| Appointments/day | < 20 |
| Database size | < 1 GB |
| Concurrent connections | < 10 |

---

## Data Integrity

### Cascade Deletes

| When Deleting | Cascades To |
|---------------|-------------|
| Patient | Allergies, ChronicConditions, Appointments |
| Appointment | MedicalRecord, VitalSigns |
| MedicalRecord | Symptoms, Prescriptions |

### Required Fields

| Entity | Required Fields |
|--------|-----------------|
| Provider | email, passwordHash, firstName, lastName |
| Patient | firstName, lastName, dateOfBirth, sex, phone, emergencyContact* |
| Appointment | patientId, providerId, appointmentDate, appointmentType |
| Symptom | medicalRecordId, symptomName |
| Prescription | medicalRecordId, medicationName, strength, dosage, frequency, instructions |

---

## Related Documentation

- [Architecture Components](../architecture/components.md)
- [Database Technology Stack](../tech-stack/database.md)
- [AI Integration Interfaces](../ai-integration/interfaces.md)
- [MVP Fields Selection](../research/mvp-fields-selection.md)
