# Project Structure Summary

Quick reference guide for the MedRecord AI project structure.

---

## Quick Reference Structure

```
health-record/
├── .github/workflows/         # CI/CD pipelines
├── .vscode/                   # VS Code configuration
├── docs/                      # Project documentation
│   ├── architecture/          # System architecture
│   ├── data-model/           # Database schema
│   ├── project-structure/    # This documentation
│   └── ...
├── docker/                    # Docker configurations
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── packages/
│   ├── backend/              # Express API
│   │   ├── src/
│   │   │   ├── config/       # App configuration
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── repositories/ # Data access
│   │   │   ├── routes/       # API routes
│   │   │   ├── services/     # Business logic
│   │   │   ├── types/        # TypeScript types
│   │   │   ├── utils/        # Utilities
│   │   │   └── lib/          # External clients
│   │   ├── prisma/           # Database schema
│   │   └── tests/            # Test files
│   └── frontend/             # React SPA
│       ├── src/
│       │   ├── components/   # UI components
│       │   │   ├── ui/       # shadcn/ui base
│       │   │   ├── layout/   # Layout components
│       │   │   └── .../      # Feature components
│       │   ├── pages/        # Route pages
│       │   ├── hooks/        # React hooks
│       │   ├── services/     # API clients
│       │   ├── store/        # State management
│       │   ├── types/        # TypeScript types
│       │   └── utils/        # Utilities
│       └── tests/            # Test files
├── scripts/                   # Setup scripts
├── .env.example              # Environment template
├── package.json              # Root workspace
├── pnpm-workspace.yaml       # pnpm config
└── tsconfig.base.json        # Shared TS config
```

---

## Key Directories Explained

### `/packages/backend/src/`

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `config/` | Environment & app config | `index.ts`, `database.ts` |
| `routes/` | API endpoint definitions | `patients.routes.ts` |
| `controllers/` | HTTP request handling | `patients.controller.ts` |
| `services/` | Business logic | `patients.service.ts` |
| `repositories/` | Database queries | `patients.repository.ts` |
| `middleware/` | Request processing | `auth.middleware.ts` |
| `validators/` | Input validation | `patients.validator.ts` |
| `types/` | TypeScript definitions | `patients.types.ts` |
| `utils/` | Helper functions | `logger.ts`, `errors.ts` |
| `lib/` | External clients | `prisma.ts`, `openai.ts` |

### `/packages/frontend/src/`

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `components/ui/` | Base UI (shadcn) | `button.tsx`, `card.tsx` |
| `components/layout/` | Page layouts | `Sidebar.tsx`, `Header.tsx` |
| `components/{feature}/` | Feature components | `PatientCard.tsx` |
| `pages/` | Route-level pages | `PatientsPage.tsx` |
| `hooks/` | Custom React hooks | `usePatients.ts` |
| `services/` | API client functions | `patients.api.ts` |
| `store/` | Global state | `auth.store.ts` |
| `types/` | TypeScript types | `patients.types.ts` |
| `utils/` | Helper functions | `formatters.ts` |
| `router/` | Route configuration | `index.tsx` |

---

## File Naming Conventions

### Backend

| Type | Convention | Example |
|------|------------|---------|
| Routes | `{resource}.routes.ts` | `patients.routes.ts` |
| Controllers | `{resource}.controller.ts` | `patients.controller.ts` |
| Services | `{resource}.service.ts` | `patients.service.ts` |
| Repositories | `{resource}.repository.ts` | `patients.repository.ts` |
| Validators | `{resource}.validator.ts` | `patients.validator.ts` |
| Types | `{resource}.types.ts` | `patients.types.ts` |
| Tests | `{file}.test.ts` | `patients.service.test.ts` |

### Frontend

| Type | Convention | Example |
|------|------------|---------|
| Components | `PascalCase.tsx` | `PatientCard.tsx` |
| Pages | `{Name}Page.tsx` | `PatientsPage.tsx` |
| Hooks | `use{Name}.ts` | `usePatients.ts` |
| Services | `{resource}.api.ts` | `patients.api.ts` |
| Types | `{resource}.types.ts` | `patients.types.ts` |
| Tests | `{file}.test.tsx` | `PatientCard.test.tsx` |

### General

| Type | Convention | Example |
|------|------------|---------|
| Directories | kebab-case | `medical-records/` |
| Config files | lowercase | `tsconfig.json` |
| Environment | SCREAMING_SNAKE | `DATABASE_URL` |
| Documentation | kebab-case.md | `setup-instructions.md` |

---

## Import Path Conventions

### Using Aliases

Both packages use `@/` as an alias for `./src/`:

```typescript
// Instead of relative paths
import { logger } from '../../../utils/logger';

// Use alias
import { logger } from '@/utils/logger';
```

### Import Order (Recommended)

```typescript
// 1. External packages
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal aliases
import { Button } from '@/components/ui/button';
import { usePatients } from '@/hooks/usePatients';

// 3. Relative imports (same feature)
import { PatientCard } from './PatientCard';

// 4. Types
import type { Patient } from '@/types';
```

---

## Common Commands

### Development

```bash
# Start all services
pnpm dev

# Start specific package
pnpm --filter backend dev
pnpm --filter frontend dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm --filter backend test:coverage
pnpm --filter frontend test:coverage
```

### Code Quality

```bash
# Lint all
pnpm lint

# Format all
pnpm format

# Type check
pnpm type-check
```

### Database

```bash
# View data
pnpm db:studio

# Create migration
cd packages/backend
pnpm db:migrate -- --name migration_name

# Reset database
pnpm db:reset
```

---

## URLs (Local Development)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Prisma Studio | http://localhost:5555 |

---

## API Endpoint Structure

```
/api
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   └── GET  /me
├── /patients
│   ├── GET    /             # List
│   ├── POST   /             # Create
│   ├── GET    /:id          # Get one
│   ├── PUT    /:id          # Update
│   └── GET    /:id/appointments
├── /appointments
│   ├── POST   /             # Create
│   ├── GET    /:id          # Get one
│   ├── PUT    /:id          # Update
│   └── PUT    /:id/status   # Update status
├── /records
│   ├── GET    /:appointmentId    # Get record
│   └── PUT    /:appointmentId    # Save record
└── /ai
    ├── POST /transcribe     # Audio → Text
    └── POST /extract        # Text → Structured
```

---

## Component Organization

### Feature-Based Structure

```
components/
├── ui/                    # Base components (shadcn)
├── layout/                # App layout
├── common/                # Shared components
├── patients/              # Patient feature
│   ├── PatientList.tsx
│   ├── PatientCard.tsx
│   └── PatientForm.tsx
├── appointments/          # Appointment feature
├── medical-records/       # Record feature
└── transcription/         # AI transcription feature
```

### Component Pattern

```typescript
// ComponentName.tsx
import { type FC } from 'react';

interface ComponentNameProps {
  // props
}

export const ComponentName: FC<ComponentNameProps> = ({ props }) => {
  return (
    // JSX
  );
};
```

---

## Environment Variables

### Required

| Variable | Package | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Token signing secret |
| `OPENAI_API_KEY` | Backend | OpenAI API key |
| `VITE_API_URL` | Frontend | Backend API URL |

### Optional

| Variable | Package | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | Backend | 3001 | Server port |
| `NODE_ENV` | Backend | development | Environment |
| `LOG_LEVEL` | Backend | info | Pino log level |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Root Structure](./root-structure.md) | Detailed root layout |
| [Backend Structure](./backend-structure.md) | Backend organization |
| [Frontend Structure](./frontend-structure.md) | Frontend organization |
| [Config Files](./config-files.md) | All configuration files |
| [Shared Types](./shared-types.md) | Type sharing strategy |
| [Dev Scripts](./dev-scripts.md) | Development scripts |
| [Setup Instructions](./setup-instructions.md) | Setup guide |
