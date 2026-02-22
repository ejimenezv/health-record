# User Story US-003: View Patient Medical History

## Story Card

**As a** doctor
**I want to** view the complete appointment history for a patient
**So that** I can understand their medical history and provide informed care during the current visit

---

## Description

When reviewing a patient's profile or preparing for an appointment, the doctor needs to see all past appointments in chronological order. Each appointment should display a summary including date, type, reason, diagnosis, and key information. The doctor should be able to navigate to any past appointment for full details.

This feature is essential for continuity of care, allowing the doctor to quickly reference previous visits, diagnoses, and treatments before or during a consultation.

---

## Acceptance Criteria

- [ ] Given I am on a patient's profile page, when the page loads, then I see a chronological list of all past appointments (newest first)
- [ ] Given a patient has appointments, when I view the history, then each appointment shows: date, type, reason for visit, status, and diagnosis summary
- [ ] Given I click on a past appointment, when I click, then I navigate to the full appointment record view
- [ ] Given I am viewing an appointment record, when I want to see other appointments, then I can use Previous/Next navigation buttons
- [ ] Given a patient has no appointments, when I view the profile, then I see an empty state with option to create first appointment
- [ ] Given I am viewing appointment history, when viewing the list, then I can see a brief summary of the chief complaint for each visit
- [ ] Given I am on an appointment detail page, when I want to return, then I can navigate back to the patient profile
- [ ] Given multiple appointments exist, when viewing the list, then completed appointments show their diagnosis and prescriptions count

---

## Priority

**Must-Have (P0)**

---

## Story Points

**5 points**

Rationale: Involves list rendering, summary data aggregation, and navigation between views.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Patient Registration | Required | US-001 |
| Patient Listing | Required | US-002 |
| Create Appointment | Required | US-004 |
| Manual Record Entry | Required | US-005 |

---

## Technical Notes

### Data Model

```typescript
interface AppointmentSummary {
  id: string;
  patientId: string;
  date: Date;
  type: 'new_patient' | 'follow_up' | 'routine_checkup' | 'sick_visit' | 'telehealth';
  reason: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  chiefComplaint?: string;
  diagnosisSummary?: string;
  prescriptionsCount: number;
  summary?: string;  // AI-generated summary if available
}

interface AppointmentNavigation {
  currentId: string;
  previousId?: string;
  nextId?: string;
  position: number;
  total: number;
}
```

### Implementation Considerations

- Fetch appointments with pagination (10 per page)
- Include summary data in list query to avoid N+1 queries
- Use JOIN to get prescription count efficiently
- Consider caching recent appointments for performance
- Medical history should be read-only unless editing specific record

### API Endpoints

```
GET /api/patients/:patientId/appointments              - List appointments
GET /api/patients/:patientId/appointments?page=1       - Paginated
GET /api/appointments/:id                              - Single appointment detail
GET /api/appointments/:id/navigation                   - Previous/Next IDs
```

### Query Example

```sql
SELECT
  a.id, a.date, a.type, a.reason, a.status,
  m.chief_complaint, m.diagnosis as diagnosis_summary,
  COUNT(p.id) as prescriptions_count
FROM appointments a
LEFT JOIN medical_records m ON a.id = m.appointment_id
LEFT JOIN prescriptions p ON m.id = p.medical_record_id
WHERE a.patient_id = :patientId
GROUP BY a.id, m.id
ORDER BY a.date DESC
LIMIT 10 OFFSET 0;
```

---

## UI/UX Notes

### Patient Profile with History

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Patients                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👤 MARTINEZ, ANA                                               │
│  ─────────────────────────────────────────────────              │
│  DOB: March 15, 1981 (Age 45)                                   │
│  Phone: (555) 123-4567                                          │
│  Email: ana.martinez@email.com                                  │
│                                                                  │
│  [Edit Patient]              [+ New Appointment]                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                   APPOINTMENT HISTORY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅 Feb 15, 2026  │  Follow-up  │  ✅ Completed        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Chief Complaint: Headaches and fatigue                 │   │
│  │  Diagnosis: Tension headache, Vitamin D deficiency      │   │
│  │  💊 2 prescriptions                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅 Jan 10, 2026  │  Sick Visit │  ✅ Completed        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Chief Complaint: Persistent cough for 2 weeks         │   │
│  │  Diagnosis: Acute bronchitis                           │   │
│  │  💊 1 prescription                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅 Dec 05, 2025  │  New Patient │  ✅ Completed       │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Chief Complaint: Initial health assessment            │   │
│  │  Diagnosis: General good health                        │   │
│  │  💊 0 prescriptions                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Showing 3 appointments                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Appointment Detail View with Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Ana Martinez                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [◀ Previous]                              [Next ▶]             │
│                                                                  │
│  📅 APPOINTMENT: February 15, 2026                              │
│  ─────────────────────────────────────────────────              │
│  Type: Follow-up          Status: ✅ Completed                  │
│  Reason: Check on headaches discussed last visit                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  MEDICAL RECORD                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Chief Complaint                                                 │
│  ───────────────                                                │
│  Headaches and fatigue                                          │
│                                                                  │
│  Symptoms                                                        │
│  ────────                                                        │
│  • Headache - Frontal, Severity 6/10, 2 weeks                   │
│  • Fatigue - Generalized, Severity 5/10, 1 month                │
│                                                                  │
│  Diagnosis                                                       │
│  ─────────                                                       │
│  Tension headache; Vitamin D deficiency                         │
│                                                                  │
│  Prescriptions                                                   │
│  ─────────────                                                   │
│  1. Ibuprofen 400mg - Take 1 tablet every 6 hours as needed    │
│  2. Vitamin D3 2000IU - Take 1 daily with food                 │
│                                                                  │
│  Treatment Plan                                                  │
│  ──────────────                                                  │
│  Start Vitamin D supplementation. OTC pain relief for          │
│  headaches. Return in 4 weeks for follow-up.                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Appointment 1 of 3                    [Export to PDF]          │
└─────────────────────────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────────────┐
│                   APPOINTMENT HISTORY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                   📋 No appointments yet                        │
│                                                                  │
│         This patient doesn't have any appointments.             │
│         Start documenting their first visit!                    │
│                                                                  │
│                  [+ Schedule First Appointment]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Appointment cards should be scannable at a glance
- Use visual indicators for appointment status (icons/colors)
- Diagnosis text should truncate with "..." if too long
- Navigation should maintain scroll position when returning
- Previous/Next buttons disabled at list boundaries
- Show position indicator ("Appointment 2 of 5")
- Clickable cards with hover state

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Load history | Patient with 5 appointments | Display 5 appointment cards, newest first |
| No appointments | New patient | Show empty state with CTA |
| Click appointment | Click card | Navigate to appointment detail |
| Navigate previous | Click Previous | Show previous appointment |
| Navigate next | Click Next | Show next appointment |
| First appointment | On oldest | Previous button disabled |
| Last appointment | On newest | Next button disabled |
| Back navigation | Click back | Return to patient profile |
| Truncated diagnosis | Long diagnosis text | Show truncated with "..." |

---

## Definition of Done

- [ ] Appointment history loads on patient profile
- [ ] Appointments sorted newest first
- [ ] Appointment cards show summary info
- [ ] Click navigates to appointment detail
- [ ] Previous/Next navigation works
- [ ] Empty state displays for new patients
- [ ] Back navigation works correctly
- [ ] Position indicator shows correctly
- [ ] Unit tests pass
- [ ] Manual QA verified
