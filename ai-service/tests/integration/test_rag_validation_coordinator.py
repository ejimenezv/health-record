"""
Integration tests for RAG Validation Coordinator.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio

from src.rag.validation_coordinator import (
    RAGValidationCoordinator,
    ValidationEvent,
    ValidationPriority,
)


class TestRAGValidationCoordinator:
    """Integration tests for RAG validation coordinator."""

    @pytest.fixture
    def mock_retriever(self):
        """Mock RAG retriever service."""
        retriever = MagicMock()

        retriever.retrieve_medications = AsyncMock(return_value=[
            MagicMock(
                content="Paracetamol 500mg",
                metadata={
                    "posologia": "500mg cada 6-8 horas",
                    "source": "CIMA",
                },
                similarity_score=0.92,
            )
        ])

        retriever.retrieve_interactions = AsyncMock(return_value=[])

        retriever.retrieve_cie10 = AsyncMock(return_value=[
            MagicMock(
                content="R51 - Cefalea",
                metadata={"code": "R51", "descripcion": "Cefalea"},
                similarity_score=0.88,
            )
        ])

        return retriever

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        redis = MagicMock()
        redis.get = AsyncMock(return_value=None)
        redis.setex = AsyncMock(return_value=True)
        return redis

    @pytest_asyncio.fixture
    async def coordinator(self, mock_retriever, mock_redis):
        """Create coordinator instance."""
        events_emitted = []

        async def event_callback(event: ValidationEvent):
            events_emitted.append(event)

        coord = RAGValidationCoordinator(
            retriever_service=mock_retriever,
            redis_client=mock_redis,
            event_callback=event_callback,
        )
        coord._events_emitted = events_emitted

        await coord.start()
        yield coord
        await coord.stop()

    @pytest.mark.asyncio
    async def test_medication_validation_task_created(self, coordinator):
        """Test that medication extraction creates HIGH priority validation task."""
        medication_data = {
            "id": "MED_001",
            "name": "Paracetamol",
            "dosage": "500mg",
        }

        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data=medication_data,
            session_id="test-session-1",
        )

        await asyncio.sleep(0.5)

        assert len(coordinator._events_emitted) >= 1
        assert coordinator._events_emitted[0].type == "medication_validated"
        assert coordinator._events_emitted[0].priority == ValidationPriority.HIGH

    @pytest.mark.asyncio
    async def test_drug_interaction_check_triggered(self, coordinator, mock_retriever):
        """Test that second medication triggers CRITICAL interaction check."""
        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data={"id": "MED_001", "name": "Paracetamol"},
            session_id="test-session-2",
        )

        await asyncio.sleep(0.5)

        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data={"id": "MED_002", "name": "Warfarina"},
            session_id="test-session-2",
        )

        await asyncio.sleep(0.5)

        assert mock_retriever.retrieve_interactions.called

    @pytest.mark.asyncio
    async def test_symptom_triggers_cie10_suggestion(self, coordinator):
        """Test that symptom extraction triggers MEDIUM priority CIE-10 suggestion."""
        symptom_data = {
            "id": "SYM_001",
            "description": "Dolor de cabeza intenso",
        }

        await coordinator.on_entity_extracted(
            entity_type="symptom",
            entity_data=symptom_data,
            session_id="test-session-3",
        )

        await asyncio.sleep(0.5)

        events = [e for e in coordinator._events_emitted if e.type == "cie10_suggested"]
        assert len(events) >= 1
        assert events[0].priority == ValidationPriority.MEDIUM

    @pytest.mark.asyncio
    async def test_latency_targets_met(self, coordinator):
        """Test that validation tasks meet latency targets."""
        medication_data = {
            "id": "MED_003",
            "name": "Ibuprofeno",
        }

        start_time = asyncio.get_event_loop().time()

        await coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data=medication_data,
            session_id="test-session-4",
        )

        await asyncio.sleep(0.5)

        elapsed = asyncio.get_event_loop().time() - start_time

        assert elapsed < 2.0
