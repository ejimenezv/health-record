# Patient Detail Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/patients/:patientId` |
| **Layout** | Authenticated (with sidebar) |
| **Protection** | Protected |
| **Title** | Detalle de Paciente |

## Description

The patient detail page displays comprehensive information about a single patient including demographics, contact information, medical history (allergies, chronic conditions), and appointment history. It provides access to edit patient information and create new appointments.

## Components Used

- `MainLayout` - Page wrapper with sidebar
- `Header` - Page header with breadcrumbs and actions
- `Breadcrumbs` - Navigation trail
- `PatientInfoCard` - Demographics display
- `PatientEditModal` - Edit patient form
- `AppointmentTimeline` - Appointment history
- `AppointmentCard` - Individual appointment display
- `Button` (shadcn/ui) - Action buttons
- `Card` (shadcn/ui) - Content sections
- `Tabs` (shadcn/ui) - Section navigation (optional)
- `Badge` (shadcn/ui) - Status indicators
- `AlertDialog` (shadcn/ui) - Delete confirmation

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pacientes > María García López                   [Editar] [+ Nueva Cita]│
├──────────┬───────────────────────────────────────────────────────────────┤
│          │                                                               │
│ ┌──────┐ │  ┌─────────────────────────────────────────────────────────┐  │
│ │ 🏠   │ │  │ INFORMACIÓN DEL PACIENTE                     [✏ Editar]│  │
│ │Dash  │ │  │                                                         │  │
│ └──────┘ │  │  ┌─────────────────────────┬─────────────────────────┐  │  │
│          │  │  │ Nombre Completo         │ María García López      │  │  │
│ ┌──────┐ │  │  │ Fecha de Nacimiento     │ 15/03/1979 (45 años)    │  │  │
│ │ 👥   │ │  │  │ Sexo                    │ Femenino                │  │  │
│ │Pcts  │ │  │  │ Teléfono                │ +52 555 123 4567        │  │  │
│ │ ●    │ │  │  │ Email                   │ maria@email.com         │  │  │
│ └──────┘ │  │  │ Dirección               │ Calle Principal 123     │  │  │
│          │  │  └─────────────────────────┴─────────────────────────┘  │  │
│          │  │                                                         │  │
│          │  │  ┌───────────────────────────────────────────────────┐  │  │
│          │  │  │ Contacto de Emergencia                            │  │  │
│          │  │  │ Juan García (Esposo) • +52 555 987 6543           │  │  │
│          │  │  └───────────────────────────────────────────────────┘  │  │
│          │  │                                                         │  │
│          │  │  ┌───────────────────────────────────────────────────┐  │  │
│          │  │  │ Alergias                                          │  │  │
│          │  │  │ • Penicilina (Severa)                             │  │  │
│          │  │  │ • Mariscos (Moderada)                             │  │  │
│          │  │  └───────────────────────────────────────────────────┘  │  │
│          │  │                                                         │  │
│          │  │  ┌───────────────────────────────────────────────────┐  │  │
│          │  │  │ Condiciones Crónicas                              │  │  │
│          │  │  │ • Hipertensión (Desde 2018)                       │  │  │
│          │  │  │ • Diabetes Tipo 2 (Desde 2020)                    │  │  │
│          │  │  └───────────────────────────────────────────────────┘  │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
│          │  ┌─────────────────────────────────────────────────────────┐  │
│          │  │ HISTORIAL DE CITAS                        [+ Nueva Cita]│  │
│          │  │                                                         │  │
│          │  │  ○─── 15 Ene 2024 ────────────────────────────────────  │  │
│          │  │  │    Consulta de Seguimiento               [Completada]│  │
│          │  │  │    Dr. García • Dolor de cabeza                      │  │
│          │  │  │    Dx: Migraña                                       │  │
│          │  │  │                                           [Ver →]    │  │
│          │  │  │                                                      │  │
│          │  │  ○─── 10 Dic 2023 ────────────────────────────────────  │  │
│          │  │  │    Revisión Rutinaria                    [Completada]│  │
│          │  │  │    Dr. García • Chequeo anual                        │  │
│          │  │  │    Dx: Sin hallazgos                                 │  │
│          │  │  │                                           [Ver →]    │  │
│          │  │  │                                                      │  │
│          │  │  ○─── 5 Sep 2023 ────────────────────────────────────── │  │
│          │  │       Control de Hipertensión               [Completada]│  │
│          │  │       Dr. García • Seguimiento presión                  │  │
│          │  │                                              [Ver →]    │  │
│          │  │                                                         │  │
│          │  │               [Cargar Más Citas]                        │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
└──────────┴───────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface PatientDetailPageState {
  // Route params
  patientId: string;

  // Data (from React Query)
  patient: Patient | null;
  appointments: Appointment[];
  appointmentsPage: number;
  hasMoreAppointments: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
  isEditModalOpen: boolean;
  isDeleteDialogOpen: boolean;
}
```

## URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `patientId` | UUID | Patient identifier |

## API Integration

```typescript
// Patient detail query
const { data: patient, isLoading } = useQuery({
  queryKey: ['patient', patientId],
  queryFn: () => patientsApi.getById(patientId),
});

// Patient appointments query
const { data: appointments, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['patient-appointments', patientId],
  queryFn: ({ pageParam = 1 }) =>
    patientsApi.getAppointments(patientId, { page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});

// Update patient mutation
const updatePatientMutation = useMutation({
  mutationFn: (data: UpdatePatientRequest) =>
    patientsApi.update(patientId, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['patient', patientId]);
    closeEditModal();
    toast.success('Paciente actualizado');
  },
});

// Delete patient mutation
const deletePatientMutation = useMutation({
  mutationFn: () => patientsApi.delete(patientId),
  onSuccess: () => {
    navigate('/patients');
    toast.success('Paciente eliminado');
  },
});
```

## Behavior

### On Mount
1. Fetch patient details
2. Fetch appointment history (paginated)
3. Display loading state while fetching

### Edit Patient
1. Click "Editar" → Open edit modal
2. Form pre-filled with current data
3. Submit → Update patient via API
4. Success → Close modal, refresh data, show toast
5. Error → Show error in modal

### New Appointment
1. Click "+ Nueva Cita" → Navigate to `/patients/:patientId/appointments/new`

### View Appointment
1. Click "Ver" on appointment → Navigate to `/appointments/:appointmentId`

### Delete Patient
1. Click delete action (in edit modal or menu)
2. Show confirmation dialog
3. Confirm → Delete patient via API
4. Success → Navigate to patients list with toast

### Load More Appointments
1. Click "Cargar Más Citas"
2. Fetch next page of appointments
3. Append to existing list

## Patient Information Display

| Field | Display Format |
|-------|----------------|
| Full Name | `firstName lastName` |
| Date of Birth | `DD/MM/YYYY (X años)` |
| Sex | `Masculino / Femenino / Otro` |
| Phone | Formatted phone number |
| Email | Email address |
| Address | Full address string |
| Emergency Contact | `Name (Relationship) • Phone` |

## Appointment Status Badges

| Status | Color | Label |
|--------|-------|-------|
| `scheduled` | Blue | Programada |
| `checked_in` | Yellow | Registrado |
| `in_progress` | Orange | En Progreso |
| `completed` | Green | Completada |
| `cancelled` | Gray | Cancelada |
| `no_show` | Red | No Asistió |

## Edit Patient Modal

```
┌─────────────────────────────────────────────────────────┐
│ Editar Paciente                                   [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Nombre *                     Apellido *                │
│  ┌───────────────────┐        ┌───────────────────┐    │
│  │ María             │        │ García López      │    │
│  └───────────────────┘        └───────────────────┘    │
│                                                         │
│  Fecha de Nacimiento *        Sexo *                   │
│  ┌───────────────────┐        ┌───────────────────┐    │
│  │ 15/03/1979        │        │ Femenino       ▼  │    │
│  └───────────────────┘        └───────────────────┘    │
│                                                         │
│  Teléfono *                   Email                    │
│  ┌───────────────────┐        ┌───────────────────┐    │
│  │ +52 555 123 4567  │        │ maria@email.com   │    │
│  └───────────────────┘        └───────────────────┘    │
│                                                         │
│  Dirección                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Calle Principal 123, Col. Centro               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─── Contacto de Emergencia ───                        │
│                                                         │
│  Nombre *                     Teléfono *               │
│  ┌───────────────────┐        ┌───────────────────┐    │
│  │ Juan García       │        │ +52 555 987 6543  │    │
│  └───────────────────┘        └───────────────────┘    │
│                                                         │
│  Relación                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Esposo                                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│              [Cancelar]           [Guardar Cambios]    │
└─────────────────────────────────────────────────────────┘
```

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

### Load Error
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                        ⚠️                               │
│                                                         │
│           Error al cargar el paciente                   │
│                                                         │
│   Ocurrió un error. Por favor intenta de nuevo.        │
│                                                         │
│                   [Reintentar]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Empty States

### No Appointments
```
┌─────────────────────────────────────────────────────────┐
│ HISTORIAL DE CITAS                        [+ Nueva Cita]│
│                                                         │
│                        📅                               │
│                                                         │
│           Este paciente no tiene citas                  │
│                                                         │
│      Agenda la primera cita para este paciente.        │
│                                                         │
│                   [+ Agendar Cita]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Loading State

Skeleton loading for patient info and appointment timeline.

## Responsive Design

### Desktop (>1024px)
- Two-column layout for patient info
- Full appointment timeline

### Tablet (768-1024px)
- Single column patient info
- Compact appointment cards

### Mobile (<768px)
- Stacked layout
- Simplified appointment display
- Edit modal becomes full-screen

## Accessibility

- Breadcrumbs with proper ARIA labels
- Modal focus trap and escape key handling
- Timeline semantically marked up as list
- Status badges have accessible labels
- Confirmation dialogs properly announced

## Code Structure

```
src/pages/PatientDetailPage/
├── index.tsx                  # Main component
├── PatientInfoCard.tsx        # Patient info display
├── PatientEditModal.tsx       # Edit form modal
├── AppointmentTimeline.tsx    # Appointment history
├── AppointmentTimelineItem.tsx # Single appointment
├── DeletePatientDialog.tsx    # Delete confirmation
└── usePatientDetail.ts        # Data fetching hook
```
