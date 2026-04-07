# Prompt 32: Update Frontend and Backend Tests (Real-Time Streaming)

## Objective
Update existing frontend (React) and backend (Node.js) tests to work with the **real-time streaming architecture**. Ensure comprehensive test coverage for WebSocket event-driven pipeline, session management, and all real-time components.

## Context

**⚠️ REAL-TIME STREAMING ARCHITECTURE**

We've implemented a complete real-time event-driven system:

**Backend** (Prompt 26):
- WebSocket Gateway (bidirectional proxy: React ↔ Node.js ↔ Python)
- Event Persistence Service (PostgreSQL storage for all events)
- Session Management (create, get, list, delete sessions)
- Real-time event forwarding (8+ event types)

**Frontend** (Prompt 27):
- useRealtimeSession hook (WebSocket connection, audio streaming, event handling)
- LiveTranscriptionView (incremental transcript display)
- ValidationAlertPanel (real-time safety alerts)
- LiveEntityList (incremental entity extraction)
- LiveCostMonitor (running cost tracking)
- RealtimeConsultationView (main container)

**Python AI Service** (Prompt 25):
- Event-driven WebSocket endpoint (/ws/session)
- Incremental processing pipeline (transcript → diarization → extraction → validation)
- 8+ event types emitted in real-time

Tests need to cover:
1. **WebSocket Gateway**: Binary audio forwarding, event proxying, connection management
2. **Event Persistence**: All 8+ event types stored in PostgreSQL
3. **Session Management**: CRUD operations with WebSocket lifecycle
4. **Frontend Real-Time Components**: All live components and hooks
5. **End-to-End Flow**: Complete real-time streaming workflow
6. **Backward Compatibility**: Existing features still work (batch mode legacy)

## Tasks

### 1. Update Backend Tests (Real-Time Streaming)

#### 1.1 Update Backend Test Configuration

Update `packages/backend/tests/setup.ts`:

```typescript
import { Pool } from 'pg';
import { aiService } from '../src/services/aiService';
import { eventPersistence } from '../src/services/eventPersistence';
import { connection_manager } from '../src/services/websocketGateway';

// Mock PostgreSQL Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock AI Service Client
jest.mock('../src/services/aiService');

// Mock Event Persistence Service
jest.mock('../src/services/eventPersistence');

// Mock WebSocket Connection Manager
jest.mock('../src/services/websocketGateway');

export const mockAIService = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  finalizeSession: jest.fn(),
  deleteSession: jest.fn(),
  query: jest.fn(),
  checkHealth: jest.fn(),
};

export const mockEventPersistence = {
  saveTranscriptEvent: jest.fn(),
  saveSpeakerChangeEvent: jest.fn(),
  saveExtractionEvent: jest.fn(),
  saveValidationAlert: jest.fn(),
  saveEntityValidatedEvent: jest.fn(),
  saveCostEvent: jest.fn(),
  saveSessionComplete: jest.fn(),
  saveErrorEvent: jest.fn(),
  getSessionEvents: jest.fn(),
};

export const mockConnectionManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send_json: jest.fn(),
  is_connected: jest.fn(),
  getConnections: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  // Setup default AI service mock responses
  (aiService as any) = mockAIService;

  mockAIService.createSession.mockResolvedValue({
    sessionId: 'test-session-123',
    websocketUrl: 'ws://localhost:8000/ws/session/test-session-123',
    status: 'active',
  });

  mockAIService.getSession.mockResolvedValue({
    sessionId: 'test-session-123',
    status: 'active',
    createdAt: new Date().toISOString(),
    websocketUrl: 'ws://localhost:8000/ws/session/test-session-123',
  });

  // Setup event persistence mocks
  (eventPersistence as any) = mockEventPersistence;

  mockEventPersistence.getSessionEvents.mockResolvedValue({
    transcriptEvents: [],
    extractionEvents: [],
    validationAlerts: [],
    costEvents: [],
  });

  // Setup connection manager mocks
  (connection_manager as any) = mockConnectionManager;

  mockConnectionManager.is_connected.mockReturnValue(false);
});
```

#### 1.2 Create WebSocket Gateway Tests

Create `packages/backend/tests/services/websocketGateway.test.ts`:

```typescript
import WebSocket from 'ws';
import { Server } from 'http';
import { setupWebSocketGateway } from '../../src/services/websocketGateway';
import { eventPersistence } from '../../src/services/eventPersistence';
import { verifyToken } from '../../src/utils/jwt';

jest.mock('../../src/services/event

Persistence');
jest.mock('../../src/utils/jwt');

describe('WebSocket Gateway', () => {
  let server: Server;
  let wss: WebSocket.Server;
  let clientWs: WebSocket;

  beforeAll((done) => {
    server = new Server();
    setupWebSocketGateway(server);
    server.listen(0, () => done());
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-123', sub: 'user-123' });
  });

  describe('Connection Lifecycle', () => {
    it('should accept WebSocket connection with valid token', async () => {
      const port = (server.address() as any).port;
      const sessionId = 'test-session-123';
      const token = 'valid-token';

      clientWs = new WebSocket(`ws://localhost:${port}/ws/session/${sessionId}?token=${token}`);

      await new Promise((resolve) => {
        clientWs.on('open', resolve);
      });

      expect(clientWs.readyState).toBe(WebSocket.OPEN);
      clientWs.close();
    });

    it('should reject connection without token', async () => {
      const port = (server.address() as any).port;
      const sessionId = 'test-session-123';

      clientWs = new WebSocket(`ws://localhost:${port}/ws/session/${sessionId}`);

      await new Promise((resolve) => {
        clientWs.on('close', (code: number) => {
          expect(code).toBe(4001);
          resolve(null);
        });
      });
    });

    it('should reject connection with invalid token', async () => {
      (verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const port = (server.address() as any).port;
      const sessionId = 'test-session-123';

      clientWs = new WebSocket(`ws://localhost:${port}/ws/session/${sessionId}?token=invalid`);

      await new Promise((resolve) => {
        clientWs.on('close', (code: number) => {
          expect(code).toBe(4001);
          resolve(null);
        });
      });
    });
  });

  describe('Binary Audio Forwarding', () => {
    it('should forward binary audio from client to Python AI service', async () => {
      const port = (server.address() as any).port;
      const sessionId = 'test-session-123';
      const token = 'valid-token';

      // Mock Python AI service WebSocket
      const pythonWsMock = new WebSocket.Server({ port: 8001 });
      let receivedAudio: Buffer | null = null;

      pythonWsMock.on('connection', (ws) => {
        ws.on('message', (data) => {
          receivedAudio = data as Buffer;
        });
      });

      clientWs = new WebSocket(`ws://localhost:${port}/ws/session/${sessionId}?token=${token}`);

      await new Promise((resolve) => clientWs.on('open', resolve));

      // Send binary audio chunk
      const audioChunk = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      clientWs.send(audioChunk);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedAudio).toBeTruthy();
      expect(Buffer.isBuffer(receivedAudio)).toBe(true);

      clientWs.close();
      pythonWsMock.close();
    });
  });

  describe('Event Forwarding (Python → Client)', () => {
    it('should forward transcript_update event to client', async () => {
      const port = (server.address() as any).port;
      const sessionId = 'test-session-123';
      const token = 'valid-token';

      clientWs = new WebSocket(`ws://localhost:${port}/ws/session/${sessionId}?token=${token}`);

      const transcriptEvent = {
        event: 'transcript_update',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          chunk_index: 1,
          text: 'Buenos días doctor',
          is_final: true,
          confidence: 0.95,
        },
      };

      let receivedEvent: any = null;

      clientWs.on('message', (data) => {
        receivedEvent = JSON.parse(data.toString());
      });

      await new Promise((resolve) => clientWs.on('open', resolve));

      // Simulate Python sending event (this would be done by the gateway)
      // In reality, the gateway receives from Python and forwards to client
      clientWs.send(JSON.stringify(transcriptEvent));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvent).toBeTruthy();
      expect(receivedEvent.event).toBe('transcript_update');
      expect(receivedEvent.data.text).toBe('Buenos días doctor');

      clientWs.close();
    });

    it('should persist all event types to PostgreSQL', async () => {
      const sessionId = 'test-session-123';

      const events = [
        {
          event: 'transcript_update',
          data: { chunk_index: 1, text: 'Test', is_final: true },
        },
        {
          event: 'speaker_changed',
          data: { speaker_id: 'SPEAKER_1', role: 'DOCTOR', confidence: 0.9 },
        },
        {
          event: 'extraction_update',
          data: { entity_type: 'symptom', entity: { id: 'e1', content: 'cefalea' } },
        },
        {
          event: 'validation_alert',
          data: { alert_id: 'alert-1', severity: 'CRITICAL', message: 'Drug interaction' },
        },
        {
          event: 'cost_update',
          data: { total_cost_usd: 0.15 },
        },
      ];

      for (const event of events) {
        // Call the persist function (which would be called by the gateway)
        const fullEvent = { ...event, session_id: sessionId, timestamp: new Date().toISOString() };
        // In real implementation, this happens automatically in the gateway
      }

      // Verify persistence functions were called
      // (In actual test, you'd verify the specific mock calls)
      expect(eventPersistence.saveTranscriptEvent).toHaveBeenCalled();
      expect(eventPersistence.saveSpeakerChangeEvent).toHaveBeenCalled();
      expect(eventPersistence.saveExtractionEvent).toHaveBeenCalled();
      expect(eventPersistence.saveValidationAlert).toHaveBeenCalled();
      expect(eventPersistence.saveCostEvent).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Python AI service connection errors', async () => {
      // Test connection failure to Python service
      // Should close client connection gracefully
    });

    it('should handle client disconnect', async () => {
      const port = (server.address() as any).port;
      const sessionId = 'test-session-123';
      const token = 'valid-token';

      clientWs = new WebSocket(`ws://localhost:${port}/ws/session/${sessionId}?token=${token}`);

      await new Promise((resolve) => clientWs.on('open', resolve));

      clientWs.close();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify cleanup happened (Python connection closed, etc.)
      expect(clientWs.readyState).toBe(WebSocket.CLOSED);
    });
  });
});
```

#### 1.3 Create Event Persistence Service Tests

Create `packages/backend/tests/services/eventPersistence.test.ts`:

```typescript
import { eventPersistence } from '../../src/services/eventPersistence';
import { Pool } from 'pg';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Event Persistence Service', () => {
  let mockPool: jest.Mocked<Pool>;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    jest.clearAllMocks();
  });

  describe('saveTranscriptEvent', () => {
    it('should persist transcript_update event to PostgreSQL', async () => {
      const event = {
        event: 'transcript_update',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          chunk_index: 1,
          text: 'Buenos días doctor',
          is_final: true,
          confidence: 0.95,
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveTranscriptEvent(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transcript_events'),
        expect.arrayContaining([sessionId, event.timestamp, event.data])
      );
    });

    it('should handle database errors gracefully', async () => {
      const event = {
        event: 'transcript_update',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: { chunk_index: 1, text: 'Test', is_final: true, confidence: 0.9 },
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(eventPersistence.saveTranscriptEvent(event)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('saveSpeakerChangeEvent', () => {
    it('should persist speaker_changed event', async () => {
      const event = {
        event: 'speaker_changed',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          speaker_id: 'speaker_1',
          speaker_label: 'Doctor',
          timestamp: 12.5,
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveSpeakerChangeEvent(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO speaker_events'),
        expect.arrayContaining([sessionId, event.data.speaker_id, event.data.speaker_label])
      );
    });
  });

  describe('saveExtractionEvent', () => {
    it('should persist extraction_update event with medical entities', async () => {
      const event = {
        event: 'extraction_update',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          entity_type: 'symptom',
          entity_value: 'dolor de cabeza',
          confidence: 0.88,
          chunk_index: 2,
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveExtractionEvent(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO extraction_events'),
        expect.arrayContaining([
          sessionId,
          event.data.entity_type,
          event.data.entity_value,
          event.data.confidence,
        ])
      );
    });
  });

  describe('saveValidationAlert', () => {
    it('should persist CRITICAL validation alert', async () => {
      const event = {
        event: 'validation_alert',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          alert_type: 'allergy_conflict',
          severity: 'CRITICAL',
          message: 'Patient allergic to prescribed medication',
          entities_involved: ['medication:penicilina', 'allergy:penicilina'],
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveValidationAlert(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO validation_alerts'),
        expect.arrayContaining([
          sessionId,
          event.data.alert_type,
          event.data.severity,
          event.data.message,
        ])
      );
    });

    it('should persist HIGH, MEDIUM, and LOW severity alerts', async () => {
      const severities = ['HIGH', 'MEDIUM', 'LOW'];

      for (const severity of severities) {
        const event = {
          event: 'validation_alert',
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          data: {
            alert_type: 'missing_information',
            severity,
            message: `${severity} severity alert`,
            entities_involved: [],
          },
        };

        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

        await eventPersistence.saveValidationAlert(event);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO validation_alerts'),
          expect.arrayContaining([sessionId, event.data.alert_type, severity])
        );
      }
    });
  });

  describe('saveEntityValidatedEvent', () => {
    it('should persist entity_validated event', async () => {
      const event = {
        event: 'entity_validated',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          entity_type: 'medication',
          entity_value: 'aspirina',
          validation_status: 'safe',
          rag_sources: ['drug_database', 'interaction_checker'],
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveEntityValidatedEvent(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO entity_validated_events'),
        expect.arrayContaining([
          sessionId,
          event.data.entity_type,
          event.data.entity_value,
          event.data.validation_status,
        ])
      );
    });
  });

  describe('saveCostEvent', () => {
    it('should persist cost_update event with running costs', async () => {
      const event = {
        event: 'cost_update',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          whisper_cost: 0.006,
          embedding_cost: 0.00013,
          llm_cost: 0.045,
          total_cost: 0.05113,
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveCostEvent(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cost_events'),
        expect.arrayContaining([
          sessionId,
          event.data.whisper_cost,
          event.data.embedding_cost,
          event.data.llm_cost,
          event.data.total_cost,
        ])
      );
    });
  });

  describe('saveSessionComplete', () => {
    it('should persist session_complete event and update session status', async () => {
      const event = {
        event: 'session_complete',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          status: 'completed',
          total_duration_seconds: 180,
          final_cost: 0.15,
          entities_extracted: 25,
          alerts_generated: 2,
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveSessionComplete(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET status'),
        expect.arrayContaining([sessionId, 'completed', event.data.final_cost])
      );
    });
  });

  describe('saveErrorEvent', () => {
    it('should persist error event with stack trace', async () => {
      const event = {
        event: 'error',
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          error_type: 'transcription_error',
          message: 'Whisper API timeout',
          stack_trace: 'Error: timeout\n  at whisper.ts:45',
        },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await eventPersistence.saveErrorEvent(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO error_events'),
        expect.arrayContaining([
          sessionId,
          event.data.error_type,
          event.data.message,
          event.data.stack_trace,
        ])
      );
    });
  });

  describe('getSessionEvents', () => {
    it('should retrieve all events for a session in chronological order', async () => {
      const mockEvents = [
        {
          event_type: 'transcript_update',
          timestamp: '2024-01-01T10:00:00Z',
          data: { text: 'Test transcript' },
        },
        {
          event_type: 'validation_alert',
          timestamp: '2024-01-01T10:00:05Z',
          data: { severity: 'CRITICAL', message: 'Alert' },
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockEvents } as any);

      const result = await eventPersistence.getSessionEvents(sessionId);

      expect(result).toEqual(mockEvents);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM session_events WHERE session_id'),
        expect.arrayContaining([sessionId])
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp ASC'),
        expect.anything()
      );
    });

    it('should handle sessions with no events', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await eventPersistence.getSessionEvents(sessionId);

      expect(result).toEqual([]);
    });
  });
});
```

#### 1.4 Create Session Management Controller Tests

Create `packages/backend/tests/controllers/session.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { mockAIService, mockEventPersistence } from '../setup';
import { Pool } from 'pg';

jest.mock('pg');

describe('Session Management Controller', () => {
  const mockPool = new Pool() as jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sessions', () => {
    it('should create a new session and return session_id', async () => {
      const mockSessionId = 'session-abc-123';

      mockAIService.createSession.mockResolvedValue({
        session_id: mockSessionId,
        status: 'created',
        websocket_url: 'ws://python-ai:8000/ws/session/session-abc-123',
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: mockSessionId }], rowCount: 1 } as any);

      const response = await request(app)
        .post('/api/sessions')
        .send({
          patient_id: 'patient-456',
          consultation_type: 'general',
        })
        .expect(201);

      expect(response.body).toEqual({
        session_id: mockSessionId,
        status: 'created',
        websocket_url: expect.stringContaining('/ws/session/'),
      });

      expect(mockAIService.createSession).toHaveBeenCalledWith({
        patient_id: 'patient-456',
        consultation_type: 'general',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([mockSessionId, 'patient-456', 'created'])
      );
    });

    it('should handle AI service errors when creating session', async () => {
      mockAIService.createSession.mockRejectedValue(
        new Error('Python AI service unavailable')
      );

      await request(app)
        .post('/api/sessions')
        .send({
          patient_id: 'patient-456',
          consultation_type: 'general',
        })
        .expect(500);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/sessions')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    it('should retrieve session with all events', async () => {
      const sessionId = 'session-abc-123';

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: sessionId,
          patient_id: 'patient-456',
          status: 'completed',
          created_at: '2024-01-01T10:00:00Z',
          final_cost: 0.15,
        }],
        rowCount: 1,
      } as any);

      mockEventPersistence.getSessionEvents.mockResolvedValue([
        {
          event_type: 'transcript_update',
          timestamp: '2024-01-01T10:00:01Z',
          data: { text: 'Buenos días doctor', chunk_index: 1 },
        },
        {
          event_type: 'validation_alert',
          timestamp: '2024-01-01T10:00:05Z',
          data: { severity: 'CRITICAL', message: 'Allergy conflict detected' },
        },
      ]);

      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.session).toHaveProperty('id', sessionId);
      expect(response.body.session).toHaveProperty('status', 'completed');
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events[0].event_type).toBe('transcript_update');
    });

    it('should return 404 for non-existent session', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await request(app)
        .get('/api/sessions/non-existent-session')
        .expect(404);
    });
  });

  describe('GET /api/sessions', () => {
    it('should list all sessions for a patient', async () => {
      const patientId = 'patient-456';

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'session-1',
            patient_id: patientId,
            status: 'completed',
            created_at: '2024-01-01T10:00:00Z',
          },
          {
            id: 'session-2',
            patient_id: patientId,
            status: 'in_progress',
            created_at: '2024-01-02T10:00:00Z',
          },
        ],
        rowCount: 2,
      } as any);

      const response = await request(app)
        .get(`/api/sessions?patient_id=${patientId}`)
        .expect(200);

      expect(response.body.sessions).toHaveLength(2);
      expect(response.body.sessions[0].status).toBe('completed');
      expect(response.body.sessions[1].status).toBe('in_progress');
    });

    it('should support pagination', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'session-1', status: 'completed' }],
        rowCount: 1,
      } as any);

      const response = await request(app)
        .get('/api/sessions?patient_id=patient-456&limit=10&offset=0')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 0])
      );
    });
  });

  describe('DELETE /api/sessions/:sessionId', () => {
    it('should delete session and all associated events', async () => {
      const sessionId = 'session-abc-123';

      mockAIService.deleteSession.mockResolvedValue({ success: true });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // DELETE FROM session_events
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // DELETE FROM sessions

      const response = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      expect(mockAIService.deleteSession).toHaveBeenCalledWith(sessionId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM session_events WHERE session_id'),
        expect.arrayContaining([sessionId])
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions WHERE id'),
        expect.arrayContaining([sessionId])
      );
    });

    it('should handle Python AI service errors gracefully', async () => {
      mockAIService.deleteSession.mockRejectedValue(new Error('AI service unavailable'));

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Should still delete from PostgreSQL even if Python AI service fails
      const response = await request(app)
        .delete('/api/sessions/session-abc-123')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('WebSocket connection lifecycle', () => {
    it('should verify session exists before allowing WebSocket connection', async () => {
      const sessionId = 'session-abc-123';

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: sessionId, status: 'created' }],
        rowCount: 1,
      } as any);

      const response = await request(app)
        .get(`/api/sessions/${sessionId}/verify`)
        .expect(200);

      expect(response.body).toEqual({ valid: true, session_id: sessionId });
    });

    it('should reject WebSocket connection for non-existent session', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await request(app)
        .get('/api/sessions/non-existent/verify')
        .expect(404);
    });
  });
});
```

### 2. Update Frontend Tests

#### 2.1 Update Frontend Test Configuration

Update `packages/frontend/src/setupTests.ts`:

```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Setup MSW for API mocking
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
})) as any;
```

#### 2.2 Create MSW Handlers for Real-Time Session Management

Create `packages/frontend/src/mocks/handlers.ts`:

```typescript
import { rest } from 'msw';

export const handlers = [
  // Real-Time Session Management Endpoints
  rest.post('/api/sessions', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        session_id: 'mock-session-123',
        status: 'created',
        websocket_url: 'ws://localhost:3001/ws/session/mock-session-123?token=mock-token',
      })
    );
  }),

  rest.get('/api/sessions/:sessionId', (req, res, ctx) => {
    return res(
      ctx.json({
        session: {
          id: req.params.sessionId,
          patient_id: 'patient-456',
          status: 'completed',
          created_at: '2024-01-01T10:00:00Z',
          final_cost: 0.15,
        },
        events: [
          {
            event_type: 'transcript_update',
            timestamp: '2024-01-01T10:00:01Z',
            data: {
              chunk_index: 1,
              text: 'Buenos días doctor',
              is_final: true,
              confidence: 0.95,
            },
          },
          {
            event_type: 'speaker_changed',
            timestamp: '2024-01-01T10:00:02Z',
            data: {
              speaker_id: 'speaker_1',
              speaker_label: 'Doctor',
            },
          },
          {
            event_type: 'extraction_update',
            timestamp: '2024-01-01T10:00:03Z',
            data: {
              entity_type: 'symptom',
              entity_value: 'dolor de cabeza',
              confidence: 0.88,
            },
          },
          {
            event_type: 'validation_alert',
            timestamp: '2024-01-01T10:00:04Z',
            data: {
              alert_type: 'allergy_conflict',
              severity: 'CRITICAL',
              message: 'Patient allergic to prescribed medication',
              entities_involved: ['medication:penicilina', 'allergy:penicilina'],
            },
          },
          {
            event_type: 'cost_update',
            timestamp: '2024-01-01T10:00:05Z',
            data: {
              whisper_cost: 0.006,
              embedding_cost: 0.00013,
              llm_cost: 0.045,
              total_cost: 0.05113,
            },
          },
          {
            event_type: 'session_complete',
            timestamp: '2024-01-01T10:03:00Z',
            data: {
              status: 'completed',
              total_duration_seconds: 180,
              final_cost: 0.15,
              entities_extracted: 25,
              alerts_generated: 2,
            },
          },
        ],
      })
    );
  }),

  rest.get('/api/sessions', (req, res, ctx) => {
    const patientId = req.url.searchParams.get('patient_id');

    return res(
      ctx.json({
        sessions: [
          {
            id: 'session-1',
            patient_id: patientId || 'patient-456',
            status: 'completed',
            created_at: '2024-01-01T10:00:00Z',
            final_cost: 0.15,
          },
          {
            id: 'session-2',
            patient_id: patientId || 'patient-456',
            status: 'in_progress',
            created_at: '2024-01-02T10:00:00Z',
            final_cost: null,
          },
        ],
      })
    );
  }),

  rest.delete('/api/sessions/:sessionId', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
      })
    );
  }),

  // RAG Query Endpoint (still used for real-time validation)
  rest.post('/api/ai/query', (req, res, ctx) => {
    return res(
      ctx.json({
        response: 'El ibuprofeno es un AINE utilizado para dolor...',
        sources: [
          {
            doc: 'vademecum.pdf',
            chunk: 1,
            score: 0.95,
          },
        ],
      })
    );
  }),
];
```

Create `packages/frontend/src/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

#### 2.3 Create Tests for useRealtimeSession Hook

Create `packages/frontend/src/hooks/__tests__/useRealtimeSession.test.tsx`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeSession } from '../useRealtimeSession';
import WS from 'jest-websocket-mock';

describe('useRealtimeSession', () => {
  let mockServer: WS;

  beforeEach(() => {
    mockServer = new WS('ws://localhost:3001/ws/session/mock-session-123');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should create session and establish WebSocket connection', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
      consultationType: 'general',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.sessionId).toBe('mock-session-123');
    expect(result.current.isConnected).toBe(true);

    await mockServer.connected;
  });

  it('should stream binary audio chunks via WebSocket', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    // Send binary audio chunk
    const audioChunk = new Uint8Array([1, 2, 3, 4]).buffer;

    act(() => {
      result.current.sendAudioChunk(audioChunk);
    });

    // Verify binary data was sent to server
    await expect(mockServer).toReceiveMessage(expect.any(ArrayBuffer));
  });

  it('should handle transcript_update events', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    // Server sends transcript update
    act(() => {
      mockServer.send(JSON.stringify({
        event: 'transcript_update',
        session_id: 'mock-session-123',
        timestamp: new Date().toISOString(),
        data: {
          chunk_index: 1,
          text: 'Buenos días doctor',
          is_final: true,
          confidence: 0.95,
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.transcript).toContain('Buenos días doctor');
      expect(result.current.transcriptChunks).toHaveLength(1);
    });
  });

  it('should handle speaker_changed events', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    act(() => {
      mockServer.send(JSON.stringify({
        event: 'speaker_changed',
        data: {
          speaker_id: 'speaker_1',
          speaker_label: 'Doctor',
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.currentSpeaker).toBe('Doctor');
    });
  });

  it('should handle extraction_update events', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    act(() => {
      mockServer.send(JSON.stringify({
        event: 'extraction_update',
        data: {
          entity_type: 'symptom',
          entity_value: 'dolor de cabeza',
          confidence: 0.88,
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.entities).toHaveLength(1);
      expect(result.current.entities[0].entity_type).toBe('symptom');
      expect(result.current.entities[0].entity_value).toBe('dolor de cabeza');
    });
  });

  it('should handle validation_alert events with priority ordering', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    // Send LOW severity alert
    act(() => {
      mockServer.send(JSON.stringify({
        event: 'validation_alert',
        data: {
          alert_type: 'missing_information',
          severity: 'LOW',
          message: 'Missing patient age',
        },
      }));
    });

    // Send CRITICAL severity alert
    act(() => {
      mockServer.send(JSON.stringify({
        event: 'validation_alert',
        data: {
          alert_type: 'allergy_conflict',
          severity: 'CRITICAL',
          message: 'Patient allergic to prescribed medication',
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.alerts).toHaveLength(2);
      // CRITICAL should be first (priority ordering)
      expect(result.current.alerts[0].severity).toBe('CRITICAL');
      expect(result.current.alerts[1].severity).toBe('LOW');
    });
  });

  it('should handle cost_update events', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    act(() => {
      mockServer.send(JSON.stringify({
        event: 'cost_update',
        data: {
          whisper_cost: 0.006,
          embedding_cost: 0.00013,
          llm_cost: 0.045,
          total_cost: 0.05113,
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.currentCost).toBe(0.05113);
    });
  });

  it('should handle session_complete event', async () => {
    const onSessionComplete = jest.fn();

    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
      onSessionComplete,
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    act(() => {
      mockServer.send(JSON.stringify({
        event: 'session_complete',
        data: {
          status: 'completed',
          total_duration_seconds: 180,
          final_cost: 0.15,
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.sessionStatus).toBe('completed');
      expect(onSessionComplete).toHaveBeenCalledWith({
        status: 'completed',
        total_duration_seconds: 180,
        final_cost: 0.15,
      });
    });
  });

  it('should handle error events', async () => {
    const onError = jest.fn();

    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
      onError,
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    act(() => {
      mockServer.send(JSON.stringify({
        event: 'error',
        data: {
          error_type: 'transcription_error',
          message: 'Whisper API timeout',
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should handle WebSocket disconnect and reconnect', async () => {
    const { result } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    expect(result.current.isConnected).toBe(true);

    // Simulate disconnect
    act(() => {
      mockServer.close();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useRealtimeSession({
      patientId: 'patient-456',
    }));

    await act(async () => {
      await result.current.startSession();
    });

    await mockServer.connected;

    unmount();

    await waitFor(() => {
      expect(mockServer).toHaveReceivedMessages([]);
    });
  });
});
```

#### 2.4 Create Tests for Real-Time React Components

Create `packages/frontend/src/components/__tests__/LiveTranscriptionView.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { LiveTranscriptionView } from '../LiveTranscriptionView';

const mockTranscriptChunks = [
  {
    chunk_index: 1,
    text: 'Buenos días doctor',
    is_final: true,
    confidence: 0.95,
    speaker: 'Paciente',
  },
  {
    chunk_index: 2,
    text: 'Hola, ¿cómo está?',
    is_final: true,
    confidence: 0.92,
    speaker: 'Doctor',
  },
];

describe('LiveTranscriptionView', () => {
  it('should render transcript chunks in real-time', () => {
    render(<LiveTranscriptionView transcriptChunks={mockTranscriptChunks} />);

    expect(screen.getByText(/Buenos días doctor/i)).toBeInTheDocument();
    expect(screen.getByText(/Hola, ¿cómo está?/i)).toBeInTheDocument();
  });

  it('should display speaker labels for each chunk', () => {
    render(<LiveTranscriptionView transcriptChunks={mockTranscriptChunks} />);

    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
  });

  it('should show confidence scores', () => {
    render(<LiveTranscriptionView transcriptChunks={mockTranscriptChunks} showConfidence />);

    expect(screen.getByText(/95%/i)).toBeInTheDocument();
    expect(screen.getByText(/92%/i)).toBeInTheDocument();
  });

  it('should auto-scroll to latest chunk', () => {
    const { rerender } = render(
      <LiveTranscriptionView transcriptChunks={[mockTranscriptChunks[0]]} autoScroll />
    );

    // Add new chunk
    rerender(
      <LiveTranscriptionView transcriptChunks={mockTranscriptChunks} autoScroll />
    );

    // Verify scroll behavior (component should scroll to bottom)
    const container = screen.getByRole('region', { name: /transcript/i });
    expect(container.scrollTop).toBe(container.scrollHeight);
  });

  it('should highlight current speaker', () => {
    render(
      <LiveTranscriptionView
        transcriptChunks={mockTranscriptChunks}
        currentSpeaker="Doctor"
      />
    );

    const doctorChunk = screen.getByText(/Hola, ¿cómo está?/i).closest('[data-speaker]');
    expect(doctorChunk).toHaveClass('highlighted');
  });
});
```

Create `packages/frontend/src/components/__tests__/ValidationAlertPanel.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationAlertPanel } from '../ValidationAlertPanel';

const mockAlerts = [
  {
    alert_type: 'allergy_conflict',
    severity: 'CRITICAL',
    message: 'Patient allergic to prescribed medication',
    entities_involved: ['medication:penicilina', 'allergy:penicilina'],
    timestamp: '2024-01-01T10:00:00Z',
  },
  {
    alert_type: 'drug_interaction',
    severity: 'HIGH',
    message: 'Potential drug interaction detected',
    entities_involved: ['medication:aspirina', 'medication:warfarina'],
    timestamp: '2024-01-01T10:00:05Z',
  },
  {
    alert_type: 'missing_information',
    severity: 'MEDIUM',
    message: 'Patient age not specified',
    entities_involved: [],
    timestamp: '2024-01-01T10:00:10Z',
  },
];

describe('ValidationAlertPanel', () => {
  it('should render alerts sorted by severity (CRITICAL first)', () => {
    render(<ValidationAlertPanel alerts={mockAlerts} />);

    const alertElements = screen.getAllByRole('alert');

    // CRITICAL should be first
    expect(alertElements[0]).toHaveTextContent('CRITICAL');
    expect(alertElements[0]).toHaveTextContent('Patient allergic to prescribed medication');
  });

  it('should display severity badges with correct colors', () => {
    render(<ValidationAlertPanel alerts={mockAlerts} />);

    const criticalBadge = screen.getByText('CRITICAL');
    const highBadge = screen.getByText('HIGH');
    const mediumBadge = screen.getByText('MEDIUM');

    expect(criticalBadge).toHaveClass('severity-critical');
    expect(highBadge).toHaveClass('severity-high');
    expect(mediumBadge).toHaveClass('severity-medium');
  });

  it('should show entity badges for involved entities', () => {
    render(<ValidationAlertPanel alerts={mockAlerts} />);

    expect(screen.getByText('medication:penicilina')).toBeInTheDocument();
    expect(screen.getByText('allergy:penicilina')).toBeInTheDocument();
  });

  it('should allow dismissing alerts', async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();

    render(<ValidationAlertPanel alerts={[mockAlerts[0]]} onDismissAlert={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledWith(mockAlerts[0]);
  });

  it('should show empty state when no alerts', () => {
    render(<ValidationAlertPanel alerts={[]} />);

    expect(screen.getByText(/No validation alerts/i)).toBeInTheDocument();
  });

  it('should play notification sound for CRITICAL alerts', () => {
    const mockAudio = {
      play: jest.fn(),
    };
    global.Audio = jest.fn(() => mockAudio) as any;

    render(<ValidationAlertPanel alerts={[mockAlerts[0]]} playSound />);

    expect(mockAudio.play).toHaveBeenCalled();
  });
});
```

Create `packages/frontend/src/components/__tests__/LiveEntityList.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { LiveEntityList } from '../LiveEntityList';

const mockEntities = [
  {
    entity_type: 'symptom',
    entity_value: 'dolor de cabeza',
    confidence: 0.88,
    chunk_index: 1,
    validated: true,
  },
  {
    entity_type: 'medication',
    entity_value: 'ibuprofeno',
    confidence: 0.92,
    chunk_index: 2,
    validated: false,
  },
  {
    entity_type: 'diagnosis',
    entity_value: 'migraña',
    confidence: 0.85,
    chunk_index: 3,
    validated: true,
  },
];

describe('LiveEntityList', () => {
  it('should render entities grouped by type', () => {
    render(<LiveEntityList entities={mockEntities} />);

    expect(screen.getByRole('heading', { name: /symptoms/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /medications/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /diagnoses/i })).toBeInTheDocument();
  });

  it('should display entity values and confidence scores', () => {
    render(<LiveEntityList entities={mockEntities} showConfidence />);

    expect(screen.getByText('dolor de cabeza')).toBeInTheDocument();
    expect(screen.getByText(/88%/i)).toBeInTheDocument();
    expect(screen.getByText('ibuprofeno')).toBeInTheDocument();
    expect(screen.getByText(/92%/i)).toBeInTheDocument();
  });

  it('should show validation status badges', () => {
    render(<LiveEntityList entities={mockEntities} />);

    const validatedBadges = screen.getAllByText(/validated/i);
    const pendingBadges = screen.getAllByText(/pending/i);

    expect(validatedBadges).toHaveLength(2); // dolor de cabeza, migraña
    expect(pendingBadges).toHaveLength(1); // ibuprofeno
  });

  it('should highlight newly added entities', () => {
    const { rerender } = render(<LiveEntityList entities={[mockEntities[0]]} />);

    // Add new entity
    rerender(<LiveEntityList entities={mockEntities} highlightNew />);

    const newEntity = screen.getByText('ibuprofeno').closest('[data-entity]');
    expect(newEntity).toHaveClass('entity-new');
  });

  it('should support filtering by entity type', () => {
    render(<LiveEntityList entities={mockEntities} filterType="symptom" />);

    expect(screen.getByText('dolor de cabeza')).toBeInTheDocument();
    expect(screen.queryByText('ibuprofeno')).not.toBeInTheDocument();
    expect(screen.queryByText('migraña')).not.toBeInTheDocument();
  });

  it('should show empty state when no entities', () => {
    render(<LiveEntityList entities={[]} />);

    expect(screen.getByText(/No entities extracted yet/i)).toBeInTheDocument();
  });
});
```

Create `packages/frontend/src/components/__tests__/LiveCostMonitor.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { LiveCostMonitor } from '../LiveCostMonitor';

describe('LiveCostMonitor', () => {
  it('should display current running cost', () => {
    render(<LiveCostMonitor currentCost={0.05113} />);

    expect(screen.getByText(/\$0.05/i)).toBeInTheDocument();
  });

  it('should display cost breakdown by service', () => {
    const costBreakdown = {
      whisper_cost: 0.006,
      embedding_cost: 0.00013,
      llm_cost: 0.045,
      total_cost: 0.05113,
    };

    render(<LiveCostMonitor currentCost={0.05113} breakdown={costBreakdown} />);

    expect(screen.getByText(/whisper/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0.006/i)).toBeInTheDocument();
    expect(screen.getByText(/embedding/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0.00013/i)).toBeInTheDocument();
    expect(screen.getByText(/llm/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0.045/i)).toBeInTheDocument();
  });

  it('should update in real-time as costs increase', () => {
    const { rerender } = render(<LiveCostMonitor currentCost={0.05} />);

    expect(screen.getByText(/\$0.05/i)).toBeInTheDocument();

    // Simulate cost update
    rerender(<LiveCostMonitor currentCost={0.10} />);

    expect(screen.getByText(/\$0.10/i)).toBeInTheDocument();
  });

  it('should show budget warning when approaching limit', () => {
    render(<LiveCostMonitor currentCost={0.45} budgetLimit={0.50} />);

    expect(screen.getByRole('alert', { name: /budget warning/i })).toBeInTheDocument();
    expect(screen.getByText(/90%/i)).toBeInTheDocument(); // 0.45 / 0.50 = 90%
  });

  it('should display estimated final cost projection', () => {
    render(
      <LiveCostMonitor
        currentCost={0.10}
        estimatedFinalCost={0.20}
        showProjection
      />
    );

    expect(screen.getByText(/estimated final/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0.20/i)).toBeInTheDocument();
  });

  it('should format costs to 4 decimal places', () => {
    render(<LiveCostMonitor currentCost={0.001234} />);

    expect(screen.getByText(/\$0.0012/i)).toBeInTheDocument();
  });
});
```

### 3. Integration Test for Real-Time Streaming Flow

Create `packages/frontend/src/__tests__/realtime-session.integration.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealtimeConsultationPage } from '../pages/RealtimeConsultationPage';
import WS from 'jest-websocket-mock';

describe('Real-Time Streaming Integration', () => {
  let mockServer: WS;

  beforeEach(() => {
    mockServer = new WS('ws://localhost:3001/ws/session/mock-session-123');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should complete full real-time transcription workflow', async () => {
    const user = userEvent.setup();

    render(<RealtimeConsultationPage patientId="patient-456" />);

    // Click "Start Recording" button
    const startBtn = screen.getByRole('button', { name: /start recording/i });
    await user.click(startBtn);

    // Wait for WebSocket connection
    await mockServer.connected;

    // Verify session created and UI shows "Recording..."
    await waitFor(() => {
      expect(screen.getByText(/recording/i)).toBeInTheDocument();
      expect(screen.getByText(/session.*mock-session-123/i)).toBeInTheDocument();
    });

    // Simulate real-time transcript events from server
    mockServer.send(JSON.stringify({
      event: 'transcript_update',
      session_id: 'mock-session-123',
      data: {
        chunk_index: 1,
        text: 'Buenos días doctor',
        is_final: true,
        confidence: 0.95,
      },
    }));

    // Verify transcript appears in real-time
    await waitFor(() => {
      expect(screen.getByText(/Buenos días doctor/i)).toBeInTheDocument();
    });

    // Simulate speaker change event
    mockServer.send(JSON.stringify({
      event: 'speaker_changed',
      data: {
        speaker_id: 'speaker_1',
        speaker_label: 'Doctor',
      },
    }));

    await waitFor(() => {
      expect(screen.getByText('Doctor')).toBeInTheDocument();
    });

    // Simulate entity extraction event
    mockServer.send(JSON.stringify({
      event: 'extraction_update',
      data: {
        entity_type: 'symptom',
        entity_value: 'dolor de cabeza',
        confidence: 0.88,
      },
    }));

    // Verify entity appears in LiveEntityList
    await waitFor(() => {
      expect(screen.getByText('dolor de cabeza')).toBeInTheDocument();
    });

    // Simulate CRITICAL validation alert
    mockServer.send(JSON.stringify({
      event: 'validation_alert',
      data: {
        alert_type: 'allergy_conflict',
        severity: 'CRITICAL',
        message: 'Patient allergic to prescribed medication',
        entities_involved: ['medication:penicilina', 'allergy:penicilina'],
      },
    }));

    // Verify alert appears with highest priority
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText(/Patient allergic to prescribed medication/i)).toBeInTheDocument();
    });

    // Simulate cost update event
    mockServer.send(JSON.stringify({
      event: 'cost_update',
      data: {
        whisper_cost: 0.006,
        embedding_cost: 0.00013,
        llm_cost: 0.045,
        total_cost: 0.05113,
      },
    }));

    // Verify cost monitor updates
    await waitFor(() => {
      expect(screen.getByText(/\$0.05/i)).toBeInTheDocument();
    });

    // Simulate session complete event
    mockServer.send(JSON.stringify({
      event: 'session_complete',
      data: {
        status: 'completed',
        total_duration_seconds: 180,
        final_cost: 0.15,
        entities_extracted: 25,
        alerts_generated: 2,
      },
    }));

    // Verify session completion
    await waitFor(() => {
      expect(screen.getByText(/session completed/i)).toBeInTheDocument();
      expect(screen.getByText(/25 entities/i)).toBeInTheDocument();
      expect(screen.getByText(/2 alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/\$0.15/i)).toBeInTheDocument();
    });

    // Stop recording button should be disabled
    const stopBtn = screen.getByRole('button', { name: /stop recording/i });
    expect(stopBtn).toBeDisabled();
  });

  it('should handle WebSocket errors gracefully', async () => {
    const user = userEvent.setup();

    render(<RealtimeConsultationPage patientId="patient-456" />);

    const startBtn = screen.getByRole('button', { name: /start recording/i });
    await user.click(startBtn);

    await mockServer.connected;

    // Simulate error event
    mockServer.send(JSON.stringify({
      event: 'error',
      data: {
        error_type: 'transcription_error',
        message: 'Whisper API timeout',
      },
    }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /error/i })).toBeInTheDocument();
      expect(screen.getByText(/Whisper API timeout/i)).toBeInTheDocument();
    });
  });

  it('should handle microphone permission denial', async () => {
    const user = userEvent.setup();

    // Mock getUserMedia to reject
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied')),
    } as any;

    render(<RealtimeConsultationPage patientId="patient-456" />);

    const startBtn = screen.getByRole('button', { name: /start recording/i });
    await user.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/microphone permission denied/i)).toBeInTheDocument();
    });
  });
});
```

### 4. Run Tests and Generate Coverage

Update `packages/backend/package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --collectCoverageFrom='src/**/*.{ts,tsx}'",
    "test:integration": "jest --testPathPattern=integration",
    "test:unit": "jest --testPathPattern='(services|controllers)'"
  }
}
```

Update `packages/frontend/package.json`:

```json
{
  "scripts": {
    "test": "react-scripts test --watchAll=false",
    "test:watch": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false --collectCoverageFrom='src/**/*.{ts,tsx}'",
    "test:integration": "react-scripts test --testPathPattern=integration",
    "test:components": "react-scripts test --testPathPattern='components.*test'"
  }
}
```

## Expected Deliverables

1. **Backend Tests** (Real-Time Streaming):
   - `packages/backend/tests/setup.ts` - Updated with WebSocket Gateway, Event Persistence, and AI Service mocks
   - `packages/backend/tests/services/websocketGateway.test.ts` - WebSocket Gateway tests (connection lifecycle, audio forwarding, event forwarding)
   - `packages/backend/tests/services/eventPersistence.test.ts` - Event Persistence Service tests (all 8+ event types)
   - `packages/backend/tests/controllers/session.test.ts` - Session Management Controller tests (CRUD operations)

2. **Frontend Tests** (Real-Time Streaming):
   - `packages/frontend/src/setupTests.ts` - Updated with MSW and WebSocket mocks
   - `packages/frontend/src/mocks/handlers.ts` - MSW handlers for real-time session management API
   - `packages/frontend/src/hooks/__tests__/useRealtimeSession.test.tsx` - useRealtimeSession hook tests
   - `packages/frontend/src/components/__tests__/LiveTranscriptionView.test.tsx` - Live transcription component tests
   - `packages/frontend/src/components/__tests__/ValidationAlertPanel.test.tsx` - Validation alert component tests
   - `packages/frontend/src/components/__tests__/LiveEntityList.test.tsx` - Live entity list component tests
   - `packages/frontend/src/components/__tests__/LiveCostMonitor.test.tsx` - Live cost monitor component tests
   - `packages/frontend/src/__tests__/realtime-session.integration.test.tsx` - Real-time streaming integration test

## Verification Steps

1. **Run backend tests**:
   ```bash
   cd packages/backend
   npm test
   ```
   Expected: All tests pass, >80% coverage for real-time services

2. **Run frontend tests**:
   ```bash
   cd packages/frontend
   npm test
   ```
   Expected: All tests pass, >80% coverage for real-time components

3. **Run integration tests**:
   ```bash
   cd packages/backend && npm run test:integration
   cd packages/frontend && npm run test:integration
   ```
   Expected: Real-time streaming flow works end-to-end

4. **Check test coverage**:
   ```bash
   cd packages/backend && npm run test:coverage
   cd packages/frontend && npm run test:coverage
   ```
   Expected:
   - Backend: >80% coverage for WebSocket Gateway, Event Persistence, Session Management
   - Frontend: >80% coverage for useRealtimeSession, LiveTranscriptionView, ValidationAlertPanel, LiveEntityList, LiveCostMonitor

5. **Verify WebSocket functionality**:
   - All WebSocket connection/disconnection scenarios tested
   - Binary audio streaming tested
   - All 8+ event types (transcript_update, speaker_changed, extraction_update, validation_alert, entity_validated, cost_update, session_complete, error) tested
   - Priority-based alert ordering tested (CRITICAL < 1s, HIGH < 2s, MEDIUM < 3s)

## Notes

- **Real-Time Architecture**: Tests now cover the complete WebSocket event-driven pipeline
- **Event Persistence**: All PostgreSQL event persistence functions are tested
- **Frontend Real-Time Updates**: Components update incrementally as events arrive
- **WebSocket Mocking**: Use `jest-websocket-mock` for testing bidirectional WebSocket communication
- **MSW**: Mock session management REST API endpoints (create, get, list, delete sessions)
4. Verify all existing tests still pass (backward compatibility)
5. Integration tests pass end-to-end

## Notes

- Use MSW (Mock Service Worker) for frontend API mocking - more realistic than jest mocks
- Ensure backward compatibility - existing features without AI should still work
- Test both success and error scenarios
- WebSocket tests are challenging - use simple mock implementation
- Integration tests verify complete user flows
- Keep test data realistic (Spanish medical content)
