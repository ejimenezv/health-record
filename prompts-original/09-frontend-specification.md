# Prompt 09: Frontend Specification

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the TENTH prompt in the series. Previous prompts completed all documentation phases including API specification.

## Prerequisites
Before proceeding, read the following files:
- `docs/product/features.md`
- `docs/product/user-flows.md`
- `docs/stories/must-have-stories.md`
- `docs/api/api-summary.md`
- `docs/api/endpoints/` (all endpoint files)
- `docs/project-structure/frontend-structure.md`

## Objective
Create detailed frontend specifications including component definitions, page layouts, state management, and routing. This documentation will guide the frontend implementation.

## Tasks

### 1. Define Routing Structure
Create `docs/frontend/routing.md` with:

```typescript
// Route definitions
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    component: LoginPage,
    public: true
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    protected: true
  },
  {
    path: '/patients',
    component: PatientsPage,
    protected: true
  },
  {
    path: '/patients/new',
    component: NewPatientPage,
    protected: true
  },
  {
    path: '/patients/:patientId',
    component: PatientDetailPage,
    protected: true
  },
  {
    path: '/patients/:patientId/appointments/new',
    component: NewAppointmentPage,
    protected: true
  },
  {
    path: '/appointments/:appointmentId',
    component: AppointmentPage,
    protected: true
  }
];
```

Include:
- Route guards for authentication
- Layout wrappers
- Breadcrumb configuration
- Navigation structure

### 2. Define Page Specifications
Create `docs/frontend/pages/` folder with detailed specs for each page:

**`login.md`**:
```markdown
## Login Page

**Route**: `/login`
**Layout**: Centered card, no sidebar

### Components Used
- LoginForm
- Logo
- Card (UI component)

### State
- email: string
- password: string
- isLoading: boolean
- error: string | null

### Behavior
- Form validation on submit
- Redirect to /dashboard on success
- Display error message on failure
- Remember me functionality (optional)

### Wireframe (ASCII)
```
┌────────────────────────────────────┐
│                                    │
│           [LOGO]                   │
│                                    │
│   ┌─────────────────────────────┐  │
│   │ MedRecord AI               │  │
│   │                            │  │
│   │ Email: [_______________]   │  │
│   │                            │  │
│   │ Password: [____________]   │  │
│   │                            │  │
│   │ [      Iniciar Sesión    ] │  │
│   └─────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```
```

**`dashboard.md`**:
- Overview statistics
- Recent patients list
- Quick actions

**`patients-list.md`**:
- Patient cards grid/list
- Search functionality
- Pagination
- New patient button

**`patient-detail.md`**:
- Patient info card
- Edit patient modal
- Appointment history timeline
- New appointment button

**`new-patient.md`**:
- Patient form with all fields
- Validation rules
- Submit behavior

**`appointment.md`** (Main complex page):
```markdown
## Appointment Page

**Route**: `/appointments/:appointmentId`
**Layout**: Main layout with sidebar

### Description
This is the main working page where doctors conduct appointments.
It has two main areas:
1. Medical Record Form (left/main)
2. Transcription Panel (right/collapsible)

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Patient Name - Appointment Date          [Save] [Close] │
├─────────────────────────────────────┬───────────────────────────┤
│                                     │ Transcription Panel       │
│ Medical Record Form                 │ ┌───────────────────────┐ │
│                                     │ │ [🎙 Start Recording]  │ │
│ ┌─────────────────────────────┐     │ │                       │ │
│ │ Chief Complaint             │     │ │ Live Transcription:   │ │
│ │ [________________________]  │     │ │ "El paciente refiere  │ │
│ └─────────────────────────────┘     │ │  dolor de cabeza..."  │ │
│                                     │ │                       │ │
│ ┌─────────────────────────────┐     │ │ Status: Recording     │ │
│ │ Symptoms        [AI ✓]      │     │ │ Duration: 05:32       │ │
│ │ • Headache                  │     │ └───────────────────────┘ │
│ │ • Fever                     │     │                           │
│ │ [+ Add Symptom]             │     │ AI Extraction Status:     │
│ └─────────────────────────────┘     │ ✓ Symptoms extracted      │
│                                     │ ⟳ Processing diagnosis... │
│ ┌─────────────────────────────┐     │ ○ Prescriptions pending   │
│ │ Diagnosis       [AI ✓]      │     │                           │
│ │ Migraine                    │     │ [Collapse Panel ▶]        │
│ └─────────────────────────────┘     │                           │
│                                     │                           │
│ ┌─────────────────────────────┐     │                           │
│ │ Prescriptions   [AI ✓]      │     │                           │
│ │ • Ibuprofen 400mg/8h/5d     │     │                           │
│ │ [+ Add Prescription]        │     │                           │
│ └─────────────────────────────┘     │                           │
│                                     │                           │
└─────────────────────────────────────┴───────────────────────────┘
```

### Components Used
- MedicalRecordForm
- TranscriptionPanel
- AudioRecorder
- SymptomsSection
- DiagnosisSection
- PrescriptionsSection
- AIExtractionStatus

### State
```typescript
interface AppointmentPageState {
  appointment: Appointment | null;
  medicalRecord: MedicalRecord;
  transcription: {
    isRecording: boolean;
    text: string;
    status: 'idle' | 'recording' | 'processing' | 'completed';
    duration: number;
  };
  aiExtraction: {
    symptoms: { status: 'pending' | 'processing' | 'done'; data: Symptom[] };
    diagnosis: { status: 'pending' | 'processing' | 'done'; data: Diagnosis | null };
    prescriptions: { status: 'pending' | 'processing' | 'done'; data: Prescription[] };
  };
  ui: {
    transcriptionPanelOpen: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
  };
}
```

### Key Behaviors
1. Load appointment and existing medical record on mount
2. Start recording: Initialize audio capture, connect WebSocket
3. Real-time transcription display as audio is processed
4. AI extraction updates fields automatically (with visual indicator)
5. User can edit any AI-suggested field
6. Auto-save every 30 seconds if changes detected
7. Confirmation dialog if leaving with unsaved changes
8. Stop recording: Finalize transcription, complete extraction
```

**`new-appointment.md`**:
- Appointment creation form
- Date/time picker
- Link to patient

### 3. Define Component Specifications
Create `docs/frontend/components/` folder with:

**UI Components** (`ui-components.md`):
- List all shadcn/ui components needed
- Custom styling requirements
- Theme configuration

**Layout Components** (`layout-components.md`):
```typescript
// MainLayout.tsx
interface MainLayoutProps {
  children: React.ReactNode;
}
// Includes: Header, Sidebar (collapsible), Main content area

// Header.tsx
interface HeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

// Sidebar.tsx
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}
// Navigation items: Dashboard, Patients, Settings
```

**Patient Components** (`patient-components.md`):
```typescript
// PatientList.tsx
interface PatientListProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  isLoading: boolean;
}

// PatientCard.tsx
interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

// PatientForm.tsx
interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: CreatePatientRequest) => void;
  isLoading: boolean;
}

// PatientSearch.tsx
interface PatientSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

**Appointment Components** (`appointment-components.md`):
- AppointmentList
- AppointmentCard
- AppointmentHistory (timeline view)
- AppointmentForm

**Medical Record Components** (`medical-record-components.md`):
```typescript
// MedicalRecordForm.tsx
interface MedicalRecordFormProps {
  medicalRecord: MedicalRecord;
  onUpdate: (field: keyof MedicalRecord, value: any) => void;
  aiSuggestions: AIExtractionResult;
  onAcceptAISuggestion: (field: string, value: any) => void;
}

// SymptomsSection.tsx
interface SymptomsSectionProps {
  symptoms: Symptom[];
  aiSymptoms: Symptom[];
  onAdd: (symptom: Symptom) => void;
  onRemove: (id: string) => void;
  onAcceptAI: (symptoms: Symptom[]) => void;
}

// DiagnosisSection.tsx
interface DiagnosisSectionProps {
  diagnosis: Diagnosis | null;
  aiDiagnosis: Diagnosis | null;
  onUpdate: (diagnosis: Diagnosis) => void;
  onAcceptAI: () => void;
}

// PrescriptionsSection.tsx
interface PrescriptionsSectionProps {
  prescriptions: Prescription[];
  aiPrescriptions: Prescription[];
  onAdd: (prescription: Prescription) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, prescription: Prescription) => void;
  onAcceptAI: (prescriptions: Prescription[]) => void;
}

// PrescriptionForm.tsx (modal)
interface PrescriptionFormProps {
  prescription?: Prescription;
  onSubmit: (prescription: Prescription) => void;
  onCancel: () => void;
}
```

**Transcription Components** (`transcription-components.md`):
```typescript
// TranscriptionPanel.tsx
interface TranscriptionPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  isRecording: boolean;
  transcription: string;
  duration: number;
  status: TranscriptionStatus;
  onStartRecording: () => void;
  onStopRecording: () => void;
  extractionStatus: AIExtractionStatus;
}

// AudioRecorder.tsx
interface AudioRecorderProps {
  isRecording: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}
// Includes: Record button (animated), Duration display, Waveform visualization (optional)

// TranscriptionDisplay.tsx
interface TranscriptionDisplayProps {
  text: string;
  isLive: boolean;
  highlightedSegments?: TextSegment[];
}

// AIExtractionStatus.tsx
interface AIExtractionStatusProps {
  symptoms: 'pending' | 'processing' | 'done';
  diagnosis: 'pending' | 'processing' | 'done';
  prescriptions: 'pending' | 'processing' | 'done';
}
```

### 4. Define State Management
Create `docs/frontend/state.md` with:

**Store Structure**:
```typescript
// Auth Store (Zustand)
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// Transcription Store (Zustand)
interface TranscriptionStore {
  isRecording: boolean;
  transcription: string;
  segments: TranscriptionSegment[];
  status: TranscriptionStatus;
  duration: number;
  sessionId: string | null;

  startRecording: (appointmentId: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  appendTranscription: (text: string, segment: TranscriptionSegment) => void;
  reset: () => void;
}
```

**React Query Usage**:
```typescript
// Data fetching hooks
const usePatients = (search?: string) => useQuery(['patients', search], ...);
const usePatient = (id: string) => useQuery(['patient', id], ...);
const useAppointment = (id: string) => useQuery(['appointment', id], ...);
const useMedicalRecord = (appointmentId: string) => useQuery(['medicalRecord', appointmentId], ...);

// Mutations
const useCreatePatient = () => useMutation(...);
const useUpdatePatient = () => useMutation(...);
const useCreateAppointment = () => useMutation(...);
const useSaveMedicalRecord = () => useMutation(...);
```

### 5. Define API Integration
Create `docs/frontend/api-integration.md` with:

**API Client Setup**:
```typescript
// api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors for auth and error handling
api.interceptors.request.use(addAuthHeader);
api.interceptors.response.use(handleResponse, handleError);
```

**Service Definitions**:
- authApi: login, register, me
- patientsApi: CRUD operations
- appointmentsApi: CRUD operations
- medicalRecordsApi: CRUD operations
- transcriptionApi: start, stop, get

**WebSocket Integration**:
```typescript
// useTranscriptionSocket hook
const useTranscriptionSocket = (sessionId: string) => {
  // Connect to WebSocket
  // Handle incoming messages
  // Emit audio chunks
  // Handle disconnect/reconnect
};
```

### 6. Define Forms & Validation
Create `docs/frontend/forms.md` with:

**Form Definitions using Zod + React Hook Form**:
```typescript
// Patient form validation
const patientSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  dateOfBirth: z.date(),
  gender: z.enum(['male', 'female', 'other']),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  // ... other fields
});

// Prescription form validation
const prescriptionSchema = z.object({
  medication: z.string().min(1, 'Medicamento es requerido'),
  dosage: z.string().min(1, 'Dosis es requerida'),
  frequency: z.string().min(1, 'Frecuencia es requerida'),
  duration: z.string().min(1, 'Duración es requerida'),
  instructions: z.string().optional(),
});
```

### 7. Create Frontend Summary
Create `docs/frontend/frontend-summary.md` with:
- Page count and list
- Component hierarchy
- State management overview
- Key interactions summary
- Implementation checklist

## Output Structure
```
docs/
├── ... (previous folders)
├── frontend/
│   ├── routing.md
│   ├── state.md
│   ├── api-integration.md
│   ├── forms.md
│   ├── frontend-summary.md
│   ├── pages/
│   │   ├── login.md
│   │   ├── dashboard.md
│   │   ├── patients-list.md
│   │   ├── patient-detail.md
│   │   ├── new-patient.md
│   │   ├── appointment.md
│   │   └── new-appointment.md
│   └── components/
│       ├── ui-components.md
│       ├── layout-components.md
│       ├── patient-components.md
│       ├── appointment-components.md
│       ├── medical-record-components.md
│       └── transcription-components.md
└── deliverables/
    └── ... (previous sections)
```

## Success Criteria
- All routes defined with guards
- All pages specified with wireframes
- All components defined with interfaces
- State management architecture defined
- API integration patterns defined
- Form validation schemas defined
- Frontend summary created

## Next Prompt
The next prompt (10-ui-ux-refinement.md) will refine the frontend specification with UI/UX considerations.
