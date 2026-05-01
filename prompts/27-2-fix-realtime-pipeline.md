# Prompt 27.2 — Fix the realtime AI pipeline

**Prerequisite:** Prompt 27.1 must have been run. Read
`docs/architecture/realtime-pipeline-audit.md` first — it contains the gap analysis
and the precise list of fixes this prompt is supposed to apply.

## Goal

Make `ai-service/src/api/websocket/streaming.py` actually work end-to-end:
- Pipeline services constructed with their real signatures.
- Audio chunk → transcript → diarization → extraction → validation flows correctly
  (transcript callbacks must drive downstream stages).
- All outgoing WebSocket events match the contract React expects.
- Required lifecycle calls (`start()` on validation coordinator, etc.) are present.

The Node gateway and React frontend are correct as of this point — do NOT change
them unless the audit explicitly identifies a frontend-side bug. Adapt the Python
side to the published frontend contract, not the other way around.

## Tasks

### 1. Implement every fix listed in section 1 of the audit (constructors)

For each constructor mismatch:
- Build any missing dependencies (e.g., `EntityMatchingEngine` with a real
  `embedding_fn` — use whatever embedding service the audit identified in the repo).
- If a service requires construction-time data the handler doesn't yet have (e.g.,
  cost tracker), either construct a no-op default OR import the real one if it
  exists. Do not pass `None` if the class rejects `None`.

If `dependencies.py` (`Services` dataclass) is the right place for shared
singletons (embedding fn, entity store, etc.), add them there. If they're
session-scoped, construct them inside the WS handler. Audit's section 5 should
have made the call.

### 2. Wire the pipeline (audit section 2)

Make the transcript callback actually drive extraction. Make the extraction
callback actually drive validation. Whatever the audit's data-flow narrative
says, implement that. The fact that the four services exist in scope is not
enough — they must be chained.

Confirm by reading: a single audio chunk should cause a `transcript_update` event
AND, if the transcript yields entities, an `extraction_update` event AND, if those
entities trigger a rule, a `validation_alert` event — all from the same input
chunk, without any extra method invocation from outside the handler.

### 3. Add missing lifecycle calls (audit section 3)

If `RAGValidationCoordinator` needs `start()` to run workers, call it in the
handler before `await websocket.receive()`. Pair with `stop()` in the `finally`
block. Same for any other service. Be careful with cancellation: `stop()` must
be safe to call even if `start()` failed.

### 4. Normalize WS event payloads to the React contract (audit section 4)

For every `connection_manager.send_json(...)` call, change the payload to match
what `packages/frontend/src/types/websocketEvents.ts` expects:

```ts
{
  event: '<event_name>',     // NOT 'type'
  session_id: string,
  timestamp: string,         // ISO 8601
  data: { ... }              // event-specific fields wrapped here
}
```

Specifically (cross-check the audit):
- `transcript_update.data`: `chunk_index`, `text`, `is_final`, `language`,
  `confidence`.
- `speaker_changed.data`: `speaker_id`, `role` (`DOCTOR`|`PATIENT`|`UNKNOWN`),
  `confidence`, `start_time`.
- `extraction_update.data`: `entity_type`, `entity` (with id, content,
  confidence, speaker?, timestamp, metadata?), `chunk_index`.
- `validation_alert.data`: `alert_id`, `type`, `severity`, `message`,
  `related_entities`, `recommended_action?`, `requires_immediate_attention`.
- `entity_validated.data`: `entity_id`, `entity_type`, `validation_status`,
  `confidence_score`, `validation_notes?`.
- `cost_update.data`: `transcription_cost_usd`, `extraction_cost_usd`,
  `total_cost_usd`, `chunks_processed`, `cache_hit_rate`.
- `session_complete.data`: `status`, `final_transcript`, `total_chunks`,
  `total_entities`, `total_alerts`, `processing_time_ms`, `final_cost_summary`
  (with `transcription_cost_usd`, `extraction_cost_usd`, `total_cost_usd`,
  `audio_duration_seconds`).
- `error.data`: `error_code`, `message`, `details?`, `recoverable`.

A helper like `def make_event(event_name, session_id, **data)` is fine; don't
over-abstract. Two `*.send_json` calls per event type at most.

### 5. Verify the handler boots and survives a connection

After your changes:
1. Restart `medrecord-ai-service` (Docker). Confirm no startup errors.
2. From the host: open a raw WebSocket to
   `ws://localhost:8000/ws/session?session_id=<dummy>&token=<service-jwt>` (you
   can mint a token with the AI service's JWT secret — check `.env`). The Python
   service may reject because the session isn't registered upstream — that's
   expected. What MUST NOT happen is a Python traceback in
   `docker logs medrecord-ai-service`.
3. End-to-end will be tested in 27.3.

### 6. Update tests

The Python WebSocket contract test at
`ai-service/tests/unit/test_websocket_event_contract.py` (if it exists) must be
updated to assert the new payload shapes. If it doesn't exist, write a minimal
one that constructs each `make_event` call and checks the resulting JSON
matches the React TS types. Consider this the contract gate — if it passes,
the React side will parse successfully.

Run `docker exec medrecord-ai-service pytest tests/unit/test_websocket_event_contract.py` and ensure green.

## Constraints

- **One file is the primary target:** `ai-service/src/api/websocket/streaming.py`.
  `dependencies.py` may need a small addition for shared embeddings. Don't touch
  anything else unless the audit explicitly calls it out.
- **Do not change the React frontend, the TS event types, or the Node gateway**
  unless the audit identifies a real bug there. The Python side must adapt.
- **Don't `try: ... except Exception: pass` over real errors.** If a pipeline
  stage fails, emit a structured `error` WS event with `recoverable: true|false`
  and log via `logger.exception`. Silent failures killed us all morning.
- **No comments narrating what code does.** Only `# Why:` comments where the
  reason isn't self-evident from the code.
- **No new Python deps.** If the audit requires a tokenizer / embedder that
  isn't already installed in the container, stop and surface it as an open
  question rather than `pip install`-ing.

## Done criteria

- [ ] `docker logs medrecord-ai-service` shows no traceback after restart.
- [ ] A WebSocket connection to the Python service does not crash the handler.
- [ ] Outgoing event payloads match `websocketEvents.ts` exactly (verified by
      the contract test from task 6).
- [ ] Pipeline calls are chained: transcript → extraction → validation.
- [ ] `start/stop` lifecycle is present.

End-to-end browser testing happens in 27.3 — don't try to verify it here.

## Report

When done, report:
1. Files changed (full paths).
2. The exact list of constructor / wiring / lifecycle / event-shape fixes
   applied, mapping each back to its audit-section reference.
3. Any audit "open question" you had to resolve unilaterally — and which way.
4. Anything you noticed that the audit missed — ideally none.
