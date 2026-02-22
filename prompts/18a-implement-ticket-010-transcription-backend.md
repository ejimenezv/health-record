# Prompt 18a: Implement TICKET-010 - AI Transcription Backend

## Context
You are implementing the Medical Record System MVP. Medical records management (TICKET-008, TICKET-009) is complete. This is the **KEY FEATURE** - AI-powered transcription with medical field extraction.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-010-transcription-backend.md` - Backend requirements
- `docs/ai-integration/audio-capture.md` - Audio capture specs
- `docs/ai-integration/transcription-pipeline.md` - Transcription flow
- `docs/ai-integration/field-extraction.md` - GPT extraction specs
- `docs/api/websocket.md` - WebSocket protocol

## Verify Prerequisites
```bash
cd packages/backend

# Verify medical records are working
pnpm test

# Start the backend
pnpm dev

# Test medical records endpoint
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' | jq -r '.data.token')

curl http://localhost:3001/api/v1/appointments/today \
  -H "Authorization: Bearer $TOKEN" | jq
```

**If any verification fails:** Go back to Prompt 17a.

---

## Objective
Implement AI transcription backend with:
- OpenAI Whisper integration for speech-to-text
- GPT-4 integration for medical field extraction
- WebSocket handler for real-time audio streaming
- Session management for transcription state
- REST endpoints for transcription data
- Comprehensive tests with mocked OpenAI

---

## Step 1: Install Dependencies
```bash
cd packages/backend
pnpm add openai socket.io
```

---

## Step 2: Add Environment Variables
Add to `packages/backend/.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# WebSocket Configuration
FRONTEND_URL=http://localhost:5173
```

---

## Step 3: Create AI Types
Create `packages/backend/src/types/ai.types.ts`:

```typescript
export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language: string;
  duration: number;
}

export interface ExtractedSymptom {
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  onset?: string;
}

export interface ExtractedDiagnosis {
  description: string;
  icdCode?: string;
  confidence: number;
}

export interface ExtractedPrescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ExtractionResult {
  symptoms: ExtractedSymptom[];
  diagnosis: ExtractedDiagnosis | null;
  prescriptions: ExtractedPrescription[];
  chiefComplaint?: string;
  summary?: string;
}

export interface TranscriptionSession {
  id: string;
  appointmentId: string;
  userId: string;
  status: 'active' | 'processing' | 'completed' | 'error';
  startedAt: Date;
  chunks: AudioChunk[];
  fullTranscription: string;
}

export interface AudioChunk {
  index: number;
  buffer: Buffer;
  timestamp: number;
  transcription?: string;
}
```

---

## Step 4: Create Whisper Service
Create `packages/backend/src/services/ai/whisper.service.ts`:

```typescript
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TranscriptionResult } from '../../types/ai.types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class WhisperService {
  /**
   * Transcribe audio buffer using OpenAI Whisper
   */
  async transcribe(audioBuffer: Buffer, language = 'es'): Promise<TranscriptionResult> {
    const tempPath = path.join(
      os.tmpdir(),
      `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`
    );

    try {
      fs.writeFileSync(tempPath, audioBuffer);
      const fileStream = fs.createReadStream(tempPath);

      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language,
        response_format: 'verbose_json',
        prompt: this.getMedicalPrompt(),
      });

      return {
        text: transcription.text,
        segments: transcription.segments?.map((seg) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })),
        language: transcription.language || language,
        duration: transcription.duration || 0,
      };
    } catch (error: any) {
      console.error('Whisper transcription error:', error);

      if (error.code === 'audio_too_short') {
        return { text: '', segments: [], language, duration: 0 };
      }

      throw new Error(`Transcription failed: ${error.message}`);
    } finally {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        console.warn('Failed to clean up temp file:', tempPath);
      }
    }
  }

  private getMedicalPrompt(): string {
    return `Esta es una consulta médica entre un doctor y un paciente en español.
Términos médicos comunes: síntomas, diagnóstico, receta, medicamento, dosis, frecuencia,
dolor, fiebre, inflamación, infección, presión arterial, diabetes, hipertensión,
paracetamol, ibuprofeno, antibiótico, antiinflamatorio, analgésico.`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await openai.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const whisperService = new WhisperService();
```

---

## Step 5: Create GPT Extraction Service
Create `packages/backend/src/services/ai/gpt.service.ts`:

```typescript
import OpenAI from 'openai';
import { ExtractionResult } from '../../types/ai.types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_SYSTEM_PROMPT = `Eres un asistente de documentación médica en español.
Extrae información estructurada de transcripciones de consultas médicas.

Extrae:
1. Síntomas (descripción, severidad mild/moderate/severe, duración, inicio)
2. Diagnóstico (descripción, código ICD si se menciona, nivel de confianza 0-1)
3. Recetas (medicamento, dosis, frecuencia, duración, instrucciones)
4. Motivo de consulta
5. Resumen breve (2-3 oraciones)

IMPORTANTE:
- Responde ÚNICAMENTE con JSON válido
- Si algo no se menciona, usa null o array vacío
- Sé conservador con la confianza del diagnóstico`;

export class GPTService {
  async extractMedicalFields(
    transcription: string,
    previousContext?: string
  ): Promise<ExtractionResult> {
    if (!transcription || transcription.trim().length < 10) {
      return this.getEmptyResult();
    }

    const contextMessage = previousContext
      ? `Contexto previo:\n${previousContext}\n\n`
      : '';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: `${contextMessage}Transcripción:\n\n${transcription}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;

      if (!content) {
        return this.getEmptyResult();
      }

      try {
        return this.normalizeResult(JSON.parse(content));
      } catch {
        console.error('Failed to parse GPT response:', content);
        return this.getEmptyResult();
      }
    } catch (error: any) {
      console.error('GPT extraction error:', error);

      if (error.code === 'rate_limit_exceeded') {
        throw new Error('Rate limit exceeded. Please try again.');
      }

      throw new Error(`Field extraction failed: ${error.message}`);
    }
  }

  async extractFieldsIncremental(transcription: string): Promise<ExtractionResult> {
    if (transcription.trim().length < 20) {
      return this.getEmptyResult();
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Extrae síntomas, diagnóstico y recetas. JSON: {"symptoms":[],"diagnosis":null,"prescriptions":[]}`,
          },
          { role: 'user', content: transcription },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) return this.getEmptyResult();

      try {
        return this.normalizeResult(JSON.parse(content));
      } catch {
        return this.getEmptyResult();
      }
    } catch {
      return this.getEmptyResult();
    }
  }

  private normalizeResult(result: Partial<ExtractionResult>): ExtractionResult {
    return {
      symptoms: Array.isArray(result.symptoms)
        ? result.symptoms.filter((s) => s.description)
        : [],
      diagnosis: result.diagnosis?.description
        ? {
            description: result.diagnosis.description,
            icdCode: result.diagnosis.icdCode,
            confidence: Math.min(1, Math.max(0, result.diagnosis.confidence || 0.5)),
          }
        : null,
      prescriptions: Array.isArray(result.prescriptions)
        ? result.prescriptions.filter((p) => p.medication && p.dosage && p.frequency && p.duration)
        : [],
      chiefComplaint: result.chiefComplaint,
      summary: result.summary,
    };
  }

  private getEmptyResult(): ExtractionResult {
    return { symptoms: [], diagnosis: null, prescriptions: [] };
  }
}

export const gptService = new GPTService();
```

---

## Step 6: Create Transcription Service
Create `packages/backend/src/services/transcription.service.ts`:

```typescript
import prisma from '../config/database.js';
import { whisperService } from './ai/whisper.service.js';
import { gptService } from './ai/gpt.service.js';
import { TranscriptionSession, AudioChunk, ExtractionResult } from '../types/ai.types.js';

const activeSessions = new Map<string, TranscriptionSession>();

export class TranscriptionService {
  async startSession(appointmentId: string, userId: string): Promise<string> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    const existingSession = Array.from(activeSessions.values()).find(
      (s) => s.appointmentId === appointmentId && s.status === 'active'
    );

    if (existingSession) {
      return existingSession.id;
    }

    const sessionId = `session-${appointmentId}-${Date.now()}`;

    const session: TranscriptionSession = {
      id: sessionId,
      appointmentId,
      userId,
      status: 'active',
      startedAt: new Date(),
      chunks: [],
      fullTranscription: '',
    };

    activeSessions.set(sessionId, session);

    await prisma.transcription.upsert({
      where: { appointmentId },
      update: { status: 'recording', startedAt: new Date() },
      create: { appointmentId, status: 'recording', startedAt: new Date() },
    });

    return sessionId;
  }

  async processAudioChunk(
    sessionId: string,
    audioBuffer: Buffer,
    chunkIndex: number
  ): Promise<{ text: string; fullText: string }> {
    const session = activeSessions.get(sessionId);

    if (!session) throw new Error('Sesión no encontrada');
    if (session.status !== 'active') throw new Error('Sesión no está activa');

    const chunk: AudioChunk = {
      index: chunkIndex,
      buffer: audioBuffer,
      timestamp: Date.now(),
    };

    session.chunks.push(chunk);

    try {
      const result = await whisperService.transcribe(audioBuffer);
      chunk.transcription = result.text;

      if (result.text) {
        session.fullTranscription += (session.fullTranscription ? ' ' : '') + result.text;
      }

      return { text: result.text, fullText: session.fullTranscription };
    } catch (error: any) {
      console.error(`Chunk ${chunkIndex} transcription error:`, error);
      throw error;
    }
  }

  async extractFields(sessionId: string): Promise<ExtractionResult> {
    const session = activeSessions.get(sessionId);

    if (!session) throw new Error('Sesión no encontrada');
    if (!session.fullTranscription) {
      return { symptoms: [], diagnosis: null, prescriptions: [] };
    }

    return gptService.extractFieldsIncremental(session.fullTranscription);
  }

  async stopSession(sessionId: string): Promise<{
    transcription: string;
    extraction: ExtractionResult;
    duration: number;
  }> {
    const session = activeSessions.get(sessionId);

    if (!session) throw new Error('Sesión no encontrada');

    session.status = 'processing';

    try {
      let finalTranscription = session.fullTranscription;
      let totalDuration = 0;

      if (session.chunks.length > 0) {
        const totalSize = session.chunks.reduce((sum, c) => sum + c.buffer.length, 0);

        if (totalSize < 25 * 1024 * 1024) {
          try {
            const combinedBuffer = Buffer.concat(session.chunks.map((c) => c.buffer));
            const fullResult = await whisperService.transcribe(combinedBuffer);
            finalTranscription = fullResult.text;
            totalDuration = fullResult.duration;
          } catch {
            totalDuration = session.chunks.length * 30;
          }
        }
      }

      const extraction = await gptService.extractMedicalFields(finalTranscription);

      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: {
          fullText: finalTranscription,
          durationSeconds: Math.round(totalDuration),
          status: 'completed',
          completedAt: new Date(),
        },
      });

      session.status = 'completed';
      activeSessions.delete(sessionId);

      return { transcription: finalTranscription, extraction, duration: totalDuration };
    } catch (error: any) {
      session.status = 'error';
      activeSessions.delete(sessionId);

      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: { status: 'error' },
      });

      throw error;
    }
  }

  async getTranscription(appointmentId: string, userId: string) {
    return prisma.transcription.findFirst({
      where: { appointmentId, appointment: { patient: { userId } } },
    });
  }

  async cancelSession(sessionId: string): Promise<void> {
    const session = activeSessions.get(sessionId);

    if (session) {
      activeSessions.delete(sessionId);
      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: { status: 'cancelled' },
      });
    }
  }
}

export const transcriptionService = new TranscriptionService();
```

---

## Step 7: Create WebSocket Handler
Create `packages/backend/src/websocket/transcription.handler.ts`:

```typescript
import { Server, Socket } from 'socket.io';
import { transcriptionService } from '../services/transcription.service.js';
import { verifyToken } from '../utils/jwt.js';

interface TranscriptionSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

export function setupTranscriptionWebSocket(io: Server): void {
  const namespace = io.of('/transcription');

  // Auth middleware
  namespace.use((socket: TranscriptionSocket, next) => {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  namespace.on('connection', (socket: TranscriptionSocket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('start_session', async (data: { appointmentId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'No autenticado', code: 'AUTH_ERROR' });
          return;
        }

        const sessionId = await transcriptionService.startSession(data.appointmentId, socket.userId);
        socket.sessionId = sessionId;

        socket.emit('session_started', { sessionId, message: 'Sesión iniciada' });
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'START_ERROR' });
      }
    });

    socket.on('audio_chunk', async (data: { audio: string; chunkIndex: number }) => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No hay sesión activa', code: 'NO_SESSION' });
        return;
      }

      try {
        const audioBuffer = Buffer.from(data.audio, 'base64');

        if (audioBuffer.length < 1000) return;

        const { text, fullText } = await transcriptionService.processAudioChunk(
          socket.sessionId,
          audioBuffer,
          data.chunkIndex
        );

        socket.emit('transcription_update', {
          text,
          fullText,
          chunkIndex: data.chunkIndex,
          isFinal: false,
        });

        // Extract fields every 3 chunks
        if (data.chunkIndex > 0 && data.chunkIndex % 3 === 0) {
          try {
            const extraction = await transcriptionService.extractFields(socket.sessionId);
            socket.emit('field_extraction', extraction);
          } catch {
            // Continue without extraction
          }
        }
      } catch (error: any) {
        socket.emit('error', {
          message: error.message,
          code: 'CHUNK_ERROR',
          chunkIndex: data.chunkIndex,
        });
      }
    });

    socket.on('stop_session', async () => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No hay sesión activa', code: 'NO_SESSION' });
        return;
      }

      try {
        socket.emit('status', { status: 'processing', message: 'Procesando...' });

        const result = await transcriptionService.stopSession(socket.sessionId);

        socket.emit('session_completed', {
          transcription: result.transcription,
          extraction: result.extraction,
          duration: result.duration,
        });

        socket.sessionId = undefined;
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'STOP_ERROR' });
      }
    });

    socket.on('cancel_session', async () => {
      if (socket.sessionId) {
        await transcriptionService.cancelSession(socket.sessionId);
        socket.emit('session_cancelled', { message: 'Sesión cancelada' });
        socket.sessionId = undefined;
      }
    });

    socket.on('request_extraction', async () => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No hay sesión activa', code: 'NO_SESSION' });
        return;
      }

      try {
        const extraction = await transcriptionService.extractFields(socket.sessionId);
        socket.emit('field_extraction', extraction);
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'EXTRACTION_ERROR' });
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.sessionId) {
        await transcriptionService.cancelSession(socket.sessionId);
      }
    });
  });

  console.log('Transcription WebSocket handler initialized');
}
```

---

## Step 8: Create REST Routes
Create `packages/backend/src/routes/transcription.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { transcriptionService } from '../services/transcription.service.js';
import { whisperService } from '../services/ai/whisper.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/appointments/:appointmentId/transcription', async (req: Request, res: Response) => {
  try {
    const transcription = await transcriptionService.getTranscription(
      req.params.appointmentId,
      req.userId!
    );

    if (!transcription) {
      return res.status(404).json({ success: false, message: 'Transcripción no encontrada' });
    }

    res.json({ success: true, data: transcription });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ai/health', async (req: Request, res: Response) => {
  try {
    const whisperOk = await whisperService.healthCheck();

    res.json({
      success: true,
      data: { whisper: whisperOk, configured: !!process.env.OPENAI_API_KEY },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'AI health check failed' });
  }
});

export default router;
```

---

## Step 9: Update Server with Socket.IO
Update `packages/backend/src/index.ts`:

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { setupTranscriptionWebSocket } from './websocket/transcription.handler.js';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  maxHttpBufferSize: 5e6, // 5MB for audio
});

setupTranscriptionWebSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket enabled at ws://localhost:${PORT}`);
  console.log(`OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
});

export { io };
```

---

## Step 10: Register Routes
Update `packages/backend/src/routes/index.ts`:

```typescript
import transcriptionRoutes from './transcription.routes.js';

// Add after existing routes
router.use('/', transcriptionRoutes);
```

---

## Step 11: Create Integration Tests
Create `packages/backend/tests/integration/transcription.routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'El paciente refiere dolor de cabeza desde hace 3 días.',
          language: 'es',
          duration: 10,
        }),
      },
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                symptoms: [{ description: 'Dolor de cabeza', severity: 'moderate' }],
                diagnosis: { description: 'Cefalea tensional', confidence: 0.85 },
                prescriptions: [{
                  medication: 'Paracetamol',
                  dosage: '500mg',
                  frequency: 'Cada 8 horas',
                  duration: '5 días',
                }],
              }),
            },
          }],
        }),
      },
    },
    models: { list: vi.fn().mockResolvedValue({ data: [] }) },
  })),
}));

describe('Transcription API', () => {
  let authToken: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor@medrecord.com', password: 'password123' });
    authToken = loginRes.body.data.token;

    const patient = await prisma.patient.findFirst();
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient!.id,
        scheduledAt: new Date(),
        status: 'IN_PROGRESS',
      },
    });
    testAppointmentId = appointment.id;
  });

  afterAll(async () => {
    await prisma.transcription.deleteMany({});
    await prisma.appointment.delete({ where: { id: testAppointmentId } });
  });

  describe('GET /api/v1/appointments/:appointmentId/transcription', () => {
    it('should return 404 when no transcription exists', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/transcription`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return transcription when it exists', async () => {
      await prisma.transcription.create({
        data: {
          appointmentId: testAppointmentId,
          fullText: 'Test transcription',
          status: 'completed',
          startedAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/transcription`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fullText).toBe('Test transcription');
    });
  });

  describe('GET /api/v1/ai/health', () => {
    it('should return AI service health status', async () => {
      const res = await request(app)
        .get('/api/v1/ai/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('whisper');
      expect(res.body.data).toHaveProperty('configured');
    });
  });
});

describe('Whisper Service (Mocked)', () => {
  it('should return mocked transcription', async () => {
    const { whisperService } = await import('../../src/services/ai/whisper.service.js');

    const result = await whisperService.transcribe(Buffer.from('test'));

    expect(result.text).toContain('dolor de cabeza');
    expect(result.language).toBe('es');
  });
});

describe('GPT Service (Mocked)', () => {
  it('should extract medical fields', async () => {
    const { gptService } = await import('../../src/services/ai/gpt.service.js');

    const result = await gptService.extractMedicalFields(
      'Paciente con dolor de cabeza. Diagnóstico: cefalea. Receto paracetamol.'
    );

    expect(result.symptoms).toHaveLength(1);
    expect(result.diagnosis).toBeDefined();
    expect(result.prescriptions).toHaveLength(1);
  });
});
```

---

## Testing & Verification

### Run All Tests
```bash
cd packages/backend
pnpm test
```

**Expected:** All transcription tests pass with mocked OpenAI.

### Verify OpenAI Configuration
```bash
echo $OPENAI_API_KEY

# Test API connectivity (optional)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | head -20
```

### Start Backend
```bash
cd packages/backend
pnpm dev

# Expected output:
# Server running on port 3001
# WebSocket enabled at ws://localhost:3001
# OpenAI configured: true
```

### Test WebSocket (optional)
```bash
npx wscat -c ws://localhost:3001/transcription
```

---

## Definition of Done Checklist

- [ ] OpenAI dependency installed
- [ ] Environment variables configured
- [ ] AI types defined
- [ ] Whisper service with transcription
- [ ] GPT service with field extraction
- [ ] Transcription service with session management
- [ ] WebSocket handler with all events
- [ ] REST routes for transcription data
- [ ] Server updated with Socket.IO
- [ ] Tests passing with mocked OpenAI

---

## Debugging Reference

| Issue | Solution |
|-------|----------|
| `OPENAI_API_KEY not set` | Check .env file |
| WebSocket auth failing | Verify token is valid |
| Transcription empty | Check audio buffer size (>1KB) |
| Rate limit errors | Add retry logic or reduce frequency |
| Session not found | Check session hasn't timed out |

---

## Next Prompt
Proceed to `18b-implement-ticket-011-transcription-frontend.md` for transcription frontend implementation.
