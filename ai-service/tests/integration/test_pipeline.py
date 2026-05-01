"""
Integration tests for the end-to-end processing pipelines exposed
through the API surface (transcribe -> extract, ingest -> query).

External services (LLM, Whisper, vector store) are mocked at the
orchestrator boundary; the goal is to exercise the wiring between
the route handler, schema layer, and orchestrator contract.
"""
from __future__ import annotations

import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.api import routes as routes_mod


def _build_orchestrator_for_consultation():
    medication = SimpleNamespace(name="Paracetamol", dosage="500mg", frequency="8h")
    symptom = MagicMock()
    symptom.model_dump = MagicMock(return_value={"name": "fiebre"})
    diagnosis = MagicMock()
    diagnosis.model_dump = MagicMock(return_value={"name": "Gripe"})
    extraction = SimpleNamespace(
        chief_complaint="Fiebre y malestar",
        medications=[medication],
        symptoms=[symptom],
        diagnoses=[diagnosis],
        confidence_score=0.88,
    )
    validation = SimpleNamespace(
        is_valid=True,
        rag_confidence=0.93,
        correct_dosage_range="500-1000mg",
        warnings=[],
    )
    enriched = SimpleNamespace(
        extraction=extraction,
        medication_validations=[validation],
        drug_interactions=[],
        cie10_suggestions=[
            SimpleNamespace(code="J11", description="Influenza", confidence=0.7)
        ],
    )
    return SimpleNamespace(enriched_extraction=enriched, total_cost_usd=0.04)


class TestTranscribeToExtractPipeline:
    """Audio -> transcription -> extraction -> validated entities."""

    def test_transcribe_then_extract(self, client, auth_headers):
        # Stage 1: transcribe
        seg = SimpleNamespace(start=0.0, end=3.0, text="El paciente tiene fiebre")
        transcribe_result = SimpleNamespace(
            text="El paciente tiene fiebre",
            segments=[seg],
            language="es",
            duration_seconds=3.0,
            cost_usd=0.001,
        )

        fake_orch = MagicMock()
        fake_orch.transcription_service = MagicMock()
        fake_orch.transcription_service.transcribe = AsyncMock(return_value=transcribe_result)
        fake_orch.process_consultation = AsyncMock(
            return_value=_build_orchestrator_for_consultation()
        )
        routes_mod._orchestrator = fake_orch

        audio_b64 = base64.b64encode(b"audio").decode()
        t_resp = client.post(
            "/api/v1/transcribe",
            json={"audio_base64": audio_b64, "language": "es"},
            headers=auth_headers,
        )
        assert t_resp.status_code == 200
        transcription = t_resp.json()["text"]

        # Stage 2: extract using the transcription
        e_resp = client.post(
            "/api/v1/extract",
            json={"transcription": transcription, "validate_with_rag": True},
            headers=auth_headers,
        )
        assert e_resp.status_code == 200
        body = e_resp.json()
        assert body["chief_complaint"] == "Fiebre y malestar"
        assert body["medications"][0]["validation"]["status"] == "VALIDATED"
        assert body["cie10_suggestions"][0]["code"] == "J11"

    def test_extract_propagates_orchestrator_failure(self, client, auth_headers):
        fake_orch = MagicMock()
        fake_orch.process_consultation = AsyncMock(side_effect=RuntimeError("LLM down"))
        routes_mod._orchestrator = fake_orch

        resp = client.post(
            "/api/v1/extract",
            json={"transcription": "consulta paciente fiebre malestar"},
            headers=auth_headers,
        )
        assert resp.status_code == 500


class TestIngestToQueryPipeline:
    """Documents -> RAG store -> query response with sources."""

    def test_ingest_then_query(self, client, auth_headers, sample_document_content):
        fake_pipeline = MagicMock()
        fake_pipeline.ingest_documents = MagicMock(return_value={
            "documents_processed": 1,
            "chunks_created": 4,
        })
        routes_mod._ingestion_pipeline = fake_pipeline

        ingest_resp = client.post(
            "/api/v1/ingest",
            json={"documents": [{"content": sample_document_content}]},
            headers=auth_headers,
        )
        assert ingest_resp.status_code == 200
        assert ingest_resp.json()["chunks_created"] == 4

        fake_orch = MagicMock()
        fake_orch.query_with_rag = AsyncMock(return_value={
            "context": "Ibuprofeno: 400-800mg cada 6-8h",
            "documents": [
                {
                    "content": "Ibuprofeno 400-800mg cada 6-8h",
                    "similarity_score": 0.95,
                    "metadata": {"doc_id": "doc-ibu", "source": "test"},
                }
            ],
        })
        routes_mod._orchestrator = fake_orch

        query_resp = client.post(
            "/api/v1/query",
            json={"query": "¿Cuál es la dosis de ibuprofeno?"},
            headers=auth_headers,
        )
        assert query_resp.status_code == 200
        body = query_resp.json()
        assert "Ibuprofeno" in body["response"]
        assert len(body["sources"]) == 1
        assert body["sources"][0]["similarity_score"] == 0.95


class TestPipelineErrorHandling:
    def test_transcribe_failure_returns_500(self, client, auth_headers):
        fake_orch = MagicMock()
        fake_orch.transcription_service = MagicMock()
        fake_orch.transcription_service.transcribe = AsyncMock(
            side_effect=RuntimeError("whisper unavailable")
        )
        routes_mod._orchestrator = fake_orch

        audio_b64 = base64.b64encode(b"x").decode()
        resp = client.post(
            "/api/v1/transcribe",
            json={"audio_base64": audio_b64},
            headers=auth_headers,
        )
        assert resp.status_code == 500

    def test_query_failure_returns_500(self, client, auth_headers):
        fake_orch = MagicMock()
        fake_orch.query_with_rag = AsyncMock(side_effect=RuntimeError("rag offline"))
        routes_mod._orchestrator = fake_orch

        resp = client.post(
            "/api/v1/query",
            json={"query": "test"},
            headers=auth_headers,
        )
        assert resp.status_code == 500
