# Ticket 006: Appointments Backend

## Status: COMPLETED

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-004: Create New Appointment

## Description
Implement the backend API for appointment management including CRUD operations, status management, and filtering. Appointments link patients to medical consultations and track their status through the visit workflow.

## Acceptance Criteria
- [x] Create appointment for a patient
- [x] List appointments with filtering by patient, date, status
- [x] Get single appointment with patient and medical record info
- [x] Update appointment details
- [x] Update appointment status (workflow transitions)
- [x] Delete appointment (cannot delete completed)
- [x] Validate status transitions are logical
- [x] New appointments default to "scheduled" status
- [x] Filter appointments by date range
- [x] Pagination support for appointment list

## Technical Requirements

### Backend Tasks

#### Appointment Service (`src/services/appointment.service.ts`)
- [x] `create(providerId, patientId, data)` - Create appointment
- [x] `findAll(providerId, options)` - List with filters/pagination
- [x] `findById(id, providerId)` - Get with relations
- [x] `update(id, providerId, data)` - Update appointment
- [x] `updateStatus(id, providerId, status)` - Change status
- [x] `delete(id, providerId)` - Delete appointment
- [x] Status transition validation in `updateStatus`
- [x] `getTodayAppointments(providerId)` - Get today's appointments

#### Appointment Controller (`src/controllers/appointment.controller.ts`)
- [x] `create` - Handle POST /appointments
- [x] `findAll` - Handle GET /appointments
- [x] `findById` - Handle GET /appointments/:id
- [x] `update` - Handle PUT /appointments/:id
- [x] `updateStatus` - Handle PATCH /appointments/:id/status
- [x] `delete` - Handle DELETE /appointments/:id
- [x] `getTodayAppointments` - Handle GET /appointments/today

#### Appointment Routes (`src/routes/appointment.routes.ts`)
- [x] All routes protected with auth middleware
- [x] Mount at `/api/v1/appointments`

#### Appointment Validator (`src/validators/appointment.validator.ts`)
- [x] `createAppointmentSchema`:
  - patientId: required, UUID
  - appointmentDate: required, ISO datetime
  - appointmentType: required, enum
  - reasonForVisit: optional, string
  - durationMinutes: optional, number (5-480, default 30)
- [x] `updateAppointmentSchema`: Same as create, all optional
- [x] `updateAppointmentStatusSchema`:
  - status: required, enum
- [x] `appointmentQuerySchema`:
  - patientId: optional, UUID
  - status: optional, enum
  - startDate: optional, ISO date
  - endDate: optional, ISO date
  - page: optional, number
  - limit: optional, number

#### Status Transition Rules (Implemented)
Valid transitions:
- `scheduled` → `checked_in`, `in_progress`, `cancelled`, `no_show`
- `checked_in` → `in_progress`, `no_show`
- `in_progress` → `completed`
- `completed` → (no transitions, final state)
- `cancelled` → (no transitions, final state)
- `no_show` → (no transitions, final state)

## API Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/appointments` | List with filters/pagination |
| GET | `/api/v1/appointments/today` | Get today's appointments |
| GET | `/api/v1/appointments/:id` | Get appointment details |
| POST | `/api/v1/appointments` | Create appointment |
| PUT | `/api/v1/appointments/:id` | Update appointment |
| PATCH | `/api/v1/appointments/:id/status` | Update status |
| DELETE | `/api/v1/appointments/:id` | Delete (not completed) |

## Testing Requirements

### Integration Tests (`tests/integration/appointment.routes.test.ts`)
- [x] GET /appointments returns paginated list
- [x] GET /appointments filters by patient
- [x] GET /appointments filters by status
- [x] GET /appointments/today returns today's appointments
- [x] POST /appointments creates appointment
- [x] POST /appointments validates patient exists
- [x] POST /appointments validates appointment type
- [x] GET /appointments/:id returns appointment
- [x] PUT /appointments/:id updates appointment
- [x] PATCH /appointments/:id/status updates status
- [x] PATCH /appointments/:id/status rejects invalid transition
- [x] DELETE /appointments/:id removes appointment
- [x] DELETE /appointments/:id rejects for completed

## Dependencies
- TICKET-001: Database Schema ✓
- TICKET-002: Auth Backend ✓
- TICKET-004: Patients Backend ✓

## Files Created/Modified

### Backend
- `src/routes/appointment.routes.ts` ✓
- `src/controllers/appointment.controller.ts` ✓
- `src/services/appointment.service.ts` ✓
- `src/validators/appointment.validator.ts` ✓
- `src/routes/index.ts` (added appointment routes) ✓
- `tests/integration/appointment.routes.test.ts` ✓

## Definition of Done
- [x] All appointment endpoints functional
- [x] Status transitions validated
- [x] Filtering and pagination working
- [x] Provider scoping enforced
- [x] Integration tests passing
- [x] Cannot delete completed appointments
