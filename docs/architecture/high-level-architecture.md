# High-Level Architecture: MedRecord AI

## Overview

This document defines the high-level system architecture for MedRecord AI MVP. The architecture is designed to support all must-have user stories, with particular emphasis on the real-time AI transcription and auto-fill features that represent the core value proposition.

---

## Architecture Pattern Selection

### Selected Pattern: Layered Monolithic Architecture with Service Boundaries

**Pattern**: Three-tier layered architecture within a monolithic deployment, with clear service boundaries for future extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│                    (React/TypeScript SPA)                        │
├─────────────────────────────────────────────────────────────────┤
│                      BUSINESS LAYER                             │
│                 (Node.js/Express Services)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Patient  │  │Appointment│  │ Medical  │  │     AI       │    │
│  │ Service  │  │ Service   │  │ Record   │  │ Integration  │    │
│  │          │  │           │  │ Service  │  │   Service    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                │
│                (PostgreSQL + Prisma ORM)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Pattern for MVP

| Criteria | Layered Monolith | Microservices | Serverless |
|----------|-----------------|---------------|------------|
| **Development Speed** | Fast (single codebase) | Slow (distributed) | Medium |
| **Deployment Simplicity** | Simple | Complex | Medium |
| **Debugging** | Easy | Difficult | Medium |
| **Team Size Fit** | Single developer ✓ | Multiple teams | Any |
| **Cost** | Low (single server) | High | Pay-per-use |
| **AI Integration** | Straightforward | Complex | Good |
| **Future Scalability** | Refactorable | Built-in | Built-in |

**Decision**: Layered Monolith is optimal for:
- Single developer with limited time
- MVP scope with well-defined boundaries
- Need for rapid iteration and debugging
- Cost-effective hosting on single server
- Clear path to microservices if needed later

### Trade-offs Accepted

**Pros of Selected Approach:**
- Simple deployment to single Ubuntu server
- Easy local development and debugging
- Lower infrastructure cost (~$10-20/month hosting)
- Faster time-to-market for MVP
- All code in one repository for easier maintenance

**Cons Accepted:**
- Limited horizontal scaling (acceptable for single-doctor MVP)
- Tightly coupled components (mitigated by service boundaries)
- Single point of failure (acceptable for MVP/demo)
- Must refactor for true multi-tenancy later

### Alternatives Considered

**1. Microservices Architecture**
- Rejected: Overhead too high for single developer
- Would revisit: If multi-doctor/multi-clinic scaling needed

**2. Serverless (AWS Lambda/Vercel Functions)**
- Rejected: Cold start latency problematic for real-time features
- Audio processing better suited to persistent server
- Would revisit: For specific endpoints like PDF generation

**3. Clean Architecture (Hexagonal)**
- Partially adopted: Service layer isolates business logic
- Full implementation: Overkill for MVP scope

---

## System Components Overview

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        React SPA (TypeScript)                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐   │ │
│  │  │   Auth   │  │  Patient │  │  Appointment │  │  Medical Record   │   │ │
│  │  │  Pages   │  │   Pages  │  │    Pages     │  │  + AI Recording   │   │ │
│  │  └──────────┘  └──────────┘  └──────────────┘  └───────────────────┘   │ │
│  │                                    │                    │               │ │
│  │                              ┌─────┴────────────────────┴─────┐        │ │
│  │                              │      Audio Capture Module       │        │ │
│  │                              │     (Web Audio API / MediaRecorder)     │ │
│  │                              └──────────────────────────────────┘       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                   HTTPS/REST
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     Express.js API Server                                │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │                       API Routes Layer                            │   │ │
│  │  │  /api/auth  │  /api/patients  │  /api/appointments  │  /api/ai   │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                    │                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │                      Service Layer                                │   │ │
│  │  │  AuthService │ PatientService │ AppointmentService │ AIService   │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                    │                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    Data Access Layer (Prisma)                     │   │ │
│  │  │  Patient Repository │ Appointment Repository │ Record Repository │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
          │                                                      │
          │                                                      │
          ▼                                                      ▼
┌──────────────────────┐                          ┌──────────────────────────┐
│    DATA LAYER        │                          │   EXTERNAL SERVICES      │
│  ┌────────────────┐  │                          │  ┌────────────────────┐  │
│  │   PostgreSQL   │  │                          │  │  OpenAI Whisper    │  │
│  │   Database     │  │                          │  │  (Transcription)   │  │
│  │                │  │                          │  └────────────────────┘  │
│  │  - Patients    │  │                          │  ┌────────────────────┐  │
│  │  - Appointments│  │                          │  │  OpenAI GPT-4      │  │
│  │  - Records     │  │                          │  │  (Extraction)      │  │
│  │  - Symptoms    │  │                          │  └────────────────────┘  │
│  │  - Prescriptions│  │                          │                         │
│  │  - Provider    │  │                          │                         │
│  └────────────────┘  │                          │                         │
└──────────────────────┘                          └──────────────────────────┘
```

---

## Component Responsibilities

### 1. Presentation Layer (React SPA)

**Responsibilities:**
- User interface rendering and interaction
- Client-side routing and navigation
- Form validation and user feedback
- Audio recording via Web Audio API
- State management (React Query + Context)
- API communication via HTTP client

**Key Modules:**
| Module | Purpose |
|--------|---------|
| Auth Pages | Login, logout, session management |
| Patient Pages | List, create, edit, view patients |
| Appointment Pages | Create, view appointments |
| Medical Record Pages | Record entry, AI transcription UI |
| Audio Module | Recording start/stop, audio processing |
| API Client | Axios wrapper for backend communication |

### 2. API Layer (Express Routes)

**Responsibilities:**
- HTTP request/response handling
- Input validation and sanitization
- Authentication middleware
- Rate limiting
- Error response formatting
- File upload handling (audio)

**Endpoints Structure:**
```
/api
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   └── GET  /me
├── /patients
│   ├── GET    /           (list, search)
│   ├── POST   /           (create)
│   ├── GET    /:id        (detail)
│   ├── PUT    /:id        (update)
│   └── GET    /:id/appointments
├── /appointments
│   ├── POST   /           (create)
│   ├── GET    /:id        (detail with record)
│   ├── PUT    /:id        (update)
│   └── PUT    /:id/status (update status)
├── /records
│   ├── PUT    /:appointmentId    (save/update)
│   └── GET    /:appointmentId    (get record)
└── /ai
    ├── POST /transcribe    (audio → text)
    └── POST /extract       (text → structured data)
```

### 3. Service Layer (Business Logic)

**Responsibilities:**
- Business rule implementation
- Data transformation and aggregation
- External API integration orchestration
- Transaction management
- Validation logic beyond simple input

**Services:**
| Service | Responsibilities |
|---------|------------------|
| AuthService | JWT generation, validation, password hashing |
| PatientService | Patient CRUD, duplicate detection, search |
| AppointmentService | Appointment lifecycle, status management |
| MedicalRecordService | Record save/load, field management |
| AIService | Whisper API calls, GPT extraction, prompt management |

### 4. Data Access Layer (Prisma ORM)

**Responsibilities:**
- Database schema definition
- CRUD operations abstraction
- Query optimization
- Relationship management
- Migration handling

### 5. External Services (AI APIs)

**OpenAI Whisper API:**
- Audio-to-text transcription
- Accepts WebM/MP3 audio files
- Returns plain text transcript

**OpenAI GPT-4 API:**
- Transcript-to-structured-data extraction
- Accepts text + extraction prompt
- Returns JSON with medical fields

---

## Communication Protocols

### Client ↔ Server

| Protocol | Use Case |
|----------|----------|
| **HTTPS/REST** | All API calls |
| **JSON** | Request/response body format |
| **multipart/form-data** | Audio file uploads |

### Server ↔ Database

| Protocol | Use Case |
|----------|----------|
| **PostgreSQL Protocol** | Database queries via Prisma |
| **Connection Pooling** | Prisma connection management |

### Server ↔ External APIs

| Protocol | Use Case |
|----------|----------|
| **HTTPS** | OpenAI API calls |
| **Bearer Token** | API authentication |
| **multipart/form-data** | Audio uploads to Whisper |

---

## Data Flow Descriptions

### Flow 1: Patient Registration

```
User fills form → Frontend validates → POST /api/patients
    → AuthMiddleware → PatientService.create()
    → Check duplicates → Prisma.patient.create()
    → Return patient → Navigate to profile
```

### Flow 2: Create Appointment

```
User selects patient → Fills appointment form → POST /api/appointments
    → AuthMiddleware → AppointmentService.create()
    → Create appointment + empty record → Prisma.appointment.create()
    → Return appointment → Navigate to record entry
```

### Flow 3: AI Transcription (Most Complex)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Browser   │     │   Backend   │     │  OpenAI APIs    │
└──────┬──────┘     └──────┬──────┘     └────────┬────────┘
       │                   │                     │
       │  1. Start Recording                     │
       │  (Web Audio API)                        │
       │                   │                     │
       │  2. Stop Recording                      │
       │  (Create WebM blob)                     │
       │                   │                     │
       │  3. POST /api/ai/transcribe             │
       │  (multipart audio)│                     │
       │──────────────────▶│                     │
       │                   │  4. POST Whisper API│
       │                   │  (audio file)       │
       │                   │────────────────────▶│
       │                   │                     │
       │                   │  5. Return transcript
       │                   │◀────────────────────│
       │                   │                     │
       │  6. Return transcript                   │
       │◀──────────────────│                     │
       │                   │                     │
       │  7. POST /api/ai/extract               │
       │  (transcript text)│                     │
       │──────────────────▶│                     │
       │                   │  8. POST GPT-4 API  │
       │                   │  (extraction prompt)│
       │                   │────────────────────▶│
       │                   │                     │
       │                   │  9. Return JSON     │
       │                   │◀────────────────────│
       │                   │                     │
       │  10. Return structured data             │
       │◀──────────────────│                     │
       │                   │                     │
       │  11. Auto-fill form fields              │
       │  (display with AI badges)               │
       │                   │                     │
```

### Flow 4: Save Medical Record

```
User reviews/edits fields → Click Save → PUT /api/records/:appointmentId
    → AuthMiddleware → MedicalRecordService.save()
    → Validate required fields → Prisma.medicalRecord.upsert()
    → Update appointment status → Return success
```

---

## Key Architecture Decisions

### Decision 1: Post-Recording Processing vs Real-Time

**Decision**: Post-recording processing for MVP

**Rationale**:
- Simpler implementation without WebSocket complexity
- Full audio context available for better extraction
- Easier error handling and retry logic
- Lower infrastructure requirements

**Future Path**: Can add real-time as Phase 2 feature

### Decision 2: Separate Transcription and Extraction Steps

**Decision**: Two separate API calls (transcribe → extract)

**Rationale**:
- Allows user to see raw transcript
- Enables transcript editing before extraction
- Better error isolation
- Supports manual entry if extraction fails

### Decision 3: Client-Side Audio Recording

**Decision**: Record audio in browser, upload to server

**Rationale**:
- No native app installation required
- WebM/Opus provides good compression
- Server handles API communication (secures API keys)
- Works on all modern browsers

### Decision 4: Prisma ORM

**Decision**: Use Prisma for database access

**Rationale**:
- Type-safe queries with TypeScript
- Auto-generated migrations
- Excellent developer experience
- Good PostgreSQL support

---

## Scalability Considerations

### Current MVP Limits

| Resource | Expected Limit | Handling |
|----------|---------------|----------|
| Concurrent Users | 1-5 | Single server sufficient |
| Patients | 100-500 | PostgreSQL handles easily |
| Audio Files | 60-minute max | OpenAI limit: 25MB |
| API Rate | 60 req/min | Rate limiting implemented |

### Future Scaling Path

```
Phase 1 (MVP):     Single server, single database
                   ↓
Phase 2:           Add Redis for caching, sessions
                   ↓
Phase 3:           Separate AI processing to worker
                   ↓
Phase 4:           Full microservices extraction
```

---

## Error Handling Strategy

| Error Type | Handling |
|------------|----------|
| API Validation | Return 400 with field errors |
| Authentication | Return 401, redirect to login |
| Authorization | Return 403 with message |
| Not Found | Return 404 |
| AI Service Failure | Return partial result, allow manual entry |
| Database Error | Log, return 500 with generic message |
| Rate Limit | Return 429 with retry-after |

---

## References

- [Detailed Component Architecture](./components.md)
- [System Architecture Diagram](./diagrams/system-architecture.md)
- [Sequence Diagrams](./diagrams/sequence-diagrams.md)
- [Integration Details](./integrations.md)
- [Security Architecture](./security.md)
- [Infrastructure Plan](./infrastructure.md)
