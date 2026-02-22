# Prompt 18b: Full Integration Testing & Debugging

## Context
You have completed implementing the AI transcription features. Before proceeding to deployment, we need to verify the ENTIRE system works end-to-end and fix any issues.

## Prerequisites
- All previous implementation prompts (13-18) completed
- All services can start
- Read `prompts/XX-testing-debugging-template.md` for the debugging process

## Objective
Perform comprehensive testing of the entire application, identify all bugs, fix them, and ensure the system is production-ready.

## Tasks

### 1. Environment Verification

**Start all services:**
```bash
# Start database
docker-compose -f docker/docker-compose.yml up -d

# Wait for database to be ready
sleep 5

# Verify database
docker exec health-record-postgres pg_isready -U healthrecord

# Run any pending migrations
cd packages/backend
pnpm db:migrate

# Seed test data (if needed)
pnpm db:seed

# Start backend (Terminal 1)
pnpm dev

# Start frontend (Terminal 2)
cd packages/frontend
pnpm dev
```

**Verify all services respond:**
```bash
# Database
docker exec health-record-postgres psql -U healthrecord -c "SELECT 1"

# Backend API
curl http://localhost:3001/api/health

# Frontend
curl -s http://localhost:3000 | head -20
```

**Document any startup errors and fix them before proceeding.**

---

### 2. Run All Automated Tests

```bash
# From project root
pnpm test
```

**If any tests fail:**
1. Note the failing tests
2. Create a checklist of failures
3. Fix each failure one by one
4. Re-run tests after each fix
5. Continue until all tests pass

**Test Failure Log:**
```markdown
## Test Failures

### [Test Name]
- File: [path]
- Error: [error message]
- Fix: [what you changed]
- Status: [ ] Fixed
```

---

### 3. E2E Test: Complete User Flow

Manually execute this complete flow. Document any issues found.

#### 3.1 Authentication Flow
```
1. Open http://localhost:3000
2. Should redirect to /login
3. Enter email: doctor@medrecord.com
4. Enter password: password123
5. Click "Iniciar Sesión"
6. Should redirect to /dashboard
7. Refresh the page
8. Should still be on dashboard (session persists)
```

**Issues found:**
- [ ] Issue: [description] → Fix: [solution]

#### 3.2 Patient Management Flow
```
1. Navigate to Patients (/patients)
2. Should see list of seeded patients
3. Use search to filter patients
4. Click "Nuevo Paciente"
5. Fill form:
   - Nombre: Test
   - Apellido: Patient
   - Fecha de nacimiento: 1990-05-15
   - Género: Masculino
   - Teléfono: +34600123456
6. Submit form
7. Should see success message
8. Should redirect to patient list or detail
9. New patient should appear in list
```

**Issues found:**
- [ ] Issue: [description] → Fix: [solution]

#### 3.3 Patient Detail Flow
```
1. Click on a patient with existing appointments
2. Should see patient information
3. Should see appointment history
4. Click on a past appointment
5. Should see medical record details
```

**Issues found:**
- [ ] Issue: [description] → Fix: [solution]

#### 3.4 New Appointment Flow
```
1. From patient detail, click "Nueva Cita"
2. Set date/time to future
3. Submit
4. Should redirect to appointment page
5. Appointment status should be "Scheduled"
```

**Issues found:**
- [ ] Issue: [description] → Fix: [solution]

#### 3.5 Medical Record Flow (Manual Entry)
```
1. On appointment page, click "Iniciar Cita"
2. Status should change to "In Progress"
3. Add a symptom:
   - Descripción: Dolor de cabeza
   - Severidad: Moderado
4. Symptom should appear in list
5. Add diagnosis:
   - Descripción: Migraña tensional
6. Add prescription:
   - Medicamento: Ibuprofeno
   - Dosis: 400mg
   - Frecuencia: Cada 8 horas
   - Duración: 5 días
7. Click "Guardar"
8. Should see success message
9. Refresh page - data should persist
```

**Issues found:**
- [ ] Issue: [description] → Fix: [solution]

#### 3.6 AI Transcription Flow
```
1. On a new appointment, click "Iniciar Grabación"
2. Browser should request microphone permission
3. Allow microphone
4. Recording indicator should show
5. Duration counter should increment
6. Speak: "El paciente presenta dolor de cabeza desde hace tres días,
   de intensidad moderada. Diagnóstico: cefalea tensional.
   Se prescribe ibuprofeno 400mg cada 8 horas durante 5 días."
7. After 30 seconds, transcription should start appearing
8. AI extraction status should update
9. Fields should auto-populate (or show suggestions)
10. Click "Detener Grabación"
11. Final transcription should appear
12. All extracted fields should be visible
13. Click "Guardar"
14. Refresh - transcription and fields should persist
```

**Issues found:**
- [ ] Issue: [description] → Fix: [solution]

---

### 4. API Endpoint Testing

Test each API endpoint directly:

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"
```

#### Test each endpoint:
```bash
# Patients
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/patients | jq

# Single patient
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/patients/patient-1 | jq

# Appointments
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/v1/appointments?patientId=patient-1" | jq

# Medical Record
APPOINTMENT_ID="[get from previous response]"
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/appointments/$APPOINTMENT_ID/medical-record | jq
```

**Document any API errors and fix them.**

---

### 5. Error Handling Verification

Test that errors are handled gracefully:

```bash
# Invalid login
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com","password":"wrong"}' | jq
# Should return 401 with error message

# Unauthorized access
curl -s http://localhost:3001/api/v1/patients | jq
# Should return 401

# Invalid patient ID
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/patients/invalid-uuid | jq
# Should return 404

# Invalid data
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v1/patients \
  -d '{"firstName":""}' | jq
# Should return 422 with validation errors
```

---

### 6. Browser Compatibility Check

Test in multiple browsers (if available):
- [ ] Chrome
- [ ] Firefox
- [ ] Edge

For each browser, verify:
- [ ] Login works
- [ ] Navigation works
- [ ] Forms submit correctly
- [ ] Audio recording works (for transcription)
- [ ] WebSocket connection establishes
- [ ] No console errors

---

### 7. Performance Basic Check

```bash
# Check response times
time curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/patients > /dev/null

# Check for N+1 queries (watch backend logs during list requests)
# Should not see repeated individual queries
```

---

### 8. Fix All Issues Found

For each issue identified above:

1. **Analyze the issue**
   - What's the expected behavior?
   - What's the actual behavior?
   - Where is the bug likely located?

2. **Fix the issue**
   - Make minimal changes
   - Don't introduce new bugs

3. **Verify the fix**
   - Re-test the specific scenario
   - Run automated tests
   - Check for regressions

4. **Document the fix**
   - Update debug-log.md
   - Note any patterns for future reference

---

### 9. Final Verification

After fixing all issues:

```bash
# Run all tests
pnpm test

# Build both packages
pnpm build

# Restart services cleanly
docker-compose down
docker-compose up -d
pnpm dev
```

Execute the complete E2E flow one more time to confirm everything works.

---

### 10. Create Test Report

Create `docs/testing/integration-test-report.md`:

```markdown
# Integration Test Report

**Date:** [DATE]
**Tester:** Claude Code

## Summary
- Total test scenarios: X
- Passed: X
- Fixed during testing: X
- Known issues: X

## Test Results

### Authentication
- [x] Login with valid credentials
- [x] Login rejection with invalid credentials
- [x] Session persistence
- [x] Logout

### Patient Management
- [x] List patients
- [x] Search patients
- [x] Create patient
- [x] View patient detail
- [x] Edit patient

### Appointments
- [x] Create appointment
- [x] View appointment
- [x] Change appointment status

### Medical Records
- [x] Add symptoms
- [x] Add diagnosis
- [x] Add prescriptions
- [x] Save medical record
- [x] Data persistence

### AI Transcription
- [x] Audio recording
- [x] Real-time transcription
- [x] Field extraction
- [x] Auto-fill suggestions
- [x] Final transcription save

## Issues Fixed
1. [Issue description] - [Fix applied]
2. ...

## Known Limitations
1. [Any remaining issues that are acceptable for MVP]
```

---

## Commit

Only after ALL tests pass:

```bash
git add .
git commit -m "test: complete integration testing and bug fixes

- Fixed [list major bugs fixed]
- All E2E flows verified
- Integration test report created

System ready for deployment"
```

## Definition of Done
- [ ] All services start without errors
- [ ] All automated tests pass
- [ ] All E2E scenarios pass
- [ ] All API endpoints tested
- [ ] Error handling verified
- [ ] No console errors
- [ ] Test report created
- [ ] All fixes committed

## Next Prompt
Proceed to `19-deployment.md` only after this checklist is 100% complete.
