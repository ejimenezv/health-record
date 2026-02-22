# Ticket 006: Appointments Backend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-004: Create New Appointment

## Description
Implement the backend API for appointment management including CRUD operations, status management, and filtering. Appointments link patients to medical consultations and track their status through the visit workflow.

## Acceptance Criteria
- [ ] Create appointment for a patient
- [ ] List appointments with filtering by patient, date, status
- [ ] Get single appointment with patient and medical record info
- [ ] Update appointment details
- [ ] Update appointment status (workflow transitions)
- [ ] Delete appointment (cascade deletes medical record)
- [ ] Validate status transitions are logical
- [ ] New appointments default to "in_progress" status
- [ ] Filter appointments by date range
- [ ] Pagination support for appointment list

## Technical Requirements

### Backend Tasks

#### Appointment Service (`src/services/appointment.service.ts`)
- [ ] `create(providerId, patientId, data)` - Create appointment
- [ ] `findAll(providerId, options)` - List with filters/pagination
- [ ] `findById(id, providerId)` - Get with relations
- [ ] `update(id, providerId, data)` - Update appointment
- [ ] `updateStatus(id, providerId, status)` - Change status
- [ ] `delete(id, providerId)` - Delete appointment
- [ ] `validateStatusTransition(current, next)` - Validate workflow

#### Appointment Controller (`src/controllers/appointment.controller.ts`)
- [ ] `create` - Handle POST /appointments
- [ ] `findAll` - Handle GET /appointments
- [ ] `findById` - Handle GET /appointments/:id
- [ ] `update` - Handle PUT /appointments/:id
- [ ] `updateStatus` - Handle PATCH /appointments/:id/status
- [ ] `delete` - Handle DELETE /appointments/:id

#### Appointment Routes (`src/routes/appointment.routes.ts`)
- [ ] All routes protected with auth middleware
- [ ] Mount at `/api/v1/appointments`

#### Appointment Validator (`src/validators/appointment.validator.ts`)
- [ ] `createAppointmentSchema`:
  - patientId: required, UUID
  - appointmentDate: required, ISO datetime
  - appointmentType: required, enum
  - reason: optional, string
  - notes: optional, string
- [ ] `updateAppointmentSchema`: Same as create, all optional
- [ ] `updateStatusSchema`:
  - status: required, enum
- [ ] `listQuerySchema`:
  - patientId: optional, UUID
  - status: optional, enum
  - startDate: optional, ISO date
  - endDate: optional, ISO date
  - page: optional, number
  - limit: optional, number

#### Appointment Repository (`src/repositories/appointment.repository.ts`)
- [ ] `create(providerId, patientId, data)` - Insert appointment
- [ ] `findAll(providerId, options)` - Query with filters
- [ ] `findById(id)` - Get with includes
- [ ] `findByIdAndProvider(id, providerId)` - Scoped find
- [ ] `update(id, data)` - Update appointment
- [ ] `delete(id)` - Delete appointment
- [ ] `count(providerId, filters)` - Count for pagination

#### Status Transition Rules
Valid transitions:
- `scheduled` → `checked_in`, `cancelled`, `no_show`
- `checked_in` → `in_progress`, `cancelled`
- `in_progress` → `completed`, `cancelled`
- `completed` → (no transitions, final state)
- `cancelled` → (no transitions, final state)
- `no_show` → `scheduled` (reschedule)

## API Endpoints Involved

### GET /api/v1/appointments
**Query Parameters:**
- `patientId` - Filter by patient
- `status` - Filter by status
- `startDate` - Filter from date
- `endDate` - Filter to date
- `page` - Page number
- `limit` - Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "patient": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "appointmentDate": "2024-01-15T10:00:00Z",
        "appointmentType": "follow_up",
        "status": "in_progress",
        "reason": "Follow-up for blood pressure"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### POST /api/v1/appointments
**Request:**
```json
{
  "patientId": "uuid",
  "appointmentDate": "2024-01-15T10:00:00Z",
  "appointmentType": "follow_up",
  "reason": "Follow-up for blood pressure",
  "notes": "Patient requested morning appointment"
}
```
**Response (201):** Full appointment object with status "in_progress"

### GET /api/v1/appointments/:id
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1985-03-15"
    },
    "appointmentDate": "2024-01-15T10:00:00Z",
    "appointmentType": "follow_up",
    "status": "in_progress",
    "reason": "Follow-up for blood pressure",
    "medicalRecord": {
      "id": "uuid",
      "chiefComplaint": "..."
    },
    "vitalSigns": {
      "bloodPressureSystolic": 120,
      "bloodPressureDiastolic": 80
    }
  }
}
```

### PUT /api/v1/appointments/:id
**Request:** Partial appointment data
**Response (200):** Updated appointment object

### PATCH /api/v1/appointments/:id/status
**Request:**
```json
{
  "status": "completed"
}
```
**Response (200):** Updated appointment with new status

### DELETE /api/v1/appointments/:id
**Response (204):** No content

## Components Involved
None - backend only.

## Data Models Involved
- Appointment
- Patient (relation)
- MedicalRecord (relation)
- VitalSigns (relation)

## Testing Requirements

### Unit Tests (`tests/unit/services/appointment.service.test.ts`)
- [ ] `create` creates appointment with in_progress status
- [ ] `create` validates patient belongs to provider
- [ ] `findAll` returns only provider's appointments
- [ ] `findAll` filters by patientId
- [ ] `findAll` filters by status
- [ ] `findAll` filters by date range
- [ ] `findById` returns appointment with relations
- [ ] `update` updates appointment fields
- [ ] `updateStatus` changes status
- [ ] `updateStatus` rejects invalid transitions
- [ ] `delete` removes appointment and cascades

### Integration Tests (`tests/integration/routes/appointment.routes.test.ts`)
- [ ] GET /appointments returns paginated list
- [ ] GET /appointments filters by patient
- [ ] GET /appointments filters by status
- [ ] GET /appointments filters by date range
- [ ] POST /appointments creates appointment
- [ ] POST /appointments validates patient exists
- [ ] GET /appointments/:id returns appointment
- [ ] PUT /appointments/:id updates appointment
- [ ] PATCH /appointments/:id/status updates status
- [ ] PATCH /appointments/:id/status rejects invalid transition
- [ ] DELETE /appointments/:id removes appointment

## Dependencies
- TICKET-001: Database Schema
- TICKET-002: Auth Backend
- TICKET-004: Patients Backend (for patient validation)

## Estimation
5 Story Points

## Implementation Notes
- Default new appointments to "in_progress" for MVP simplicity
- Include patient basic info in list response for display
- Include medical record summary if exists
- Status transitions should be validated to prevent invalid states
- Consider timezone handling for appointment dates
- Filter by date should be inclusive on both ends
- Order appointments by date descending by default
- Creating appointment could auto-create empty medical record

## Files to Create/Modify

### Backend
- `src/routes/appointment.routes.ts`
- `src/controllers/appointment.controller.ts`
- `src/services/appointment.service.ts`
- `src/validators/appointment.validator.ts`
- `src/repositories/appointment.repository.ts`
- `src/routes/index.ts` (add appointment routes)
- `tests/unit/services/appointment.service.test.ts`
- `tests/integration/routes/appointment.routes.test.ts`

## Definition of Done
- [ ] All appointment endpoints functional
- [ ] Status transitions validated
- [ ] Filtering and pagination working
- [ ] Provider scoping enforced
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Cascade delete working
- [ ] Code reviewed and approved
