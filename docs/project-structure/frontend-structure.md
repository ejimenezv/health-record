# Frontend Project Structure

This document defines the complete folder structure for the React + Vite frontend application.

---

## Overview

The frontend follows a **feature-based** organization pattern with shared components and utilities:

- **Components**: Reusable UI components organized by feature
- **Pages**: Route-level components
- **Hooks**: Custom React hooks
- **Services**: API client functions
- **Store**: Global state management

---

## Complete Frontend Structure

```
packages/frontend/
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   └── manifest.json
│
├── src/
│   ├── main.tsx                   # Application entry
│   ├── App.tsx                    # Root component
│   ├── vite-env.d.ts              # Vite types
│   │
│   ├── assets/
│   │   ├── images/
│   │   │   └── logo.svg
│   │   └── styles/
│   │       └── globals.css        # Global styles + Tailwind imports
│   │
│   ├── components/
│   │   ├── ui/                    # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── table.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── form.tsx
│   │   │   └── dropdown-menu.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.tsx         # Top navigation bar
│   │   │   ├── Sidebar.tsx        # Side navigation
│   │   │   ├── MainLayout.tsx     # Main app layout wrapper
│   │   │   ├── PageContainer.tsx  # Page content wrapper
│   │   │   └── ProtectedRoute.tsx # Auth route guard
│   │   │
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── Pagination.tsx
│   │   │
│   │   ├── patients/
│   │   │   ├── PatientList.tsx    # Patient listing
│   │   │   ├── PatientCard.tsx    # Patient summary card
│   │   │   ├── PatientForm.tsx    # Create/edit form
│   │   │   ├── PatientSearch.tsx  # Search component
│   │   │   ├── PatientDetails.tsx # Detail view
│   │   │   ├── AllergyList.tsx    # Allergy display
│   │   │   └── ConditionList.tsx  # Chronic conditions display
│   │   │
│   │   ├── appointments/
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── AppointmentCard.tsx
│   │   │   ├── AppointmentForm.tsx
│   │   │   ├── AppointmentHistory.tsx
│   │   │   └── AppointmentStatus.tsx
│   │   │
│   │   ├── medical-records/
│   │   │   ├── MedicalRecordForm.tsx      # Main record form
│   │   │   ├── ChiefComplaintField.tsx
│   │   │   ├── SymptomsSection.tsx
│   │   │   ├── SymptomCard.tsx
│   │   │   ├── SymptomForm.tsx
│   │   │   ├── DiagnosisSection.tsx
│   │   │   ├── TreatmentPlanSection.tsx
│   │   │   ├── PrescriptionsSection.tsx
│   │   │   ├── PrescriptionCard.tsx
│   │   │   ├── PrescriptionForm.tsx
│   │   │   ├── VitalSignsSection.tsx
│   │   │   ├── MedicalRecordView.tsx
│   │   │   └── AIFieldBadge.tsx           # AI-generated indicator
│   │   │
│   │   └── transcription/
│   │       ├── TranscriptionPanel.tsx     # Main transcription UI
│   │       ├── AudioRecorder.tsx          # Recording controls
│   │       ├── RecordButton.tsx           # Start/stop button
│   │       ├── RecordingTimer.tsx         # Duration display
│   │       ├── WaveformDisplay.tsx        # Audio visualization
│   │       ├── TranscriptionDisplay.tsx   # Transcript text
│   │       ├── ProcessingIndicator.tsx    # Loading states
│   │       └── AIExtractionStatus.tsx     # Extraction progress
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── patients/
│   │   │   ├── PatientsPage.tsx       # Patient list view
│   │   │   ├── PatientDetailPage.tsx  # Single patient view
│   │   │   └── NewPatientPage.tsx     # Create patient
│   │   │
│   │   ├── appointments/
│   │   │   ├── AppointmentPage.tsx    # Appointment detail + record
│   │   │   └── NewAppointmentPage.tsx # Create appointment
│   │   │
│   │   └── NotFoundPage.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Authentication state
│   │   ├── usePatients.ts          # Patient queries
│   │   ├── usePatient.ts           # Single patient query
│   │   ├── useAppointments.ts      # Appointment queries
│   │   ├── useAppointment.ts       # Single appointment query
│   │   ├── useMedicalRecord.ts     # Medical record mutations
│   │   ├── useTranscription.ts     # Transcription API calls
│   │   ├── useAudioRecorder.ts     # Audio recording logic
│   │   ├── useAutoSave.ts          # Auto-save functionality
│   │   └── useToast.ts             # Toast notifications
│   │
│   ├── services/
│   │   ├── api.ts                  # Axios instance
│   │   ├── auth.api.ts             # Auth endpoints
│   │   ├── patients.api.ts         # Patient endpoints
│   │   ├── appointments.api.ts     # Appointment endpoints
│   │   ├── medical-records.api.ts  # Record endpoints
│   │   └── transcription.api.ts    # AI/transcription endpoints
│   │
│   ├── store/
│   │   ├── index.ts                # Store setup
│   │   ├── auth.store.ts           # Auth state (Context)
│   │   └── transcription.store.ts  # Recording state (Context)
│   │
│   ├── types/
│   │   ├── index.ts                # Type exports
│   │   ├── auth.types.ts
│   │   ├── patients.types.ts
│   │   ├── appointments.types.ts
│   │   ├── medical-records.types.ts
│   │   ├── transcription.types.ts
│   │   └── api.types.ts            # API response types
│   │
│   ├── utils/
│   │   ├── formatters.ts           # Date, currency formatters
│   │   ├── validators.ts           # Zod schemas
│   │   ├── audio.ts                # Audio processing utilities
│   │   └── cn.ts                   # Tailwind class merger
│   │
│   ├── lib/
│   │   └── utils.ts                # shadcn utils (cn function)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx         # Auth provider
│   │   ├── RecordingContext.tsx    # Audio recording provider
│   │   └── QueryProvider.tsx       # React Query provider
│   │
│   └── router/
│       └── index.tsx               # React Router setup
│
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── PatientCard.test.tsx
│   │   │   └── ...
│   │   └── hooks/
│   │       ├── useAuth.test.ts
│   │       └── ...
│   ├── e2e/
│   │   └── flows/
│   │       ├── login.spec.ts
│   │       ├── patient-crud.spec.ts
│   │       └── ...
│   └── setup.ts
│
├── .env.example
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json              # shadcn/ui config
└── index.html
```

---

## Directory Descriptions

### `public/`

Static assets served directly without processing.

| File | Purpose |
|------|---------|
| `favicon.ico` | Browser tab icon |
| `robots.txt` | Search engine instructions |
| `manifest.json` | PWA manifest |

### `src/assets/`

Assets that are processed by Vite (imports, optimization).

| Directory | Content |
|-----------|---------|
| `images/` | Logos, icons, illustrations |
| `styles/` | Global CSS, Tailwind imports |

### `src/components/`

React components organized by category.

#### `components/ui/`

Base UI components from **shadcn/ui**. These are copied into the project (not npm dependencies).

**Key components:**
| Component | Usage |
|-----------|-------|
| `button.tsx` | All buttons |
| `input.tsx` | Text inputs |
| `card.tsx` | Content containers |
| `dialog.tsx` | Modals |
| `form.tsx` | Form wrapper with validation |
| `toast.tsx` | Notifications |
| `table.tsx` | Data tables |
| `badge.tsx` | Status indicators |

#### `components/layout/`

Application layout components.

| Component | Purpose |
|-----------|---------|
| `Header.tsx` | Top navigation with user menu |
| `Sidebar.tsx` | Side navigation links |
| `MainLayout.tsx` | Wraps authenticated pages |
| `PageContainer.tsx` | Page content padding/styling |
| `ProtectedRoute.tsx` | Auth guard component |

#### `components/common/`

Shared utility components used across features.

| Component | Purpose |
|-----------|---------|
| `LoadingSpinner.tsx` | Loading indicator |
| `ErrorBoundary.tsx` | Error catching |
| `EmptyState.tsx` | Empty list placeholder |
| `ConfirmDialog.tsx` | Confirmation modal |
| `SearchInput.tsx` | Search box |
| `Pagination.tsx` | Page navigation |

#### `components/patients/`

Patient-related components.

#### `components/appointments/`

Appointment-related components.

#### `components/medical-records/`

Medical record form components including symptoms, prescriptions, and diagnoses.

#### `components/transcription/`

Audio recording and AI transcription components.

### `src/pages/`

Route-level page components. Each page maps to a route.

| Page | Route |
|------|-------|
| `LoginPage` | `/login` |
| `DashboardPage` | `/` |
| `PatientsPage` | `/patients` |
| `PatientDetailPage` | `/patients/:id` |
| `NewPatientPage` | `/patients/new` |
| `AppointmentPage` | `/appointments/:id` |
| `NewAppointmentPage` | `/appointments/new` |
| `NotFoundPage` | `*` (404) |

### `src/hooks/`

Custom React hooks.

**Data fetching hooks (React Query):**
| Hook | Purpose |
|------|---------|
| `usePatients()` | Fetch patient list |
| `usePatient(id)` | Fetch single patient |
| `useAppointments()` | Fetch appointments |
| `useAppointment(id)` | Fetch single appointment |
| `useMedicalRecord(id)` | Fetch/mutate record |

**Utility hooks:**
| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state and actions |
| `useAudioRecorder()` | Recording logic |
| `useTranscription()` | AI transcription |
| `useAutoSave()` | Draft auto-save |
| `useToast()` | Toast notifications |

### `src/services/`

API client functions using Axios.

**Example:**
```typescript
// services/patients.api.ts
import api from './api';
import { Patient, CreatePatientData } from '@/types';

export const patientsApi = {
  list: (params?: { search?: string; page?: number }) =>
    api.get<PaginatedResponse<Patient>>('/patients', { params }),

  getById: (id: string) =>
    api.get<Patient>(`/patients/${id}`),

  create: (data: CreatePatientData) =>
    api.post<Patient>('/patients', data),

  update: (id: string, data: Partial<CreatePatientData>) =>
    api.put<Patient>(`/patients/${id}`, data),
};
```

### `src/store/`

Global state management using React Context.

| Store | Purpose |
|-------|---------|
| `auth.store.ts` | User session, login/logout |
| `transcription.store.ts` | Recording state |

### `src/types/`

TypeScript type definitions matching backend API responses.

### `src/utils/`

Utility functions.

| File | Purpose |
|------|---------|
| `formatters.ts` | Date formatting, phone formatting |
| `validators.ts` | Zod schemas for forms |
| `audio.ts` | Audio blob handling |
| `cn.ts` | Tailwind class merger |

### `src/context/`

React Context providers.

### `src/router/`

React Router configuration.

**Example:**
```typescript
// router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'patients/new', element: <NewPatientPage /> },
      { path: 'patients/:id', element: <PatientDetailPage /> },
      { path: 'appointments/new', element: <NewAppointmentPage /> },
      { path: 'appointments/:id', element: <AppointmentPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
```

---

## Component Patterns

### Component File Structure

```typescript
// components/patients/PatientCard.tsx
import { type FC } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Patient } from '@/types';
import { formatDate } from '@/utils/formatters';

interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
}

export const PatientCard: FC<PatientCardProps> = ({ patient, onClick }) => {
  return (
    <Card className="cursor-pointer hover:shadow-md" onClick={onClick}>
      <CardHeader>
        <h3>{patient.firstName} {patient.lastName}</h3>
      </CardHeader>
      <CardContent>
        <p>DOB: {formatDate(patient.dateOfBirth)}</p>
        {patient.allergies.length > 0 && (
          <Badge variant="destructive">Allergies</Badge>
        )}
      </CardContent>
    </Card>
  );
};
```

### Hook Pattern

```typescript
// hooks/usePatients.ts
import { useQuery } from '@tanstack/react-query';
import { patientsApi } from '@/services/patients.api';

interface UsePatientOptions {
  search?: string;
  page?: number;
}

export function usePatients(options: UsePatientOptions = {}) {
  return useQuery({
    queryKey: ['patients', options],
    queryFn: () => patientsApi.list(options),
  });
}
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## References

- [Root Structure](./root-structure.md)
- [Backend Structure](./backend-structure.md)
- [Configuration Files](./config-files.md)
- [Frontend Tech Stack](../tech-stack/frontend.md)
