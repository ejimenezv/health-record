# Security Considerations: MedRecord AI

This document specifies security requirements and best practices for the AI integration layer, including data privacy, API key management, and compliance considerations.

---

## Overview

MedRecord AI processes sensitive medical information (audio recordings, transcripts, and extracted medical data). This specification ensures data is handled securely throughout the AI pipeline.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Security Architecture                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client (Browser)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Audio capture (local)                                            │   │
│  │  • HTTPS only                                                        │   │
│  │  • No API keys                                                       │   │
│  │  • Session-based auth                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │ TLS 1.3                                      │
│                              ▼                                              │
│  Backend Server                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • API key management                                                │   │
│  │  • Request validation                                                │   │
│  │  • Audit logging                                                     │   │
│  │  • Temporary file handling                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │ TLS 1.2+                                     │
│                              ▼                                              │
│  OpenAI API                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • No data retention (API)                                           │   │
│  │  • Encrypted in transit                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Privacy

### Data Classification

| Data Type | Classification | Handling Requirements |
|-----------|---------------|----------------------|
| **Audio recordings** | PHI/Sensitive | Encrypt, temp storage only, audit log |
| **Transcripts** | PHI/Sensitive | Encrypt at rest, access controlled |
| **Extracted medical data** | PHI/Sensitive | Encrypt at rest, access controlled |
| **API keys** | Secret | Never expose, rotate regularly |
| **Usage logs** | Internal | Anonymize when possible |

### PHI (Protected Health Information) Handling

```typescript
interface PHIHandlingPolicy {
  // Storage
  encryptAtRest: boolean;
  encryptionAlgorithm: string;

  // Transmission
  encryptInTransit: boolean;
  tlsVersion: string;

  // Retention
  audioRetentionDays: number;
  transcriptRetentionDays: number;

  // Access
  requireAuthentication: boolean;
  requireAuthorization: boolean;
  auditAllAccess: boolean;

  // Third parties
  allowThirdPartyProcessing: boolean;
  requireBAA: boolean;
}

const PHI_POLICY: PHIHandlingPolicy = {
  // Storage - all PHI encrypted
  encryptAtRest: true,
  encryptionAlgorithm: 'AES-256-GCM',

  // Transmission - TLS required
  encryptInTransit: true,
  tlsVersion: '1.3',

  // Retention
  audioRetentionDays: 0,        // Delete immediately after processing
  transcriptRetentionDays: -1,  // Retain with medical record

  // Access - strict controls
  requireAuthentication: true,
  requireAuthorization: true,
  auditAllAccess: true,

  // Third parties
  allowThirdPartyProcessing: true,  // OpenAI for MVP
  requireBAA: false,                 // MVP - no real PHI
};
```

### Audio File Handling

```typescript
interface AudioSecurityConfig {
  tempDirectory: string;
  maxStorageTime: number;         // milliseconds
  deleteAfterProcessing: boolean;
  encryptTempFiles: boolean;
}

const AUDIO_SECURITY_CONFIG: AudioSecurityConfig = {
  tempDirectory: '/tmp/medrecord-audio',
  maxStorageTime: 300000,          // 5 minutes max
  deleteAfterProcessing: true,
  encryptTempFiles: false,         // OS-level temp dir encryption assumed
};

class SecureAudioHandler {
  private activeFiles: Map<string, { path: string; createdAt: Date }> = new Map();
  private cleanupInterval: NodeJS.Timer;

  constructor(config: AudioSecurityConfig = AUDIO_SECURITY_CONFIG) {
    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredFiles(),
      60000 // Every minute
    );
  }

  async saveTemporaryAudio(
    audioBuffer: Buffer,
    fileId: string
  ): Promise<string> {
    const filePath = path.join(
      AUDIO_SECURITY_CONFIG.tempDirectory,
      `audio-${fileId}-${Date.now()}.webm`
    );

    // Ensure directory exists with restricted permissions
    await fs.mkdir(AUDIO_SECURITY_CONFIG.tempDirectory, {
      recursive: true,
      mode: 0o700, // Owner only
    });

    // Write file with restricted permissions
    await fs.writeFile(filePath, audioBuffer, { mode: 0o600 });

    // Track for cleanup
    this.activeFiles.set(fileId, { path: filePath, createdAt: new Date() });

    return filePath;
  }

  async deleteAudio(fileId: string): Promise<void> {
    const fileInfo = this.activeFiles.get(fileId);

    if (fileInfo) {
      await this.secureDelete(fileInfo.path);
      this.activeFiles.delete(fileId);
    }
  }

  private async secureDelete(filePath: string): Promise<void> {
    try {
      // Overwrite with random data before deletion (optional extra security)
      const stats = await fs.stat(filePath);
      const randomData = crypto.randomBytes(stats.size);
      await fs.writeFile(filePath, randomData);

      // Delete file
      await fs.unlink(filePath);

      logger.info('Secure delete completed', { filePath });
    } catch (error) {
      logger.error('Failed to delete audio file', { filePath, error });
      // Still try to delete
      await fs.unlink(filePath).catch(() => {});
    }
  }

  private async cleanupExpiredFiles(): Promise<void> {
    const now = Date.now();
    const maxAge = AUDIO_SECURITY_CONFIG.maxStorageTime;

    for (const [fileId, fileInfo] of this.activeFiles) {
      const age = now - fileInfo.createdAt.getTime();

      if (age > maxAge) {
        logger.warn('Cleaning up expired audio file', { fileId, age });
        await this.deleteAudio(fileId);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);

    // Clean up all remaining files
    for (const [fileId] of this.activeFiles) {
      this.deleteAudio(fileId).catch(() => {});
    }
  }
}
```

### Data Minimization

```typescript
interface DataMinimizationRules {
  // Don't log PHI
  excludeFromLogs: string[];

  // Don't include in error reports
  excludeFromErrors: string[];

  // Anonymize in analytics
  anonymizeFields: string[];
}

const DATA_MINIMIZATION: DataMinimizationRules = {
  excludeFromLogs: [
    'transcript',
    'audioBuffer',
    'patientName',
    'symptoms',
    'diagnosis',
    'prescriptions',
    'chiefComplaint',
  ],

  excludeFromErrors: [
    'transcript',
    'extractedFields',
    'patientData',
  ],

  anonymizeFields: [
    'appointmentId',
    'patientId',
  ],
};

function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };

  for (const field of DATA_MINIMIZATION.excludeFromLogs) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  for (const field of DATA_MINIMIZATION.anonymizeFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = hashForAnonymization(sanitized[field] as string);
    }
  }

  return sanitized;
}

function hashForAnonymization(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
}
```

---

## API Key Security

### Key Management

```typescript
interface APIKeyConfig {
  // Key sources (in order of preference)
  sources: ('env' | 'secrets_manager' | 'vault')[];

  // Key validation
  validateOnStartup: boolean;

  // Key rotation
  rotationEnabled: boolean;
  rotationIntervalDays: number;
  rotationWarningDays: number;

  // Access restrictions
  restrictByIP: boolean;
  allowedIPs: string[];
}

const API_KEY_CONFIG: APIKeyConfig = {
  sources: ['env', 'secrets_manager'],
  validateOnStartup: true,
  rotationEnabled: true,
  rotationIntervalDays: 90,
  rotationWarningDays: 14,
  restrictByIP: false,
  allowedIPs: [],
};
```

### Environment Variable Management

```typescript
// Required environment variables
interface RequiredEnvVars {
  OPENAI_API_KEY: string;
}

// Optional security-related env vars
interface OptionalEnvVars {
  OPENAI_ORG_ID?: string;
  API_KEY_LAST_ROTATED?: string;
  ENCRYPTION_KEY?: string;
}

function validateEnvironment(): void {
  const required: (keyof RequiredEnvVars)[] = ['OPENAI_API_KEY'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate API key format
  const apiKey = process.env.OPENAI_API_KEY!;
  if (!apiKey.startsWith('sk-') || apiKey.length < 40) {
    throw new Error('Invalid OPENAI_API_KEY format');
  }

  // Check key rotation
  const lastRotated = process.env.API_KEY_LAST_ROTATED;
  if (lastRotated) {
    const rotatedDate = new Date(lastRotated);
    const daysSinceRotation = (Date.now() - rotatedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRotation > API_KEY_CONFIG.rotationIntervalDays) {
      logger.warn('API key rotation overdue', { daysSinceRotation });
    } else if (daysSinceRotation > API_KEY_CONFIG.rotationIntervalDays - API_KEY_CONFIG.rotationWarningDays) {
      logger.info('API key rotation due soon', { daysSinceRotation });
    }
  }
}
```

### Key Rotation

```typescript
interface KeyRotationRecord {
  keyId: string;              // Last 4 characters of key
  rotatedAt: Date;
  rotatedBy: string;
  previousKeyId: string;
}

async function rotateAPIKey(newKey: string, adminUserId: string): Promise<void> {
  // Validate new key format
  if (!newKey.startsWith('sk-') || newKey.length < 40) {
    throw new Error('Invalid API key format');
  }

  // Test new key works
  const testResult = await testAPIKey(newKey);
  if (!testResult.success) {
    throw new Error('New API key validation failed');
  }

  // Get current key info
  const currentKey = process.env.OPENAI_API_KEY!;
  const currentKeyId = currentKey.slice(-4);
  const newKeyId = newKey.slice(-4);

  // Log rotation
  const rotationRecord: KeyRotationRecord = {
    keyId: newKeyId,
    rotatedAt: new Date(),
    rotatedBy: adminUserId,
    previousKeyId: currentKeyId,
  };

  logger.info('API key rotated', {
    newKeyId,
    previousKeyId: currentKeyId,
    rotatedBy: adminUserId,
  });

  // Update in secrets manager (if applicable)
  // await updateSecretValue('OPENAI_API_KEY', newKey);

  // Note: For env var rotation, requires process restart
}

async function testAPIKey(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const testClient = new OpenAI({ apiKey: key, timeout: 10000 });

    // Make a minimal API call to validate
    await testClient.models.list();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Never Expose Keys

```typescript
// Middleware to prevent key exposure
function sanitizeResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    const sanitized = sanitizeResponseBody(body);
    return originalJson(sanitized);
  };

  next();
}

function sanitizeResponseBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sensitivePatterns = [
    /api[-_]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /authorization/i,
    /bearer/i,
    /sk-[a-zA-Z0-9]+/,
  ];

  const sanitized = JSON.parse(JSON.stringify(body));

  function recursiveSanitize(obj: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(obj)) {
      // Check if key matches sensitive patterns
      if (sensitivePatterns.some(pattern => pattern.test(key))) {
        obj[key] = '[REDACTED]';
        continue;
      }

      // Check if value looks like a key
      if (typeof value === 'string' && value.startsWith('sk-')) {
        obj[key] = '[REDACTED]';
        continue;
      }

      // Recurse into nested objects
      if (typeof value === 'object' && value !== null) {
        recursiveSanitize(value as Record<string, unknown>);
      }
    }
  }

  recursiveSanitize(sanitized);
  return sanitized;
}
```

---

## Transport Security

### HTTPS Requirements

```typescript
interface TransportSecurityConfig {
  enforceHTTPS: boolean;
  hstsEnabled: boolean;
  hstsMaxAge: number;
  tlsMinVersion: string;
  certificatePinning: boolean;
}

const TRANSPORT_SECURITY: TransportSecurityConfig = {
  enforceHTTPS: true,
  hstsEnabled: true,
  hstsMaxAge: 31536000,         // 1 year
  tlsMinVersion: '1.2',
  certificatePinning: false,    // Not needed for MVP
};

// Express middleware
function enforceHTTPS(req: Request, res: Response, next: NextFunction): void {
  if (!TRANSPORT_SECURITY.enforceHTTPS) {
    return next();
  }

  // Check if behind proxy
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isSecure && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  next();
}

// HSTS header middleware
function hstsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (TRANSPORT_SECURITY.hstsEnabled) {
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${TRANSPORT_SECURITY.hstsMaxAge}; includeSubDomains`
    );
  }
  next();
}
```

### Request Validation

```typescript
import { z } from 'zod';

// Transcription request validation
const transcriptionRequestSchema = z.object({
  file: z.instanceof(Buffer).refine(
    buf => buf.length > 0 && buf.length <= 25 * 1024 * 1024,
    'File must be between 1 byte and 25MB'
  ),
  language: z.enum(['en', 'es']).optional(),
  appointmentId: z.string().uuid(),
});

// Extraction request validation
const extractionRequestSchema = z.object({
  transcriptId: z.string().uuid().optional(),
  transcript: z.string().min(10).max(100000),
  language: z.enum(['en', 'es']).optional(),
  appointmentId: z.string().uuid(),
});

function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
```

---

## Audit Logging

### Audit Log Schema

```typescript
interface AIAuditLog {
  id: string;
  timestamp: Date;

  // Actor
  userId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;

  // Action
  action: AIAuditAction;
  resource: string;
  resourceId: string;

  // Context
  appointmentId?: string;
  patientId?: string;            // Hashed for privacy

  // Request details
  requestSize?: number;
  responseSize?: number;

  // Result
  success: boolean;
  errorCode?: string;
  duration: number;

  // Metadata
  metadata?: Record<string, unknown>;
}

type AIAuditAction =
  | 'TRANSCRIPTION_START'
  | 'TRANSCRIPTION_COMPLETE'
  | 'TRANSCRIPTION_FAIL'
  | 'EXTRACTION_START'
  | 'EXTRACTION_COMPLETE'
  | 'EXTRACTION_FAIL'
  | 'AUDIO_UPLOAD'
  | 'AUDIO_DELETE'
  | 'TRANSCRIPT_ACCESS'
  | 'EXTRACTION_ACCESS'
  | 'API_KEY_ROTATE'
  | 'BUDGET_EXCEEDED';
```

### Audit Logger Implementation

```typescript
class AIAuditLogger {
  async log(entry: Omit<AIAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: AIAuditLog = {
      id: generateId(),
      timestamp: new Date(),
      ...entry,
      // Hash patient ID for privacy
      patientId: entry.patientId ? hashForAnonymization(entry.patientId) : undefined,
    };

    // Log to structured logger
    logger.info('AI Audit', sanitizeForLogging(fullEntry as unknown as Record<string, unknown>));

    // Persist to database
    await db.aiAuditLog.create({ data: fullEntry });

    // Alert on sensitive actions
    if (this.isSensitiveAction(entry.action)) {
      await this.alertSecurityTeam(fullEntry);
    }
  }

  private isSensitiveAction(action: AIAuditAction): boolean {
    const sensitiveActions: AIAuditAction[] = [
      'API_KEY_ROTATE',
      'BUDGET_EXCEEDED',
    ];
    return sensitiveActions.includes(action);
  }

  private async alertSecurityTeam(entry: AIAuditLog): Promise<void> {
    // Send alert to security monitoring
    logger.warn('Sensitive AI action', {
      action: entry.action,
      userId: entry.userId,
      timestamp: entry.timestamp,
    });
  }

  async query(
    filters: Partial<Pick<AIAuditLog, 'userId' | 'action' | 'appointmentId'>>,
    options: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }
  ): Promise<AIAuditLog[]> {
    return db.aiAuditLog.findMany({
      where: {
        ...filters,
        timestamp: {
          gte: options.startDate,
          lte: options.endDate,
        },
      },
      take: options.limit || 100,
      skip: options.offset || 0,
      orderBy: { timestamp: 'desc' },
    });
  }
}

export const aiAuditLogger = new AIAuditLogger();
```

### Audit Middleware

```typescript
function aiAuditMiddleware(action: AIAuditAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const appointmentId = req.params.id || req.body.appointmentId;

    // Capture original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let responseBody: unknown;
    let responseSize = 0;

    res.json = (body: unknown) => {
      responseBody = body;
      responseSize = JSON.stringify(body).length;
      return originalJson(body);
    };

    res.send = (body: unknown) => {
      responseBody = body;
      responseSize = typeof body === 'string' ? body.length : 0;
      return originalSend(body);
    };

    res.on('finish', async () => {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      const errorCode = !success && typeof responseBody === 'object'
        ? (responseBody as { error?: { code?: string } })?.error?.code
        : undefined;

      await aiAuditLogger.log({
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'unknown',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        action,
        resource: 'appointment',
        resourceId: appointmentId || 'unknown',
        appointmentId,
        requestSize: req.headers['content-length']
          ? parseInt(req.headers['content-length'], 10)
          : undefined,
        responseSize,
        success,
        errorCode,
        duration: Date.now() - startTime,
      });
    });

    next();
  };
}

// Usage in routes
router.post(
  '/appointments/:id/transcribe',
  authMiddleware,
  aiAuditMiddleware('TRANSCRIPTION_START'),
  transcriptionHandler
);
```

---

## HIPAA Considerations (MVP)

### MVP Disclaimer

```typescript
const MVP_DISCLAIMER = {
  message: `
    ⚠️ IMPORTANT: This system is for demonstration and educational purposes only.

    This application is NOT HIPAA-compliant and should NOT be used with real
    patient health information (PHI). For actual medical use, the following
    would be required:

    1. Business Associate Agreements (BAA) with OpenAI/cloud providers
    2. HIPAA-compliant infrastructure and audit logging
    3. Proper access controls and encryption
    4. Compliance certification and audits

    By using this system, you acknowledge it is for demonstration only.
  `,
  showOnStartup: true,
  requireAcknowledgment: false,
};

function displayMVPDisclaimer(): void {
  if (process.env.NODE_ENV === 'production') {
    console.warn('=' .repeat(70));
    console.warn(MVP_DISCLAIMER.message);
    console.warn('='.repeat(70));
  }
}
```

### Production Requirements

| Requirement | MVP Status | Production Needed |
|-------------|------------|-------------------|
| **BAA with OpenAI** | No | Yes - Use Azure OpenAI |
| **Encryption at rest** | Partial | Full database encryption |
| **Encryption in transit** | Yes | Yes |
| **Access controls** | Basic | Role-based with audit |
| **Audit logging** | Basic | Comprehensive |
| **Data retention policy** | None | Defined and enforced |
| **Breach notification** | None | Process defined |
| **Risk assessment** | None | Annual |
| **Training** | None | Required for users |

### Path to Compliance

```typescript
interface ComplianceRoadmap {
  phase: string;
  requirements: string[];
  estimatedEffort: string;
}

const HIPAA_COMPLIANCE_ROADMAP: ComplianceRoadmap[] = [
  {
    phase: 'Phase 1: Infrastructure',
    requirements: [
      'Switch to Azure OpenAI (HIPAA BAA available)',
      'Deploy on HIPAA-compliant cloud infrastructure',
      'Implement database encryption (AES-256)',
      'Configure network isolation',
    ],
    estimatedEffort: '2-4 weeks',
  },
  {
    phase: 'Phase 2: Access Controls',
    requirements: [
      'Implement role-based access control (RBAC)',
      'Add multi-factor authentication (MFA)',
      'Create audit trail for all PHI access',
      'Implement session management',
    ],
    estimatedEffort: '2-3 weeks',
  },
  {
    phase: 'Phase 3: Policies',
    requirements: [
      'Define data retention policy',
      'Create breach notification procedure',
      'Document security policies',
      'Establish user training program',
    ],
    estimatedEffort: '2 weeks',
  },
  {
    phase: 'Phase 4: Compliance',
    requirements: [
      'Conduct risk assessment',
      'Complete HIPAA self-assessment',
      'Engage compliance consultant',
      'Obtain necessary certifications',
    ],
    estimatedEffort: '4-8 weeks',
  },
];
```

---

## Security Headers

```typescript
import helmet from 'helmet';

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://api.openai.com'],
      mediaSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Apply to Express app
app.use(securityHeaders);
```

---

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Standard API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1 minute
  max: 100,                       // 100 requests per minute
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints - more restrictive
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1 minute
  max: 10,                        // 10 AI requests per minute
  message: {
    success: false,
    error: { code: 'AI_RATE_LIMITED', message: 'AI processing limit reached' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints - very restrictive
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 5,                         // 5 attempts per 15 minutes
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMITED', message: 'Too many login attempts' },
  },
});

app.use('/api', apiLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/auth', authLimiter);
```

---

## References

- [OpenAI Data Privacy](https://openai.com/policies/privacy-policy)
- [OpenAI API Data Usage Policy](https://openai.com/policies/api-data-usage-policies)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [Architecture Security](../architecture/security.md)
