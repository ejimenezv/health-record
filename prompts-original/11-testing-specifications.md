# Prompt 11: Testing Specifications

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the TWELFTH prompt in the series. Previous prompts completed all documentation including UI/UX refinement.

## Prerequisites
Before proceeding, read the following files:
- `docs/tech-stack/testing.md`
- `docs/api/api-summary.md`
- `docs/frontend/frontend-summary.md`
- `docs/stories/must-have-stories.md`
- `docs/project-structure/backend-structure.md`
- `docs/project-structure/frontend-structure.md`

## Objective
Create comprehensive testing specifications covering unit tests, integration tests, and E2E tests for both backend and frontend. This ensures code quality and serves as documentation for implementation.

## Tasks

### 1. Define Testing Strategy
Create `docs/testing/strategy.md` with:

**Testing Pyramid**:
```
           /\
          /E2E\           <- Few, critical flows
         /──────\
        /Integration\      <- API endpoints, DB operations
       /──────────────\
      /    Unit Tests   \  <- Many, fast, isolated
     /────────────────────\
```

**Coverage Goals**:
- Unit Tests: 80% coverage for services and utilities
- Integration Tests: All API endpoints
- E2E Tests: Main user flow (patient → appointment → transcription → save)

**Testing Philosophy**:
- Test behavior, not implementation
- Focus on user-facing functionality
- Mock external services (OpenAI)
- Use realistic test data
- Fast feedback loop

### 2. Define Backend Unit Tests
Create `docs/testing/backend/unit-tests.md` with:

**Test Structure**:
```
packages/backend/tests/unit/
├── services/
│   ├── auth.service.test.ts
│   ├── patients.service.test.ts
│   ├── appointments.service.test.ts
│   ├── medical-records.service.test.ts
│   └── ai/
│       ├── whisper.service.test.ts
│       ├── gpt.service.test.ts
│       └── extraction.service.test.ts
├── utils/
│   ├── jwt.test.ts
│   ├── validators.test.ts
│   └── audio.test.ts
└── validators/
    ├── patients.validator.test.ts
    └── appointments.validator.test.ts
```

**Example Test Cases**:

```typescript
// auth.service.test.ts
describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user with hashed password');
    it('should return JWT token on successful registration');
    it('should throw error if email already exists');
    it('should validate email format');
    it('should validate password strength');
  });

  describe('login', () => {
    it('should return JWT token for valid credentials');
    it('should throw error for invalid email');
    it('should throw error for invalid password');
  });

  describe('validateToken', () => {
    it('should return user for valid token');
    it('should throw error for expired token');
    it('should throw error for invalid token');
  });
});

// patients.service.test.ts
describe('PatientsService', () => {
  describe('create', () => {
    it('should create patient with all required fields');
    it('should associate patient with current user');
    it('should return created patient with ID');
    it('should handle optional fields correctly');
  });

  describe('findAll', () => {
    it('should return only patients for current user');
    it('should support pagination');
    it('should support search by name');
    it('should return empty array if no patients');
  });

  describe('findById', () => {
    it('should return patient with appointments');
    it('should throw NotFound for non-existent ID');
    it('should throw Forbidden for another user\'s patient');
  });

  describe('update', () => {
    it('should update patient fields');
    it('should not update restricted fields');
    it('should return updated patient');
  });

  describe('delete', () => {
    it('should soft delete patient');
    it('should not return deleted patient in list');
  });
});

// extraction.service.test.ts
describe('ExtractionService', () => {
  describe('extractMedicalFields', () => {
    it('should extract symptoms from transcription');
    it('should extract diagnosis from transcription');
    it('should extract prescriptions from transcription');
    it('should handle transcription with no medical info');
    it('should include confidence scores');
    it('should handle multiple symptoms');
    it('should handle complex prescriptions');
  });

  describe('parseGPTResponse', () => {
    it('should parse valid JSON response');
    it('should handle malformed JSON gracefully');
    it('should validate extracted field structure');
  });
});
```

### 3. Define Backend Integration Tests
Create `docs/testing/backend/integration-tests.md` with:

**Test Structure**:
```
packages/backend/tests/integration/
├── routes/
│   ├── auth.routes.test.ts
│   ├── patients.routes.test.ts
│   ├── appointments.routes.test.ts
│   ├── medical-records.routes.test.ts
│   └── transcription.routes.test.ts
└── repositories/
    ├── patients.repository.test.ts
    └── appointments.repository.test.ts
```

**Database Setup**:
```typescript
// Test database configuration
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  // Run migrations
  await migrate();
});

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Reset database state
  await prisma.transcription.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
});
```

**Example Integration Tests**:

```typescript
// patients.routes.test.ts
describe('Patients API', () => {
  let authToken: string;
  let testUser: User;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = generateToken(testUser);
  });

  describe('GET /api/v1/patients', () => {
    it('should return 401 without auth token');
    it('should return empty array if no patients');
    it('should return only current user patients');
    it('should support search query parameter');
    it('should support pagination');
  });

  describe('POST /api/v1/patients', () => {
    it('should create patient with valid data');
    it('should return 422 for invalid data');
    it('should return 422 for missing required fields');
    it('should return 401 without auth token');
  });

  describe('GET /api/v1/patients/:id', () => {
    it('should return patient with appointments');
    it('should return 404 for non-existent patient');
    it('should return 403 for another user patient');
  });

  describe('PUT /api/v1/patients/:id', () => {
    it('should update patient fields');
    it('should return 404 for non-existent patient');
    it('should return 422 for invalid data');
  });

  describe('DELETE /api/v1/patients/:id', () => {
    it('should soft delete patient');
    it('should return 204 on success');
    it('should return 404 for non-existent patient');
  });
});

// transcription.routes.test.ts
describe('Transcription API', () => {
  describe('POST /api/v1/appointments/:id/transcription/start', () => {
    it('should start transcription session');
    it('should return session ID and WebSocket URL');
    it('should return 404 for non-existent appointment');
    it('should return 400 if transcription already active');
  });

  describe('POST /api/v1/appointments/:id/transcription/audio', () => {
    it('should accept audio chunk upload');
    it('should queue chunk for processing');
    it('should return 400 for invalid audio format');
    it('should return 400 if no active session');
  });

  describe('POST /api/v1/appointments/:id/transcription/stop', () => {
    it('should stop transcription session');
    it('should return complete transcription');
    it('should trigger final field extraction');
  });

  describe('POST /api/v1/appointments/:id/extract-fields', () => {
    it('should extract fields from transcription text');
    it('should return symptoms, diagnosis, prescriptions');
    it('should handle empty transcription');
    it('should mock OpenAI API call');
  });
});
```

### 4. Define Frontend Unit Tests
Create `docs/testing/frontend/unit-tests.md` with:

**Test Structure**:
```
packages/frontend/tests/unit/
├── components/
│   ├── patients/
│   │   ├── PatientCard.test.tsx
│   │   ├── PatientForm.test.tsx
│   │   └── PatientList.test.tsx
│   ├── medical-records/
│   │   ├── SymptomsSection.test.tsx
│   │   ├── DiagnosisSection.test.tsx
│   │   └── PrescriptionsSection.test.tsx
│   └── transcription/
│       ├── AudioRecorder.test.tsx
│       └── TranscriptionDisplay.test.tsx
├── hooks/
│   ├── useAuth.test.ts
│   ├── usePatients.test.ts
│   └── useAudioRecorder.test.ts
└── utils/
    ├── formatters.test.ts
    └── validators.test.ts
```

**Example Component Tests**:

```typescript
// PatientForm.test.tsx
describe('PatientForm', () => {
  it('should render all required fields');
  it('should show validation errors on submit with empty fields');
  it('should call onSubmit with form data when valid');
  it('should pre-fill fields when patient prop provided');
  it('should disable submit button while loading');
  it('should show loading state');
});

// SymptomsSection.test.tsx
describe('SymptomsSection', () => {
  it('should render list of symptoms');
  it('should show AI badge for AI-generated symptoms');
  it('should allow adding new symptom');
  it('should allow removing symptom');
  it('should show accept AI suggestions button when available');
  it('should call onAcceptAI when accepting suggestions');
});

// AudioRecorder.test.tsx
describe('AudioRecorder', () => {
  it('should show start recording button when idle');
  it('should show stop button when recording');
  it('should display duration when recording');
  it('should call onStart when start button clicked');
  it('should call onStop when stop button clicked');
  it('should be disabled when disabled prop is true');
});
```

**Example Hook Tests**:

```typescript
// useAuth.test.ts
describe('useAuth', () => {
  it('should return isAuthenticated false when no token');
  it('should return isAuthenticated true when valid token');
  it('should call login API and store token');
  it('should clear token on logout');
  it('should load user on mount if token exists');
});

// useAudioRecorder.test.ts
describe('useAudioRecorder', () => {
  it('should initialize with isRecording false');
  it('should request microphone permission on start');
  it('should start recording when permission granted');
  it('should update duration while recording');
  it('should stop recording and return audio blob');
  it('should handle permission denied error');
});
```

### 5. Define E2E Tests
Create `docs/testing/e2e/e2e-tests.md` with:

**Test Structure**:
```
packages/frontend/tests/e2e/
├── flows/
│   ├── auth.spec.ts
│   ├── patient-management.spec.ts
│   ├── appointment-flow.spec.ts
│   └── transcription-flow.spec.ts
├── fixtures/
│   ├── auth.ts
│   ├── patients.ts
│   └── appointments.ts
└── playwright.config.ts
```

**Main E2E Flow Test**:

```typescript
// appointment-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Appointment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create patient, appointment, and medical record', async ({ page }) => {
    // Navigate to new patient
    await page.click('text=Nuevo Paciente');
    await expect(page).toHaveURL('/patients/new');

    // Fill patient form
    await page.fill('[name="firstName"]', 'Juan');
    await page.fill('[name="lastName"]', 'García');
    await page.fill('[name="dateOfBirth"]', '1985-03-15');
    await page.selectOption('[name="gender"]', 'male');
    await page.fill('[name="phone"]', '+34612345678');
    await page.click('button[type="submit"]');

    // Verify patient created
    await expect(page.locator('text=Paciente creado exitosamente')).toBeVisible();

    // Create new appointment
    await page.click('text=Nueva Cita');
    await page.fill('[name="scheduledAt"]', '2024-01-15T10:00');
    await page.click('button[type="submit"]');

    // Verify on appointment page
    await expect(page.locator('h1')).toContainText('Juan García');

    // Add symptoms manually
    await page.click('text=Añadir Síntoma');
    await page.fill('[name="symptomDescription"]', 'Dolor de cabeza');
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Dolor de cabeza')).toBeVisible();

    // Add diagnosis
    await page.fill('[name="diagnosis"]', 'Migraña tensional');

    // Add prescription
    await page.click('text=Añadir Receta');
    await page.fill('[name="medication"]', 'Ibuprofeno');
    await page.fill('[name="dosage"]', '400mg');
    await page.fill('[name="frequency"]', 'Cada 8 horas');
    await page.fill('[name="duration"]', '5 días');
    await page.click('button:has-text("Guardar Receta")');

    // Save medical record
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Registro guardado exitosamente')).toBeVisible();

    // Verify in patient history
    await page.goto('/patients');
    await page.click('text=Juan García');
    await expect(page.locator('text=Migraña tensional')).toBeVisible();
  });

  test('should use AI transcription to auto-fill fields', async ({ page }) => {
    // Navigate to existing patient appointment
    await page.goto('/patients');
    await page.click('text=Test Patient');
    await page.click('text=Nueva Cita');
    await page.fill('[name="scheduledAt"]', '2024-01-16T11:00');
    await page.click('button[type="submit"]');

    // Start recording (mocked audio input)
    await page.click('button:has-text("Iniciar Grabación")');
    await expect(page.locator('text=Grabando...')).toBeVisible();

    // Simulate transcription updates via mock WebSocket
    // (Implementation will use MSW or similar)

    // Verify AI suggestions appear
    await expect(page.locator('[data-testid="ai-symptom-badge"]')).toBeVisible();

    // Accept AI suggestions
    await page.click('button:has-text("Aceptar sugerencias")');

    // Stop recording
    await page.click('button:has-text("Detener Grabación")');

    // Verify fields were filled
    await expect(page.locator('[name="symptoms"]')).not.toBeEmpty();

    // Save and verify
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Registro guardado exitosamente')).toBeVisible();
  });
});
```

### 6. Define Test Utilities
Create `docs/testing/utilities.md` with:

**Test Factories**:
```typescript
// factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'doctor@test.com',
  firstName: 'Test',
  lastName: 'Doctor',
  passwordHash: '$2b$10$...', // pre-hashed 'password123'
  specialty: 'General',
  ...overrides
});

// factories/patient.factory.ts
export const createTestPatient = (overrides = {}) => ({
  id: 'test-patient-id',
  userId: 'test-user-id',
  firstName: 'Test',
  lastName: 'Patient',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'male',
  ...overrides
});

// factories/appointment.factory.ts
export const createTestAppointment = (overrides = {}) => ({
  id: 'test-appointment-id',
  patientId: 'test-patient-id',
  scheduledAt: new Date(),
  status: 'SCHEDULED',
  ...overrides
});
```

**Mock Services**:
```typescript
// mocks/openai.mock.ts
export const mockWhisperAPI = {
  transcribe: vi.fn().mockResolvedValue({
    text: 'El paciente refiere dolor de cabeza desde hace tres días...',
    segments: [...],
    duration: 120
  })
};

export const mockGPTAPI = {
  extract: vi.fn().mockResolvedValue({
    symptoms: [{ description: 'Dolor de cabeza', severity: 'moderate' }],
    diagnosis: { description: 'Migraña tensional' },
    prescriptions: [{ medication: 'Ibuprofeno', dosage: '400mg', frequency: 'cada 8h' }]
  })
};
```

### 7. Fill Template Section 2.6 (Spanish)
Update `docs/deliverables/section-2-arquitectura.md` to include test section:

```markdown
### 2.6. Tests

La suite de tests incluye tres niveles de testing:

**Tests Unitarios (Backend)**
- Servicios de autenticación, pacientes, citas y registros médicos
- Servicios de integración con IA (Whisper, GPT)
- Validadores y utilidades
- Cobertura objetivo: 80%

**Tests de Integración (Backend)**
- Todos los endpoints de la API REST
- Operaciones de base de datos
- WebSocket para transcripción
- Utilizan base de datos de prueba

**Tests Unitarios (Frontend)**
- Componentes de formularios
- Hooks personalizados
- Utilidades de formateo y validación

**Tests E2E (Frontend)**
- Flujo completo de creación de paciente
- Flujo de cita con transcripción
- Navegación por historial médico

**Herramientas utilizadas:**
- Backend: Vitest + Supertest
- Frontend: Vitest + React Testing Library
- E2E: Playwright
- Mocking: MSW para APIs externas

**Ejemplo de test (Backend - Servicio de Pacientes):**
```typescript
describe('PatientsService', () => {
  it('debe crear paciente con todos los campos requeridos', async () => {
    const patientData = {
      firstName: 'Juan',
      lastName: 'García',
      dateOfBirth: '1985-03-15',
      gender: 'male'
    };

    const result = await patientsService.create(patientData, userId);

    expect(result.id).toBeDefined();
    expect(result.firstName).toBe('Juan');
  });
});
```
```

### 8. Create Testing Summary
Create `docs/testing/testing-summary.md` with:
- Test count by category
- Coverage targets
- Test execution commands
- CI/CD integration
- Mocking strategy summary

## Output Structure
```
docs/
├── ... (previous folders)
├── testing/
│   ├── strategy.md
│   ├── utilities.md
│   ├── testing-summary.md
│   ├── backend/
│   │   ├── unit-tests.md
│   │   └── integration-tests.md
│   ├── frontend/
│   │   └── unit-tests.md
│   └── e2e/
│       └── e2e-tests.md
└── deliverables/
    └── section-2-arquitectura.md (updated with 2.6)
```

## Success Criteria
- Testing strategy documented
- Backend unit test specifications complete
- Backend integration test specifications complete
- Frontend unit test specifications complete
- E2E test specifications complete
- Test utilities defined
- Section 2.6 filled with test details
- Testing summary created

## Next Prompt
The next prompt (12-tickets-definition.md) will create detailed work tickets based on all specifications.
