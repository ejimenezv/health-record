# Prompt 18: Implement TICKET-010 & TICKET-011 - AI Transcription

## Context
You are implementing the Medical Record System MVP. Medical records management is complete. This is the KEY FEATURE of the system.

## Prerequisites
Read the following documentation files:
- `docs/tickets/TICKET-010-transcription-backend.md`
- `docs/tickets/TICKET-011-transcription-frontend.md`
- `docs/ai-integration/audio-capture.md`
- `docs/ai-integration/transcription-pipeline.md`
- `docs/ai-integration/field-extraction.md`
- `docs/ai-integration/auto-fill.md`
- `docs/api/endpoints/transcription.md`
- `docs/api/websocket.md`
- `docs/implementation/TICKET-008-009-completed.md`

## Objective
Implement AI-powered audio transcription using OpenAI Whisper and field extraction using GPT-4 with real-time auto-fill capabilities.

## Part 1: Transcription Backend (TICKET-010)

### 1. Create AI Types
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
  summary?: string;
}

export interface TranscriptionSession {
  id: string;
  appointmentId: string;
  status: 'active' | 'processing' | 'completed' | 'error';
  startedAt: Date;
  chunks: AudioChunk[];
}

export interface AudioChunk {
  index: number;
  buffer: Buffer;
  timestamp: number;
}
```

### 2. Create Whisper Service
Create `packages/backend/src/services/ai/whisper.service.ts`:

```typescript
import OpenAI from 'openai';
import { TranscriptionResult } from '../../types/ai.types';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class WhisperService {
  async transcribe(audioBuffer: Buffer, language = 'es'): Promise<TranscriptionResult> {
    // Write buffer to temp file (Whisper API requires file)
    const tempPath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);

    try {
      fs.writeFileSync(tempPath, audioBuffer);

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
        language,
        response_format: 'verbose_json',
        prompt: 'Esta es una consulta médica entre un doctor y un paciente. ' +
          'Términos médicos comunes incluyen: síntomas, diagnóstico, receta, medicamento, dosis.',
      });

      return {
        text: transcription.text,
        segments: transcription.segments?.map((seg) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })),
        language: transcription.language,
        duration: transcription.duration,
      };
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}

export const whisperService = new WhisperService();
```

### 3. Create GPT Service
Create `packages/backend/src/services/ai/gpt.service.ts`:

```typescript
import OpenAI from 'openai';
import { ExtractionResult } from '../../types/ai.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `Eres un asistente de documentación médica. Analiza la siguiente transcripción de una consulta médica y extrae información estructurada.

Extrae lo siguiente:
1. Síntomas mencionados por el paciente (con severidad si se menciona)
2. Diagnóstico dado por el doctor (si lo hay)
3. Recetas/medicamentos prescritos (con dosis, frecuencia y duración)
4. Un breve resumen de la consulta

Responde SOLO con JSON válido en este formato:
{
  "symptoms": [
    { "description": "string", "severity": "mild|moderate|severe", "duration": "string", "onset": "string" }
  ],
  "diagnosis": { "description": "string", "icdCode": "string", "confidence": 0.0-1.0 } | null,
  "prescriptions": [
    { "medication": "string", "dosage": "string", "frequency": "string", "duration": "string", "instructions": "string" }
  ],
  "summary": "string"
}

Si algún campo no se menciona, usa null o array vacío según corresponda.`;

export class GPTService {
  async extractMedicalFields(transcription: string, previousContext?: string): Promise<ExtractionResult> {
    const contextMessage = previousContext
      ? `Contexto previo de la consulta:\n${previousContext}\n\n`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `${contextMessage}Transcripción:\n${transcription}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('No response from GPT');
    }

    try {
      const result = JSON.parse(content) as ExtractionResult;
      return {
        symptoms: result.symptoms || [],
        diagnosis: result.diagnosis || null,
        prescriptions: result.prescriptions || [],
        summary: result.summary,
      };
    } catch (error) {
      console.error('Failed to parse GPT response:', content);
      throw new Error('Failed to parse extraction result');
    }
  }
}

export const gptService = new GPTService();
```

### 4. Create Transcription Service
Create `packages/backend/src/services/transcription.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { whisperService } from './ai/whisper.service';
import { gptService } from './ai/gpt.service';
import { TranscriptionSession, AudioChunk, ExtractionResult } from '../types/ai.types';

const prisma = new PrismaClient();

// In-memory session storage (for MVP; use Redis in production)
const sessions = new Map<string, TranscriptionSession>();

export class TranscriptionService {
  async startSession(appointmentId: string, userId: string): Promise<string> {
    // Verify appointment belongs to user
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const sessionId = `session-${appointmentId}-${Date.now()}`;

    const session: TranscriptionSession = {
      id: sessionId,
      appointmentId,
      status: 'active',
      startedAt: new Date(),
      chunks: [],
    };

    sessions.set(sessionId, session);

    // Create or update transcription record
    await prisma.transcription.upsert({
      where: { appointmentId },
      update: { status: 'recording', startedAt: new Date() },
      create: { appointmentId, status: 'recording', startedAt: new Date() },
    });

    return sessionId;
  }

  async addAudioChunk(sessionId: string, audioBuffer: Buffer, chunkIndex: number): Promise<string> {
    const session = sessions.get(sessionId);

    if (!session || session.status !== 'active') {
      throw new Error('Invalid or inactive session');
    }

    session.chunks.push({
      index: chunkIndex,
      buffer: audioBuffer,
      timestamp: Date.now(),
    });

    // Process chunk immediately for real-time transcription
    try {
      const result = await whisperService.transcribe(audioBuffer);
      return result.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  async extractFields(transcriptionText: string, previousContext?: string): Promise<ExtractionResult> {
    return gptService.extractMedicalFields(transcriptionText, previousContext);
  }

  async stopSession(sessionId: string): Promise<{
    transcription: string;
    extraction: ExtractionResult;
  }> {
    const session = sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'processing';

    // Combine all chunks and transcribe the full audio
    const fullAudioBuffer = Buffer.concat(session.chunks.map((c) => c.buffer));

    let fullTranscription = '';
    let extraction: ExtractionResult = {
      symptoms: [],
      diagnosis: null,
      prescriptions: [],
    };

    try {
      const result = await whisperService.transcribe(fullAudioBuffer);
      fullTranscription = result.text;

      // Extract medical fields from full transcription
      extraction = await gptService.extractMedicalFields(fullTranscription);

      // Save to database
      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: {
          fullText: fullTranscription,
          segments: result.segments as any,
          language: result.language,
          durationSeconds: Math.round(result.duration),
          status: 'completed',
          completedAt: new Date(),
        },
      });

      session.status = 'completed';
    } catch (error) {
      session.status = 'error';
      throw error;
    } finally {
      // Clean up session after processing
      sessions.delete(sessionId);
    }

    return { transcription: fullTranscription, extraction };
  }

  async getTranscription(appointmentId: string, userId: string) {
    const transcription = await prisma.transcription.findFirst({
      where: {
        appointmentId,
        appointment: { patient: { userId } },
      },
    });

    return transcription;
  }
}

export const transcriptionService = new TranscriptionService();
```

### 5. Create WebSocket Handler
Create `packages/backend/src/websocket/transcription.handler.ts`:

```typescript
import { Server, Socket } from 'socket.io';
import { transcriptionService } from '../services/transcription.service';
import { verifyToken } from '../utils/jwt';

interface TranscriptionSocket extends Socket {
  userId?: string;
  sessionId?: string;
  transcriptionText?: string;
}

export function setupTranscriptionWebSocket(io: Server) {
  const transcriptionNamespace = io.of('/transcription');

  transcriptionNamespace.use((socket: TranscriptionSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  transcriptionNamespace.on('connection', (socket: TranscriptionSocket) => {
    console.log('Client connected to transcription:', socket.id);

    socket.transcriptionText = '';

    socket.on('start_session', async (data: { appointmentId: string }) => {
      try {
        const sessionId = await transcriptionService.startSession(
          data.appointmentId,
          socket.userId!
        );
        socket.sessionId = sessionId;
        socket.emit('session_started', { sessionId });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('audio_chunk', async (data: { audio: string; chunkIndex: number }) => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No active session' });
        return;
      }

      try {
        // Decode base64 audio
        const audioBuffer = Buffer.from(data.audio, 'base64');

        // Transcribe chunk
        const chunkText = await transcriptionService.addAudioChunk(
          socket.sessionId,
          audioBuffer,
          data.chunkIndex
        );

        // Append to full text
        socket.transcriptionText += ' ' + chunkText;

        // Send transcription update
        socket.emit('transcription_update', {
          text: chunkText,
          fullText: socket.transcriptionText.trim(),
          chunkIndex: data.chunkIndex,
          isFinal: false,
        });

        // Periodically extract fields (every 3 chunks or ~90 seconds)
        if (data.chunkIndex > 0 && data.chunkIndex % 3 === 0) {
          const extraction = await transcriptionService.extractFields(
            socket.transcriptionText.trim()
          );
          socket.emit('field_extraction', extraction);
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'TRANSCRIPTION_ERROR' });
      }
    });

    socket.on('stop_session', async () => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No active session' });
        return;
      }

      try {
        socket.emit('status', { status: 'processing' });

        const result = await transcriptionService.stopSession(socket.sessionId);

        socket.emit('session_completed', {
          transcription: result.transcription,
          extraction: result.extraction,
        });

        socket.sessionId = undefined;
        socket.transcriptionText = '';
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'STOP_ERROR' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
```

### 6. Create Transcription Routes (REST fallback)
Create `packages/backend/src/routes/transcription.routes.ts` for non-WebSocket operations.

### 7. Setup WebSocket in App
Update `packages/backend/src/index.ts`:

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupTranscriptionWebSocket } from './websocket/transcription.handler';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

setupTranscriptionWebSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Part 2: Transcription Frontend (TICKET-011)

### 1. Create Audio Recorder Hook
Create `packages/frontend/src/hooks/useAudioRecorder.ts`:

```typescript
import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderOptions {
  onChunkReady: (chunk: Blob, index: number) => void;
  chunkDuration?: number; // in milliseconds
}

export function useAudioRecorder({ onChunkReady, chunkDuration = 30000 }: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndexRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunkIndexRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onChunkReady(event.data, chunkIndexRef.current);
          chunkIndexRef.current++;
        }
      };

      mediaRecorder.start(chunkDuration);
      setIsRecording(true);

      // Update duration every second
      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
    }
  }, [onChunkReady, chunkDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRecording(false);
    setDuration(0);
  }, []);

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
  };
}
```

### 2. Create Transcription Socket Hook
Create `packages/frontend/src/hooks/useTranscription.ts`:

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { ExtractionResult } from '../types/medical-records.types';

interface UseTranscriptionOptions {
  appointmentId: string;
  onTranscriptionUpdate: (text: string, fullText: string) => void;
  onFieldExtraction: (extraction: ExtractionResult) => void;
  onError: (error: string) => void;
}

export function useTranscription({
  appointmentId,
  onTranscriptionUpdate,
  onFieldExtraction,
  onError,
}: UseTranscriptionOptions) {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'completed'>('idle');

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

    const socket = io(`${WS_URL}/transcription`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('session_started', () => {
      setStatus('recording');
    });

    socket.on('transcription_update', (data) => {
      onTranscriptionUpdate(data.text, data.fullText);
    });

    socket.on('field_extraction', (data) => {
      onFieldExtraction(data);
    });

    socket.on('status', (data) => {
      setStatus(data.status);
    });

    socket.on('session_completed', (data) => {
      setStatus('completed');
      onTranscriptionUpdate(data.transcription, data.transcription);
      onFieldExtraction(data.extraction);
    });

    socket.on('error', (data) => {
      onError(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, onTranscriptionUpdate, onFieldExtraction, onError]);

  const startSession = useCallback(() => {
    socketRef.current?.emit('start_session', { appointmentId });
  }, [appointmentId]);

  const sendAudioChunk = useCallback(async (chunk: Blob, index: number) => {
    const arrayBuffer = await chunk.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    socketRef.current?.emit('audio_chunk', { audio: base64, chunkIndex: index });
  }, []);

  const stopSession = useCallback(() => {
    socketRef.current?.emit('stop_session');
  }, []);

  return {
    isConnected,
    status,
    startSession,
    sendAudioChunk,
    stopSession,
  };
}
```

### 3. Create Transcription Components
Create `packages/frontend/src/components/transcription/TranscriptionPanel.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useTranscription } from '../../hooks/useTranscription';
import { AudioRecorder } from './AudioRecorder';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { AIExtractionStatus } from './AIExtractionStatus';
import { Card, CardHeader, CardContent } from '../ui/card';
import { ExtractionResult } from '../../types/medical-records.types';

interface TranscriptionPanelProps {
  appointmentId: string;
  onExtractionUpdate: (extraction: ExtractionResult) => void;
}

export function TranscriptionPanel({ appointmentId, onExtractionUpdate }: TranscriptionPanelProps) {
  const [transcriptionText, setTranscriptionText] = useState('');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranscriptionUpdate = useCallback((text: string, fullText: string) => {
    setTranscriptionText(fullText);
  }, []);

  const handleFieldExtraction = useCallback((ext: ExtractionResult) => {
    setExtraction(ext);
    onExtractionUpdate(ext);
  }, [onExtractionUpdate]);

  const {
    isConnected,
    status,
    startSession,
    sendAudioChunk,
    stopSession,
  } = useTranscription({
    appointmentId,
    onTranscriptionUpdate: handleTranscriptionUpdate,
    onFieldExtraction: handleFieldExtraction,
    onError: setError,
  });

  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder({
    onChunkReady: sendAudioChunk,
    chunkDuration: 30000,
  });

  const handleStart = () => {
    startSession();
    startRecording();
  };

  const handleStop = () => {
    stopRecording();
    stopSession();
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          Transcripción con IA
          {isConnected && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <AudioRecorder
          isRecording={isRecording}
          duration={duration}
          onStart={handleStart}
          onStop={handleStop}
          disabled={status === 'processing'}
        />

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <TranscriptionDisplay
          text={transcriptionText}
          isLive={isRecording}
        />

        {extraction && (
          <AIExtractionStatus
            symptoms={extraction.symptoms.length > 0 ? 'done' : 'pending'}
            diagnosis={extraction.diagnosis ? 'done' : 'pending'}
            prescriptions={extraction.prescriptions.length > 0 ? 'done' : 'pending'}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

Create `AudioRecorder.tsx`, `TranscriptionDisplay.tsx`, and `AIExtractionStatus.tsx` components.

### 4. Integrate with Appointment Page
Update the appointment page to include the TranscriptionPanel and handle AI field updates.

## Testing

### Backend Tests (Mocked OpenAI)
```typescript
import { vi } from 'vitest';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'El paciente refiere dolor de cabeza desde hace 3 días.',
          segments: [],
          language: 'es',
          duration: 30,
        }),
      },
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                symptoms: [{ description: 'Dolor de cabeza', severity: 'moderate', duration: '3 días' }],
                diagnosis: { description: 'Cefalea tensional', confidence: 0.85 },
                prescriptions: [],
              }),
            },
          }],
        }),
      },
    },
  })),
}));
```

## Environment Variables
Add to `.env`:
```
OPENAI_API_KEY=your-api-key-here
```

## Commit
```bash
git add .
git commit -m "feat: implement AI transcription and auto-fill

Backend:
- Add Whisper service for audio transcription
- Add GPT service for medical field extraction
- Create transcription service with session management
- Set up WebSocket for real-time communication
- Add transcription REST endpoints

Frontend:
- Create audio recorder hook with chunking
- Create transcription WebSocket hook
- Create TranscriptionPanel component
- Create AudioRecorder with recording controls
- Create TranscriptionDisplay with live updates
- Create AIExtractionStatus component
- Integrate with appointment page

TICKET-010, TICKET-011"
```

## Definition of Done Checklist
- [ ] Whisper transcription working
- [ ] GPT field extraction working
- [ ] WebSocket communication working
- [ ] Audio recording working in browser
- [ ] Real-time transcription display
- [ ] AI field extraction and auto-fill
- [ ] Error handling for all cases
- [ ] Tests passing with mocked APIs
- [ ] Code committed

## Next Prompt
Proceed to `19-deployment.md` for deployment setup.
