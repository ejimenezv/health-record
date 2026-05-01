"""
Event handlers for RAG validation integration with Incremental Extractor.
"""
import structlog

from src.rag.validation_coordinator import RAGValidationCoordinator

logger = structlog.get_logger()


class RAGEventHandler:
    """Bridges Incremental Extractor events to RAG Validation Coordinator."""

    def __init__(self, coordinator: RAGValidationCoordinator):
        self.coordinator = coordinator

    async def handle_medication_extracted(
        self,
        medication_data: dict,
        session_id: str,
    ):
        """Handle medication extraction event."""
        await self.coordinator.on_entity_extracted(
            entity_type="medication",
            entity_data=medication_data,
            session_id=session_id,
        )

    async def handle_symptom_extracted(
        self,
        symptom_data: dict,
        session_id: str,
    ):
        """Handle symptom extraction event."""
        await self.coordinator.on_entity_extracted(
            entity_type="symptom",
            entity_data=symptom_data,
            session_id=session_id,
        )

    async def handle_diagnosis_extracted(
        self,
        diagnosis_data: dict,
        session_id: str,
    ):
        """Handle diagnosis extraction event."""
        await self.coordinator.on_entity_extracted(
            entity_type="symptom",
            entity_data=diagnosis_data,
            session_id=session_id,
        )
