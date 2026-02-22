# Ticket 005: Patients Frontend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-001: Patient Registration
US-002: Patient Listing & Search
US-003: View Patient Medical History

## Description
Implement the frontend for patient management including patient listing with search, patient registration form, patient profile view with medical history, and allergy/condition management.

## Acceptance Criteria
- [ ] Patient list page shows all patients alphabetically
- [ ] Search filters patients by name, phone, or email
- [ ] Search has 300ms debounce for performance
- [ ] Empty state shown when no patients found
- [ ] Patient registration form validates all fields
- [ ] Form shows validation errors inline
- [ ] Successful registration redirects to patient profile
- [ ] Patient profile shows all details and medical history
- [ ] Can add/remove allergies from profile
- [ ] Can add/remove chronic conditions from profile
- [ ] Click on appointment navigates to appointment detail
- [ ] Loading states shown during data fetching

## Technical Requirements

### Frontend Tasks

#### Patient List Page (`src/pages/patients/PatientsPage.tsx`)
- [ ] Display patients in table/card format
- [ ] Search input with debounced filtering
- [ ] Alphabetical sorting by last name
- [ ] Click row navigates to patient profile
- [ ] "Add Patient" button navigates to form
- [ ] Empty state for no patients
- [ ] Empty state for no search results
- [ ] Loading skeleton during fetch
- [ ] Pagination controls

#### Patient Registration Page (`src/pages/patients/NewPatientPage.tsx`)
- [ ] Multi-section form layout
- [ ] Personal Information section
- [ ] Contact Information section
- [ ] Emergency Contact section
- [ ] Insurance Information section
- [ ] Notes section
- [ ] Form validation with error messages
- [ ] Submit button with loading state
- [ ] Cancel button returns to list
- [ ] Success toast and redirect on create

#### Patient Profile Page (`src/pages/patients/PatientProfilePage.tsx`)
- [ ] Patient header with name, age, photo placeholder
- [ ] Tabs or sections: Info, History, Allergies, Conditions
- [ ] Edit patient button
- [ ] Delete patient button with confirmation
- [ ] Appointment history list (newest first)
- [ ] Each appointment shows: date, type, status, diagnosis
- [ ] Click appointment navigates to detail
- [ ] Allergy list with add/remove
- [ ] Condition list with add/remove
- [ ] "New Appointment" button

#### Patient Form Component (`src/components/patients/PatientForm.tsx`)
- [ ] Reusable form for create/edit
- [ ] react-hook-form integration
- [ ] Zod schema validation
- [ ] Field components for each input
- [ ] Date picker for date of birth
- [ ] Select for sex field
- [ ] Optional field indicators

#### Patient Card Component (`src/components/patients/PatientCard.tsx`)
- [ ] Display patient summary info
- [ ] Name, age, phone
- [ ] Last visit date (if any)
- [ ] Click handler for navigation

#### Allergy Form Dialog (`src/components/patients/AllergyFormDialog.tsx`)
- [ ] Dialog for adding allergy
- [ ] Allergen input
- [ ] Severity select
- [ ] Reaction textarea
- [ ] Submit creates allergy

#### Condition Form Dialog (`src/components/patients/ConditionFormDialog.tsx`)
- [ ] Dialog for adding condition
- [ ] Condition name input
- [ ] Diagnosed date picker
- [ ] Notes textarea
- [ ] Submit creates condition

#### Patient API Service (`src/services/patients.api.ts`)
- [ ] `getPatients(search, page)` - List patients
- [ ] `getPatient(id)` - Get patient details
- [ ] `createPatient(data)` - Create patient
- [ ] `updatePatient(id, data)` - Update patient
- [ ] `deletePatient(id)` - Delete patient
- [ ] `getPatientAppointments(id)` - Get history
- [ ] `addAllergy(patientId, data)` - Add allergy
- [ ] `removeAllergy(patientId, allergyId)` - Remove allergy
- [ ] `addCondition(patientId, data)` - Add condition
- [ ] `removeCondition(patientId, conditionId)` - Remove condition

#### React Query Hooks (`src/hooks/usePatients.ts`)
- [ ] `usePatients(search, page)` - Fetch patient list
- [ ] `usePatient(id)` - Fetch single patient
- [ ] `useCreatePatient()` - Mutation for create
- [ ] `useUpdatePatient()` - Mutation for update
- [ ] `useDeletePatient()` - Mutation for delete
- [ ] `usePatientAppointments(id)` - Fetch history
- [ ] `useAddAllergy()` - Mutation
- [ ] `useRemoveAllergy()` - Mutation

#### Form Validation (`src/validators/patient.validator.ts`)
- [ ] `patientSchema` - Zod schema matching backend
- [ ] `allergySchema` - Zod schema for allergies
- [ ] `conditionSchema` - Zod schema for conditions

## API Endpoints Involved
- GET `/api/v1/patients`
- POST `/api/v1/patients`
- GET `/api/v1/patients/:id`
- PUT `/api/v1/patients/:id`
- DELETE `/api/v1/patients/:id`
- GET `/api/v1/patients/:id/appointments`
- POST `/api/v1/patients/:id/allergies`
- DELETE `/api/v1/patients/:id/allergies/:allergyId`
- POST `/api/v1/patients/:id/conditions`
- DELETE `/api/v1/patients/:id/conditions/:conditionId`

## Components Involved
- PatientsPage
- NewPatientPage
- PatientProfilePage
- PatientForm
- PatientCard
- PatientList
- AllergyFormDialog
- ConditionFormDialog
- AllergyList
- ConditionList
- AppointmentHistoryList
- SearchInput
- Pagination
- EmptyState
- ConfirmDialog

## Data Models Involved
- Patient
- Allergy
- ChronicCondition
- Appointment (for history)

## Testing Requirements

### Unit Tests

#### PatientForm (`tests/unit/components/PatientForm.test.tsx`)
- [ ] Renders all required fields
- [ ] Shows validation errors for empty required fields
- [ ] Shows validation error for invalid email
- [ ] Shows validation error for future date of birth
- [ ] Calls onSubmit with valid data
- [ ] Disables submit while loading

#### PatientsPage (`tests/unit/pages/PatientsPage.test.tsx`)
- [ ] Renders patient list
- [ ] Shows empty state when no patients
- [ ] Search input filters patients
- [ ] Click patient navigates to profile
- [ ] Shows loading skeleton during fetch

#### PatientProfilePage (`tests/unit/pages/PatientProfilePage.test.tsx`)
- [ ] Displays patient information
- [ ] Shows appointment history
- [ ] Shows allergies list
- [ ] Shows conditions list
- [ ] Delete button shows confirmation
- [ ] Edit navigates to edit form

#### usePatients Hook (`tests/unit/hooks/usePatients.test.ts`)
- [ ] Fetches patients successfully
- [ ] Handles search parameter
- [ ] Returns loading state
- [ ] Handles error state

### E2E Tests (`tests/e2e/patients.spec.ts`)
- [ ] Create new patient flow
- [ ] Search patient by name
- [ ] View patient profile
- [ ] Add allergy to patient
- [ ] Remove allergy from patient
- [ ] Delete patient with confirmation

## Dependencies
- TICKET-003: Auth Frontend (protected routes)
- TICKET-004: Patients Backend

## Estimation
8 Story Points

## Implementation Notes
- Use debounce (300ms) for search to avoid API spam
- Implement optimistic updates for better UX
- Use React Query for caching and refetching
- Show confirmation dialog before delete
- Age should be calculated from dateOfBirth
- Format phone numbers consistently
- Handle 404 gracefully (patient not found)
- Consider using tabs for profile sections
- Invalidate queries after mutations

## Files to Create/Modify

### Frontend
- `src/pages/patients/PatientsPage.tsx`
- `src/pages/patients/NewPatientPage.tsx`
- `src/pages/patients/PatientProfilePage.tsx`
- `src/pages/patients/EditPatientPage.tsx`
- `src/components/patients/PatientForm.tsx`
- `src/components/patients/PatientCard.tsx`
- `src/components/patients/PatientList.tsx`
- `src/components/patients/AllergyFormDialog.tsx`
- `src/components/patients/AllergyList.tsx`
- `src/components/patients/ConditionFormDialog.tsx`
- `src/components/patients/ConditionList.tsx`
- `src/components/patients/AppointmentHistoryList.tsx`
- `src/services/patients.api.ts`
- `src/hooks/usePatients.ts`
- `src/validators/patient.validator.ts`
- `src/types/patient.types.ts`
- `src/App.tsx` (add routes)
- `tests/unit/components/PatientForm.test.tsx`
- `tests/unit/pages/PatientsPage.test.tsx`
- `tests/unit/pages/PatientProfilePage.test.tsx`
- `tests/unit/hooks/usePatients.test.ts`
- `tests/e2e/patients.spec.ts`

## Definition of Done
- [ ] Patient list displays and searches correctly
- [ ] Patient registration works end-to-end
- [ ] Patient profile displays all information
- [ ] Allergy management working
- [ ] Condition management working
- [ ] Appointment history displays
- [ ] Unit tests passing (>70% coverage)
- [ ] E2E tests passing
- [ ] Responsive design works on mobile
- [ ] Loading states provide good UX
- [ ] Code reviewed and approved
