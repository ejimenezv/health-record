# Prisma Schema

## Overview

This document contains the complete Prisma schema for the Medical Record System MVP. The schema uses PostgreSQL as the database provider and defines all models, enums, relations, and indexes.

---

## Complete Schema

```prisma
// prisma/schema.prisma
// Medical Record System MVP - Prisma Schema

// ============================================
// DATABASE CONFIGURATION
// ============================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================
// ENUMS
// ============================================

enum Sex {
  male
  female
  other
}

enum AllergySeverity {
  mild
  moderate
  severe
  life_threatening
}

enum AppointmentType {
  new_patient
  follow_up
  routine_checkup
  sick_visit
  telehealth
}

enum AppointmentStatus {
  scheduled
  checked_in
  in_progress
  completed
  cancelled
  no_show
}

// ============================================
// MODELS
// ============================================

/// Healthcare provider (doctor) who uses the system
model Provider {
  id            String        @id @default(uuid())
  email         String        @unique
  passwordHash  String
  firstName     String
  lastName      String
  specialty     String?
  licenseNumber String?
  phone         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  appointments  Appointment[]

  @@map("providers")
}

/// Patient receiving medical care
model Patient {
  id                           String             @id @default(uuid())
  firstName                    String
  lastName                     String
  dateOfBirth                  DateTime           @db.Date
  sex                          Sex
  phone                        String
  email                        String?
  address                      String?
  emergencyContactName         String
  emergencyContactPhone        String
  emergencyContactRelationship String?
  createdAt                    DateTime           @default(now())
  updatedAt                    DateTime           @updatedAt
  allergies                    Allergy[]
  chronicConditions            ChronicCondition[]
  appointments                 Appointment[]

  @@index([lastName, firstName])
  @@index([phone])
  @@index([email])
  @@map("patients")
}

/// Patient allergy information
model Allergy {
  id        String           @id @default(uuid())
  patientId String
  patient   Patient          @relation(fields: [patientId], references: [id], onDelete: Cascade)
  allergen  String
  reaction  String?
  severity  AllergySeverity?
  onsetDate DateTime?        @db.Date
  createdAt DateTime         @default(now())

  @@index([patientId])
  @@map("allergies")
}

/// Patient chronic medical condition
model ChronicCondition {
  id            String    @id @default(uuid())
  patientId     String
  patient       Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  conditionName String
  diagnosisDate DateTime? @db.Date
  status        String?   @default("active")
  notes         String?
  createdAt     DateTime  @default(now())

  @@index([patientId])
  @@map("chronic_conditions")
}

/// Patient appointment/visit
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

/// Medical record for an appointment (SOAP format)
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

/// Symptom recorded during appointment
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

/// Medication prescription
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

/// Vital signs recorded during appointment
model VitalSigns {
  id                     String      @id @default(uuid())
  appointmentId          String      @unique
  appointment            Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  bloodPressureSystolic  Int?
  bloodPressureDiastolic Int?
  heartRate              Int?
  temperature            Decimal?    @db.Decimal(4, 1)
  respiratoryRate        Int?
  oxygenSaturation       Int?
  weight                 Decimal?    @db.Decimal(5, 2)
  height                 Decimal?    @db.Decimal(5, 2)
  bmi                    Decimal?    @db.Decimal(4, 1)
  painLevel              Int?        @db.SmallInt
  recordedAt             DateTime    @default(now())

  @@map("vital_signs")
}
```

---

## Schema Organization

### Datasource & Generator

| Configuration | Value | Purpose |
|---------------|-------|---------|
| Provider | `postgresql` | PostgreSQL database |
| Client | `prisma-client-js` | TypeScript/JavaScript client |

### Enums

| Enum | Values | Purpose |
|------|--------|---------|
| `Sex` | male, female, other | Patient biological sex |
| `AllergySeverity` | mild, moderate, severe, life_threatening | Allergy severity classification |
| `AppointmentType` | new_patient, follow_up, routine_checkup, sick_visit, telehealth | Visit type classification |
| `AppointmentStatus` | scheduled, checked_in, in_progress, completed, cancelled, no_show | Appointment lifecycle states |

### Models Summary

| Model | Table Name | Primary Use |
|-------|------------|-------------|
| Provider | `providers` | Healthcare provider accounts |
| Patient | `patients` | Patient demographics |
| Allergy | `allergies` | Patient allergies |
| ChronicCondition | `chronic_conditions` | Patient chronic conditions |
| Appointment | `appointments` | Patient visits |
| MedicalRecord | `medical_records` | Clinical documentation |
| Symptom | `symptoms` | Documented symptoms |
| Prescription | `prescriptions` | Prescribed medications |
| VitalSigns | `vital_signs` | Vital measurements |

---

## Data Type Mappings

| Prisma Type | PostgreSQL Type | Usage |
|-------------|-----------------|-------|
| `String` | `VARCHAR(255)` | Short text fields |
| `String @db.Text` | `TEXT` | Long text fields (notes, transcript) |
| `Int` | `INTEGER` | Standard integers |
| `Int @db.SmallInt` | `SMALLINT` | Small integers (severity 1-10) |
| `DateTime` | `TIMESTAMP` | Full timestamps |
| `DateTime @db.Date` | `DATE` | Date only (no time) |
| `Decimal @db.Decimal(p, s)` | `DECIMAL(p, s)` | Precise decimals (vitals) |
| `Boolean` | `BOOLEAN` | True/false flags |
| `@id @default(uuid())` | `UUID PRIMARY KEY` | Auto-generated UUIDs |

---

## Relation Patterns

### One-to-Many (1:N)

```prisma
// Parent side
model Patient {
  appointments Appointment[]
}

// Child side
model Appointment {
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
}
```

### One-to-One (1:1)

```prisma
// Parent side
model Appointment {
  medicalRecord MedicalRecord?
}

// Child side (owns the FK)
model MedicalRecord {
  appointmentId String      @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
}
```

---

## Cascade Delete Behavior

| When Deleting | These Are Deleted |
|---------------|-------------------|
| Patient | Allergies, ChronicConditions, Appointments (and their children) |
| Appointment | MedicalRecord, VitalSigns |
| MedicalRecord | Symptoms, Prescriptions |

---

## Index Strategy

### Automatic Indexes

Prisma automatically creates indexes for:
- Primary keys (`@id`)
- Unique constraints (`@unique`)
- Foreign keys in relations

### Explicit Indexes

| Model | Index | Purpose |
|-------|-------|---------|
| Patient | `[lastName, firstName]` | Name search optimization |
| Patient | `[phone]` | Phone lookup |
| Patient | `[email]` | Email lookup |
| Appointment | `[patientId]` | Patient history queries |
| Appointment | `[providerId]` | Provider schedule queries |
| Appointment | `[appointmentDate]` | Date range filtering |
| Appointment | `[status]` | Status filtering |
| Symptom | `[medicalRecordId]` | Record symptoms lookup |
| Prescription | `[medicalRecordId]` | Record prescriptions lookup |
| Allergy | `[patientId]` | Patient allergies lookup |
| ChronicCondition | `[patientId]` | Patient conditions lookup |

---

## Schema File Location

```
project-root/
├── prisma/
│   ├── schema.prisma      # Main schema file
│   ├── migrations/        # Migration history
│   └── seed.ts           # Seed data script
```

---

## Common Operations

### Generate Prisma Client

```bash
npx prisma generate
```

### Create Migration

```bash
npx prisma migrate dev --name migration_name
```

### Apply Migrations

```bash
npx prisma migrate deploy
```

### Open Prisma Studio

```bash
npx prisma studio
```

### Reset Database

```bash
npx prisma migrate reset
```

---

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [ER Design](./er-design.md)
- [Database Technology Stack](../tech-stack/database.md)
- [Indexes Documentation](./indexes.md)
- [Migrations Strategy](./migrations.md)
