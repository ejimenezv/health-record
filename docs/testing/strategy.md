# Testing Strategy

This document defines the testing strategy for the MedRecord AI MVP, including the testing pyramid, coverage goals, and testing philosophy.

---

## Testing Pyramid

```
              /\
             /E2E\              <- Few, critical user flows
            /──────\
           /Integration\        <- API endpoints, DB operations
          /──────────────\
         /    Unit Tests   \    <- Many, fast, isolated
        /────────────────────\
```

The testing pyramid represents our approach to test distribution:

| Level | Quantity | Speed | Scope |
|-------|----------|-------|-------|
| **Unit Tests** | Many (~70%) | Fast (ms) | Individual functions, services |
| **Integration Tests** | Moderate (~20%) | Medium (s) | API endpoints, DB operations |
| **E2E Tests** | Few (~10%) | Slow (min) | Critical user flows |

---

## Coverage Goals

### Backend Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| **Services** | 80% | Core business logic |
| **Utilities** | 80% | Reusable helper functions |
| **Validators** | 70% | Input validation schemas |
| **Controllers** | 60% | Request/response handling |
| **Repositories** | Tested via integration | Database operations |

### Frontend Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| **Hooks** | 70% | State management logic |
| **Utilities** | 80% | Formatting, validation |
| **Components** | 60% | UI rendering and interactions |
| **Pages** | Tested via E2E | Full page flows |

### E2E Coverage

| Flow | Priority | Description |
|------|----------|-------------|
| Authentication | P0 | Login/logout flow |
| Patient Management | P0 | Create, search, view patient |
| Appointment Flow | P0 | Create appointment, document visit |
| AI Transcription | P0 | Record, transcribe, extract fields |

---

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Tests should survive refactoring
   - Avoid testing private methods directly

2. **User-Centric Testing**
   - Write tests from the user's perspective
   - E2E tests should mirror real user workflows
   - Component tests should verify visible behavior

3. **Fast Feedback Loop**
   - Unit tests should run in milliseconds
   - Watch mode for immediate feedback during development
   - CI pipeline should complete in under 10 minutes

4. **Realistic Test Data**
   - Use factories for consistent test data generation
   - Test data should resemble production data
   - Include edge cases (special characters, long strings)

5. **Mock External Services**
   - Always mock OpenAI API calls
   - Use MSW for frontend API mocking
   - Maintain mock responses that match real API structure

### What to Test

| Always Test | Sometimes Test | Rarely Test |
|-------------|----------------|-------------|
| Business logic | Complex UI interactions | Simple getters/setters |
| Validation rules | Conditional rendering | Framework code |
| Error handling | State transitions | Third-party libraries |
| API contracts | Edge cases | Configuration files |
| Security features | Performance-critical paths | Trivial functions |

### Test Isolation

- Each test should be independent
- No shared mutable state between tests
- Database reset between integration tests
- Mock all external dependencies

---

## Test Environment

### Backend Test Environment

```bash
# .env.test
NODE_ENV=test
DATABASE_URL="postgresql://test:test@localhost:5432/medrecord_test"
JWT_SECRET="test-secret-key-minimum-32-characters-for-hs256"
OPENAI_API_KEY="sk-test-mock-key"
```

### Frontend Test Environment

```bash
# .env.test
VITE_API_URL="http://localhost:3001/api"
```

### Test Database

- Separate PostgreSQL database for testing
- Run migrations before test suite
- Reset data between tests (truncate tables)
- Use transactions for test isolation when possible

---

## Tooling Stack

### Backend

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner, assertions |
| **Supertest** | HTTP integration testing |
| **Prisma** | Test database management |
| **vi.mock()** | Service/module mocking |

### Frontend

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner, assertions |
| **React Testing Library** | Component testing |
| **@testing-library/user-event** | User interaction simulation |
| **MSW** | API mocking |

### E2E

| Tool | Purpose |
|------|---------|
| **Playwright** | Browser automation |
| **Test fixtures** | Reusable test data/setup |

---

## Test Organization

### File Naming Convention

```
# Unit tests
*.test.ts       # Backend unit tests
*.test.tsx      # Frontend component tests

# Integration tests
*.routes.test.ts    # API route tests
*.repository.test.ts # Repository tests

# E2E tests
*.spec.ts       # Playwright tests
```

### Directory Structure

```
packages/backend/
└── tests/
    ├── unit/
    │   ├── services/
    │   ├── utils/
    │   └── validators/
    ├── integration/
    │   ├── routes/
    │   └── repositories/
    ├── fixtures/
    └── setup.ts

packages/frontend/
└── tests/
    ├── unit/
    │   ├── components/
    │   ├── hooks/
    │   └── utils/
    ├── e2e/
    │   ├── flows/
    │   └── fixtures/
    └── setup.ts
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
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
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run backend tests
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/medrecord_test
          JWT_SECRET: test-secret-key-minimum-32-characters
        run: |
          npx prisma generate
          npx prisma migrate deploy
          npm run test:coverage

      - name: Run frontend tests
        working-directory: packages/frontend
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Quality Gates

| Metric | Threshold | Action |
|--------|-----------|--------|
| Unit test coverage | 70% | Block PR if below |
| Integration tests pass | 100% | Block PR if failing |
| E2E critical flows | 100% | Block deployment |
| No new regressions | 0 | Block PR if detected |

---

## Test Execution Commands

### Backend

```bash
# Run all tests
npm run test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- services/patients.service.test.ts

# Run integration tests only
npm run test:integration
```

### Frontend

```bash
# Run all tests
npm run test

# Run with watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### E2E

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (headed)
npm run test:e2e:headed

# Run specific flow
npx playwright test flows/auth.spec.ts

# Debug mode
npx playwright test --debug
```

---

## References

- [Backend Unit Tests](./backend/unit-tests.md)
- [Backend Integration Tests](./backend/integration-tests.md)
- [Frontend Unit Tests](./frontend/unit-tests.md)
- [E2E Tests](./e2e/e2e-tests.md)
- [Test Utilities](./utilities.md)
- [Testing Summary](./testing-summary.md)
