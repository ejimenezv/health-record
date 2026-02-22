# User Story US-001: Patient Registration

## Story Card

**As a** doctor
**I want to** register new patients in the system with their basic information
**So that** I can track their medical history and create appointments for them

---

## Description

The doctor needs to add new patients to the system before scheduling appointments. This involves capturing essential demographic information including personal details and emergency contact information. The system should validate inputs and prevent duplicate patient records.

This is the entry point for patient data into the system and is critical for all subsequent workflows. Every appointment and medical record depends on having a patient record first.

---

## Acceptance Criteria

- [ ] Given I am on the patient list page, when I click "New Patient", then I see a patient registration form
- [ ] Given I am on the registration form, when I fill in all required fields (first name, last name, date of birth, sex, phone, emergency contact name and phone), then the form allows submission
- [ ] Given I submit a form with missing required fields, when validation runs, then I see clear error messages indicating which fields are required
- [ ] Given I enter an invalid date of birth (future date), when validation runs, then I see an error message
- [ ] Given I enter an invalid phone format, when validation runs, then I see an error message
- [ ] Given I submit valid patient data, when the patient is created, then I see a success message
- [ ] Given a patient is successfully created, when creation completes, then I am redirected to the patient profile page
- [ ] Given a patient with similar name and date of birth exists, when I submit, then I see a duplicate warning before confirming creation

---

## Priority

**Must-Have (P0)**

---

## Story Points

**5 points**

Rationale: Medium complexity form with validation, database integration, and duplicate detection logic.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Data Persistence | Required | US-011 |
| User Authentication | Required | US-010 |

---

## Technical Notes

### Data Model

```typescript
interface Patient {
  id: string;              // UUID, auto-generated
  firstName: string;       // Required, 2-50 chars
  lastName: string;        // Required, 2-50 chars
  dateOfBirth: Date;       // Required, not future
  sex: 'male' | 'female' | 'other';  // Required
  phone: string;           // Required, valid format
  email?: string;          // Optional, valid email
  address?: string;        // Optional, max 200 chars
  emergencyContactName: string;      // Required
  emergencyContactPhone: string;     // Required
  emergencyContactRelationship?: string;  // Optional
  createdAt: Date;
  updatedAt: Date;
}
```

### Implementation Considerations

- Patient ID should be auto-generated (UUID or sequential)
- Phone validation should accept common formats: (123) 456-7890, 123-456-7890, 1234567890
- Date of birth should calculate and display age dynamically
- Consider indexing on (lastName, firstName, dateOfBirth) for duplicate detection
- Duplicate detection query: similar name (Levenshtein distance < 3) + same DOB

### API Endpoints

```
POST /api/patients         - Create new patient
GET  /api/patients/:id     - Get patient by ID
GET  /api/patients/check-duplicate  - Check for potential duplicates
```

---

## UI/UX Notes

### Form Layout

```
┌─────────────────────────────────────────────────┐
│           REGISTER NEW PATIENT                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  First Name *          Last Name *              │
│  [_______________]     [_______________]        │
│                                                  │
│  Date of Birth *       Sex *                    │
│  [__ / __ / ____]      ( ) Male                │
│                        ( ) Female               │
│                        ( ) Other                │
│                                                  │
│  Phone *               Email                    │
│  [_______________]     [_______________]        │
│                                                  │
│  Address                                        │
│  [_________________________________________]    │
│                                                  │
│  ─────────── Emergency Contact ───────────      │
│                                                  │
│  Contact Name *        Phone *                  │
│  [_______________]     [_______________]        │
│                                                  │
│  Relationship                                   │
│  [_______________]                              │
│                                                  │
│  [  Cancel  ]          [  Register Patient  ]   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Design Guidelines

- Form should have clear field labels and validation feedback
- Required fields marked with asterisk (*)
- Use date picker for date of birth
- Phone field should have input masking
- Success message as toast notification (non-blocking)
- Validation errors appear below each field in red
- Form should not lose data if validation fails

### States

1. **Empty Form**: Initial state with placeholders
2. **Filling**: User entering data
3. **Validation Error**: Highlighted fields with error messages
4. **Submitting**: Loading state on submit button
5. **Duplicate Warning**: Modal showing potential duplicate
6. **Success**: Toast notification + redirect

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Valid registration | All required fields valid | Patient created, redirect to profile |
| Missing required field | Empty first name | Error: "First name is required" |
| Invalid DOB | Future date | Error: "Date of birth cannot be in the future" |
| Invalid phone | "abc" | Error: "Please enter a valid phone number" |
| Duplicate detection | Same name + DOB as existing | Warning modal shown |
| Optional fields empty | Only required fields | Patient created successfully |

---

## Definition of Done

- [ ] Form renders with all fields
- [ ] Validation works for all required fields
- [ ] Error messages display correctly
- [ ] Patient is saved to database
- [ ] Duplicate detection works
- [ ] Success message appears
- [ ] Redirect to patient profile works
- [ ] Unit tests pass
- [ ] Manual QA verified
