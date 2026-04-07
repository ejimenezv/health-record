# State Management Specification

## Overview

This document defines the state management architecture for MedRecord AI. The application uses a combination of:

- **Zustand** - For global client state (auth, UI preferences)
- **React Query (TanStack Query)** - For server state (data fetching, caching, mutations)
- **React Context** - For component-level shared state
- **Local State** - For component-specific UI state

## State Categories

| Category | Tool | Examples |
|----------|------|----------|
| Server State | React Query | Patients, appointments, medical records |
| Auth State | Zustand | User session, token, permissions |
| UI State | Zustand/Context | Sidebar, modals, preferences |
| Form State | React Hook Form | Form inputs, validation |
| Local State | useState | Component-specific toggles |

## Zustand Stores

### Auth Store

Manages authentication state and user session.

```typescript
// src/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      // Login action
      login: async (email: string, password: string) => {
        try {
          const response = await authApi.login({ email, password });
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        // Clear React Query cache
        queryClient.clear();
      },

      // Load user from token
      loadUser: async () => {
        const token = get().token;
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // Token invalid, clear auth
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Update user
      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },

      // Set token (for external auth flows)
      setToken: (token) => {
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
```

### UI Store

Manages global UI state and preferences.

```typescript
// src/store/uiStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme (future)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Transcription panel
  transcriptionPanelOpen: boolean;
  setTranscriptionPanelOpen: (open: boolean) => void;

  // Notifications
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Transcription panel
      transcriptionPanelOpen: true,
      setTranscriptionPanelOpen: (open) =>
        set({ transcriptionPanelOpen: open }),

      // Notifications
      unreadNotifications: 0,
      setUnreadNotifications: (count) =>
        set({ unreadNotifications: count }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
```

### Transcription Store

Manages transcription session state.

```typescript
// src/store/transcriptionStore.ts

import { create } from 'zustand';

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

type TranscriptionStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'completed'
  | 'error';

interface TranscriptionState {
  // Session state
  sessionId: string | null;
  appointmentId: string | null;

  // Recording state
  isRecording: boolean;
  duration: number;
  status: TranscriptionStatus;

  // Transcription data
  transcription: string;
  segments: TranscriptionSegment[];

  // AI extraction
  extractionStatus: {
    symptoms: 'pending' | 'processing' | 'done' | 'error';
    diagnosis: 'pending' | 'processing' | 'done' | 'error';
    prescriptions: 'pending' | 'processing' | 'done' | 'error';
  };

  // Error
  error: string | null;

  // Actions
  startSession: (appointmentId: string, sessionId: string) => void;
  setRecording: (isRecording: boolean) => void;
  setDuration: (duration: number) => void;
  setStatus: (status: TranscriptionStatus) => void;
  appendTranscription: (text: string, segment?: TranscriptionSegment) => void;
  setExtractionStatus: (
    field: 'symptoms' | 'diagnosis' | 'prescriptions',
    status: 'pending' | 'processing' | 'done' | 'error'
  ) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  appointmentId: null,
  isRecording: false,
  duration: 0,
  status: 'idle' as TranscriptionStatus,
  transcription: '',
  segments: [],
  extractionStatus: {
    symptoms: 'pending' as const,
    diagnosis: 'pending' as const,
    prescriptions: 'pending' as const,
  },
  error: null,
};

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  ...initialState,

  startSession: (appointmentId, sessionId) =>
    set({
      appointmentId,
      sessionId,
      status: 'idle',
      transcription: '',
      segments: [],
      error: null,
    }),

  setRecording: (isRecording) =>
    set({
      isRecording,
      status: isRecording ? 'recording' : 'processing',
    }),

  setDuration: (duration) => set({ duration }),

  setStatus: (status) => set({ status }),

  appendTranscription: (text, segment) =>
    set((state) => ({
      transcription: state.transcription + text,
      segments: segment
        ? [...state.segments, segment]
        : state.segments,
    })),

  setExtractionStatus: (field, status) =>
    set((state) => ({
      extractionStatus: {
        ...state.extractionStatus,
        [field]: status,
      },
    })),

  setError: (error) =>
    set({
      error,
      status: error ? 'error' : 'idle',
    }),

  reset: () => set(initialState),
}));
```

## React Query Configuration

### Query Client Setup

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30 seconds
      staleTime: 30 * 1000,
      // Cache time: 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed queries 3 times
      retry: 3,
      // Don't retry on 4xx errors
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});
```

### Query Keys

```typescript
// src/lib/queryKeys.ts

export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
  },

  // Patients
  patients: {
    all: ['patients'] as const,
    list: (params?: { search?: string; page?: number }) =>
      ['patients', 'list', params] as const,
    detail: (id: string) => ['patients', 'detail', id] as const,
    appointments: (patientId: string) =>
      ['patients', patientId, 'appointments'] as const,
  },

  // Appointments
  appointments: {
    all: ['appointments'] as const,
    list: (params?: { date?: string; status?: string }) =>
      ['appointments', 'list', params] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
  },

  // Medical Records
  medicalRecords: {
    byAppointment: (appointmentId: string) =>
      ['medicalRecords', 'appointment', appointmentId] as const,
  },

  // Dashboard
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    recentPatients: ['dashboard', 'recentPatients'] as const,
  },
};
```

## Query Hooks

### Patient Queries

```typescript
// src/hooks/queries/usePatients.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { patientsApi } from '@/services/patients.api';

// List patients
export const usePatients = (params?: { search?: string; page?: number }) => {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => patientsApi.list(params),
    keepPreviousData: true,
  });
};

// Get single patient
export const usePatient = (id: string) => {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
};

// Get patient appointments
export const usePatientAppointments = (patientId: string) => {
  return useInfiniteQuery({
    queryKey: queryKeys.patients.appointments(patientId),
    queryFn: ({ pageParam = 1 }) =>
      patientsApi.getAppointments(patientId, { page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!patientId,
  });
};

// Create patient
export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
};

// Update patient
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientData }) =>
      patientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patients.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
};

// Delete patient
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
};
```

### Appointment Queries

```typescript
// src/hooks/queries/useAppointments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { appointmentsApi } from '@/services/appointments.api';

// Get single appointment with medical record
export const useAppointment = (id: string) => {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => appointmentsApi.getById(id),
    enabled: !!id,
  });
};

// Create appointment
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patients.appointments(variables.patientId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
};

// Update appointment status
export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(variables.id),
      });
    },
  });
};
```

### Medical Record Queries

```typescript
// src/hooks/queries/useMedicalRecord.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { medicalRecordsApi } from '@/services/medicalRecords.api';

// Get medical record for appointment
export const useMedicalRecord = (appointmentId: string) => {
  return useQuery({
    queryKey: queryKeys.medicalRecords.byAppointment(appointmentId),
    queryFn: () => medicalRecordsApi.getByAppointment(appointmentId),
    enabled: !!appointmentId,
  });
};

// Save medical record (create or update)
export const useSaveMedicalRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: SaveMedicalRecordData;
    }) => medicalRecordsApi.save(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.medicalRecords.byAppointment(variables.appointmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(variables.appointmentId),
      });
    },
  });
};

// Complete medical record
export const useCompleteMedicalRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) =>
      medicalRecordsApi.complete(appointmentId),
    onSuccess: (_, appointmentId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.medicalRecords.byAppointment(appointmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointmentId),
      });
    },
  });
};
```

## Context Providers

### App Providers Setup

```typescript
// src/providers/AppProviders.tsx

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/lib/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
```

### Auth Initialization

```typescript
// src/App.tsx

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppProviders } from '@/providers/AppProviders';
import { router } from '@/router';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const App: React.FC = () => {
  const { loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};
```

## Optimistic Updates

Example of optimistic update for better UX:

```typescript
// Optimistic delete example
export const useDeleteSymptom = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symptomId: string) =>
      medicalRecordsApi.deleteSymptom(appointmentId, symptomId),

    // Optimistically update the cache
    onMutate: async (symptomId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.medicalRecords.byAppointment(appointmentId),
      });

      // Snapshot previous value
      const previousRecord = queryClient.getQueryData(
        queryKeys.medicalRecords.byAppointment(appointmentId)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.medicalRecords.byAppointment(appointmentId),
        (old: MedicalRecord) => ({
          ...old,
          symptoms: old.symptoms.filter((s) => s.id !== symptomId),
        })
      );

      // Return context for rollback
      return { previousRecord };
    },

    // Rollback on error
    onError: (_, __, context) => {
      if (context?.previousRecord) {
        queryClient.setQueryData(
          queryKeys.medicalRecords.byAppointment(appointmentId),
          context.previousRecord
        );
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.medicalRecords.byAppointment(appointmentId),
      });
    },
  });
};
```

## Auto-Save Implementation

```typescript
// src/hooks/useAutoSave.ts

import { useEffect, useRef, useCallback } from 'react';
import { useSaveMedicalRecord } from '@/hooks/queries/useMedicalRecord';

interface UseAutoSaveOptions {
  appointmentId: string;
  data: MedicalRecord;
  enabled: boolean;
  interval?: number; // milliseconds
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export const useAutoSave = ({
  appointmentId,
  data,
  enabled,
  interval = 30000, // 30 seconds
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: UseAutoSaveOptions) => {
  const { mutateAsync: save } = useSaveMedicalRecord();
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const intervalRef = useRef<number | null>(null);

  const performSave = useCallback(async () => {
    const currentData = JSON.stringify(data);

    // Only save if data has changed
    if (currentData === lastSavedRef.current) {
      return;
    }

    try {
      onSaveStart?.();
      await save({ appointmentId, data });
      lastSavedRef.current = currentData;
      onSaveComplete?.();
    } catch (error) {
      onSaveError?.(error as Error);
    }
  }, [appointmentId, data, save, onSaveStart, onSaveComplete, onSaveError]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(performSave, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, performSave]);

  // Force save (for manual trigger)
  const forceSave = useCallback(() => {
    return performSave();
  }, [performSave]);

  return { forceSave };
};
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Application State                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐   │
│  │   Auth Store   │    │   UI Store     │    │ Transcription  │   │
│  │   (Zustand)    │    │   (Zustand)    │    │    Store       │   │
│  │                │    │                │    │   (Zustand)    │   │
│  │ - user         │    │ - sidebar      │    │                │   │
│  │ - token        │    │ - theme        │    │ - isRecording  │   │
│  │ - isAuth       │    │ - panelOpen    │    │ - transcription│   │
│  └────────────────┘    └────────────────┘    │ - extraction   │   │
│                                               └────────────────┘   │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   React Query Cache                          │   │
│  │                   (Server State)                             │   │
│  │                                                              │   │
│  │  patients: { list: [...], detail: {...} }                   │   │
│  │  appointments: { list: [...], detail: {...} }               │   │
│  │  medicalRecords: { byAppointment: {...} }                   │   │
│  │  dashboard: { stats: {...}, recentPatients: [...] }         │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐   │
│  │  Form State    │    │  Local State   │    │  URL State     │   │
│  │ (react-hook-   │    │  (useState)    │    │ (router)       │   │
│  │    form)       │    │                │    │                │   │
│  │                │    │ - modals       │    │ - params       │   │
│  │ - inputs       │    │ - toggles      │    │ - search       │   │
│  │ - validation   │    │ - selections   │    │ - page         │   │
│  └────────────────┘    └────────────────┘    └────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. State Location Decision

| If the state... | Use... |
|-----------------|--------|
| Comes from server | React Query |
| Persists across sessions | Zustand with persist |
| Is shared globally | Zustand |
| Is shared in subtree | Context |
| Is local to component | useState |
| Is form-related | React Hook Form |
| Is in URL | Router state |

### 2. Avoid Redundant State

- Don't duplicate server state in Zustand
- Use React Query's cache as single source of truth
- Derive computed values instead of storing them

### 3. Mutation Patterns

- Always invalidate related queries after mutations
- Use optimistic updates for better UX
- Handle errors gracefully with rollback

### 4. Performance

- Use selective subscriptions with Zustand
- Configure appropriate stale times for queries
- Avoid over-fetching with enabled options
