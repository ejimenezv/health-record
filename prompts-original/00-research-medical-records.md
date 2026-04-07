# Prompt 00: Research Commercial Medical Records Systems

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the FIRST prompt in a series that will incrementally build the software. Your research will inform all subsequent development decisions.

## Objective
Research and document the essential fields, features, and best practices found in commercial medical record systems (EMR/EHR). Focus on what's needed for a minimalistic MVP that handles doctor appointments and patient medical history.

## Tasks

### 1. Research Medical Record Fields
Research and document the standard fields used in medical records systems, specifically for:
- **Patient Information**: Demographics, contact info, emergency contacts
- **Medical History**: Allergies, chronic conditions, previous surgeries, family history
- **Appointment Records**: What data is captured during a doctor visit
- **SOAP Notes Format**: Subjective, Objective, Assessment, Plan - the standard medical documentation format
- **Prescription/Recipe Fields**: Medication name, dosage, frequency, duration, instructions
- **Diagnosis Fields**: ICD codes (optional for MVP), diagnosis description, severity
- **Symptoms Documentation**: How symptoms are typically recorded

### 2. Identify MVP-Essential Fields
Based on the research, identify the MINIMUM fields needed for a functional MVP that:
- Manages patient basic information
- Records appointment history
- Captures symptoms, diagnosis, and prescriptions
- Can be auto-filled by AI transcription

### 3. Research AI Transcription in Healthcare
Research:
- How medical transcription AI systems work
- Key considerations for real-time transcription
- How transcribed audio is converted to structured medical data
- Privacy and compliance considerations (HIPAA basics - for awareness, not full implementation)

### 4. Create Documentation

Create the following documentation files:

#### File: `docs/research/medical-record-fields.md`
Document all researched fields with:
- Field name
- Data type
- Required/Optional status
- Description
- Example values

#### File: `docs/research/mvp-fields-selection.md`
Document the selected MVP fields with justification for each inclusion/exclusion.
Structure by entity:
- Patient
- Appointment
- Medical Record (per appointment)
- Prescription
- Vital Signs (if included)

#### File: `docs/research/ai-transcription-approach.md`
Document:
- How real-time transcription will work conceptually
- What APIs/services are available (OpenAI Whisper, Google Speech-to-Text, etc.)
- How to extract structured data from transcribed text
- Recommended approach for the MVP

#### File: `docs/research/research-summary.md`
Create an executive summary of all research findings that will guide the product definition in the next prompt.

## Output Format
All documentation must be in English, well-structured with headers, and use markdown formatting. Include tables where appropriate for field definitions.

## Success Criteria
- Comprehensive field research documented
- Clear MVP field selection with justifications
- AI transcription approach researched and documented
- All files created in the `docs/research/` folder
- Summary document ready to inform next prompt

## Next Prompt
The next prompt (01-product-definition.md) will use this research to create the product description and fill section 1 of the plantilla-de-trabajo.md template.
