# User Story US-005: Manual Medical Record Entry

## Story Card

**As a** doctor
**I want to** manually enter symptoms, diagnosis, and prescriptions for an appointment
**So that** I can document the visit even when not using AI transcription

---

## Description

The doctor needs to document clinical encounters using a structured format. This includes recording patient symptoms (with details like severity and duration), entering a diagnosis, and adding prescriptions. All fields should be editable until the record is finalized. This serves as both the primary manual workflow and the edit interface for AI-generated content.

This is the core documentation feature and the most complex form in the application. It must be flexible enough to handle both manual entry and AI-assisted workflows.

---

## Acceptance Criteria

- [ ] Given I am on an appointment record page, when I view the form, then I see sections for: Chief Complaint, Symptoms, Diagnosis, Treatment Plan, and Prescriptions
- [ ] Given I want to add a symptom, when I click "Add Symptom", then I can enter: symptom name (required), body site, severity (1-10), duration, and notes
- [ ] Given I have added symptoms, when I view the symptoms list, then I can edit or delete any symptom
- [ ] Given I want to add multiple symptoms, when I click "Add Symptom" again, then I can add additional symptoms
- [ ] Given I enter a diagnosis, when I type in the diagnosis field, then I can enter free-text diagnosis and optional notes
- [ ] Given I want to add a prescription, when I click "Add Prescription", then I can enter: medication name, strength, dosage, frequency, duration, quantity, instructions (all required except duration/quantity)
- [ ] Given I have added prescriptions, when I view the prescriptions list, then I can edit or delete any prescription
- [ ] Given I have entered record data, when I click "Save", then all data is persisted and a success message appears
- [ ] Given I want to continue editing, when I save, then I can continue making changes
- [ ] Given I want to complete the appointment, when I click "Complete Appointment", then the status changes to "Completed" and fields become read-only

---

## Priority

**Must-Have (P0)**

---

## Story Points

**8 points**

Rationale: Complex multi-section form with dynamic arrays, validation, and multiple save states.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Create Appointment | Required | US-004 |
| Data Persistence | Required | US-011 |

---

## Technical Notes

### Data Model

```typescript
interface MedicalRecord {
  id: string;
  appointmentId: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  physicalExamNotes?: string;
  diagnosis?: string;
  diagnosisNotes?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  patientEducation?: string;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Symptom {
  id: string;
  medicalRecordId: string;
  name: string;           // Required
  bodySite?: string;
  severity?: number;      // 1-10
  duration?: string;
  notes?: string;
  aiExtracted: boolean;
}

interface Prescription {
  id: string;
  medicalRecordId: string;
  medicationName: string;  // Required
  strength: string;        // Required
  dosage: string;          // Required
  frequency: string;       // Required
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions: string;    // Required
  indication?: string;
  aiExtracted: boolean;
}
```

### Implementation Considerations

- Use structured schema for symptoms and prescriptions (arrays of objects)
- Implement auto-save draft functionality (every 30 seconds)
- Validation should allow partial saves but require completeness for "Complete"
- Track created_at and updated_at timestamps
- Use optimistic updates for better UX
- Support undo for deletions (soft delete with timeout)

### API Endpoints

```
GET  /api/appointments/:id/record          - Get medical record
PUT  /api/appointments/:id/record          - Update medical record
POST /api/appointments/:id/record/symptoms     - Add symptom
PUT  /api/appointments/:id/record/symptoms/:id - Update symptom
DELETE /api/appointments/:id/record/symptoms/:id - Delete symptom
POST /api/appointments/:id/record/prescriptions     - Add prescription
PUT  /api/appointments/:id/record/prescriptions/:id - Update prescription
DELETE /api/appointments/:id/record/prescriptions/:id - Delete prescription
PUT  /api/appointments/:id/complete        - Mark complete
```

---

## UI/UX Notes

### Medical Record Entry Form

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Ana Martinez                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📅 February 21, 2026  │  Follow-up  │  🔵 In Progress      [🎤 Record]    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CHIEF COMPLAINT                                                            │
│  ────────────────                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Patient reports persistent headaches and fatigue...               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  SYMPTOMS                                                        [+ Add]    │
│  ────────                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Headache                                              [Edit] [X]   │   │
│  │  Location: Frontal │ Severity: 6/10 │ Duration: 2 weeks            │   │
│  │  Notes: Worse in the morning, improves with rest                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Fatigue                                               [Edit] [X]   │   │
│  │  Location: Generalized │ Severity: 5/10 │ Duration: 1 month        │   │
│  │  Notes: Despite adequate sleep                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  DIAGNOSIS                                                                  │
│  ─────────                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Tension headache; Vitamin D deficiency suspected                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Diagnosis Notes                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Recommend lab work to confirm Vitamin D levels                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PRESCRIPTIONS                                                   [+ Add]    │
│  ─────────────                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Ibuprofen 400mg                                       [Edit] [X]   │   │
│  │  Take 1 tablet every 6 hours as needed for pain                    │   │
│  │  Duration: 2 weeks │ Quantity: 28                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Vitamin D3 2000 IU                                    [Edit] [X]   │   │
│  │  Take 1 capsule daily with food                                    │   │
│  │  Duration: 90 days │ Quantity: 90                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  TREATMENT PLAN                                                             │
│  ──────────────                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Start Vitamin D supplementation. Use OTC pain relief for          │   │
│  │  headaches as needed. Schedule lab work for Vitamin D levels.      │   │
│  │  Return in 4 weeks for follow-up.                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Last saved: 2 minutes ago                                                  │
│                                                                              │
│  [Save Draft]                                   [Complete Appointment]      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Add Symptom Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  ADD SYMPTOM                                              [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Symptom Name *                                                 │
│  [Headache                                                ]     │
│                                                                  │
│  Body Site                                                      │
│  [Frontal                                                 ]     │
│                                                                  │
│  Severity (1-10)                                                │
│  [ 1 ═══●═══════════ 10 ]  6                                   │
│                                                                  │
│  Duration                                                       │
│  [2 weeks                                                 ]     │
│                                                                  │
│  Notes                                                          │
│  [Worse in the morning, improves with rest                ]     │
│                                                                  │
│  [  Cancel  ]                              [  Add Symptom  ]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Add Prescription Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  ADD PRESCRIPTION                                         [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Medication Name *              Strength *                      │
│  [Ibuprofen              ]      [400mg               ]          │
│                                                                  │
│  Dosage *                       Frequency *                     │
│  [1 tablet               ]      [Every 6 hours       ]          │
│                                                                  │
│  Duration                       Quantity                        │
│  [2 weeks                ]      [28                   ]         │
│                                                                  │
│  Instructions *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Take with food. Do not exceed 4 tablets in 24 hours.  │   │
│  │  Discontinue if stomach upset occurs.                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [  Cancel  ]                          [  Add Prescription  ]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Symptoms and prescriptions in expandable/collapsible cards
- Add/Edit forms as modals
- Severity should use slider with visual scale
- Clear visual distinction between draft and completed states
- Auto-save indicator showing last save time
- Confirmation dialog for completing appointment
- Undo option after deleting items (5 second window)

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Add symptom | Valid data | Symptom added to list |
| Edit symptom | Modify existing | Symptom updated |
| Delete symptom | Click delete | Symptom removed (with undo) |
| Add prescription | Valid data | Prescription added to list |
| Missing required field | Empty medication name | Validation error |
| Save draft | Click Save | Data persisted, can continue editing |
| Complete appointment | Click Complete | Status changes, fields read-only |
| Auto-save | Wait 30s after edit | Draft auto-saved |
| Multiple symptoms | Add 3 symptoms | All 3 displayed in list |

---

## Definition of Done

- [ ] All form sections render correctly
- [ ] Can add, edit, delete symptoms
- [ ] Can add, edit, delete prescriptions
- [ ] Validation works for required fields
- [ ] Save draft persists data
- [ ] Auto-save works every 30 seconds
- [ ] Complete appointment changes status
- [ ] Completed records are read-only
- [ ] Last saved indicator updates
- [ ] Unit tests pass
- [ ] Manual QA verified
