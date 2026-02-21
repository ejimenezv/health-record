# Prompt 07: Project Structure Definition

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the EIGHTH prompt in the series. Previous prompts completed research, product definition, user stories, architecture, tech stack, AI integration, and data modeling.

## Prerequisites
Before proceeding, read the following files:
- `docs/architecture/high-level-architecture.md`
- `docs/architecture/components.md`
- `docs/tech-stack/frontend.md`
- `docs/tech-stack/backend.md`
- `docs/tech-stack/dev-environment.md`
- `docs/data-model/prisma-schema.md`

## Objective
Define the complete project folder structure for a monorepo containing both frontend and backend. Create all initial configuration files and set up the development environment.

## Tasks

### 1. Define Root Project Structure
Create `docs/project-structure/root-structure.md` with:

```
health-record/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI pipeline
├── docs/                          # All documentation (existing)
├── packages/
│   ├── backend/                   # Node.js + Express API
│   └── frontend/                  # React + Vite app
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── scripts/
│   ├── setup.sh                   # Initial setup script
│   └── dev.sh                     # Development startup script
├── .env.example                   # Environment variables template
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── package.json                   # Root package.json (workspaces)
├── pnpm-workspace.yaml            # pnpm workspace config
├── tsconfig.base.json             # Shared TypeScript config
└── README.md
```

### 2. Define Backend Structure
Create `docs/project-structure/backend-structure.md` with:

```
packages/backend/
├── src/
│   ├── index.ts                   # Application entry point
│   ├── app.ts                     # Express app setup
│   ├── config/
│   │   ├── index.ts               # Configuration loader
│   │   ├── database.ts            # Database config
│   │   └── openai.ts              # OpenAI config
│   ├── routes/
│   │   ├── index.ts               # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── patients.routes.ts
│   │   ├── appointments.routes.ts
│   │   ├── medical-records.routes.ts
│   │   └── transcription.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── patients.controller.ts
│   │   ├── appointments.controller.ts
│   │   ├── medical-records.controller.ts
│   │   └── transcription.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── patients.service.ts
│   │   ├── appointments.service.ts
│   │   ├── medical-records.service.ts
│   │   ├── transcription.service.ts
│   │   └── ai/
│   │       ├── whisper.service.ts
│   │       ├── gpt.service.ts
│   │       └── extraction.service.ts
│   ├── repositories/
│   │   ├── base.repository.ts
│   │   ├── users.repository.ts
│   │   ├── patients.repository.ts
│   │   ├── appointments.repository.ts
│   │   └── medical-records.repository.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── logging.middleware.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── patients.validator.ts
│   │   ├── appointments.validator.ts
│   │   └── medical-records.validator.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── express.d.ts           # Express type extensions
│   │   ├── auth.types.ts
│   │   ├── patients.types.ts
│   │   ├── appointments.types.ts
│   │   ├── medical-records.types.ts
│   │   └── ai.types.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── jwt.ts
│   │   └── audio.ts
│   └── websocket/
│       ├── index.ts               # WebSocket setup
│       └── transcription.handler.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── routes/
│   │   └── repositories/
│   └── setup.ts
├── .env.example
├── .env.test
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── nodemon.json
```

### 3. Define Frontend Structure
Create `docs/project-structure/frontend-structure.md` with:

```
packages/frontend/
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── main.tsx                   # Application entry
│   ├── App.tsx                    # Root component
│   ├── vite-env.d.ts
│   ├── assets/
│   │   ├── images/
│   │   └── styles/
│   │       └── globals.css
│   ├── components/
│   │   ├── ui/                    # Base UI components (shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── patients/
│   │   │   ├── PatientList.tsx
│   │   │   ├── PatientCard.tsx
│   │   │   ├── PatientForm.tsx
│   │   │   └── PatientSearch.tsx
│   │   ├── appointments/
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── AppointmentCard.tsx
│   │   │   ├── AppointmentForm.tsx
│   │   │   └── AppointmentHistory.tsx
│   │   ├── medical-records/
│   │   │   ├── MedicalRecordForm.tsx
│   │   │   ├── SymptomsSection.tsx
│   │   │   ├── DiagnosisSection.tsx
│   │   │   ├── PrescriptionsSection.tsx
│   │   │   └── MedicalRecordView.tsx
│   │   └── transcription/
│   │       ├── TranscriptionPanel.tsx
│   │       ├── AudioRecorder.tsx
│   │       ├── TranscriptionDisplay.tsx
│   │       └── AIExtractionStatus.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── patients/
│   │   │   ├── PatientsPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   └── NewPatientPage.tsx
│   │   └── appointments/
│   │       ├── AppointmentPage.tsx
│   │       └── NewAppointmentPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePatients.ts
│   │   ├── useAppointments.ts
│   │   ├── useMedicalRecord.ts
│   │   ├── useTranscription.ts
│   │   └── useAudioRecorder.ts
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── auth.api.ts
│   │   ├── patients.api.ts
│   │   ├── appointments.api.ts
│   │   ├── medical-records.api.ts
│   │   └── transcription.api.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── auth.store.ts
│   │   └── transcription.store.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── auth.types.ts
│   │   ├── patients.types.ts
│   │   ├── appointments.types.ts
│   │   ├── medical-records.types.ts
│   │   └── transcription.types.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── audio.ts
│   ├── lib/
│   │   └── utils.ts               # shadcn utils
│   └── router/
│       └── index.tsx              # React Router setup
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   └── hooks/
│   ├── e2e/
│   │   └── flows/
│   └── setup.ts
├── .env.example
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
└── components.json              # shadcn config
```

### 4. Create Configuration Files
Create `docs/project-structure/config-files.md` with content for:

**Root package.json**:
```json
{
  "name": "health-record",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm --parallel dev",
    "build": "pnpm --recursive build",
    "test": "pnpm --recursive test",
    "lint": "pnpm --recursive lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "db:migrate": "pnpm --filter backend db:migrate",
    "db:seed": "pnpm --filter backend db:seed"
  },
  "devDependencies": {
    "prettier": "^3.x",
    "typescript": "^5.x"
  }
}
```

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'packages/*'
```

**tsconfig.base.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**.env.example**:
```env
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/healthrecord
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: healthrecord
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/healthrecord
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 5. Create Shared Types Definition
Create `docs/project-structure/shared-types.md` with:
- List of types that should be shared between frontend and backend
- Strategy for sharing (copy vs shared package)
- Recommended approach for MVP (copy with note for future improvement)

### 6. Create Development Scripts
Create `docs/project-structure/dev-scripts.md` with:

**scripts/setup.sh**:
- Install dependencies
- Copy env files
- Start database
- Run migrations
- Seed database

**scripts/dev.sh**:
- Start all services in development mode

### 7. Create Project Setup Instructions
Create `docs/project-structure/setup-instructions.md` with:
- Prerequisites (Node.js, pnpm, Docker)
- Step-by-step setup guide
- Troubleshooting common issues
- Verification steps

### 8. Create Project Structure Summary
Create `docs/project-structure/structure-summary.md` with:
- Quick reference structure
- Key directories explained
- File naming conventions
- Import path conventions

## Output Structure
```
docs/
├── research/           (from prompt 00)
├── product/            (from prompt 01)
├── stories/            (from prompt 02)
├── architecture/       (from prompt 03)
├── tech-stack/         (from prompt 04)
├── ai-integration/     (from prompt 05)
├── data-model/         (from prompt 06)
├── project-structure/
│   ├── root-structure.md
│   ├── backend-structure.md
│   ├── frontend-structure.md
│   ├── config-files.md
│   ├── shared-types.md
│   ├── dev-scripts.md
│   ├── setup-instructions.md
│   └── structure-summary.md
└── deliverables/
    └── ... (previous sections)
```

## Success Criteria
- Complete root project structure defined
- Backend folder structure defined with all directories
- Frontend folder structure defined with all directories
- All configuration files documented
- Development scripts documented
- Setup instructions complete
- Structure summary created

## Next Prompt
The next prompt (08-api-specification.md) will define the complete API specification using this project structure.
