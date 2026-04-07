# Testing & Debugging Process Template

## Use This Process After Each Implementation Prompt

This template defines the iterative testing and debugging loop that MUST be executed after completing any implementation prompt. Do NOT commit or proceed to the next prompt until all verification steps pass.

---

## Phase 1: Automated Testing

### 1.1 Run Unit Tests
```bash
# Backend
cd packages/backend
pnpm test

# Frontend
cd packages/frontend
pnpm test
```

**If tests fail:**
1. Read the error message carefully
2. Identify the failing test file and line number
3. Check if the error is in the test or in the implementation
4. Fix the issue
5. Re-run tests
6. Repeat until all tests pass

### 1.2 Run Linting
```bash
pnpm lint
```

**If linting fails:**
1. Run `pnpm lint --fix` to auto-fix issues
2. Manually fix remaining issues
3. Re-run linting
4. Repeat until no errors

### 1.3 Run Type Checking
```bash
# Backend
cd packages/backend
pnpm tsc --noEmit

# Frontend
cd packages/frontend
pnpm tsc --noEmit
```

**If type errors exist:**
1. Read each error message
2. Fix type mismatches, missing types, or incorrect interfaces
3. Re-run type checking
4. Repeat until no errors

---

## Phase 2: Build Verification

### 2.1 Build Backend
```bash
cd packages/backend
pnpm build
```

**If build fails:**
1. Check for import errors
2. Check for missing dependencies
3. Verify environment variables
4. Fix and rebuild

### 2.2 Build Frontend
```bash
cd packages/frontend
pnpm build
```

**If build fails:**
1. Check for TypeScript errors
2. Check for missing assets
3. Verify environment variables
4. Fix and rebuild

---

## Phase 3: Integration Verification

### 3.1 Start All Services
```bash
# Terminal 1: Database
docker-compose -f docker/docker-compose.yml up -d

# Terminal 2: Backend
cd packages/backend
pnpm dev

# Terminal 3: Frontend
cd packages/frontend
pnpm dev
```

### 3.2 Verify Services Are Running
```bash
# Check database
docker ps  # Should show postgres running

# Check backend
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}

# Check frontend
# Open http://localhost:3000 in browser
```

**If services don't start:**
1. Check terminal output for errors
2. Verify database is running: `docker-compose logs postgres`
3. Check port conflicts: `netstat -an | grep 3001`
4. Verify environment variables are set
5. Check for missing dependencies

---

## Phase 4: Manual Testing Checklist

Execute these manual tests based on what was implemented:

### Authentication (if implemented)
- [ ] Open http://localhost:3000/login
- [ ] Enter invalid credentials → Should show error
- [ ] Enter valid credentials (doctor@medrecord.com / password123) → Should redirect to dashboard
- [ ] Refresh page → Should stay logged in
- [ ] Click logout → Should redirect to login

### Patient Management (if implemented)
- [ ] Navigate to patients list
- [ ] Search for a patient by name
- [ ] Click on a patient → Should show details
- [ ] Create a new patient with valid data
- [ ] Create a patient with missing required field → Should show validation error
- [ ] Edit a patient's information
- [ ] Delete a patient (if applicable)

### Appointment Management (if implemented)
- [ ] View patient's appointment history
- [ ] Create a new appointment
- [ ] Start an appointment (change status to IN_PROGRESS)
- [ ] Complete an appointment (change status to COMPLETED)

### Medical Records (if implemented)
- [ ] Open an appointment
- [ ] Add a symptom manually
- [ ] Edit a symptom
- [ ] Delete a symptom
- [ ] Add a diagnosis
- [ ] Add a prescription
- [ ] Save the medical record
- [ ] Refresh page → Data should persist

### AI Transcription (if implemented)
- [ ] Open an appointment
- [ ] Click "Start Recording"
- [ ] Speak for 30+ seconds
- [ ] Verify transcription appears in real-time
- [ ] Verify AI suggestions appear for symptoms/diagnosis
- [ ] Accept an AI suggestion
- [ ] Click "Stop Recording"
- [ ] Verify final transcription is saved

---

## Phase 5: Error Debugging Workflow

### When You Encounter an Error

**Step 1: Identify the Error Type**
- Is it a frontend error? (Check browser console)
- Is it a backend error? (Check terminal/logs)
- Is it a database error? (Check Prisma/PostgreSQL logs)
- Is it a network error? (Check Network tab in browser)

**Step 2: Gather Information**
```bash
# Backend logs
cd packages/backend
pnpm dev 2>&1 | tee backend.log

# Check database
docker-compose logs postgres

# Frontend console
# Open browser DevTools (F12) → Console tab
```

**Step 3: Common Issues & Solutions**

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `ECONNREFUSED` | Database not running | `docker-compose up -d` |
| `401 Unauthorized` | Invalid/expired token | Check auth middleware, verify token |
| `404 Not Found` | Wrong route or missing endpoint | Check route definition |
| `422 Validation Error` | Invalid request data | Check request body against schema |
| `500 Internal Server` | Backend crash | Check server logs for stack trace |
| `CORS Error` | CORS not configured | Add origin to CORS config |
| `WebSocket Error` | WS connection failed | Check WS URL, verify server running |
| `Prisma Error` | Database schema mismatch | Run `pnpm db:migrate` |

**Step 4: Fix and Verify**
1. Make the fix
2. Restart affected service
3. Re-test the failing scenario
4. Verify no regressions in other features

---

## Phase 6: Documentation of Issues

### Create Debug Log
If you encounter and fix significant issues, document them:

Create/update `docs/implementation/debug-log.md`:
```markdown
## [Date] - [Feature/Ticket]

### Issue
[Description of the problem]

### Error Message
```
[Exact error message]
```

### Root Cause
[What was causing the issue]

### Solution
[How it was fixed]

### Files Changed
- [path/to/file.ts]
```

---

## Phase 7: Final Verification Before Commit

### Pre-Commit Checklist
- [ ] All unit tests pass
- [ ] All integration tests pass (if applicable)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Both frontend and backend build successfully
- [ ] Services start without errors
- [ ] Manual testing scenarios pass
- [ ] No console errors in browser
- [ ] No unhandled errors in backend logs

### Commit Only When ALL Checks Pass
```bash
git add .
git commit -m "[commit message]"
```

---

## Troubleshooting Reference

### Reset Everything
If you're stuck and need a clean slate:
```bash
# Stop all services
docker-compose down

# Remove node_modules
rm -rf node_modules packages/*/node_modules

# Remove database data
docker volume rm health-record_postgres_data

# Reinstall
pnpm install

# Restart database
docker-compose up -d

# Re-run migrations and seed
pnpm db:migrate
pnpm db:seed

# Start fresh
pnpm dev
```

### Verify Database State
```bash
# Open Prisma Studio
cd packages/backend
pnpm db:studio

# Or connect directly
docker exec -it health-record-postgres psql -U healthrecord healthrecord
```

### Check API Directly
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' \
  | jq -r '.data.token')

# Use token for authenticated requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/patients
```
