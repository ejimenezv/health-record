"""Real-time RAG validation performance tests.

Verify latency targets for the priority-based validation queue.

Latency Targets (Prompt 24):
- CRITICAL alerts: < 1 second
- HIGH alerts:     < 2 seconds
- MEDIUM alerts:   < 3 seconds
- LOW alerts:      < 5 seconds
"""
from __future__ import annotations

import asyncio
import time

import pytest

# The realtime RAG entry point lives at src.rag.validation_coordinator in this
# project. Skip the module entirely if the coordinator (or a compatible
# RAGService shim) is not importable, so the rest of the suite stays green.
RAGService = None
try:
    from src.rag.validation_coordinator import (  # type: ignore[import-not-found]
        RAGValidationCoordinator as RAGService,
    )
except Exception:  # pragma: no cover - optional dependency path
    try:
        from app.services.rag_service import RAGService  # type: ignore[import-not-found]
    except Exception:
        RAGService = None

pytestmark = pytest.mark.skipif(
    RAGService is None,
    reason="No RAGValidationCoordinator/RAGService available in this environment",
)


@pytest.fixture
def rag_service():
    return RAGService()


async def _validate(rag_service, *, entity_type: str, entity_value: str, context: dict, priority: str):
    """Adapter that calls whichever validate-entity API the service exposes."""
    if hasattr(rag_service, "validate_entity_with_rag"):
        return await rag_service.validate_entity_with_rag(
            entity_type=entity_type,
            entity_value=entity_value,
            context=context,
            priority=priority,
        )
    if hasattr(rag_service, "validate_entity"):
        return await rag_service.validate_entity(
            entity_type=entity_type,
            entity_value=entity_value,
            context=context,
            priority=priority,
        )
    raise AttributeError("RAGService exposes no validate_entity[_with_rag] coroutine")


class TestRealtimeRAGPerformance:
    """Verify RAG latency targets for the real-time streaming pipeline."""

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_critical_alert_latency_under_1_second(self, rag_service):
        """CRITICAL alert validation must complete in < 1 second (allergy conflict)."""
        start = time.time()
        result = await _validate(
            rag_service,
            entity_type="medication",
            entity_value="penicilina",
            context={"patient_allergies": ["penicilina"]},
            priority="CRITICAL",
        )
        elapsed = time.time() - start

        assert elapsed < 1.0, f"CRITICAL alert took {elapsed:.3f}s (must be < 1.0s)"
        assert result.get("alert_type") == "allergy_conflict"
        assert result.get("severity") == "CRITICAL"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_high_alert_latency_under_2_seconds(self, rag_service):
        """HIGH alert validation must complete in < 2 seconds (drug interaction)."""
        start = time.time()
        result = await _validate(
            rag_service,
            entity_type="medication",
            entity_value="warfarina",
            context={"current_medications": ["aspirina"]},
            priority="HIGH",
        )
        elapsed = time.time() - start

        assert elapsed < 2.0, f"HIGH alert took {elapsed:.3f}s (must be < 2.0s)"
        assert result.get("alert_type") == "drug_interaction"
        assert result.get("severity") == "HIGH"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_medium_alert_latency_under_3_seconds(self, rag_service):
        """MEDIUM alert validation must complete in < 3 seconds (dosage check)."""
        start = time.time()
        await _validate(
            rag_service,
            entity_type="medication",
            entity_value="paracetamol 1500mg",
            context={},
            priority="MEDIUM",
        )
        elapsed = time.time() - start

        assert elapsed < 3.0, f"MEDIUM alert took {elapsed:.3f}s (must be < 3.0s)"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_priority_queue_ordering(self, rag_service):
        """Priority queue must process CRITICAL alerts before LOW alerts."""
        tasks = [
            _validate(rag_service, entity_type="medication", entity_value="low_priority_med",
                      context={}, priority="LOW"),
            _validate(rag_service, entity_type="medication", entity_value="critical_allergy",
                      context={"patient_allergies": ["critical_allergy"]}, priority="CRITICAL"),
            _validate(rag_service, entity_type="medication", entity_value="medium_priority_med",
                      context={}, priority="MEDIUM"),
        ]

        start = time.time()
        results = await asyncio.gather(*tasks)
        total = time.time() - start

        critical_result = results[1]
        assert critical_result.get("priority") == "CRITICAL"
        assert total < 2.0, "Priority queue should process CRITICAL tasks immediately"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_concurrent_rag_validations(self, rag_service):
        """RAG service must handle multiple concurrent validations efficiently."""
        entities = [
            {"type": "symptom", "value": "dolor de cabeza", "priority": "MEDIUM"},
            {"type": "medication", "value": "ibuprofeno", "priority": "HIGH"},
            {"type": "diagnosis", "value": "migraña", "priority": "MEDIUM"},
            {"type": "medication", "value": "paracetamol", "priority": "LOW"},
        ]

        tasks = [
            _validate(
                rag_service,
                entity_type=e["type"],
                entity_value=e["value"],
                context={},
                priority=e["priority"],
            )
            for e in entities
        ]

        start = time.time()
        results = await asyncio.gather(*tasks)
        total = time.time() - start

        assert total < 5.0, f"Concurrent validations took {total:.3f}s"
        assert len(results) == len(entities)
        for result in results:
            assert "validation_status" in result or "alert_type" in result

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_rag_cache_performance(self, rag_service):
        """RAG caching must significantly speed up repeated queries."""
        kwargs = dict(
            entity_type="medication",
            entity_value="ibuprofeno",
            context={},
            priority="MEDIUM",
        )

        start = time.time()
        result1 = await _validate(rag_service, **kwargs)
        cold = time.time() - start

        start = time.time()
        result2 = await _validate(rag_service, **kwargs)
        warm = time.time() - start

        assert warm < cold * 0.5, (
            f"Cache not effective: cold={cold:.3f}s, warm={warm:.3f}s"
        )
        assert result1.get("validation_status") == result2.get("validation_status")


@pytest.mark.performance
def test_rag_embedding_latency(rag_service):
    """Embedding generation latency for queries should be < 500ms."""
    if not hasattr(rag_service, "generate_embedding"):
        pytest.skip("RAG service does not expose generate_embedding")

    query = "¿Cuáles son las contraindicaciones del ibuprofeno?"
    start = time.time()
    embedding = rag_service.generate_embedding(query)
    elapsed = time.time() - start

    assert elapsed < 0.5, f"Embedding took {elapsed:.3f}s (must be < 0.5s)"
    assert len(embedding) > 0, "Embedding should not be empty"
