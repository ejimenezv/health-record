"""WebSocket endpoint for real-time streaming consultations.

Pipeline: audio → StreamProcessor → transcript_callback → (diarizer + extractor)
                                                          ↓
                                              extraction_callback
                                                          ↓
                                          RAGValidationCoordinator.enqueue_validation
                                                          ↓
                                              validation event_callback → WS frame
"""
import io
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydub import AudioSegment

from src.api.dependencies import Services, get_services
from src.api.websocket.manager import connection_manager
from src.core.config import get_settings
from src.security.websocket_auth import verify_websocket_token
from src.services.entity_dedup import EntitySemanticDeduper
from src.services.entity_splitter import AtomicEntitySplitter
from src.services.entity_type_validator import EntityTypeValidator
from src.services.stream_processor import SileroVAD
from src.transcription.hallucination_filter import HallucinationFilter

_settings = get_settings()
# Send to Whisper once we have at least this many new ms of audio. Matches
# StreamProcessor.VOICE_CHUNK_INTERVAL_MS so users see updates every ~5 s.
_WHISPER_SLICE_MS = 5000
# Backward audio overlap with the previous slice. Whisper sees the boundary
# word in full context; we drop segments whose end is inside this overlap
# (already emitted last time). Prevents the "paraceta..." sliced-word issue.
_WHISPER_OVERLAP_MS = 1500
# If VAD doesn't detect at least this much speech probability anywhere in
# the slice, we skip the Whisper API call entirely. Whisper hallucinates
# on silence; the cleanest defense is to never feed it silence.
_VAD_SPEECH_PROB_THRESHOLD = 0.5

# Process-level singleton: one Silero VAD model shared across sessions.
# Loaded lazily on first use; warmed at FastAPI startup (see api/main.py).
_VAD_SINGLETON: Optional[SileroVAD] = None


def _get_vad() -> SileroVAD:
    global _VAD_SINGLETON
    if _VAD_SINGLETON is None:
        _VAD_SINGLETON = SileroVAD(sample_rate=16000)
    return _VAD_SINGLETON

logger = structlog.get_logger()
router = APIRouter()


# Why: React's EntityType union (websocketEvents.ts) is narrower than the Python
# extractor's enum. Map Python values to the React-allowed strings; unmapped
# types fall back to 'symptom' so the frame still parses.
_PY_TO_REACT_ENTITY_TYPE = {
    "medication": "prescription",
    "symptom": "symptom",
    "diagnosis": "diagnosis",
    "procedure": "procedure",
    "vital_sign": "vital_sign",
    "allergy": "allergy",
    "chief_complaint": "symptom",
}


# Per-type content sanity rules. These catch obvious extractor
# misclassifications (e.g., "diagnóstico de resfriado común" coming back
# in the symptoms array). Lowercased substring match against the
# normalized content; any hit on a forbidden phrase drops the entity for
# THAT type. The extractor's prompt is the primary defense; this is a
# belt-and-braces safety net so a single prompt regression can't
# poison the medical record.
_FORBIDDEN_PREFIXES_BY_TYPE: Dict[str, tuple] = {
    "symptom": (
        "diagnóstico de", "diagnostico de", "diagnóstico:", "diagnostico:",
        "se le diagnostica", "se diagnostica", "se sospecha",
        "se le receta", "se le prescribe", "se receta", "se prescribe",
        "el médico", "la doctora", "el doctor", "tratamiento",
    ),
    "chief_complaint": (
        "diagnóstico de", "diagnostico de",
        "se le receta", "se le prescribe",
    ),
    "diagnosis": (
        "se le receta", "se le prescribe", "tomar ",
    ),
    "medication": (
        "diagnóstico de", "diagnostico de",
        "el paciente presenta", "se queja de",
    ),
}


def _violates_type(entity_type: str, norm_content: str) -> Optional[str]:
    """If the content's prefix is forbidden for this type, return the offending prefix."""
    forbidden = _FORBIDDEN_PREFIXES_BY_TYPE.get(entity_type, ())
    for marker in forbidden:
        if norm_content.startswith(marker) or f" {marker}" in norm_content:
            return marker
    return None


def _normalise_for_overlap(text: str) -> list[str]:
    """Lowercase, strip surrounding punctuation per token, split on whitespace."""
    import re as _re

    cleaned = _re.sub(r"\s+", " ", text.lower()).strip()
    tokens: list[str] = []
    for tok in cleaned.split(" "):
        t = tok.strip(" .,!¡?¿…\"'()[]:;")
        if t:
            tokens.append(t)
    return tokens


def _strip_overlap_text(new_text: str, last_emitted: str, max_words: int = 10) -> str:
    """Strip the longest prefix of ``new_text`` that matches the suffix of ``last_emitted``.

    Catches the case where the audio overlap leaks a few words into the
    new transcript that were already shown in the prior emission. Word
    comparison is case-insensitive and ignores surrounding punctuation,
    so "miligramos." vs "miligramos" matches.

    If no match is found, returns ``new_text`` unchanged.
    """
    if not new_text or not last_emitted:
        return new_text
    last_norm = _normalise_for_overlap(last_emitted)
    new_norm = _normalise_for_overlap(new_text)
    if not last_norm or not new_norm:
        return new_text

    k_max = min(max_words, len(last_norm), len(new_norm))
    best_k = 0
    for k in range(k_max, 0, -1):
        if last_norm[-k:] == new_norm[:k]:
            best_k = k
            break

    if best_k == 0:
        return new_text

    # Strip the first best_k tokens from the ORIGINAL new_text (so we
    # preserve casing/punctuation of the remaining content). Walk
    # whitespace-separated words; the original whitespace structure may
    # not perfectly match the normalised token boundaries, so we walk
    # word-by-word and drop the first best_k words.
    parts = new_text.split(maxsplit=best_k)
    if len(parts) <= best_k:
        return ""
    return parts[best_k].lstrip(" .,!¡?¿…\"'()[]:;")


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_event(event_name: str, session_id: str, **data: Any) -> Dict[str, Any]:
    """Build a WS frame matching packages/frontend/src/types/websocketEvents.ts."""
    return {
        "event": event_name,
        "session_id": session_id,
        "timestamp": _iso_now(),
        "data": data,
    }


def _normalize_entity_payload(entity_type_py: str, entity_data: Dict[str, Any]) -> Dict[str, Any]:
    """Map Python extractor entity dicts to React's `entity` shape."""
    entity_id = entity_data.get("id") or f"ent_{uuid.uuid4().hex[:12]}"

    if entity_type_py == "medication":
        content = entity_data.get("name", "")
    elif entity_type_py == "chief_complaint":
        content = entity_data.get("complaint", "")
    else:
        content = entity_data.get("description") or entity_data.get("name", "")

    metadata = {
        k: v
        for k, v in entity_data.items()
        if k not in {"id", "name", "description", "complaint", "confidence", "timestamp"}
        and v is not None
    }

    return {
        "id": entity_id,
        "content": content,
        "confidence": float(entity_data.get("confidence", 0.0) or 0.0),
        "timestamp": float(entity_data.get("timestamp", 0.0) or 0.0),
        "metadata": metadata or None,
    }


def _severity_to_react(priority_value: str) -> str:
    mapping = {"critical": "CRITICAL", "high": "HIGH", "medium": "MEDIUM", "low": "LOW"}
    return mapping.get(priority_value.lower(), "MEDIUM")


def _alert_type_for(event_type: str, data: Dict[str, Any]) -> str:
    """Map a validation event_type to React's AlertType union."""
    if event_type == "interaction_alert":
        return "drug_interaction"
    warnings = data.get("warnings") or []
    joined = " ".join(warnings).lower()
    if "dosis" in joined or "dosage" in joined:
        return "dosage_error"
    if "contraindica" in joined:
        return "contraindication"
    if "alerg" in joined:
        return "allergy_conflict"
    return "missing_info"


@router.websocket("/ws/session")
async def websocket_streaming(
    websocket: WebSocket,
    session_id: str = Query(..., description="Session ID from POST /api/v1/sessions"),
    token: str = Query(..., description="JWT authentication token"),
    services: Services = Depends(get_services),
):
    try:
        user_data = await verify_websocket_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    connected = await connection_manager.connect(
        websocket=websocket,
        session_id=session_id,
        user_id=user_data.user_id,
    )
    if not connected:
        await websocket.close(code=4002, reason="Session already active")
        return

    try:
        from src.services.entity_matching import EntityMatchingEngine
        from src.services.extraction.incremental_extractor import IncrementalExtractor
        from src.services.extraction.models import ExtractionEvent
        from src.rag.validation_coordinator import RAGValidationCoordinator
        from src.transcription.diarization.incremental_diarizer import IncrementalDiarizer
        if _settings.diarizer_kind == "audio":
            from src.transcription.diarization.audio_feature_diarizer import (
                AudioFeatureDiarizer,
            )
    except ImportError as e:
        logger.error("Pipeline services not available", error=str(e))
        await connection_manager.send_json(
            session_id,
            make_event(
                "error",
                session_id,
                error_code="PIPELINE_NOT_READY",
                message="Pipeline services not available. Contact support.",
                recoverable=False,
            ),
        )
        await connection_manager.disconnect(session_id)
        return

    session_started_at = time.time()
    chunks_processed = 0
    transcript_parts: list[str] = []
    total_entities = 0
    total_alerts = 0
    # Why: MediaRecorder emits webm/opus chunks where ONLY the first chunk
    # carries the EBML/Segment/Tracks init header. Subsequent chunks contain
    # raw clusters that ffmpeg cannot decode standalone. We cache the first
    # chunk and prepend it to every later chunk so the stream stays decodable.
    # MediaRecorder webm/opus is a continuous stream where only the first
    # chunk has the EBML/Tracks header. Accumulate ALL bytes per session and
    # decode the full buffer each tick. We then slice off only the new
    # milliseconds since last Whisper call and send THAT as a self-contained
    # WAV. This avoids feeding Whisper growing audio (which yields cumulative
    # text and rising latency).
    session_audio: bytearray = bytearray()
    last_processed_ms: int = 0
    initial_speaker_emitted: bool = False
    # The last text we emitted in a transcript_update frame. Used to strip
    # boundary-word duplicates when the audio overlap leaks repeated words
    # into the next slice (segment-level dedup catches most of it; this is
    # a safety net for words inside a segment that straddles the boundary).
    last_emitted_text: str = ""
    # Why: the extractor re-runs on every new transcript slice and also
    # returns compound entities ("fiebre y dolor de cabeza") alongside the
    # atomic ones it already returned ("fiebre", "dolor de cabeza"). We
    # dedupe by per-type containment: if a new content is a substring or
    # superstring of an existing one, treat as a duplicate. Catches both
    # straight repeats AND compound/atomic overlaps.
    seen_entities: dict[str, list[str]] = {}

    hallucination_filter = HallucinationFilter()
    semantic_deduper = EntitySemanticDeduper(embeddings=services.embeddings)
    atomic_splitter = AtomicEntitySplitter()
    type_validator = EntityTypeValidator()

    embedder = services.embeddings

    async def embedding_fn(text: str) -> list[float]:
        return await embedder.generate_query_embedding_async(text)

    matcher = EntityMatchingEngine(embedding_fn=embedding_fn)

    async def on_transcript_chunk(chunk):
        nonlocal chunks_processed, initial_speaker_emitted, last_emitted_text

        delta = (getattr(chunk, "text", "") or "").strip()
        is_partial = getattr(chunk, "is_partial", True)
        is_final = not is_partial
        start_time = float(getattr(chunk, "start_time", 0.0) or 0.0)
        confidence = float(getattr(chunk, "confidence", 0.0) or 0.0)

        if not delta:
            return

        # Text-level boundary dedup. The segment-level dedup in
        # _slice_and_transcribe handles most overlap, but words inside a
        # segment that straddles the overlap line still leak through.
        # Strip any prefix of the new text that matches the suffix of
        # the last emission ("...miligramos." then "miligramos y jarabe"
        # → "y jarabe").
        stripped = _strip_overlap_text(delta, last_emitted_text)
        if stripped != delta:
            logger.info(
                "Stripped boundary overlap",
                session_id=session_id,
                before_chars=len(delta),
                after_chars=len(stripped),
            )
        if not stripped:
            return
        delta = stripped
        last_emitted_text = (last_emitted_text + " " + delta).strip()[-500:]

        chunk_index = chunks_processed
        chunks_processed += 1
        transcript_parts.append(delta)

        await connection_manager.send_json(
            session_id,
            make_event(
                "transcript_update",
                session_id,
                chunk_index=chunk_index,
                text=delta,
                is_final=is_final,
                language="es",
                confidence=confidence,
            ),
        )

        try:
            audio_samples = getattr(chunk, "audio_samples", None)
            # AudioFeatureDiarizer accepts the kwarg; the legacy keyword
            # diarizer doesn't, so route accordingly.
            from src.transcription.diarization.audio_feature_diarizer import (
                AudioFeatureDiarizer,
            )
            if isinstance(diarizer, AudioFeatureDiarizer):
                await diarizer.process_chunk(
                    transcript_text=delta,
                    timestamp=start_time,
                    session_id=session_id,
                    audio_samples=audio_samples,
                )
            else:
                await diarizer.process_chunk(
                    transcript_text=delta,
                    timestamp=start_time,
                    session_id=session_id,
                )
        except Exception:
            logger.exception("diarizer.process_chunk failed", session_id=session_id)
            await _emit_error(session_id, "DIARIZATION_FAILED", "Error en diarización", recoverable=True)

        # Why: keyword diarizer only fires speaker_changed on transitions, so
        # a fresh session never emits one. Seed the UI with the current state
        # after the first chunk so "Hablante Actual" doesn't stay empty.
        if not initial_speaker_emitted:
            initial_speaker_emitted = True
            try:
                state = await diarizer.get_speaker_state(session_id)
                if state is not None:
                    sid = state.current_speaker_id
                    spk = state.speakers.get(sid)
                    role = spk.role.value if spk and hasattr(spk.role, "value") else "UNKNOWN"
                    conf = float(spk.confidence) if spk else 0.0
                    await connection_manager.send_json(
                        session_id,
                        make_event(
                            "speaker_changed",
                            session_id,
                            speaker_id=sid,
                            role=str(role).upper(),
                            confidence=conf,
                            start_time=start_time,
                        ),
                    )
            except Exception:
                logger.exception("seed speaker_changed failed", session_id=session_id)

        try:
            await extractor.process_transcript_chunk(
                transcript_text=delta,
                timestamp=start_time,
                is_partial=is_partial,
            )
        except Exception:
            logger.exception("extractor.process_transcript_chunk failed", session_id=session_id)
            await _emit_error(session_id, "EXTRACTION_FAILED", "Error en extracción", recoverable=True)

    async def on_speaker_change(event):
        role = getattr(event, "new_speaker_role", None)
        role_value = role.value if hasattr(role, "value") else (role or "UNKNOWN")
        await connection_manager.send_json(
            session_id,
            make_event(
                "speaker_changed",
                session_id,
                speaker_id=getattr(event, "new_speaker_id", "") or "",
                role=str(role_value).upper(),
                confidence=float(getattr(event, "confidence", 0.0) or 0.0),
                start_time=float(getattr(event, "timestamp", 0.0) or 0.0),
            ),
        )

    async def on_extraction_update(event: "ExtractionEvent"):
        nonlocal total_entities
        entity_type_py = event.entity_type.value if hasattr(event.entity_type, "value") else str(event.entity_type)
        react_type = _PY_TO_REACT_ENTITY_TYPE.get(entity_type_py, "symptom")
        entity_payload = _normalize_entity_payload(entity_type_py, event.entity_data)

        import re as _re
        raw_content = (entity_payload.get("content") or "").strip()
        if not raw_content:
            return

        # Layer 0: split compound phrases ("fiebre y dolor de cabeza")
        # into atomics BEFORE dedup. Compounds + their atomics arriving in
        # any order would otherwise both end up in the append-only UI.
        # Heuristic short-circuits non-compound input (no LLM call).
        atomics = await atomic_splitter.split(raw_content, entity_type_py)
        if not atomics:
            return

        # Resolve speaker once per event (not per atomic).
        speaker_id: Optional[str] = None
        try:
            state = await diarizer.get_speaker_state(session_id)
            if state is not None:
                speaker_id = getattr(state, "current_speaker_id", None)
        except Exception:
            speaker_id = None

        for atomic_text in atomics:
            norm = _re.sub(r"\s+", " ", atomic_text.lower()).strip(" .,!¡?¿…\"'")
            if not norm:
                continue

            # Type sanity check: drop entities whose content clearly
            # belongs to a different type (e.g., "diagnóstico de X"
            # showing up under symptoms).
            offending = _violates_type(entity_type_py, norm)
            if offending:
                logger.info(
                    "Dropped type-mismatched entity",
                    session_id=session_id,
                    type=entity_type_py,
                    content=norm,
                    offending_prefix=offending,
                )
                continue

            # LLM type validator: catches bare misclassifications the
            # forbidden-prefix heuristic can't see (e.g., "resfriado
            # común" classified as symptom). If the LLM is confident the
            # type is wrong, reclassify into the suggested bucket and
            # re-run downstream dedup. If the LLM has no confident
            # alternative, drop the entity to keep the medical record
            # clean.
            effective_type = entity_type_py
            effective_react_type = react_type
            try:
                v = await type_validator.validate(norm, entity_type_py)
            except Exception:
                logger.exception("Type validator raised", session_id=session_id)
                v = None
            # Per-direction confidence threshold. Reclassifying TO a
            # medication is lower-risk because the medical record correctly
            # records what was prescribed; the extractor frequently miscategorizes
            # brand names (Tempra, Tylenol, ...) as symptoms, and the LLM may
            # only be 0.6-0.7 confident those are drugs. Other reclassifications
            # (e.g. symptom → diagnosis) keep the stricter 0.7 threshold to
            # avoid noisy promotions of common symptoms into bogus diagnoses.
            if v is not None and not v.is_correct:
                threshold = 0.6 if v.suggested_type == "medication" else 0.7
                if v.confidence >= threshold:
                    if v.suggested_type and v.suggested_type in _PY_TO_REACT_ENTITY_TYPE:
                        logger.info(
                            "Reclassified entity",
                            session_id=session_id,
                            content=norm,
                            from_type=entity_type_py,
                            to_type=v.suggested_type,
                            confidence=round(v.confidence, 3),
                            threshold=threshold,
                        )
                        effective_type = v.suggested_type
                        effective_react_type = _PY_TO_REACT_ENTITY_TYPE[v.suggested_type]
                    else:
                        logger.info(
                            "Dropped misclassified entity (no usable alternative)",
                            session_id=session_id,
                            content=norm,
                            from_type=entity_type_py,
                            confidence=round(v.confidence, 3),
                        )
                        continue

            existing = seen_entities.setdefault(effective_type, [])
            already = False
            for prior in existing:
                if norm == prior:
                    logger.info("Dropped duplicate entity (exact)", session_id=session_id, content=norm, type=effective_type)
                    already = True
                    break
                if prior in norm and prior != norm:
                    logger.info("Dropped compound entity (atomic exists)", session_id=session_id, content=norm, atomic=prior, type=effective_type)
                    already = True
                    break
            if already:
                continue

            # Semantic dedup via OpenAI embeddings. Catches synonyms.
            decision = await semantic_deduper.check_and_remember(effective_type, norm)
            if decision.is_duplicate:
                logger.info(
                    "Dropped semantic duplicate",
                    session_id=session_id,
                    content=norm,
                    matched=decision.matched_text,
                    similarity=round(decision.similarity, 3),
                    method=decision.method,
                    type=effective_type,
                )
                continue

            existing.append(norm)
            total_entities += 1
            logger.info(
                "Emitted entity",
                session_id=session_id,
                content=norm,
                type=effective_type,
                from_split=len(atomics) > 1,
                reclassified=(effective_type != entity_type_py),
                similarity_to_nearest=round(decision.similarity, 3),
                nearest=decision.matched_text,
            )

            # Build a per-atomic payload. Override content so the UI
            # shows the atomic, not the compound. Keep the rest as-is.
            atomic_payload = dict(entity_payload)
            atomic_payload["content"] = atomic_text
            atomic_payload["id"] = f"ent_{uuid.uuid4().hex[:12]}"
            if speaker_id:
                atomic_payload["speaker"] = speaker_id

            await connection_manager.send_json(
                session_id,
                make_event(
                    "extraction_update",
                    session_id,
                    entity_type=effective_react_type,
                    entity=atomic_payload,
                    chunk_index=max(chunks_processed - 1, 0),
                ),
            )

            try:
                # Validation coordinator gets the original entity_data so
                # downstream RAG checks see the same shape it always has.
                await validation_coordinator.enqueue_validation(
                    entity_type=entity_type_py,
                    entity=event.entity_data,
                    session_id=session_id,
                    timestamp=event.timestamp,
                )
            except Exception:
                logger.exception("validation_coordinator.enqueue_validation failed", session_id=session_id)
                await _emit_error(session_id, "VALIDATION_ENQUEUE_FAILED", "Error encolando validación", recoverable=True)

    async def on_validation_event(event):
        nonlocal total_alerts
        priority_value = event.priority.value if hasattr(event.priority, "value") else str(event.priority)
        event_type = getattr(event, "type", "")
        data = event.data if hasattr(event, "data") else {}

        if event_type == "interaction_alert" or priority_value.lower() == "critical":
            total_alerts += 1
            severity = _severity_to_react(priority_value)
            related = []
            for k in ("medication_a_id", "medication_b_id"):
                v = data.get(k)
                if v:
                    related.append(str(v))
            await connection_manager.send_json(
                session_id,
                make_event(
                    "validation_alert",
                    session_id,
                    alert_id=str(uuid.uuid4()),
                    type=_alert_type_for(event_type, data),
                    severity=severity,
                    message=data.get("description") or data.get("recommendation") or "Alerta de validación",
                    related_entities=related,
                    recommended_action=data.get("recommendation"),
                    requires_immediate_attention=(severity == "CRITICAL"),
                ),
            )
        elif event_type == "medication_validated":
            warnings = data.get("warnings") or []
            status = "approved" if data.get("is_valid") and not warnings else (
                "flagged" if warnings else "needs_review"
            )
            await connection_manager.send_json(
                session_id,
                make_event(
                    "entity_validated",
                    session_id,
                    entity_id=str(data.get("medication_id") or ""),
                    entity_type="prescription",
                    validation_status=status,
                    confidence_score=float(data.get("rag_confidence", 0.0) or 0.0),
                    validation_notes="; ".join(warnings) if warnings else None,
                ),
            )
        elif event_type == "cie10_suggested":
            suggestions = data.get("suggestions") or []
            top_conf = float(suggestions[0]["confidence"]) if suggestions else 0.0
            notes = ", ".join(f"{s['code']}: {s.get('description','')}" for s in suggestions[:3]) or None
            await connection_manager.send_json(
                session_id,
                make_event(
                    "entity_validated",
                    session_id,
                    entity_id=str(data.get("symptom_id") or ""),
                    entity_type="symptom",
                    validation_status="needs_review",
                    confidence_score=top_conf,
                    validation_notes=notes,
                ),
            )

    async def _emit_error(sid: str, code: str, message: str, recoverable: bool, details: Optional[dict] = None):
        payload: Dict[str, Any] = {
            "error_code": code,
            "message": message,
            "recoverable": recoverable,
        }
        if details:
            payload["details"] = details
        await connection_manager.send_json(sid, make_event("error", sid, **payload))

    # NOTE: StreamProcessor is no longer used for the audio path; the WS
    # handler decodes the cumulative webm itself and calls Whisper directly
    # in _slice_and_transcribe. Left here only as a marker if cost tracking
    # is wired in later.
    if _settings.diarizer_kind == "audio":
        diarizer = AudioFeatureDiarizer(
            redis_client=services.redis,
            event_callback=on_speaker_change,
            same_speaker_threshold=_settings.diarizer_same_speaker_threshold,
            max_speakers=_settings.diarizer_max_speakers,
        )
    else:
        diarizer = IncrementalDiarizer(
            redis_client=services.redis,
            event_callback=on_speaker_change,
        )
    extractor = IncrementalExtractor(
        session_id=session_id,
        entity_matching_engine=matcher,
        extraction_callback=on_extraction_update,
    )
    validation_coordinator = RAGValidationCoordinator(
        retriever_service=services.rag_retriever,
        redis_client=services.redis,
        event_callback=on_validation_event,
    )

    coordinator_started = False
    try:
        await validation_coordinator.start()
        coordinator_started = True

        while True:
            message = await websocket.receive()

            if "bytes" in message:
                session_audio.extend(message["bytes"])
                last_processed_ms = await _slice_and_transcribe(
                    session_id=session_id,
                    session_audio=session_audio,
                    last_processed_ms=last_processed_ms,
                    transcription_callback=on_transcript_chunk,
                    hallucination_filter=hallucination_filter,
                )

            elif "text" in message:
                try:
                    control = json.loads(message["text"])
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON message", session_id=session_id)
                    continue

                msg_type = control.get("type")
                if msg_type == "finalize":
                    # Flush any audio that hadn't reached the 5 s slice
                    # threshold (e.g. user said "se le receta paracetamol"
                    # 2 s before clicking Finalizar — would otherwise be
                    # lost). _slice_and_transcribe awaits the transcription
                    # callback which awaits the extractor's gather() — so
                    # by the time it returns, all extraction_update events
                    # for the tail have already been emitted to React.
                    last_processed_ms = await _slice_and_transcribe(
                        session_id=session_id,
                        session_audio=session_audio,
                        last_processed_ms=last_processed_ms,
                        transcription_callback=on_transcript_chunk,
                        hallucination_filter=hallucination_filter,
                        min_ms=0,
                        is_final=True,
                    )
                    # Drain the RAG validation pipeline. The extractor
                    # enqueued validation tasks during its gather above;
                    # workers are processing them in the background. If
                    # we emit session_complete now, the React side fires
                    # its REST finalize which terminates the upstream
                    # session — and any in-flight validation_alert /
                    # entity_validated events get lost. Wait for queues
                    # to empty AND for in-flight workers to finish.
                    await _drain_validation(validation_coordinator, max_seconds=12.0)
                    await _finalize_and_emit(
                        session_id=session_id,
                        session_started_at=session_started_at,
                        chunks_processed=chunks_processed,
                        transcript_parts=transcript_parts,
                        total_entities=total_entities,
                        total_alerts=total_alerts,
                        audio_duration_seconds=last_processed_ms / 1000.0,
                        diarizer=diarizer,
                        extractor=extractor,
                        validation_coordinator=validation_coordinator,
                    )
                    break
                elif msg_type == "flush_pending":
                    # Client paused (not finalized). Transcribe whatever
                    # audio sits in the buffer past the last 5 s slice
                    # boundary so the user sees their final words. We
                    # use min_ms=0 + is_final=True so the existing tail-
                    # quality guard applies (drop sub-500 ms tails) and
                    # Whisper sees the maximum context the overlap allows.
                    last_processed_ms = await _slice_and_transcribe(
                        session_id=session_id,
                        session_audio=session_audio,
                        last_processed_ms=last_processed_ms,
                        transcription_callback=on_transcript_chunk,
                        hallucination_filter=hallucination_filter,
                        min_ms=0,
                        is_final=True,
                    )
                    logger.info(
                        "Pending tail flushed (pause)",
                        session_id=session_id,
                        watermark_ms=last_processed_ms,
                    )
                elif msg_type == "reset_audio_buffer":
                    # Client is resuming with a NEW MediaRecorder. Its
                    # first chunk has a fresh EBML/Tracks header that
                    # would not concatenate cleanly with the prior
                    # recorder's bytes. Drop the buffer and the watermark;
                    # the next bytes message starts a fresh webm stream.
                    # Already-emitted transcript fragments and entities
                    # stay. Note: the client should send flush_pending
                    # BEFORE this message (on the prior pause click) so
                    # the tail isn't lost.
                    session_audio.clear()
                    last_processed_ms = 0
                    last_emitted_text = ""
                    logger.info(
                        "Audio buffer reset by client (resume)",
                        session_id=session_id,
                    )
                elif msg_type == "ping":
                    pass

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client", session_id=session_id)
    except Exception:
        logger.exception("WebSocket error", session_id=session_id)
        try:
            await _emit_error(session_id, "INTERNAL_ERROR", "Error interno del servidor", recoverable=False)
        except Exception:
            pass
    finally:
        if coordinator_started:
            try:
                await validation_coordinator.stop()
            except Exception:
                logger.exception("validation_coordinator.stop failed", session_id=session_id)
        await connection_manager.disconnect(session_id)


async def _drain_validation(coordinator, *, max_seconds: float = 12.0) -> None:
    """Wait for the validation coordinator's queues to drain, then give a
    grace window for in-flight workers to finish.

    Why this is needed instead of a hard sleep: the validation pipeline
    runs LLM/RAG calls per task and per priority can take up to its
    LATENCY_TARGET (1-3 s). With multiple meds in a session, the queue
    can hold several seconds of work. If finalize ships ``session_complete``
    before the pipeline drains, the React client kicks off its REST
    finalize, the backend issues DELETE upstream, and any
    ``validation_alert`` / ``entity_validated`` events still in flight
    are dropped on the floor.

    Workers in this codebase don't call ``Queue.task_done`` so we can't
    use ``Queue.join``. Instead we poll ``qsize`` until all queues are
    empty, then sleep one extra worker-cycle so any task that was just
    dequeued has time to finish processing and emit its WS frame.
    """
    import asyncio as _aio
    import time as _time

    deadline = _time.monotonic() + max_seconds
    poll_interval = 0.1
    queues = list(getattr(coordinator, "task_queues", {}).values())
    if not queues:
        return

    # Phase 1: wait for queues to empty.
    while _time.monotonic() < deadline:
        if all(q.qsize() == 0 for q in queues):
            break
        await _aio.sleep(poll_interval)

    # Phase 2: workers may have just dequeued the last task — give them
    # a final window to finish processing and emit. Cap by remaining
    # budget so we don't exceed max_seconds total.
    remaining = max(0.0, deadline - _time.monotonic())
    grace = min(3.5, remaining)
    if grace > 0:
        await _aio.sleep(grace)

    final_qsizes = [q.qsize() for q in queues]
    if any(s > 0 for s in final_qsizes):
        logger.warning(
            "Validation drain timed out with non-empty queues",
            qsizes=final_qsizes,
            max_seconds=max_seconds,
        )


async def _slice_and_transcribe(
    *,
    session_id: str,
    session_audio: bytearray,
    last_processed_ms: int,
    transcription_callback,
    hallucination_filter: HallucinationFilter,
    min_ms: int = _WHISPER_SLICE_MS,
    is_final: bool = False,
    overlap_ms: int = _WHISPER_OVERLAP_MS,
) -> int:
    """Decode the cumulative session webm, slice off new audio (with backward
    overlap), send to Whisper, dedup segments via Whisper's own timestamps.

    Returns the new last_processed_ms watermark.

    The overlap (default 1500 ms backward) is the key trick: Whisper sees
    the boundary word with full context, so a word that would have been
    sliced mid-utterance is now transcribed correctly. We then keep only
    Whisper segments whose END timestamp is past the overlap mark — the
    rest was already emitted in the prior slice.

    Defense layers (in order):
      1. Hard floor: drop tails < 500 ms (unsalvageable, no info to keep).
      2. Silero VAD pre-check — skip Whisper call if no voice anywhere.
      3. Whisper API call with verbose_json (returns segment timestamps).
      4. Segment-level overlap dedup — drop segments inside overlap.
      5. HallucinationFilter — pattern, repetition, confidence, dedup.
    """
    try:
        full_audio = AudioSegment.from_file(io.BytesIO(bytes(session_audio)), format="webm")
    except Exception:
        return last_processed_ms

    current_ms = len(full_audio)
    new_ms = current_ms - last_processed_ms
    if new_ms < max(min_ms, 100):
        return last_processed_ms

    # Hard floor: a tail under 500 ms can't usefully be transcribed even
    # with overlap context (it's typically just trailing silence after
    # the user stopped). Above this floor, the overlap context lets
    # Whisper transcribe the trailing speech accurately.
    if is_final and new_ms < 500:
        logger.info(
            "Dropped final tail (under 500ms floor)",
            session_id=session_id,
            duration_ms=new_ms,
        )
        return current_ms

    # Backward overlap. Don't overlap before time 0 (first slice).
    slice_start_ms = max(0, last_processed_ms - overlap_ms)
    actual_overlap_ms = last_processed_ms - slice_start_ms
    overlap_sec = actual_overlap_ms / 1000.0

    audio_to_send = full_audio[slice_start_ms:current_ms].set_frame_rate(16000).set_channels(1)
    new_last = current_ms

    import numpy as np

    # Layer 2: VAD pre-check. Whisper hallucinates worst on silence; the
    # cheapest and most effective defense is to never call it on silence.
    try:
        samples = np.array(audio_to_send.get_array_of_samples()).astype(np.float32) / (2 ** 15)
        voice_detected, prob = _get_vad().detect_voice_activity(samples)
        if not voice_detected:
            logger.info(
                "Skipped silent slice (VAD)",
                session_id=session_id,
                duration_ms=new_ms,
                speech_prob=round(prob, 3),
            )
            return new_last
    except Exception:
        logger.exception("VAD pre-check failed, falling through", session_id=session_id)

    wav_buf = io.BytesIO()
    audio_to_send.export(wav_buf, format="wav")
    wav_buf.seek(0)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=_settings.openai_api_key)
        response = await client.audio.transcriptions.create(
            model=_settings.whisper_model,
            file=("slice.wav", wav_buf, "audio/wav"),
            language=_settings.whisper_language,
            response_format="verbose_json",
        )
    except Exception:
        logger.exception("Whisper transcription failed", session_id=session_id)
        await connection_manager.send_json(
            session_id,
            make_event(
                "error",
                session_id,
                error_code="AUDIO_PROCESSING_FAILED",
                message="Error procesando audio",
                recoverable=True,
            ),
        )
        return new_last

    full_text = (getattr(response, "text", "") or "").strip()
    raw_segments = getattr(response, "segments", None) or []

    # Layer 4: keep only segments whose END is past the overlap mark.
    # Anything entirely inside the overlap region was already emitted in
    # the prior slice's transcript_update. A boundary segment that
    # straddles the line stays — its corrected (now-fully-contextualized)
    # text is preferable to the sliced-word version.
    new_text = full_text
    if overlap_sec > 0 and raw_segments:
        kept_texts: list[str] = []
        for seg in raw_segments:
            seg_end = (
                seg.get("end") if isinstance(seg, dict) else getattr(seg, "end", None)
            )
            seg_text = (
                seg.get("text") if isinstance(seg, dict) else getattr(seg, "text", "")
            )
            if seg_end is None or seg_text is None:
                continue
            if float(seg_end) > overlap_sec:
                kept_texts.append(str(seg_text).strip())
        new_text = " ".join(t for t in kept_texts if t).strip()
        logger.info(
            "Overlap dedup",
            session_id=session_id,
            overlap_ms=actual_overlap_ms,
            segments_total=len(raw_segments),
            segments_kept=len(kept_texts),
            full_text_chars=len(full_text),
            new_text_chars=len(new_text),
        )

    # Hallucination filter sees the (post-dedup) new text, but we pass the
    # full segments list so its confidence checks see the whole slice.
    decision = hallucination_filter.check(new_text, segments=raw_segments)
    if decision.is_hallucination:
        logger.info(
            "Dropped Whisper hallucination",
            session_id=session_id,
            text=new_text,
            reason=decision.reason,
        )
        return new_last

    if not new_text:
        return new_last

    from src.services.stream_processor import TranscriptionChunk

    # Pass only the NEW audio (post-overlap) so the diarizer's speaker
    # embedding represents the current slice, not the prior one too.
    try:
        new_only_segment = full_audio[last_processed_ms:current_ms].set_frame_rate(16000).set_channels(1)
        new_only_samples = (
            np.array(new_only_segment.get_array_of_samples()).astype(np.float32)
            / (2 ** 15)
        )
    except Exception:
        new_only_samples = None

    chunk = TranscriptionChunk(
        text=new_text,
        start_time=last_processed_ms / 1000.0,
        end_time=current_ms / 1000.0,
        is_partial=True,
        confidence=1.0,
        audio_samples=new_only_samples,
    )
    await transcription_callback(chunk)
    return new_last


async def _finalize_and_emit(
    *,
    session_id: str,
    session_started_at: float,
    chunks_processed: int,
    transcript_parts: list,
    total_entities: int,
    total_alerts: int,
    audio_duration_seconds: float,
    diarizer,
    extractor,
    validation_coordinator,
):
    try:
        if hasattr(diarizer, "finalize_session"):
            await diarizer.finalize_session(session_id)
    except Exception:
        logger.exception("diarizer.finalize_session failed", session_id=session_id)

    processing_time_ms = int((time.time() - session_started_at) * 1000)
    final_transcript = " ".join(transcript_parts).strip()

    await connection_manager.send_json(
        session_id,
        make_event(
            "session_complete",
            session_id,
            status="success",
            final_transcript=final_transcript,
            total_chunks=chunks_processed,
            total_entities=total_entities,
            total_alerts=total_alerts,
            processing_time_ms=processing_time_ms,
            final_cost_summary={
                "transcription_cost_usd": 0.0,
                "extraction_cost_usd": 0.0,
                "total_cost_usd": 0.0,
                "audio_duration_seconds": audio_duration_seconds,
            },
        ),
    )
