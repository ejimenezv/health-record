# Sequence Diagrams

This document contains sequence diagrams for the key flows in MedRecord AI MVP.

---

## 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as Doctor (Browser)
    participant F as Frontend (React)
    participant B as Backend (Express)
    participant DB as PostgreSQL
    participant S as Session Storage

    U->>F: Navigate to app
    F->>F: Check for stored JWT
    alt No JWT found
        F->>U: Show login page
        U->>F: Enter credentials
        F->>B: POST /api/auth/login
        B->>DB: Find provider by email
        DB-->>B: Provider record
        B->>B: Verify password (bcrypt)
        alt Valid credentials
            B->>B: Generate JWT token
            B-->>F: 200 OK + JWT + user data
            F->>S: Store JWT in localStorage
            F->>U: Redirect to dashboard
        else Invalid credentials
            B-->>F: 401 Unauthorized
            F->>U: Show error message
        end
    else JWT exists
        F->>B: GET /api/auth/me (with JWT)
        B->>B: Validate JWT
        alt Valid token
            B->>DB: Get provider data
            DB-->>B: Provider record
            B-->>F: 200 OK + user data
            F->>U: Show dashboard
        else Invalid/expired token
            B-->>F: 401 Unauthorized
            F->>S: Clear stored JWT
            F->>U: Redirect to login
        end
    end
```

---

## 2. Patient Registration Flow

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant B as Backend
    participant PS as PatientService
    participant DB as PostgreSQL

    U->>F: Click "New Patient"
    F->>U: Show patient form

    U->>F: Fill in patient details
    F->>F: Validate form (client-side)

    alt Validation fails
        F->>U: Show validation errors
    else Validation passes
        F->>B: POST /api/patients
        B->>B: Validate JWT (middleware)
        B->>B: Sanitize input
        B->>PS: createPatient(data)

        PS->>DB: Check for duplicates (name + DOB)
        DB-->>PS: Similar patients (if any)

        alt Duplicate found
            PS-->>B: Return duplicate warning
            B-->>F: 200 OK + duplicate flag
            F->>U: Show duplicate warning dialog

            U->>F: Confirm create anyway
            F->>B: POST /api/patients?force=true
            B->>PS: createPatient(data, force=true)
        end

        PS->>DB: INSERT patient
        DB-->>PS: Patient record with ID
        PS-->>B: Patient created

        B-->>F: 201 Created + patient data
        F->>F: Update patient list cache
        F->>U: Show success toast
        F->>U: Navigate to patient profile
    end
```

---

## 3. Create Appointment Flow

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant B as Backend
    participant AS as AppointmentService
    participant DB as PostgreSQL

    U->>F: View patient profile
    F->>B: GET /api/patients/:id
    B-->>F: Patient data

    U->>F: Click "New Appointment"
    F->>U: Show appointment form<br/>(patient pre-selected)

    U->>F: Select type, enter reason
    F->>F: Auto-set date/time to now

    U->>F: Click "Create Appointment"
    F->>B: POST /api/appointments

    B->>B: Validate JWT
    B->>AS: createAppointment(patientId, data)

    AS->>DB: INSERT appointment (status: 'in_progress')
    DB-->>AS: Appointment with ID

    AS->>DB: INSERT empty medical_record
    DB-->>AS: Medical record with ID

    AS-->>B: Appointment + record created

    B-->>F: 201 Created + appointment data
    F->>U: Navigate to medical record entry page
```

---

## 4. AI Transcription Flow (Most Complex)

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant AR as Audio Recorder
    participant B as Backend
    participant AI as AIService
    participant W as OpenAI Whisper
    participant G as OpenAI GPT-4
    participant DB as PostgreSQL

    Note over U,DB: Phase 1: Recording
    U->>F: View appointment record page
    U->>AR: Click "Start Recording"
    AR->>AR: Request microphone permission

    alt Permission denied
        AR-->>U: Show permission error
    else Permission granted
        AR->>AR: Initialize MediaRecorder
        AR->>U: Show recording indicator

        Note over AR: Recording in progress...
        AR->>AR: Collect audio chunks

        U->>AR: Click "Stop Recording"
        AR->>AR: Create audio blob (WebM)
        AR->>U: Show "Processing..." state
    end

    Note over U,DB: Phase 2: Transcription
    AR->>F: Audio blob ready
    F->>B: POST /api/ai/transcribe<br/>(multipart: audio file)

    B->>AI: transcribeAudio(audioBlob)
    AI->>W: POST /v1/audio/transcriptions<br/>(file + model=whisper-1)

    Note over W: Whisper processing...

    W-->>AI: Transcript text
    AI-->>B: { transcript: "..." }
    B-->>F: 200 OK + transcript

    F->>U: Display transcript in panel

    Note over U,DB: Phase 3: Field Extraction
    F->>B: POST /api/ai/extract<br/>(transcript text)

    B->>AI: extractMedicalData(transcript)
    AI->>AI: Build extraction prompt
    AI->>G: POST /v1/chat/completions<br/>(prompt + transcript)

    Note over G: GPT-4 extraction...

    G-->>AI: JSON structured data
    AI->>AI: Parse and validate JSON
    AI-->>B: Structured medical data

    B-->>F: 200 OK + extracted fields

    Note over U,DB: Phase 4: Auto-Fill
    F->>F: Populate form fields
    F->>F: Mark AI-filled fields with badge
    F->>U: Display auto-filled form

    U->>F: Review and edit fields
    U->>F: Click "Save Record"

    F->>B: PUT /api/records/:appointmentId
    B->>DB: UPDATE medical_record
    B->>DB: INSERT/UPDATE symptoms
    B->>DB: INSERT/UPDATE prescriptions
    DB-->>B: Success

    B-->>F: 200 OK
    F->>U: Show success message
```

---

## 5. Auto-Fill Medical Record Flow

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant B as Backend
    participant AI as AIService
    participant G as OpenAI GPT-4

    Note over U,G: Extraction from transcript

    F->>B: POST /api/ai/extract
    Note right of F: { transcript: "Patient says..." }

    B->>AI: extractMedicalData(transcript)

    AI->>AI: Build prompt with schema

    AI->>G: POST /v1/chat/completions
    Note right of AI: System: You are a medical<br/>documentation assistant...<br/>User: Extract from this transcript...

    G-->>AI: Response with JSON

    AI->>AI: Parse JSON response
    AI->>AI: Validate required fields
    AI->>AI: Calculate confidence scores

    AI-->>B: Structured extraction result
    Note left of AI: {<br/>  chief_complaint: {...},<br/>  symptoms: [...],<br/>  diagnosis: {...},<br/>  prescriptions: [...]<br/>}

    B-->>F: 200 OK + extraction

    Note over F: Auto-fill form fields

    F->>F: Set chief_complaint field
    F->>F: Add symptom entries
    F->>F: Set diagnosis field
    F->>F: Add prescription entries
    F->>F: Mark fields as AI-generated
    F->>F: Highlight source text

    F->>U: Display filled form

    Note over U,F: Doctor review

    U->>F: Review AI suggestions
    U->>F: Edit/correct fields
    U->>F: Add missing information
    U->>F: Click "Confirm & Save"

    F->>B: PUT /api/records/:id
    B-->>F: 200 OK
    F->>U: Record saved confirmation
```

---

## 6. View Patient History Flow

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    U->>F: Search for patient
    F->>B: GET /api/patients?search=...
    B->>DB: SELECT patients WHERE name LIKE...
    DB-->>B: Matching patients
    B-->>F: Patient list
    F->>U: Display search results

    U->>F: Click on patient
    F->>B: GET /api/patients/:id
    B->>DB: SELECT patient + allergies + conditions
    DB-->>B: Patient with related data
    B-->>F: Patient data

    F->>B: GET /api/patients/:id/appointments
    B->>DB: SELECT appointments ORDER BY date DESC
    DB-->>B: Appointments with summaries
    B-->>F: Appointment list

    F->>U: Display patient profile with history

    U->>F: Click on appointment
    F->>B: GET /api/appointments/:id
    B->>DB: SELECT appointment + record + symptoms + prescriptions
    DB-->>B: Full appointment data
    B-->>F: Appointment with record

    F->>U: Display appointment details

    U->>F: Click "Previous" navigation
    F->>B: GET /api/appointments/:prevId
    B-->>F: Previous appointment
    F->>U: Navigate to previous record
```

---

## 7. Manual Record Entry Flow

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    U->>F: Open appointment record
    F->>B: GET /api/appointments/:id
    B-->>F: Appointment + existing record

    F->>U: Display record entry form

    Note over U,F: Manual data entry

    U->>F: Enter chief complaint
    U->>F: Click "Add Symptom"
    F->>U: Show symptom form
    U->>F: Enter symptom details
    U->>F: Click "Add Symptom"

    U->>F: Enter diagnosis
    U->>F: Enter treatment plan

    U->>F: Click "Add Prescription"
    F->>U: Show prescription form
    U->>F: Enter medication details
    U->>F: Click "Add Prescription"

    Note over U,F: Auto-save draft

    F->>F: Debounce timer (30s)
    F->>B: PUT /api/records/:id (draft)
    B->>DB: UPDATE medical_record
    DB-->>B: Success
    B-->>F: 200 OK
    F->>U: Show "Draft saved" indicator

    Note over U,F: Complete appointment

    U->>F: Click "Complete Appointment"
    F->>F: Validate required fields

    alt Missing required fields
        F->>U: Highlight missing fields
    else All fields complete
        F->>B: PUT /api/appointments/:id/status
        Note right of F: { status: 'completed' }
        B->>DB: UPDATE appointment status
        B->>DB: UPDATE record (is_draft = false)
        DB-->>B: Success
        B-->>F: 200 OK
        F->>U: Show completion message
        F->>U: Navigate to patient profile
    end
```

---

## 8. Error Handling Flow

```mermaid
sequenceDiagram
    participant U as Doctor
    participant F as Frontend
    participant B as Backend
    participant AI as AIService
    participant W as OpenAI Whisper

    Note over U,W: Transcription error scenario

    U->>F: Stop recording
    F->>B: POST /api/ai/transcribe

    B->>AI: transcribeAudio()
    AI->>W: POST Whisper API

    alt API timeout
        W--xAI: Timeout error
        AI->>AI: Retry (attempt 2)
        AI->>W: POST Whisper API
        W--xAI: Timeout error
        AI-->>B: Error: Service unavailable
        B-->>F: 503 Service Unavailable
        F->>U: Show error: "Transcription unavailable"
        F->>U: Option: "Continue with manual entry"
    else API rate limited
        W-->>AI: 429 Too Many Requests
        AI-->>B: Error: Rate limited
        B-->>F: 429 + retry-after header
        F->>U: Show: "Please wait and try again"
    else Invalid audio
        W-->>AI: 400 Bad Request
        AI-->>B: Error: Invalid audio format
        B-->>F: 400 Bad Request
        F->>U: Show: "Audio format not supported"
    else Success
        W-->>AI: Transcript
        AI-->>B: Success
        B-->>F: 200 OK
        F->>U: Display transcript
    end
```

---

## Legend

```
Participant Types:
- U: User (Doctor)
- F: Frontend (React)
- B: Backend (Express)
- DB: Database (PostgreSQL)
- AI: AI Service layer
- W: Whisper API (OpenAI)
- G: GPT-4 API (OpenAI)

Line Types:
─────> : Synchronous call
──────>>: Async response
──x──> : Error/failure
─ ─ ─> : Optional/conditional

Notes:
- All API calls include JWT authentication (omitted for clarity)
- Error handling simplified for readability
- Database operations abstracted through Prisma
```
