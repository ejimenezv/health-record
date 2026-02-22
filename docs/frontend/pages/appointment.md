# Appointment Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/appointments/:appointmentId` |
| **Layout** | Authenticated (with sidebar) |
| **Protection** | Protected |
| **Title** | Consulta Médica |

## Description

The appointment page is the main working page where doctors conduct appointments. It features a two-panel layout with the medical record form on the left and a collapsible transcription panel on the right. This page supports audio recording, real-time transcription, AI-powered field extraction, and manual editing of the medical record.

## Components Used

- `MainLayout` - Page wrapper with sidebar
- `Header` - Page header with patient info and actions
- `Breadcrumbs` - Navigation trail
- `MedicalRecordForm` - SOAP format medical record form
- `TranscriptionPanel` - Collapsible right panel
- `AudioRecorder` - Recording controls
- `TranscriptionDisplay` - Live transcription text
- `AIExtractionStatus` - Extraction progress indicators
- `SymptomsSection` - Symptoms management
- `DiagnosisSection` - Diagnosis input
- `PrescriptionsSection` - Prescriptions management
- `Button` (shadcn/ui) - Action buttons
- `Card` (shadcn/ui) - Section containers
- `Badge` (shadcn/ui) - AI indicator badges
- `AlertDialog` (shadcn/ui) - Confirmation dialogs

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ María García - Consulta 20/01/2024                    [Guardar]  [Completar] [✕]    │
├──────────┬───────────────────────────────────────────────────────────────────────────┤
│          │                                                                           │
│ ┌──────┐ │  ┌────────────────────────────────────────┬──────────────────────────┐   │
│ │ 🏠   │ │  │                                        │ Transcripción       [◀]  │   │
│ │Dash  │ │  │  EXPEDIENTE MÉDICO                     │                          │   │
│ └──────┘ │  │                                        │ ┌──────────────────────┐ │   │
│          │  │  ─── Subjetivo ───                     │ │                      │ │   │
│ ┌──────┐ │  │                                        │ │ [🎙 Iniciar Grabación] │ │   │
│ │ 👥   │ │  │  Motivo de Consulta                    │ │                      │ │   │
│ │Pcts  │ │  │  ┌──────────────────────────────────┐  │ └──────────────────────┘ │   │
│ │ ●    │ │  │  │ Dolor de cabeza recurrente      │  │                          │   │
│ └──────┘ │  │  │ desde hace 2 semanas    [AI ✓]  │  │ Transcripción en vivo:   │   │
│          │  │  └──────────────────────────────────┘  │ ┌──────────────────────┐ │   │
│          │  │                                        │ │ "El paciente refiere │ │   │
│          │  │  Síntomas                [AI ✓]        │ │  dolor de cabeza     │ │   │
│          │  │  ┌──────────────────────────────────┐  │ │  desde hace dos      │ │   │
│          │  │  │ • Cefalea                        │  │ │  semanas, que        │ │   │
│          │  │  │   Severidad: 7/10 | Frontal     │  │ │  empeora por las     │ │   │
│          │  │  │                                  │  │ │  tardes..."          │ │   │
│          │  │  │ • Náuseas                        │  │ │                      │ │   │
│          │  │  │   Severidad: 4/10 | Ocasional   │  │ │                      │ │   │
│          │  │  │                                  │  │ └──────────────────────┘ │   │
│          │  │  │           [+ Agregar Síntoma]    │  │                          │   │
│          │  │  └──────────────────────────────────┘  │ Estado: ● Grabando       │   │
│          │  │                                        │ Duración: 05:32          │   │
│          │  │  ─── Objetivo ───                      │                          │   │
│          │  │                                        │ ─────────────────────    │   │
│          │  │  Examen Físico                         │                          │   │
│          │  │  ┌──────────────────────────────────┐  │ Extracción IA:           │   │
│          │  │  │ PA: 120/80 mmHg                 │  │ ✓ Síntomas extraídos     │   │
│          │  │  │ FC: 72 lpm                       │  │ ⟳ Procesando diagnóstico │   │
│          │  │  │ Temp: 36.5°C                     │  │ ○ Prescripciones pend.   │   │
│          │  │  └──────────────────────────────────┘  │                          │   │
│          │  │                                        │                          │   │
│          │  │  ─── Evaluación ───                    │                          │   │
│          │  │                                        │ ┌──────────────────────┐ │   │
│          │  │  Diagnóstico                [AI ✓]     │ │ [✓ Aceptar Todo IA]  │ │   │
│          │  │  ┌──────────────────────────────────┐  │ │ [✗ Descartar Todo]   │ │   │
│          │  │  │ Migraña sin aura         ▼      │  │ └──────────────────────┘ │   │
│          │  │  └──────────────────────────────────┘  │                          │   │
│          │  │                                        │                          │   │
│          │  │  ─── Plan ───                          │                          │   │
│          │  │                                        │                          │   │
│          │  │  Prescripciones              [AI ✓]    │                          │   │
│          │  │  ┌──────────────────────────────────┐  │                          │   │
│          │  │  │ • Ibuprofeno 400mg               │  │                          │   │
│          │  │  │   Cada 8 horas por 5 días       │  │                          │   │
│          │  │  │                            [✏][✗]│  │                          │   │
│          │  │  │                                  │  │                          │   │
│          │  │  │ • Metoclopramida 10mg            │  │                          │   │
│          │  │  │   Cada 8 horas si náuseas       │  │                          │   │
│          │  │  │                            [✏][✗]│  │                          │   │
│          │  │  │                                  │  │                          │   │
│          │  │  │        [+ Agregar Prescripción]  │  │                          │   │
│          │  │  └──────────────────────────────────┘  │                          │   │
│          │  │                                        │                          │   │
│          │  │  Indicaciones de Seguimiento           │                          │   │
│          │  │  ┌──────────────────────────────────┐  │                          │   │
│          │  │  │ Regresar en 2 semanas si        │  │                          │   │
│          │  │  │ persisten los síntomas.          │  │                          │   │
│          │  │  └──────────────────────────────────┘  │                          │   │
│          │  │                                        │                          │   │
│          │  └────────────────────────────────────────┴──────────────────────────┘   │
│          │                                                                           │
└──────────┴───────────────────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface AppointmentPageState {
  // Route params
  appointmentId: string;

  // Core data
  appointment: Appointment | null;
  patient: Patient | null;
  medicalRecord: MedicalRecord;

  // Transcription state
  transcription: {
    sessionId: string | null;
    isRecording: boolean;
    text: string;
    segments: TranscriptionSegment[];
    status: 'idle' | 'recording' | 'processing' | 'completed' | 'error';
    duration: number; // seconds
    error: string | null;
  };

  // AI extraction state
  aiExtraction: {
    chiefComplaint: {
      status: 'pending' | 'processing' | 'done';
      value: string | null;
      accepted: boolean;
    };
    symptoms: {
      status: 'pending' | 'processing' | 'done';
      data: Symptom[];
      accepted: boolean;
    };
    diagnosis: {
      status: 'pending' | 'processing' | 'done';
      value: Diagnosis | null;
      accepted: boolean;
    };
    prescriptions: {
      status: 'pending' | 'processing' | 'done';
      data: Prescription[];
      accepted: boolean;
    };
  };

  // UI state
  ui: {
    transcriptionPanelOpen: boolean;
    isSaving: boolean;
    isCompleting: boolean;
    hasUnsavedChanges: boolean;
    activeSection: 'subjective' | 'objective' | 'assessment' | 'plan';
    editingPrescriptionId: string | null;
    editingSymptomId: string | null;
  };
}

interface MedicalRecord {
  id: string;
  appointmentId: string;
  status: 'draft' | 'completed';

  // Subjective
  chiefComplaint: string;
  historyOfPresentIllness: string;
  symptoms: Symptom[];

  // Objective
  physicalExamNotes: string;
  vitalSigns?: VitalSigns;

  // Assessment
  diagnosis: string;
  diagnosisNotes: string;

  // Plan
  prescriptions: Prescription[];
  treatmentPlan: string;
  followUpInstructions: string;
  patientEducation: string;

  // Metadata
  transcriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Symptom {
  id: string;
  name: string;
  bodySite?: string;
  severity?: number; // 1-10
  duration?: string;
  notes?: string;
  isAISuggested: boolean;
}

interface Prescription {
  id: string;
  medication: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions: string;
  indication?: string;
  isAISuggested: boolean;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}
```

## URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `appointmentId` | UUID | Appointment identifier |

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `panel` | string | `open` | Transcription panel state (`open` / `closed`) |

## API Integration

### Data Fetching

```typescript
// Fetch appointment with patient and medical record
const { data, isLoading } = useQuery({
  queryKey: ['appointment', appointmentId],
  queryFn: () => appointmentsApi.getById(appointmentId),
});

// Includes: appointment, patient, medicalRecord (if exists)
```

### Mutations

```typescript
// Save medical record (auto-save or manual)
const saveMutation = useMutation({
  mutationFn: (data: SaveMedicalRecordRequest) =>
    medicalRecordsApi.save(appointmentId, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['appointment', appointmentId]);
    setHasUnsavedChanges(false);
  },
});

// Complete appointment
const completeMutation = useMutation({
  mutationFn: () => medicalRecordsApi.complete(appointmentId),
  onSuccess: () => {
    queryClient.invalidateQueries(['appointment', appointmentId]);
    toast.success('Consulta completada');
    navigate(`/patients/${patient.id}`);
  },
});

// Add/Update/Delete symptoms
const addSymptomMutation = useMutation({...});
const updateSymptomMutation = useMutation({...});
const deleteSymptomMutation = useMutation({...});

// Add/Update/Delete prescriptions
const addPrescriptionMutation = useMutation({...});
const updatePrescriptionMutation = useMutation({...});
const deletePrescriptionMutation = useMutation({...});
```

### Transcription API

```typescript
// Start transcription session
const startTranscription = async () => {
  const session = await transcriptionApi.start(appointmentId);
  setSessionId(session.id);
  connectWebSocket(session.wsUrl);
};

// Stop transcription
const stopTranscription = async () => {
  await transcriptionApi.stop(appointmentId, sessionId);
  disconnectWebSocket();
};

// Trigger AI extraction
const extractFields = async () => {
  const extraction = await transcriptionApi.extractFields(appointmentId);
  applyExtraction(extraction);
};
```

### WebSocket Events

```typescript
// WebSocket message handlers
const handleWebSocketMessage = (event: MessageEvent) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'transcription_update':
      appendTranscription(message.text, message.segment);
      break;

    case 'field_extraction':
      updateAIExtraction(message.field, message.value);
      break;

    case 'status':
      updateTranscriptionStatus(message.status);
      break;

    case 'error':
      handleTranscriptionError(message.error);
      break;

    case 'completed':
      finalizeTranscription();
      break;
  }
};
```

## Behavior

### Page Load
1. Fetch appointment details with patient and existing medical record
2. Initialize form with existing data or empty state
3. Set appointment status to `in_progress` if `scheduled` or `checked_in`
4. Open transcription panel by default

### Audio Recording

#### Start Recording
1. Click "Iniciar Grabación" button
2. Request microphone permission (if not granted)
3. Initialize Web Audio API
4. Call transcription API to start session
5. Connect to WebSocket for real-time updates
6. Update UI to recording state
7. Start duration timer

#### During Recording
- Audio chunks sent via WebSocket
- Real-time transcription displayed
- AI extractions update fields as processed
- Duration timer updates every second
- Visual recording indicator (pulsing)

#### Stop Recording
1. Click "Detener Grabación"
2. Stop audio capture
3. Send stop signal via WebSocket
4. Wait for final transcription
5. Trigger field extraction if not already done
6. Update UI to completed state

### AI Extraction

#### Field Updates
When AI extracts a field:
1. Display extracted value with [AI ✓] badge
2. Highlight corresponding transcript segment (optional)
3. Allow user to accept or reject
4. Track which fields are AI-suggested

#### Accept All
1. Apply all pending AI suggestions
2. Mark all as accepted
3. Remove AI badges (now user-confirmed)

#### Discard All
1. Clear all AI suggestions
2. Reset fields to manual entry
3. Keep transcript for reference

### Manual Editing

All AI-filled fields can be manually edited:
- Editing removes AI badge
- Changes tracked for auto-save
- Validation applied on edit

### Auto-Save
- Every 30 seconds if changes detected
- Subtle indicator during save
- Does not interrupt user workflow
- Saves as draft (not completed)

### Complete Appointment
1. Click "Completar"
2. Validate required fields (diagnosis required)
3. Show confirmation if missing recommended fields
4. Save final state
5. Mark appointment as `completed`
6. Navigate to patient detail

### Close/Navigate Away
1. Check for unsaved changes
2. If changes: Show confirmation dialog
3. User can save, discard, or cancel

## Transcription Panel States

### Idle (Not Recording)
```
┌──────────────────────────┐
│                          │
│   ┌──────────────────┐   │
│   │ 🎙 Iniciar       │   │
│   │   Grabación      │   │
│   └──────────────────┘   │
│                          │
│   Presiona para grabar   │
│   la consulta.           │
│                          │
└──────────────────────────┘
```

### Recording
```
┌──────────────────────────┐
│   ┌──────────────────┐   │
│   │ ⬤ Detener        │   │
│   │   Grabación      │   │
│   └──────────────────┘   │
│                          │
│   Transcripción en vivo: │
│   ┌──────────────────┐   │
│   │ "El paciente     │   │
│   │  refiere dolor   │   │
│   │  de cabeza..."   │   │
│   └──────────────────┘   │
│                          │
│   Estado: ● Grabando     │
│   Duración: 05:32        │
│                          │
│   Extracción IA:         │
│   ✓ Síntomas extraídos   │
│   ⟳ Procesando...        │
│   ○ Pendiente            │
└──────────────────────────┘
```

### Processing (After Stop)
```
┌──────────────────────────┐
│                          │
│       ⟳ Procesando       │
│                          │
│   Finalizando            │
│   transcripción...       │
│                          │
└──────────────────────────┘
```

### Completed
```
┌──────────────────────────┐
│   Transcripción completa │
│                          │
│   ┌──────────────────┐   │
│   │ [Texto completo  │   │
│   │  de la consulta] │   │
│   │                  │   │
│   │                  │   │
│   └──────────────────┘   │
│                          │
│   Duración total: 12:45  │
│                          │
│   ┌──────────────────┐   │
│   │ 🎙 Nueva         │   │
│   │   Grabación      │   │
│   └──────────────────┘   │
└──────────────────────────┘
```

### Error
```
┌──────────────────────────┐
│                          │
│       ⚠️ Error           │
│                          │
│   No se pudo procesar    │
│   la grabación.          │
│                          │
│   [Reintentar]           │
│                          │
│   Puedes continuar       │
│   ingresando los datos   │
│   manualmente.           │
│                          │
└──────────────────────────┘
```

## Medical Record Sections

### Subjective Section

**Chief Complaint**
- Single text input
- Max 500 characters
- AI-fillable

**Symptoms**
- List of symptom cards
- Each with: name, body site, severity, duration, notes
- Add/edit/delete functionality
- AI suggestions shown with badge

### Objective Section

**Physical Exam Notes**
- Multi-line text area
- Max 5000 characters

**Vital Signs** (P1 feature)
- Blood pressure, heart rate, temperature, etc.
- Separate input for each vital

### Assessment Section

**Diagnosis**
- Text input with autocomplete (optional)
- Required for completion
- AI-fillable

**Diagnosis Notes**
- Additional notes text area
- Max 2000 characters

### Plan Section

**Prescriptions**
- List of prescription cards
- Each with: medication, strength, dosage, frequency, duration, instructions
- Add/edit/delete via modal
- AI suggestions shown with badge

**Treatment Plan**
- Multi-line text area
- Max 5000 characters

**Follow-up Instructions**
- Multi-line text area
- Max 2000 characters

## AI Badge Indicator

```
┌─────────────────────────────────────┐
│ Síntomas                   [AI ✓]  │
│                                     │
│ Fields with this badge were         │
│ suggested by AI. Click to accept    │
│ or edit to modify.                  │
└─────────────────────────────────────┘
```

- Badge shows on section headers when AI suggestions pending
- Clicking badge accepts the suggestion
- Editing the field manually removes the badge
- Hover shows source text from transcript (optional)

## Prescription Form Modal

```
┌─────────────────────────────────────────────────────────┐
│ Agregar Prescripción                              [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Medicamento *                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Ibuprofeno                                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Concentración *            Dosis *                    │
│  ┌───────────────────┐      ┌───────────────────┐      │
│  │ 400mg             │      │ 1 tableta         │      │
│  └───────────────────┘      └───────────────────┘      │
│                                                         │
│  Frecuencia *               Duración                   │
│  ┌───────────────────┐      ┌───────────────────┐      │
│  │ Cada 8 horas      │      │ 5 días            │      │
│  └───────────────────┘      └───────────────────┘      │
│                                                         │
│  Cantidad                   Refills                    │
│  ┌───────────────────┐      ┌───────────────────┐      │
│  │ 15                │      │ 0                 │      │
│  └───────────────────┘      └───────────────────┘      │
│                                                         │
│  Instrucciones *                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Tomar con alimentos para evitar irritación     │   │
│  │ gástrica.                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Indicación                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Dolor de cabeza / Migraña                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                [Cancelar]           [Guardar]          │
└─────────────────────────────────────────────────────────┘
```

## Symptom Form Modal

```
┌─────────────────────────────────────────────────────────┐
│ Agregar Síntoma                                   [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Síntoma *                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Cefalea                                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Localización                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Región frontal                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Severidad (1-10)                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○──────────●────────○  7/10                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Duración                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 2 semanas                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Notas                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Empeora por las tardes. Mejora con descanso.   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                [Cancelar]           [Guardar]          │
└─────────────────────────────────────────────────────────┘
```

## Header Actions

| Action | Behavior |
|--------|----------|
| Guardar | Save current state as draft, show toast |
| Completar | Validate, complete appointment, navigate away |
| ✕ (Close) | Check unsaved changes, navigate to patient |

## Validation for Completion

| Field | Rule |
|-------|------|
| Diagnosis | Required |
| Chief Complaint | Recommended (warning if empty) |
| At least one symptom or diagnosis | Recommended |

## Error States

### Appointment Not Found
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                        ⚠️                               │
│                                                         │
│              Cita no encontrada                         │
│                                                         │
│   La cita solicitada no existe o fue eliminada.        │
│                                                         │
│                [Volver a Pacientes]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Microphone Permission Denied
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                        🎙️ ✕                             │
│                                                         │
│      Permiso de micrófono denegado                     │
│                                                         │
│   Para grabar la consulta, permite el acceso           │
│   al micrófono en la configuración del navegador.      │
│                                                         │
│   [Continuar sin grabación]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Loading States

### Initial Load
Full page skeleton with form sections.

### Saving
Subtle indicator in header: "Guardando..."

### Processing Transcription
Spinner in transcription panel.

## Responsive Design

### Desktop (>1280px)
- Two-column layout: Form (60%) | Transcription (40%)
- Transcription panel collapsible

### Tablet (1024-1280px)
- Two-column layout: Form (55%) | Transcription (45%)
- Narrower transcription panel

### Tablet Portrait (768-1024px)
- Single column with transcription as overlay/drawer
- Floating record button

### Mobile (<768px)
- Single column form
- Transcription as bottom sheet
- Floating record button
- Simplified prescription/symptom views

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save |
| `Ctrl+Shift+R` | Start/Stop recording |
| `Ctrl+Enter` | Complete appointment |
| `Escape` | Close modal/panel |

## Accessibility

- Recording state announced to screen readers
- AI extraction status updates announced
- Form sections navigable via keyboard
- Modal focus trapping
- Proper ARIA labels for all interactive elements
- Error messages linked to fields

## Performance Considerations

- Debounced auto-save (30 seconds)
- WebSocket connection management
- Audio buffer management for recording
- Virtualized transcript for long recordings
- Lazy-loaded prescription/symptom modals

## Code Structure

```
src/pages/AppointmentPage/
├── index.tsx                     # Main component
├── AppointmentHeader.tsx         # Header with actions
├── MedicalRecordForm/
│   ├── index.tsx                 # Form container
│   ├── SubjectiveSection.tsx     # Subjective fields
│   ├── ObjectiveSection.tsx      # Objective fields
│   ├── AssessmentSection.tsx     # Assessment fields
│   ├── PlanSection.tsx           # Plan fields
│   ├── SymptomsSection.tsx       # Symptoms list
│   ├── SymptomCard.tsx           # Single symptom
│   ├── SymptomModal.tsx          # Add/edit symptom
│   ├── PrescriptionsSection.tsx  # Prescriptions list
│   ├── PrescriptionCard.tsx      # Single prescription
│   └── PrescriptionModal.tsx     # Add/edit prescription
├── TranscriptionPanel/
│   ├── index.tsx                 # Panel container
│   ├── AudioRecorder.tsx         # Recording controls
│   ├── TranscriptionDisplay.tsx  # Transcript text
│   ├── AIExtractionStatus.tsx    # Extraction progress
│   └── useAudioRecorder.ts       # Recording hook
├── hooks/
│   ├── useAppointment.ts         # Data fetching
│   ├── useMedicalRecord.ts       # Record mutations
│   ├── useTranscription.ts       # Transcription logic
│   └── useAutoSave.ts            # Auto-save logic
└── types.ts                      # Page-specific types
```
