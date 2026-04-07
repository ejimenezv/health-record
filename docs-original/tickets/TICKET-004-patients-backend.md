# Ticket 004: Patients Backend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-001: Patient Registration
US-002: Patient Listing & Search

## Description
Implement the backend API for patient management including CRUD operations, search functionality, and patient history retrieval. Patients are scoped to the authenticated provider.

## Acceptance Criteria
- [ ] Create patient with all required fields
- [ ] List all patients for authenticated provider
- [ ] Search patients by name, phone, or email
- [ ] Get single patient by ID with full details
- [ ] Update patient information
- [ ] Delete patient (cascade deletes appointments)
- [ ] Add/remove patient allergies
- [ ] Add/remove patient chronic conditions
- [ ] Get patient appointment history
- [ ] Pagination support for patient list

## Technical Requirements

### Backend Tasks

#### Patient Service (`src/services/patient.service.ts`)
- [ ] `create(providerId, data)` - Create new patient
- [ ] `findAll(providerId, options)` - List with search/pagination
- [ ] `findById(id, providerId)` - Get patient with relations
- [ ] `update(id, providerId, data)` - Update patient
- [ ] `delete(id, providerId)` - Delete patient
- [ ] `addAllergy(patientId, data)` - Add allergy
- [ ] `removeAllergy(patientId, allergyId)` - Remove allergy
- [ ] `addCondition(patientId, data)` - Add chronic condition
- [ ] `removeCondition(patientId, conditionId)` - Remove condition
- [ ] `getAppointments(patientId, providerId)` - Get appointment history

#### Patient Controller (`src/controllers/patient.controller.ts`)
- [ ] `create` - Handle POST /patients
- [ ] `findAll` - Handle GET /patients
- [ ] `findById` - Handle GET /patients/:id
- [ ] `update` - Handle PUT /patients/:id
- [ ] `delete` - Handle DELETE /patients/:id
- [ ] `addAllergy` - Handle POST /patients/:id/allergies
- [ ] `removeAllergy` - Handle DELETE /patients/:id/allergies/:allergyId
- [ ] `addCondition` - Handle POST /patients/:id/conditions
- [ ] `removeCondition` - Handle DELETE /patients/:id/conditions/:conditionId
- [ ] `getAppointments` - Handle GET /patients/:id/appointments

#### Patient Routes (`src/routes/patient.routes.ts`)
- [ ] All routes protected with auth middleware
- [ ] Mount at `/api/v1/patients`

#### Patient Validator (`src/validators/patient.validator.ts`)
- [ ] `createPatientSchema`:
  - firstName: required, string
  - lastName: required, string
  - dateOfBirth: required, ISO date
  - sex: required, enum (male, female, other)
  - phone: required, string
  - email: optional, valid email
  - address: optional
  - city: optional
  - state: optional
  - zipCode: optional
  - emergencyContactName: optional
  - emergencyContactPhone: optional
  - insuranceProvider: optional
  - insurancePolicyNumber: optional
  - notes: optional
- [ ] `updatePatientSchema`: Same as create, all optional
- [ ] `allergySchema`:
  - allergen: required
  - severity: required, enum
  - reaction: optional
- [ ] `conditionSchema`:
  - condition: required
  - diagnosedDate: optional, ISO date
  - notes: optional
- [ ] `searchQuerySchema`:
  - search: optional, string
  - page: optional, number (default 1)
  - limit: optional, number (default 20, max 100)

#### Patient Repository (`src/repositories/patient.repository.ts`)
- [ ] `create(providerId, data)` - Insert patient
- [ ] `findAll(providerId, options)` - Query with filters
- [ ] `findById(id)` - Get with includes
- [ ] `findByIdAndProvider(id, providerId)` - Scoped find
- [ ] `update(id, data)` - Update patient
- [ ] `delete(id)` - Delete patient
- [ ] `count(providerId, search)` - Count for pagination

## API Endpoints Involved

### GET /api/v1/patients
**Query Parameters:**
- `search` - Search term (name, phone, email)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1985-03-15",
        "phone": "555-123-4567",
        "email": "john@example.com"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### POST /api/v1/patients
**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1985-03-15",
  "sex": "male",
  "phone": "555-123-4567",
  "email": "john@example.com",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zipCode": "12345"
}
```
**Response (201):** Full patient object

### GET /api/v1/patients/:id
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15",
    "sex": "male",
    "phone": "555-123-4567",
    "allergies": [
      { "id": "uuid", "allergen": "Penicillin", "severity": "severe" }
    ],
    "chronicConditions": [
      { "id": "uuid", "condition": "Hypertension" }
    ]
  }
}
```

### PUT /api/v1/patients/:id
**Request:** Partial patient data
**Response (200):** Updated patient object

### DELETE /api/v1/patients/:id
**Response (204):** No content

### GET /api/v1/patients/:id/appointments
**Response (200):** List of appointments with basic medical record info

### POST /api/v1/patients/:id/allergies
**Request:**
```json
{
  "allergen": "Penicillin",
  "severity": "severe",
  "reaction": "Hives and difficulty breathing"
}
```
**Response (201):** Created allergy object

### DELETE /api/v1/patients/:id/allergies/:allergyId
**Response (204):** No content

## Components Involved
None - backend only.

## Data Models Involved
- Patient
- Allergy
- ChronicCondition
- Appointment (for history)

## Testing Requirements

### Unit Tests (`tests/unit/services/patient.service.test.ts`)
- [ ] `create` creates patient for provider
- [ ] `create` validates required fields
- [ ] `findAll` returns only provider's patients
- [ ] `findAll` filters by search term
- [ ] `findAll` paginates correctly
- [ ] `findById` returns patient with relations
- [ ] `findById` returns null for other provider's patient
- [ ] `update` updates patient fields
- [ ] `delete` removes patient and cascades
- [ ] `addAllergy` creates allergy
- [ ] `removeAllergy` deletes allergy

### Integration Tests (`tests/integration/routes/patient.routes.test.ts`)
- [ ] GET /patients returns paginated list
- [ ] GET /patients?search filters results
- [ ] POST /patients creates patient
- [ ] POST /patients validates input
- [ ] GET /patients/:id returns patient
- [ ] GET /patients/:id returns 404 for not found
- [ ] GET /patients/:id returns 404 for other provider
- [ ] PUT /patients/:id updates patient
- [ ] DELETE /patients/:id removes patient
- [ ] GET /patients/:id/appointments returns history
- [ ] POST /patients/:id/allergies adds allergy
- [ ] DELETE /patients/:id/allergies/:id removes allergy

## Dependencies
- TICKET-001: Database Schema
- TICKET-002: Auth Backend (middleware)

## Estimation
5 Story Points

## Implementation Notes
- Always scope queries by providerId for security
- Use Prisma includes for eager loading relations
- Implement soft delete if data retention is required (out of MVP)
- Search should be case-insensitive
- Search across firstName, lastName, phone, email
- Consider full-text search for production (out of MVP)
- Return 404 if patient not found OR belongs to different provider
- Validate date of birth is in the past

## Files to Create/Modify

### Backend
- `src/routes/patient.routes.ts`
- `src/controllers/patient.controller.ts`
- `src/services/patient.service.ts`
- `src/validators/patient.validator.ts`
- `src/repositories/patient.repository.ts`
- `src/routes/index.ts` (add patient routes)
- `tests/unit/services/patient.service.test.ts`
- `tests/integration/routes/patient.routes.test.ts`

## Definition of Done
- [ ] All patient endpoints functional
- [ ] Provider scoping enforced on all operations
- [ ] Search works across multiple fields
- [ ] Pagination working correctly
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Error handling consistent
- [ ] Code reviewed and approved
