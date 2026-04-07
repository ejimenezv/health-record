# Integration Interfaces: MedRecord AI

This document provides a comprehensive reference of all TypeScript interfaces for the AI integration layer, including DTOs, service interfaces, event types, and configuration types.

---

## Table of Contents

1. [Audio Capture Interfaces](#audio-capture-interfaces)
2. [Transcription Interfaces](#transcription-interfaces)
3. [Field Extraction Interfaces](#field-extraction-interfaces)
4. [Auto-fill State Interfaces](#auto-fill-state-interfaces)
5. [API Response Interfaces](#api-response-interfaces)
6. [Error Interfaces](#error-interfaces)
7. [Configuration Interfaces](#configuration-interfaces)
8. [Event Interfaces](#event-interfaces)
9. [Service Interfaces](#service-interfaces)

---

## Audio Capture Interfaces

### Configuration

```typescript
/**
 * Audio capture configuration for browser recording
 */
interface AudioCaptureConfig {
  /** Sample rate in Hz (recommended: 16000 for Whisper) */
  sampleRate: number;

  /** Number of audio channels (1 = mono, 2 = stereo) */
  channelCount: 1 | 2;

  /** MIME type for recording (e.g., 'audio/webm;codecs=opus') */
  mimeType: string;

  /** Maximum recording duration in milliseconds */
  maxDuration: number;

  /** Chunk interval for real-time processing in milliseconds */
  chunkInterval: number;

  /** Enable echo cancellation */
  echoCancellation: boolean;

  /** Enable noise suppression */
  noiseSuppression: boolean;

  /** Enable automatic gain control */
  autoGainControl: boolean;
}

/**
 * Default audio capture configuration
 */
const DEFAULT_AUDIO_CONFIG: AudioCaptureConfig = {
  sampleRate: 16000,
  channelCount: 1,
  mimeType: 'audio/webm;codecs=opus',
  maxDuration: 3600000,
  chunkInterval: 30000,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
```

### State and Data

```typescript
/**
 * Current state of audio recording
 */
interface AudioCaptureState {
  /** Whether currently recording */
  isRecording: boolean;

  /** Whether recording is paused */
  isPaused: boolean;

  /** Recording duration in seconds */
  duration: number;

  /** Current audio level (0-100) */
  audioLevel: number;

  /** Error message if recording failed */
  error: string | null;
}

/**
 * Audio chunk for streaming/chunked processing
 */
interface AudioChunk {
  /** Blob containing audio data */
  data: Blob;

  /** Timestamp when chunk was created */
  timestamp: number;

  /** Duration of chunk in milliseconds */
  duration: number;

  /** Sequential index of chunk */
  chunkIndex: number;
}

/**
 * Validation result for audio blob
 */
interface AudioValidationResult {
  /** Whether audio is valid */
  isValid: boolean;

  /** Audio duration in seconds */
  duration: number;

  /** File size in bytes */
  size: number;

  /** MIME type */
  format: string;

  /** Validation errors */
  errors: string[];
}
```

---

## Transcription Interfaces

### Request/Response

```typescript
/**
 * Request payload for transcription API
 */
interface TranscriptionRequest {
  /** Audio file buffer */
  file: Buffer;

  /** Whisper model identifier */
  model: 'whisper-1';

  /** Language hint (ISO 639-1 code) */
  language?: 'en' | 'es';

  /** Response format */
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';

  /** Prompt to guide transcription (medical terminology hints) */
  prompt?: string;
}

/**
 * Basic transcription response
 */
interface TranscriptionBasicResponse {
  /** Transcribed text */
  text: string;
}

/**
 * Verbose transcription response with segments
 */
interface TranscriptionVerboseResponse {
  /** Task type */
  task: 'transcribe';

  /** Detected language */
  language: string;

  /** Audio duration in seconds */
  duration: number;

  /** Full transcribed text */
  text: string;

  /** Individual segments with timestamps */
  segments: TranscriptionSegment[];
}

/**
 * Individual segment from transcription
 */
interface TranscriptionSegment {
  /** Segment ID */
  id: number;

  /** Seek position */
  seek: number;

  /** Start time in seconds */
  start: number;

  /** End time in seconds */
  end: number;

  /** Segment text */
  text: string;

  /** Token IDs */
  tokens: number[];

  /** Temperature used */
  temperature: number;

  /** Average log probability */
  avg_logprob: number;

  /** Compression ratio */
  compression_ratio: number;

  /** Probability of no speech */
  no_speech_prob: number;
}

/**
 * Processed segment for application use
 */
interface ProcessedSegment {
  /** Start time in seconds */
  startTime: number;

  /** End time in seconds */
  endTime: number;

  /** Segment text (trimmed) */
  text: string;

  /** Detected speaker (if applicable) */
  speaker?: 'doctor' | 'patient' | 'unknown';
}

/**
 * Internal transcription result
 */
interface TranscriptionResult {
  /** Whether transcription succeeded */
  success: boolean;

  /** Full transcript text */
  transcript: string;

  /** Processed segments */
  segments: ProcessedSegment[];

  /** Detected language */
  language: string;

  /** Audio duration in seconds */
  duration: number;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Error message if failed */
  error?: string;
}
```

---

## Field Extraction Interfaces

### Medical Data Types

```typescript
/**
 * Symptom data extracted from conversation
 */
interface Symptom {
  /** Symptom name */
  name: string;

  /** Description of symptom */
  description?: string;

  /** Severity level */
  severity?: 'mild' | 'moderate' | 'severe';

  /** Severity on 1-10 scale */
  severityScore?: number;

  /** Duration (e.g., "2 weeks") */
  duration?: string;

  /** When symptom started */
  onset?: string;

  /** Body location */
  bodySite?: string;

  /** Additional characteristics */
  characteristics?: string;

  /** Additional notes */
  notes?: string;
}

/**
 * Diagnosis data extracted from conversation
 */
interface Diagnosis {
  /** Diagnosis description */
  description: string;

  /** ICD-10 code (optional) */
  icdCode?: string;

  /** Diagnosis type */
  type?: 'primary' | 'secondary' | 'differential';

  /** Certainty level */
  certainty?: 'confirmed' | 'suspected' | 'ruled_out';

  /** Additional notes */
  notes?: string;
}

/**
 * Prescription data extracted from conversation
 */
interface Prescription {
  /** Medication name (brand or generic) */
  medicationName: string;

  /** Generic name if different */
  genericName?: string;

  /** Medication strength (e.g., "400mg") */
  strength: string;

  /** Dosage per administration (e.g., "1 tablet") */
  dosage: string;

  /** Administration frequency (e.g., "twice daily") */
  frequency: string;

  /** Treatment duration (e.g., "7 days") */
  duration: string;

  /** Route of administration */
  route?: 'oral' | 'topical' | 'injection' | 'inhalation' | 'other';

  /** Patient instructions */
  instructions: string;

  /** Number of refills authorized */
  refills?: number;
}

/**
 * Vital signs data extracted from conversation
 */
interface VitalSigns {
  /** Systolic blood pressure (mmHg) */
  bloodPressureSystolic?: number;

  /** Diastolic blood pressure (mmHg) */
  bloodPressureDiastolic?: number;

  /** Heart rate (bpm) */
  heartRate?: number;

  /** Body temperature */
  temperature?: number;

  /** Temperature unit */
  temperatureUnit?: 'C' | 'F';

  /** Body weight */
  weight?: number;

  /** Weight unit */
  weightUnit?: 'kg' | 'lb';

  /** Height */
  height?: number;

  /** Height unit */
  heightUnit?: 'cm' | 'in';

  /** Oxygen saturation (%) */
  oxygenSaturation?: number;

  /** Respiratory rate (breaths/min) */
  respiratoryRate?: number;
}
```

### Extraction Types

```typescript
/**
 * Wrapper for extracted values with metadata
 */
interface ExtractedValue<T> {
  /** Extracted value */
  value: T;

  /** Confidence score (0-1) */
  confidence: number;

  /** Source text from transcript */
  sourceText?: string;

  /** Position in transcript */
  sourcePosition?: {
    start: number;
    end: number;
  };
}

/**
 * All extracted medical fields
 */
interface ExtractedFields {
  /** Chief complaint / reason for visit */
  chiefComplaint: ExtractedValue<string> | null;

  /** History of present illness */
  historyOfPresentIllness: ExtractedValue<string> | null;

  /** Extracted symptoms */
  symptoms: ExtractedValue<Symptom>[];

  /** Primary diagnosis */
  diagnosis: ExtractedValue<Diagnosis> | null;

  /** Prescribed medications */
  prescriptions: ExtractedValue<Prescription>[];

  /** Vital signs */
  vitalSigns: ExtractedValue<VitalSigns> | null;

  /** Treatment plan */
  treatmentPlan: ExtractedValue<string> | null;

  /** Follow-up instructions */
  followUp: ExtractedValue<string> | null;

  /** Allergies mentioned */
  allergiesNoted: string[];

  /** Current medications mentioned */
  currentMedications: string[];

  /** Overall extraction confidence */
  overallConfidence: number;
}

/**
 * Extraction request parameters
 */
interface ExtractionRequest {
  /** Full transcript text */
  transcript: string;

  /** Transcript segments with timestamps */
  transcriptSegments?: ProcessedSegment[];

  /** Context from previous chunks */
  previousContext?: string;

  /** Transcript language */
  language: 'en' | 'es';

  /** Associated appointment ID */
  appointmentId: string;
}

/**
 * Extraction options
 */
interface ExtractionOptions {
  /** Include confidence scores */
  includeConfidence: boolean;

  /** Include source text mapping */
  includeSourceText: boolean;

  /** Only return high-confidence extractions */
  strictMode: boolean;

  /** Maximum tokens for response */
  maxTokens: number;
}

/**
 * Extraction result
 */
interface ExtractionResult {
  /** Whether extraction succeeded */
  success: boolean;

  /** Extracted fields */
  data: ExtractedFields | null;

  /** Raw API response */
  rawResponse: string;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Token usage */
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };

  /** Error message if failed */
  error?: string;
}

/**
 * Extraction flag for uncertain extractions
 */
interface ExtractionFlag {
  /** Field that needs attention */
  field: string;

  /** Reason for flag */
  reason: string;

  /** Suggested action */
  suggestedAction: string;
}

/**
 * Source mapping for extraction
 */
interface SourceMapping {
  /** Field name */
  field: string;

  /** Source text */
  sourceText: string;

  /** Start index in transcript */
  startIndex: number;

  /** End index in transcript */
  endIndex: number;
}
```

---

## Auto-fill State Interfaces

### Field State

```typescript
/**
 * State for a single auto-fill field
 */
interface FieldState<T> {
  /** Original AI suggestion */
  aiSuggested: T | null;

  /** User-edited value */
  humanEdited: T | null;

  /** Current display mode */
  displayMode: 'ai' | 'edited' | 'empty';

  /** AI confidence score */
  confidence: number;

  /** Source text from transcript */
  sourceText: string | null;

  /** Whether user accepted AI suggestion */
  isAccepted: boolean;

  /** Whether user rejected AI suggestion */
  isRejected: boolean;
}

/**
 * State for array-type auto-fill fields
 */
interface ArrayFieldState<T> {
  /** AI-suggested items */
  aiSuggested: (T & { id: string; confidence: number; sourceText?: string })[];

  /** User-edited/added items */
  humanEdited: (T & { id: string; isFromAI: boolean })[];

  /** Current display mode */
  displayMode: 'ai' | 'merged' | 'manual';
}

/**
 * Complete medical record form state
 */
interface MedicalRecordState {
  /** Transcription state */
  transcription: {
    fullText: string;
    segments: ProcessedSegment[];
    status: 'idle' | 'recording' | 'transcribing' | 'completed' | 'error';
  };

  /** Extraction state */
  extraction: {
    status: 'idle' | 'extracting' | 'completed' | 'error';
    lastExtractedAt: Date | null;
  };

  /** Individual field states */
  chiefComplaint: FieldState<string>;
  historyOfPresentIllness: FieldState<string>;
  symptoms: ArrayFieldState<Symptom>;
  diagnosis: FieldState<Diagnosis>;
  prescriptions: ArrayFieldState<Prescription>;
  vitalSigns: FieldState<VitalSigns>;
  treatmentPlan: FieldState<string>;
  followUp: FieldState<string>;
  allergies: string[];
  currentMedications: string[];

  /** Form status */
  formStatus: 'idle' | 'editing' | 'saving' | 'saved' | 'error';

  /** Whether form has unsaved changes */
  isDirty: boolean;

  /** Last saved timestamp */
  lastSavedAt: Date | null;
}
```

### Actions

```typescript
/**
 * Actions for medical record state management
 */
type MedicalRecordAction =
  // Transcription actions
  | { type: 'SET_TRANSCRIPTION'; payload: { text: string; segments: ProcessedSegment[] } }
  | { type: 'SET_TRANSCRIPTION_STATUS'; payload: MedicalRecordState['transcription']['status'] }

  // Extraction actions
  | { type: 'SET_EXTRACTION_STATUS'; payload: MedicalRecordState['extraction']['status'] }
  | { type: 'APPLY_EXTRACTION'; payload: ExtractedFields }
  | { type: 'CLEAR_ALL_AI_SUGGESTIONS' }

  // Field actions
  | { type: 'UPDATE_FIELD'; payload: { field: string; value: unknown } }
  | { type: 'ACCEPT_AI_SUGGESTION'; payload: { field: string } }
  | { type: 'REJECT_AI_SUGGESTION'; payload: { field: string } }
  | { type: 'EDIT_FIELD'; payload: { field: string; value: unknown } }

  // Array field actions
  | { type: 'ADD_SYMPTOM'; payload: Symptom & { isFromAI: boolean } }
  | { type: 'UPDATE_SYMPTOM'; payload: { id: string; data: Partial<Symptom> } }
  | { type: 'REMOVE_SYMPTOM'; payload: { id: string } }
  | { type: 'ACCEPT_SYMPTOM'; payload: { id: string } }
  | { type: 'REJECT_SYMPTOM'; payload: { id: string } }

  | { type: 'ADD_PRESCRIPTION'; payload: Prescription & { isFromAI: boolean } }
  | { type: 'UPDATE_PRESCRIPTION'; payload: { id: string; data: Partial<Prescription> } }
  | { type: 'REMOVE_PRESCRIPTION'; payload: { id: string } }
  | { type: 'ACCEPT_PRESCRIPTION'; payload: { id: string } }
  | { type: 'REJECT_PRESCRIPTION'; payload: { id: string } }

  // Form actions
  | { type: 'SET_FORM_STATUS'; payload: MedicalRecordState['formStatus'] }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET_FORM' };
```

---

## API Response Interfaces

### Standard API Response

```typescript
/**
 * Standard API response wrapper
 */
interface APIResponse<T> {
  /** Whether request succeeded */
  success: boolean;

  /** Response data (if success) */
  data?: T;

  /** Error details (if failure) */
  error?: APIError;

  /** Response metadata */
  meta?: {
    timestamp: string;
    requestId: string;
    processingTime?: number;
  };
}

/**
 * API error details
 */
interface APIError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Whether operation can be retried */
  retryable?: boolean;

  /** Milliseconds to wait before retry */
  retryAfter?: number;

  /** Whether fallback is available */
  fallbackAvailable?: boolean;

  /** Additional error details */
  details?: Record<string, unknown>;
}
```

### Endpoint-Specific Responses

```typescript
/**
 * Transcription endpoint response
 */
interface TranscriptionAPIResponse extends APIResponse<{
  transcriptId: string;
  text: string;
  segments: ProcessedSegment[];
  duration: number;
  language: string;
}> {}

/**
 * Extraction endpoint response
 */
interface ExtractionAPIResponse extends APIResponse<{
  extractionId: string;
  fields: ExtractedFields;
  flags: ExtractionFlag[];
  sourceMappings: SourceMapping[];
  processingTime: number;
}> {}

/**
 * Summary generation endpoint response
 */
interface SummaryAPIResponse extends APIResponse<{
  summaryId: string;
  text: string;
  aiGenerated: boolean;
  generatedAt: string;
}> {}
```

---

## Error Interfaces

```typescript
/**
 * Error category enumeration
 */
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

/**
 * AI-specific error
 */
interface AIError {
  /** Error code */
  code: string;

  /** Error category */
  category: ErrorCategory;

  /** Technical error message */
  message: string;

  /** User-friendly error message */
  userMessage: string;

  /** Technical details for debugging */
  technicalDetails?: string;

  /** Whether operation can be retried */
  retryable: boolean;

  /** Milliseconds to wait before retry */
  retryAfter?: number;

  /** Whether fallback option is available */
  fallbackAvailable: boolean;

  /** Recommended fallback action */
  fallbackAction: 'retry' | 'manual_entry' | 'partial_result' | 'skip' | 'contact_support';

  /** Error severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Recording-specific error
 */
interface RecordingError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Whether error is recoverable */
  recoverable: boolean;

  /** Recommended action */
  action: 'retry' | 'manual' | 'settings' | 'none';
}
```

---

## Configuration Interfaces

```typescript
/**
 * Complete AI integration configuration
 */
interface AIIntegrationConfig {
  /** Audio capture configuration */
  audio: AudioCaptureConfig;

  /** Transcription configuration */
  transcription: TranscriptionConfig;

  /** Extraction configuration */
  extraction: ExtractionConfig;

  /** Cost management configuration */
  cost: CostConfig;

  /** Security configuration */
  security: SecurityConfig;
}

/**
 * Transcription configuration
 */
interface TranscriptionConfig {
  /** Whisper model to use */
  model: 'whisper-1';

  /** Default language */
  defaultLanguage: 'en' | 'es';

  /** API timeout in milliseconds */
  timeout: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Medical terminology prompt */
  medicalPrompt: string;
}

/**
 * Extraction configuration
 */
interface ExtractionConfig {
  /** GPT model to use */
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

  /** Temperature for generation */
  temperature: number;

  /** Maximum response tokens */
  maxTokens: number;

  /** API timeout in milliseconds */
  timeout: number;

  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Cost management configuration
 */
interface CostConfig {
  /** Whether budget enforcement is enabled */
  enabled: boolean;

  /** Monthly budget limit in USD */
  monthlyLimit: number;

  /** Daily budget limit in USD */
  dailyLimit?: number;

  /** Warning threshold (0-1) */
  warningThreshold: number;

  /** Whether to disable AI at limit */
  hardLimitEnabled: boolean;
}

/**
 * Security configuration
 */
interface SecurityConfig {
  /** Encrypt temporary files */
  encryptTempFiles: boolean;

  /** Maximum temp file age in milliseconds */
  maxTempFileAge: number;

  /** Delete files after processing */
  deleteAfterProcessing: boolean;

  /** Enable audit logging */
  auditLogging: boolean;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;

  /** Base delay in milliseconds */
  baseDelay: number;

  /** Maximum delay in milliseconds */
  maxDelay: number;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Random jitter range in milliseconds */
  jitterRange: number;

  /** HTTP status codes that should trigger retry */
  retryableStatuses: number[];
}
```

---

## Event Interfaces

```typescript
/**
 * Audio capture events
 */
interface AudioCaptureEvents {
  onRecordingStart: () => void;
  onRecordingStop: (audioBlob: Blob) => void;
  onRecordingPause: () => void;
  onRecordingResume: () => void;
  onChunkReady: (chunk: AudioChunk) => void;
  onAudioLevelChange: (level: number) => void;
  onError: (error: RecordingError) => void;
}

/**
 * Transcription events
 */
interface TranscriptionEvents {
  onTranscriptionStart: () => void;
  onTranscriptionProgress: (progress: number) => void;
  onTranscriptionComplete: (result: TranscriptionResult) => void;
  onTranscriptionError: (error: AIError) => void;
}

/**
 * Extraction events
 */
interface ExtractionEvents {
  onExtractionStart: () => void;
  onExtractionProgress: (progress: number) => void;
  onExtractionComplete: (result: ExtractionResult) => void;
  onExtractionError: (error: AIError) => void;
  onFieldExtracted: (field: string, value: ExtractedValue<unknown>) => void;
}

/**
 * Auto-fill events
 */
interface AutoFillEvents {
  onFieldPopulated: (field: string) => void;
  onFieldAccepted: (field: string) => void;
  onFieldRejected: (field: string) => void;
  onFieldEdited: (field: string, newValue: unknown) => void;
  onAllAccepted: () => void;
  onAllCleared: () => void;
}

/**
 * Combined AI processing events
 */
interface AIProcessingEvents extends
  AudioCaptureEvents,
  TranscriptionEvents,
  ExtractionEvents,
  AutoFillEvents {}
```

---

## Service Interfaces

```typescript
/**
 * Audio capture service interface
 */
interface IAudioCaptureService {
  requestMicrophonePermission(): Promise<boolean>;
  startRecording(onChunkReady?: (chunk: AudioChunk) => void): Promise<void>;
  stopRecording(): Promise<Blob>;
  pauseRecording(): void;
  resumeRecording(): void;
  getRecordingDuration(): number;
  getAudioLevel(): number;
}

/**
 * Transcription service interface
 */
interface ITranscriptionService {
  transcribe(
    audioBuffer: Buffer,
    options?: Partial<TranscriptionConfig>
  ): Promise<TranscriptionResult>;

  transcribeWithRetry(
    audioBuffer: Buffer,
    options?: Partial<TranscriptionConfig>
  ): Promise<TranscriptionResult>;
}

/**
 * Extraction service interface
 */
interface IExtractionService {
  extract(
    transcript: string,
    options?: Partial<ExtractionOptions>
  ): Promise<ExtractionResult>;

  extractPartial(
    transcript: string
  ): Promise<Partial<ExtractedFields> | null>;
}

/**
 * Cost tracking service interface
 */
interface ICostTrackingService {
  logUsage(record: Omit<APIUsageRecord, 'id' | 'timestamp'>): Promise<void>;
  getDailyUsage(userId: string, date: Date): Promise<DailyUsageSummary>;
  getMonthlyUsage(userId: string, year: number, month: number): Promise<MonthlyUsageSummary>;
  checkBudget(userId: string): Promise<BudgetStatus>;
}

/**
 * Audit logging service interface
 */
interface IAuditLoggingService {
  log(entry: Omit<AIAuditLog, 'id' | 'timestamp'>): Promise<void>;
  query(
    filters: Partial<Pick<AIAuditLog, 'userId' | 'action' | 'appointmentId'>>,
    options: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }
  ): Promise<AIAuditLog[]>;
}
```

---

## Usage Record Interfaces

```typescript
/**
 * API usage record
 */
interface APIUsageRecord {
  /** Record ID */
  id: string;

  /** Timestamp */
  timestamp: Date;

  /** Associated appointment */
  appointmentId: string;

  /** User who initiated */
  userId: string;

  /** Operation type */
  operation: 'transcription' | 'extraction' | 'summary';

  /** Audio duration in seconds (transcription) */
  audioDuration?: number;

  /** Audio file size in bytes */
  audioSize?: number;

  /** Input tokens used (GPT) */
  inputTokens?: number;

  /** Output tokens used (GPT) */
  outputTokens?: number;

  /** Model used */
  model?: string;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Whether operation succeeded */
  success: boolean;

  /** Error code if failed */
  errorCode?: string;
}

/**
 * Daily usage summary
 */
interface DailyUsageSummary {
  /** Date (YYYY-MM-DD) */
  date: string;

  /** User ID */
  userId: string;

  /** Operation counts */
  operations: {
    transcriptions: number;
    extractions: number;
    summaries: number;
  };

  /** Usage metrics */
  metrics: {
    totalAudioMinutes: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };

  /** Number of appointments processed */
  appointments: number;
}

/**
 * Monthly usage summary
 */
interface MonthlyUsageSummary {
  /** Month (YYYY-MM) */
  month: string;

  /** User ID */
  userId: string;

  /** Total metrics for month */
  totals: {
    transcriptions: number;
    extractions: number;
    summaries: number;
    audioMinutes: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };

  /** Daily breakdown */
  dailyBreakdown: DailyUsageSummary[];

  /** Number of appointments processed */
  appointments: number;
}

/**
 * Budget status
 */
interface BudgetStatus {
  /** Whether operations are allowed */
  allowed: boolean;

  /** Remaining budget in USD */
  remaining: number;

  /** Percentage of budget used (0-1) */
  percentUsed: number;

  /** Warning or error message */
  message?: string;
}
```

---

## References

- [Audio Capture Specification](./audio-capture.md)
- [Transcription Pipeline](./transcription-pipeline.md)
- [Field Extraction](./field-extraction.md)
- [Auto-fill Specification](./auto-fill.md)
- [Error Handling](./error-handling.md)
- [Cost Management](./cost-management.md)
- [Security](./security.md)
