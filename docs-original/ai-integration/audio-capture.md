# Audio Capture Specification: MedRecord AI

This document specifies the browser-based audio capture implementation for recording doctor-patient consultations.

---

## Overview

MedRecord AI captures audio directly in the browser using the Web Audio API and MediaRecorder. The captured audio is processed in chunks for potential real-time transcription while maintaining a complete recording for the full consultation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Audio Capture Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────────────┐│
│  │  Microphone  │────▶│  MediaRecorder   │────▶│  Audio Chunks (30s)      ││
│  │  (Browser)   │     │  API             │     │  WebM/Opus format        ││
│  └──────────────┘     └──────────────────┘     └───────────┬──────────────┘│
│                                                             │               │
│                              ┌──────────────────────────────┴─────┐        │
│                              │                                    │        │
│                              ▼                                    ▼        │
│                   ┌──────────────────┐              ┌──────────────────┐  │
│                   │ Real-time Upload │              │ Complete Audio   │  │
│                   │ (Optional)       │              │ Buffer           │  │
│                   └──────────────────┘              └──────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Audio Capture Configuration

### Configuration Interface

```typescript
interface AudioCaptureConfig {
  sampleRate: number;           // 16000 Hz recommended for Whisper
  channelCount: number;         // 1 (mono)
  mimeType: string;             // 'audio/webm;codecs=opus'
  maxDuration: number;          // 3600000 (60 minutes in ms)
  chunkInterval: number;        // 30000 (30 seconds in ms)
  echoCancellation: boolean;    // true
  noiseSuppression: boolean;    // true
  autoGainControl: boolean;     // true
}

const DEFAULT_CONFIG: AudioCaptureConfig = {
  sampleRate: 16000,
  channelCount: 1,
  mimeType: 'audio/webm;codecs=opus',
  maxDuration: 3600000,         // 60 minutes
  chunkInterval: 30000,         // 30 seconds
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
```

### Audio Quality Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Sample Rate** | 16,000 Hz | Optimal for Whisper API, reduces file size |
| **Channels** | Mono (1) | Sufficient for voice, reduces size by 50% |
| **Codec** | Opus | Excellent compression, wide browser support |
| **Container** | WebM | Native browser format, no conversion needed |
| **Bit Rate** | ~32 kbps | Good quality for speech at 16kHz mono |

---

## MediaRecorder API Integration

### Browser Audio Capture Implementation

```typescript
interface AudioCaptureState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
}

interface AudioChunk {
  data: Blob;
  timestamp: number;
  duration: number;
  chunkIndex: number;
}

class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private chunkBuffer: Blob[] = [];
  private startTime: number = 0;
  private config: AudioCaptureConfig;

  constructor(config: Partial<AudioCaptureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this.config.channelCount,
          sampleRate: this.config.sampleRate,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });

      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startRecording(
    onChunkReady?: (chunk: AudioChunk) => void
  ): Promise<void> {
    // Request microphone access
    this.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: this.config.channelCount,
        sampleRate: this.config.sampleRate,
        echoCancellation: this.config.echoCancellation,
        noiseSuppression: this.config.noiseSuppression,
        autoGainControl: this.config.autoGainControl,
      },
    });

    // Check MIME type support
    const mimeType = this.getSupportedMimeType();

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType,
      audioBitsPerSecond: 32000, // 32 kbps for speech
    });

    this.audioChunks = [];
    this.chunkBuffer = [];
    this.startTime = Date.now();
    let chunkIndex = 0;

    // Handle data available events
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.chunkBuffer.push(event.data);

        // If we have enough data for a chunk interval
        if (this.chunkBuffer.length > 0 && onChunkReady) {
          const chunkBlob = new Blob(this.chunkBuffer, { type: mimeType });
          this.chunkBuffer = [];

          onChunkReady({
            data: chunkBlob,
            timestamp: Date.now(),
            duration: this.config.chunkInterval,
            chunkIndex: chunkIndex++,
          });
        }
      }
    };

    // Start recording with timeslice for chunking
    this.mediaRecorder.start(this.config.chunkInterval);
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getSupportedMimeType();
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Clean up
        this.audioStream?.getTracks().forEach(track => track.stop());
        this.audioStream = null;
        this.mediaRecorder = null;

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  getRecordingDuration(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  private getSupportedMimeType(): string {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    throw new Error('No supported audio MIME type found');
  }
}
```

---

## Audio Chunking Strategy

### Chunking Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Chunk Duration** | 30 seconds | Balance between latency and API efficiency |
| **Overlap** | 2 seconds | Ensures continuous speech isn't cut mid-word |
| **Buffer Size** | 2 chunks | Handles network delays |
| **Max Queue** | 5 chunks | Prevents memory issues |

### Chunking Flow

```
Recording Timeline:
═══════════════════════════════════════════════════════════════════

0s         30s        60s        90s        120s       150s
│──────────│──────────│──────────│──────────│──────────│
  Chunk 1    Chunk 2    Chunk 3    Chunk 4    Chunk 5

     ├─2s─┤     ├─2s─┤     ├─2s─┤     ├─2s─┤
     Overlap   Overlap   Overlap   Overlap
```

### Chunk Management Implementation

```typescript
interface ChunkManager {
  chunks: AudioChunk[];
  pendingUpload: AudioChunk[];
  processedChunks: Set<number>;

  addChunk(chunk: AudioChunk): void;
  getNextChunk(): AudioChunk | null;
  markProcessed(chunkIndex: number): void;
  getUnprocessedChunks(): AudioChunk[];
}

class AudioChunkManager implements ChunkManager {
  chunks: AudioChunk[] = [];
  pendingUpload: AudioChunk[] = [];
  processedChunks: Set<number> = new Set();

  private maxQueueSize = 5;
  private overlapDuration = 2000; // 2 seconds in ms

  addChunk(chunk: AudioChunk): void {
    this.chunks.push(chunk);
    this.pendingUpload.push(chunk);

    // Prevent memory overflow
    if (this.pendingUpload.length > this.maxQueueSize) {
      console.warn('Chunk queue overflow, dropping oldest chunk');
      this.pendingUpload.shift();
    }
  }

  getNextChunk(): AudioChunk | null {
    return this.pendingUpload.shift() || null;
  }

  markProcessed(chunkIndex: number): void {
    this.processedChunks.add(chunkIndex);
  }

  getUnprocessedChunks(): AudioChunk[] {
    return this.chunks.filter(
      chunk => !this.processedChunks.has(chunk.chunkIndex)
    );
  }

  getCompleteAudio(): Blob {
    const allChunks = this.chunks.map(c => c.data);
    return new Blob(allChunks, { type: 'audio/webm;codecs=opus' });
  }

  clear(): void {
    this.chunks = [];
    this.pendingUpload = [];
    this.processedChunks.clear();
  }
}
```

### Overlap Handling

For continuous speech, we include overlap to prevent word cutoff:

```typescript
interface OverlapConfig {
  overlapDuration: number;  // 2000ms
  fadeInDuration: number;   // 100ms
  fadeOutDuration: number;  // 100ms
}

function mergeTranscriptions(
  transcripts: string[],
  overlapDuration: number
): string {
  if (transcripts.length === 0) return '';
  if (transcripts.length === 1) return transcripts[0];

  let merged = transcripts[0];

  for (let i = 1; i < transcripts.length; i++) {
    const current = transcripts[i];

    // Find overlap point using fuzzy matching
    const overlapText = findOverlapPoint(merged, current);

    if (overlapText) {
      // Remove overlapping portion from current
      const overlapIndex = current.indexOf(overlapText);
      merged += current.slice(overlapIndex + overlapText.length);
    } else {
      // No overlap found, just append
      merged += ' ' + current;
    }
  }

  return merged.trim();
}

function findOverlapPoint(previous: string, current: string): string | null {
  // Get last N words from previous
  const prevWords = previous.split(/\s+/).slice(-10);

  // Try to find matching sequence in current
  for (let i = prevWords.length; i >= 2; i--) {
    const searchPhrase = prevWords.slice(-i).join(' ');
    if (current.toLowerCase().includes(searchPhrase.toLowerCase())) {
      return searchPhrase;
    }
  }

  return null;
}
```

---

## Browser Compatibility

### Supported Browsers

| Browser | Version | Support Level |
|---------|---------|---------------|
| **Chrome** | 49+ | Full support |
| **Firefox** | 25+ | Full support |
| **Safari** | 14.1+ | Full support |
| **Edge** | 79+ | Full support |
| **Opera** | 36+ | Full support |

### Feature Detection

```typescript
interface BrowserCapabilities {
  hasMediaRecorder: boolean;
  hasGetUserMedia: boolean;
  supportedMimeTypes: string[];
  supportsAudioConstraints: boolean;
}

function detectBrowserCapabilities(): BrowserCapabilities {
  const capabilities: BrowserCapabilities = {
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
    supportedMimeTypes: [],
    supportsAudioConstraints: true,
  };

  if (capabilities.hasMediaRecorder) {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];

    capabilities.supportedMimeTypes = mimeTypes.filter(type =>
      MediaRecorder.isTypeSupported(type)
    );
  }

  return capabilities;
}

function isAudioCaptureSupported(): boolean {
  const caps = detectBrowserCapabilities();
  return (
    caps.hasMediaRecorder &&
    caps.hasGetUserMedia &&
    caps.supportedMimeTypes.length > 0
  );
}
```

### Fallback Strategy

```typescript
async function initializeAudioCapture(): Promise<AudioCaptureService | null> {
  if (!isAudioCaptureSupported()) {
    console.error('Audio capture not supported in this browser');
    return null;
  }

  const service = new AudioCaptureService();

  try {
    const hasPermission = await service.requestMicrophonePermission();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }
    return service;
  } catch (error) {
    console.error('Failed to initialize audio capture:', error);
    return null;
  }
}
```

---

## Memory Management

### Memory Considerations

| Recording Length | Estimated Size | Memory Impact |
|-----------------|----------------|---------------|
| 5 minutes | ~1.2 MB | Low |
| 15 minutes | ~3.6 MB | Low |
| 30 minutes | ~7.2 MB | Medium |
| 60 minutes | ~14.4 MB | Medium |

*Based on Opus codec at 32 kbps*

### Memory Management Implementation

```typescript
interface MemoryConfig {
  maxRecordingDuration: number;    // 60 minutes
  chunkCleanupInterval: number;    // Clean up every 5 minutes
  maxMemoryUsage: number;          // 50 MB limit
}

class MemoryManagedRecorder {
  private config: MemoryConfig = {
    maxRecordingDuration: 3600000,   // 60 minutes
    chunkCleanupInterval: 300000,     // 5 minutes
    maxMemoryUsage: 50 * 1024 * 1024, // 50 MB
  };

  private chunks: Blob[] = [];
  private totalSize: number = 0;

  addChunk(chunk: Blob): boolean {
    const newTotalSize = this.totalSize + chunk.size;

    if (newTotalSize > this.config.maxMemoryUsage) {
      console.warn('Memory limit reached, cannot add more chunks');
      return false;
    }

    this.chunks.push(chunk);
    this.totalSize = newTotalSize;
    return true;
  }

  getMemoryUsage(): { bytes: number; percentage: number } {
    return {
      bytes: this.totalSize,
      percentage: (this.totalSize / this.config.maxMemoryUsage) * 100,
    };
  }

  cleanup(): void {
    this.chunks = [];
    this.totalSize = 0;
  }
}
```

---

## Client-Side Processing

### Audio Level Monitoring

```typescript
class AudioLevelMonitor {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;

  initialize(stream: MediaStream): void {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  getAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average level
    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / this.dataArray.length;

    // Normalize to 0-100
    return Math.round((average / 255) * 100);
  }

  startMonitoring(callback: (level: number) => void): void {
    const monitor = () => {
      const level = this.getAudioLevel();
      callback(level);
      this.animationFrame = requestAnimationFrame(monitor);
    };
    monitor();
  }

  stopMonitoring(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
```

### Audio Format Validation

```typescript
interface AudioValidation {
  isValid: boolean;
  duration: number;
  size: number;
  format: string;
  errors: string[];
}

async function validateAudioBlob(blob: Blob): Promise<AudioValidation> {
  const errors: string[] = [];

  // Check size
  const maxSize = 25 * 1024 * 1024; // 25 MB (Whisper limit)
  if (blob.size > maxSize) {
    errors.push(`File size ${(blob.size / 1024 / 1024).toFixed(2)} MB exceeds 25 MB limit`);
  }

  if (blob.size === 0) {
    errors.push('Audio file is empty');
  }

  // Check format
  const supportedFormats = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'];
  const isFormatValid = supportedFormats.some(f => blob.type.includes(f));
  if (!isFormatValid) {
    errors.push(`Unsupported format: ${blob.type}`);
  }

  // Get duration using Audio element
  let duration = 0;
  try {
    duration = await getAudioDuration(blob);
    if (duration < 1) {
      errors.push('Recording too short (minimum 1 second)');
    }
    if (duration > 3600) {
      errors.push('Recording exceeds 60 minute limit');
    }
  } catch {
    errors.push('Could not determine audio duration');
  }

  return {
    isValid: errors.length === 0,
    duration,
    size: blob.size,
    format: blob.type,
    errors,
  };
}

function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Failed to load audio metadata'));
    };
  });
}
```

---

## Upload Strategy

### Upload Options

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Batch Upload** | MVP default | Simple, reliable | Delay before transcription |
| **Streaming Upload** | Real-time | Immediate feedback | Complex, more bandwidth |
| **Hybrid** | Future | Best of both | Most complex |

### Batch Upload Implementation (MVP)

```typescript
interface UploadResult {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

async function uploadAudioRecording(
  appointmentId: string,
  audioBlob: Blob
): Promise<UploadResult> {
  const validation = await validateAudioBlob(audioBlob);

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors.join(', '),
    };
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, `recording-${appointmentId}.webm`);
  formData.append('duration', String(validation.duration));
  formData.append('format', validation.format);

  try {
    const response = await fetch(`/api/appointments/${appointmentId}/recording`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    const result = await response.json();
    return { success: true, audioUrl: result.audioUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
```

### Progressive Upload (Future Enhancement)

```typescript
interface ProgressiveUploadConfig {
  chunkSize: number;              // 1 MB
  maxRetries: number;             // 3
  retryDelay: number;             // 1000ms
  concurrentUploads: number;      // 2
}

async function uploadChunksProgressively(
  appointmentId: string,
  chunks: AudioChunk[],
  onProgress: (progress: number) => void
): Promise<UploadResult> {
  const totalChunks = chunks.length;
  let uploadedChunks = 0;

  for (const chunk of chunks) {
    const formData = new FormData();
    formData.append('chunk', chunk.data);
    formData.append('chunkIndex', String(chunk.chunkIndex));
    formData.append('totalChunks', String(totalChunks));

    await fetch(`/api/appointments/${appointmentId}/recording/chunk`, {
      method: 'POST',
      body: formData,
    });

    uploadedChunks++;
    onProgress((uploadedChunks / totalChunks) * 100);
  }

  // Finalize upload
  const finalizeResponse = await fetch(
    `/api/appointments/${appointmentId}/recording/finalize`,
    { method: 'POST' }
  );

  const result = await finalizeResponse.json();
  return { success: true, audioUrl: result.audioUrl };
}
```

---

## Error Recovery

### Error Types and Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| Permission Denied | User denied mic access | Show instructions to enable |
| Device Not Found | No microphone available | Show error, suggest external mic |
| Recording Failed | Browser/system error | Retry or manual entry |
| Upload Failed | Network error | Retry with exponential backoff |
| Memory Full | Long recording | Auto-save, offer to continue |

### Error Recovery Implementation

```typescript
interface RecordingError {
  code: string;
  message: string;
  recoverable: boolean;
  action: 'retry' | 'manual' | 'settings' | 'none';
}

function handleRecordingError(error: Error): RecordingError {
  const name = error.name || '';
  const message = error.message || '';

  if (name === 'NotAllowedError' || message.includes('Permission denied')) {
    return {
      code: 'PERMISSION_DENIED',
      message: 'Microphone access denied. Please enable microphone in browser settings.',
      recoverable: true,
      action: 'settings',
    };
  }

  if (name === 'NotFoundError' || message.includes('not found')) {
    return {
      code: 'DEVICE_NOT_FOUND',
      message: 'No microphone found. Please connect a microphone.',
      recoverable: false,
      action: 'manual',
    };
  }

  if (name === 'NotReadableError' || message.includes('in use')) {
    return {
      code: 'DEVICE_IN_USE',
      message: 'Microphone is being used by another application.',
      recoverable: true,
      action: 'retry',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Recording failed. Please try again or enter notes manually.',
    recoverable: true,
    action: 'retry',
  };
}
```

---

## React Hook Integration

### useAudioCapture Hook

```typescript
interface UseAudioCaptureReturn {
  // State
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
  isSupported: boolean;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  requestPermission: () => Promise<boolean>;
}

function useAudioCapture(): UseAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<AudioCaptureService | null>(null);
  const levelMonitorRef = useRef<AudioLevelMonitor | null>(null);
  const timerRef = useRef<NodeJS.Timer | null>(null);

  const isSupported = useMemo(() => isAudioCaptureSupported(), []);

  useEffect(() => {
    serviceRef.current = new AudioCaptureService();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      levelMonitorRef.current?.stopMonitoring();
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) return false;
    return serviceRef.current.requestMicrophonePermission();
  }, []);

  const startRecording = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      setError(null);
      await serviceRef.current.startRecording();
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      const recordingError = handleRecordingError(err as Error);
      setError(recordingError.message);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!serviceRef.current) return null;

    try {
      const audioBlob = await serviceRef.current.stopRecording();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      levelMonitorRef.current?.stopMonitoring();

      return audioBlob;
    } catch (err) {
      setError('Failed to stop recording');
      return null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    serviceRef.current?.pauseRecording();
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resumeRecording = useCallback(() => {
    serviceRef.current?.resumeRecording();
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    error,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
  };
}
```

---

## References

- [MediaRecorder API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [getUserMedia API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [OpenAI Whisper Audio Requirements](https://platform.openai.com/docs/api-reference/audio)
- [US-006: AI Transcription Recording](../stories/cards/US-006-ai-transcription.md)
