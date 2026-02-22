# Entity-Relationship Design

## Overview

This document defines the entity-relationship design for the Medical Record System MVP. The data model supports patient management, appointment scheduling, medical record documentation with SOAP notes, AI-assisted transcription, and prescription tracking.

---

## Core Entities

### 1. Provider (Doctor/User)

The healthcare provider using the system. In MVP scope, this represents the single doctor user.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Store doctor credentials and profile information |
| **Cardinality** | Single user for MVP (expandable to multi-tenant) |
| **Key Fields** | email (unique), passwordHash, firstName, lastName |

### 2. Patient

Individuals receiving medical care from the provider.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Store patient demographics and contact information |
| **Cardinality** | Many patients per provider |
| **Key Fields** | firstName, lastName, dateOfBirth, sex, phone, emergencyContact |

### 3. Appointment

Scheduled or completed patient visits.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Track patient visits and their status |
| **Cardinality** | Many appointments per patient |
| **Key Fields** | appointmentDate, appointmentType, status, reasonForVisit |

### 4. MedicalRecord

Clinical documentation for each appointment using SOAP format.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Store clinical notes and AI-generated content |
| **Cardinality** | One medical record per appointment (1:1) |
| **Key Fields** | chiefComplaint, diagnosis, treatmentPlan, transcript |

### 5. Symptom

Patient symptoms documented during appointments.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Track individual symptoms with details |
| **Cardinality** | Many symptoms per medical record |
| **Key Fields** | symptomName, severity, duration, bodySite |

### 6. Diagnosis

Medical diagnoses made during appointments.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Record primary diagnosis with optional ICD code |
| **Cardinality** | One diagnosis per medical record (embedded in MedicalRecord for MVP) |
| **Key Fields** | description, icdCode, notes |

### 7. Prescription

Medications prescribed during appointments.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Track prescribed medications with dosage details |
| **Cardinality** | Many prescriptions per medical record |
| **Key Fields** | medicationName, strength, dosage, frequency, instructions |

### 8. Transcription

Audio transcription data from AI processing.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Store transcribed conversation and audio metadata |
| **Cardinality** | Embedded in MedicalRecord for MVP |
| **Key Fields** | fullText (transcript), audioFileUrl |

### 9. Allergy

Patient allergies stored as medical history.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Track patient allergies for safety |
| **Cardinality** | Many allergies per patient |
| **Key Fields** | allergen, reaction, severity |

### 10. ChronicCondition

Ongoing medical conditions for patients.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Track chronic conditions for clinical context |
| **Cardinality** | Many conditions per patient |
| **Key Fields** | conditionName, diagnosisDate, status |

### 11. VitalSigns

Vital signs recorded during appointments.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Store vital measurements |
| **Cardinality** | One vital signs record per appointment (1:1, optional) |
| **Key Fields** | bloodPressure, heartRate, temperature, weight |

---

## Entity Relationships

### Relationship Diagram (Textual)

```
Provider (1) ──────────────────────────────────────┐
                                                    │
                                                    │ creates (1:N)
                                                    ▼
Patient (1) ────┬──── has (1:N) ──── Allergy (N)
                │
                ├──── has (1:N) ──── ChronicCondition (N)
                │
                └──── has (1:N) ──────────────────────┐
                                                       │
                                                       ▼
Appointment (1) ────┬──── contains (1:1) ──── MedicalRecord (1)
                    │                                   │
                    │                                   ├── includes (1:N) ── Symptom (N)
                    │                                   │
                    │                                   └── includes (1:N) ── Prescription (N)
                    │
                    └──── has (1:1, optional) ──── VitalSigns (0..1)
```

### Relationship Details

| Relationship | Type | Description | FK Location |
|--------------|------|-------------|-------------|
| Provider → Appointment | 1:N | Provider creates many appointments | `appointments.providerId` |
| Patient → Appointment | 1:N | Patient has many appointments | `appointments.patientId` |
| Patient → Allergy | 1:N | Patient has many allergies | `allergies.patientId` |
| Patient → ChronicCondition | 1:N | Patient has many conditions | `chronic_conditions.patientId` |
| Appointment → MedicalRecord | 1:1 | Each appointment has one medical record | `medical_records.appointmentId` (unique) |
| Appointment → VitalSigns | 1:1 | Each appointment has optional vital signs | `vital_signs.appointmentId` (unique) |
| MedicalRecord → Symptom | 1:N | Record includes many symptoms | `symptoms.medicalRecordId` |
| MedicalRecord → Prescription | 1:N | Record includes many prescriptions | `prescriptions.medicalRecordId` |

---

## Design Decisions

### 1. Embedded vs. Separate Entities

| Entity | Decision | Rationale |
|--------|----------|-----------|
| Diagnosis | Embedded in MedicalRecord | Single diagnosis per appointment in MVP |
| Transcription | Embedded in MedicalRecord | Direct 1:1 relationship, simpler queries |
| Symptoms | Separate table | Multiple per record, need individual tracking |
| Prescriptions | Separate table | Multiple per record, need status tracking |
| VitalSigns | Separate table | Optional per appointment, distinct data type |

### 2. Soft Delete vs. Hard Delete

For MVP, we use **cascade deletes** for simplicity:
- Deleting a Patient cascades to: Appointments, Allergies, ChronicConditions
- Deleting an Appointment cascades to: MedicalRecord, VitalSigns
- Deleting a MedicalRecord cascades to: Symptoms, Prescriptions

### 3. Denormalization Decisions

| Field | Location | Rationale |
|-------|----------|-----------|
| `isAIGenerated` | MedicalRecord | Track if record was AI-assisted |
| `isAIExtracted` | Symptom, Prescription | Track individual AI extractions |
| `isDraft` | MedicalRecord | Track completion status |

### 4. Audit Fields

All entities include:
- `createdAt` - Record creation timestamp
- `updatedAt` - Last modification timestamp (where applicable)

---

## Data Integrity Constraints

### Primary Keys

All entities use UUID primary keys generated at the application level.

### Unique Constraints

| Entity | Field(s) | Purpose |
|--------|----------|---------|
| Provider | email | Prevent duplicate accounts |
| MedicalRecord | appointmentId | Ensure 1:1 with appointment |
| VitalSigns | appointmentId | Ensure 1:1 with appointment |

### Foreign Key Constraints

All foreign keys enforce referential integrity with `ON DELETE CASCADE` for dependent entities.

### Not Null Constraints

| Entity | Required Fields |
|--------|-----------------|
| Provider | email, passwordHash, firstName, lastName |
| Patient | firstName, lastName, dateOfBirth, sex, phone, emergencyContactName, emergencyContactPhone |
| Appointment | patientId, providerId, appointmentDate, appointmentType |
| MedicalRecord | appointmentId |
| Symptom | medicalRecordId, symptomName |
| Prescription | medicalRecordId, medicationName, strength, dosage, frequency, instructions |

---

## Enumeration Types

### Sex

| Value | Description |
|-------|-------------|
| `male` | Male |
| `female` | Female |
| `other` | Other/Prefer not to say |

### AllergySeverity

| Value | Description |
|-------|-------------|
| `mild` | Mild reaction |
| `moderate` | Moderate reaction |
| `severe` | Severe reaction |
| `life_threatening` | Life-threatening (anaphylaxis) |

### AppointmentType

| Value | Description |
|-------|-------------|
| `new_patient` | First visit |
| `follow_up` | Follow-up visit |
| `routine_checkup` | Routine examination |
| `sick_visit` | Illness-related visit |
| `telehealth` | Remote consultation |

### AppointmentStatus

| Value | Description |
|-------|-------------|
| `scheduled` | Upcoming appointment |
| `checked_in` | Patient arrived |
| `in_progress` | Currently in consultation |
| `completed` | Appointment finished |
| `cancelled` | Appointment cancelled |
| `no_show` | Patient did not attend |

---

## References

- [MVP Fields Selection](../research/mvp-fields-selection.md)
- [Features](../product/features.md)
- [Database Technology Stack](../tech-stack/database.md)
- [ER Diagram](./diagrams/er-diagram.md)
