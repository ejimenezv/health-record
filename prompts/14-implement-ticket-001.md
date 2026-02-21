# Prompt 14: Implement TICKET-001 - Database Schema

## Context
You are implementing the Medical Record System MVP. Project setup (TICKET-000) is complete.

## Prerequisites
Read the following documentation files:
- `docs/tickets/TICKET-001-database-schema.md`
- `docs/data-model/prisma-schema.md`
- `docs/data-model/entities/` (all entity files)
- `docs/data-model/seed-data.md`
- `docs/implementation/TICKET-000-completed.md` (verify setup)

Verify prerequisites:
- PostgreSQL running via Docker (`docker ps`)
- Backend package installed (`packages/backend/node_modules` exists)

## Objective
Implement the complete database schema using Prisma, create initial migration, and seed with test data.

## Implementation Tasks

### 1. Create Complete Prisma Schema
Edit `packages/backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  specialty     String?
  licenseNumber String?
  patients      Patient[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

model Patient {
  id                String        @id @default(uuid())
  userId            String
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName         String
  lastName          String
  dateOfBirth       DateTime
  gender            String
  email             String?
  phone             String?
  address           String?
  bloodType         String?
  allergies         String?
  chronicConditions String?
  appointments      Appointment[]
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@index([userId])
  @@index([lastName, firstName])
  @@map("patients")
}

model Appointment {
  id            String            @id @default(uuid())
  patientId     String
  patient       Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  scheduledAt   DateTime
  startedAt     DateTime?
  endedAt       DateTime?
  status        AppointmentStatus @default(SCHEDULED)
  notes         String?
  medicalRecord MedicalRecord?
  transcription Transcription?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@index([patientId])
  @@index([scheduledAt])
  @@map("appointments")
}

enum AppointmentStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model MedicalRecord {
  id             String         @id @default(uuid())
  appointmentId  String         @unique
  appointment    Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  chiefComplaint String?
  presentIllness String?
  physicalExam   String?
  assessment     String?
  plan           String?
  symptoms       Symptom[]
  diagnosis      Diagnosis?
  prescriptions  Prescription[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@map("medical_records")
}

model Symptom {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  description     String
  severity        String?
  duration        String?
  onset           String?
  aiGenerated     Boolean       @default(false)
  createdAt       DateTime      @default(now())

  @@index([medicalRecordId])
  @@map("symptoms")
}

model Diagnosis {
  id              String        @id @default(uuid())
  medicalRecordId String        @unique
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  description     String
  icdCode         String?
  severity        String?
  aiGenerated     Boolean       @default(false)
  confidence      Float?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("diagnoses")
}

model Prescription {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  medication      String
  dosage          String
  frequency       String
  duration        String
  instructions    String?
  aiGenerated     Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([medicalRecordId])
  @@map("prescriptions")
}

model Transcription {
  id              String      @id @default(uuid())
  appointmentId   String      @unique
  appointment     Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  fullText        String?
  segments        Json?
  language        String?     @default("es")
  durationSeconds Int?
  status          String      @default("pending")
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@map("transcriptions")
}
```

### 2. Create Initial Migration
```bash
cd packages/backend
npx prisma migrate dev --name init
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Create Seed Script
Create `packages/backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test doctor
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

  console.log('Created doctor:', doctor.email);

  // Create test patients
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'patient-1' },
      update: {},
      create: {
        id: 'patient-1',
        userId: doctor.id,
        firstName: 'María',
        lastName: 'López',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'female',
        email: 'maria.lopez@email.com',
        phone: '+34612345678',
        bloodType: 'A+',
        allergies: 'Penicilina',
        chronicConditions: 'Hipertensión',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-2' },
      update: {},
      create: {
        id: 'patient-2',
        userId: doctor.id,
        firstName: 'Juan',
        lastName: 'Martínez',
        dateOfBirth: new Date('1990-07-22'),
        gender: 'male',
        email: 'juan.martinez@email.com',
        phone: '+34698765432',
        bloodType: 'O-',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-3' },
      update: {},
      create: {
        id: 'patient-3',
        userId: doctor.id,
        firstName: 'Ana',
        lastName: 'Fernández',
        dateOfBirth: new Date('1978-11-08'),
        gender: 'female',
        email: 'ana.fernandez@email.com',
        phone: '+34654321987',
        bloodType: 'B+',
        allergies: 'Aspirina, Polen',
        chronicConditions: 'Diabetes tipo 2, Asma',
      },
    }),
  ]);

  console.log('Created patients:', patients.length);

  // Create a sample appointment with medical record
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      scheduledAt: new Date('2024-01-15T10:00:00'),
      startedAt: new Date('2024-01-15T10:05:00'),
      endedAt: new Date('2024-01-15T10:35:00'),
      status: 'COMPLETED',
      notes: 'Consulta de seguimiento',
      medicalRecord: {
        create: {
          chiefComplaint: 'Dolor de cabeza persistente',
          presentIllness: 'Paciente refiere dolor de cabeza desde hace 3 días, de intensidad moderada, localizado en región frontal.',
          physicalExam: 'PA: 130/85, FC: 78, Temp: 36.5°C. Paciente consciente y orientada.',
          assessment: 'Cefalea tensional',
          plan: 'Se prescribe analgésico. Control en 1 semana si no mejora.',
          symptoms: {
            create: [
              { description: 'Dolor de cabeza', severity: 'moderate', duration: '3 días', onset: 'gradual' },
              { description: 'Tensión muscular cervical', severity: 'mild' },
            ],
          },
          diagnosis: {
            create: {
              description: 'Cefalea tensional',
              icdCode: 'G44.2',
              severity: 'moderate',
            },
          },
          prescriptions: {
            create: [
              {
                medication: 'Ibuprofeno',
                dosage: '400mg',
                frequency: 'Cada 8 horas',
                duration: '5 días',
                instructions: 'Tomar con alimentos',
              },
            ],
          },
        },
      },
    },
  });

  console.log('Created sample appointment:', appointment.id);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 5. Update Backend package.json
Add to `packages/backend/package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  }
}
```

### 6. Run Seed
```bash
pnpm db:seed
```

### 7. Verify Database
Open Prisma Studio to verify data:
```bash
pnpm db:studio
```

Check:
- 1 User exists
- 3 Patients exist
- 1 Appointment with MedicalRecord, Symptoms, Diagnosis, Prescription

## Testing
Create `packages/backend/tests/integration/database.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Schema', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have users table', async () => {
    const users = await prisma.user.findMany();
    expect(users).toBeDefined();
  });

  it('should have patients table with correct relations', async () => {
    const patient = await prisma.patient.findFirst({
      include: { user: true, appointments: true },
    });
    expect(patient?.user).toBeDefined();
  });

  it('should have medical records with all relations', async () => {
    const record = await prisma.medicalRecord.findFirst({
      include: {
        appointment: true,
        symptoms: true,
        diagnosis: true,
        prescriptions: true,
      },
    });
    if (record) {
      expect(record.appointment).toBeDefined();
    }
  });
});
```

Run tests:
```bash
cd packages/backend
pnpm test
```

## Commit
```bash
git add .
git commit -m "feat: implement database schema with Prisma

- Define all entities: User, Patient, Appointment, MedicalRecord
- Define related entities: Symptom, Diagnosis, Prescription, Transcription
- Create AppointmentStatus enum
- Add database indexes for common queries
- Create initial migration
- Add seed script with test data
- Add database integration tests

TICKET-001"
```

## Documentation
Create `docs/implementation/TICKET-001-completed.md`:
- Confirm all entities created
- Document seed data credentials (doctor@medrecord.com / password123)
- List any schema adjustments made
- Confirm tests passing

## Definition of Done Checklist
- [ ] Complete Prisma schema defined
- [ ] Migration created and applied
- [ ] Prisma client generated
- [ ] Seed script created and run
- [ ] Test data visible in Prisma Studio
- [ ] Integration tests passing
- [ ] Code committed

## Next Prompt
Proceed to `15-implement-ticket-002.md` for authentication backend.
