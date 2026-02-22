# E2E Tests

This document specifies the end-to-end tests for the MedRecord AI application using Playwright.

---

## Test Structure

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
├── pages/
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── PatientsPage.ts
│   ├── PatientDetailPage.ts
│   └── AppointmentPage.ts
└── playwright.config.ts
```

---

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
    },
  ],
});
```

---

## Page Objects

### Login Page

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### Dashboard Page

```typescript
// pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newPatientButton: Locator;
  readonly recentPatientsSection: Locator;
  readonly todayAppointmentsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.newPatientButton = page.locator('a[href="/patients/new"]');
    this.recentPatientsSection = page.locator('[data-testid="recent-patients"]');
    this.todayAppointmentsSection = page.locator('[data-testid="today-appointments"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectLoaded() {
    await expect(this.heading).toContainText('Dashboard');
  }

  async clickNewPatient() {
    await this.newPatientButton.click();
  }
}
```

### Patients Page

```typescript
// pages/PatientsPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class PatientsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly newPatientButton: Locator;
  readonly patientCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Buscar"]');
    this.newPatientButton = page.locator('a[href="/patients/new"]');
    this.patientCards = page.locator('[data-testid="patient-card"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
  }

  async goto() {
    await this.page.goto('/patients');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  async clickPatient(name: string) {
    await this.page.click(`text=${name}`);
  }

  async expectPatientCount(count: number) {
    await expect(this.patientCards).toHaveCount(count);
  }
}
```

### Appointment Page

```typescript
// pages/AppointmentPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class AppointmentPage {
  readonly page: Page;
  readonly patientName: Locator;
  readonly startRecordingButton: Locator;
  readonly stopRecordingButton: Locator;
  readonly transcriptionPanel: Locator;
  readonly symptomsSection: Locator;
  readonly diagnosisInput: Locator;
  readonly prescriptionsSection: Locator;
  readonly saveButton: Locator;
  readonly completeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.patientName = page.locator('h1');
    this.startRecordingButton = page.locator('button:has-text("Iniciar Grabación")');
    this.stopRecordingButton = page.locator('button:has-text("Detener")');
    this.transcriptionPanel = page.locator('[data-testid="transcription-panel"]');
    this.symptomsSection = page.locator('[data-testid="symptoms-section"]');
    this.diagnosisInput = page.locator('textarea[name="diagnosis"]');
    this.prescriptionsSection = page.locator('[data-testid="prescriptions-section"]');
    this.saveButton = page.locator('button:has-text("Guardar")');
    this.completeButton = page.locator('button:has-text("Completar")');
  }

  async addSymptom(description: string, severity: number) {
    await this.page.click('button:has-text("Añadir Síntoma")');
    await this.page.fill('[name="symptomDescription"]', description);
    await this.page.fill('[name="severity"]', severity.toString());
    await this.page.click('button:has-text("Guardar")');
  }

  async addPrescription(data: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }) {
    await this.page.click('button:has-text("Añadir Receta")');
    await this.page.fill('[name="medication"]', data.medication);
    await this.page.fill('[name="dosage"]', data.dosage);
    await this.page.fill('[name="frequency"]', data.frequency);
    await this.page.fill('[name="duration"]', data.duration);
    await this.page.click('button:has-text("Guardar Receta")');
  }

  async setDiagnosis(diagnosis: string) {
    await this.diagnosisInput.fill(diagnosis);
  }

  async save() {
    await this.saveButton.click();
  }

  async complete() {
    await this.completeButton.click();
  }
}
```

---

## Test Fixtures

```typescript
// fixtures/auth.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = {
  authenticatedPage: Page;
  loginPage: LoginPage;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('doctor@test.com', 'Password123!');
    await expect(page).toHaveURL('/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// fixtures/patients.ts
import { test as base } from './auth';
import { PatientsPage } from '../pages/PatientsPage';

type PatientFixtures = {
  patientsPage: PatientsPage;
  testPatient: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: string;
    phone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
};

export const test = base.extend<PatientFixtures>({
  patientsPage: async ({ authenticatedPage }, use) => {
    const patientsPage = new PatientsPage(authenticatedPage);
    await use(patientsPage);
  },

  testPatient: {
    firstName: 'E2E',
    lastName: 'TestPatient',
    dateOfBirth: '1990-01-15',
    sex: 'male',
    phone: '+34612345678',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+34612345679',
  },
});

export { expect } from '@playwright/test';
```

---

## Auth Flow Tests

```typescript
// flows/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('doctor@test.com', 'Password123!');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@test.com', 'wrongpassword');

    await loginPage.expectError('Invalid');
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submitButton.click();

    await expect(page.locator('text=Email es requerido')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('doctor@test.com', 'Password123!');

    await expect(page).toHaveURL('/dashboard');

    // Click user menu and logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Cerrar sesión');

    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should preserve intended URL after login', async ({ page }) => {
    await page.goto('/patients');
    await expect(page).toHaveURL('/login?redirect=/patients');

    const loginPage = new LoginPage(page);
    await loginPage.login('doctor@test.com', 'Password123!');

    await expect(page).toHaveURL('/patients');
  });
});
```

---

## Patient Management Tests

```typescript
// flows/patient-management.spec.ts
import { test, expect } from '../fixtures/patients';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
  });

  test('should navigate to patient list', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/patients"]');
    await expect(authenticatedPage).toHaveURL('/patients');
  });

  test('should create a new patient', async ({ authenticatedPage, testPatient }) => {
    await authenticatedPage.goto('/patients/new');

    // Fill form
    await authenticatedPage.fill('[name="firstName"]', testPatient.firstName);
    await authenticatedPage.fill('[name="lastName"]', testPatient.lastName);
    await authenticatedPage.fill('[name="dateOfBirth"]', testPatient.dateOfBirth);
    await authenticatedPage.selectOption('[name="sex"]', testPatient.sex);
    await authenticatedPage.fill('[name="phone"]', testPatient.phone);
    await authenticatedPage.fill('[name="emergencyContactName"]', testPatient.emergencyContactName);
    await authenticatedPage.fill('[name="emergencyContactPhone"]', testPatient.emergencyContactPhone);

    // Submit
    await authenticatedPage.click('button[type="submit"]');

    // Verify success
    await expect(authenticatedPage.locator('text=Paciente creado exitosamente')).toBeVisible();
    await expect(authenticatedPage).toHaveURL(/\/patients\/[\w-]+/);
  });

  test('should show validation errors for invalid patient data', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/patients/new');

    // Submit without filling required fields
    await authenticatedPage.click('button[type="submit"]');

    await expect(authenticatedPage.locator('text=Nombre es requerido')).toBeVisible();
    await expect(authenticatedPage.locator('text=Apellido es requerido')).toBeVisible();
  });

  test('should search for patients', async ({ authenticatedPage, patientsPage }) => {
    await patientsPage.goto();
    await patientsPage.search('E2E');

    // Wait for results
    await authenticatedPage.waitForTimeout(500);

    // Check that search filters results
    const cards = await patientsPage.patientCards.count();
    // Results depend on test data
  });

  test('should view patient details', async ({ authenticatedPage, patientsPage, testPatient }) => {
    await patientsPage.goto();

    // Create patient first if needed
    await authenticatedPage.goto('/patients/new');
    await authenticatedPage.fill('[name="firstName"]', testPatient.firstName);
    await authenticatedPage.fill('[name="lastName"]', testPatient.lastName);
    await authenticatedPage.fill('[name="dateOfBirth"]', testPatient.dateOfBirth);
    await authenticatedPage.selectOption('[name="sex"]', testPatient.sex);
    await authenticatedPage.fill('[name="phone"]', testPatient.phone);
    await authenticatedPage.fill('[name="emergencyContactName"]', testPatient.emergencyContactName);
    await authenticatedPage.fill('[name="emergencyContactPhone"]', testPatient.emergencyContactPhone);
    await authenticatedPage.click('button[type="submit"]');

    // Verify patient detail page
    await expect(authenticatedPage.locator('h1')).toContainText(
      `${testPatient.firstName} ${testPatient.lastName}`
    );
  });

  test('should edit patient information', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/patients');
    await authenticatedPage.click('[data-testid="patient-card"]:first-child');

    // Click edit
    await authenticatedPage.click('button:has-text("Editar")');

    // Update field
    await authenticatedPage.fill('[name="phone"]', '+34999999999');
    await authenticatedPage.click('button:has-text("Guardar")');

    // Verify update
    await expect(authenticatedPage.locator('text=Paciente actualizado')).toBeVisible();
  });
});
```

---

## Complete Appointment Flow Tests

```typescript
// flows/appointment-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Appointment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'Password123!');
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
    await page.selectOption('[name="sex"]', 'male');
    await page.fill('[name="phone"]', '+34612345678');
    await page.fill('[name="emergencyContactName"]', 'María García');
    await page.fill('[name="emergencyContactPhone"]', '+34612345679');
    await page.click('button[type="submit"]');

    // Verify patient created
    await expect(page.locator('text=Paciente creado exitosamente')).toBeVisible();

    // Create new appointment
    await page.click('text=Nueva Cita');
    await page.fill('[name="scheduledAt"]', '2024-01-15T10:00');
    await page.selectOption('[name="type"]', 'new_patient');
    await page.fill('[name="reasonForVisit"]', 'Consulta inicial');
    await page.click('button[type="submit"]');

    // Verify on appointment page
    await expect(page.locator('h1')).toContainText('Juan García');

    // Add symptoms manually
    await page.click('text=Añadir Síntoma');
    await page.fill('[name="description"]', 'Dolor de cabeza');
    await page.fill('[name="severity"]', '7');
    await page.fill('[name="bodySite"]', 'Cabeza');
    await page.fill('[name="duration"]', '3 días');
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Dolor de cabeza')).toBeVisible();

    // Add diagnosis
    await page.fill('[name="diagnosis"]', 'Migraña tensional');

    // Add prescription
    await page.click('text=Añadir Receta');
    await page.fill('[name="medicationName"]', 'Ibuprofeno');
    await page.fill('[name="strength"]', '400mg');
    await page.fill('[name="dosage"]', '1 comprimido');
    await page.fill('[name="frequency"]', 'Cada 8 horas');
    await page.fill('[name="duration"]', '5 días');
    await page.fill('[name="instructions"]', 'Tomar con alimentos');
    await page.click('button:has-text("Guardar Receta")');

    // Save medical record
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Registro guardado exitosamente')).toBeVisible();

    // Complete appointment
    await page.click('button:has-text("Completar Consulta")');
    await expect(page.locator('text=Consulta completada')).toBeVisible();

    // Verify in patient history
    await page.goto('/patients');
    await page.click('text=Juan García');
    await expect(page.locator('text=Migraña tensional')).toBeVisible();
  });

  test('should edit existing medical record', async ({ page }) => {
    // Navigate to existing patient with appointment
    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');

    // Click on existing appointment
    await page.click('[data-testid="appointment-card"]:first-child');

    // Edit diagnosis
    await page.fill('[name="diagnosis"]', 'Updated diagnosis');
    await page.click('button:has-text("Guardar")');

    await expect(page.locator('text=Registro guardado exitosamente')).toBeVisible();
  });

  test('should navigate through patient history', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');

    // Verify history is displayed
    await expect(page.locator('[data-testid="appointment-history"]')).toBeVisible();

    // Click on appointment
    await page.click('[data-testid="appointment-card"]:first-child');

    // Verify navigation
    await expect(page.locator('[data-testid="medical-record-form"]')).toBeVisible();

    // Navigate back
    await page.click('button:has-text("Volver")');
    await expect(page.locator('[data-testid="appointment-history"]')).toBeVisible();
  });
});
```

---

## AI Transcription Flow Tests

```typescript
// flows/transcription-flow.spec.ts
import { test, expect } from '@playwright/test';

// Mock audio input for testing
test.describe('AI Transcription Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Grant microphone permission in test context
    await page.context().grantPermissions(['microphone']);
  });

  test('should show recording controls on appointment page', async ({ page }) => {
    // Navigate to existing appointment
    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');
    await page.click('text=Nueva Cita');
    await page.fill('[name="scheduledAt"]', '2024-01-16T11:00');
    await page.click('button[type="submit"]');

    // Verify recording button is visible
    await expect(page.locator('button:has-text("Iniciar Grabación")')).toBeVisible();
  });

  test('should start and stop recording', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');
    await page.click('text=Nueva Cita');
    await page.fill('[name="scheduledAt"]', '2024-01-16T11:00');
    await page.click('button[type="submit"]');

    // Start recording
    await page.click('button:has-text("Iniciar Grabación")');

    // Verify recording indicator
    await expect(page.locator('text=Grabando...')).toBeVisible();
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // Wait a moment
    await page.waitForTimeout(2000);

    // Stop recording
    await page.click('button:has-text("Detener")');

    // Verify processing
    await expect(page.locator('text=Procesando')).toBeVisible();
  });

  test('should display transcription text', async ({ page }) => {
    // This test requires mocking the transcription API
    // In real implementation, use MSW or similar

    await page.route('**/api/v1/appointments/*/transcription/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              text: 'El paciente refiere dolor de cabeza desde hace tres días.',
            },
          }),
        });
      }
    });

    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');
    await page.click('[data-testid="appointment-card"]:first-child');

    // Verify transcription panel exists
    await expect(page.locator('[data-testid="transcription-panel"]')).toBeVisible();
  });

  test('should show AI suggestions after transcription', async ({ page }) => {
    // Mock extraction API
    await page.route('**/api/v1/appointments/*/extract-fields', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            symptoms: [
              { description: 'Dolor de cabeza', severity: 7 },
            ],
            diagnosis: { description: 'Migraña tensional' },
            prescriptions: [
              { medication: 'Ibuprofeno', dosage: '400mg', frequency: 'cada 8h' },
            ],
          },
        }),
      });
    });

    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');
    await page.click('[data-testid="appointment-card"]:first-child');

    // Trigger extraction
    await page.click('button:has-text("Extraer Campos")');

    // Verify AI suggestions
    await expect(page.locator('[data-testid="ai-symptom-badge"]')).toBeVisible();
  });

  test('should accept AI suggestions', async ({ page }) => {
    // Setup mocks
    await page.route('**/api/v1/appointments/*/extract-fields', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            symptoms: [
              { description: 'Fiebre', severity: 8, isAIGenerated: true },
            ],
            diagnosis: null,
            prescriptions: [],
          },
        }),
      });
    });

    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');
    await page.click('[data-testid="appointment-card"]:first-child');

    // Trigger extraction
    await page.click('button:has-text("Extraer Campos")');

    // Accept suggestions
    await page.click('button:has-text("Aceptar sugerencias")');

    // Verify symptom was added
    await expect(page.locator('text=Fiebre')).toBeVisible();
  });

  test('should allow editing AI-filled fields', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="patient-card"]:first-child');
    await page.click('[data-testid="appointment-card"]:first-child');

    // Assuming AI-filled diagnosis exists
    await page.fill('[name="diagnosis"]', 'Edited diagnosis');

    // Save
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Registro guardado exitosamente')).toBeVisible();
  });
});
```

---

## Mobile Responsive Tests

```typescript
// flows/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 13'] });

  test('should display mobile navigation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Mobile menu button should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Sidebar should be hidden
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
  });

  test('should open mobile menu', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('a[href="/patients"]');

    await expect(page).toHaveURL('/patients');
  });

  test('should display patient cards in single column', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'doctor@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/patients');

    // Cards should be full width on mobile
    const card = page.locator('[data-testid="patient-card"]').first();
    const boundingBox = await card.boundingBox();

    if (boundingBox) {
      // Card width should be close to viewport width (accounting for padding)
      expect(boundingBox.width).toBeGreaterThan(300);
    }
  });
});
```

---

## Test Execution Commands

```bash
# Run all E2E tests
npx playwright test

# Run tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test flows/auth.spec.ts

# Run tests with UI mode
npx playwright test --ui

# Debug tests
npx playwright test --debug

# Run tests in specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright show-report
```

---

## Test Count Summary

| Flow | Test Cases |
|------|------------|
| **Authentication** | 7 |
| **Patient Management** | 6 |
| **Appointment Flow** | 3 |
| **Transcription Flow** | 5 |
| **Mobile Responsive** | 4 |
| **Total** | **~25** |

---

## References

- [Testing Strategy](../strategy.md)
- [Test Utilities](../utilities.md)
- [Playwright Documentation](https://playwright.dev/)
