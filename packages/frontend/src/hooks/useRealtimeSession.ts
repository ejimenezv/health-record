import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { aiSessionApi, CreateAiSessionRequest } from '../services/aiSession.api';
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

export interface RealtimeEntity {
  id: string;
  type: string;
  content: string;
  confidence: number;
  speaker?: string;
  timestamp: number;
  validationStatus?: 'approved' | 'flagged' | 'needs_review';
  metadata?: Record<string, unknown>;
}

export interface RealtimeAlert {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  relatedEntities: string[];
  recommendedAction?: string;
  requiresImmediateAttention: boolean;
  acknowledged: boolean;
}

export interface RealtimeTranscriptChunk {
  chunkIndex: number;
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface RealtimeCurrentSpeaker {
  id: string;
  role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
  confidence: number;
}

export interface RealtimeCost {
  transcriptionCostUsd: number;
  extractionCostUsd: number;
  totalCostUsd: number;
  chunksProcessed: number;
  cacheHitRate: number;
}

export interface FinalCostSummary {
  transcription_cost_usd: number;
  extraction_cost_usd: number;
  total_cost_usd: number;
  audio_duration_seconds: number;
}

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'error';

interface SessionState {
  status: RealtimeStatus;
  sessionId: string | null;
  websocketUrl: string | null;
  transcriptChunks: RealtimeTranscriptChunk[];
  currentSpeaker: RealtimeCurrentSpeaker | null;
  entities: RealtimeEntity[];
  alerts: RealtimeAlert[];
  cost: RealtimeCost;
  finalTranscript: string | null;
  finalCostSummary: FinalCostSummary | null;
  error: string | null;
}

export interface UseRealtimeSessionReturn extends SessionState {
  createSession: (params: CreateAiSessionRequest) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  finalizeSession: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  disconnect: () => void;
}

const INITIAL_STATE: SessionState = {
  status: 'idle',
  sessionId: null,
  websocketUrl: null,
  transcriptChunks: [],
  currentSpeaker: null,
  entities: [],
  alerts: [],
  cost: {
    transcriptionCostUsd: 0,
    extractionCostUsd: 0,
    totalCostUsd: 0,
    chunksProcessed: 0,
    cacheHitRate: 0,
  },
  finalTranscript: null,
  finalCostSummary: null,
  error: null,
};

// Resolve WebSocket origin from VITE_WS_URL (e.g. "http://localhost:3001"),
// falling back to the page origin. The Node gateway exposes /ws/session/:id.
function resolveWsBase(): string {
  const raw = import.meta.env.VITE_WS_URL || window.location.origin;
  try {
    const url = new URL(raw);
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${url.host}`;
  } catch {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
}

function playAlertSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio is best-effort; ignore failures.
  }
}

export function useRealtimeSession(): UseRealtimeSessionReturn {
  const { token } = useAuthStore();
  const [state, setState] = useState<SessionState>(INITIAL_STATE);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    switch (event.event) {
      case 'transcript_update': {
        const e = event as WSTranscriptUpdateEvent;
        setState((prev) => ({
          ...prev,
          transcriptChunks: [
            ...prev.transcriptChunks,
            {
              chunkIndex: e.data.chunk_index,
              text: e.data.text,
              isFinal: e.data.is_final,
              confidence: e.data.confidence,
            },
          ],
        }));
        break;
      }
      case 'speaker_changed': {
        const e = event as WSSpeakerChangedEvent;
        setState((prev) => ({
          ...prev,
          currentSpeaker: {
            id: e.data.speaker_id,
            role: e.data.role,
            confidence: e.data.confidence,
          },
        }));
        break;
      }
      case 'extraction_update': {
        const e = event as WSExtractionUpdateEvent;
        setState((prev) => ({
          ...prev,
          entities: [
            ...prev.entities,
            {
              id: e.data.entity.id,
              type: e.data.entity_type,
              content: e.data.entity.content,
              confidence: e.data.entity.confidence,
              speaker: e.data.entity.speaker,
              timestamp: e.data.entity.timestamp,
              metadata: e.data.entity.metadata,
            },
          ],
        }));
        break;
      }
      case 'validation_alert': {
        const e = event as WSValidationAlertEvent;
        const alert: RealtimeAlert = {
          id: e.data.alert_id,
          type: e.data.type,
          severity: e.data.severity,
          message: e.data.message,
          relatedEntities: e.data.related_entities,
          recommendedAction: e.data.recommended_action,
          requiresImmediateAttention: e.data.requires_immediate_attention,
          acknowledged: false,
        };
        setState((prev) => ({ ...prev, alerts: [...prev.alerts, alert] }));
        if (e.data.severity === 'CRITICAL') {
          playAlertSound();
        }
        break;
      }
      case 'entity_validated': {
        const e = event as WSEntityValidatedEvent;
        setState((prev) => ({
          ...prev,
          entities: prev.entities.map((entity) =>
            entity.id === e.data.entity_id
              ? { ...entity, validationStatus: e.data.validation_status }
              : entity
          ),
        }));
        break;
      }
      case 'cost_update': {
        const e = event as WSCostUpdateEvent;
        setState((prev) => ({
          ...prev,
          cost: {
            transcriptionCostUsd: e.data.transcription_cost_usd,
            extractionCostUsd: e.data.extraction_cost_usd,
            totalCostUsd: e.data.total_cost_usd,
            chunksProcessed: e.data.chunks_processed,
            cacheHitRate: e.data.cache_hit_rate,
          },
        }));
        break;
      }
      case 'session_complete': {
        const e = event as WSSessionCompleteEvent;
        setState((prev) => ({
          ...prev,
          status: 'completed',
          finalTranscript: e.data.final_transcript,
          finalCostSummary: e.data.final_cost_summary,
        }));
        break;
      }
      case 'error': {
        const e = event as WSErrorEvent;
        setState((prev) => ({
          ...prev,
          status: e.data.recoverable ? prev.status : 'error',
          error: e.data.message,
        }));
        break;
      }
    }
  }, []);

  const connectWebSocket = useCallback(
    (sessionId: string) =>
      new Promise<void>((resolve, reject) => {
        const base = resolveWsBase();
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const ws = new WebSocket(`${base}/ws/session/${sessionId}${tokenParam}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setState((prev) => ({ ...prev, status: 'recording' }));
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const wsEvent: WebSocketEvent = JSON.parse(event.data);
            handleWebSocketEvent(wsEvent);
          } catch {
            // Ignore malformed frames.
          }
        };

        ws.onerror = () => {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: 'Error de conexion WebSocket',
          }));
          reject(new Error('WebSocket connection error'));
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      }),
    [token, handleWebSocketEvent]
  );

  const createSession = useCallback(
    async (params: CreateAiSessionRequest) => {
      try {
        setState({ ...INITIAL_STATE, status: 'connecting' });
        const data = await aiSessionApi.createSession(params);
        setState((prev) => ({
          ...prev,
          sessionId: data.sessionId,
          websocketUrl: data.websocketUrl,
        }));
        await connectWebSocket(data.sessionId);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
        }));
      }
    },
    [connectWebSocket]
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      // 5s timeslice aligns with StreamProcessor.VOICE_CHUNK_INTERVAL_MS and
      // ensures each chunk falls on a webm cluster boundary so ffmpeg can
      // decode it after the gateway prepends the cached init segment.
      mediaRecorder.start(5000);
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'No se pudo acceder al microfono',
      }));
    }
  }, []);

  const stopRecording = useCallback(
    async (opts?: { flushPending?: boolean }): Promise<void> => {
      // MediaRecorder.stop() is async — it fires one final
      // `dataavailable` (with whatever audio has accumulated since the
      // last timeslice) and then a `stop` event. If we return
      // synchronously, the last blob may still be in flight and
      // finalize will race ahead of it. Await the `stop` event so the
      // caller can be sure all audio has been queued onto the WebSocket
      // before triggering server-side finalize.
      const recorder = mediaRecorderRef.current;
      const wasRecording = recorder && recorder.state !== 'inactive';
      mediaRecorderRef.current = null;
      if (wasRecording) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          recorder!.addEventListener('stop', done, { once: true });
          recorder!.stop();
        });
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      // Pause-only flush: ask the server to transcribe the audio tail
      // since the last 5 s slice boundary. Without this, a few seconds
      // of speech right before the click stay buffered and would be
      // wiped by the next reset_audio_buffer (on resume) — losing
      // potentially clinically relevant words. finalizeSession passes
      // flushPending:false because it sends {type:'finalize'} itself,
      // which flushes AND terminates.
      const shouldFlush = opts?.flushPending !== false;
      const ws = wsRef.current;
      if (shouldFlush && wasRecording && ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'flush_pending' }));
        } catch {
          /* best-effort */
        }
      }
      setState((prev) =>
        prev.status === 'recording' && wasRecording
          ? { ...prev, status: 'paused' }
          : prev
      );
    },
    []
  );

  const resumeRecording = useCallback(async (): Promise<void> => {
    // The server's session_audio buffer holds bytes from the prior
    // MediaRecorder. A new MediaRecorder will emit a fresh EBML/Tracks
    // header; concatenating the two yields an invalid webm stream that
    // ffmpeg can't decode. Tell the server to reset its audio buffer
    // before we start the new recorder so it treats the next bytes as
    // a fresh stream. Already-emitted transcript fragments are kept.
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'reset_audio_buffer' }));
      } catch {
        /* best-effort */
      }
    }
    try {
      await startRecording();
      // ws.onopen normally flips status to 'recording', but on resume
      // the WS is already open from the prior session — onopen won't
      // fire again. Set status explicitly so the UI swaps back to the
      // GRABANDO indicator + Detener / Finalizar buttons.
      setState((prev) => ({ ...prev, status: 'recording' }));
    } catch (error) {
      // Leave status at 'paused' so the user can retry, but surface
      // the error.
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo reanudar la grabacion',
      }));
      throw error;
    }
  }, [startRecording]);

  const finalizeSession = useCallback(async () => {
    const sessionId = state.sessionId;
    if (!sessionId) return;
    try {
      setState((prev) => ({ ...prev, status: 'processing' }));
      // Order matters:
      //   1. await stopRecording — last MediaRecorder blob is queued onto WS.
      //   2. send WS {type:'finalize'} — server flushes remaining audio,
      //      runs the extractor on the tail, emits session_complete.
      //   3. wait briefly for session_complete (or for WS to close).
      //   4. call REST finalize — terminates the upstream session, returns
      //      persisted state.
      // flushPending:false — finalize sends {type:'finalize'} below
      // which both flushes the tail AND terminates the session. A
      // duplicate flush_pending would just waste a Whisper call.
      await stopRecording({ flushPending: false });
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'finalize' }));
        } catch {
          // Best-effort; REST close still happens below.
        }
        await new Promise<void>((resolve) => {
          // Server-side finalize: flush tail (Whisper ~2s) + extractor
          // gather (~3s) + validation drain (up to ~12s) + emit
          // session_complete. Cap our wait at 20s so the user isn't
          // stuck forever if something hangs upstream.
          const timer = setTimeout(resolve, 20000);
          const done = () => {
            clearTimeout(timer);
            resolve();
          };
          ws.addEventListener('close', done, { once: true });
          // session_complete handler in handleWebSocketEvent flips status
          // to 'completed'. Resolve as soon as that happens too.
          const poll = setInterval(() => {
            if (state.status === 'completed') {
              clearInterval(poll);
              done();
            }
          }, 100);
        });
      }
      const result = await aiSessionApi.finalizeSession(sessionId);
      // If session_complete already arrived via WS, that handler already marked
      // status 'completed' — don't overwrite. Otherwise use the REST result as
      // the completion source of truth.
      setState((prev) =>
        prev.status === 'completed'
          ? prev
          : {
              ...prev,
              status: 'completed',
              finalTranscript: result.finalTranscript ?? prev.finalTranscript,
              finalCostSummary: prev.finalCostSummary ?? {
                transcription_cost_usd: 0,
                extraction_cost_usd: 0,
                total_cost_usd: result.totalCostUsd,
                audio_duration_seconds: result.audioDurationSeconds,
              },
            }
      );
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [state.sessionId, stopRecording]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await aiSessionApi.acknowledgeAlert(alertId);
      setState((prev) => ({
        ...prev,
        alerts: prev.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ),
      }));
    } catch {
      // Surface as error but keep session alive.
      setState((prev) => ({
        ...prev,
        error: 'No se pudo reconocer la alerta',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    stopRecording();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    createSession,
    startRecording,
    stopRecording,
    resumeRecording,
    finalizeSession,
    acknowledgeAlert,
    disconnect,
  };
}
