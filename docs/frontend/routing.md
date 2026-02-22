# Frontend Routing Specification

## Overview

This document defines the routing structure for MedRecord AI, including route definitions, authentication guards, layout wrappers, and navigation configuration.

## Route Definitions

```typescript
// src/router/routes.ts

import { lazy } from 'react';

// Lazy-loaded page components
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PatientsPage = lazy(() => import('@/pages/PatientsPage'));
const NewPatientPage = lazy(() => import('@/pages/NewPatientPage'));
const PatientDetailPage = lazy(() => import('@/pages/PatientDetailPage'));
const NewAppointmentPage = lazy(() => import('@/pages/NewAppointmentPage'));
const AppointmentPage = lazy(() => import('@/pages/AppointmentPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.FC>;
  layout: 'public' | 'authenticated';
  protected: boolean;
  breadcrumb?: string;
  title: string;
}

export const routes: RouteConfig[] = [
  // Public Routes
  {
    path: '/login',
    component: LoginPage,
    layout: 'public',
    protected: false,
    title: 'Iniciar Sesión',
  },

  // Protected Routes
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    layout: 'authenticated',
    protected: true,
    breadcrumb: 'Dashboard',
    title: 'Dashboard',
  },
  {
    path: '/patients',
    component: PatientsPage,
    layout: 'authenticated',
    protected: true,
    breadcrumb: 'Pacientes',
    title: 'Lista de Pacientes',
  },
  {
    path: '/patients/new',
    component: NewPatientPage,
    layout: 'authenticated',
    protected: true,
    breadcrumb: 'Nuevo Paciente',
    title: 'Registrar Paciente',
  },
  {
    path: '/patients/:patientId',
    component: PatientDetailPage,
    layout: 'authenticated',
    protected: true,
    breadcrumb: ':patientName',
    title: 'Detalle de Paciente',
  },
  {
    path: '/patients/:patientId/appointments/new',
    component: NewAppointmentPage,
    layout: 'authenticated',
    protected: true,
    breadcrumb: 'Nueva Cita',
    title: 'Agendar Cita',
  },
  {
    path: '/appointments/:appointmentId',
    component: AppointmentPage,
    layout: 'authenticated',
    protected: true,
    breadcrumb: 'Cita',
    title: 'Consulta Médica',
  },

  // 404 Fallback
  {
    path: '*',
    component: NotFoundPage,
    layout: 'public',
    protected: false,
    title: 'Página No Encontrada',
  },
];
```

## Route Guards

### Authentication Guard

```typescript
// src/router/guards/AuthGuard.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

### Guest Guard (Redirect authenticated users away from login)

```typescript
// src/router/guards/GuestGuard.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated) {
    // Redirect to intended destination or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
```

## Layout Wrappers

### Layout Selection

```typescript
// src/router/layouts/LayoutWrapper.tsx

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface LayoutWrapperProps {
  layout: 'public' | 'authenticated';
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ layout }) => {
  const Layout = layout === 'authenticated' ? MainLayout : PublicLayout;

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
};
```

## Router Configuration

```typescript
// src/router/index.tsx

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';
import { LayoutWrapper } from './layouts/LayoutWrapper';
import { routes } from './routes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const router = createBrowserRouter([
  // Public layout routes
  {
    element: (
      <GuestGuard>
        <LayoutWrapper layout="public" />
      </GuestGuard>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: '/login',
        lazy: () => import('@/pages/LoginPage'),
      },
    ],
  },

  // Authenticated layout routes
  {
    element: (
      <AuthGuard>
        <LayoutWrapper layout="authenticated" />
      </AuthGuard>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        lazy: () => import('@/pages/DashboardPage'),
      },
      {
        path: '/patients',
        lazy: () => import('@/pages/PatientsPage'),
      },
      {
        path: '/patients/new',
        lazy: () => import('@/pages/NewPatientPage'),
      },
      {
        path: '/patients/:patientId',
        lazy: () => import('@/pages/PatientDetailPage'),
      },
      {
        path: '/patients/:patientId/appointments/new',
        lazy: () => import('@/pages/NewAppointmentPage'),
      },
      {
        path: '/appointments/:appointmentId',
        lazy: () => import('@/pages/AppointmentPage'),
      },
    ],
  },

  // 404 fallback
  {
    path: '*',
    lazy: () => import('@/pages/NotFoundPage'),
  },
]);
```

## Breadcrumb Configuration

```typescript
// src/router/breadcrumbs.ts

export interface BreadcrumbConfig {
  path: string;
  label: string | ((params: Record<string, string>) => string);
  parent?: string;
}

export const breadcrumbConfig: BreadcrumbConfig[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
  },
  {
    path: '/patients',
    label: 'Pacientes',
    parent: '/dashboard',
  },
  {
    path: '/patients/new',
    label: 'Nuevo Paciente',
    parent: '/patients',
  },
  {
    path: '/patients/:patientId',
    label: (params) => params.patientName || 'Paciente',
    parent: '/patients',
  },
  {
    path: '/patients/:patientId/appointments/new',
    label: 'Nueva Cita',
    parent: '/patients/:patientId',
  },
  {
    path: '/appointments/:appointmentId',
    label: 'Consulta',
    parent: '/patients/:patientId',
  },
];

// Breadcrumb hook
// src/hooks/useBreadcrumbs.ts
import { useMatches, useParams } from 'react-router-dom';
import { breadcrumbConfig } from '@/router/breadcrumbs';

interface Breadcrumb {
  path: string;
  label: string;
}

export const useBreadcrumbs = (): Breadcrumb[] => {
  const matches = useMatches();
  const params = useParams();

  // Build breadcrumb trail based on current route
  // Implementation resolves dynamic labels from params
  // Returns array of { path, label } objects
};
```

## Navigation Structure

### Sidebar Navigation Items

```typescript
// src/router/navigation.ts

import {
  LayoutDashboard,
  Users,
  Settings,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const sidebarNavItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/patients',
    label: 'Pacientes',
    icon: Users,
  },
];

export const bottomNavItems: NavItem[] = [
  {
    path: '/settings',
    label: 'Configuración',
    icon: Settings,
  },
];
```

### Navigation Hook

```typescript
// src/hooks/useNavigation.ts

import { useNavigate, useLocation } from 'react-router-dom';

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    // Navigate to patient list
    toPatients: () => navigate('/patients'),

    // Navigate to patient detail
    toPatient: (patientId: string) => navigate(`/patients/${patientId}`),

    // Navigate to new patient form
    toNewPatient: () => navigate('/patients/new'),

    // Navigate to appointment
    toAppointment: (appointmentId: string) =>
      navigate(`/appointments/${appointmentId}`),

    // Navigate to new appointment for a patient
    toNewAppointment: (patientId: string) =>
      navigate(`/patients/${patientId}/appointments/new`),

    // Navigate back
    goBack: () => navigate(-1),

    // Check if current path matches
    isActive: (path: string) => location.pathname === path,

    // Check if current path starts with
    isActiveSection: (path: string) => location.pathname.startsWith(path),
  };
};
```

## Route Transition Handling

### Unsaved Changes Guard

```typescript
// src/hooks/useUnsavedChangesGuard.ts

import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseUnsavedChangesGuardOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

export const useUnsavedChangesGuard = ({
  hasUnsavedChanges,
  message = '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
}: UseUnsavedChangesGuardOptions) => {
  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  return blocker;
};
```

## URL Parameters

| Route | Parameters | Usage |
|-------|------------|-------|
| `/patients/:patientId` | `patientId` | Patient UUID |
| `/patients/:patientId/appointments/new` | `patientId` | Patient UUID for new appointment |
| `/appointments/:appointmentId` | `appointmentId` | Appointment UUID |

## Query Parameters

| Route | Query Params | Usage |
|-------|--------------|-------|
| `/patients` | `search`, `page`, `limit` | Patient list filtering |
| `/patients/:patientId` | `tab` | Active tab (info, appointments, history) |
| `/appointments/:appointmentId` | `panel` | Panel visibility (transcription) |

## Route Loading States

All lazy-loaded routes display a loading spinner during chunk loading. The `Suspense` boundary in `LayoutWrapper` handles this automatically.

```typescript
// Loading fallback component
<Suspense fallback={<LoadingSpinner />}>
  <Outlet />
</Suspense>
```

## Error Handling

Route-level errors are caught by the `ErrorBoundary` component, which displays a user-friendly error page with options to:
- Retry the current page
- Navigate to dashboard
- Contact support
