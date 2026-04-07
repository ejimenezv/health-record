# Prompt 13: Implement TICKET-000 - Project Setup

## Context
You are implementing the Medical Record System MVP. This is the FIRST implementation prompt. All documentation is complete in the `docs/` folder.

## Prerequisites

**IMPORTANT: Read and understand these documentation files before implementing:**
- `docs/tickets/TICKET-000-project-setup.md` - Ticket requirements
- `docs/project-structure/root-structure.md` - Monorepo structure
- `docs/project-structure/backend-structure.md` - Backend folders
- `docs/project-structure/frontend-structure.md` - Frontend folders
- `docs/project-structure/config-files.md` - Configuration details
- `docs/tech-stack/frontend.md` - Frontend technologies
- `docs/tech-stack/backend.md` - Backend technologies
- `docs/tech-stack/dev-environment.md` - Development setup

## Objective
Initialize the complete project structure as a pnpm monorepo with backend (Express/TypeScript) and frontend (Vite/React/TypeScript) packages.

---

## Part 1: Root Project Setup

### 1.1 Initialize Root Package
```bash
# Initialize root package.json
pnpm init

# Create workspace directories
mkdir -p packages/backend packages/frontend docker scripts
```

### 1.2 Create Root package.json
Create `package.json`:
```json
{
  "name": "health-record",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\"",
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "db:migrate": "pnpm --filter backend db:migrate",
    "db:seed": "pnpm --filter backend db:seed",
    "db:studio": "pnpm --filter backend db:studio",
    "clean": "rm -rf node_modules packages/*/node_modules packages/*/dist"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "typescript": "^5.3.0"
  }
}
```

### 1.3 Create pnpm-workspace.yaml
Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

### 1.4 Create tsconfig.base.json
Create `tsconfig.base.json`:
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
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 1.5 Create .gitignore
Create `.gitignore`:
```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage/

# Prisma
packages/backend/prisma/*.db
packages/backend/prisma/migrations/**/migration_lock.toml
```

### 1.6 Create .env.example
Create `.env.example`:
```env
# Database
DATABASE_URL="postgresql://healthrecord:healthrecord_dev@localhost:5432/healthrecord"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# Backend Port
PORT=3001
```

---

## Part 2: Backend Package Setup

### 2.1 Initialize Backend Package
```bash
cd packages/backend
pnpm init
```

### 2.2 Create Backend package.json
Create `packages/backend/package.json`:
```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.20.0",
    "socket.io": "^4.6.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.10.0",
    "@types/supertest": "^2.0.16",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "prisma": "^5.7.0",
    "supertest": "^6.3.3",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### 2.3 Create Backend tsconfig.json
Create `packages/backend/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2.4 Create Backend Folder Structure
```bash
cd packages/backend
mkdir -p src/{config,routes,controllers,services,repositories,middleware,validators,types,utils,websocket}
mkdir -p prisma
mkdir -p tests/{unit,integration}
```

### 2.5 Create Backend .env.example
Create `packages/backend/.env.example`:
```env
DATABASE_URL="postgresql://healthrecord:healthrecord_dev@localhost:5432/healthrecord"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
OPENAI_API_KEY="your-openai-api-key"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

### 2.6 Create vitest.config.ts
Create `packages/backend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### 2.7 Create Backend Entry Point
Create `packages/backend/src/index.ts`:
```typescript
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
```

### 2.8 Create Express App
Create `packages/backend/src/app.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Error handling
app.use(errorHandler);

export default app;
```

### 2.9 Create Routes Index
Create `packages/backend/src/routes/index.ts`:
```typescript
import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

export default router;
```

### 2.10 Create Error Middleware
Create `packages/backend/src/middleware/error.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

### 2.11 Create Basic Prisma Schema
Create `packages/backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Schema will be completed in TICKET-001
```

---

## Part 3: Frontend Package Setup

### 3.1 Initialize Frontend with Vite
```bash
cd packages/frontend
pnpm create vite . --template react-ts
```

### 3.2 Install Frontend Dependencies
```bash
pnpm add react-router-dom axios @tanstack/react-query zustand react-hook-form @hookform/resolvers zod socket.io-client date-fns
pnpm add -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @types/node
```

### 3.3 Initialize Tailwind CSS
```bash
npx tailwindcss init -p
```

### 3.4 Update tailwind.config.js
Create `packages/frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
```

### 3.5 Update CSS
Replace `packages/frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply antialiased;
  }
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

### 3.6 Initialize shadcn/ui
```bash
npx shadcn-ui@latest init
```

When prompted, select:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: tailwind.config.js
- Components path: src/components
- Utils path: src/lib/utils

```bash
# Add essential components
npx shadcn-ui@latest add button input card dialog form label alert badge
```

### 3.7 Create Frontend Folder Structure
```bash
cd packages/frontend
mkdir -p src/{components/{ui,layout,auth},pages/{auth,patients,appointments},hooks,services,store,types,utils,router}
mkdir -p tests/{unit,e2e}
```

### 3.8 Create Frontend .env.example
Create `packages/frontend/.env.example`:
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001
```

### 3.9 Update vite.config.ts
Update `packages/frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

### 3.10 Create vitest.config.ts
Create `packages/frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3.11 Create Test Setup
Create `packages/frontend/tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

### 3.12 Update App.tsx
Replace `packages/frontend/src/App.tsx`:
```typescript
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          MedRecord AI
        </h1>
        <p className="text-gray-600">
          Sistema de Expediente Clínico con IA
        </p>
        <p className="text-sm text-gray-400 mt-8">
          Project setup complete. Authentication coming in TICKET-002.
        </p>
      </div>
    </div>
  );
}

export default App;
```

### 3.13 Update main.tsx
Update `packages/frontend/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

---

## Part 4: Docker Setup

### 4.1 Create Docker Compose
Create `docker/docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: health-record-postgres
    environment:
      POSTGRES_USER: healthrecord
      POSTGRES_PASSWORD: healthrecord_dev
      POSTGRES_DB: healthrecord
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthrecord"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## Part 5: Development Scripts

### 5.1 Create Setup Script
Create `scripts/setup.sh`:
```bash
#!/bin/bash
set -e

echo "=========================================="
echo "  Health Record - Development Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}pnpm is not installed. Please install it first: npm install -g pnpm${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites met!${NC}"

# Copy environment files
echo -e "\n${YELLOW}Setting up environment files...${NC}"
cp -n .env.example .env 2>/dev/null || true
cp -n packages/backend/.env.example packages/backend/.env 2>/dev/null || true
cp -n packages/frontend/.env.example packages/frontend/.env 2>/dev/null || true
echo -e "${GREEN}Environment files created!${NC}"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Start database
echo -e "\n${YELLOW}Starting PostgreSQL database...${NC}"
docker-compose -f docker/docker-compose.yml up -d

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Generate Prisma client
echo -e "\n${YELLOW}Generating Prisma client...${NC}"
cd packages/backend
pnpm db:generate
cd ../..

echo -e "\n${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm dev' to start development servers"
echo "  2. Backend: http://localhost:3001/api/v1/health"
echo "  3. Frontend: http://localhost:5173"
echo ""
```

Make it executable:
```bash
chmod +x scripts/setup.sh
```

---

## Part 6: Testing & Verification

### 6.1 Create Backend Health Check Test
Create `packages/backend/tests/integration/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('Health Check', () => {
  it('GET /api/v1/health should return ok status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.version).toBe('0.1.0');
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
```

### 6.2 Create Frontend App Test
Create `packages/frontend/tests/unit/App.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../src/App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('App', () => {
  it('should render the app title', () => {
    renderWithProviders(<App />);

    expect(screen.getByText('MedRecord AI')).toBeInTheDocument();
  });

  it('should render the subtitle', () => {
    renderWithProviders(<App />);

    expect(screen.getByText('Sistema de Expediente Clínico con IA')).toBeInTheDocument();
  });
});
```

---

## Testing & Debugging Phase

**CRITICAL: Do NOT proceed to commit until ALL verification steps pass.**

### Step 1: Install Dependencies
```bash
# From project root
pnpm install
```

**If installation fails:**
- Check Node.js version (requires 18+)
- Check pnpm version (requires 8+)
- Delete `node_modules` and `pnpm-lock.yaml`, then retry

### Step 2: Start Database
```bash
docker-compose -f docker/docker-compose.yml up -d
```

**Verify database is running:**
```bash
docker ps | grep postgres
# Should show: health-record-postgres ... Up
```

**If database fails:**
- Check Docker is running
- Check port 5432 is not in use: `netstat -an | grep 5432`
- Check Docker logs: `docker-compose -f docker/docker-compose.yml logs`

### Step 3: Run Backend Tests
```bash
cd packages/backend
pnpm test
```

**Expected output:**
```
 ✓ tests/integration/health.test.ts
   ✓ Health Check > GET /api/v1/health should return ok status
   ✓ Health Check > should return JSON content type
```

**If tests fail:**
- Read the error message
- Fix the issue
- Re-run tests

### Step 4: Run Frontend Tests
```bash
cd packages/frontend
pnpm test
```

**Expected output:**
```
 ✓ tests/unit/App.test.tsx
   ✓ App > should render the app title
   ✓ App > should render the subtitle
```

### Step 5: Start Development Servers
```bash
# Terminal 1 - Backend
cd packages/backend
pnpm dev

# Terminal 2 - Frontend
cd packages/frontend
pnpm dev
```

### Step 6: Manual Verification

**Backend Health Check:**
```bash
curl http://localhost:3001/api/v1/health
```
**Expected:** `{"status":"ok","timestamp":"...","version":"0.1.0"}`

**Frontend:**
- Open http://localhost:5173 in browser
- Should see "MedRecord AI" heading
- Should see "Sistema de Expediente Clínico con IA" subtitle

### Step 7: Type Checking
```bash
# Backend
cd packages/backend && pnpm tsc --noEmit

# Frontend
cd packages/frontend && pnpm tsc --noEmit
```

**If errors exist:** Fix them before proceeding.

### Step 8: Build Verification
```bash
# From root
pnpm build
```

**If build fails:** Fix errors and rebuild.

---

## Debugging Reference

See `prompts/XX-testing-debugging-template.md` for detailed debugging procedures.

### Common Issues

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED 5432` | Start database: `docker-compose up -d` |
| Module not found | Run `pnpm install` |
| Port in use | Kill process or change port in `.env` |
| Prisma errors | Run `pnpm db:generate` |

---

## Commit (Only After ALL Tests Pass)

```bash
git add .
git commit -m "feat: initialize project structure with monorepo setup

- Set up pnpm workspace with backend and frontend packages
- Configure Express + TypeScript backend
- Configure Vite + React + TypeScript frontend with Tailwind/shadcn
- Add Docker Compose for PostgreSQL
- Add QueryClient provider for React Query
- Create health check endpoint with tests
- Add development scripts and configuration files

TICKET-000"
```

---

## Documentation

Create `docs/implementation/TICKET-000-completed.md` with:
- List of all files created
- Verification commands
- Any deviations from plan
- Known issues or notes

---

## Definition of Done Checklist

- [ ] Root package.json with workspaces configured
- [ ] pnpm-workspace.yaml created
- [ ] Backend package initialized with all dependencies
- [ ] Frontend package initialized with Vite + React
- [ ] Tailwind CSS configured
- [ ] shadcn/ui initialized with base components
- [ ] Docker Compose for PostgreSQL
- [ ] All environment files created (.env.example)
- [ ] Backend health check endpoint works
- [ ] QueryClientProvider wrapping App
- [ ] All tests pass (backend + frontend)
- [ ] TypeScript compiles without errors
- [ ] Both services start and work
- [ ] Code committed

---

## Next Prompt

Proceed to `14-implement-ticket-001.md` for database schema implementation.
