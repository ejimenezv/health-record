# Ticket 001: Database Schema Implementation

## Type
Technical

## Priority
P0-Critical

## Story Reference
US-011: Data Persistence

## Description
Implement the complete database schema using Prisma ORM, including all entities, relationships, enums, indexes, and seed data for development and testing. This schema supports all medical record functionality including patients, appointments, medical records with SOAP format, symptoms, prescriptions, and AI transcription data.

## Acceptance Criteria
- [ ] All 9 core entities defined in Prisma schema
- [ ] All enums created (Sex, AllergySeverity, AppointmentType, AppointmentStatus)
- [ ] Relationships correctly defined with proper cascading
- [ ] Indexes created for frequently queried fields
- [ ] Initial migration generated and applied
- [ ] Seed script creates realistic test data
- [ ] Database connects and queries work correctly

## Technical Requirements

### Database Tasks

#### Models to Define
- [ ] **Provider** model (healthcare provider/user)
  - id (UUID, primary key)
  - email (unique)
  - passwordHash
  - firstName, lastName
  - specialty (optional)
  - licenseNumber (optional)
  - phone (optional)
  - timestamps (createdAt, updatedAt)

- [ ] **Patient** model
  - id (UUID, primary key)
  - providerId (FK to Provider)
  - firstName, lastName
  - dateOfBirth (DateTime)
  - sex (enum: male, female, other)
  - phone, email (optional)
  - address, city, state, zipCode
  - emergencyContactName, emergencyContactPhone
  - insuranceProvider, insurancePolicyNumber
  - notes (optional)
  - timestamps

- [ ] **Allergy** model
  - id (UUID, primary key)
  - patientId (FK to Patient)
  - allergen
  - severity (enum: mild, moderate, severe, life_threatening)
  - reaction (optional)
  - timestamps

- [ ] **ChronicCondition** model
  - id (UUID, primary key)
  - patientId (FK to Patient)
  - condition
  - diagnosedDate (optional)
  - notes (optional)
  - timestamps

- [ ] **Appointment** model
  - id (UUID, primary key)
  - patientId (FK to Patient)
  - providerId (FK to Provider)
  - appointmentDate (DateTime)
  - appointmentType (enum)
  - status (enum)
  - reason (optional)
  - notes (optional)
  - timestamps

- [ ] **MedicalRecord** model (SOAP format)
  - id (UUID, primary key)
  - appointmentId (FK to Appointment, unique)
  - chiefComplaint
  - subjective (S - patient's description)
  - objective (O - clinical observations)
  - assessment (A - diagnosis reasoning)
  - plan (P - treatment plan)
  - aiTranscript (full AI transcript, optional)
  - aiSummary (AI-generated summary, optional)
  - timestamps

- [ ] **Symptom** model
  - id (UUID, primary key)
  - medicalRecordId (FK to MedicalRecord)
  - name
  - severity (optional: 1-10)
  - duration (optional)
  - notes (optional)
  - aiGenerated (boolean, default false)
  - timestamps

- [ ] **Prescription** model
  - id (UUID, primary key)
  - medicalRecordId (FK to MedicalRecord)
  - medication
  - dosage
  - frequency
  - duration
  - quantity (optional)
  - refills (optional, default 0)
  - instructions (optional)
  - aiGenerated (boolean, default false)
  - timestamps

- [ ] **VitalSigns** model
  - id (UUID, primary key)
  - appointmentId (FK to Appointment, unique)
  - bloodPressureSystolic (optional)
  - bloodPressureDiastolic (optional)
  - heartRate (optional)
  - temperature (optional)
  - respiratoryRate (optional)
  - oxygenSaturation (optional)
  - weight (optional)
  - height (optional)
  - timestamps

#### Enums to Create
- [ ] `Sex`: male, female, other
- [ ] `AllergySeverity`: mild, moderate, severe, life_threatening
- [ ] `AppointmentType`: new_patient, follow_up, routine_checkup, sick_visit, telehealth
- [ ] `AppointmentStatus`: scheduled, checked_in, in_progress, completed, cancelled, no_show

#### Relationships
- [ ] Provider → Patient (one-to-many)
- [ ] Patient → Allergy (one-to-many, cascade delete)
- [ ] Patient → ChronicCondition (one-to-many, cascade delete)
- [ ] Patient → Appointment (one-to-many, cascade delete)
- [ ] Provider → Appointment (one-to-many)
- [ ] Appointment → MedicalRecord (one-to-one, cascade delete)
- [ ] Appointment → VitalSigns (one-to-one, cascade delete)
- [ ] MedicalRecord → Symptom (one-to-many, cascade delete)
- [ ] MedicalRecord → Prescription (one-to-many, cascade delete)

#### Indexes to Create
- [ ] Patient: `@@index([lastName, firstName])`
- [ ] Patient: `@@index([phone])`
- [ ] Patient: `@@index([email])`
- [ ] Patient: `@@index([providerId])`
- [ ] Appointment: `@@index([patientId])`
- [ ] Appointment: `@@index([providerId])`
- [ ] Appointment: `@@index([appointmentDate])`
- [ ] Appointment: `@@index([status])`
- [ ] Symptom: `@@index([medicalRecordId])`
- [ ] Prescription: `@@index([medicalRecordId])`

#### Seed Data
- [ ] Create seed script with:
  - 1 Provider (Dr. Demo)
  - 5 Patients with varied demographics
  - 2-3 Allergies per patient
  - 1-2 Chronic conditions per patient
  - 3-5 Appointments per patient (various statuses)
  - Medical records for completed appointments
  - Sample symptoms and prescriptions
  - Vital signs for completed appointments

## API Endpoints Involved
None directly - this is database infrastructure.

## Components Involved
None - backend only.

## Data Models Involved
All 9 models: Provider, Patient, Allergy, ChronicCondition, Appointment, MedicalRecord, Symptom, Prescription, VitalSigns

## Testing Requirements
- [ ] Migration runs successfully on fresh database
- [ ] Migration is reversible (rollback works)
- [ ] Seed data inserts correctly
- [ ] All relationships query correctly
- [ ] Cascade delete works as expected
- [ ] Unique constraints enforced (email, appointmentId on records)
- [ ] Indexes improve query performance

## Dependencies
- TICKET-000: Project Setup must be complete

## Estimation
3 Story Points

## Implementation Notes
- Use UUID for all primary keys (`@id @default(uuid())`)
- Use `@updatedAt` for automatic timestamp updates
- Consider using `@map` for snake_case database column names
- Test cascade deletes carefully - deleting a patient removes all related data
- Seed data should be idempotent (safe to run multiple times)
- Include realistic medical data in seeds for UI testing
- Use transactions in seed script for data integrity

## Files to Create/Modify

### Backend
- `packages/backend/prisma/schema.prisma` (complete schema)
- `packages/backend/prisma/seed.ts` (seed script)
- `packages/backend/prisma/migrations/YYYYMMDD_initial/` (auto-generated)
- `packages/backend/package.json` (add prisma scripts)

## Definition of Done
- [ ] `pnpm db:migrate` runs successfully
- [ ] `pnpm db:reset` resets and re-seeds database
- [ ] `pnpm db:seed` populates test data
- [ ] Prisma Studio shows all tables with relationships
- [ ] Schema matches data model documentation exactly
- [ ] All indexes created in database
- [ ] Seed data provides comprehensive test scenarios
- [ ] Code reviewed and approved
