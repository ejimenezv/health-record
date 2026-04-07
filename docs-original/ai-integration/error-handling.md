# Error Handling & Fallbacks: MedRecord AI

This document specifies error handling strategies, fallback mechanisms, and user communication patterns for AI integration failures across the transcription and extraction pipeline.

---

## Overview

The AI integration layer handles multiple potential failure points. This specification ensures graceful degradation and maintains a good user experience even when AI services fail.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Error Handling Overview                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Recording ──▶ Transcription ──▶ Extraction ──▶ Auto-fill                  │
│      │              │                │              │                       │
│      ▼              ▼                ▼              ▼                       │
│  ┌────────┐    ┌────────┐      ┌────────┐    ┌────────┐                    │
│  │ Error  │    │ Error  │      │ Error  │    │ Error  │                    │
│  │Handler │    │Handler │      │Handler │    │Handler │                    │
│  └───┬────┘    └───┬────┘      └───┬────┘    └───┬────┘                    │
│      │             │               │             │                          │
│      ▼             ▼               ▼             ▼                          │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                     Fallback Strategies                                 ││
│  │  • Retry with backoff   • Manual entry mode   • Partial data recovery  ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Error Categories

### Error Types

```typescript
enum ErrorCategory {
  RECORDING = 'RECORDING',
  UPLOAD = 'UPLOAD',
  TRANSCRIPTION = 'TRANSCRIPTION',
  EXTRACTION = 'EXTRACTION',
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

interface AIError {
  code: string;
  category: ErrorCategory;
  message: string;
  userMessage: string;
  technicalDetails?: string;
  retryable: boolean;
  retryAfter?: number;           // milliseconds
  fallbackAvailable: boolean;
  fallbackAction: FallbackAction;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

type FallbackAction =
  | 'retry'
  | 'manual_entry'
  | 'partial_result'
  | 'skip'
  | 'contact_support';
```

### Error Code Definitions

| Code | Category | Message | Retryable | Fallback |
|------|----------|---------|-----------|----------|
| `PERMISSION_DENIED` | RECORDING | Microphone access denied | No | Settings |
| `DEVICE_NOT_FOUND` | RECORDING | No microphone detected | No | Manual entry |
| `RECORDING_FAILED` | RECORDING | Recording error occurred | Yes | Retry |
| `UPLOAD_FAILED` | UPLOAD | Failed to upload audio | Yes | Retry |
| `FILE_TOO_LARGE` | UPLOAD | Recording exceeds limit | No | Split/compress |
| `TRANSCRIPTION_TIMEOUT` | TRANSCRIPTION | Processing took too long | Yes | Retry |
| `TRANSCRIPTION_FAILED` | TRANSCRIPTION | Could not transcribe | Yes | Manual entry |
| `INVALID_AUDIO` | TRANSCRIPTION | Audio format not supported | No | Re-record |
| `EXTRACTION_FAILED` | EXTRACTION | Field extraction failed | Yes | Manual entry |
| `EXTRACTION_PARTIAL` | EXTRACTION | Some fields not extracted | No | Partial + manual |
| `RATE_LIMITED` | RATE_LIMIT | Too many requests | Yes | Wait + retry |
| `SERVICE_UNAVAILABLE` | NETWORK | AI service unavailable | Yes | Retry later |
| `NETWORK_ERROR` | NETWORK | Connection failed | Yes | Retry |
| `AUTH_FAILED` | AUTHENTICATION | API authentication failed | No | Contact support |

---

## API Error Handling

### HTTP Status Code Mapping

```typescript
function mapHTTPErrorToAIError(
  status: number,
  category: ErrorCategory,
  responseBody?: unknown
): AIError {
  const errorMap: Record<number, Partial<AIError>> = {
    400: {
      code: 'INVALID_REQUEST',
      message: 'Invalid request format',
      userMessage: 'The request could not be processed. Please try again.',
      retryable: false,
      fallbackAvailable: true,
      fallbackAction: 'manual_entry',
      severity: 'medium',
    },
    401: {
      code: 'UNAUTHORIZED',
      message: 'API authentication failed',
      userMessage: 'Service authentication failed. Please contact support.',
      retryable: false,
      fallbackAvailable: true,
      fallbackAction: 'contact_support',
      severity: 'critical',
    },
    403: {
      code: 'FORBIDDEN',
      message: 'Access denied',
      userMessage: 'You do not have permission for this action.',
      retryable: false,
      fallbackAvailable: false,
      fallbackAction: 'contact_support',
      severity: 'high',
    },
    413: {
      code: 'FILE_TOO_LARGE',
      message: 'File exceeds size limit',
      userMessage: 'Recording is too large. Please record a shorter session.',
      retryable: false,
      fallbackAvailable: true,
      fallbackAction: 'manual_entry',
      severity: 'medium',
    },
    429: {
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      userMessage: 'Service is busy. Please wait a moment and try again.',
      retryable: true,
      retryAfter: getRetryAfter(responseBody) || 30000,
      fallbackAvailable: true,
      fallbackAction: 'retry',
      severity: 'low',
    },
    500: {
      code: 'SERVER_ERROR',
      message: 'Internal server error',
      userMessage: 'A server error occurred. Please try again.',
      retryable: true,
      retryAfter: 5000,
      fallbackAvailable: true,
      fallbackAction: 'retry',
      severity: 'high',
    },
    502: {
      code: 'BAD_GATEWAY',
      message: 'Gateway error',
      userMessage: 'Service temporarily unavailable. Please try again.',
      retryable: true,
      retryAfter: 10000,
      fallbackAvailable: true,
      fallbackAction: 'retry',
      severity: 'medium',
    },
    503: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
      userMessage: 'AI service is temporarily unavailable. Please try again later.',
      retryable: true,
      retryAfter: 30000,
      fallbackAvailable: true,
      fallbackAction: 'retry',
      severity: 'medium',
    },
    504: {
      code: 'TIMEOUT',
      message: 'Request timed out',
      userMessage: 'Processing took too long. Please try again.',
      retryable: true,
      retryAfter: 5000,
      fallbackAvailable: true,
      fallbackAction: 'retry',
      severity: 'medium',
    },
  };

  const baseError = errorMap[status] || {
    code: 'UNKNOWN_ERROR',
    message: `HTTP error ${status}`,
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: false,
    fallbackAvailable: true,
    fallbackAction: 'manual_entry',
    severity: 'high',
  };

  return {
    ...baseError,
    category,
  } as AIError;
}

function getRetryAfter(responseBody: unknown): number | undefined {
  if (typeof responseBody === 'object' && responseBody !== null) {
    const body = responseBody as Record<string, unknown>;
    if (typeof body.retryAfter === 'number') {
      return body.retryAfter * 1000; // Convert to ms
    }
  }
  return undefined;
}
```

### OpenAI-Specific Error Handling

```typescript
import OpenAI from 'openai';

function handleOpenAIError(
  error: unknown,
  operation: 'transcription' | 'extraction'
): AIError {
  const category = operation === 'transcription'
    ? ErrorCategory.TRANSCRIPTION
    : ErrorCategory.EXTRACTION;

  if (error instanceof OpenAI.APIError) {
    // Rate limit error
    if (error.status === 429) {
      return {
        code: 'RATE_LIMITED',
        category: ErrorCategory.RATE_LIMIT,
        message: 'OpenAI rate limit exceeded',
        userMessage: 'Service is temporarily busy. Please wait a moment.',
        retryable: true,
        retryAfter: parseRetryAfter(error.headers),
        fallbackAvailable: true,
        fallbackAction: 'retry',
        severity: 'low',
      };
    }

    // Context length error
    if (error.code === 'context_length_exceeded') {
      return {
        code: 'CONTEXT_LENGTH_EXCEEDED',
        category,
        message: 'Input too long for model',
        userMessage: 'Recording too long. Please try a shorter segment.',
        retryable: false,
        fallbackAvailable: true,
        fallbackAction: 'manual_entry',
        severity: 'medium',
      };
    }

    // Invalid API key
    if (error.status === 401) {
      return {
        code: 'INVALID_API_KEY',
        category: ErrorCategory.AUTHENTICATION,
        message: 'OpenAI API key invalid',
        userMessage: 'Service configuration error. Please contact support.',
        retryable: false,
        fallbackAvailable: false,
        fallbackAction: 'contact_support',
        severity: 'critical',
      };
    }

    // Generic API error
    return mapHTTPErrorToAIError(error.status || 500, category, error.message);
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      category: ErrorCategory.NETWORK,
      message: 'Network request failed',
      userMessage: 'Connection failed. Please check your internet and try again.',
      retryable: true,
      retryAfter: 3000,
      fallbackAvailable: true,
      fallbackAction: 'retry',
      severity: 'medium',
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN_ERROR',
    category: ErrorCategory.UNKNOWN,
    message: error instanceof Error ? error.message : 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
    fallbackAvailable: true,
    fallbackAction: 'retry',
    severity: 'high',
  };
}

function parseRetryAfter(headers?: Record<string, string>): number {
  if (!headers) return 30000;

  const retryAfter = headers['retry-after'];
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
  }

  return 30000; // Default 30 seconds
}
```

---

## Retry Logic

### Retry Configuration

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterRange: number;
  retryableStatuses: number[];
  onRetry?: (attempt: number, error: AIError, delay: number) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterRange: 500,
  retryableStatuses: [429, 500, 502, 503, 504],
};
```

### Exponential Backoff Implementation

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AIError;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error
        ? handleOpenAIError(error, 'transcription')
        : {
            code: 'UNKNOWN_ERROR',
            category: ErrorCategory.UNKNOWN,
            message: 'Unknown error',
            userMessage: 'An error occurred',
            retryable: true,
            fallbackAvailable: true,
            fallbackAction: 'retry',
            severity: 'high',
          };

      // Check if error is retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Check if we have retries left
      if (attempt >= mergedConfig.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateBackoffDelay(
        attempt,
        lastError.retryAfter || mergedConfig.baseDelay,
        mergedConfig
      );

      // Notify retry callback
      mergedConfig.onRetry?.(attempt + 1, lastError, delay);

      // Log retry attempt
      console.log(
        `Retrying ${operationName} (attempt ${attempt + 1}/${mergedConfig.maxRetries}) after ${delay}ms`
      );

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError!;
}

function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  config: RetryConfig
): number {
  // Exponential backoff: baseDelay * multiplier^attempt
  const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * config.jitterRange;

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Retry Decision Flow

```
Error Occurs
    │
    ▼
Is error.retryable === true?
    │
    ├── No ────▶ Throw error immediately
    │
    └── Yes
        │
        ▼
    Attempts < maxRetries?
        │
        ├── No ────▶ Throw error (max retries exceeded)
        │
        └── Yes
            │
            ▼
        Calculate delay (exponential backoff + jitter)
            │
            ▼
        Use error.retryAfter if specified
            │
            ▼
        Wait for delay
            │
            ▼
        Retry operation
```

---

## Fallback Strategies

### Recording Fallback

```typescript
async function handleRecordingWithFallback(
  appointmentId: string
): Promise<{ success: boolean; method: 'recording' | 'manual' }> {
  try {
    const hasPermission = await requestMicrophonePermission();

    if (!hasPermission) {
      showNotification({
        type: 'warning',
        title: 'Microphone Access Required',
        message: 'Please enable microphone access in your browser settings to record.',
        actions: [
          { label: 'Open Settings', action: openBrowserSettings },
          { label: 'Enter Manually', action: () => switchToManualMode() },
        ],
      });

      return { success: false, method: 'manual' };
    }

    // Attempt recording
    const audioBlob = await startAndStopRecording();
    return { success: true, method: 'recording' };
  } catch (error) {
    const aiError = handleRecordingError(error);

    // Show fallback option
    showNotification({
      type: 'error',
      title: 'Recording Failed',
      message: aiError.userMessage,
      actions: [
        { label: 'Try Again', action: () => handleRecordingWithFallback(appointmentId) },
        { label: 'Enter Manually', action: () => switchToManualMode() },
      ],
    });

    return { success: false, method: 'manual' };
  }
}
```

### Transcription Fallback

```typescript
interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  method: 'ai' | 'manual';
  error?: AIError;
}

async function transcribeWithFallback(
  audioBlob: Blob,
  appointmentId: string
): Promise<TranscriptionResult> {
  let lastError: AIError | undefined;

  // Attempt 1: Normal transcription with retry
  try {
    const result = await withRetry(
      () => transcribeAudio(audioBlob, appointmentId),
      { maxRetries: 2 },
      'transcription'
    );

    if (result.success) {
      return { success: true, transcript: result.transcript, method: 'ai' };
    }

    lastError = {
      code: 'TRANSCRIPTION_FAILED',
      category: ErrorCategory.TRANSCRIPTION,
      message: result.error || 'Transcription failed',
      userMessage: 'Unable to transcribe recording.',
      retryable: true,
      fallbackAvailable: true,
      fallbackAction: 'manual_entry',
      severity: 'medium',
    };
  } catch (error) {
    lastError = error as AIError;
  }

  // Fallback: Offer manual entry
  return {
    success: false,
    method: 'manual',
    error: lastError,
  };
}
```

### Extraction Fallback

```typescript
interface ExtractionResult {
  success: boolean;
  fields?: ExtractedFields;
  partial?: Partial<ExtractedFields>;
  method: 'ai' | 'partial' | 'manual';
  warnings?: string[];
  error?: AIError;
}

async function extractWithFallback(
  transcript: string,
  appointmentId: string
): Promise<ExtractionResult> {
  let lastError: AIError | undefined;

  // Attempt full extraction
  try {
    const result = await withRetry(
      () => extractMedicalFields(transcript, appointmentId),
      { maxRetries: 2 },
      'extraction'
    );

    if (result.success && result.data) {
      return {
        success: true,
        fields: result.data,
        method: 'ai',
      };
    }

    lastError = {
      code: 'EXTRACTION_FAILED',
      category: ErrorCategory.EXTRACTION,
      message: result.error || 'Extraction failed',
      userMessage: 'Unable to extract medical information.',
      retryable: true,
      fallbackAvailable: true,
      fallbackAction: 'partial_result',
      severity: 'medium',
    };
  } catch (error) {
    lastError = error as AIError;
  }

  // Attempt partial extraction (simplified prompt)
  try {
    const partialResult = await extractPartialFields(transcript);

    if (partialResult && Object.keys(partialResult).length > 0) {
      return {
        success: false,
        partial: partialResult,
        method: 'partial',
        warnings: ['Some fields could not be extracted. Please review and complete manually.'],
        error: lastError,
      };
    }
  } catch (partialError) {
    // Partial also failed, continue to manual
  }

  // Full fallback to manual
  return {
    success: false,
    method: 'manual',
    error: lastError,
  };
}

async function extractPartialFields(
  transcript: string
): Promise<Partial<ExtractedFields> | null> {
  // Simplified extraction prompt for partial recovery
  const simplePrompt = `
    Extract only these fields from the text (return null if not found):
    1. chiefComplaint: What brought the patient in?
    2. diagnosis: What did the doctor diagnose?

    Text: ${transcript.slice(0, 2000)}

    Return JSON: { chiefComplaint: string|null, diagnosis: string|null }
  `;

  try {
    const result = await simpleExtractionCall(simplePrompt);
    return result;
  } catch {
    return null;
  }
}
```

---

## User Communication

### Notification Types

```typescript
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  persistent?: boolean;
  duration?: number;           // Auto-dismiss after ms
  actions?: NotificationAction[];
  dismissible?: boolean;
}

interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}
```

### Error Message Templates

```typescript
const ERROR_MESSAGES: Record<string, (context?: Record<string, unknown>) => Notification> = {
  PERMISSION_DENIED: () => ({
    id: 'permission-denied',
    type: 'warning',
    title: 'Microphone Access Required',
    message: 'Please enable microphone access in your browser settings to record consultations.',
    persistent: true,
    dismissible: true,
    actions: [
      { label: 'How to Enable', action: showMicrophoneInstructions },
      { label: 'Continue Without Recording', action: switchToManualMode, variant: 'secondary' },
    ],
  }),

  TRANSCRIPTION_FAILED: (context) => ({
    id: 'transcription-failed',
    type: 'error',
    title: 'Transcription Failed',
    message: 'Unable to convert your recording to text. You can retry or enter notes manually.',
    persistent: true,
    dismissible: true,
    actions: [
      { label: 'Retry', action: () => retryTranscription(context?.audioBlob as Blob), variant: 'primary' },
      { label: 'Enter Manually', action: switchToManualMode, variant: 'secondary' },
    ],
  }),

  EXTRACTION_PARTIAL: (context) => ({
    id: 'extraction-partial',
    type: 'warning',
    title: 'Partial Information Extracted',
    message: `Some medical information could not be extracted. ${context?.fieldsExtracted || 0} fields were filled automatically.`,
    persistent: false,
    duration: 10000,
    dismissible: true,
    actions: [
      { label: 'Review Fields', action: scrollToFormFields, variant: 'primary' },
    ],
  }),

  RATE_LIMITED: (context) => ({
    id: 'rate-limited',
    type: 'info',
    title: 'Please Wait',
    message: `Service is temporarily busy. Retrying in ${Math.ceil((context?.retryAfter as number || 30000) / 1000)} seconds...`,
    persistent: true,
    dismissible: false,
  }),

  NETWORK_ERROR: () => ({
    id: 'network-error',
    type: 'error',
    title: 'Connection Error',
    message: 'Unable to connect to the AI service. Please check your internet connection and try again.',
    persistent: true,
    dismissible: true,
    actions: [
      { label: 'Retry', action: retryLastOperation, variant: 'primary' },
      { label: 'Work Offline', action: enableOfflineMode, variant: 'secondary' },
    ],
  }),

  SERVICE_UNAVAILABLE: () => ({
    id: 'service-unavailable',
    type: 'error',
    title: 'Service Temporarily Unavailable',
    message: 'The AI service is currently unavailable. You can enter information manually or try again later.',
    persistent: true,
    dismissible: true,
    actions: [
      { label: 'Enter Manually', action: switchToManualMode, variant: 'primary' },
      { label: 'Retry in 1 Minute', action: scheduleRetry, variant: 'secondary' },
    ],
  }),
};
```

### Loading States

```typescript
interface LoadingState {
  isLoading: boolean;
  stage: LoadingStage;
  message: string;
  progress?: number;          // 0-100
  cancellable: boolean;
}

type LoadingStage =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'extracting'
  | 'saving';

const LOADING_MESSAGES: Record<LoadingStage, string> = {
  idle: '',
  uploading: 'Uploading recording...',
  transcribing: 'Transcribing conversation... This may take up to a minute.',
  extracting: 'Extracting medical information...',
  saving: 'Saving record...',
};

function LoadingIndicator({ state }: { state: LoadingState }) {
  if (!state.isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Spinner size="large" />
        <p className="loading-message">{state.message}</p>

        {state.progress !== undefined && (
          <ProgressBar value={state.progress} />
        )}

        {state.cancellable && (
          <button
            onClick={cancelOperation}
            className="cancel-button"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
```

### Progress Indicators

```typescript
interface ProgressConfig {
  stages: {
    name: LoadingStage;
    weight: number;  // Percentage of total progress
  }[];
}

const AI_PROCESSING_PROGRESS: ProgressConfig = {
  stages: [
    { name: 'uploading', weight: 10 },
    { name: 'transcribing', weight: 60 },
    { name: 'extracting', weight: 25 },
    { name: 'saving', weight: 5 },
  ],
};

function calculateProgress(
  currentStage: LoadingStage,
  stageProgress: number = 0
): number {
  const stages = AI_PROCESSING_PROGRESS.stages;
  let totalProgress = 0;

  for (const stage of stages) {
    if (stage.name === currentStage) {
      totalProgress += (stageProgress / 100) * stage.weight;
      break;
    }
    totalProgress += stage.weight;
  }

  return Math.round(totalProgress);
}
```

---

## Error Logging

### Log Structure

```typescript
interface ErrorLog {
  timestamp: Date;
  errorCode: string;
  category: ErrorCategory;
  message: string;
  technicalDetails?: string;
  stack?: string;
  context: {
    appointmentId?: string;
    userId?: string;
    operation: string;
    inputSize?: number;
    attemptNumber?: number;
  };
  resolution?: {
    action: string;
    success: boolean;
    duration: number;
  };
}
```

### Logging Implementation

```typescript
import { logger } from '../lib/logger';

function logAIError(
  error: AIError,
  context: ErrorLog['context'],
  resolution?: ErrorLog['resolution']
): void {
  const logEntry: ErrorLog = {
    timestamp: new Date(),
    errorCode: error.code,
    category: error.category,
    message: error.message,
    technicalDetails: error.technicalDetails,
    context,
    resolution,
  };

  // Log based on severity
  switch (error.severity) {
    case 'critical':
      logger.error('Critical AI error', logEntry);
      // Alert on-call if configured
      alertOnCall(logEntry);
      break;
    case 'high':
      logger.error('AI error', logEntry);
      break;
    case 'medium':
      logger.warn('AI warning', logEntry);
      break;
    case 'low':
      logger.info('AI info', logEntry);
      break;
  }

  // Track metrics
  trackErrorMetric(error.code, error.category);
}

function trackErrorMetric(code: string, category: ErrorCategory): void {
  // Send to metrics service
  // e.g., Datadog, CloudWatch, etc.
}
```

---

## Recovery Strategies

### Session Recovery

```typescript
interface RecoveryState {
  appointmentId: string;
  lastOperation: 'recording' | 'transcription' | 'extraction';
  partialData: {
    audioUrl?: string;
    transcript?: string;
    extractedFields?: Partial<ExtractedFields>;
  };
  timestamp: Date;
}

async function attemptRecovery(
  appointmentId: string
): Promise<RecoveryState | null> {
  // Check for saved recovery state
  const recoveryState = await getRecoveryState(appointmentId);

  if (!recoveryState) return null;

  // Check if recovery data is still valid (< 24 hours old)
  const isValid = Date.now() - recoveryState.timestamp.getTime() < 24 * 60 * 60 * 1000;

  if (!isValid) {
    await clearRecoveryState(appointmentId);
    return null;
  }

  return recoveryState;
}

async function saveRecoveryState(state: RecoveryState): Promise<void> {
  // Save to localStorage and/or server
  localStorage.setItem(
    `recovery-${state.appointmentId}`,
    JSON.stringify(state)
  );

  // Also save to server for cross-device recovery
  await fetch(`/api/appointments/${state.appointmentId}/recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}
```

### Checkpoint System

```typescript
interface Checkpoint {
  id: string;
  stage: LoadingStage;
  data: unknown;
  timestamp: Date;
}

class CheckpointManager {
  private checkpoints: Map<string, Checkpoint> = new Map();

  async save(appointmentId: string, stage: LoadingStage, data: unknown): Promise<void> {
    const checkpoint: Checkpoint = {
      id: `${appointmentId}-${stage}`,
      stage,
      data,
      timestamp: new Date(),
    };

    this.checkpoints.set(checkpoint.id, checkpoint);

    // Persist to storage
    await this.persistCheckpoint(checkpoint);
  }

  async restore(appointmentId: string): Promise<Checkpoint | null> {
    // Find most recent checkpoint for this appointment
    const checkpoints = Array.from(this.checkpoints.values())
      .filter(c => c.id.startsWith(appointmentId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return checkpoints[0] || null;
  }

  async clear(appointmentId: string): Promise<void> {
    for (const [key, checkpoint] of this.checkpoints) {
      if (checkpoint.id.startsWith(appointmentId)) {
        this.checkpoints.delete(key);
      }
    }
  }

  private async persistCheckpoint(checkpoint: Checkpoint): Promise<void> {
    try {
      localStorage.setItem(`checkpoint-${checkpoint.id}`, JSON.stringify(checkpoint));
    } catch (error) {
      console.warn('Failed to persist checkpoint:', error);
    }
  }
}
```

---

## Error Boundary

### React Error Boundary

```typescript
interface AIErrorBoundaryState {
  hasError: boolean;
  error: AIError | null;
}

interface AIErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: AIError) => void;
  onReset?: () => void;
}

class AIErrorBoundary extends React.Component<AIErrorBoundaryProps, AIErrorBoundaryState> {
  constructor(props: AIErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
    const aiError = error instanceof AIError
      ? error
      : {
          code: 'COMPONENT_ERROR',
          category: ErrorCategory.UNKNOWN,
          message: error.message,
          userMessage: 'Something went wrong. Please try again.',
          retryable: true,
          fallbackAvailable: true,
          fallbackAction: 'retry' as FallbackAction,
          severity: 'high' as const,
        };

    return { hasError: true, error: aiError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const aiError = this.state.error;
    if (aiError) {
      logAIError(aiError, {
        operation: 'component_render',
      });
    }

    this.props.onError?.(this.state.error!);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.userMessage}</p>
          {this.state.error?.retryable && (
            <button onClick={this.handleReset}>Try Again</button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## References

- [OpenAI Error Codes](https://platform.openai.com/docs/guides/error-codes)
- [Exponential Backoff](https://cloud.google.com/iot/docs/how-tos/exponential-backoff)
- [Transcription Pipeline](./transcription-pipeline.md)
- [Field Extraction](./field-extraction.md)
- [Auto-fill Specification](./auto-fill.md)
