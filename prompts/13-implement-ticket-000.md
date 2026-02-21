# Prompt 13: Implement TICKET-000 - Project Setup

## Context
You are implementing the Medical Record System MVP. This is the FIRST implementation prompt. All documentation is complete in the `docs/` folder.

## Prerequisites
Read the following documentation files:
- `docs/tickets/TICKET-000-project-setup.md`
- `docs/project-structure/root-structure.md`
- `docs/project-structure/backend-structure.md`
- `docs/project-structure/frontend-structure.md`
- `docs/project-structure/config-files.md`
- `docs/tech-stack/frontend.md`
- `docs/tech-stack/backend.md`
- `docs/tech-stack/dev-environment.md`

## Objective
Initialize the complete project structure as a pnpm monorepo with backend (Express/TypeScript) and frontend (Vite/React/TypeScript) packages.

## Implementation Tasks

### 1. Initialize Root Project
```bash
# Create root package.json
pnpm init

# Install root dev dependencies
pnpm add -D typescript prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Create these files:
- `package.json` (with workspace config)
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.eslintrc.js`
- `.prettierrc`
- `.gitignore`
- `.env.example`

### 2. Initialize Backend Package
```bash
mkdir -p packages/backend
cd packages/backend
pnpm init
```

Install dependencies:
```bash
pnpm add express cors dotenv bcrypt jsonwebtoken zod @prisma/client openai socket.io multer
pnpm add -D typescript @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/multer prisma tsx nodemon vitest supertest @types/supertest
```

Create folder structure:
```
packages/backend/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── middleware/
│   ├── validators/
│   ├── types/
│   ├── utils/
│   └── websocket/
├── prisma/
│   └── schema.prisma (basic setup)
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── nodemon.json
```

Create minimal working files:
- `src/index.ts` - Entry point
- `src/app.ts` - Express app setup
- `src/routes/index.ts` - Route aggregator
- `src/middleware/error.middleware.ts` - Error handler

### 3. Initialize Frontend Package
```bash
cd packages/frontend
pnpm create vite . --template react-ts
```

Install additional dependencies:
```bash
pnpm add react-router-dom axios @tanstack/react-query zustand react-hook-form @hookform/resolvers zod socket.io-client
pnpm add -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom playwright
```

Set up Tailwind CSS:
```bash
npx tailwindcss init -p
```

Set up shadcn/ui:
```bash
npx shadcn-ui@latest init
# Select: TypeScript, Default style, CSS Variables, Slate
npx shadcn-ui@latest add button input card dialog form label
```

Create folder structure:
```
packages/frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── utils/
│   ├── lib/
│   └── router/
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### 4. Create Docker Setup
Create `docker/docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: healthrecord
      POSTGRES_PASSWORD: healthrecord_dev
      POSTGRES_DB: healthrecord
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 5. Create Development Scripts
Create `scripts/setup.sh`:
```bash
#!/bin/bash
echo "Setting up Health Record development environment..."

# Copy environment files
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Install dependencies
pnpm install

# Start database
docker-compose -f docker/docker-compose.yml up -d

# Wait for database
sleep 5

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

echo "Setup complete! Run 'pnpm dev' to start development."
```

### 6. Verify Setup
After completing all tasks:
1. Run `pnpm install` from root
2. Run `docker-compose up -d` to start PostgreSQL
3. Run `pnpm dev` to start both frontend and backend
4. Verify:
   - Backend: http://localhost:3001/api/health returns `{ status: 'ok' }`
   - Frontend: http://localhost:3000 shows React app

## Testing & Debugging Phase

**IMPORTANT:** Do NOT proceed to commit until ALL tests pass. Follow this debugging loop.

### Step 1: Create Health Check Test

**Backend** (`tests/integration/health.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Health Check', () => {
  it('GET /api/health should return ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

### Step 2: Run Automated Tests
```bash
# Run backend tests
cd packages/backend
pnpm test

# Run frontend tests (if any)
cd packages/frontend
pnpm test
```

**If tests fail:** Read the error, fix the issue, re-run tests. Repeat until all pass.

### Step 3: Verify Services Start
```bash
# Start database
docker-compose -f docker/docker-compose.yml up -d

# Verify database is running
docker ps | grep postgres

# Start backend (in terminal 1)
cd packages/backend
pnpm dev

# Start frontend (in terminal 2)
cd packages/frontend
pnpm dev
```

**If services don't start:**
- Check terminal output for errors
- Verify Docker is running: `docker ps`
- Check port conflicts: `netstat -an | grep "3001\|3000\|5432"`
- Verify .env files exist and have correct values

### Step 4: Manual Verification
```bash
# Test backend health endpoint
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}

# Test frontend loads
# Open http://localhost:3000 in browser
# Should see Vite + React default page or your app
```

**If health endpoint fails:**
- Check if express app exports correctly
- Verify route is registered
- Check middleware order

### Step 5: Type and Lint Check
```bash
# Check TypeScript compilation
cd packages/backend && pnpm tsc --noEmit
cd packages/frontend && pnpm tsc --noEmit

# Check linting
pnpm lint
```

**If errors exist:** Fix them before proceeding.

### Step 6: Build Verification
```bash
# Build both packages
pnpm build
```

**If build fails:** Read errors, fix, rebuild.

### Debugging Reference
See `prompts/XX-testing-debugging-template.md` for detailed debugging procedures.

---

## Commit (Only After ALL Tests Pass)
After implementation is complete and verified:
```bash
git add .
git commit -m "feat: initialize project structure with monorepo setup

- Set up pnpm workspace with backend and frontend packages
- Configure Express + TypeScript backend with Prisma
- Configure Vite + React + TypeScript frontend with Tailwind
- Add Docker Compose for PostgreSQL
- Add development scripts and configuration files

TICKET-000"
```

## Documentation
Update `docs/implementation/TICKET-000-completed.md` with:
- List of all files created
- Any deviations from plan
- Commands to verify setup
- Known issues or notes for next ticket

## Definition of Done Checklist
- [ ] Root package.json with workspaces configured
- [ ] Backend package fully set up with Express
- [ ] Frontend package fully set up with Vite + React
- [ ] Prisma configured (schema placeholder)
- [ ] Docker Compose for PostgreSQL
- [ ] All configuration files created
- [ ] `pnpm install` works
- [ ] `pnpm dev` starts both services
- [ ] Health check endpoint works
- [ ] Basic test passes
- [ ] Code committed

## Next Prompt
After completing this ticket, proceed to `14-implement-ticket-001.md` for database schema implementation.
