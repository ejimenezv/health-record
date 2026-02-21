# Prompt 12: Work Tickets Definition

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the THIRTEENTH prompt in the series. All documentation phases are complete. Now we define work tickets for implementation.

## Prerequisites
Before proceeding, read the following files:
- `docs/stories/must-have-stories.md`
- `docs/stories/should-have-stories.md`
- `docs/stories/cards/` (all story cards)
- `docs/stories/dependencies.md`
- `docs/api/api-summary.md`
- `docs/frontend/frontend-summary.md`
- `docs/data-model/prisma-schema.md`
- `docs/testing/testing-summary.md`

## Objective
Create detailed work tickets that break down the user stories into implementable tasks. Each ticket should have all information needed for a developer to implement the feature.

## Ticket Format
Use this format for each ticket:

```markdown
# Ticket [ID]: [Title]

## Type
[Feature / Bug / Technical / Documentation]

## Priority
[P0-Critical / P1-High / P2-Medium / P3-Low]

## Story Reference
[US-XXX: Story Title]

## Description
[What needs to be built and why]

## Acceptance Criteria
- [ ] [Specific, testable criteria]
- [ ] [Specific, testable criteria]

## Technical Requirements

### Backend Tasks
- [ ] [Specific backend task]

### Frontend Tasks
- [ ] [Specific frontend task]

### Database Tasks
- [ ] [Specific database task]

## API Endpoints Involved
[List endpoints to create/modify]

## Components Involved
[List frontend components]

## Data Models Involved
[List Prisma models]

## Testing Requirements
- [ ] Unit tests: [specific tests]
- [ ] Integration tests: [specific tests]
- [ ] E2E tests: [if applicable]

## Dependencies
[Other tickets this depends on]

## Estimation
[Story points: 1, 2, 3, 5, 8, 13]

## Implementation Notes
[Technical guidance, edge cases, warnings]

## Files to Create/Modify
### Backend
- [path/to/file.ts]

### Frontend
- [path/to/file.tsx]

## Definition of Done
- [ ] Code implemented
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Works locally
```

## Tasks

### 1. Create Technical Setup Ticket
Create `docs/tickets/TICKET-000-project-setup.md`:

```markdown
# Ticket 000: Project Setup and Configuration

## Type
Technical

## Priority
P0-Critical

## Description
Initialize the monorepo project structure with all necessary configuration files, dependencies, and development environment setup.

## Acceptance Criteria
- [ ] Monorepo structure created with pnpm workspaces
- [ ] Backend package initialized with Express + TypeScript
- [ ] Frontend package initialized with Vite + React + TypeScript
- [ ] Prisma configured with PostgreSQL
- [ ] Docker Compose for local database
- [ ] ESLint + Prettier configured
- [ ] Git hooks with Husky
- [ ] Environment variables template

## Technical Requirements

### Root Setup
- [ ] Initialize pnpm workspace
- [ ] Create root package.json with workspace scripts
- [ ] Create root tsconfig.base.json
- [ ] Configure ESLint and Prettier
- [ ] Create .gitignore
- [ ] Create .env.example

### Backend Setup
- [ ] Initialize Node.js project
- [ ] Install Express, TypeScript, Prisma
- [ ] Configure TypeScript
- [ ] Create initial folder structure
- [ ] Set up Prisma with initial schema
- [ ] Create development scripts

### Frontend Setup
- [ ] Initialize Vite React project
- [ ] Configure TypeScript
- [ ] Set up Tailwind CSS
- [ ] Install shadcn/ui
- [ ] Configure routing
- [ ] Create initial folder structure

### Docker Setup
- [ ] Create docker-compose.yml with PostgreSQL
- [ ] Create Dockerfiles (optional for dev)

## Files to Create
[List all initial files as per project-structure documentation]

## Definition of Done
- [ ] `pnpm install` works
- [ ] `pnpm dev` starts both frontend and backend
- [ ] Database connects successfully
- [ ] Sample API endpoint works
- [ ] Sample React page renders
```

### 2. Create Database Migration Ticket
Create `docs/tickets/TICKET-001-database-schema.md`:

```markdown
# Ticket 001: Database Schema Implementation

## Type
Technical

## Priority
P0-Critical

## Story Reference
US-011: Data Persistence

## Description
Implement the complete database schema using Prisma, including all entities, relationships, and seed data.

## Acceptance Criteria
- [ ] All entities defined in Prisma schema
- [ ] Migrations generated and applied
- [ ] Seed script creates test data
- [ ] Database indexes created

## Technical Requirements

### Database Tasks
- [ ] Define User model
- [ ] Define Patient model with User relation
- [ ] Define Appointment model with Patient relation
- [ ] Define MedicalRecord model with Appointment relation
- [ ] Define Symptom model with MedicalRecord relation
- [ ] Define Diagnosis model with MedicalRecord relation
- [ ] Define Prescription model with MedicalRecord relation
- [ ] Define Transcription model with Appointment relation
- [ ] Create enums (AppointmentStatus)
- [ ] Define indexes for search optimization
- [ ] Create initial migration
- [ ] Create seed script with test data

## Testing Requirements
- [ ] Migration runs successfully
- [ ] Seed data inserts correctly
- [ ] Relationships work as expected

## Files to Create/Modify
### Backend
- packages/backend/prisma/schema.prisma
- packages/backend/prisma/seed.ts
- packages/backend/prisma/migrations/[initial]

## Definition of Done
- [ ] `pnpm db:migrate` runs successfully
- [ ] `pnpm db:seed` populates test data
- [ ] Schema matches data model documentation
```

### 3. Create Authentication Tickets
Create `docs/tickets/TICKET-002-auth-backend.md`:

```markdown
# Ticket 002: Authentication Backend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-010: User Authentication

## Description
Implement JWT-based authentication for the API including registration, login, and middleware.

## Acceptance Criteria
- [ ] User can register with email/password
- [ ] User can login and receive JWT
- [ ] Protected routes require valid JWT
- [ ] Token includes user ID and expiration
- [ ] Password is hashed with bcrypt

## Technical Requirements

### Backend Tasks
- [ ] Create auth.service.ts with register/login methods
- [ ] Create auth.controller.ts with route handlers
- [ ] Create auth.routes.ts
- [ ] Create auth.middleware.ts for JWT validation
- [ ] Create auth.validator.ts with Zod schemas
- [ ] Create jwt.ts utility
- [ ] Add User repository methods

## API Endpoints
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me

## Testing Requirements
- [ ] Unit tests for auth.service
- [ ] Integration tests for auth routes
- [ ] Test password hashing
- [ ] Test JWT generation and validation
- [ ] Test invalid credentials handling

## Files to Create
### Backend
- src/routes/auth.routes.ts
- src/controllers/auth.controller.ts
- src/services/auth.service.ts
- src/middleware/auth.middleware.ts
- src/validators/auth.validator.ts
- src/utils/jwt.ts
- tests/unit/services/auth.service.test.ts
- tests/integration/routes/auth.routes.test.ts

## Definition of Done
- [ ] All auth endpoints functional
- [ ] All tests passing
- [ ] Works with frontend login
```

Create `docs/tickets/TICKET-003-auth-frontend.md`:

```markdown
# Ticket 003: Authentication Frontend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-010: User Authentication

## Description
Implement login page and authentication state management in the frontend.

## Acceptance Criteria
- [ ] Login form with email/password
- [ ] Form validation with error messages
- [ ] Successful login redirects to dashboard
- [ ] Auth state persisted in localStorage
- [ ] Protected routes redirect to login
- [ ] Logout functionality

## Technical Requirements

### Frontend Tasks
- [ ] Create LoginPage component
- [ ] Create auth.api.ts service
- [ ] Create useAuth hook
- [ ] Create auth store (Zustand)
- [ ] Create ProtectedRoute component
- [ ] Configure axios interceptor for auth header
- [ ] Add logout functionality

## Components
- LoginPage
- ProtectedRoute
- (Header with logout button)

## Testing Requirements
- [ ] Unit tests for useAuth hook
- [ ] Unit tests for LoginPage
- [ ] E2E test for login flow

## Files to Create
### Frontend
- src/pages/auth/LoginPage.tsx
- src/services/auth.api.ts
- src/hooks/useAuth.ts
- src/store/auth.store.ts
- src/components/auth/ProtectedRoute.tsx
- tests/unit/hooks/useAuth.test.ts
- tests/unit/components/LoginPage.test.tsx

## Dependencies
- TICKET-002: Auth Backend must be complete

## Definition of Done
- [ ] Login works end-to-end
- [ ] Auth state persists on refresh
- [ ] Protected routes work correctly
```

### 4. Create Patient Management Tickets
Create `docs/tickets/TICKET-004-patients-backend.md` and `docs/tickets/TICKET-005-patients-frontend.md` for US-001 and US-002.

### 5. Create Appointment Management Tickets
Create `docs/tickets/TICKET-006-appointments-backend.md` and `docs/tickets/TICKET-007-appointments-frontend.md` for US-003 and US-004.

### 6. Create Medical Record Tickets
Create `docs/tickets/TICKET-008-medical-records-backend.md` and `docs/tickets/TICKET-009-medical-records-frontend.md` for US-005.

### 7. Create AI Transcription Tickets
Create `docs/tickets/TICKET-010-transcription-backend.md`:

```markdown
# Ticket 010: AI Transcription Backend

## Type
Feature

## Priority
P1-High

## Story Reference
US-006: AI Transcription Recording
US-007: AI Auto-Fill Medical Record

## Description
Implement the backend services for audio transcription using OpenAI Whisper and field extraction using GPT-4.

## Acceptance Criteria
- [ ] WebSocket endpoint for real-time communication
- [ ] Audio upload endpoint accepts chunks
- [ ] Whisper API integration transcribes audio
- [ ] GPT-4 API extracts medical fields
- [ ] Transcription stored in database
- [ ] Error handling for API failures

## Technical Requirements

### Backend Tasks
- [ ] Create whisper.service.ts for transcription
- [ ] Create gpt.service.ts for field extraction
- [ ] Create extraction.service.ts for parsing
- [ ] Create transcription.controller.ts
- [ ] Create transcription.routes.ts
- [ ] Set up WebSocket with Socket.io
- [ ] Create transcription.handler.ts for WS events
- [ ] Handle audio file processing (multer)
- [ ] Create audio.ts utility

## API Endpoints
- POST /api/v1/appointments/:id/transcription/start
- POST /api/v1/appointments/:id/transcription/audio
- POST /api/v1/appointments/:id/transcription/stop
- POST /api/v1/appointments/:id/extract-fields
- GET /api/v1/appointments/:id/transcription

## WebSocket Events
- audio_chunk (client → server)
- transcription_update (server → client)
- field_extraction (server → client)
- error (server → client)

## Testing Requirements
- [ ] Unit tests for whisper.service (mocked API)
- [ ] Unit tests for gpt.service (mocked API)
- [ ] Unit tests for extraction.service
- [ ] Integration tests for transcription routes
- [ ] WebSocket event handling tests

## Files to Create
### Backend
- src/services/ai/whisper.service.ts
- src/services/ai/gpt.service.ts
- src/services/ai/extraction.service.ts
- src/controllers/transcription.controller.ts
- src/routes/transcription.routes.ts
- src/websocket/index.ts
- src/websocket/transcription.handler.ts
- src/utils/audio.ts
- tests/unit/services/ai/*.test.ts
- tests/integration/routes/transcription.routes.test.ts

## Environment Variables
- OPENAI_API_KEY

## Definition of Done
- [ ] Transcription API fully functional
- [ ] Field extraction returns structured data
- [ ] WebSocket communication works
- [ ] All tests passing
- [ ] Errors handled gracefully
```

Create `docs/tickets/TICKET-011-transcription-frontend.md`:

```markdown
# Ticket 011: AI Transcription Frontend

## Type
Feature

## Priority
P1-High

## Story Reference
US-006: AI Transcription Recording
US-007: AI Auto-Fill Medical Record

## Description
Implement the frontend components for audio recording, real-time transcription display, and auto-fill integration.

## Acceptance Criteria
- [ ] Audio recording with start/stop controls
- [ ] Real-time transcription display as audio is processed
- [ ] Visual indicators for AI extraction status
- [ ] Auto-population of medical record fields
- [ ] Ability to accept/reject AI suggestions
- [ ] Handles 60-minute recordings
- [ ] Error handling for audio/API failures

## Technical Requirements

### Frontend Tasks
- [ ] Create AudioRecorder component with MediaRecorder
- [ ] Create TranscriptionPanel component
- [ ] Create TranscriptionDisplay component
- [ ] Create AIExtractionStatus component
- [ ] Create useAudioRecorder hook
- [ ] Create useTranscription hook with WebSocket
- [ ] Create transcription store (Zustand)
- [ ] Create transcription.api.ts
- [ ] Integrate with MedicalRecordForm
- [ ] Add AI suggestion indicators to form sections
- [ ] Add accept/reject buttons for AI suggestions

## Components
- TranscriptionPanel
- AudioRecorder
- TranscriptionDisplay
- AIExtractionStatus
- SymptomsSection (update for AI)
- DiagnosisSection (update for AI)
- PrescriptionsSection (update for AI)

## Testing Requirements
- [ ] Unit tests for AudioRecorder
- [ ] Unit tests for useAudioRecorder
- [ ] Unit tests for TranscriptionDisplay
- [ ] E2E test for transcription flow (mocked)

## Files to Create
### Frontend
- src/components/transcription/TranscriptionPanel.tsx
- src/components/transcription/AudioRecorder.tsx
- src/components/transcription/TranscriptionDisplay.tsx
- src/components/transcription/AIExtractionStatus.tsx
- src/hooks/useAudioRecorder.ts
- src/hooks/useTranscription.ts
- src/store/transcription.store.ts
- src/services/transcription.api.ts
- tests/unit/components/transcription/*.test.tsx
- tests/unit/hooks/useAudioRecorder.test.ts

## Dependencies
- TICKET-010: Transcription Backend
- TICKET-009: Medical Records Frontend

## Definition of Done
- [ ] Recording works on Chrome/Firefox
- [ ] Transcription displays in real-time
- [ ] Fields auto-populate with AI data
- [ ] User can accept/reject suggestions
- [ ] All tests passing
```

### 8. Create Summary Generation Ticket (Should-Have)
Create `docs/tickets/TICKET-012-summary-generation.md` for US-008.

### 9. Create Ticket Index
Create `docs/tickets/ticket-index.md`:

```markdown
# Work Tickets Index

## Implementation Order

### Phase 1: Foundation (Sprint 1)
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| TICKET-000 | Project Setup | P0 | None |
| TICKET-001 | Database Schema | P0 | TICKET-000 |
| TICKET-002 | Auth Backend | P0 | TICKET-001 |
| TICKET-003 | Auth Frontend | P0 | TICKET-002 |

### Phase 2: Core Features (Sprint 2)
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| TICKET-004 | Patients Backend | P0 | TICKET-002 |
| TICKET-005 | Patients Frontend | P0 | TICKET-003, TICKET-004 |
| TICKET-006 | Appointments Backend | P0 | TICKET-004 |
| TICKET-007 | Appointments Frontend | P0 | TICKET-005, TICKET-006 |

### Phase 3: Medical Records (Sprint 3)
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| TICKET-008 | Medical Records Backend | P0 | TICKET-006 |
| TICKET-009 | Medical Records Frontend | P0 | TICKET-007, TICKET-008 |

### Phase 4: AI Integration (Sprint 4)
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| TICKET-010 | Transcription Backend | P1 | TICKET-008 |
| TICKET-011 | Transcription Frontend | P1 | TICKET-009, TICKET-010 |

### Phase 5: Enhancements (Sprint 5)
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| TICKET-012 | Summary Generation | P2 | TICKET-010 |

## Summary
- Total Tickets: 13
- P0 (Critical): 10
- P1 (High): 2
- P2 (Medium): 1

## Estimated Total Story Points
[Sum of all story points]
```

### 10. Fill Template Section 6 (Spanish)
Create `docs/deliverables/section-6-tickets.md`:

```markdown
## 6. Tickets de Trabajo

### Ticket 1: Backend - Implementación de Autenticación

**ID:** TICKET-002

**Título:** Autenticación Backend con JWT

**Descripción:**
Implementar sistema de autenticación basado en JWT incluyendo registro de usuarios, inicio de sesión y middleware de protección de rutas.

**Criterios de Aceptación:**
- El usuario puede registrarse con email y contraseña
- El usuario puede iniciar sesión y recibir un token JWT
- Las rutas protegidas requieren un JWT válido
- La contraseña se almacena hasheada con bcrypt

**Tareas Técnicas:**
1. Crear auth.service.ts con métodos register/login
2. Crear auth.controller.ts con manejadores de rutas
3. Crear auth.middleware.ts para validación de JWT
4. Crear esquemas de validación con Zod
5. Implementar tests unitarios e integración

**Endpoints:**
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me

**Estimación:** 5 story points

---

### Ticket 2: Frontend - Página de Cita Médica con Transcripción

**ID:** TICKET-011

**Título:** Frontend de Transcripción con IA

**Descripción:**
Implementar la interfaz de usuario para la grabación de audio, visualización de transcripción en tiempo real, y auto-llenado de campos del registro médico.

**Criterios de Aceptación:**
- Controles de grabación (iniciar/detener)
- Transcripción se muestra en tiempo real
- Campos se llenan automáticamente con sugerencias de IA
- Usuario puede aceptar/rechazar sugerencias
- Indicadores visuales del estado de extracción

**Tareas Técnicas:**
1. Crear componente AudioRecorder con MediaRecorder API
2. Crear TranscriptionPanel con WebSocket
3. Integrar sugerencias de IA en formulario médico
4. Implementar hooks useAudioRecorder y useTranscription
5. Crear store de Zustand para estado de transcripción

**Componentes:**
- TranscriptionPanel
- AudioRecorder
- TranscriptionDisplay
- AIExtractionStatus

**Estimación:** 8 story points

---

### Ticket 3: Base de Datos - Esquema y Migraciones

**ID:** TICKET-001

**Título:** Implementación del Esquema de Base de Datos

**Descripción:**
Definir el esquema completo de la base de datos usando Prisma, incluyendo todas las entidades, relaciones, índices y datos semilla.

**Criterios de Aceptación:**
- Todas las entidades definidas en schema.prisma
- Migraciones generadas y aplicables
- Script de seed crea datos de prueba
- Índices optimizados para búsquedas frecuentes

**Tareas Técnicas:**
1. Definir modelo User con campos de autenticación
2. Definir modelo Patient con relación a User
3. Definir modelo Appointment con relación a Patient
4. Definir modelos MedicalRecord, Symptom, Diagnosis, Prescription
5. Definir modelo Transcription
6. Crear enums y tipos
7. Crear migración inicial
8. Crear script de seed

**Entidades:**
- User, Patient, Appointment, MedicalRecord
- Symptom, Diagnosis, Prescription, Transcription

**Estimación:** 3 story points
```

### 11. Create Tickets Summary
Create `docs/tickets/tickets-summary.md` with quick reference for all tickets.

## Output Structure
```
docs/
├── ... (previous folders)
├── tickets/
│   ├── ticket-index.md
│   ├── tickets-summary.md
│   ├── TICKET-000-project-setup.md
│   ├── TICKET-001-database-schema.md
│   ├── TICKET-002-auth-backend.md
│   ├── TICKET-003-auth-frontend.md
│   ├── TICKET-004-patients-backend.md
│   ├── TICKET-005-patients-frontend.md
│   ├── TICKET-006-appointments-backend.md
│   ├── TICKET-007-appointments-frontend.md
│   ├── TICKET-008-medical-records-backend.md
│   ├── TICKET-009-medical-records-frontend.md
│   ├── TICKET-010-transcription-backend.md
│   ├── TICKET-011-transcription-frontend.md
│   └── TICKET-012-summary-generation.md
└── deliverables/
    ├── ... (previous sections)
    └── section-6-tickets.md
```

## Success Criteria
- All tickets created with full details
- Implementation order defined
- Dependencies mapped
- Section 6 content ready in Spanish (3 tickets)
- Ticket index created
- Summary created

## Next Prompts
The following prompts will implement each ticket sequentially:
- 13-implement-ticket-000.md (Project Setup)
- 14-implement-ticket-001.md (Database Schema)
- ... and so on for each ticket
