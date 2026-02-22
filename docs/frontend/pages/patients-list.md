# Patients List Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/patients` |
| **Layout** | Authenticated (with sidebar) |
| **Protection** | Protected |
| **Title** | Lista de Pacientes |

## Description

The patients list page displays all registered patients in a searchable, paginated grid or list view. Users can search for patients, view quick info, and navigate to patient details or create new patients.

## Components Used

- `MainLayout` - Page wrapper with sidebar
- `Header` - Page header with title and actions
- `PatientSearch` - Search input with debounce
- `PatientCard` - Patient display card
- `PatientList` - List container
- `Pagination` - Page navigation
- `Button` (shadcn/ui) - New patient button
- `Card` (shadcn/ui) - Patient cards
- `EmptyState` - No results state
- `LoadingSpinner` - Loading state

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header: Pacientes                                [+ Nuevo Paciente]      │
├──────────┬───────────────────────────────────────────────────────────────┤
│          │                                                               │
│ ┌──────┐ │  ┌─────────────────────────────────────────────────────────┐  │
│ │ 🏠   │ │  │ 🔍  Buscar por nombre, teléfono o email...              │  │
│ │Dash  │ │  └─────────────────────────────────────────────────────────┘  │
│ └──────┘ │                                                               │
│          │  Mostrando 1-20 de 127 pacientes                              │
│ ┌──────┐ │                                                               │
│ │ 👥   │ │  ┌─────────────────────────────┐ ┌─────────────────────────┐  │
│ │Pcts  │ │  │ María García López          │ │ Juan Pérez Martínez     │  │
│ │ ●    │ │  │ ──────────────────────────  │ │ ──────────────────────  │  │
│ └──────┘ │  │ 📅 45 años • Femenino       │ │ 📅 38 años • Masculino  │  │
│          │  │ 📱 +52 555 123 4567         │ │ 📱 +52 555 987 6543     │  │
│          │  │ 📧 maria@email.com          │ │ 📧 juan@email.com       │  │
│          │  │                             │ │                         │  │
│          │  │ Última cita: 15 Ene 2024    │ │ Última cita: 10 Ene 2024│  │
│          │  │ Total citas: 5              │ │ Total citas: 3          │  │
│          │  └─────────────────────────────┘ └─────────────────────────┘  │
│          │                                                               │
│          │  ┌─────────────────────────────┐ ┌─────────────────────────┐  │
│          │  │ Ana Rodríguez Sánchez       │ │ Carlos López Fernández  │  │
│          │  │ ──────────────────────────  │ │ ──────────────────────  │  │
│          │  │ 📅 62 años • Femenino       │ │ 📅 29 años • Masculino  │  │
│          │  │ 📱 +52 555 456 7890         │ │ 📱 +52 555 321 0987     │  │
│          │  │ 📧 ana@email.com            │ │ 📧 carlos@email.com     │  │
│          │  │                             │ │                         │  │
│          │  │ Última cita: 8 Ene 2024     │ │ Última cita: 5 Ene 2024 │  │
│          │  │ Total citas: 12             │ │ Total citas: 2          │  │
│          │  └─────────────────────────────┘ └─────────────────────────┘  │
│          │                                                               │
│          │  ┌─────────────────────────────────────────────────────────┐  │
│          │  │              [◀ Anterior]  1  2  3  ...  7  [Siguiente ▶] │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
└──────────┴───────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface PatientsListPageState {
  // Query state
  search: string;
  page: number;
  limit: number;

  // Data (from React Query)
  patients: Patient[];
  totalCount: number;
  totalPages: number;

  // UI state
  isLoading: boolean;
  error: string | null;
}
```

## URL Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | `''` | Search query |
| `page` | number | `1` | Current page |
| `limit` | number | `20` | Items per page |

Example: `/patients?search=maria&page=2&limit=20`

## API Integration

```typescript
// Patient list query
const { data, isLoading, error } = useQuery({
  queryKey: ['patients', { search, page, limit }],
  queryFn: () => patientsApi.list({ search, page, limit }),
  keepPreviousData: true, // Smooth pagination
});

// Debounced search
const debouncedSearch = useDebouncedValue(search, 300);
```

## Behavior

### Search
- Debounced input (300ms delay)
- Searches by: first name, last name, phone, email
- Case-insensitive, partial matching
- Resets to page 1 on new search
- Updates URL query parameter

### Pagination
- 20 items per page (configurable)
- Shows current range (e.g., "1-20 de 127")
- Previous/Next buttons
- Page number buttons (smart truncation)
- Updates URL query parameter

### Patient Card Actions
- Click card → Navigate to `/patients/:patientId`
- Shows: name, age, gender, contact, last appointment, total appointments

### New Patient Button
- Click → Navigate to `/patients/new`

## Empty States

### No Patients Registered
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    👥                                   │
│                                                         │
│           No hay pacientes registrados                  │
│                                                         │
│   Registra tu primer paciente para comenzar.            │
│                                                         │
│              [+ Registrar Paciente]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### No Search Results
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    🔍                                   │
│                                                         │
│    No se encontraron pacientes para "búsqueda"          │
│                                                         │
│   Intenta con otro término de búsqueda o               │
│   registra un nuevo paciente.                           │
│                                                         │
│       [Limpiar Búsqueda]  [+ Nuevo Paciente]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Loading State

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍  Buscar por nombre, teléfono o email...                      │
└─────────────────────────────────────────────────────────────────┘

  ┌───────────────────────┐ ┌───────────────────────┐
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  └───────────────────────┘ └───────────────────────┘

  ┌───────────────────────┐ ┌───────────────────────┐
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  │ ░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░ │
  └───────────────────────┘ └───────────────────────┘

Skeleton cards displayed while loading
```

## Responsive Design

### Desktop (>1024px)
- 2-3 patient cards per row
- Full sidebar visible

### Tablet (768-1024px)
- 2 patient cards per row
- Sidebar collapsible

### Mobile (<768px)
- 1 patient card per row
- Search bar full width
- Simplified pagination (Prev/Next only)
- Sidebar hidden

## Keyboard Navigation

- `/` or `Ctrl+K` → Focus search input
- `Tab` → Navigate between cards
- `Enter` on card → Open patient detail
- `Esc` → Clear search focus

## Accessibility

- Search input with proper label
- Patient cards are buttons with accessible names
- Pagination has aria-labels for navigation
- Loading state announced to screen readers
- Result count announced on change

## Performance Considerations

- Debounced search (300ms) to reduce API calls
- `keepPreviousData` for smooth pagination
- Skeleton loading for perceived performance
- Virtual scrolling for large lists (>100 items) - optional

## Code Structure

```
src/pages/PatientsPage/
├── index.tsx              # Main component
├── PatientSearch.tsx      # Search input component
├── PatientGrid.tsx        # Grid container
├── PatientCard.tsx        # Individual patient card
├── Pagination.tsx         # Pagination controls
├── EmptyState.tsx         # Empty/no results state
└── usePatientsList.ts     # Data fetching hook
```
