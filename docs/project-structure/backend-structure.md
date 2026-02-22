# Backend Project Structure

This document defines the complete folder structure for the Node.js + Express backend application.

---

## Overview

The backend follows a **layered architecture** pattern with clear separation of concerns:

- **Routes**: HTTP request handling and routing
- **Controllers**: Request/response processing
- **Services**: Business logic
- **Repositories**: Data access (Prisma)
- **Middleware**: Cross-cutting concerns

---

## Complete Backend Structure

```
packages/backend/
├── src/
│   ├── index.ts                   # Application entry point
│   ├── app.ts                     # Express app setup
│   │
│   ├── config/
│   │   ├── index.ts               # Configuration loader
│   │   ├── database.ts            # Database config
│   │   └── openai.ts              # OpenAI config
│   │
│   ├── routes/
│   │   ├── index.ts               # Route aggregator
│   │   ├── auth.routes.ts         # /api/auth/*
│   │   ├── patients.routes.ts     # /api/patients/*
│   │   ├── appointments.routes.ts # /api/appointments/*
│   │   ├── medical-records.routes.ts  # /api/records/*
│   │   └── transcription.routes.ts    # /api/ai/*
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── patients.controller.ts
│   │   ├── appointments.controller.ts
│   │   ├── medical-records.controller.ts
│   │   └── transcription.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── patients.service.ts
│   │   ├── appointments.service.ts
│   │   ├── medical-records.service.ts
│   │   ├── transcription.service.ts
│   │   └── ai/
│   │       ├── whisper.service.ts     # Audio transcription
│   │       ├── gpt.service.ts         # GPT completions
│   │       └── extraction.service.ts  # Medical data extraction
│   │
│   ├── repositories/
│   │   ├── base.repository.ts     # Base repository patterns
│   │   ├── users.repository.ts    # Provider/user data access
│   │   ├── patients.repository.ts
│   │   ├── appointments.repository.ts
│   │   └── medical-records.repository.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT authentication
│   │   ├── error.middleware.ts    # Global error handling
│   │   ├── validation.middleware.ts   # Request validation
│   │   └── logging.middleware.ts  # Request logging (pino)
│   │
│   ├── validators/
│   │   ├── auth.validator.ts      # Login/register schemas
│   │   ├── patients.validator.ts  # Patient CRUD schemas
│   │   ├── appointments.validator.ts
│   │   └── medical-records.validator.ts
│   │
│   ├── types/
│   │   ├── index.ts               # Type exports
│   │   ├── express.d.ts           # Express type extensions
│   │   ├── auth.types.ts          # Auth-related types
│   │   ├── patients.types.ts      # Patient types
│   │   ├── appointments.types.ts  # Appointment types
│   │   ├── medical-records.types.ts   # Record types
│   │   └── ai.types.ts            # AI integration types
│   │
│   ├── utils/
│   │   ├── logger.ts              # Pino logger instance
│   │   ├── errors.ts              # Custom error classes
│   │   ├── jwt.ts                 # JWT utilities
│   │   └── audio.ts               # Audio file utilities
│   │
│   └── lib/
│       ├── prisma.ts              # Prisma client instance
│       └── openai.ts              # OpenAI client instance
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Migration history
│   │   └── ...
│   └── seed.ts                    # Database seeding
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── auth.service.test.ts
│   │   │   ├── patients.service.test.ts
│   │   │   └── ...
│   │   └── utils/
│   │       ├── jwt.test.ts
│   │       └── ...
│   ├── integration/
│   │   ├── routes/
│   │   │   ├── auth.routes.test.ts
│   │   │   ├── patients.routes.test.ts
│   │   │   └── ...
│   │   └── repositories/
│   │       └── ...
│   ├── fixtures/
│   │   ├── patients.fixture.ts
│   │   └── ...
│   └── setup.ts                   # Test setup and mocks
│
├── uploads/                       # Audio file storage (gitignored)
│   └── audio/
│
├── .env.example                   # Environment template
├── .env.test                      # Test environment
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── nodemon.json                   # Dev server config
```

---

## Directory Descriptions

### `src/`

Main source code directory containing all application code.

### `src/config/`

Application configuration loaded from environment variables.

| File | Purpose |
|------|---------|
| `index.ts` | Central config export, validates required vars |
| `database.ts` | Database connection settings |
| `openai.ts` | OpenAI API configuration |

**Example `config/index.ts`:**
```typescript
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '24h',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};
```

### `src/routes/`

Express route definitions. Each file handles a specific resource.

| File | Endpoints |
|------|-----------|
| `auth.routes.ts` | POST /login, POST /logout, GET /me |
| `patients.routes.ts` | CRUD /patients |
| `appointments.routes.ts` | CRUD /appointments |
| `medical-records.routes.ts` | /records/* |
| `transcription.routes.ts` | /ai/transcribe, /ai/extract |

**Example route file:**
```typescript
// routes/patients.routes.ts
import { Router } from 'express';
import { patientsController } from '../controllers/patients.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createPatientSchema, updatePatientSchema } from '../validators/patients.validator';

const router = Router();

router.use(authMiddleware);

router.get('/', patientsController.list);
router.get('/:id', patientsController.getById);
router.post('/', validate(createPatientSchema), patientsController.create);
router.put('/:id', validate(updatePatientSchema), patientsController.update);
router.get('/:id/appointments', patientsController.getAppointments);

export default router;
```

### `src/controllers/`

Handle HTTP request/response. Delegate business logic to services.

**Responsibilities:**
- Parse and validate request parameters
- Call appropriate service methods
- Format and send responses
- Handle controller-level errors

**Example controller:**
```typescript
// controllers/patients.controller.ts
import { Request, Response, NextFunction } from 'express';
import { patientsService } from '../services/patients.service';

export const patientsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit } = req.query;
      const result = await patientsService.findAll({
        search: search as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
  // ... more methods
};
```

### `src/services/`

Business logic layer. Contains the core application logic.

**Responsibilities:**
- Implement business rules
- Orchestrate repository calls
- Handle transactions
- Call external APIs

**Sub-directory `ai/`:**
| File | Purpose |
|------|---------|
| `whisper.service.ts` | OpenAI Whisper API integration |
| `gpt.service.ts` | GPT-4 completions |
| `extraction.service.ts` | Medical data extraction logic |

### `src/repositories/`

Data access layer using Prisma ORM.

**Responsibilities:**
- Database queries
- Data mapping
- Query optimization

**Example repository:**
```typescript
// repositories/patients.repository.ts
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const patientsRepository = {
  async findMany(options: {
    where?: Prisma.PatientWhereInput;
    skip?: number;
    take?: number;
  }) {
    return prisma.patient.findMany({
      ...options,
      include: {
        allergies: true,
        chronicConditions: true,
      },
    });
  },
  // ... more methods
};
```

### `src/middleware/`

Express middleware for cross-cutting concerns.

| File | Purpose |
|------|---------|
| `auth.middleware.ts` | JWT token validation |
| `error.middleware.ts` | Global error handler |
| `validation.middleware.ts` | Zod schema validation |
| `logging.middleware.ts` | Request/response logging |

### `src/validators/`

Zod schemas for request validation.

**Example:**
```typescript
// validators/patients.validator.ts
import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    dateOfBirth: z.string().datetime(),
    sex: z.enum(['male', 'female', 'other']),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    emergencyContactName: z.string().min(2),
    emergencyContactPhone: z.string().min(10),
  }),
});
```

### `src/types/`

TypeScript type definitions.

| File | Purpose |
|------|---------|
| `index.ts` | Re-exports all types |
| `express.d.ts` | Express augmentation (req.user) |
| `*.types.ts` | Domain-specific types |

### `src/utils/`

Utility functions and helpers.

| File | Purpose |
|------|---------|
| `logger.ts` | Pino logger instance |
| `errors.ts` | AppError, NotFoundError, etc. |
| `jwt.ts` | Token generation/verification |
| `audio.ts` | Audio file processing |

### `src/lib/`

External library instances (singletons).

| File | Purpose |
|------|---------|
| `prisma.ts` | Prisma client singleton |
| `openai.ts` | OpenAI client singleton |

### `prisma/`

Prisma ORM configuration and migrations.

| File/Dir | Purpose |
|----------|---------|
| `schema.prisma` | Database schema |
| `migrations/` | Migration files |
| `seed.ts` | Seed script |

### `tests/`

Test files organized by type.

| Directory | Test Type |
|-----------|-----------|
| `unit/` | Unit tests (mocked dependencies) |
| `integration/` | Integration tests (real database) |
| `fixtures/` | Test data factories |

---

## Key Files

### `src/index.ts`

Application entry point:
```typescript
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
```

### `src/app.ts`

Express app configuration:
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestLogger } from './middleware/logging.middleware';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';
import { config } from './config';

export const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  }
}
```

---

## References

- [Root Structure](./root-structure.md)
- [Frontend Structure](./frontend-structure.md)
- [Configuration Files](./config-files.md)
- [Backend Tech Stack](../tech-stack/backend.md)
