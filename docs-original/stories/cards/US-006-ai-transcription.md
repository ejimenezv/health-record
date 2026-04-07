# User Story US-006: AI Transcription Recording

## Story Card

**As a** doctor
**I want to** record the audio of my patient consultation and have it transcribed
**So that** I have a text record of the conversation to reference and extract information from

---

## Description

During a consultation, the doctor can start an audio recording that captures the conversation with the patient. The recording is processed after stopping, converting speech to text using AI. The transcript is displayed alongside the medical record form, allowing the doctor to reference what was discussed.

This is the first of two AI-powered features and serves as the input for the auto-fill functionality (US-007).

---

## Acceptance Criteria

- [ ] Given I am on an appointment record page, when I view the page, then I see a "Start Recording" button
- [ ] Given I click "Start Recording", when the browser requests microphone permission, then the permission dialog appears
- [ ] Given microphone permission is granted, when recording starts, then I see a visual indicator (red dot, timer)
- [ ] Given recording is active, when I view the interface, then I see the elapsed recording time
- [ ] Given recording is active, when I click "Stop Recording", then recording stops and processing begins
- [ ] Given recording has stopped, when processing begins, then I see a loading indicator with "Transcribing..."
- [ ] Given transcription completes, when results are ready, then the transcript text appears in the transcript panel
- [ ] Given transcription fails, when an error occurs, then I see an error message with option to retry or proceed manually
- [ ] Given transcript is displayed, when I view it, then it shows the conversation in readable format
- [ ] Given recording is saved, when the appointment is saved, then the audio file and transcript are persisted with the appointment

---

## Priority

**Must-Have (P0)**

---

## Story Points

**8 points**

Rationale: Complex browser API integration, audio handling, API integration, and error handling.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Create Appointment | Required | US-004 |
| Data Persistence | Required | US-011 |
| OpenAI Whisper API | External | - |

---

## Technical Notes

### Data Model

```typescript
interface Transcript {
  id: string;
  appointmentId: string;
  audioUrl?: string;         // URL to stored audio file
  audioFormat: string;       // e.g., 'webm', 'mp3'
  audioDuration: number;     // Duration in seconds
  text: string;              // Full transcript text
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  processedAt?: Date;
}
```

### Implementation Considerations

#### Audio Recording
- Use Web Audio API for browser-based recording
- Format: WebM with Opus codec for browser compatibility
- Sample rate: 44.1kHz, mono channel
- Maximum recording length: 60 minutes
- Enable noise suppression if available
- Handle microphone permission denial gracefully

#### Transcription
- Upload audio to server/cloud storage
- Call OpenAI Whisper API for transcription
- Estimated processing time: 15-60 seconds for 15-minute recording
- Handle API rate limits and errors
- Store both audio file reference and transcript text

#### Audio Storage
- Store audio in cloud storage (S3, Cloudflare R2, etc.)
- Generate signed URLs for playback
- Consider audio compression before upload

### API Endpoints

```
POST /api/appointments/:id/recording/start   - Initialize recording session
POST /api/appointments/:id/recording/upload  - Upload audio file
POST /api/appointments/:id/transcribe        - Trigger transcription
GET  /api/appointments/:id/transcript        - Get transcript status/text
DELETE /api/appointments/:id/recording       - Delete recording
```

### Whisper API Integration

```typescript
// Example: OpenAI Whisper API call
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-1",
  language: "en",
  response_format: "text"
});
```

---

## UI/UX Notes

### Recording Controls (Idle State)

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 February 21, 2026  │  Follow-up  │  🔵 In Progress          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │              🎤 Start Recording                           │ │
│  │                                                           │ │
│  │     Record your consultation for AI-assisted             │ │
│  │     documentation                                         │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Recording Active State

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 February 21, 2026  │  Follow-up  │  🔵 In Progress          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │              🔴 Recording...     12:34                    │ │
│  │              ▓▓▓▓▓▓░░░░░░░░░░   (audio level)             │ │
│  │                                                           │ │
│  │              [  ⬛ Stop Recording  ]                      │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Processing State

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 February 21, 2026  │  Follow-up  │  🔵 In Progress          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │              ⏳ Transcribing audio...                     │ │
│  │              ═══════════▒▒▒▒▒▒▒▒▒▒                        │ │
│  │                                                           │ │
│  │     This may take up to a minute                         │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Transcript Display

```
┌─────────────────────────────────────────────────────────────────┐
│  TRANSCRIPT                                          [▶ Play]   │
│  ─────────                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Doctor: Good morning, what brings you in today?       │   │
│  │                                                         │   │
│  │  Patient: I've been having these headaches for about   │   │
│  │  two weeks now. They're mostly in the front of my      │   │
│  │  head and seem to be worse in the morning.             │   │
│  │                                                         │   │
│  │  Doctor: How would you rate the pain on a scale of     │   │
│  │  one to ten?                                            │   │
│  │                                                         │   │
│  │  Patient: I'd say about a six. It's not unbearable    │   │
│  │  but it's definitely affecting my work.                │   │
│  │                                                         │   │
│  │  Doctor: And are you experiencing any other symptoms?  │   │
│  │                                                         │   │
│  │  Patient: Yes, I've been feeling really tired lately, │   │
│  │  even though I'm sleeping enough...                    │   │
│  │                                                         │   │
│  │  [Recording: 12:34]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [🔄 Re-record]  [Extract with AI →]                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │              ❌ Transcription failed                      │ │
│  │                                                           │ │
│  │     Unable to process audio. Please try again or         │ │
│  │     continue with manual entry.                          │ │
│  │                                                           │ │
│  │     [  Retry  ]     [  Continue Manually  ]              │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Recording controls should be prominent and always visible during appointment
- Clear visual feedback for recording state (pulsing red indicator)
- Timer should show MM:SS format
- Audio level indicator for feedback that microphone is working
- Processing state should show progress if possible
- Transcript panel should be scrollable and readable
- Consider side-by-side layout: transcript | form
- Provide audio playback option after recording

### Microphone Permission

- Request permission on first "Start Recording" click
- Show clear instructions if permission denied
- Remember permission grant for future sessions

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Start recording | Click start | Timer begins, visual indicator shows |
| Permission denied | Deny mic access | Show error with instructions |
| Stop recording | Click stop | Recording stops, processing begins |
| Successful transcription | Valid audio | Transcript displayed |
| API failure | Network error | Error message with retry option |
| Empty recording | Record silence | Transcript shows empty or minimal text |
| Long recording | 30 minutes | Processes successfully |
| Re-record | Click re-record | Previous recording replaced |
| Playback | Click play | Audio plays back |

---

## Definition of Done

- [ ] Start Recording button visible
- [ ] Microphone permission requested
- [ ] Recording indicator shows during recording
- [ ] Timer displays elapsed time
- [ ] Stop Recording ends capture
- [ ] Audio uploaded to server
- [ ] Whisper API called for transcription
- [ ] Transcript displayed on completion
- [ ] Error handling for all failure cases
- [ ] Audio playback works
- [ ] Re-record option available
- [ ] Unit tests pass
- [ ] Manual QA verified
