# Ticket 010: AI Transcription Backend

## Type
Feature

## Priority
P1-High

## Story Reference
US-006: AI Transcription Recording
US-007: AI Auto-Fill Medical Record

## Description
Implement the backend services for audio transcription using OpenAI Whisper and medical field extraction using GPT-4. This includes WebSocket communication for real-time transcription, audio processing, and structured data extraction from transcripts.

## Acceptance Criteria
- [ ] Start transcription session for appointment
- [ ] Accept audio chunks via HTTP or WebSocket
- [ ] Process audio with OpenAI Whisper API
- [ ] Return real-time transcription updates via WebSocket
- [ ] Extract medical fields using GPT-4
- [ ] Return structured data (symptoms, diagnosis, prescriptions)
- [ ] Store transcript in medical record
- [ ] Handle API failures gracefully
- [ ] Support recordings up to 60 minutes
- [ ] Track extraction confidence scores

## Technical Requirements

### Backend Tasks

#### Whisper Service (`src/services/ai/whisper.service.ts`)
- [ ] `transcribe(audioBuffer)` - Transcribe audio to text
- [ ] `transcribeChunk(audioBuffer)` - Transcribe audio chunk
- [ ] Handle audio format conversion if needed
- [ ] Retry logic for API failures
- [ ] Rate limiting awareness

#### GPT Service (`src/services/ai/gpt.service.ts`)
- [ ] `extractMedicalFields(transcript)` - Extract structured data
- [ ] Create medical extraction prompt
- [ ] Parse GPT response into structured format
- [ ] Include confidence scores
- [ ] Handle extraction errors

#### Extraction Service (`src/services/ai/extraction.service.ts`)
- [ ] `extractSymptoms(transcript)` - Extract symptoms
- [ ] `extractDiagnosis(transcript)` - Extract diagnosis
- [ ] `extractPrescriptions(transcript)` - Extract prescriptions
- [ ] `extractChiefComplaint(transcript)` - Extract complaint
- [ ] `extractAll(transcript)` - Full extraction
- [ ] Define JSON schema for extraction
- [ ] Validate extracted data

#### Transcription Controller (`src/controllers/transcription.controller.ts`)
- [ ] `startSession` - POST /appointments/:id/transcription/start
- [ ] `uploadAudio` - POST /appointments/:id/transcription/audio
- [ ] `stopSession` - POST /appointments/:id/transcription/stop
- [ ] `getTranscription` - GET /appointments/:id/transcription
- [ ] `extractFields` - POST /appointments/:id/extract-fields

#### Transcription Routes (`src/routes/transcription.routes.ts`)
- [ ] All routes protected with auth middleware
- [ ] Configure multer for audio upload
- [ ] File size limits (50MB per chunk)

#### WebSocket Handler (`src/websocket/transcription.handler.ts`)
- [ ] Handle `audio_chunk` event
- [ ] Emit `transcription_update` events
- [ ] Emit `field_extraction` events
- [ ] Emit `status` events
- [ ] Emit `error` events
- [ ] Handle `stop_recording` event
- [ ] Handle connection/disconnection

#### WebSocket Setup (`src/websocket/index.ts`)
- [ ] Initialize Socket.io server
- [ ] Authentication middleware
- [ ] Room management (per appointment)
- [ ] Connection logging

#### Audio Utility (`src/utils/audio.ts`)
- [ ] `processAudioChunk(buffer)` - Process audio
- [ ] `mergeAudioChunks(chunks)` - Combine chunks
- [ ] `convertToWav(buffer)` - Format conversion
- [ ] Validate audio format

#### Transcription Session Store
- [ ] In-memory store for active sessions
- [ ] Track session state
- [ ] Buffer audio chunks
- [ ] Store partial transcripts

## API Endpoints Involved

### POST /api/v1/appointments/:id/transcription/start
**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "appointmentId": "uuid",
    "status": "active",
    "websocketUrl": "ws://localhost:3000",
    "websocketRoom": "transcription:uuid"
  }
}
```

### POST /api/v1/appointments/:id/transcription/audio
**Request:** multipart/form-data with audio file
**Response (200):**
```json
{
  "success": true,
  "data": {
    "chunkId": "uuid",
    "transcript": "Patient reports headache...",
    "isPartial": true
  }
}
```

### POST /api/v1/appointments/:id/transcription/stop
**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "completed",
    "fullTranscript": "...",
    "duration": 1234
  }
}
```

### GET /api/v1/appointments/:id/transcription
**Response (200):**
```json
{
  "success": true,
  "data": {
    "transcript": "Full transcription text...",
    "duration": 1234,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### POST /api/v1/appointments/:id/extract-fields
**Request (optional):**
```json
{
  "transcript": "Optional custom transcript..."
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "chiefComplaint": {
      "value": "Persistent headache for 3 days",
      "confidence": 0.95,
      "sourceText": "I've had this headache for three days now"
    },
    "symptoms": [
      {
        "name": "Headache",
        "severity": 7,
        "duration": "3 days",
        "confidence": 0.92,
        "sourceText": "..."
      }
    ],
    "diagnosis": {
      "value": "Tension headache",
      "confidence": 0.85,
      "sourceText": "..."
    },
    "prescriptions": [
      {
        "medication": "Ibuprofen",
        "dosage": "400mg",
        "frequency": "Every 6 hours",
        "duration": "5 days",
        "confidence": 0.88,
        "sourceText": "..."
      }
    ],
    "plan": {
      "value": "Rest, hydration, follow up if symptoms persist",
      "confidence": 0.80
    }
  }
}
```

### WebSocket Events

#### Client → Server
- `audio_chunk` - Send audio data
- `stop_recording` - Stop session
- `ping` - Keep alive

#### Server → Client
- `connected` - Connection established
- `transcription_update` - New transcript text
- `field_extraction` - Extracted fields
- `status` - Session status update
- `error` - Error notification
- `completed` - Session complete
- `pong` - Keep alive response

## Components Involved
None - backend only.

## Data Models Involved
- MedicalRecord (stores transcript)
- Appointment (session association)

## Testing Requirements

### Unit Tests

#### Whisper Service (`tests/unit/services/ai/whisper.service.test.ts`)
- [ ] `transcribe` calls OpenAI API correctly
- [ ] `transcribe` handles API errors
- [ ] `transcribe` returns transcript text
- [ ] Retry logic works on failure

#### GPT Service (`tests/unit/services/ai/gpt.service.test.ts`)
- [ ] `extractMedicalFields` calls OpenAI API
- [ ] `extractMedicalFields` parses response correctly
- [ ] Handles malformed responses
- [ ] Includes confidence scores

#### Extraction Service (`tests/unit/services/ai/extraction.service.test.ts`)
- [ ] `extractSymptoms` returns symptom array
- [ ] `extractDiagnosis` returns diagnosis object
- [ ] `extractPrescriptions` returns prescription array
- [ ] `extractAll` combines all extractions
- [ ] Handles empty transcript

### Integration Tests (`tests/integration/routes/transcription.routes.test.ts`)
- [ ] POST /transcription/start creates session
- [ ] POST /transcription/audio accepts file
- [ ] POST /transcription/stop completes session
- [ ] GET /transcription returns stored transcript
- [ ] POST /extract-fields returns structured data
- [ ] Authentication required for all endpoints

### WebSocket Tests (`tests/integration/websocket/transcription.test.ts`)
- [ ] Client can connect with auth
- [ ] audio_chunk processed correctly
- [ ] transcription_update emitted
- [ ] Session cleanup on disconnect

## Dependencies
- TICKET-001: Database Schema
- TICKET-002: Auth Backend
- TICKET-008: Medical Records Backend

## Estimation
8 Story Points

## Implementation Notes
- Use OpenAI Whisper API (whisper-1 model)
- Use GPT-4 for extraction (better accuracy)
- Consider using GPT-4o for faster responses
- Buffer audio chunks in memory during session
- Process chunks in batches for efficiency
- WebSocket rooms scoped per appointment
- Include session timeout (auto-stop after inactivity)
- Log all AI API calls for debugging
- Consider fallback for API rate limits
- Transcript should be saved incrementally
- Extraction prompt should be tuned for medical context

### GPT Extraction Prompt Template
```
You are a medical transcription assistant. Extract structured medical information from the following doctor-patient consultation transcript.

Return JSON with:
- chiefComplaint: Main reason for visit
- symptoms: Array of {name, severity (1-10), duration}
- diagnosis: Primary diagnosis if mentioned
- prescriptions: Array of {medication, dosage, frequency, duration}
- plan: Treatment plan

Include confidence scores (0-1) for each extraction.

Transcript:
{transcript}
```

## Environment Variables
- `OPENAI_API_KEY` - OpenAI API key

## Files to Create/Modify

### Backend
- `src/services/ai/whisper.service.ts`
- `src/services/ai/gpt.service.ts`
- `src/services/ai/extraction.service.ts`
- `src/controllers/transcription.controller.ts`
- `src/routes/transcription.routes.ts`
- `src/websocket/index.ts`
- `src/websocket/transcription.handler.ts`
- `src/utils/audio.ts`
- `src/validators/transcription.validator.ts`
- `src/types/ai.types.ts`
- `src/routes/index.ts` (add routes)
- `src/index.ts` (add WebSocket server)
- `tests/unit/services/ai/whisper.service.test.ts`
- `tests/unit/services/ai/gpt.service.test.ts`
- `tests/unit/services/ai/extraction.service.test.ts`
- `tests/integration/routes/transcription.routes.test.ts`
- `tests/integration/websocket/transcription.test.ts`

## Definition of Done
- [ ] Transcription API fully functional
- [ ] Audio processing working
- [ ] Whisper integration working
- [ ] GPT extraction returning structured data
- [ ] WebSocket real-time updates working
- [ ] Transcript stored in medical record
- [ ] Confidence scores included
- [ ] Unit tests passing (mocked APIs)
- [ ] Integration tests passing
- [ ] Error handling graceful
- [ ] Code reviewed and approved
