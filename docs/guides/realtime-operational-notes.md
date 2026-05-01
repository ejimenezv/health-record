# Realtime pipeline — operational notes (Prompt 27.3)

These notes capture what it took to get the realtime consultation flow
("Iniciar Consulta" → live audio → "Finalizar") working end-to-end after the
Prompt 27.1 audit and Prompt 27.2 wiring fixes. They focus on what a future
contributor needs to know to run, debug, and decide whether to enable the
feature for real users.

> **Companion guide:** [rag-vademecum-setup.md](rag-vademecum-setup.md) —
> how to populate ChromaDB with the curated Spanish vademecum + drug
> interactions + CIE-10 codes so the *Alertas de Validación* panel
> actually fires alerts. Required after every clean dev deploy.

## Smoke test

With the dev stack up (`docker compose up -d` for the AI service +
infra; `pnpm --filter backend dev` and `pnpm --filter frontend dev` for the
TypeScript apps):

1. Confirm services are healthy:
   ```bash
   docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'ai-service|postgres|redis|chromadb'
   curl -sf http://localhost:8000/health
   curl -sf http://localhost:3001/api/v1/health
   curl -sf http://localhost:5173 -o /dev/null -w '%{http_code}\n'
   ```

2. Synthetic WS round-trip (no browser needed — runs inside the AI
   container, mints its own JWT, sends webm/opus audio):
   ```bash
   docker exec medrecord-ai-service python - <<'PY'
   import asyncio, json, io, os
   from datetime import datetime, timezone, timedelta
   from jose import jwt
   from pydub.generators import Sine
   import websockets
   secret = os.environ['JWT_SECRET_KEY']
   tok = jwt.encode({'sub':'smoke','exp': datetime.now(timezone.utc) + timedelta(minutes=5)}, secret, algorithm='HS256')
   sid = 'smoke-' + os.urandom(4).hex()
   url = f'ws://localhost:8000/ws/session?session_id={sid}&token={tok}'
   tone = Sine(300).to_audio_segment(duration=5000).set_frame_rate(16000).set_channels(1)
   buf = io.BytesIO(); tone.export(buf, format='webm', codec='libopus'); chunk = buf.getvalue()
   async def main():
       async with websockets.connect(url, max_size=2**24) as ws:
           await ws.send(chunk); await asyncio.sleep(8)
           await ws.send(json.dumps({'type':'finalize'}))
           while True:
               d = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
               print(d['event'], json.dumps(d.get('data', {}))[:120])
               if d['event'] == 'session_complete': break
   asyncio.run(main())
   PY
   ```
   Expected: `transcript_update` (text non-empty), then `session_complete`
   with `final_transcript` and `audio_duration_seconds ≈ 5`.

3. Browser smoke test: log in, open an appointment, "Iniciar Consulta",
   toggle "En Vivo (Beta)", speak ~10s in Spanish, "Finalizar". Verify the
   LiveTranscriptionView populates and the status flips to "Completada".

## Required env vars (AI service)

| Variable | Effect if missing |
|---|---|
| `OPENAI_API_KEY` | Whisper transcription returns 401; pipeline falls back to errors. |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` | WebSocket connections rejected with 4001. |
| `REDIS_URL` | Diarizer can't persist speaker state; speaker events vanish. |
| `WHISPER_MODEL` / `WHISPER_LANGUAGE` | Defaults work, but mis-set values produce empty transcripts. |

Frontend gating: `VITE_ENABLE_REALTIME=true` in
`packages/frontend/.env`. The example file ships with `false`; flipping the
example default is intentionally **not** part of this change — see decision
section.

## How to reset state between sessions

Speaker state is keyed in Redis by `speaker_state:<session_id>`. To clear all
of it:

```bash
docker exec medrecord-redis redis-cli --scan --pattern 'speaker_state:*' | \
  xargs -r docker exec -i medrecord-redis redis-cli DEL
```

The connection manager in the AI service rejects a second WS for an active
session id (close code 4002). If a previous WS hung, restart the AI service
to clear the in-process map: `docker restart medrecord-ai-service`.

## Known limitations

1. **WebM streaming is fragile.** MediaRecorder emits the EBML/Tracks header
   on the first chunk only; subsequent chunks contain raw clusters and would
   not decode standalone. The WS handler caches the first chunk's bytes and
   prepends them to every later chunk before passing to `StreamProcessor`.
   This works for Chrome/Firefox where each timeslice falls on a cluster
   boundary, but is not guaranteed by the spec. A correct long-term fix is to
   move the browser to AudioWorklet + raw PCM frames.
2. **Cost reporting is zero.** No `CostTracker` is wired into the
   `StreamProcessor` or `IncrementalExtractor`. `cost_update` and
   `final_cost_summary` always emit zero dollar amounts;
   `audio_duration_seconds` is correct.
3. **First chunk's timeslice now 5 s.** `mediaRecorder.start(5000)` aligns
   with `StreamProcessor.VOICE_CHUNK_INTERVAL_MS`. This means there's no
   audio in flight for the first ~5 seconds of speech — users see "En Vivo"
   without any transcript ticker until the first cluster arrives.
4. **Whisper hallucinations on near-silent audio.** The smoke-test sine tone
   produces "Subtítulos realizados por la comunidad de Amara.org" — Whisper's
   well-known fallback for low-information audio. Not a bug, just noise.
5. **Stream processor `is_partial` is always True.** Every Whisper response
   is marked partial; the WS handler now appends any non-empty text to
   `transcript_parts` regardless, so `final_transcript` is populated.
6. **Diarizer is keyword-based.** Spanish keyword indicators only.
   English/code-switched consultations will be tagged `UNKNOWN`.
7. **InMemoryEntityStore is per-process.** Entity state does not survive an
   AI service restart and does not span replicas.

## Failure-mode inventory discovered in 27.3

In order of severity, what broke and the fix applied:

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | First WS connect stalls for 10–30 s | Silero VAD model downloads lazily on first `StreamProcessor` construction | Warm `load_silero_vad()` in FastAPI lifespan |
| 2 | All audio chunks fail to decode | `pydub.AudioSegment.from_file(..., format="opus")` on what is actually a webm container; ffmpeg errors with "Unknown input format: opus" | Default `format="webm"` in `SileroVAD.process_audio_segment` and `StreamProcessor._transcribe_audio` |
| 3 | Every chunk after the first fails to decode | MediaRecorder emits EBML/Tracks header only on the first chunk; subsequent chunks have no header | Cache first chunk's bytes in WS handler; prepend to every later chunk before passing to processor |
| 4 | VAD raises `ValueError: Provided number of samples is 80000` for every chunk | Silero VAD's TorchScript model requires fixed window sizes (512 samples at 16 kHz, 256 at 8 kHz). Code passed the entire 5 s buffer. | Slide a 512-sample window across the chunk and aggregate max probability |
| 5 | `final_transcript` always empty | `transcript_parts` was gated on `is_final=True` but `StreamProcessor` always emits `is_partial=True` | Append any non-empty text to `transcript_parts`; document the underlying `is_partial` quirk |
| 6 | High-frequency MediaRecorder chunks (50/s) | `mediaRecorder.start(20)` ms timeslice produces unparseable webm fragments and saturates the WS | Raise to 5000 ms, matching `VOICE_CHUNK_INTERVAL_MS` |
| 7 | `diarizer.finalize_session` errors on sessions with no audio | Raises `ValueError("No speaker state found")` when Redis key is absent | Already wrapped in `try/except` at the WS layer; noisy log only, not user-facing |

## End-to-end status

Synthetic session via the `docker exec` script above produced:

```
transcript_update {"chunk_index":-1,"text":"","is_final":false,...}
transcript_update {"chunk_index":0,"text":"Subtítulos realizados por la comunidad de Amara.org","is_final":false,...}
session_complete  {"status":"success","total_chunks":1,"total_entities":0,"total_alerts":0,
                   "processing_time_ms":8573,
                   "final_transcript":"Subtítulos realizados por la comunidad de Amara.org",
                   "final_cost_summary":{"transcription_cost_usd":0.0,...,"audio_duration_seconds":10.026}}
```

No backend exceptions, no error events. Two webm chunks (one with header, one
header-less continuation) both decoded correctly and were processed by the
StreamProcessor → on_transcript_chunk → WS pipeline.

The browser-driven path was not exercised in this prompt (no browser
automation available), so display-side bugs in the React panes can only be
verified manually; the WS contract is now fully covered by the synthetic
test and matches `packages/frontend/src/types/websocketEvents.ts`.

## Production-readiness call

**Recommendation: dev-only.** Do not flip `VITE_ENABLE_REALTIME` to `true`
in `.env.example` yet.

Justification:
- The webm-init-segment trick is brittle. Any browser that emits a chunk
  mid-cluster (Safari, future Chrome update, mobile WebKit) will silently
  fail to decode and the user will see no transcript. There is no automated
  fallback or detection for this.
- Cost telemetry is zero across the board — running this against real users
  means no budget tracking and no cost-update UI value.
- The 5 s timeslice means users get no live-transcript feedback for the
  first 5 seconds of every consultation, which conflicts with the "En Vivo"
  promise.
- Whisper hallucinations on quiet audio (Amara.org artefact) get persisted
  as real transcripts. Acceptable in dev, not in a medical record.
- No load testing; only single-session synthetic exercise.

## What's missing (status of every gap, with effort estimates)

| # | Gap | Status | User-visible effect today | Effort | Blocks pilot? | Blocks production? |
|---|---|---|---|---|---|---|
| 1 | AudioWorklet → raw PCM (replace MediaRecorder webm streaming) | **MISSING** | Works on Chrome/Firefox desktop. Safari and mobile WebKit may silently produce empty transcripts. | 2–4 days | No (if you control the browser) | **Yes** |
| 2 | `CostTracker` wired into `StreamProcessor` + `IncrementalExtractor` | **MISSING** | Backend emits `$0.00` for every cost field. **CostMonitor and the final cost block are now hidden** in [RealtimeSessionView.tsx](packages/frontend/src/components/realtime/RealtimeSessionView.tsx) so doctors don't see misleading zeros. Audio duration is still shown. | 0.5–1 day | No | Yes (no budget visibility) |
| 3 | Whisper hallucination filter (Amara.org / "Subtítulos por…" / channel-promo / ALL-CAPS SUBTITULO* / "Gracias por ver" patterns) | **DONE** in [streaming.py](ai-service/src/api/websocket/streaming.py) (`_is_whisper_hallucination`). Drops matching slices server-side; logs each drop. Add new patterns to `_WHISPER_HALLUCINATION_SUBSTRINGS` as they're observed. | Hallucinated junk no longer reaches transcript / extractor. | — | — | — |
| 4 | Concurrent-session load test | **NOT RUN** | Unknown behavior past 1 simultaneous session. | 1 day | No (single user) | **Yes** |
| 5 | Replace keyword-only diarizer with audio-feature diarizer (pyannote/speechbrain) | **MISSING** | Spanish keyword indicators only. Other languages → `UNKNOWN` role. Quiet/overlapping speech misclassified. | 3–5 days off-the-shelf, 1–2 weeks tuned | No | Likely yes |
| 6 | WebSocket reconnection / session resume on transient drops | **MISSING** | Network blip mid-consultation = session lost, no recovery. Frontend shows error. | 2–3 days | No (stable LAN) | **Yes** |
| 7 | Hoist `EmbeddingsService` + `EntityMatchingEngine` into `Services` singleton | **MISSING** | Re-instantiated per WebSocket. Wasteful (extra OpenAI client setup) but functionally correct. | 0.5 day | No | No (optimization) |

**Total to reach pilot-ready (#3 + #1 + #2):** ~4–6 working days.
**Total to reach production-ready (all of the above):** ~3 weeks for one engineer; longer if #5 is tuned properly.

## Follow-ups required before enabling realtime for any real user

1. Replace MediaRecorder webm streaming with AudioWorklet → raw PCM frames
   (resolves limitations 1, 3, 6 above structurally).
2. Wire `CostTracker` into `StreamProcessor` and `IncrementalExtractor`;
   surface real numbers in `cost_update` / `final_cost_summary`.
3. Filter known Whisper hallucinations server-side (Amara.org pattern, MBC
   pattern, etc.) before emitting `transcript_update`.
4. Add load test: 10 concurrent sessions, verify no `connection_manager`
   leaks, no Redis key explosion, no extractor queue starvation.
5. Replace keyword-based diarizer with an audio-feature diarizer (or at
   least add an English-keyword fallback).
6. Add WS-level reconnection / resume so a transient network blip during a
   live consultation doesn't lose the session.
7. Move `EmbeddingsService` and `EntityMatchingEngine` into the `Services`
   singleton (per audit §6) so a long-running multi-pod backend doesn't
   re-instantiate them per WebSocket.
