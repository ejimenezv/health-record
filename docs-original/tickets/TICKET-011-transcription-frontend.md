# Ticket 011: AI Transcription Frontend

## Type
Feature

## Priority
P1-High

## Story Reference
US-006: AI Transcription Recording
US-007: AI Auto-Fill Medical Record

## Description
Implement the frontend components for audio recording, real-time transcription display, and auto-fill integration. This includes the recording controls, live transcription panel, AI extraction visualization, and integration with the medical record form.

## Acceptance Criteria
- [ ] Start/Stop recording button visible
- [ ] Microphone permission requested on start
- [ ] Visual indicator (red dot) during recording
- [ ] Recording timer displayed
- [ ] Real-time transcription appears as audio is processed
- [ ] AI extraction status indicators
- [ ] Auto-populate medical record fields from extraction
- [ ] AI-filled fields have visual indicator (badge)
- [ ] Confidence scores displayed for extractions
- [ ] Accept/Reject buttons for AI suggestions
- [ ] Accept All / Clear All options
- [ ] Source text highlighting on hover (optional)
- [ ] Handles 60-minute recordings
- [ ] Error handling for audio/API failures

## Technical Requirements

### Frontend Tasks

#### Transcription Panel (`src/components/transcription/TranscriptionPanel.tsx`)
- [ ] Container for all transcription components
- [ ] Recording controls section
- [ ] Transcription display section
- [ ] AI extraction status section
- [ ] Collapsible/expandable panel
- [ ] Integration with medical record page

#### Audio Recorder (`src/components/transcription/AudioRecorder.tsx`)
- [ ] Start/Stop recording button
- [ ] Request microphone permission
- [ ] MediaRecorder API integration
- [ ] Recording indicator (pulsing red dot)
- [ ] Recording timer (MM:SS)
- [ ] Audio level visualization (optional)
- [ ] Error state for permission denied

#### Transcription Display (`src/components/transcription/TranscriptionDisplay.tsx`)
- [ ] Scrollable text area
- [ ] Real-time text updates
- [ ] Auto-scroll to bottom
- [ ] Loading indicator for processing
- [ ] Empty state before recording
- [ ] Copy transcript button

#### AI Extraction Status (`src/components/transcription/AIExtractionStatus.tsx`)
- [ ] Processing indicator
- [ ] Extraction categories (symptoms, diagnosis, prescriptions)
- [ ] Count of extracted items
- [ ] Confidence indicators
- [ ] "Apply to Form" button

#### AI Suggestion Badge (`src/components/common/AISuggestionBadge.tsx`)
- [ ] Visual indicator for AI-filled fields
- [ ] Shows confidence percentage
- [ ] Accept/Reject buttons
- [ ] Hover shows source text

#### useAudioRecorder Hook (`src/hooks/useAudioRecorder.ts`)
- [ ] `startRecording()` - Start MediaRecorder
- [ ] `stopRecording()` - Stop and return audio
- [ ] `isRecording` - Recording state
- [ ] `duration` - Recording duration
- [ ] `error` - Permission/recording errors
- [ ] `audioLevel` - Current audio level (optional)
- [ ] Handle audio chunk creation

#### useTranscription Hook (`src/hooks/useTranscription.ts`)
- [ ] WebSocket connection management
- [ ] `startSession(appointmentId)` - Start session
- [ ] `stopSession()` - Stop session
- [ ] `sendAudioChunk(chunk)` - Send audio
- [ ] `transcript` - Current transcript text
- [ ] `extraction` - Extracted fields
- [ ] `status` - Session status
- [ ] `isConnected` - Connection state
- [ ] Handle reconnection

#### Transcription Store (`src/store/transcription.store.ts`)
- [ ] `transcript` - Full transcript text
- [ ] `isRecording` - Recording state
- [ ] `isProcessing` - Processing state
- [ ] `extraction` - Extracted fields
- [ ] `pendingSuggestions` - Unapplied suggestions
- [ ] `acceptSuggestion(field, value)` - Accept suggestion
- [ ] `rejectSuggestion(field)` - Reject suggestion
- [ ] `acceptAll()` - Accept all suggestions
- [ ] `clearAll()` - Clear all suggestions
- [ ] `reset()` - Reset state

#### Transcription API Service (`src/services/transcription.api.ts`)
- [ ] `startSession(appointmentId)` - Start session
- [ ] `uploadAudio(appointmentId, audio)` - Upload chunk
- [ ] `stopSession(appointmentId)` - Stop session
- [ ] `getTranscription(appointmentId)` - Get transcript
- [ ] `extractFields(appointmentId)` - Trigger extraction

#### Medical Record Integration
- [ ] Update SymptomsSection to show AI suggestions
- [ ] Update PrescriptionsSection to show AI suggestions
- [ ] Update MedicalRecordForm for AI field suggestions
- [ ] Highlight AI-filled fields
- [ ] Accept/Reject per field

## WebSocket Events Handled
- `connected` - Connection established
- `transcription_update` - New transcript text
- `field_extraction` - Extracted fields received
- `status` - Session status change
- `error` - Error notification
- `completed` - Session complete

## Components Involved
- TranscriptionPanel
- AudioRecorder
- TranscriptionDisplay
- AIExtractionStatus
- AISuggestionBadge
- RecordingIndicator
- RecordingTimer
- AudioLevelMeter (optional)
- SymptomsSection (update)
- PrescriptionsSection (update)
- MedicalRecordForm (update)

## Data Models Involved
- TranscriptionSession
- AIExtraction
- AISuggestion

## Testing Requirements

### Unit Tests

#### AudioRecorder (`tests/unit/components/AudioRecorder.test.tsx`)
- [ ] Renders start button initially
- [ ] Requests permission on start
- [ ] Shows recording indicator when active
- [ ] Shows timer during recording
- [ ] Stop button stops recording
- [ ] Shows error on permission denied

#### TranscriptionDisplay (`tests/unit/components/TranscriptionDisplay.test.tsx`)
- [ ] Shows empty state before transcript
- [ ] Displays transcript text
- [ ] Auto-scrolls on updates
- [ ] Copy button works

#### AIExtractionStatus (`tests/unit/components/AIExtractionStatus.test.tsx`)
- [ ] Shows processing indicator
- [ ] Displays extracted counts
- [ ] Shows confidence levels
- [ ] Apply button triggers callback

#### useAudioRecorder (`tests/unit/hooks/useAudioRecorder.test.ts`)
- [ ] Initializes in stopped state
- [ ] startRecording requests permission
- [ ] Tracks recording duration
- [ ] stopRecording returns audio blob
- [ ] Handles permission errors

#### useTranscription (`tests/unit/hooks/useTranscription.test.ts`)
- [ ] Connects to WebSocket
- [ ] Handles transcription updates
- [ ] Handles extraction events
- [ ] Manages connection state
- [ ] Cleans up on unmount

### E2E Tests (`tests/e2e/transcription.spec.ts`)
- [ ] Start recording flow (mocked audio)
- [ ] Stop recording and see transcript
- [ ] AI extraction populates fields
- [ ] Accept AI suggestion
- [ ] Reject AI suggestion
- [ ] Accept all suggestions
- [ ] Error handling for failures

## Dependencies
- TICKET-009: Medical Records Frontend
- TICKET-010: Transcription Backend

## Estimation
8 Story Points

## Implementation Notes
- Use MediaRecorder API with webm/opus format
- Chunk audio every 5-10 seconds for processing
- WebSocket reconnection with exponential backoff
- Show clear error messages for microphone issues
- Consider mobile compatibility (Safari differences)
- Test with Chrome and Firefox
- Confidence scores: green (>80%), yellow (50-80%), red (<50%)
- Allow manual editing of AI-filled fields
- Source text tooltip enhances trust in AI
- Consider keyboard shortcut for record toggle (Space?)
- Max recording duration: 60 minutes (show warning at 55)

### Browser Compatibility Notes
- MediaRecorder API supported in Chrome, Firefox, Safari 14.1+
- Use webm in Chrome/Firefox, mp4 in Safari
- Request audio permission with `navigator.mediaDevices.getUserMedia`
- Handle permission denied gracefully

## Files to Create/Modify

### Frontend
- `src/components/transcription/TranscriptionPanel.tsx`
- `src/components/transcription/AudioRecorder.tsx`
- `src/components/transcription/TranscriptionDisplay.tsx`
- `src/components/transcription/AIExtractionStatus.tsx`
- `src/components/transcription/RecordingIndicator.tsx`
- `src/components/transcription/RecordingTimer.tsx`
- `src/components/common/AISuggestionBadge.tsx`
- `src/hooks/useAudioRecorder.ts`
- `src/hooks/useTranscription.ts`
- `src/store/transcription.store.ts`
- `src/services/transcription.api.ts`
- `src/types/transcription.types.ts`
- `src/pages/appointments/AppointmentPage.tsx` (integrate panel)
- `src/components/medical-records/SymptomsSection.tsx` (AI suggestions)
- `src/components/medical-records/PrescriptionsSection.tsx` (AI suggestions)
- `src/components/medical-records/MedicalRecordForm.tsx` (AI suggestions)
- `tests/unit/components/AudioRecorder.test.tsx`
- `tests/unit/components/TranscriptionDisplay.test.tsx`
- `tests/unit/components/AIExtractionStatus.test.tsx`
- `tests/unit/hooks/useAudioRecorder.test.ts`
- `tests/unit/hooks/useTranscription.test.ts`
- `tests/e2e/transcription.spec.ts`

## Definition of Done
- [ ] Recording works on Chrome/Firefox
- [ ] Microphone permission handled correctly
- [ ] Real-time transcription displays
- [ ] AI extraction returns suggestions
- [ ] Fields auto-populate with AI data
- [ ] User can accept/reject suggestions
- [ ] Accept All / Clear All working
- [ ] AI badges visible on filled fields
- [ ] Unit tests passing
- [ ] E2E test passing (mocked)
- [ ] Works on desktop and mobile
- [ ] Code reviewed and approved
