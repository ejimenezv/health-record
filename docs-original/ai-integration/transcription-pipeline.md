# Transcription Pipeline Specification: MedRecord AI

This document details the speech-to-text transcription pipeline using OpenAI Whisper API, including request/response handling, real-time processing flows, and optimization strategies.

---

## Overview

The transcription pipeline converts audio recordings of doctor-patient conversations into text. The MVP uses a batch processing approach where complete recordings are transcribed after the consultation ends.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Transcription Pipeline                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────────────┐│
│  │  Audio Blob  │────▶│  Backend Server  │────▶│  Whisper API             ││
│  │  (WebM/Opus) │     │  Audio Service   │     │  (OpenAI)                ││
│  └──────────────┘     └──────────────────┘     └───────────┬──────────────┘│
│                                                             │               │
│                              ┌──────────────────────────────┘               │
│                              │                                              │
│                              ▼                                              │
│                   ┌──────────────────────────────────────────────────────┐ │
│                   │  Transcript Text                                      │ │
│                   │  ─────────────────────────────────────────────────── │ │
│                   │  "Doctor: Good morning, what brings you in today?    │ │
│                   │   Patient: I've been having these headaches..."      │ │
│                   └──────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Whisper API Integration

### API Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Model** | `whisper-1` | Current production model |
| **Language** | `en` or `es` | English/Spanish for MVP |
| **Response Format** | `verbose_json` | Includes segments for real-time display |
| **File Size Limit** | 25 MB | OpenAI API limit |
| **Max Duration** | ~90 minutes | At 32kbps opus encoding |
| **Timeout** | 120 seconds | For long recordings |

### Request Interface

```typescript
interface TranscriptionRequest {
  file: Buffer;                     // Audio file buffer
  model: 'whisper-1';               // Model identifier
  language?: 'en' | 'es';           // Language hint
  response_format?: TranscriptionFormat;
  prompt?: string;                  // Medical terminology hints
  temperature?: number;             // 0-1, lower for consistency
}

type TranscriptionFormat =
  | 'json'          // { text: string }
  | 'text'          // Plain text
  | 'srt'           // Subtitle format
  | 'verbose_json'  // Detailed with segments
  | 'vtt';          // WebVTT format

interface TranscriptionOptions {
  language: 'en' | 'es';
  format: TranscriptionFormat;
  prompt: string;
  maxRetries: number;
  timeout: number;
}

const DEFAULT_OPTIONS: TranscriptionOptions = {
  language: 'en',
  format: 'verbose_json',
  prompt: 'Medical consultation transcription. Terms: symptoms, diagnosis, prescription, medication, dosage, blood pressure, temperature.',
  maxRetries: 2,
  timeout: 120000,
};
```

### Response Interfaces

```typescript
// Basic response (format: 'json')
interface TranscriptionBasicResponse {
  text: string;
}

// Verbose response (format: 'verbose_json')
interface TranscriptionVerboseResponse {
  task: 'transcribe';
  language: string;
  duration: number;
  text: string;
  segments: TranscriptionSegment[];
}

interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;           // Start time in seconds
  end: number;             // End time in seconds
  text: string;            // Segment text
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

// Internal processed result
interface TranscriptionResult {
  success: boolean;
  transcript: string;
  segments: ProcessedSegment[];
  language: string;
  duration: number;
  processingTime: number;
  error?: string;
}

interface ProcessedSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: 'doctor' | 'patient' | 'unknown';
}
```

---

## Backend Service Implementation

### Transcription Service

```typescript
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
  maxRetries: 2,
});

interface TranscribeAudioParams {
  audioBuffer: Buffer;
  mimeType: string;
  language?: 'en' | 'es';
  appointmentId: string;
}

export async function transcribeAudio(
  params: TranscribeAudioParams
): Promise<TranscriptionResult> {
  const { audioBuffer, mimeType, language = 'en', appointmentId } = params;
  const startTime = Date.now();

  // Validate audio
  const validation = validateAudioBuffer(audioBuffer, mimeType);
  if (!validation.valid) {
    return {
      success: false,
      transcript: '',
      segments: [],
      language,
      duration: 0,
      processingTime: 0,
      error: validation.error,
    };
  }

  // Write buffer to temp file (OpenAI SDK requires file path)
  const extension = getFileExtension(mimeType);
  const tempPath = join('/tmp', `audio-${appointmentId}-${uuid()}.${extension}`);

  try {
    await writeFile(tempPath, audioBuffer);

    // Call Whisper API
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(tempPath),
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
      prompt: getMedicalPrompt(language),
    });

    const verboseResponse = response as TranscriptionVerboseResponse;

    // Process segments
    const segments = processSegments(verboseResponse.segments);

    return {
      success: true,
      transcript: verboseResponse.text,
      segments,
      language: verboseResponse.language,
      duration: verboseResponse.duration,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const apiError = error as OpenAI.APIError;

    return {
      success: false,
      transcript: '',
      segments: [],
      language,
      duration: 0,
      processingTime: Date.now() - startTime,
      error: getErrorMessage(apiError),
    };
  } finally {
    // Clean up temp file
    await unlink(tempPath).catch(() => {});
  }
}

function validateAudioBuffer(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  // Check size (25 MB limit)
  const maxSize = 25 * 1024 * 1024;
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `Audio file too large (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Maximum is 25 MB.`,
    };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Audio file is empty' };
  }

  // Check supported formats
  const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
  const isSupported = supportedTypes.some(type => mimeType.includes(type));

  if (!isSupported) {
    return { valid: false, error: `Unsupported audio format: ${mimeType}` };
  }

  return { valid: true };
}

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };

  for (const [type, ext] of Object.entries(extensions)) {
    if (mimeType.includes(type)) return ext;
  }

  return 'webm';
}

function getMedicalPrompt(language: 'en' | 'es'): string {
  const prompts = {
    en: `Medical consultation transcription. Common terms include: symptoms, diagnosis,
prescription, medication, dosage, blood pressure, temperature, headache, fever,
pain, follow-up, examination, treatment, therapy, chronic, acute.`,
    es: `Transcripción de consulta médica. Términos comunes incluyen: síntomas, diagnóstico,
prescripción, medicamento, dosis, presión arterial, temperatura, dolor de cabeza, fiebre,
dolor, seguimiento, examen, tratamiento, terapia, crónico, agudo.`,
  };

  return prompts[language];
}

function getErrorMessage(error: OpenAI.APIError): string {
  switch (error.status) {
    case 400:
      return 'Invalid audio format. Please try recording again.';
    case 429:
      return 'Service temporarily busy. Please wait a moment and try again.';
    case 500:
    case 503:
      return 'Transcription service unavailable. Please try again later.';
    default:
      return 'Transcription failed. Please try again or enter notes manually.';
  }
}

function processSegments(segments: TranscriptionSegment[]): ProcessedSegment[] {
  return segments.map(segment => ({
    startTime: segment.start,
    endTime: segment.end,
    text: segment.text.trim(),
    speaker: detectSpeaker(segment.text),
  }));
}

function detectSpeaker(text: string): 'doctor' | 'patient' | 'unknown' {
  // Simple heuristic based on content
  const doctorPhrases = [
    'let me check',
    'i\'m going to prescribe',
    'your diagnosis',
    'take this medication',
    'follow up',
    'examination shows',
    'based on what you\'ve described',
  ];

  const patientPhrases = [
    'i\'ve been having',
    'it hurts when',
    'i feel',
    'my symptoms',
    'the pain started',
    'i noticed',
  ];

  const lowerText = text.toLowerCase();

  for (const phrase of doctorPhrases) {
    if (lowerText.includes(phrase)) return 'doctor';
  }

  for (const phrase of patientPhrases) {
    if (lowerText.includes(phrase)) return 'patient';
  }

  return 'unknown';
}
```

---

## Real-time Transcription Flow

### MVP Flow (Post-Recording)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MVP: Post-Recording Transcription                      │
└──────────────────────────────────────────────────────────────────────────┘

Timeline:
═════════════════════════════════════════════════════════════════════════

Recording Phase                    │ Processing Phase
                                   │
[Start] ─────────────────── [Stop] │ [Upload] ── [Transcribe] ── [Display]
│                              │   │    │             │             │
│  Consultation in progress    │   │    │   Backend   │   Whisper   │
│  (5-60 minutes)              │   │    │   receives  │   API call  │
│                              │   │    │   audio     │   (30-90s)  │
└──────────────────────────────┘   │    └─────────────┴─────────────┘

User Experience:
1. Doctor clicks "Start Recording"
2. Recording continues during consultation
3. Doctor clicks "Stop Recording"
4. "Uploading..." progress shown (2-10 seconds)
5. "Transcribing..." spinner shown (30-90 seconds)
6. Transcript appears in panel
```

### Real-time Flow (Future Enhancement)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Future: Real-time Transcription                        │
└──────────────────────────────────────────────────────────────────────────┘

Timeline:
═════════════════════════════════════════════════════════════════════════

0s        30s        60s        90s        120s       150s
│─────────│─────────│─────────│─────────│─────────│─────────│
  Chunk 1   Chunk 2   Chunk 3   Chunk 4   Chunk 5   Chunk 6
     │         │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼         ▼
  Upload   Upload    Upload    Upload    Upload    Upload
     │         │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼         ▼
 Transcribe Transcribe Transcribe Transcribe Transcribe Transcribe
     │         │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼         ▼
  Display  Display   Display   Display   Display   Display
     │         │         │         │         │         │
     └─────────┴─────────┴─────────┴─────────┴─────────┘
                         │
                         ▼
               Merged Transcript
              (Updated in real-time)
```

### Streaming Implementation (Future)

```typescript
interface StreamingTranscriptionConfig {
  chunkDuration: number;      // 30000 ms
  maxConcurrentChunks: number; // 2
  mergeStrategy: 'append' | 'overlap';
}

interface ChunkTranscriptionResult {
  chunkIndex: number;
  text: string;
  segments: ProcessedSegment[];
  isPartial: boolean;
}

class StreamingTranscriptionService {
  private config: StreamingTranscriptionConfig;
  private transcriptionQueue: ChunkTranscriptionResult[] = [];
  private isProcessing = false;

  constructor(config: Partial<StreamingTranscriptionConfig> = {}) {
    this.config = {
      chunkDuration: 30000,
      maxConcurrentChunks: 2,
      mergeStrategy: 'overlap',
      ...config,
    };
  }

  async processChunk(
    chunk: AudioChunk,
    onResult: (result: ChunkTranscriptionResult) => void
  ): Promise<void> {
    try {
      const result = await transcribeAudio({
        audioBuffer: Buffer.from(await chunk.data.arrayBuffer()),
        mimeType: chunk.data.type,
        language: 'en',
        appointmentId: `chunk-${chunk.chunkIndex}`,
      });

      if (result.success) {
        const chunkResult: ChunkTranscriptionResult = {
          chunkIndex: chunk.chunkIndex,
          text: result.transcript,
          segments: result.segments,
          isPartial: false,
        };

        this.transcriptionQueue.push(chunkResult);
        onResult(chunkResult);
      }
    } catch (error) {
      console.error(`Failed to process chunk ${chunk.chunkIndex}:`, error);
    }
  }

  getMergedTranscript(): string {
    const sorted = [...this.transcriptionQueue].sort(
      (a, b) => a.chunkIndex - b.chunkIndex
    );

    if (this.config.mergeStrategy === 'append') {
      return sorted.map(r => r.text).join(' ');
    }

    // Overlap merging
    return this.mergeWithOverlap(sorted);
  }

  private mergeWithOverlap(results: ChunkTranscriptionResult[]): string {
    if (results.length === 0) return '';
    if (results.length === 1) return results[0].text;

    let merged = results[0].text;

    for (let i = 1; i < results.length; i++) {
      const current = results[i].text;
      const overlapPoint = this.findOverlapPoint(merged, current);

      if (overlapPoint > 0) {
        merged += current.slice(overlapPoint);
      } else {
        merged += ' ' + current;
      }
    }

    return merged.trim();
  }

  private findOverlapPoint(previous: string, current: string): number {
    // Find last 5-10 words of previous and search in current
    const words = previous.trim().split(/\s+/);
    const searchWords = words.slice(-8);

    for (let len = searchWords.length; len >= 3; len--) {
      const searchPhrase = searchWords.slice(-len).join(' ').toLowerCase();
      const index = current.toLowerCase().indexOf(searchPhrase);

      if (index !== -1) {
        return index + searchPhrase.length;
      }
    }

    return 0;
  }
}
```

---

## Queue Management

### Request Queue Implementation

```typescript
import PQueue from 'p-queue';

interface QueuedTranscription {
  id: string;
  appointmentId: string;
  audioBuffer: Buffer;
  mimeType: string;
  priority: number;
  addedAt: Date;
}

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

class TranscriptionQueue {
  private queue: PQueue;
  private status: QueueStatus = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  constructor() {
    this.queue = new PQueue({
      concurrency: 2,        // Max 2 concurrent transcriptions
      interval: 1000,        // Rate limit window
      intervalCap: 3,        // Max 3 requests per second
      timeout: 180000,       // 3 minute timeout
    });
  }

  async add(
    request: QueuedTranscription,
    onProgress?: (status: string) => void
  ): Promise<TranscriptionResult> {
    this.status.pending++;

    return this.queue.add(async () => {
      this.status.pending--;
      this.status.processing++;

      onProgress?.('Processing transcription...');

      try {
        const result = await transcribeAudio({
          audioBuffer: request.audioBuffer,
          mimeType: request.mimeType,
          language: 'en',
          appointmentId: request.appointmentId,
        });

        if (result.success) {
          this.status.completed++;
        } else {
          this.status.failed++;
        }

        return result;
      } catch (error) {
        this.status.failed++;
        throw error;
      } finally {
        this.status.processing--;
      }
    });
  }

  getStatus(): QueueStatus {
    return { ...this.status };
  }

  async pause(): Promise<void> {
    this.queue.pause();
  }

  async resume(): Promise<void> {
    this.queue.start();
  }

  async clear(): Promise<void> {
    this.queue.clear();
    this.status = { pending: 0, processing: 0, completed: 0, failed: 0 };
  }
}
```

### Concurrent Processing Limits

| Tier | Concurrent Requests | Rate Limit | Use Case |
|------|-------------------|------------|----------|
| MVP | 2 | 3 req/sec | Single doctor |
| Growth | 5 | 10 req/sec | Small clinic |
| Scale | 10 | 20 req/sec | Large practice |

---

## Retry Logic

### Exponential Backoff Implementation

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryableStatuses } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof OpenAI.APIError) {
        if (!retryableStatuses.includes(error.status || 0)) {
          throw error; // Not retryable, throw immediately
        }
      }

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff + jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = Math.min(exponentialDelay + jitter, maxDelay);

        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
async function transcribeWithRetry(
  params: TranscribeAudioParams
): Promise<TranscriptionResult> {
  return withRetry(
    () => transcribeAudio(params),
    { maxRetries: 2, baseDelay: 2000 }
  );
}
```

### Retry Decision Matrix

| Error Code | Status | Retryable | Action |
|------------|--------|-----------|--------|
| 400 | Bad Request | No | Return error to user |
| 401 | Unauthorized | No | Check API key |
| 429 | Rate Limited | Yes | Wait and retry |
| 500 | Server Error | Yes | Retry with backoff |
| 502 | Bad Gateway | Yes | Retry with backoff |
| 503 | Unavailable | Yes | Retry with backoff |
| Timeout | - | Yes | Retry once |
| Network Error | - | Yes | Retry with backoff |

---

## Cost Tracking

### Usage Metrics

```typescript
interface TranscriptionUsage {
  appointmentId: string;
  audioDuration: number;      // seconds
  processingTime: number;     // milliseconds
  audioSize: number;          // bytes
  cost: number;               // estimated USD
  timestamp: Date;
  success: boolean;
}

interface DailyUsage {
  date: string;
  totalMinutes: number;
  totalRequests: number;
  totalCost: number;
  successRate: number;
}

function calculateTranscriptionCost(audioDurationSeconds: number): number {
  // Whisper API: $0.006 per minute
  const COST_PER_MINUTE = 0.006;
  const minutes = audioDurationSeconds / 60;
  return Number((minutes * COST_PER_MINUTE).toFixed(4));
}

async function logTranscriptionUsage(
  usage: TranscriptionUsage
): Promise<void> {
  // Log to application logger
  logger.info('Transcription usage', {
    appointmentId: usage.appointmentId,
    duration: usage.audioDuration,
    cost: usage.cost,
    success: usage.success,
  });

  // Store in database for reporting
  await db.transcriptionUsage.create({
    data: usage,
  });
}

async function getDailyUsage(date: Date): Promise<DailyUsage> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const usages = await db.transcriptionUsage.findMany({
    where: {
      timestamp: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const totalMinutes = usages.reduce(
    (sum, u) => sum + u.audioDuration / 60,
    0
  );
  const successfulRequests = usages.filter(u => u.success).length;

  return {
    date: date.toISOString().split('T')[0],
    totalMinutes: Math.round(totalMinutes * 100) / 100,
    totalRequests: usages.length,
    totalCost: usages.reduce((sum, u) => sum + u.cost, 0),
    successRate: usages.length > 0 ? successfulRequests / usages.length : 0,
  };
}
```

### Cost Estimates

| Recording Length | Processing Time | Estimated Cost |
|-----------------|-----------------|----------------|
| 5 minutes | ~15 seconds | $0.03 |
| 15 minutes | ~30 seconds | $0.09 |
| 30 minutes | ~45 seconds | $0.18 |
| 60 minutes | ~90 seconds | $0.36 |

---

## API Routes

### Express Route Implementation

```typescript
import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    if (allowedTypes.some(type => file.mimetype.includes(type))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  },
});

// POST /api/appointments/:id/transcribe
router.post(
  '/appointments/:id/transcribe',
  authMiddleware,
  upload.single('audio'),
  async (req, res) => {
    const { id: appointmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AUDIO', message: 'No audio file provided' },
      });
    }

    try {
      // Verify appointment ownership
      const appointment = await appointmentService.getById(appointmentId);
      if (!appointment || appointment.doctorId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found' },
        });
      }

      // Process transcription
      const result = await transcribeWithRetry({
        audioBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        language: req.body.language || 'en',
        appointmentId,
      });

      if (!result.success) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'TRANSCRIPTION_FAILED',
            message: result.error,
            retryable: true,
          },
        });
      }

      // Save transcript to database
      const transcript = await transcriptService.create({
        appointmentId,
        text: result.transcript,
        segments: result.segments,
        audioDuration: result.duration,
        language: result.language,
      });

      // Log usage
      await logTranscriptionUsage({
        appointmentId,
        audioDuration: result.duration,
        processingTime: result.processingTime,
        audioSize: req.file.size,
        cost: calculateTranscriptionCost(result.duration),
        timestamp: new Date(),
        success: true,
      });

      return res.json({
        success: true,
        data: {
          transcriptId: transcript.id,
          text: transcript.text,
          segments: transcript.segments,
          duration: transcript.audioDuration,
        },
      });
    } catch (error) {
      logger.error('Transcription error', { error, appointmentId });

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during transcription',
          retryable: true,
        },
      });
    }
  }
);

// GET /api/appointments/:id/transcript
router.get(
  '/appointments/:id/transcript',
  authMiddleware,
  async (req, res) => {
    const { id: appointmentId } = req.params;

    const transcript = await transcriptService.getByAppointmentId(appointmentId);

    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No transcript found' },
      });
    }

    return res.json({
      success: true,
      data: transcript,
    });
  }
);

export default router;
```

---

## Frontend Integration

### React Hook for Transcription

```typescript
interface UseTranscriptionReturn {
  transcript: string | null;
  segments: ProcessedSegment[];
  isTranscribing: boolean;
  error: string | null;
  progress: number;
  transcribe: (audioBlob: Blob) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
}

function useTranscription(appointmentId: string): UseTranscriptionReturn {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [segments, setSegments] = useState<ProcessedSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);

  const transcribe = useCallback(async (audioBlob: Blob) => {
    setLastAudioBlob(audioBlob);
    setIsTranscribing(true);
    setError(null);
    setProgress(10);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      setProgress(30);

      const response = await fetch(
        `/api/appointments/${appointmentId}/transcribe`,
        {
          method: 'POST',
          body: formData,
        }
      );

      setProgress(70);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      setProgress(100);
      setTranscript(result.data.text);
      setSegments(result.data.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  }, [appointmentId]);

  const retry = useCallback(async () => {
    if (lastAudioBlob) {
      await transcribe(lastAudioBlob);
    }
  }, [lastAudioBlob, transcribe]);

  const clear = useCallback(() => {
    setTranscript(null);
    setSegments([]);
    setError(null);
    setProgress(0);
  }, []);

  return {
    transcript,
    segments,
    isTranscribing,
    error,
    progress,
    transcribe,
    retry,
    clear,
  };
}
```

---

## References

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/api-reference/audio)
- [OpenAI Audio Transcriptions](https://platform.openai.com/docs/guides/speech-to-text)
- [Audio Capture Specification](./audio-capture.md)
- [US-006: AI Transcription Recording](../stories/cards/US-006-ai-transcription.md)
- [Integration Architecture](../architecture/integrations.md)
