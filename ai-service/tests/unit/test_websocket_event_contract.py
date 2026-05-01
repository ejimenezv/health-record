"""Contract tests for WS frames emitted by src/api/websocket/streaming.py.

Each test asserts the on-the-wire shape of an outbound event against the React
contract in packages/frontend/src/types/websocketEvents.ts. If these pass, React
will parse successfully.
"""
from datetime import datetime

import pytest

from src.api.websocket.streaming import (
    _PY_TO_REACT_ENTITY_TYPE,
    _normalize_entity_payload,
    _severity_to_react,
    make_event,
)


REACT_ALERT_TYPES = {
    "drug_interaction", "allergy_conflict", "dosage_error",
    "contraindication", "missing_info",
}
REACT_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
REACT_ENTITY_TYPES = {"symptom", "diagnosis", "prescription", "vital_sign", "allergy", "procedure"}
REACT_VALIDATION_STATUSES = {"approved", "flagged", "needs_review"}


def _assert_envelope(frame, event_name):
    assert set(frame.keys()) == {"event", "session_id", "timestamp", "data"}
    assert frame["event"] == event_name
    assert isinstance(frame["session_id"], str) and frame["session_id"]
    datetime.fromisoformat(frame["timestamp"])
    assert isinstance(frame["data"], dict)


def test_transcript_update_shape():
    frame = make_event(
        "transcript_update", "sess_1",
        chunk_index=0, text="hola", is_final=False, language="es", confidence=0.85,
    )
    _assert_envelope(frame, "transcript_update")
    d = frame["data"]
    assert set(d.keys()) == {"chunk_index", "text", "is_final", "language", "confidence"}
    assert isinstance(d["chunk_index"], int)
    assert isinstance(d["is_final"], bool)
    assert isinstance(d["confidence"], float)


def test_speaker_changed_shape():
    frame = make_event(
        "speaker_changed", "sess_1",
        speaker_id="SPEAKER_0", role="DOCTOR", confidence=0.9, start_time=1.5,
    )
    _assert_envelope(frame, "speaker_changed")
    d = frame["data"]
    assert set(d.keys()) == {"speaker_id", "role", "confidence", "start_time"}
    assert d["role"] in {"DOCTOR", "PATIENT", "UNKNOWN"}


def test_extraction_update_medication_shape():
    entity = _normalize_entity_payload(
        "medication",
        {"id": "m1", "name": "Aspirina", "confidence": 0.92, "timestamp": 5.0, "dosage": "500mg"},
    )
    frame = make_event(
        "extraction_update", "sess_1",
        entity_type=_PY_TO_REACT_ENTITY_TYPE["medication"],
        entity=entity,
        chunk_index=2,
    )
    _assert_envelope(frame, "extraction_update")
    d = frame["data"]
    assert set(d.keys()) == {"entity_type", "entity", "chunk_index"}
    assert d["entity_type"] == "prescription"
    assert d["entity_type"] in REACT_ENTITY_TYPES
    e = d["entity"]
    assert {"id", "content", "confidence", "timestamp"}.issubset(e.keys())
    assert e["content"] == "Aspirina"
    assert isinstance(e["confidence"], float)
    assert isinstance(e["timestamp"], float)


def test_extraction_update_chief_complaint_maps_to_symptom():
    entity = _normalize_entity_payload(
        "chief_complaint",
        {"id": "c1", "complaint": "Dolor de cabeza", "confidence": 0.8, "timestamp": 1.0},
    )
    assert entity["content"] == "Dolor de cabeza"
    assert _PY_TO_REACT_ENTITY_TYPE["chief_complaint"] == "symptom"


def test_validation_alert_shape():
    frame = make_event(
        "validation_alert", "sess_1",
        alert_id="abc", type="drug_interaction", severity="CRITICAL",
        message="Interacción detectada", related_entities=["m1", "m2"],
        recommended_action="Suspender", requires_immediate_attention=True,
    )
    _assert_envelope(frame, "validation_alert")
    d = frame["data"]
    assert {"alert_id", "type", "severity", "message", "related_entities", "requires_immediate_attention"}.issubset(d.keys())
    assert d["type"] in REACT_ALERT_TYPES
    assert d["severity"] in REACT_SEVERITIES
    assert isinstance(d["related_entities"], list)
    assert isinstance(d["requires_immediate_attention"], bool)


def test_entity_validated_shape():
    frame = make_event(
        "entity_validated", "sess_1",
        entity_id="m1", entity_type="prescription",
        validation_status="approved", confidence_score=0.91, validation_notes=None,
    )
    _assert_envelope(frame, "entity_validated")
    d = frame["data"]
    assert {"entity_id", "entity_type", "validation_status", "confidence_score"}.issubset(d.keys())
    assert d["validation_status"] in REACT_VALIDATION_STATUSES


def test_cost_update_shape():
    frame = make_event(
        "cost_update", "sess_1",
        transcription_cost_usd=0.01, extraction_cost_usd=0.0, total_cost_usd=0.01,
        chunks_processed=5, cache_hit_rate=0.0,
    )
    _assert_envelope(frame, "cost_update")
    d = frame["data"]
    assert set(d.keys()) == {
        "transcription_cost_usd", "extraction_cost_usd", "total_cost_usd",
        "chunks_processed", "cache_hit_rate",
    }


def test_session_complete_shape():
    frame = make_event(
        "session_complete", "sess_1",
        status="success", final_transcript="hola mundo",
        total_chunks=10, total_entities=2, total_alerts=1, processing_time_ms=12345,
        final_cost_summary={
            "transcription_cost_usd": 0.01,
            "extraction_cost_usd": 0.0,
            "total_cost_usd": 0.01,
            "audio_duration_seconds": 60.0,
        },
    )
    _assert_envelope(frame, "session_complete")
    d = frame["data"]
    assert d["status"] in {"success", "partial", "failed"}
    assert {"final_transcript", "total_chunks", "total_entities", "total_alerts",
            "processing_time_ms", "final_cost_summary"}.issubset(d.keys())
    cs = d["final_cost_summary"]
    assert set(cs.keys()) == {
        "transcription_cost_usd", "extraction_cost_usd", "total_cost_usd", "audio_duration_seconds",
    }


def test_error_shape():
    frame = make_event(
        "error", "sess_1",
        error_code="AUDIO_PROCESSING_FAILED", message="boom", recoverable=True,
    )
    _assert_envelope(frame, "error")
    d = frame["data"]
    assert {"error_code", "message", "recoverable"}.issubset(d.keys())
    assert isinstance(d["recoverable"], bool)


@pytest.mark.parametrize("priority,expected", [
    ("critical", "CRITICAL"),
    ("CRITICAL", "CRITICAL"),
    ("high", "HIGH"),
    ("medium", "MEDIUM"),
    ("low", "LOW"),
    ("unknown", "MEDIUM"),
])
def test_severity_mapping(priority, expected):
    assert _severity_to_react(priority) == expected
