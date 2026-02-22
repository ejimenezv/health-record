# Medical Record Endpoints

This document defines the medical record endpoints for the MedRecord AI API, including symptoms, diagnosis, and prescriptions management.

---

## Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/appointments/:appointmentId/record` | Get medical record | Yes |
| PUT | `/api/v1/appointments/:appointmentId/record` | Create/update medical record | Yes |
| PATCH | `/api/v1/appointments/:appointmentId/record` | Partial update medical record | Yes |
| POST | `/api/v1/appointments/:appointmentId/record/complete` | Mark record as complete | Yes |
| POST | `/api/v1/appointments/:appointmentId/record/symptoms` | Add symptom | Yes |
| PATCH | `/api/v1/appointments/:appointmentId/record/symptoms/:id` | Update symptom | Yes |
| DELETE | `/api/v1/appointments/:appointmentId/record/symptoms/:id` | Delete symptom | Yes |
| POST | `/api/v1/appointments/:appointmentId/record/prescriptions` | Add prescription | Yes |
| PATCH | `/api/v1/appointments/:appointmentId/record/prescriptions/:id` | Update prescription | Yes |
| DELETE | `/api/v1/appointments/:appointmentId/record/prescriptions/:id` | Delete prescription | Yes |

---

## GET /api/v1/appointments/:appointmentId/record

Get the medical record for an appointment.

### Request

```yaml
/api/v1/appointments/{appointmentId}/record:
  get:
    summary: Get medical record by appointment
    tags:
      - Medical Records
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
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
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "appointmentId": "770e8400-e29b-41d4-a716-446655440002",
    "chiefComplaint": "Persistent headache for 3 days",
    "historyOfPresentIllness": "Patient reports dull, throbbing headache starting Sunday morning. Pain rated 6/10. No visual disturbances. Tylenol provided minimal relief.",
    "physicalExamNotes": "Alert and oriented. No focal neurological deficits. Mild tenderness in temporal region bilaterally.",
    "diagnosis": "Tension headache",
    "diagnosisNotes": "Likely stress-related. No red flags for secondary causes.",
    "treatmentPlan": "Rest, hydration, OTC ibuprofen as needed. Consider stress reduction techniques.",
    "followUpInstructions": "Return if symptoms worsen or persist beyond 1 week.",
    "patientEducation": "Discussed headache triggers, importance of sleep hygiene and hydration.",
    "audioFileUrl": "/uploads/audio/880e8400.webm",
    "transcript": "Doctor: What brings you in today?\nPatient: I've had this headache for three days now...",
    "isAIGenerated": true,
    "isDraft": false,
    "symptoms": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "symptomName": "Headache",
        "bodySite": "Bilateral temporal region",
        "severity": 6,
        "duration": "3 days",
        "notes": "Dull, throbbing quality. Worse in the morning.",
        "isAIExtracted": true,
        "createdAt": "2024-01-20T14:40:00.000Z"
      },
      {
        "id": "990e8400-e29b-41d4-a716-446655440005",
        "symptomName": "Light sensitivity",
        "bodySite": "Eyes",
        "severity": 3,
        "duration": "2 days",
        "notes": null,
        "isAIExtracted": true,
        "createdAt": "2024-01-20T14:40:00.000Z"
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
        "refills": 0,
        "instructions": "Take with food. Do not exceed 1200mg per day. Stop if stomach upset occurs.",
        "indication": "Headache pain relief",
        "isAIExtracted": true,
        "createdAt": "2024-01-20T14:50:00.000Z"
      }
    ],
    "createdAt": "2024-01-20T14:35:00.000Z",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  },
  "message": "Success"
}
```

### Response (404 - No Record Yet)

```json
{
  "success": true,
  "data": null,
  "message": "No medical record exists for this appointment"
}
```

---

## PUT /api/v1/appointments/:appointmentId/record

Create or fully update a medical record.

### Request

```yaml
/api/v1/appointments/{appointmentId}/record:
  put:
    summary: Create or update medical record
    tags:
      - Medical Records
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
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
            $ref: '#/components/schemas/MedicalRecordRequest'
```

### Request Body

```json
{
  "chiefComplaint": "Persistent headache for 3 days",
  "historyOfPresentIllness": "Patient reports dull, throbbing headache starting Sunday morning. Pain rated 6/10. No visual disturbances. Tylenol provided minimal relief.",
  "physicalExamNotes": "Alert and oriented. No focal neurological deficits. Mild tenderness in temporal region bilaterally.",
  "diagnosis": "Tension headache",
  "diagnosisNotes": "Likely stress-related. No red flags for secondary causes.",
  "treatmentPlan": "Rest, hydration, OTC ibuprofen as needed.",
  "followUpInstructions": "Return if symptoms worsen or persist beyond 1 week.",
  "patientEducation": "Discussed headache triggers, importance of sleep hygiene.",
  "isAIGenerated": false,
  "isDraft": true
}
```

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `chiefComplaint` | string | No | Max 500 characters |
| `historyOfPresentIllness` | string | No | Max 5000 characters |
| `physicalExamNotes` | string | No | Max 5000 characters |
| `diagnosis` | string | No | Max 500 characters |
| `diagnosisNotes` | string | No | Max 2000 characters |
| `treatmentPlan` | string | No | Max 5000 characters |
| `followUpInstructions` | string | No | Max 2000 characters |
| `patientEducation` | string | No | Max 2000 characters |
| `isAIGenerated` | boolean | No | Default: false |
| `isDraft` | boolean | No | Default: true |

### Response (200 OK / 201 Created)

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "appointmentId": "770e8400-e29b-41d4-a716-446655440002",
    "chiefComplaint": "Persistent headache for 3 days",
    "historyOfPresentIllness": "Patient reports dull, throbbing headache...",
    "physicalExamNotes": "Alert and oriented...",
    "diagnosis": "Tension headache",
    "diagnosisNotes": "Likely stress-related...",
    "treatmentPlan": "Rest, hydration, OTC ibuprofen as needed.",
    "followUpInstructions": "Return if symptoms worsen...",
    "patientEducation": "Discussed headache triggers...",
    "isAIGenerated": false,
    "isDraft": true,
    "symptoms": [],
    "prescriptions": [],
    "createdAt": "2024-01-20T14:35:00.000Z",
    "updatedAt": "2024-01-20T14:35:00.000Z"
  },
  "message": "Medical record saved"
}
```

---

## PATCH /api/v1/appointments/:appointmentId/record

Partial update of a medical record.

### Request Body

```json
{
  "diagnosis": "Tension-type headache",
  "diagnosisNotes": "Confirmed after ruling out migraine characteristics"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "diagnosis": "Tension-type headache",
    "diagnosisNotes": "Confirmed after ruling out migraine characteristics",
    "updatedAt": "2024-01-20T15:10:00.000Z"
  },
  "message": "Medical record updated"
}
```

---

## POST /api/v1/appointments/:appointmentId/record/complete

Mark a medical record as complete (non-draft).

### Request

```yaml
/api/v1/appointments/{appointmentId}/record/complete:
  post:
    summary: Complete the medical record
    tags:
      - Medical Records
    security:
      - bearerAuth: []
```

### Validation Requirements

Before completing, the record must have:
- `diagnosis` field populated

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "isDraft": false,
    "updatedAt": "2024-01-20T15:15:00.000Z"
  },
  "message": "Medical record completed"
}
```

### Error Response (422)

```json
{
  "success": false,
  "data": null,
  "message": "Cannot complete record without diagnosis",
  "errors": [
    {
      "field": "diagnosis",
      "message": "Diagnosis is required to complete the record"
    }
  ]
}
```

---

## Symptoms Endpoints

### POST /api/v1/appointments/:appointmentId/record/symptoms

Add a symptom to the medical record.

### Request Body

```json
{
  "symptomName": "Headache",
  "bodySite": "Bilateral temporal region",
  "severity": 6,
  "duration": "3 days",
  "notes": "Dull, throbbing quality. Worse in the morning.",
  "isAIExtracted": false
}
```

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `symptomName` | string | Yes | 2-200 characters |
| `bodySite` | string | No | Max 100 characters |
| `severity` | integer | No | 1-10 range |
| `duration` | string | No | Max 100 characters |
| `notes` | string | No | Max 1000 characters |
| `isAIExtracted` | boolean | No | Default: false |

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "medicalRecordId": "880e8400-e29b-41d4-a716-446655440003",
    "symptomName": "Headache",
    "bodySite": "Bilateral temporal region",
    "severity": 6,
    "duration": "3 days",
    "notes": "Dull, throbbing quality. Worse in the morning.",
    "isAIExtracted": false,
    "createdAt": "2024-01-20T14:40:00.000Z"
  },
  "message": "Symptom added"
}
```

---

### PATCH /api/v1/appointments/:appointmentId/record/symptoms/:id

Update a symptom.

### Request Body

```json
{
  "severity": 7,
  "notes": "Updated: Getting worse in the afternoon"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "symptomName": "Headache",
    "severity": 7,
    "notes": "Updated: Getting worse in the afternoon"
  },
  "message": "Symptom updated"
}
```

---

### DELETE /api/v1/appointments/:appointmentId/record/symptoms/:id

Delete a symptom.

### Response (204 No Content)

No response body.

---

## Prescriptions Endpoints

### POST /api/v1/appointments/:appointmentId/record/prescriptions

Add a prescription to the medical record.

### Request Body

```json
{
  "medicationName": "Ibuprofen",
  "strength": "400mg",
  "dosage": "1 tablet",
  "frequency": "Every 6-8 hours as needed",
  "duration": "5 days",
  "quantity": 20,
  "refills": 0,
  "instructions": "Take with food. Do not exceed 1200mg per day. Stop if stomach upset occurs.",
  "indication": "Headache pain relief",
  "isAIExtracted": false
}
```

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `medicationName` | string | Yes | 2-200 characters |
| `strength` | string | Yes | 1-50 characters |
| `dosage` | string | Yes | 1-100 characters |
| `frequency` | string | Yes | 1-100 characters |
| `duration` | string | No | Max 50 characters |
| `quantity` | integer | No | Positive integer |
| `refills` | integer | No | 0-12 range |
| `instructions` | string | Yes | 1-1000 characters |
| `indication` | string | No | Max 200 characters |
| `isAIExtracted` | boolean | No | Default: false |

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "medicalRecordId": "880e8400-e29b-41d4-a716-446655440003",
    "medicationName": "Ibuprofen",
    "strength": "400mg",
    "dosage": "1 tablet",
    "frequency": "Every 6-8 hours as needed",
    "duration": "5 days",
    "quantity": 20,
    "refills": 0,
    "instructions": "Take with food. Do not exceed 1200mg per day.",
    "indication": "Headache pain relief",
    "isAIExtracted": false,
    "createdAt": "2024-01-20T14:50:00.000Z"
  },
  "message": "Prescription added"
}
```

---

### PATCH /api/v1/appointments/:appointmentId/record/prescriptions/:id

Update a prescription.

### Request Body

```json
{
  "quantity": 30,
  "refills": 1,
  "instructions": "Updated: Take with food or milk."
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "medicationName": "Ibuprofen",
    "quantity": 30,
    "refills": 1,
    "instructions": "Updated: Take with food or milk."
  },
  "message": "Prescription updated"
}
```

---

### DELETE /api/v1/appointments/:appointmentId/record/prescriptions/:id

Delete a prescription.

### Response (204 No Content)

No response body.

---

## Batch Operations

### POST /api/v1/appointments/:appointmentId/record/symptoms/batch

Add multiple symptoms at once (typically from AI extraction).

### Request Body

```json
{
  "symptoms": [
    {
      "symptomName": "Headache",
      "bodySite": "Bilateral temporal region",
      "severity": 6,
      "duration": "3 days",
      "isAIExtracted": true
    },
    {
      "symptomName": "Light sensitivity",
      "bodySite": "Eyes",
      "severity": 3,
      "duration": "2 days",
      "isAIExtracted": true
    }
  ]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "added": 2,
    "symptoms": [...]
  },
  "message": "Symptoms added"
}
```

---

### POST /api/v1/appointments/:appointmentId/record/prescriptions/batch

Add multiple prescriptions at once.

### Request Body

```json
{
  "prescriptions": [
    {
      "medicationName": "Ibuprofen",
      "strength": "400mg",
      "dosage": "1 tablet",
      "frequency": "Every 6-8 hours as needed",
      "instructions": "Take with food",
      "isAIExtracted": true
    }
  ]
}
```

---

## AI Integration

### Clearing AI Suggestions

To clear all AI-extracted data from a record:

```http
DELETE /api/v1/appointments/:appointmentId/record/ai-suggestions
```

This removes all symptoms and prescriptions where `isAIExtracted: true` and clears AI-filled text fields.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "symptomsRemoved": 2,
    "prescriptionsRemoved": 1,
    "fieldsCleared": ["chiefComplaint", "diagnosis"]
  },
  "message": "AI suggestions cleared"
}
```

---

## References

- [API Overview](../overview.md)
- [Medical Record Entity](../../data-model/entities/medical-record.md)
- [Symptom Entity](../../data-model/entities/symptom.md)
- [Prescription Entity](../../data-model/entities/prescription.md)
- [Transcription Endpoints](./transcription.md)
- [Schemas](../schemas.md)
