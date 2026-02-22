# User Story US-008: Appointment Summary Generation

## Story Card

**As a** doctor
**I want to** have AI generate a brief summary of each appointment
**So that** I can quickly review past visits without reading the full record

---

## Description

After a medical record is complete, AI generates a concise 2-3 sentence summary of the appointment. This summary captures the key points: reason for visit, main findings/diagnosis, and primary actions taken. The summary is displayed prominently on the appointment card in the patient history, making it easy to scan past visits quickly.

This feature enhances the medical history review experience and helps doctors quickly get context on past visits.

---

## Acceptance Criteria

- [ ] Given a completed appointment record, when I click "Generate Summary", then AI creates a 2-3 sentence summary
- [ ] Given AI generates a summary, when the summary is ready, then it includes: reason for visit, diagnosis, and key actions/prescriptions
- [ ] Given a summary is generated, when viewing patient history, then the summary appears on the appointment card
- [ ] Given a generated summary, when I want to edit it, then I can modify the summary text
- [ ] Given a summary exists, when I view the appointment detail, then the summary is displayed at the top
- [ ] Given AI cannot generate a summary (API error), when an error occurs, then I see an error message and can retry
- [ ] Given no transcript or minimal record content, when I request summary, then I see a message that insufficient data exists
- [ ] Given a summary is generated, when the appointment is saved, then the summary persists with the record

---

## Priority

**Should-Have (P1)**

---

## Story Points

**5 points**

Rationale: Straightforward AI integration but requires prompt engineering and display integration.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Manual Record Entry | Required | US-005 |
| AI Auto-Fill | Preferred | US-007 |
| OpenAI GPT-4 or Claude API | External | - |

---

## Technical Notes

### Data Model

```typescript
interface AppointmentSummary {
  id: string;
  appointmentId: string;
  text: string;              // 2-3 sentence summary
  aiGenerated: boolean;
  editedByUser: boolean;
  generatedAt: Date;
  editedAt?: Date;
}
```

### AI Summary Prompt

```typescript
const summaryPrompt = `
Generate a concise 2-3 sentence clinical summary for this medical appointment.

Patient: ${patient.firstName} ${patient.lastName}
Date: ${appointment.date}
Appointment Type: ${appointment.type}

Medical Record:
- Chief Complaint: ${record.chiefComplaint || 'Not recorded'}
- Symptoms: ${formatSymptoms(record.symptoms)}
- Diagnosis: ${record.diagnosis || 'Not recorded'}
- Prescriptions: ${formatPrescriptions(record.prescriptions)}
- Treatment Plan: ${record.treatmentPlan || 'Not recorded'}

Write a professional clinical summary that includes:
1. The reason for the visit
2. Key findings/diagnosis
3. Main treatment actions taken

Keep it under 100 words. Write in third person.
`;
```

### Implementation Considerations

- Generate summary from structured record fields, not raw transcript
- Store summary as separate field on medical record
- Consider auto-generating when appointment is marked complete
- Maximum summary length: 500 characters
- Allow manual editing after generation
- Track if summary was AI-generated vs manually written

### API Endpoints

```
POST /api/appointments/:id/summary        - Generate summary
GET  /api/appointments/:id/summary        - Get summary
PUT  /api/appointments/:id/summary        - Update summary (manual edit)
```

---

## UI/UX Notes

### Summary Section on Appointment Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 APPOINTMENT: February 21, 2026                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SUMMARY                                              🤖 AI     │
│  ─────────                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Patient presented with persistent headaches and       │   │
│  │  fatigue for two weeks. Diagnosed with tension         │   │
│  │  headache and suspected Vitamin D deficiency.          │   │
│  │  Prescribed Ibuprofen 400mg for pain relief and        │   │
│  │  Vitamin D3 2000IU daily. Follow-up in 4 weeks.       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Edit]  [Regenerate]                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Summary in Patient History Card

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Feb 21, 2026  │  Follow-up  │  ✅ Completed                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Patient presented with persistent headaches and fatigue.       │
│  Diagnosed with tension headache and Vitamin D deficiency.      │
│  Prescribed pain relief and vitamin supplementation.            │
│                                                                  │
│  💊 2 prescriptions                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Generate Summary Button

```
┌─────────────────────────────────────────────────────────────────┐
│  SUMMARY                                                        │
│  ─────────                                                       │
│                                                                  │
│  No summary generated yet.                                      │
│                                                                  │
│  [🤖 Generate Summary]                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Generating State

```
┌─────────────────────────────────────────────────────────────────┐
│  SUMMARY                                                        │
│  ─────────                                                       │
│                                                                  │
│  ⏳ Generating summary...                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Edit Mode

```
┌─────────────────────────────────────────────────────────────────┐
│  SUMMARY                                                [Cancel]│
│  ─────────                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Patient presented with persistent headaches and       │   │
│  │  fatigue for two weeks. Diagnosed with tension         │   │
│  │  headache and suspected Vitamin D deficiency.          │   │
│  │  ▌                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Save Changes]                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- "Generate Summary" button on appointment page
- Summary displayed in a highlighted card/section at top
- Edit button to allow modifications
- Regenerate option if unsatisfied with result
- Loading state during AI processing
- AI badge to indicate generated content
- Character count indicator in edit mode
- Auto-generate option on appointment completion (configurable)

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Generate summary | Complete record | 2-3 sentence summary created |
| View in history | Generated summary | Summary shown on appointment card |
| Edit summary | Click edit | Text becomes editable |
| Save edit | Modify and save | Updated summary persisted |
| Regenerate | Click regenerate | New summary replaces old |
| Insufficient data | Empty record | "Insufficient data" message |
| API failure | Network error | Error message with retry |
| Auto-generate | Complete appointment | Summary auto-generated |

---

## Definition of Done

- [ ] Generate Summary button visible
- [ ] AI generates 2-3 sentence summary
- [ ] Summary includes key appointment info
- [ ] Summary displays in appointment detail
- [ ] Summary shows in patient history cards
- [ ] Edit functionality works
- [ ] Regenerate creates new summary
- [ ] Error handling for API failures
- [ ] AI badge indicates generated content
- [ ] Unit tests pass
- [ ] Manual QA verified
