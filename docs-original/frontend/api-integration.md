# API Integration Specification

## Overview

This document defines the API integration patterns for MedRecord AI frontend, including the HTTP client setup, service definitions, error handling, and WebSocket integration.

## HTTP Client Setup

### Axios Configuration

```typescript
// src/lib/api.ts

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Transform error for consistent handling
    const apiError = transformError(error);
    return Promise.reject(apiError);
  }
);
```

### Error Handling

```typescript
// src/lib/errors.ts

export interface ApiError {
  status: number;
  code: string;
  message: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  errors?: FieldError[];
}

export const transformError = (error: AxiosError<ApiErrorResponse>): ApiError => {
  if (error.response) {
    const { status, data } = error.response;

    return {
      status,
      code: getErrorCode(status),
      message: data?.message || getDefaultMessage(status),
      errors: data?.errors,
    };
  }

  if (error.request) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Error de conexión. Verifica tu conexión a internet.',
    };
  }

  return {
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: 'Ocurrió un error inesperado.',
  };
};

const getErrorCode = (status: number): string => {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'SERVER_ERROR',
  };
  return codes[status] || 'UNKNOWN_ERROR';
};

const getDefaultMessage = (status: number): string => {
  const messages: Record<number, string> = {
    400: 'Solicitud inválida.',
    401: 'Sesión expirada. Inicia sesión nuevamente.',
    403: 'No tienes permisos para esta acción.',
    404: 'Recurso no encontrado.',
    409: 'Conflicto con el estado actual.',
    422: 'Datos de entrada inválidos.',
    429: 'Demasiadas solicitudes. Espera un momento.',
    500: 'Error del servidor. Intenta más tarde.',
  };
  return messages[status] || 'Ocurrió un error.';
};

// Hook for displaying errors
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && 'status' in error) {
    return (error as ApiError).message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
};
```

## API Service Definitions

### Auth Service

```typescript
// src/services/auth.api.ts

import { api } from '@/lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  // Register new user
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await api.post<{ data: LoginResponse }>('/auth/register', data);
    return response.data.data;
  },

  // Login
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<{ data: LoginResponse }>('/auth/login', data);
    return response.data.data;
  },

  // Get current user
  me: async (): Promise<User> => {
    const response = await api.get<{ data: User }>('/auth/me');
    return response.data.data;
  },

  // Update profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch<{ data: User }>('/auth/profile', data);
    return response.data.data;
  },
};
```

### Patients Service

```typescript
// src/services/patients.api.ts

import { api } from '@/lib/api';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
  allergies: Allergy[];
  chronicConditions: ChronicCondition[];
  appointmentCount: number;
  lastAppointmentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
}

export interface PatientListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const patientsApi = {
  // List patients with search and pagination
  list: async (params?: PatientListParams): Promise<PaginatedResponse<Patient>> => {
    const response = await api.get<{ data: PaginatedResponse<Patient> }>('/patients', {
      params,
    });
    return response.data.data;
  },

  // Get single patient
  getById: async (id: string): Promise<Patient> => {
    const response = await api.get<{ data: Patient }>(`/patients/${id}`);
    return response.data.data;
  },

  // Create patient
  create: async (data: CreatePatientRequest): Promise<Patient> => {
    const response = await api.post<{ data: Patient }>('/patients', data);
    return response.data.data;
  },

  // Update patient
  update: async (id: string, data: Partial<CreatePatientRequest>): Promise<Patient> => {
    const response = await api.put<{ data: Patient }>(`/patients/${id}`, data);
    return response.data.data;
  },

  // Delete patient (soft delete)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },

  // Get patient appointments
  getAppointments: async (
    patientId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Appointment>> => {
    const response = await api.get<{ data: PaginatedResponse<Appointment> }>(
      `/patients/${patientId}/appointments`,
      { params }
    );
    return response.data.data;
  },

  // Add allergy
  addAllergy: async (patientId: string, allergy: CreateAllergyRequest): Promise<Allergy> => {
    const response = await api.post<{ data: Allergy }>(
      `/patients/${patientId}/allergies`,
      allergy
    );
    return response.data.data;
  },

  // Add chronic condition
  addCondition: async (
    patientId: string,
    condition: CreateConditionRequest
  ): Promise<ChronicCondition> => {
    const response = await api.post<{ data: ChronicCondition }>(
      `/patients/${patientId}/conditions`,
      condition
    );
    return response.data.data;
  },
};
```

### Appointments Service

```typescript
// src/services/appointments.api.ts

import { api } from '@/lib/api';

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentType =
  | 'new_patient'
  | 'follow_up'
  | 'routine_checkup'
  | 'sick_visit'
  | 'telehealth';

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  scheduledAt: string;
  appointmentType: AppointmentType;
  duration: number;
  reason?: string;
  status: AppointmentStatus;
  medicalRecord?: MedicalRecord;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  scheduledAt: string;
  appointmentType: AppointmentType;
  duration?: number;
  reason?: string;
}

export const appointmentsApi = {
  // List appointments
  list: async (params?: {
    date?: string;
    status?: AppointmentStatus;
    page?: number;
  }): Promise<PaginatedResponse<Appointment>> => {
    const response = await api.get<{ data: PaginatedResponse<Appointment> }>(
      '/appointments',
      { params }
    );
    return response.data.data;
  },

  // Get single appointment with patient and medical record
  getById: async (id: string): Promise<Appointment> => {
    const response = await api.get<{ data: Appointment }>(`/appointments/${id}`);
    return response.data.data;
  },

  // Create appointment
  create: async (data: CreateAppointmentRequest): Promise<Appointment> => {
    const response = await api.post<{ data: Appointment }>('/appointments', data);
    return response.data.data;
  },

  // Update appointment
  update: async (
    id: string,
    data: Partial<CreateAppointmentRequest>
  ): Promise<Appointment> => {
    const response = await api.put<{ data: Appointment }>(`/appointments/${id}`, data);
    return response.data.data;
  },

  // Update status
  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const response = await api.patch<{ data: Appointment }>(
      `/appointments/${id}/status`,
      { status }
    );
    return response.data.data;
  },

  // Cancel appointment
  cancel: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },
};
```

### Medical Records Service

```typescript
// src/services/medicalRecords.api.ts

import { api } from '@/lib/api';

export interface MedicalRecord {
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
  transcriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Symptom {
  id: string;
  name: string;
  bodySite?: string;
  severity?: number;
  duration?: string;
  notes?: string;
  isAISuggested: boolean;
}

export interface Prescription {
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

export interface SaveMedicalRecordRequest {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  symptoms?: Symptom[];
  physicalExamNotes?: string;
  diagnosis?: string;
  diagnosisNotes?: string;
  prescriptions?: Prescription[];
  treatmentPlan?: string;
  followUpInstructions?: string;
  patientEducation?: string;
}

export const medicalRecordsApi = {
  // Get medical record for appointment
  getByAppointment: async (appointmentId: string): Promise<MedicalRecord | null> => {
    try {
      const response = await api.get<{ data: MedicalRecord }>(
        `/appointments/${appointmentId}/record`
      );
      return response.data.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Save (create or update) medical record
  save: async (
    appointmentId: string,
    data: SaveMedicalRecordRequest
  ): Promise<MedicalRecord> => {
    const response = await api.put<{ data: MedicalRecord }>(
      `/appointments/${appointmentId}/record`,
      data
    );
    return response.data.data;
  },

  // Partial update
  patch: async (
    appointmentId: string,
    data: Partial<SaveMedicalRecordRequest>
  ): Promise<MedicalRecord> => {
    const response = await api.patch<{ data: MedicalRecord }>(
      `/appointments/${appointmentId}/record`,
      data
    );
    return response.data.data;
  },

  // Complete medical record
  complete: async (appointmentId: string): Promise<MedicalRecord> => {
    const response = await api.post<{ data: MedicalRecord }>(
      `/appointments/${appointmentId}/record/complete`
    );
    return response.data.data;
  },

  // Symptom operations
  addSymptom: async (appointmentId: string, symptom: Omit<Symptom, 'id'>): Promise<Symptom> => {
    const response = await api.post<{ data: Symptom }>(
      `/appointments/${appointmentId}/record/symptoms`,
      symptom
    );
    return response.data.data;
  },

  updateSymptom: async (
    appointmentId: string,
    symptomId: string,
    data: Partial<Symptom>
  ): Promise<Symptom> => {
    const response = await api.patch<{ data: Symptom }>(
      `/appointments/${appointmentId}/record/symptoms/${symptomId}`,
      data
    );
    return response.data.data;
  },

  deleteSymptom: async (appointmentId: string, symptomId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/record/symptoms/${symptomId}`);
  },

  // Prescription operations
  addPrescription: async (
    appointmentId: string,
    prescription: Omit<Prescription, 'id'>
  ): Promise<Prescription> => {
    const response = await api.post<{ data: Prescription }>(
      `/appointments/${appointmentId}/record/prescriptions`,
      prescription
    );
    return response.data.data;
  },

  updatePrescription: async (
    appointmentId: string,
    prescriptionId: string,
    data: Partial<Prescription>
  ): Promise<Prescription> => {
    const response = await api.patch<{ data: Prescription }>(
      `/appointments/${appointmentId}/record/prescriptions/${prescriptionId}`,
      data
    );
    return response.data.data;
  },

  deletePrescription: async (appointmentId: string, prescriptionId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/record/prescriptions/${prescriptionId}`);
  },
};
```

### Transcription Service

```typescript
// src/services/transcription.api.ts

import { api } from '@/lib/api';

export interface TranscriptionSession {
  id: string;
  appointmentId: string;
  wsUrl: string;
  status: 'active' | 'completed' | 'error';
  createdAt: string;
}

export interface Transcription {
  id: string;
  appointmentId: string;
  text: string;
  segments: TranscriptionSegment[];
  duration: number;
  status: 'processing' | 'completed' | 'error';
  createdAt: string;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

export interface AIExtractionResult {
  chiefComplaint?: {
    value: string;
    confidence: number;
    sourceSegmentIds: string[];
  };
  symptoms?: {
    value: Symptom[];
    confidence: number;
    sourceSegmentIds: string[];
  };
  diagnosis?: {
    value: string;
    confidence: number;
    sourceSegmentIds: string[];
  };
  prescriptions?: {
    value: Prescription[];
    confidence: number;
    sourceSegmentIds: string[];
  };
}

export const transcriptionApi = {
  // Start transcription session
  start: async (appointmentId: string): Promise<TranscriptionSession> => {
    const response = await api.post<{ data: TranscriptionSession }>(
      `/appointments/${appointmentId}/transcription/start`
    );
    return response.data.data;
  },

  // Upload audio chunk (for non-WebSocket fallback)
  uploadAudio: async (appointmentId: string, audioBlob: Blob): Promise<void> => {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    await api.post(`/appointments/${appointmentId}/transcription/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Stop transcription session
  stop: async (appointmentId: string): Promise<Transcription> => {
    const response = await api.post<{ data: Transcription }>(
      `/appointments/${appointmentId}/transcription/stop`
    );
    return response.data.data;
  },

  // Get transcription
  get: async (appointmentId: string): Promise<Transcription | null> => {
    try {
      const response = await api.get<{ data: Transcription }>(
        `/appointments/${appointmentId}/transcription`
      );
      return response.data.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Extract fields using AI
  extractFields: async (appointmentId: string): Promise<AIExtractionResult> => {
    const response = await api.post<{ data: AIExtractionResult }>(
      `/appointments/${appointmentId}/extract-fields`
    );
    return response.data.data;
  },
};
```

## WebSocket Integration

### WebSocket Client

```typescript
// src/lib/websocket.ts

type MessageHandler = (data: any) => void;

interface WebSocketClientOptions {
  url: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private options: Required<WebSocketClientOptions>;

  constructor(options: WebSocketClientOptions) {
    this.options = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      onOpen: () => {},
      onClose: () => {},
      onError: () => {},
      ...options,
    };
  }

  connect(): void {
    this.ws = new WebSocket(this.options.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onOpen();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = this.handlers.get(message.type) || [];
        handlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.options.onClose();

      if (this.options.reconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.options.reconnectInterval);
      }
    };

    this.ws.onerror = (error) => {
      this.options.onError(error);
    };
  }

  disconnect(): void {
    this.options.reconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (data instanceof Blob) {
        this.ws.send(data);
      } else {
        this.ws.send(JSON.stringify(data));
      }
    }
  }

  on(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### Transcription WebSocket Hook

```typescript
// src/hooks/useTranscriptionWebSocket.ts

import { useCallback, useEffect, useRef } from 'react';
import { WebSocketClient } from '@/lib/websocket';
import { useTranscriptionStore } from '@/store/transcriptionStore';

export const useTranscriptionWebSocket = () => {
  const clientRef = useRef<WebSocketClient | null>(null);
  const {
    appendTranscription,
    setStatus,
    setExtractionStatus,
    setError,
  } = useTranscriptionStore();

  const connect = useCallback((wsUrl: string) => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const client = new WebSocketClient({
      url: wsUrl,
      onOpen: () => {
        setStatus('recording');
      },
      onClose: () => {
        setStatus('processing');
      },
      onError: () => {
        setError('Error de conexión con el servidor de transcripción');
      },
    });

    // Handle transcription updates
    client.on('transcription_update', (message) => {
      appendTranscription(message.text, message.segment);
    });

    // Handle field extraction
    client.on('field_extraction', (message) => {
      setExtractionStatus(message.field, 'done');
      // Dispatch to medical record form
    });

    // Handle status changes
    client.on('status', (message) => {
      setStatus(message.status);
    });

    // Handle errors
    client.on('error', (message) => {
      setError(message.error);
    });

    // Handle completion
    client.on('completed', () => {
      setStatus('completed');
    });

    client.connect();
    clientRef.current = client;
  }, [appendTranscription, setStatus, setExtractionStatus, setError]);

  const sendAudioChunk = useCallback((chunk: Blob) => {
    clientRef.current?.send(chunk);
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    sendAudioChunk,
    disconnect,
    isConnected: clientRef.current?.isConnected ?? false,
  };
};
```

## Response Type Wrapper

All API responses follow this format:

```typescript
// Success response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Error response
interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  errors?: FieldError[];
}

// Paginated response
interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Rate Limiting

Handle rate limiting gracefully:

```typescript
// src/lib/api.ts - Add to interceptor

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];

      // Show notification to user
      toast.warning(
        `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter || 60} segundos.`
      );

      // Optionally retry after delay
      if (retryAfter && error.config) {
        await new Promise((resolve) =>
          setTimeout(resolve, parseInt(retryAfter) * 1000)
        );
        return api.request(error.config);
      }
    }

    return Promise.reject(error);
  }
);
```

## Environment Variables

```typescript
// .env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000

// .env.production
VITE_API_URL=https://api.medrecord.ai/api/v1
VITE_WS_URL=wss://api.medrecord.ai
```

## File Structure

```
src/
├── lib/
│   ├── api.ts              # Axios instance and config
│   ├── errors.ts           # Error handling utilities
│   ├── websocket.ts        # WebSocket client
│   └── queryClient.ts      # React Query client
├── services/
│   ├── auth.api.ts         # Auth endpoints
│   ├── patients.api.ts     # Patients endpoints
│   ├── appointments.api.ts # Appointments endpoints
│   ├── medicalRecords.api.ts # Medical records endpoints
│   └── transcription.api.ts  # Transcription endpoints
└── hooks/
    ├── queries/
    │   ├── usePatients.ts
    │   ├── useAppointments.ts
    │   └── useMedicalRecord.ts
    └── useTranscriptionWebSocket.ts
```
