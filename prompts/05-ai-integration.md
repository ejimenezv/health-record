# Prompt 05: AI Integration Specification

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the SIXTH prompt in the series. Previous prompts completed research, product definition, user stories, architecture, and tech stack.

## Prerequisites
Before proceeding, read the following files:
- `docs/research/ai-transcription-approach.md`
- `docs/architecture/integrations.md`
- `docs/tech-stack/ai-services.md`
- `docs/stories/cards/US-006-ai-transcription.md`
- `docs/stories/cards/US-007-ai-auto-fill.md`
- `docs/stories/cards/US-008-summary-generation.md`

## Objective
Create detailed specifications for the AI integration layer, including audio capture, transcription, field extraction, and real-time auto-fill functionality. This document will guide the implementation of the AI features.

## Tasks

### 1. Audio Capture Specification
Create `docs/ai-integration/audio-capture.md` with:

**Browser Audio Capture**:
```typescript
// Conceptual interface
interface AudioCaptureConfig {
  sampleRate: number;        // 16000 Hz recommended for Whisper
  channelCount: number;      // 1 (mono)
  mimeType: string;          // 'audio/webm' or 'audio/wav'
  maxDuration: number;       // 60 minutes in ms
}
```

**Implementation Approach**:
- Use MediaRecorder API
- Capture in chunks (e.g., every 30 seconds) for real-time processing
- Handle browser compatibility
- Memory management for long recordings

**Audio Chunking Strategy**:
- Chunk duration: 30 seconds
- Overlap handling for continuous speech
- Buffer management
- Error recovery

**Client-Side Processing**:
- Audio format conversion if needed
- Compression considerations
- Upload strategy (streaming vs batch)

### 2. Transcription Pipeline Specification
Create `docs/ai-integration/transcription-pipeline.md` with:

**Whisper API Integration**:
```typescript
// API Request Structure
interface TranscriptionRequest {
  file: Buffer;              // Audio file buffer
  model: 'whisper-1';
  language?: string;         // 'es' for Spanish, 'en' for English
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json';
  prompt?: string;           // Medical terminology hints
}

// API Response Structure
interface TranscriptionResponse {
  text: string;
  segments?: TranscriptionSegment[];
  language: string;
  duration: number;
}
```

**Real-time Transcription Flow**:
1. Client captures audio chunk (30 seconds)
2. Client sends chunk to backend via WebSocket/HTTP
3. Backend sends to Whisper API
4. Backend receives transcription
5. Backend broadcasts transcription to client
6. Client displays transcription in real-time

**Optimizations**:
- Queue management for multiple chunks
- Concurrent processing limits
- Retry logic with exponential backoff
- Cost tracking per request

### 3. Field Extraction Specification
Create `docs/ai-integration/field-extraction.md` with:

**GPT-4 Integration for Field Extraction**:
```typescript
interface ExtractionRequest {
  transcription: string;
  previousContext?: string;  // Earlier parts of conversation
}

interface ExtractedFields {
  symptoms: Symptom[];
  diagnosis: Diagnosis | null;
  prescriptions: Prescription[];
  vitalSigns?: VitalSign[];
  confidence: number;        // 0-1 confidence score
}

interface Symptom {
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  onset?: string;
}

interface Diagnosis {
  description: string;
  icdCode?: string;          // Optional ICD-10 code
  confidence: number;
}

interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}
```

**Prompt Engineering**:
```markdown
System Prompt (example):
"You are a medical documentation assistant. Extract structured medical
information from doctor-patient conversations. Be precise and only include
information explicitly mentioned. Return JSON format.

Extract:
- symptoms: List of symptoms mentioned by the patient
- diagnosis: The doctor's diagnosis if stated
- prescriptions: Any medications prescribed with dosage details

If information is not present, use null or empty arrays. Include confidence
scores for each extraction."
```

**Extraction Strategy**:
- Process transcription incrementally (as new chunks arrive)
- Maintain conversation context across chunks
- Update fields progressively (not replace entirely)
- Flag uncertain extractions for human review

### 4. Real-time Auto-fill Specification
Create `docs/ai-integration/auto-fill.md` with:

**State Management for Auto-fill**:
```typescript
interface MedicalRecordState {
  symptoms: {
    aiSuggested: Symptom[];
    humanEdited: Symptom[];
    displayMode: 'ai' | 'edited';
  };
  diagnosis: {
    aiSuggested: Diagnosis | null;
    humanEdited: Diagnosis | null;
    displayMode: 'ai' | 'edited';
  };
  prescriptions: {
    aiSuggested: Prescription[];
    humanEdited: Prescription[];
    displayMode: 'ai' | 'edited';
  };
  transcription: {
    fullText: string;
    segments: TranscriptionSegment[];
  };
  status: 'idle' | 'recording' | 'processing' | 'completed';
}
```

**UI Update Strategy**:
- Visual indication of AI-suggested vs human-edited content
- Highlight new/updated fields
- Allow easy accept/reject of suggestions
- Maintain edit history

**Real-time Update Flow**:
1. New transcription chunk arrives
2. Extraction service processes chunk
3. New fields merged with existing state
4. UI updates with visual feedback
5. User can edit at any time

### 5. Error Handling & Fallbacks
Create `docs/ai-integration/error-handling.md` with:

**API Error Handling**:
- Rate limiting (429): Queue and retry
- Server errors (5xx): Retry with backoff
- Invalid audio (400): Show user-friendly error
- Timeout: Partial save and notification

**Fallback Strategies**:
- If Whisper fails: Manual transcription entry
- If GPT-4 fails: Manual field entry
- Network issues: Local queue with retry

**User Communication**:
- Loading states for each operation
- Error messages (user-friendly)
- Progress indicators for long recordings

### 6. Cost Management
Create `docs/ai-integration/cost-management.md` with:

**Cost Estimation**:
- Whisper API: ~$0.006/minute
- GPT-4 API: ~$0.03-0.06/1K tokens (varies)
- Estimate per appointment (60 min): ~$0.50-2.00

**Cost Control Measures**:
- Chunk size optimization
- Caching repeated queries
- Model selection (GPT-4-turbo vs GPT-4)
- Usage tracking per user/appointment

### 7. Security Considerations
Create `docs/ai-integration/security.md` with:

**Data Privacy**:
- Audio files temporary storage only
- Delete after processing
- No logging of PHI (Protected Health Information)
- Encryption in transit

**API Key Security**:
- Server-side only (never expose to client)
- Environment variable management
- Key rotation capability

### 8. Integration Interfaces
Create `docs/ai-integration/interfaces.md` with complete TypeScript interfaces for:
- All AI-related DTOs
- Service interfaces
- Event types for real-time updates
- Configuration types

### 9. Create AI Integration Summary
Create `docs/ai-integration/ai-integration-summary.md` with:
- Architecture diagram of AI flow
- Key interfaces reference
- Implementation checklist
- API cost summary
- Testing strategy for AI features

## Output Structure
```
docs/
├── research/           (from prompt 00)
├── product/            (from prompt 01)
├── stories/            (from prompt 02)
├── architecture/       (from prompt 03)
├── tech-stack/         (from prompt 04)
├── ai-integration/
│   ├── audio-capture.md
│   ├── transcription-pipeline.md
│   ├── field-extraction.md
│   ├── auto-fill.md
│   ├── error-handling.md
│   ├── cost-management.md
│   ├── security.md
│   ├── interfaces.md
│   └── ai-integration-summary.md
└── deliverables/
    └── ... (previous sections)
```

## Success Criteria
- Audio capture specification complete
- Transcription pipeline detailed
- Field extraction with prompts defined
- Auto-fill logic specified
- Error handling documented
- Cost management addressed
- Security considerations documented
- All interfaces defined
- Summary document created

## Next Prompt
The next prompt (06-data-modeling.md) will define the complete data model based on all previous specifications.
