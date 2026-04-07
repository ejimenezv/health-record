# Ticket 009: Medical Records Frontend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-005: Manual Medical Record Entry

## Description
Implement the frontend for medical record documentation including the SOAP format form, vital signs entry, symptom management, prescription management, auto-save functionality, and record completion. This is the primary clinical workflow page.

## Acceptance Criteria
- [ ] Medical record page shows patient info header
- [ ] SOAP format sections (Subjective, Objective, Assessment, Plan)
- [ ] Chief complaint field prominently displayed
- [ ] Vital signs form section
- [ ] Add/edit/remove symptoms
- [ ] Add/edit/remove prescriptions
- [ ] Auto-save every 30 seconds
- [ ] Manual save button
- [ ] Complete Appointment button
- [ ] Completion confirmation dialog
- [ ] Success redirect to patient profile
- [ ] Loading states for all operations
- [ ] Unsaved changes warning on navigation

## Technical Requirements

### Frontend Tasks

#### Medical Record Page (`src/pages/appointments/AppointmentPage.tsx`)
- [ ] Patient header with demographics
- [ ] Navigation breadcrumb
- [ ] Tab/section layout for form sections
- [ ] Transcription panel (placeholder for TICKET-011)
- [ ] Save and Complete buttons in header
- [ ] Loading state during data fetch
- [ ] Error handling for failed operations

#### Medical Record Form (`src/components/medical-records/MedicalRecordForm.tsx`)
- [ ] Chief complaint textarea (prominent)
- [ ] SOAP sections (collapsible)
- [ ] Subjective textarea
- [ ] Objective textarea
- [ ] Assessment textarea
- [ ] Plan textarea
- [ ] Rich text or markdown support (optional)
- [ ] Auto-save indicator (saving..., saved)

#### Vital Signs Form (`src/components/medical-records/VitalSignsForm.tsx`)
- [ ] Blood pressure (systolic/diastolic)
- [ ] Heart rate
- [ ] Temperature (with unit toggle F/C)
- [ ] Respiratory rate
- [ ] Oxygen saturation (SpO2)
- [ ] Weight (with unit toggle kg/lb)
- [ ] Height (with unit toggle cm/ft)
- [ ] BMI auto-calculation (display only)

#### Symptoms Section (`src/components/medical-records/SymptomsSection.tsx`)
- [ ] List of current symptoms
- [ ] Add symptom button
- [ ] Symptom form dialog
- [ ] Edit symptom inline or dialog
- [ ] Remove symptom with confirmation
- [ ] AI-generated badge indicator
- [ ] Severity slider (1-10)
- [ ] Duration input

#### Symptom Form Dialog (`src/components/medical-records/SymptomFormDialog.tsx`)
- [ ] Symptom name input
- [ ] Severity slider
- [ ] Duration input
- [ ] Notes textarea
- [ ] Save/Cancel buttons

#### Prescriptions Section (`src/components/medical-records/PrescriptionsSection.tsx`)
- [ ] List of current prescriptions
- [ ] Add prescription button
- [ ] Prescription form dialog
- [ ] Edit prescription
- [ ] Remove prescription with confirmation
- [ ] AI-generated badge indicator

#### Prescription Form Dialog (`src/components/medical-records/PrescriptionFormDialog.tsx`)
- [ ] Medication name input (with autocomplete?)
- [ ] Dosage input
- [ ] Frequency select/input
- [ ] Duration input
- [ ] Quantity input
- [ ] Refills input
- [ ] Instructions textarea
- [ ] Save/Cancel buttons

#### Auto-Save Hook (`src/hooks/useAutoSave.ts`)
- [ ] Debounced auto-save (30 seconds)
- [ ] Track dirty state
- [ ] Trigger save on changes
- [ ] Handle save errors gracefully
- [ ] Expose saving status

#### Medical Record API Service (`src/services/medical-records.api.ts`)
- [ ] `getRecord(appointmentId)` - Fetch record
- [ ] `updateRecord(appointmentId, data)` - Full update
- [ ] `patchRecord(appointmentId, data)` - Partial update
- [ ] `completeRecord(appointmentId)` - Mark complete
- [ ] `addSymptom(appointmentId, data)` - Add
- [ ] `updateSymptom(appointmentId, symptomId, data)` - Update
- [ ] `removeSymptom(appointmentId, symptomId)` - Remove
- [ ] `addPrescription(appointmentId, data)` - Add
- [ ] `updatePrescription(appointmentId, prescriptionId, data)` - Update
- [ ] `removePrescription(appointmentId, prescriptionId)` - Remove
- [ ] `getVitalSigns(appointmentId)` - Get vitals
- [ ] `updateVitalSigns(appointmentId, data)` - Update vitals

#### React Query Hooks (`src/hooks/useMedicalRecord.ts`)
- [ ] `useMedicalRecord(appointmentId)` - Fetch record
- [ ] `useUpdateRecord()` - Mutation
- [ ] `usePatchRecord()` - Partial update mutation
- [ ] `useCompleteRecord()` - Complete mutation
- [ ] `useAddSymptom()` - Mutation
- [ ] `useUpdateSymptom()` - Mutation
- [ ] `useRemoveSymptom()` - Mutation
- [ ] `useAddPrescription()` - Mutation
- [ ] `useUpdatePrescription()` - Mutation
- [ ] `useRemovePrescription()` - Mutation
- [ ] `useVitalSigns(appointmentId)` - Fetch vitals
- [ ] `useUpdateVitalSigns()` - Mutation

#### Form Validation (`src/validators/medical-record.validator.ts`)
- [ ] `medicalRecordSchema` - SOAP fields
- [ ] `symptomSchema` - Symptom fields
- [ ] `prescriptionSchema` - Prescription fields
- [ ] `vitalSignsSchema` - Vital signs fields

## API Endpoints Involved
- GET `/api/v1/appointments/:id/record`
- PUT `/api/v1/appointments/:id/record`
- PATCH `/api/v1/appointments/:id/record`
- POST `/api/v1/appointments/:id/record/complete`
- POST/PATCH/DELETE `/api/v1/appointments/:id/record/symptoms`
- POST/PATCH/DELETE `/api/v1/appointments/:id/record/prescriptions`
- GET/PUT `/api/v1/appointments/:id/vital-signs`

## Components Involved
- AppointmentPage
- MedicalRecordForm
- VitalSignsForm
- SymptomsSection
- SymptomFormDialog
- SymptomCard
- PrescriptionsSection
- PrescriptionFormDialog
- PrescriptionCard
- PatientHeader
- AutoSaveIndicator
- AIGeneratedBadge
- ConfirmCompleteDialog

## Data Models Involved
- MedicalRecord
- Symptom
- Prescription
- VitalSigns
- Appointment
- Patient

## Testing Requirements

### Unit Tests

#### MedicalRecordForm (`tests/unit/components/MedicalRecordForm.test.tsx`)
- [ ] Renders all SOAP sections
- [ ] Shows chief complaint field
- [ ] Handles text input changes
- [ ] Triggers auto-save on changes
- [ ] Shows saving indicator

#### VitalSignsForm (`tests/unit/components/VitalSignsForm.test.tsx`)
- [ ] Renders all vital sign fields
- [ ] Validates numeric inputs
- [ ] Calculates BMI correctly
- [ ] Handles unit conversion

#### SymptomsSection (`tests/unit/components/SymptomsSection.test.tsx`)
- [ ] Renders list of symptoms
- [ ] Add button opens dialog
- [ ] Shows AI badge for AI symptoms
- [ ] Remove triggers confirmation
- [ ] Empty state shown

#### PrescriptionsSection (`tests/unit/components/PrescriptionsSection.test.tsx`)
- [ ] Renders list of prescriptions
- [ ] Add button opens dialog
- [ ] Edit opens form with data
- [ ] Remove triggers confirmation

#### useAutoSave Hook (`tests/unit/hooks/useAutoSave.test.ts`)
- [ ] Debounces save calls
- [ ] Triggers save after delay
- [ ] Exposes isSaving state
- [ ] Handles errors gracefully

#### useMedicalRecord Hook (`tests/unit/hooks/useMedicalRecord.test.ts`)
- [ ] Fetches record on mount
- [ ] Returns loading state
- [ ] Handles not found

### E2E Tests (`tests/e2e/medical-record.spec.ts`)
- [ ] Fill out complete medical record
- [ ] Add and remove symptoms
- [ ] Add and remove prescriptions
- [ ] Auto-save persists data
- [ ] Complete appointment flow
- [ ] Navigation with unsaved changes

## Dependencies
- TICKET-003: Auth Frontend
- TICKET-007: Appointments Frontend
- TICKET-008: Medical Records Backend

## Estimation
8 Story Points

## Implementation Notes
- Use React Hook Form with useWatch for auto-save
- Debounce auto-save to prevent API spam
- Show "Saving..." and "Saved" indicators
- Use optimistic updates for better UX
- Prescription form should have common medications list
- Consider frequency presets (BID, TID, QID, PRN)
- Validate required fields before complete
- Warn user about unsaved changes on navigation
- Tab order should follow logical clinical workflow
- Consider keyboard shortcuts for power users

## Files to Create/Modify

### Frontend
- `src/pages/appointments/AppointmentPage.tsx`
- `src/components/medical-records/MedicalRecordForm.tsx`
- `src/components/medical-records/VitalSignsForm.tsx`
- `src/components/medical-records/SymptomsSection.tsx`
- `src/components/medical-records/SymptomFormDialog.tsx`
- `src/components/medical-records/SymptomCard.tsx`
- `src/components/medical-records/PrescriptionsSection.tsx`
- `src/components/medical-records/PrescriptionFormDialog.tsx`
- `src/components/medical-records/PrescriptionCard.tsx`
- `src/components/medical-records/PatientHeader.tsx`
- `src/components/medical-records/AutoSaveIndicator.tsx`
- `src/components/common/AIGeneratedBadge.tsx`
- `src/components/common/ConfirmDialog.tsx`
- `src/hooks/useAutoSave.ts`
- `src/hooks/useMedicalRecord.ts`
- `src/services/medical-records.api.ts`
- `src/validators/medical-record.validator.ts`
- `src/types/medical-record.types.ts`
- `src/App.tsx` (add route)
- `tests/unit/components/MedicalRecordForm.test.tsx`
- `tests/unit/components/VitalSignsForm.test.tsx`
- `tests/unit/components/SymptomsSection.test.tsx`
- `tests/unit/components/PrescriptionsSection.test.tsx`
- `tests/unit/hooks/useAutoSave.test.ts`
- `tests/unit/hooks/useMedicalRecord.test.ts`
- `tests/e2e/medical-record.spec.ts`

## Definition of Done
- [ ] Medical record page displays correctly
- [ ] All SOAP fields editable
- [ ] Vital signs form working
- [ ] Symptom CRUD working
- [ ] Prescription CRUD working
- [ ] Auto-save functioning
- [ ] Complete flow working
- [ ] Unit tests passing (>70% coverage)
- [ ] E2E tests passing
- [ ] Navigation guards working
- [ ] Responsive design
- [ ] Code reviewed and approved
