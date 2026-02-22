# Ticket 007: Appointments Frontend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-004: Create New Appointment

## Description
Implement the frontend for appointment management including creating new appointments from patient profile, appointment list/calendar view, and appointment status management. This sets up the foundation for the medical record entry page.

## Acceptance Criteria
- [ ] Create appointment from patient profile
- [ ] Appointment form pre-fills current date/time
- [ ] All appointment types selectable
- [ ] Creating appointment redirects to medical record page
- [ ] Dashboard shows today's appointments
- [ ] Filter appointments by date and status
- [ ] Appointment cards show key info
- [ ] Click appointment navigates to detail/record page
- [ ] Status can be updated from appointment view
- [ ] Cancel appointment with confirmation

## Technical Requirements

### Frontend Tasks

#### New Appointment Page (`src/pages/appointments/NewAppointmentPage.tsx`)
- [ ] Form for creating appointment
- [ ] Patient info displayed (from route params)
- [ ] Date/time picker for appointment date
- [ ] Select for appointment type
- [ ] Textarea for reason
- [ ] Textarea for notes (optional)
- [ ] Submit creates and redirects to medical record
- [ ] Cancel returns to patient profile

#### Appointment Form Component (`src/components/appointments/AppointmentForm.tsx`)
- [ ] Reusable form component
- [ ] react-hook-form integration
- [ ] Zod validation
- [ ] Date picker defaults to now
- [ ] Time picker component
- [ ] Appointment type select with icons

#### Dashboard Page (`src/pages/DashboardPage.tsx`)
- [ ] Welcome message with provider name
- [ ] Today's appointments section
- [ ] Quick stats (patients, appointments today)
- [ ] Quick actions (new patient, new appointment)
- [ ] Recent activity feed (optional)

#### Appointment Card Component (`src/components/appointments/AppointmentCard.tsx`)
- [ ] Patient name and photo placeholder
- [ ] Appointment date and time
- [ ] Appointment type badge
- [ ] Status badge with color coding
- [ ] Reason snippet
- [ ] Click handler for navigation

#### Appointment Status Badge (`src/components/appointments/StatusBadge.tsx`)
- [ ] Color-coded status indicator
- [ ] scheduled: blue
- [ ] checked_in: yellow
- [ ] in_progress: orange
- [ ] completed: green
- [ ] cancelled: gray
- [ ] no_show: red

#### Appointment API Service (`src/services/appointments.api.ts`)
- [ ] `getAppointments(filters)` - List appointments
- [ ] `getAppointment(id)` - Get appointment details
- [ ] `createAppointment(patientId, data)` - Create
- [ ] `updateAppointment(id, data)` - Update
- [ ] `updateStatus(id, status)` - Change status
- [ ] `deleteAppointment(id)` - Delete

#### React Query Hooks (`src/hooks/useAppointments.ts`)
- [ ] `useAppointments(filters)` - Fetch list
- [ ] `useAppointment(id)` - Fetch single
- [ ] `useTodaysAppointments()` - Dashboard query
- [ ] `useCreateAppointment()` - Mutation
- [ ] `useUpdateAppointment()` - Mutation
- [ ] `useUpdateStatus()` - Mutation
- [ ] `useDeleteAppointment()` - Mutation

#### Form Validation (`src/validators/appointment.validator.ts`)
- [ ] `appointmentSchema` - Zod schema matching backend

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
- [ ] Renders all fields
- [ ] Date picker defaults to current date
- [ ] Validates required fields
- [ ] Shows appointment type options
- [ ] Calls onSubmit with valid data

#### DashboardPage (`tests/unit/pages/DashboardPage.test.tsx`)
- [ ] Displays welcome message
- [ ] Shows today's appointments
- [ ] Shows quick action buttons
- [ ] Shows loading state
- [ ] Shows empty state for no appointments

#### AppointmentCard (`tests/unit/components/AppointmentCard.test.tsx`)
- [ ] Displays patient name
- [ ] Displays formatted date/time
- [ ] Shows correct status badge
- [ ] Click triggers navigation

#### useAppointments Hook (`tests/unit/hooks/useAppointments.test.ts`)
- [ ] Fetches appointments
- [ ] Applies filters correctly
- [ ] Returns loading state

### E2E Tests (`tests/e2e/appointments.spec.ts`)
- [ ] Create appointment from patient profile
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
- [ ] Create appointment works end-to-end
- [ ] Dashboard displays today's appointments
- [ ] Appointment cards display correctly
- [ ] Status updates work
- [ ] Navigation flows are smooth
- [ ] Unit tests passing (>70% coverage)
- [ ] E2E tests passing
- [ ] Loading states provide good UX
- [ ] Code reviewed and approved
