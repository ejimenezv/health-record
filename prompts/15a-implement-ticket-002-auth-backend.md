# Prompt 15a: Implement TICKET-002 - Authentication Backend

## Context
You are implementing the Medical Record System MVP. Database schema (TICKET-001) is complete.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-002-auth-backend.md` - Backend auth requirements
- `docs/api/endpoints/auth.md` - API endpoint specifications
- `docs/implementation/TICKET-001-completed.md` - Previous implementation notes

## Verify Prerequisites
Before starting, verify TICKET-001 is complete:

```bash
# 1. Check database is running with seed data
cd packages/backend
pnpm db:studio
# Should open Prisma Studio - verify User table has doctor@medrecord.com

# 2. Check backend compiles
pnpm tsc --noEmit

# 3. Verify user exists with password
# In Prisma Studio: User table should have 1 record with passwordHash populated
```

**If any verification fails:** Go back to Prompt 14 and complete TICKET-001.

---

## Objective
Implement backend JWT authentication with:
- JWT token generation and verification
- Prisma client singleton
- Auth service with register/login/getUser
- Auth middleware for protected routes
- Auth controller with validation
- Auth routes (POST /register, POST /login, GET /me)
- Comprehensive integration tests

---

## Step 1: Create JWT Utility
Create `packages/backend/src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};
```

---

## Step 2: Create Auth Validator
Create `packages/backend/src/validators/auth.validator.ts`:

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

## Step 3: Create Prisma Client Singleton
Create `packages/backend/src/config/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

---

## Step 4: Create Auth Service
Create `packages/backend/src/services/auth.service.ts`:

```typescript
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';

export type SafeUser = Omit<User, 'passwordHash'>;

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber,
      },
    });

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    // Return user without password
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    // Return user without password
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async getUser(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
```

---

## Step 5: Create Auth Middleware
Create `packages/backend/src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autorización requerido',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
      req.userEmail = payload.email;
    } catch {
      // Token invalid, but continue without auth
    }
  }

  next();
};
```

---

## Step 6: Create Auth Controller
Create `packages/backend/src/controllers/auth.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { ZodError } from 'zod';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registro exitoso',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const statusCode = error.message === 'El email ya está registrado' ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error en el registro',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);

      res.json({
        success: true,
        data: result,
        message: 'Login exitoso',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const user = await authService.getUser(req.userId!);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error del servidor',
      });
    }
  }
}

export const authController = new AuthController();
```

---

## Step 7: Create Auth Routes
Create `packages/backend/src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

// Protected routes
router.get('/me', authMiddleware, authController.me.bind(authController));

export default router;
```

---

## Step 8: Update Main Router
Update `packages/backend/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API routes
router.use('/auth', authRoutes);

export default router;
```

---

## Step 9: Create Backend Integration Tests
Create `packages/backend/tests/integration/auth.routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Auth Routes', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor@medrecord.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('doctor@medrecord.com');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor@medrecord.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notreal@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notanemail',
          password: 'password123',
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor@medrecord.com',
          password: 'password123',
        });
      token = loginResponse.body.data.token;
    });

    it('should return user for valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('doctor@medrecord.com');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    it('should register new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(uniqueEmail);
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'doctor@medrecord.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'short@test.com',
          password: '123', // Too short
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });
  });
});
```

---

## Testing & Verification

### Run Backend Tests
```bash
cd packages/backend
pnpm test
```

**Expected:** All auth tests pass (11+ tests).

### Manual API Verification
```bash
# Start backend
cd packages/backend && pnpm dev

# Login and get token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}'

# Expected: {"success":true,"data":{"user":{...},"token":"..."},"message":"Login exitoso"}

# Use token to get user
TOKEN="<paste token here>"
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"success":true,"data":{"id":"...","email":"doctor@medrecord.com",...}}
```

### TypeScript Check
```bash
cd packages/backend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

- [ ] JWT utility created with generate/verify/decode functions
- [ ] Auth validator with Zod schemas for register/login
- [ ] Prisma client singleton created
- [ ] Auth service with register/login/getUser methods
- [ ] Auth middleware protects routes and extends Request type
- [ ] Auth controller handles validation errors correctly
- [ ] Auth routes registered (POST /register, POST /login, GET /me)
- [ ] Backend tests pass (11+ auth tests)
- [ ] Manual API calls work correctly
- [ ] TypeScript compiles without errors

---

## Debugging Reference

| Issue | Solution |
|-------|----------|
| `Cannot find module '@prisma/client'` | Run `pnpm db:generate` |
| `401 Unauthorized` on login | Check password hash in database, re-run seed |
| Token not verifying | Check JWT_SECRET is consistent |
| Tests failing on CI | Ensure database is seeded before tests |

---

## Next Prompt
Proceed to `15b-implement-ticket-003-auth-frontend.md` to implement the frontend authentication.
