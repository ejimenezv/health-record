# Prompt 06: Data Modeling

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the SEVENTH prompt in the series. Previous prompts completed research, product definition, user stories, architecture, tech stack, and AI integration specifications.

## Prerequisites
Before proceeding, read the following files:
- `docs/research/mvp-fields-selection.md`
- `docs/product/features.md`
- `docs/stories/must-have-stories.md`
- `docs/architecture/components.md`
- `docs/tech-stack/database.md`
- `docs/ai-integration/interfaces.md`

## Objective
Design the complete data model for the Medical Record System MVP using Prisma ORM. This includes entity definitions, relationships, constraints, and database schema design.

## Tasks

### 1. Entity-Relationship Design
Create `docs/data-model/er-design.md` with:

**Core Entities**:
- User (Doctor)
- Patient
- Appointment
- MedicalRecord
- Symptom
- Diagnosis
- Prescription
- Transcription

**Relationships**:
- Doctor has many Patients (1:N)
- Patient has many Appointments (1:N)
- Appointment has one MedicalRecord (1:1)
- MedicalRecord has many Symptoms (1:N)
- MedicalRecord has one Diagnosis (1:1, optional)
- MedicalRecord has many Prescriptions (1:N)
- Appointment has one Transcription (1:1, optional)

### 2. Create Mermaid ER Diagram
Create `docs/data-model/diagrams/er-diagram.md` with:

```mermaid
erDiagram
    User ||--o{ Patient : manages
    Patient ||--o{ Appointment : has
    Appointment ||--|| MedicalRecord : contains
    Appointment ||--o| Transcription : has
    MedicalRecord ||--o{ Symptom : includes
    MedicalRecord ||--o| Diagnosis : has
    MedicalRecord ||--o{ Prescription : includes

    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        string specialty
        string licenseNumber
        datetime createdAt
        datetime updatedAt
    }

    Patient {
        uuid id PK
        uuid userId FK
        string firstName
        string lastName
        date dateOfBirth
        string gender
        string email
        string phone
        string address
        string bloodType
        text allergies
        text chronicConditions
        datetime createdAt
        datetime updatedAt
    }

    Appointment {
        uuid id PK
        uuid patientId FK
        datetime scheduledAt
        datetime startedAt
        datetime endedAt
        string status
        text notes
        datetime createdAt
        datetime updatedAt
    }

    MedicalRecord {
        uuid id PK
        uuid appointmentId FK UK
        text chiefComplaint
        text presentIllness
        text physicalExam
        text assessment
        text plan
        datetime createdAt
        datetime updatedAt
    }

    Symptom {
        uuid id PK
        uuid medicalRecordId FK
        string description
        string severity
        string duration
        string onset
        boolean aiGenerated
        datetime createdAt
    }

    Diagnosis {
        uuid id PK
        uuid medicalRecordId FK UK
        string description
        string icdCode
        string severity
        boolean aiGenerated
        float confidence
        datetime createdAt
        datetime updatedAt
    }

    Prescription {
        uuid id PK
        uuid medicalRecordId FK
        string medication
        string dosage
        string frequency
        string duration
        text instructions
        boolean aiGenerated
        datetime createdAt
        datetime updatedAt
    }

    Transcription {
        uuid id PK
        uuid appointmentId FK UK
        text fullText
        json segments
        string language
        int durationSeconds
        string status
        datetime startedAt
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }
```

### 3. Create Prisma Schema
Create `docs/data-model/prisma-schema.md` with complete Prisma schema:

```prisma
// This is your Prisma schema file

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
  user              User          @relation(fields: [userId], references: [id])
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

  @@map("patients")
}

model Appointment {
  id            String         @id @default(uuid())
  patientId     String
  patient       Patient        @relation(fields: [patientId], references: [id])
  scheduledAt   DateTime
  startedAt     DateTime?
  endedAt       DateTime?
  status        AppointmentStatus @default(SCHEDULED)
  notes         String?
  medicalRecord MedicalRecord?
  transcription Transcription?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("appointments")
}

enum AppointmentStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model MedicalRecord {
  id             String        @id @default(uuid())
  appointmentId  String        @unique
  appointment    Appointment   @relation(fields: [appointmentId], references: [id])
  chiefComplaint String?
  presentIllness String?
  physicalExam   String?
  assessment     String?
  plan           String?
  symptoms       Symptom[]
  diagnosis      Diagnosis?
  prescriptions  Prescription[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@map("medical_records")
}

// ... continue with all other models
```

### 4. Define Entity Details
Create individual entity documentation in `docs/data-model/entities/`:

**`user.md`**:
- All fields with types, constraints, descriptions
- Validation rules
- Default values
- Indexes

**`patient.md`**:
- All fields with types, constraints, descriptions
- Required vs optional fields
- Field length limits

**`appointment.md`**:
- Status enum values and transitions
- Scheduling constraints
- Relationship details

**`medical-record.md`**:
- SOAP note structure
- Relationship with symptoms, diagnosis, prescriptions
- Cascading behavior

**`symptom.md`**:
- Field definitions
- AI-generated flag usage

**`diagnosis.md`**:
- ICD code handling
- Confidence score usage

**`prescription.md`**:
- Medication validation
- Dosage format

**`transcription.md`**:
- Segments JSON structure
- Status transitions

### 5. Define Database Indexes
Create `docs/data-model/indexes.md` with:
- Primary indexes (automatic)
- Foreign key indexes
- Search optimization indexes
- Composite indexes

### 6. Define Database Migrations Strategy
Create `docs/data-model/migrations.md` with:
- Migration naming conventions
- Initial migration content
- Seed data strategy
- Development vs production considerations

### 7. Create Seed Data
Create `docs/data-model/seed-data.md` with:
- Test user (doctor) data
- Sample patients (3-5)
- Sample appointments with medical records
- Seed script structure

### 8. Fill Template Section 3 (Spanish)
Create `docs/deliverables/section-3-modelo-datos.md` with the content for Section 3 of `plantilla-de-trabajo.md` in Spanish:

```markdown
## 3. Modelo de Datos

### 3.1. Diagrama del modelo de datos:

```mermaid
[Include the complete ER diagram]
```

### 3.2. Descripción de entidades principales:

#### Usuario (User)
| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| email | String | UNIQUE, NOT NULL | Correo electrónico |
| passwordHash | String | NOT NULL | Hash de contraseña |
| firstName | String | NOT NULL | Nombre |
| lastName | String | NOT NULL | Apellido |
| specialty | String | NULL | Especialidad médica |
| licenseNumber | String | NULL | Número de licencia |
| createdAt | DateTime | NOT NULL | Fecha de creación |
| updatedAt | DateTime | NOT NULL | Fecha de actualización |

**Relaciones:**
- Un usuario tiene muchos pacientes (1:N)

---

#### Paciente (Patient)
[Complete table with all fields in Spanish]

**Relaciones:**
- Un paciente pertenece a un usuario (N:1)
- Un paciente tiene muchas citas (1:N)

---

#### Cita (Appointment)
[Complete table with all fields in Spanish]

**Relaciones:**
- Una cita pertenece a un paciente (N:1)
- Una cita tiene un registro médico (1:1)
- Una cita tiene una transcripción (1:1, opcional)

---

#### Registro Médico (MedicalRecord)
[Complete table with all fields in Spanish]

**Relaciones:**
- Un registro médico pertenece a una cita (1:1)
- Un registro médico tiene muchos síntomas (1:N)
- Un registro médico tiene un diagnóstico (1:1, opcional)
- Un registro médico tiene muchas recetas (1:N)

---

#### Síntoma (Symptom)
[Complete table in Spanish]

---

#### Diagnóstico (Diagnosis)
[Complete table in Spanish]

---

#### Receta (Prescription)
[Complete table in Spanish]

---

#### Transcripción (Transcription)
[Complete table in Spanish]
```

### 9. Create Data Model Summary
Create `docs/data-model/data-model-summary.md` with:
- Entity count and overview
- Key relationships diagram (simplified)
- Prisma schema location
- Migration instructions
- Seed data instructions

## Output Structure
```
docs/
├── research/           (from prompt 00)
├── product/            (from prompt 01)
├── stories/            (from prompt 02)
├── architecture/       (from prompt 03)
├── tech-stack/         (from prompt 04)
├── ai-integration/     (from prompt 05)
├── data-model/
│   ├── er-design.md
│   ├── prisma-schema.md
│   ├── indexes.md
│   ├── migrations.md
│   ├── seed-data.md
│   ├── data-model-summary.md
│   ├── diagrams/
│   │   └── er-diagram.md
│   └── entities/
│       ├── user.md
│       ├── patient.md
│       ├── appointment.md
│       ├── medical-record.md
│       ├── symptom.md
│       ├── diagnosis.md
│       ├── prescription.md
│       └── transcription.md
└── deliverables/
    ├── section-1-producto.md
    ├── section-2-arquitectura.md
    ├── section-3-modelo-datos.md
    └── section-5-historias.md
```

## Success Criteria
- Complete ER diagram with all entities and relationships
- Prisma schema fully defined
- All entities documented individually
- Indexes strategy defined
- Migration strategy documented
- Seed data prepared
- Section 3 content ready in Spanish
- Data model summary created

## Next Prompt
The next prompt (07-project-structure.md) will define the project folder structure based on all specifications.
