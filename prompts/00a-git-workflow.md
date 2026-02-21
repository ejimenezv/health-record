# Prompt 00a: Git Workflow & Branching Strategy

## Context
This prompt establishes the Git workflow for the entire project. Execute this BEFORE starting any other prompts.

## Project Delivery Structure

According to the AI4Devs final project requirements, there are 3 deliveries:

| Delivery | Branch | Content | Due |
|----------|--------|---------|-----|
| Entrega 1 | `feature-entrega1-[INICIALES]` | Documentation (Sections 1-5) | Miércoles 21 Enero |
| Entrega 2 | `feature-entrega2-[INICIALES]` | Working code (Backend + Frontend) | Miércoles 4 Febrero |
| Final | `finalproject-[INICIALES]` | Complete system deployed | Martes 17 Febrero |

**Replace `[INICIALES]` with your initials (e.g., `JGM` for Juan García Martínez)**

---

## Initial Repository Setup

### 1. Initialize Repository (if not done)
```bash
cd health-record
git init
git add .
git commit -m "chore: initial commit"
```

### 2. Create Main Branch
```bash
git branch -M main
```

### 3. Connect to Remote (GitHub)
```bash
# Create repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/health-record.git
git push -u origin main
```

---

## Branching Strategy

### Branch Structure
```
main
  │
  ├── feature-entrega1-[INICIALES]     ← Documentation phase
  │     │
  │     └── (merged to main after Entrega 1)
  │
  ├── feature-entrega2-[INICIALES]     ← Implementation phase
  │     │
  │     └── (merged to main after Entrega 2)
  │
  └── finalproject-[INICIALES]         ← Final delivery
        │
        └── v1.0-final-[INICIALES]     ← Release tag
```

---

## Phase 1: Documentation (Entrega 1)

### Create Branch
```bash
git checkout -b feature-entrega1-[INICIALES]
```

### Commits During This Phase
Execute prompts 00-12, committing after each:

| Prompt | Commit Message |
|--------|---------------|
| 00 | `docs: add medical records research` |
| 01 | `docs: add product definition` |
| 02 | `docs: add user stories` |
| 03 | `docs: add system architecture` |
| 04 | `docs: add tech stack definition` |
| 05 | `docs: add AI integration specification` |
| 06 | `docs: add data model` |
| 07 | `docs: add project structure` |
| 08 | `docs: add API specification` |
| 09 | `docs: add frontend specification` |
| 10 | `docs: add UI/UX refinement` |
| 11 | `docs: add testing specifications` |
| 12 | `docs: add work tickets` |

### Push and Create PR
```bash
git push -u origin feature-entrega1-[INICIALES]
```

**Create Pull Request on GitHub:**
- Title: `Entrega 1: Documentación técnica del proyecto MedRecord AI`
- Description:
```markdown
## Resumen
Documentación completa del proyecto MedRecord AI incluyendo:
- Definición del producto
- Historias de usuario
- Arquitectura del sistema
- Modelo de datos
- Especificación de API
- Diseño de frontend

## Secciones completadas
- [x] Sección 1: Descripción del producto
- [x] Sección 2: Arquitectura (parcial, se completará con código)
- [x] Sección 3: Modelo de datos
- [x] Sección 4: API
- [x] Sección 5: Historias de usuario

## Archivos principales
- `docs/product/` - Definición del producto
- `docs/architecture/` - Arquitectura del sistema
- `docs/data-model/` - Modelo de datos
- `docs/api/` - Especificación de API
- `docs/stories/` - Historias de usuario
- `docs/deliverables/` - Secciones para plantilla

🤖 Generated with Claude Code
```

### Submit Entrega 1
- Go to https://lidr.typeform.com/proyectoai4devs
- Submit PR URL

### After Approval (or deadline)
```bash
# Merge to main
git checkout main
git merge feature-entrega1-[INICIALES]
git push origin main
```

---

## Phase 2: Implementation (Entrega 2)

### Create Branch
```bash
git checkout main
git pull origin main
git checkout -b feature-entrega2-[INICIALES]
```

### Commits During This Phase
Execute prompts 13-18, committing after each:

| Prompt | Commit Message |
|--------|---------------|
| 13 | `feat: initialize project structure with monorepo setup` |
| 14 | `feat: implement database schema with Prisma` |
| 15 | `feat: implement authentication system` |
| 16 | `feat: implement patient and appointment management` |
| 17 | `feat: implement medical records management` |
| 18 | `feat: implement AI transcription and auto-fill` |
| 18b | `test: complete integration testing and bug fixes` |

### Push and Create PR
```bash
git push -u origin feature-entrega2-[INICIALES]
```

**Create Pull Request on GitHub:**
- Title: `Entrega 2: Código funcional - MVP de MedRecord AI`
- Description:
```markdown
## Resumen
Implementación funcional del MVP incluyendo:
- Backend con Express + TypeScript + Prisma
- Frontend con React + TypeScript + Tailwind
- Integración con OpenAI (Whisper + GPT-4)
- Sistema de transcripción en tiempo real

## Funcionalidades implementadas
- [x] Autenticación JWT
- [x] Gestión de pacientes (CRUD)
- [x] Gestión de citas
- [x] Registros médicos (síntomas, diagnóstico, recetas)
- [x] Transcripción de audio con IA
- [x] Auto-llenado de campos médicos

## Cómo probar
1. Clonar repositorio
2. `pnpm install`
3. `docker-compose up -d`
4. `pnpm db:migrate && pnpm db:seed`
5. `pnpm dev`
6. Acceder a http://localhost:3000
7. Login: doctor@medrecord.com / password123

## Tests
```bash
pnpm test
```

## Tickets implementados
- TICKET-000: Project setup
- TICKET-001: Database schema
- TICKET-002/003: Authentication
- TICKET-004/005: Patient management
- TICKET-006/007: Appointment management
- TICKET-008/009: Medical records
- TICKET-010/011: AI transcription

🤖 Generated with Claude Code
```

### Submit Entrega 2
- Go to https://lidr.typeform.com/proyectoai4devs
- Submit PR URL

### After Approval (or deadline)
```bash
git checkout main
git merge feature-entrega2-[INICIALES]
git push origin main
```

---

## Phase 3: Final Delivery

### Create Final Branch
```bash
git checkout main
git pull origin main
git checkout -b finalproject-[INICIALES]
```

### Commits During This Phase
Execute prompts 19-21:

| Prompt | Commit Message |
|--------|---------------|
| 19 | `feat: add deployment configuration` |
| 20 | `docs: complete final documentation` |
| 21 | `docs: complete project delivery template` |

### Create Release Tag
```bash
git tag -a v1.0-final-[INICIALES] -m "Final project release for AI4Devs"
```

### Push Branch and Tag
```bash
git push -u origin finalproject-[INICIALES]
git push origin v1.0-final-[INICIALES]
```

### Document PRs for Section 7
Create `docs/deliverables/section-7-prs.md` with details of the 3 main PRs:

1. **PR Entrega 1**: Documentation
2. **PR Entrega 2**: Implementation
3. **PR Final**: Deployment + Final docs

### Submit Final Delivery
- Go to https://lidr.typeform.com/proyectoai4devs
- Submit final branch URL

---

## PR Documentation Template

For each PR, document in Section 7:

```markdown
### Pull Request [N]: [Title]

**URL:** [GitHub PR URL]

**Rama origen:** [branch name]
**Rama destino:** main

**Descripción:**
[What this PR contains]

**Cambios principales:**
- [Change 1]
- [Change 2]
- [Change 3]

**Archivos modificados:** [count]

**Tickets/Historias relacionadas:**
- [TICKET-XXX / US-XXX]

**Testing realizado:**
- [x] Tests unitarios
- [x] Tests de integración
- [x] Pruebas manuales

**Screenshots:** (if applicable)
[Images]
```

---

## Commit Message Convention

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes nor adds
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): implement JWT authentication
fix(patients): resolve search filter bug
docs(api): add OpenAPI specification
test(backend): add integration tests for appointments
```

---

## Summary: When Things Happen

| Phase | Prompts | Branch | PR | Commits |
|-------|---------|--------|-----|---------|
| Documentation | 00-12 | feature-entrega1-* | PR #1 | ~12 commits |
| Implementation | 13-18b | feature-entrega2-* | PR #2 | ~7 commits |
| Final | 19-21 | finalproject-* | PR #3 | ~3 commits |

**Total:** 3 PRs, ~22 commits, documented in Section 7.
