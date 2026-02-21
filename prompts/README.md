# Prompts Index - Medical Record System MVP

This folder contains sequential prompts for building the Medical Record System MVP with AI transcription capabilities.

---

## Git Workflow & Deliveries

**IMPORTANT:** Before starting any prompts, read `00a-git-workflow.md` for the branching strategy.

### Three Deliveries
| Delivery | Branch | Prompts | PR |
|----------|--------|---------|-----|
| Entrega 1 (Docs) | `feature-entrega1-[INICIALES]` | 00-12 | PR #1 |
| Entrega 2 (Code) | `feature-entrega2-[INICIALES]` | 13-18b | PR #2 |
| Final | `finalproject-[INICIALES]` | 19-21 | PR #3 |

### Commit Strategy
- Commit after EACH prompt passes testing
- Use conventional commit messages
- Document all PRs for Section 7

---

## Execution Process

### Key Rule: Test Before Proceeding
**IMPORTANT:** After each implementation prompt, you MUST follow the testing process in `XX-testing-debugging-template.md` before committing and moving to the next prompt.

```
┌─────────────────┐
│ Read Prompt     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Implement       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Run Tests       │────▶│ Fix Errors      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │◀──────────────────────┘
         │
         ▼
    Tests Pass?
    ┌───┴───┐
    │       │
   Yes      No ─────▶ Debug & Fix ─────┐
    │                                  │
    ▼                                  │
┌─────────────────┐                    │
│ Manual Test     │◀───────────────────┘
└────────┬────────┘
         │
         ▼
    All Works?
    ┌───┴───┐
    │       │
   Yes      No ─────▶ Debug & Fix ─────┐
    │                                  │
    ▼                                  │
┌─────────────────┐                    │
│ Commit          │◀───────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Next Prompt     │
└─────────────────┘
```

---

## Prompt Sequence

### Phase 0: Setup

| # | File | Purpose |
|---|------|---------|
| 00a | `00a-git-workflow.md` | **START HERE** - Git branching & PR strategy |

### Phase 1: Documentation & Planning (Prompts 00-12)

**Branch:** `feature-entrega1-[INICIALES]`

These prompts create all documentation BEFORE any code is written.

| # | File | Purpose | Creates |
|---|------|---------|---------|
| 00 | `00-research-medical-records.md` | Research EMR fields & AI transcription | `docs/research/` |
| 01 | `01-product-definition.md` | Define product & features | `docs/product/`, Section 1 |
| 02 | `02-user-stories.md` | User stories with acceptance criteria | `docs/stories/`, Section 5 |
| 03 | `03-system-architecture.md` | System architecture & diagrams | `docs/architecture/`, Section 2 |
| 04 | `04-tech-stack.md` | Complete technology stack | `docs/tech-stack/` |
| 05 | `05-ai-integration.md` | AI integration specifications | `docs/ai-integration/` |
| 06 | `06-data-modeling.md` | Prisma schema & data model | `docs/data-model/`, Section 3 |
| 07 | `07-project-structure.md` | Monorepo folder structure | `docs/project-structure/` |
| 08 | `08-api-specification.md` | OpenAPI specification | `docs/api/`, Section 4 |
| 09 | `09-frontend-specification.md` | React components & pages | `docs/frontend/` |
| 10 | `10-ui-ux-refinement.md` | Design system & interactions | `docs/ui-ux/` |
| 11 | `11-testing-specifications.md` | Testing strategy | `docs/testing/` |
| 12 | `12-tickets-definition.md` | Work tickets | `docs/tickets/`, Section 6 |

### Phase 2: Implementation (Prompts 13-18)

**Branch:** `feature-entrega2-[INICIALES]`

These prompts implement the actual code. **Each must pass testing before proceeding.**

| # | File | Purpose | Implements |
|---|------|---------|------------|
| 13 | `13-implement-ticket-000.md` | Project setup | Monorepo, configs, Docker |
| 14 | `14-implement-ticket-001.md` | Database | Prisma schema, migrations, seed |
| 15 | `15-implement-ticket-002-003.md` | Authentication | JWT auth, login page |
| 16 | `16-implement-tickets-004-007.md` | Core CRUD | Patients, appointments |
| 17 | `17-implement-tickets-008-009.md` | Medical records | Symptoms, diagnosis, prescriptions |
| 18 | `18-implement-tickets-010-011.md` | **AI Transcription** | Whisper, GPT-4, WebSockets |

### Phase 2b: Testing (Prompt 18b)

| # | File | Purpose |
|---|------|---------|
| 18b | `18b-integration-testing.md` | Full E2E testing & bug fixing |
| XX | `XX-testing-debugging-template.md` | Reference for debugging process |

### Phase 3: Deployment & Delivery (Prompts 19-21)

**Branch:** `finalproject-[INICIALES]`

| # | File | Purpose |
|---|------|---------|
| 19 | `19-deployment.md` | Docker, Nginx, CI/CD, Ubuntu setup |
| 20 | `20-final-documentation.md` | README, prompts.md, final docs |
| 21 | `21-project-delivery.md` | Fill plantilla-de-trabajo.md |

---

## How to Execute a Prompt

### In Each Claude Code Session:

1. **Start the session with context:**
   ```
   I'm continuing the Medical Record System project.
   Please read and execute prompt [NUMBER]: [prompts/XX-name.md]
   ```

2. **Claude will:**
   - Read the prompt file
   - Read prerequisites (previous documentation)
   - Execute the tasks
   - Create/modify files as specified

3. **After implementation, say:**
   ```
   Now let's test this implementation following the testing template.
   Read prompts/XX-testing-debugging-template.md and verify everything works.
   ```

4. **Debug loop:**
   ```
   [If tests fail]
   The test for X failed with error Y. Please debug and fix it.
   ```

5. **When ready to commit:**
   ```
   All tests pass. Please commit with the message specified in the prompt.
   ```

6. **End session and start new one for next prompt.**

---

## Testing Checkpoints

### After Prompt 13 (Project Setup)
- [ ] `pnpm install` works
- [ ] `pnpm dev` starts both services
- [ ] Health endpoint responds

### After Prompt 14 (Database)
- [ ] Migrations run successfully
- [ ] Seed data populates
- [ ] Prisma Studio shows data

### After Prompt 15 (Authentication)
- [ ] Login API works
- [ ] Login page works
- [ ] Protected routes redirect correctly

### After Prompt 16 (Patients & Appointments)
- [ ] CRUD operations work via API
- [ ] UI lists, creates, edits patients
- [ ] Appointment creation works

### After Prompt 17 (Medical Records)
- [ ] Medical record CRUD works
- [ ] Symptoms, diagnosis, prescriptions can be added
- [ ] Data persists correctly

### After Prompt 18 (AI Transcription)
- [ ] Audio recording works
- [ ] Transcription appears in real-time
- [ ] Field extraction populates form
- [ ] Full flow works end-to-end

### After Prompt 18b (Integration Testing)
- [ ] ALL scenarios pass
- [ ] No console errors
- [ ] Test report created

---

## Common Issues & Solutions

| Issue | Likely Prompt | Solution |
|-------|---------------|----------|
| DB connection fails | 13, 14 | Check Docker is running, verify DATABASE_URL |
| Auth fails | 15 | Check JWT_SECRET, verify token format |
| 404 on API | 15-18 | Check route registration in routes/index.ts |
| CORS error | 13, 15 | Verify CORS config in app.ts |
| WebSocket fails | 18 | Check WS URL in frontend .env |
| Audio permission denied | 18 | Must be on localhost or HTTPS |
| OpenAI error | 18 | Check OPENAI_API_KEY is set |

---

## File Structure After All Prompts

```
health-record/
├── docs/
│   ├── research/
│   ├── product/
│   ├── stories/
│   ├── architecture/
│   ├── tech-stack/
│   ├── ai-integration/
│   ├── data-model/
│   ├── project-structure/
│   ├── api/
│   ├── frontend/
│   ├── ui-ux/
│   ├── testing/
│   ├── tickets/
│   ├── implementation/
│   ├── deployment/
│   ├── deliverables/
│   └── screenshots/
├── packages/
│   ├── backend/
│   └── frontend/
├── docker/
├── scripts/
├── prompts/
├── .github/workflows/
├── README.md
├── plantilla-de-trabajo.md
└── prompts.md
```

---

## Tips for Success

1. **Don't skip documentation prompts** - They create the blueprint for implementation
2. **Always test before committing** - Bugs compound if not caught early
3. **Read error messages carefully** - They usually tell you exactly what's wrong
4. **Use the debug log** - Document issues for future reference
5. **One prompt per session** - Keeps context focused and manageable
6. **Verify prerequisites** - Each prompt depends on previous work
