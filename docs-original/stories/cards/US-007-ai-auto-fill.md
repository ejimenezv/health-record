# User Story US-007: AI Auto-Fill Medical Record

## Story Card

**As a** doctor
**I want to** have AI automatically extract and populate medical record fields from the transcript
**So that** I can save time on documentation while maintaining accuracy through review

---

## Description

After transcription completes, AI analyzes the conversation to identify and extract relevant medical information. The system automatically populates form fields with extracted data: chief complaint, symptoms, diagnosis, prescriptions, and treatment plan. All AI-filled fields are clearly marked and editable, allowing the doctor to review, accept, modify, or reject suggestions.

This is the core value proposition of MedRecord AI - transforming spoken conversation into structured medical documentation.

---

## Acceptance Criteria

- [ ] Given a transcript is available, when AI processing completes, then form fields are auto-populated with extracted data
- [ ] Given AI extracts a chief complaint, when the field is populated, then it reflects the patient's stated reason for visit
- [ ] Given AI extracts symptoms, when symptoms are populated, then each symptom includes available details (name, severity, duration)
- [ ] Given AI extracts a diagnosis, when the field is populated, then it reflects the doctor's stated assessment
- [ ] Given AI extracts prescriptions, when prescriptions are populated, then each includes medication details (name, dosage, frequency, instructions)
- [ ] Given fields are AI-populated, when I view the form, then AI-filled fields have a visual indicator (icon, highlight, badge)
- [ ] Given an AI-filled field, when I click to edit, then I can modify or clear the suggestion
- [ ] Given AI suggestions, when I want to reject all, then I can clear all AI suggestions with one action
- [ ] Given AI suggestions, when I review and accept, then the "AI-filled" indicator can be acknowledged
- [ ] Given AI extraction fails or is low-confidence, when viewing the form, then affected fields are left empty with manual entry required
- [ ] Given transcript is displayed, when AI extracts from a phrase, then I can see which transcript text corresponds to each extraction (source highlighting)

---

## Priority

**Must-Have (P0)**

---

## Story Points

**13 points**

Rationale: Complex AI integration, structured extraction, multiple field types, source mapping, and interactive review.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Create Appointment | Required | US-004 |
| Manual Record Entry | Required | US-005 |
| AI Transcription | Required | US-006 |
| OpenAI GPT-4 or Claude API | External | - |

---

## Technical Notes

### Data Model

```typescript
interface AIExtraction {
  id: string;
  medicalRecordId: string;
  transcriptId: string;
  extractedFields: ExtractedFields;
  rawResponse: string;           // Store raw AI response
  confidence: number;            // Overall confidence 0-1
  processedAt: Date;
}

interface ExtractedFields {
  chiefComplaint?: ExtractedField<string>;
  symptoms?: ExtractedField<SymptomData[]>;
  diagnosis?: ExtractedField<string>;
  diagnosisNotes?: ExtractedField<string>;
  prescriptions?: ExtractedField<PrescriptionData[]>;
  treatmentPlan?: ExtractedField<string>;
  followUpInstructions?: ExtractedField<string>;
}

interface ExtractedField<T> {
  value: T;
  confidence: number;          // 0-1 confidence score
  sourceText?: string;         // Relevant transcript excerpt
  sourcePosition?: {           // Position in transcript
    start: number;
    end: number;
  };
}

interface SymptomData {
  name: string;
  bodySite?: string;
  severity?: number;
  duration?: string;
  notes?: string;
}

interface PrescriptionData {
  medicationName: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}
```

### AI Extraction Prompt Structure

```typescript
const extractionPrompt = `
You are a medical documentation assistant. Analyze the following doctor-patient conversation transcript and extract structured medical information.

TRANSCRIPT:
${transcript}

Extract the following information in JSON format:
1. Chief Complaint: The patient's main reason for visit
2. Symptoms: Array of symptoms mentioned with details (name, body site, severity 1-10, duration)
3. Diagnosis: The doctor's assessment/diagnosis
4. Prescriptions: Array of medications prescribed (name, strength, dosage, frequency, instructions)
5. Treatment Plan: Summary of treatment approach

For each field, include:
- The extracted value
- Confidence score (0-1)
- The source text from the transcript that supports this extraction

Return ONLY valid JSON with this structure:
{
  "chiefComplaint": { "value": "", "confidence": 0.0, "sourceText": "" },
  "symptoms": [{ "value": {...}, "confidence": 0.0, "sourceText": "" }],
  ...
}

If information is not clearly stated, omit that field rather than guessing.
`;
```

### Implementation Considerations

- Use structured prompt engineering to extract JSON-formatted data
- Include medical context in prompts for accurate extraction
- Implement confidence scoring for extractions
- Consider streaming extraction for real-time feel
- Store AI extraction source references (transcript positions)
- Handle partial extractions gracefully
- Validate JSON response structure before using
- Implement retry logic for malformed responses

### API Endpoints

```
POST /api/appointments/:id/extract    - Trigger AI extraction from transcript
GET  /api/appointments/:id/extraction - Get extraction results
PUT  /api/appointments/:id/extraction/accept - Accept all suggestions
DELETE /api/appointments/:id/extraction - Clear all AI suggestions
```

---

## UI/UX Notes

### Side-by-Side Review Interface

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  📅 February 21, 2026  │  Follow-up  │  🔵 In Progress                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────────────────────┐│
│  │       TRANSCRIPT                │  │       MEDICAL RECORD               [Accept All]││
│  │  ─────────────────               │  │  ────────────────────                         ││
│  │                                  │  │                                               ││
│  │  Doctor: Good morning, what     │  │  CHIEF COMPLAINT                    🤖        ││
│  │  brings you in today?           │  │  ┌─────────────────────────────────────────┐ ││
│  │                                  │  │  │ Patient reports persistent headaches   │ ││
│  │  Patient: I've been having     │  │  │ and fatigue for the past two weeks     │ ││
│  │  these [headaches for about    ]│◀─│  └─────────────────────────────────────────┘ ││
│  │  [two weeks] now. They're      │  │                                               ││
│  │  mostly in the front of my      │  │  SYMPTOMS                            🤖      ││
│  │  head and seem to be worse      │  │  ┌─────────────────────────────────────────┐ ││
│  │  in the morning.                │  │  │ Headache                    [✓] [✗]    │ ││
│  │                                  │  │  │ Location: Frontal │ Severity: 6/10    │ ││
│  │  Doctor: How would you rate     │  │  │ Duration: 2 weeks                      │ ││
│  │  the pain on a scale of one     │  │  └─────────────────────────────────────────┘ ││
│  │  to ten?                        │  │  ┌─────────────────────────────────────────┐ ││
│  │                                  │  │  │ Fatigue                     [✓] [✗]    │ ││
│  │  Patient: I'd say about a       │  │  │ Severity: 5/10 │ Duration: 1 month     │ ││
│  │  [six]. It's not unbearable...  │  │  └─────────────────────────────────────────┘ ││
│  │                                  │  │                                               ││
│  │  Doctor: Based on what you've   │  │  DIAGNOSIS                           🤖      ││
│  │  described, I believe you have  │  │  ┌─────────────────────────────────────────┐ ││
│  │  [tension headaches], likely    │  │  │ Tension headache; Vitamin D            │ ││
│  │  related to stress. I also      │  │  │ deficiency suspected                    │ ││
│  │  want to check your [Vitamin D] │  │  └─────────────────────────────────────────┘ ││
│  │  levels...                      │  │                                               ││
│  │                                  │  │  PRESCRIPTIONS                       🤖      ││
│  │  Doctor: I'm going to           │  │  ┌─────────────────────────────────────────┐ ││
│  │  prescribe [Ibuprofen 400mg],   │  │  │ Ibuprofen 400mg              [✓] [✗]   │ ││
│  │  take one every six hours as    │  │  │ 1 tablet every 6 hours as needed       │ ││
│  │  needed for the pain...         │  │  └─────────────────────────────────────────┘ ││
│  │                                  │  │  ┌─────────────────────────────────────────┐ ││
│  │  [Play Recording ▶]             │  │  │ Vitamin D3 2000IU            [✓] [✗]   │ ││
│  │                                  │  │  │ 1 capsule daily with food              │ ││
│  └─────────────────────────────────┘  │  └─────────────────────────────────────────┘ ││
│                                        │                                               ││
│                                        │  [+ Add manually]      [Clear All AI]        ││
│                                        └───────────────────────────────────────────────┘│
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  [Save Draft]                                              [Complete Appointment]       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

LEGEND:
🤖 = AI-filled field
[highlighted text] = Source text for extraction
[✓] = Accept suggestion
[✗] = Reject suggestion
```

### AI Badge/Indicator

```
┌─────────────────────────────────────────────────────────────────┐
│  CHIEF COMPLAINT                                        🤖 AI   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Patient reports persistent headaches and fatigue...   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Confidence: ███████████░░ 85%                                  │
│  Source: "I've been having these headaches for about two weeks" │
└─────────────────────────────────────────────────────────────────┘
```

### Processing State

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│              🤖 Extracting medical information...               │
│                                                                  │
│              ▓▓▓▓▓▓▓▓░░░░░░░░                                   │
│                                                                  │
│     Analyzing transcript for symptoms, diagnosis,               │
│     and prescriptions...                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- AI-filled fields should have distinct but non-intrusive styling (border color, badge)
- "AI" badge or 🤖 icon next to auto-filled content
- Clicking on AI field highlights corresponding source text in transcript
- Provide "Accept All" and "Clear All AI" actions
- Show extraction confidence where applicable (color coded: green >80%, yellow 50-80%, red <50%)
- Side-by-side layout: transcript panel | form panel
- Hover over AI suggestion shows source text preview
- Accept/Reject buttons on each AI suggestion

### Confidence Visualization

```
High confidence (>80%):    ██████████ Green background
Medium confidence (50-80%): ██████░░░░ Yellow background
Low confidence (<50%):      ███░░░░░░░ Gray/dimmed, marked as "needs review"
```

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Extract from transcript | Valid transcript | Fields populated with AI data |
| Chief complaint | "I have headaches" | Chief complaint field filled |
| Multiple symptoms | 3 symptoms mentioned | 3 symptom cards created |
| Prescription details | "Ibuprofen 400mg twice daily" | Prescription with all details |
| Source highlighting | Hover on AI field | Source text highlighted |
| Accept suggestion | Click accept | Field marked as confirmed |
| Reject suggestion | Click reject | Field cleared |
| Accept all | Click Accept All | All AI fields confirmed |
| Clear all | Click Clear All | All AI data removed |
| Low confidence | Ambiguous statement | Field left empty or marked for review |
| Edit AI field | Modify text | AI badge changes to edited state |
| Extraction failure | API error | Error message, manual entry available |

---

## Definition of Done

- [ ] AI extraction triggered after transcription
- [ ] All extractable fields populated
- [ ] AI badge visible on filled fields
- [ ] Confidence scores displayed
- [ ] Source text mapping works
- [ ] Accept/Reject per field works
- [ ] Accept All action works
- [ ] Clear All action works
- [ ] Can edit AI-filled fields
- [ ] Transcript highlighting on hover
- [ ] Error handling for API failures
- [ ] Unit tests pass
- [ ] Manual QA verified with real transcripts
