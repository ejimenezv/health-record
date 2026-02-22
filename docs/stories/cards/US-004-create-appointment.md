# User Story US-004: Create New Appointment

## Story Card

**As a** doctor
**I want to** create a new appointment record for a patient
**So that** I can document the current visit and begin the medical record

---

## Description

When a patient arrives for a visit, the doctor needs to create an appointment record that will contain the medical documentation. The appointment captures basic visit information including date, time, type, and reason for visit. Upon creation, the appointment is linked to the patient and ready for documentation.

This story establishes the container for medical records and is the starting point for both manual and AI-assisted documentation workflows.

---

## Acceptance Criteria

- [ ] Given I am on a patient's profile page, when I click "New Appointment", then I see an appointment creation form
- [ ] Given I am creating an appointment, when I view the form, then the patient's name is displayed (read-only)
- [ ] Given I am creating an appointment, when I view the form, then the date/time defaults to current date/time
- [ ] Given I fill in appointment details, when I select appointment type, then I can choose from: New Patient, Follow-up, Routine Checkup, Sick Visit, Telehealth
- [ ] Given I fill in appointment details, when I enter reason for visit, then I can enter free-text description
- [ ] Given I submit a valid appointment, when creation succeeds, then the appointment is saved with status "In Progress"
- [ ] Given an appointment is created, when creation completes, then I am redirected to the appointment/medical record entry page
- [ ] Given an appointment is created, when I view the patient profile, then the new appointment appears in their history

---

## Priority

**Must-Have (P0)**

---

## Story Points

**3 points**

Rationale: Simple form with few fields, straightforward database operation.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Patient Registration | Required | US-001 |
| Patient Listing | Required | US-002 |
| Data Persistence | Required | US-011 |

---

## Technical Notes

### Data Model

```typescript
interface Appointment {
  id: string;              // UUID, auto-generated
  patientId: string;       // Foreign key to Patient
  date: Date;              // Appointment date/time
  type: AppointmentType;   // Enum
  reason: string;          // Free text reason for visit
  status: AppointmentStatus;  // Enum
  createdAt: Date;
  updatedAt: Date;
}

type AppointmentType =
  | 'new_patient'
  | 'follow_up'
  | 'routine_checkup'
  | 'sick_visit'
  | 'telehealth';

type AppointmentStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';
```

### Implementation Considerations

- Appointment should auto-generate unique ID (UUID)
- Timestamp should use server time for consistency
- Link appointment to patient via foreign key
- Initial status should be "In Progress" for MVP (skip scheduling workflow)
- Create empty medical record shell when appointment is created
- Transaction to ensure appointment + medical record created together

### API Endpoints

```
POST /api/appointments                  - Create new appointment
GET  /api/appointments/:id              - Get appointment details
PUT  /api/appointments/:id/status       - Update status
```

### Request/Response Example

```typescript
// POST /api/appointments
// Request
{
  "patientId": "uuid-patient-123",
  "date": "2026-02-21T10:30:00Z",
  "type": "follow_up",
  "reason": "Follow-up on headaches discussed last visit"
}

// Response
{
  "id": "uuid-appointment-456",
  "patientId": "uuid-patient-123",
  "date": "2026-02-21T10:30:00Z",
  "type": "follow_up",
  "reason": "Follow-up on headaches discussed last visit",
  "status": "in_progress",
  "createdAt": "2026-02-21T10:30:00Z",
  "medicalRecordId": "uuid-record-789"
}
```

---

## UI/UX Notes

### Appointment Form

```
┌─────────────────────────────────────────────────────────────────┐
│           CREATE NEW APPOINTMENT                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Patient                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👤 Martinez, Ana                                       │   │
│  │  DOB: March 15, 1981 (Age 45)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Date & Time *                                                  │
│  [February 21, 2026]  [10:30 AM]                               │
│                                                                  │
│  Appointment Type *                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ( ) New Patient                                        │   │
│  │  (●) Follow-up                                          │   │
│  │  ( ) Routine Checkup                                    │   │
│  │  ( ) Sick Visit                                         │   │
│  │  ( ) Telehealth                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Reason for Visit *                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Follow-up on headaches discussed last visit            │   │
│  │                                                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [  Cancel  ]                    [  Start Appointment  ]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Create (Modal Version)

```
┌─────────────────────────────────────────────────────────────────┐
│  NEW APPOINTMENT                                          [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Type          [ Follow-up           ▼]                        │
│                                                                  │
│  Reason        [Follow-up on headaches         ]               │
│                                                                  │
│  [  Cancel  ]                    [  Start Appointment  ]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Form should be simple and quick to complete (< 30 seconds)
- Date/time picker should be easy to use
- Default date/time to "now" since most appointments are immediate
- Type selector can be dropdown or radio buttons
- Reason for visit should be multi-line text input
- Consider showing patient's last appointment for context
- "Start Appointment" is the primary action (styled prominently)

### States

1. **Form Ready**: Default values populated
2. **Editing**: User modifying fields
3. **Submitting**: Loading state on button
4. **Success**: Redirect to medical record entry
5. **Error**: Error message with retry option

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Create appointment | Valid data | Appointment created, redirect to record entry |
| Default date/time | Open form | Current date/time pre-filled |
| All types available | View dropdown | All 5 types selectable |
| Missing reason | Empty reason | Validation error |
| Patient displayed | Open form | Patient info shown (read-only) |
| Status on create | Submit | Status is "in_progress" |
| Appears in history | Create + view profile | New appointment in history |

---

## Definition of Done

- [ ] Form accessible from patient profile
- [ ] Patient info displayed read-only
- [ ] Date/time defaults to now
- [ ] All appointment types selectable
- [ ] Reason field accepts text
- [ ] Appointment saved to database
- [ ] Medical record shell created
- [ ] Status set to "in_progress"
- [ ] Redirect to record entry page
- [ ] Appears in patient history
- [ ] Unit tests pass
- [ ] Manual QA verified
