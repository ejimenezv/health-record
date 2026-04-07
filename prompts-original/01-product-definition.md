# Prompt 01: Product Definition & Description

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the SECOND prompt in the series. The previous prompt completed research on medical record systems.

## Prerequisites
Before proceeding, read the following files created in the previous prompt:
- `docs/research/medical-record-fields.md`
- `docs/research/mvp-fields-selection.md`
- `docs/research/ai-transcription-approach.md`
- `docs/research/research-summary.md`

## Objective
Create comprehensive product documentation that defines what we're building. This documentation will be used to fill Section 1 of the `plantilla-de-trabajo.md` template (in Spanish) and serve as the product reference for all subsequent development.

## Product Overview
**Product Name**: MedRecord AI (or suggest a better name based on research)

**Core Features**:
1. Patient management (basic CRUD operations)
2. Appointment history management
3. Medical record creation for each appointment (symptoms, diagnosis, prescriptions)
4. AI-powered appointment transcription (up to 60 minutes)
5. Real-time auto-fill of medical record fields from transcription
6. Navigation through patient appointment history

## Tasks

### 1. Define Product Vision & Value Proposition
Create `docs/product/vision.md` with:
- Problem statement: What problem does this solve for doctors?
- Target users: Primary (doctors) and secondary (clinic administrators) users
- Value proposition: Why would doctors use this system?
- Success metrics: How do we measure if the product is successful?

### 2. Define Features & Functionalities
Create `docs/product/features.md` with detailed descriptions of:

**Core Features (Must-Have)**:
1. **Patient Management**
   - Create new patient profiles
   - Edit patient information
   - Search/filter patients
   - View patient details

2. **Appointment Management**
   - Create new appointment records
   - Link appointments to patients
   - View appointment history (chronological)
   - Navigate between appointments

3. **Medical Record Entry**
   - Manual entry of symptoms
   - Manual entry of diagnosis
   - Manual entry of prescriptions (multiple per appointment)
   - Save and edit medical records

4. **AI Transcription & Auto-Fill**
   - Start/stop audio recording during appointment
   - Real-time transcription display
   - Automatic field extraction (symptoms, diagnosis, prescriptions)
   - Real-time form auto-population
   - Human review and correction of AI suggestions

**Nice-to-Have Features (Should-Have)**:
- Appointment summary generation
- Export medical record to PDF
- Search across all appointments
- Vital signs recording

### 3. Define User Experience Flow
Create `docs/product/user-flows.md` with:
- Main E2E flow diagram (text-based flowchart)
- User journey for: Creating a new patient → Creating appointment → Recording with AI → Reviewing and saving
- Alternative flows for manual entry without AI

### 4. Define MVP Scope Boundaries
Create `docs/product/mvp-scope.md` with:
- **In Scope**: Exactly what will be built
- **Out of Scope**: What won't be built but could be future enhancements
- **Assumptions**: Technical and business assumptions
- **Constraints**: Known limitations

### 5. Create Installation/Setup Preview
Create `docs/product/setup-preview.md` with:
- Anticipated technology requirements
- Expected installation steps (high-level, will be refined later)
- Development environment requirements

### 6. Fill Template Section 1 (Spanish)
Create `docs/deliverables/section-1-producto.md` with the content for Section 1 of `plantilla-de-trabajo.md` in Spanish:

```markdown
## 1. Descripción General del Producto

### 1.1. Objetivo:
[Translate and adapt the value proposition - explain purpose, value, and target users in Spanish]

### 1.2. Características y funcionalidades principales:
[List and describe all features in Spanish with clear descriptions]

### 1.3. Diseño y experiencia de usuario:
[Describe the user experience - note that screenshots will be added later]

### 1.4. Instrucciones de instalación:
[Preliminary instructions - will be completed after implementation]
```

### 7. Create Product Summary
Create `docs/product/product-summary.md` as a quick reference that includes:
- Product name
- One-paragraph description
- List of main features
- Primary user persona
- MVP scope summary

## Output Structure
```
docs/
├── research/           (from previous prompt)
├── product/
│   ├── vision.md
│   ├── features.md
│   ├── user-flows.md
│   ├── mvp-scope.md
│   ├── setup-preview.md
│   └── product-summary.md
└── deliverables/
    └── section-1-producto.md
```

## Success Criteria
- Clear product vision documented
- All core and nice-to-have features defined
- User flows documented
- MVP scope clearly bounded
- Section 1 content ready in Spanish
- Product summary created for quick reference

## Next Prompt
The next prompt (02-user-stories.md) will use this product definition to create detailed user stories for development.
