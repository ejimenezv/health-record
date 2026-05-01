# Prompt 27.1 — Audit the realtime AI pipeline (READ-ONLY)

## Why this exists

Prompt 27 wired the React frontend (and Prompt 26 wired the Node gateway) for realtime
streaming consultations. Both compile and pass unit tests. But when run end-to-end the
Python WebSocket handler at `ai-service/src/api/websocket/streaming.py` crashes on every
connection because it constructs pipeline services from Prompts 17–22 with arguments
that don't match those classes' actual signatures, and emits WS events with payload
shapes the React side doesn't recognize.

So far we hit, in order:
1. `OSError: libcudart.so.13` — torchaudio/torch version mismatch (fixed by pinning
   `torchaudio==2.2.0`).
2. `TypeError: IncrementalExtractor.__init__() got an unexpected keyword argument
   'redis_client'` — first signature mismatch.

Each fix exposes the next layer. Stop fixing in place — do an exhaustive audit first
so the actual repair is a single coordinated change, not whack-a-mole.

## Your task

**Read-only.** Do NOT modify code. Produce a written audit at
`docs/architecture/realtime-pipeline-audit.md`.

### What to audit

1. **Pipeline service constructors.** For each class instantiated by `streaming.py`,
   compare the *call site* against the class's *actual `__init__` signature*. List
   every mismatch (extra args, missing args, wrong names, missing required deps that
   need to be constructed first). Record file:line for both call site and definition.
   Classes to check, all under `ai-service/src/`:
    - `services.stream_processor.StreamProcessor`
    - `transcription.diarization.incremental_diarizer.IncrementalDiarizer`
    - `services.extraction.incremental_extractor.IncrementalExtractor`
    - `services.entity_matching.EntityMatchingEngine` (NOT currently constructed —
      figure out if `IncrementalExtractor` requires it and how to build one,
      including the `embedding_fn` parameter)
    - `rag.validation_coordinator.RAGValidationCoordinator`

2. **Pipeline data flow.** The handler creates four services and a transcript
   callback. Trace what is supposed to happen when an audio chunk arrives:
    - Audio bytes → `StreamProcessor.process_audio_chunk` → emits `TranscriptionChunk`
      via `transcription_callback`. ✅ Direct.
    - Transcript → diarization? Where is the bridge between transcript chunks and
      `IncrementalDiarizer`? Currently the transcript callback only emits a WS
      event — does it need to also feed the diarizer?
    - Transcript → extraction? Same question for `IncrementalExtractor`. Does it
      have an `extract` / `process_chunk` method that needs to be called from the
      transcript callback?
    - Extraction events → validation coordinator? Same question.
   Document the *real* method names and call order that wires the four services into
   a working pipeline. Cite file:line.

3. **Lifecycle calls that are missing.** `RAGValidationCoordinator` may need
   `start()` / `stop()` to run worker tasks; `IncrementalDiarizer` and
   `StreamProcessor` may need `start_session(session_id)` / `finalize_session`
   calls. Identify every lifecycle method not currently called. Cite file:line.

4. **Outgoing WS event contract.** For every `connection_manager.send_json(...)`
   call in `streaming.py`, capture the actual payload shape. Compare against what
   the React side expects in:
    - `packages/frontend/src/types/websocketEvents.ts` (canonical TS types)
    - `packages/frontend/src/hooks/useRealtimeSession.ts` (consumer)
   For each event (`transcript_update`, `speaker_changed`, `extraction_update`,
   `validation_alert`, `entity_validated`, `cost_update`, `session_complete`,
   `error`), produce a side-by-side: { what Python sends } vs { what React parses }.
   Note whether the top-level field is `event` (React) or `type` (Python), whether
   payloads are wrapped under `data`, and any field-name divergences.

5. **Gateway forwarding.** The Node gateway at
   `packages/backend/src/websocket/ai-session-gateway.ts` forwards Python's frames
   to React verbatim and persists them. Confirm whether it does any payload
   reshaping. If it doesn't, the audit's "what Python sends" IS what React parses.

### Output format

`docs/architecture/realtime-pipeline-audit.md`, sections:

```markdown
# Realtime pipeline audit (Prompt 27.1)

## 1. Constructor mismatches
| Class | Call site | Actual signature | Fix needed |
|...|

## 2. Pipeline wiring gaps
(narrative + diagram of how chunks should flow)

## 3. Missing lifecycle calls
(start/stop/finalize methods not currently called)

## 4. Event contract divergences
| Event | Python emits | React expects | Action |
|...|

## 5. Required new construction
(EntityMatchingEngine and its embedding_fn — what concrete embedder is available
in the repo? Check `src/rag/`, `src/services/`, etc. for embedding services.)

## 6. Open questions for the user
(decisions that aren't a "fix this" but require a product call —
e.g., "the cost tracker isn't constructed; should we wire it now or defer?")
```

End with a **summary** stating, in plain words: "to make realtime work end-to-end,
prompt 27.2 must do the following N things." Number them.

### Constraints

- **No code changes whatsoever.** Read, summarize, recommend.
- Cite every claim with `file:line` so the next prompt can act fast.
- Don't speculate. If you can't determine something from the code, list it under
  "Open questions" rather than guessing.
- Keep the doc under 400 lines. Tables and bullets, not prose.
