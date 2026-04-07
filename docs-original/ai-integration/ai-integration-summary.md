# AI Integration Summary: MedRecord AI

This document provides a comprehensive summary of the AI integration layer, including architecture overview, key interfaces, implementation checklist, and testing strategy.

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            MedRecord AI - Integration Architecture                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │   Browser   │      │   Backend   │      │   OpenAI    │      │  Database   │        │
│  │   Client    │      │   Server    │      │    APIs     │      │             │        │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘        │
│         │                    │                    │                    │               │
│    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐          ┌────┴────┐          │
│    │  Audio  │          │   AI    │          │ Whisper │          │ Medical │          │
│    │ Capture │─────────▶│ Service │─────────▶│   API   │          │ Records │          │
│    └────┬────┘   HTTPS  └────┬────┘   HTTPS  └────┬────┘          └────┬────┘          │
│         │                    │                    │                    │               │
│         │                    │   ┌────────────────┘                    │               │
│         │                    │   │                                     │               │
│         │                    │   ▼                                     │               │
│    ┌────┴────┐          ┌────┴────┐          ┌────────┐          ┌────┴────┐          │
│    │  Form   │          │  Field  │◀─────────│ GPT-4  │          │ Persist │          │
│    │Auto-fill│◀─────────│Extract  │   HTTPS  │  API   │─────────▶│  Data   │          │
│    └─────────┘          └─────────┘          └────────┘          └─────────┘          │
│                                                                                          │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                          │
│  Data Flow:                                                                              │
│  1. Browser captures audio via MediaRecorder API                                        │
│  2. Audio uploaded to backend via multipart/form-data                                   │
│  3. Backend sends audio to Whisper API for transcription                                │
│  4. Transcript sent to GPT-4 for field extraction                                       │
│  5. Extracted fields returned to frontend for auto-fill                                 │
│  6. Doctor reviews, edits, and saves medical record                                     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Frontend (React)                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐│
│  │                           Recording Interface                                       ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            ││
│  │  │   Audio      │  │   Recording  │  │   Audio      │  │    Upload    │            ││
│  │  │   Capture    │──│   Controls   │──│   Validator  │──│    Handler   │            ││
│  │  │   Service    │  │   Component  │  │              │  │              │            ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            ││
│  └────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐│
│  │                           Auto-fill Interface                                       ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            ││
│  │  │   State      │  │   AI Field   │  │  Transcript  │  │   Accept/    │            ││
│  │  │   Manager    │──│   Components │──│   Panel      │──│   Reject     │            ││
│  │  │   (Context)  │  │              │  │              │  │   Actions    │            ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            ││
│  └────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               Backend (Node.js/Express)                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐│
│  │                              AI Service Layer                                       ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            ││
│  │  │Transcription │  │  Extraction  │  │   Summary    │  │    Retry     │            ││
│  │  │   Service    │  │   Service    │  │   Service    │  │    Handler   │            ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            ││
│  └────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐│
│  │                           Support Services                                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            ││
│  │  │    Cost      │  │    Audit     │  │   Security   │  │    Error     │            ││
│  │  │   Tracking   │  │   Logging    │  │   Handler    │  │   Handler    │            ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            ││
│  └────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Interfaces Reference

### Core Data Types

| Interface | Description | File |
|-----------|-------------|------|
| `AudioCaptureConfig` | Browser audio recording settings | [interfaces.md](./interfaces.md#audio-capture-interfaces) |
| `AudioChunk` | Chunk for real-time processing | [interfaces.md](./interfaces.md#audio-capture-interfaces) |
| `TranscriptionResult` | Transcription output | [interfaces.md](./interfaces.md#transcription-interfaces) |
| `ExtractedFields` | All extracted medical fields | [interfaces.md](./interfaces.md#field-extraction-interfaces) |
| `Symptom` | Symptom data structure | [interfaces.md](./interfaces.md#medical-data-types) |
| `Diagnosis` | Diagnosis data structure | [interfaces.md](./interfaces.md#medical-data-types) |
| `Prescription` | Prescription data structure | [interfaces.md](./interfaces.md#medical-data-types) |
| `MedicalRecordState` | Form state management | [interfaces.md](./interfaces.md#auto-fill-state-interfaces) |

### API Interfaces

| Interface | Description | File |
|-----------|-------------|------|
| `TranscriptionRequest` | Whisper API request | [interfaces.md](./interfaces.md#transcription-interfaces) |
| `ExtractionRequest` | GPT-4 extraction request | [interfaces.md](./interfaces.md#field-extraction-interfaces) |
| `APIResponse<T>` | Standard API response | [interfaces.md](./interfaces.md#api-response-interfaces) |
| `AIError` | AI-specific error type | [interfaces.md](./interfaces.md#error-interfaces) |

### Configuration Interfaces

| Interface | Description | File |
|-----------|-------------|------|
| `AIIntegrationConfig` | Full configuration | [interfaces.md](./interfaces.md#configuration-interfaces) |
| `RetryConfig` | Retry behavior settings | [interfaces.md](./interfaces.md#configuration-interfaces) |
| `CostConfig` | Budget management | [interfaces.md](./interfaces.md#configuration-interfaces) |

---

## Implementation Checklist

### Phase 1: Audio Capture

- [ ] **Browser Audio Capture**
  - [ ] Implement `AudioCaptureService` class
  - [ ] Handle microphone permission requests
  - [ ] Create `useAudioCapture` React hook
  - [ ] Implement audio level monitoring
  - [ ] Add recording timer display

- [ ] **Audio Validation**
  - [ ] Validate file size (< 25MB)
  - [ ] Validate audio format (WebM/Opus)
  - [ ] Validate duration (< 60 minutes)

- [ ] **Error Handling**
  - [ ] Handle permission denied
  - [ ] Handle device not found
  - [ ] Handle recording failures

### Phase 2: Transcription

- [ ] **Backend Service**
  - [ ] Create transcription endpoint (`POST /api/appointments/:id/transcribe`)
  - [ ] Implement Whisper API integration
  - [ ] Add temporary file handling
  - [ ] Implement retry logic

- [ ] **Frontend Integration**
  - [ ] Create `useTranscription` hook
  - [ ] Implement upload progress indicator
  - [ ] Create transcript display component
  - [ ] Add error state handling

- [ ] **Optimizations**
  - [ ] Implement request queuing
  - [ ] Add cost tracking

### Phase 3: Field Extraction

- [ ] **Backend Service**
  - [ ] Create extraction endpoint (`POST /api/appointments/:id/extract`)
  - [ ] Implement GPT-4 integration
  - [ ] Design extraction prompts
  - [ ] Add response validation

- [ ] **Data Processing**
  - [ ] Parse JSON responses
  - [ ] Validate extracted fields
  - [ ] Calculate confidence scores
  - [ ] Map source text positions

- [ ] **Error Handling**
  - [ ] Handle partial extractions
  - [ ] Implement fallbacks

### Phase 4: Auto-fill

- [ ] **State Management**
  - [ ] Create `MedicalRecordContext`
  - [ ] Implement state reducer
  - [ ] Build field state handlers

- [ ] **UI Components**
  - [ ] Create `AIField` component
  - [ ] Create `SymptomCard` component
  - [ ] Create `PrescriptionCard` component
  - [ ] Add confidence indicators
  - [ ] Implement source highlighting

- [ ] **Interactions**
  - [ ] Accept individual suggestions
  - [ ] Reject individual suggestions
  - [ ] Accept all suggestions
  - [ ] Clear all AI suggestions
  - [ ] Edit AI-filled fields

### Phase 5: Error Handling & Recovery

- [ ] **Error System**
  - [ ] Implement error categorization
  - [ ] Create error mapping functions
  - [ ] Add user-friendly messages

- [ ] **Retry Logic**
  - [ ] Implement exponential backoff
  - [ ] Add jitter to prevent thundering herd
  - [ ] Configure retry policies

- [ ] **Fallbacks**
  - [ ] Recording fallback (manual entry)
  - [ ] Transcription fallback (manual entry)
  - [ ] Extraction fallback (partial results)

### Phase 6: Cost & Security

- [ ] **Cost Management**
  - [ ] Implement usage logging
  - [ ] Create daily/monthly aggregation
  - [ ] Add budget enforcement
  - [ ] Create usage dashboard

- [ ] **Security**
  - [ ] Secure API key management
  - [ ] Implement audit logging
  - [ ] Add request validation
  - [ ] Configure security headers
  - [ ] Implement rate limiting

### Phase 7: Testing

- [ ] **Unit Tests**
  - [ ] Audio capture service
  - [ ] Transcription service
  - [ ] Extraction service
  - [ ] State management

- [ ] **Integration Tests**
  - [ ] API endpoint tests
  - [ ] End-to-end flow tests

- [ ] **Mock Services**
  - [ ] Create OpenAI mocks
  - [ ] Create test fixtures

---

## API Cost Summary

### Per-Operation Costs

| Operation | Input | Cost |
|-----------|-------|------|
| Transcription (5 min) | 5 min audio | $0.03 |
| Transcription (15 min) | 15 min audio | $0.09 |
| Transcription (30 min) | 30 min audio | $0.18 |
| Transcription (60 min) | 60 min audio | $0.36 |
| Field Extraction | ~1,500 tokens | $0.075 |
| Summary Generation | ~800 tokens | $0.036 |

### Per-Appointment Estimates

| Appointment Type | Duration | Total Cost |
|-----------------|----------|------------|
| Quick Visit | 5 min | ~$0.11 |
| Standard | 15 min | ~$0.17 |
| Extended | 30 min | ~$0.26 |
| Long Consultation | 60 min | ~$0.44 |

### Monthly Projections

| Usage Level | Appointments/Month | Est. Cost |
|-------------|-------------------|-----------|
| Low | 50 | ~$10 |
| Medium | 150 | ~$30 |
| High | 300 | ~$60 |

---

## Testing Strategy

### Unit Testing

```typescript
// Example: Transcription Service Test
describe('TranscriptionService', () => {
  it('should transcribe audio successfully', async () => {
    const mockAudio = createMockAudioBuffer();
    const result = await transcriptionService.transcribe(mockAudio);

    expect(result.success).toBe(true);
    expect(result.transcript).toBeTruthy();
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should handle API errors gracefully', async () => {
    mockOpenAI.mockRejectedValueOnce(new Error('API Error'));

    const result = await transcriptionService.transcribe(createMockAudioBuffer());

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

### Integration Testing

```typescript
// Example: End-to-End Flow Test
describe('AI Integration Flow', () => {
  it('should complete full transcription and extraction flow', async () => {
    // 1. Upload audio
    const uploadRes = await request(app)
      .post('/api/appointments/test-apt/transcribe')
      .attach('audio', 'test-fixtures/sample.webm')
      .expect(200);

    expect(uploadRes.body.data.text).toBeTruthy();

    // 2. Extract fields
    const extractRes = await request(app)
      .post('/api/appointments/test-apt/extract')
      .send({ language: 'en' })
      .expect(200);

    expect(extractRes.body.data.fields).toBeTruthy();
    expect(extractRes.body.data.fields.symptoms.length).toBeGreaterThan(0);
  });
});
```

### Test Fixtures

| Fixture | Description | Duration |
|---------|-------------|----------|
| `short-conversation.webm` | Simple chief complaint | 30 sec |
| `full-consultation.webm` | Complete appointment | 5 min |
| `complex-prescription.webm` | Multiple medications | 3 min |
| `spanish-consultation.webm` | Spanish language | 5 min |

### Mock Responses

```typescript
// Mock Whisper Response
const mockTranscriptionResponse = {
  text: 'Patient reports headache for three days...',
  language: 'en',
  duration: 300,
  segments: [
    { start: 0, end: 5, text: 'Patient reports headache' },
    // ...
  ],
};

// Mock GPT-4 Extraction Response
const mockExtractionResponse = {
  chiefComplaint: {
    value: 'Headache for 3 days',
    confidence: 0.95,
    sourceText: 'Patient reports headache for three days',
  },
  symptoms: [
    {
      value: { name: 'Headache', severity: 'moderate', severityScore: 6 },
      confidence: 0.9,
    },
  ],
  // ...
};
```

---

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...                    # OpenAI API key

# Optional
OPENAI_ORG_ID=org-...                    # OpenAI organization ID
AI_MONTHLY_BUDGET=50                      # Monthly budget limit ($)
AI_MAX_RETRIES=3                          # Maximum retry attempts
AI_REQUEST_TIMEOUT=120000                 # Request timeout (ms)
AI_AUDIT_LOGGING=true                     # Enable audit logging
```

---

## Document Index

| Document | Description |
|----------|-------------|
| [audio-capture.md](./audio-capture.md) | Browser audio capture specification |
| [transcription-pipeline.md](./transcription-pipeline.md) | Whisper API integration |
| [field-extraction.md](./field-extraction.md) | GPT-4 field extraction |
| [auto-fill.md](./auto-fill.md) | Real-time auto-fill UI |
| [error-handling.md](./error-handling.md) | Error handling & fallbacks |
| [cost-management.md](./cost-management.md) | Cost tracking & budgets |
| [security.md](./security.md) | Security considerations |
| [interfaces.md](./interfaces.md) | TypeScript interfaces |

---

## Related Documentation

| Document | Location |
|----------|----------|
| AI Transcription Research | [docs/research/ai-transcription-approach.md](../research/ai-transcription-approach.md) |
| Integration Architecture | [docs/architecture/integrations.md](../architecture/integrations.md) |
| AI Services Tech Stack | [docs/tech-stack/ai-services.md](../tech-stack/ai-services.md) |
| US-006: AI Transcription | [docs/stories/cards/US-006-ai-transcription.md](../stories/cards/US-006-ai-transcription.md) |
| US-007: AI Auto-Fill | [docs/stories/cards/US-007-ai-auto-fill.md](../stories/cards/US-007-ai-auto-fill.md) |
| US-008: Summary Generation | [docs/stories/cards/US-008-summary-generation.md](../stories/cards/US-008-summary-generation.md) |

---

## Next Steps

After completing the AI integration specification, proceed to:

1. **Data Modeling (Prompt 06)**: Define complete data model based on AI integration requirements
2. **Implementation**: Begin implementing components following the checklist above
3. **Testing**: Create test fixtures and implement test suites
4. **Integration**: Connect AI services with medical record flow
