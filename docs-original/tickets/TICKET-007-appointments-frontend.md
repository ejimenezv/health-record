# Ticket 007: Appointments Frontend

## Status: COMPLETED ✅

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-004: Create New Appointment

## Description
Implement the frontend for appointment management including creating new appointments from patient profile, appointment list/calendar view, and appointment status management. This sets up the foundation for the medical record entry page.

## Acceptance Criteria
- [x] Create appointment from patient profile
- [x] Appointment form pre-fills current date/time
- [x] All appointment types selectable
- [x] Creating appointment redirects to appointment detail (medical record page pending)
- [x] Dashboard shows today's appointments
- [x] Filter appointments by date and status
- [x] Appointment cards show key info
- [x] Click appointment navigates to detail/record page
- [x] Status can be updated from appointment view
- [x] Cancel appointment with confirmation

## Technical Requirements

### Frontend Tasks

#### New Appointment Page (`src/pages/appointments/NewAppointmentPage.tsx`)
- [x] Form for creating appointment
- [x] Patient info displayed (from route params)
- [x] Date/time picker for appointment date
- [x] Select for appointment type
- [x] Textarea for reason
- [x] Textarea for notes (optional)
- [x] Submit creates and redirects to appointment detail
- [x] Cancel returns to patient profile

#### Appointment Form Component (`src/components/appointments/AppointmentForm.tsx`)
- [x] Reusable form component
- [x] react-hook-form integration
- [x] Zod validation
- [x] Date picker defaults to now
- [x] Time picker component
- [x] Appointment type select with icons

#### Dashboard Page (`src/pages/DashboardPage.tsx`)
- [x] Welcome message with provider name
- [x] Today's appointments section
- [x] Quick stats (patients, appointments today)
- [x] Quick actions (new patient, new appointment)
- [ ] Recent activity feed (optional - deferred)

#### Appointment Card Component (`src/components/appointments/AppointmentCard.tsx`)
- [x] Patient name and photo placeholder
- [x] Appointment date and time
- [x] Appointment type badge
- [x] Status badge with color coding
- [x] Reason snippet
- [x] Click handler for navigation

#### Appointment Status Badge (`src/components/appointments/StatusBadge.tsx`)
- [x] Color-coded status indicator
- [x] scheduled: blue
- [x] checked_in: yellow
- [x] in_progress: orange
- [x] completed: green
- [x] cancelled: gray
- [x] no_show: red

#### Appointment API Service (`src/services/appointments.api.ts`)
- [x] `getAppointments(filters)` - List appointments
- [x] `getAppointment(id)` - Get appointment details
- [x] `createAppointment(patientId, data)` - Create
- [x] `updateAppointment(id, data)` - Update
- [x] `updateStatus(id, status)` - Change status
- [x] `deleteAppointment(id)` - Delete

#### React Query Hooks (`src/hooks/useAppointments.ts`)
- [x] `useAppointments(filters)` - Fetch list
- [x] `useAppointment(id)` - Fetch single
- [x] `useTodaysAppointments()` - Dashboard query
- [x] `useCreateAppointment()` - Mutation
- [x] `useUpdateAppointment()` - Mutation
- [x] `useUpdateStatus()` - Mutation
- [x] `useDeleteAppointment()` - Mutation

#### Form Validation (`src/validators/appointment.validator.ts`)
- [x] `appointmentSchema` - Zod schema matching backend

## API Endpoints Involved
- GET `/api/v1/appointments`
- POST `/api/v1/appointments`
- GET `/api/v1/appointments/:id`
- PUT `/api/v1/appointments/:id`
- PATCH `/api/v1/appointments/:id/status`
- DELETE `/api/v1/appointments/:id`

## Components Involved
- DashboardPage
- NewAppointmentPage
- AppointmentForm
- AppointmentCard
- AppointmentList
- StatusBadge
- AppointmentTypeBadge
- DateTimePicker
- QuickStats

## Data Models Involved
- Appointment
- Patient (relation)

## Testing Requirements

### Unit Tests

#### AppointmentForm (`tests/unit/components/AppointmentForm.test.tsx`)
- [x] Renders all fields
- [x] Date picker defaults to current date
- [x] Validates required fields
- [x] Shows appointment type options
- [x] Calls onSubmit with valid data

#### DashboardPage (`tests/unit/pages/DashboardPage.test.tsx`)
- [x] Displays welcome message
- [x] Shows today's appointments
- [x] Shows quick action buttons
- [x] Shows loading state
- [x] Shows empty state for no appointments

#### AppointmentCard (`tests/unit/components/AppointmentCard.test.tsx`)
- [x] Displays patient name
- [x] Displays formatted date/time
- [x] Shows correct status badge
- [x] Click triggers navigation

#### StatusBadge (`tests/unit/components/StatusBadge.test.tsx`)
- [x] Renders correct color for each status
- [x] Displays correct label text

#### AppointmentTypeBadge (`tests/unit/components/AppointmentTypeBadge.test.tsx`)
- [x] Renders correct styling for each type
- [x] Displays correct label text

#### AppointmentsListPage (`tests/unit/pages/AppointmentsListPage.test.tsx`)
- [x] Renders page title
- [x] Shows appointments list
- [x] Shows loading state
- [x] Shows empty state
- [x] Has status and date filters
- [x] Has pagination

#### AppointmentDetailPage (`tests/unit/pages/AppointmentDetailPage.test.tsx`)
- [x] Renders appointment details
- [x] Shows status badge
- [x] Allows status change
- [x] Allows delete with confirmation
- [x] Navigation to patient profile

#### useAppointments Hook (`tests/unit/hooks/useAppointments.test.ts`)
- [ ] Fetches appointments (deferred - hooks tested via component tests)
- [ ] Applies filters correctly
- [ ] Returns loading state

### E2E Tests (`tests/e2e/appointments.spec.ts`)
- [ ] Create appointment from patient profile (E2E deferred)
- [ ] View today's appointments on dashboard
- [ ] Navigate to appointment detail
- [ ] Update appointment status
- [ ] Cancel appointment

## Dependencies
- TICKET-003: Auth Frontend
- TICKET-005: Patients Frontend
- TICKET-006: Appointments Backend

## Estimation
5 Story Points

## Implementation Notes
- Use date-fns for date formatting
- Default appointment time to current time rounded to nearest 15 min
- Consider different views: list vs calendar (list for MVP)
- Status badge colors should be consistent throughout app
- Navigate to appointment/:id which will show medical record
- Quick action buttons improve UX significantly
- Consider showing appointment count in navigation

## Files to Create/Modify

### Frontend
- `src/pages/DashboardPage.tsx`
- `src/pages/appointments/NewAppointmentPage.tsx`
- `src/components/appointments/AppointmentForm.tsx`
- `src/components/appointments/AppointmentCard.tsx`
- `src/components/appointments/AppointmentList.tsx`
- `src/components/appointments/StatusBadge.tsx`
- `src/components/appointments/AppointmentTypeBadge.tsx`
- `src/components/common/DateTimePicker.tsx`
- `src/services/appointments.api.ts`
- `src/hooks/useAppointments.ts`
- `src/validators/appointment.validator.ts`
- `src/types/appointment.types.ts`
- `src/App.tsx` (add routes)
- `tests/unit/components/AppointmentForm.test.tsx`
- `tests/unit/pages/DashboardPage.test.tsx`
- `tests/unit/components/AppointmentCard.test.tsx`
- `tests/unit/hooks/useAppointments.test.ts`
- `tests/e2e/appointments.spec.ts`

## Definition of Done
- [x] Create appointment works end-to-end
- [x] Dashboard displays today's appointments
- [x] Appointment cards display correctly
- [x] Status updates work
- [x] Navigation flows are smooth
- [x] Unit tests passing (112 tests pass)
- [ ] E2E tests passing (E2E deferred for later phase)
- [x] Loading states provide good UX
- [x] Code reviewed and approved

## Implementation Notes (Post-Implementation)

### Completed Implementation
- All appointment UI components implemented and tested
- Status workflow: scheduled → checked_in → in_progress → completed
- Status transitions validated on frontend
- Color-coded status badges throughout application
- Date/time filtering on appointments list
- Integration with patient profile for creating appointments

### Test Coverage
- 112 frontend unit tests pass
- Component tests cover all UI states (loading, error, empty, data)
- Navigation tests verify routing behavior
- Form validation tests ensure data integrity

### Files Created
- `src/pages/appointments/NewAppointmentPage.tsx`
- `src/pages/appointments/AppointmentsListPage.tsx`
- `src/pages/appointments/AppointmentDetailPage.tsx`
- `src/components/appointments/AppointmentForm.tsx`
- `src/components/appointments/AppointmentCard.tsx`
- `src/components/appointments/StatusBadge.tsx`
- `src/components/appointments/AppointmentTypeBadge.tsx`
- `src/services/appointments.api.ts`
- `src/hooks/useAppointments.ts`
- `src/validators/appointment.validator.ts`
- `src/types/appointment.types.ts`
- `tests/unit/components/appointments/*.test.tsx`
- `tests/unit/pages/appointments/*.test.tsx`

### Completion Date
February 2026
