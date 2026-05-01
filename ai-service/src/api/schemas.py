"""
Pydantic schemas for API request/response models.
Follows OpenAPI specification from docs/api/openapi.yaml.
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
# Health Endpoint
# ═══════════════════════════════════════════════════════════════

class ComponentHealth(BaseModel):
    """Health status of a component."""
    status: str = Field(description="healthy, degraded, or unhealthy")
    latency_ms: float | None = Field(None, description="Response time in ms")
    details: str | None = Field(None, description="Additional details")


class HealthResponse(BaseModel):
    """Response for GET /api/v1/health."""
    status: str = Field(description="Overall system status")
    components: dict[str, ComponentHealth] = Field(
        description="Status of each component"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = Field(description="API version")


# ═══════════════════════════════════════════════════════════════
# Query Endpoint
# ═══════════════════════════════════════════════════════════════

class QueryRequest(BaseModel):
    """Request for POST /api/v1/query."""
    query: str = Field(..., min_length=1, max_length=2048, description="Query text")
    session_id: str | None = Field(None, description="Session ID for conversation context")
    context_filter: dict[str, Any] | None = Field(
        None, description="Filters for RAG retrieval"
    )
    include_sources: bool = Field(True, description="Include source documents")


class SourceDocument(BaseModel):
    """Source document from RAG retrieval."""
    document_id: str
    chunk_text: str
    similarity_score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class QueryResponse(BaseModel):
    """Response for POST /api/v1/query."""
    response: str = Field(description="Generated response")
    sources: list[SourceDocument] = Field(default_factory=list)
    tokens_used: int = Field(description="Total tokens consumed")
    latency_ms: float = Field(description="Processing time in ms")
    session_id: str | None = Field(None)


# ═══════════════════════════════════════════════════════════════
# Ingest Endpoint
# ═══════════════════════════════════════════════════════════════

class DocumentInput(BaseModel):
    """Document to ingest."""
    content: str = Field(..., min_length=1, description="Document content")
    metadata: dict[str, Any] = Field(default_factory=dict)
    doc_id: str | None = Field(None, description="Optional document ID")


class IngestRequest(BaseModel):
    """Request for POST /api/v1/ingest."""
    documents: list[DocumentInput] = Field(..., min_length=1)
    source_type: str = Field("text", description="Source type: text, pdf, url")


class IngestResponse(BaseModel):
    """Response for POST /api/v1/ingest."""
    status: str = Field(description="success, partial, or failed")
    indexed_docs: int = Field(description="Number of documents indexed")
    chunks_created: int = Field(description="Number of chunks created")
    errors: list[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════
# Session Management (Real-Time Support)
# ═══════════════════════════════════════════════════════════════

class SessionCreateRequest(BaseModel):
    """Request for POST /api/v1/sessions."""
    appointment_id: str | None = Field(None, description="Optional appointment ID")
    patient_id: str | None = Field(None, description="Optional patient ID")
    doctor_id: str | None = Field(None, description="Optional doctor ID")
    specialty: str = Field("medicina general", description="Medical specialty")
    metadata: dict[str, Any] = Field(default_factory=dict)


class SessionStatus(BaseModel):
    """Status of a session."""
    session_id: str
    status: str = Field(description="active, completed, error")
    created_at: datetime
    updated_at: datetime
    appointment_id: str | None = None
    patient_id: str | None = None
    doctor_id: str | None = None
    specialty: str = "medicina general"

    # Real-time stats
    audio_duration_seconds: float = 0.0
    transcription_chunks: int = 0
    entities_extracted: int = 0
    validations_performed: int = 0
    cost_usd: float = 0.0

    # WebSocket connection info
    websocket_url: str | None = None
    is_connected: bool = False


class SessionResponse(BaseModel):
    """Response for session operations."""
    session: SessionStatus
    message: str | None = None


class SessionListResponse(BaseModel):
    """Response for listing sessions."""
    sessions: list[SessionStatus]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════
# Transcribe Endpoint (LEGACY - Batch Mode)
# ═══════════════════════════════════════════════════════════════

class TranscribeRequest(BaseModel):
    """Request for POST /api/v1/transcribe (LEGACY batch mode)."""
    audio_base64: str = Field(..., description="Base64 encoded audio")
    language: str = Field("es", description="Language code")
    use_vad: bool = Field(True, description="Use Voice Activity Detection")
    appointment_id: str | None = Field(None)


class TranscriptionSegment(BaseModel):
    """Transcription segment with timestamps."""
    start: float
    end: float
    text: str


class TranscribeResponse(BaseModel):
    """Response for POST /api/v1/transcribe."""
    text: str
    segments: list[TranscriptionSegment]
    language: str
    duration_seconds: float
    cost_usd: float


# ═══════════════════════════════════════════════════════════════
# Extract Endpoint (LEGACY - Batch Mode)
# ═══════════════════════════════════════════════════════════════

class ExtractRequest(BaseModel):
    """Request for POST /api/v1/extract (LEGACY batch mode)."""
    transcription: str = Field(..., min_length=10)
    specialty: str = Field("medicina general")
    validate_with_rag: bool = Field(True)
    appointment_id: str | None = Field(None)


class MedicationValidation(BaseModel):
    """Medication validation result."""
    status: str
    rag_confidence: float
    correct_dosage_range: str | None
    warnings: list[str]


class ExtractedMedication(BaseModel):
    """Extracted medication with validation."""
    name: str
    dosage: str | None
    frequency: str | None
    validation: MedicationValidation | None


class DrugInteractionAlert(BaseModel):
    """Drug interaction alert."""
    medications: list[str]
    severity: str
    description: str
    recommendation: str


class CIE10Suggestion(BaseModel):
    """CIE-10 code suggestion."""
    code: str
    description: str
    confidence: float


class ExtractResponse(BaseModel):
    """Response for POST /api/v1/extract."""
    chief_complaint: str | None
    medications: list[ExtractedMedication]
    symptoms: list[dict[str, Any]]
    diagnoses: list[dict[str, Any]]
    drug_interactions: list[DrugInteractionAlert]
    cie10_suggestions: list[CIE10Suggestion]
    confidence_score: float
    tokens_used: int
    cost_usd: float


# ═══════════════════════════════════════════════════════════════
# Error Response
# ═══════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
    error_code: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
