import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../../src/services/aiSession.api', () => ({
  aiSessionApi: {
    createSession: vi.fn(),
    finalizeSession: vi.fn(),
    acknowledgeAlert: vi.fn(),
    getSessionEvents: vi.fn(),
  },
}));

vi.mock('../../../src/store/auth.store', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

import { useRealtimeSession } from '../../../src/hooks/useRealtimeSession';
import { aiSessionApi } from '../../../src/services/aiSession.api';

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    });
  }

  emit(event: object) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
}

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
  });
  stream: { getTracks: () => Array<{ stop: () => void }> };

  constructor(stream: MockMediaRecorder['stream']) {
    this.stream = stream;
    MockMediaRecorder.instances.push(this);
  }
}

const mockStream = { getTracks: () => [{ stop: vi.fn() }] };

beforeEach(() => {
  MockWebSocket.instances = [];
  MockMediaRecorder.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    writable: true,
    configurable: true,
  });
  vi.stubGlobal(
    'AudioContext',
    vi.fn().mockImplementation(() => ({
      createOscillator: () => ({
        connect: vi.fn(),
        frequency: { value: 0 },
        type: '',
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createGain: () => ({ connect: vi.fn(), gain: { value: 0 } }),
      destination: {},
      currentTime: 0,
    }))
  );
  vi.mocked(aiSessionApi.createSession).mockResolvedValue({
    id: 'row-1',
    sessionId: 'sess-1',
    websocketUrl: '/ws/session/sess-1',
    status: 'created',
    createdAt: new Date().toISOString(),
  });
  vi.mocked(aiSessionApi.finalizeSession).mockResolvedValue({
    sessionId: 'sess-1',
    totalCostUsd: 0,
    audioDurationSeconds: 0,
    events: [],
  });
  vi.mocked(aiSessionApi.acknowledgeAlert).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function createSessionAndOpen() {
  const hook = renderHook(() => useRealtimeSession());
  await act(async () => {
    await hook.result.current.createSession({ patientId: 'p-1' });
  });
  expect(MockWebSocket.instances).toHaveLength(1);
  return hook;
}

describe('useRealtimeSession', () => {
  it('starts idle with empty state', () => {
    const { result } = renderHook(() => useRealtimeSession());
    expect(result.current.status).toBe('idle');
    expect(result.current.sessionId).toBeNull();
    expect(result.current.transcriptChunks).toEqual([]);
    expect(result.current.entities).toEqual([]);
    expect(result.current.alerts).toEqual([]);
  });

  it('createSession calls API, opens WebSocket with token, and transitions to recording', async () => {
    const { result } = await createSessionAndOpen();
    expect(aiSessionApi.createSession).toHaveBeenCalledWith({ patientId: 'p-1' });
    expect(result.current.sessionId).toBe('sess-1');
    expect(result.current.status).toBe('recording');
    expect(MockWebSocket.instances[0]!.url).toContain('/ws/session/sess-1');
    expect(MockWebSocket.instances[0]!.url).toContain('token=test-token');
  });

  it('createSession failure sets error status', async () => {
    vi.mocked(aiSessionApi.createSession).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useRealtimeSession());
    await act(async () => {
      await result.current.createSession({ patientId: 'p-1' });
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('boom');
  });

  it('appends transcript chunks from transcript_update events', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'transcript_update',
        session_id: 'sess-1',
        timestamp: 't',
        data: { chunk_index: 0, text: 'hola', is_final: true, language: 'es', confidence: 0.9 },
      });
    });
    expect(result.current.transcriptChunks).toHaveLength(1);
    expect(result.current.transcriptChunks[0]).toMatchObject({
      chunkIndex: 0,
      text: 'hola',
      isFinal: true,
      confidence: 0.9,
    });
  });

  it('updates currentSpeaker on speaker_changed', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'speaker_changed',
        session_id: 'sess-1',
        timestamp: 't',
        data: { speaker_id: 's1', role: 'DOCTOR', confidence: 0.8, start_time: 0 },
      });
    });
    expect(result.current.currentSpeaker).toEqual({
      id: 's1',
      role: 'DOCTOR',
      confidence: 0.8,
    });
  });

  it('appends entities and updates validation status on entity_validated', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'extraction_update',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          entity_type: 'symptom',
          chunk_index: 0,
          entity: { id: 'e-1', content: 'fiebre', confidence: 0.9, timestamp: 1 },
        },
      });
    });
    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0]!.id).toBe('e-1');

    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'entity_validated',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          entity_id: 'e-1',
          entity_type: 'symptom',
          validation_status: 'approved',
          confidence_score: 0.95,
        },
      });
    });
    expect(result.current.entities[0]!.validationStatus).toBe('approved');
  });

  it('appends alerts and plays sound on CRITICAL severity', async () => {
    const audioCtor = vi.mocked(globalThis.AudioContext as unknown as ReturnType<typeof vi.fn>);
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'validation_alert',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          alert_id: 'a-1',
          type: 'drug_interaction',
          severity: 'CRITICAL',
          message: 'peligro',
          related_entities: [],
          requires_immediate_attention: true,
        },
      });
    });
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]!.severity).toBe('CRITICAL');
    expect(audioCtor).toHaveBeenCalled();
  });

  it('updates cost from cost_update events', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'cost_update',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          transcription_cost_usd: 0.01,
          extraction_cost_usd: 0.02,
          total_cost_usd: 0.03,
          chunks_processed: 5,
          cache_hit_rate: 0.4,
        },
      });
    });
    expect(result.current.cost.totalCostUsd).toBe(0.03);
    expect(result.current.cost.chunksProcessed).toBe(5);
  });

  it('marks status completed and stores final transcript on session_complete', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'session_complete',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          status: 'success',
          final_transcript: 'transcripcion final',
          total_chunks: 10,
          total_entities: 3,
          total_alerts: 1,
          processing_time_ms: 1234,
          final_cost_summary: {
            transcription_cost_usd: 0.1,
            extraction_cost_usd: 0.2,
            total_cost_usd: 0.3,
            audio_duration_seconds: 60,
          },
        },
      });
    });
    expect(result.current.status).toBe('completed');
    expect(result.current.finalTranscript).toBe('transcripcion final');
    expect(result.current.finalCostSummary?.total_cost_usd).toBe(0.3);
  });

  it('non-recoverable error event sets status error; recoverable keeps status', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'error',
        session_id: 'sess-1',
        timestamp: 't',
        data: { error_code: 'X', message: 'minor', recoverable: true },
      });
    });
    expect(result.current.status).toBe('recording');
    expect(result.current.error).toBe('minor');

    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'error',
        session_id: 'sess-1',
        timestamp: 't',
        data: { error_code: 'Y', message: 'fatal', recoverable: false },
      });
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('fatal');
  });

  it('startRecording wires MediaRecorder to send blobs over WebSocket', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      await result.current.startRecording();
    });
    const recorder = MockMediaRecorder.instances[0]!;
    expect(recorder.start).toHaveBeenCalledWith(20);

    const blob = new Blob(['x'], { type: 'audio/webm' });
    Object.defineProperty(blob, 'size', { value: 10 });
    act(() => {
      recorder.ondataavailable?.({ data: blob });
    });
    expect(MockWebSocket.instances[0]!.send).toHaveBeenCalledWith(blob);
  });

  it('startRecording sets error if microphone access fails', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    });
    const { result } = await createSessionAndOpen();
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('microfono');
  });

  it('finalizeSession calls API and uses REST result to mark session completed', async () => {
    vi.mocked(aiSessionApi.finalizeSession).mockResolvedValueOnce({
      sessionId: 'sess-1',
      finalTranscript: 'transcripcion final',
      totalCostUsd: 0.42,
      audioDurationSeconds: 90,
      events: [],
    });
    const { result } = await createSessionAndOpen();
    await act(async () => {
      await result.current.finalizeSession();
    });
    expect(aiSessionApi.finalizeSession).toHaveBeenCalledWith('sess-1');
    expect(result.current.status).toBe('completed');
    expect(result.current.finalTranscript).toBe('transcripcion final');
    expect(result.current.finalCostSummary?.total_cost_usd).toBe(0.42);
  });

  it('finalizeSession does not overwrite a session_complete WS event that already arrived', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'session_complete',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          status: 'success',
          final_transcript: 'desde ws',
          total_chunks: 1,
          total_entities: 0,
          total_alerts: 0,
          processing_time_ms: 1,
          final_cost_summary: {
            transcription_cost_usd: 0.1,
            extraction_cost_usd: 0.2,
            total_cost_usd: 0.3,
            audio_duration_seconds: 30,
          },
        },
      });
    });
    await act(async () => {
      await result.current.finalizeSession();
    });
    expect(result.current.status).toBe('completed');
    expect(result.current.finalTranscript).toBe('desde ws');
    expect(result.current.finalCostSummary?.total_cost_usd).toBe(0.3);
  });

  it('acknowledgeAlert calls API and marks alert acknowledged', async () => {
    const { result } = await createSessionAndOpen();
    await act(async () => {
      MockWebSocket.instances[0]!.emit({
        event: 'validation_alert',
        session_id: 'sess-1',
        timestamp: 't',
        data: {
          alert_id: 'a-1',
          type: 'drug_interaction',
          severity: 'HIGH',
          message: 'm',
          related_entities: [],
          requires_immediate_attention: false,
        },
      });
    });
    await act(async () => {
      await result.current.acknowledgeAlert('a-1');
    });
    expect(aiSessionApi.acknowledgeAlert).toHaveBeenCalledWith('a-1');
    expect(result.current.alerts[0]!.acknowledged).toBe(true);
  });

  it('disconnect closes the WebSocket', async () => {
    const { result } = await createSessionAndOpen();
    const ws = MockWebSocket.instances[0]!;
    act(() => {
      result.current.disconnect();
    });
    expect(ws.close).toHaveBeenCalled();
  });
});
