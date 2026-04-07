# Testing Technology Stack: MedRecord AI

This document defines the testing technology stack for the Medical Record System MVP, including unit tests, integration tests, and end-to-end tests.

---

## Overview

| Test Type | Frontend | Backend |
|-----------|----------|---------|
| **Unit Tests** | Vitest | Vitest |
| **Component Tests** | React Testing Library | - |
| **Integration Tests** | - | Supertest |
| **E2E Tests** | Playwright | - |
| **Coverage** | Vitest Coverage | Vitest Coverage |

---

## Frontend Testing

### Test Runner: Vitest

| Specification | Value |
|---------------|-------|
| **Runner** | Vitest |
| **Version** | 1.x |
| **Config** | vitest.config.ts |
| **Environment** | jsdom |

### Why Vitest

| Runner | Pros | Cons | Decision |
|--------|------|------|----------|
| **Vitest** | Native Vite integration, fast, Jest-compatible API | Newer | **Selected** |
| Jest | Mature, widely used | Slower, separate config | Rejected |

### Vitest Configuration

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup File

```typescript
// frontend/src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock matchMedia
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

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

---

## React Testing Library

### Installation

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x"
  }
}
```

### Component Test Example

```typescript
// src/components/patients/PatientCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PatientCard } from './PatientCard';

const mockPatient = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1985-03-15',
  phone: '+1-555-0100',
  sex: 'male' as const,
};

describe('PatientCard', () => {
  it('renders patient information', () => {
    render(<PatientCard patient={mockPatient} onClick={() => {}} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0100')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<PatientCard patient={mockPatient} onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith(mockPatient);
  });

  it('displays patient initials', () => {
    render(<PatientCard patient={mockPatient} onClick={() => {}} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
```

### Hook Test Example

```typescript
// src/hooks/usePatients.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { usePatients } from './usePatients';
import api from '@/lib/api';

vi.mock('@/lib/api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePatients', () => {
  it('fetches patients successfully', async () => {
    const mockPatients = [
      { id: '1', firstName: 'John', lastName: 'Doe' },
      { id: '2', firstName: 'Jane', lastName: 'Smith' },
    ];

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: mockPatients, pagination: { total: 2 } },
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].firstName).toBe('John');
  });

  it('handles search parameter', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: [], pagination: { total: 0 } },
    });

    renderHook(() => usePatients('john'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/patients', {
        params: { search: 'john', page: 1, limit: 20 },
      });
    });
  });
});
```

### Form Test Example

```typescript
// src/components/patients/PatientForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PatientForm } from './PatientForm';

describe('PatientForm', () => {
  it('validates required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<PatientForm onSubmit={onSubmit} />);

    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<PatientForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.selectOptions(screen.getByLabelText(/sex/i), 'male');
    await user.type(screen.getByLabelText(/phone/i), '+1-555-0100');
    await user.type(screen.getByLabelText(/emergency contact name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/emergency contact phone/i), '+1-555-0101');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });
  });
});
```

---

## Backend Testing

### Test Runner: Vitest

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/index.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup

```typescript
// backend/src/test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Clean up test data (use with caution)
  // This runs after each test - consider using transactions instead
});
```

---

## Integration Testing: Supertest

### Installation

```json
{
  "devDependencies": {
    "supertest": "^6.x",
    "@types/supertest": "^6.x"
  }
}
```

### API Test Example

```typescript
// backend/src/routes/patient.routes.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';

describe('Patient Routes', () => {
  let authToken: string;
  let providerId: string;

  beforeAll(async () => {
    // Create test provider
    const provider = await prisma.provider.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'Doctor',
      },
    });
    providerId = provider.id;
    authToken = generateToken(provider.id, provider.email);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.patient.deleteMany({
      where: { appointments: { some: { providerId } } },
    });
    await prisma.provider.delete({ where: { id: providerId } });
  });

  describe('GET /api/v1/patients', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/patients');

      expect(response.status).toBe(401);
    });

    it('returns patients list with auth', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('supports search parameter', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .query({ search: 'john' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/patients', () => {
    it('creates a new patient', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1985-03-15T00:00:00.000Z',
        sex: 'male',
        phone: '+1-555-0100',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1-555-0101',
      };

      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.id).toBeDefined();

      // Cleanup
      await prisma.patient.delete({ where: { id: response.body.data.id } });
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'John' }); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### Service Test Example

```typescript
// backend/src/services/patient.service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { patientService } from './patient.service';
import { prisma } from '../lib/prisma';

describe('PatientService', () => {
  let testPatientId: string;

  beforeAll(async () => {
    const patient = await prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male',
        phone: '+1-555-9999',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+1-555-9998',
      },
    });
    testPatientId = patient.id;
  });

  afterAll(async () => {
    await prisma.patient.delete({ where: { id: testPatientId } });
  });

  describe('findAll', () => {
    it('returns paginated patients', async () => {
      const result = await patientService.findAll({ page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('filters by search term', async () => {
      const result = await patientService.findAll({
        search: 'Test',
        page: 1,
        limit: 10,
      });

      expect(result.data.some((p) => p.firstName === 'Test')).toBe(true);
    });
  });

  describe('findById', () => {
    it('returns patient by id', async () => {
      const patient = await patientService.findById(testPatientId);

      expect(patient.id).toBe(testPatientId);
      expect(patient.firstName).toBe('Test');
    });

    it('throws NotFoundError for invalid id', async () => {
      await expect(
        patientService.findById('invalid-id')
      ).rejects.toThrow('Patient not found');
    });
  });
});
```

---

## E2E Testing: Playwright

### Installation

```json
{
  "devDependencies": {
    "@playwright/test": "^1.x"
  }
}
```

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: './frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      cwd: './backend',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### E2E Test Example

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'doctor@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Invalid');
  });
});
```

### Patient Flow E2E Test

```typescript
// e2e/patient-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'doctor@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create a new patient', async ({ page }) => {
    await page.click('a[href="/patients/new"]');

    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'TestPatient');
    await page.fill('input[name="dateOfBirth"]', '1990-01-15');
    await page.selectOption('select[name="sex"]', 'male');
    await page.fill('input[name="phone"]', '+1-555-0199');
    await page.fill('input[name="emergencyContactName"]', 'Emergency Contact');
    await page.fill('input[name="emergencyContactPhone"]', '+1-555-0198');

    await page.click('button[type="submit"]');

    // Should redirect to patient profile
    await expect(page).toHaveURL(/\/patients\/[\w-]+/);
    await expect(page.locator('h1')).toContainText('E2E TestPatient');
  });

  test('should search for patients', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'E2E');
    await page.press('input[placeholder*="Search"]', 'Enter');

    await expect(page.locator('[data-testid="patient-card"]')).toContainText('E2E');
  });
});
```

---

## Test Database Strategy

### Separate Test Database

```bash
# .env.test
DATABASE_URL="postgresql://test:test@localhost:5432/medrecord_test?schema=public"
JWT_SECRET="test-secret-key-minimum-32-characters"
```

### Database Setup for Tests

```typescript
// backend/src/test/db-setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Reset database
  execSync('npx prisma migrate reset --force', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });

  // Seed test data
  await prisma.provider.create({
    data: {
      email: 'doctor@example.com',
      passwordHash: await hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Doctor',
    },
  });
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
}
```

### Test Isolation with Transactions

```typescript
// backend/src/test/utils.ts
import { PrismaClient } from '@prisma/client';

export function createTestContext() {
  const prisma = new PrismaClient();

  return {
    prisma,
    async setup() {
      // Begin transaction
      await prisma.$executeRaw`BEGIN`;
    },
    async teardown() {
      // Rollback transaction
      await prisma.$executeRaw`ROLLBACK`;
      await prisma.$disconnect();
    },
  };
}
```

---

## Coverage Thresholds

### Frontend

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 60,
    branches: 60,
    functions: 60,
    lines: 60,
  },
}
```

### Backend

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  },
}
```

### MVP Coverage Goals

| Area | Target | Rationale |
|------|--------|-----------|
| **Critical Paths** | 80%+ | Auth, patient CRUD, record save |
| **Business Logic** | 70%+ | Services, validation |
| **UI Components** | 60%+ | Core components |
| **Utilities** | 50%+ | Helper functions |

---

## Test Scripts

### Frontend

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

### Backend

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:integration": "vitest run --config vitest.integration.config.ts"
  }
}
```

### E2E

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

---

## Mocking Strategies

### API Mocking (Frontend)

```typescript
// src/test/mocks/api.ts
import { vi } from 'vitest';

export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/api', () => ({
  default: mockApi,
}));
```

### OpenAI Mocking (Backend)

```typescript
// backend/src/test/mocks/openai.ts
import { vi } from 'vitest';

export const mockOpenAI = {
  audio: {
    transcriptions: {
      create: vi.fn().mockResolvedValue('Mock transcript text'),
    },
  },
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                chiefComplaint: 'Headache',
                symptoms: [],
                prescriptions: [],
              }),
            },
          },
        ],
      }),
    },
  },
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI),
}));
```

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: medrecord_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install and test frontend
        working-directory: frontend
        run: |
          npm ci
          npm run test:coverage

      - name: Install and test backend
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/medrecord_test
          JWT_SECRET: test-secret-key-min-32-characters
        run: |
          npm ci
          npx prisma generate
          npx prisma migrate deploy
          npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Prisma](https://www.prisma.io/docs/guides/testing)
