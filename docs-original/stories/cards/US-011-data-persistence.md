# User Story US-011: Data Persistence

## Story Card

**As a** doctor
**I want to** have all my data saved reliably
**So that** patient records and appointments persist between sessions and are not lost

---

## Description

All application data must be persisted to a database and reliably retrieved. This includes patients, appointments, medical records, symptoms, prescriptions, and transcripts. Data should survive server restarts and be available across different browser sessions. The system should handle concurrent access and maintain data integrity.

This is the foundational technical story that all other stories depend on.

---

## Acceptance Criteria

- [ ] Given I create a new patient, when I refresh the page, then the patient still exists
- [ ] Given I create an appointment, when I log out and log back in, then the appointment is still there
- [ ] Given I save a medical record, when I navigate away and return, then all record data is preserved
- [ ] Given I add symptoms to an appointment, when I reload the page, then symptoms are still attached to the appointment
- [ ] Given I add prescriptions to an appointment, when I view the appointment later, then prescriptions are displayed
- [ ] Given a transcript is generated, when I view the appointment later, then the transcript is available
- [ ] Given I edit patient information, when I save, then changes are persisted immediately
- [ ] Given the server restarts, when the server comes back online, then all data is intact
- [ ] Given I use the application, when data is being saved, then I see feedback (success/error messages)
- [ ] Given a save operation fails, when an error occurs, then I see an error message and my data is not lost from the form

---

## Priority

**Must-Have (P0)** - Infrastructure

---

## Story Points

**3 points**

Rationale: Standard database setup and CRUD operations, made simpler by using an ORM.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Database provisioning | External | - |

---

## Technical Notes

### Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  role         String    @default("doctor")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lastLoginAt  DateTime?

  patients     Patient[]
}

model Patient {
  id                          String    @id @default(uuid())
  userId                      String
  firstName                   String
  lastName                    String
  dateOfBirth                 DateTime
  sex                         String
  phone                       String
  email                       String?
  address                     String?
  emergencyContactName        String
  emergencyContactPhone       String
  emergencyContactRelationship String?
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt

  user         User          @relation(fields: [userId], references: [id])
  appointments Appointment[]
  allergies    Allergy[]
  conditions   ChronicCondition[]

  @@index([lastName, firstName])
  @@index([phone])
}

model Appointment {
  id        String   @id @default(uuid())
  patientId String
  date      DateTime
  type      String
  reason    String
  status    String   @default("in_progress")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  patient       Patient        @relation(fields: [patientId], references: [id])
  medicalRecord MedicalRecord?
  vitalSigns    VitalSigns?
  transcript    Transcript?

  @@index([patientId])
  @@index([date])
}

model MedicalRecord {
  id                     String   @id @default(uuid())
  appointmentId          String   @unique
  chiefComplaint         String?
  historyOfPresentIllness String?
  physicalExamNotes      String?
  diagnosis              String?
  diagnosisNotes         String?
  treatmentPlan          String?
  followUpInstructions   String?
  patientEducation       String?
  summary                String?
  aiGenerated            Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  appointment   Appointment    @relation(fields: [appointmentId], references: [id])
  symptoms      Symptom[]
  prescriptions Prescription[]
}

model Symptom {
  id              String   @id @default(uuid())
  medicalRecordId String
  name            String
  bodySite        String?
  severity        Int?
  duration        String?
  notes           String?
  aiExtracted     Boolean  @default(false)
  createdAt       DateTime @default(now())

  medicalRecord MedicalRecord @relation(fields: [medicalRecordId], references: [id])

  @@index([medicalRecordId])
}

model Prescription {
  id              String   @id @default(uuid())
  medicalRecordId String
  medicationName  String
  strength        String
  dosage          String
  frequency       String
  duration        String?
  quantity        Int?
  refills         Int?
  instructions    String
  indication      String?
  aiExtracted     Boolean  @default(false)
  createdAt       DateTime @default(now())

  medicalRecord MedicalRecord @relation(fields: [medicalRecordId], references: [id])

  @@index([medicalRecordId])
}

model VitalSigns {
  id              String   @id @default(uuid())
  appointmentId   String   @unique
  bloodPressureSystolic  Int?
  bloodPressureDiastolic Int?
  heartRate       Int?
  temperature     Float?
  temperatureUnit String?  @default("F")
  respiratoryRate Int?
  oxygenSaturation Int?
  weight          Float?
  weightUnit      String?  @default("lbs")
  height          Float?
  heightUnit      String?  @default("in")
  painLevel       Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  appointment Appointment @relation(fields: [appointmentId], references: [id])
}

model Transcript {
  id               String   @id @default(uuid())
  appointmentId    String   @unique
  audioUrl         String?
  audioFormat      String?
  audioDuration    Int?
  text             String?
  processingStatus String   @default("pending")
  errorMessage     String?
  createdAt        DateTime @default(now())
  processedAt      DateTime?

  appointment Appointment @relation(fields: [appointmentId], references: [id])
}

model Allergy {
  id           String   @id @default(uuid())
  patientId    String
  allergen     String
  reaction     String?
  severity     String?
  status       String   @default("active")
  notedDate    DateTime?
  createdAt    DateTime @default(now())

  patient Patient @relation(fields: [patientId], references: [id])

  @@index([patientId])
}

model ChronicCondition {
  id           String   @id @default(uuid())
  patientId    String
  condition    String
  diagnosedDate DateTime?
  status       String   @default("active")
  notes        String?
  createdAt    DateTime @default(now())

  patient Patient @relation(fields: [patientId], references: [id])

  @@index([patientId])
}
```

### Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌─────────────────┐
│   User   │────<│  Patient  │────<│   Appointment   │
└──────────┘     └───────────┘     └─────────────────┘
                      │                    │
                      │                    ├────── MedicalRecord ──┬── Symptom
                      │                    │                       └── Prescription
                      │                    ├────── VitalSigns
                      │                    └────── Transcript
                      │
                      ├────── Allergy
                      └────── ChronicCondition
```

### Implementation Considerations

- Use Prisma ORM for database access
- Use transactions for related data operations
- Implement optimistic updates for better UX
- Error handling with meaningful messages
- Database migrations for schema changes
- Index frequently queried fields
- Use connection pooling for production

### Database Providers (Free Tier Options)

1. **Neon** - PostgreSQL, generous free tier
2. **Supabase** - PostgreSQL, includes auth
3. **Railway** - PostgreSQL, simple setup
4. **PlanetScale** - MySQL, serverless

### API Layer Pattern

```typescript
// lib/db/patients.ts
import { prisma } from './client';

export async function createPatient(data: CreatePatientInput) {
  return prisma.patient.create({
    data: {
      ...data,
      userId: getCurrentUserId(),
    },
  });
}

export async function getPatients(userId: string, search?: string) {
  return prisma.patient.findMany({
    where: {
      userId,
      OR: search ? [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ] : undefined,
    },
    orderBy: { lastName: 'asc' },
  });
}

export async function getPatientWithAppointments(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { date: 'desc' },
        include: {
          medicalRecord: {
            include: {
              symptoms: true,
              prescriptions: true,
            },
          },
        },
      },
    },
  });
}
```

---

## UI/UX Notes

### Save Feedback

```
┌─────────────────────────────────────────────────────────────────┐
│                                              ✓ Saved           │
└─────────────────────────────────────────────────────────────────┘
```

### Saving State

```
┌─────────────────────────────────────────────────────────────────┐
│                                              ⏳ Saving...       │
└─────────────────────────────────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ Failed to save. Please try again.                  [Retry] │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Show loading states during save operations
- Display success confirmations (toast notifications)
- Show error messages when saves fail with retry option
- Implement auto-save for long forms (drafts)
- Offline indicator if connection is lost
- Don't lose user data on save failure (keep in form)

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Create patient | Valid data | Patient in database |
| Read patient | Patient ID | Patient data returned |
| Update patient | Modified data | Changes persisted |
| Delete patient | Patient ID | Patient removed |
| Create appointment | Valid data | Appointment in database |
| Relation integrity | Create appointment | Linked to patient |
| Transaction | Create record + symptoms | All or nothing |
| Concurrent access | Two simultaneous saves | Both succeed |
| Server restart | Restart server | Data intact |
| Invalid data | Missing required field | Error returned |

---

## Definition of Done

- [ ] Database schema created
- [ ] Prisma client configured
- [ ] CRUD operations for all entities
- [ ] Relationships working correctly
- [ ] Transactions for related operations
- [ ] Error handling implemented
- [ ] Loading states in UI
- [ ] Success/error feedback shown
- [ ] Data survives page refresh
- [ ] Data survives server restart
- [ ] Migrations work correctly
- [ ] Seed data script available
- [ ] Unit tests pass
- [ ] Manual QA verified
