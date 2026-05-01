# Realtime pipeline audit (Prompt 27.1)

Read-only audit of `ai-service/src/api/websocket/streaming.py` against the Python pipeline services (Prompts 17–22) and the React WS contract. No code was modified.

Conventions used below: `path:line` cites both call sites and definitions. All Python paths are relative to `ai-service/`; all TS paths are relative to `packages/`.

---

## POST-IMPLEMENTATION STATUS (Prompt 27.3 + follow-ups)

> Resolution status of every gap below as of the realtime stabilization
> work and the follow-ups #3 (hallucination filter), #5 (audio diarizer),
> and ChromaDB seeding. Source-of-truth for the current pipeline is
> [`streaming-transcription-architecture.md`](streaming-transcription-architecture.md);
> companion docs are
> [`realtime-operational-notes.md`](../guides/realtime-operational-notes.md)
> and [`rag-vademecum-setup.md`](../guides/rag-vademecum-setup.md).

### Section 1 — Constructor mismatches: ✅ RESOLVED (Prompt 27.2)

| # | Item | Status |
|---|---|---|
| 1 | `StreamProcessor` | OK; later **bypassed entirely** (audio path now lives directly in `streaming.py:_slice_and_transcribe`). `SileroVAD` reused as process singleton via `_get_vad()`. |
| 2 | `IncrementalDiarizer` | OK. Replaced at runtime by `AudioFeatureDiarizer` (subclass) when `DIARIZER_KIND=audio`. |
| 3 | `IncrementalExtractor` | Constructor fixed (Prompt 27.2). |
| 4 | `EntityMatchingEngine` | Constructed per WS via `EmbeddingsService` closure. Audit's open question §6.3 about hoisting to `Services` singleton remains open (follow-up #7). |
| 5 | `RAGValidationCoordinator` | OK. `start()` / `stop()` lifecycle wired (audit §3). |

Extraction callback signature mismatch (audit §1, "ExtractionEvent shape"): ✅ resolved — `on_extraction_update` accepts a single `ExtractionEvent` and unpacks it.

### Section 2 — Pipeline wiring gaps: ✅ RESOLVED (Prompt 27.2 + follow-ups)

The intended dataflow now flows end-to-end with several **new layers added beyond what the audit specified**:

```
audio bytes → session_audio (cumulative)
            → _slice_and_transcribe (overlap + VAD pre-check + Whisper + segment dedup + HallucinationFilter)
            → on_transcript_chunk (text-level boundary dedup _strip_overlap_text)
            → diarizer.process_chunk(audio_samples=…)   [NEW: AudioFeatureDiarizer]
            → extractor.process_transcript_chunk(…)
              → on_extraction_update (NEW pipeline:
                  AtomicEntitySplitter → forbidden-prefix sanity →
                  EntityTypeValidator → heuristic dedup →
                  EntitySemanticDeduper → emit)
              → validation_coordinator.enqueue_validation(…)
              → on_validation_event → validation_alert / entity_validated
```

Field-name caveats (`chunk.start_time`, `chunk.is_partial`): ✅ corrected.

### Section 3 — Missing lifecycle calls: ✅ RESOLVED

| Component | Status |
|---|---|
| `RAGValidationCoordinator.start()` | ✅ called at session start |
| `RAGValidationCoordinator.stop()` | ✅ called in `finally` |
| `IncrementalDiarizer.finalize_session` | ✅ called via `hasattr` shim; harmless `ValueError` log when no audio was processed |
| `StreamProcessor.finalize` | N/A — StreamProcessor no longer in audio path |
| `IncrementalExtractor.get_session_summary()` | ✅ |

### Section 4 — Event contract divergences: ✅ RESOLVED (Prompt 27.2)

All 8 events (`transcript_update`, `speaker_changed`, `extraction_update`, `validation_alert`, `entity_validated`, `cost_update`, `session_complete`, `error`) now match `packages/frontend/src/types/websocketEvents.ts`. Two undeclared frames (`connected`, `pong`) were removed; React's union is the source of truth.

### Section 5 — Required new construction: ✅ RESOLVED

`EntityMatchingEngine` constructed per-WS with an embedding closure over `EmbeddingsService.generate_query_embedding_async` (audit §5). Open question #6.3 (hoist into `Services`) deferred to follow-up #7.

### Section 6 — Open questions: status

| # | Question | Resolution |
|---|---|---|
| 1 | Cost tracker | **DEFERRED** (follow-up #2). Cost UI hidden in React until wired; `audio_duration_seconds` correct, dollar fields zero. |
| 2 | `get_cost_summary` aggregator | Resolved by emitting zeros + real duration from the WS layer's `last_processed_ms`. Becomes meaningful when #1 is done. |
| 3 | Embedder lifecycle | **DEFERRED** (follow-up #7). Per-WS construction is wasteful but correct. |
| 4 | Speaker stamping on extractions | ✅ `entity_payload["speaker"]` set from `diarizer.get_speaker_state()` per emission. |
| 5 | Severity mapping (priority → React) | ✅ `_severity_to_react`: critical/high/medium/low → CRITICAL/HIGH/MEDIUM/LOW. `_alert_type_for` maps event_type + warning text → React `AlertType`. |
| 6 | `finalize` on `StreamProcessor` | Moot — StreamProcessor not used. |
| 7 | `connected` / `pong` frames | Removed; not in React union. |
| 8 | Audio format `opus` vs `webm` | ✅ All call sites switched to `format="webm"`; the cumulative-buffer architecture handles container correctness without the original opus framing concern. |

### Surprising deltas the audit didn't predict

These bugs surfaced during 27.3 implementation and are now fixed:

| Bug | Fix |
|---|---|
| `MediaRecorder` only emits EBML/Tracks header on chunk 0; subsequent chunks have no decodable header alone | Cumulative `session_audio` accumulator; full-buffer decode each tick |
| `StreamProcessor` per-chunk VAD assumed self-contained chunks (true for Opus, false for `audio/webm;codecs=opus`) | StreamProcessor bypassed; VAD reused as process singleton on slice-level audio |
| Silero VAD requires fixed 512-sample windows at 16 kHz; 5 s slices crashed it | Sliding-window aggregation in `SileroVAD.detect_voice_activity` |
| Whisper hallucinates "Subtítulos por la comunidad de Amara.org", "Muchas gracias", "[Música]" on near-silence | `HallucinationFilter` (6 detection layers) at `transcription/hallucination_filter.py`; 40 unit tests |
| Whisper produces cumulative output when fed growing audio (overlap leaked repeated text) | Whisper segment-timestamp-based dedup + text-level prefix/suffix dedup (`_strip_overlap_text`) |
| MediaRecorder `start(20)` produced 50 fragments/s; final blob fired async after `finalize` | `start(5000)` ms; `stopRecording` awaits the `stop` event before WS finalize |
| Validation coordinator queried interactions with synthetic `MED_<uuid>` instead of real names | `session_medications` now stores `(id, name)` tuples; `_check_drug_interaction` uses real names |
| ChromaDB client 0.4.22 vs server 0.5.23 sent empty `where` filters that the server rejected | `chromadb==0.5.23` + `openai==2.33.0` pinned in `requirements.txt`; `vector_store.py` only passes filter kwargs when truthy |
| `EntityType` from extractor is broader than React's union (includes `MEDICATION`, `CHIEF_COMPLAINT`) | `_PY_TO_REACT_ENTITY_TYPE` mapper at the WS layer |
| Compound entities ("fiebre y dolor de cabeza") emitted alongside their atomics | `AtomicEntitySplitter` (LLM, gpt-4o-mini) splits before dedup |
| Bare misclassifications ("resfriado común" as symptom) bypassed the forbidden-prefix list | `EntityTypeValidator` (LLM, gpt-4o-mini) reclassifies into the right bucket |
| Synonyms ("Cefalea" vs "dolor de cabeza") slipped past string-based dedup | `EntitySemanticDeduper` (OpenAI embeddings + cosine ≥ 0.86) |
| Empty ChromaDB → no `validation_alert` ever fires regardless of meds prescribed | Curated dataset (30 meds + 25 interactions + 40 CIE-10) + `make ingest-vademecum-reset` |

### Net result

The audit's "to make realtime work end-to-end, prompt 27.2 must do the following 9 things" were all done in 27.2. The follow-up work (27.3 + #3 + #5 + RAG seeding) added ~6 new processing layers on top of what the audit specified, all of which were necessary for the feature to be usable on real audio with real medical content.

Test counts: 124 unit tests across the new modules
(`hallucination_filter`, `entity_dedup`, `entity_splitter`,
`entity_type_validator`, `audio_feature_diarizer`,
`strip_overlap_text`, plus existing `stream_processor`).

Production-readiness call: still **dev-only / pilot-ready** depending
on follow-ups #1 (AudioWorklet), #2 (CostTracker), #4 (load test),
#6 (WS reconnection). See [realtime-operational-notes.md](../guides/realtime-operational-notes.md)
section "What's missing" for the full table.

---

## Original audit (preserved as-written below for traceability)

---

## 1. Constructor mismatches

| # | Class | Call site | Actual `__init__` signature | Mismatch | Fix needed |
|---|---|---|---|---|---|
| 1 | `StreamProcessor` | `src/api/websocket/streaming.py:109-112` — `StreamProcessor(session_id=..., transcription_callback=on_transcript_chunk)` | `src/services/stream_processor.py:111-116` — `__init__(self, session_id, transcription_callback, cost_tracker=None)` | None on required args. `cost_tracker` not passed (optional). | OK as-is. Optionally inject `cost_tracker` (see §6). |
| 2 | `IncrementalDiarizer` | `src/api/websocket/streaming.py:125-128` — `IncrementalDiarizer(redis_client=services.redis, event_callback=on_speaker_change)` | `src/transcription/diarization/incremental_diarizer.py:41` — `__init__(self, redis_client, event_callback=None)` | None. Matches. | OK as-is. |
| 3 | `IncrementalExtractor` | `src/api/websocket/streaming.py:140-143` — `IncrementalExtractor(redis_client=services.redis, event_callback=on_extraction_update)` | `src/services/extraction/incremental_extractor.py:87-95` — `__init__(self, session_id, entity_matching_engine, extraction_callback, cost_tracker=None, openai_client=None, max_context_chunks=3)` | Wrong kwargs: passes `redis_client` (not accepted), passes `event_callback` (real name is `extraction_callback`). Missing required `session_id` and `entity_matching_engine`. | Construct `EntityMatchingEngine` first (see §5). Call: `IncrementalExtractor(session_id=session_id, entity_matching_engine=engine, extraction_callback=on_extraction_update)`. |
| 4 | `EntityMatchingEngine` | NOT constructed anywhere in `streaming.py` | `src/services/entity_matching.py:75-83` — `__init__(self, embedding_fn, store=None, changelog_limit=10)` | Missing entirely. Required by `IncrementalExtractor`. `embedding_fn: Callable[[str], Awaitable[List[float]]]` (see `src/services/entity_matching.py:32`). | Build an async embedder closure and pass it. See §5. |
| 5 | `RAGValidationCoordinator` | `src/api/websocket/streaming.py:181-185` — `RAGValidationCoordinator(retriever_service=services.rag_retriever, redis_client=services.redis, event_callback=on_validation_event)` | `src/rag/validation_coordinator.py:115-120` — `__init__(self, retriever_service, redis_client, event_callback=None)` | None. Matches. | OK as-is. But `start()` is never called — see §3. |

### Extraction callback signature mismatch (separate from constructor)

`streaming.py:130` defines `on_extraction_update(entity_type, entity, speaker_id, timestamp)` (4 positional args).
`incremental_extractor.py:43` declares `ExtractionCallback = Callable[[ExtractionEvent], Awaitable[None]]` (1 arg, an `ExtractionEvent`). The extractor invokes it as `await self.extraction_callback(event)` at lines 297, 343, 381, 415.

Result: even after constructor fix, the callback raises `TypeError`. Fix: rewrite `on_extraction_update` to accept a single `ExtractionEvent` and unpack `event.entity_type`, `event.entity_data`, `event.timestamp`, `event.session_id`.

---

## 2. Pipeline wiring gaps

### Intended dataflow vs. actual

```
audio bytes
    │
    ▼
StreamProcessor.process_audio_chunk          [streaming.py:269]   ✅ called
    │  (emits TranscriptionChunk via transcription_callback)
    ▼
on_transcript_chunk                          [streaming.py:99]    ✅ defined
    │  → connection_manager.send_json(transcript_update)          ✅ sent
    │
    ├──❌ NOT called: IncrementalDiarizer.process_chunk(transcript_text, timestamp, session_id)
    │                 [incremental_diarizer.py:45]
    │
    └──❌ NOT called: IncrementalExtractor.process_transcript_chunk(transcript_text, timestamp, is_partial)
                      [incremental_extractor.py:116]

(extractor would then emit ExtractionEvent → on_extraction_update)
                          │
                          └──❌ NOT bridged to: RAGValidationCoordinator.enqueue_validation
                                              [validation_coordinator.py:540]
                                              or .on_entity_extracted
                                              [validation_coordinator.py:172]
```

### Concrete gaps (file:line of definitions that need to be wired in)

- `on_transcript_chunk` (`streaming.py:99-107`) only emits a WS frame. It does NOT call:
  - `diarizer.process_chunk(transcript_text=chunk.text, timestamp=chunk.start_time, session_id=session_id)` — defined `incremental_diarizer.py:45-51`.
  - `extractor.process_transcript_chunk(transcript_text=chunk.text, timestamp=chunk.start_time, is_partial=chunk.is_partial)` — defined `incremental_extractor.py:116-121`.
- `on_extraction_update` (`streaming.py:130-138`) only emits a WS frame. It does NOT call:
  - `validation_coordinator.enqueue_validation(entity_type, entity, session_id, timestamp)` — defined `validation_coordinator.py:540-552`. (Or `.on_entity_extracted(entity_type, entity_data, session_id)` — `validation_coordinator.py:172-182`.)
- The `process_audio_chunk` orchestrator at `streaming.py:251-296` receives `diarizer`, `extractor`, `validation_coordinator` but never calls them — only `stream_processor`.

### Field-name caveats for the wiring

- `TranscriptionChunk` (`stream_processor.py:42-49`) uses `start_time`/`end_time`/`is_partial`, NOT `timestamp`/`is_final`/`chunk_index`. The current `on_transcript_chunk` reads `text`, `is_final`, `timestamp`, `chunk_index` via `getattr(..., default)` — so it silently defaults to `False`/`0.0`/`0`. WS frame fields will all be wrong. Fix: read `chunk.start_time`, `not chunk.is_partial`.

---

## 3. Missing lifecycle calls

| Component | Lifecycle method (file:line) | Currently called? | Required? |
|---|---|---|---|
| `RAGValidationCoordinator.start()` | `validation_coordinator.py:136-155` | ❌ Never | YES — without it, `self.workers` is empty, queues fill but nothing drains. No validation events ever fire. |
| `RAGValidationCoordinator.stop()` | `validation_coordinator.py:157-170` | ❌ Never | YES on session end — workers leak across sessions otherwise. |
| `IncrementalDiarizer.finalize_session(session_id)` | `incremental_diarizer.py:221-247` | ✅ via `hasattr` shim at `streaming.py:329-332` | OK. |
| `StreamProcessor.finalize(session_id)` | NOT DEFINED on `StreamProcessor` (only `get_stats()` at `stream_processor.py:285`) | `streaming.py:323-326` calls `stream_processor.finalize(session_id)` guarded by `hasattr` — silently no-ops. | Either add `finalize` or replace call with `get_stats()`. |
| `StreamProcessor.start_session` | NOT DEFINED | N/A | Not needed; `session_id` is passed at construction. |
| `IncrementalExtractor.get_session_summary()` | `incremental_extractor.py:483-499` (sync, returns dict) | ✅ at `streaming.py:335-339` (handles sync vs async) | OK. |
| `RAGValidationCoordinator.get_session_summary(session_id)` | `validation_coordinator.py:505-538` | ✅ at `streaming.py:342-345` | OK. |

---

## 4. Event contract divergences

The Node gateway at `packages/backend/src/websocket/ai-session-gateway.ts:92-115` forwards Python frames **verbatim** to React (only persists asynchronously, never reshapes). Therefore "what Python sends" IS "what React parses". Conclusion: **all divergences below are real and break React parsing.**

Top-level shape for every event: React expects `{event: <name>, session_id, timestamp, data: {...}}` (`websocketEvents.ts:1-5`). Python sends `{type: <name>, ...flat fields}` everywhere. This alone breaks every event.

| Event | Python emits (file:line) | React expects (`websocketEvents.ts`) | Action |
|---|---|---|---|
| `transcript_update` | `streaming.py:101-107` — `{type, text, is_final, timestamp, chunk_index}` (no `session_id`, no `data`, no `language`, no `confidence`) | `:7-16` — `{event:'transcript_update', session_id, timestamp, data:{chunk_index, text, is_final, language, confidence}}` | Rename `type→event`, wrap fields under `data`, add `session_id`, `language`, `confidence`. Plus fix the source field names (see §2 caveat — `is_final` is currently always `False`). |
| `speaker_changed` | `streaming.py:116-123` — `{type, previous_speaker_id, new_speaker_id, new_speaker_role, confidence, timestamp}` | `:18-26` — `{event, session_id, timestamp, data:{speaker_id, role, confidence, start_time}}` | Rename `type→event`, wrap under `data`, rename `new_speaker_id→speaker_id`, `new_speaker_role→role`, `timestamp→start_time` (top-level `timestamp` becomes ISO from session). Drop `previous_speaker_id` (or move under `data`). |
| `extraction_update` | `streaming.py:132-138` — `{type, entity_type, entity, speaker_id, timestamp}` | `:36-50` — `{event, session_id, timestamp, data:{entity_type, entity:{id, content, confidence, speaker?, timestamp, metadata?}, chunk_index}}` | Rename/wrap. Reshape `entity` payload: `MedicationEntity`/`SymptomEntity` etc. expose `name`/`description`, not `content`; need a mapper to `{id, content, confidence, speaker, timestamp, metadata}`. Add `chunk_index`. Note React's `EntityType` enum is `'symptom'/'diagnosis'/'prescription'/'vital_sign'/'allergy'/'procedure'` (`:28-34`); Python's `EntityType` enum is in `extraction/models.py` and includes `MEDICATION`, `CHIEF_COMPLAINT` — values must be normalised. |
| `validation_alert` | `streaming.py:151-160` — `{type, alert_type, severity, medications, description, recommendation, timestamp, processing_time_ms}` | `:61-72` — `{event, session_id, timestamp, data:{alert_id, type, severity, message, related_entities, recommended_action?, requires_immediate_attention}}` | Rename/wrap. Fields differ entirely: need `alert_id` (UUID), rename `alert_type→type`, `description→message`, `medications→related_entities`, `recommendation→recommended_action`, add `requires_immediate_attention` (true if severity==CRITICAL). |
| `entity_validated` | `streaming.py:165-173` — `{type, entity_type, entity_name, validation_status, rag_confidence, warnings, timestamp}` | `:74-83` — `{event, session_id, timestamp, data:{entity_id, entity_type, validation_status, confidence_score, validation_notes?}}` | Rename/wrap. Need `entity_id` (Python sends `entity_name`). React enum `validation_status: 'approved'\|'flagged'\|'needs_review'`; Python sends raw enum value (whatever `_validate_medication` returns — currently no explicit `validation_status` field set in `validation_coordinator.py:396-405`). Map `rag_confidence→confidence_score`, `warnings→validation_notes`. |
| `cost_update` | `streaming.py:278-285` — `{type, transcription_cost_usd, extraction_cost_usd, validation_cost_usd, total_cost_usd, audio_duration_seconds}` | `:85-94` — `{event, session_id, timestamp, data:{transcription_cost_usd, extraction_cost_usd, total_cost_usd, chunks_processed, cache_hit_rate}}` | Rename/wrap. Drop `validation_cost_usd`, `audio_duration_seconds`. Add `chunks_processed`, `cache_hit_rate`. Also: source `cost_summary` comes from `_safe_call(stream_processor, "get_cost_summary")` but `StreamProcessor` only has `get_stats()` (`stream_processor.py:285`) — this returns `None` and the frame never fires. |
| `session_complete` | `streaming.py:224-227` — `{type, session_id, speaker_state, extraction, validation_summary}` | `:96-112` — `{event, session_id, timestamp, data:{status, final_transcript, total_chunks, total_entities, total_alerts, processing_time_ms, final_cost_summary:{...}}}` | Total reshape. Need to compute `final_transcript` (concat chunks), `total_chunks`, `total_entities`, `total_alerts`, `processing_time_ms`, and a real `final_cost_summary`. |
| `error` | `streaming.py:91-95`, `:243-246`, `:293-296` — `{type, message, error_code?}` | `:114-122` — `{event, session_id, timestamp, data:{error_code, message, details?, recoverable}}` | Rename/wrap, add `recoverable` (bool), include `error_code` consistently, optional `details`. |
| `connected` | `streaming.py:188-192` — `{type:'connected', session_id, message}` | NOT in React union (`:124-132`) | React's `ws.onmessage` `JSON.parse` succeeds, switch falls through silently. Either drop, or add to types. |
| `pong` | `streaming.py:231-234` — `{type:'pong', timestamp}` | NOT in React union | Same as above; harmless but undeclared. |

---

## 5. Required new construction

### EntityMatchingEngine (required by IncrementalExtractor)

Class: `src/services/entity_matching.py:69`. Constructor at line 75-83:

```python
def __init__(self, embedding_fn: EmbeddingFn, store: Optional[EntityStore] = None, changelog_limit: int = 10)
```

`EmbeddingFn` is `Callable[[str], Awaitable[List[float]]]` (`entity_matching.py:32`).

### Available concrete embedder

`src/rag/embeddings.py:17` — `EmbeddingsService`. The matching async signature is `EmbeddingsService.generate_query_embedding_async(query: str) -> list[float]` (`embeddings.py:72-91`).

`EmbeddingsService.__init__` at `embeddings.py:24` takes only an optional `cost_tracker`; it pulls keys from `settings`. So a minimal hookup is:

```python
embedder = EmbeddingsService()
async def embedding_fn(text: str) -> list[float]:
    return await embedder.generate_query_embedding_async(text)
matcher = EntityMatchingEngine(embedding_fn=embedding_fn)   # uses InMemoryEntityStore
```

Concerns:
- `InMemoryEntityStore` (`entity_matching.py:43`) is per-process. Multi-pod backends will lose cross-replica state. For MVP this is fine.
- `EmbeddingsService` opens an `OpenAI` client at construction and a global `AsyncOpenAI` client at `embeddings.py:25-26`. Should be a session-scoped singleton, not per-WebSocket. Consider hoisting into `Services` (`src/api/dependencies.py:20-22`). See §6.

---

## 6. Open questions for the user

1. **Cost tracker.** `StreamProcessor` (`stream_processor.py:115`) and `IncrementalExtractor` (`incremental_extractor.py:92`) both accept `cost_tracker=None`. A `CostTracker` exists at `src/services/cost_tracker.py`. Wire it in 27.2 or defer? Without it, `cost_update` frames have nothing meaningful to report.
2. **`get_cost_summary`.** `StreamProcessor` exposes `get_stats()` (`stream_processor.py:285`), not `get_cost_summary`. Should the WS handler call `get_stats()` directly, or should we add a new aggregate method that combines `StreamProcessor.get_stats()` + `IncrementalExtractor` token costs + `RAGValidationCoordinator`?
3. **Embedder lifecycle.** Should `EmbeddingsService` and `EntityMatchingEngine` be hoisted into `Services` (process singletons) or constructed per-WebSocket? Per-WS is wasteful but simpler; per-process means session leakage in `InMemoryEntityStore` keyed by `(session_id, type)` — actually safe.
4. **Diarizer-based speaker assignment for extractions.** Current `on_extraction_update` accepts `speaker_id` but the extractor's `ExtractionEvent` model has no `speaker_id` field (`extraction/models.py`). To fill React's `entity.speaker`, we'd need to query `diarizer.get_speaker_state()` at extraction time. Wire that, or leave `speaker` undefined?
5. **Validation severity → React alert mapping.** Python emits priority `CRITICAL`/`HIGH`/`MEDIUM` (`validation_coordinator.py:17-22`). React expects `severity: CRITICAL/HIGH/MEDIUM/LOW` AND `type: drug_interaction/allergy_conflict/dosage_error/contraindication/missing_info` (`websocketEvents.ts:52-59`). Confirm mapping (interaction→drug_interaction; medication validation warning→dosage_error or contraindication?).
6. **`finalize` on `StreamProcessor`.** `streaming.py:324` calls `stream_processor.finalize(session_id)` which doesn't exist. Add the method, or remove the call?
7. **`connected` / `pong` frames.** React's union doesn't include them. Drop server-side, add to TS types, or leave dead (silent fall-through)?
8. **Audio format.** `StreamProcessor.process_audio_chunk` defaults `format="opus"` (`stream_processor.py:136`). React sends `audio/webm;codecs=opus` chunks via MediaRecorder (`useRealtimeSession.ts:342`). pydub may need `format="webm"` here, not `"opus"`. Confirm before 27.2 or treat as separate bug.

---

## Summary — to make realtime work end-to-end, prompt 27.2 must do the following 9 things

1. Construct an `EntityMatchingEngine` per WS connection, backed by an async embedding closure over `EmbeddingsService.generate_query_embedding_async` (or inject a process-singleton from `Services`). Cite `entity_matching.py:75`, `embeddings.py:72`.
2. Fix the `IncrementalExtractor(...)` call at `streaming.py:140` to pass `session_id`, `entity_matching_engine`, and `extraction_callback` (rename from `event_callback`); drop `redis_client`. Cite `incremental_extractor.py:87`.
3. Rewrite `on_extraction_update` to accept a single `ExtractionEvent` (matching `incremental_extractor.py:43`) and re-derive the React-shaped payload from `event.entity_type`/`event.entity_data`/`event.timestamp`.
4. Wire the transcript callback (`streaming.py:99`) to also call `diarizer.process_chunk(...)` and `extractor.process_transcript_chunk(...)` with correct field names (`chunk.start_time`, `not chunk.is_partial`).
5. Wire the extraction callback to call `validation_coordinator.enqueue_validation(entity_type, entity_data, session_id, timestamp)`.
6. Call `await validation_coordinator.start()` after construction and `await validation_coordinator.stop()` in the `finally` block at `streaming.py:247`.
7. Reshape every outgoing `connection_manager.send_json` payload to `{event, session_id, timestamp, data:{...}}` per `websocketEvents.ts`. Apply field renames per §4 table for all 8 events; ensure `validation_alert` emits `alert_id`, `entity_validated` emits `entity_id`, `session_complete` emits `final_transcript`/totals/`final_cost_summary`, `error` emits `recoverable`.
8. Replace `_safe_call(stream_processor, "get_cost_summary")` (`streaming.py:276`) with a real cost aggregator, OR resolve open question §6.2 by calling `get_stats()` and synthesising the contract fields.
9. Resolve and apply the open questions in §6 (cost tracker injection, embedder placement, speaker stamping on extractions, severity mapping, `finalize` on StreamProcessor, audio format).
