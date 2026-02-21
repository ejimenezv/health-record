# Prompt 04: Technology Stack Definition

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the FIFTH prompt in the series. Previous prompts completed research, product definition, user stories, and system architecture.

## Prerequisites
Before proceeding, read the following files:
- `docs/architecture/high-level-architecture.md`
- `docs/architecture/components.md`
- `docs/architecture/integrations.md`
- `docs/architecture/tech-decisions.md`
- `docs/architecture/architecture-summary.md`

## Objective
Define the complete and final technology stack for the Medical Record System MVP. Document specific versions, libraries, and tools that will be used throughout development.

## Tasks

### 1. Define Frontend Stack
Create `docs/tech-stack/frontend.md` with:

**Core Framework**:
- React 18+ with TypeScript
- Justify choice over alternatives (Vue, Angular, Svelte)

**Build Tools**:
- Vite (recommended for speed) or Create React App
- TypeScript configuration

**State Management**:
- React Context + useReducer for simpler state
- OR Zustand/Redux Toolkit for complex state
- Document the choice and justification

**UI Components**:
- Component library choice: Tailwind CSS + shadcn/ui (recommended)
- OR Material-UI, Chakra UI, Ant Design
- Icons library (Lucide, Heroicons)
- Form handling (React Hook Form recommended)

**Audio Handling**:
- Web Audio API
- MediaRecorder API for audio capture
- Required polyfills if any

**Real-time Communication**:
- Socket.io-client (if using WebSockets)
- OR native fetch with polling

**HTTP Client**:
- Axios or native fetch
- API client structure

**Routing**:
- React Router v6

**Development Tools**:
- ESLint configuration
- Prettier configuration
- TypeScript strict mode

### 2. Define Backend Stack
Create `docs/tech-stack/backend.md` with:

**Core Framework**:
- Node.js (v20 LTS) + Express.js
- OR Node.js + Fastify
- OR NestJS (more structured)
- Document choice and justification

**Language**:
- TypeScript with strict configuration

**API Design**:
- RESTful API design
- API versioning approach
- Request/response validation (Zod, Joi, or class-validator)

**Authentication**:
- JWT with jsonwebtoken
- bcrypt for password hashing
- Session management approach

**Database Access**:
- Prisma ORM (recommended for TypeScript)
- OR TypeORM, Sequelize
- Connection pooling configuration

**AI Integration**:
- OpenAI SDK (@openai/openai)
- Audio file handling (multer for uploads)
- Streaming response handling

**Real-time**:
- Socket.io (if using WebSockets)
- Event handling architecture

**Logging**:
- Winston or Pino
- Log levels and formatting

**Development Tools**:
- Nodemon or tsx for development
- ESLint + Prettier
- Environment variable management (dotenv)

### 3. Define Database Stack
Create `docs/tech-stack/database.md` with:

**Primary Database**:
- PostgreSQL 15+
- Justify choice over MySQL, MongoDB

**ORM/Query Builder**:
- Prisma (with migrations)
- Schema definition approach

**Development Database**:
- Local PostgreSQL via Docker
- OR SQLite for simpler setup

**Database Tools**:
- pgAdmin or DBeaver for administration
- Database migration strategy
- Seed data approach

### 4. Define AI/ML Stack
Create `docs/tech-stack/ai-services.md` with:

**Transcription**:
- OpenAI Whisper API
- Audio format requirements (mp3, wav, webm)
- File size limitations
- Cost considerations

**Text Processing/Extraction**:
- OpenAI GPT-4 or GPT-4-turbo
- Prompt engineering approach
- Structured output (JSON mode)
- Token management

**Alternative Options**:
- Document fallback options (Google Speech-to-Text, AssemblyAI)
- Cost comparison

**API Key Management**:
- Environment variables
- Rate limiting handling
- Error handling for API failures

### 5. Define DevOps Stack
Create `docs/tech-stack/devops.md` with:

**Containerization**:
- Docker for all services
- Docker Compose for local development
- Dockerfile best practices

**CI/CD**:
- GitHub Actions (recommended)
- Pipeline stages (lint, test, build, deploy)
- Deployment triggers

**Deployment**:
- Ubuntu Server setup
- Nginx as reverse proxy
- PM2 or Docker for process management
- SSL with Let's Encrypt

**Monitoring** (basic for MVP):
- Application logs
- Health check endpoints

### 6. Define Testing Stack
Create `docs/tech-stack/testing.md` with:

**Frontend Testing**:
- Vitest or Jest for unit tests
- React Testing Library
- Playwright or Cypress for E2E tests

**Backend Testing**:
- Jest or Vitest
- Supertest for API testing
- Test database strategy

**Coverage Tools**:
- Coverage thresholds
- Coverage reporting

### 7. Define Development Environment
Create `docs/tech-stack/dev-environment.md` with:

**Required Software**:
- Node.js v20 LTS
- npm or pnpm
- Docker Desktop
- Git
- VS Code (recommended)

**VS Code Extensions** (recommended):
- ESLint
- Prettier
- TypeScript
- Prisma
- Tailwind CSS IntelliSense
- GitLens

**Environment Variables**:
- List all required env vars
- Template .env.example file structure

### 8. Create Package Dependencies
Create `docs/tech-stack/dependencies.md` with:

**Frontend package.json** (preview):
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "@tanstack/react-query": "^5.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "tailwindcss": "^3.x",
    // ... other dependencies
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^1.x",
    // ... other dev dependencies
  }
}
```

**Backend package.json** (preview):
```json
{
  "dependencies": {
    "express": "^4.x",
    "@prisma/client": "^5.x",
    "openai": "^4.x",
    "jsonwebtoken": "^9.x",
    "bcrypt": "^5.x",
    "zod": "^3.x",
    // ... other dependencies
  },
  "devDependencies": {
    "typescript": "^5.x",
    "prisma": "^5.x",
    "vitest": "^1.x",
    // ... other dev dependencies
  }
}
```

### 9. Create Tech Stack Summary
Create `docs/tech-stack/tech-stack-summary.md` with:
- Complete technology table
- Version requirements
- Quick setup checklist
- Links to documentation for each technology

## Output Structure
```
docs/
├── research/           (from prompt 00)
├── product/            (from prompt 01)
├── stories/            (from prompt 02)
├── architecture/       (from prompt 03)
├── tech-stack/
│   ├── frontend.md
│   ├── backend.md
│   ├── database.md
│   ├── ai-services.md
│   ├── devops.md
│   ├── testing.md
│   ├── dev-environment.md
│   ├── dependencies.md
│   └── tech-stack-summary.md
└── deliverables/
    └── ... (previous sections)
```

## Success Criteria
- Complete frontend stack defined with versions
- Complete backend stack defined with versions
- Database technology and tools defined
- AI services and APIs defined
- DevOps tools and processes defined
- Testing framework defined
- Development environment documented
- All dependencies listed
- Tech stack summary created

## Next Prompt
The next prompt (05-ai-integration.md) will provide detailed AI integration specifications based on this tech stack.
