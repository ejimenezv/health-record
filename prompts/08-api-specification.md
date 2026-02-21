# Prompt 08: API Specification

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the NINTH prompt in the series. Previous prompts completed research, product definition, user stories, architecture, tech stack, AI integration, data modeling, and project structure.

## Prerequisites
Before proceeding, read the following files:
- `docs/stories/must-have-stories.md`
- `docs/data-model/prisma-schema.md`
- `docs/data-model/entities/` (all entity files)
- `docs/ai-integration/interfaces.md`
- `docs/project-structure/backend-structure.md`

## Objective
Create complete API specifications in OpenAPI 3.0 format for all endpoints needed to support the MVP features. This documentation will guide backend implementation.

## Tasks

### 1. Define API Overview
Create `docs/api/overview.md` with:

**Base URL**: `/api/v1`

**Authentication**: Bearer JWT token

**Common Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response Format**:
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "errors": []
}
```

**Error Response Format**:
```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**HTTP Status Codes**:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Internal Server Error

### 2. Define Authentication Endpoints
Create `docs/api/endpoints/auth.md` with:

```yaml
/api/v1/auth/register:
  post:
    summary: Register a new doctor account
    requestBody:
      required: true
      content:
        application/json:
          schema:
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
              password:
                type: string
                minLength: 8
              firstName:
                type: string
              lastName:
                type: string
              specialty:
                type: string
              licenseNumber:
                type: string
    responses:
      201:
        description: User registered successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'
      422:
        description: Validation error

/api/v1/auth/login:
  post:
    summary: Login to get access token
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - password
            properties:
              email:
                type: string
              password:
                type: string
    responses:
      200:
        description: Login successful
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'
      401:
        description: Invalid credentials

/api/v1/auth/me:
  get:
    summary: Get current user profile
    security:
      - bearerAuth: []
    responses:
      200:
        description: User profile
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
```

### 3. Define Patient Endpoints
Create `docs/api/endpoints/patients.md` with:

```yaml
/api/v1/patients:
  get:
    summary: List all patients for current doctor
    security:
      - bearerAuth: []
    parameters:
      - name: search
        in: query
        description: Search by name
        schema:
          type: string
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
    responses:
      200:
        description: List of patients
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/Patient'
                pagination:
                  $ref: '#/components/schemas/Pagination'

  post:
    summary: Create a new patient
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreatePatientRequest'
    responses:
      201:
        description: Patient created
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Patient'

/api/v1/patients/{id}:
  get:
    summary: Get patient details
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Patient details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatientWithAppointments'

  put:
    summary: Update patient
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
    responses:
      200:
        description: Patient updated

  delete:
    summary: Delete patient (soft delete)
    security:
      - bearerAuth: []
    responses:
      204:
        description: Patient deleted
```

### 4. Define Appointment Endpoints
Create `docs/api/endpoints/appointments.md` with all CRUD endpoints plus:
- List appointments by patient
- Get appointment with full medical record
- Update appointment status

### 5. Define Medical Record Endpoints
Create `docs/api/endpoints/medical-records.md` with:
- Get medical record by appointment
- Create/update medical record
- Add symptom
- Update/delete symptom
- Set diagnosis
- Add prescription
- Update/delete prescription

### 6. Define Transcription Endpoints
Create `docs/api/endpoints/transcription.md` with:

```yaml
/api/v1/appointments/{appointmentId}/transcription/start:
  post:
    summary: Start transcription session
    description: Initializes a transcription session and returns WebSocket connection details
    security:
      - bearerAuth: []
    parameters:
      - name: appointmentId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Transcription session started
        content:
          application/json:
            schema:
              type: object
              properties:
                sessionId:
                  type: string
                wsUrl:
                  type: string
                  description: WebSocket URL for real-time communication

/api/v1/appointments/{appointmentId}/transcription/audio:
  post:
    summary: Upload audio chunk for transcription
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              audio:
                type: string
                format: binary
              chunkIndex:
                type: integer
    responses:
      200:
        description: Audio chunk received and being processed

/api/v1/appointments/{appointmentId}/transcription/stop:
  post:
    summary: Stop transcription session
    security:
      - bearerAuth: []
    responses:
      200:
        description: Transcription stopped
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TranscriptionComplete'

/api/v1/appointments/{appointmentId}/transcription:
  get:
    summary: Get transcription for appointment
    security:
      - bearerAuth: []
    responses:
      200:
        description: Transcription data
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Transcription'

/api/v1/appointments/{appointmentId}/extract-fields:
  post:
    summary: Extract medical fields from transcription using AI
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              transcriptionText:
                type: string
              previousContext:
                type: string
    responses:
      200:
        description: Extracted fields
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExtractedFields'
```

### 7. Define WebSocket Events
Create `docs/api/websocket.md` with:

**Connection**: `ws://api/v1/transcription/{sessionId}`

**Client to Server Events**:
```typescript
// Audio chunk data
{
  "type": "audio_chunk",
  "data": {
    "audio": "base64_encoded_audio",
    "chunkIndex": 0,
    "timestamp": 1234567890
  }
}

// Stop recording
{
  "type": "stop_recording"
}
```

**Server to Client Events**:
```typescript
// Transcription update
{
  "type": "transcription_update",
  "data": {
    "text": "transcribed text",
    "isFinal": false,
    "chunkIndex": 0
  }
}

// Field extraction update
{
  "type": "field_extraction",
  "data": {
    "symptoms": [...],
    "diagnosis": {...},
    "prescriptions": [...]
  }
}

// Error
{
  "type": "error",
  "data": {
    "code": "TRANSCRIPTION_FAILED",
    "message": "Error description"
  }
}

// Status update
{
  "type": "status",
  "data": {
    "status": "processing" | "completed" | "error"
  }
}
```

### 8. Define API Schemas
Create `docs/api/schemas.md` with all request/response schemas:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
        firstName:
          type: string
        lastName:
          type: string
        specialty:
          type: string
        licenseNumber:
          type: string
        createdAt:
          type: string
          format: date-time

    Patient:
      type: object
      properties:
        id:
          type: string
          format: uuid
        firstName:
          type: string
        lastName:
          type: string
        dateOfBirth:
          type: string
          format: date
        gender:
          type: string
        email:
          type: string
        phone:
          type: string
        # ... all other fields

    Appointment:
      # ... complete schema

    MedicalRecord:
      # ... complete schema

    Symptom:
      # ... complete schema

    Diagnosis:
      # ... complete schema

    Prescription:
      # ... complete schema

    Transcription:
      # ... complete schema

    ExtractedFields:
      type: object
      properties:
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

    # ... all other schemas
```

### 9. Create OpenAPI Specification File
Create `docs/api/openapi.yaml` with complete OpenAPI 3.0 specification combining all endpoints and schemas.

### 10. Fill Template Section 4 (Spanish)
Create `docs/deliverables/section-4-api.md` with the content for Section 4 of `plantilla-de-trabajo.md` in Spanish:

```markdown
## 4. Especificación de la API

### Endpoint 1: Crear Paciente

**POST** `/api/v1/patients`

**Descripción:** Crea un nuevo paciente en el sistema.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "firstName": "Juan",
  "lastName": "García",
  "dateOfBirth": "1985-03-15",
  "gender": "male",
  "email": "juan@email.com",
  "phone": "+34612345678",
  "allergies": "Penicilina",
  "chronicConditions": "Diabetes tipo 2"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "firstName": "Juan",
    "lastName": "García",
    ...
  },
  "message": "Paciente creado exitosamente"
}
```

---

### Endpoint 2: Obtener Historial Médico de Paciente

**GET** `/api/v1/patients/{id}/appointments`

**Descripción:** Obtiene el historial completo de citas y registros médicos de un paciente.

[Complete specification in Spanish]

---

### Endpoint 3: Iniciar Transcripción de Cita

**POST** `/api/v1/appointments/{appointmentId}/transcription/start`

**Descripción:** Inicia una sesión de transcripción en tiempo real para una cita médica.

[Complete specification in Spanish]
```

### 11. Create API Summary
Create `docs/api/api-summary.md` with:
- Endpoint count by category
- Authentication flow summary
- WebSocket events summary
- Quick reference table
- Error handling reference

## Output Structure
```
docs/
├── research/           (from prompt 00)
├── product/            (from prompt 01)
├── stories/            (from prompt 02)
├── architecture/       (from prompt 03)
├── tech-stack/         (from prompt 04)
├── ai-integration/     (from prompt 05)
├── data-model/         (from prompt 06)
├── project-structure/  (from prompt 07)
├── api/
│   ├── overview.md
│   ├── openapi.yaml
│   ├── schemas.md
│   ├── websocket.md
│   ├── api-summary.md
│   └── endpoints/
│       ├── auth.md
│       ├── patients.md
│       ├── appointments.md
│       ├── medical-records.md
│       └── transcription.md
└── deliverables/
    ├── section-1-producto.md
    ├── section-2-arquitectura.md
    ├── section-3-modelo-datos.md
    ├── section-4-api.md
    └── section-5-historias.md
```

## Success Criteria
- All CRUD endpoints defined for each entity
- Authentication endpoints complete
- Transcription endpoints with WebSocket events
- All request/response schemas defined
- OpenAPI specification file created
- Section 4 content ready in Spanish
- API summary created

## Next Prompt
The next prompt (09-frontend-specification.md) will define the complete frontend specification using this API.
