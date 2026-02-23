> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o los de corrección o adición de funcionalidades que consideres más relevantes.

La conversación completa está disponible en los archivos de prompts del repositorio: [prompts/](prompts/)

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:** Definición inicial del producto y contexto del proyecto

```
# Prompt 00: Contexto del Proyecto - Medical Record System

## Descripción del Proyecto

**Nombre**: MedRecord AI - Sistema de Historias Clínicas con IA

**Objetivo**: Desarrollar un sistema de gestión de historias clínicas para médicos que permita:
1. Gestionar el historial médico de pacientes
2. Registrar citas médicas con síntomas, diagnósticos y recetas
3. Transcribir citas en tiempo real usando IA
4. Auto-completar campos del registro médico basándose en la transcripción

**Contexto Académico**: Proyecto final del curso AI4Devs - debe documentarse extensivamente el uso de IA en el desarrollo.

## Flujo E2E Principal

Registro/Login → Dashboard Médico → Seleccionar/Crear Paciente →
Nueva Cita → Iniciar Grabación IA → Transcripción en Tiempo Real →
Auto-llenado de Campos → Guardar Registro → Ver Historial
```

**Prompt 2:** Definición de producto y documentación

```
# Prompt 01: Product Definition

## Objective
Create comprehensive product documentation based on the research insights. This will serve as the foundation for all subsequent development decisions.

## Tasks

### 1. Create Product Vision Document
Create `docs/product/vision.md` with:

**Problem Statement**:
Los médicos pasan demasiado tiempo en documentación manual durante y después de las consultas, lo que reduce el tiempo disponible para atención al paciente y aumenta el riesgo de errores u omisiones en los registros médicos.

**Solution**:
MedRecord AI es un sistema de gestión de historias clínicas que utiliza inteligencia artificial para transcribir automáticamente las consultas médicas y extraer información relevante, permitiendo a los médicos enfocarse en sus pacientes mientras el sistema documenta la visita en tiempo real.

**Target Users**:
- Médicos generales y especialistas en consulta privada
- Clínicas pequeñas y medianas (1-20 médicos)
- Profesionales de salud que buscan optimizar su documentación clínica

### 2. Define Core Features
Incluir: Autenticación, Gestión de Pacientes, Gestión de Citas,
Transcripción con IA, Historial Médico
```

**Prompt 3:** Investigación de sistemas médicos existentes

```
# Prompt 00: Research Medical Records Systems

## Objective
Research existing medical record systems, AI transcription solutions, and HIPAA compliance requirements to inform the architecture and feature decisions for the Medical Record System MVP.

## Research Areas

### 1. Existing Medical Record Systems
- Epic Systems
- Cerner (Oracle Health)
- MEDITECH
- Open-source alternatives (OpenMRS, OpenEMR)

### 2. AI Transcription in Healthcare
- Nuance Dragon Medical
- Amazon Transcribe Medical
- Google Cloud Healthcare API
- OpenAI Whisper for medical transcription

### 3. Data Standards
- HL7 FHIR
- ICD-10 codes
- SNOMED CT
- LOINC

### 4. Security Considerations
- HIPAA compliance requirements
- Data encryption standards
- Audit logging requirements
```

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:** Diseño de arquitectura del sistema

```
# Prompt 03: System Architecture

## Objective
Design the complete system architecture for the Medical Record System MVP. Create detailed diagrams and component specifications that will guide implementation.

## Tasks

### 1. Create High-Level Architecture
Create `docs/architecture/high-level-architecture.md` with:

**Architecture Style**: Monolito Modular (evolución a microservicios)

**Justification**:
- MVP rápido con equipo pequeño
- Menor complejidad operacional inicial
- Fácil refactoring a microservicios si es necesario
- Deployment simplificado

### 2. Create Component Diagram
Diagram using Mermaid showing:
- Frontend (React SPA)
- Backend API (Express.js)
- Database (PostgreSQL)
- External Services (OpenAI)
- WebSocket Server (Real-time transcription)
```

### **2.2. Descripción de componentes principales:**

**Prompt 1:** Definición de componentes del sistema

```
# Prompt 03: System Architecture - Components

## Create Component Specifications
Create `docs/architecture/components.md` with detailed specs for:

### Frontend Components
- Auth Module (Login, Register, Session Management)
- Patient Management (CRUD, Search, Profile View)
- Appointment Module (Calendar, List, Detail)
- Medical Record Module (Form, Symptoms, Diagnosis, Prescriptions)
- Transcription Module (Audio Recording, Real-time Display, AI Extraction)

### Backend Components
- Auth Service (JWT, Password Hashing, Session)
- Patient Service (CRUD, Search, Pagination)
- Appointment Service (CRUD, Status Workflow)
- Medical Record Service (CRUD, Validation)
- Transcription Service (Audio Processing, AI Integration)
- AI Service (Whisper API, GPT API, Field Extraction)

### Data Flow
Document the flow: Audio → WebSocket → Whisper → Text → GPT → Extracted Fields → UI
```

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:** Estructura del proyecto

```
# Prompt 07: Project Structure Definition

## Objective
Define the complete project folder structure for a monorepo containing both frontend and backend.

## Define Root Project Structure
health-record/
├── .github/workflows/ci.yml
├── docs/
├── packages/
│   ├── backend/      # Node.js + Express API
│   └── frontend/     # React + Vite app
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── scripts/
├── package.json      # Root package.json (workspaces)
├── pnpm-workspace.yaml
└── tsconfig.base.json

## Backend Structure
packages/backend/
├── src/
│   ├── config/       # Configuration loaders
│   ├── routes/       # Express routes
│   ├── controllers/  # Request handlers
│   ├── services/     # Business logic
│   ├── middleware/   # Auth, validation, error handling
│   ├── validators/   # Zod schemas
│   ├── types/        # TypeScript types
│   └── websocket/    # Socket.IO handlers
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
```

### **2.4. Infraestructura y despliegue**

**Prompt 1:** Configuración de despliegue

```
# Prompt 19: Deployment to Ubuntu Server

## Objective
Deploy the application to an Ubuntu server with:
- Nginx reverse proxy
- PostgreSQL database
- PM2 process management
- SSL with Let's Encrypt
- CI/CD with GitHub Actions

## Create Dockerfiles

### docker/Dockerfile.backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY packages/backend ./packages/backend
RUN cd packages/backend && npx prisma generate
RUN pnpm --filter backend build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/index.js"]

## GitHub Actions CI/CD
- Lint and test on PR
- Build Docker images on main
- Deploy via SSH to Ubuntu server
```

### **2.5. Seguridad**

**Prompt 1:** Implementación de autenticación

```
# Prompt 15a: Implement TICKET-002 - Authentication Backend

## Objective
Implement secure JWT-based authentication with:
- User registration with email validation
- Password hashing with bcrypt (cost factor 10)
- JWT token generation and validation
- Protected route middleware
- Current user endpoint

## Security Implementation

### Password Hashing
const SALT_ROUNDS = 10;
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

### JWT Configuration
- Secret from environment variable
- Token expiration: 7 days
- Payload: { userId, email }

### Auth Middleware
- Extract Bearer token from Authorization header
- Verify JWT signature
- Attach userId to request object
- Return 401 for invalid/expired tokens

### Validation with Zod
- Email format validation
- Password minimum 8 characters
- Required fields validation
```

### **2.6. Tests**

**Prompt 1:** Especificaciones de testing

```
# Prompt 11: Testing Specifications

## Objective
Create comprehensive testing specifications covering unit tests, integration tests, and E2E tests.

## Testing Strategy

### Testing Pyramid
           /\
          /E2E\           <- Few, critical flows
         /──────\
        /Integration\      <- API endpoints, DB operations
       /──────────────\
      /    Unit Tests   \  <- Many, fast, isolated
     /────────────────────\

### Coverage Goals
- Unit Tests: 80% coverage for services and utilities
- Integration Tests: All API endpoints
- E2E Tests: Main user flow (patient → appointment → transcription → save)

### Tools
- Backend: Vitest + Supertest
- Frontend: Vitest + React Testing Library
- E2E: Playwright
- Mocking: MSW for external APIs (OpenAI)

### Example Integration Test
describe('Patient Routes', () => {
  it('should create patient with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: '1990-01-01',
        gender: 'male'
      });
    expect(response.status).toBe(201);
    expect(response.body.data.firstName).toBe('Juan');
  });
});
```

---

### 3. Modelo de Datos

**Prompt 1:** Modelado de datos con Prisma

```
# Prompt 06: Data Modeling

## Objective
Create the complete data model using Prisma ORM, including all entities, relationships, and database schema.

## Prisma Schema

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
}

model Patient {
  id                    String        @id @default(uuid())
  userId                String
  user                  User          @relation(fields: [userId], references: [id])
  firstName             String
  lastName              String
  dateOfBirth           DateTime
  gender                Gender
  email                 String?
  phone                 String?
  allergies             String?
  chronicConditions     String?
  appointments          Appointment[]
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model Appointment {
  id             String           @id @default(uuid())
  patientId      String
  patient        Patient          @relation(fields: [patientId], references: [id])
  scheduledAt    DateTime
  status         AppointmentStatus @default(SCHEDULED)
  type           AppointmentType   @default(GENERAL)
  medicalRecord  MedicalRecord?
  transcription  Transcription?
  createdAt      DateTime         @default(now())
}

model MedicalRecord {
  id             String        @id @default(uuid())
  appointmentId  String        @unique
  appointment    Appointment   @relation(fields: [appointmentId], references: [id])
  chiefComplaint String?
  symptoms       Symptom[]
  diagnosis      Diagnosis?
  prescriptions  Prescription[]
  createdAt      DateTime      @default(now())
}
```

**Prompt 2:** Entidades médicas detalladas

```
# Prompt 06: Data Modeling - Medical Entities

## Symptom Entity
model Symptom {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id])
  description     String
  severity        String?       // mild, moderate, severe
  duration        String?
  onset           String?
  aiGenerated     Boolean       @default(false)
  createdAt       DateTime      @default(now())
}

## Diagnosis Entity
model Diagnosis {
  id              String        @id @default(uuid())
  medicalRecordId String        @unique
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id])
  description     String
  icdCode         String?
  severity        String?
  aiGenerated     Boolean       @default(false)
  confidence      Float?        // AI confidence score 0-1
}

## Prescription Entity
model Prescription {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id])
  medication      String
  dosage          String
  frequency       String
  duration        String
  instructions    String?
  aiGenerated     Boolean       @default(false)
}

## Transcription Entity
model Transcription {
  id            String      @id @default(uuid())
  appointmentId String      @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  fullText      String?
  segments      Json?       // Array of transcription segments with timestamps
  duration      Int?        // Duration in seconds
  status        TranscriptionStatus @default(PENDING)
}
```

---

### 4. Especificación de la API

**Prompt 1:** Especificación OpenAPI

```
# Prompt 08: API Specification

## Objective
Create complete API specifications in OpenAPI 3.0 format for all endpoints.

## Base Configuration
Base URL: /api/v1
Authentication: Bearer JWT token

## Response Format
{
  "success": true,
  "data": {},
  "message": "Success message",
  "errors": []
}

## Authentication Endpoints

POST /api/v1/auth/register
- Register a new doctor account
- Body: { email, password, firstName, lastName, specialty?, licenseNumber? }
- Response: { token, user }

POST /api/v1/auth/login
- Login to get access token
- Body: { email, password }
- Response: { token, user }

GET /api/v1/auth/me
- Get current user profile
- Headers: Authorization: Bearer <token>
- Response: { user }

## Patient Endpoints
GET /api/v1/patients - List with search & pagination
POST /api/v1/patients - Create patient
GET /api/v1/patients/:id - Get with appointments
PUT /api/v1/patients/:id - Update patient
DELETE /api/v1/patients/:id - Soft delete
```

**Prompt 2:** Endpoints de transcripción

```
# Prompt 08: API Specification - Transcription

## Transcription Endpoints

POST /api/v1/appointments/:appointmentId/transcription/start
- Start transcription session
- Returns: { sessionId, wsUrl }

POST /api/v1/appointments/:appointmentId/transcription/audio
- Upload audio chunk
- Content-Type: multipart/form-data
- Body: { audio: binary, chunkIndex: number }

POST /api/v1/appointments/:appointmentId/transcription/stop
- Stop transcription session
- Returns: { transcription, extractedFields }

POST /api/v1/appointments/:appointmentId/extract-fields
- Extract medical fields from transcription using AI
- Body: { transcriptionText }
- Returns: { symptoms, diagnosis, prescriptions }

## WebSocket Events
Connection: ws://api/v1/transcription/{sessionId}

Server to Client:
- transcription_update: { text, isFinal, chunkIndex }
- field_extraction: { symptoms, diagnosis, prescriptions }
- status: { status: "processing" | "completed" | "error" }
- error: { code, message }
```

---

### 5. Historias de Usuario

**Prompt 1:** Definición de historias de usuario

```
# Prompt 02: User Stories

## Objective
Create comprehensive user stories with acceptance criteria for the MVP features.

## User Story Format
As a [role], I want [capability], so that [benefit]

## Must-Have Stories (P0)

### US-001: User Registration
As a doctor, I want to register an account, so that I can access the system.

Acceptance Criteria:
- Registration form with email, password, name, specialty
- Email validation and uniqueness check
- Password strength requirements (min 8 chars)
- Success message and redirect to dashboard
- Error handling for duplicate emails

### US-003: View Patient Medical History
As a doctor, I want to view a patient's complete appointment history,
so that I have context before the current consultation.

Acceptance Criteria:
- Chronological list of past appointments (most recent first)
- Each appointment shows: date, type, reason, status, diagnosis summary
- Click to navigate to full medical record
- Previous/Next navigation between records
- Empty state with option to create first appointment

### US-007: AI Auto-fill Medical Record
As a doctor, I want AI to extract and auto-fill medical record fields from transcription,
so that I save time while maintaining accuracy through review.

Acceptance Criteria:
- Form fields auto-populate with extracted data
- AI-filled fields have visual indicator (icon/highlight)
- Each field is editable to modify suggestions
- "Accept all" and "Clear all" actions available
- Low-confidence extractions left empty for manual entry
```

**Prompt 2:** Criterios de aceptación detallados

```
# Prompt 02: User Stories - Acceptance Criteria

### US-005: Manual Medical Record Entry
As a doctor, I want to manually enter symptoms, diagnosis, and prescriptions,
so that I can document visits even without AI transcription.

Acceptance Criteria:
- Medical record form sections: Chief Complaint, Symptoms, Diagnosis, Prescriptions
- Add Symptom: description (required), severity (1-10), duration, notes
- Symptoms list with edit/delete for each
- Diagnosis: free text with optional ICD code
- Add Prescription: medication, dosage, frequency, duration, instructions
- Save button persists all data
- "Complete Appointment" changes status to COMPLETED and makes read-only

### Technical Notes:
- Use structured schema for symptoms and prescriptions (arrays of objects)
- Implement auto-save draft every 30 seconds
- Validation allows partial saves but requires completeness for "Complete"
- Track created_at and updated_at timestamps
- Use optimistic updates for better UX
```

---

### 6. Tickets de Trabajo

**Prompt 1:** Definición de tickets

```
# Prompt 12: Tickets Definition

## Objective
Create detailed work tickets based on all specifications, organized by implementation phase.

## Ticket Format
- ID: TICKET-XXX
- Title: Clear, actionable title
- Description: What needs to be done
- Acceptance Criteria: Specific, testable criteria
- Technical Notes: Implementation hints
- Dependencies: Other tickets that must be completed first
- Story Points: 1, 2, 3, 5, 8, 13 (Fibonacci)

## Phase 1: Foundation

### TICKET-000: Project Setup
- Initialize monorepo with pnpm workspaces
- Configure TypeScript, ESLint, Prettier
- Setup Husky pre-commit hooks
- Create Docker Compose for local PostgreSQL
- Story Points: 3

### TICKET-001: Database Schema
- Create Prisma schema with all entities
- Generate initial migration
- Create seed data for development
- Story Points: 5

### TICKET-002: Authentication Backend
- Implement register/login endpoints
- JWT token generation and validation
- Password hashing with bcrypt
- Auth middleware for protected routes
- Story Points: 5
```

**Prompt 2:** Tickets de implementación de IA

```
# Prompt 12: Tickets Definition - AI Features

## Phase 4: AI Integration

### TICKET-010: Transcription Backend
**Description**: Implement real-time audio transcription using OpenAI Whisper API

**Acceptance Criteria**:
- WebSocket connection for streaming audio
- Audio chunk processing and queuing
- Whisper API integration for transcription
- Real-time transcription updates via WebSocket
- Session management (start/stop)
- Error handling and retry logic

**Technical Notes**:
- Use Socket.IO for WebSocket
- Process audio in 5-second chunks
- Buffer partial transcriptions
- Store complete transcription in database

**Story Points**: 8

### TICKET-011: AI Field Extraction
**Description**: Implement GPT-4 integration for extracting medical fields

**Acceptance Criteria**:
- Extract symptoms from transcription
- Extract diagnosis from transcription
- Extract prescriptions from transcription
- Include confidence scores
- Return structured JSON response

**Technical Notes**:
- Use structured prompts with medical context
- Validate JSON response structure
- Handle partial extractions gracefully

**Story Points**: 5
```

---

### 7. Pull Requests

**Prompt 1:** Implementación de autenticación (TICKET-002, TICKET-003)

```
# Prompt 15a: Implement TICKET-002 - Authentication Backend

## Implementation Steps

### Step 1: Create Auth Validator
// validators/auth.validator.ts
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

### Step 2: Create Auth Service
// services/auth.service.ts
class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new Error('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { ...input, passwordHash: hashedPassword }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { user, token };
  }
}

### Step 3: Create Auth Middleware
// middleware/auth.middleware.ts
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  const decoded = jwt.verify(token, JWT_SECRET);
  req.userId = decoded.userId;
  next();
};

### Step 4: Integration Tests
describe('Auth Routes', () => {
  it('should register new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({...});
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
  });
});
```

**Prompt 2:** Implementación de pacientes y citas (TICKET-004 a TICKET-007)

```
# Prompt 16a: Implement TICKET-004 & TICKET-006 - Patients & Appointments Backend

## Patients Implementation

### Patient Service
class PatientService {
  async findAll(userId: string, query: PatientQuery) {
    const where = {
      userId,
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: { _count: { select: { appointments: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.patient.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages } };
  }
}

## Appointments Implementation

### Appointment Service
class AppointmentService {
  async updateStatus(id: string, userId: string, status: AppointmentStatus) {
    const existing = await prisma.appointment.findFirst({
      where: { id, patient: { userId } },
    });

    const updateData = { status };
    if (status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (status === 'COMPLETED') updateData.endedAt = new Date();

    return prisma.appointment.update({ where: { id }, data: updateData });
  }

  async getTodayAppointments(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.appointment.findMany({
      where: {
        patient: { userId },
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
```

**Prompt 3:** Implementación de transcripción con IA (TICKET-010, TICKET-011)

```
# Prompt 18a: Implement TICKET-010 - Transcription Backend

## OpenAI Integration

### Whisper Service
// services/ai/whisper.service.ts
class WhisperService {
  async transcribe(audioBuffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');

    const response = await openai.audio.transcriptions.create({
      file: formData.get('file'),
      model: 'whisper-1',
      language: 'es',
    });

    return response.text;
  }
}

### GPT Extraction Service
// services/ai/extraction.service.ts
class ExtractionService {
  async extractMedicalFields(transcription: string) {
    const prompt = `Analiza la siguiente transcripción médica y extrae:
    1. Síntomas mencionados por el paciente
    2. Diagnóstico dado por el médico
    3. Recetas o medicamentos prescritos

    Responde en formato JSON con la estructura:
    {
      "symptoms": [{ "description": "", "severity": "", "duration": "" }],
      "diagnosis": { "description": "", "confidence": 0.0 },
      "prescriptions": [{ "medication": "", "dosage": "", "frequency": "" }]
    }

    Transcripción: ${transcription}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  }
}

### WebSocket Handler
// websocket/transcription.handler.ts
io.on('connection', (socket) => {
  socket.on('audio_chunk', async (data) => {
    const { sessionId, audio, chunkIndex } = data;

    // Process audio chunk
    const transcription = await whisperService.transcribe(Buffer.from(audio));

    // Emit transcription update
    socket.emit('transcription_update', {
      text: transcription,
      chunkIndex,
      isFinal: false,
    });
  });

  socket.on('stop_recording', async (sessionId) => {
    // Extract fields from complete transcription
    const fields = await extractionService.extractMedicalFields(fullTranscription);

    socket.emit('field_extraction', fields);
    socket.emit('status', { status: 'completed' });
  });
});
```
