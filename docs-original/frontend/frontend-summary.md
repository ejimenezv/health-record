# Frontend Specification Summary

## Overview

This document provides a summary of the MedRecord AI frontend architecture, including all pages, components, state management, and implementation guidelines.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Components | shadcn/ui (Radix UI primitives) |
| Routing | React Router v6 |
| State (Server) | TanStack Query (React Query) |
| State (Client) | Zustand |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Icons | Lucide React |

## Page Inventory

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | User authentication |
| Dashboard | `/dashboard` | Overview and quick actions |
| Patients List | `/patients` | Patient search and listing |
| New Patient | `/patients/new` | Patient registration form |
| Patient Detail | `/patients/:patientId` | Patient info and history |
| New Appointment | `/patients/:patientId/appointments/new` | Schedule appointment |
| Appointment | `/appointments/:appointmentId` | Medical record with transcription |
| 404 | `*` | Not found page |

**Total: 8 pages**

## Component Hierarchy

```
App
├── Providers
│   ├── QueryClientProvider
│   └── Toaster
├── Router
│   ├── PublicLayout
│   │   └── LoginPage
│   ├── MainLayout
│   │   ├── Sidebar
│   │   ├── Header
│   │   │   ├── Breadcrumbs
│   │   │   └── UserMenu
│   │   └── [Page Content]
│   │       ├── DashboardPage
│   │       │   ├── StatCard
│   │       │   ├── QuickActions
│   │       │   └── RecentPatients
│   │       ├── PatientsPage
│   │       │   ├── PatientSearch
│   │       │   ├── PatientList
│   │       │   │   └── PatientCard
│   │       │   └── Pagination
│   │       ├── NewPatientPage
│   │       │   └── PatientForm
│   │       ├── PatientDetailPage
│   │       │   ├── PatientInfoCard
│   │       │   ├── AllergyList
│   │       │   ├── ConditionList
│   │       │   └── AppointmentTimeline
│   │       │       └── AppointmentTimelineItem
│   │       ├── NewAppointmentPage
│   │       │   ├── PatientSummaryCard
│   │       │   └── AppointmentForm
│   │       └── AppointmentPage
│   │           ├── AppointmentHeader
│   │           ├── MedicalRecordForm
│   │           │   ├── SubjectiveSection
│   │           │   │   └── SymptomsSection
│   │           │   │       └── SymptomCard
│   │           │   ├── ObjectiveSection
│   │           │   ├── AssessmentSection
│   │           │   │   └── DiagnosisInput
│   │           │   └── PlanSection
│   │           │       └── PrescriptionsSection
│   │           │           └── PrescriptionCard
│   │           └── TranscriptionPanel
│   │               ├── AudioRecorder
│   │               ├── TranscriptionDisplay
│   │               └── AIExtractionStatus
│   └── NotFoundPage
└── Modals
    ├── PatientEditModal
    ├── SymptomModal
    ├── PrescriptionModal
    └── ConfirmationDialogs
```

## Component Count Summary

| Category | Count |
|----------|-------|
| Pages | 8 |
| Layout Components | 8 |
| UI Components (shadcn) | 25+ |
| Patient Components | 10 |
| Appointment Components | 8 |
| Medical Record Components | 12 |
| Transcription Components | 6 |
| Common Components | 5 |
| **Total Custom Components** | **~50** |

## State Management Overview

### Zustand Stores

| Store | Purpose |
|-------|---------|
| `authStore` | User session, token, login/logout |
| `uiStore` | Sidebar, theme, panel states |
| `transcriptionStore` | Recording, transcription, AI extraction |

### React Query Keys

```typescript
queryKeys = {
  auth: ['auth', 'me'],
  patients: ['patients', ...],
  appointments: ['appointments', ...],
  medicalRecords: ['medicalRecords', ...],
  dashboard: ['dashboard', ...],
}
```

### State Flow

```
User Action
    ↓
Component → React Query Mutation → API → Server
    ↓                                     ↓
Local UI State                      Response
    ↓                                     ↓
Optimistic Update              Cache Invalidation
    ↓                                     ↓
    └──────────── UI Update ──────────────┘
```

## API Integration Summary

### Endpoints by Category

| Category | Endpoints |
|----------|-----------|
| Auth | 4 endpoints |
| Patients | 8 endpoints |
| Appointments | 6 endpoints |
| Medical Records | 10 endpoints |
| Transcription | 5 endpoints |
| **Total** | **33 endpoints** |

### WebSocket Integration

- Real-time transcription updates
- AI field extraction events
- Connection status management
- Auto-reconnect handling

## Form Validation Summary

### Validation Schemas

| Schema | Fields | Used In |
|--------|--------|---------|
| `loginSchema` | 2 | LoginPage |
| `patientSchema` | 9 | NewPatientPage, PatientEditModal |
| `appointmentSchema` | 5 | NewAppointmentPage |
| `medicalRecordSchema` | 10+ | AppointmentPage |
| `symptomSchema` | 5 | SymptomModal |
| `prescriptionSchema` | 9 | PrescriptionModal |

## Key Interactions

### 1. Patient Registration Flow
```
Search Patient → Not Found → New Patient Form → Duplicate Check → Create → Navigate to Detail
```

### 2. Appointment Creation Flow
```
Patient Detail → New Appointment → Form → Create → Navigate to Appointment
```

### 3. Medical Record with AI Flow
```
Open Appointment → Start Recording → Audio Capture → Real-time Transcription → AI Extraction → Review/Edit → Save → Complete
```

### 4. Manual Medical Record Flow
```
Open Appointment → Fill Form Sections → Add Symptoms → Add Prescriptions → Save Draft → Complete
```

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | <768px | Single column, drawer sidebar |
| Tablet | 768-1024px | Two columns, collapsible sidebar |
| Desktop | >1024px | Full layout, side-by-side panels |

## Implementation Checklist

### Phase 1: Foundation
- [ ] Project setup (Vite + React + TypeScript)
- [ ] Tailwind CSS configuration
- [ ] shadcn/ui installation
- [ ] Routing setup
- [ ] Auth store and guards
- [ ] API client setup
- [ ] React Query configuration

### Phase 2: Layout & Auth
- [ ] PublicLayout component
- [ ] MainLayout component
- [ ] Sidebar navigation
- [ ] Header with breadcrumbs
- [ ] Login page
- [ ] Auth flow (login/logout)

### Phase 3: Patient Management
- [ ] Dashboard page
- [ ] Patient list page
- [ ] Patient search component
- [ ] Patient cards
- [ ] New patient page
- [ ] Patient form with validation
- [ ] Patient detail page
- [ ] Edit patient modal

### Phase 4: Appointments
- [ ] Appointment timeline
- [ ] New appointment page
- [ ] Appointment form
- [ ] Date/time picker

### Phase 5: Medical Records
- [ ] Appointment page layout
- [ ] Medical record form sections
- [ ] Symptoms section + modal
- [ ] Prescriptions section + modal
- [ ] Diagnosis input
- [ ] Auto-save functionality

### Phase 6: Transcription & AI
- [ ] Transcription panel
- [ ] Audio recorder component
- [ ] WebSocket integration
- [ ] Transcription display
- [ ] AI extraction status
- [ ] AI field indicators
- [ ] Accept/discard suggestions

### Phase 7: Polish
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Confirmation dialogs
- [ ] Unsaved changes guards

## File Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   ├── common/             # Shared components
│   ├── patients/           # Patient components
│   ├── appointments/       # Appointment components
│   ├── medical-records/    # Medical record components
│   └── transcription/      # Transcription components
├── pages/                  # Page components
├── hooks/
│   ├── queries/            # React Query hooks
│   └── [other hooks]
├── services/               # API services
├── store/                  # Zustand stores
├── schemas/                # Zod schemas
├── lib/                    # Utilities
├── types/                  # TypeScript types
├── router/                 # Router configuration
└── App.tsx                 # Root component
```

## Performance Considerations

1. **Code Splitting**: Lazy load pages with React.lazy
2. **Query Caching**: Configure stale times appropriately
3. **Debounced Search**: 300ms debounce on patient search
4. **Optimistic Updates**: For better perceived performance
5. **Virtual Lists**: For large patient/appointment lists
6. **Skeleton Loading**: Immediate visual feedback

## Accessibility Requirements

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in modals
- Screen reader announcements
- Color contrast compliance (WCAG 2.1 AA)

## Security Considerations

- JWT stored securely (httpOnly cookie preferred)
- Auth token in request headers
- Automatic logout on 401
- Input validation (client + server)
- XSS prevention (React default escaping)

## Documentation References

| Document | Purpose |
|----------|---------|
| [routing.md](routing.md) | Route definitions and guards |
| [state.md](state.md) | State management architecture |
| [api-integration.md](api-integration.md) | API client and services |
| [forms.md](forms.md) | Form validation schemas |
| [pages/*.md](pages/) | Page specifications |
| [components/*.md](components/) | Component specifications |

## Next Steps

After completing the frontend specification, proceed to:

1. **UI/UX Refinement** (Prompt 10) - Refine visual design and interactions
2. **Implementation** - Build components following this specification
3. **Testing** - Unit and integration tests
4. **Integration** - Connect with backend API
