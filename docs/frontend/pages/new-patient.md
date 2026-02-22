# New Patient Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/patients/new` |
| **Layout** | Authenticated (with sidebar) |
| **Protection** | Protected |
| **Title** | Registrar Paciente |

## Description

The new patient page provides a form for registering new patients in the system. It collects all required patient information including demographics, contact information, and emergency contact details with real-time validation.

## Components Used

- `MainLayout` - Page wrapper with sidebar
- `Header` - Page header with breadcrumbs
- `Breadcrumbs` - Navigation trail
- `PatientForm` - Patient registration form
- `Form` (shadcn/ui + react-hook-form) - Form handling
- `Input` (shadcn/ui) - Text inputs
- `Select` (shadcn/ui) - Dropdown selects
- `DatePicker` - Date of birth picker
- `Button` (shadcn/ui) - Submit/cancel buttons
- `Card` (shadcn/ui) - Form sections
- `AlertDialog` (shadcn/ui) - Duplicate warning

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pacientes > Nuevo Paciente                                               │
├──────────┬───────────────────────────────────────────────────────────────┤
│          │                                                               │
│ ┌──────┐ │  ┌─────────────────────────────────────────────────────────┐  │
│ │ 🏠   │ │  │ REGISTRAR NUEVO PACIENTE                                │  │
│ │Dash  │ │  │                                                         │  │
│ └──────┘ │  │  ─── Información Personal ───                           │  │
│          │  │                                                         │  │
│ ┌──────┐ │  │  Nombre *                     Apellido *                │  │
│ │ 👥   │ │  │  ┌───────────────────┐        ┌───────────────────┐     │  │
│ │Pcts  │ │  │  │                   │        │                   │     │  │
│ │ ●    │ │  │  └───────────────────┘        └───────────────────┘     │  │
│ └──────┘ │  │                                                         │  │
│          │  │  Fecha de Nacimiento *        Sexo *                    │  │
│          │  │  ┌───────────────────┐        ┌───────────────────┐     │  │
│          │  │  │ DD/MM/AAAA     📅 │        │ Seleccionar    ▼  │     │  │
│          │  │  └───────────────────┘        └───────────────────┘     │  │
│          │  │                                                         │  │
│          │  │  ─── Información de Contacto ───                        │  │
│          │  │                                                         │  │
│          │  │  Teléfono *                   Email                     │  │
│          │  │  ┌───────────────────┐        ┌───────────────────┐     │  │
│          │  │  │ +52 555 123 4567  │        │ correo@ejemplo.com│     │  │
│          │  │  └───────────────────┘        └───────────────────┘     │  │
│          │  │                                                         │  │
│          │  │  Dirección                                              │  │
│          │  │  ┌─────────────────────────────────────────────────┐    │  │
│          │  │  │                                                 │    │  │
│          │  │  └─────────────────────────────────────────────────┘    │  │
│          │  │                                                         │  │
│          │  │  ─── Contacto de Emergencia ───                         │  │
│          │  │                                                         │  │
│          │  │  Nombre *                     Teléfono *                │  │
│          │  │  ┌───────────────────┐        ┌───────────────────┐     │  │
│          │  │  │                   │        │                   │     │  │
│          │  │  └───────────────────┘        └───────────────────┘     │  │
│          │  │                                                         │  │
│          │  │  Relación                                               │  │
│          │  │  ┌─────────────────────────────────────────────────┐    │  │
│          │  │  │                                                 │    │  │
│          │  │  └─────────────────────────────────────────────────┘    │  │
│          │  │                                                         │  │
│          │  │               [Cancelar]      [Registrar Paciente]      │  │
│          │  │                                                         │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
└──────────┴───────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface NewPatientPageState {
  // Form state (managed by react-hook-form)
  formData: CreatePatientRequest;

  // UI state
  isSubmitting: boolean;
  duplicateWarning: DuplicatePatient | null;
  showDuplicateDialog: boolean;
}

interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
}
```

## Form Fields

| Field | Type | Required | Validation | Placeholder |
|-------|------|----------|------------|-------------|
| `firstName` | text | Yes | 2-50 chars | "Nombre" |
| `lastName` | text | Yes | 2-50 chars | "Apellido" |
| `dateOfBirth` | date | Yes | Not future, age 0-150 | "DD/MM/AAAA" |
| `sex` | select | Yes | male/female/other | "Seleccionar" |
| `phone` | tel | Yes | Valid phone format | "+52 555 123 4567" |
| `email` | email | No | Valid email format | "correo@ejemplo.com" |
| `address` | textarea | No | Max 200 chars | "Dirección completa" |
| `emergencyContactName` | text | Yes | 2-100 chars | "Nombre completo" |
| `emergencyContactPhone` | tel | Yes | Valid phone format | "+52 555 987 6543" |
| `emergencyContactRelationship` | text | No | Max 50 chars | "Ej: Esposo, Madre" |

## API Integration

```typescript
// Create patient mutation
const createPatientMutation = useMutation({
  mutationFn: (data: CreatePatientRequest) => patientsApi.create(data),
  onSuccess: (patient) => {
    queryClient.invalidateQueries(['patients']);
    navigate(`/patients/${patient.id}`);
    toast.success('Paciente registrado exitosamente');
  },
  onError: (error) => {
    if (error.code === 'DUPLICATE_PATIENT') {
      setDuplicateWarning(error.data.existingPatient);
      setShowDuplicateDialog(true);
    } else {
      toast.error(getErrorMessage(error));
    }
  },
});
```

## Behavior

### Form Validation
- Real-time validation on blur
- Required fields marked with asterisk (*)
- Error messages displayed below fields
- Submit button disabled while invalid

### On Submit
1. Validate all fields
2. Show loading state
3. Call create patient API
4. On success: Navigate to patient detail, show toast
5. On duplicate: Show duplicate warning dialog
6. On error: Show error toast

### Duplicate Detection
When the API returns a duplicate warning:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Posible Paciente Duplicado                     [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Se encontró un paciente con información similar:       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ María García López                                │ │
│  │ Teléfono: +52 555 123 4567                       │ │
│  │ Email: maria@email.com                           │ │
│  │ Registrado: 15/01/2024                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ¿Deseas continuar con el registro de todas formas?    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Ver Paciente Existente]        [Registrar de Todos Modos] │
└─────────────────────────────────────────────────────────┘
```

### Cancel
1. Click "Cancelar"
2. If form has changes: Show unsaved changes warning
3. Navigate back to patients list

### Unsaved Changes Guard
- Warn user if navigating away with unsaved changes
- Browser refresh/close also triggers warning

## Validation Messages

| Field | Validation | Message |
|-------|------------|---------|
| firstName | Required | "El nombre es requerido" |
| firstName | Min length | "El nombre debe tener al menos 2 caracteres" |
| firstName | Max length | "El nombre no puede exceder 50 caracteres" |
| lastName | Required | "El apellido es requerido" |
| dateOfBirth | Required | "La fecha de nacimiento es requerida" |
| dateOfBirth | Future date | "La fecha no puede ser futura" |
| dateOfBirth | Invalid age | "La edad debe estar entre 0 y 150 años" |
| sex | Required | "El sexo es requerido" |
| phone | Required | "El teléfono es requerido" |
| phone | Invalid format | "El formato del teléfono es inválido" |
| email | Invalid format | "El formato del email es inválido" |
| emergencyContactName | Required | "El nombre del contacto de emergencia es requerido" |
| emergencyContactPhone | Required | "El teléfono de emergencia es requerido" |

## Sex Options

| Value | Label |
|-------|-------|
| `male` | Masculino |
| `female` | Femenino |
| `other` | Otro |

## Loading State

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│               [Cancelar]      [Registrando...  ⟳]      │
│                                                         │
└─────────────────────────────────────────────────────────┘

Button shows spinner and is disabled during submission
```

## Responsive Design

### Desktop (>1024px)
- Two-column form layout for paired fields
- Form centered with max-width

### Tablet (768-1024px)
- Two-column layout maintained
- Narrower margins

### Mobile (<768px)
- Single column layout
- Full-width inputs
- Sticky submit buttons at bottom

## Keyboard Navigation

- Tab through fields in order
- Enter on last field or button submits form
- Escape closes any open dialogs
- Date picker accessible via keyboard

## Accessibility

- All inputs have associated labels
- Required fields indicated with aria-required
- Error messages linked with aria-describedby
- Focus management on validation errors
- Date picker has keyboard support

## Phone Input Formatting

The phone input should support:
- International format (+52 555 123 4567)
- Automatic formatting as user types
- Accept digits only, format on display
- Clear country code default (Mexico +52)

## Code Structure

```
src/pages/NewPatientPage/
├── index.tsx                    # Main component
├── PatientForm.tsx              # Form component
├── DuplicateWarningDialog.tsx   # Duplicate confirmation
├── useCreatePatient.ts          # Create mutation hook
└── patientSchema.ts             # Zod validation schema
```
