# Test Utilities

This document defines the shared test utilities, factories, and mocks used across the MedRecord AI test suite.

---

## Factory Structure

```
packages/backend/tests/
├── factories/
│   ├── index.ts
│   ├── user.factory.ts
│   ├── patient.factory.ts
│   ├── appointment.factory.ts
│   ├── medical-record.factory.ts
│   └── prescription.factory.ts
└── mocks/
    ├── index.ts
    ├── openai.mock.ts
    ├── prisma.mock.ts
    └── auth.mock.ts

packages/frontend/tests/
├── factories/
│   ├── index.ts
│   ├── patient.factory.ts
│   └── appointment.factory.ts
├── mocks/
│   ├── api.mock.ts
│   ├── msw/
│   │   ├── handlers.ts
│   │   └── server.ts
│   └── audio.mock.ts
└── utils/
    ├── render.tsx
    └── wrapper.tsx
```

---

## Backend Factories

### User/Provider Factory

```typescript
// factories/user.factory.ts
import { Provider } from '@prisma/client';
import bcrypt from 'bcrypt';

export interface CreateUserOptions {
  id?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  specialty?: string;
}

export const createTestUser = (overrides: CreateUserOptions = {}): Partial<Provider> => ({
  id: overrides.id ?? 'test-user-id',
  email: overrides.email ?? 'doctor@test.com',
  firstName: overrides.firstName ?? 'Test',
  lastName: overrides.lastName ?? 'Doctor',
  passwordHash: bcrypt.hashSync(overrides.password ?? 'Password123!', 10),
  specialty: overrides.specialty ?? 'General Medicine',
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createTestUserInDb = async (
  prisma: any,
  overrides: CreateUserOptions = {}
): Promise<Provider> => {
  return prisma.provider.create({
    data: createTestUser(overrides),
  });
};

// Pre-hashed passwords for tests (avoid bcrypt overhead)
export const TEST_PASSWORDS = {
  default: {
    plain: 'Password123!',
    hash: '$2b$10$K4GILMVQKPv6nFjvQYMEQuCZvST8F.t1qHj9RhvQJ1D5pLxVYuRXm',
  },
  weak: {
    plain: '123456',
    hash: '$2b$10$invalid', // Intentionally invalid
  },
};
```

### Patient Factory

```typescript
// factories/patient.factory.ts
import { Patient } from '@prisma/client';

export interface CreatePatientOptions {
  id?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date | string;
  sex?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  notes?: string;
}

export const createTestPatient = (overrides: CreatePatientOptions = {}): Partial<Patient> => ({
  id: overrides.id ?? 'test-patient-id',
  firstName: overrides.firstName ?? 'Test',
  lastName: overrides.lastName ?? 'Patient',
  dateOfBirth: overrides.dateOfBirth
    ? new Date(overrides.dateOfBirth)
    : new Date('1990-01-01'),
  sex: overrides.sex ?? 'male',
  phone: overrides.phone ?? '+34600000001',
  email: overrides.email ?? 'patient@test.com',
  emergencyContactName: overrides.emergencyContactName ?? 'Emergency Contact',
  emergencyContactPhone: overrides.emergencyContactPhone ?? '+34600000002',
  address: overrides.address ?? null,
  notes: overrides.notes ?? null,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createTestPatientInDb = async (
  prisma: any,
  overrides: CreatePatientOptions = {}
): Promise<Patient> => {
  return prisma.patient.create({
    data: createTestPatient(overrides),
  });
};

// Pre-defined patient profiles for different scenarios
export const PATIENT_PROFILES = {
  simple: createTestPatient(),
  withAllergies: {
    ...createTestPatient({ firstName: 'Allergy' }),
    allergies: [
      { name: 'Penicillin', severity: 'severe', reactions: 'Anaphylaxis' },
    ],
  },
  withConditions: {
    ...createTestPatient({ firstName: 'Chronic' }),
    chronicConditions: [
      { name: 'Diabetes Type 2', status: 'active', diagnosedAt: new Date('2020-01-01') },
    ],
  },
  pediatric: createTestPatient({
    firstName: 'Child',
    dateOfBirth: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000), // 5 years ago
  }),
  elderly: createTestPatient({
    firstName: 'Elder',
    dateOfBirth: new Date('1945-01-01'),
  }),
};
```

### Appointment Factory

```typescript
// factories/appointment.factory.ts
import { Appointment, AppointmentType, AppointmentStatus } from '@prisma/client';

export interface CreateAppointmentOptions {
  id?: string;
  patientId?: string;
  providerId?: string;
  scheduledAt?: Date;
  type?: AppointmentType;
  status?: AppointmentStatus;
  reasonForVisit?: string;
}

export const createTestAppointment = (
  overrides: CreateAppointmentOptions = {}
): Partial<Appointment> => ({
  id: overrides.id ?? 'test-appointment-id',
  patientId: overrides.patientId ?? 'test-patient-id',
  providerId: overrides.providerId ?? 'test-provider-id',
  scheduledAt: overrides.scheduledAt ?? new Date(),
  type: overrides.type ?? 'new_patient',
  status: overrides.status ?? 'scheduled',
  reasonForVisit: overrides.reasonForVisit ?? 'Regular checkup',
  startedAt: null,
  completedAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createTestAppointmentInDb = async (
  prisma: any,
  overrides: CreateAppointmentOptions = {}
): Promise<Appointment> => {
  return prisma.appointment.create({
    data: createTestAppointment(overrides),
  });
};

// Different appointment states
export const APPOINTMENT_STATES = {
  scheduled: createTestAppointment({ status: 'scheduled' }),
  inProgress: createTestAppointment({
    status: 'in_progress',
    startedAt: new Date(),
  }),
  completed: createTestAppointment({
    status: 'completed',
    startedAt: new Date(Date.now() - 30 * 60 * 1000),
    completedAt: new Date(),
  }),
  cancelled: createTestAppointment({ status: 'cancelled' }),
};
```

### Medical Record Factory

```typescript
// factories/medical-record.factory.ts
import { MedicalRecord, Symptom, Prescription } from '@prisma/client';

export interface CreateMedicalRecordOptions {
  id?: string;
  appointmentId?: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  status?: 'draft' | 'completed';
}

export const createTestMedicalRecord = (
  overrides: CreateMedicalRecordOptions = {}
): Partial<MedicalRecord> => ({
  id: overrides.id ?? 'test-record-id',
  appointmentId: overrides.appointmentId ?? 'test-appointment-id',
  chiefComplaint: overrides.chiefComplaint ?? 'Dolor de cabeza',
  historyOfPresentIllness:
    overrides.historyOfPresentIllness ??
    'El paciente refiere dolor de cabeza desde hace tres días.',
  diagnosis: overrides.diagnosis ?? 'Migraña tensional',
  treatmentPlan: overrides.treatmentPlan ?? 'Tratamiento farmacológico y reposo.',
  status: overrides.status ?? 'draft',
  transcription: null,
  aiGeneratedFields: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export interface CreateSymptomOptions {
  id?: string;
  medicalRecordId?: string;
  description?: string;
  severity?: number;
  bodySite?: string;
  duration?: string;
  isAIGenerated?: boolean;
}

export const createTestSymptom = (overrides: CreateSymptomOptions = {}): Partial<Symptom> => ({
  id: overrides.id ?? 'test-symptom-id',
  medicalRecordId: overrides.medicalRecordId ?? 'test-record-id',
  description: overrides.description ?? 'Dolor de cabeza',
  severity: overrides.severity ?? 7,
  bodySite: overrides.bodySite ?? 'Head',
  duration: overrides.duration ?? '3 days',
  isAIGenerated: overrides.isAIGenerated ?? false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export interface CreatePrescriptionOptions {
  id?: string;
  medicalRecordId?: string;
  medicationName?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
  isAIGenerated?: boolean;
}

export const createTestPrescription = (
  overrides: CreatePrescriptionOptions = {}
): Partial<Prescription> => ({
  id: overrides.id ?? 'test-prescription-id',
  medicalRecordId: overrides.medicalRecordId ?? 'test-record-id',
  medicationName: overrides.medicationName ?? 'Ibuprofeno',
  strength: overrides.strength ?? '400mg',
  dosage: overrides.dosage ?? '1 comprimido',
  frequency: overrides.frequency ?? 'Cada 8 horas',
  duration: overrides.duration ?? '5 días',
  quantity: overrides.quantity ?? 15,
  instructions: overrides.instructions ?? 'Tomar con alimentos',
  isAIGenerated: overrides.isAIGenerated ?? false,
  startDate: new Date(),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

---

## Backend Mocks

### OpenAI Mock

```typescript
// mocks/openai.mock.ts
import { vi } from 'vitest';

export const mockWhisperAPI = {
  transcribe: vi.fn().mockResolvedValue({
    text: 'El paciente refiere dolor de cabeza desde hace tres días. Presenta náuseas ocasionales.',
    segments: [
      { start: 0, end: 5, text: 'El paciente refiere dolor de cabeza' },
      { start: 5, end: 10, text: 'desde hace tres días.' },
    ],
    duration: 120,
  }),
};

export const mockGPTAPI = {
  extract: vi.fn().mockResolvedValue({
    chiefComplaint: 'Dolor de cabeza',
    symptoms: [
      {
        description: 'Dolor de cabeza',
        severity: 7,
        bodySite: 'Head',
        duration: '3 días',
        confidence: 0.95,
      },
      {
        description: 'Náuseas',
        severity: 4,
        bodySite: 'Stomach',
        duration: 'Ocasional',
        confidence: 0.85,
      },
    ],
    diagnosis: {
      description: 'Migraña tensional',
      confidence: 0.82,
    },
    prescriptions: [
      {
        medication: 'Ibuprofeno',
        dosage: '400mg',
        frequency: 'cada 8 horas',
        duration: '5 días',
        instructions: 'Tomar con alimentos',
        confidence: 0.90,
      },
    ],
    treatmentPlan: 'Reposo y analgésicos. Control en 1 semana si no mejora.',
  }),
};

export const createOpenAIMock = () => ({
  audio: {
    transcriptions: {
      create: mockWhisperAPI.transcribe,
    },
  },
  chat: {
    completions: {
      create: vi.fn().mockImplementation(async (params) => {
        const response = await mockGPTAPI.extract();
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(response),
              },
            },
          ],
        };
      }),
    },
  },
});

// Setup mock
export const setupOpenAIMock = () => {
  vi.mock('@/lib/openai', () => ({
    openai: createOpenAIMock(),
  }));
};

// Reset mock between tests
export const resetOpenAIMock = () => {
  mockWhisperAPI.transcribe.mockClear();
  mockGPTAPI.extract.mockClear();
};

// Customize responses
export const setWhisperResponse = (response: any) => {
  mockWhisperAPI.transcribe.mockResolvedValueOnce(response);
};

export const setGPTResponse = (response: any) => {
  mockGPTAPI.extract.mockResolvedValueOnce(response);
};

// Error scenarios
export const setWhisperError = (error: Error) => {
  mockWhisperAPI.transcribe.mockRejectedValueOnce(error);
};

export const setGPTError = (error: Error) => {
  mockGPTAPI.extract.mockRejectedValueOnce(error);
};
```

### Prisma Mock

```typescript
// mocks/prisma.mock.ts
import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

export type MockPrismaClient = {
  [K in keyof PrismaClient]: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

export const createPrismaMock = (): MockPrismaClient => {
  const createModelMock = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  });

  return {
    provider: createModelMock(),
    patient: createModelMock(),
    appointment: createModelMock(),
    medicalRecord: createModelMock(),
    symptom: createModelMock(),
    prescription: createModelMock(),
    allergy: createModelMock(),
    chronicCondition: createModelMock(),
    vitalSigns: createModelMock(),
    transcription: createModelMock(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback) => callback(createPrismaMock())),
  } as any;
};

export const setupPrismaMock = () => {
  const mockPrisma = createPrismaMock();

  vi.mock('@/lib/prisma', () => ({
    prisma: mockPrisma,
  }));

  return mockPrisma;
};
```

### Auth Mock

```typescript
// mocks/auth.mock.ts
import { vi } from 'vitest';
import { createTestUser } from '../factories/user.factory';

export const mockAuthMiddleware = () => {
  const testUser = createTestUser();

  return vi.fn((req, res, next) => {
    req.user = testUser;
    req.providerId = testUser.id;
    next();
  });
};

export const generateTestToken = (
  payload: { id: string; email: string } = { id: 'test-id', email: 'test@test.com' }
) => {
  // Simple base64 encoding for tests (not real JWT)
  return `test.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
};

export const setupAuthMock = () => {
  vi.mock('@/middleware/auth.middleware', () => ({
    authMiddleware: mockAuthMiddleware(),
  }));
};
```

---

## Frontend Mocks

### API Mock with MSW

```typescript
// mocks/msw/handlers.ts
import { http, HttpResponse } from 'msw';
import { createTestPatient } from '../factories/patient.factory';
import { createTestAppointment } from '../factories/appointment.factory';

export const handlers = [
  // Auth handlers
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as any;

    if (body.email === 'doctor@test.com' && body.password === 'Password123!') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-token',
          user: {
            id: 'user-1',
            email: 'doctor@test.com',
            firstName: 'Test',
            lastName: 'Doctor',
          },
        },
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'user-1',
        email: 'doctor@test.com',
        firstName: 'Test',
        lastName: 'Doctor',
      },
    });
  }),

  // Patient handlers
  http.get('/api/v1/patients', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    let patients = [
      createTestPatient({ id: '1', firstName: 'Juan', lastName: 'García' }),
      createTestPatient({ id: '2', firstName: 'María', lastName: 'López' }),
    ];

    if (search) {
      patients = patients.filter(
        (p) =>
          p.firstName?.toLowerCase().includes(search.toLowerCase()) ||
          p.lastName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return HttpResponse.json({
      success: true,
      data: patients,
      pagination: { total: patients.length, page: 1, limit: 20 },
    });
  }),

  http.get('/api/v1/patients/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createTestPatient({ id: params.id as string }),
    });
  }),

  http.post('/api/v1/patients', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: 'new-patient-id',
          ...(body as object),
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }),

  // Appointment handlers
  http.get('/api/v1/appointments', () => {
    return HttpResponse.json({
      success: true,
      data: [createTestAppointment()],
      pagination: { total: 1, page: 1, limit: 20 },
    });
  }),

  http.post('/api/v1/appointments', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: 'new-appointment-id',
          ...(body as object),
          status: 'scheduled',
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }),

  // Transcription handlers
  http.post('/api/v1/appointments/:id/transcription/start', () => {
    return HttpResponse.json({
      success: true,
      data: {
        sessionId: 'mock-session-id',
        wsUrl: 'ws://localhost:3001/ws/transcription',
      },
    });
  }),

  http.post('/api/v1/appointments/:id/extract-fields', () => {
    return HttpResponse.json({
      success: true,
      data: {
        symptoms: [
          { description: 'Dolor de cabeza', severity: 7, isAIGenerated: true },
        ],
        diagnosis: { description: 'Migraña', confidence: 0.85 },
        prescriptions: [
          {
            medication: 'Ibuprofeno',
            dosage: '400mg',
            frequency: 'cada 8h',
            isAIGenerated: true,
          },
        ],
      },
    });
  }),
];
```

```typescript
// mocks/msw/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Audio Mock

```typescript
// mocks/audio.mock.ts
import { vi } from 'vitest';

export const createMockMediaStream = () => ({
  getTracks: () => [
    {
      stop: vi.fn(),
      enabled: true,
    },
  ],
  getAudioTracks: () => [
    {
      stop: vi.fn(),
      enabled: true,
    },
  ],
});

export const createMockMediaRecorder = () => {
  const mockRecorder = {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    state: 'inactive' as 'inactive' | 'recording' | 'paused',
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as ((error: Error) => void) | null,
  };

  // Simulate recording behavior
  mockRecorder.start.mockImplementation(() => {
    mockRecorder.state = 'recording';
  });

  mockRecorder.stop.mockImplementation(() => {
    mockRecorder.state = 'inactive';
    // Simulate data available event
    if (mockRecorder.ondataavailable) {
      mockRecorder.ondataavailable({
        data: new Blob(['mock-audio-data'], { type: 'audio/webm' }),
      });
    }
    if (mockRecorder.onstop) {
      mockRecorder.onstop();
    }
  });

  return mockRecorder;
};

export const setupAudioMocks = () => {
  // Mock getUserMedia
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(createMockMediaStream()),
    },
    writable: true,
  });

  // Mock MediaRecorder
  global.MediaRecorder = vi.fn().mockImplementation(() => createMockMediaRecorder());
  (global.MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);

  // Mock AudioContext
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createAnalyser: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      getByteFrequencyData: vi.fn(),
      fftSize: 2048,
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    close: vi.fn(),
    state: 'running',
  }));
};
```

---

## Frontend Test Utils

### Custom Render

```typescript
// utils/render.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
  isAuthenticated?: boolean;
}

export const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    queryClient = createTestQueryClient(),
    initialRoute = '/',
    isAuthenticated = false,
    ...renderOptions
  } = options;

  // Set initial route
  window.history.pushState({}, 'Test page', initialRoute);

  // Mock auth state if needed
  if (isAuthenticated) {
    localStorage.setItem('token', 'mock-token');
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

export * from '@testing-library/react';
export { customRender as render };
```

### Test Setup

```typescript
// setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/msw/server';

// Setup MSW
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  vi.clearAllMocks();
});

// Global mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

---

## Test Helper Functions

```typescript
// utils/helpers.ts
import { vi } from 'vitest';

// Wait for async operations
export const waitForAsync = (ms = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock console errors for expected warnings
export const suppressConsoleError = () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
};

// Generate random IDs for tests
export const generateTestId = () =>
  `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create form data for file uploads
export const createMockFile = (
  name: string,
  type: string,
  content: string = 'mock content'
) => {
  const file = new File([content], name, { type });
  return file;
};

// Create audio blob for transcription tests
export const createMockAudioBlob = () =>
  new Blob(['mock-audio-data'], { type: 'audio/webm' });
```

---

## References

- [Testing Strategy](./strategy.md)
- [Backend Unit Tests](./backend/unit-tests.md)
- [Frontend Unit Tests](./frontend/unit-tests.md)
- [E2E Tests](./e2e/e2e-tests.md)
