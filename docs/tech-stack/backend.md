# Backend Technology Stack: MedRecord AI

This document defines the complete backend technology stack for the Medical Record System MVP.

---

## Core Framework

### Node.js + Express.js

| Specification | Value |
|---------------|-------|
| **Runtime** | Node.js |
| **Version** | 20.x LTS |
| **Framework** | Express.js |
| **Framework Version** | 4.18.x |
| **Language** | TypeScript 5.x |

### Why Express Over Alternatives

| Framework | Pros | Cons | Decision |
|-----------|------|------|----------|
| **Express** | Minimal, flexible, huge ecosystem, well-documented | Less structured, manual setup | **Selected** |
| Fastify | Better performance, schema validation | Smaller ecosystem, different patterns | Rejected |
| NestJS | Full framework, decorators, DI | Overkill for MVP, steeper learning curve | Rejected |
| Koa | Modern, cleaner middleware | Smaller ecosystem than Express | Rejected |

**Final Decision**: Express.js selected for:
- Simplicity and flexibility for MVP scope
- Largest middleware ecosystem
- Easy integration with TypeScript
- Familiar to most Node.js developers
- Simple deployment anywhere

---

## Language: TypeScript

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| **strict** | true | Catch more errors at compile time |
| **target** | ES2022 | Use modern JavaScript features |
| **module** | NodeNext | Native ESM support |
| **esModuleInterop** | true | Better CommonJS interop |

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## API Design

### RESTful API

| Specification | Value |
|---------------|-------|
| **Style** | RESTful |
| **Format** | JSON |
| **Versioning** | URL prefix (v1) |
| **Authentication** | Bearer JWT |

### API Versioning Strategy

```
/api/v1/patients
/api/v1/appointments
/api/v1/records
/api/v1/ai
```

For MVP, version prefix is included for future compatibility but only v1 is implemented.

### Request/Response Validation

| Component | Technology | Version |
|-----------|------------|---------|
| **Schema Validation** | Zod | 3.22.x |
| **Request Parsing** | express.json() | Built-in |
| **File Uploads** | Multer | 1.4.x |

### Zod Validation Example

```typescript
import { z } from 'zod';

// Request schema
export const createPatientSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    dateOfBirth: z.string().datetime(),
    sex: z.enum(['male', 'female', 'other']),
    phone: z.string().regex(/^\+?[\d\s-]{10,}$/),
    email: z.string().email().optional(),
    address: z.string().max(200).optional(),
    emergencyContactName: z.string().min(2).max(100),
    emergencyContactPhone: z.string().regex(/^\+?[\d\s-]{10,}$/),
    emergencyContactRelationship: z.string().max(50).optional(),
  }),
});

export type CreatePatientRequest = z.infer<typeof createPatientSchema>;

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };
};
```

---

## Authentication

### JWT Authentication

| Component | Technology | Version |
|-----------|------------|---------|
| **Token Type** | JWT | - |
| **Library** | jsonwebtoken | 9.x |
| **Algorithm** | HS256 | - |
| **Password Hashing** | bcrypt | 5.x |

### Configuration

| Setting | Value |
|---------|-------|
| **Token Expiry** | 24 hours |
| **Refresh Strategy** | Re-login (MVP) |
| **bcrypt Rounds** | 12 |

### JWT Implementation

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = '24h';
const BCRYPT_ROUNDS = 12;

// Token generation
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// Token verification
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Password verification
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Auth Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' },
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  }
};
```

---

## Database Access

### Prisma ORM

| Specification | Value |
|---------------|-------|
| **ORM** | Prisma |
| **Version** | 5.10.x |
| **Database** | PostgreSQL |
| **Connection Pooling** | Prisma Connection Pool |

### Why Prisma

| ORM | Pros | Cons | Decision |
|-----|------|------|----------|
| **Prisma** | Type-safe queries, auto-generated types, migrations, Prisma Studio | Abstraction layer | **Selected** |
| TypeORM | Decorator-based, ActiveRecord pattern | Less type-safe, decorator overhead | Rejected |
| Sequelize | Mature, well-documented | JavaScript-first, TypeScript support secondary | Rejected |
| Drizzle | Lightweight, SQL-like | Newer, smaller ecosystem | Rejected |

### Prisma Client Setup

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Connection Pool Configuration

```
DATABASE_URL="postgresql://user:password@localhost:5432/medrecord?schema=public&connection_limit=10&pool_timeout=10"
```

---

## AI Integration

### OpenAI SDK

| Component | Technology | Version |
|-----------|------------|---------|
| **SDK** | openai | 4.28.x |
| **Transcription** | Whisper API | whisper-1 |
| **Extraction** | GPT-4 API | gpt-4 |

### OpenAI Client Configuration

```typescript
// src/lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes for audio transcription
  maxRetries: 2,
});
```

### Audio File Handling (Multer)

```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
  destination: './uploads/audio',
  filename: (req, file, cb) => {
    const uniqueName = `${uuid()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB (OpenAI limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  },
});
```

---

## Real-time Communication

### REST for MVP

| Decision | REST (Polling) |
|----------|----------------|
| **Protocol** | HTTP/HTTPS |
| **Pattern** | Request-Response |
| **Long Operations** | HTTP timeout with loading state |

For MVP, real-time WebSocket is not implemented. AI processing uses standard HTTP requests with appropriate timeouts. The frontend shows loading states during processing.

### Future Enhancement: Socket.io

```typescript
// Future implementation (Phase 2)
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('transcription:progress', (data) => {
    // Real-time progress updates
  });
});
```

---

## Logging

### Pino

| Specification | Value |
|---------------|-------|
| **Library** | Pino |
| **Version** | 8.x |
| **Format** | JSON in production, pretty in dev |
| **Output** | stdout |

### Why Pino Over Alternatives

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| **Pino** | Fastest, low overhead, JSON native | Learning curve for transports | **Selected** |
| Winston | Feature-rich, multiple transports | Slower, more complex | Rejected |
| Bunyan | JSON logging, good CLI | Less maintained | Rejected |

### Pino Configuration

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
});

// Request logging middleware
import pinoHttp from 'pino-http';

export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
});
```

### Log Levels

| Level | Usage |
|-------|-------|
| **error** | Application errors, exceptions |
| **warn** | Validation failures, deprecated usage |
| **info** | HTTP requests, business events |
| **debug** | Development debugging |
| **trace** | Detailed debugging |

---

## Security Middleware

### Helmet

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
```

### CORS

```typescript
import cors from 'cors';

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints - more restrictive
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'AI processing limit reached' },
  },
});
```

---

## Development Tools

### Development Server

| Tool | Purpose |
|------|---------|
| **tsx** | TypeScript execution with watch mode |
| **nodemon** | Alternative for file watching |

### Development Script

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit"
  }
}
```

### ESLint Configuration

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
```

### Environment Variables

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medrecord?schema=public"

# JWT
JWT_SECRET="your-secret-key-min-32-chars"

# OpenAI
OPENAI_API_KEY="sk-your-api-key"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# Logging
LOG_LEVEL="debug"
```

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Entry point
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   ├── index.ts                # Configuration loader
│   │   └── env.ts                  # Environment validation
│   ├── routes/
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── patient.routes.ts
│   │   ├── appointment.routes.ts
│   │   ├── record.routes.ts
│   │   └── ai.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── patient.service.ts
│   │   ├── appointment.service.ts
│   │   ├── record.service.ts
│   │   └── ai.service.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── openai.ts
│   │   └── logger.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── errors.ts
│   └── types/
│       ├── index.ts
│       ├── api.types.ts
│       └── express.d.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── uploads/
│   └── audio/
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Error Handling

### Error Classes

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}
```

### Error Middleware

```typescript
// src/middleware/error.middleware.ts
import { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error({ err, req: { method: req.method, url: req.url } });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unexpected error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```

---

## References

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [Pino Documentation](https://getpino.io/)
- [jsonwebtoken Documentation](https://github.com/auth0/node-jsonwebtoken)
- [Zod Documentation](https://zod.dev/)
