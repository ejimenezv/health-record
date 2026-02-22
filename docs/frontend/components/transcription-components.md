# Transcription Components Specification

## Overview

This document specifies the components used for audio recording, transcription display, and AI extraction status in the appointment consultation workflow.

## Component List

| Component | Description | Used In |
|-----------|-------------|---------|
| `TranscriptionPanel` | Collapsible right panel | AppointmentPage |
| `AudioRecorder` | Recording controls | TranscriptionPanel |
| `TranscriptionDisplay` | Live transcript text | TranscriptionPanel |
| `AIExtractionStatus` | Extraction progress | TranscriptionPanel |
| `RecordingIndicator` | Visual recording state | AudioRecorder |
| `WaveformVisualizer` | Audio waveform (optional) | AudioRecorder |

## TranscriptionPanel

Collapsible panel for transcription and AI features.

```typescript
// src/components/transcription/TranscriptionPanel.tsx

interface TranscriptionPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  isRecording: boolean;
  transcription: string;
  segments: TranscriptionSegment[];
  duration: number;
  status: TranscriptionStatus;
  extractionStatus: AIExtractionStatus;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

type TranscriptionStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'completed'
  | 'error';

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  isOpen,
  onToggle,
  isRecording,
  transcription,
  segments,
  duration,
  status,
  extractionStatus,
  onStartRecording,
  onStopRecording,
  disabled,
}) => {
  return (
    <div
      className={cn(
        'h-full bg-white border-l border-secondary-200 flex flex-col transition-all duration-300',
        isOpen ? 'w-96' : 'w-12'
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        {isOpen ? (
          <>
            <h3 className="font-semibold text-secondary-900">Transcripción</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              title="Colapsar panel"
            >
              <ChevronRight size={20} />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            title="Expandir panel"
            className="mx-auto"
          >
            <ChevronLeft size={20} />
          </Button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Recording Controls */}
          <div className="p-4 border-b border-secondary-200">
            <AudioRecorder
              isRecording={isRecording}
              duration={duration}
              status={status}
              onStart={onStartRecording}
              onStop={onStopRecording}
              disabled={disabled}
            />
          </div>

          {/* Transcription Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <TranscriptionDisplay
              text={transcription}
              segments={segments}
              isLive={isRecording}
              status={status}
            />
          </div>

          {/* AI Extraction Status */}
          <div className="p-4 border-t border-secondary-200">
            <AIExtractionStatus status={extractionStatus} />
          </div>

          {/* Bulk Actions */}
          {extractionStatus.hasResults && (
            <div className="p-4 border-t border-secondary-200 space-y-2">
              <Button className="w-full" onClick={() => {}}>
                <Check size={16} className="mr-2" />
                Aceptar Todo IA
              </Button>
              <Button variant="outline" className="w-full" onClick={() => {}}>
                <X size={16} className="mr-2" />
                Descartar Todo
              </Button>
            </div>
          )}
        </>
      )}

      {/* Collapsed state - vertical text */}
      {!isOpen && (
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-sm text-secondary-500 font-medium"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Transcripción
          </span>
        </div>
      )}
    </div>
  );
};
```

### Visual Structure - Open

```
┌──────────────────────────┐
│ Transcripción       [◀]  │
├──────────────────────────┤
│                          │
│ ┌──────────────────────┐ │
│ │ ⬤ Detener Grabación  │ │
│ └──────────────────────┘ │
│                          │
│ Duración: 05:32          │
│                          │
├──────────────────────────┤
│                          │
│ Transcripción en vivo:   │
│ ┌──────────────────────┐ │
│ │ "El paciente refiere │ │
│ │  dolor de cabeza     │ │
│ │  desde hace dos      │ │
│ │  semanas..."         │ │
│ │                      │ │
│ │                      │ │
│ └──────────────────────┘ │
│                          │
├──────────────────────────┤
│ Extracción IA:           │
│ ✓ Síntomas extraídos     │
│ ⟳ Procesando diagnóstico │
│ ○ Prescripciones pend.   │
├──────────────────────────┤
│ [✓ Aceptar Todo IA    ]  │
│ [✗ Descartar Todo     ]  │
└──────────────────────────┘
```

### Visual Structure - Collapsed

```
┌────┐
│ [▶]│
│    │
│ T  │
│ r  │
│ a  │
│ n  │
│ s  │
│ c  │
│ .  │
│    │
└────┘
```

## AudioRecorder

Recording controls with visual feedback.

```typescript
// src/components/transcription/AudioRecorder.tsx

interface AudioRecorderProps {
  isRecording: boolean;
  duration: number;
  status: TranscriptionStatus;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isRecording,
  duration,
  status,
  onStart,
  onStop,
  disabled,
}) => {
  const formattedDuration = formatDuration(duration);

  return (
    <div className="space-y-4">
      {/* Recording Button */}
      <div className="flex justify-center">
        {isRecording ? (
          <Button
            size="lg"
            variant="destructive"
            onClick={onStop}
            disabled={disabled || status === 'processing'}
            className="w-full"
          >
            <RecordingIndicator className="mr-2" />
            Detener Grabación
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={onStart}
            disabled={disabled || status === 'processing'}
            className="w-full"
          >
            <Mic size={20} className="mr-2" />
            {status === 'completed' ? 'Nueva Grabación' : 'Iniciar Grabación'}
          </Button>
        )}
      </div>

      {/* Status and Duration */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <span className="text-secondary-600">
            {getStatusLabel(status)}
          </span>
        </div>
        {(isRecording || status === 'completed') && (
          <span className="font-mono text-secondary-900">
            {formattedDuration}
          </span>
        )}
      </div>

      {/* Waveform (optional) */}
      {isRecording && (
        <WaveformVisualizer isActive={isRecording} />
      )}
    </div>
  );
};

// Helper functions
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getStatusLabel = (status: TranscriptionStatus): string => {
  const labels: Record<TranscriptionStatus, string> = {
    idle: 'Listo para grabar',
    recording: 'Grabando',
    processing: 'Procesando...',
    completed: 'Completado',
    error: 'Error',
  };
  return labels[status];
};
```

### Recording States

**Idle State**
```
┌──────────────────────────┐
│                          │
│ ┌──────────────────────┐ │
│ │ 🎙 Iniciar Grabación │ │
│ └──────────────────────┘ │
│                          │
│ ○ Listo para grabar      │
│                          │
└──────────────────────────┘
```

**Recording State**
```
┌──────────────────────────┐
│                          │
│ ┌──────────────────────┐ │
│ │ ⬤ Detener Grabación  │ │
│ └──────────────────────┘ │
│                          │
│ ● Grabando       05:32   │
│                          │
│ ▃▅▇▅▃▁▃▅▇▅▃▁▃▅▇▅▃        │
│                          │
└──────────────────────────┘
```

**Processing State**
```
┌──────────────────────────┐
│                          │
│ ┌──────────────────────┐ │
│ │     Procesando...    │ │
│ └──────────────────────┘ │
│                          │
│ ⟳ Procesando...  05:32   │
│                          │
└──────────────────────────┘
```

## RecordingIndicator

Visual indicator for active recording.

```typescript
// src/components/transcription/RecordingIndicator.tsx

interface RecordingIndicatorProps {
  className?: string;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  className,
}) => (
  <span
    className={cn(
      'inline-block h-3 w-3 rounded-full bg-error-500 animate-pulse',
      className
    )}
  />
);
```

## StatusIndicator

Status dot indicator.

```typescript
// src/components/transcription/StatusIndicator.tsx

interface StatusIndicatorProps {
  status: TranscriptionStatus;
}

const statusConfig: Record<TranscriptionStatus, { color: string; animate?: boolean }> = {
  idle: { color: 'bg-secondary-400' },
  recording: { color: 'bg-error-500', animate: true },
  processing: { color: 'bg-warning-500', animate: true },
  completed: { color: 'bg-success-500' },
  error: { color: 'bg-error-500' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        config.color,
        config.animate && 'animate-pulse'
      )}
    />
  );
};
```

## WaveformVisualizer

Audio waveform visualization (optional enhancement).

```typescript
// src/components/transcription/WaveformVisualizer.tsx

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  barCount = 20,
}) => {
  // Use Web Audio API to get frequency data
  // or simulate with random values for visual effect

  return (
    <div className="flex items-end justify-center gap-1 h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 bg-primary-500 rounded-full transition-all duration-100',
            isActive ? 'animate-waveform' : 'h-1'
          )}
          style={{
            animationDelay: `${i * 50}ms`,
            height: isActive ? `${Math.random() * 100}%` : '4px',
          }}
        />
      ))}
    </div>
  );
};

// CSS for waveform animation
// @keyframes waveform {
//   0%, 100% { height: 20%; }
//   50% { height: 100%; }
// }
```

## TranscriptionDisplay

Display area for transcription text.

```typescript
// src/components/transcription/TranscriptionDisplay.tsx

interface TranscriptionDisplayProps {
  text: string;
  segments: TranscriptionSegment[];
  isLive: boolean;
  status: TranscriptionStatus;
  highlightedSegments?: string[];
}

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  text,
  segments,
  isLive,
  status,
  highlightedSegments = [],
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during live transcription
  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, isLive]);

  if (status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-secondary-500 text-center">
          Presiona para grabar la consulta.
          La transcripción aparecerá aquí.
        </p>
      </div>
    );
  }

  if (status === 'processing' && !text) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
          <p className="text-sm text-secondary-500">
            Procesando transcripción...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-error-500 mx-auto mb-2" />
          <p className="text-sm text-error-600">
            Error al procesar la grabación.
          </p>
          <Button variant="outline" size="sm" className="mt-2">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2 text-xs text-secondary-500 border-b border-secondary-100">
        {isLive ? 'Transcripción en vivo:' : 'Transcripción:'}
      </div>

      <ScrollArea
        ref={scrollRef}
        className="flex-1 p-4"
      >
        {segments.length > 0 ? (
          <div className="space-y-3">
            {segments.map((segment) => (
              <TranscriptionSegmentItem
                key={segment.id}
                segment={segment}
                isHighlighted={highlightedSegments.includes(segment.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-secondary-700 whitespace-pre-wrap leading-relaxed">
            {text}
          </p>
        )}

        {/* Live typing indicator */}
        {isLive && (
          <span className="inline-block w-2 h-4 bg-primary-500 animate-blink ml-1" />
        )}
      </ScrollArea>
    </div>
  );
};

// Segment item with timestamp
const TranscriptionSegmentItem: React.FC<{
  segment: TranscriptionSegment;
  isHighlighted: boolean;
}> = ({ segment, isHighlighted }) => (
  <div
    className={cn(
      'p-2 rounded-md transition-colors',
      isHighlighted && 'bg-ai-50 border border-ai-200'
    )}
  >
    <span className="text-xs text-secondary-400 mr-2">
      {formatTimestamp(segment.startTime)}
    </span>
    <span className="text-secondary-700">{segment.text}</span>
  </div>
);

const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

### Visual States

**Empty State**
```
┌──────────────────────────┐
│                          │
│                          │
│   Presiona para grabar   │
│   la consulta.           │
│   La transcripción       │
│   aparecerá aquí.        │
│                          │
│                          │
└──────────────────────────┘
```

**Live Transcription**
```
┌──────────────────────────┐
│ Transcripción en vivo:   │
├──────────────────────────┤
│                          │
│ "El paciente refiere     │
│  dolor de cabeza         │
│  intenso desde hace      │
│  aproximadamente dos     │
│  semanas. El dolor se    │
│  localiza principalmente │
│  en la región frontal    │
│  y empeora por las       │
│  tardes..."▌             │
│                          │
└──────────────────────────┘
```

## AIExtractionStatus

Shows the status of AI field extraction.

```typescript
// src/components/transcription/AIExtractionStatus.tsx

interface AIExtractionStatusProps {
  status: {
    symptoms: 'pending' | 'processing' | 'done' | 'error';
    diagnosis: 'pending' | 'processing' | 'done' | 'error';
    prescriptions: 'pending' | 'processing' | 'done' | 'error';
    hasResults: boolean;
  };
}

export const AIExtractionStatus: React.FC<AIExtractionStatusProps> = ({
  status,
}) => {
  const items = [
    { key: 'symptoms', label: 'Síntomas', status: status.symptoms },
    { key: 'diagnosis', label: 'Diagnóstico', status: status.diagnosis },
    { key: 'prescriptions', label: 'Prescripciones', status: status.prescriptions },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-secondary-700">
        Extracción IA
      </h4>
      <div className="space-y-1">
        {items.map((item) => (
          <ExtractionStatusItem
            key={item.key}
            label={item.label}
            status={item.status}
          />
        ))}
      </div>
    </div>
  );
};

const ExtractionStatusItem: React.FC<{
  label: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}> = ({ label, status }) => {
  const config = {
    pending: {
      icon: <Circle size={14} className="text-secondary-400" />,
      text: 'text-secondary-500',
    },
    processing: {
      icon: <Loader2 size={14} className="text-warning-500 animate-spin" />,
      text: 'text-warning-600',
    },
    done: {
      icon: <CheckCircle size={14} className="text-success-500" />,
      text: 'text-success-600',
    },
    error: {
      icon: <XCircle size={14} className="text-error-500" />,
      text: 'text-error-600',
    },
  };

  const { icon, text } = config[status];

  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={cn('text-sm', text)}>{label}</span>
    </div>
  );
};
```

### Visual Structure

```
┌──────────────────────────┐
│ Extracción IA            │
│                          │
│ ✓ Síntomas extraídos     │
│ ⟳ Procesando diagnóstico │
│ ○ Prescripciones pend.   │
└──────────────────────────┘
```

## Hooks

### useAudioRecorder

Hook for managing audio recording.

```typescript
// src/hooks/useAudioRecorder.ts

interface UseAudioRecorderOptions {
  onAudioChunk?: (chunk: Blob) => void;
  onError?: (error: Error) => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: Error | null;
}

export const useAudioRecorder = (
  options: UseAudioRecorderOptions = {}
): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          options.onAudioChunk?.(e.data);
        }
      };

      mediaRecorder.start(1000); // Emit chunks every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
    }
  };

  const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          chunksRef.current = [];
          resolve(blob);
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
    });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    error,
  };
};
```

### useTranscriptionSocket

Hook for WebSocket transcription connection.

```typescript
// src/hooks/useTranscriptionSocket.ts

interface UseTranscriptionSocketOptions {
  sessionId: string;
  onTranscriptionUpdate: (text: string, segment: TranscriptionSegment) => void;
  onFieldExtraction: (field: string, value: any) => void;
  onStatusChange: (status: TranscriptionStatus) => void;
  onError: (error: string) => void;
  onCompleted: () => void;
}

export const useTranscriptionSocket = (
  options: UseTranscriptionSocketOptions
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((wsUrl: string) => {
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'transcription_update':
          options.onTranscriptionUpdate(message.text, message.segment);
          break;
        case 'field_extraction':
          options.onFieldExtraction(message.field, message.value);
          break;
        case 'status':
          options.onStatusChange(message.status);
          break;
        case 'error':
          options.onError(message.error);
          break;
        case 'completed':
          options.onCompleted();
          break;
      }
    };

    socket.onerror = () => {
      options.onError('Connection error');
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socketRef.current = socket;
  }, [options]);

  const sendAudioChunk = useCallback((chunk: Blob) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(chunk);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    sendAudioChunk,
    disconnect,
  };
};
```

## File Structure

```
src/components/transcription/
├── TranscriptionPanel.tsx
├── AudioRecorder.tsx
├── RecordingIndicator.tsx
├── StatusIndicator.tsx
├── WaveformVisualizer.tsx
├── TranscriptionDisplay.tsx
├── AIExtractionStatus.tsx
└── index.ts

src/hooks/
├── useAudioRecorder.ts
├── useTranscriptionSocket.ts
└── useTranscription.ts
```

## Browser Compatibility

### Required APIs
- `MediaRecorder` API
- `getUserMedia` API
- `WebSocket` API
- `Blob` API

### Supported Browsers
- Chrome 49+
- Firefox 29+
- Safari 14+
- Edge 79+

### Fallback Handling
```typescript
const checkBrowserSupport = () => {
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
  const hasWebSocket = typeof WebSocket !== 'undefined';

  return hasMediaRecorder && hasGetUserMedia && hasWebSocket;
};

// Show fallback UI if not supported
if (!checkBrowserSupport()) {
  return <BrowserNotSupportedMessage />;
}
```
