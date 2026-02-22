# Ticket 012: Appointment Summary Generation

## Type
Feature

## Priority
P2-Medium

## Story Reference
US-008: Appointment Summary Generation

## Description
Implement AI-powered appointment summary generation that creates a concise 2-3 sentence summary of each medical visit. The summary appears in patient history and can be edited or regenerated.

## Acceptance Criteria
- [ ] Generate Summary button on completed appointments
- [ ] AI creates 2-3 sentence summary from medical record
- [ ] Summary stored in medical record
- [ ] Summary displayed in patient history
- [ ] Summary displayed on appointment detail
- [ ] Edit summary manually
- [ ] Regenerate summary option
- [ ] Loading indicator during generation
- [ ] Error handling for API failures
- [ ] Summary considers all record fields

## Technical Requirements

### Backend Tasks

#### Summary Service (`src/services/ai/summary.service.ts`)
- [ ] `generateSummary(medicalRecordId)` - Generate summary
- [ ] Create summary prompt from medical record
- [ ] Include: chief complaint, diagnosis, treatment
- [ ] Format as 2-3 clear sentences
- [ ] Handle missing fields gracefully

#### Summary Controller (`src/controllers/summary.controller.ts`)
- [ ] `generate` - POST /appointments/:id/record/summary
- [ ] `update` - PUT /appointments/:id/record/summary

#### Summary Routes (add to medical-record.routes.ts)
- [ ] POST `/appointments/:id/record/summary` - Generate
- [ ] PUT `/appointments/:id/record/summary` - Update

### Frontend Tasks

#### Summary Display (`src/components/medical-records/SummarySection.tsx`)
- [ ] Display generated summary
- [ ] Generate button (if no summary)
- [ ] Edit button
- [ ] Regenerate button
- [ ] Loading state
- [ ] Error state

#### Summary in Patient History
- [ ] Update AppointmentHistoryList to show summary
- [ ] Summary preview (truncated)
- [ ] Expand to see full summary

#### Summary API Service (add to medical-records.api.ts)
- [ ] `generateSummary(appointmentId)` - Generate
- [ ] `updateSummary(appointmentId, summary)` - Update

#### React Query Hooks (add to useMedicalRecord.ts)
- [ ] `useGenerateSummary()` - Mutation
- [ ] `useUpdateSummary()` - Mutation

## API Endpoints Involved

### POST /api/v1/appointments/:id/record/summary
**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": "Patient presented with persistent headache for 3 days. Diagnosed with tension headache, likely stress-related. Prescribed ibuprofen 400mg and advised rest with follow-up if symptoms persist."
  }
}
```

### PUT /api/v1/appointments/:id/record/summary
**Request:**
```json
{
  "summary": "Updated summary text..."
}
```
**Response (200):** Updated summary

## Components Involved
- SummarySection
- SummaryDisplay
- SummaryEditor
- AppointmentHistoryList (update)
- AppointmentCard (update)

## Data Models Involved
- MedicalRecord (aiSummary field)

## Testing Requirements

### Unit Tests

#### Summary Service (`tests/unit/services/ai/summary.service.test.ts`)
- [ ] Generates summary from medical record
- [ ] Handles missing fields gracefully
- [ ] Returns 2-3 sentence summary
- [ ] Handles API errors

#### SummarySection (`tests/unit/components/SummarySection.test.tsx`)
- [ ] Shows generate button when no summary
- [ ] Displays summary when available
- [ ] Edit button opens editor
- [ ] Regenerate triggers new generation
- [ ] Loading state shown during generation

### Integration Tests
- [ ] POST /summary generates and stores summary
- [ ] PUT /summary updates summary
- [ ] Summary appears in patient history

### E2E Tests (`tests/e2e/summary.spec.ts`)
- [ ] Generate summary for completed appointment
- [ ] Edit summary
- [ ] Regenerate summary
- [ ] View summary in patient history

## Dependencies
- TICKET-008: Medical Records Backend
- TICKET-009: Medical Records Frontend
- TICKET-010: Transcription Backend (uses GPT service)

## Estimation
3 Story Points

## Implementation Notes
- Reuse GPT service from transcription
- Summary prompt should be concise and professional
- Include key clinical information only
- Don't generate for incomplete appointments
- Cache summary to avoid regeneration costs
- Consider word limit (50-75 words)
- Medical terminology should be appropriate level

### Summary Prompt Template
```
Summarize this medical appointment in 2-3 clear, professional sentences suitable for a patient history overview.

Chief Complaint: {chiefComplaint}
Diagnosis: {assessment}
Treatment: {plan}
Prescriptions: {prescriptions}

Summary should include: reason for visit, diagnosis (if any), and key treatment plan.
```

## Files to Create/Modify

### Backend
- `src/services/ai/summary.service.ts`
- `src/controllers/summary.controller.ts` (or add to medical-record)
- `src/routes/medical-record.routes.ts` (add summary routes)
- `tests/unit/services/ai/summary.service.test.ts`
- `tests/integration/routes/summary.routes.test.ts`

### Frontend
- `src/components/medical-records/SummarySection.tsx`
- `src/components/medical-records/SummaryDisplay.tsx`
- `src/components/medical-records/SummaryEditor.tsx`
- `src/services/medical-records.api.ts` (add methods)
- `src/hooks/useMedicalRecord.ts` (add hooks)
- `src/components/patients/AppointmentHistoryList.tsx` (update)
- `src/components/appointments/AppointmentCard.tsx` (update)
- `tests/unit/components/SummarySection.test.tsx`
- `tests/e2e/summary.spec.ts`

## Definition of Done
- [ ] Summary generation working
- [ ] Summary stored and retrieved
- [ ] Edit functionality working
- [ ] Regenerate functionality working
- [ ] Summary visible in patient history
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Error handling graceful
- [ ] Code reviewed and approved
