# Patient Endpoints

This document defines the patient management endpoints for the MedRecord AI API.

---

## Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/patients` | List all patients | Yes |
| POST | `/api/v1/patients` | Create a new patient | Yes |
| GET | `/api/v1/patients/:id` | Get patient details | Yes |
| PUT | `/api/v1/patients/:id` | Update patient | Yes |
| DELETE | `/api/v1/patients/:id` | Delete patient | Yes |
| GET | `/api/v1/patients/:id/appointments` | Get patient appointments | Yes |
| GET | `/api/v1/patients/:patientId/allergies` | Get patient allergies | Yes |
| POST | `/api/v1/patients/:patientId/allergies` | Add allergy to patient | Yes |
| GET | `/api/v1/allergies/:id` | Get allergy by ID | Yes |
| PUT | `/api/v1/allergies/:id` | Update allergy | Yes |
| DELETE | `/api/v1/allergies/:id` | Delete allergy | Yes |
| GET | `/api/v1/patients/:patientId/chronic-conditions` | Get patient chronic conditions | Yes |
| POST | `/api/v1/patients/:patientId/chronic-conditions` | Add chronic condition to patient | Yes |
| GET | `/api/v1/chronic-conditions/:id` | Get chronic condition by ID | Yes |
| PUT | `/api/v1/chronic-conditions/:id` | Update chronic condition | Yes |
| DELETE | `/api/v1/chronic-conditions/:id` | Delete chronic condition | Yes |

---

## GET /api/v1/patients

List all patients for the current provider with optional search and pagination.

### Request

```yaml
/api/v1/patients:
  get:
    summary: List all patients for current doctor
    tags:
      - Patients
    security:
      - bearerAuth: []
    parameters:
      - name: search
        in: query
        description: Search by name, phone, or email
        schema:
          type: string
        example: "john"
      - name: page
        in: query
        description: Page number (1-indexed)
        schema:
          type: integer
          default: 1
          minimum: 1
      - name: limit
        in: query
        description: Items per page
        schema:
          type: integer
          default: 20
          minimum: 1
          maximum: 100
```

### Example Requests

```
GET /api/v1/patients
GET /api/v1/patients?search=john
GET /api/v1/patients?page=2&limit=10
GET /api/v1/patients?search=555-01&page=1&limit=20
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1985-03-15",
      "sex": "female",
      "phone": "+1-555-0100",
      "email": "jane.doe@email.com",
      "age": 39,
      "lastAppointment": "2024-01-20T14:30:00.000Z",
      "appointmentCount": 5
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "firstName": "John",
      "lastName": "Smith",
      "dateOfBirth": "1990-07-22",
      "sex": "male",
      "phone": "+1-555-0200",
      "email": null,
      "age": 34,
      "lastAppointment": null,
      "appointmentCount": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Success"
}
```

---

## POST /api/v1/patients

Create a new patient record.

### Request

```yaml
/api/v1/patients:
  post:
    summary: Create a new patient
    tags:
      - Patients
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreatePatientRequest'
```

### Request Body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1985-03-15",
  "sex": "female",
  "phone": "+1-555-0100",
  "email": "jane.doe@email.com",
  "address": "123 Main Street, Springfield, IL 62701",
  "bloodType": "O+",
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+1-555-0101",
  "emergencyContactRelationship": "Spouse"
}
```

> **Note**: Allergies and chronic conditions are managed separately via their own endpoints after patient creation.

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `firstName` | string | Yes | 2-50 characters |
| `lastName` | string | Yes | 2-50 characters |
| `dateOfBirth` | date | Yes | Not future, reasonable age (0-150) |
| `sex` | enum | Yes | `male`, `female`, `other` |
| `phone` | string | Yes | Valid phone format |
| `email` | string | No | Valid email format |
| `address` | string | No | Max 200 characters |
| `bloodType` | enum | No | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `emergencyContactName` | string | Yes | 2-100 characters |
| `emergencyContactPhone` | string | Yes | Valid phone format |
| `emergencyContactRelationship` | string | No | Max 50 characters |

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15",
    "sex": "female",
    "phone": "+1-555-0100",
    "email": "jane.doe@email.com",
    "address": "123 Main Street, Springfield, IL 62701",
    "bloodType": "O+",
    "emergencyContactName": "John Doe",
    "emergencyContactPhone": "+1-555-0101",
    "emergencyContactRelationship": "Spouse",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Paciente creado exitosamente"
}
```

### Error Responses

**422 Validation Error**

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "dateOfBirth",
      "message": "Date of birth cannot be in the future"
    },
    {
      "field": "emergencyContactPhone",
      "message": "Invalid phone format"
    }
  ]
}
```

**409 Conflict (Potential Duplicate)**

```json
{
  "success": false,
  "data": {
    "potentialDuplicates": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440099",
        "firstName": "Jane",
        "lastName": "Doe",
        "dateOfBirth": "1985-03-15"
      }
    ]
  },
  "message": "A patient with similar name and date of birth already exists",
  "errors": []
}
```

---

## GET /api/v1/patients/:id

Get detailed information about a specific patient.

### Request

```yaml
/api/v1/patients/{id}:
  get:
    summary: Get patient details
    tags:
      - Patients
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Patient ID
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15",
    "sex": "female",
    "phone": "+1-555-0100",
    "email": "jane.doe@email.com",
    "address": "123 Main Street, Springfield, IL 62701",
    "bloodType": "O+",
    "emergencyContactName": "John Doe",
    "emergencyContactPhone": "+1-555-0101",
    "emergencyContactRelationship": "Spouse",
    "allergies": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440010",
        "allergen": "Penicillin",
        "reaction": "Hives",
        "severity": "moderate",
        "onsetDate": null,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "chronicConditions": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440020",
        "conditionName": "Type 2 Diabetes",
        "diagnosisDate": "2020-05-10",
        "status": "active",
        "notes": "Managed with metformin",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "appointments": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "appointmentDate": "2024-01-20T14:30:00.000Z",
        "status": "completed",
        "medicalRecord": {
          "id": "880e8400-e29b-41d4-a716-446655440003"
        }
      }
    ],
    "_count": {
      "appointments": 5
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

**404 Not Found**

```json
{
  "success": false,
  "message": "Paciente no encontrado"
}
```

---

## PUT /api/v1/patients/:id

Update a patient's information.

### Request

```yaml
/api/v1/patients/{id}:
  put:
    summary: Update patient
    tags:
      - Patients
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
            $ref: '#/components/schemas/UpdatePatientRequest'
```

### Request Body

```json
{
  "phone": "+1-555-0199",
  "email": "jane.newemail@email.com",
  "address": "456 Oak Avenue, Springfield, IL 62702",
  "emergencyContactName": "James Doe",
  "emergencyContactPhone": "+1-555-0102",
  "emergencyContactRelationship": "Brother"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15",
    "sex": "female",
    "phone": "+1-555-0199",
    "email": "jane.newemail@email.com",
    "address": "456 Oak Avenue, Springfield, IL 62702",
    "emergencyContactName": "James Doe",
    "emergencyContactPhone": "+1-555-0102",
    "emergencyContactRelationship": "Brother",
    "allergies": [...],
    "chronicConditions": [...],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T09:15:00.000Z"
  },
  "message": "Patient updated successfully"
}
```

---

## DELETE /api/v1/patients/:id

Delete a patient (soft delete - marks as inactive).

### Request

```yaml
/api/v1/patients/{id}:
  delete:
    summary: Delete patient (soft delete)
    tags:
      - Patients
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

### Response (204 No Content)

No response body.

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

---

## GET /api/v1/patients/:id/appointments

Get all appointments for a specific patient.

### Request

```yaml
/api/v1/patients/{id}/appointments:
  get:
    summary: Get patient appointment history
    tags:
      - Patients
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
      - name: status
        in: query
        description: Filter by appointment status
        schema:
          type: string
          enum: [scheduled, checked_in, in_progress, completed, cancelled, no_show]
      - name: startDate
        in: query
        description: Filter from date (ISO 8601)
        schema:
          type: string
          format: date
      - name: endDate
        in: query
        description: Filter to date (ISO 8601)
        schema:
          type: string
          format: date
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          default: 10
```

### Example Requests

```
GET /api/v1/patients/660e8400.../appointments
GET /api/v1/patients/660e8400.../appointments?status=completed
GET /api/v1/patients/660e8400.../appointments?startDate=2024-01-01&endDate=2024-01-31
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "appointmentDate": "2024-01-20T14:30:00.000Z",
      "appointmentType": "sick_visit",
      "reasonForVisit": "Persistent headache for 3 days",
      "status": "completed",
      "durationMinutes": 30,
      "medicalRecord": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "chiefComplaint": "Persistent headache",
        "diagnosis": "Tension headache",
        "symptomsCount": 2,
        "prescriptionsCount": 1
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "appointmentDate": "2023-12-10T10:00:00.000Z",
      "appointmentType": "routine_checkup",
      "reasonForVisit": "Annual physical",
      "status": "completed",
      "durationMinutes": 45,
      "medicalRecord": {
        "id": "880e8400-e29b-41d4-a716-446655440004",
        "chiefComplaint": "Annual checkup",
        "diagnosis": "Healthy, no concerns",
        "symptomsCount": 0,
        "prescriptionsCount": 0
      },
      "createdAt": "2023-12-01T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "message": "Success"
}
```

---

## Allergy Endpoints

Allergies are managed separately from the patient resource with their own CRUD operations.

### GET /api/v1/patients/:patientId/allergies

Get all allergies for a patient.

```json
// Response (200)
[
  {
    "id": "aa0e8400-e29b-41d4-a716-446655440011",
    "patientId": "660e8400-e29b-41d4-a716-446655440001",
    "allergen": "Aspirin",
    "reaction": "Stomach bleeding",
    "severity": "severe",
    "onsetDate": "2022-06-15",
    "createdAt": "2024-01-16T09:20:00.000Z"
  }
]
```

### POST /api/v1/patients/:patientId/allergies

Add an allergy to a patient.

```json
// Request
{
  "allergen": "Aspirin",
  "reaction": "Stomach bleeding",
  "severity": "severe",
  "onsetDate": "2022-06-15"
}

// Response (201)
{
  "id": "aa0e8400-e29b-41d4-a716-446655440011",
  "patientId": "660e8400-e29b-41d4-a716-446655440001",
  "allergen": "Aspirin",
  "reaction": "Stomach bleeding",
  "severity": "severe",
  "onsetDate": "2022-06-15",
  "createdAt": "2024-01-16T09:20:00.000Z"
}
```

#### Allergy Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `allergen` | string | Yes | Min 1 character |
| `reaction` | string | No | Description of reaction |
| `severity` | enum | No | `mild`, `moderate`, `severe`, `life_threatening` |
| `onsetDate` | date | No | Valid date format |

### GET /api/v1/allergies/:id

Get a specific allergy by ID.

### PUT /api/v1/allergies/:id

Update an allergy.

### DELETE /api/v1/allergies/:id

Remove an allergy.

**Response**: 204 No Content

---

## Chronic Condition Endpoints

Chronic conditions are managed separately from the patient resource with their own CRUD operations.

### GET /api/v1/patients/:patientId/chronic-conditions

Get all chronic conditions for a patient.

```json
// Response (200)
[
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440021",
    "patientId": "660e8400-e29b-41d4-a716-446655440001",
    "conditionName": "Hypertension",
    "diagnosisDate": "2023-03-20",
    "status": "active",
    "notes": "Stage 1, diet controlled",
    "createdAt": "2024-01-16T09:25:00.000Z"
  }
]
```

### POST /api/v1/patients/:patientId/chronic-conditions

Add a chronic condition to a patient.

```json
// Request
{
  "conditionName": "Hypertension",
  "diagnosisDate": "2023-03-20",
  "status": "active",
  "notes": "Stage 1, diet controlled"
}

// Response (201)
{
  "id": "cc0e8400-e29b-41d4-a716-446655440021",
  "patientId": "660e8400-e29b-41d4-a716-446655440001",
  "conditionName": "Hypertension",
  "diagnosisDate": "2023-03-20",
  "status": "active",
  "notes": "Stage 1, diet controlled",
  "createdAt": "2024-01-16T09:25:00.000Z"
}
```

#### Chronic Condition Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `conditionName` | string | Yes | Min 1 character |
| `diagnosisDate` | date | No | Valid date format |
| `status` | enum | No | `active`, `resolved`, `managed` |
| `notes` | string | No | Additional notes |

### GET /api/v1/chronic-conditions/:id

Get a specific chronic condition by ID.

### PUT /api/v1/chronic-conditions/:id

Update a chronic condition.

### DELETE /api/v1/chronic-conditions/:id

Remove a chronic condition.

**Response**: 204 No Content

---

## Access Control Notes

Patients can be accessed by a provider if:
1. The patient has at least one appointment with that provider, OR
2. The patient has no appointments yet (newly created patient)

This allows providers to view and manage patients they've just created before scheduling their first appointment

---

## References

- [API Overview](../overview.md)
- [Patient Entity](../../data-model/entities/patient.md)
- [Schemas](../schemas.md)
