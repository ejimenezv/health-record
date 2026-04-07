# Component Architecture: MedRecord AI

This document defines the detailed component architecture for both frontend and backend, including database schema design.

---

## Frontend Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI component library |
| Language | TypeScript | Type safety |
| Routing | React Router v6 | Client-side routing |
| State Management | React Query + Context | Server state + App state |
| HTTP Client | Axios | API communication |
| Styling | Tailwind CSS | Utility-first CSS |
| Forms | React Hook Form | Form handling |
| Validation | Zod | Schema validation |
| Audio | Web Audio API | Recording |
| Build Tool | Vite | Fast development/builds |

### Routing Structure

```
/
├── /login                          # Login page
├── /                               # Dashboard (patient list)
│
├── /patients
│   ├── /                           # Patient list (same as dashboard)
│   ├── /new                        # Create patient form
│   └── /:patientId                 # Patient profile
│       └── /edit                   # Edit patient form
│
├── /appointments
│   ├── /new?patientId=:id          # Create appointment
│   └── /:appointmentId             # Appointment detail / Record entry
│       └── /record                 # Medical record entry
│
└── /settings                       # User settings (future)
```

### Component Hierarchy

```
App
├── AuthProvider
│   └── QueryClientProvider
│       └── Router
│           ├── PublicRoutes
│           │   └── LoginPage
│           │
│           └── ProtectedRoutes
│               └── Layout
│                   ├── Sidebar
│                   │   ├── Logo
│                   │   ├── NavLinks
│                   │   └── UserMenu
│                   │
│                   └── MainContent
│                       ├── DashboardPage
│                       │   ├── SearchBar
│                       │   ├── PatientList
│                       │   │   └── PatientCard[]
│                       │   └── Pagination
│                       │
│                       ├── PatientFormPage
│                       │   ├── PatientForm
│                       │   │   ├── PersonalInfoSection
│                       │   │   ├── ContactInfoSection
│                       │   │   └── EmergencyContactSection
│                       │   └── FormActions
│                       │
│                       ├── PatientProfilePage
│                       │   ├── PatientHeader
│                       │   ├── PatientDetails
│                       │   │   ├── AllergyList
│                       │   │   └── ConditionList
│                       │   ├── AppointmentHistory
│                       │   │   └── AppointmentCard[]
│                       │   └── QuickActions
│                       │
│                       ├── AppointmentFormPage
│                       │   └── AppointmentForm
│                       │
│                       └── MedicalRecordPage
│                           ├── RecordHeader
│                           ├── TwoColumnLayout
│                           │   ├── TranscriptPanel
│                           │   │   ├── AudioRecorder
│                           │   │   │   ├── RecordButton
│                           │   │   │   ├── Timer
│                           │   │   │   └── WaveformDisplay
│                           │   │   ├── ProcessingIndicator
│                           │   │   └── TranscriptView
│                           │   │
│                           │   └── FormPanel
│                           │       ├── ChiefComplaintField
│                           │       ├── SymptomSection
│                           │       │   ├── SymptomList
│                           │       │   │   └── SymptomCard[]
│                           │       │   └── AddSymptomButton
│                           │       ├── DiagnosisSection
│                           │       ├── TreatmentPlanSection
│                           │       ├── PrescriptionSection
│                           │       │   ├── PrescriptionList
│                           │       │   │   └── PrescriptionCard[]
│                           │       │   └── AddPrescriptionButton
│                           │       └── VitalSignsSection
│                           │
│                           └── RecordActions
│                               ├── SaveDraftButton
│                               └── CompleteButton
```

### State Management Approach

**React Query for Server State:**
```typescript
// Patient queries
const usePatients = (search?: string) => useQuery(['patients', search], fetchPatients);
const usePatient = (id: string) => useQuery(['patient', id], () => fetchPatient(id));
const usePatientMutation = () => useMutation(createPatient, {
  onSuccess: () => queryClient.invalidateQueries(['patients'])
});

// Appointment queries
const useAppointments = (patientId: string) => useQuery(
  ['appointments', patientId],
  () => fetchAppointments(patientId)
);
const useAppointment = (id: string) => useQuery(['appointment', id], () => fetchAppointment(id));

// Medical record queries
const useMedicalRecord = (appointmentId: string) => useQuery(
  ['record', appointmentId],
  () => fetchMedicalRecord(appointmentId)
);
```

**Context for App State:**
```typescript
// Auth context
const AuthContext = createContext<{
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}>(null);

// Recording context (for audio state)
const RecordingContext = createContext<{
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
}>(null);
```

### Audio Handling Approach

```typescript
// Audio recording hook
const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
  };

  const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    });
  };

  return { isRecording, duration, startRecording, stopRecording };
};
```

### Key Frontend Components

| Component | Responsibility | Key Props |
|-----------|---------------|-----------|
| `PatientCard` | Display patient summary | `patient`, `onClick` |
| `PatientForm` | Create/edit patient | `initialData?`, `onSubmit` |
| `AppointmentCard` | Display appointment summary | `appointment`, `onClick` |
| `SymptomForm` | Add/edit symptom | `initialData?`, `onSave`, `onCancel` |
| `PrescriptionForm` | Add/edit prescription | `initialData?`, `onSave`, `onCancel` |
| `AudioRecorder` | Handle recording UI | `onRecordingComplete` |
| `TranscriptView` | Display transcript | `transcript`, `highlights?` |
| `AIFieldBadge` | Mark AI-filled fields | `source?`, `confidence?` |

---

## Backend Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20 LTS | JavaScript runtime |
| Framework | Express.js | Web framework |
| Language | TypeScript | Type safety |
| ORM | Prisma | Database access |
| Validation | Zod | Input validation |
| Auth | jsonwebtoken | JWT handling |
| Password | bcrypt | Password hashing |
| File Upload | multer | Audio file handling |
| HTTP Client | axios | External API calls |
| Logging | pino | Structured logging |
| Environment | dotenv | Config management |

### Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Entry point
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   ├── index.ts                # Configuration loader
│   │   └── env.ts                  # Environment validation
│   │
│   ├── routes/
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.routes.ts          # /api/auth/*
│   │   ├── patient.routes.ts       # /api/patients/*
│   │   ├── appointment.routes.ts   # /api/appointments/*
│   │   ├── record.routes.ts        # /api/records/*
│   │   └── ai.routes.ts            # /api/ai/*
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT validation
│   │   ├── error.middleware.ts     # Error handling
│   │   ├── validation.middleware.ts # Request validation
│   │   └── rateLimit.middleware.ts # Rate limiting
│   │
│   ├── services/
│   │   ├── auth.service.ts         # Authentication logic
│   │   ├── patient.service.ts      # Patient business logic
│   │   ├── appointment.service.ts  # Appointment logic
│   │   ├── record.service.ts       # Medical record logic
│   │   └── ai.service.ts           # AI integration
│   │
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client instance
│   │   ├── openai.ts               # OpenAI client
│   │   └── logger.ts               # Logger instance
│   │
│   ├── utils/
│   │   ├── jwt.ts                  # JWT utilities
│   │   ├── password.ts             # Password utilities
│   │   └── validation.ts           # Shared validators
│   │
│   └── types/
│       ├── index.ts                # Type exports
│       ├── api.types.ts            # API request/response types
│       └── domain.types.ts         # Domain types
│
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── migrations/                 # Migration files
│   └── seed.ts                     # Seed data
│
├── uploads/                        # Audio file storage
├── package.json
├── tsconfig.json
└── .env.example
```

### API Layer Structure

```typescript
// Example: patient.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { patientService } from '../services/patient.service';

const router = Router();

// Validation schemas
const createPatientSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  dateOfBirth: z.string().datetime(),
  sex: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/),
  email: z.string().email().optional(),
  address: z.string().max(200).optional(),
  emergencyContactName: z.string().min(2).max(100),
  emergencyContactPhone: z.string().regex(/^\+?[\d\s-]{10,}$/),
  emergencyContactRelationship: z.string().max(50).optional(),
});

// Routes
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const patients = await patientService.findAll({
      search: search as string,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createPatientSchema), async (req, res, next) => {
  try {
    const patient = await patientService.create(req.body);
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
});

// ... more routes

export default router;
```

### Service Layer Structure

```typescript
// Example: patient.service.ts
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface FindAllOptions {
  search?: string;
  page: number;
  limit: number;
}

interface CreatePatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
}

export const patientService = {
  async findAll({ search, page, limit }: FindAllOptions) {
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          allergies: true,
          chronicConditions: true,
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async create(data: CreatePatientData) {
    // Check for duplicates
    const existing = await prisma.patient.findFirst({
      where: {
        firstName: { equals: data.firstName, mode: 'insensitive' },
        lastName: { equals: data.lastName, mode: 'insensitive' },
        dateOfBirth: data.dateOfBirth,
      },
    });

    if (existing) {
      throw new DuplicatePatientError(existing);
    }

    return prisma.patient.create({ data });
  },

  async findById(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        allergies: true,
        chronicConditions: true,
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: {
            medicalRecord: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    return patient;
  },

  async update(id: string, data: Partial<CreatePatientData>) {
    return prisma.patient.update({
      where: { id },
      data,
    });
  },
};
```

### Data Access Layer (Prisma)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### AI Integration Services

```typescript
// services/ai.service.ts
import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export const aiService = {
  async transcribe(audioBuffer: Buffer, filename: string): Promise<string> {
    const file = new File([audioBuffer], filename, { type: 'audio/webm' });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    });

    return response.text;
  },

  async extractMedicalData(transcript: string): Promise<ExtractedData> {
    const prompt = buildExtractionPrompt(transcript);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content) as ExtractedData;
  },
};

const EXTRACTION_SYSTEM_PROMPT = `You are a medical documentation assistant.
Extract structured information from doctor-patient conversation transcripts.
Return valid JSON matching the specified schema.
Use null for missing information. Be conservative in extraction.`;

function buildExtractionPrompt(transcript: string): string {
  return `Extract medical information from this transcript and return JSON:

{
  "chiefComplaint": "string or null",
  "historyOfPresentIllness": "string or null",
  "symptoms": [{"name": "string", "severity": 1-10 or null, "duration": "string or null", "bodySite": "string or null"}],
  "diagnosis": "string or null",
  "diagnosisNotes": "string or null",
  "treatmentPlan": "string or null",
  "prescriptions": [{"medicationName": "string", "strength": "string", "dosage": "string", "frequency": "string", "duration": "string or null", "instructions": "string"}],
  "followUp": "string or null"
}

TRANSCRIPT:
${transcript}`;
}
```

---

## Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    Provider ||--o{ Appointment : creates
    Patient ||--o{ Appointment : has
    Patient ||--o{ Allergy : has
    Patient ||--o{ ChronicCondition : has
    Appointment ||--|| MedicalRecord : has
    MedicalRecord ||--o{ Symptom : contains
    MedicalRecord ||--o{ Prescription : contains
    Appointment ||--o| VitalSigns : has

    Provider {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        string specialty
        string licenseNumber
        string phone
        datetime createdAt
        datetime updatedAt
    }

    Patient {
        uuid id PK
        string firstName
        string lastName
        date dateOfBirth
        enum sex
        string phone
        string email
        string address
        string emergencyContactName
        string emergencyContactPhone
        string emergencyContactRelationship
        datetime createdAt
        datetime updatedAt
    }

    Allergy {
        uuid id PK
        uuid patientId FK
        string allergen
        string reaction
        enum severity
        datetime onsetDate
        datetime createdAt
    }

    ChronicCondition {
        uuid id PK
        uuid patientId FK
        string conditionName
        datetime diagnosisDate
        string status
        string notes
        datetime createdAt
    }

    Appointment {
        uuid id PK
        uuid patientId FK
        uuid providerId FK
        datetime appointmentDate
        enum appointmentType
        string reasonForVisit
        int durationMinutes
        enum status
        datetime createdAt
        datetime updatedAt
    }

    MedicalRecord {
        uuid id PK
        uuid appointmentId FK UK
        string chiefComplaint
        text historyOfPresentIllness
        text physicalExamNotes
        string diagnosis
        text diagnosisNotes
        text treatmentPlan
        text followUpInstructions
        text patientEducation
        text audioFileUrl
        text transcript
        boolean isAIGenerated
        boolean isDraft
        datetime createdAt
        datetime updatedAt
    }

    Symptom {
        uuid id PK
        uuid medicalRecordId FK
        string symptomName
        string bodySite
        int severity
        string duration
        text notes
        boolean isAIExtracted
        datetime createdAt
    }

    Prescription {
        uuid id PK
        uuid medicalRecordId FK
        string medicationName
        string strength
        string dosage
        string frequency
        string duration
        int quantity
        int refills
        text instructions
        string indication
        boolean isAIExtracted
        datetime createdAt
    }

    VitalSigns {
        uuid id PK
        uuid appointmentId FK UK
        int bloodPressureSystolic
        int bloodPressureDiastolic
        int heartRate
        decimal temperature
        int respiratoryRate
        int oxygenSaturation
        decimal weight
        decimal height
        decimal bmi
        int painLevel
        datetime recordedAt
    }
```

### Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

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
}

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
}

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
}

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
}

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
  status          AppointmentStatus @default(in_progress)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  medicalRecord   MedicalRecord?
  vitalSigns      VitalSigns?

  @@index([patientId])
  @@index([providerId])
  @@index([appointmentDate])
  @@index([status])
}

model MedicalRecord {
  id                    String         @id @default(uuid())
  appointmentId         String         @unique
  appointment           Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  chiefComplaint        String?
  historyOfPresentIllness String?      @db.Text
  physicalExamNotes     String?        @db.Text
  diagnosis             String?
  diagnosisNotes        String?        @db.Text
  treatmentPlan         String?        @db.Text
  followUpInstructions  String?        @db.Text
  patientEducation      String?        @db.Text
  audioFileUrl          String?
  transcript            String?        @db.Text
  isAIGenerated         Boolean        @default(false)
  isDraft               Boolean        @default(true)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  symptoms              Symptom[]
  prescriptions         Prescription[]
}

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
}

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
}

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
}
```

### Indexing Considerations

| Table | Index | Purpose |
|-------|-------|---------|
| Patient | `(lastName, firstName)` | Name search |
| Patient | `(phone)` | Phone search |
| Patient | `(email)` | Email lookup |
| Appointment | `(patientId)` | Patient history |
| Appointment | `(providerId)` | Provider schedule |
| Appointment | `(appointmentDate)` | Date filtering |
| Appointment | `(status)` | Status filtering |
| Symptom | `(medicalRecordId)` | Record symptoms |
| Prescription | `(medicalRecordId)` | Record prescriptions |

### Data Integrity Rules

| Rule | Implementation |
|------|----------------|
| Patient requires emergency contact | Schema validation + NOT NULL |
| Appointment requires patient | Foreign key constraint |
| Medical record requires appointment | Foreign key with 1:1 relationship |
| Cascade deletes for child records | `onDelete: Cascade` in Prisma |
| Unique email for providers | Unique constraint |
| Valid severity range (1-10) | Application validation |

---

## References

- [High-Level Architecture](./high-level-architecture.md)
- [System Diagrams](./diagrams/system-architecture.md)
- [Integration Details](./integrations.md)
