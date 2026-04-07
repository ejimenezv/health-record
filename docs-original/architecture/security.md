# Security Architecture: MedRecord AI

This document defines the security architecture for MedRecord AI MVP, covering authentication, authorization, data protection, and API security.

---

## Security Overview

### MVP Security Scope

| Aspect | MVP Implementation | Production Enhancement |
|--------|-------------------|----------------------|
| Authentication | JWT-based | OAuth 2.0 / SSO |
| Authorization | Single role (doctor) | RBAC with multiple roles |
| Data Encryption | HTTPS + DB encryption | End-to-end encryption |
| Audit Logging | Basic timestamps | Comprehensive audit trail |
| Session Management | JWT with expiry | Redis sessions + refresh tokens |
| Secrets | Environment variables | Vault/AWS Secrets Manager |

### Security Disclaimer

```
This MVP is designed for demonstration and educational purposes.
It is NOT HIPAA-compliant and should NOT be used with real patient data.
For production use with PHI, additional security measures are required.
```

---

## Authentication Architecture

### JWT-Based Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    U->>F: Enter credentials
    F->>B: POST /api/auth/login
    B->>DB: Verify user exists
    DB-->>B: User record
    B->>B: Verify password (bcrypt)
    B->>B: Generate JWT
    B-->>F: JWT token + user data
    F->>F: Store JWT in localStorage
    F->>U: Redirect to dashboard

    Note over F,B: Subsequent requests
    F->>B: Request with Authorization header
    B->>B: Validate JWT
    B-->>F: Protected resource
```

### JWT Token Structure

```typescript
// Token payload
interface JWTPayload {
  sub: string;        // Provider ID
  email: string;      // Provider email
  name: string;       // Full name
  iat: number;        // Issued at
  exp: number;        // Expiration
}

// Token configuration
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,      // Minimum 256-bit
  expiresIn: '24h',                    // 24 hour expiry
  algorithm: 'HS256',                  // HMAC SHA-256
};
```

### Implementation

```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../config';

export function generateToken(provider: Provider): string {
  const payload: JWTPayload = {
    sub: provider.id,
    email: provider.email,
    name: `${provider.firstName} ${provider.lastName}`,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}
```

### Auth Middleware

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### Password Security

```typescript
// utils/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // Industry standard

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Password Requirements

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Minimum Length | 8 characters | NIST recommendation |
| Maximum Length | 128 characters | Prevent DoS |
| Complexity | Optional for MVP | NIST no longer requires |
| Hashing | bcrypt (12 rounds) | Industry standard |

---

## Authorization Model

### MVP: Single Role

For MVP, all authenticated users are doctors with full access:

```typescript
// Simple authorization - all authenticated users have same permissions
const authorize = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
```

### Resource Ownership

```typescript
// Patients belong to the system (single-tenant MVP)
// All authenticated doctors can access all patients

// Appointments are linked to provider
// Doctor can only modify their own appointments
const authorizeAppointment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
  });

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  if (appointment.providerId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to access this appointment' });
  }

  next();
};
```

### Future: Role-Based Access Control

```typescript
// Future RBAC implementation
enum Role {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
}

interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    { resource: 'patients', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'appointments', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'records', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'providers', actions: ['create', 'read', 'update', 'delete'] },
  ],
  [Role.DOCTOR]: [
    { resource: 'patients', actions: ['create', 'read', 'update'] },
    { resource: 'appointments', actions: ['create', 'read', 'update'] },
    { resource: 'records', actions: ['create', 'read', 'update'] },
  ],
  // ... other roles
};
```

---

## Data Protection

### Encryption at Rest

**Database Level:**
- PostgreSQL with `ssl=true` connection
- Database provider manages encryption (Neon/Supabase/RDS)

**File Storage:**
- Audio files stored with random UUIDs (no PII in filenames)
- Storage volume encryption enabled

### Encryption in Transit

**All Communications:**
- HTTPS enforced (TLS 1.2+)
- HSTS headers enabled
- API keys transmitted only in headers (never in URLs)

```typescript
// Helmet security headers
import helmet from 'helmet';

app.use(helmet({
  hsts: {
    maxAge: 31536000,     // 1 year
    includeSubDomains: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.openai.com"],
    },
  },
}));
```

### Sensitive Data Handling

| Data Type | Storage | Transmission |
|-----------|---------|--------------|
| Passwords | Hashed (bcrypt) | HTTPS only |
| JWT Tokens | Client localStorage | Authorization header |
| API Keys | Environment variables | Server-side only |
| Audio Files | Server filesystem | Multipart HTTPS |
| Medical Records | Database | HTTPS/JSON |

### Data Minimization

```typescript
// Don't return sensitive fields
const sanitizeProvider = (provider: Provider) => ({
  id: provider.id,
  email: provider.email,
  firstName: provider.firstName,
  lastName: provider.lastName,
  specialty: provider.specialty,
  // Exclude: passwordHash, licenseNumber
});

const sanitizePatient = (patient: Patient) => ({
  ...patient,
  // All fields returned - single-tenant MVP
  // In production, consider field-level access control
});
```

---

## API Security

### CORS Configuration

```typescript
// CORS setup
import cors from 'cors';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

### Rate Limiting

```typescript
// Rate limiting configuration
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Login rate limit (stricter)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 login attempts
  message: { error: 'Too many login attempts, please try again later' },
});

// AI endpoints rate limit
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 AI requests per minute
  message: { error: 'AI processing limit reached' },
});

// Apply limiters
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/ai', aiLimiter);
```

### Input Validation

```typescript
// Validation middleware with Zod
import { z } from 'zod';

export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}

// Example schema
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});
```

### SQL Injection Prevention

Prisma ORM provides automatic parameterization:

```typescript
// Safe - Prisma parameterizes automatically
const patient = await prisma.patient.findFirst({
  where: {
    firstName: { contains: searchTerm }, // searchTerm is parameterized
  },
});

// Never do this (raw SQL without parameterization)
// prisma.$queryRaw`SELECT * FROM patients WHERE name = ${unsafeInput}`
```

### XSS Prevention

```typescript
// Content-Type enforcement
app.use(express.json({ type: 'application/json' }));

// Helmet XSS filter
app.use(helmet.xssFilter());

// React automatically escapes output
// Never use dangerouslySetInnerHTML with user input
```

### File Upload Security

```typescript
// Multer configuration for audio uploads
import multer from 'multer';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
  destination: './uploads/audio',
  filename: (req, file, cb) => {
    // Random filename to prevent path traversal
    const ext = file.mimetype === 'audio/webm' ? '.webm' : '.mp3';
    cb(null, `${uuid()}${ext}`);
  },
});

const audioUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
    files: 1,                   // Single file only
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  },
});
```

---

## Secrets Management

### Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medrecord

# JWT
JWT_SECRET=your-256-bit-secret-key-here-minimum-32-chars

# OpenAI
OPENAI_API_KEY=sk-...

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Secret Requirements

| Secret | Minimum Length | Rotation |
|--------|---------------|----------|
| JWT_SECRET | 256 bits (32 chars) | On compromise |
| DATABASE_URL | N/A | On compromise |
| OPENAI_API_KEY | N/A | Monthly recommended |

### Secret Generation

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Loading

```typescript
// config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

---

## HTTPS Requirements

### Development

- Use `http://localhost` for local development
- Self-signed certificates optional

### Production

```nginx
# Nginx HTTPS configuration
server {
    listen 443 ssl http2;
    server_name medrecord.example.com;

    ssl_certificate /etc/letsencrypt/live/medrecord.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medrecord.example.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}
```

### Certificate Management

- Use Let's Encrypt for free certificates
- Auto-renewal with certbot
- Monitor expiration dates

---

## Security Checklist

### Development Phase

- [ ] Environment variables configured
- [ ] JWT secret generated securely
- [ ] Password hashing implemented
- [ ] Input validation on all endpoints
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] File upload restrictions in place

### Pre-Deployment

- [ ] HTTPS configured
- [ ] Security headers enabled (Helmet)
- [ ] Database SSL connection
- [ ] API keys rotated from development
- [ ] Error messages don't expose internals
- [ ] Logging doesn't include sensitive data

### Production Monitoring

- [ ] Monitor failed login attempts
- [ ] Monitor rate limit hits
- [ ] Monitor API error rates
- [ ] Regular dependency updates

---

## Security Limitations (MVP)

| Limitation | Impact | Future Mitigation |
|------------|--------|-------------------|
| No MFA | Account security | Add TOTP/WebAuthn |
| No audit logging | Compliance | Comprehensive audit trail |
| Single tenant | Data isolation | Multi-tenant architecture |
| No session revocation | Token theft risk | Redis session store |
| Basic rate limiting | DoS protection | WAF/CDN |

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
