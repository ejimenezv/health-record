# New Appointment Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/patients/:patientId/appointments/new` |
| **Layout** | Authenticated (with sidebar) |
| **Protection** | Protected |
| **Title** | Agendar Cita |

## Description

The new appointment page provides a form for scheduling a new appointment for a specific patient. It displays patient information for context and allows the user to set the appointment date, time, type, and reason for visit.

## Components Used

- `MainLayout` - Page wrapper with sidebar
- `Header` - Page header with breadcrumbs
- `Breadcrumbs` - Navigation trail
- `PatientSummaryCard` - Patient context display
- `AppointmentForm` - Appointment creation form
- `Form` (shadcn/ui + react-hook-form) - Form handling
- `Input` (shadcn/ui) - Text inputs
- `Select` (shadcn/ui) - Type selection
- `DateTimePicker` - Date and time selection
- `Textarea` (shadcn/ui) - Reason for visit
- `Button` (shadcn/ui) - Submit/cancel buttons
- `Card` (shadcn/ui) - Form container

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pacientes > María García > Nueva Cita                                    │
├──────────┬───────────────────────────────────────────────────────────────┤
│          │                                                               │
│ ┌──────┐ │  ┌─────────────────────────────────────────────────────────┐  │
│ │ 🏠   │ │  │ PACIENTE                                                │  │
│ │Dash  │ │  │                                                         │  │
│ └──────┘ │  │  María García López                                     │  │
│          │  │  45 años • Femenino • +52 555 123 4567                  │  │
│ ┌──────┐ │  │                                                         │  │
│ │ 👥   │ │  │  ⚠️ Alergias: Penicilina, Mariscos                      │  │
│ │Pcts  │ │  │                                                         │  │
│ │ ●    │ │  └─────────────────────────────────────────────────────────┘  │
│ └──────┘ │                                                               │
│          │  ┌─────────────────────────────────────────────────────────┐  │
│          │  │ AGENDAR CITA                                            │  │
│          │  │                                                         │  │
│          │  │  Fecha *                      Hora *                    │  │
│          │  │  ┌───────────────────┐        ┌───────────────────┐     │  │
│          │  │  │ 20/01/2024     📅 │        │ 10:30 AM       ▼  │     │  │
│          │  │  └───────────────────┘        └───────────────────┘     │  │
│          │  │                                                         │  │
│          │  │  Tipo de Cita *                                         │  │
│          │  │  ┌─────────────────────────────────────────────────┐    │  │
│          │  │  │ Consulta de Seguimiento                      ▼  │    │  │
│          │  │  └─────────────────────────────────────────────────┘    │  │
│          │  │                                                         │  │
│          │  │  Duración (minutos)                                     │  │
│          │  │  ┌─────────────────────────────────────────────────┐    │  │
│          │  │  │ 30                                               │    │  │
│          │  │  └─────────────────────────────────────────────────┘    │  │
│          │  │                                                         │  │
│          │  │  Motivo de la Consulta                                  │  │
│          │  │  ┌─────────────────────────────────────────────────┐    │  │
│          │  │  │ El paciente refiere dolores de cabeza          │    │  │
│          │  │  │ recurrentes desde hace 2 semanas.              │    │  │
│          │  │  │                                                 │    │  │
│          │  │  └─────────────────────────────────────────────────┘    │  │
│          │  │  0/500 caracteres                                       │  │
│          │  │                                                         │  │
│          │  │               [Cancelar]         [Agendar Cita]         │  │
│          │  │                                                         │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
└──────────┴───────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface NewAppointmentPageState {
  // Route params
  patientId: string;

  // Data
  patient: Patient | null;

  // Form state (managed by react-hook-form)
  formData: CreateAppointmentRequest;

  // UI state
  isLoadingPatient: boolean;
  isSubmitting: boolean;
  error: string | null;
}

interface CreateAppointmentRequest {
  patientId: string;
  scheduledAt: Date;
  appointmentType: AppointmentType;
  duration: number;
  reason?: string;
}

type AppointmentType =
  | 'new_patient'
  | 'follow_up'
  | 'routine_checkup'
  | 'sick_visit'
  | 'telehealth';
```

## URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `patientId` | UUID | Patient identifier |

## Form Fields

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `scheduledAt` | datetime | Yes | Now (rounded to next 30min) | Not past, within 1 year |
| `appointmentType` | select | Yes | `follow_up` | Must be valid type |
| `duration` | number | No | `30` | 5-480 minutes |
| `reason` | textarea | No | - | Max 500 chars |

## Appointment Types

| Value | Label | Description |
|-------|-------|-------------|
| `new_patient` | Paciente Nuevo | Primera visita del paciente |
| `follow_up` | Consulta de Seguimiento | Seguimiento de tratamiento |
| `routine_checkup` | Revisión Rutinaria | Chequeo general programado |
| `sick_visit` | Consulta por Enfermedad | Visita por síntomas agudos |
| `telehealth` | Telemedicina | Consulta virtual |

## API Integration

```typescript
// Fetch patient for context
const { data: patient, isLoading: isLoadingPatient } = useQuery({
  queryKey: ['patient', patientId],
  queryFn: () => patientsApi.getById(patientId),
});

// Create appointment mutation
const createAppointmentMutation = useMutation({
  mutationFn: (data: CreateAppointmentRequest) =>
    appointmentsApi.create(data),
  onSuccess: (appointment) => {
    queryClient.invalidateQueries(['patient-appointments', patientId]);
    navigate(`/appointments/${appointment.id}`);
    toast.success('Cita agendada exitosamente');
  },
  onError: (error) => {
    toast.error(getErrorMessage(error));
  },
});
```

## Behavior

### On Mount
1. Extract patientId from URL
2. Fetch patient information
3. Initialize form with defaults
4. Focus on date field

### Default Values
- Date: Today
- Time: Next available 30-minute slot
- Type: `follow_up`
- Duration: 30 minutes

### Form Validation
- Date/time: Required, not in the past
- Type: Required
- Duration: Optional, 5-480 if provided
- Reason: Optional, max 500 characters

### On Submit
1. Validate all fields
2. Show loading state
3. Call create appointment API
4. On success: Navigate to appointment page, show toast
5. On error: Show error toast

### Cancel
1. Click "Cancelar"
2. If form has changes: Show unsaved changes warning
3. Navigate back to patient detail

## Patient Summary Display

The patient card shows:
- Full name
- Age and gender
- Phone number
- Allergies (if any, with warning icon)

This provides context and alerts the doctor to any allergies.

## Date/Time Picker

```
┌─────────────────────────────────────────────────────────┐
│ Fecha y Hora                                            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │       Enero 2024                    < >          │  │
│  │  Lu  Ma  Mi  Ju  Vi  Sá  Do                      │  │
│  │   1   2   3   4   5   6   7                      │  │
│  │   8   9  10  11  12  13  14                      │  │
│  │  15  16  17  18  19 [20] 21                      │  │
│  │  22  23  24  25  26  27  28                      │  │
│  │  29  30  31                                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Hora: [10:30 AM  ▼]                                   │
│                                                         │
│  Horas disponibles en slots de 30 minutos              │
└─────────────────────────────────────────────────────────┘
```

## Time Slot Options

- 30-minute increments
- 8:00 AM to 8:00 PM (configurable)
- Format: `HH:MM AM/PM`

## Validation Messages

| Field | Validation | Message |
|-------|------------|---------|
| scheduledAt | Required | "La fecha y hora son requeridas" |
| scheduledAt | Past date | "La cita no puede ser en el pasado" |
| scheduledAt | Too far | "La cita no puede ser más de 1 año en el futuro" |
| appointmentType | Required | "El tipo de cita es requerido" |
| duration | Invalid range | "La duración debe ser entre 5 y 480 minutos" |
| reason | Max length | "El motivo no puede exceder 500 caracteres" |

## Error States

### Patient Not Found
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                        ⚠️                               │
│                                                         │
│              Paciente no encontrado                     │
│                                                         │
│   El paciente solicitado no existe o fue eliminado.    │
│                                                         │
│                [Volver a Pacientes]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Loading States

### Loading Patient
```
┌─────────────────────────────────────────────────────────┐
│ PACIENTE                                                │
│                                                         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                         │
│  ░░░░░░░░░░░░░░░░░░░░                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Submitting
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│               [Cancelar]      [Agendando...  ⟳]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (>1024px)
- Two-column layout for date/time
- Form centered with max-width

### Tablet (768-1024px)
- Two-column maintained
- Narrower margins

### Mobile (<768px)
- Single column layout
- Full-width inputs
- Calendar modal for date picker
- Sticky submit buttons at bottom

## Accessibility

- All inputs have associated labels
- Required fields indicated with aria-required
- Date picker keyboard accessible
- Time selection keyboard navigable
- Error messages linked with aria-describedby

## Code Structure

```
src/pages/NewAppointmentPage/
├── index.tsx                    # Main component
├── PatientSummaryCard.tsx       # Patient context display
├── AppointmentForm.tsx          # Form component
├── DateTimePicker.tsx           # Combined date/time picker
├── useCreateAppointment.ts      # Create mutation hook
└── appointmentSchema.ts         # Zod validation schema
```
