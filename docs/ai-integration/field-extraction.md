# Field Extraction Specification: MedRecord AI

This document details the GPT-4 integration for extracting structured medical information from conversation transcripts, including prompt engineering, extraction strategies, and confidence scoring.

---

## Overview

The field extraction service analyzes transcribed doctor-patient conversations to identify and extract structured medical information. It uses GPT-4's natural language understanding to populate medical record fields automatically.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Field Extraction Pipeline                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐│
│  │  Transcript      │────▶│  GPT-4 API       │────▶│  Structured JSON     ││
│  │  (Plain text)    │     │  (Extraction)    │     │  (Medical fields)    ││
│  └──────────────────┘     └──────────────────┘     └───────────┬──────────┘│
│                                                                 │           │
│                              ┌──────────────────────────────────┘           │
│                              │                                              │
│                              ▼                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Extracted Fields:                                                    │ │
│   │  ├── Chief Complaint: "Persistent headaches for 2 weeks"            │ │
│   │  ├── Symptoms: [{ name: "Headache", severity: 6, duration: "2w" }]  │ │
│   │  ├── Diagnosis: "Tension headache"                                   │ │
│   │  └── Prescriptions: [{ medication: "Ibuprofen 400mg", ... }]        │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Extraction Interfaces

### Request Interfaces

```typescript
interface ExtractionRequest {
  transcript: string;              // Full transcript text
  transcriptSegments?: TranscriptSegment[];  // Optional segments with timestamps
  previousContext?: string;        // Earlier parts of conversation (for chunked)
  language: 'en' | 'es';          // Transcript language
  appointmentId: string;
}

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: 'doctor' | 'patient' | 'unknown';
}

interface ExtractionOptions {
  includeConfidence: boolean;      // Include confidence scores
  includeSourceText: boolean;      // Map extractions to source
  strictMode: boolean;             // Only high-confidence extractions
  maxTokens: number;               // Response token limit
}

const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
  includeConfidence: true,
  includeSourceText: true,
  strictMode: false,
  maxTokens: 2000,
};
```

### Response Interfaces

```typescript
interface ExtractedFields {
  chiefComplaint: ExtractedValue<string> | null;
  historyOfPresentIllness: ExtractedValue<string> | null;
  symptoms: ExtractedValue<Symptom>[];
  diagnosis: ExtractedValue<Diagnosis> | null;
  prescriptions: ExtractedValue<Prescription>[];
  vitalSigns: ExtractedValue<VitalSigns> | null;
  treatmentPlan: ExtractedValue<string> | null;
  followUp: ExtractedValue<string> | null;
  allergiesNoted: string[];
  currentMedications: string[];
  overallConfidence: number;       // 0-1 overall extraction confidence
}

interface ExtractedValue<T> {
  value: T;
  confidence: number;              // 0-1 confidence score
  sourceText?: string;             // Relevant transcript excerpt
  sourcePosition?: {               // Position in transcript
    start: number;
    end: number;
  };
}

interface Symptom {
  name: string;
  description?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  severityScore?: number;          // 1-10 scale
  duration?: string;
  onset?: string;
  bodySite?: string;
  characteristics?: string;
  notes?: string;
}

interface Diagnosis {
  description: string;
  icdCode?: string;                // Optional ICD-10 code
  type?: 'primary' | 'secondary' | 'differential';
  certainty?: 'confirmed' | 'suspected' | 'ruled_out';
}

interface Prescription {
  medicationName: string;
  genericName?: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: 'oral' | 'topical' | 'injection' | 'other';
  instructions: string;
  refills?: number;
}

interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  temperatureUnit?: 'C' | 'F';
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  height?: number;
  heightUnit?: 'cm' | 'in';
  oxygenSaturation?: number;
  respiratoryRate?: number;
}
```

---

## Prompt Engineering

### System Prompt

```typescript
const EXTRACTION_SYSTEM_PROMPT = `You are a medical documentation assistant specializing in extracting structured information from doctor-patient conversation transcripts.

CORE PRINCIPLES:
1. Extract ONLY information explicitly stated or clearly implied in the transcript
2. Use null or empty arrays for information not present
3. Be conservative - do not assume or infer unstated medical information
4. Include confidence scores (0-1) for each extraction
5. Map extractions to source text when possible
6. Format medication names and dosages according to standard conventions
7. Convert patient severity descriptions: "mild" = 3, "moderate" = 5-6, "severe" = 8-9

IMPORTANT GUIDELINES:
- Chief Complaint: Patient's primary reason for visit, in their own words when possible
- Symptoms: Only include symptoms explicitly mentioned by the patient
- Diagnosis: Only include if the doctor explicitly states a diagnosis
- Prescriptions: Include all medication details mentioned (name, dosage, frequency)
- Do NOT include historical information unless relevant to current visit
- Flag any information that requires doctor review

Always respond with valid JSON matching the requested schema.`;
```

### Extraction Prompt Template

```typescript
const EXTRACTION_USER_PROMPT = `Extract medical information from the following doctor-patient conversation transcript.

Return a JSON object with this exact structure:
{
  "chiefComplaint": {
    "value": "Primary reason for visit (string)",
    "confidence": 0.0-1.0,
    "sourceText": "Relevant quote from transcript"
  } | null,

  "historyOfPresentIllness": {
    "value": "Detailed description of current condition (string)",
    "confidence": 0.0-1.0,
    "sourceText": "Relevant quote"
  } | null,

  "symptoms": [
    {
      "value": {
        "name": "Symptom name (required)",
        "severity": "mild" | "moderate" | "severe" | null,
        "severityScore": 1-10 or null,
        "duration": "How long (string or null)",
        "onset": "When it started (string or null)",
        "bodySite": "Body location (string or null)",
        "characteristics": "Description (string or null)"
      },
      "confidence": 0.0-1.0,
      "sourceText": "Patient's description"
    }
  ],

  "diagnosis": {
    "value": {
      "description": "Doctor's diagnosis (string)",
      "type": "primary" | "secondary" | "differential",
      "certainty": "confirmed" | "suspected" | "ruled_out"
    },
    "confidence": 0.0-1.0,
    "sourceText": "Doctor's statement"
  } | null,

  "prescriptions": [
    {
      "value": {
        "medicationName": "Drug name (required)",
        "strength": "e.g., 400mg (required)",
        "dosage": "e.g., 1 tablet (required)",
        "frequency": "e.g., twice daily (required)",
        "duration": "e.g., 7 days (string or null)",
        "route": "oral" | "topical" | "injection" | "other",
        "instructions": "Patient instructions (required)"
      },
      "confidence": 0.0-1.0,
      "sourceText": "Doctor's prescription"
    }
  ],

  "vitalSigns": {
    "value": {
      "bloodPressureSystolic": number or null,
      "bloodPressureDiastolic": number or null,
      "heartRate": number or null,
      "temperature": number or null,
      "temperatureUnit": "C" | "F",
      "weight": number or null,
      "weightUnit": "kg" | "lb"
    },
    "confidence": 0.0-1.0,
    "sourceText": "Vital signs mentioned"
  } | null,

  "treatmentPlan": {
    "value": "Treatment approach (string)",
    "confidence": 0.0-1.0,
    "sourceText": "Doctor's recommendation"
  } | null,

  "followUp": {
    "value": "Follow-up instructions (string)",
    "confidence": 0.0-1.0,
    "sourceText": "Doctor's follow-up recommendation"
  } | null,

  "allergiesNoted": ["Array of any allergies mentioned"],
  "currentMedications": ["Array of current medications mentioned"],
  "overallConfidence": 0.0-1.0
}

IMPORTANT:
- Only include symptoms and prescriptions if explicitly discussed
- For severity, convert descriptions: "a little" = mild, "pretty bad" = moderate, "unbearable" = severe
- For prescriptions, ALL required fields must be present or omit the prescription
- Set overallConfidence based on transcript clarity and completeness

TRANSCRIPT:
---
{{TRANSCRIPT}}
---`;
```

### Language-Specific Prompts

```typescript
const SPANISH_EXTRACTION_PROMPT = `Extrae información médica de la siguiente transcripción de conversación médico-paciente.

Devuelve un objeto JSON con la siguiente estructura exacta:
{
  "chiefComplaint": {
    "value": "Motivo principal de consulta (texto)",
    "confidence": 0.0-1.0,
    "sourceText": "Cita relevante de la transcripción"
  } | null,

  "symptoms": [
    {
      "value": {
        "name": "Nombre del síntoma (requerido)",
        "severity": "leve" | "moderado" | "severo" | null,
        "severityScore": 1-10 o null,
        "duration": "Duración (texto o null)",
        "bodySite": "Ubicación en el cuerpo (texto o null)"
      },
      "confidence": 0.0-1.0,
      "sourceText": "Descripción del paciente"
    }
  ],
  // ... resto de campos igual
}

TRANSCRIPCIÓN:
---
{{TRANSCRIPT}}
---`;

function getExtractionPrompt(language: 'en' | 'es', transcript: string): string {
  const template = language === 'es'
    ? SPANISH_EXTRACTION_PROMPT
    : EXTRACTION_USER_PROMPT;

  return template.replace('{{TRANSCRIPT}}', transcript);
}
```

---

## GPT-4 Integration

### API Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Model** | `gpt-4` or `gpt-4-turbo` | Best extraction accuracy |
| **Temperature** | 0.2 | Low for consistency |
| **Response Format** | `json_object` | Ensures valid JSON |
| **Max Tokens** | 2000 | Sufficient for full extraction |
| **Timeout** | 60 seconds | Reasonable for extraction |

### Extraction Service Implementation

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 2,
});

interface ExtractionResult {
  success: boolean;
  data: ExtractedFields | null;
  rawResponse: string;
  processingTime: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}

export async function extractMedicalFields(
  request: ExtractionRequest,
  options: ExtractionOptions = DEFAULT_EXTRACTION_OPTIONS
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Validate transcript
  if (!request.transcript || request.transcript.trim().length < 50) {
    return {
      success: false,
      data: null,
      rawResponse: '',
      processingTime: 0,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      error: 'Transcript too short for extraction',
    };
  }

  // Prepare transcript (truncate if needed)
  const preparedTranscript = prepareTranscript(request.transcript);
  const prompt = getExtractionPrompt(request.language, preparedTranscript);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: options.maxTokens,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from GPT-4');
    }

    // Parse and validate response
    const parsed = JSON.parse(content) as ExtractedFields;
    const validated = validateExtraction(parsed, options);

    return {
      success: true,
      data: validated,
      rawResponse: content,
      processingTime: Date.now() - startTime,
      tokensUsed: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    const errorMessage = getExtractionErrorMessage(error);

    return {
      success: false,
      data: null,
      rawResponse: '',
      processingTime: Date.now() - startTime,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      error: errorMessage,
    };
  }
}

function prepareTranscript(transcript: string): string {
  // GPT-4 has 8K context, reserve ~2K for prompt and response
  const MAX_TRANSCRIPT_CHARS = 20000; // ~5000 tokens

  if (transcript.length <= MAX_TRANSCRIPT_CHARS) {
    return transcript;
  }

  // Truncate intelligently - keep beginning and end
  const halfLimit = Math.floor(MAX_TRANSCRIPT_CHARS / 2);
  return (
    transcript.slice(0, halfLimit) +
    '\n\n[... middle portion truncated for length ...]\n\n' +
    transcript.slice(-halfLimit)
  );
}

function validateExtraction(
  data: ExtractedFields,
  options: ExtractionOptions
): ExtractedFields {
  // Filter out low-confidence extractions in strict mode
  if (options.strictMode) {
    const CONFIDENCE_THRESHOLD = 0.7;

    if (data.chiefComplaint && data.chiefComplaint.confidence < CONFIDENCE_THRESHOLD) {
      data.chiefComplaint = null;
    }

    data.symptoms = data.symptoms.filter(
      s => s.confidence >= CONFIDENCE_THRESHOLD
    );

    data.prescriptions = data.prescriptions.filter(
      p => p.confidence >= CONFIDENCE_THRESHOLD
    );

    if (data.diagnosis && data.diagnosis.confidence < CONFIDENCE_THRESHOLD) {
      data.diagnosis = null;
    }
  }

  // Validate required fields in symptoms
  data.symptoms = data.symptoms.filter(
    s => s.value && s.value.name && s.value.name.trim()
  );

  // Validate required fields in prescriptions
  data.prescriptions = data.prescriptions.filter(
    p =>
      p.value &&
      p.value.medicationName &&
      p.value.strength &&
      p.value.dosage &&
      p.value.frequency &&
      p.value.instructions
  );

  // Normalize severity values
  data.symptoms = data.symptoms.map(symptom => ({
    ...symptom,
    value: {
      ...symptom.value,
      severity: normalizeSeverity(symptom.value.severity),
      severityScore: normalizeSeverityScore(symptom.value.severityScore),
    },
  }));

  return data;
}

function normalizeSeverity(
  severity?: string | null
): 'mild' | 'moderate' | 'severe' | undefined {
  if (!severity) return undefined;

  const lower = severity.toLowerCase();
  if (['mild', 'light', 'slight', 'leve'].includes(lower)) return 'mild';
  if (['moderate', 'medium', 'moderado'].includes(lower)) return 'moderate';
  if (['severe', 'serious', 'intense', 'severo', 'grave'].includes(lower)) return 'severe';

  return undefined;
}

function normalizeSeverityScore(score?: number | null): number | undefined {
  if (score === null || score === undefined) return undefined;
  return Math.min(10, Math.max(1, Math.round(score)));
}

function getExtractionErrorMessage(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 400:
        return 'Invalid request format';
      case 429:
        return 'Service temporarily busy. Please try again.';
      case 500:
      case 503:
        return 'AI service unavailable. Please try again later.';
      default:
        return 'Extraction failed. Please try again.';
    }
  }

  if (error instanceof SyntaxError) {
    return 'Failed to parse AI response. Please try again.';
  }

  return 'An unexpected error occurred during extraction.';
}
```

---

## Extraction Strategies

### Incremental Extraction (Real-time)

For real-time processing, extract from chunks while maintaining context:

```typescript
interface IncrementalExtractionState {
  accumulatedFields: Partial<ExtractedFields>;
  processedChunks: number;
  previousContext: string;
}

class IncrementalExtractor {
  private state: IncrementalExtractionState;

  constructor() {
    this.state = {
      accumulatedFields: {
        symptoms: [],
        prescriptions: [],
        allergiesNoted: [],
        currentMedications: [],
      },
      processedChunks: 0,
      previousContext: '',
    };
  }

  async processChunk(
    chunkText: string,
    chunkIndex: number
  ): Promise<Partial<ExtractedFields>> {
    // Build context from previous chunks
    const contextPrompt = this.state.previousContext
      ? `Previous conversation context:\n${this.state.previousContext}\n\nNew transcript segment:\n${chunkText}`
      : chunkText;

    const result = await extractMedicalFields({
      transcript: contextPrompt,
      language: 'en',
      appointmentId: `chunk-${chunkIndex}`,
    });

    if (result.success && result.data) {
      this.mergeExtractions(result.data);
      this.state.processedChunks++;

      // Keep last portion as context for continuity
      this.state.previousContext = this.getContextSummary(chunkText);
    }

    return this.state.accumulatedFields;
  }

  private mergeExtractions(newData: ExtractedFields): void {
    const accumulated = this.state.accumulatedFields;

    // Chief complaint - take first non-null with highest confidence
    if (newData.chiefComplaint && !accumulated.chiefComplaint) {
      accumulated.chiefComplaint = newData.chiefComplaint;
    } else if (
      newData.chiefComplaint &&
      accumulated.chiefComplaint &&
      newData.chiefComplaint.confidence > accumulated.chiefComplaint.confidence
    ) {
      accumulated.chiefComplaint = newData.chiefComplaint;
    }

    // Symptoms - accumulate unique symptoms
    for (const symptom of newData.symptoms) {
      const exists = accumulated.symptoms?.some(
        s => s.value.name.toLowerCase() === symptom.value.name.toLowerCase()
      );

      if (!exists) {
        accumulated.symptoms = accumulated.symptoms || [];
        accumulated.symptoms.push(symptom);
      }
    }

    // Prescriptions - accumulate all (assuming each is unique)
    for (const prescription of newData.prescriptions) {
      const exists = accumulated.prescriptions?.some(
        p =>
          p.value.medicationName.toLowerCase() ===
          prescription.value.medicationName.toLowerCase()
      );

      if (!exists) {
        accumulated.prescriptions = accumulated.prescriptions || [];
        accumulated.prescriptions.push(prescription);
      }
    }

    // Diagnosis - take most recent with highest confidence
    if (newData.diagnosis) {
      if (
        !accumulated.diagnosis ||
        newData.diagnosis.confidence > accumulated.diagnosis.confidence
      ) {
        accumulated.diagnosis = newData.diagnosis;
      }
    }

    // Merge arrays
    accumulated.allergiesNoted = [
      ...new Set([
        ...(accumulated.allergiesNoted || []),
        ...newData.allergiesNoted,
      ]),
    ];

    accumulated.currentMedications = [
      ...new Set([
        ...(accumulated.currentMedications || []),
        ...newData.currentMedications,
      ]),
    ];
  }

  private getContextSummary(text: string): string {
    // Keep last ~500 characters as context
    if (text.length <= 500) return text;
    return text.slice(-500);
  }

  getAccumulatedFields(): Partial<ExtractedFields> {
    return this.state.accumulatedFields;
  }

  reset(): void {
    this.state = {
      accumulatedFields: {
        symptoms: [],
        prescriptions: [],
        allergiesNoted: [],
        currentMedications: [],
      },
      processedChunks: 0,
      previousContext: '',
    };
  }
}
```

### Batch Extraction (MVP)

For MVP, extract from complete transcript:

```typescript
async function extractFromCompleteTranscript(
  appointmentId: string,
  transcript: string,
  language: 'en' | 'es' = 'en'
): Promise<ExtractionResult> {
  return extractMedicalFields({
    transcript,
    language,
    appointmentId,
  });
}
```

---

## Confidence Scoring

### Confidence Levels

| Level | Score Range | UI Indication | Recommended Action |
|-------|-------------|---------------|-------------------|
| **High** | 0.8 - 1.0 | Green highlight | Accept as-is |
| **Medium** | 0.5 - 0.79 | Yellow highlight | Review recommended |
| **Low** | 0.0 - 0.49 | Red/gray, dimmed | Manual entry suggested |

### Confidence Calculation

```typescript
interface ConfidenceFactors {
  explicitMention: number;        // 0.3 - Was it explicitly stated?
  contextClarity: number;         // 0.25 - Is the context clear?
  completeness: number;           // 0.25 - Are all details present?
  speakerIdentification: number;  // 0.2 - Is the speaker identified?
}

function calculateConfidence(factors: ConfidenceFactors): number {
  return (
    factors.explicitMention * 0.3 +
    factors.contextClarity * 0.25 +
    factors.completeness * 0.25 +
    factors.speakerIdentification * 0.2
  );
}

// Example confidence interpretation
const confidenceGuidelines = {
  chiefComplaint: {
    high: 'Patient clearly stated reason for visit',
    medium: 'Reason for visit can be inferred',
    low: 'Multiple possible interpretations',
  },
  diagnosis: {
    high: 'Doctor explicitly stated diagnosis',
    medium: 'Doctor mentioned likely condition',
    low: 'Diagnosis not clearly stated',
  },
  prescription: {
    high: 'All medication details clearly stated',
    medium: 'Some details may need confirmation',
    low: 'Incomplete prescription information',
  },
};
```

### Flagging Uncertain Extractions

```typescript
interface ExtractionFlag {
  field: string;
  reason: string;
  suggestedAction: string;
}

function flagUncertainExtractions(data: ExtractedFields): ExtractionFlag[] {
  const flags: ExtractionFlag[] = [];

  // Flag low-confidence chief complaint
  if (data.chiefComplaint && data.chiefComplaint.confidence < 0.5) {
    flags.push({
      field: 'chiefComplaint',
      reason: 'Low confidence in chief complaint extraction',
      suggestedAction: 'Please verify the patient\'s primary reason for visit',
    });
  }

  // Flag prescriptions without complete details
  data.prescriptions.forEach((prescription, index) => {
    if (prescription.confidence < 0.7) {
      flags.push({
        field: `prescriptions[${index}]`,
        reason: `Prescription for ${prescription.value.medicationName} may have incomplete details`,
        suggestedAction: 'Verify medication name, dosage, and frequency',
      });
    }

    if (!prescription.value.duration) {
      flags.push({
        field: `prescriptions[${index}].duration`,
        reason: 'Duration not specified',
        suggestedAction: 'Specify how long patient should take this medication',
      });
    }
  });

  // Flag diagnosis without certainty
  if (data.diagnosis && !data.diagnosis.value.certainty) {
    flags.push({
      field: 'diagnosis',
      reason: 'Diagnosis certainty not specified',
      suggestedAction: 'Confirm if diagnosis is confirmed, suspected, or differential',
    });
  }

  return flags;
}
```

---

## Source Text Mapping

### Mapping Extractions to Source

```typescript
interface SourceMapping {
  field: string;
  sourceText: string;
  startIndex: number;
  endIndex: number;
}

function mapExtractionsToSource(
  data: ExtractedFields,
  fullTranscript: string
): SourceMapping[] {
  const mappings: SourceMapping[] = [];

  // Map chief complaint
  if (data.chiefComplaint?.sourceText) {
    const position = findTextPosition(
      fullTranscript,
      data.chiefComplaint.sourceText
    );
    if (position) {
      mappings.push({
        field: 'chiefComplaint',
        sourceText: data.chiefComplaint.sourceText,
        startIndex: position.start,
        endIndex: position.end,
      });
    }
  }

  // Map symptoms
  data.symptoms.forEach((symptom, index) => {
    if (symptom.sourceText) {
      const position = findTextPosition(fullTranscript, symptom.sourceText);
      if (position) {
        mappings.push({
          field: `symptoms[${index}]`,
          sourceText: symptom.sourceText,
          startIndex: position.start,
          endIndex: position.end,
        });
      }
    }
  });

  // Map prescriptions
  data.prescriptions.forEach((prescription, index) => {
    if (prescription.sourceText) {
      const position = findTextPosition(fullTranscript, prescription.sourceText);
      if (position) {
        mappings.push({
          field: `prescriptions[${index}]`,
          sourceText: prescription.sourceText,
          startIndex: position.start,
          endIndex: position.end,
        });
      }
    }
  });

  return mappings;
}

function findTextPosition(
  fullText: string,
  searchText: string
): { start: number; end: number } | null {
  const lowerFull = fullText.toLowerCase();
  const lowerSearch = searchText.toLowerCase().trim();

  const index = lowerFull.indexOf(lowerSearch);
  if (index === -1) {
    // Try fuzzy matching for slight variations
    return fuzzyFindPosition(fullText, searchText);
  }

  return {
    start: index,
    end: index + searchText.length,
  };
}

function fuzzyFindPosition(
  fullText: string,
  searchText: string
): { start: number; end: number } | null {
  // Simple fuzzy match - find best substring match
  const words = searchText.toLowerCase().split(/\s+/);
  const lowerFull = fullText.toLowerCase();

  // Try to find a sequence of words
  for (let wordCount = words.length; wordCount >= 3; wordCount--) {
    const searchPhrase = words.slice(0, wordCount).join(' ');
    const index = lowerFull.indexOf(searchPhrase);

    if (index !== -1) {
      // Extend to include full sentence if possible
      const sentenceEnd = fullText.indexOf('.', index);
      const end = sentenceEnd !== -1 ? sentenceEnd + 1 : index + searchText.length;

      return { start: index, end };
    }
  }

  return null;
}
```

---

## API Route Implementation

```typescript
import { Router } from 'express';

const router = Router();

// POST /api/appointments/:id/extract
router.post(
  '/appointments/:id/extract',
  authMiddleware,
  async (req, res) => {
    const { id: appointmentId } = req.params;
    const { language = 'en', strictMode = false } = req.body;

    try {
      // Get transcript for appointment
      const transcript = await transcriptService.getByAppointmentId(appointmentId);

      if (!transcript || !transcript.text) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript available for extraction',
          },
        });
      }

      // Extract medical fields
      const result = await extractMedicalFields({
        transcript: transcript.text,
        transcriptSegments: transcript.segments,
        language,
        appointmentId,
      }, {
        ...DEFAULT_EXTRACTION_OPTIONS,
        strictMode,
      });

      if (!result.success) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'EXTRACTION_FAILED',
            message: result.error,
            retryable: true,
          },
        });
      }

      // Get flags for uncertain extractions
      const flags = flagUncertainExtractions(result.data!);

      // Map to source text
      const sourceMappings = mapExtractionsToSource(
        result.data!,
        transcript.text
      );

      // Save extraction result
      const extraction = await extractionService.create({
        appointmentId,
        transcriptId: transcript.id,
        extractedFields: result.data,
        rawResponse: result.rawResponse,
        confidence: result.data!.overallConfidence,
        tokensUsed: result.tokensUsed,
      });

      return res.json({
        success: true,
        data: {
          extractionId: extraction.id,
          fields: result.data,
          flags,
          sourceMappings,
          processingTime: result.processingTime,
        },
      });
    } catch (error) {
      logger.error('Extraction error', { error, appointmentId });

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during extraction',
          retryable: true,
        },
      });
    }
  }
);

export default router;
```

---

## Testing

### Sample Test Cases

```typescript
describe('Field Extraction', () => {
  it('should extract chief complaint from clear statement', async () => {
    const transcript = `
      Doctor: Good morning. What brings you in today?
      Patient: I've been having these terrible headaches for about two weeks now.
    `;

    const result = await extractMedicalFields({
      transcript,
      language: 'en',
      appointmentId: 'test-1',
    });

    expect(result.success).toBe(true);
    expect(result.data?.chiefComplaint?.value).toContain('headache');
    expect(result.data?.chiefComplaint?.confidence).toBeGreaterThan(0.7);
  });

  it('should extract multiple symptoms with details', async () => {
    const transcript = `
      Patient: I have a headache that's about a 6 out of 10, and I've been
      feeling really tired lately. The headache is mostly in the front of my head.
    `;

    const result = await extractMedicalFields({
      transcript,
      language: 'en',
      appointmentId: 'test-2',
    });

    expect(result.data?.symptoms).toHaveLength(2);
    expect(result.data?.symptoms[0]?.value.name.toLowerCase()).toContain('headache');
    expect(result.data?.symptoms[0]?.value.severityScore).toBe(6);
  });

  it('should extract prescription with complete details', async () => {
    const transcript = `
      Doctor: I'm going to prescribe Ibuprofen 400mg. Take one tablet every
      six hours as needed for pain. Don't exceed 4 tablets per day.
    `;

    const result = await extractMedicalFields({
      transcript,
      language: 'en',
      appointmentId: 'test-3',
    });

    expect(result.data?.prescriptions).toHaveLength(1);
    expect(result.data?.prescriptions[0]?.value.medicationName).toBe('Ibuprofen');
    expect(result.data?.prescriptions[0]?.value.strength).toBe('400mg');
    expect(result.data?.prescriptions[0]?.value.frequency).toContain('six hours');
  });

  it('should return null for missing information', async () => {
    const transcript = `
      Doctor: Let's take your blood pressure.
      Patient: Okay.
      Doctor: 120 over 80, that's perfect.
    `;

    const result = await extractMedicalFields({
      transcript,
      language: 'en',
      appointmentId: 'test-4',
    });

    expect(result.success).toBe(true);
    expect(result.data?.chiefComplaint).toBeNull();
    expect(result.data?.diagnosis).toBeNull();
    expect(result.data?.prescriptions).toHaveLength(0);
  });
});
```

---

## References

- [OpenAI GPT-4 API Documentation](https://platform.openai.com/docs/api-reference/chat)
- [JSON Mode Documentation](https://platform.openai.com/docs/guides/text-generation/json-mode)
- [Transcription Pipeline](./transcription-pipeline.md)
- [US-007: AI Auto-Fill Medical Record](../stories/cards/US-007-ai-auto-fill.md)
- [Integration Architecture](../architecture/integrations.md)
