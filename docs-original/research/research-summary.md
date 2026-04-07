# Research Summary: Medical Record System MVP

## Executive Summary

This document summarizes the research conducted to inform the development of a Medical Record System MVP for the AI4Devs course final project. The system will manage doctor appointments, patient medical history, and use AI transcription to auto-populate clinical documentation.

---

## Key Findings

### 1. Medical Record Standards

**Industry Context:**
- Over 95% of healthcare organizations use EHR systems
- 88.2% of office-based physicians use some form of EMR/EHR
- The industry follows well-established standards (HIPAA, HL7, ICD-10, SNOMED CT)

**SOAP Notes Format:**
- Standard clinical documentation structure: Subjective, Objective, Assessment, Plan
- Developed by Dr. Lawrence Weed nearly 50 years ago
- Universally accepted across healthcare settings
- Our MVP will implement a simplified SOAP format

**Key Standards Identified:**
| Standard | Purpose | MVP Relevance |
|----------|---------|---------------|
| ICD-10-CM | Diagnosis coding | Optional (use free text) |
| RxNorm | Medication standardization | Optional (use free text) |
| SNOMED CT | Clinical terminology | Optional (use free text) |
| HIPAA | Privacy/security | Awareness only for MVP |

### 2. MVP Data Model

**Entities Selected (9 total):**

| Entity | Fields | Purpose |
|--------|--------|---------|
| Patient | 12 | Core patient demographics |
| Allergies | 6 | Allergy tracking |
| Chronic Conditions | 6 | Medical history |
| Provider | 10 | Doctor information |
| Appointment | 11 | Visit scheduling |
| Medical Record | 14 | Clinical documentation (SOAP) |
| Vital Signs | 15 | Health measurements |
| Prescription | 17 | Medication orders |
| Symptoms | 7 | Symptom documentation |

**Total: ~98 fields** (40-50% reduction from full commercial EHR)

**Design Principles Applied:**
1. **Essential only** - Include fields required for core functionality
2. **AI-fillable** - Prioritize fields that can be extracted from conversation
3. **Free text over codes** - Use plain text instead of complex medical taxonomies
4. **Simplified structures** - Flatten where possible

### 3. AI Transcription Approach

**Recommended Architecture:**
```
Audio Recording → Speech-to-Text (Whisper) → LLM Extraction (GPT-4/Claude) → Structured Data
```

**Service Recommendations:**

| Stage | MVP Service | Production Service |
|-------|-------------|-------------------|
| Speech-to-Text | OpenAI Whisper API | Azure OpenAI / Deepgram |
| Data Extraction | GPT-4 / Claude | Same + Medical NLP |
| Processing Mode | Post-recording | Real-time optional |

**Estimated MVP Costs:** ~$10/month for 50 appointments

**Key Technical Decisions:**
1. **Post-recording processing** (not real-time) for MVP simplicity
2. **Browser-based recording** using Web Audio API
3. **LLM-based extraction** using structured prompts
4. **Human-in-the-loop** - All AI output requires provider review

### 4. Compliance Considerations

**MVP Approach (Demo/Educational):**
- Use synthetic/test data only
- Display "Not for clinical use" disclaimer
- No real PHI in development
- Basic authentication and access control

**Production Path (Future):**
- HIPAA-compliant services with BAA
- End-to-end encryption
- Comprehensive audit logging
- Consider self-hosted ASR for privacy

---

## Product Requirements Summary

### Must Have (MVP)

| Feature | Description |
|---------|-------------|
| Patient Management | Create, view, edit patient records |
| Appointment Scheduling | Schedule and manage appointments |
| Medical Record Creation | Document visits using SOAP format |
| Prescription Recording | Record medications prescribed |
| Vital Signs Entry | Record patient vitals |
| AI Transcription | Convert recorded audio to draft records |
| Provider Review | Edit and confirm AI-generated content |

### Should Have (Post-MVP)

| Feature | Description |
|---------|-------------|
| Real-time Transcription | Live transcription during consultation |
| Medical History Timeline | Visual history view |
| Search Functionality | Search across records |
| Export/Print | Generate printable records |

### Won't Have (MVP)

| Feature | Reason |
|---------|--------|
| Full ICD-10 Coding | Complexity; free text sufficient |
| E-Prescribing Integration | External system integration |
| Insurance/Billing | Out of scope |
| Lab/Imaging Integration | Out of scope |
| Multi-language | English only for MVP |
| HIPAA Full Compliance | Educational project |

---

## Technical Recommendations

### Technology Stack (Suggested)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React/Next.js | Modern, component-based |
| Backend | Node.js/Express or Python/FastAPI | API development |
| Database | PostgreSQL | Relational data model |
| AI/ML | OpenAI API | Transcription + extraction |
| Audio | Web Audio API | Browser recording |
| Hosting | Vercel/Railway/Render | Easy deployment |

### Database Schema Priorities

1. **Normalize patient data** - Single source of truth
2. **Link records to appointments** - Clear audit trail
3. **Store raw transcription** - For debugging/improvement
4. **Track AI vs. manual entry** - Quality metrics

### API Design Priorities

1. **RESTful endpoints** for CRUD operations
2. **Dedicated transcription endpoint** for audio processing
3. **Validation on all inputs** especially medical data
4. **Proper error handling** with meaningful messages

---

## Success Metrics for MVP

| Metric | Target | Measurement |
|--------|--------|-------------|
| Core Workflow | Complete | Can record appointment → transcribe → save |
| Field Extraction | 70% accuracy | Key fields correctly populated |
| User Experience | Functional | Provider can complete workflow in < 5 min |
| Code Quality | Clean | Follows best practices, documented |
| Documentation | Complete | All required docs created |

---

## Next Steps

### Immediate (Product Definition Phase)

1. **Review this research** with stakeholders
2. **Finalize entity definitions** based on MVP selection
3. **Create user stories** for core workflows
4. **Design database schema** based on selected fields
5. **Create UI wireframes** for key screens

### Following Phases

| Phase | Focus |
|-------|-------|
| 02 | System Architecture & Database Design |
| 03 | API Development |
| 04 | Frontend Development |
| 05 | AI Integration |
| 06 | Testing & Polish |

---

## Research Documents Created

| Document | Location | Content |
|----------|----------|---------|
| Medical Record Fields | `docs/research/medical-record-fields.md` | Comprehensive field definitions |
| MVP Fields Selection | `docs/research/mvp-fields-selection.md` | Selected fields with justifications |
| AI Transcription Approach | `docs/research/ai-transcription-approach.md` | Technical approach for AI features |
| Research Summary | `docs/research/research-summary.md` | This document |

---

## Conclusion

The research supports building a focused MVP that:

1. **Manages core patient and appointment data** using a simplified but complete data model
2. **Documents clinical encounters** using the industry-standard SOAP format
3. **Leverages AI transcription** to reduce documentation burden
4. **Maintains simplicity** by deferring complex features (billing, full coding, integrations)

The selected approach balances functionality with development effort, making it achievable as a course final project while demonstrating practical application of AI in healthcare.

---

*This research was conducted on February 21, 2026 and reflects current best practices and available technologies.*
