# Dashboard Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/dashboard` |
| **Layout** | Authenticated (with sidebar) |
| **Protection** | Protected |
| **Title** | Dashboard |

## Description

The dashboard serves as the landing page for authenticated users, providing an overview of recent activity and quick access to common actions. It displays statistics, recent patients, and quick action buttons.

## Components Used

- `MainLayout` - Page wrapper with sidebar
- `Header` - Page header with title
- `Card` (shadcn/ui) - Stat cards and sections
- `Button` (shadcn/ui) - Quick action buttons
- `PatientCard` - Recent patient display
- `LoadingSpinner` - Loading state

## Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header: Dashboard                                         [User Menu ▼]  │
├──────────┬───────────────────────────────────────────────────────────────┤
│          │                                                               │
│ ┌──────┐ │  Bienvenido, Dr. García                                       │
│ │ 🏠   │ │                                                               │
│ │Dash  │ │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│ └──────┘ │  │ 📊 Pacientes    │ │ 📅 Citas Hoy    │ │ 📝 Pendientes   │  │
│          │  │                 │ │                 │ │                 │  │
│ ┌──────┐ │  │      127        │ │       5         │ │       3         │  │
│ │ 👥   │ │  │   Total         │ │  Programadas    │ │  Sin Completar  │  │
│ │Pcts  │ │  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│ └──────┘ │                                                               │
│          │  ┌───────────────────────────────────────────────────────────┐│
│          │  │ Acciones Rápidas                                          ││
│          │  │                                                           ││
│          │  │  ┌──────────────────┐  ┌──────────────────┐               ││
│          │  │  │ + Nuevo Paciente │  │ + Nueva Cita     │               ││
│          │  │  └──────────────────┘  └──────────────────┘               ││
│          │  └───────────────────────────────────────────────────────────┘│
│          │                                                               │
│          │  ┌───────────────────────────────────────────────────────────┐│
│          │  │ Pacientes Recientes                          [Ver Todos →]││
│          │  │                                                           ││
│          │  │  ┌─────────────────────┐ ┌─────────────────────┐          ││
│          │  │  │ María García        │ │ Juan Pérez          │          ││
│          │  │  │ Última cita: Hoy    │ │ Última cita: Ayer   │          ││
│          │  │  │ Tel: 555-0123       │ │ Tel: 555-0456       │          ││
│          │  │  └─────────────────────┘ └─────────────────────┘          ││
│          │  │                                                           ││
│          │  │  ┌─────────────────────┐ ┌─────────────────────┐          ││
│          │  │  │ Ana Rodríguez       │ │ Carlos López        │          ││
│          │  │  │ Última cita: 2 días │ │ Última cita: 1 sem  │          ││
│          │  │  │ Tel: 555-0789       │ │ Tel: 555-0321       │          ││
│          │  │  └─────────────────────┘ └─────────────────────┘          ││
│          │  └───────────────────────────────────────────────────────────┘│
│          │                                                               │
└──────────┴───────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface DashboardPageState {
  // Data
  stats: {
    totalPatients: number;
    todayAppointments: number;
    pendingRecords: number;
  };
  recentPatients: Patient[];

  // UI state
  isLoading: boolean;
  error: string | null;
}
```

## Data Requirements

### Statistics
- Total patient count
- Today's appointment count
- Appointments with incomplete records

### Recent Patients
- Last 4-6 patients with appointments
- Sorted by last appointment date (newest first)

## API Integration

```typescript
// Dashboard data query
const { data: dashboardData, isLoading } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => Promise.all([
    patientsApi.getStats(),
    patientsApi.list({ limit: 6, sort: 'lastAppointment' }),
  ]),
});

// Note: If no dedicated dashboard endpoint exists, compose from:
// - GET /api/v1/patients?limit=6&sort=lastAppointment
// - GET /api/v1/appointments?date=today
```

## Behavior

### On Mount
1. Fetch dashboard statistics
2. Fetch recent patients list
3. Display loading state while fetching

### Quick Actions
- "Nuevo Paciente" → Navigate to `/patients/new`
- "Nueva Cita" → Navigate to patient selection or `/patients` with intent

### Patient Cards
- Click → Navigate to `/patients/:patientId`
- Show name, last appointment date, contact info

### Statistics Cards
- Patients card click → Navigate to `/patients`
- Appointments card click → (Future) Navigate to today's appointments
- Pending card click → (Future) Show incomplete records

## Empty States

### No Recent Patients
```
┌─────────────────────────────────────────────┐
│ Pacientes Recientes                         │
│                                             │
│     Aún no hay pacientes registrados.       │
│                                             │
│     [+ Registrar Primer Paciente]           │
└─────────────────────────────────────────────┘
```

## Loading State

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ ░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░ │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Skeleton cards displayed while loading
```

## Responsive Design

### Desktop (>1024px)
- 3 stat cards in row
- 2-3 patient cards per row

### Tablet (768-1024px)
- 3 stat cards in row
- 2 patient cards per row
- Sidebar collapsible

### Mobile (<768px)
- Stat cards stack vertically
- 1 patient card per row
- Sidebar hidden (hamburger menu)

## Accessibility

- Statistics cards are focusable with keyboard
- Patient cards are clickable buttons (not divs)
- Skip link to main content area
- Proper heading hierarchy (h1 for welcome, h2 for sections)

## Refresh Behavior

- Data refreshes on page mount
- Pull-to-refresh on mobile (optional)
- Stale-while-revalidate pattern with React Query

## Code Structure

```
src/pages/DashboardPage/
├── index.tsx              # Main component
├── StatCard.tsx           # Statistics card component
├── RecentPatients.tsx     # Recent patients section
├── QuickActions.tsx       # Quick action buttons
└── useDashboard.ts        # Dashboard data hook
```
