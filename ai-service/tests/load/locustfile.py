"""
Load tests using Locust for the AI Service API.

Auth: JWT-only. Tokens are minted in-process via src.security.auth.create_token
(no /auth/token endpoint exists). Run from the ai-service/ directory:

    cd ai-service
    locust -f tests/load/locustfile.py --host http://localhost:8000

Override the token by setting LOADTEST_JWT in the environment.
"""
from __future__ import annotations

import base64
import random
import struct
import time

from locust import HttpUser, between, events, task

from tests.load._auth import auth_headers


def _silent_wav(duration_sec: int = 5, sample_rate: int = 16000) -> bytes:
    """Generate a minimal silent WAV file."""
    num_samples = sample_rate * duration_sec
    header = b"RIFF"
    header += struct.pack("<I", 36 + num_samples * 2)
    header += b"WAVEfmt "
    header += struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    header += b"data"
    header += struct.pack("<I", num_samples * 2)
    return header + b"\x00\x00" * num_samples


class StreamingSessionUser(HttpUser):
    """
    Simulates clients creating streaming sessions (the real-time path).
    The actual audio streaming runs over WebSocket — see websocket_load_test.py.
    Here we exercise REST session lifecycle: create -> poll status -> end.
    """

    wait_time = between(5, 15)

    def on_start(self):
        self.headers = auth_headers(sub=f"loadtest-doctor-{self.environment.runner.user_count}", role="doctor")
        self.created_sessions: list[str] = []

    @task(3)
    def create_and_end_session(self):
        with self.client.post(
            "/api/v1/sessions",
            json={
                "patient_id": f"patient-{random.randint(1000, 9999)}",
                "doctor_id": "loadtest-doctor",
                "specialty": "medicina general",
                "metadata": {"source": "loadtest"},
            },
            headers=self.headers,
            catch_response=True,
            name="/api/v1/sessions [CREATE]",
        ) as response:
            if response.status_code != 200:
                response.failure(f"Session creation failed: {response.status_code} {response.text[:200]}")
                return
            response.success()
            try:
                session_id = response.json()["session"]["session_id"]
            except (KeyError, ValueError):
                response.failure("Malformed session response")
                return

        self.created_sessions.append(session_id)

        with self.client.get(
            f"/api/v1/sessions/{session_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/v1/sessions/{id} [GET]",
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status fetch failed: {response.status_code}")

        with self.client.delete(
            f"/api/v1/sessions/{session_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/v1/sessions/{id} [DELETE]",
        ) as response:
            if response.status_code in (200, 204):
                response.success()
            else:
                response.failure(f"Session end failed: {response.status_code}")

    @task(1)
    def list_sessions(self):
        with self.client.get(
            "/api/v1/sessions?page=1&page_size=20",
            headers=self.headers,
            catch_response=True,
            name="/api/v1/sessions [LIST]",
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"List failed: {response.status_code}")


class BatchTranscriptionUser(HttpUser):
    """
    LEGACY batch path: POST /api/v1/transcribe with base64 audio.
    Exercises NFR-001 (transcription completes within budget).
    """

    wait_time = between(10, 30)

    def on_start(self):
        self.headers = auth_headers(sub="loadtest-batch", role="doctor")
        # Cache encoded payload — generation is non-trivial and constant per user.
        self._audio_b64 = base64.b64encode(_silent_wav(duration_sec=5)).decode("ascii")

    @task
    def transcribe(self):
        start = time.perf_counter()
        with self.client.post(
            "/api/v1/transcribe",
            json={
                "audio_base64": self._audio_b64,
                "language": "es",
                "use_vad": True,
            },
            headers=self.headers,
            catch_response=True,
            name="/api/v1/transcribe [POST]",
        ) as response:
            elapsed_ms = (time.perf_counter() - start) * 1000
            if response.status_code != 200:
                response.failure(f"Transcribe failed: {response.status_code}")
            elif elapsed_ms > 120_000:
                response.failure(f"Transcription too slow: {elapsed_ms:.0f}ms")
            else:
                response.success()


class RAGQueryUser(HttpUser):
    """Simulates users querying the RAG knowledge base."""

    wait_time = between(1, 5)

    sample_queries = [
        "¿Cuáles son las contraindicaciones del ibuprofeno?",
        "¿Qué es la cefalea tensional?",
        "Dosis recomendada de paracetamol en adultos",
        "Síntomas de migraña",
        "Interacciones del omeprazol",
        "Código CIE-10 para diabetes tipo 2",
        "Tratamiento para hipertensión arterial",
        "Efectos secundarios de la amoxicilina",
    ]

    def on_start(self):
        self.headers = auth_headers(sub="loadtest-rag", role="doctor")

    @task(5)
    def query_rag(self):
        query = random.choice(self.sample_queries)
        start = time.perf_counter()
        with self.client.post(
            "/api/v1/query",
            json={"query": query, "top_k": 5},
            headers=self.headers,
            catch_response=True,
            name="/api/v1/query [POST]",
        ) as response:
            elapsed_ms = (time.perf_counter() - start) * 1000
            if response.status_code != 200:
                response.failure(f"Query failed: {response.status_code}")
            elif elapsed_ms >= 3000:
                response.failure(f"Query too slow: {elapsed_ms:.0f}ms")
            else:
                response.success()

    @task(1)
    def health_check(self):
        with self.client.get("/health", catch_response=True, name="/health [GET]") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")


class AdminUser(HttpUser):
    """Admin users ingesting documents — rare operation."""

    wait_time = between(30, 60)

    sample_documents = [
        {
            "content": "Ibuprofeno: AINE para dolor leve a moderado. Dosis: 400-800mg cada 6-8h.",
            "metadata": {"source": "vademecum", "type": "medication"},
        },
        {
            "content": "Cefalea tensional (G44.2): Dolor bilateral opresivo en cabeza.",
            "metadata": {"source": "cie10", "type": "diagnosis"},
        },
    ]

    def on_start(self):
        self.headers = auth_headers(sub="loadtest-admin", role="admin")

    @task
    def ingest_document(self):
        document = random.choice(self.sample_documents)
        with self.client.post(
            "/api/v1/ingest",
            json={"documents": [document]},
            headers=self.headers,
            catch_response=True,
            name="/api/v1/ingest [POST]",
        ) as response:
            if response.status_code in (200, 201):
                response.success()
            else:
                response.failure(f"Ingest failed: {response.status_code}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("Starting load test...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n" + "=" * 50)
    print("LOAD TEST RESULTS")
    print("=" * 50)
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Median response time: {stats.total.median_response_time}ms")
    print(f"95th percentile: {stats.total.get_response_time_percentile(0.95)}ms")
    print(f"99th percentile: {stats.total.get_response_time_percentile(0.99)}ms")
    print(f"Requests/sec: {stats.total.total_rps:.2f}")
    print("=" * 50)
