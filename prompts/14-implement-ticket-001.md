# Prompt 14: Implement TICKET-001 - Database Schema

## Context
You are implementing the Medical Record System MVP. Project setup (TICKET-000) is complete.

## Prerequisites

### Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-001-database-schema.md` - Ticket requirements
- `docs/data-model/prisma-schema.md` - Complete schema reference
- `docs/data-model/entities/` - All entity documentation:
  - `provider.md` (User/Doctor)
  - `patient.md`
  - `appointment.md`
  - `medical-record.md`
  - `symptom.md`
  - `diagnosis.md`
  - `prescription.md`
  - `transcription.md`
- `docs/data-model/seed-data.md` - Test data requirements
- `docs/implementation/TICKET-000-completed.md` - Previous implementation notes

### Verify Setup
Before starting, verify TICKET-000 is complete:

```bash
# 1. Check PostgreSQL is running
docker ps | grep postgres
# Expected: health-record-postgres ... Up

# 2. Check backend package exists
ls packages/backend/package.json
# Should exist

# 3. Check Prisma is installed
cd packages/backend && pnpm prisma --version
# Should show Prisma version
```

**If any verification fails:** Go back to Prompt 13 and complete TICKET-000.

---

## Objective
Implement the complete database schema using Prisma, create initial migration, and seed with test data.

---

## Part 1: Create Complete Prisma Schema

### 1.1 Create the Schema
Replace `packages/backend/prisma/schema.prisma`:

```prisma
// Prisma Schema for Medical Record System
// Generated for TICKET-001

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER (Doctor/Provider)
// ============================================
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  firstName     String    @map("first_name")
  lastName      String    @map("last_name")
  specialty     String?
  licenseNumber String?   @map("license_number")

  // Relations
  patients      Patient[]

  // Timestamps
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

// ============================================
// PATIENT
// ============================================
model Patient {
  id                String        @id @default(uuid())
  userId            String        @map("user_id")
  firstName         String        @map("first_name")
  lastName          String        @map("last_name")
  dateOfBirth       DateTime      @map("date_of_birth")
  gender            Gender
  email             String?
  phone             String?
  address           String?
  bloodType         String?       @map("blood_type")
  allergies         String?       // Comma-separated or JSON
  chronicConditions String?       @map("chronic_conditions") // Comma-separated or JSON
  emergencyContactName  String?   @map("emergency_contact_name")
  emergencyContactPhone String?   @map("emergency_contact_phone")

  // Relations
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointments      Appointment[]

  // Timestamps
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@index([userId])
  @@index([lastName, firstName])
  @@map("patients")
}

enum Gender {
  male
  female
  other
}

// ============================================
// APPOINTMENT
// ============================================
model Appointment {
  id            String            @id @default(uuid())
  patientId     String            @map("patient_id")
  scheduledAt   DateTime          @map("scheduled_at")
  startedAt     DateTime?         @map("started_at")
  endedAt       DateTime?         @map("ended_at")
  status        AppointmentStatus @default(SCHEDULED)
  type          AppointmentType   @default(GENERAL)
  reasonForVisit String?          @map("reason_for_visit")
  notes         String?

  // Relations
  patient       Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  medicalRecord MedicalRecord?
  transcription Transcription?

  // Timestamps
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  @@index([patientId])
  @@index([scheduledAt])
  @@index([status])
  @@map("appointments")
}

enum AppointmentStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentType {
  GENERAL
  FOLLOW_UP
  EMERGENCY
  ROUTINE_CHECKUP
  SPECIALIST
}

// ============================================
// MEDICAL RECORD
// ============================================
model MedicalRecord {
  id             String         @id @default(uuid())
  appointmentId  String         @unique @map("appointment_id")

  // Clinical Notes
  chiefComplaint String?        @map("chief_complaint")
  presentIllness String?        @map("present_illness") @db.Text
  physicalExam   String?        @map("physical_exam") @db.Text
  assessment     String?        @db.Text
  plan           String?        @db.Text

  // AI-generated summary
  aiSummary      String?        @map("ai_summary") @db.Text

  // Relations
  appointment    Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  symptoms       Symptom[]
  diagnosis      Diagnosis?
  prescriptions  Prescription[]

  // Timestamps
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  @@map("medical_records")
}

// ============================================
// SYMPTOM
// ============================================
model Symptom {
  id              String        @id @default(uuid())
  medicalRecordId String        @map("medical_record_id")
  description     String
  severity        Severity?
  duration        String?
  onset           String?       // "sudden", "gradual", etc.
  bodySite        String?       @map("body_site")
  aiGenerated     Boolean       @default(false) @map("ai_generated")

  // Relations
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([medicalRecordId])
  @@map("symptoms")
}

enum Severity {
  MILD
  MODERATE
  SEVERE
}

// ============================================
// DIAGNOSIS
// ============================================
model Diagnosis {
  id              String        @id @default(uuid())
  medicalRecordId String        @unique @map("medical_record_id")
  description     String
  icdCode         String?       @map("icd_code") // ICD-10 code
  severity        Severity?
  notes           String?       @db.Text
  aiGenerated     Boolean       @default(false) @map("ai_generated")
  confidence      Float?        // AI confidence score (0-1)

  // Relations
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@map("diagnoses")
}

// ============================================
// PRESCRIPTION
// ============================================
model Prescription {
  id              String        @id @default(uuid())
  medicalRecordId String        @map("medical_record_id")
  medication      String
  dosage          String
  frequency       String
  duration        String
  route           String?       // "oral", "topical", etc.
  instructions    String?       @db.Text
  quantity        Int?
  refills         Int?          @default(0)
  aiGenerated     Boolean       @default(false) @map("ai_generated")

  // Relations
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([medicalRecordId])
  @@map("prescriptions")
}

// ============================================
// TRANSCRIPTION
// ============================================
model Transcription {
  id              String            @id @default(uuid())
  appointmentId   String            @unique @map("appointment_id")
  fullText        String?           @map("full_text") @db.Text
  segments        Json?             // Array of { start, end, text, speaker? }
  language        String?           @default("es")
  durationSeconds Int?              @map("duration_seconds")
  status          TranscriptionStatus @default(PENDING)

  // Processing timestamps
  startedAt       DateTime?         @map("started_at")
  completedAt     DateTime?         @map("completed_at")

  // Relations
  appointment     Appointment       @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  @@map("transcriptions")
}

enum TranscriptionStatus {
  PENDING
  RECORDING
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## Part 2: Create and Run Migration

### 2.1 Ensure Database is Running
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 2.2 Create Migration
```bash
cd packages/backend
npx prisma migrate dev --name init
```

**Expected output:**
```
Applying migration `YYYYMMDDHHMMSS_init`
The following migration(s) have been created and applied:
migrations/
  └─ YYYYMMDDHHMMSS_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

**If migration fails:**
- Check DATABASE_URL in `.env`
- Verify PostgreSQL is running
- Check for syntax errors in schema

### 2.3 Generate Prisma Client
```bash
npx prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

---

## Part 3: Create Seed Script

### 3.1 Create Seed File
Create `packages/backend/prisma/seed.ts`:

```typescript
import { PrismaClient, Gender, AppointmentStatus, AppointmentType, Severity } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ==========================================
  // 1. Create Test Doctor
  // ==========================================
  console.log('Creating test doctor...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@medrecord.com' },
    update: {},
    create: {
      email: 'doctor@medrecord.com',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'García',
      specialty: 'Medicina General',
      licenseNumber: 'MED-12345',
    },
  });

  console.log(`  ✓ Doctor created: ${doctor.email}`);

  // ==========================================
  // 2. Create Test Patients
  // ==========================================
  console.log('\nCreating test patients...');

  const patient1 = await prisma.patient.upsert({
    where: { id: 'patient-1-uuid-0001' },
    update: {},
    create: {
      id: 'patient-1-uuid-0001',
      userId: doctor.id,
      firstName: 'María',
      lastName: 'López Hernández',
      dateOfBirth: new Date('1985-03-15'),
      gender: Gender.female,
      email: 'maria.lopez@email.com',
      phone: '+52 555 123 4567',
      address: 'Calle Principal 123, Col. Centro, CDMX',
      bloodType: 'A+',
      allergies: 'Penicilina, Mariscos',
      chronicConditions: 'Hipertensión, Diabetes Tipo 2',
      emergencyContactName: 'Juan López',
      emergencyContactPhone: '+52 555 987 6543',
    },
  });
  console.log(`  ✓ Patient 1: ${patient1.firstName} ${patient1.lastName}`);

  const patient2 = await prisma.patient.upsert({
    where: { id: 'patient-2-uuid-0002' },
    update: {},
    create: {
      id: 'patient-2-uuid-0002',
      userId: doctor.id,
      firstName: 'Juan',
      lastName: 'Martínez García',
      dateOfBirth: new Date('1990-07-22'),
      gender: Gender.male,
      email: 'juan.martinez@email.com',
      phone: '+52 555 234 5678',
      address: 'Av. Reforma 456, Col. Roma, CDMX',
      bloodType: 'O-',
      allergies: null,
      chronicConditions: null,
      emergencyContactName: 'Ana Martínez',
      emergencyContactPhone: '+52 555 876 5432',
    },
  });
  console.log(`  ✓ Patient 2: ${patient2.firstName} ${patient2.lastName}`);

  const patient3 = await prisma.patient.upsert({
    where: { id: 'patient-3-uuid-0003' },
    update: {},
    create: {
      id: 'patient-3-uuid-0003',
      userId: doctor.id,
      firstName: 'Ana',
      lastName: 'Fernández Ruiz',
      dateOfBirth: new Date('1978-11-08'),
      gender: Gender.female,
      email: 'ana.fernandez@email.com',
      phone: '+52 555 345 6789',
      address: 'Calle Sur 789, Col. Del Valle, CDMX',
      bloodType: 'B+',
      allergies: 'Aspirina, Polen',
      chronicConditions: 'Asma',
      emergencyContactName: 'Roberto Fernández',
      emergencyContactPhone: '+52 555 765 4321',
    },
  });
  console.log(`  ✓ Patient 3: ${patient3.firstName} ${patient3.lastName}`);

  // ==========================================
  // 3. Create Sample Appointments
  // ==========================================
  console.log('\nCreating sample appointments...');

  // Completed appointment with full medical record
  const appointment1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      scheduledAt: new Date('2024-01-15T10:00:00'),
      startedAt: new Date('2024-01-15T10:05:00'),
      endedAt: new Date('2024-01-15T10:35:00'),
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.GENERAL,
      reasonForVisit: 'Dolor de cabeza persistente',
      notes: 'Paciente refiere dolor desde hace 3 días',
    },
  });
  console.log(`  ✓ Appointment 1 (completed): ${appointment1.id}`);

  // Scheduled future appointment
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  futureDate.setHours(14, 0, 0, 0);

  const appointment2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      scheduledAt: futureDate,
      status: AppointmentStatus.SCHEDULED,
      type: AppointmentType.ROUTINE_CHECKUP,
      reasonForVisit: 'Chequeo anual',
    },
  });
  console.log(`  ✓ Appointment 2 (scheduled): ${appointment2.id}`);

  // Another completed appointment
  const appointment3 = await prisma.appointment.create({
    data: {
      patientId: patient3.id,
      scheduledAt: new Date('2024-01-10T16:00:00'),
      startedAt: new Date('2024-01-10T16:10:00'),
      endedAt: new Date('2024-01-10T16:45:00'),
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.FOLLOW_UP,
      reasonForVisit: 'Seguimiento de asma',
    },
  });
  console.log(`  ✓ Appointment 3 (completed): ${appointment3.id}`);

  // ==========================================
  // 4. Create Medical Record with Full Data
  // ==========================================
  console.log('\nCreating medical records...');

  const medicalRecord1 = await prisma.medicalRecord.create({
    data: {
      appointmentId: appointment1.id,
      chiefComplaint: 'Dolor de cabeza persistente por 3 días',
      presentIllness: 'Paciente femenina de 38 años que refiere dolor de cabeza de tipo pulsátil, localizado en región frontal bilateral, de intensidad moderada (6/10), que inició hace 3 días de forma gradual. El dolor empeora con la luz brillante y el ruido. No refiere náuseas ni vómito. Ha tomado paracetamol con alivio parcial.',
      physicalExam: 'PA: 130/85 mmHg, FC: 78 lpm, Temp: 36.5°C, Peso: 68 kg\n\nPaciente consciente, orientada, cooperadora.\nPupilas isocóricas, reactivas a la luz.\nNo rigidez de nuca.\nReflejos osteotendinosos normales.\nNo déficit motor ni sensitivo.',
      assessment: 'Cefalea tensional episódica, probablemente relacionada con estrés y tensión muscular cervical. Descartar componente migrañoso si persiste.',
      plan: '1. Ibuprofeno 400mg c/8h por 5 días con alimentos\n2. Aplicar compresas tibias en cuello\n3. Técnicas de relajación\n4. Evitar pantallas por períodos prolongados\n5. Control en 1 semana si no mejora',
    },
  });
  console.log(`  ✓ Medical Record 1: ${medicalRecord1.id}`);

  // Add symptoms
  await prisma.symptom.createMany({
    data: [
      {
        medicalRecordId: medicalRecord1.id,
        description: 'Dolor de cabeza pulsátil',
        severity: Severity.MODERATE,
        duration: '3 días',
        onset: 'gradual',
        bodySite: 'Región frontal bilateral',
        aiGenerated: false,
      },
      {
        medicalRecordId: medicalRecord1.id,
        description: 'Fotofobia',
        severity: Severity.MILD,
        duration: '3 días',
        onset: 'gradual',
        aiGenerated: false,
      },
      {
        medicalRecordId: medicalRecord1.id,
        description: 'Fonofobia',
        severity: Severity.MILD,
        duration: '3 días',
        onset: 'gradual',
        aiGenerated: false,
      },
    ],
  });
  console.log('  ✓ Symptoms added');

  // Add diagnosis
  await prisma.diagnosis.create({
    data: {
      medicalRecordId: medicalRecord1.id,
      description: 'Cefalea tensional episódica',
      icdCode: 'G44.2',
      severity: Severity.MODERATE,
      notes: 'Probablemente relacionada con estrés laboral y postura prolongada frente a computadora.',
      aiGenerated: false,
    },
  });
  console.log('  ✓ Diagnosis added');

  // Add prescriptions
  await prisma.prescription.createMany({
    data: [
      {
        medicalRecordId: medicalRecord1.id,
        medication: 'Ibuprofeno',
        dosage: '400 mg',
        frequency: 'Cada 8 horas',
        duration: '5 días',
        route: 'oral',
        instructions: 'Tomar con alimentos. No exceder 1200mg al día.',
        quantity: 15,
        refills: 0,
        aiGenerated: false,
      },
    ],
  });
  console.log('  ✓ Prescriptions added');

  // Create medical record for appointment 3
  const medicalRecord3 = await prisma.medicalRecord.create({
    data: {
      appointmentId: appointment3.id,
      chiefComplaint: 'Seguimiento de asma',
      presentIllness: 'Paciente con diagnóstico de asma desde hace 10 años. Acude a control. Refiere buen control de síntomas con tratamiento actual. Sin exacerbaciones en los últimos 3 meses. Utiliza salbutamol de rescate aproximadamente 1 vez por semana.',
      physicalExam: 'PA: 118/72 mmHg, FC: 70 lpm, SatO2: 98%\n\nCampos pulmonares con murmullo vesicular conservado, sin sibilancias ni estertores.\nNo uso de músculos accesorios.',
      assessment: 'Asma bronquial controlada.',
      plan: '1. Continuar tratamiento actual\n2. Mantener salbutamol de rescate\n3. Próxima cita en 3 meses\n4. Vacuna contra influenza anual',
    },
  });
  console.log(`  ✓ Medical Record 3: ${medicalRecord3.id}`);

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n========================================');
  console.log('🎉 Seed completed successfully!');
  console.log('========================================');
  console.log('\nTest Credentials:');
  console.log('  Email: doctor@medrecord.com');
  console.log('  Password: password123');
  console.log('\nData Created:');
  console.log('  - 1 Doctor');
  console.log('  - 3 Patients');
  console.log('  - 3 Appointments (2 completed, 1 scheduled)');
  console.log('  - 2 Medical Records with full data');
  console.log('  - 3 Symptoms');
  console.log('  - 1 Diagnosis');
  console.log('  - 1 Prescription');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3.2 Run Seed
```bash
cd packages/backend
pnpm db:seed
```

**Expected output:**
```
🌱 Starting database seed...

Creating test doctor...
  ✓ Doctor created: doctor@medrecord.com

Creating test patients...
  ✓ Patient 1: María López Hernández
  ✓ Patient 2: Juan Martínez García
  ✓ Patient 3: Ana Fernández Ruiz
...
🎉 Seed completed successfully!
```

---

## Part 4: Verify Database

### 4.1 Open Prisma Studio
```bash
cd packages/backend
pnpm db:studio
```

This opens http://localhost:5555 in your browser.

### 4.2 Verify Data
Check the following in Prisma Studio:

| Table | Expected Records |
|-------|-----------------|
| User | 1 (doctor@medrecord.com) |
| Patient | 3 |
| Appointment | 3 |
| MedicalRecord | 2 |
| Symptom | 3 |
| Diagnosis | 1 |
| Prescription | 1 |

---

## Part 5: Create Database Tests

### 5.1 Create Database Connection Test
Create `packages/backend/tests/integration/database.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Gender, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Schema', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });
  });

  describe('User table', () => {
    it('should have seeded user', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'doctor@medrecord.com' },
      });

      expect(user).not.toBeNull();
      expect(user?.firstName).toBe('Carlos');
      expect(user?.lastName).toBe('García');
      expect(user?.specialty).toBe('Medicina General');
    });

    it('should have password hash stored', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'doctor@medrecord.com' },
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe('password123'); // Should be hashed
    });
  });

  describe('Patient table', () => {
    it('should have seeded patients', async () => {
      const patients = await prisma.patient.findMany();
      expect(patients.length).toBeGreaterThanOrEqual(3);
    });

    it('should have correct patient-user relationship', async () => {
      const patient = await prisma.patient.findFirst({
        include: { user: true },
      });

      expect(patient?.user).toBeDefined();
      expect(patient?.user.email).toBe('doctor@medrecord.com');
    });

    it('should support gender enum', async () => {
      const femalePatient = await prisma.patient.findFirst({
        where: { gender: Gender.female },
      });

      expect(femalePatient).not.toBeNull();
    });
  });

  describe('Appointment table', () => {
    it('should have seeded appointments', async () => {
      const appointments = await prisma.appointment.findMany();
      expect(appointments.length).toBeGreaterThanOrEqual(3);
    });

    it('should have correct appointment-patient relationship', async () => {
      const appointment = await prisma.appointment.findFirst({
        include: { patient: true },
      });

      expect(appointment?.patient).toBeDefined();
    });

    it('should support status enum', async () => {
      const completedAppointment = await prisma.appointment.findFirst({
        where: { status: AppointmentStatus.COMPLETED },
      });

      expect(completedAppointment).not.toBeNull();
    });
  });

  describe('Medical Record with relations', () => {
    it('should have medical records with all relations', async () => {
      const record = await prisma.medicalRecord.findFirst({
        include: {
          appointment: true,
          symptoms: true,
          diagnosis: true,
          prescriptions: true,
        },
      });

      expect(record).not.toBeNull();
      expect(record?.appointment).toBeDefined();
      expect(record?.symptoms.length).toBeGreaterThan(0);
    });

    it('should have one-to-one relationship with appointment', async () => {
      const appointment = await prisma.appointment.findFirst({
        where: { status: AppointmentStatus.COMPLETED },
        include: { medicalRecord: true },
      });

      expect(appointment?.medicalRecord).toBeDefined();
    });
  });

  describe('Cascade delete', () => {
    it('should cascade delete symptoms when medical record is deleted', async () => {
      // Create test data
      const user = await prisma.user.findFirst();
      const patient = await prisma.patient.create({
        data: {
          userId: user!.id,
          firstName: 'Test',
          lastName: 'Cascade',
          dateOfBirth: new Date('2000-01-01'),
          gender: Gender.other,
        },
      });

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          scheduledAt: new Date(),
          status: AppointmentStatus.COMPLETED,
        },
      });

      const record = await prisma.medicalRecord.create({
        data: {
          appointmentId: appointment.id,
          chiefComplaint: 'Test complaint',
        },
      });

      await prisma.symptom.create({
        data: {
          medicalRecordId: record.id,
          description: 'Test symptom',
        },
      });

      // Delete medical record
      await prisma.medicalRecord.delete({
        where: { id: record.id },
      });

      // Verify symptom is deleted
      const symptom = await prisma.symptom.findFirst({
        where: { medicalRecordId: record.id },
      });
      expect(symptom).toBeNull();

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointment.id } });
      await prisma.patient.delete({ where: { id: patient.id } });
    });
  });
});
```

### 5.2 Run Database Tests
```bash
cd packages/backend
pnpm test
```

**Expected output:**
```
 ✓ tests/integration/database.test.ts
   ✓ Database Schema > Connection > should connect to the database
   ✓ Database Schema > User table > should have seeded user
   ✓ Database Schema > User table > should have password hash stored
   ✓ Database Schema > Patient table > should have seeded patients
   ...
```

---

## Testing & Debugging Phase

**CRITICAL: Do NOT proceed to commit until ALL verification steps pass.**

### Step 1: Verify Migration Applied
```bash
cd packages/backend
npx prisma migrate status
```

**Expected:** `Database schema is up to date!`

### Step 2: Verify Prisma Client Generated
```bash
ls packages/backend/node_modules/.prisma/client/index.js
# Should exist
```

### Step 3: Run All Tests
```bash
cd packages/backend
pnpm test
```

**All tests must pass.**

### Step 4: Verify Data in Prisma Studio
```bash
pnpm db:studio
```

Check all tables have expected data.

### Step 5: Verify Types Work
```bash
cd packages/backend
pnpm tsc --noEmit
```

**No TypeScript errors.**

---

## Debugging Reference

### Common Issues

| Issue | Solution |
|-------|----------|
| `P1001: Can't reach database` | Start database: `docker-compose up -d` |
| `P1003: Database does not exist` | Check DATABASE_URL in `.env` |
| Migration failed | Delete `migrations/` folder and retry |
| Seed failed | Check for unique constraint violations |
| `@prisma/client not found` | Run `pnpm db:generate` |

### Reset Database
If you need to start fresh:
```bash
# Drop all data and re-migrate
cd packages/backend
npx prisma migrate reset --force
```

---

## Commit (Only After ALL Tests Pass)

```bash
git add .
git commit -m "feat: implement database schema with Prisma

- Define User entity (doctor/provider)
- Define Patient entity with demographics and medical info
- Define Appointment entity with status workflow
- Define MedicalRecord with clinical notes
- Define Symptom, Diagnosis, Prescription entities
- Define Transcription entity for AI features
- Create enums: Gender, AppointmentStatus, AppointmentType, Severity
- Add database indexes for common queries
- Create initial migration
- Add comprehensive seed script with test data
- Add database integration tests

Test credentials:
- Email: doctor@medrecord.com
- Password: password123

TICKET-001"
```

---

## Documentation

Create `docs/implementation/TICKET-001-completed.md`:

```markdown
# TICKET-001 Implementation Complete

## Date
[Current Date]

## Summary
Database schema implemented using Prisma ORM with PostgreSQL.

## Entities Created
- User (1 record)
- Patient (3 records)
- Appointment (3 records)
- MedicalRecord (2 records)
- Symptom (3 records)
- Diagnosis (1 record)
- Prescription (1 record)
- Transcription (0 records - created via AI feature)

## Test Credentials
- **Email:** doctor@medrecord.com
- **Password:** password123

## Commands
```bash
# Generate client after schema changes
pnpm db:generate

# Create new migration
pnpm db:migrate

# Reset database
npx prisma migrate reset --force

# Open Prisma Studio
pnpm db:studio

# Run seed
pnpm db:seed
```

## Tests
All 12 database tests passing.

## Notes
- Schema uses snake_case for database columns via @map
- Enums defined for type safety
- Cascade delete configured for related entities
```

---

## Definition of Done Checklist

- [ ] Prisma schema created with all entities
- [ ] Enums defined (Gender, AppointmentStatus, etc.)
- [ ] Indexes created for common queries
- [ ] Migration created and applied
- [ ] Prisma client generated
- [ ] Seed script created
- [ ] Test data seeded successfully
- [ ] Data visible in Prisma Studio
- [ ] All integration tests passing
- [ ] TypeScript compiles without errors
- [ ] Code committed

---

## Next Prompt

Proceed to `15-implement-ticket-002-003.md` for authentication implementation.
