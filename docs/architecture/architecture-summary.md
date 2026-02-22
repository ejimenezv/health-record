# Architecture Summary: MedRecord AI

Quick reference guide for the MedRecord AI MVP architecture.

---

## Quick Reference

### Architecture Pattern

**Layered Monolithic Architecture with Service Boundaries**

```
┌─────────────────────────────────────────┐
│         React SPA (TypeScript)          │  ← Presentation Layer
├─────────────────────────────────────────┤
│         Express API (TypeScript)        │  ← Business Layer
│    ┌─────────────────────────────────┐  │
│    │ Auth │ Patient │ Appt │ Record │  │  ← Services
│    └─────────────────────────────────┘  │
├─────────────────────────────────────────┤
│         Prisma ORM + PostgreSQL         │  ← Data Layer
└─────────────────────────────────────────┘
                    │
                    ▼
           OpenAI APIs (External)
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | React Query, Context API |
| Backend | Node.js 20, Express 4, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| Auth | JWT (HS256) |
| AI | OpenAI Whisper + GPT-4 |
| Container | Docker + Docker Compose |
| Proxy | Nginx |
| Hosting | Ubuntu 22.04 VPS |

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Monolith | Single developer, MVP scope |
| Frontend | React | Ecosystem, familiarity |
| Backend | Express | Simple, flexible |
| Database | PostgreSQL | Relational fits medical data |
| ORM | Prisma | Type-safe, great DX |
| State | React Query | Server state caching |
| AI Transcription | Whisper API | Accuracy, simplicity |
| AI Extraction | GPT-4 | Best structured output |
| Auth | JWT | Stateless, SPA-friendly |
| Deployment | Docker | Portable, consistent |

---

## Component List

### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| LoginPage | `/login` | Authentication |
| Dashboard | `/` | Patient list, search |
| PatientForm | `/patients/new` | Create patient |
| PatientProfile | `/patients/:id` | View patient + history |
| AppointmentForm | `/appointments/new` | Create appointment |
| MedicalRecordPage | `/appointments/:id/record` | Record entry + AI |
| AudioRecorder | (component) | Audio capture |
| TranscriptPanel | (component) | Display transcript |

### Backend Services

| Service | Responsibility |
|---------|---------------|
| AuthService | JWT, password hashing |
| PatientService | Patient CRUD, search |
| AppointmentService | Appointment lifecycle |
| MedicalRecordService | Record save/load |
| AIService | Whisper + GPT-4 integration |

### Database Entities

| Entity | Key Fields |
|--------|------------|
| Provider | email, passwordHash, name |
| Patient | name, DOB, phone, emergency contact |
| Appointment | date, type, status, patientId |
| MedicalRecord | SOAP fields, transcript, appointmentId |
| Symptom | name, severity, duration |
| Prescription | medication, dosage, instructions |

---

## Integration Points

### External APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| Whisper | `POST /v1/audio/transcriptions` | Audio → Text |
| GPT-4 | `POST /v1/chat/completions` | Text → Structured JSON |

### Internal APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | User login |
| `/api/patients` | GET/POST | List/create patients |
| `/api/patients/:id` | GET/PUT | Get/update patient |
| `/api/appointments` | POST | Create appointment |
| `/api/appointments/:id` | GET/PUT | Get/update appointment |
| `/api/records/:appointmentId` | GET/PUT | Get/save record |
| `/api/ai/transcribe` | POST | Audio transcription |
| `/api/ai/extract` | POST | Field extraction |

---

## Data Flow

### AI Transcription Flow

```
1. User clicks "Start Recording"
2. Browser captures audio (WebM/Opus)
3. User clicks "Stop Recording"
4. POST /api/ai/transcribe (audio file)
5. Backend → Whisper API
6. Return transcript text
7. POST /api/ai/extract (transcript)
8. Backend → GPT-4 API with extraction prompt
9. Return structured JSON
10. Auto-fill form fields
11. User reviews and saves
```

### Record Save Flow

```
1. User edits/reviews record
2. Click "Save" or auto-save triggers
3. PUT /api/records/:appointmentId
4. Validate and save to PostgreSQL
5. Return success
```

---

## Security Measures

| Area | Implementation |
|------|----------------|
| Auth | JWT with 24h expiry |
| Passwords | bcrypt (12 rounds) |
| Transport | HTTPS only |
| CORS | Frontend origin only |
| Rate Limiting | 100 req/15min (API), 10 req/min (AI) |
| Validation | Zod schemas all endpoints |
| Headers | Helmet security headers |

---

## Infrastructure

### Production Setup

```
Ubuntu VPS (4GB RAM, 2 vCPU)
├── Docker
│   ├── nginx (reverse proxy, SSL)
│   ├── frontend (React build)
│   ├── backend (Node.js)
│   └── postgres (database)
└── Volumes
    ├── /var/lib/medrecord/postgres
    └── /var/lib/medrecord/uploads
```

### Estimated Costs

| Item | Monthly Cost |
|------|--------------|
| VPS | $24 |
| OpenAI APIs | ~$10 |
| Domain | ~$1 |
| **Total** | **~$35/month** |

---

## Ready-for-Implementation Checklist

### Architecture Documentation

- [x] High-level architecture defined
- [x] Component responsibilities documented
- [x] Database schema designed
- [x] API endpoints specified
- [x] AI integration detailed
- [x] Security architecture defined
- [x] Infrastructure plan created
- [x] Technology decisions justified

### Diagrams Created

- [x] System architecture (Mermaid)
- [x] Sequence diagrams (4 flows)
- [x] Component hierarchy
- [x] Deployment architecture
- [x] ERD diagram

### Ready for Development

- [x] Tech stack finalized
- [x] Database schema ready
- [x] API structure defined
- [x] Authentication approach clear
- [x] AI prompts drafted
- [x] Infrastructure plan ready

---

## Document Index

| Document | Purpose |
|----------|---------|
| [high-level-architecture.md](./high-level-architecture.md) | Architecture pattern, components |
| [components.md](./components.md) | Detailed component specs |
| [integrations.md](./integrations.md) | AI and external services |
| [security.md](./security.md) | Security architecture |
| [infrastructure.md](./infrastructure.md) | Deployment, Docker, CI/CD |
| [tech-decisions.md](./tech-decisions.md) | Technology choices |
| [diagrams/system-architecture.md](./diagrams/system-architecture.md) | Mermaid diagrams |
| [diagrams/sequence-diagrams.md](./diagrams/sequence-diagrams.md) | Flow diagrams |

---

## Next Steps

1. **Prompt 04**: Finalize technology stack details
2. **Prompt 05**: Database schema implementation
3. **Prompt 06**: Project setup and initialization
4. **Prompt 07**: Begin feature implementation

---

*MedRecord AI MVP - Architecture Summary*
