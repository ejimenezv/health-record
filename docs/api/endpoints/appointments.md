# Appointment Endpoints

This document defines the appointment management endpoints for the MedRecord AI API.

---

## Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/appointments` | List all appointments | Yes |
| GET | `/api/v1/appointments/today` | Get today's appointments | Yes |
| POST | `/api/v1/appointments` | Create new appointment | Yes |
| GET | `/api/v1/appointments/:id` | Get appointment details | Yes |
| PUT | `/api/v1/appointments/:id` | Update appointment | Yes |
| PATCH | `/api/v1/appointments/:id/status` | Update appointment status | Yes |
| DELETE | `/api/v1/appointments/:id` | Delete appointment | Yes |

---

## GET /api/v1/appointments/today

Get all appointments scheduled for today for the current provider. Useful for dashboard display.

### Request

```yaml
/api/v1/appointments/today:
  get:
    summary: Get today's appointments
    tags:
      - Appointments
    security:
      - bearerAuth: []
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "patient": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "firstName": "Jane",
        "lastName": "Doe",
        "dateOfBirth": "1985-03-15",
        "phone": "+1-555-0100"
      },
      "appointmentDate": "2024-01-20T14:30:00.000Z",
      "appointmentType": "sick_visit",
      "reasonForVisit": "Persistent headache",
      "status": "scheduled",
      "durationMinutes": 30,
      "medicalRecord": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

> **Note**: Results are ordered by `appointmentDate` ascending.

---

## GET /api/v1/appointments

List all appointments for the current provider with filtering options.

### Request

```yaml
/api/v1/appointments:
  get:
    summary: List all appointments
    tags:
      - Appointments
    security:
      - bearerAuth: []
    parameters:
      - name: patientId
        in: query
        description: Filter by patient ID
        schema:
          type: string
          format: uuid
      - name: status
        in: query
        description: Filter by status
        schema:
          type: string
          enum: [scheduled, checked_in, in_progress, completed, cancelled, no_show]
      - name: appointmentType
        in: query
        description: Filter by appointment type
        schema:
          type: string
          enum: [new_patient, follow_up, routine_checkup, sick_visit, telehealth]
      - name: startDate
        in: query
        description: Filter from date (ISO 8601)
        schema:
          type: string
          format: date-time
      - name: endDate
        in: query
        description: Filter to date (ISO 8601)
        schema:
          type: string
          format: date-time
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          default: 20
```

### Example Requests

```
GET /api/v1/appointments
GET /api/v1/appointments?status=in_progress
GET /api/v1/appointments?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
GET /api/v1/appointments?patientId=660e8400-e29b-41d4-a716-446655440001
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "patient": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "firstName": "Jane",
        "lastName": "Doe",
        "dateOfBirth": "1985-03-15",
        "phone": "+1-555-0100"
      },
      "appointmentDate": "2024-01-20T14:30:00.000Z",
      "appointmentType": "sick_visit",
      "reasonForVisit": "Persistent headache for 3 days",
      "status": "completed",
      "durationMinutes": 30,
      "hasMedicalRecord": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "patient": {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "firstName": "John",
        "lastName": "Smith",
        "dateOfBirth": "1990-07-22",
        "phone": "+1-555-0200"
      },
      "appointmentDate": "2024-01-21T09:00:00.000Z",
      "appointmentType": "follow_up",
      "reasonForVisit": "Follow-up on blood pressure",
      "status": "scheduled",
      "durationMinutes": 15,
      "hasMedicalRecord": false,
      "createdAt": "2024-01-18T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Success"
}
```

---

## POST /api/v1/appointments

Create a new appointment for a patient.

### Request

```yaml
/api/v1/appointments:
  post:
    summary: Create a new appointment
    tags:
      - Appointments
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateAppointmentRequest'
```

### Request Body

```json
{
  "patientId": "660e8400-e29b-41d4-a716-446655440001",
  "appointmentDate": "2024-01-25T10:00:00.000Z",
  "appointmentType": "sick_visit",
  "reasonForVisit": "Persistent headache for 3 days",
  "durationMinutes": 30
}
```

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `patientId` | uuid | Yes | Valid patient ID |
| `appointmentDate` | datetime | Yes | Valid ISO 8601 datetime |
| `appointmentType` | enum | Yes | `new_patient`, `follow_up`, `routine_checkup`, `sick_visit`, `telehealth` |
| `reasonForVisit` | string | No | Max 500 characters |
| `durationMinutes` | integer | No | 5-480 (default: 30) |

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440004",
    "patientId": "660e8400-e29b-41d4-a716-446655440001",
    "providerId": "550e8400-e29b-41d4-a716-446655440000",
    "patient": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1985-03-15"
    },
    "appointmentDate": "2024-01-25T10:00:00.000Z",
    "appointmentType": "sick_visit",
    "reasonForVisit": "Persistent headache for 3 days",
    "durationMinutes": 30,
    "status": "scheduled",
    "createdAt": "2024-01-20T08:00:00.000Z",
    "updatedAt": "2024-01-20T08:00:00.000Z"
  },
  "message": "Appointment created successfully"
}
```

### Error Responses

**404 Not Found**

```json
{
  "success": false,
  "data": null,
  "message": "Patient not found",
  "errors": []
}
```

**422 Validation Error**

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "appointmentType",
      "message": "Invalid appointment type"
    }
  ]
}
```

---

## GET /api/v1/appointments/:id

Get detailed information about a specific appointment including medical record.

### Request

```yaml
/api/v1/appointments/{id}:
  get:
    summary: Get appointment details with medical record
    tags:
      - Appointments
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: includeRecord
        in: query
        description: Include full medical record
        schema:
          type: boolean
          default: true
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "patientId": "660e8400-e29b-41d4-a716-446655440001",
    "providerId": "550e8400-e29b-41d4-a716-446655440000",
    "patient": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1985-03-15",
      "sex": "female",
      "phone": "+1-555-0100",
      "allergies": [
        {
          "id": "aa0e8400-e29b-41d4-a716-446655440010",
          "allergen": "Penicillin",
          "severity": "moderate"
        }
      ],
      "chronicConditions": [
        {
          "id": "cc0e8400-e29b-41d4-a716-446655440020",
          "conditionName": "Type 2 Diabetes",
          "status": "active"
        }
      ]
    },
    "appointmentDate": "2024-01-20T14:30:00.000Z",
    "appointmentType": "sick_visit",
    "reasonForVisit": "Persistent headache for 3 days",
    "durationMinutes": 30,
    "status": "completed",
    "medicalRecord": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "chiefComplaint": "Persistent headache for 3 days",
      "historyOfPresentIllness": "Patient reports dull, throbbing headache starting Sunday morning...",
      "physicalExamNotes": "Alert and oriented. No focal neurological deficits...",
      "diagnosis": "Tension headache",
      "diagnosisNotes": "Likely stress-related. No red flags.",
      "treatmentPlan": "Rest, hydration, OTC ibuprofen as needed.",
      "followUpInstructions": "Return if symptoms worsen or persist beyond 1 week.",
      "patientEducation": "Discussed headache triggers, importance of sleep hygiene.",
      "transcript": "Doctor: What brings you in today?...",
      "isAIGenerated": true,
      "isDraft": false,
      "symptoms": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440004",
          "symptomName": "Headache",
          "bodySite": "Bilateral temporal region",
          "severity": 6,
          "duration": "3 days",
          "notes": "Dull, throbbing quality",
          "isAIExtracted": true
        }
      ],
      "prescriptions": [
        {
          "id": "bb0e8400-e29b-41d4-a716-446655440006",
          "medicationName": "Ibuprofen",
          "strength": "400mg",
          "dosage": "1 tablet",
          "frequency": "Every 6-8 hours as needed",
          "duration": "5 days",
          "quantity": 20,
          "instructions": "Take with food. Do not exceed 1200mg per day.",
          "isAIExtracted": true
        }
      ],
      "createdAt": "2024-01-20T14:35:00.000Z",
      "updatedAt": "2024-01-20T15:00:00.000Z"
    },
    "vitalSigns": {
      "id": "ee0e8400-e29b-41d4-a716-446655440030",
      "bloodPressureSystolic": 120,
      "bloodPressureDiastolic": 80,
      "heartRate": 72,
      "temperature": 98.6,
      "weight": 150.5,
      "height": 65.0,
      "oxygenSaturation": 98,
      "recordedAt": "2024-01-20T14:32:00.000Z"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T15:05:00.000Z"
  },
  "message": "Success"
}
```

### Error Responses

**404 Not Found**

```json
{
  "success": false,
  "data": null,
  "message": "Appointment not found",
  "errors": []
}
```

---

## PUT /api/v1/appointments/:id

Update an appointment's details.

### Request

```yaml
/api/v1/appointments/{id}:
  put:
    summary: Update appointment
    tags:
      - Appointments
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateAppointmentRequest'
```

### Request Body

```json
{
  "appointmentDate": "2024-01-25T11:00:00.000Z",
  "appointmentType": "follow_up",
  "reasonForVisit": "Updated reason for visit",
  "durationMinutes": 45
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "patientId": "660e8400-e29b-41d4-a716-446655440001",
    "providerId": "550e8400-e29b-41d4-a716-446655440000",
    "appointmentDate": "2024-01-25T11:00:00.000Z",
    "appointmentType": "follow_up",
    "reasonForVisit": "Updated reason for visit",
    "durationMinutes": 45,
    "status": "scheduled",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T09:00:00.000Z"
  },
  "message": "Appointment updated successfully"
}
```

---

## PATCH /api/v1/appointments/:id/status

Update an appointment's status.

### Request

```yaml
/api/v1/appointments/{id}/status:
  patch:
    summary: Update appointment status
    tags:
      - Appointments
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - status
            properties:
              status:
                type: string
                enum: [scheduled, checked_in, in_progress, completed, cancelled, no_show]
```

### Request Body

```json
{
  "status": "in_progress"
}
```

### Status Transitions

| From | Allowed To |
|------|------------|
| `scheduled` | `checked_in`, `in_progress`, `cancelled`, `no_show` |
| `checked_in` | `in_progress`, `no_show` |
| `in_progress` | `completed` |
| `completed` | (none - terminal) |
| `cancelled` | (none - terminal) |
| `no_show` | (none - terminal) |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "in_progress",
    "updatedAt": "2024-01-20T14:30:00.000Z"
  },
  "message": "Appointment status updated"
}
```

### Error Responses

**422 Invalid Status Transition**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid status transition from 'completed' to 'in_progress'",
  "errors": []
}
```

---

## DELETE /api/v1/appointments/:id

Cancel an appointment.

### Request

```yaml
/api/v1/appointments/{id}:
  delete:
    summary: Cancel appointment
    tags:
      - Appointments
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "cancelled"
  },
  "message": "Appointment cancelled"
}
```

### Error Responses

**422 Cannot Cancel**

```json
{
  "success": false,
  "data": null,
  "message": "Cannot cancel a completed appointment",
  "errors": []
}
```

---

## Appointment Types

| Type | Description | Typical Duration |
|------|-------------|------------------|
| `new_patient` | First visit for a new patient | 45-60 min |
| `follow_up` | Follow-up from previous visit | 15-30 min |
| `routine_checkup` | Regular wellness examination | 30-45 min |
| `sick_visit` | Acute illness or symptoms | 15-30 min |
| `telehealth` | Remote video/phone consultation | 15-30 min |

---

## Appointment Status Flow

```
                                    ┌──────────────┐
                                    │   scheduled  │
                                    └──────┬───────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
        ┌───────────────┐          ┌──────────────┐          ┌─────────────┐
        │   cancelled   │          │  checked_in  │          │   no_show   │
        └───────────────┘          └──────┬───────┘          └─────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  in_progress │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │   completed  │
                                   └──────────────┘
```

---

## Implementation Notes

### Backend (TICKET-006 - Completed)

- Routes: `packages/backend/src/routes/appointment.routes.ts`
- Controller: `packages/backend/src/controllers/appointment.controller.ts`
- Service: `packages/backend/src/services/appointment.service.ts`
- Validator: `packages/backend/src/validators/appointment.validator.ts`
- Integration tests: `packages/backend/tests/integration/appointment.routes.test.ts`

### Frontend (TICKET-007 - Completed)

**Pages:**
- `packages/frontend/src/pages/appointments/AppointmentsListPage.tsx` - List with filters
- `packages/frontend/src/pages/appointments/NewAppointmentPage.tsx` - Create form
- `packages/frontend/src/pages/appointments/AppointmentDetailPage.tsx` - View/manage
- `packages/frontend/src/pages/dashboard/DashboardPage.tsx` - Today's appointments

**Components:**
- `packages/frontend/src/components/appointments/AppointmentCard.tsx`
- `packages/frontend/src/components/appointments/AppointmentForm.tsx`
- `packages/frontend/src/components/appointments/StatusBadge.tsx`
- `packages/frontend/src/components/appointments/AppointmentTypeBadge.tsx`

**Hooks & API:**
- `packages/frontend/src/hooks/useAppointments.ts`
- `packages/frontend/src/services/appointments.api.ts`
- `packages/frontend/src/types/appointment.types.ts`

### Business Rules

1. **New appointments** default to `scheduled` status
2. **Completed appointments** cannot be deleted
3. **Status transitions** are validated (see Status Flow diagram above)
4. Appointments are **provider-scoped** - providers can only see their own appointments

---

## References

- [API Overview](../overview.md)
- [Appointment Entity](../../data-model/entities/appointment.md)
- [Medical Record Endpoints](./medical-records.md)
- [Schemas](../schemas.md)
