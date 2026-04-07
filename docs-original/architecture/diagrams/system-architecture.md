# System Architecture Diagram

## Main Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Layer (Browser)"]
        A[React Frontend<br/>TypeScript SPA]
        B[Audio Capture Module<br/>Web Audio API]
        C[State Management<br/>React Query + Context]
    end

    subgraph Backend["Backend Layer (Node.js)"]
        D[Express API Server]
        E[Auth Middleware<br/>JWT Validation]
        F[API Routes Layer]

        subgraph Services["Service Layer"]
            G[AuthService]
            H[PatientService]
            I[AppointmentService]
            J[MedicalRecordService]
            K[AIService]
        end

        L[Data Access Layer<br/>Prisma ORM]
    end

    subgraph External["External Services"]
        M[OpenAI Whisper API<br/>Speech-to-Text]
        N[OpenAI GPT-4 API<br/>Data Extraction]
    end

    subgraph Data["Data Layer"]
        O[(PostgreSQL<br/>Database)]
        P[File Storage<br/>Audio Files]
    end

    A -->|HTTPS/REST| D
    B -->|Audio Upload| D
    C --> A

    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K

    G --> L
    H --> L
    I --> L
    J --> L

    K -->|Transcription Request| M
    K -->|Extraction Request| N

    L --> O
    K --> P
```

## Simplified Overview Diagram

```mermaid
graph LR
    subgraph User["User Interface"]
        A[Doctor's Browser]
    end

    subgraph App["MedRecord AI Application"]
        B[React Frontend]
        C[Express Backend]
        D[(PostgreSQL)]
    end

    subgraph AI["AI Services"]
        E[OpenAI Whisper]
        F[OpenAI GPT-4]
    end

    A --> B
    B <-->|REST API| C
    C <--> D
    C -->|Audio| E
    C -->|Transcript| F
    E -->|Text| C
    F -->|JSON| C
```

## Component Interaction Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend Components"]
        direction TB
        Login[Login Page]
        PatientList[Patient List]
        PatientForm[Patient Form]
        PatientProfile[Patient Profile]
        AppointmentForm[Appointment Form]
        RecordEntry[Medical Record Entry]
        AudioRecorder[Audio Recorder]
        TranscriptViewer[Transcript Viewer]
    end

    subgraph Backend["Backend Services"]
        direction TB
        AuthSvc[Auth Service]
        PatientSvc[Patient Service]
        ApptSvc[Appointment Service]
        RecordSvc[Record Service]
        AISvc[AI Service]
    end

    subgraph Database["Database Tables"]
        direction TB
        Provider[(Provider)]
        Patient[(Patient)]
        Allergy[(Allergy)]
        Condition[(ChronicCondition)]
        Appointment[(Appointment)]
        Record[(MedicalRecord)]
        Symptom[(Symptom)]
        Prescription[(Prescription)]
        VitalSigns[(VitalSigns)]
    end

    Login --> AuthSvc
    PatientList --> PatientSvc
    PatientForm --> PatientSvc
    PatientProfile --> PatientSvc
    AppointmentForm --> ApptSvc
    RecordEntry --> RecordSvc
    AudioRecorder --> AISvc
    TranscriptViewer --> AISvc

    AuthSvc --> Provider
    PatientSvc --> Patient
    PatientSvc --> Allergy
    PatientSvc --> Condition
    ApptSvc --> Appointment
    RecordSvc --> Record
    RecordSvc --> Symptom
    RecordSvc --> Prescription
    RecordSvc --> VitalSigns
```

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input["Data Input"]
        A[Doctor Input]
        B[Audio Recording]
    end

    subgraph Processing["Processing"]
        C[Form Validation]
        D[Audio Processing]
        E[Transcription]
        F[AI Extraction]
    end

    subgraph Storage["Data Storage"]
        G[(Patient Data)]
        H[(Appointment Data)]
        I[(Medical Records)]
        J[Audio Files]
    end

    subgraph Output["Output"]
        K[Patient Profile View]
        L[Appointment History]
        M[Medical Record View]
    end

    A --> C
    B --> D
    D --> E
    E --> F
    C --> G
    C --> H
    F --> I
    D --> J

    G --> K
    H --> L
    I --> M
```

## Technology Stack Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend Stack"]
        React[React 18]
        TS1[TypeScript]
        RQ[React Query]
        RR[React Router]
        TW[Tailwind CSS]
        Axios[Axios]
    end

    subgraph Backend["Backend Stack"]
        Node[Node.js]
        Express[Express.js]
        TS2[TypeScript]
        Prisma[Prisma ORM]
        JWT[JWT Auth]
        Multer[Multer]
    end

    subgraph Database["Database"]
        PG[(PostgreSQL)]
    end

    subgraph External["External APIs"]
        Whisper[OpenAI Whisper]
        GPT4[OpenAI GPT-4]
    end

    subgraph Infrastructure["Infrastructure"]
        Docker[Docker]
        Nginx[Nginx]
        Ubuntu[Ubuntu Server]
    end

    React --> Node
    Node --> PG
    Node --> Whisper
    Node --> GPT4
    Docker --> Ubuntu
    Nginx --> Docker
```

## Deployment Architecture Diagram

```mermaid
graph TB
    subgraph Internet["Internet"]
        User[Doctor's Browser]
    end

    subgraph Server["Ubuntu Server"]
        subgraph Docker["Docker Environment"]
            Nginx[Nginx<br/>Reverse Proxy]

            subgraph App["Application Containers"]
                Frontend[Frontend Container<br/>React Build + Nginx]
                Backend[Backend Container<br/>Node.js Express]
            end

            DB[(PostgreSQL<br/>Container)]
        end

        Volumes[Docker Volumes<br/>- DB Data<br/>- Audio Files]
    end

    subgraph External["External Services"]
        OpenAI[OpenAI API]
    end

    User -->|HTTPS:443| Nginx
    Nginx -->|/| Frontend
    Nginx -->|/api| Backend
    Backend --> DB
    Backend -->|HTTPS| OpenAI
    DB --> Volumes
```

## Security Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Browser"]
        A[React App]
        B[JWT Token Storage]
    end

    subgraph Security["Security Layers"]
        C[HTTPS/TLS]
        D[CORS Policy]
        E[Rate Limiting]
        F[JWT Validation]
        G[Input Sanitization]
    end

    subgraph Backend["Protected Backend"]
        H[API Routes]
        I[Business Logic]
        J[Database Access]
    end

    subgraph Data["Secured Data"]
        K[(Encrypted DB)]
        L[Environment Secrets]
    end

    A -->|Request| C
    B -->|Token| C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    I -.->|Read| L
```

## Module Dependencies Diagram

```mermaid
graph TD
    subgraph Core["Core Modules"]
        Auth[Authentication]
        DB[Database]
        Config[Configuration]
    end

    subgraph Features["Feature Modules"]
        Patient[Patient Management]
        Appointment[Appointment Management]
        Record[Medical Records]
        AI[AI Integration]
    end

    subgraph Utilities["Utility Modules"]
        Validation[Validation]
        Logger[Logger]
        Error[Error Handler]
    end

    Auth --> Config
    DB --> Config

    Patient --> Auth
    Patient --> DB
    Patient --> Validation

    Appointment --> Auth
    Appointment --> DB
    Appointment --> Patient

    Record --> Auth
    Record --> DB
    Record --> Appointment
    Record --> AI

    AI --> Config
    AI --> Logger
    AI --> Error
```
