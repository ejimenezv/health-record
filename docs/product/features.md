# Features & Functionalities: MedRecord AI

## Overview

This document details all features planned for MedRecord AI, categorized by priority level. Features are described with user-facing functionality, technical considerations, and acceptance criteria.

---

## Feature Priority Legend

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | **Must-Have** | Required for MVP launch. Core functionality. |
| P1 | **Should-Have** | High value, include if time permits. |
| P2 | **Nice-to-Have** | Valuable but not essential for MVP. |
| P3 | **Future** | Post-MVP enhancements. |

---

## Core Features (Must-Have - P0)

### 1. Patient Management

**Description**: Complete patient lifecycle management allowing doctors to create, view, edit, and search patient profiles.

#### 1.1 Create New Patient Profile

**User Story**: As a doctor, I want to register new patients in the system so I can track their medical history.

**Functionality**:
- Form to enter patient demographics
- Required fields: First name, last name, date of birth, sex, phone, emergency contact
- Optional fields: Email, address
- Automatic patient ID generation
- Duplicate detection (warn if similar name + DOB exists)

**Fields Captured**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | Text | Yes | 2-50 characters |
| Last Name | Text | Yes | 2-50 characters |
| Date of Birth | Date | Yes | Not future date, reasonable age |
| Sex | Enum | Yes | Male, Female, Other |
| Phone | Phone | Yes | Valid phone format |
| Email | Email | No | Valid email format |
| Address | Text | No | Max 200 characters |
| Emergency Contact Name | Text | Yes | 2-100 characters |
| Emergency Contact Phone | Phone | Yes | Valid phone format |
| Emergency Contact Relationship | Text | No | Max 50 characters |

**Acceptance Criteria**:
- [ ] User can fill out and submit patient form
- [ ] Validation errors display clearly
- [ ] Success message after creation
- [ ] Redirect to patient profile after creation

#### 1.2 Edit Patient Information

**User Story**: As a doctor, I want to update patient information when their details change.

**Functionality**:
- Pre-populated form with existing data
- All fields editable
- Change history tracked (updated_at timestamp)
- Save and cancel buttons

**Acceptance Criteria**:
- [ ] Form loads with current patient data
- [ ] Changes can be saved
- [ ] Cancel returns to profile without changes
- [ ] Updated timestamp reflects change

#### 1.3 Search and Filter Patients

**User Story**: As a doctor, I want to quickly find patients by name or other criteria.

**Functionality**:
- Search bar on patient list page
- Search by: first name, last name, phone, email
- Real-time filtering as user types
- Clear search option
- Results sorted by relevance or alphabetically

**Acceptance Criteria**:
- [ ] Search returns matching patients
- [ ] Search is case-insensitive
- [ ] Partial matches work (searching "Joh" finds "John")
- [ ] Empty search shows all patients

#### 1.4 View Patient Details

**User Story**: As a doctor, I want to view complete patient information including their appointment history.

**Functionality**:
- Patient profile page showing demographics
- List of past appointments (chronological, most recent first)
- Quick links to create new appointment
- Allergy and chronic condition summary

**Acceptance Criteria**:
- [ ] Profile displays all patient data
- [ ] Appointment history is visible
- [ ] Can navigate to any past appointment
- [ ] Can create new appointment from profile

---

### 2. Appointment Management

**Description**: Schedule and manage patient appointments, linking each visit to a medical record.

#### 2.1 Create New Appointment

**User Story**: As a doctor, I want to create appointment records for patient visits.

**Functionality**:
- Select or create patient
- Set appointment date and time
- Choose appointment type
- Enter reason for visit
- Set expected duration
- Appointment starts in "Scheduled" status

**Appointment Types**:
- New Patient
- Follow-up
- Routine Checkup
- Sick Visit
- Telehealth

**Acceptance Criteria**:
- [ ] Appointment linked to patient
- [ ] Date/time picker works correctly
- [ ] Appointment appears in patient history
- [ ] Can navigate to appointment from patient profile

#### 2.2 View Appointment History

**User Story**: As a doctor, I want to see all past appointments for a patient in chronological order.

**Functionality**:
- List view of appointments on patient profile
- Show: date, type, reason, status
- Sort by date (newest first by default)
- Filter by date range (optional)
- Click to view full appointment details

**Acceptance Criteria**:
- [ ] All patient appointments visible
- [ ] Appointments sorted chronologically
- [ ] Can view details of any appointment
- [ ] Status clearly indicated (completed, scheduled, etc.)

#### 2.3 Navigate Between Appointments

**User Story**: As a doctor, I want to easily move between a patient's appointments to review history.

**Functionality**:
- Previous/Next navigation on appointment view
- Breadcrumb showing patient > appointment path
- Quick jump to any appointment from list
- Return to patient profile easily

**Acceptance Criteria**:
- [ ] Can navigate to previous/next appointment
- [ ] Navigation maintains patient context
- [ ] Clear indication of current appointment in sequence

#### 2.4 Update Appointment Status

**User Story**: As a doctor, I want to track the status of appointments through their lifecycle.

**Functionality**:
- Status progression: Scheduled → Checked-in → In Progress → Completed
- Cancel appointment option
- Mark as No-Show option
- Status displayed prominently

**Status Values**:
| Status | Description |
|--------|-------------|
| Scheduled | Appointment booked, not yet started |
| Checked-in | Patient has arrived |
| In Progress | Consultation happening |
| Completed | Appointment finished, record complete |
| Cancelled | Appointment was cancelled |
| No-Show | Patient did not attend |

**Acceptance Criteria**:
- [ ] Status can be updated
- [ ] Completed appointments have medical records
- [ ] Cancelled/No-Show appointments preserved in history

---

### 3. Medical Record Entry

**Description**: Document clinical encounters using a simplified SOAP format with symptoms, diagnosis, and prescriptions.

#### 3.1 Manual Symptom Entry

**User Story**: As a doctor, I want to record patient symptoms during a consultation.

**Functionality**:
- Add multiple symptoms per appointment
- For each symptom capture: name, body site, severity (1-10), duration, notes
- Edit and delete symptoms
- Symptoms saved with appointment

**Symptom Fields**:
| Field | Type | Required |
|-------|------|----------|
| Symptom Name | Text | Yes |
| Body Site | Text | No |
| Severity | Number (1-10) | No |
| Duration | Text | No |
| Notes | Text | No |

**Acceptance Criteria**:
- [ ] Can add symptoms to appointment
- [ ] Multiple symptoms supported
- [ ] Can edit/delete symptoms
- [ ] Symptoms persist when appointment saved

#### 3.2 Manual Diagnosis Entry

**User Story**: As a doctor, I want to record my diagnosis for a patient visit.

**Functionality**:
- Free-text diagnosis field (no ICD-10 coding required)
- Diagnosis notes for additional context
- One primary diagnosis per appointment
- History of previous diagnoses accessible

**Diagnosis Fields**:
| Field | Type | Required |
|-------|------|----------|
| Primary Diagnosis | Text | Yes (for completed appointments) |
| Diagnosis Notes | Text | No |

**Acceptance Criteria**:
- [ ] Diagnosis can be entered as free text
- [ ] Notes provide additional context
- [ ] Required for completing appointment

#### 3.3 Manual Prescription Entry

**User Story**: As a doctor, I want to record medications prescribed during a visit.

**Functionality**:
- Add multiple prescriptions per appointment
- Prescription fields: medication name, strength, dosage, frequency, duration, instructions
- Edit and delete prescriptions
- View patient's current medications

**Prescription Fields**:
| Field | Type | Required |
|-------|------|----------|
| Medication Name | Text | Yes |
| Strength | Text | Yes |
| Dosage | Text | Yes |
| Frequency | Text | Yes |
| Duration | Text | No |
| Quantity | Number | No |
| Refills | Number | No |
| Instructions | Text | Yes |
| Indication | Text | No |

**Acceptance Criteria**:
- [ ] Can add prescriptions to appointment
- [ ] Multiple prescriptions supported
- [ ] Required fields validated
- [ ] Prescriptions saved with appointment

#### 3.4 Save and Edit Medical Records

**User Story**: As a doctor, I want to save medical records and edit them if needed.

**Functionality**:
- Save record as draft or complete
- Edit any field after saving
- Track when record was created/updated
- Mark as AI-generated vs. manual entry

**Medical Record Fields (SOAP)**:
| Section | Field | AI-Fillable |
|---------|-------|-------------|
| Subjective | Chief Complaint | Yes |
| Subjective | History of Present Illness | Yes |
| Subjective | Current Medications | Yes |
| Subjective | Allergies Noted | Yes |
| Objective | Physical Exam Notes | Yes |
| Assessment | Diagnosis | Yes |
| Assessment | Diagnosis Notes | Yes |
| Plan | Treatment Plan | Yes |
| Plan | Follow-up Instructions | Yes |
| Plan | Patient Education | Yes |

**Acceptance Criteria**:
- [ ] Record can be saved
- [ ] All fields editable
- [ ] Timestamps tracked
- [ ] Completion status tracked

---

### 4. AI Transcription & Auto-Fill

**Description**: Record doctor-patient conversations and use AI to automatically populate medical record fields.

#### 4.1 Audio Recording

**User Story**: As a doctor, I want to record my conversation with a patient during the appointment.

**Functionality**:
- Start/stop recording button
- Visual indicator that recording is active
- Recording timer display
- Support recordings up to 60 minutes
- Browser-based recording (no software install)
- Recording saved with appointment

**Technical Details**:
- Uses Web Audio API
- Format: WebM with Opus codec
- Sample rate: 44.1kHz
- Mono channel with noise suppression

**Acceptance Criteria**:
- [ ] Recording starts when button clicked
- [ ] Clear visual feedback of recording state
- [ ] Recording stops when button clicked
- [ ] Audio accessible after recording

#### 4.2 Real-Time Transcription Display

**User Story**: As a doctor, I want to see the transcription of my conversation after recording.

**Functionality**:
- Display raw transcript after processing
- Processing indicator during transcription
- Scrollable transcript view
- Timestamps optional

**Acceptance Criteria**:
- [ ] Transcript appears after recording processed
- [ ] Clear loading state during processing
- [ ] Transcript is readable and accurate

#### 4.3 Automatic Field Extraction

**User Story**: As a doctor, I want the system to automatically identify and extract medical information from the transcript.

**Functionality**:
- AI extracts: symptoms, diagnosis, prescriptions, chief complaint, treatment plan
- Extracted data presented as suggestions
- Confidence indicators for each extraction
- Source text highlighted in transcript

**Extracted Fields**:
| Field | Confidence Level | Description |
|-------|------------------|-------------|
| Chief Complaint | High | Usually stated clearly |
| Symptoms | High | Explicitly mentioned |
| Diagnosis | Medium | Doctor's stated conclusion |
| Prescriptions | High | Specific medication details |
| Treatment Plan | Medium | Synthesized from discussion |
| Follow-up | Low | Context-dependent |

**Acceptance Criteria**:
- [ ] AI extracts relevant fields from transcript
- [ ] Extractions shown as suggestions
- [ ] Confidence levels visible
- [ ] Can trace extraction to source text

#### 4.4 Real-Time Form Auto-Population

**User Story**: As a doctor, I want extracted information to automatically populate the medical record form.

**Functionality**:
- Auto-fill form fields from AI extraction
- Visual indication of AI-filled fields
- Easy to distinguish AI vs. manual entries
- One-click to accept or reject suggestions

**Acceptance Criteria**:
- [ ] Form fields populated from AI extraction
- [ ] AI-filled fields clearly marked
- [ ] Can accept individual suggestions
- [ ] Can reject/modify any field

#### 4.5 Human Review and Correction

**User Story**: As a doctor, I want to review and correct AI suggestions before saving.

**Functionality**:
- Side-by-side view: transcript + form
- Edit any AI-filled field
- Add information AI missed
- Clear "Confirm and Save" action
- Nothing saved without explicit confirmation

**Acceptance Criteria**:
- [ ] All fields editable regardless of source
- [ ] Can add data AI didn't extract
- [ ] Explicit save required
- [ ] AI-generated flag tracked for records

---

## Should-Have Features (P1)

### 5. Vital Signs Recording

**Description**: Record patient vital signs during appointments.

**Functionality**:
- Standard vital signs: BP, heart rate, temperature, respiratory rate, SpO2, weight, height
- Pain level (0-10 scale)
- Calculated BMI
- Historical vital signs comparison

**Vital Sign Fields**:
| Field | Unit | Normal Range |
|-------|------|--------------|
| Blood Pressure (Systolic) | mmHg | 90-120 |
| Blood Pressure (Diastolic) | mmHg | 60-80 |
| Heart Rate | bpm | 60-100 |
| Temperature | °F/°C | 97-99°F |
| Respiratory Rate | breaths/min | 12-20 |
| Oxygen Saturation | % | 95-100 |
| Weight | lbs/kg | Varies |
| Height | in/cm | Varies |
| Pain Level | 0-10 | 0 |

**Acceptance Criteria**:
- [ ] Vital signs can be recorded with appointment
- [ ] Units are clear and consistent
- [ ] Optional fields don't block workflow

---

## Nice-to-Have Features (P2)

### 6. Appointment Summary Generation

**Description**: AI generates a brief summary of the appointment for quick reference.

**Functionality**:
- Auto-generated 2-3 sentence summary
- Includes: reason, diagnosis, key actions
- Displayed on appointment card in history
- Editable by doctor

### 7. Export Medical Record to PDF

**Description**: Generate printable PDF of medical record.

**Functionality**:
- PDF with patient info, vitals, SOAP notes, prescriptions
- Professional formatting
- Doctor signature line
- Print-ready layout

### 8. Search Across All Appointments

**Description**: Global search across all patient appointments.

**Functionality**:
- Search by diagnosis, symptom, medication
- Results show matching appointments
- Filter by date range
- Export search results

---

## Future Features (P3)

### 9. Real-Time Transcription

**Description**: Live transcription during appointment (vs. post-recording).

### 10. Multi-Language Support

**Description**: Support for languages other than English.

### 11. Integration with External EHRs

**Description**: Export/import data from other EHR systems.

### 12. Billing Code Suggestions

**Description**: AI suggests CPT/ICD codes based on documentation.

### 13. Patient Portal

**Description**: Patient-facing view of their records and appointments.

---

## Feature Dependency Map

```
Patient Management
       │
       ├──▶ Appointment Management
       │           │
       │           ├──▶ Medical Record Entry
       │           │           │
       │           │           ├──▶ AI Transcription
       │           │           │
       │           │           └──▶ Vital Signs
       │           │
       │           └──▶ Prescription Management
       │
       └──▶ Search/Filter
```

---

## Feature Summary Table

| # | Feature | Priority | Complexity | Dependencies |
|---|---------|----------|------------|--------------|
| 1 | Patient Management | P0 | Medium | None |
| 2 | Appointment Management | P0 | Medium | Patient |
| 3 | Medical Record Entry | P0 | Medium | Appointment |
| 4 | AI Transcription | P0 | High | Medical Record |
| 5 | Vital Signs | P1 | Low | Appointment |
| 6 | Summary Generation | P2 | Medium | AI Transcription |
| 7 | PDF Export | P2 | Medium | Medical Record |
| 8 | Global Search | P2 | Medium | All Records |
