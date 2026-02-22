# AI Services Technology Stack: MedRecord AI

This document defines the AI/ML technology stack for the Medical Record System MVP, including speech-to-text transcription and structured data extraction services.

---

## Overview

MedRecord AI uses two primary AI services:

| Service | Provider | Model | Purpose |
|---------|----------|-------|---------|
| **Transcription** | OpenAI | Whisper (whisper-1) | Audio to text |
| **Extraction** | OpenAI | GPT-4 | Text to structured data |

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Audio     │────▶│   Whisper   │────▶│   Transcript    │
│  Recording  │     │     API     │     │     (text)      │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                  │
                                                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Form Data  │◀────│   GPT-4     │◀────│  Extraction     │
│   (JSON)    │     │     API     │     │    Prompt       │
└─────────────┘     └─────────────┘     └─────────────────┘
```

---

## OpenAI Whisper API (Transcription)

### Configuration

| Specification | Value |
|---------------|-------|
| **Provider** | OpenAI |
| **Model** | whisper-1 |
| **Endpoint** | POST /v1/audio/transcriptions |
| **Language** | English (en) |
| **Response Format** | text |

### Audio Format Requirements

| Format | Support | Notes |
|--------|---------|-------|
| **WebM (Opus)** | Recommended | Best browser support |
| MP3 | Supported | Alternative |
| WAV | Supported | Larger files |
| M4A | Supported | Alternative |
| FLAC | Supported | Lossless |

### File Size Limitations

| Limit | Value |
|-------|-------|
| **Maximum file size** | 25 MB |
| **Maximum duration** | ~90 minutes (at 128kbps) |
| **Recommended duration** | < 60 minutes |

### Audio Quality Requirements

| Setting | Value | Rationale |
|---------|-------|-----------|
| Sample Rate | 44.1 kHz | Standard quality |
| Channels | Mono | Voice recording |
| Bit Rate | 128 kbps | Good compression |
| Echo Cancellation | Enabled | Reduce room echo |
| Noise Suppression | Enabled | Reduce background noise |

### API Request Example

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes for large files
});

async function transcribeAudio(filePath: string): Promise<string> {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    language: 'en',
    response_format: 'text',
  });

  return response; // Returns plain text
}
```

### Cost Analysis

| Metric | Value |
|--------|-------|
| **Price** | $0.006 / minute |
| **15-minute recording** | $0.09 |
| **30-minute recording** | $0.18 |
| **Average per appointment** | ~$0.10 |

### Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| 413 (Payload Too Large) | File > 25MB | Split or compress audio |
| 400 (Bad Request) | Invalid format | Validate before upload |
| 429 (Rate Limited) | Too many requests | Implement retry with backoff |
| 500 (Server Error) | OpenAI issue | Retry or fallback to manual |

---

## OpenAI GPT-4 API (Extraction)

### Configuration

| Specification | Value |
|---------------|-------|
| **Provider** | OpenAI |
| **Model** | gpt-4 (or gpt-4-turbo) |
| **Endpoint** | POST /v1/chat/completions |
| **Response Format** | json_object |
| **Temperature** | 0.3 (low for consistency) |
| **Max Tokens** | 2000 |

### Model Selection

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| **gpt-4** | Best accuracy, reliable JSON | Higher cost, slower | **Selected (primary)** |
| gpt-4-turbo | Faster, larger context | Slightly less consistent | Alternative |
| gpt-3.5-turbo | Fast, cheap | Lower extraction accuracy | Not recommended |

### API Request Configuration

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: extractionPrompt },
  ],
  temperature: 0.3,
  max_tokens: 2000,
  response_format: { type: 'json_object' },
});
```

### Extraction Prompt Engineering

#### System Prompt

```typescript
const SYSTEM_PROMPT = `You are a medical documentation assistant specializing in extracting structured information from doctor-patient conversation transcripts.

Your responsibilities:
1. Extract only information explicitly stated or clearly implied in the transcript
2. Use null for any information not mentioned
3. Be conservative - do not assume or infer unstated information
4. Format medication names and dosages according to standard conventions
5. Identify severity levels when the patient describes intensity

Always respond with valid JSON matching the requested schema.`;
```

#### Extraction Prompt Template

```typescript
const EXTRACTION_PROMPT = `Extract medical information from the following doctor-patient conversation transcript.

Return a JSON object with this exact structure:
{
  "chiefComplaint": "Primary reason for visit (string or null)",
  "historyOfPresentIllness": "Detailed description of current illness (string or null)",
  "symptoms": [
    {
      "name": "Symptom name (required string)",
      "severity": "1-10 scale (number or null)",
      "duration": "How long symptom present (string or null)",
      "bodySite": "Location on body (string or null)",
      "notes": "Additional details (string or null)"
    }
  ],
  "diagnosis": "Primary diagnosis stated by doctor (string or null)",
  "diagnosisNotes": "Additional diagnostic notes (string or null)",
  "treatmentPlan": "Treatment approach (string or null)",
  "prescriptions": [
    {
      "medicationName": "Drug name (required string)",
      "strength": "Dose strength like '500mg' (required string)",
      "dosage": "Amount per dose like '1 tablet' (required string)",
      "frequency": "How often like 'twice daily' (required string)",
      "duration": "How long to take (string or null)",
      "instructions": "Patient instructions (required string)"
    }
  ],
  "followUp": "Follow-up instructions (string or null)",
  "allergiesNoted": ["Array of allergies mentioned"],
  "currentMedications": ["Array of current medications mentioned"]
}

Important guidelines:
- Only include symptoms and prescriptions if explicitly discussed
- For severity, convert patient descriptions: "mild" = 3, "moderate" = 5, "severe" = 8
- For prescriptions, all required fields must be present or omit the prescription
- If the doctor prescribes something, include full instructions

TRANSCRIPT:
${transcript}`;
```

### Extracted Data Schema

```typescript
interface ExtractedMedicalData {
  chiefComplaint: string | null;
  historyOfPresentIllness: string | null;
  symptoms: ExtractedSymptom[];
  diagnosis: string | null;
  diagnosisNotes: string | null;
  treatmentPlan: string | null;
  prescriptions: ExtractedPrescription[];
  followUp: string | null;
  allergiesNoted: string[];
  currentMedications: string[];
}

interface ExtractedSymptom {
  name: string;
  severity: number | null;
  duration: string | null;
  bodySite: string | null;
  notes: string | null;
}

interface ExtractedPrescription {
  medicationName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  instructions: string;
}
```

### Cost Analysis

| Metric | Value |
|--------|-------|
| **GPT-4 Input** | $0.03 / 1K tokens |
| **GPT-4 Output** | $0.06 / 1K tokens |
| **Average transcript** | ~1,500 tokens input |
| **Average response** | ~500 tokens output |
| **Per extraction** | ~$0.075 |

### Token Management

```typescript
// Estimate tokens (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Truncate if needed (GPT-4 has 8K context)
const MAX_TRANSCRIPT_TOKENS = 6000;

function prepareTranscript(transcript: string): string {
  const tokens = estimateTokens(transcript);
  if (tokens > MAX_TRANSCRIPT_TOKENS) {
    // Take first and last portions
    const charLimit = MAX_TRANSCRIPT_TOKENS * 4;
    const half = Math.floor(charLimit / 2);
    return (
      transcript.slice(0, half) +
      '\n\n[... middle portion truncated ...]\n\n' +
      transcript.slice(-half)
    );
  }
  return transcript;
}
```

---

## Alternative AI Services

### Transcription Alternatives

| Service | Pros | Cons | When to Use |
|---------|------|------|-------------|
| **OpenAI Whisper** | Accurate, simple API | No HIPAA BAA | **MVP (selected)** |
| Google Speech-to-Text | HIPAA compliant, medical model | More complex setup | HIPAA requirement |
| AssemblyAI | Medical vocabulary, HIPAA | Higher cost | If Whisper inadequate |
| AWS Transcribe Medical | HIPAA, medical terminology | Complex pricing | Enterprise/AWS stack |

### Extraction Alternatives

| Service | Pros | Cons | When to Use |
|---------|------|------|-------------|
| **OpenAI GPT-4** | Best accuracy, JSON mode | No HIPAA BAA | **MVP (selected)** |
| Claude (Anthropic) | Comparable quality | Different prompt style | GPT unavailable |
| Azure OpenAI | HIPAA compliant | Requires Azure setup | HIPAA requirement |
| Local LLM | Full data control | Lower accuracy, complex | Privacy critical |

### Cost Comparison (per appointment)

| Service | Transcription | Extraction | Total |
|---------|--------------|------------|-------|
| **OpenAI (selected)** | $0.10 | $0.08 | **$0.18** |
| Google + GPT-4 | $0.12 | $0.08 | $0.20 |
| AssemblyAI + Claude | $0.15 | $0.10 | $0.25 |
| AWS Medical | $0.14 | N/A | + extraction |

---

## API Key Management

### Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-your-api-key-here

# For production, use secret management service
```

### Security Best Practices

| Practice | Implementation |
|----------|----------------|
| **Never expose keys client-side** | All AI calls through backend |
| **Use environment variables** | Never hardcode keys |
| **Rotate keys periodically** | Every 90 days minimum |
| **Monitor usage** | OpenAI dashboard alerts |
| **Restrict key permissions** | API key restrictions in OpenAI |

### OpenAI Client Initialization

```typescript
// src/lib/openai.ts
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
  maxRetries: 2,
});
```

---

## Rate Limiting

### OpenAI Rate Limits

| Tier | Whisper (RPM) | GPT-4 (RPM) | TPM |
|------|--------------|-------------|-----|
| Free | 3 | 3 | 40K |
| Tier 1 ($5+) | 50 | 500 | 40K |
| Tier 2 ($50+) | 100 | 5,000 | 80K |

**MVP Assumption**: Tier 1 is sufficient for single-doctor use.

### Backend Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// AI-specific rate limiter
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'AI processing limit reached. Please wait a moment.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to AI routes
app.use('/api/v1/ai', aiRateLimiter);
```

### Request Queue (Optional Enhancement)

```typescript
import PQueue from 'p-queue';

// Limit concurrent AI requests
const aiQueue = new PQueue({
  concurrency: 2, // Max 2 concurrent
  interval: 1000,
  intervalCap: 3, // Max 3 per second
});

export async function queueTranscription(
  audioBuffer: Buffer
): Promise<string> {
  return aiQueue.add(() => transcribeAudio(audioBuffer));
}
```

---

## Error Handling

### Error Response Format

```typescript
interface AIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    fallbackAvailable: boolean;
  };
}
```

### Error Handling Strategy

```typescript
import { logger } from '../lib/logger';

async function handleAIRequest<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ success: true; data: T } | AIErrorResponse> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logger.error({ error, operation: operationName }, 'AI operation failed');

    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 429:
          return {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please wait and try again.',
              retryable: true,
              fallbackAvailable: true,
            },
          };
        case 400:
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Invalid audio format or input.',
              retryable: false,
              fallbackAvailable: true,
            },
          };
        case 500:
        case 503:
          return {
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'AI service temporarily unavailable.',
              retryable: true,
              fallbackAvailable: true,
            },
          };
        default:
          return {
            success: false,
            error: {
              code: 'AI_ERROR',
              message: 'An error occurred during AI processing.',
              retryable: false,
              fallbackAvailable: true,
            },
          };
      }
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
        retryable: false,
        fallbackAvailable: true,
      },
    };
  }
}
```

### Retry Strategy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry client errors
      if (error instanceof OpenAI.APIError && error.status < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

---

## Fallback Strategies

### Transcription Fallback

```
Audio Recording
      │
      ▼
Whisper API ──────▶ Success ──────▶ Display Transcript
      │
      │ Failure
      ▼
Retry (1x) ───────▶ Success ──────▶ Display Transcript
      │
      │ Failure
      ▼
Manual Entry Mode
(User types notes directly)
```

### Extraction Fallback

```
Transcript
      │
      ▼
GPT-4 Extraction ─▶ Success ──────▶ Auto-fill Form
      │
      │ Partial/Failure
      ▼
Display Transcript Only
(User fills form manually)
```

### Frontend Handling

```typescript
// After transcription
if (transcriptResult.success) {
  setTranscript(transcriptResult.data);
  setShowExtractButton(true);
} else {
  setTranscriptError(transcriptResult.error.message);
  setShowManualEntry(true);
}

// After extraction
if (extractionResult.success) {
  autoFillForm(extractionResult.data);
  setShowAIBadges(true);
} else {
  // Show transcript, let user fill manually
  setExtractionError(extractionResult.error.message);
  setManualMode(true);
}
```

---

## Cost Management

### Monthly Budget Tracking

```typescript
// Simple usage logging
interface APIUsageLog {
  timestamp: Date;
  service: 'whisper' | 'gpt4';
  inputSize: number;
  outputSize: number;
  estimatedCost: number;
}

async function logAPIUsage(usage: APIUsageLog): Promise<void> {
  logger.info({ usage }, 'API usage recorded');
  // Could store in database for reporting
}
```

### Cost Estimates (per month)

| Volume | Appointments | Transcription | Extraction | Total |
|--------|--------------|---------------|------------|-------|
| Low | 50 | $5 | $4 | $9 |
| Medium | 150 | $15 | $12 | $27 |
| High | 300 | $30 | $24 | $54 |

### Budget Alert (Optional)

```typescript
const MONTHLY_BUDGET = 50; // $50/month

async function checkBudget(): Promise<boolean> {
  const currentMonthUsage = await getMonthlyUsageCost();
  if (currentMonthUsage > MONTHLY_BUDGET * 0.8) {
    logger.warn({ usage: currentMonthUsage }, 'Approaching monthly budget');
  }
  return currentMonthUsage < MONTHLY_BUDGET;
}
```

---

## Testing AI Services

### Mock Services for Testing

```typescript
// __mocks__/openai.ts
export const mockTranscription = {
  create: jest.fn().mockResolvedValue(
    'Patient reports headache for three days, pain level 6 out of 10.'
  ),
};

export const mockChatCompletion = {
  create: jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            chiefComplaint: 'Headache for 3 days',
            symptoms: [
              { name: 'Headache', severity: 6, duration: '3 days' },
            ],
            diagnosis: null,
            prescriptions: [],
          }),
        },
      },
    ],
  }),
};
```

### Integration Test Example

```typescript
describe('AI Service', () => {
  it('should transcribe audio and extract medical data', async () => {
    // Use test audio file
    const audioBuffer = fs.readFileSync('test-fixtures/sample.webm');

    const transcript = await aiService.transcribe(audioBuffer);
    expect(transcript).toContain('headache');

    const extracted = await aiService.extractMedicalData(transcript);
    expect(extracted.symptoms.length).toBeGreaterThan(0);
  });
});
```

---

## HIPAA Considerations

### Current MVP Status

| Aspect | Status | Notes |
|--------|--------|-------|
| **OpenAI BAA** | Not available | Educational project only |
| **Data transmission** | HTTPS | Encrypted in transit |
| **Data storage** | Not persisted at OpenAI | Per API terms |
| **PHI handling** | Sent to OpenAI | Not HIPAA compliant |

### Production Path

For actual medical use:
1. Use Azure OpenAI (HIPAA BAA available)
2. Use AWS Transcribe Medical (HIPAA compliant)
3. Consider on-premise Whisper deployment
4. Implement proper audit logging

---

## References

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/api-reference/audio)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [OpenAI Pricing](https://openai.com/pricing)
