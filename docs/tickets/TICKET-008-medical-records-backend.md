# Ticket 008: Medical Records Backend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-005: Manual Medical Record Entry

## Description
Implement the backend API for medical record management including SOAP format documentation, vital signs, symptoms, diagnoses, and prescriptions. This is the core clinical documentation feature of the system.

## Acceptance Criteria
- [ ] Create/update medical record for appointment
- [ ] Get medical record with all related data
- [ ] Add/update/remove symptoms
- [ ] Add/update/remove prescriptions
- [ ] Record vital signs
- [ ] Auto-save (partial updates) working
- [ ] Mark medical record as complete
- [ ] Completing record updates appointment status
- [ ] SOAP format fields supported
- [ ] Track AI-generated vs manual entries

## Technical Requirements

### Backend Tasks

#### Medical Record Service (`src/services/medical-record.service.ts`)
- [ ] `findByAppointmentId(appointmentId, providerId)` - Get record
- [ ] `create(appointmentId, providerId, data)` - Create record
- [ ] `update(appointmentId, providerId, data)` - Update record
- [ ] `patch(appointmentId, providerId, data)` - Partial update
- [ ] `complete(appointmentId, providerId)` - Mark complete
- [ ] `addSymptom(recordId, data)` - Add symptom
- [ ] `updateSymptom(recordId, symptomId, data)` - Update symptom
- [ ] `removeSymptom(recordId, symptomId)` - Remove symptom
- [ ] `addPrescription(recordId, data)` - Add prescription
- [ ] `updatePrescription(recordId, prescriptionId, data)` - Update
- [ ] `removePrescription(recordId, prescriptionId)` - Remove

#### Vital Signs Service (`src/services/vital-signs.service.ts`)
- [ ] `findByAppointmentId(appointmentId)` - Get vitals
- [ ] `create(appointmentId, data)` - Create vitals
- [ ] `update(appointmentId, data)` - Update vitals

#### Medical Record Controller (`src/controllers/medical-record.controller.ts`)
- [ ] `getRecord` - GET /appointments/:id/record
- [ ] `updateRecord` - PUT /appointments/:id/record
- [ ] `patchRecord` - PATCH /appointments/:id/record
- [ ] `completeRecord` - POST /appointments/:id/record/complete
- [ ] `addSymptom` - POST /appointments/:id/record/symptoms
- [ ] `updateSymptom` - PATCH /appointments/:id/record/symptoms/:symptomId
- [ ] `removeSymptom` - DELETE /appointments/:id/record/symptoms/:symptomId
- [ ] `addPrescription` - POST /appointments/:id/record/prescriptions
- [ ] `updatePrescription` - PATCH /appointments/:id/record/prescriptions/:prescriptionId
- [ ] `removePrescription` - DELETE /appointments/:id/record/prescriptions/:prescriptionId
- [ ] `getVitalSigns` - GET /appointments/:id/vital-signs
- [ ] `updateVitalSigns` - PUT /appointments/:id/vital-signs

#### Medical Record Routes (`src/routes/medical-record.routes.ts`)
- [ ] All routes protected with auth middleware
- [ ] Nested under `/api/v1/appointments/:appointmentId`

#### Medical Record Validator (`src/validators/medical-record.validator.ts`)
- [ ] `medicalRecordSchema`:
  - chiefComplaint: optional, string
  - subjective: optional, string (patient's description)
  - objective: optional, string (clinical findings)
  - assessment: optional, string (diagnosis reasoning)
  - plan: optional, string (treatment plan)
- [ ] `symptomSchema`:
  - name: required, string
  - severity: optional, number (1-10)
  - duration: optional, string
  - notes: optional, string
  - aiGenerated: optional, boolean
- [ ] `prescriptionSchema`:
  - medication: required, string
  - dosage: required, string
  - frequency: required, string
  - duration: required, string
  - quantity: optional, number
  - refills: optional, number
  - instructions: optional, string
  - aiGenerated: optional, boolean
- [ ] `vitalSignsSchema`:
  - bloodPressureSystolic: optional, number
  - bloodPressureDiastolic: optional, number
  - heartRate: optional, number
  - temperature: optional, number
  - respiratoryRate: optional, number
  - oxygenSaturation: optional, number
  - weight: optional, number
  - height: optional, number

#### Medical Record Repository (`src/repositories/medical-record.repository.ts`)
- [ ] `findByAppointmentId(appointmentId)` - Get with includes
- [ ] `create(appointmentId, data)` - Create record
- [ ] `update(id, data)` - Update record
- [ ] `createSymptom(recordId, data)` - Add symptom
- [ ] `updateSymptom(id, data)` - Update symptom
- [ ] `deleteSymptom(id)` - Remove symptom
- [ ] `createPrescription(recordId, data)` - Add prescription
- [ ] `updatePrescription(id, data)` - Update prescription
- [ ] `deletePrescription(id)` - Remove prescription

## API Endpoints Involved

### GET /api/v1/appointments/:id/record
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "appointmentId": "uuid",
    "chiefComplaint": "Persistent headache for 3 days",
    "subjective": "Patient reports throbbing pain...",
    "objective": "BP 130/85, alert and oriented...",
    "assessment": "Tension headache, likely stress-related",
    "plan": "Rest, hydration, OTC pain relief...",
    "aiTranscript": "...",
    "aiSummary": "...",
    "symptoms": [
      {
        "id": "uuid",
        "name": "Headache",
        "severity": 7,
        "duration": "3 days",
        "aiGenerated": true
      }
    ],
    "prescriptions": [
      {
        "id": "uuid",
        "medication": "Ibuprofen",
        "dosage": "400mg",
        "frequency": "Every 6 hours",
        "duration": "5 days",
        "aiGenerated": false
      }
    ]
  }
}
```

### PUT /api/v1/appointments/:id/record
**Request:** Full medical record data
**Response (200):** Updated record

### PATCH /api/v1/appointments/:id/record
**Request:** Partial update (for auto-save)
```json
{
  "chiefComplaint": "Updated complaint"
}
```
**Response (200):** Updated record

### POST /api/v1/appointments/:id/record/complete
**Response (200):**
```json
{
  "success": true,
  "message": "Medical record completed",
  "data": {
    "record": { ... },
    "appointment": { "status": "completed" }
  }
}
```

### POST /api/v1/appointments/:id/record/symptoms
**Request:**
```json
{
  "name": "Headache",
  "severity": 7,
  "duration": "3 days",
  "notes": "Throbbing pain in temples",
  "aiGenerated": false
}
```
**Response (201):** Created symptom

### PATCH /api/v1/appointments/:id/record/symptoms/:symptomId
**Request:** Partial symptom data
**Response (200):** Updated symptom

### DELETE /api/v1/appointments/:id/record/symptoms/:symptomId
**Response (204):** No content

### POST /api/v1/appointments/:id/record/prescriptions
**Request:**
```json
{
  "medication": "Ibuprofen",
  "dosage": "400mg",
  "frequency": "Every 6 hours as needed",
  "duration": "5 days",
  "quantity": 20,
  "refills": 0,
  "instructions": "Take with food"
}
```
**Response (201):** Created prescription

### GET/PUT /api/v1/appointments/:id/vital-signs
**Request/Response:**
```json
{
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "heartRate": 72,
  "temperature": 98.6,
  "respiratoryRate": 16,
  "oxygenSaturation": 98,
  "weight": 70,
  "height": 175
}
```

## Components Involved
None - backend only.

## Data Models Involved
- MedicalRecord
- Symptom
- Prescription
- VitalSigns
- Appointment (for status update)

## Testing Requirements

### Unit Tests (`tests/unit/services/medical-record.service.test.ts`)
- [ ] `findByAppointmentId` returns record with relations
- [ ] `create` creates new record for appointment
- [ ] `update` updates record fields
- [ ] `patch` partially updates record
- [ ] `complete` marks record complete
- [ ] `complete` updates appointment status to completed
- [ ] `addSymptom` creates symptom
- [ ] `updateSymptom` updates symptom
- [ ] `removeSymptom` deletes symptom
- [ ] `addPrescription` creates prescription
- [ ] Operations fail for wrong provider

### Integration Tests (`tests/integration/routes/medical-record.routes.test.ts`)
- [ ] GET /appointments/:id/record returns record
- [ ] GET /appointments/:id/record creates if not exists
- [ ] PUT /appointments/:id/record updates record
- [ ] PATCH /appointments/:id/record partial updates
- [ ] POST /appointments/:id/record/complete marks complete
- [ ] POST /appointments/:id/record/symptoms adds symptom
- [ ] PATCH /appointments/:id/record/symptoms/:id updates
- [ ] DELETE /appointments/:id/record/symptoms/:id removes
- [ ] Prescription CRUD operations work
- [ ] Vital signs CRUD operations work
- [ ] Provider scoping enforced

## Dependencies
- TICKET-001: Database Schema
- TICKET-002: Auth Backend
- TICKET-006: Appointments Backend

## Estimation
8 Story Points

## Implementation Notes
- Create medical record automatically when appointment is created or first accessed
- PATCH endpoint critical for auto-save (every 30 seconds)
- aiGenerated flag tracks AI vs manual entries
- Completing record should validate required fields exist
- Consider using transactions for complete operation
- SOAP format: Subjective, Objective, Assessment, Plan
- Allow partial records (draft state) until completed
- Vital signs are optional but valuable when recorded

## Files to Create/Modify

### Backend
- `src/routes/medical-record.routes.ts`
- `src/controllers/medical-record.controller.ts`
- `src/services/medical-record.service.ts`
- `src/services/vital-signs.service.ts`
- `src/validators/medical-record.validator.ts`
- `src/repositories/medical-record.repository.ts`
- `src/routes/index.ts` (add routes)
- `tests/unit/services/medical-record.service.test.ts`
- `tests/integration/routes/medical-record.routes.test.ts`

## Definition of Done
- [ ] All medical record endpoints functional
- [ ] SOAP format fields working
- [ ] Symptom CRUD working
- [ ] Prescription CRUD working
- [ ] Vital signs working
- [ ] Auto-save (PATCH) working
- [ ] Complete operation updates appointment
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Code reviewed and approved
