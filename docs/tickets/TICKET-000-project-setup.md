# Ticket 000: Project Setup and Configuration

## Type
Technical

## Priority
P0-Critical

## Description
Initialize the monorepo project structure with all necessary configuration files, dependencies, and development environment setup. This is the foundation ticket that must be completed before any other development work can begin.

## Acceptance Criteria
- [ ] Monorepo structure created with pnpm workspaces
- [ ] Backend package initialized with Express + TypeScript
- [ ] Frontend package initialized with Vite + React + TypeScript
- [ ] Prisma configured with PostgreSQL
- [ ] Docker Compose for local database
- [ ] ESLint + Prettier configured for both packages
- [ ] Git hooks with Husky for pre-commit linting
- [ ] Environment variables template created
- [ ] Development scripts working (`pnpm dev` starts both)
- [ ] Health check endpoint responds on backend

## Technical Requirements

### Root Setup
- [ ] Initialize pnpm workspace with `pnpm-workspace.yaml`
- [ ] Create root `package.json` with workspace scripts
- [ ] Create root `tsconfig.base.json` for shared TypeScript config
- [ ] Configure ESLint with TypeScript rules
- [ ] Configure Prettier with consistent formatting
- [ ] Create `.gitignore` with Node.js + IDE patterns
- [ ] Create `.env.example` with all required variables
- [ ] Set up Husky with lint-staged for pre-commit hooks

### Backend Setup (packages/backend)
- [ ] Initialize Node.js project with `package.json`
- [ ] Install dependencies:
  - Express, cors, helmet, morgan
  - TypeScript, ts-node, tsx
  - Prisma, @prisma/client
  - jsonwebtoken, bcryptjs
  - zod for validation
  - socket.io for WebSocket
  - multer for file uploads
  - dotenv for environment variables
- [ ] Install dev dependencies:
  - @types/* packages
  - vitest for testing
  - supertest for API testing
  - nodemon or tsx watch
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Create initial folder structure:
  ```
  src/
  ├── config/
  ├── controllers/
  ├── middleware/
  ├── routes/
  ├── services/
  ├── utils/
  ├── validators/
  ├── websocket/
  └── index.ts
  ```
- [ ] Set up Prisma with initial connection
- [ ] Create development scripts:
  - `dev`: Start with hot reload
  - `build`: TypeScript compilation
  - `start`: Production start
  - `test`: Run tests
  - `db:migrate`: Run migrations
  - `db:seed`: Seed database

### Frontend Setup (packages/frontend)
- [ ] Initialize Vite React project with TypeScript template
- [ ] Install dependencies:
  - React 18, React DOM
  - React Router v6
  - @tanstack/react-query
  - zustand for state management
  - react-hook-form + zod
  - axios for HTTP client
  - socket.io-client for WebSocket
  - date-fns for date formatting
- [ ] Install dev dependencies:
  - @types/* packages
  - Tailwind CSS + PostCSS + Autoprefixer
  - vitest + @testing-library/react
  - Playwright for E2E
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up Tailwind CSS (`tailwind.config.js`)
- [ ] Install and configure shadcn/ui:
  - Button, Input, Card, Dialog, Form components
  - Configure components.json
- [ ] Configure React Router with initial routes
- [ ] Create initial folder structure:
  ```
  src/
  ├── components/
  │   ├── ui/
  │   ├── layout/
  │   └── common/
  ├── hooks/
  ├── pages/
  ├── services/
  ├── store/
  ├── utils/
  ├── App.tsx
  └── main.tsx
  ```
- [ ] Create development scripts:
  - `dev`: Start Vite dev server
  - `build`: Production build
  - `preview`: Preview production build
  - `test`: Run unit tests
  - `test:e2e`: Run Playwright tests

### Docker Setup
- [ ] Create `docker-compose.yml` with:
  - PostgreSQL 15 service
  - Volume for data persistence
  - Environment variables
  - Health check
- [ ] Create `.dockerignore`
- [ ] Document Docker commands in README

### Shared Configuration
- [ ] Create shared TypeScript types package (optional, or use path aliases)
- [ ] Configure path aliases for imports (`@/` prefix)
- [ ] Set up concurrent dev script to run both packages

## API Endpoints Involved
- GET `/api/v1/health` - Health check endpoint (to verify setup)

## Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/health_record

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# OpenAI (for future tickets)
OPENAI_API_KEY=sk-...

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
```

## Testing Requirements
- [ ] Backend health check endpoint returns 200
- [ ] Frontend dev server starts without errors
- [ ] Database connection successful
- [ ] Sample test file runs in both packages

## Dependencies
None - This is the foundational ticket.

## Estimation
5 Story Points

## Implementation Notes
- Use pnpm for faster installs and better monorepo support
- PostgreSQL 15 recommended for JSON features
- Keep Docker optional for developers with local PostgreSQL
- Consider using `concurrently` for running both packages
- Set up path aliases early to avoid refactoring later
- Include `.nvmrc` file for Node.js version consistency

## Files to Create

### Root
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.eslintrc.js`
- `.prettierrc`
- `.gitignore`
- `.env.example`
- `.nvmrc`
- `docker-compose.yml`
- `.dockerignore`
- `README.md`

### Backend (packages/backend)
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/config/index.ts`
- `src/config/database.ts`
- `src/routes/index.ts`
- `src/routes/health.routes.ts`
- `src/middleware/error.middleware.ts`
- `prisma/schema.prisma` (initial)
- `tests/setup.ts`

### Frontend (packages/frontend)
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `components.json` (shadcn)
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/vite-env.d.ts`
- `tests/setup.ts`

## Definition of Done
- [ ] `pnpm install` works without errors
- [ ] `pnpm dev` starts both frontend and backend
- [ ] Database connects successfully via Docker
- [ ] GET `/api/v1/health` returns `{ status: "ok" }`
- [ ] Frontend renders sample page at `http://localhost:5173`
- [ ] ESLint and Prettier run without errors
- [ ] Pre-commit hooks execute successfully
- [ ] All configuration documented in README
