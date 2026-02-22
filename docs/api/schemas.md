# API Schemas

This document defines all request and response schemas for the MedRecord AI API in OpenAPI 3.0 format.

---

## Table of Contents

1. [Common Schemas](#common-schemas)
2. [Authentication Schemas](#authentication-schemas)
3. [User/Provider Schemas](#userprovider-schemas)
4. [Patient Schemas](#patient-schemas)
5. [Appointment Schemas](#appointment-schemas)
6. [Medical Record Schemas](#medical-record-schemas)
7. [Symptom Schemas](#symptom-schemas)
8. [Prescription Schemas](#prescription-schemas)
9. [Transcription Schemas](#transcription-schemas)
10. [Extraction Schemas](#extraction-schemas)

---

## Common Schemas

### APIResponse

Standard API response wrapper.

```yaml
APIResponse:
  type: object
  properties:
    success:
      type: boolean
      description: Whether the request was successful
    data:
      description: Response data (varies by endpoint)
    message:
      type: string
      description: Human-readable message
    errors:
      type: array
      items:
        $ref: '#/components/schemas/ValidationError'
      description: Validation errors (if any)
```

### ValidationError

```yaml
ValidationError:
  type: object
  properties:
    field:
      type: string
      description: Field name that failed validation
    message:
      type: string
      description: Error description
  required:
    - field
    - message
```

### Pagination

```yaml
Pagination:
  type: object
  properties:
    page:
      type: integer
      description: Current page number
      example: 1
    limit:
      type: integer
      description: Items per page
      example: 20
    total:
      type: integer
      description: Total number of items
      example: 45
    totalPages:
      type: integer
      description: Total number of pages
      example: 3
    hasNext:
      type: boolean
      description: Whether there are more pages
    hasPrev:
      type: boolean
      description: Whether there are previous pages
```

### UUID

```yaml
UUID:
  type: string
  format: uuid
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  example: "550e8400-e29b-41d4-a716-446655440000"
```

---

## Authentication Schemas

### LoginRequest

```yaml
LoginRequest:
  type: object
  required:
    - email
    - password
  properties:
    email:
      type: string
      format: email
      description: Registered email address
      example: "doctor@example.com"
    password:
      type: string
      minLength: 1
      description: Account password
      example: "SecurePass123!"
```

### RegisterRequest

```yaml
RegisterRequest:
  type: object
  required:
    - email
    - password
    - firstName
    - lastName
  properties:
    email:
      type: string
      format: email
      example: "doctor@example.com"
    password:
      type: string
      minLength: 8
      description: Minimum 8 characters
      example: "SecurePass123!"
    firstName:
      type: string
      minLength: 2
      maxLength: 50
      example: "John"
    lastName:
      type: string
      minLength: 2
      maxLength: 50
      example: "Smith"
    specialty:
      type: string
      maxLength: 100
      example: "General Practice"
    licenseNumber:
      type: string
      maxLength: 50
      example: "MD-12345"
```

### AuthResponse

```yaml
AuthResponse:
  type: object
  properties:
    user:
      $ref: '#/components/schemas/User'
    accessToken:
      type: string
      description: JWT access token
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    expiresIn:
      type: integer
      description: Token expiration in seconds
      example: 86400
```

---

## User/Provider Schemas

### User

```yaml
User:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    email:
      type: string
      format: email
      example: "doctor@example.com"
    firstName:
      type: string
      example: "John"
    lastName:
      type: string
      example: "Smith"
    specialty:
      type: string
      nullable: true
      example: "General Practice"
    licenseNumber:
      type: string
      nullable: true
      example: "MD-12345"
    phone:
      type: string
      nullable: true
      example: "+1-555-0100"
    createdAt:
      type: string
      format: date-time
      example: "2024-01-15T10:30:00.000Z"
    updatedAt:
      type: string
      format: date-time
      example: "2024-01-15T10:30:00.000Z"
```

### UpdateProfileRequest

```yaml
UpdateProfileRequest:
  type: object
  properties:
    firstName:
      type: string
      minLength: 2
      maxLength: 50
    lastName:
      type: string
      minLength: 2
      maxLength: 50
    specialty:
      type: string
      maxLength: 100
    licenseNumber:
      type: string
      maxLength: 50
    phone:
      type: string
```

---

## Patient Schemas

### Patient

```yaml
Patient:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    firstName:
      type: string
      example: "Jane"
    lastName:
      type: string
      example: "Doe"
    dateOfBirth:
      type: string
      format: date
      example: "1985-03-15"
    sex:
      $ref: '#/components/schemas/Sex'
    phone:
      type: string
      example: "+1-555-0100"
    email:
      type: string
      format: email
      nullable: true
      example: "jane.doe@email.com"
    address:
      type: string
      nullable: true
      example: "123 Main Street, Springfield, IL 62701"
    emergencyContactName:
      type: string
      example: "John Doe"
    emergencyContactPhone:
      type: string
      example: "+1-555-0101"
    emergencyContactRelationship:
      type: string
      nullable: true
      example: "Spouse"
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### PatientWithDetails

```yaml
PatientWithDetails:
  allOf:
    - $ref: '#/components/schemas/Patient'
    - type: object
      properties:
        allergies:
          type: array
          items:
            $ref: '#/components/schemas/Allergy'
        chronicConditions:
          type: array
          items:
            $ref: '#/components/schemas/ChronicCondition'
        recentAppointments:
          type: array
          items:
            $ref: '#/components/schemas/AppointmentSummary'
```

### PatientListItem

```yaml
PatientListItem:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    firstName:
      type: string
    lastName:
      type: string
    dateOfBirth:
      type: string
      format: date
    sex:
      $ref: '#/components/schemas/Sex'
    phone:
      type: string
    email:
      type: string
      nullable: true
    age:
      type: integer
      description: Calculated age in years
    lastAppointment:
      type: string
      format: date-time
      nullable: true
    appointmentCount:
      type: integer
```

### CreatePatientRequest

```yaml
CreatePatientRequest:
  type: object
  required:
    - firstName
    - lastName
    - dateOfBirth
    - sex
    - phone
    - emergencyContactName
    - emergencyContactPhone
  properties:
    firstName:
      type: string
      minLength: 2
      maxLength: 50
    lastName:
      type: string
      minLength: 2
      maxLength: 50
    dateOfBirth:
      type: string
      format: date
    sex:
      $ref: '#/components/schemas/Sex'
    phone:
      type: string
    email:
      type: string
      format: email
    address:
      type: string
      maxLength: 200
    emergencyContactName:
      type: string
      minLength: 2
      maxLength: 100
    emergencyContactPhone:
      type: string
    emergencyContactRelationship:
      type: string
      maxLength: 50
    allergies:
      type: array
      items:
        $ref: '#/components/schemas/CreateAllergyRequest'
    chronicConditions:
      type: array
      items:
        $ref: '#/components/schemas/CreateChronicConditionRequest'
```

### UpdatePatientRequest

```yaml
UpdatePatientRequest:
  type: object
  properties:
    firstName:
      type: string
      minLength: 2
      maxLength: 50
    lastName:
      type: string
      minLength: 2
      maxLength: 50
    dateOfBirth:
      type: string
      format: date
    sex:
      $ref: '#/components/schemas/Sex'
    phone:
      type: string
    email:
      type: string
      format: email
    address:
      type: string
      maxLength: 200
    emergencyContactName:
      type: string
      minLength: 2
      maxLength: 100
    emergencyContactPhone:
      type: string
    emergencyContactRelationship:
      type: string
      maxLength: 50
```

### Sex

```yaml
Sex:
  type: string
  enum:
    - male
    - female
    - other
```

### Allergy

```yaml
Allergy:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    allergen:
      type: string
      example: "Penicillin"
    reaction:
      type: string
      nullable: true
      example: "Hives"
    severity:
      $ref: '#/components/schemas/AllergySeverity'
    onsetDate:
      type: string
      format: date
      nullable: true
    createdAt:
      type: string
      format: date-time
```

### CreateAllergyRequest

```yaml
CreateAllergyRequest:
  type: object
  required:
    - allergen
  properties:
    allergen:
      type: string
      maxLength: 100
    reaction:
      type: string
      maxLength: 200
    severity:
      $ref: '#/components/schemas/AllergySeverity'
    onsetDate:
      type: string
      format: date
```

### AllergySeverity

```yaml
AllergySeverity:
  type: string
  enum:
    - mild
    - moderate
    - severe
    - life_threatening
```

### ChronicCondition

```yaml
ChronicCondition:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    conditionName:
      type: string
      example: "Type 2 Diabetes"
    diagnosisDate:
      type: string
      format: date
      nullable: true
    status:
      type: string
      example: "active"
    notes:
      type: string
      nullable: true
    createdAt:
      type: string
      format: date-time
```

### CreateChronicConditionRequest

```yaml
CreateChronicConditionRequest:
  type: object
  required:
    - conditionName
  properties:
    conditionName:
      type: string
      maxLength: 100
    diagnosisDate:
      type: string
      format: date
    status:
      type: string
      maxLength: 20
      default: "active"
    notes:
      type: string
      maxLength: 500
```

---

## Appointment Schemas

### Appointment

```yaml
Appointment:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    patientId:
      $ref: '#/components/schemas/UUID'
    providerId:
      $ref: '#/components/schemas/UUID'
    appointmentDate:
      type: string
      format: date-time
    appointmentType:
      $ref: '#/components/schemas/AppointmentType'
    reasonForVisit:
      type: string
      nullable: true
    durationMinutes:
      type: integer
      default: 30
    status:
      $ref: '#/components/schemas/AppointmentStatus'
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### AppointmentWithDetails

```yaml
AppointmentWithDetails:
  allOf:
    - $ref: '#/components/schemas/Appointment'
    - type: object
      properties:
        patient:
          $ref: '#/components/schemas/PatientWithDetails'
        medicalRecord:
          $ref: '#/components/schemas/MedicalRecordWithDetails'
        vitalSigns:
          $ref: '#/components/schemas/VitalSigns'
```

### AppointmentSummary

```yaml
AppointmentSummary:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    appointmentDate:
      type: string
      format: date-time
    appointmentType:
      $ref: '#/components/schemas/AppointmentType'
    reasonForVisit:
      type: string
      nullable: true
    status:
      $ref: '#/components/schemas/AppointmentStatus'
    diagnosis:
      type: string
      nullable: true
      description: Diagnosis from medical record
    symptomsCount:
      type: integer
    prescriptionsCount:
      type: integer
```

### CreateAppointmentRequest

```yaml
CreateAppointmentRequest:
  type: object
  required:
    - patientId
    - appointmentDate
    - appointmentType
  properties:
    patientId:
      $ref: '#/components/schemas/UUID'
    appointmentDate:
      type: string
      format: date-time
    appointmentType:
      $ref: '#/components/schemas/AppointmentType'
    reasonForVisit:
      type: string
      maxLength: 500
    durationMinutes:
      type: integer
      minimum: 5
      maximum: 480
      default: 30
```

### UpdateAppointmentRequest

```yaml
UpdateAppointmentRequest:
  type: object
  properties:
    appointmentDate:
      type: string
      format: date-time
    appointmentType:
      $ref: '#/components/schemas/AppointmentType'
    reasonForVisit:
      type: string
      maxLength: 500
    durationMinutes:
      type: integer
      minimum: 5
      maximum: 480
```

### UpdateStatusRequest

```yaml
UpdateStatusRequest:
  type: object
  required:
    - status
  properties:
    status:
      $ref: '#/components/schemas/AppointmentStatus'
```

### AppointmentType

```yaml
AppointmentType:
  type: string
  enum:
    - new_patient
    - follow_up
    - routine_checkup
    - sick_visit
    - telehealth
```

### AppointmentStatus

```yaml
AppointmentStatus:
  type: string
  enum:
    - scheduled
    - checked_in
    - in_progress
    - completed
    - cancelled
    - no_show
```

### VitalSigns

```yaml
VitalSigns:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    bloodPressureSystolic:
      type: integer
      nullable: true
      example: 120
    bloodPressureDiastolic:
      type: integer
      nullable: true
      example: 80
    heartRate:
      type: integer
      nullable: true
      example: 72
    temperature:
      type: number
      format: float
      nullable: true
      example: 98.6
    respiratoryRate:
      type: integer
      nullable: true
    oxygenSaturation:
      type: integer
      nullable: true
      example: 98
    weight:
      type: number
      format: float
      nullable: true
    height:
      type: number
      format: float
      nullable: true
    bmi:
      type: number
      format: float
      nullable: true
    painLevel:
      type: integer
      minimum: 0
      maximum: 10
      nullable: true
    recordedAt:
      type: string
      format: date-time
```

---

## Medical Record Schemas

### MedicalRecord

```yaml
MedicalRecord:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    appointmentId:
      $ref: '#/components/schemas/UUID'
    chiefComplaint:
      type: string
      nullable: true
    historyOfPresentIllness:
      type: string
      nullable: true
    physicalExamNotes:
      type: string
      nullable: true
    diagnosis:
      type: string
      nullable: true
    diagnosisNotes:
      type: string
      nullable: true
    treatmentPlan:
      type: string
      nullable: true
    followUpInstructions:
      type: string
      nullable: true
    patientEducation:
      type: string
      nullable: true
    audioFileUrl:
      type: string
      nullable: true
    transcript:
      type: string
      nullable: true
    isAIGenerated:
      type: boolean
      default: false
    isDraft:
      type: boolean
      default: true
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### MedicalRecordWithDetails

```yaml
MedicalRecordWithDetails:
  allOf:
    - $ref: '#/components/schemas/MedicalRecord'
    - type: object
      properties:
        symptoms:
          type: array
          items:
            $ref: '#/components/schemas/Symptom'
        prescriptions:
          type: array
          items:
            $ref: '#/components/schemas/Prescription'
```

### MedicalRecordRequest

```yaml
MedicalRecordRequest:
  type: object
  properties:
    chiefComplaint:
      type: string
      maxLength: 500
    historyOfPresentIllness:
      type: string
      maxLength: 5000
    physicalExamNotes:
      type: string
      maxLength: 5000
    diagnosis:
      type: string
      maxLength: 500
    diagnosisNotes:
      type: string
      maxLength: 2000
    treatmentPlan:
      type: string
      maxLength: 5000
    followUpInstructions:
      type: string
      maxLength: 2000
    patientEducation:
      type: string
      maxLength: 2000
    isAIGenerated:
      type: boolean
      default: false
    isDraft:
      type: boolean
      default: true
```

---

## Symptom Schemas

### Symptom

```yaml
Symptom:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    medicalRecordId:
      $ref: '#/components/schemas/UUID'
    symptomName:
      type: string
      example: "Headache"
    bodySite:
      type: string
      nullable: true
      example: "Bilateral temporal region"
    severity:
      type: integer
      minimum: 1
      maximum: 10
      nullable: true
      example: 6
    duration:
      type: string
      nullable: true
      example: "3 days"
    notes:
      type: string
      nullable: true
    isAIExtracted:
      type: boolean
      default: false
    createdAt:
      type: string
      format: date-time
```

### CreateSymptomRequest

```yaml
CreateSymptomRequest:
  type: object
  required:
    - symptomName
  properties:
    symptomName:
      type: string
      minLength: 2
      maxLength: 200
    bodySite:
      type: string
      maxLength: 100
    severity:
      type: integer
      minimum: 1
      maximum: 10
    duration:
      type: string
      maxLength: 100
    notes:
      type: string
      maxLength: 1000
    isAIExtracted:
      type: boolean
      default: false
```

### UpdateSymptomRequest

```yaml
UpdateSymptomRequest:
  type: object
  properties:
    symptomName:
      type: string
      minLength: 2
      maxLength: 200
    bodySite:
      type: string
      maxLength: 100
    severity:
      type: integer
      minimum: 1
      maximum: 10
    duration:
      type: string
      maxLength: 100
    notes:
      type: string
      maxLength: 1000
```

---

## Prescription Schemas

### Prescription

```yaml
Prescription:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/UUID'
    medicalRecordId:
      $ref: '#/components/schemas/UUID'
    medicationName:
      type: string
      example: "Ibuprofen"
    strength:
      type: string
      example: "400mg"
    dosage:
      type: string
      example: "1 tablet"
    frequency:
      type: string
      example: "Every 6-8 hours as needed"
    duration:
      type: string
      nullable: true
      example: "5 days"
    quantity:
      type: integer
      nullable: true
      example: 20
    refills:
      type: integer
      default: 0
      example: 0
    instructions:
      type: string
      example: "Take with food. Do not exceed 1200mg per day."
    indication:
      type: string
      nullable: true
      example: "Headache pain relief"
    isAIExtracted:
      type: boolean
      default: false
    createdAt:
      type: string
      format: date-time
```

### CreatePrescriptionRequest

```yaml
CreatePrescriptionRequest:
  type: object
  required:
    - medicationName
    - strength
    - dosage
    - frequency
    - instructions
  properties:
    medicationName:
      type: string
      minLength: 2
      maxLength: 200
    strength:
      type: string
      minLength: 1
      maxLength: 50
    dosage:
      type: string
      minLength: 1
      maxLength: 100
    frequency:
      type: string
      minLength: 1
      maxLength: 100
    duration:
      type: string
      maxLength: 50
    quantity:
      type: integer
      minimum: 1
    refills:
      type: integer
      minimum: 0
      maximum: 12
      default: 0
    instructions:
      type: string
      minLength: 1
      maxLength: 1000
    indication:
      type: string
      maxLength: 200
    isAIExtracted:
      type: boolean
      default: false
```

### UpdatePrescriptionRequest

```yaml
UpdatePrescriptionRequest:
  type: object
  properties:
    medicationName:
      type: string
      minLength: 2
      maxLength: 200
    strength:
      type: string
      minLength: 1
      maxLength: 50
    dosage:
      type: string
      minLength: 1
      maxLength: 100
    frequency:
      type: string
      minLength: 1
      maxLength: 100
    duration:
      type: string
      maxLength: 50
    quantity:
      type: integer
      minimum: 1
    refills:
      type: integer
      minimum: 0
      maximum: 12
    instructions:
      type: string
      minLength: 1
      maxLength: 1000
    indication:
      type: string
      maxLength: 200
```

---

## Transcription Schemas

### TranscriptionSession

```yaml
TranscriptionSession:
  type: object
  properties:
    sessionId:
      type: string
      example: "ts_abc123xyz789"
    wsUrl:
      type: string
      format: uri
      example: "wss://api.medrecord.app/api/v1/transcription/ts_abc123xyz789"
    expiresAt:
      type: string
      format: date-time
    config:
      $ref: '#/components/schemas/AudioConfig'
```

### AudioConfig

```yaml
AudioConfig:
  type: object
  properties:
    sampleRate:
      type: integer
      example: 16000
    channelCount:
      type: integer
      example: 1
    mimeType:
      type: string
      example: "audio/webm;codecs=opus"
    maxDuration:
      type: integer
      description: Maximum duration in milliseconds
      example: 3600000
    chunkInterval:
      type: integer
      description: Recommended chunk interval in milliseconds
      example: 30000
```

### Transcription

```yaml
Transcription:
  type: object
  properties:
    transcript:
      type: string
      description: Full transcription text
    segments:
      type: array
      items:
        $ref: '#/components/schemas/TranscriptionSegment'
    duration:
      type: number
      format: float
      description: Audio duration in seconds
    language:
      type: string
      example: "en"
    audioFileUrl:
      type: string
      nullable: true
    createdAt:
      type: string
      format: date-time
```

### TranscriptionSegment

```yaml
TranscriptionSegment:
  type: object
  properties:
    startTime:
      type: number
      format: float
      example: 0.0
    endTime:
      type: number
      format: float
      example: 2.5
    text:
      type: string
      example: "What brings you in today?"
    speaker:
      type: string
      enum:
        - doctor
        - patient
        - unknown
```

### TranscriptionComplete

```yaml
TranscriptionComplete:
  type: object
  properties:
    sessionId:
      type: string
    status:
      type: string
      enum:
        - completed
        - error
    transcript:
      type: string
    segments:
      type: array
      items:
        $ref: '#/components/schemas/TranscriptionSegment'
    duration:
      type: number
      format: float
    language:
      type: string
    audioFileUrl:
      type: string
      nullable: true
    processingTime:
      type: integer
      description: Processing time in milliseconds
```

---

## Extraction Schemas

### ExtractFieldsRequest

```yaml
ExtractFieldsRequest:
  type: object
  required:
    - transcriptionText
  properties:
    transcriptionText:
      type: string
      description: Full transcription text to analyze
    previousContext:
      type: string
      nullable: true
      description: Context from previous visit
    language:
      type: string
      enum:
        - en
        - es
      default: en
    options:
      $ref: '#/components/schemas/ExtractionOptions'
```

### ExtractionOptions

```yaml
ExtractionOptions:
  type: object
  properties:
    includeConfidence:
      type: boolean
      default: true
    includeSourceText:
      type: boolean
      default: true
    strictMode:
      type: boolean
      default: false
      description: Only return high-confidence extractions
```

### ExtractedFields

```yaml
ExtractedFields:
  type: object
  properties:
    extractionId:
      type: string
    chiefComplaint:
      $ref: '#/components/schemas/ExtractedValue'
    historyOfPresentIllness:
      $ref: '#/components/schemas/ExtractedValue'
    symptoms:
      type: array
      items:
        $ref: '#/components/schemas/ExtractedSymptom'
    diagnosis:
      $ref: '#/components/schemas/ExtractedDiagnosis'
    prescriptions:
      type: array
      items:
        $ref: '#/components/schemas/ExtractedPrescription'
    treatmentPlan:
      $ref: '#/components/schemas/ExtractedValue'
    followUp:
      $ref: '#/components/schemas/ExtractedValue'
    vitalSigns:
      $ref: '#/components/schemas/ExtractedValue'
    allergiesNoted:
      type: array
      items:
        type: string
    currentMedications:
      type: array
      items:
        type: string
    overallConfidence:
      type: number
      format: float
      minimum: 0
      maximum: 1
    flags:
      type: array
      items:
        $ref: '#/components/schemas/ExtractionFlag'
    processingTime:
      type: integer
    tokensUsed:
      $ref: '#/components/schemas/TokenUsage'
```

### ExtractedValue

```yaml
ExtractedValue:
  type: object
  nullable: true
  properties:
    value:
      description: Extracted value
    confidence:
      type: number
      format: float
      minimum: 0
      maximum: 1
    sourceText:
      type: string
      nullable: true
```

### ExtractedSymptom

```yaml
ExtractedSymptom:
  type: object
  properties:
    value:
      type: object
      properties:
        symptomName:
          type: string
        bodySite:
          type: string
          nullable: true
        severity:
          type: integer
          nullable: true
        duration:
          type: string
          nullable: true
        notes:
          type: string
          nullable: true
    confidence:
      type: number
      format: float
    sourceText:
      type: string
      nullable: true
```

### ExtractedDiagnosis

```yaml
ExtractedDiagnosis:
  type: object
  nullable: true
  properties:
    value:
      type: object
      properties:
        description:
          type: string
        type:
          type: string
          enum:
            - primary
            - secondary
            - differential
        certainty:
          type: string
          enum:
            - confirmed
            - suspected
            - ruled_out
    confidence:
      type: number
      format: float
    sourceText:
      type: string
      nullable: true
```

### ExtractedPrescription

```yaml
ExtractedPrescription:
  type: object
  properties:
    value:
      type: object
      properties:
        medicationName:
          type: string
        strength:
          type: string
          nullable: true
        dosage:
          type: string
          nullable: true
        frequency:
          type: string
          nullable: true
        duration:
          type: string
          nullable: true
        instructions:
          type: string
          nullable: true
    confidence:
      type: number
      format: float
    sourceText:
      type: string
      nullable: true
```

### ExtractionFlag

```yaml
ExtractionFlag:
  type: object
  properties:
    field:
      type: string
    reason:
      type: string
    suggestedAction:
      type: string
```

### TokenUsage

```yaml
TokenUsage:
  type: object
  properties:
    prompt:
      type: integer
    completion:
      type: integer
    total:
      type: integer
```

---

## References

- [API Overview](./overview.md)
- [OpenAPI Specification](./openapi.yaml)
- [Data Model](../data-model/prisma-schema.md)
