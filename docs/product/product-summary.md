# Product Summary: MedRecord AI

## Quick Reference Card

| Attribute | Value |
|-----------|-------|
| **Product Name** | MedRecord AI |
| **Tagline** | Intelligent Medical Documentation System |
| **Version** | MVP (1.0) |
| **Target User** | General practitioners / Family doctors |
| **Primary Value** | AI-assisted medical record creation |

---

## One-Paragraph Description

**MedRecord AI** is a web-based medical record system that uses AI to transform doctor-patient conversations into structured clinical documentation. By recording appointments and automatically extracting symptoms, diagnoses, and prescriptions from the transcribed conversation, MedRecord AI reduces documentation time by up to 50% while maintaining accuracy through human review. The system targets independent physicians and small practices who want to spend more time with patients and less time on paperwork.

---

## Main Features

### Core Features (MVP)

1. **Patient Management**
   - Create, view, edit, and search patient profiles
   - Track patient demographics and emergency contacts

2. **Appointment Management**
   - Create and manage appointment records
   - View chronological appointment history per patient
   - Track appointment status through lifecycle

3. **Medical Records**
   - Document visits using simplified SOAP format
   - Record symptoms, diagnoses, and treatment plans
   - Manage prescriptions with full medication details

4. **AI Transcription**
   - Record audio during appointments (up to 60 minutes)
   - Automatic speech-to-text conversion
   - AI extraction of structured medical data
   - Human review interface for verification

### Supporting Features

5. **Vital Signs Recording**
   - Blood pressure, heart rate, temperature
   - Weight, height, oxygen saturation
   - Pain level tracking

---

## Primary User Persona

### Dr. Maria Santos

**Role**: General Practitioner
**Practice**: Small private clinic
**Patients**: 25-30 per day

**Goals**:
- Reduce documentation time
- Capture complete patient information
- Stay focused on patient during consultation
- Access patient history quickly

**Pain Points**:
- 2+ hours daily on documentation
- Misses details from conversations
- Existing EHR systems too complex
- End-of-day documentation backlog

**Tech Comfort**: Uses smartphone, email, basic web apps

---

## MVP Scope Summary

### Included

| Category | Scope |
|----------|-------|
| **Entities** | 9 (Patient, Appointment, Medical Record, etc.) |
| **Fields** | ~98 total |
| **Users** | Single provider |
| **Language** | English only |
| **Platform** | Web (desktop-first) |
| **AI** | Post-recording processing |

### Not Included

- Real-time transcription
- Multi-language support
- ICD-10/SNOMED coding
- E-prescribing integration
- Insurance/billing
- Mobile app
- Full HIPAA compliance

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Next.js, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma |
| Database | PostgreSQL |
| AI | OpenAI Whisper (transcription), GPT-4/Claude (extraction) |
| Hosting | Vercel/Railway/Render |

---

## Value Proposition

| Benefit | Description |
|---------|-------------|
| **Time Savings** | 50% reduction in documentation time |
| **Accuracy** | Captures exact patient statements |
| **Completeness** | Structured extraction ensures all fields addressed |
| **Focus** | Doctor engages with patient, not keyboard |
| **Simplicity** | Easy to use, no training required |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Documentation time reduction | 50% vs manual |
| AI extraction accuracy | 70% fields correct |
| User adoption | Complete workflow without assistance |
| Record completeness | All required fields filled |

---

## Key User Flow

```
Search Patient → Create Appointment → Record Consultation
                                           ↓
Save Record ← Review & Edit ← AI Processing
```

---

## Estimated Costs

| Phase | Monthly Cost |
|-------|--------------|
| Development | ~$5 (API testing) |
| Production | ~$15-35 (hosting + APIs) |

---

## Document References

| Document | Purpose |
|----------|---------|
| [vision.md](./vision.md) | Problem, users, value proposition |
| [features.md](./features.md) | Detailed feature specifications |
| [user-flows.md](./user-flows.md) | User journey diagrams |
| [mvp-scope.md](./mvp-scope.md) | Scope boundaries |
| [setup-preview.md](./setup-preview.md) | Technical requirements |

---

## Project Timeline Reference

| Phase | Focus |
|-------|-------|
| Current | Product Definition |
| Next | System Architecture & Database |
| Following | API Development |
| Following | Frontend Development |
| Following | AI Integration |
| Final | Testing & Polish |

---

*Last updated: February 2026*
