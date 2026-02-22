# Must-Have User Stories (P0)

## Overview

This document contains the essential user stories required for MedRecord AI MVP launch. These stories represent the core functionality that enables the primary value proposition: AI-assisted medical record documentation.

**Total Stories**: 7
**Priority Level**: P0 - Must-Have
**Estimated Points**: 34 points

---

## User Story US-001: Patient Registration

**As a** doctor
**I want to** register new patients in the system with their basic information
**So that** I can track their medical history and create appointments for them

### Description

The doctor needs to add new patients to the system before scheduling appointments. This involves capturing essential demographic information including personal details and emergency contact information. The system should validate inputs and prevent duplicate patient records.

### Acceptance Criteria

- [ ] Given I am on the patient list page, when I click "New Patient", then I see a patient registration form
- [ ] Given I am on the registration form, when I fill in all required fields (first name, last name, date of birth, sex, phone, emergency contact name and phone), then the form allows submission
- [ ] Given I submit a form with missing required fields, when validation runs, then I see clear error messages indicating which fields are required
- [ ] Given I enter an invalid date of birth (future date), when validation runs, then I see an error message
- [ ] Given I enter an invalid phone format, when validation runs, then I see an error message
- [ ] Given I submit valid patient data, when the patient is created, then I see a success message
- [ ] Given a patient is successfully created, when creation completes, then I am redirected to the patient profile page
- [ ] Given a patient with similar name and date of birth exists, when I submit, then I see a duplicate warning before confirming creation

### Priority

Must-Have (P0)

### Story Points

5

### Dependencies

- US-011: Data Persistence (patients must be saved to database)
- US-010: User Authentication (doctor must be logged in)

### Technical Notes

- Patient ID should be auto-generated (UUID or sequential)
- Phone validation should accept common formats
- Date of birth should calculate and display age
- Consider indexing on name and DOB for duplicate detection

### UI/UX Notes

- Form should have clear field labels and validation feedback
- Required fields should be marked with asterisk
- Use date picker for date of birth
- Phone field should have input masking
- Success message should be non-blocking (toast notification)

---

## User Story US-002: Patient Listing and Search

**As a** doctor
**I want to** view and search through my list of patients
**So that** I can quickly find a specific patient to view their profile or start an appointment

### Description

The doctor needs an efficient way to browse and search through registered patients. The patient list should show key information at a glance and support searching by name or phone number. Results should update in real-time as the doctor types.

### Acceptance Criteria

- [ ] Given I am on the patient list page, when the page loads, then I see a list of all patients sorted alphabetically by last name
- [ ] Given there are patients in the system, when I view the list, then I see each patient's name, date of birth, phone, and age
- [ ] Given I type in the search field, when I enter a partial name, then the list filters to show matching patients in real-time
- [ ] Given I search for "Joh", when results display, then I see patients named "John", "Johnson", "Johann", etc. (partial match)
- [ ] Given I search for a phone number, when results display, then I see patients with matching phone numbers
- [ ] Given my search matches no patients, when results display, then I see a "No patients found" message
- [ ] Given I clear the search field, when the field is empty, then I see all patients again
- [ ] Given I click on a patient in the list, when I click, then I navigate to that patient's profile page
- [ ] Given the search is case-insensitive, when I search "john" or "JOHN", then I find "John"

### Priority

Must-Have (P0)

### Story Points

3

### Dependencies

- US-001: Patient Registration (patients must exist to list)
- US-011: Data Persistence (patients loaded from database)

### Technical Notes

- Implement debounced search (300ms delay) to avoid excessive queries
- Search should query: first_name, last_name, phone, email
- Consider pagination for large patient lists (>100)
- Index database fields used for search

### UI/UX Notes

- Search bar should be prominent at top of page
- Patient cards should show quick info at a glance
- Consider adding "New Patient" quick action button
- Empty state should guide user to add first patient
- Loading state while fetching patients

---

## User Story US-003: View Patient Medical History

**As a** doctor
**I want to** view the complete appointment history for a patient
**So that** I can understand their medical history and provide informed care during the current visit

### Description

When reviewing a patient's profile or preparing for an appointment, the doctor needs to see all past appointments in chronological order. Each appointment should display a summary including date, type, reason, diagnosis, and key information. The doctor should be able to navigate to any past appointment for full details.

### Acceptance Criteria

- [ ] Given I am on a patient's profile page, when the page loads, then I see a chronological list of all past appointments (newest first)
- [ ] Given a patient has appointments, when I view the history, then each appointment shows: date, type, reason for visit, status, and diagnosis summary
- [ ] Given I click on a past appointment, when I click, then I navigate to the full appointment record view
- [ ] Given I am viewing an appointment record, when I want to see other appointments, then I can use Previous/Next navigation buttons
- [ ] Given a patient has no appointments, when I view the profile, then I see an empty state with option to create first appointment
- [ ] Given I am viewing appointment history, when viewing the list, then I can see a brief summary of the chief complaint for each visit
- [ ] Given I am on an appointment detail page, when I want to return, then I can navigate back to the patient profile
- [ ] Given multiple appointments exist, when viewing the list, then completed appointments show their diagnosis and prescriptions count

### Priority

Must-Have (P0)

### Story Points

5

### Dependencies

- US-001: Patient Registration
- US-002: Patient Listing (to navigate to patient profile)
- US-004: Create Appointment (appointments must exist)
- US-005: Manual Record Entry (records have content to display)

### Technical Notes

- Appointments should be fetched with pagination (10 per page)
- Include summary data in list query to avoid N+1 queries
- Consider caching recent appointments for performance
- Medical history should be read-only unless editing specific record

### UI/UX Notes

- Appointment cards should be scannable at a glance
- Use visual indicators for appointment status (icons/colors)
- Diagnosis text should truncate with "..." if too long
- Navigation should maintain scroll position when returning
- Consider collapsible sections for long histories

---

## User Story US-004: Create New Appointment

**As a** doctor
**I want to** create a new appointment record for a patient
**So that** I can document the current visit and begin the medical record

### Description

When a patient arrives for a visit, the doctor needs to create an appointment record that will contain the medical documentation. The appointment captures basic visit information including date, time, type, and reason for visit. Upon creation, the appointment is linked to the patient and ready for documentation.

### Acceptance Criteria

- [ ] Given I am on a patient's profile page, when I click "New Appointment", then I see an appointment creation form
- [ ] Given I am creating an appointment, when I view the form, then the patient's name is displayed (read-only)
- [ ] Given I am creating an appointment, when I view the form, then the date/time defaults to current date/time
- [ ] Given I fill in appointment details, when I select appointment type, then I can choose from: New Patient, Follow-up, Routine Checkup, Sick Visit, Telehealth
- [ ] Given I fill in appointment details, when I enter reason for visit, then I can enter free-text description
- [ ] Given I submit a valid appointment, when creation succeeds, then the appointment is saved with status "In Progress"
- [ ] Given an appointment is created, when creation completes, then I am redirected to the appointment/medical record entry page
- [ ] Given an appointment is created, when I view the patient profile, then the new appointment appears in their history

### Priority

Must-Have (P0)

### Story Points

3

### Dependencies

- US-001: Patient Registration
- US-002: Patient Listing
- US-011: Data Persistence

### Technical Notes

- Appointment should auto-generate unique ID
- Timestamp should use server time for consistency
- Link appointment to patient via foreign key
- Initial status should be "In Progress" (skip scheduling for MVP)

### UI/UX Notes

- Form should be simple and quick to complete
- Date/time picker should be easy to use
- Type selector can be dropdown or radio buttons
- Reason for visit should be multi-line text input
- Consider pre-filling from previous appointments

---

## User Story US-005: Manual Medical Record Entry

**As a** doctor
**I want to** manually enter symptoms, diagnosis, and prescriptions for an appointment
**So that** I can document the visit even when not using AI transcription

### Description

The doctor needs to document clinical encounters using a structured format. This includes recording patient symptoms (with details like severity and duration), entering a diagnosis, and adding prescriptions. All fields should be editable until the record is finalized. This serves as both the primary manual workflow and the edit interface for AI-generated content.

### Acceptance Criteria

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

### Priority

Must-Have (P0)

### Story Points

8

### Dependencies

- US-004: Create Appointment
- US-011: Data Persistence

### Technical Notes

- Use structured schema for symptoms and prescriptions (arrays of objects)
- Implement auto-save draft functionality (every 30 seconds)
- Validation should allow partial saves but require completeness for "Complete"
- Track created_at and updated_at timestamps

### UI/UX Notes

- Symptoms and prescriptions should be in expandable/collapsible cards
- Add/Edit forms can be inline or modal
- Severity should use slider or visual scale
- Clear visual distinction between draft and completed states
- Consider keyboard shortcuts for power users

---

## User Story US-006: AI Transcription Recording

**As a** doctor
**I want to** record the audio of my patient consultation and have it transcribed
**So that** I have a text record of the conversation to reference and extract information from

### Description

During a consultation, the doctor can start an audio recording that captures the conversation with the patient. The recording is processed after stopping, converting speech to text using AI. The transcript is displayed alongside the medical record form, allowing the doctor to reference what was discussed.

### Acceptance Criteria

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

### Priority

Must-Have (P0)

### Story Points

8

### Dependencies

- US-004: Create Appointment
- US-011: Data Persistence
- OpenAI Whisper API (external dependency)

### Technical Notes

- Use Web Audio API for browser-based recording
- Audio format: WebM with Opus codec for browser compatibility
- Maximum recording length: 60 minutes
- Audio uploaded to server, then sent to Whisper API
- Store both audio file reference and transcript text
- Handle network failures gracefully

### UI/UX Notes

- Recording controls should be prominent and always visible during appointment
- Clear visual feedback for recording state (pulsing red indicator)
- Timer should show MM:SS format
- Processing state should show progress if possible
- Transcript panel should be scrollable and readable
- Consider side-by-side layout: transcript | form

---

## User Story US-007: AI Auto-Fill Medical Record

**As a** doctor
**I want to** have AI automatically extract and populate medical record fields from the transcript
**So that** I can save time on documentation while maintaining accuracy through review

### Description

After transcription completes, AI analyzes the conversation to identify and extract relevant medical information. The system automatically populates form fields with extracted data: chief complaint, symptoms, diagnosis, prescriptions, and treatment plan. All AI-filled fields are clearly marked and editable, allowing the doctor to review, accept, modify, or reject suggestions.

### Acceptance Criteria

- [ ] Given a transcript is available, when AI processing completes, then form fields are auto-populated with extracted data
- [ ] Given AI extracts a chief complaint, when the field is populated, then it reflects the patient's stated reason for visit
- [ ] Given AI extracts symptoms, when symptoms are populated, then each symptom includes available details (name, severity, duration)
- [ ] Given AI extracts a diagnosis, when the field is populated, then it reflects the doctor's stated assessment
- [ ] Given AI extracts prescriptions, when prescriptions are populated, then each includes medication details (name, dosage, frequency, instructions)
- [ ] Given fields are AI-populated, when I view the form, then AI-filled fields have a visual indicator (icon, highlight, badge)
- [ ] Given an AI-filled field, when I click to edit, then I can modify or clear the suggestion
- [ ] Given AI suggestions, when I want to reject all, then I can clear all AI suggestions with one action
- [ ] Given AI suggestions, when I review and accept, then the "AI-filled" indicator can be acknowledged
- [ ] Given AI extraction fails or is low-confidence, when viewing the form, then affected fields are left empty with manual entry required
- [ ] Given transcript is displayed, when AI extracts from a phrase, then I can see which transcript text corresponds to each extraction (source highlighting)

### Priority

Must-Have (P0)

### Story Points

13

### Dependencies

- US-004: Create Appointment
- US-005: Manual Record Entry (form fields must exist)
- US-006: AI Transcription (transcript must be available)
- OpenAI GPT-4 or Anthropic Claude API (external dependency)

### Technical Notes

- Use structured prompt engineering to extract JSON-formatted data
- Include medical context in prompts for accurate extraction
- Implement confidence scoring for extractions
- Consider streaming extraction for real-time feel
- Store AI extraction source references (transcript line numbers)
- Handle partial extractions gracefully

### UI/UX Notes

- AI-filled fields should have distinct but non-intrusive styling
- Consider "AI" badge or icon next to auto-filled content
- Clicking on AI field could highlight source text in transcript
- Provide "Accept All" and "Clear All AI" actions
- Show extraction confidence where applicable
- Side-by-side layout: transcript panel | form panel

---

## Story Points Summary

| Story ID | Title | Points |
|----------|-------|--------|
| US-001 | Patient Registration | 5 |
| US-002 | Patient Listing and Search | 3 |
| US-003 | View Patient Medical History | 5 |
| US-004 | Create New Appointment | 3 |
| US-005 | Manual Medical Record Entry | 8 |
| US-006 | AI Transcription Recording | 8 |
| US-007 | AI Auto-Fill Medical Record | 13 |
| **Total** | | **45** |

---

## Implementation Order Recommendation

1. **US-001**: Patient Registration (foundation)
2. **US-002**: Patient Listing and Search (enables navigation)
3. **US-004**: Create Appointment (enables record entry)
4. **US-005**: Manual Record Entry (core documentation)
5. **US-003**: View Medical History (requires records to exist)
6. **US-006**: AI Transcription (enables AI features)
7. **US-007**: AI Auto-Fill (depends on all above)

This order follows the dependency chain and builds functionality incrementally.
