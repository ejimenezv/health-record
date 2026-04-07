# Technical User Stories

## Overview

This document contains technical user stories that support the functional requirements. These stories cover infrastructure concerns like authentication and data persistence that are essential for the system to function but are not directly user-facing features.

**Total Stories**: 2
**Priority Level**: P0 - Must-Have (infrastructure)
**Estimated Points**: 8 points

---

## User Story US-010: User Authentication

**As a** doctor
**I want to** log in to the system securely
**So that** my patient data is protected and only I can access my records

### Description

The system requires basic authentication to protect sensitive medical data. For the MVP, this is simplified to a single-user login mechanism. The doctor enters credentials, the system validates them, and creates a session that persists until logout or timeout. Authentication gates access to all application features.

### Acceptance Criteria

- [ ] Given I am not logged in, when I access any protected page, then I am redirected to the login page
- [ ] Given I am on the login page, when I view the form, then I see email and password fields
- [ ] Given I enter valid credentials, when I submit the form, then I am logged in and redirected to the dashboard
- [ ] Given I enter invalid credentials, when I submit the form, then I see an error message "Invalid email or password"
- [ ] Given I am logged in, when my session is active, then I can access all application features
- [ ] Given I am logged in, when I click "Logout", then my session ends and I am redirected to the login page
- [ ] Given I am logged in, when I close the browser and return, then I remain logged in (session persistence)
- [ ] Given my session has been inactive for 24 hours, when I try to access the app, then I must log in again
- [ ] Given I am logged in, when I view the header, then I see my name/email and a logout option

### Priority

Must-Have (P0) - Infrastructure

### Story Points

5

### Dependencies

- None (foundational story)

### Technical Notes

- For MVP: Simple email/password authentication
- Use session-based auth with HTTP-only cookies
- Password should be hashed (bcrypt)
- Consider using NextAuth.js for simplified implementation
- Single user account can be seeded in database
- Session timeout: 24 hours
- CSRF protection on forms

### UI/UX Notes

- Login page should be simple and clean
- "Remember me" checkbox optional for MVP
- Error messages should not reveal if email exists
- Loading state during authentication
- Automatic redirect to intended page after login

### Security Considerations

- Passwords must be hashed before storage
- Use HTTPS in production
- Implement rate limiting on login attempts (optional for MVP)
- Session tokens should be secure and HTTP-only

---

## User Story US-011: Data Persistence

**As a** doctor
**I want to** have all my data saved reliably
**So that** patient records and appointments persist between sessions and are not lost

### Description

All application data must be persisted to a database and reliably retrieved. This includes patients, appointments, medical records, symptoms, prescriptions, and transcripts. Data should survive server restarts and be available across different browser sessions. The system should handle concurrent access and maintain data integrity.

### Acceptance Criteria

- [ ] Given I create a new patient, when I refresh the page, then the patient still exists
- [ ] Given I create an appointment, when I log out and log back in, then the appointment is still there
- [ ] Given I save a medical record, when I navigate away and return, then all record data is preserved
- [ ] Given I add symptoms to an appointment, when I reload the page, then symptoms are still attached to the appointment
- [ ] Given I add prescriptions to an appointment, when I view the appointment later, then prescriptions are displayed
- [ ] Given a transcript is generated, when I view the appointment later, then the transcript is available
- [ ] Given I edit patient information, when I save, then changes are persisted immediately
- [ ] Given the server restarts, when the server comes back online, then all data is intact
- [ ] Given I use the application, when data is being saved, then I see feedback (success/error messages)
- [ ] Given a save operation fails, when an error occurs, then I see an error message and my data is not lost from the form

### Priority

Must-Have (P0) - Infrastructure

### Story Points

3

### Dependencies

- Database setup and configuration

### Technical Notes

- Use PostgreSQL for relational data storage
- Implement Prisma ORM for database access
- Define schema for all entities:
  - User/Provider
  - Patient
  - Appointment
  - MedicalRecord
  - Symptom
  - Prescription
  - Transcript
  - VitalSigns
- Use transactions for related data operations
- Implement optimistic updates for better UX
- Error handling with meaningful messages
- Database migrations for schema changes

### UI/UX Notes

- Show loading states during save operations
- Display success confirmations (toast notifications)
- Show error messages when saves fail
- Consider auto-save for long forms (drafts)
- Offline indicator if connection is lost

### Data Entities

| Entity | Key Fields | Relationships |
|--------|------------|---------------|
| User | id, email, password_hash, name | has_many: Patients |
| Patient | id, first_name, last_name, dob, phone, emergency_contact | has_many: Appointments |
| Appointment | id, patient_id, date, type, reason, status | belongs_to: Patient, has_one: MedicalRecord |
| MedicalRecord | id, appointment_id, chief_complaint, diagnosis, treatment_plan | belongs_to: Appointment |
| Symptom | id, medical_record_id, name, body_site, severity, duration | belongs_to: MedicalRecord |
| Prescription | id, medical_record_id, medication, strength, dosage, frequency | belongs_to: MedicalRecord |
| Transcript | id, appointment_id, audio_url, text | belongs_to: Appointment |
| VitalSigns | id, appointment_id, bp, hr, temp, spo2, weight, height | belongs_to: Appointment |

---

## Story Points Summary

| Story ID | Title | Points |
|----------|-------|--------|
| US-010 | User Authentication | 5 |
| US-011 | Data Persistence | 3 |
| **Total** | | **8** |

---

## Implementation Order

These technical stories are foundational and should be implemented first:

1. **US-011: Data Persistence** - Set up database schema and data layer
2. **US-010: User Authentication** - Protect application access

Both stories are prerequisites for all functional user stories. The data persistence story should be implemented first as authentication typically requires a user record in the database.
