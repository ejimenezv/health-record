# MVP Scope: MedRecord AI

## Overview

This document defines the exact boundaries of the Minimum Viable Product (MVP) for MedRecord AI. It clarifies what will and will not be built, documents assumptions, and identifies known constraints.

---

## In Scope (MVP Will Include)

### Core Functionality

| Feature | Description | Priority |
|---------|-------------|----------|
| **Patient Management** | Create, view, edit, search patient profiles | P0 |
| **Appointment Management** | Create appointments, track status, view history | P0 |
| **Medical Records** | SOAP-format documentation per appointment | P0 |
| **Symptom Recording** | Multiple symptoms per appointment | P0 |
| **Diagnosis Entry** | Free-text diagnosis (no ICD-10 coding) | P0 |
| **Prescription Management** | Multiple prescriptions per appointment | P0 |
| **Audio Recording** | Browser-based recording up to 60 minutes | P0 |
| **AI Transcription** | Convert audio to text using Whisper API | P0 |
| **AI Field Extraction** | Extract structured data using GPT-4/Claude | P0 |
| **Human Review Interface** | Side-by-side transcript and form view | P0 |
| **Vital Signs** | Basic vital signs entry (optional per visit) | P1 |

### Data Entities (9 Total)

| Entity | Fields | Purpose |
|--------|--------|---------|
| Patient | 12 | Core demographics and contact |
| Allergy | 6 | Patient allergy tracking |
| Chronic Condition | 6 | Medical history |
| Provider | 10 | Doctor/staff information |
| Appointment | 11 | Visit scheduling and status |
| Medical Record | 14 | Clinical documentation (SOAP) |
| Vital Signs | 15 | Health measurements |
| Prescription | 17 | Medication orders |
| Symptom | 7 | Symptom documentation |

**Total: ~98 fields** (simplified from typical 200+ field commercial EHR)

### Technical Components

| Component | Technology | Scope |
|-----------|------------|-------|
| Frontend | React/Next.js | Single-page application |
| Backend | Node.js or Python | RESTful API |
| Database | PostgreSQL | Relational data storage |
| AI/Speech | OpenAI Whisper API | Audio transcription |
| AI/NLP | OpenAI GPT-4 or Claude | Field extraction |
| Audio | Web Audio API | Browser recording |
| Hosting | Vercel/Railway/Render | Cloud deployment |

### User Capabilities

| Capability | Details |
|------------|---------|
| User Authentication | Basic login for doctors |
| Single User Focus | Optimized for individual practitioner |
| English Language | English-only interface and transcription |
| Desktop/Laptop | Responsive but desktop-first design |
| Modern Browsers | Chrome, Firefox, Safari, Edge |

---

## Out of Scope (MVP Will NOT Include)

### Deferred Features

| Feature | Reason | Future Phase |
|---------|--------|--------------|
| **Real-time Transcription** | Technical complexity | Phase 2 |
| **Multi-language Support** | English sufficient for MVP | Phase 2 |
| **ICD-10/SNOMED Coding** | Free-text diagnosis sufficient | Phase 2 |
| **E-Prescribing Integration** | External system integration | Phase 3 |
| **Lab/Imaging Integration** | External system integration | Phase 3 |
| **Insurance/Billing** | Out of core scope | Phase 3 |
| **Appointment Scheduling Calendar** | Simple list sufficient for MVP | Phase 2 |
| **Patient Portal** | Provider-focused MVP | Phase 3 |
| **Multi-provider Support** | Single doctor focus | Phase 2 |
| **Audit Logging** | Basic timestamps sufficient | Phase 2 |
| **PDF Export** | Nice-to-have, not essential | Phase 2 |
| **Global Search** | Per-patient search sufficient | Phase 2 |
| **Mobile App** | Web responsive sufficient | Phase 3 |
| **Offline Support** | Cloud-first architecture | Phase 3 |
| **Data Import/Export** | Manual entry for MVP | Phase 2 |
| **Analytics/Reporting** | Out of core scope | Phase 3 |

### Technical Exclusions

| Exclusion | Justification |
|-----------|---------------|
| Full HIPAA Compliance | Educational project with test data |
| End-to-end Encryption | HTTPS sufficient for MVP |
| Comprehensive Audit Trail | Basic timestamps only |
| Role-based Access Control | Single user type for MVP |
| SSO/OAuth Integration | Simple authentication |
| Performance Optimization | Functional over optimized |
| Automated Testing Suite | Manual testing acceptable |
| CI/CD Pipeline | Manual deployment acceptable |

### Compliance Exclusions

| Requirement | MVP Approach |
|-------------|--------------|
| HIPAA BAA with APIs | Not required for demo data |
| SOC 2 Compliance | Not required for demo |
| Data Residency | Any cloud region acceptable |
| Backup/Recovery | Database provider handles |

---

## Assumptions

### Business Assumptions

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 1 | Target user is a single doctor or small practice | Multi-user features needed |
| 2 | English-speaking patients and providers | Transcription fails |
| 3 | Users have reliable internet connection | Offline mode needed |
| 4 | Desktop/laptop is primary device | Mobile UI required |
| 5 | Users comfortable with basic web applications | More training needed |
| 6 | 15-60 minute appointment recordings typical | Processing limits hit |
| 7 | Free-text sufficient without medical coding | Integration needed |

### Technical Assumptions

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 1 | OpenAI API remains available and affordable | Alternative API needed |
| 2 | Browser audio recording quality sufficient | External mic required |
| 3 | ~15 second processing for 15 min recording | User wait time issues |
| 4 | 70% AI extraction accuracy achievable | Manual entry fallback |
| 5 | PostgreSQL handles expected data volume | Scaling needed |
| 6 | React/Next.js skills available | Learning curve |
| 7 | Single server deployment sufficient | Scaling architecture |

### User Assumptions

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 1 | Doctor will review all AI suggestions | Safety concerns |
| 2 | Doctor can type corrections efficiently | Voice correction needed |
| 3 | One appointment at a time | Concurrent support needed |
| 4 | Patient consents to recording | Consent workflow needed |
| 5 | Quiet environment for recording | Noise handling needed |

---

## Constraints

### Time Constraints

| Constraint | Impact |
|------------|--------|
| Course project deadline | Feature prioritization required |
| Limited development time | MVP scope only |
| Single developer | Sequential implementation |

### Technical Constraints

| Constraint | Impact |
|------------|--------|
| OpenAI API rate limits | Queue processing may be needed |
| Browser audio format limitations | WebM/Opus format used |
| API costs | Limited testing volume |
| No local AI processing | Requires internet |
| Browser storage limits | Server-side storage |

### Budget Constraints

| Item | Constraint | Mitigation |
|------|------------|------------|
| API Costs | ~$10/month target | Limited test volume |
| Hosting | Free tier where possible | Vercel/Railway free tiers |
| Database | Free tier if possible | Neon/Supabase free tier |

### Resource Constraints

| Resource | Constraint |
|----------|------------|
| Development | Single developer |
| Design | No dedicated designer |
| Testing | No dedicated QA |
| Medical Expertise | Research-based decisions |

---

## MVP Definition of Done

### Functional Requirements

- [ ] Doctor can create, view, edit, search patients
- [ ] Doctor can create appointments linked to patients
- [ ] Doctor can record audio during appointment
- [ ] System transcribes audio to text
- [ ] System extracts structured medical data from transcript
- [ ] Doctor can review and edit AI suggestions
- [ ] Doctor can save complete medical record
- [ ] Doctor can view patient appointment history
- [ ] Doctor can add multiple symptoms per appointment
- [ ] Doctor can add multiple prescriptions per appointment

### Technical Requirements

- [ ] Application deploys successfully to cloud
- [ ] API endpoints respond within 5 seconds (excluding AI processing)
- [ ] AI processing completes within 60 seconds for 15-min recording
- [ ] Data persists between sessions
- [ ] Basic authentication protects access
- [ ] Error handling provides user feedback

### Documentation Requirements

- [ ] Product documentation complete
- [ ] Technical architecture documented
- [ ] API specification documented
- [ ] Installation instructions provided
- [ ] User stories documented

---

## Risk Assessment

### High Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI extraction accuracy < 50% | Medium | High | Manual fallback, prompt tuning |
| API costs exceed budget | Low | Medium | Monitor usage, set limits |
| Audio quality issues | Medium | Medium | Guidance, noise suppression |
| Processing time too long | Low | Medium | User feedback, optimization |

### Medium Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Browser compatibility issues | Medium | Medium | Test major browsers |
| Complex medical terminology | Medium | Medium | Medical vocabulary in prompts |
| User adoption challenges | Medium | Low | Simple UI, clear guidance |

### Low Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database scaling | Low | Low | Cloud provider handles |
| Security vulnerabilities | Low | Medium | Standard security practices |

---

## Success Criteria

### MVP Launch Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Core workflow complete | 100% | E2E test passes |
| AI extraction accuracy | 70% | Sample review |
| System stability | No crashes | Demo testing |
| Documentation complete | All required docs | Checklist |
| Deployment successful | Running in cloud | Accessible URL |

### Post-MVP Evaluation Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| User task completion | 80% success | User testing |
| Time savings demonstrated | 50% vs manual | Timing comparison |
| Positive feedback | Net positive | User interviews |

---

## Scope Change Process

Any proposed scope changes must:

1. **Document the change**: What feature/requirement is changing?
2. **Justify the change**: Why is this necessary?
3. **Assess impact**: Time, dependencies, risk
4. **Get approval**: Stakeholder sign-off
5. **Update documentation**: Reflect change in all relevant docs

### Change Categories

| Category | Examples | Process |
|----------|----------|---------|
| **Bug fix** | Broken functionality | Implement immediately |
| **Clarification** | Unclear requirement | Document and proceed |
| **Minor addition** | Small enhancement | Assess time, may proceed |
| **Major addition** | New feature | Full evaluation, likely deferred |
| **Scope reduction** | Remove feature | Document reason, proceed |
