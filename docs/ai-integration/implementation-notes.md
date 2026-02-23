# AI Integration Implementation Notes

This document describes the actual implementation of the AI transcription and extraction system, including key design decisions made during development.

---

## Overview

The AI integration provides real-time audio transcription and medical field extraction during consultations. The system uses:

- **OpenAI Whisper API** for speech-to-text transcription
- **GPT-4 / GPT-3.5** for medical field extraction
- **Socket.IO WebSockets** for real-time communication
- **15-second audio chunking** with stop/start recording approach

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  TranscriptionPanel                                                          │
│       │                                                                      │
│       ├── useAudioRecorder (15s chunks, WebM format)                        │
│       │       │                                                              │
│       │       └── MediaRecorder API (stop/start cycling)                    │
│       │                                                                      │
│       └── useTranscription (Socket.IO client)                               │
│               │                                                              │
│               └── WebSocket Events                                           │
│                       • start_session                                        │
│                       • audio_chunk (base64)                                 │
│                       • stop_session                                         │
│                       • transcription_update                                 │
│                       • field_extraction                                     │
│                       • session_completed                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Backend (Node.js/Express)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  TranscriptionGateway (Socket.IO namespace: /transcription)                  │
│       │                                                                      │
│       └── TranscriptionService                                               │
│               │                                                              │
│               ├── WhisperService (audio → text)                             │
│               │       └── OpenAI Whisper API                                │
│               │                                                              │
│               └── GPTService (text → structured fields)                     │
│                       └── OpenAI GPT-4 / GPT-3.5                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Files

### Frontend

| File | Purpose |
|------|---------|
| `hooks/useAudioRecorder.ts` | Manages MediaRecorder, 15s chunking, audio levels |
| `hooks/useTranscription.ts` | Socket.IO client, WebSocket event handling |
| `components/transcription/TranscriptionPanel.tsx` | Main UI component |
| `components/transcription/AudioRecorder.tsx` | Recording controls UI |
| `components/transcription/TranscriptionDisplay.tsx` | Live transcription text |
| `components/transcription/AIExtractionStatus.tsx` | Extraction progress indicators |
| `pages/appointments/MedicalRecordPage.tsx` | Integrates transcription with medical record |

### Backend

| File | Purpose |
|------|---------|
| `services/transcription.service.ts` | Session management, orchestration |
| `services/ai/whisper.service.ts` | OpenAI Whisper API integration |
| `services/ai/gpt.service.ts` | GPT field extraction with context |
| `websocket/transcription.gateway.ts` | Socket.IO event handlers |
| `types/ai.types.ts` | TypeScript interfaces |

---

## Audio Recording Strategy

### Stop/Start Chunking Approach

Instead of using `timeslice` parameter (which creates fragmented WebM files), we use a stop/start approach:

```typescript
// Each chunk is a complete, valid WebM file
const recordChunk = async (): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.start();

    // Stop after chunkDuration (15 seconds)
    setTimeout(() => recorder.stop(), chunkDuration);
  });
};
```

**Why 15 seconds?**
- Balances transcription accuracy vs. latency
- Each chunk contains enough context for Whisper
- Prevents word clipping at boundaries

---

## GPT Extraction with Context

### Problem: Duplicate Entries

When AI extraction runs multiple times (every ~30 seconds during recording), GPT might generate slightly different names for the same medication or symptom:
- "Tempra" vs "Tempra 500mg" vs "Paracetamol"

### Solution: Existing Records Context

GPT now receives the names of existing symptoms and prescriptions, instructing it to use the exact same names:

```typescript
// gpt.service.ts
async extractMedicalFields(
  transcription: string,
  existingRecords?: ExistingRecords
): Promise<ExtractionResult> {
  let contextMessage = '';

  if (existingRecords) {
    const parts: string[] = [];

    if (existingRecords.symptoms.length > 0) {
      parts.push(`Síntomas ya registrados (usa EXACTAMENTE estos nombres):
${existingRecords.symptoms.map(s => `- "${s.name}"`).join('\n')}`);
    }

    if (existingRecords.prescriptions.length > 0) {
      parts.push(`Medicamentos ya registrados (usa EXACTAMENTE estos nombres):
${existingRecords.prescriptions.map(p => `- "${p.medicationName}"`).join('\n')}`);
    }

    if (parts.length > 0) {
      contextMessage = `CONTEXTO IMPORTANTE - Registros existentes:\n${parts.join('\n\n')}\n\n`;
    }
  }

  // Include context in GPT prompt
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `${contextMessage}Transcripción:\n\n${transcription}` },
    ],
    temperature: 0.2, // Lower for consistent naming
    // ...
  });
}
```

---

## Frontend Duplicate Prevention

### Problem: Stale Closure

The `handleExtractionUpdate` callback captured `medicalRecord` state at creation time. When extraction ran multiple times, the callback used stale data.

### Solution: Refetch Before Processing

```typescript
// MedicalRecordPage.tsx
const handleExtractionUpdate = useCallback(
  async (extraction: AIExtractionResult) => {
    // Refetch to get the latest data before processing
    const { data: freshData } = await refetch();

    const currentRecord = freshData ?? medicalRecordRef.current;
    const existingSymptoms = currentRecord?.symptoms || [];
    const existingPrescriptions = currentRecord?.prescriptions || [];

    // Process symptoms: update existing or add new
    for (const symptom of extraction.symptoms) {
      const existingSymptom = existingSymptoms.find(
        (existing) => existing.symptomName.toLowerCase() === symptom.description.toLowerCase()
      );

      if (existingSymptom) {
        // Update with new info if available
        const hasNewInfo =
          (severityValue && !existingSymptom.severity) ||
          (symptom.duration && !existingSymptom.duration);

        if (hasNewInfo) {
          await updateSymptom.mutateAsync({ symptomId: existingSymptom.id, data: { ... } });
        }
      } else {
        // Add new symptom
        await addSymptom.mutateAsync({ appointmentId, data: { ... } });
      }
    }

    // Similar logic for prescriptions...
    // Diagnosis is always replaced (only one per record)
  },
  [appointmentId, addSymptom, updateSymptom, /* ... */]
);
```

### Update vs. Skip Logic

| Entity | Behavior |
|--------|----------|
| **Symptoms** | Find by name (case-insensitive). If exists and new extraction has additional info (severity, duration, notes), UPDATE. Otherwise skip. If new, ADD. |
| **Prescriptions** | Find by medication name (case-insensitive). If exists and new extraction has additional info (dosage, frequency, duration, instructions), UPDATE. Otherwise skip. If new, ADD. |
| **Diagnosis** | Always REPLACE with latest extraction (only one per record) |
| **Chief Complaint** | Only fill if not already set |

---

## GPT Prompt Structure

### System Prompt (Spanish)

```
Eres un asistente de documentación médica. Analiza transcripciones de consultas médicas en español.

Extrae la información y responde con este EXACTO formato JSON (usa estos nombres de campos en inglés):

{
  "symptoms": [{"description": "...", "severity": "mild|moderate|severe", "duration": "...", "onset": "..."}],
  "diagnosis": {"description": "...", "icdCode": "...", "confidence": 0.0-1.0} o null,
  "prescriptions": [{"medication": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}],
  "chiefComplaint": "..." o null,
  "summary": "resumen breve en español (2-3 oraciones)"
}

IMPORTANTE:
- USA EXACTAMENTE los nombres de campos mostrados arriba (en inglés)
- El contenido/valores pueden estar en español
- Si algo no se menciona, usa null o array vacío []
- Sé conservador con la confianza del diagnóstico
```

### Key Design Decisions

1. **JSON field names in English** - Ensures consistent parsing regardless of GPT's language tendencies
2. **Values in Spanish** - Natural for Spanish transcriptions
3. **Low temperature (0.2)** - More deterministic, consistent naming
4. **Explicit JSON structure** - Prevents GPT from inventing field names

---

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `start_session` | `{ appointmentId }` | Begin transcription session |
| `audio_chunk` | `{ audio: base64, chunkIndex }` | Send audio data |
| `stop_session` | - | End session, trigger final extraction |
| `cancel_session` | - | Abort without saving |
| `request_extraction` | - | Trigger incremental extraction |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `session_started` | - | Session ready |
| `transcription_update` | `{ text, fullText, chunkIndex }` | New transcription |
| `field_extraction` | `AIExtractionResult` | Extracted fields |
| `status` | `{ status }` | Processing status |
| `session_completed` | `{ transcription, extraction }` | Final results |
| `session_cancelled` | - | Session aborted |
| `error` | `{ message, code }` | Error occurred |

---

## Database Schema Changes

### Prescription Model

Made `strength` and `instructions` optional to accommodate AI extractions:

```prisma
model Prescription {
  // ...
  strength        String?           // Was required, now optional
  instructions    String?  @db.Text // Was required, now optional
  // ...
}
```

### Transcription Model

```prisma
model Transcription {
  id              String    @id @default(uuid())
  appointmentId   String    @unique
  fullText        String?   @db.Text
  durationSeconds Int?
  status          String    @default("recording")
  startedAt       DateTime?
  completedAt     DateTime?
  // ...
}
```

---

## Error Handling

### Chunk Processing Errors

Individual chunk failures don't abort the session:

```typescript
socket.on('error', (data: { message?: string; code?: string }) => {
  onError(data.message || 'Error');
  // Only update status to error if not a chunk error
  if (data.code !== 'CHUNK_ERROR') {
    updateStatus('error');
  }
});
```

### Empty Extraction Filtering

Prevents overwriting good real-time extractions with empty final ones:

```typescript
socket.on('session_completed', (data) => {
  // Only update extraction if it has meaningful data
  if (
    data.extraction &&
    (data.extraction.symptoms?.length > 0 ||
      data.extraction.diagnosis ||
      data.extraction.prescriptions?.length > 0 ||
      data.extraction.summary)
  ) {
    onFieldExtraction(data.extraction);
  }
});
```

---

## Performance Considerations

1. **Chunk size (15s)** - Balances latency vs. accuracy
2. **Incremental extraction (GPT-3.5)** - Faster, cheaper for real-time
3. **Final extraction (GPT-4)** - More accurate for final record
4. **Refetch before processing** - Ensures fresh data, avoids duplicates
5. **Context passing** - Prevents duplicate entries from naming variations

---

## Testing Notes

### Manual Testing Checklist

- [ ] Start recording - should show "Conectando..." then "Grabando..."
- [ ] Speak in Spanish - transcription should appear in real-time
- [ ] Mention symptoms - should extract after ~30 seconds
- [ ] Mention medications - should extract with dosage, frequency
- [ ] Stop recording - should show "Procesando..." then final results
- [ ] Check medical record - symptoms/prescriptions should be saved
- [ ] Start second recording - should NOT duplicate existing entries
- [ ] Mention same medication with more details - should UPDATE existing

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Duplicates after second extraction | Stale closure in callback | Refetch before processing |
| Spanish field names from GPT | Prompt not explicit enough | Show exact JSON structure in prompt |
| Missing medications | GPT returning Spanish keys | Normalize in `normalizeResult()` |
| Prisma error on save | Required fields missing | Make `strength`/`instructions` optional |

---

## Future Improvements

1. **Fuzzy matching** - Match "Tempra" to "Tempra 500mg" even if not exact
2. **Conflict resolution UI** - Let doctor choose between AI suggestions
3. **Batch operations** - Reduce API calls for multiple updates
4. **Offline support** - Queue audio chunks when disconnected
5. **Multi-language** - Support English consultations

---

## References

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI GPT-4 API](https://platform.openai.com/docs/api-reference/chat)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
