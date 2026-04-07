# Prompt 26: Integrate Node.js Backend with Python AI Service

## Objective
Create the integration layer between the existing Node.js backend and the new Python AI service, enabling both **batch processing** and **real-time streaming** modes for transcription, extraction, and RAG operations.

## Context
The existing MedRecord application has:
- React frontend for user interface
- Node.js/Express backend for business logic and database
- PostgreSQL for data persistence

The new Python AI service (Prompts 14-25) handles:
- **Real-Time Streaming Mode** (PRIMARY): Event-driven WebSocket pipeline with incremental transcription, speaker diarization, entity extraction, and validation alerts
- **Batch Processing Mode** (LEGACY): Traditional upload → process → results pattern
- RAG queries (ChromaDB + GPT-4)

This prompt creates the bridge between these systems with **dual-mode support**:

### Real-Time Streaming Architecture (Priority)
```
React Frontend (Prompt 27)
    ↓ WebSocket connection to /ws/session/:sessionId
Node.js Backend (THIS PROMPT) - WebSocket Gateway/Proxy
    ↓ Proxy WebSocket connection to Python /ws/session/:sessionId
    ↓ Store events in PostgreSQL for history/playback
Python AI Service (Prompt 25) - Event-Driven Pipeline
    ↓ Emit 8+ event types: transcript_update, speaker_changed,
      extraction_update, validation_alert, entity_validated,
      cost_update, session_complete, error
```

### Key Features
- **WebSocket Gateway**: Bidirectional proxy between React and Python
- **Event Persistence**: Store all real-time events in PostgreSQL
- **Session Management**: Proxy Python session endpoints + add DB persistence
- **Type Safety**: TypeScript interfaces matching OpenAPI spec (Prompt 24)
- **Binary Audio Streaming**: Forward Opus codec audio chunks (~20ms frames)
- **Performance**: <2s end-to-end latency, CRITICAL alerts <1s

## Real-Time Event Types (from Prompt 25)

The Python AI service emits 8+ WebSocket event types. Node.js must:
1. Forward events to React frontend
2. Persist events to PostgreSQL for history/playback
3. Handle event-specific business logic (e.g., store alerts in DB)

### Event Type Reference
```typescript
// Base event structure
interface BaseEvent {
  event: string;
  session_id: string;
  timestamp: string; // ISO 8601
}

// 1. Transcript Update Event
interface WSTranscriptUpdateEvent extends BaseEvent {
  event: 'transcript_update';
  data: {
    chunk_index: number;
    text: string;
    is_final: boolean;
    language: string;
    confidence: number;
  };
}

// 2. Speaker Change Event
interface WSSpeakerChangedEvent extends BaseEvent {
  event: 'speaker_changed';
  data: {
    speaker_id: string;
    role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
    confidence: number;
    start_time: number; // seconds
  };
}

// 3. Extraction Update Event
interface WSExtractionUpdateEvent extends BaseEvent {
  event: 'extraction_update';
  data: {
    entity_type: 'symptom' | 'diagnosis' | 'prescription' | 'vital_sign' | 'allergy' | 'procedure';
    entity: {
      id: string;
      content: string;
      confidence: number;
      speaker?: string;
      timestamp: number;
      metadata?: Record<string, any>;
    };
    chunk_index: number;
  };
}

// 4. Validation Alert Event
interface WSValidationAlertEvent extends BaseEvent {
  event: 'validation_alert';
  data: {
    alert_id: string;
    type: 'drug_interaction' | 'allergy_conflict' | 'dosage_error' | 'contraindication' | 'missing_info';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    related_entities: string[]; // entity IDs
    recommended_action?: string;
    requires_immediate_attention: boolean;
  };
}

// 5. Entity Validated Event
interface WSEntityValidatedEvent extends BaseEvent {
  event: 'entity_validated';
  data: {
    entity_id: string;
    entity_type: string;
    validation_status: 'approved' | 'flagged' | 'needs_review';
    confidence_score: number;
    validation_notes?: string;
  };
}

// 6. Cost Update Event
interface WSCostUpdateEvent extends BaseEvent {
  event: 'cost_update';
  data: {
    transcription_cost_usd: number;
    extraction_cost_usd: number;
    total_cost_usd: number;
    chunks_processed: number;
    cache_hit_rate: number;
  };
}

// 7. Session Complete Event
interface WSSessionCompleteEvent extends BaseEvent {
  event: 'session_complete';
  data: {
    status: 'success' | 'partial' | 'failed';
    final_transcript: string;
    total_chunks: number;
    total_entities: number;
    total_alerts: number;
    processing_time_ms: number;
    final_cost_summary: {
      transcription_cost_usd: number;
      extraction_cost_usd: number;
      total_cost_usd: number;
      audio_duration_seconds: number;
    };
  };
}

// 8. Error Event
interface WSErrorEvent extends BaseEvent {
  event: 'error';
  data: {
    error_code: string;
    message: string;
    details?: Record<string, any>;
    recoverable: boolean;
  };
}

type WebSocketEvent =
  | WSTranscriptUpdateEvent
  | WSSpeakerChangedEvent
  | WSExtractionUpdateEvent
  | WSValidationAlertEvent
  | WSEntityValidatedEvent
  | WSCostUpdateEvent
  | WSSessionCompleteEvent
  | WSErrorEvent;
```

## Database Schema for Real-Time Events

Add to your existing PostgreSQL schema:

```sql
-- Sessions table (replaces/extends consultations for real-time mode)
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL, -- Python AI service session ID
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  appointment_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, cancelled
  websocket_url TEXT, -- WebSocket URL for this session
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  final_transcript TEXT,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0.0,
  audio_duration_seconds INTEGER DEFAULT 0,
  INDEX idx_session_id (session_id),
  INDEX idx_consultation_id (consultation_id),
  INDEX idx_status (status)
);

-- Transcription events (transcript_update, speaker_changed)
CREATE TABLE transcription_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'transcript_update', 'speaker_changed'
  chunk_index INTEGER,
  text TEXT,
  speaker_id VARCHAR(50),
  speaker_role VARCHAR(20), -- DOCTOR, PATIENT, UNKNOWN
  confidence DECIMAL(5, 4),
  start_time DECIMAL(10, 3), -- seconds
  is_final BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB, -- Full event payload
  INDEX idx_session_events (session_id, timestamp),
  INDEX idx_chunk_index (session_id, chunk_index)
);

-- Extraction events (extraction_update, entity_validated)
CREATE TABLE extraction_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'extraction_update', 'entity_validated'
  entity_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50), -- symptom, diagnosis, prescription, etc.
  content TEXT,
  confidence DECIMAL(5, 4),
  validation_status VARCHAR(50), -- approved, flagged, needs_review
  chunk_index INTEGER,
  speaker VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB, -- Full event payload
  INDEX idx_session_entities (session_id, entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_timestamp (session_id, timestamp)
);

-- Validation alerts (validation_alert)
CREATE TABLE validation_alerts (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  alert_id VARCHAR(255) UNIQUE NOT NULL,
  alert_type VARCHAR(100) NOT NULL, -- drug_interaction, allergy_conflict, etc.
  severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
  message TEXT NOT NULL,
  related_entities JSONB, -- Array of entity IDs
  recommended_action TEXT,
  requires_immediate_attention BOOLEAN DEFAULT false,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB, -- Full event payload
  INDEX idx_session_alerts (session_id, severity),
  INDEX idx_alert_id (alert_id),
  INDEX idx_critical_alerts (session_id, severity, acknowledged)
    WHERE severity = 'CRITICAL' AND acknowledged = false
);

-- Cost tracking events (cost_update)
CREATE TABLE cost_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  transcription_cost_usd DECIMAL(10, 6),
  extraction_cost_usd DECIMAL(10, 6),
  total_cost_usd DECIMAL(10, 6),
  chunks_processed INTEGER,
  cache_hit_rate DECIMAL(5, 4),
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB,
  INDEX idx_session_costs (session_id, timestamp)
);
```

## Tasks

### 1. Create AI Service Client in Node.js
Create `backend/src/services/aiService.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';

interface TranscriptionRequest {
  sessionId: string;
  patientId: string;
  appointmentType: string;
  language?: string;
}

interface TranscriptionResult {
  sessionId: string;
  transcript: string;
  diarizedTranscript: Array<{
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  extraction: MedicalExtraction;
  costSummary: CostSummary;
}

interface MedicalExtraction {
  symptoms: Array<{
    description: string;
    duration?: string;
    severity?: string;
  }>;
  diagnoses: Array<{
    name: string;
    icd10Code?: string;
    confidence: number;
  }>;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

interface CostSummary {
  transcriptionCostUsd: number;
  extractionCostUsd: number;
  totalCostUsd: number;
  audioDurationSeconds: number;
}

interface RAGQueryRequest {
  query: string;
  sessionId?: string;
  contextFilter?: Record<string, any>;
  maxTokens?: number;
}

interface RAGQueryResponse {
  response: string;
  sources: Array<{
    documentId: string;
    chunkText: string;
    similarityScore: number;
  }>;
  tokensUsed: number;
  latencyMs: number;
}

interface IngestRequest {
  documents: Array<{
    content: string;
    metadata: Record<string, any>;
  }>;
  sourceType: 'text' | 'pdf' | 'url';
}

interface IngestResponse {
  status: 'success' | 'partial' | 'failed';
  indexedDocs: number;
  errors?: string[];
}

export class AIServiceClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minutes for long transcriptions
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleError(error)
    );
  }

  async authenticate(username: string, password: string): Promise<void> {
    const response = await this.client.post('/auth/token', {
      username,
      password,
    });
    this.token = response.data.access_token;
    logger.info('AI Service authenticated');
  }

  setToken(token: string): void {
    this.token = token;
  }

  // Transcription endpoints
  async createTranscriptionSession(
    request: TranscriptionRequest
  ): Promise<{ sessionId: string }> {
    const response = await this.client.post(
      '/api/v1/transcription/sessions',
      {
        patient_id: request.patientId,
        appointment_type: request.appointmentType,
        language: request.language || 'es',
      }
    );
    return { sessionId: response.data.session_id };
  }

  async uploadAudio(
    sessionId: string,
    audioBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer]), filename);
    formData.append('is_final', 'true');

    await this.client.post(
      `/api/v1/transcription/sessions/${sessionId}/audio`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  }

  async finalizeTranscription(
    sessionId: string
  ): Promise<TranscriptionResult> {
    const response = await this.client.post(
      `/api/v1/transcription/sessions/${sessionId}/finalize`
    );

    return this.mapTranscriptionResult(response.data);
  }

  async getTranscriptionStatus(
    sessionId: string
  ): Promise<{ status: string; progress?: number }> {
    const response = await this.client.get(
      `/api/v1/transcription/sessions/${sessionId}/status`
    );
    return response.data;
  }

  // Session Management endpoints (Real-Time Streaming)
  async createSession(request: {
    patientId: string;
    appointmentType: string;
    language?: string;
  }): Promise<{
    sessionId: string;
    websocketUrl: string;
    status: string;
  }> {
    const response = await this.client.post('/api/v1/sessions', {
      patient_id: request.patientId,
      appointment_type: request.appointmentType,
      language: request.language || 'es',
    });

    return {
      sessionId: response.data.session_id,
      websocketUrl: response.data.websocket_url,
      status: response.data.status,
    };
  }

  async getSession(sessionId: string): Promise<{
    sessionId: string;
    status: string;
    createdAt: string;
    websocketUrl?: string;
  }> {
    const response = await this.client.get(`/api/v1/sessions/${sessionId}`);
    return {
      sessionId: response.data.session_id,
      status: response.data.status,
      createdAt: response.data.created_at,
      websocketUrl: response.data.websocket_url,
    };
  }

  async finalizeSession(sessionId: string): Promise<{
    status: string;
    finalTranscript?: string;
    totalEntities?: number;
    totalAlerts?: number;
    costSummary?: {
      transcriptionCostUsd: number;
      extractionCostUsd: number;
      totalCostUsd: number;
      audioDurationSeconds: number;
    };
  }> {
    const response = await this.client.post(
      `/api/v1/sessions/${sessionId}/finalize`
    );
    return {
      status: response.data.status,
      finalTranscript: response.data.final_transcript,
      totalEntities: response.data.total_entities,
      totalAlerts: response.data.total_alerts,
      costSummary: response.data.cost_summary
        ? {
            transcriptionCostUsd: response.data.cost_summary.transcription_cost_usd,
            extractionCostUsd: response.data.cost_summary.extraction_cost_usd,
            totalCostUsd: response.data.cost_summary.total_cost_usd,
            audioDurationSeconds: response.data.cost_summary.audio_duration_seconds,
          }
        : undefined,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`/api/v1/sessions/${sessionId}`);
  }

  // RAG endpoints (BSG required)
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    const response = await this.client.post('/api/v1/query', {
      query: request.query,
      session_id: request.sessionId,
      context_filter: request.contextFilter,
      max_tokens: request.maxTokens,
    });

    return {
      response: response.data.response,
      sources: response.data.sources,
      tokensUsed: response.data.tokens_used,
      latencyMs: response.data.latency_ms,
    };
  }

  async ingest(request: IngestRequest): Promise<IngestResponse> {
    const response = await this.client.post('/api/v1/ingest', {
      documents: request.documents,
      source_type: request.sourceType,
    });

    return {
      status: response.data.status,
      indexedDocs: response.data.indexed_docs,
      errors: response.data.errors,
    };
  }

  // Health check
  async checkHealth(): Promise<{
    status: string;
    components: Array<{ name: string; status: string }>;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Private helpers
  private mapTranscriptionResult(data: any): TranscriptionResult {
    return {
      sessionId: data.session_id,
      transcript: data.transcript,
      diarizedTranscript: data.diarized_transcript?.map((seg: any) => ({
        speaker: seg.speaker,
        text: seg.text,
        startTime: seg.start_time,
        endTime: seg.end_time,
      })) || [],
      extraction: {
        symptoms: data.extraction?.symptoms || [],
        diagnoses: data.extraction?.diagnoses || [],
        prescriptions: data.extraction?.prescriptions || [],
        soapNote: data.extraction?.soap_note || {},
      },
      costSummary: {
        transcriptionCostUsd: data.cost_summary?.transcription_cost_usd || 0,
        extractionCostUsd: data.cost_summary?.extraction_cost_usd || 0,
        totalCostUsd: data.cost_summary?.total_cost_usd || 0,
        audioDurationSeconds: data.cost_summary?.audio_duration_seconds || 0,
      },
    };
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as any)?.detail || error.message;

      logger.error('AI Service error', {
        status,
        message,
        url: error.config?.url,
      });

      if (status === 401) {
        throw new Error('AI Service authentication failed');
      } else if (status === 422) {
        throw new Error(`Validation error: ${message}`);
      } else if (status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (status >= 500) {
        throw new Error('AI Service unavailable');
      }
    }

    throw new Error(`AI Service request failed: ${error.message}`);
  }
}

// Singleton instance
export const aiService = new AIServiceClient();
```

### 2. Create Consultation Controller
Create `backend/src/controllers/consultationController.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';
import { consultationRepository } from '../repositories/consultationRepository';
import { logger } from '../utils/logger';

export class ConsultationController {
  /**
   * Start a new consultation with AI transcription
   */
  async startConsultation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { patientId, appointmentType } = req.body;
      const userId = req.user!.id;

      // Create consultation in database
      const consultation = await consultationRepository.create({
        patientId,
        doctorId: userId,
        appointmentType,
        status: 'in_progress',
      });

      // Create AI transcription session
      const { sessionId } = await aiService.createTranscriptionSession({
        sessionId: consultation.id,
        patientId,
        appointmentType,
        language: 'es',
      });

      // Update consultation with AI session
      await consultationRepository.update(consultation.id, {
        aiSessionId: sessionId,
      });

      logger.info('Consultation started', {
        consultationId: consultation.id,
        aiSessionId: sessionId,
      });

      res.status(201).json({
        consultationId: consultation.id,
        sessionId,
        message: 'Consulta iniciada. Puede comenzar la grabación.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload audio recording for transcription
   */
  async uploadRecording(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { consultationId } = req.params;
      const audioFile = req.file;

      if (!audioFile) {
        res.status(400).json({ error: 'No se proporcionó archivo de audio' });
        return;
      }

      // Get consultation
      const consultation = await consultationRepository.findById(consultationId);
      if (!consultation) {
        res.status(404).json({ error: 'Consulta no encontrada' });
        return;
      }

      // Upload to AI service
      await aiService.uploadAudio(
        consultation.aiSessionId!,
        audioFile.buffer,
        audioFile.originalname
      );

      logger.info('Audio uploaded', {
        consultationId,
        filename: audioFile.originalname,
        size: audioFile.size,
      });

      res.json({ message: 'Audio subido correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Finalize consultation and get results
   */
  async finalizeConsultation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { consultationId } = req.params;

      const consultation = await consultationRepository.findById(consultationId);
      if (!consultation) {
        res.status(404).json({ error: 'Consulta no encontrada' });
        return;
      }

      // Finalize AI transcription
      const result = await aiService.finalizeTranscription(
        consultation.aiSessionId!
      );

      // Save results to database
      await consultationRepository.update(consultationId, {
        status: 'completed',
        transcript: result.transcript,
        diarizedTranscript: JSON.stringify(result.diarizedTranscript),
        extraction: JSON.stringify(result.extraction),
        soapNote: result.extraction.soapNote,
        costUsd: result.costSummary.totalCostUsd,
        audioDurationSeconds: result.costSummary.audioDurationSeconds,
        completedAt: new Date(),
      });

      logger.info('Consultation finalized', {
        consultationId,
        costUsd: result.costSummary.totalCostUsd,
      });

      res.json({
        consultationId,
        transcript: result.transcript,
        diarizedTranscript: result.diarizedTranscript,
        extraction: result.extraction,
        soapNote: result.extraction.soapNote,
        costSummary: result.costSummary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Query medical knowledge base
   */
  async queryKnowledgeBase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, consultationId } = req.body;

      const result = await aiService.query({
        query,
        sessionId: consultationId,
      });

      logger.info('RAG query executed', {
        queryLength: query.length,
        tokensUsed: result.tokensUsed,
        sourcesCount: result.sources.length,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get consultation status
   */
  async getStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { consultationId } = req.params;

      const consultation = await consultationRepository.findById(consultationId);
      if (!consultation) {
        res.status(404).json({ error: 'Consulta no encontrada' });
        return;
      }

      let aiStatus = null;
      if (consultation.aiSessionId) {
        aiStatus = await aiService.getTranscriptionStatus(
          consultation.aiSessionId
        );
      }

      res.json({
        consultationId,
        status: consultation.status,
        aiStatus,
        createdAt: consultation.createdAt,
        completedAt: consultation.completedAt,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const consultationController = new ConsultationController();
```

### 3. Create API Routes
Create `backend/src/routes/consultation.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import { consultationController } from '../controllers/consultationController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { startConsultationSchema, querySchema } from '../schemas/consultation';

const router = Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de audio no soportado'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// Consultation routes
router.post(
  '/',
  validateRequest(startConsultationSchema),
  consultationController.startConsultation
);

router.post(
  '/:consultationId/audio',
  upload.single('audio'),
  consultationController.uploadRecording
);

router.post(
  '/:consultationId/finalize',
  consultationController.finalizeConsultation
);

router.get(
  '/:consultationId/status',
  consultationController.getStatus
);

// RAG query route
router.post(
  '/query',
  validateRequest(querySchema),
  consultationController.queryKnowledgeBase
);

export default router;
```

### 4. Create WebSocket Gateway for Real-Time Streaming
Create `backend/src/services/websocketGateway.ts`:

```typescript
import WebSocket from 'ws';
import { Server } from 'http';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { eventPersistence } from './eventPersistence';
import type {
  WebSocketEvent,
  WSTranscriptUpdateEvent,
  WSSpeakerChangedEvent,
  WSExtractionUpdateEvent,
  WSValidationAlertEvent,
  WSEntityValidatedEvent,
  WSCostUpdateEvent,
  WSSessionCompleteEvent,
  WSErrorEvent,
} from '../types/websocketEvents';

interface ConnectionContext {
  sessionId: string;
  userId: string;
  clientWs: WebSocket;
  aiWs: WebSocket;
}

export function setupWebSocketGateway(server: Server): void {
  const wss = new WebSocket.Server({ server, path: '/ws/session' });

  wss.on('connection', async (clientWs, req) => {
    let context: Partial<ConnectionContext> = {};

    try {
      // Extract session ID and token from URL pattern: /ws/session/:sessionId?token=...
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const pathParts = url.pathname.split('/');
      const sessionId = pathParts[pathParts.length - 1];
      const token = url.searchParams.get('token');

      if (!token || !sessionId) {
        clientWs.close(4001, 'Missing token or session ID');
        return;
      }

      // Verify token
      const user = await verifyToken(token);
      if (!user) {
        clientWs.close(4001, 'Invalid token');
        return;
      }

      // Connect to Python AI service WebSocket
      const aiServiceWsUrl = process.env.AI_SERVICE_WS_URL || 'ws://localhost:8000';
      const aiWsUrl = `${aiServiceWsUrl}/ws/session/${sessionId}`;
      const aiWs = new WebSocket(aiWsUrl);

      context = { sessionId, userId: user.id, clientWs, aiWs };

      logger.info('WebSocket gateway connection established', {
        sessionId,
        userId: user.id,
      });

      // Handle AI service connection open
      aiWs.on('open', () => {
        logger.info('Connected to Python AI service WebSocket', { sessionId });
      });

      // Forward binary audio from client to AI service (client → Python)
      clientWs.on('message', (data) => {
        if (aiWs.readyState === WebSocket.OPEN) {
          // Forward binary audio chunks or control messages
          if (Buffer.isBuffer(data)) {
            aiWs.send(data); // Binary audio (Opus codec)
          } else {
            // JSON control messages (start, stop, etc.)
            aiWs.send(data);
          }
        }
      });

      // Process events from AI service and forward to client (Python → client)
      aiWs.on('message', async (data) => {
        try {
          const message = data.toString();
          const event: WebSocketEvent = JSON.parse(message);

          // Persist event to PostgreSQL
          await persistEvent(sessionId, event);

          // Forward to client
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(message);
          }

          // Log important events
          logEvent(sessionId, event);
        } catch (error) {
          logger.error('Error processing WebSocket event', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle AI service connection close
      aiWs.on('close', (code, reason) => {
        logger.info('AI WebSocket closed', {
          sessionId,
          code,
          reason: reason.toString(),
        });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(code, reason.toString());
        }
      });

      // Handle client connection close
      clientWs.on('close', () => {
        logger.info('Client WebSocket closed', { sessionId });
        if (aiWs.readyState === WebSocket.OPEN) {
          aiWs.close();
        }
      });

      // Handle errors
      aiWs.on('error', (error) => {
        logger.error('AI WebSocket error', {
          sessionId,
          error: error.message,
        });
        clientWs.close(4500, 'AI service error');
      });

      clientWs.on('error', (error) => {
        logger.error('Client WebSocket error', {
          sessionId,
          error: error.message,
        });
        aiWs.close();
      });
    } catch (error) {
      logger.error('WebSocket connection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      clientWs.close(4500, 'Connection error');
    }
  });

  logger.info('WebSocket gateway initialized on /ws/session/:sessionId');
}

/**
 * Persist WebSocket events to PostgreSQL
 */
async function persistEvent(
  sessionId: string,
  event: WebSocketEvent
): Promise<void> {
  switch (event.event) {
    case 'transcript_update':
      await eventPersistence.saveTranscriptEvent(
        sessionId,
        event as WSTranscriptUpdateEvent
      );
      break;

    case 'speaker_changed':
      await eventPersistence.saveSpeakerChangeEvent(
        sessionId,
        event as WSSpeakerChangedEvent
      );
      break;

    case 'extraction_update':
      await eventPersistence.saveExtractionEvent(
        sessionId,
        event as WSExtractionUpdateEvent
      );
      break;

    case 'validation_alert':
      await eventPersistence.saveValidationAlert(
        sessionId,
        event as WSValidationAlertEvent
      );
      break;

    case 'entity_validated':
      await eventPersistence.saveEntityValidatedEvent(
        sessionId,
        event as WSEntityValidatedEvent
      );
      break;

    case 'cost_update':
      await eventPersistence.saveCostEvent(
        sessionId,
        event as WSCostUpdateEvent
      );
      break;

    case 'session_complete':
      await eventPersistence.saveSessionComplete(
        sessionId,
        event as WSSessionCompleteEvent
      );
      break;

    case 'error':
      await eventPersistence.saveErrorEvent(
        sessionId,
        event as WSErrorEvent
      );
      break;

    default:
      logger.warn('Unknown event type', {
        sessionId,
        eventType: (event as any).event,
      });
  }
}

/**
 * Log important events for monitoring
 */
function logEvent(sessionId: string, event: WebSocketEvent): void {
  switch (event.event) {
    case 'validation_alert':
      const alert = event as WSValidationAlertEvent;
      if (alert.data.severity === 'CRITICAL') {
        logger.warn('CRITICAL validation alert', {
          sessionId,
          alertType: alert.data.type,
          message: alert.data.message,
        });
      }
      break;

    case 'session_complete':
      const complete = event as WSSessionCompleteEvent;
      logger.info('Session completed', {
        sessionId,
        status: complete.data.status,
        totalCost: complete.data.final_cost_summary.total_cost_usd,
        duration: complete.data.final_cost_summary.audio_duration_seconds,
      });
      break;

    case 'error':
      const error = event as WSErrorEvent;
      logger.error('Session error', {
        sessionId,
        errorCode: error.data.error_code,
        message: error.data.message,
        recoverable: error.data.recoverable,
      });
      break;
  }
}
```

### 5. Create Event Persistence Service
Create `backend/src/services/eventPersistence.ts`:

```typescript
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import type {
  WSTranscriptUpdateEvent,
  WSSpeakerChangedEvent,
  WSExtractionUpdateEvent,
  WSValidationAlertEvent,
  WSEntityValidatedEvent,
  WSCostUpdateEvent,
  WSSessionCompleteEvent,
  WSErrorEvent,
} from '../types/websocketEvents';

export class EventPersistenceService {
  constructor(private db: Pool) {}

  async saveTranscriptEvent(
    sessionId: string,
    event: WSTranscriptUpdateEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO transcription_events
         (session_id, event_type, chunk_index, text, confidence, is_final, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           $2, $3, $4, $5, $6, $7
         )`,
        [
          sessionId,
          'transcript_update',
          event.data.chunk_index,
          event.data.text,
          event.data.confidence,
          event.data.is_final,
          JSON.stringify(event),
        ]
      );
    } catch (error) {
      logger.error('Error saving transcript event', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveSpeakerChangeEvent(
    sessionId: string,
    event: WSSpeakerChangedEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO transcription_events
         (session_id, event_type, speaker_id, speaker_role, confidence, start_time, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           $2, $3, $4, $5, $6, $7
         )`,
        [
          sessionId,
          'speaker_changed',
          event.data.speaker_id,
          event.data.role,
          event.data.confidence,
          event.data.start_time,
          JSON.stringify(event),
        ]
      );
    } catch (error) {
      logger.error('Error saving speaker change event', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveExtractionEvent(
    sessionId: string,
    event: WSExtractionUpdateEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO extraction_events
         (session_id, event_type, entity_id, entity_type, content, confidence, chunk_index, speaker, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          sessionId,
          'extraction_update',
          event.data.entity.id,
          event.data.entity_type,
          event.data.entity.content,
          event.data.entity.confidence,
          event.data.chunk_index,
          event.data.entity.speaker,
          JSON.stringify(event),
        ]
      );
    } catch (error) {
      logger.error('Error saving extraction event', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveValidationAlert(
    sessionId: string,
    event: WSValidationAlertEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO validation_alerts
         (session_id, alert_id, alert_type, severity, message, related_entities,
          recommended_action, requires_immediate_attention, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          sessionId,
          event.data.alert_id,
          event.data.type,
          event.data.severity,
          event.data.message,
          JSON.stringify(event.data.related_entities),
          event.data.recommended_action,
          event.data.requires_immediate_attention,
          JSON.stringify(event),
        ]
      );

      // Log CRITICAL alerts for immediate attention
      if (event.data.severity === 'CRITICAL') {
        logger.warn('CRITICAL validation alert persisted', {
          sessionId,
          alertId: event.data.alert_id,
          type: event.data.type,
          message: event.data.message,
        });
      }
    } catch (error) {
      logger.error('Error saving validation alert', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveEntityValidatedEvent(
    sessionId: string,
    event: WSEntityValidatedEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO extraction_events
         (session_id, event_type, entity_id, entity_type, validation_status, confidence, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           $2, $3, $4, $5, $6, $7
         )`,
        [
          sessionId,
          'entity_validated',
          event.data.entity_id,
          event.data.entity_type,
          event.data.validation_status,
          event.data.confidence_score,
          JSON.stringify(event),
        ]
      );
    } catch (error) {
      logger.error('Error saving entity validated event', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveCostEvent(
    sessionId: string,
    event: WSCostUpdateEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO cost_events
         (session_id, transcription_cost_usd, extraction_cost_usd, total_cost_usd,
          chunks_processed, cache_hit_rate, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           $2, $3, $4, $5, $6, $7
         )`,
        [
          sessionId,
          event.data.transcription_cost_usd,
          event.data.extraction_cost_usd,
          event.data.total_cost_usd,
          event.data.chunks_processed,
          event.data.cache_hit_rate,
          JSON.stringify(event),
        ]
      );

      // Update session total cost
      await this.db.query(
        `UPDATE ai_sessions
         SET total_cost_usd = $2
         WHERE session_id = $1`,
        [sessionId, event.data.total_cost_usd]
      );
    } catch (error) {
      logger.error('Error saving cost event', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveSessionComplete(
    sessionId: string,
    event: WSSessionCompleteEvent
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE ai_sessions
         SET status = $2,
             completed_at = NOW(),
             final_transcript = $3,
             total_cost_usd = $4,
             audio_duration_seconds = $5
         WHERE session_id = $1`,
        [
          sessionId,
          event.data.status,
          event.data.final_transcript,
          event.data.final_cost_summary.total_cost_usd,
          event.data.final_cost_summary.audio_duration_seconds,
        ]
      );

      logger.info('Session completed in database', {
        sessionId,
        status: event.data.status,
        totalCost: event.data.final_cost_summary.total_cost_usd,
      });
    } catch (error) {
      logger.error('Error saving session complete', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveErrorEvent(
    sessionId: string,
    event: WSErrorEvent
  ): Promise<void> {
    try {
      // Log error event as transcription event for history
      await this.db.query(
        `INSERT INTO transcription_events
         (session_id, event_type, text, event_data)
         VALUES (
           (SELECT id FROM ai_sessions WHERE session_id = $1),
           'error', $2, $3
         )`,
        [sessionId, event.data.message, JSON.stringify(event)]
      );

      // If error is not recoverable, mark session as failed
      if (!event.data.recoverable) {
        await this.db.query(
          `UPDATE ai_sessions
           SET status = 'failed'
           WHERE session_id = $1`,
          [sessionId]
        );
      }

      logger.error('Session error persisted', {
        sessionId,
        errorCode: event.data.error_code,
        message: event.data.message,
        recoverable: event.data.recoverable,
      });
    } catch (error) {
      logger.error('Error saving error event', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all events for a session (for playback/history)
   */
  async getSessionEvents(sessionId: string): Promise<{
    transcriptEvents: any[];
    extractionEvents: any[];
    validationAlerts: any[];
    costEvents: any[];
  }> {
    const sessionQuery = 'SELECT id FROM ai_sessions WHERE session_id = $1';
    const sessionResult = await this.db.query(sessionQuery, [sessionId]);

    if (sessionResult.rows.length === 0) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const dbSessionId = sessionResult.rows[0].id;

    const [transcriptEvents, extractionEvents, validationAlerts, costEvents] =
      await Promise.all([
        this.db.query(
          'SELECT * FROM transcription_events WHERE session_id = $1 ORDER BY timestamp ASC',
          [dbSessionId]
        ),
        this.db.query(
          'SELECT * FROM extraction_events WHERE session_id = $1 ORDER BY timestamp ASC',
          [dbSessionId]
        ),
        this.db.query(
          'SELECT * FROM validation_alerts WHERE session_id = $1 ORDER BY timestamp ASC',
          [dbSessionId]
        ),
        this.db.query(
          'SELECT * FROM cost_events WHERE session_id = $1 ORDER BY timestamp ASC',
          [dbSessionId]
        ),
      ]);

    return {
      transcriptEvents: transcriptEvents.rows,
      extractionEvents: extractionEvents.rows,
      validationAlerts: validationAlerts.rows,
      costEvents: costEvents.rows,
    };
  }
}

// Singleton instance
import { pool } from '../database';
export const eventPersistence = new EventPersistenceService(pool);
```

### 6. Update Consultation Controller for Real-Time Sessions
Update `backend/src/controllers/consultationController.ts` to add real-time session methods:

```typescript
// Add these methods to ConsultationController class

/**
 * Create real-time session (replaces startConsultation for streaming mode)
 */
async createRealtimeSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId, appointmentType, language } = req.body;
    const userId = req.user!.id;

    // Create consultation in database
    const consultation = await consultationRepository.create({
      patientId,
      doctorId: userId,
      appointmentType,
      status: 'in_progress',
    });

    // Create session in Python AI service
    const sessionData = await aiService.createSession({
      patientId,
      appointmentType,
      language: language || 'es',
    });

    // Store session in ai_sessions table
    await this.db.query(
      `INSERT INTO ai_sessions
       (consultation_id, session_id, patient_id, doctor_id, appointment_type, websocket_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        consultation.id,
        sessionData.sessionId,
        patientId,
        userId,
        appointmentType,
        sessionData.websocketUrl,
        'active',
      ]
    );

    logger.info('Real-time session created', {
      consultationId: consultation.id,
      sessionId: sessionData.sessionId,
    });

    res.status(201).json({
      consultationId: consultation.id,
      sessionId: sessionData.sessionId,
      websocketUrl: `/ws/session/${sessionData.sessionId}`, // Node.js WebSocket gateway URL
      status: sessionData.status,
      message: 'Sesión creada. Conecte al WebSocket para comenzar.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Finalize real-time session
 */
async finalizeRealtimeSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Finalize session in Python AI service
    const result = await aiService.finalizeSession(sessionId);

    // Get all events from database
    const events = await eventPersistence.getSessionEvents(sessionId);

    logger.info('Real-time session finalized', {
      sessionId,
      totalCost: result.costSummary?.totalCostUsd,
    });

    res.json({
      sessionId,
      status: result.status,
      finalTranscript: result.finalTranscript,
      totalEntities: result.totalEntities,
      totalAlerts: result.totalAlerts,
      costSummary: result.costSummary,
      events, // Return all events for final processing
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get session events (for playback/history)
 */
async getSessionEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    const events = await eventPersistence.getSessionEvents(sessionId);

    res.json(events);
  } catch (error) {
    next(error);
  }
}

/**
 * Acknowledge validation alert
 */
async acknowledgeAlert(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { alertId } = req.params;
    const userId = req.user!.id;

    await this.db.query(
      `UPDATE validation_alerts
       SET acknowledged = true,
           acknowledged_by = $2,
           acknowledged_at = NOW()
       WHERE alert_id = $1`,
      [alertId, userId]
    );

    logger.info('Validation alert acknowledged', { alertId, userId });

    res.json({ message: 'Alert acknowledged successfully' });
  } catch (error) {
    next(error);
  }
}
```

### 7. Update Environment Configuration
Add to `backend/.env.example`:

```env
# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_WS_URL=ws://localhost:8000
AI_SERVICE_USERNAME=backend_service
AI_SERVICE_PASSWORD=secure_password

# For production, use internal network URLs
# AI_SERVICE_URL=http://ai-service:8000
# AI_SERVICE_WS_URL=ws://ai-service:8000
```

### 8. Create TypeScript Type Definitions
Create `backend/src/types/websocketEvents.ts`:

```typescript
/**
 * WebSocket Event Type Definitions
 * These match the OpenAPI spec from Prompt 24
 */

// Base event structure
export interface BaseEvent {
  event: string;
  session_id: string;
  timestamp: string; // ISO 8601
}

// 1. Transcript Update Event
export interface WSTranscriptUpdateEvent extends BaseEvent {
  event: 'transcript_update';
  data: {
    chunk_index: number;
    text: string;
    is_final: boolean;
    language: string;
    confidence: number;
  };
}

// 2. Speaker Change Event
export interface WSSpeakerChangedEvent extends BaseEvent {
  event: 'speaker_changed';
  data: {
    speaker_id: string;
    role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
    confidence: number;
    start_time: number; // seconds
  };
}

// 3. Extraction Update Event
export interface WSExtractionUpdateEvent extends BaseEvent {
  event: 'extraction_update';
  data: {
    entity_type:
      | 'symptom'
      | 'diagnosis'
      | 'prescription'
      | 'vital_sign'
      | 'allergy'
      | 'procedure';
    entity: {
      id: string;
      content: string;
      confidence: number;
      speaker?: string;
      timestamp: number;
      metadata?: Record<string, any>;
    };
    chunk_index: number;
  };
}

// 4. Validation Alert Event
export interface WSValidationAlertEvent extends BaseEvent {
  event: 'validation_alert';
  data: {
    alert_id: string;
    type:
      | 'drug_interaction'
      | 'allergy_conflict'
      | 'dosage_error'
      | 'contraindication'
      | 'missing_info';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    related_entities: string[]; // entity IDs
    recommended_action?: string;
    requires_immediate_attention: boolean;
  };
}

// 5. Entity Validated Event
export interface WSEntityValidatedEvent extends BaseEvent {
  event: 'entity_validated';
  data: {
    entity_id: string;
    entity_type: string;
    validation_status: 'approved' | 'flagged' | 'needs_review';
    confidence_score: number;
    validation_notes?: string;
  };
}

// 6. Cost Update Event
export interface WSCostUpdateEvent extends BaseEvent {
  event: 'cost_update';
  data: {
    transcription_cost_usd: number;
    extraction_cost_usd: number;
    total_cost_usd: number;
    chunks_processed: number;
    cache_hit_rate: number;
  };
}

// 7. Session Complete Event
export interface WSSessionCompleteEvent extends BaseEvent {
  event: 'session_complete';
  data: {
    status: 'success' | 'partial' | 'failed';
    final_transcript: string;
    total_chunks: number;
    total_entities: number;
    total_alerts: number;
    processing_time_ms: number;
    final_cost_summary: {
      transcription_cost_usd: number;
      extraction_cost_usd: number;
      total_cost_usd: number;
      audio_duration_seconds: number;
    };
  };
}

// 8. Error Event
export interface WSErrorEvent extends BaseEvent {
  event: 'error';
  data: {
    error_code: string;
    message: string;
    details?: Record<string, any>;
    recoverable: boolean;
  };
}

// Union type of all events
export type WebSocketEvent =
  | WSTranscriptUpdateEvent
  | WSSpeakerChangedEvent
  | WSExtractionUpdateEvent
  | WSValidationAlertEvent
  | WSEntityValidatedEvent
  | WSCostUpdateEvent
  | WSSessionCompleteEvent
  | WSErrorEvent;
```

### 9. Update API Routes for Real-Time Sessions
Update `backend/src/routes/consultation.ts` to add real-time endpoints:

```typescript
import { Router } from 'express';
import multer from 'multer';
import { consultationController } from '../controllers/consultationController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  startConsultationSchema,
  querySchema,
  createSessionSchema,
} from '../schemas/consultation';

const router = Router();

// Configure multer for audio uploads (for legacy batch mode)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de audio no soportado'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// ===== REAL-TIME STREAMING MODE (PRIMARY) =====

// Create real-time session
router.post(
  '/sessions',
  validateRequest(createSessionSchema),
  consultationController.createRealtimeSession
);

// Finalize real-time session
router.post(
  '/sessions/:sessionId/finalize',
  consultationController.finalizeRealtimeSession
);

// Get session events (for playback/history)
router.get(
  '/sessions/:sessionId/events',
  consultationController.getSessionEvents
);

// Acknowledge validation alert
router.post(
  '/alerts/:alertId/acknowledge',
  consultationController.acknowledgeAlert
);

// ===== BATCH PROCESSING MODE (LEGACY) =====

// Legacy batch consultation routes
router.post(
  '/',
  validateRequest(startConsultationSchema),
  consultationController.startConsultation
);

router.post(
  '/:consultationId/audio',
  upload.single('audio'),
  consultationController.uploadRecording
);

router.post(
  '/:consultationId/finalize',
  consultationController.finalizeConsultation
);

router.get('/:consultationId/status', consultationController.getStatus);

// ===== RAG QUERIES (BOTH MODES) =====

router.post(
  '/query',
  validateRequest(querySchema),
  consultationController.queryKnowledgeBase
);

export default router;
```

### 10. Update Main Server File
Update `backend/src/server.ts` to initialize WebSocket gateway:

```typescript
import express from 'express';
import http from 'http';
import cors from 'cors';
import { setupWebSocketGateway } from './services/websocketGateway';
import consultationRoutes from './routes/consultation';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/consultations', consultationRoutes);

// Error handling
app.use(errorHandler);

// Initialize WebSocket gateway
setupWebSocketGateway(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('WebSocket gateway available at /ws/session/:sessionId');
});
```

### 11. Create Database Migration
Create `backend/migrations/002_add_realtime_tables.sql`:

```sql
-- Migration for Real-Time Streaming Support

-- Sessions table (replaces/extends consultations for real-time mode)
CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL, -- Python AI service session ID
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  appointment_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, cancelled
  websocket_url TEXT, -- WebSocket URL for this session
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  final_transcript TEXT,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0.0,
  audio_duration_seconds INTEGER DEFAULT 0
);

CREATE INDEX idx_ai_sessions_session_id ON ai_sessions(session_id);
CREATE INDEX idx_ai_sessions_consultation_id ON ai_sessions(consultation_id);
CREATE INDEX idx_ai_sessions_status ON ai_sessions(status);

-- Transcription events (transcript_update, speaker_changed)
CREATE TABLE IF NOT EXISTS transcription_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'transcript_update', 'speaker_changed'
  chunk_index INTEGER,
  text TEXT,
  speaker_id VARCHAR(50),
  speaker_role VARCHAR(20), -- DOCTOR, PATIENT, UNKNOWN
  confidence DECIMAL(5, 4),
  start_time DECIMAL(10, 3), -- seconds
  is_final BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB -- Full event payload
);

CREATE INDEX idx_transcription_events_session ON transcription_events(session_id, timestamp);
CREATE INDEX idx_transcription_events_chunk ON transcription_events(session_id, chunk_index);

-- Extraction events (extraction_update, entity_validated)
CREATE TABLE IF NOT EXISTS extraction_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'extraction_update', 'entity_validated'
  entity_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50), -- symptom, diagnosis, prescription, etc.
  content TEXT,
  confidence DECIMAL(5, 4),
  validation_status VARCHAR(50), -- approved, flagged, needs_review
  chunk_index INTEGER,
  speaker VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB -- Full event payload
);

CREATE INDEX idx_extraction_events_session ON extraction_events(session_id, entity_type);
CREATE INDEX idx_extraction_events_entity ON extraction_events(entity_id);
CREATE INDEX idx_extraction_events_timestamp ON extraction_events(session_id, timestamp);

-- Validation alerts (validation_alert)
CREATE TABLE IF NOT EXISTS validation_alerts (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  alert_id VARCHAR(255) UNIQUE NOT NULL,
  alert_type VARCHAR(100) NOT NULL, -- drug_interaction, allergy_conflict, etc.
  severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
  message TEXT NOT NULL,
  related_entities JSONB, -- Array of entity IDs
  recommended_action TEXT,
  requires_immediate_attention BOOLEAN DEFAULT false,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB -- Full event payload
);

CREATE INDEX idx_validation_alerts_session ON validation_alerts(session_id, severity);
CREATE INDEX idx_validation_alerts_alert_id ON validation_alerts(alert_id);
CREATE INDEX idx_validation_alerts_critical ON validation_alerts(session_id, severity, acknowledged)
  WHERE severity = 'CRITICAL' AND acknowledged = false;

-- Cost tracking events (cost_update)
CREATE TABLE IF NOT EXISTS cost_events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  transcription_cost_usd DECIMAL(10, 6),
  extraction_cost_usd DECIMAL(10, 6),
  total_cost_usd DECIMAL(10, 6),
  chunks_processed INTEGER,
  cache_hit_rate DECIMAL(5, 4),
  timestamp TIMESTAMP DEFAULT NOW(),
  event_data JSONB
);

CREATE INDEX idx_cost_events_session ON cost_events(session_id, timestamp);
```

### 12. Create Integration Tests
Create `backend/src/__tests__/integration/aiService.test.ts`:

```typescript
import { aiService } from '../../services/aiService';
import WebSocket from 'ws';

describe('AIService Integration', () => {
  beforeAll(async () => {
    // Authenticate with AI service
    await aiService.authenticate(
      process.env.AI_SERVICE_USERNAME!,
      process.env.AI_SERVICE_PASSWORD!
    );
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await aiService.checkHealth();
      expect(health.status).toBe('healthy');
    });
  });

  describe('Session Management (Real-Time)', () => {
    it('should create session and return WebSocket URL', async () => {
      const result = await aiService.createSession({
        patientId: 'test-patient-123',
        appointmentType: 'general_consultation',
        language: 'es',
      });

      expect(result.sessionId).toBeDefined();
      expect(result.websocketUrl).toBeDefined();
      expect(result.status).toBe('active');
    });

    it('should get session details', async () => {
      const createResult = await aiService.createSession({
        patientId: 'test-patient-123',
        appointmentType: 'general_consultation',
      });

      const session = await aiService.getSession(createResult.sessionId);

      expect(session.sessionId).toBe(createResult.sessionId);
      expect(session.status).toBe('active');
      expect(session.websocketUrl).toBeDefined();
    });

    it('should finalize session', async () => {
      const createResult = await aiService.createSession({
        patientId: 'test-patient-123',
        appointmentType: 'general_consultation',
      });

      const finalizeResult = await aiService.finalizeSession(
        createResult.sessionId
      );

      expect(finalizeResult.status).toBe('success');
    });
  });

  describe('WebSocket Gateway', () => {
    it('should connect to WebSocket and receive events', async (done) => {
      // Create session
      const session = await aiService.createSession({
        patientId: 'test-patient-123',
        appointmentType: 'general_consultation',
      });

      // Connect to Node.js WebSocket gateway
      const ws = new WebSocket(
        `ws://localhost:3000/ws/session/${session.sessionId}?token=${process.env.TEST_TOKEN}`
      );

      const receivedEvents: any[] = [];

      ws.on('open', () => {
        // Send test audio chunk (binary data)
        const audioChunk = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        ws.send(audioChunk);
      });

      ws.on('message', (data) => {
        const event = JSON.parse(data.toString());
        receivedEvents.push(event);

        // Check for transcript_update event
        if (event.event === 'transcript_update') {
          expect(event.data.text).toBeDefined();
          expect(event.data.chunk_index).toBeGreaterThanOrEqual(0);
        }

        // Check for session_complete event
        if (event.event === 'session_complete') {
          expect(event.data.status).toBe('success');
          expect(event.data.final_cost_summary).toBeDefined();
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        ws.close();
        done(new Error('WebSocket test timeout'));
      }, 30000);
    });
  });

  describe('RAG Query', () => {
    it('should return response with sources', async () => {
      const result = await aiService.query({
        query: '¿Cuáles son los síntomas de la diabetes?',
      });

      expect(result.response).toBeDefined();
      expect(result.sources).toBeInstanceOf(Array);
      expect(result.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('Document Ingestion', () => {
    it('should ingest documents successfully', async () => {
      const result = await aiService.ingest({
        documents: [
          {
            content: 'Test medical document content',
            metadata: { source: 'test', category: 'medical' },
          },
        ],
        sourceType: 'text',
      });

      expect(result.status).toBe('success');
      expect(result.indexedDocs).toBeGreaterThan(0);
    });
  });
});
```

Create `backend/src/__tests__/integration/eventPersistence.test.ts`:

```typescript
import { eventPersistence } from '../../services/eventPersistence';
import { pool } from '../../database';
import type {
  WSTranscriptUpdateEvent,
  WSSpeakerChangedEvent,
  WSValidationAlertEvent,
} from '../../types/websocketEvents';

describe('Event Persistence Integration', () => {
  let testSessionId: string;

  beforeAll(async () => {
    // Create test session
    const result = await pool.query(
      `INSERT INTO ai_sessions (session_id, patient_id, doctor_id, appointment_type)
       VALUES ($1, $2, $3, $4)
       RETURNING session_id`,
      ['test-session-123', 'patient-123', 'doctor-123', 'general_consultation']
    );
    testSessionId = result.rows[0].session_id;
  });

  afterAll(async () => {
    // Clean up test session
    await pool.query('DELETE FROM ai_sessions WHERE session_id = $1', [
      testSessionId,
    ]);
  });

  describe('saveTranscriptEvent', () => {
    it('should save transcript event to database', async () => {
      const event: WSTranscriptUpdateEvent = {
        event: 'transcript_update',
        session_id: testSessionId,
        timestamp: new Date().toISOString(),
        data: {
          chunk_index: 0,
          text: 'Buenos días doctor',
          is_final: false,
          language: 'es',
          confidence: 0.95,
        },
      };

      await eventPersistence.saveTranscriptEvent(testSessionId, event);

      // Verify it was saved
      const result = await pool.query(
        `SELECT * FROM transcription_events
         WHERE session_id = (SELECT id FROM ai_sessions WHERE session_id = $1)
         AND chunk_index = 0`,
        [testSessionId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].text).toBe('Buenos días doctor');
      expect(result.rows[0].confidence).toBe(0.95);
    });
  });

  describe('saveValidationAlert', () => {
    it('should save CRITICAL alert to database', async () => {
      const event: WSValidationAlertEvent = {
        event: 'validation_alert',
        session_id: testSessionId,
        timestamp: new Date().toISOString(),
        data: {
          alert_id: 'alert-123',
          type: 'drug_interaction',
          severity: 'CRITICAL',
          message: 'Interacción grave entre medicamentos',
          related_entities: ['entity-1', 'entity-2'],
          recommended_action: 'Revisar prescripción inmediatamente',
          requires_immediate_attention: true,
        },
      };

      await eventPersistence.saveValidationAlert(testSessionId, event);

      // Verify it was saved
      const result = await pool.query(
        `SELECT * FROM validation_alerts
         WHERE alert_id = $1`,
        ['alert-123']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].severity).toBe('CRITICAL');
      expect(result.rows[0].requires_immediate_attention).toBe(true);
    });
  });

  describe('getSessionEvents', () => {
    it('should retrieve all events for a session', async () => {
      const events = await eventPersistence.getSessionEvents(testSessionId);

      expect(events.transcriptEvents).toBeInstanceOf(Array);
      expect(events.extractionEvents).toBeInstanceOf(Array);
      expect(events.validationAlerts).toBeInstanceOf(Array);
      expect(events.costEvents).toBeInstanceOf(Array);
    });
  });
});
```

## Expected Deliverables

### Real-Time Streaming (PRIMARY)
- `backend/src/services/websocketGateway.ts` - WebSocket gateway with event routing
- `backend/src/services/eventPersistence.ts` - Event persistence to PostgreSQL
- `backend/src/types/websocketEvents.ts` - TypeScript event type definitions
- `backend/migrations/002_add_realtime_tables.sql` - Database schema for events
- Updated `backend/src/controllers/consultationController.ts` - Real-time session methods
- Updated `backend/src/routes/consultation.ts` - Real-time session routes
- Updated `backend/src/server.ts` - WebSocket gateway initialization

### Batch Processing (LEGACY)
- `backend/src/services/aiService.ts` - AI service client (batch + session management)
- `backend/src/controllers/consultationController.ts` - Consultation controller (batch methods)
- `backend/src/routes/consultation.ts` - Batch API routes

### Testing
- `backend/src/__tests__/integration/aiService.test.ts` - AI service integration tests
- `backend/src/__tests__/integration/eventPersistence.test.ts` - Event persistence tests

### Configuration
- Updated `backend/.env.example` - Environment variables

## Verification Steps

### Real-Time Streaming Mode (Priority)
1. ✅ Node.js can create sessions via Python API
2. ✅ WebSocket gateway accepts connections at `/ws/session/:sessionId`
3. ✅ Binary audio chunks forward from React → Node.js → Python
4. ✅ JSON events forward from Python → Node.js → React
5. ✅ All 8+ event types are persisted to PostgreSQL:
   - `transcript_update` → `transcription_events` table
   - `speaker_changed` → `transcription_events` table
   - `extraction_update` → `extraction_events` table
   - `validation_alert` → `validation_alerts` table
   - `entity_validated` → `extraction_events` table
   - `cost_update` → `cost_events` table + update `ai_sessions.total_cost_usd`
   - `session_complete` → update `ai_sessions` status/transcript/cost
   - `error` → `transcription_events` table + mark session failed if non-recoverable
6. ✅ CRITICAL alerts trigger immediate logging
7. ✅ Session finalization returns all events from database
8. ✅ Alert acknowledgment updates database correctly
9. ✅ WebSocket connection closes gracefully on both ends
10. ✅ Integration tests pass for real-time workflow

### Batch Processing Mode (Legacy)
1. ✅ Node.js backend can authenticate with Python AI service
2. ✅ Transcription workflow completes end-to-end (upload → finalize → results)
3. ✅ Error handling works for AI service failures
4. ✅ Integration tests pass for batch workflow

### RAG Queries (Both Modes)
1. ✅ RAG queries return relevant responses with sources
2. ✅ Document ingestion works correctly

### Performance Targets
- WebSocket connection establishes in <500ms
- Events persist to database in <50ms (non-blocking)
- CRITICAL alerts forwarded to React in <1s
- Session complete event includes final cost summary

## Architecture Diagrams

### Real-Time Streaming Flow
```
┌─────────────────┐     WebSocket      ┌──────────────────┐     WebSocket      ┌──────────────────┐
│  React Frontend │  ←─────────────→   │  Node.js Gateway │  ←─────────────→   │  Python AI       │
│  (Prompt 27)    │   /ws/session/:id  │  (THIS PROMPT)   │   /ws/session/:id  │  Service         │
│                 │                     │                  │                     │  (Prompt 25)     │
└─────────────────┘                     └──────────────────┘                     └──────────────────┘
                                               │
                                               │ Persist Events
                                               ↓
                                        ┌──────────────────┐
                                        │   PostgreSQL     │
                                        │   - ai_sessions  │
                                        │   - *_events     │
                                        │   - *_alerts     │
                                        └──────────────────┘
```

### Event Flow
```
1. React sends binary audio → Node.js forwards → Python
2. Python processes audio through pipeline
3. Python emits events (transcript_update, speaker_changed, etc.)
4. Node.js receives events → persists to PostgreSQL → forwards to React
5. React updates UI incrementally
6. On session complete, Python sends final summary
7. Node.js persists final state, React shows completion
```

## Notes

### Production Considerations
- Use connection pooling for PostgreSQL (already in place)
- Implement circuit breaker for Python AI service calls (recommended library: `opossum`)
- Cache Python health status (5-minute TTL)
- Handle token refresh automatically (JWT exp checking)
- Monitor WebSocket connection count (scaling consideration)
- Add rate limiting per session (prevent abuse)
- Enable WebSocket compression for JSON events (reduces bandwidth)

### Dual Mode Support
- Real-time streaming is the **PRIMARY** mode for new consultations
- Batch processing is **LEGACY** for backward compatibility
- Both modes share RAG query endpoints
- Frontend should default to real-time mode

### Database Considerations
- Add cleanup job for old events (30-day retention)
- Index optimization for CRITICAL alerts query
- Consider partitioning `*_events` tables by month for large volumes
- JSONB `event_data` column enables future analytics/replay

### Error Handling
- WebSocket disconnects are graceful (both sides cleanup)
- Non-recoverable errors mark session as failed
- Recoverable errors are logged but session continues
- Client reconnection handled by React (Prompt 27)

### Security
- Token verification on every WebSocket connection
- Session ID validated against user permissions
- No sensitive data in WebSocket URL (token in query param, not path)
- HTTPS/WSS in production (TLS termination at load balancer)
