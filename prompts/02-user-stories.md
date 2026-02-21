# Prompt 02: User Stories Definition

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the THIRD prompt in the series. Previous prompts completed research and product definition.

## Prerequisites
Before proceeding, read the following files:
- `docs/product/vision.md`
- `docs/product/features.md`
- `docs/product/user-flows.md`
- `docs/product/mvp-scope.md`
- `docs/product/product-summary.md`

## Objective
Create comprehensive user stories following best practices, defining all functionality needed for the MVP. These stories will drive the development tickets and be documented in Section 5 of `plantilla-de-trabajo.md`.

## User Story Format
Use the following format for each user story:

```markdown
## User Story [ID]: [Title]

**As a** [user type]
**I want to** [action/goal]
**So that** [benefit/value]

### Description
[Detailed description of the story]

### Acceptance Criteria
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]
- [ ] ...

### Priority
[Must-Have / Should-Have / Could-Have]

### Story Points
[Estimated effort: 1, 2, 3, 5, 8, 13]

### Dependencies
[List any dependencies on other stories]

### Technical Notes
[Any technical considerations for implementation]

### UI/UX Notes
[Any design considerations]
```

## Tasks

### 1. Create Must-Have User Stories
Create `docs/stories/must-have-stories.md` with the following stories:

**US-001: Patient Registration**
- Create a new patient with basic information
- Acceptance criteria for form validation, required fields, success feedback

**US-002: Patient Listing and Search**
- View list of all patients
- Search/filter patients by name
- Navigate to patient details

**US-003: View Patient Medical History**
- View chronological list of all appointments for a patient
- Navigate through appointment history
- See summary of each past appointment

**US-004: Create New Appointment**
- Start a new appointment for a patient
- Set appointment date/time
- Initialize empty medical record

**US-005: Manual Medical Record Entry**
- Enter symptoms manually
- Enter diagnosis manually
- Add one or more prescriptions
- Save the medical record

**US-006: AI Transcription Recording**
- Start audio recording during appointment
- View real-time transcription
- Stop recording when finished
- Transcription saved with appointment

**US-007: AI Auto-Fill Medical Record**
- AI extracts symptoms from transcription
- AI extracts diagnosis from transcription
- AI extracts prescriptions from transcription
- Fields auto-populate in real-time
- Doctor can review and edit AI suggestions

### 2. Create Should-Have User Stories
Create `docs/stories/should-have-stories.md` with:

**US-008: Appointment Summary Generation**
- AI generates summary of the appointment
- Summary saved with medical record

**US-009: Export Medical Record to PDF**
- Export individual appointment record to PDF
- Include all relevant information

### 3. Create Technical User Stories
Create `docs/stories/technical-stories.md` with:

**US-010: User Authentication** (simplified for MVP)
- Basic login for doctor
- Session management

**US-011: Data Persistence**
- All data saved to database
- Data retrieval on page load

### 4. Create Story Map
Create `docs/stories/story-map.md` with:
- Visual representation (text-based) of how stories connect
- E2E flow showing which stories are involved at each step
- Priority grouping

### 5. Create Story Dependencies Graph
Create `docs/stories/dependencies.md` with:
- Graph showing story dependencies
- Suggested implementation order based on dependencies

### 6. Create Detailed Story Cards
For each story, create individual files in `docs/stories/cards/`:
- `US-001-patient-registration.md`
- `US-002-patient-listing.md`
- `US-003-view-medical-history.md`
- `US-004-create-appointment.md`
- `US-005-manual-record-entry.md`
- `US-006-ai-transcription.md`
- `US-007-ai-auto-fill.md`
- `US-008-summary-generation.md`
- `US-009-export-pdf.md`
- `US-010-authentication.md`
- `US-011-data-persistence.md`

Each card should follow the full format specified above with detailed acceptance criteria.

### 7. Fill Template Section 5 (Spanish)
Create `docs/deliverables/section-5-historias.md` with the 3 main user stories for Section 5 of `plantilla-de-trabajo.md` in Spanish:

Select the 3 most representative stories (suggest: US-003, US-005, US-007) and translate them:

```markdown
## 5. Historias de Usuario

### Historia de Usuario 1: [Ver Historial Médico del Paciente]
**Como** médico
**Quiero** ver el historial completo de citas de un paciente
**Para** tener contexto de su historia médica antes de la consulta actual

#### Descripción
[Descripción detallada en español]

#### Criterios de Aceptación
- [ ] Dado [contexto], cuando [acción], entonces [resultado esperado]
- [ ] ...

#### Notas Técnicas
[Consideraciones técnicas]

#### Prioridad
[Must-Have]

---

### Historia de Usuario 2: [Crear Registro Médico Manual]
...

### Historia de Usuario 3: [Auto-llenado con IA de Transcripción]
...
```

### 8. Create Stories Summary
Create `docs/stories/stories-summary.md` with:
- Total number of stories
- Breakdown by priority
- Estimated total story points
- Suggested sprint allocation (if applicable)
- Ready-for-development checklist

## Output Structure
```
docs/
├── research/           (from prompt 00)
├── product/            (from prompt 01)
├── stories/
│   ├── must-have-stories.md
│   ├── should-have-stories.md
│   ├── technical-stories.md
│   ├── story-map.md
│   ├── dependencies.md
│   ├── stories-summary.md
│   └── cards/
│       ├── US-001-patient-registration.md
│       ├── US-002-patient-listing.md
│       └── ... (all story cards)
└── deliverables/
    ├── section-1-producto.md
    └── section-5-historias.md
```

## Success Criteria
- All Must-Have stories defined with complete acceptance criteria
- Should-Have stories defined
- Technical stories defined
- Story map created showing E2E flow
- Dependencies documented
- Individual story cards created
- Section 5 content ready in Spanish (3 selected stories)
- Stories summary created

## Next Prompt
The next prompt (03-system-architecture.md) will use these user stories to design the system architecture.
