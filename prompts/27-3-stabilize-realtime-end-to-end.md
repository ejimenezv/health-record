# Prompt 27.3 — Stabilize realtime end-to-end

**Prerequisites:** Prompts 27.1 (audit) and 27.2 (Python pipeline fix) must have run.
The Python WebSocket handler should boot cleanly and outgoing event payloads
should match the React contract before this prompt starts.

## Goal

Take a real audio session in the browser, from "Iniciar Consulta" to "Finalizar",
and confirm the realtime UI displays incoming transcripts, entities, alerts, and
cost updates without errors. Fix everything that breaks under live load.

This phase is open-ended discovery — you can't predict in advance what will fail
once real audio bytes flow. Common categories: model downloads on first use,
OpenAI rate limits, asyncio queue backpressure, payload edge cases the audit
missed, message ordering, finalize hangs.

## How to run

The dev stack from earlier sessions should still be up. Verify before starting:

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'ai-service|postgres|redis|chromadb'
curl -sf http://localhost:3001/api/v1/health
curl -sf http://localhost:5173
```

If anything is down, restart it with the same approach used previously
(`pnpm --filter backend dev`, `pnpm --filter frontend dev` in the background;
`docker restart medrecord-ai-service`).

## Tasks

### 1. Pre-flight checks (read-only)

- Confirm `VITE_ENABLE_REALTIME=true` in `packages/frontend/.env`.
- Confirm a test appointment is in `in_progress` state, or note the steps to
  create one.
- Confirm the Node gateway logs show "AI session WebSocket gateway initialized"
  and the AI service logs show "Application startup complete".

### 2. Drive a session manually and capture telemetry

Walk through the smoke test the user described (login → appointments →
detail → start consult → toggle to "En Vivo (Beta)" → "Iniciar Consulta" →
speak ~10s → "Finalizar"). You can't drive a browser yourself, but you can:

- Open Chrome DevTools' Network → WS panel by instructing the user; ask them
  to copy/paste the frame log if needed.
- Tail backend, gateway, and AI service logs simultaneously while they run the
  session, and note every error / warning.
- Read the persisted events in the DB after finalization
  (`transcription_events`, `extraction_events`, `cost_events`,
  `validation_alerts` tables) — if any rows are present that's evidence
  Python emitted them. If none, the pipeline silently dropped them.

### 3. Fix what breaks

Likely categories — handle them as they appear, NOT preemptively:

- **Model load on first connect.** If the diarizer or whisper model takes >30s
  to download/warm up on first use, the WebSocket may close before the model is
  ready. Solution: warm the models at startup (in `lifespan`), not lazily on
  first connection. Don't preload everything blindly — only what the audit said
  is on the hot path.
- **OpenAI rate limits / auth.** If the extractor's OpenAI calls fail (401, 429),
  surface the error as a structured `error` WS event (recoverable: true) and
  ensure the session can still continue with degraded extraction.
- **Async queue starvation.** If `RAGValidationCoordinator` workers don't drain,
  the `validation_alert` events never arrive. Confirm `start()` was called and
  workers are running; log queue depths.
- **Finalize hangs.** Browser shows "Procesando..." indefinitely. The hook now
  has a REST-result fallback (Prompt 27.2 era), but if the WS is open and
  Python's finalize handler errors silently, no `session_complete` ever arrives.
  Make sure finalize emits `session_complete` (or a structured `error`) before
  closing the socket.
- **Stale sessions in Redis.** If the Python service tracks sessions in Redis
  and a previous broken session is still in there, new connections may collide.
  Document a clean way to drop them between runs (or auto-expire on the Python
  side).

### 4. Confirm the React UI displays results

Once a session runs without backend errors:
- Live transcript chunks should appear in the LiveTranscriptionView pane.
- Speaker indicator should switch between DOCTOR / PATIENT (or UNKNOWN if
  diarization can't decide — that's fine, just not crashing).
- Entities should populate the EntityExtractionView as the LLM extracts them.
- The CostMonitor should update at least once.
- After "Finalizar", status should flip to "Completada" and the final results
  card should show.

If any panel stays empty despite the backend producing the corresponding event,
that's a frontend wiring bug — investigate `useRealtimeSession.ts` and the
component for that panel.

### 5. Document operational notes

Add a section to `docs/architecture/realtime-pipeline-audit.md` (or a new file
`docs/guides/realtime-operational-notes.md` if it'd cleanly stand alone):
- Known limitations after this phase (e.g., "first connection takes ~20s while
  the diarization model warms up").
- Required env vars and what happens if they're missing.
- How to reset state between sessions.
- A short "smoke test" recipe so the next contributor can verify quickly.

### 6. Decision point at the end

Once you have a working end-to-end run, decide and report:

1. Is the realtime feature **production-ready** (can be defaulted on)?
2. Or **pilot-ready** (default off, enable for selected users)?
3. Or **dev-only** (works on dev hardware but has gaps that block any real user)?

Justify the call. The flag is currently
`VITE_ENABLE_REALTIME` in `packages/frontend/.env` and `.env.example`. Don't
flip the example default without explicit user approval — surface the
recommendation, let them decide.

## Constraints

- **Don't add features.** Only fix what's broken to make the existing flow
  work end-to-end.
- **Touch the frontend sparingly.** The React side passed Prompt 27.2's
  contract test; if the UI doesn't display something, prefer fixing the
  Python emitter over patching the React consumer, unless the audit was
  wrong about a payload field.
- **Don't lower the bar.** If something is fundamentally broken (e.g., the
  embedded OpenAI key has no quota, or the extractor only returns garbage on
  Spanish audio), don't paper over it — call it out as a blocker for
  production-on-by-default.
- **Don't `git commit` or `git push` anything.** Changes stay local until the
  user reviews.

## Report

End with:
1. The failure-mode inventory you discovered, in order, with the fix for each.
2. The end-to-end status: did a real session work? Paste the relevant log
   excerpts.
3. The production-readiness call (#6 above).
4. A short list of follow-ups that should happen *before* enabling realtime
   for real users (medical-grade reliability is the bar).
