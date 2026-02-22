# Prompt 18b: Implement TICKET-011 - AI Transcription Frontend

## Context
You are implementing the Medical Record System MVP. Transcription backend (TICKET-010) is complete. This completes the **KEY FEATURE** - real-time audio transcription with AI-powered field extraction.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-011-transcription-frontend.md` - Frontend requirements
- `docs/ai-integration/auto-fill.md` - Auto-fill integration
- `docs/frontend/components/transcription-components.md` - Component specs

## Verify Prerequisites
```bash
# 1. Backend is running with WebSocket
cd packages/backend && pnpm dev
# Should show: "WebSocket enabled at ws://localhost:3001"

# 2. OpenAI is configured
# Backend should show: "OpenAI configured: true"

# 3. Backend tests pass
cd packages/backend && pnpm test
```

**If any verification fails:** Go back to Prompt 18a.

---

## Objective
Implement frontend for AI transcription with:
- Socket.IO client connection
- Audio recorder hook with chunking
- Transcription WebSocket hook
- Audio recorder component with visualization
- Transcription display with live updates
- AI extraction status component
- Transcription panel with full integration
- Auto-fill medical record from extraction
- Error handling and connection status

---

## Step 1: Install Dependencies
```bash
cd packages/frontend
pnpm add socket.io-client
```

---

## Step 2: Add Environment Variable
Add to `packages/frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001
```

---

## Step 3: Add Transcription Types
Add to `packages/frontend/src/types/medical-records.types.ts`:

```typescript
// Add these types for transcription

export interface Transcription {
  id: string;
  appointmentId: string;
  fullText: string;
  durationSeconds?: number;
  status: 'recording' | 'processing' | 'completed' | 'error' | 'cancelled';
  startedAt: string;
  completedAt?: string;
}

export interface AIExtractionResult {
  symptoms: Array<{
    description: string;
    severity?: 'mild' | 'moderate' | 'severe';
    duration?: string;
    onset?: string;
  }>;
  diagnosis: {
    description: string;
    icdCode?: string;
    confidence: number;
  } | null;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  chiefComplaint?: string;
  summary?: string;
}
```

---

## Step 4: Create Audio Recorder Hook
Create `packages/frontend/src/hooks/useAudioRecorder.ts`:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderOptions {
  onChunkReady: (chunk: Blob, index: number) => void;
  chunkDuration?: number; // milliseconds
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

export function useAudioRecorder({
  onChunkReady,
  chunkDuration = 30000,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyzerRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunkIndexRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });

      streamRef.current = stream;

      // Audio level monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      levelIntervalRef.current = setInterval(() => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
      }, 100);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onChunkReady(event.data, chunkIndexRef.current);
          chunkIndexRef.current++;
        }
      };

      mediaRecorder.onerror = () => {
        setError('Error en la grabación');
        cleanup();
        setIsRecording(false);
      };

      mediaRecorder.start(chunkDuration);
      setIsRecording(true);
      setIsPaused(false);

      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permiso de micrófono denegado');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró micrófono');
      } else {
        setError(err.message || 'Error al iniciar grabación');
      }
      cleanup();
    }
  }, [onChunkReady, chunkDuration, isPaused, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioLevel(0);
  }, [cleanup]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
```

---

## Step 5: Create Transcription Socket Hook
Create `packages/frontend/src/hooks/useTranscription.ts`:

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import type { AIExtractionResult } from '../types/medical-records.types';

type TranscriptionStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'completed' | 'error';

interface UseTranscriptionOptions {
  appointmentId: string;
  onTranscriptionUpdate: (text: string, fullText: string) => void;
  onFieldExtraction: (extraction: AIExtractionResult) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: TranscriptionStatus) => void;
}

interface UseTranscriptionReturn {
  isConnected: boolean;
  status: TranscriptionStatus;
  startSession: () => void;
  sendAudioChunk: (chunk: Blob, index: number) => Promise<void>;
  stopSession: () => void;
  cancelSession: () => void;
  requestExtraction: () => void;
}

export function useTranscription({
  appointmentId,
  onTranscriptionUpdate,
  onFieldExtraction,
  onError,
  onStatusChange,
}: UseTranscriptionOptions): UseTranscriptionReturn {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<TranscriptionStatus>('idle');

  const updateStatus = useCallback(
    (newStatus: TranscriptionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

    const socket = io(`${WS_URL}/transcription`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      updateStatus('idle');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (status === 'recording') {
        updateStatus('error');
        onError('Conexión perdida');
      }
    });

    socket.on('connect_error', () => {
      onError('Error de conexión');
    });

    socket.on('session_started', () => {
      updateStatus('recording');
    });

    socket.on('transcription_update', (data) => {
      onTranscriptionUpdate(data.text, data.fullText);
    });

    socket.on('field_extraction', (data: AIExtractionResult) => {
      onFieldExtraction(data);
    });

    socket.on('status', (data) => {
      if (data.status === 'processing') updateStatus('processing');
    });

    socket.on('session_completed', (data) => {
      updateStatus('completed');
      onTranscriptionUpdate(data.transcription, data.transcription);
      onFieldExtraction(data.extraction);
    });

    socket.on('session_cancelled', () => {
      updateStatus('idle');
    });

    socket.on('error', (data) => {
      onError(data.message || 'Error');
      if (data.code !== 'CHUNK_ERROR') updateStatus('error');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, appointmentId, onTranscriptionUpdate, onFieldExtraction, onError, updateStatus, status]);

  const startSession = useCallback(() => {
    if (!socketRef.current?.connected) {
      onError('No hay conexión');
      return;
    }
    updateStatus('connecting');
    socketRef.current.emit('start_session', { appointmentId });
  }, [appointmentId, updateStatus, onError]);

  const sendAudioChunk = useCallback(async (chunk: Blob, index: number) => {
    if (!socketRef.current?.connected) throw new Error('No hay conexión');

    const arrayBuffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    socketRef.current.emit('audio_chunk', { audio: base64, chunkIndex: index });
  }, []);

  const stopSession = useCallback(() => {
    socketRef.current?.emit('stop_session');
  }, []);

  const cancelSession = useCallback(() => {
    socketRef.current?.emit('cancel_session');
    updateStatus('idle');
  }, [updateStatus]);

  const requestExtraction = useCallback(() => {
    socketRef.current?.emit('request_extraction');
  }, []);

  return {
    isConnected,
    status,
    startSession,
    sendAudioChunk,
    stopSession,
    cancelSession,
    requestExtraction,
  };
}
```

---

## Step 6: Create Audio Recorder Component
Create `packages/frontend/src/components/transcription/AudioRecorder.tsx`:

```typescript
import { Mic, Square, Pause, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface AudioRecorderProps {
  isRecording: boolean;
  isPaused?: boolean;
  duration: number;
  audioLevel?: number;
  onStart: () => void;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  disabled?: boolean;
  status?: string;
}

export function AudioRecorder({
  isRecording,
  isPaused = false,
  duration,
  audioLevel = 0,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
  status,
}: AudioRecorderProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const levelWidth = Math.min(100, Math.round(audioLevel * 100));

  return (
    <div className="flex flex-col items-center gap-4">
      {isRecording && !isPaused && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${levelWidth}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button onClick={onStart} disabled={disabled} size="lg" className="gap-2">
            <Mic className="h-5 w-5" />
            Iniciar Grabación
          </Button>
        ) : (
          <>
            {onPause && onResume && (
              <Button onClick={isPaused ? onResume : onPause} variant="outline" size="icon" disabled={disabled}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            )}
            <Button onClick={onStop} variant="destructive" size="lg" className="gap-2" disabled={disabled}>
              <Square className="h-4 w-4" />
              Detener
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2">
          <span className={cn('w-3 h-3 rounded-full', isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse')} />
          <span className="text-lg font-mono">{formatDuration(duration)}</span>
          {isPaused && <span className="text-sm text-yellow-600">(Pausado)</span>}
        </div>
      )}

      {status && <p className="text-sm text-gray-500">{status}</p>}
    </div>
  );
}
```

---

## Step 7: Create Transcription Display Component
Create `packages/frontend/src/components/transcription/TranscriptionDisplay.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface TranscriptionDisplayProps {
  text: string;
  isLive?: boolean;
  maxHeight?: number;
}

export function TranscriptionDisplay({ text, isLive = false, maxHeight = 200 }: TranscriptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, isLive]);

  if (!text) {
    return (
      <div className="text-sm text-gray-400 text-center py-4 italic">
        La transcripción aparecerá aquí cuando comience a grabar...
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="rounded-md border p-3 bg-gray-50" style={{ maxHeight }}>
      <p className="text-sm whitespace-pre-wrap">
        {text}
        {isLive && <span className="animate-pulse">|</span>}
      </p>
    </ScrollArea>
  );
}
```

---

## Step 8: Create AI Extraction Status Component
Create `packages/frontend/src/components/transcription/AIExtractionStatus.tsx`:

```typescript
import { Check, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

type FieldStatus = 'pending' | 'extracting' | 'done' | 'error';

interface AIExtractionStatusProps {
  symptoms: FieldStatus;
  diagnosis: FieldStatus;
  prescriptions: FieldStatus;
  symptomsCount?: number;
  prescriptionsCount?: number;
}

export function AIExtractionStatus({
  symptoms,
  diagnosis,
  prescriptions,
  symptomsCount = 0,
  prescriptionsCount = 0,
}: AIExtractionStatusProps) {
  const getStatusIcon = (status: FieldStatus) => {
    switch (status) {
      case 'done': return <Check className="h-4 w-4 text-green-500" />;
      case 'extracting': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-300" />;
    }
  };

  const getStatusColor = (status: FieldStatus) => {
    switch (status) {
      case 'done': return 'border-green-200 bg-green-50';
      case 'extracting': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Sparkles className="h-4 w-4 text-blue-500" />
        Extracción con IA
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={cn('flex items-center gap-2 p-2 rounded border text-sm', getStatusColor(symptoms))}>
          {getStatusIcon(symptoms)}
          <span>Síntomas {symptoms === 'done' && symptomsCount > 0 && `(${symptomsCount})`}</span>
        </div>
        <div className={cn('flex items-center gap-2 p-2 rounded border text-sm', getStatusColor(diagnosis))}>
          {getStatusIcon(diagnosis)}
          <span>Diagnóstico</span>
        </div>
        <div className={cn('flex items-center gap-2 p-2 rounded border text-sm', getStatusColor(prescriptions))}>
          {getStatusIcon(prescriptions)}
          <span>Recetas {prescriptions === 'done' && prescriptionsCount > 0 && `(${prescriptionsCount})`}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 9: Create Transcription Panel Component
Create `packages/frontend/src/components/transcription/TranscriptionPanel.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useTranscription } from '../../hooks/useTranscription';
import { AudioRecorder } from './AudioRecorder';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { AIExtractionStatus } from './AIExtractionStatus';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import type { AIExtractionResult } from '../../types/medical-records.types';

interface TranscriptionPanelProps {
  appointmentId: string;
  onExtractionUpdate: (extraction: AIExtractionResult) => void;
  disabled?: boolean;
}

export function TranscriptionPanel({ appointmentId, onExtractionUpdate, disabled = false }: TranscriptionPanelProps) {
  const [transcriptionText, setTranscriptionText] = useState('');
  const [extraction, setExtraction] = useState<AIExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranscriptionUpdate = useCallback((text: string, fullText: string) => {
    setTranscriptionText(fullText);
  }, []);

  const handleFieldExtraction = useCallback((ext: AIExtractionResult) => {
    setExtraction(ext);
    onExtractionUpdate(ext);
  }, [onExtractionUpdate]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const { isConnected, status, startSession, sendAudioChunk, stopSession, cancelSession } = useTranscription({
    appointmentId,
    onTranscriptionUpdate: handleTranscriptionUpdate,
    onFieldExtraction: handleFieldExtraction,
    onError: handleError,
  });

  const { isRecording, isPaused, duration, error: recorderError, audioLevel, startRecording, stopRecording, pauseRecording, resumeRecording } = useAudioRecorder({
    onChunkReady: sendAudioChunk,
    chunkDuration: 30000,
  });

  const handleStart = async () => {
    setError(null);
    setTranscriptionText('');
    setExtraction(null);
    startSession();
    await startRecording();
  };

  const handleStop = () => {
    stopRecording();
    stopSession();
  };

  const handleCancel = () => {
    stopRecording();
    cancelSession();
    setTranscriptionText('');
    setExtraction(null);
  };

  const displayError = error || recorderError;

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting': return 'Conectando...';
      case 'recording': return 'Grabando y transcribiendo...';
      case 'processing': return 'Procesando...';
      case 'completed': return 'Transcripción completada';
      case 'error': return 'Error';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold">Transcripción con IA</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Wifi className="h-4 w-4" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <WifiOff className="h-4 w-4" /> Desconectado
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        <AudioRecorder
          isRecording={isRecording}
          isPaused={isPaused}
          duration={duration}
          audioLevel={audioLevel}
          onStart={handleStart}
          onStop={handleStop}
          onPause={pauseRecording}
          onResume={resumeRecording}
          disabled={disabled || !isConnected || status === 'processing'}
          status={getStatusMessage()}
        />

        {isRecording && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancelar grabación
            </Button>
          </div>
        )}

        <TranscriptionDisplay text={transcriptionText} isLive={isRecording && !isPaused} maxHeight={200} />

        {(isRecording || extraction) && (
          <AIExtractionStatus
            symptoms={extraction?.symptoms?.length ? 'done' : isRecording ? 'extracting' : 'pending'}
            diagnosis={extraction?.diagnosis ? 'done' : isRecording ? 'extracting' : 'pending'}
            prescriptions={extraction?.prescriptions?.length ? 'done' : isRecording ? 'extracting' : 'pending'}
            symptomsCount={extraction?.symptoms?.length || 0}
            prescriptionsCount={extraction?.prescriptions?.length || 0}
          />
        )}

        {extraction?.summary && (
          <div className="text-sm bg-blue-50 p-3 rounded-lg">
            <strong className="text-blue-700">Resumen IA:</strong>
            <p className="mt-1 text-gray-700">{extraction.summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 10: Update Appointment Page with Auto-Fill
Update `packages/frontend/src/pages/appointments/AppointmentPage.tsx` to include transcription:

```typescript
// Add import at the top
import { TranscriptionPanel } from '../../components/transcription/TranscriptionPanel';
import type { AIExtractionResult } from '../../types/medical-records.types';

// Add to the component (inside AppointmentPage function):

const handleExtractionUpdate = async (extraction: AIExtractionResult) => {
  // Auto-fill symptoms
  for (const symptom of extraction.symptoms) {
    try {
      await addSymptom.mutateAsync({
        appointmentId: appointmentId!,
        data: {
          description: symptom.description,
          severity: symptom.severity,
          duration: symptom.duration,
          onset: symptom.onset,
          aiGenerated: true,
        },
      });
    } catch (error) {
      console.error('Failed to add symptom:', error);
    }
  }

  // Auto-fill diagnosis
  if (extraction.diagnosis) {
    try {
      await setDiagnosis.mutateAsync({
        appointmentId: appointmentId!,
        data: {
          description: extraction.diagnosis.description,
          icdCode: extraction.diagnosis.icdCode,
          aiGenerated: true,
          confidence: extraction.diagnosis.confidence,
        },
      });
    } catch (error) {
      console.error('Failed to set diagnosis:', error);
    }
  }

  // Auto-fill prescriptions
  for (const prescription of extraction.prescriptions) {
    try {
      await addPrescription.mutateAsync({
        appointmentId: appointmentId!,
        data: {
          medication: prescription.medication,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions,
          aiGenerated: true,
        },
      });
    } catch (error) {
      console.error('Failed to add prescription:', error);
    }
  }

  // Refetch to update UI
  refetch();
};

// Add TranscriptionPanel to the JSX before the medical record sections:
{!isCompleted && (
  <TranscriptionPanel
    appointmentId={appointmentId!}
    onExtractionUpdate={handleExtractionUpdate}
    disabled={isCompleted}
  />
)}
```

---

## Testing & Verification

### Run Frontend Tests
```bash
cd packages/frontend
pnpm test
```

### Start Services
```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend
cd packages/frontend && pnpm dev
```

### Manual Verification Checklist

**Transcription Flow:**
- [ ] Navigate to an appointment page
- [ ] Verify "Conectado" shows in transcription panel
- [ ] Click "Iniciar Grabación" - browser should prompt for microphone
- [ ] Grant microphone access
- [ ] Audio level indicator shows when speaking
- [ ] Real-time transcription appears
- [ ] Click "Detener" when finished
- [ ] Extraction results appear (symptoms, diagnosis, prescriptions)
- [ ] Auto-fill adds AI-generated fields to medical record
- [ ] AI badge appears on auto-filled fields
- [ ] Pause/Resume works during recording
- [ ] Cancel button works
- [ ] Error shown when no microphone
- [ ] Error shown when disconnected

### TypeScript Check
```bash
cd packages/frontend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

- [ ] Socket.io-client installed
- [ ] Environment variables configured
- [ ] Transcription types added
- [ ] useAudioRecorder hook with chunking
- [ ] useTranscription WebSocket hook
- [ ] AudioRecorder component with level visualization
- [ ] TranscriptionDisplay with live updates
- [ ] AIExtractionStatus component
- [ ] TranscriptionPanel integrated
- [ ] Auto-fill from extraction implemented
- [ ] Connection status indicators
- [ ] Error handling

---

## Commit (Only After ALL Tests Pass)

```bash
git add .
git commit -m "feat: implement AI transcription and auto-fill (TICKET-010, TICKET-011)

Backend:
- Add OpenAI integration (Whisper + GPT-4)
- Create Whisper service for audio transcription
- Create GPT service for medical field extraction
- Create transcription service with session management
- Implement WebSocket handler for real-time communication
- Add REST endpoints for transcription data
- Configure Socket.IO with CORS and auth
- Add comprehensive tests with mocked OpenAI

Frontend:
- Create useAudioRecorder hook with chunking
- Create useTranscription WebSocket hook
- Create AudioRecorder component with level visualization
- Create TranscriptionDisplay with live updates
- Create AIExtractionStatus component
- Create TranscriptionPanel with full integration
- Implement auto-fill from AI extraction
- Add connection status indicators
- Handle errors gracefully

TICKET-010, TICKET-011"
```

---

## Production Notes

1. **OpenAI API Key Security**: Never commit API keys
2. **Rate Limiting**: Implement queuing and exponential backoff
3. **Session Storage**: Use Redis for production
4. **HTTPS Required**: WebRTC requires HTTPS in production
5. **Audio Size Limits**: Consider compression for large files

---

## MVP Complete!

The Medical Record System MVP is now complete with:
- Authentication (TICKET-002, TICKET-003)
- Patient Management (TICKET-004, TICKET-005)
- Appointment Management (TICKET-006, TICKET-007)
- Medical Records (TICKET-008, TICKET-009)
- AI Transcription (TICKET-010, TICKET-011)
