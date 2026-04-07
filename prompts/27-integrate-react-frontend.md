# Prompt 27: Integrate React Frontend with AI Services

## Objective
Integrate the existing React frontend with the **real-time streaming AI pipeline** through the Node.js WebSocket gateway (Prompt 26), providing live transcription, incremental entity extraction, real-time validation alerts, speaker diarization visualization, and cost monitoring.

## Context
The React frontend supports **dual modes** for consultations:

### Real-Time Streaming Mode (PRIMARY)
Uses WebSocket bidirectional streaming for live audio processing:
1. **Create Session** → Connect to WebSocket → **Stream Audio** (binary Opus chunks)
2. **Receive Events** incrementally: transcript_update, speaker_changed, extraction_update, validation_alert, entity_validated, cost_update
3. **Finalize Session** → Receive session_complete event
4. **Display Everything Live** as events arrive

### Batch Processing Mode (LEGACY)
Traditional upload → process → results pattern (backward compatibility only)

### Key Features for Real-Time Mode
- **Live Transcription Display**: Show text as it's transcribed (~2s latency)
- **Incremental Entity Extraction**: Display entities (symptoms, diagnoses, prescriptions) as they're extracted
- **Real-Time Validation Alerts**: CRITICAL alerts <1s, HIGH <2s, MEDIUM <3s with visual/audio indicators
- **Speaker Diarization Visualization**: Visual indicator showing who's speaking (DOCTOR/PATIENT)
- **Live Cost Monitoring**: Updates every ~5 chunks processed
- **Binary Audio Streaming**: Record audio → encode as Opus → stream ~20ms frames via WebSocket
- **Performance**: End-to-end latency <2s from speech to UI update

### Architecture Flow
```
React Frontend (THIS PROMPT)
  ↓ Record audio (MediaRecorder API)
  ↓ Encode as Opus codec binary chunks (~20ms frames)
  ↓ Stream via WebSocket to /ws/session/:sessionId
Node.js Gateway (Prompt 26)
  ↓ Forward binary audio to Python
Python AI Service (Prompt 25)
  ↓ Emit events: transcript_update, speaker_changed, extraction_update, etc.
  ↑ Events flow back through Node.js
React Frontend
  ↑ Display updates incrementally in UI
```

## Tasks

## WebSocket Event Types (from Prompt 26)

```typescript
// frontend/src/types/websocketEvents.ts

export interface BaseEvent {
  event: string;
  session_id: string;
  timestamp: string;
}

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

export interface WSSpeakerChangedEvent extends BaseEvent {
  event: 'speaker_changed';
  data: {
    speaker_id: string;
    role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
    confidence: number;
    start_time: number;
  };
}

export interface WSExtractionUpdateEvent extends BaseEvent {
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

export interface WSValidationAlertEvent extends BaseEvent {
  event: 'validation_alert';
  data: {
    alert_id: string;
    type: 'drug_interaction' | 'allergy_conflict' | 'dosage_error' | 'contraindication' | 'missing_info';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    related_entities: string[];
    recommended_action?: string;
    requires_immediate_attention: boolean;
  };
}

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

export interface WSErrorEvent extends BaseEvent {
  event: 'error';
  data: {
    error_code: string;
    message: string;
    details?: Record<string, any>;
    recoverable: boolean;
  };
}

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

### 1. Create Real-Time Session Hook

Create `frontend/src/hooks/useRealtimeSession.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
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

interface Entity {
  id: string;
  type: string;
  content: string;
  confidence: number;
  speaker?: string;
  timestamp: number;
  validationStatus?: 'approved' | 'flagged' | 'needs_review';
  metadata?: Record<string, any>;
}

interface ValidationAlert {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  relatedEntities: string[];
  recommendedAction?: string;
  requiresImmediateAttention: boolean;
  acknowledged: boolean;
}

interface TranscriptChunk {
  chunkIndex: number;
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface SessionState {
  status: 'idle' | 'connecting' | 'recording' | 'processing' | 'completed' | 'error';
  sessionId: string | null;
  websocketUrl: string | null;

  // Transcription state
  transcriptChunks: TranscriptChunk[];
  currentSpeaker: { id: string; role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN'; confidence: number } | null;

  // Extraction state
  entities: Entity[];

  // Validation state
  alerts: ValidationAlert[];

  // Cost state
  cost: {
    transcriptionCostUsd: number;
    extractionCostUsd: number;
    totalCostUsd: number;
    chunksProcessed: number;
    cacheHitRate: number;
  };

  // Final results (on session complete)
  finalTranscript: string | null;
  finalCostSummary: any | null;

  // Error state
  error: string | null;
}

interface UseRealtimeSessionReturn extends SessionState {
  createSession: (patientId: string, appointmentType: string, language?: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  finalizeSession: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  disconnect: () => void;
}

export function useRealtimeSession(): UseRealtimeSessionReturn {
  const { token } = useAuth();
  const [state, setState] = useState<SessionState>({
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
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Create session and get WebSocket URL
  const createSession = useCallback(
    async (patientId: string, appointmentType: string, language: string = 'es') => {
      try {
        setState(prev => ({ ...prev, status: 'connecting', error: null }));

        const response = await fetch('/api/consultations/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ patientId, appointmentType, language }),
        });

        if (!response.ok) {
          throw new Error('Failed to create session');
        }

        const data = await response.json();

        setState(prev => ({
          ...prev,
          sessionId: data.sessionId,
          websocketUrl: data.websocketUrl,
        }));

        // Connect to WebSocket
        await connectWebSocket(data.sessionId);
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [token]
  );

  // Connect to WebSocket gateway
  const connectWebSocket = useCallback(
    async (sessionId: string) => {
      return new Promise<void>((resolve, reject) => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/session/${sessionId}?token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setState(prev => ({ ...prev, status: 'recording' }));
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const wsEvent: WebSocketEvent = JSON.parse(event.data);
            handleWebSocketEvent(wsEvent);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setState(prev => ({
            ...prev,
            status: 'error',
            error: 'WebSocket connection error',
          }));
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          wsRef.current = null;
        };
      });
    },
    [token]
  );

  // Handle incoming WebSocket events
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    switch (event.event) {
      case 'transcript_update':
        handleTranscriptUpdate(event as WSTranscriptUpdateEvent);
        break;
      case 'speaker_changed':
        handleSpeakerChanged(event as WSSpeakerChangedEvent);
        break;
      case 'extraction_update':
        handleExtractionUpdate(event as WSExtractionUpdateEvent);
        break;
      case 'validation_alert':
        handleValidationAlert(event as WSValidationAlertEvent);
        break;
      case 'entity_validated':
        handleEntityValidated(event as WSEntityValidatedEvent);
        break;
      case 'cost_update':
        handleCostUpdate(event as WSCostUpdateEvent);
        break;
      case 'session_complete':
        handleSessionComplete(event as WSSessionCompleteEvent);
        break;
      case 'error':
        handleError(event as WSErrorEvent);
        break;
    }
  }, []);

  const handleTranscriptUpdate = useCallback((event: WSTranscriptUpdateEvent) => {
    setState(prev => ({
      ...prev,
      transcriptChunks: [
        ...prev.transcriptChunks,
        {
          chunkIndex: event.data.chunk_index,
          text: event.data.text,
          isFinal: event.data.is_final,
          confidence: event.data.confidence,
        },
      ],
    }));
  }, []);

  const handleSpeakerChanged = useCallback((event: WSSpeakerChangedEvent) => {
    setState(prev => ({
      ...prev,
      currentSpeaker: {
        id: event.data.speaker_id,
        role: event.data.role,
        confidence: event.data.confidence,
      },
    }));
  }, []);

  const handleExtractionUpdate = useCallback((event: WSExtractionUpdateEvent) => {
    setState(prev => ({
      ...prev,
      entities: [
        ...prev.entities,
        {
          id: event.data.entity.id,
          type: event.data.entity_type,
          content: event.data.entity.content,
          confidence: event.data.entity.confidence,
          speaker: event.data.entity.speaker,
          timestamp: event.data.entity.timestamp,
          metadata: event.data.entity.metadata,
        },
      ],
    }));
  }, []);

  const handleValidationAlert = useCallback((event: WSValidationAlertEvent) => {
    const alert: ValidationAlert = {
      id: event.data.alert_id,
      type: event.data.type,
      severity: event.data.severity,
      message: event.data.message,
      relatedEntities: event.data.related_entities,
      recommendedAction: event.data.recommended_action,
      requiresImmediateAttention: event.data.requires_immediate_attention,
      acknowledged: false,
    };

    setState(prev => ({
      ...prev,
      alerts: [...prev.alerts, alert],
    }));

    // Play alert sound for CRITICAL alerts
    if (event.data.severity === 'CRITICAL') {
      playAlertSound();
    }
  }, []);

  const handleEntityValidated = useCallback((event: WSEntityValidatedEvent) => {
    setState(prev => ({
      ...prev,
      entities: prev.entities.map(entity =>
        entity.id === event.data.entity_id
          ? { ...entity, validationStatus: event.data.validation_status }
          : entity
      ),
    }));
  }, []);

  const handleCostUpdate = useCallback((event: WSCostUpdateEvent) => {
    setState(prev => ({
      ...prev,
      cost: {
        transcriptionCostUsd: event.data.transcription_cost_usd,
        extractionCostUsd: event.data.extraction_cost_usd,
        totalCostUsd: event.data.total_cost_usd,
        chunksProcessed: event.data.chunks_processed,
        cacheHitRate: event.data.cache_hit_rate,
      },
    }));
  }, []);

  const handleSessionComplete = useCallback((event: WSSessionCompleteEvent) => {
    setState(prev => ({
      ...prev,
      status: 'completed',
      finalTranscript: event.data.final_transcript,
      finalCostSummary: event.data.final_cost_summary,
    }));
  }, []);

  const handleError = useCallback((event: WSErrorEvent) => {
    setState(prev => ({
      ...prev,
      status: event.data.recoverable ? prev.status : 'error',
      error: event.data.message,
    }));
  }, []);

  // Start recording audio and stream to WebSocket
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use Opus codec for efficient streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Stream binary audio chunks to WebSocket
          wsRef.current.send(event.data);
        }
      };

      // Record in 20ms chunks for low latency
      mediaRecorder.start(20);
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to access microphone',
      }));
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
  }, []);

  // Finalize session
  const finalizeSession = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      setState(prev => ({ ...prev, status: 'processing' }));

      const response = await fetch(`/api/consultations/sessions/${state.sessionId}/finalize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to finalize session');
      }

      // Session complete event will be received via WebSocket
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [state.sessionId, token]);

  // Acknowledge validation alert
  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      try {
        const response = await fetch(`/api/consultations/alerts/${alertId}/acknowledge`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to acknowledge alert');
        }

        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          ),
        }));
      } catch (error) {
        console.error('Error acknowledging alert:', error);
      }
    },
    [token]
  );

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    stopRecording();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [stopRecording]);

  // Cleanup on unmount
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
    finalizeSession,
    acknowledgeAlert,
    disconnect,
  };
}

// Helper function to play alert sound
function playAlertSound() {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.value = 0.3;

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}
```

### 2. Create Live Transcription Component

Create `frontend/src/components/transcription/LiveTranscriptionView.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';

interface LiveTranscriptionViewProps {
  transcriptChunks: Array<{
    chunkIndex: number;
    text: string;
    isFinal: boolean;
    confidence: number;
  }>;
  currentSpeaker: {
    id: string;
    role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
    confidence: number;
  } | null;
  autoScroll?: boolean;
}

export const LiveTranscriptionView: React.FC<LiveTranscriptionViewProps> = ({
  transcriptChunks,
  currentSpeaker,
  autoScroll = true,
}) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptChunks, autoScroll]);

  const getSpeakerIcon = (role: string) => {
    switch (role) {
      case 'DOCTOR':
        return '👨‍⚕️';
      case 'PATIENT':
        return '👤';
      default:
        return '❓';
    }
  };

  const getSpeakerLabel = (role: string) => {
    switch (role) {
      case 'DOCTOR':
        return 'Doctor';
      case 'PATIENT':
        return 'Paciente';
      default:
        return 'Desconocido';
    }
  };

  return (
    <div className="live-transcription-view">
      <div className="transcription-header">
        <h3>Transcripción en Vivo</h3>
        {currentSpeaker && (
          <div className={`current-speaker speaker-${currentSpeaker.role.toLowerCase()}`}>
            <span className="speaker-icon">{getSpeakerIcon(currentSpeaker.role)}</span>
            <span className="speaker-label">
              {getSpeakerLabel(currentSpeaker.role)}
            </span>
            <span className="confidence-badge">
              {(currentSpeaker.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      <div className="transcript-container">
        {transcriptChunks.map((chunk) => (
          <div
            key={chunk.chunkIndex}
            className={`transcript-chunk ${chunk.isFinal ? 'final' : 'interim'}`}
          >
            <span className="chunk-text">{chunk.text}</span>
            {!chunk.isFinal && <span className="typing-indicator">...</span>}
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      <div className="transcription-stats">
        <span>Fragmentos: {transcriptChunks.length}</span>
        <span>
          Palabras: {transcriptChunks.reduce((sum, c) => sum + c.text.split(' ').length, 0)}
        </span>
      </div>
    </div>
  );
};
```

### 3. Create Validation Alert Panel

Create `frontend/src/components/alerts/ValidationAlertPanel.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';

interface ValidationAlert {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  relatedEntities: string[];
  recommendedAction?: string;
  requiresImmediateAttention: boolean;
  acknowledged: boolean;
}

interface ValidationAlertPanelProps {
  alerts: ValidationAlert[];
  onAcknowledge: (alertId: string) => void;
}

export const ValidationAlertPanel: React.FC<ValidationAlertPanelProps> = ({
  alerts,
  onAcknowledge,
}) => {
  const lastAlertRef = useRef<string | null>(null);
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);

  // Play sound for new CRITICAL alerts
  useEffect(() => {
    const criticalAlerts = alerts.filter(
      a => a.severity === 'CRITICAL' && !a.acknowledged
    );
    if (criticalAlerts.length > 0) {
      const latestCritical = criticalAlerts[criticalAlerts.length - 1];
      if (latestCritical.id !== lastAlertRef.current) {
        lastAlertRef.current = latestCritical.id;
        // Visual notification (browser notification API could be used here)
        if (latestCritical.requiresImmediateAttention) {
          showBrowserNotification(latestCritical);
        }
      }
    }
  }, [alerts]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  const getSeverityClass = (severity: string) => {
    return `alert-severity-${severity.toLowerCase()}`;
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      drug_interaction: 'Interacción Medicamentosa',
      allergy_conflict: 'Conflicto de Alergias',
      dosage_error: 'Error de Dosificación',
      contraindication: 'Contraindicación',
      missing_info: 'Información Faltante',
    };
    return labels[type] || type;
  };

  // Group alerts by severity
  const groupedAlerts = alerts.reduce((groups, alert) => {
    if (!groups[alert.severity]) {
      groups[alert.severity] = [];
    }
    groups[alert.severity].push(alert);
    return groups;
  }, {} as Record<string, ValidationAlert[]>);

  const severityOrder: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
  ];

  return (
    <div className="validation-alert-panel">
      <div className="alert-panel-header">
        <h3>Alertas de Validación</h3>
        <div className="alert-summary">
          <span className="critical-count">
            {groupedAlerts.CRITICAL?.length || 0} Críticas
          </span>
          <span className="high-count">{groupedAlerts.HIGH?.length || 0} Altas</span>
          <span className="total-count">Total: {alerts.length}</span>
        </div>
      </div>

      <div className="alerts-container">
        {severityOrder.map(
          severity =>
            groupedAlerts[severity] && (
              <div key={severity} className="alerts-group">
                <h4 className={getSeverityClass(severity)}>
                  {getSeverityIcon(severity)} {severity}
                </h4>
                {groupedAlerts[severity].map(alert => (
                  <div
                    key={alert.id}
                    className={`alert-card ${getSeverityClass(alert.severity)} ${
                      alert.acknowledged ? 'acknowledged' : ''
                    }`}
                  >
                    <div className="alert-header">
                      <div className="alert-type">
                        {getSeverityIcon(alert.severity)} {getAlertTypeLabel(alert.type)}
                      </div>
                      {!alert.acknowledged && (
                        <button
                          className="acknowledge-btn"
                          onClick={() => onAcknowledge(alert.id)}
                        >
                          Reconocer
                        </button>
                      )}
                    </div>

                    <p className="alert-message">{alert.message}</p>

                    {alert.recommendedAction && (
                      <div className="recommended-action">
                        <strong>Acción Recomendada:</strong> {alert.recommendedAction}
                      </div>
                    )}

                    {alert.requiresImmediateAttention && (
                      <div className="immediate-attention-badge">
                        ⚡ Requiere Atención Inmediata
                      </div>
                    )}

                    {alert.relatedEntities.length > 0 && (
                      <div className="related-entities">
                        <small>Entidades relacionadas: {alert.relatedEntities.length}</small>
                      </div>
                    )}

                    {alert.acknowledged && (
                      <div className="acknowledged-badge">✓ Reconocida</div>
                    )}
                  </div>
                ))}
              </div>
            )
        )}

        {alerts.length === 0 && (
          <div className="no-alerts">
            <span className="no-alerts-icon">✅</span>
            <p>No hay alertas de validación</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to show browser notifications
function showBrowserNotification(alert: ValidationAlert) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Alerta Crítica de Validación', {
      body: alert.message,
      icon: '/alert-icon.png',
      tag: alert.id,
      requireInteraction: true,
    });
  }
}
```

### 4. Create Live Entity List Component

Create `frontend/src/components/extraction/LiveEntityList.tsx`:

```typescript
import React from 'react';

interface Entity {
  id: string;
  type: string;
  content: string;
  confidence: number;
  speaker?: string;
  timestamp: number;
  validationStatus?: 'approved' | 'flagged' | 'needs_review';
  metadata?: Record<string, any>;
}

interface LiveEntityListProps {
  entities: Entity[];
  showNewIndicator?: boolean;
}

export const LiveEntityList: React.FC<LiveEntityListProps> = ({
  entities,
  showNewIndicator = true,
}) => {
  const getEntityIcon = (type: string) => {
    const icons: Record<string, string> = {
      symptom: '🤒',
      diagnosis: '🏥',
      prescription: '💊',
      vital_sign: '📊',
      allergy: '⚠️',
      procedure: '🔬',
    };
    return icons[type] || '📝';
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      symptom: 'Síntoma',
      diagnosis: 'Diagnóstico',
      prescription: 'Prescripción',
      vital_sign: 'Signo Vital',
      allergy: 'Alergia',
      procedure: 'Procedimiento',
    };
    return labels[type] || type;
  };

  const getValidationClass = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'validation-approved';
      case 'flagged':
        return 'validation-flagged';
      case 'needs_review':
        return 'validation-needs-review';
      default:
        return 'validation-pending';
    }
  };

  const getValidationLabel = (status?: string) => {
    switch (status) {
      case 'approved':
        return '✓ Aprobada';
      case 'flagged':
        return '⚠ Marcada';
      case 'needs_review':
        return '📋 Revisar';
      default:
        return '⏳ Pendiente';
    }
  };

  // Group entities by type
  const groupedEntities = entities.reduce((groups, entity) => {
    if (!groups[entity.type]) {
      groups[entity.type] = [];
    }
    groups[entity.type].push(entity);
    return groups;
  }, {} as Record<string, Entity[]>);

  // Check if entity was added in last 3 seconds
  const isNew = (timestamp: number) => {
    return showNewIndicator && Date.now() - timestamp < 3000;
  };

  return (
    <div className="live-entity-list">
      <div className="entity-list-header">
        <h3>Entidades Extraídas</h3>
        <div className="entity-count-badge">{entities.length} total</div>
      </div>

      <div className="entities-container">
        {Object.entries(groupedEntities).map(([type, typeEntities]) => (
          <div key={type} className="entity-type-group">
            <h4 className="entity-type-header">
              <span className="entity-icon">{getEntityIcon(type)}</span>
              <span className="entity-type-label">{getEntityTypeLabel(type)}</span>
              <span className="entity-type-count">({typeEntities.length})</span>
            </h4>

            <div className="entity-cards">
              {typeEntities.map(entity => (
                <div
                  key={entity.id}
                  className={`entity-card ${getValidationClass(entity.validationStatus)} ${
                    isNew(entity.timestamp) ? 'new-entity' : ''
                  }`}
                >
                  <div className="entity-content">
                    <p className="entity-text">{entity.content}</p>
                    {entity.speaker && (
                      <span className="entity-speaker">👤 {entity.speaker}</span>
                    )}
                  </div>

                  <div className="entity-metadata">
                    <span className="confidence-badge">
                      {(entity.confidence * 100).toFixed(0)}% confianza
                    </span>
                    <span className={`validation-badge ${getValidationClass(entity.validationStatus)}`}>
                      {getValidationLabel(entity.validationStatus)}
                    </span>
                  </div>

                  {isNew(entity.timestamp) && (
                    <div className="new-entity-indicator">
                      <span className="new-pulse"></span>
                      NUEVO
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {entities.length === 0 && (
          <div className="no-entities">
            <span className="no-entities-icon">⏳</span>
            <p>Esperando extracción de entidades...</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 5. Create Live Cost Monitor Component

Create `frontend/src/components/costs/LiveCostMonitor.tsx`:

```typescript
import React from 'react';

interface LiveCostMonitorProps {
  cost: {
    transcriptionCostUsd: number;
    extractionCostUsd: number;
    totalCostUsd: number;
    chunksProcessed: number;
    cacheHitRate: number;
  };
  budgetLimit?: number;
}

export const LiveCostMonitor: React.FC<LiveCostMonitorProps> = ({
  cost,
  budgetLimit = 1.0, // $1.00 default budget limit per session
}) => {
  const budgetPercent = (cost.totalCostUsd / budgetLimit) * 100;
  const savingsFromCache = cost.extractionCostUsd * cost.cacheHitRate;

  const getBudgetColorClass = () => {
    if (budgetPercent >= 90) return 'budget-critical';
    if (budgetPercent >= 75) return 'budget-warning';
    return 'budget-good';
  };

  return (
    <div className="live-cost-monitor">
      <div className="cost-header">
        <h3>Monitor de Costos en Tiempo Real</h3>
        <div className={`total-cost ${getBudgetColorClass()}`}>
          ${cost.totalCostUsd.toFixed(4)}
        </div>
      </div>

      <div className="cost-breakdown">
        <div className="cost-item">
          <span className="cost-label">Transcripción</span>
          <span className="cost-value">${cost.transcriptionCostUsd.toFixed(4)}</span>
        </div>
        <div className="cost-item">
          <span className="cost-label">Extracción</span>
          <span className="cost-value">${cost.extractionCostUsd.toFixed(4)}</span>
        </div>
      </div>

      <div className="budget-progress">
        <div className="budget-label">
          <span>Presupuesto</span>
          <span>{budgetPercent.toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${getBudgetColorClass()}`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
        <div className="budget-remaining">
          ${(budgetLimit - cost.totalCostUsd).toFixed(4)} restante
        </div>
      </div>

      <div className="optimization-stats">
        <div className="stat-item">
          <span className="stat-icon">🔄</span>
          <span className="stat-label">Fragmentos procesados</span>
          <span className="stat-value">{cost.chunksProcessed}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">💾</span>
          <span className="stat-label">Tasa de caché</span>
          <span className="stat-value">{(cost.cacheHitRate * 100).toFixed(1)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">💰</span>
          <span className="stat-label">Ahorro por caché</span>
          <span className="stat-value savings">${savingsFromCache.toFixed(4)}</span>
        </div>
      </div>

      {budgetPercent >= 75 && (
        <div className={`budget-warning-message ${getBudgetColorClass()}`}>
          {budgetPercent >= 90
            ? '⚠️ Advertencia: Cerca del límite de presupuesto'
            : 'ℹ️ Acercándose al límite de presupuesto'}
        </div>
      )}
    </div>
  );
};
```

### 6. Create Extraction Display Components

Create `frontend/src/components/extraction/ExtractionResult.tsx`:

```typescript
import React from 'react';
import { MedicationList } from './MedicationList';
import { SymptomList } from './SymptomList';
import { DiagnosisList } from './DiagnosisList';
import { SOAPNote } from './SOAPNote';
import { ValidationBadge } from './ValidationBadge';

interface ExtractionResultProps {
  extraction: {
    chief_complaint: string;
    medications: MedicationExtracted[];
    symptoms: SymptomExtracted[];
    diagnoses: DiagnosisExtracted[];
    vital_signs: VitalSignsExtracted;
    follow_up_instructions: string;
    confidence_score: number;
  };
  validations?: {
    medication_validations: MedicationValidation[];
    drug_interactions: DrugInteraction[];
    cie10_suggestions: CIE10Suggestion[];
  };
}

export const ExtractionResult: React.FC<ExtractionResultProps> = ({
  extraction,
  validations,
}) => {
  return (
    <div className="extraction-result">
      <header className="extraction-header">
        <h2>Extracción Médica</h2>
        <ValidationBadge confidence={extraction.confidence_score} />
      </header>

      {extraction.chief_complaint && (
        <section className="chief-complaint">
          <h3>Motivo de Consulta</h3>
          <p>{extraction.chief_complaint}</p>
        </section>
      )}

      <section className="medications">
        <h3>Medicamentos ({extraction.medications.length})</h3>
        <MedicationList
          medications={extraction.medications}
          validations={validations?.medication_validations}
          interactions={validations?.drug_interactions}
        />
      </section>

      <section className="symptoms">
        <h3>Síntomas ({extraction.symptoms.length})</h3>
        <SymptomList symptoms={extraction.symptoms} />
      </section>

      <section className="diagnoses">
        <h3>Diagnósticos ({extraction.diagnoses.length})</h3>
        <DiagnosisList
          diagnoses={extraction.diagnoses}
          cie10Suggestions={validations?.cie10_suggestions}
        />
      </section>

      {extraction.vital_signs && (
        <section className="vital-signs">
          <h3>Signos Vitales</h3>
          <VitalSignsDisplay vitals={extraction.vital_signs} />
        </section>
      )}

      {extraction.follow_up_instructions && (
        <section className="follow-up">
          <h3>Indicaciones de Seguimiento</h3>
          <p>{extraction.follow_up_instructions}</p>
        </section>
      )}
    </div>
  );
};
```

Create `frontend/src/components/extraction/MedicationList.tsx`:

```typescript
import React from 'react';

interface MedicationListProps {
  medications: MedicationExtracted[];
  validations?: MedicationValidation[];
  interactions?: DrugInteraction[];
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  validations,
  interactions,
}) => {
  const getValidation = (medName: string) => {
    return validations?.find(v => v.medication_name === medName);
  };

  const getInteractions = (medName: string) => {
    return interactions?.filter(
      i => i.medication_a === medName || i.medication_b === medName
    );
  };

  return (
    <div className="medication-list">
      {medications.map((med, index) => {
        const validation = getValidation(med.name);
        const medInteractions = getInteractions(med.name);

        return (
          <div key={index} className="medication-card">
            <div className="medication-header">
              <h4>{med.name}</h4>
              {validation && (
                <span className={`validation-badge ${validation.is_valid ? 'valid' : 'warning'}`}>
                  {validation.is_valid ? '✓ Validado' : '⚠ Verificar'}
                </span>
              )}
            </div>

            <div className="medication-details">
              {med.dosage && <span className="dosage">{med.dosage}</span>}
              {med.frequency && <span className="frequency">{med.frequency}</span>}
              {med.duration && <span className="duration">{med.duration}</span>}
              {med.route && <span className="route">Vía: {med.route}</span>}
            </div>

            {med.instructions && (
              <p className="instructions">{med.instructions}</p>
            )}

            {validation?.warnings && validation.warnings.length > 0 && (
              <div className="warnings">
                {validation.warnings.map((warning, i) => (
                  <p key={i} className="warning-text">⚠️ {warning}</p>
                ))}
              </div>
            )}

            {medInteractions && medInteractions.length > 0 && (
              <div className="interactions">
                <h5>Interacciones Detectadas:</h5>
                {medInteractions.map((interaction, i) => (
                  <div
                    key={i}
                    className={`interaction severity-${interaction.severity.toLowerCase()}`}
                  >
                    <span className="severity">{interaction.severity}</span>
                    <p>{interaction.description}</p>
                    <p className="recommendation">{interaction.recommendation}</p>
                  </div>
                ))}
              </div>
            )}

            {validation && (
              <div className="rag-confidence">
                <small>
                  Confianza RAG: {(validation.rag_confidence * 100).toFixed(0)}%
                </small>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### 3. Create Diarization Display

Create `frontend/src/components/transcription/DiarizedTranscript.tsx`:

```typescript
import React from 'react';

interface TranscriptionSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface DiarizedTranscriptProps {
  segments: TranscriptionSegment[];
  showTimestamps?: boolean;
}

export const DiarizedTranscript: React.FC<DiarizedTranscriptProps> = ({
  segments,
  showTimestamps = false,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker.toLowerCase()) {
      case 'doctor':
        return { label: 'Doctor', className: 'speaker-doctor' };
      case 'patient':
      case 'paciente':
        return { label: 'Paciente', className: 'speaker-patient' };
      default:
        return { label: speaker, className: 'speaker-other' };
    }
  };

  return (
    <div className="diarized-transcript">
      {segments.map((segment, index) => {
        const { label, className } = getSpeakerLabel(segment.speaker);

        return (
          <div key={index} className={`transcript-segment ${className}`}>
            <div className="segment-header">
              <span className="speaker-label">{label}</span>
              {showTimestamps && (
                <span className="timestamp">
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </span>
              )}
            </div>
            <p className="segment-text">{segment.text}</p>
          </div>
        );
      })}
    </div>
  );
};
```

### 4. Create Cost Monitoring Component

Create `frontend/src/components/costs/CostDashboard.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface CostMetrics {
  summary: {
    total_spent: number;
    budget_remaining: number;
    budget_percent_used: number;
    daily_average: number;
    projected_month_end: number;
  };
  by_service: Record<string, number>;
  by_operation: Record<string, number>;
  optimizations: {
    vad_savings_usd: number;
    cache_savings_usd: number;
  };
  cost_per_consultation: number;
}

export const CostDashboard: React.FC = () => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/costs/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch cost metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [token]);

  if (loading || !metrics) {
    return <div className="loading">Cargando métricas...</div>;
  }

  return (
    <div className="cost-dashboard">
      <h2>Monitor de Costos</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Gasto del Mes</h3>
          <div className="metric-value">${metrics.summary.total_spent.toFixed(2)}</div>
          <div className="metric-label">
            {metrics.summary.budget_percent_used.toFixed(0)}% del presupuesto
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(metrics.summary.budget_percent_used, 100)}%` }}
            />
          </div>
        </div>

        <div className="metric-card">
          <h3>Presupuesto Restante</h3>
          <div className="metric-value">${metrics.summary.budget_remaining.toFixed(2)}</div>
        </div>

        <div className="metric-card">
          <h3>Costo por Consulta</h3>
          <div className="metric-value">${metrics.cost_per_consultation.toFixed(2)}</div>
        </div>

        <div className="metric-card">
          <h3>Proyección Fin de Mes</h3>
          <div className="metric-value">${metrics.summary.projected_month_end.toFixed(2)}</div>
        </div>
      </div>

      <div className="optimization-section">
        <h3>Ahorros por Optimización</h3>
        <div className="savings-grid">
          <div className="saving-item">
            <span className="saving-label">VAD (filtrado de silencio)</span>
            <span className="saving-value">${metrics.optimizations.vad_savings_usd.toFixed(2)}</span>
          </div>
          <div className="saving-item">
            <span className="saving-label">Caché de respuestas</span>
            <span className="saving-value">${metrics.optimizations.cache_savings_usd.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="breakdown-section">
        <h3>Desglose por Servicio</h3>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Costo</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics.by_service).map(([service, cost]) => (
              <tr key={service}>
                <td>{service}</td>
                <td>${cost.toFixed(4)}</td>
                <td>{((cost / metrics.summary.total_spent) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 5. Create SOAP Note Component

Create `frontend/src/components/extraction/SOAPNote.tsx`:

```typescript
import React from 'react';

interface SOAPNoteData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPNoteProps {
  soapNote: SOAPNoteData;
  onEdit?: (section: keyof SOAPNoteData, value: string) => void;
  editable?: boolean;
}

export const SOAPNote: React.FC<SOAPNoteProps> = ({
  soapNote,
  onEdit,
  editable = false,
}) => {
  const sections = [
    { key: 'subjective' as const, title: 'S - Subjetivo', description: 'Síntomas y quejas del paciente' },
    { key: 'objective' as const, title: 'O - Objetivo', description: 'Hallazgos del examen físico' },
    { key: 'assessment' as const, title: 'A - Evaluación', description: 'Diagnóstico y análisis' },
    { key: 'plan' as const, title: 'P - Plan', description: 'Tratamiento y seguimiento' },
  ];

  return (
    <div className="soap-note">
      <h3>Nota SOAP</h3>
      <div className="soap-sections">
        {sections.map(({ key, title, description }) => (
          <div key={key} className="soap-section">
            <div className="section-header">
              <h4>{title}</h4>
              <small>{description}</small>
            </div>
            {editable ? (
              <textarea
                value={soapNote[key] || ''}
                onChange={(e) => onEdit?.(key, e.target.value)}
                placeholder={`Ingrese ${title.toLowerCase()}...`}
                rows={4}
              />
            ) : (
              <p className="section-content">
                {soapNote[key] || <em>No disponible</em>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 7. Main Consultation View Component

Create `frontend/src/components/consultation/RealtimeConsultationView.tsx`:

```typescript
import React from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';
import { LiveTranscriptionView } from '../transcription/LiveTranscriptionView';
import { ValidationAlertPanel } from '../alerts/ValidationAlertPanel';
import { LiveEntityList } from '../extraction/LiveEntityList';
import { LiveCostMonitor } from '../costs/LiveCostMonitor';

interface RealtimeConsultationViewProps {
  patientId: string;
  appointmentType: string;
}

export const RealtimeConsultationView: React.FC<RealtimeConsultationViewProps> = ({
  patientId,
  appointmentType,
}) => {
  const session = useRealtimeSession();

  const handleStart = async () => {
    await session.createSession(patientId, appointmentType, 'es');
    await session.startRecording();
  };

  const handleStop = () => {
    session.stopRecording();
  };

  const handleFinalize = async () => {
    await session.finalizeSession();
  };

  return (
    <div className="realtime-consultation-view">
      <header className="consultation-header">
        <h1>Consulta en Tiempo Real</h1>
        <div className="consultation-controls">
          {session.status === 'idle' && (
            <button onClick={handleStart} className="btn-start">
              Iniciar Consulta
            </button>
          )}
          {session.status === 'recording' && (
            <>
              <button onClick={handleStop} className="btn-stop">
                Detener Grabación
              </button>
              <div className="recording-indicator">
                <span className="recording-pulse"></span>
                GRABANDO
              </div>
            </>
          )}
          {session.status === 'processing' && (
            <button onClick={handleFinalize} className="btn-finalize">
              Finalizar Consulta
            </button>
          )}
          {session.status === 'completed' && (
            <div className="completed-badge">✓ Completada</div>
          )}
        </div>
      </header>

      {session.status !== 'idle' && (
        <div className="consultation-grid">
          {/* Left Column: Transcription and Alerts */}
          <div className="consultation-left">
            <LiveTranscriptionView
              transcriptChunks={session.transcriptChunks}
              currentSpeaker={session.currentSpeaker}
            />

            {session.alerts.length > 0 && (
              <ValidationAlertPanel
                alerts={session.alerts}
                onAcknowledge={session.acknowledgeAlert}
              />
            )}
          </div>

          {/* Right Column: Entities and Cost */}
          <div className="consultation-right">
            <LiveCostMonitor cost={session.cost} budgetLimit={1.0} />

            <LiveEntityList entities={session.entities} />
          </div>
        </div>
      )}

      {session.error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {session.error}
        </div>
      )}

      {session.status === 'completed' && session.finalTranscript && (
        <div className="final-results">
          <h2>Resultados Finales</h2>
          <div className="final-transcript">
            <h3>Transcripción Completa</h3>
            <p>{session.finalTranscript}</p>
          </div>
          {session.finalCostSummary && (
            <div className="final-cost-summary">
              <h3>Resumen de Costos</h3>
              <p>Total: ${session.finalCostSummary.total_cost_usd.toFixed(4)}</p>
              <p>Duración de audio: {session.finalCostSummary.audio_duration_seconds}s</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### 8. Add CSS Styles for Real-Time Components

Create `frontend/src/styles/realtime.css`:

```css
/* Realtime Consultation View */
.realtime-consultation-view {
  min-height: 100vh;
  background: #f9fafb;
}

.consultation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: #fff;
  border-bottom: 2px solid #e5e7eb;
}

.consultation-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-start,
.btn-stop,
.btn-finalize {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start {
  background: #10b981;
  color: white;
}

.btn-start:hover {
  background: #059669;
}

.btn-stop {
  background: #ef4444;
  color: white;
}

.btn-stop:hover {
  background: #dc2626;
}

.btn-finalize {
  background: #3b82f6;
  color: white;
}

.btn-finalize:hover {
  background: #2563eb;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #fee2e2;
  border-radius: 8px;
  font-weight: 600;
  color: #dc2626;
}

.recording-pulse {
  width: 12px;
  height: 12px;
  background: #dc2626;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.completed-badge {
  padding: 0.5rem 1rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 8px;
  font-weight: 600;
}

/* Consultation Grid Layout */
.consultation-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
}

.consultation-left,
.consultation-right {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Live Transcription View */
.live-transcription-view {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.transcription-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.current-speaker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
}

.speaker-doctor {
  background: #dbeafe;
  color: #1e40af;
}

.speaker-patient {
  background: #d1fae5;
  color: #065f46;
}

.speaker-unknown {
  background: #f3f4f6;
  color: #6b7280;
}

.confidence-badge {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 0.75rem;
}

.transcript-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.transcript-chunk {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  transition: all 0.3s;
}

.transcript-chunk.final {
  background: #fff;
  border-left: 3px solid #10b981;
}

.transcript-chunk.interim {
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  font-style: italic;
}

.typing-indicator {
  color: #6b7280;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.transcription-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Validation Alert Panel */
.validation-alert-panel {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alert-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.alert-summary {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.critical-count {
  color: #dc2626;
  font-weight: 600;
}

.high-count {
  color: #f59e0b;
  font-weight: 600;
}

.alerts-container {
  max-height: 400px;
  overflow-y: auto;
}

.alerts-group {
  margin-bottom: 1.5rem;
}

.alert-card {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  border-left: 4px solid;
  transition: all 0.3s;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.alert-severity-critical {
  background: #fee2e2;
  border-color: #dc2626;
}

.alert-severity-high {
  background: #fef3c7;
  border-color: #f59e0b;
}

.alert-severity-medium {
  background: #dbeafe;
  border-color: #3b82f6;
}

.alert-severity-low {
  background: #f3f4f6;
  border-color: #6b7280;
}

.alert-card.acknowledged {
  opacity: 0.6;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.acknowledge-btn {
  padding: 0.375rem 0.75rem;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.acknowledge-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.immediate-attention-badge {
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: #fef3c7;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  text-align: center;
}

.no-alerts {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.no-alerts-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

/* Live Entity List */
.live-entity-list {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.entity-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.entity-count-badge {
  padding: 0.25rem 0.75rem;
  background: #e5e7eb;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.entities-container {
  max-height: 600px;
  overflow-y: auto;
}

.entity-type-group {
  margin-bottom: 1.5rem;
}

.entity-type-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: #374151;
}

.entity-type-count {
  color: #6b7280;
  font-weight: normal;
}

.entity-card {
  position: relative;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s;
}

.entity-card.new-entity {
  animation: highlightNew 1s ease-out;
  border-color: #10b981;
}

@keyframes highlightNew {
  0% {
    background: #d1fae5;
    transform: scale(1.02);
  }
  100% {
    background: #f9fafb;
    transform: scale(1);
  }
}

.new-entity-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 0.25rem 0.5rem;
  background: #10b981;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.new-pulse {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.entity-metadata {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.confidence-badge,
.validation-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.confidence-badge {
  background: #dbeafe;
  color: #1e40af;
}

.validation-approved {
  background: #d1fae5 !important;
  color: #065f46 !important;
}

.validation-flagged {
  background: #fee2e2 !important;
  color: #991b1b !important;
}

.validation-needs-review {
  background: #fef3c7 !important;
  color: #92400e !important;
}

.validation-pending {
  background: #f3f4f6 !important;
  color: #6b7280 !important;
}

/* Live Cost Monitor */
.live-cost-monitor {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cost-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.total-cost {
  font-size: 2rem;
  font-weight: 700;
}

.budget-good {
  color: #10b981;
}

.budget-warning {
  color: #f59e0b;
}

.budget-critical {
  color: #dc2626;
}

.cost-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.cost-label {
  color: #6b7280;
}

.cost-value {
  font-weight: 600;
}

.budget-progress {
  margin-bottom: 1rem;
}

.budget-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.progress-fill.budget-good {
  background: linear-gradient(90deg, #10b981, #059669);
}

.progress-fill.budget-warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.progress-fill.budget-critical {
  background: linear-gradient(90deg, #dc2626, #b91c1c);
}

.budget-remaining {
  text-align: right;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.optimization-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.stat-label {
  flex: 1;
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
}

.stat-value.savings {
  color: #10b981;
}

.budget-warning-message {
  padding: 0.75rem;
  margin-top: 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

.budget-warning-message.budget-warning {
  background: #fef3c7;
  color: #92400e;
}

.budget-warning-message.budget-critical {
  background: #fee2e2;
  color: #991b1b;
}

/* Error Message */
.error-message {
  padding: 1rem;
  margin: 1rem 2rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Final Results */
.final-results {
  padding: 2rem;
  background: #fff;
  margin: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.final-transcript,
.final-cost-summary {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .consultation-grid {
    grid-template-columns: 1fr;
  }
}
```

Also create `frontend/src/styles/extraction.css`:

```css
/* Extraction Result Styles */
.extraction-result {
  padding: 1.5rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.extraction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.validation-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.validation-badge.valid {
  background: #d1fae5;
  color: #065f46;
}

.validation-badge.warning {
  background: #fef3c7;
  color: #92400e;
}

/* Medication Card */
.medication-card {
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.medication-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.medication-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.medication-details span {
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.875rem;
}

.warnings {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef3c7;
  border-radius: 4px;
}

.warning-text {
  margin: 0;
  font-size: 0.875rem;
  color: #92400e;
}

/* Drug Interactions */
.interaction {
  padding: 0.75rem;
  margin-top: 0.5rem;
  border-radius: 4px;
}

.interaction.severity-critica {
  background: #fee2e2;
  border-left: 4px solid #dc2626;
}

.interaction.severity-mayor {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.interaction.severity-moderada {
  background: #dbeafe;
  border-left: 4px solid #3b82f6;
}

/* Diarized Transcript */
.diarized-transcript {
  padding: 1rem;
}

.transcript-segment {
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
}

.speaker-doctor {
  background: #dbeafe;
  border-left: 4px solid #3b82f6;
}

.speaker-patient {
  background: #d1fae5;
  border-left: 4px solid #10b981;
}

.segment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.speaker-label {
  font-weight: 600;
}

.timestamp {
  font-size: 0.75rem;
  color: #6b7280;
}

/* SOAP Note */
.soap-note {
  padding: 1rem;
}

.soap-sections {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.soap-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.section-header h4 {
  margin: 0 0 0.25rem 0;
  color: #374151;
}

.section-header small {
  color: #6b7280;
}

/* Cost Dashboard */
.cost-dashboard {
  padding: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric-card {
  padding: 1.5rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  transition: width 0.3s ease;
}
```

## Expected Deliverables

### Real-Time Streaming (PRIMARY)
- `frontend/src/types/websocketEvents.ts` - TypeScript event type definitions
- `frontend/src/hooks/useRealtimeSession.ts` - Real-time session hook with WebSocket
- `frontend/src/components/consultation/RealtimeConsultationView.tsx` - Main consultation view
- `frontend/src/components/transcription/LiveTranscriptionView.tsx` - Live transcription display
- `frontend/src/components/alerts/ValidationAlertPanel.tsx` - Real-time alert panel
- `frontend/src/components/extraction/LiveEntityList.tsx` - Incremental entity list
- `frontend/src/components/costs/LiveCostMonitor.tsx` - Real-time cost monitor
- `frontend/src/styles/realtime.css` - Real-time component styles

### Batch Processing (LEGACY)
- Keep existing components from previous version for backward compatibility
- `frontend/src/components/extraction/ExtractionResult.tsx` - Batch results display
- `frontend/src/components/extraction/MedicationList.tsx` - Batch medication list
- `frontend/src/components/extraction/SOAPNote.tsx` - SOAP note component
- `frontend/src/components/transcription/DiarizedTranscript.tsx` - Batch transcript display
- `frontend/src/styles/extraction.css` - Batch component styles

## Verification Steps

### Real-Time Streaming Mode (Priority)
1. ✅ Create session API call succeeds and returns sessionId + websocketUrl
2. ✅ WebSocket connection establishes to `/ws/session/:sessionId`
3. ✅ MediaRecorder records audio with Opus codec
4. ✅ Binary audio chunks stream to WebSocket (~20ms frames)
5. ✅ Receive and display all 8+ event types:
   - `transcript_update` → LiveTranscriptionView updates incrementally
   - `speaker_changed` → Current speaker indicator updates
   - `extraction_update` → LiveEntityList shows new entities with animation
   - `validation_alert` → ValidationAlertPanel shows alert with severity color
   - `entity_validated` → Entity validation status badge updates
   - `cost_update` → LiveCostMonitor updates costs and budget bar
   - `session_complete` → Show final results
   - `error` → Display error message
6. ✅ CRITICAL alerts trigger:
   - Visual highlighting (red border, pulse animation)
   - Audio alert sound
   - Browser notification (if permission granted)
   - "Requires Immediate Attention" badge
7. ✅ New entities show "NUEVO" indicator for 3 seconds
8. ✅ Budget warning appears at 75% and 90% thresholds
9. ✅ Transcript auto-scrolls to latest chunk
10. ✅ Alert acknowledgment updates UI and calls API
11. ✅ Session finalization triggers final results display
12. ✅ WebSocket disconnects gracefully on session end

### Performance Targets
- WebSocket connection establishes in <500ms
- Transcript updates appear within 2s of speech
- CRITICAL alerts appear within 1s of detection
- HIGH alerts appear within 2s
- MEDIUM alerts appear within 3s
- Entity extraction appears within 3s of speech
- Cost updates every ~5 chunks (every 3-5 seconds)
- UI remains responsive with 100+ entities
- Auto-scroll smooth with no jank

### User Experience
1. ✅ "GRABANDO" indicator pulses during recording
2. ✅ Speaker changes show visual transition
3. ✅ Interim transcript text is italicized with "..." indicator
4. ✅ Final transcript text is solid with green border
5. ✅ Entity confidence badges color-coded (>90% blue, 70-90% yellow, <70% red)
6. ✅ Validation status badges clear (✓ Aprobada, ⚠ Marcada, 📋 Revisar, ⏳ Pendiente)
7. ✅ Alert severity visually distinct (🚨 CRITICAL red, ⚠️ HIGH orange, ⚡ MEDIUM blue, ℹ️ LOW gray)
8. ✅ Cost monitor shows savings from cache
9. ✅ All Spanish labels correct for medical context
10. ✅ Responsive layout works on desktop and tablet

### Error Handling
1. ✅ Microphone permission denied shows clear error
2. ✅ WebSocket connection failure shows retry option
3. ✅ Network disconnection shows reconnection status
4. ✅ Recoverable errors don't terminate session
5. ✅ Non-recoverable errors show final error state

## Architecture Patterns

### State Management
```typescript
// Session state hierarchy:
// 1. WebSocket connection state (idle → connecting → recording → processing → completed)
// 2. Incremental data arrays (transcriptChunks, entities, alerts)
// 3. Current speaker state (updated on speaker_changed event)
// 4. Cost state (updated on cost_update event)
// 5. Final results (populated on session_complete event)
```

### Event Flow
```
User clicks "Iniciar Consulta"
  → createSession() → POST /api/consultations/sessions
  → connectWebSocket() → new WebSocket('/ws/session/:id?token=...')
  → startRecording() → MediaRecorder starts with Opus codec
  → ondataavailable → ws.send(audioBinaryChunk) every 20ms
  → ws.onmessage → handleWebSocketEvent(event)
  → handleTranscriptUpdate() → setState(...transcriptChunks)
  → React re-renders LiveTranscriptionView
  → Auto-scroll to bottom
```

### Component Hierarchy
```
RealtimeConsultationView (main container)
├── Consultation Header (controls, status)
├── Consultation Grid (2-column layout)
│   ├── Left Column
│   │   ├── LiveTranscriptionView
│   │   └── ValidationAlertPanel
│   └── Right Column
│       ├── LiveCostMonitor
│       └── LiveEntityList
└── Final Results (on completion)
```

## Notes

### Real-Time Considerations
- **Binary Audio Streaming**: Use Opus codec for efficient compression (~20ms chunks)
- **WebSocket Buffering**: Handle backpressure if events arrive faster than React can render
- **Auto-Scroll Logic**: Only auto-scroll if user is near bottom (preserve manual scroll position)
- **Memory Management**: Limit transcript chunks to last 1000 entries (circular buffer)
- **Alert Sound**: Play once per unique CRITICAL alert, not on every render

### User Experience Principles
- **Incremental Feedback**: Show partial results immediately, don't wait for completion
- **Visual Hierarchy**: Most important info (alerts, current speaker) prominently displayed
- **Color Semantics**: Red = danger/critical, Orange = warning/high, Blue = info/medium, Green = success/approved
- **Spanish Labels**: Medical terminology in Spanish for target users (Mexico/LatAm doctors)
- **Accessibility**: Sufficient color contrast, screen reader labels for icons

### Production Considerations
- Request microphone permission early in flow (not on button click)
- Handle browser notification permission gracefully
- Support WebSocket reconnection with exponential backoff
- Store final results in IndexedDB for offline access
- Add telemetry for real-time latency monitoring
- Implement rate limiting UI (warn user if speaking too fast)

### Security
- Token passed in WebSocket query parameter (not ideal but supported)
- Validate all event data before rendering (prevent XSS)
- Don't store sensitive medical data in localStorage
- Use HTTPS/WSS in production
- Implement Content Security Policy headers
