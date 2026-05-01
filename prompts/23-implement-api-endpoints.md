# Prompt 23: Implement API Endpoints (REST + Session Management)

## Objective
Implement BSG mandatory REST endpoints and session management endpoints for real-time streaming consultations.

## Architecture Overview

**⚠️ DUAL API ARCHITECTURE**

This service provides two API modes:

1. **REST API (Batch Mode)**: BSG mandatory endpoints for synchronous processing
   - `/api/v1/health` - System health check
   - `/api/v1/query` - RAG knowledge base queries
   - `/api/v1/ingest` - Document ingestion
   - `/api/v1/transcribe` - **LEGACY**: Batch audio transcription
   - `/api/v1/extract` - **LEGACY**: Batch entity extraction

2. **WebSocket API (Real-Time Mode)**: Streaming audio consultations (Prompt 25)
   - `/ws/session` - Real-time bidirectional streaming
   - Session management endpoints support WebSocket lifecycle

**Recommended Approach**: Use WebSocket streaming for live consultations (lower latency, incremental results). Use batch REST endpoints only for post-consultation processing or testing.

## Reference Documents
- `07_artefactos/01_alcance_minimo.md` - Required endpoints
- `07_artefactos/02_archivos_obligatorios.md` - OpenAPI spec template
- `docs/api/openapi.yaml` - API specification
- Prompt 25 - WebSocket real-time implementation

## Tasks

### 1. Create API Schemas

Create `ai-service/src/api/schemas.py`:

```python
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
    documents: list[DocumentInput] = Field(..., min_items=1)
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
    """
    Request for POST /api/v1/transcribe.

    ⚠️ LEGACY ENDPOINT: Use WebSocket /ws/session for real-time streaming.
    This endpoint processes complete audio files in batch mode.
    """
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
    """
    Request for POST /api/v1/extract.

    ⚠️ LEGACY ENDPOINT: Use WebSocket /ws/session for real-time incremental extraction.
    This endpoint processes complete transcriptions in batch mode.
    """
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
```

### 2. Create API Routes

Create `ai-service/src/api/routes.py`:

```python
"""
API routes for MedRecord AI Service.
Implements BSG mandatory endpoints and additional medical endpoints.
"""
import base64
import json
import time
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis.asyncio as redis
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.api.schemas import (
    HealthResponse, ComponentHealth,
    QueryRequest, QueryResponse, SourceDocument,
    IngestRequest, IngestResponse,
    SessionCreateRequest, SessionStatus, SessionResponse, SessionListResponse,
    TranscribeRequest, TranscribeResponse, TranscriptionSegment,
    ExtractRequest, ExtractResponse,
    ExtractedMedication, MedicationValidation,
    DrugInteractionAlert, CIE10Suggestion,
    ErrorResponse,
)
from src.core.config import get_settings
from src.core.orchestrator import AIOrchestrator
from src.rag.ingestion import IngestionPipeline, Document
from src.rag.retriever import RetrieverService
from src.rag.vector_store import VectorStoreClient
from src.security.auth import verify_token
from src.security.guardrails import validate_input
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)

# Rate limiter (BSG requirement)
limiter = Limiter(key_func=get_remote_address)

# Initialize services
orchestrator = AIOrchestrator()
retriever = RetrieverService()
ingestion_pipeline = IngestionPipeline()

# Redis client for session management
redis_client: redis.Redis | None = None


async def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global redis_client
    if redis_client is None:
        redis_client = await redis.from_url(
            settings.redis_url or "redis://redis:6379",
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


# Import connection manager (lazy import to avoid circular dependency)
def get_connection_manager():
    """Get WebSocket connection manager."""
    from src.api.websocket.manager import connection_manager
    return connection_manager


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> dict | None:
    """Validate JWT token and return user info."""
    if credentials is None:
        return None
    return verify_token(credentials.credentials)


# ═══════════════════════════════════════════════════════════════
# Health Endpoint (BSG Mandatory)
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Operations"],
    summary="Health check del sistema",
)
async def health_check() -> HealthResponse:
    """
    Retorna el estado de todos los componentes del sistema.
    No requiere autenticación.
    """
    components = {}

    # Check LLM API
    try:
        start = time.time()
        # Simple check - just verify API key is set
        llm_ok = bool(settings.openai_api_key)
        latency = (time.time() - start) * 1000
        components["llm_api"] = ComponentHealth(
            status="healthy" if llm_ok else "unhealthy",
            latency_ms=latency,
            details="OpenAI API configured" if llm_ok else "API key missing",
        )
    except Exception as e:
        components["llm_api"] = ComponentHealth(
            status="unhealthy",
            details=str(e),
        )

    # Check Vector Store
    try:
        start = time.time()
        vector_store = VectorStoreClient()
        count = vector_store.count()
        latency = (time.time() - start) * 1000
        components["vector_store"] = ComponentHealth(
            status="healthy",
            latency_ms=latency,
            details=f"ChromaDB connected, {count} documents",
        )
    except Exception as e:
        components["vector_store"] = ComponentHealth(
            status="unhealthy",
            details=str(e),
        )

    # Check Database (if configured)
    if settings.database_url:
        try:
            components["database"] = ComponentHealth(
                status="healthy",
                details="PostgreSQL configured",
            )
        except Exception as e:
            components["database"] = ComponentHealth(
                status="degraded",
                details=str(e),
            )

    # Determine overall status
    statuses = [c.status for c in components.values()]
    if all(s == "healthy" for s in statuses):
        overall_status = "healthy"
    elif any(s == "unhealthy" for s in statuses):
        overall_status = "unhealthy"
    else:
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        components=components,
        version=settings.app_version,
    )


# ═══════════════════════════════════════════════════════════════
# Query Endpoint (BSG Mandatory)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/query",
    response_model=QueryResponse,
    tags=["Inference"],
    summary="Consulta al sistema RAG",
    responses={
        401: {"model": ErrorResponse, "description": "No autorizado"},
        422: {"model": ErrorResponse, "description": "Error de validación"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
    },
)
@limiter.limit("30/minute")
async def query(
    http_request: Request,
    request: QueryRequest,
    user: dict = Depends(get_current_user),
) -> QueryResponse:
    """
    Recibe una consulta en lenguaje natural, ejecuta el pipeline RAG
    y retorna una respuesta generada con referencias a las fuentes.

    Rate limited to 30 requests per minute per IP.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    start_time = time.time()

    # Validate input against prompt injection
    validate_input(request.query)

    # Execute RAG query
    logger.info(
        "Processing query",
        extra={
            "query_length": len(request.query),
            "user_id": user.get("sub"),
        }
    )

    try:
        result = await orchestrator.query_with_rag(
            query=request.query,
            doc_type=request.context_filter.get("doc_type") if request.context_filter else None,
        )

        # Format sources
        sources = []
        if request.include_sources:
            for doc in result.get("documents", []):
                sources.append(SourceDocument(
                    document_id=doc.get("metadata", {}).get("doc_id", "unknown"),
                    chunk_text=doc["content"][:500],
                    similarity_score=doc["similarity_score"],
                    metadata=doc.get("metadata", {}),
                ))

        latency_ms = (time.time() - start_time) * 1000

        return QueryResponse(
            response=result.get("context", "No se encontró información relevante."),
            sources=sources,
            tokens_used=0,  # RAG query doesn't use LLM tokens
            latency_ms=latency_ms,
            session_id=request.session_id,
        )

    except Exception as e:
        logger.exception("Query failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ═══════════════════════════════════════════════════════════════
# Ingest Endpoint (BSG Mandatory)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/ingest",
    response_model=IngestResponse,
    tags=["Ingestion"],
    summary="Ingesta de documentos al vector store",
    responses={
        401: {"model": ErrorResponse, "description": "No autorizado"},
        422: {"model": ErrorResponse, "description": "Error de validación"},
    },
)
async def ingest(
    request: IngestRequest,
    user: dict = Depends(get_current_user),
) -> IngestResponse:
    """
    Carga documentos al vector store para búsqueda RAG.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    logger.info(
        "Processing ingestion",
        extra={
            "documents_count": len(request.documents),
            "source_type": request.source_type,
            "user_id": user.get("sub"),
        }
    )

    try:
        # Convert to Document objects
        documents = [
            Document(
                content=doc.content,
                metadata={
                    **doc.metadata,
                    "source_type": request.source_type,
                    "language": "es",
                },
                doc_id=doc.doc_id,
            )
            for doc in request.documents
        ]

        # Run ingestion
        stats = ingestion_pipeline.ingest_documents(documents)

        return IngestResponse(
            status="success",
            indexed_docs=stats["documents_processed"],
            chunks_created=stats["chunks_created"],
            errors=[],
        )

    except Exception as e:
        logger.exception("Ingestion failed")
        return IngestResponse(
            status="failed",
            indexed_docs=0,
            chunks_created=0,
            errors=[str(e)],
        )


# ═══════════════════════════════════════════════════════════════
# Session Management (Real-Time Support)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/sessions",
    response_model=SessionResponse,
    tags=["Sessions"],
    summary="Create new consultation session",
)
async def create_session(
    request: SessionCreateRequest,
    user: dict = Depends(get_current_user),
) -> SessionResponse:
    """
    Create a new consultation session for WebSocket streaming.

    Returns session_id and WebSocket URL for connection.
    Use the WebSocket URL to start real-time audio streaming.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        # Get Redis client
        redis = await get_redis_client()

        # Generate session ID
        session_id = f"session_{uuid.uuid4().hex[:12]}"

        # Create session in Redis
        session_data = {
            "session_id": session_id,
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "appointment_id": request.appointment_id,
            "patient_id": request.patient_id,
            "doctor_id": request.doctor_id,
            "specialty": request.specialty,
            "user_id": user.get("sub"),
            "metadata": request.metadata,
            "audio_duration_seconds": 0.0,
            "transcription_chunks": 0,
            "entities_extracted": 0,
            "validations_performed": 0,
            "cost_usd": 0.0,
        }

        # Store in Redis with 2-hour TTL
        redis_key = f"session:{session_id}"
        await redis.setex(redis_key, 7200, json.dumps(session_data))

        # Build WebSocket URL
        websocket_url = f"{settings.websocket_base_url}/ws/session?session_id={session_id}"

        logger.info(
            "Session created",
            extra={
                "session_id": session_id,
                "user_id": user.get("sub"),
                "appointment_id": request.appointment_id,
            }
        )

        return SessionResponse(
            session=SessionStatus(
                session_id=session_id,
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                appointment_id=request.appointment_id,
                patient_id=request.patient_id,
                doctor_id=request.doctor_id,
                specialty=request.specialty,
                websocket_url=websocket_url,
                is_connected=False,
            ),
            message=f"Session created. Connect to {websocket_url} to start streaming."
        )

    except Exception as e:
        logger.exception("Session creation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    tags=["Sessions"],
    summary="Get session status",
)
async def get_session(
    session_id: str,
    user: dict = Depends(get_current_user),
) -> SessionResponse:
    """
    Get current status and statistics for a session.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        # Get Redis client
        redis = await get_redis_client()

        redis_key = f"session:{session_id}"
        session_data = await redis.get(redis_key)

        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        data = json.loads(session_data)

        # Check if user owns this session
        if data.get("user_id") != user.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        # Check WebSocket connection status
        conn_manager = get_connection_manager()
        is_connected = conn_manager.is_connected(session_id)

        return SessionResponse(
            session=SessionStatus(
                session_id=data["session_id"],
                status=data["status"],
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.fromisoformat(data["updated_at"]),
                appointment_id=data.get("appointment_id"),
                patient_id=data.get("patient_id"),
                doctor_id=data.get("doctor_id"),
                specialty=data.get("specialty", "medicina general"),
                audio_duration_seconds=data.get("audio_duration_seconds", 0.0),
                transcription_chunks=data.get("transcription_chunks", 0),
                entities_extracted=data.get("entities_extracted", 0),
                validations_performed=data.get("validations_performed", 0),
                cost_usd=data.get("cost_usd", 0.0),
                websocket_url=f"{settings.websocket_base_url}/ws/session?session_id={session_id}",
                is_connected=is_connected,
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Get session failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    tags=["Sessions"],
    summary="List user sessions",
)
async def list_sessions(
    user: dict = Depends(get_current_user),
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> SessionListResponse:
    """
    List all sessions for the current user.
    Supports pagination and status filtering.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        # Get Redis client
        redis = await get_redis_client()

        # Scan Redis for user sessions (in production, use a proper index)
        user_id = user.get("sub")
        pattern = "session:*"
        cursor = 0
        sessions = []

        # Scan Redis keys
        while True:
            cursor, keys = await redis.scan(cursor, match=pattern, count=100)
            for key in keys:
                data_str = await redis.get(key)
                if data_str:
                    data = json.loads(data_str)
                    if data.get("user_id") == user_id:
                        if status_filter is None or data.get("status") == status_filter:
                            sessions.append(SessionStatus(
                                session_id=data["session_id"],
                                status=data["status"],
                                created_at=datetime.fromisoformat(data["created_at"]),
                                updated_at=datetime.fromisoformat(data["updated_at"]),
                                appointment_id=data.get("appointment_id"),
                                patient_id=data.get("patient_id"),
                                doctor_id=data.get("doctor_id"),
                                specialty=data.get("specialty", "medicina general"),
                                audio_duration_seconds=data.get("audio_duration_seconds", 0.0),
                                transcription_chunks=data.get("transcription_chunks", 0),
                                entities_extracted=data.get("entities_extracted", 0),
                                validations_performed=data.get("validations_performed", 0),
                                cost_usd=data.get("cost_usd", 0.0),
                            ))

            if cursor == 0:
                break

        # Sort by created_at descending
        sessions.sort(key=lambda s: s.created_at, reverse=True)

        # Paginate
        total = len(sessions)
        start = (page - 1) * page_size
        end = start + page_size
        page_sessions = sessions[start:end]

        return SessionListResponse(
            sessions=page_sessions,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.exception("List sessions failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.delete(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    tags=["Sessions"],
    summary="Delete session",
)
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user),
) -> SessionResponse:
    """
    Delete a session and cleanup all associated data.
    Disconnects WebSocket if still connected.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        # Get Redis client and connection manager
        redis = await get_redis_client()
        conn_manager = get_connection_manager()

        redis_key = f"session:{session_id}"
        session_data = await redis.get(redis_key)

        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        data = json.loads(session_data)

        # Check ownership
        if data.get("user_id") != user.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        # Disconnect WebSocket if connected
        if conn_manager.is_connected(session_id):
            await conn_manager.disconnect(session_id)

        # Delete session data
        await redis.delete(redis_key)

        # Delete related state (speaker state, transcript state, etc.)
        await redis.delete(f"speaker_state:{session_id}")
        await redis.delete(f"transcript_state:{session_id}")
        await redis.delete(f"extraction_state:{session_id}")

        logger.info(
            "Session deleted",
            extra={"session_id": session_id, "user_id": user.get("sub")}
        )

        return SessionResponse(
            session=SessionStatus(
                session_id=session_id,
                status="deleted",
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.utcnow(),
            ),
            message="Session deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Delete session failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ═══════════════════════════════════════════════════════════════
# Transcribe Endpoint (LEGACY - Batch Mode)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    tags=["Medical"],
    summary="Transcribe audio médico en español",
)
async def transcribe(
    request: TranscribeRequest,
    user: dict = Depends(get_current_user),
) -> TranscribeResponse:
    """
    Transcribe audio de consultas médicas usando Whisper.
    Optimizado para español con VAD para reducción de costos.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(request.audio_base64)

        # Transcribe
        result = await orchestrator.transcription_service.transcribe(
            audio_data=audio_bytes,
            language=request.language,
            use_vad=request.use_vad,
            appointment_id=request.appointment_id,
        )

        return TranscribeResponse(
            text=result.text,
            segments=[
                TranscriptionSegment(
                    start=seg.start,
                    end=seg.end,
                    text=seg.text,
                )
                for seg in result.segments
            ],
            language=result.language,
            duration_seconds=result.duration_seconds,
            cost_usd=result.cost_usd,
        )

    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ═══════════════════════════════════════════════════════════════
# Extract Endpoint (Additional - Medical specific)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/extract",
    response_model=ExtractResponse,
    tags=["Medical"],
    summary="Extrae información médica de transcripción",
)
async def extract(
    request: ExtractRequest,
    user: dict = Depends(get_current_user),
) -> ExtractResponse:
    """
    Extrae información médica estructurada de una transcripción.
    Incluye validación RAG para medicamentos y sugerencias CIE-10.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        result = await orchestrator.process_consultation(
            transcription_text=request.transcription,
            specialty=request.specialty,
            validate_with_rag=request.validate_with_rag,
            appointment_id=request.appointment_id,
        )

        enriched = result.enriched_extraction

        # Format medications with validation
        medications = []
        for i, med in enumerate(enriched.extraction.medications):
            validation = None
            if i < len(enriched.medication_validations):
                v = enriched.medication_validations[i]
                validation = MedicationValidation(
                    status="VALIDATED" if v.is_valid else "UNVERIFIED",
                    rag_confidence=v.rag_confidence,
                    correct_dosage_range=v.correct_dosage_range,
                    warnings=v.warnings,
                )

            medications.append(ExtractedMedication(
                name=med.name,
                dosage=med.dosage,
                frequency=med.frequency,
                validation=validation,
            ))

        # Format interactions
        interactions = [
            DrugInteractionAlert(
                medications=[i.medication_a, i.medication_b],
                severity=i.severity,
                description=i.description,
                recommendation=i.recommendation,
            )
            for i in enriched.drug_interactions
        ]

        # Format CIE-10 suggestions
        cie10 = [
            CIE10Suggestion(
                code=s.code,
                description=s.description,
                confidence=s.confidence,
            )
            for s in enriched.cie10_suggestions
        ]

        return ExtractResponse(
            chief_complaint=enriched.extraction.chief_complaint,
            medications=medications,
            symptoms=[s.model_dump() for s in enriched.extraction.symptoms],
            diagnoses=[d.model_dump() for d in enriched.extraction.diagnoses],
            drug_interactions=interactions,
            cie10_suggestions=cie10,
            confidence_score=enriched.extraction.confidence_score,
            tokens_used=0,  # TODO: Get from extraction result
            cost_usd=result.total_cost_usd,
        )

    except Exception as e:
        logger.exception("Extraction failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
```

### 3. Create Security Module

Create `ai-service/src/security/auth.py`:

```python
"""
Autenticación JWT para la API.
"""
from datetime import datetime, timedelta

from jose import JWTError, jwt
from fastapi import HTTPException, status

from src.core.config import get_settings
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


def create_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

Create `ai-service/src/security/guardrails.py`:

```python
"""
Guardrails para validación de input/output.
Protege contra prompt injection y contenido inapropiado.
"""
import re
from fastapi import HTTPException, status

from src.utils.logger import get_logger

logger = get_logger(__name__)

# Patterns that might indicate prompt injection
INJECTION_PATTERNS = [
    r"ignore\s+(previous|above|all)\s+instructions",
    r"disregard\s+(previous|above|all)",
    r"you\s+are\s+now",
    r"new\s+instructions",
    r"forget\s+(everything|all)",
    r"system\s*:\s*",
    r"assistant\s*:\s*",
]


def validate_input(text: str) -> None:
    """
    Validate input text for potential injection attacks.
    Raises HTTPException if suspicious patterns detected.
    """
    text_lower = text.lower()

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text_lower):
            logger.warning(
                "Potential prompt injection detected",
                extra={"pattern": pattern, "text_preview": text[:100]},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input contains potentially harmful content",
            )


def sanitize_output(text: str) -> str:
    """
    Sanitize LLM output to remove potential PII or sensitive data.
    """
    # Remove common PII patterns (basic implementation)
    # DNI pattern (Spanish)
    text = re.sub(r"\b\d{8}[A-Z]\b", "[DNI REDACTED]", text)
    # Phone numbers
    text = re.sub(r"\b\d{9}\b", "[PHONE REDACTED]", text)
    # Email
    text = re.sub(r"\b[\w.-]+@[\w.-]+\.\w+\b", "[EMAIL REDACTED]", text)

    return text
```

## Expected Deliverables

1. `ai-service/src/api/schemas.py` - Pydantic models for all endpoints (including session management)
2. `ai-service/src/api/routes.py` - API route implementations (REST + session CRUD)
3. `ai-service/src/security/auth.py` - JWT authentication
4. `ai-service/src/security/guardrails.py` - Input validation and PII protection

## Verification Steps

### BSG Mandatory Endpoints
1. `/api/v1/health` returns component status without auth
2. `/api/v1/query` requires auth and returns RAG results
3. `/api/v1/ingest` successfully indexes documents

### Session Management Endpoints
4. `POST /api/v1/sessions` creates session and returns WebSocket URL
5. `GET /api/v1/sessions/{session_id}` returns session status and stats
6. `GET /api/v1/sessions` lists user sessions with pagination
7. `DELETE /api/v1/sessions/{session_id}` deletes session and disconnects WebSocket

### Legacy Batch Endpoints (Optional)
8. `/api/v1/transcribe` processes complete audio files (batch mode)
9. `/api/v1/extract` processes complete transcriptions (batch mode)

### General Requirements
10. All endpoints have proper error handling
11. Session ownership verified (users can only access their own sessions)
12. Session data persists in Redis with 2-hour TTL
13. Deleting session cleans up all associated state (speaker, transcript, etc.)

## Notes

### Architecture
- **Dual API**: REST for batch + session management, WebSocket for real-time streaming
- **Recommended approach**: Use WebSocket (`/ws/session`) for live consultations
- **Legacy endpoints**: `/transcribe` and `/extract` supported for batch processing only
- **Session lifecycle**: Create → Connect WebSocket → Stream → Finalize → Delete

### Authentication
- Health endpoint is public (no auth required per BSG spec)
- All other endpoints require JWT authentication
- Sessions are user-scoped (users can only access their own sessions)

### Security
- Guardrails protect against prompt injection
- All endpoints log requests with user IDs and request IDs
- PII sanitization on LLM outputs

### Session Management
- Sessions stored in Redis with 2-hour TTL
- Session includes real-time statistics (audio duration, chunks, entities, cost)
- WebSocket connection status tracked via ConnectionManager
- Deleting session cleans up all associated Redis keys:
  - `session:{session_id}` - Main session data
  - `speaker_state:{session_id}` - Speaker diarization state
  - `transcript_state:{session_id}` - Incremental transcript state

### Integration with WebSocket (Prompt 25)
- Session management endpoints provide lifecycle for WebSocket connections
- `POST /sessions` returns `websocket_url` for connection
- `GET /sessions/{session_id}` shows real-time stats from streaming
- `DELETE /sessions/{session_id}` disconnects active WebSocket
