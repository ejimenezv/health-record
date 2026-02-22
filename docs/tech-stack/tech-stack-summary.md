# Technology Stack Summary: MedRecord AI

Complete technology reference for the Medical Record System MVP.

---

## Quick Reference Table

### Complete Stack Overview

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend Framework** | React | 18.2.x | UI library |
| **Frontend Language** | TypeScript | 5.3.x | Type safety |
| **Build Tool** | Vite | 5.1.x | Development/bundling |
| **Styling** | Tailwind CSS | 3.4.x | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix | Latest | Accessible components |
| **Icons** | Lucide React | Latest | Icon library |
| **State Management** | React Query | 5.20.x | Server state |
| **Forms** | React Hook Form + Zod | 7.50.x / 3.22.x | Form handling |
| **HTTP Client** | Axios | 1.6.x | API calls |
| **Routing** | React Router | 6.22.x | Client-side routing |
| **Backend Runtime** | Node.js | 20.x LTS | JavaScript runtime |
| **Backend Framework** | Express.js | 4.18.x | Web framework |
| **ORM** | Prisma | 5.10.x | Database access |
| **Database** | PostgreSQL | 15.x | Primary database |
| **Authentication** | JWT + bcrypt | 9.0.x / 5.1.x | Auth tokens |
| **AI Transcription** | OpenAI Whisper | whisper-1 | Speech-to-text |
| **AI Extraction** | OpenAI GPT-4 | gpt-4 | Text processing |
| **Logging** | Pino | 8.19.x | Structured logging |
| **Testing** | Vitest | 1.2.x | Test runner |
| **E2E Testing** | Playwright | 1.41.x | Browser testing |
| **Containerization** | Docker | 24.x+ | Containers |
| **Reverse Proxy** | Nginx | Alpine | HTTP proxy |
| **CI/CD** | GitHub Actions | - | Automation |
| **Hosting** | Ubuntu VPS | 22.04 LTS | Server |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Vite                              │  │
│  │  ├── React Router (routing)                                │  │
│  │  ├── React Query (server state)                            │  │
│  │  ├── React Hook Form + Zod (forms)                         │  │
│  │  ├── Tailwind CSS + shadcn/ui (styling)                    │  │
│  │  └── MediaRecorder API (audio)                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                        HTTPS (REST)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Node.js 20 + Express 4 + TypeScript                       │  │
│  │  ├── JWT Authentication                                    │  │
│  │  ├── Zod Validation                                        │  │
│  │  ├── Prisma ORM                                            │  │
│  │  ├── OpenAI SDK                                            │  │
│  │  └── Pino Logging                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                                    │
           │                                    │
           ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│    PostgreSQL 15    │              │    OpenAI APIs      │
│    + Prisma ORM     │              │  Whisper + GPT-4    │
└─────────────────────┘              └─────────────────────┘
```

---

## Version Requirements

### Minimum Versions

| Software | Minimum | Recommended |
|----------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Docker | 20.x | 24.x |
| PostgreSQL | 14.x | 15.x |
| Git | 2.30+ | 2.40+ |

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 14.1+ |
| Edge | 90+ |

---

## Quick Setup Checklist

### Prerequisites

- [ ] Node.js 20.x LTS installed
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] VS Code installed (recommended)
- [ ] OpenAI API key obtained

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-repo/medrecord-ai.git
cd medrecord-ai

# 2. Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && npx prisma generate && cd ..

# 3. Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Add your OpenAI API key to backend/.env
# OPENAI_API_KEY=sk-your-key-here

# 5. Start database
docker compose up -d postgres

# 6. Run migrations
cd backend && npx prisma migrate dev && cd ..

# 7. Start development servers
docker compose up
# OR
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev
```

### Verify Setup

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | http://localhost:5173 | Login page |
| Backend API | http://localhost:3000/api/health | `{"status":"healthy"}` |
| Prisma Studio | http://localhost:5555 | Database browser |

---

## Environment Variables

### Backend Required

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/medrecord"
JWT_SECRET="minimum-32-character-secret-key"
OPENAI_API_KEY="sk-your-openai-api-key"
FRONTEND_URL="http://localhost:5173"
```

### Frontend Required

```bash
VITE_API_URL="http://localhost:3000/api"
```

---

## Key Commands

### Development

| Task | Command |
|------|---------|
| Start all services | `docker compose up` |
| Start backend only | `cd backend && npm run dev` |
| Start frontend only | `cd frontend && npm run dev` |
| Open Prisma Studio | `cd backend && npx prisma studio` |

### Database

| Task | Command |
|------|---------|
| Create migration | `npx prisma migrate dev --name name` |
| Apply migrations | `npx prisma migrate deploy` |
| Reset database | `npx prisma migrate reset` |
| Generate client | `npx prisma generate` |
| Seed database | `npx prisma db seed` |

### Testing

| Task | Command |
|------|---------|
| Run tests | `npm test` |
| Watch mode | `npm run test:watch` |
| Coverage report | `npm run test:coverage` |
| E2E tests | `npx playwright test` |

### Quality

| Task | Command |
|------|---------|
| Lint code | `npm run lint` |
| Fix lint issues | `npm run lint:fix` |
| Format code | `npm run format` |
| Type check | `npm run type-check` |

---

## Project Structure

```
medrecord-ai/
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── lib/             # Utilities
│   │   └── types/           # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Migration files
│   └── package.json
│
├── docs/
│   ├── architecture/        # Architecture docs
│   └── tech-stack/          # Tech stack docs
│
├── docker-compose.yml
└── README.md
```

---

## Cost Estimates

### Monthly Infrastructure

| Service | Cost |
|---------|------|
| VPS (4GB RAM) | $20-24 |
| Domain | ~$1 |
| SSL | Free (Let's Encrypt) |
| **Infrastructure Total** | **~$25** |

### Monthly AI Usage (100 appointments)

| Service | Cost |
|---------|------|
| Whisper (~15 min avg) | ~$10 |
| GPT-4 extraction | ~$8 |
| **AI Total** | **~$18** |

### Total Estimated Monthly Cost

| Usage Level | Cost |
|-------------|------|
| Low (50 appointments) | ~$35 |
| Medium (100 appointments) | ~$43 |
| High (200 appointments) | ~$60 |

---

## Technology Documentation Links

### Frontend

| Technology | Documentation |
|------------|---------------|
| React | https://react.dev/ |
| Vite | https://vitejs.dev/ |
| TypeScript | https://www.typescriptlang.org/docs/ |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com/ |
| React Query | https://tanstack.com/query/latest |
| React Hook Form | https://react-hook-form.com/ |
| Zod | https://zod.dev/ |
| React Router | https://reactrouter.com/ |
| Lucide Icons | https://lucide.dev/ |

### Backend

| Technology | Documentation |
|------------|---------------|
| Node.js | https://nodejs.org/docs/ |
| Express.js | https://expressjs.com/ |
| Prisma | https://www.prisma.io/docs |
| OpenAI SDK | https://platform.openai.com/docs |
| Pino | https://getpino.io/ |

### Infrastructure

| Technology | Documentation |
|------------|---------------|
| Docker | https://docs.docker.com/ |
| Docker Compose | https://docs.docker.com/compose/ |
| Nginx | https://nginx.org/en/docs/ |
| PostgreSQL | https://www.postgresql.org/docs/ |
| GitHub Actions | https://docs.github.com/en/actions |
| Let's Encrypt | https://letsencrypt.org/docs/ |

### Testing

| Technology | Documentation |
|------------|---------------|
| Vitest | https://vitest.dev/ |
| React Testing Library | https://testing-library.com/docs/react-testing-library/intro/ |
| Playwright | https://playwright.dev/ |

---

## Document Index

| Document | Description |
|----------|-------------|
| [frontend.md](./frontend.md) | Frontend technology details |
| [backend.md](./backend.md) | Backend technology details |
| [database.md](./database.md) | Database and Prisma details |
| [ai-services.md](./ai-services.md) | OpenAI integration details |
| [devops.md](./devops.md) | Docker, CI/CD, deployment |
| [testing.md](./testing.md) | Testing framework details |
| [dev-environment.md](./dev-environment.md) | Development setup guide |
| [dependencies.md](./dependencies.md) | Package dependencies list |

---

## Next Steps

After tech stack setup, proceed to:

1. **Prompt 05**: AI Integration Specifications
2. **Prompt 06**: Project Initialization
3. **Prompt 07**: Feature Implementation

---

*MedRecord AI MVP - Technology Stack Summary*
*Version: 1.0.0*
*Last Updated: February 2024*
