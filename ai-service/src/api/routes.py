"""
API routes for MedRecord AI Service.
Implements BSG mandatory endpoints, session management, and legacy batch endpoints.
"""
import base64
import json
import time
import uuid
from datetime import datetime

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.api.schemas import (
    CIE10Suggestion,
    ComponentHealth,
    DrugInteractionAlert,
    ErrorResponse,
    ExtractedMedication,
    ExtractRequest,
    ExtractResponse,
    HealthResponse,
    IngestRequest,
    IngestResponse,
    MedicationValidation,
    QueryRequest,
    QueryResponse,
    SessionCreateRequest,
    SessionListResponse,
    SessionResponse,
    SessionStatus,
    SourceDocument,
    TranscribeRequest,
    TranscribeResponse,
    TranscriptionSegment,
)
from src.core.config import get_settings
from src.rag.ingestion import Document, IngestionPipeline
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

# Lazy-instantiated singletons (services may depend on later prompts).
_orchestrator = None
_retriever = None
_ingestion_pipeline: IngestionPipeline | None = None
_redis_client: redis.Redis | None = None


def get_orchestrator():
    """Lazy-load orchestrator (defined in core.orchestrator from later prompt)."""
    global _orchestrator
    if _orchestrator is None:
        from src.core.orchestrator import AIOrchestrator
        _orchestrator = AIOrchestrator()
    return _orchestrator


def get_retriever():
    """Lazy-load retriever service."""
    global _retriever
    if _retriever is None:
        from src.rag.retriever import RetrieverService
        _retriever = RetrieverService()
    return _retriever


def get_ingestion_pipeline() -> IngestionPipeline:
    """Lazy-load ingestion pipeline."""
    global _ingestion_pipeline
    if _ingestion_pipeline is None:
        _ingestion_pipeline = IngestionPipeline()
    return _ingestion_pipeline


async def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = await redis.from_url(
            settings.redis_url or "redis://redis:6379",
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


def get_connection_manager():
    """Get WebSocket connection manager (defined in Prompt 25)."""
    from src.api.websocket.manager import connection_manager
    return connection_manager


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
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
    components: dict[str, ComponentHealth] = {}

    # Check LLM API
    try:
        start = time.time()
        llm_ok = bool(settings.openai_api_key)
        latency = (time.time() - start) * 1000
        components["llm_api"] = ComponentHealth(
            status="healthy" if llm_ok else "unhealthy",
            latency_ms=latency,
            details="OpenAI API configured" if llm_ok else "API key missing",
        )
    except Exception as e:
        components["llm_api"] = ComponentHealth(status="unhealthy", details=str(e))

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
        components["vector_store"] = ComponentHealth(status="unhealthy", details=str(e))

    # Check Database (if configured)
    if settings.database_url:
        try:
            components["database"] = ComponentHealth(
                status="healthy",
                details="PostgreSQL configured",
            )
        except Exception as e:
            components["database"] = ComponentHealth(status="degraded", details=str(e))

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
    request: Request,
    payload: QueryRequest,
    user: dict | None = Depends(get_current_user),
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

    validate_input(payload.query)

    logger.info(
        "Processing query",
        extra={"query_length": len(payload.query), "user_id": user.get("sub")},
    )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.query_with_rag(
            query=payload.query,
            doc_type=payload.context_filter.get("doc_type") if payload.context_filter else None,
        )

        sources: list[SourceDocument] = []
        if payload.include_sources:
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
            tokens_used=0,
            latency_ms=latency_ms,
            session_id=payload.session_id,
        )

    except HTTPException:
        raise
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
    user: dict | None = Depends(get_current_user),
) -> IngestResponse:
    """Carga documentos al vector store para búsqueda RAG."""
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
        },
    )

    try:
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

        pipeline = get_ingestion_pipeline()
        stats = pipeline.ingest_documents(documents)

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
    user: dict | None = Depends(get_current_user),
) -> SessionResponse:
    """
    Create a new consultation session for WebSocket streaming.
    Returns session_id and WebSocket URL for connection.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        client = await get_redis_client()
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow()

        session_data = {
            "session_id": session_id,
            "status": "active",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
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
        await client.setex(redis_key, 7200, json.dumps(session_data))

        websocket_url = f"{settings.websocket_base_url}/ws/session?session_id={session_id}"

        logger.info(
            "Session created",
            extra={
                "session_id": session_id,
                "user_id": user.get("sub"),
                "appointment_id": request.appointment_id,
            },
        )

        return SessionResponse(
            session=SessionStatus(
                session_id=session_id,
                status="active",
                created_at=now,
                updated_at=now,
                appointment_id=request.appointment_id,
                patient_id=request.patient_id,
                doctor_id=request.doctor_id,
                specialty=request.specialty,
                websocket_url=websocket_url,
                is_connected=False,
            ),
            message=f"Session created. Connect to {websocket_url} to start streaming.",
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
    user: dict | None = Depends(get_current_user),
) -> SessionResponse:
    """Get current status and statistics for a session."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        client = await get_redis_client()
        redis_key = f"session:{session_id}"
        session_data = await client.get(redis_key)

        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        data = json.loads(session_data)

        if data.get("user_id") != user.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        # Check WebSocket connection status (best-effort)
        is_connected = False
        try:
            conn_manager = get_connection_manager()
            is_connected = conn_manager.is_connected(session_id)
        except Exception:
            is_connected = False

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
    user: dict | None = Depends(get_current_user),
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> SessionListResponse:
    """List all sessions for the current user. Supports pagination and status filtering."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        client = await get_redis_client()
        user_id = user.get("sub")
        pattern = "session:*"
        cursor = 0
        sessions: list[SessionStatus] = []

        while True:
            cursor, keys = await client.scan(cursor, match=pattern, count=100)
            for key in keys:
                data_str = await client.get(key)
                if not data_str:
                    continue
                data = json.loads(data_str)
                if data.get("user_id") != user_id:
                    continue
                if status_filter is not None and data.get("status") != status_filter:
                    continue
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

        sessions.sort(key=lambda s: s.created_at, reverse=True)

        total = len(sessions)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_sessions = sessions[start_idx:end_idx]

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
    user: dict | None = Depends(get_current_user),
) -> SessionResponse:
    """Delete a session and cleanup all associated data."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        client = await get_redis_client()
        redis_key = f"session:{session_id}"
        session_data = await client.get(redis_key)

        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        data = json.loads(session_data)

        if data.get("user_id") != user.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        # Disconnect WebSocket if connected (best-effort)
        try:
            conn_manager = get_connection_manager()
            if conn_manager.is_connected(session_id):
                await conn_manager.disconnect(session_id)
        except Exception:
            pass

        # Delete session and related state
        await client.delete(redis_key)
        await client.delete(f"speaker_state:{session_id}")
        await client.delete(f"transcript_state:{session_id}")
        await client.delete(f"extraction_state:{session_id}")

        logger.info(
            "Session deleted",
            extra={"session_id": session_id, "user_id": user.get("sub")},
        )

        return SessionResponse(
            session=SessionStatus(
                session_id=session_id,
                status="deleted",
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.utcnow(),
            ),
            message="Session deleted successfully",
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
    user: dict | None = Depends(get_current_user),
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
        audio_bytes = base64.b64decode(request.audio_base64)

        orchestrator = get_orchestrator()
        result = await orchestrator.transcription_service.transcribe(
            audio_data=audio_bytes,
            language=request.language,
            use_vad=request.use_vad,
            appointment_id=request.appointment_id,
        )

        return TranscribeResponse(
            text=result.text,
            segments=[
                TranscriptionSegment(start=seg.start, end=seg.end, text=seg.text)
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
# Extract Endpoint (LEGACY - Batch Mode)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/extract",
    response_model=ExtractResponse,
    tags=["Medical"],
    summary="Extrae información médica de transcripción",
)
async def extract(
    request: ExtractRequest,
    user: dict | None = Depends(get_current_user),
) -> ExtractResponse:
    """Extrae información médica estructurada de una transcripción."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.process_consultation(
            transcription_text=request.transcription,
            specialty=request.specialty,
            validate_with_rag=request.validate_with_rag,
            appointment_id=request.appointment_id,
        )

        enriched = result.enriched_extraction

        medications: list[ExtractedMedication] = []
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

        interactions = [
            DrugInteractionAlert(
                medications=[i.medication_a, i.medication_b],
                severity=i.severity,
                description=i.description,
                recommendation=i.recommendation,
            )
            for i in enriched.drug_interactions
        ]

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
            tokens_used=0,
            cost_usd=result.total_cost_usd,
        )

    except Exception as e:
        logger.exception("Extraction failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
