"""
Integration tests for the AI service's persistent state layer.

Architectural note:
The Python AI service does NOT own a relational database — user accounts,
audit logs, and long-term records live in the Node.js backend (PostgreSQL).
The AI service uses Redis as its only stateful store, for live session
metadata during streaming consultations.

These tests therefore exercise the Redis-backed session lifecycle that the
service actually owns, going through the public API surface so we cover
both the Redis serialization and the route layer that depends on it.
"""
from __future__ import annotations

import json

import pytest


def _post_session(client, headers, **fields) -> dict:
    resp = client.post("/api/v1/sessions", json=fields, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["session"]


class TestSessionPersistence:
    def test_session_persisted_to_redis(self, client, auth_headers, fake_redis):
        session = _post_session(client, auth_headers, patient_id="patient-42")
        sid = session["session_id"]

        stored = fake_redis.store.get(f"session:{sid}")
        assert stored is not None
        data = json.loads(stored)
        assert data["session_id"] == sid
        assert data["patient_id"] == "patient-42"
        assert data["status"] == "active"

    def test_session_round_trip_through_get(self, client, auth_headers):
        session = _post_session(
            client,
            auth_headers,
            appointment_id="appt-1",
            patient_id="patient-1",
            doctor_id="doctor-1",
            specialty="pediatría",
        )
        sid = session["session_id"]

        resp = client.get(f"/api/v1/sessions/{sid}", headers=auth_headers)
        body = resp.json()["session"]
        assert body["appointment_id"] == "appt-1"
        assert body["patient_id"] == "patient-1"
        assert body["doctor_id"] == "doctor-1"
        assert body["specialty"] == "pediatría"

    def test_listing_filters_by_status(self, client, auth_headers):
        _post_session(client, auth_headers)
        _post_session(client, auth_headers)

        resp = client.get("/api/v1/sessions?status_filter=active", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert all(s["status"] == "active" for s in body["sessions"])

        resp = client.get("/api/v1/sessions?status_filter=closed", headers=auth_headers)
        assert resp.json()["total"] == 0

    def test_pagination(self, client, auth_headers):
        for _ in range(5):
            _post_session(client, auth_headers)

        resp = client.get("/api/v1/sessions?page=1&page_size=2", headers=auth_headers)
        body = resp.json()
        assert body["total"] == 5
        assert body["page"] == 1
        assert body["page_size"] == 2
        assert len(body["sessions"]) == 2


class TestSessionDeletion:
    def test_delete_removes_from_redis(self, client, auth_headers, fake_redis):
        session = _post_session(client, auth_headers)
        sid = session["session_id"]
        assert f"session:{sid}" in fake_redis.store

        resp = client.delete(f"/api/v1/sessions/{sid}", headers=auth_headers)
        assert resp.status_code == 200
        assert f"session:{sid}" not in fake_redis.store

    def test_delete_clears_related_state_keys(self, client, auth_headers, fake_redis):
        session = _post_session(client, auth_headers)
        sid = session["session_id"]

        # Simulate orchestrator having written companion state
        fake_redis.store[f"speaker_state:{sid}"] = "{}"
        fake_redis.store[f"transcript_state:{sid}"] = "{}"
        fake_redis.store[f"extraction_state:{sid}"] = "{}"

        client.delete(f"/api/v1/sessions/{sid}", headers=auth_headers)

        assert f"speaker_state:{sid}" not in fake_redis.store
        assert f"transcript_state:{sid}" not in fake_redis.store
        assert f"extraction_state:{sid}" not in fake_redis.store
