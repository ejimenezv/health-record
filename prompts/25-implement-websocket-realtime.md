# Prompt 25: Implement WebSocket Real-Time Streaming (Event-Driven Architecture)

## Objective
Implement WebSocket endpoint for real-time bidirectional streaming during medical consultations, orchestrating incremental transcription, diarization, extraction, and RAG validation with event-driven architecture.

## Context

**⚠️ EVENT-DRIVEN REAL-TIME ARCHITECTURE**

This is the WebSocket Gateway that orchestrates the complete real-time pipeline:

**Integration Points:**
- **Stream Processor** (Prompt 17): Receives audio chunks → emits transcript chunks
- **Incremental Diarization** (Prompt 18): Speaker identification → emits speaker_changed events
- **Incremental Extraction** (Prompt 19): Entity extraction → emits extraction_update events
- **Async RAG Pipeline** (Prompt 20): Non-blocking retrieval for validation
- **RAG Validation Coordinator** (Prompt 21): Priority-based validation → emits validation_alert events
- **Streaming Cost Optimization** (Prompt 22): Chunk-level caching for cost reduction

**Event-Driven Benefits:**
- **Incremental results**: Users see entities/validations as they're extracted (not at end)
- **Safety-critical alerts**: Drug interactions <1s via CRITICAL priority queue
- **Progressive UX**: Live updating dashboard during consultation
- **Lower latency**: No waiting for complete consultation to see results
- **Cost efficiency**: 68% cost reduction via streaming-aware caching

## Tasks

### 1. Create WebSocket Connection Manager
Create `ai-service/src/api/websocket/manager.py`:

```python
from typing import Dict, Set, Optional
from fastapi import WebSocket
import structlog
import asyncio
from datetime import datetime

logger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections for transcription sessions."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str
    ) -> bool:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()

        async with self._lock:
            # Check if session already has active connection
            if session_id in self.active_connections:
                logger.warning(
                    "Session already has active connection",
                    session_id=session_id
                )
                return False

            self.active_connections[session_id] = websocket
            self.session_data[session_id] = {
                "user_id": user_id,
                "connected_at": datetime.utcnow(),
                "chunks_received": 0,
                "total_audio_ms": 0
            }

            logger.info(
                "WebSocket connected",
                session_id=session_id,
                user_id=user_id
            )
            return True

    async def disconnect(self, session_id: str):
        """Remove a WebSocket connection."""
        async with self._lock:
            if session_id in self.active_connections:
                del self.active_connections[session_id]
                del self.session_data[session_id]
                logger.info("WebSocket disconnected", session_id=session_id)

    async def send_json(self, session_id: str, data: dict):
        """Send JSON data to a specific session."""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(data)
            except Exception as e:
                logger.error(
                    "Failed to send WebSocket message",
                    session_id=session_id,
                    error=str(e)
                )
                await self.disconnect(session_id)

    async def broadcast(self, data: dict, exclude: Optional[Set[str]] = None):
        """Broadcast message to all connected sessions."""
        exclude = exclude or set()
        for session_id in list(self.active_connections.keys()):
            if session_id not in exclude:
                await self.send_json(session_id, data)

    def is_connected(self, session_id: str) -> bool:
        """Check if session has active connection."""
        return session_id in self.active_connections

    def get_session_stats(self, session_id: str) -> Optional[dict]:
        """Get statistics for a session."""
        return self.session_data.get(session_id)


# Singleton instance
connection_manager = ConnectionManager()
```

### 2. Create Service Dependencies Module

Create `ai-service/src/api/dependencies.py`:

```python
"""
Dependency injection for API services.
Provides shared instances of services used across WebSocket and REST endpoints.
"""
from dataclasses import dataclass
from typing import Optional

import redis.asyncio as redis

from src.core.config import get_settings
from src.services.cache import ResponseCache
from src.rag.retriever import RetrieverService

settings = get_settings()


@dataclass
class Services:
    """Container for shared service instances."""
    redis: redis.Redis
    cache: ResponseCache
    rag_retriever: RetrieverService


_services: Optional[Services] = None


async def get_services() -> Services:
    """
    Get or create shared service instances.

    Returns:
        Services container with Redis, cache, and RAG retriever.
    """
    global _services

    if _services is None:
        redis_client = await redis.from_url(
            settings.redis_url or "redis://redis:6379",
            encoding="utf-8",
            decode_responses=False,  # Binary data for audio
        )

        cache = ResponseCache(redis_url=settings.redis_url)
        rag_retriever = RetrieverService()

        _services = Services(
            redis=redis_client,
            cache=cache,
            rag_retriever=rag_retriever,
        )

    return _services


async def cleanup_services() -> None:
    """Cleanup services on shutdown."""
    global _services
    if _services and _services.redis:
        await _services.redis.close()
    _services = None
```

### 3. Create WebSocket Endpoint (Event-Driven Orchestration)
Create `ai-service/src/api/websocket/streaming.py`:

```python
"""
WebSocket endpoint for real-time streaming consultations.
Orchestrates event-driven pipeline: transcription → diarization → extraction → validation.

IMPORTANT: This module depends on services from prompts 17-22:
- StreamProcessor (Prompt 17): Audio → Transcription
- IncrementalDiarizer (Prompt 18): Speaker identification
- IncrementalExtractor (Prompt 19): Entity extraction
- RAGValidationCoordinator (Prompt 21): Async validation with priority queues

Ensure these modules are implemented before running this endpoint.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional, TYPE_CHECKING
import structlog
import asyncio
import json
from datetime import datetime

from src.api.websocket.manager import connection_manager
from src.api.dependencies import get_services, Services
from src.security.websocket_auth import verify_websocket_token

# Type hints for pipeline services (actual imports at runtime to avoid circular deps)
if TYPE_CHECKING:
    from src.transcription.stream_processor import StreamProcessor
    from src.transcription.diarization import IncrementalDiarizer, SpeakerChangeEvent
    from src.extraction.incremental_extractor import IncrementalExtractor
    from src.rag.validation_coordinator import RAGValidationCoordinator, ValidationEvent

logger = structlog.get_logger()
router = APIRouter()


def _import_pipeline_services():
    """
    Lazily import pipeline services to avoid circular dependencies.
    These services are defined in prompts 17-22.
    """
    from src.transcription.stream_processor import StreamProcessor
    from src.transcription.diarization import IncrementalDiarizer, SpeakerChangeEvent
    from src.extraction.incremental_extractor import IncrementalExtractor
    from src.rag.validation_coordinator import RAGValidationCoordinator, ValidationEvent

    return {
        "StreamProcessor": StreamProcessor,
        "IncrementalDiarizer": IncrementalDiarizer,
        "SpeakerChangeEvent": SpeakerChangeEvent,
        "IncrementalExtractor": IncrementalExtractor,
        "RAGValidationCoordinator": RAGValidationCoordinator,
        "ValidationEvent": ValidationEvent,
    }


@router.websocket("/ws/session")
async def websocket_streaming(
    websocket: WebSocket,
    session_id: str = Query(..., description="Session ID from POST /api/v1/sessions"),
    token: str = Query(..., description="JWT authentication token"),
    services: Services = Depends(get_services),
):
    """
    WebSocket endpoint for real-time streaming consultations.

    **Event-Driven Architecture:**
    Audio → Stream Processor → Incremental Diarizer → Incremental Extractor
                                     ↓                         ↓
                               speaker_changed           extraction_update
                                                              ↓
                                                      RAG Validation
                                                      Coordinator
                                                              ↓
                                                      validation_alert

    Protocol:
    1. Client connects with session_id and JWT token
    2. Client streams binary audio chunks (Opus codec, ~20ms frames)
    3. Server processes through event-driven pipeline
    4. Server emits real-time events as processing occurs
    5. Client sends "finalize" message to end session
    6. Server sends "session_complete" with final results

    Event Types (Server → Client):
    - transcript_update: New transcription text (from Stream Processor)
    - speaker_changed: Speaker identification update (from Diarizer)
    - extraction_update: Incremental entity extracted (from Extractor)
    - validation_alert: Safety alert - drug interactions (from Validator, CRITICAL <1s)
    - entity_validated: Entity validation result (from Validator)
    - cost_update: Running cost information (from Cache)
    - session_complete: Final results
    - error: Error message

    Message Types (Client → Server):
    - Binary: Audio chunk data (Opus codec)
    - JSON {"type": "finalize"}: End session and get results
    - JSON {"type": "ping"}: Keep-alive
    """
    # Verify token
    try:
        user_data = await verify_websocket_token(token)
    except Exception as e:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Connect
    connected = await connection_manager.connect(
        websocket=websocket,
        session_id=session_id,
        user_id=user_data.user_id
    )

    if not connected:
        await websocket.close(code=4002, reason="Session already active")
        return

    # Import pipeline services lazily (defined in prompts 17-22)
    try:
        pipeline = _import_pipeline_services()
        StreamProcessor = pipeline["StreamProcessor"]
        IncrementalDiarizer = pipeline["IncrementalDiarizer"]
        IncrementalExtractor = pipeline["IncrementalExtractor"]
        RAGValidationCoordinator = pipeline["RAGValidationCoordinator"]
        ValidationEvent = pipeline["ValidationEvent"]
    except ImportError as e:
        logger.error(
            "Pipeline services not available. Ensure prompts 17-22 are implemented.",
            error=str(e)
        )
        await connection_manager.send_json(session_id, {
            "type": "error",
            "message": "Pipeline services not available. Contact support.",
            "error_code": "PIPELINE_NOT_READY"
        })
        await connection_manager.disconnect(session_id)
        return

    # Initialize event-driven pipeline services
    stream_processor = StreamProcessor(
        session_id=session_id,
        redis_client=services.redis,
        cache=services.cache
    )

    # Incremental diarizer with event callback
    async def on_speaker_change(event):
        """Emit speaker change event to client."""
        await connection_manager.send_json(session_id, {
            "type": "speaker_changed",
            "previous_speaker_id": event.previous_speaker_id,
            "new_speaker_id": event.new_speaker_id,
            "new_speaker_role": event.new_speaker_role.value if hasattr(event.new_speaker_role, 'value') else event.new_speaker_role,
            "confidence": event.confidence,
            "timestamp": event.timestamp
        })

    diarizer = IncrementalDiarizer(
        redis_client=services.redis,
        event_callback=on_speaker_change
    )

    # Incremental extractor with event callback
    async def on_extraction_update(entity_type: str, entity: dict, speaker_id: str, timestamp: float):
        """Emit extraction update event to client."""
        await connection_manager.send_json(session_id, {
            "type": "extraction_update",
            "entity_type": entity_type,
            "entity": entity,
            "speaker_id": speaker_id,
            "timestamp": timestamp
        })

    extractor = IncrementalExtractor(
        redis_client=services.redis,
        event_callback=on_extraction_update
    )

    # RAG validation coordinator with event callback
    async def on_validation_event(event):
        """
        Emit validation alert to client based on priority.

        The event contains validation results from RAGValidationCoordinator.
        Event types: medication_validated, interaction_alert, cie10_suggested
        """
        try:
            # Get priority value safely
            priority_value = event.priority.value if hasattr(event.priority, 'value') else str(event.priority)

            if priority_value.lower() == "critical":
                # Drug interaction alert - CRITICAL <1s
                # Extract data from event.data dict
                event_data = event.data if hasattr(event, 'data') else {}
                await connection_manager.send_json(session_id, {
                    "type": "validation_alert",
                    "alert_type": "drug_interaction",
                    "severity": "CRITICAL",
                    "medications": event_data.get("medications", []),
                    "description": event_data.get("description", ""),
                    "recommendation": event_data.get("recommendation", ""),
                    "timestamp": event.timestamp,
                    "processing_time_ms": getattr(event, 'processing_time_ms', 0)
                })
            else:
                # Entity validation result
                event_data = event.data if hasattr(event, 'data') else {}
                status_value = event_data.get("status", "UNKNOWN")
                if hasattr(status_value, 'value'):
                    status_value = status_value.value

                await connection_manager.send_json(session_id, {
                    "type": "entity_validated",
                    "entity_type": event.type,
                    "entity_name": event_data.get("medication_name") or event_data.get("entity_name", ""),
                    "validation_status": status_value,
                    "rag_confidence": event_data.get("rag_confidence", 0.0),
                    "warnings": event_data.get("warnings", []),
                    "timestamp": event.timestamp
                })
        except Exception as e:
            logger.error(
                "Failed to emit validation event",
                session_id=session_id,
                error=str(e)
            )

    validation_coordinator = RAGValidationCoordinator(
        retriever_service=services.rag_retriever,
        redis_client=services.redis,
        event_callback=on_validation_event
    )

    try:
        # Send connection confirmation
        await connection_manager.send_json(session_id, {
            "type": "connected",
            "session_id": session_id,
            "message": "Conexión establecida. Puede comenzar a enviar audio."
        })

        while True:
            # Receive message (binary audio or JSON control)
            message = await websocket.receive()

            if "bytes" in message:
                # Process audio chunk through event-driven pipeline
                audio_data = message["bytes"]
                await process_audio_chunk(
                    session_id=session_id,
                    audio_data=audio_data,
                    stream_processor=stream_processor,
                    diarizer=diarizer,
                    extractor=extractor,
                    validation_coordinator=validation_coordinator
                )

            elif "text" in message:
                # Process control message
                try:
                    control = json.loads(message["text"])
                    msg_type = control.get("type")

                    if msg_type == "finalize":
                        # Finalize session and get complete results
                        results = await finalize_session(
                            session_id=session_id,
                            stream_processor=stream_processor,
                            diarizer=diarizer,
                            extractor=extractor,
                            validation_coordinator=validation_coordinator
                        )
                        await connection_manager.send_json(session_id, {
                            "type": "session_complete",
                            **results
                        })
                        break

                    elif msg_type == "ping":
                        await connection_manager.send_json(session_id, {
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat()
                        })

                except json.JSONDecodeError:
                    logger.warning(
                        "Invalid JSON message",
                        session_id=session_id
                    )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client", session_id=session_id)
    except Exception as e:
        logger.exception("WebSocket error", session_id=session_id, error=str(e))
        await connection_manager.send_json(session_id, {
            "type": "error",
            "message": "Error interno del servidor"
        })
    finally:
        await connection_manager.disconnect(session_id)


async def process_audio_chunk(
    session_id: str,
    audio_data: bytes,
    stream_processor: StreamProcessor,
    diarizer: IncrementalDiarizer,
    extractor: IncrementalExtractor,
    validation_coordinator: RAGValidationCoordinator
):
    """
    Process incoming audio chunk through event-driven pipeline.

    Pipeline Flow:
    1. Stream Processor: Audio → Transcription chunk (cached)
    2. Incremental Diarizer: Transcript → Speaker identification (emits speaker_changed)
    3. Incremental Extractor: Transcript + Speaker → Entities (emits extraction_update)
    4. RAG Validation: Entities → Validation (emits validation_alert/entity_validated)
    """
    try:
        # STEP 1: Stream Processor - Transcription (Prompt 17)
        # Uses chunk-level transcription caching (Prompt 22)
        transcript_result = await stream_processor.process_chunk(audio_data)

        if not transcript_result or not transcript_result.text:
            # Empty transcription (silence), skip pipeline
            return

        # Emit transcript update to client
        await connection_manager.send_json(session_id, {
            "type": "transcript_update",
            "text": transcript_result.text,
            "is_final": transcript_result.is_final,
            "timestamp": transcript_result.timestamp,
            "chunk_index": transcript_result.chunk_index
        })

        # STEP 2: Incremental Diarization (Prompt 18)
        # Identifies speaker, emits speaker_changed event via callback
        diarization_result = await diarizer.process_chunk(
            transcript_text=transcript_result.text,
            timestamp=transcript_result.timestamp,
            session_id=session_id
        )

        # STEP 3: Incremental Extraction (Prompt 19)
        # Extracts entities incrementally, emits extraction_update via callback
        extraction_result = await extractor.process_chunk(
            transcript_text=transcript_result.text,
            speaker_id=diarization_result.speaker_id,
            speaker_role=diarization_result.role,
            timestamp=transcript_result.timestamp,
            session_id=session_id
        )

        # STEP 4: RAG Validation (Prompt 21)
        # Validates entities with priority queues, emits validation_alert via callback
        # CRITICAL (drug interactions) <1s, HIGH (medications) <2s, MEDIUM (CIE-10) <3s
        if extraction_result and extraction_result.entities_extracted:
            for entity in extraction_result.entities_extracted:
                await validation_coordinator.enqueue_validation(
                    entity_type=entity.entity_type,
                    entity=entity,
                    session_id=session_id,
                    timestamp=transcript_result.timestamp
                )

        # STEP 5: Cost Update (Prompt 22)
        # Send cost update every 5 chunks
        if transcript_result.chunk_index % 5 == 0:
            cost_summary = await stream_processor.get_cost_summary()
            await connection_manager.send_json(session_id, {
                "type": "cost_update",
                "transcription_cost_usd": cost_summary.transcription_cost,
                "extraction_cost_usd": cost_summary.extraction_cost,
                "validation_cost_usd": cost_summary.validation_cost,
                "total_cost_usd": cost_summary.total_cost,
                "audio_duration_seconds": cost_summary.audio_duration_seconds
            })

        # Update session stats in Redis
        await stream_processor.update_session_stats()

    except Exception as e:
        logger.exception(
            "Audio chunk processing failed",
            session_id=session_id,
            error=str(e)
        )
        await connection_manager.send_json(session_id, {
            "type": "error",
            "message": "Error procesando audio"
        })


async def finalize_session(
    session_id: str,
    stream_processor: StreamProcessor,
    diarizer: IncrementalDiarizer,
    extractor: IncrementalExtractor,
    validation_coordinator: RAGValidationCoordinator
) -> dict:
    """
    Finalize session and return complete results.

    Aggregates incremental state from all event-driven services.
    """
    # Finalize all services
    await stream_processor.finalize(session_id)
    speaker_state = await diarizer.finalize_session(session_id)
    extraction_state = await extractor.finalize_session(session_id)
    validation_summary = await validation_coordinator.get_session_summary(session_id)

    # Get complete transcript
    transcript = await stream_processor.get_full_transcript()

    # Get diarized transcript with speaker labels
    diarized_transcript = []
    for segment in extraction_state.transcript_segments:
        speaker = speaker_state.speakers.get(segment.speaker_id)
        diarized_transcript.append({
            "speaker": segment.speaker_id,
            "speaker_role": speaker.role.value if speaker else "unknown",
            "text": segment.text,
            "start_time": segment.start_time,
            "end_time": segment.end_time
        })

    # Build extraction result
    extraction_result = {
        "chief_complaint": extraction_state.chief_complaint,
        "medications": [
            {
                "name": med.name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "validation": validation_summary.medications.get(med.name, {})
            }
            for med in extraction_state.medications
        ],
        "symptoms": [s.dict() for s in extraction_state.symptoms],
        "diagnoses": [d.dict() for d in extraction_state.diagnoses],
        "allergies": [a.dict() for a in extraction_state.allergies],
        "drug_interactions": [
            {
                "medications": interaction.medications,
                "severity": interaction.severity.value,
                "description": interaction.description,
                "recommendation": interaction.recommendation
            }
            for interaction in validation_summary.drug_interactions
        ],
        "cie10_suggestions": [
            {
                "code": suggestion.code,
                "description": suggestion.description,
                "confidence": suggestion.confidence
            }
            for suggestion in validation_summary.cie10_suggestions
        ],
        "confidence_score": extraction_state.overall_confidence
    }

    # Calculate final costs
    cost_summary = await stream_processor.get_cost_summary()

    # Get session statistics
    session_stats = await stream_processor.get_session_stats()

    logger.info(
        "Session finalized",
        session_id=session_id,
        chunks_processed=session_stats.chunks_processed,
        entities_extracted=len(extraction_state.medications) + len(extraction_state.symptoms),
        validations_performed=validation_summary.total_validations,
        total_cost_usd=cost_summary.total_cost
    )

    return {
        "transcript": transcript,
        "diarized_transcript": diarized_transcript,
        "extraction": extraction_result,
        "cost_summary": {
            "transcription_cost_usd": cost_summary.transcription_cost,
            "extraction_cost_usd": cost_summary.extraction_cost,
            "validation_cost_usd": cost_summary.validation_cost,
            "total_cost_usd": cost_summary.total_cost,
            "audio_minutes": cost_summary.audio_duration_seconds / 60,
            "cost_per_minute_usd": cost_summary.total_cost / (cost_summary.audio_duration_seconds / 60)
                if cost_summary.audio_duration_seconds > 0 else 0
        },
        "session_stats": {
            "chunks_processed": session_stats.chunks_processed,
            "transcription_segments": session_stats.transcription_segments,
            "entities_extracted": session_stats.entities_extracted,
            "validations_performed": validation_summary.total_validations,
            "audio_duration_seconds": cost_summary.audio_duration_seconds,
            "cache_hits": session_stats.cache_hits,
            "cache_hit_rate": session_stats.cache_hit_rate
        }
    }



# Note: TranscriptionBuffer has been removed. We now use event-driven services:
# - StreamProcessor (Prompt 17) for buffering and transcription
# - IncrementalDiarizer (Prompt 18) for speaker state
# - IncrementalExtractor (Prompt 19) for entity state
# - RAGValidationCoordinator (Prompt 21) for validation state
# All state is maintained in Redis for session persistence
```

### 3. Create WebSocket Authentication
Create `ai-service/src/security/websocket_auth.py`:

```python
from fastapi import HTTPException
from jose import jwt, JWTError
from src.core.config import settings
from src.security.models import TokenData


async def verify_websocket_token(token: str) -> TokenData:
    """Verify JWT token for WebSocket connections."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return TokenData(
            user_id=user_id,
            username=payload.get("username"),
            roles=payload.get("roles", [])
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 4. Create WebSocket Client Example
Create `docs/examples/websocket_client.py`:

```python
#!/usr/bin/env python3
"""
Example WebSocket client for real-time transcription.

Usage:
    python websocket_client.py --token YOUR_JWT_TOKEN --audio path/to/audio.wav
"""

import asyncio
import websockets
import json
import argparse
from pathlib import Path


async def stream_audio(uri: str, audio_path: str, chunk_size: int = 4096):
    """Stream audio file to WebSocket server."""
    async with websockets.connect(uri) as websocket:
        print("Conectado al servidor")

        # Start receiver task
        receiver = asyncio.create_task(receive_messages(websocket))

        # Stream audio file
        audio_file = Path(audio_path)
        with open(audio_file, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                await websocket.send(chunk)
                await asyncio.sleep(0.1)  # Simulate real-time streaming

        print("Audio enviado, finalizando sesión...")

        # Send finalize message
        await websocket.send(json.dumps({"type": "finalize"}))

        # Wait for final results
        await receiver


async def receive_messages(websocket):
    """Receive and display messages from server."""
    async for message in websocket:
        data = json.loads(message)
        msg_type = data.get("type")

        if msg_type == "transcript_update":
            text = data.get("text", "")
            timestamp = data.get("timestamp", 0)
            print(f"[{timestamp:.1f}s] {text}")

        elif msg_type == "speaker_changed":
            new_role = data.get("new_speaker_role", "unknown")
            confidence = data.get("confidence", 0)
            print(f"  🗣️  Speaker changed → {new_role} (confidence: {confidence:.2f})")

        elif msg_type == "extraction_update":
            entity_type = data.get("entity_type", "")
            entity = data.get("entity", {})
            print(f"  📋 Extracted {entity_type}: {entity.get('name', entity)}")

        elif msg_type == "validation_alert":
            severity = data.get("severity", "")
            description = data.get("description", "")
            print(f"  ⚠️  {severity} ALERT: {description}")

        elif msg_type == "entity_validated":
            entity_name = data.get("entity_name", "")
            status = data.get("validation_status", "")
            print(f"  ✓ Validated: {entity_name} - {status}")

        elif msg_type == "cost_update":
            total = data.get("total_cost_usd", 0)
            print(f"  💰 Costo acumulado: ${total:.4f}")

        elif msg_type == "session_complete":
            print("\n=== SESIÓN COMPLETA ===")
            print(f"Transcripción final:\n{data.get('transcript')}")

            extraction = data.get('extraction', {})
            print(f"\nMedicamentos: {len(extraction.get('medications', []))}")
            print(f"Síntomas: {len(extraction.get('symptoms', []))}")
            print(f"Diagnósticos: {len(extraction.get('diagnoses', []))}")

            interactions = extraction.get('drug_interactions', [])
            if interactions:
                print(f"\n⚠️  Interacciones detectadas: {len(interactions)}")
                for interaction in interactions:
                    print(f"  - {interaction['medications']}: {interaction['severity']}")

            cost = data.get('cost_summary', {})
            print(f"\nCosto total: ${cost.get('total_cost_usd', 0):.4f}")
            print(f"  Transcripción: ${cost.get('transcription_cost_usd', 0):.4f}")
            print(f"  Extracción: ${cost.get('extraction_cost_usd', 0):.4f}")
            print(f"  Validación: ${cost.get('validation_cost_usd', 0):.4f}")

            stats = data.get('session_stats', {})
            print(f"\nEstadísticas:")
            print(f"  Chunks procesados: {stats.get('chunks_processed', 0)}")
            print(f"  Entidades extraídas: {stats.get('entities_extracted', 0)}")
            print(f"  Validaciones realizadas: {stats.get('validations_performed', 0)}")
            print(f"  Cache hit rate: {stats.get('cache_hit_rate', 0):.1%}")
            break

        elif msg_type == "error":
            print(f"❌ Error: {data.get('message')}")


def main():
    parser = argparse.ArgumentParser(description="WebSocket transcription client")
    parser.add_argument("--token", required=True, help="JWT authentication token")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--session", default="test_session", help="Session ID")
    parser.add_argument("--host", default="localhost:8000", help="Server host")

    args = parser.parse_args()

    uri = f"ws://{args.host}/ws/transcription/{args.session}?token={args.token}"

    asyncio.run(stream_audio(uri, args.audio))


if __name__ == "__main__":
    main()
```

### 5. Write WebSocket Tests
Create `ai-service/tests/unit/test_websocket.py`:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import json

from src.api.websocket.manager import ConnectionManager


class TestConnectionManager:
    """Tests for WebSocket connection manager."""

    @pytest.fixture
    def manager(self):
        return ConnectionManager()

    @pytest.mark.asyncio
    async def test_connect_new_session(self, manager):
        """Test connecting a new session."""
        mock_ws = AsyncMock()

        result = await manager.connect(mock_ws, "session_1", "user_1")

        assert result is True
        assert manager.is_connected("session_1")
        mock_ws.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_duplicate_session(self, manager):
        """Test connecting duplicate session fails."""
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()

        await manager.connect(mock_ws1, "session_1", "user_1")
        result = await manager.connect(mock_ws2, "session_1", "user_2")

        assert result is False

    @pytest.mark.asyncio
    async def test_disconnect(self, manager):
        """Test disconnecting a session."""
        mock_ws = AsyncMock()
        await manager.connect(mock_ws, "session_1", "user_1")

        await manager.disconnect("session_1")

        assert not manager.is_connected("session_1")

    @pytest.mark.asyncio
    async def test_send_json(self, manager):
        """Test sending JSON to session."""
        mock_ws = AsyncMock()
        await manager.connect(mock_ws, "session_1", "user_1")

        await manager.send_json("session_1", {"type": "test"})

        mock_ws.send_json.assert_called_once_with({"type": "test"})

    @pytest.mark.asyncio
    async def test_get_session_stats(self, manager):
        """Test getting session statistics."""
        mock_ws = AsyncMock()
        await manager.connect(mock_ws, "session_1", "user_1")

        stats = manager.get_session_stats("session_1")

        assert stats is not None
        assert stats["user_id"] == "user_1"
        assert stats["chunks_received"] == 0


class TestTranscriptionBuffer:
    """Tests for transcription buffer."""

    def test_buffer_threshold(self):
        from src.api.websocket.transcription import TranscriptionBuffer, AudioChunk

        buffer = TranscriptionBuffer("test_session")

        # Add chunks below threshold
        for i in range(2):
            chunk = AudioChunk(data=b"x" * 1000, timestamp=None, duration_ms=1000)
            buffer.add_chunk(chunk)

        assert not buffer.should_transcribe()

        # Add chunk to exceed threshold
        chunk = AudioChunk(data=b"x" * 1000, timestamp=None, duration_ms=1500)
        buffer.add_chunk(chunk)

        assert buffer.should_transcribe()
```

## Expected Deliverables
- `ai-service/src/api/websocket/__init__.py` - Module exports
- `ai-service/src/api/websocket/manager.py` - Connection manager (multi-session support)
- `ai-service/src/api/websocket/streaming.py` - **Event-driven WebSocket endpoint**
- `ai-service/src/security/websocket_auth.py` - WebSocket JWT authentication
- `docs/examples/websocket_client.py` - Example client with all event types
- `ai-service/tests/unit/test_websocket.py` - Unit tests

## Verification Steps

### Connection & Authentication
1. WebSocket connection establishes with valid token
2. Connection rejected for invalid/expired token
3. Connection rejected for duplicate session_id
4. Connection manager handles multiple concurrent sessions

### Event-Driven Pipeline Integration
5. **Stream Processor** (Prompt 17): Audio chunks → transcript_update events
6. **Incremental Diarization** (Prompt 18): Speaker changes → speaker_changed events
7. **Incremental Extraction** (Prompt 19): Entities extracted → extraction_update events
8. **RAG Validation** (Prompt 21): Validation → validation_alert/entity_validated events
   - CRITICAL drug interactions < 1s
   - HIGH medication validation < 2s
   - MEDIUM CIE-10 suggestions < 3s
9. **Cost Optimization** (Prompt 22): Chunk-level caching reduces costs by ~68%

### Real-Time Event Emission
10. `transcript_update` events emitted for each chunk
11. `speaker_changed` events emitted on speaker transitions
12. `extraction_update` events emitted as entities are extracted (not just at end)
13. `validation_alert` events emitted for CRITICAL drug interactions < 1s
14. `entity_validated` events emitted for medication/diagnosis validation
15. `cost_update` events emitted every 5 chunks
16. `session_complete` event with final aggregated results

### Session Finalization
17. Client sends `{"type": "finalize"}` to end session
18. Server aggregates state from all event-driven services
19. `session_complete` includes: transcript, diarized_transcript, extraction, cost_summary, session_stats
20. Session cleanup removes all Redis state (session, speaker_state, transcript_state, etc.)

### Performance & Quality
21. End-to-end latency < 2s (p95) from audio to validated extraction
22. CRITICAL validation alerts < 1s
23. Cache hit rate > 40% after 2nd session with same medications
24. No memory leaks after 100+ chunk processing

## Notes

### Event-Driven Architecture
- **WebSocket Gateway**: Orchestrates entire real-time pipeline (Prompts 17-22)
- **Incremental processing**: Events emitted as soon as data is available (not batch)
- **Priority-based validation**: CRITICAL (drug interactions) processed first
- **State persistence**: All state in Redis for session recovery and multi-instance support

### Integration with Event-Driven Pipeline
```
Audio Chunk (Client)
    ↓
Stream Processor (Prompt 17) ──→ transcript_update event
    ↓
Incremental Diarizer (Prompt 18) ──→ speaker_changed event
    ↓
Incremental Extractor (Prompt 19) ──→ extraction_update event
    ↓
RAG Validation Coordinator (Prompt 21) ──→ validation_alert / entity_validated events
```

### Performance Targets (from prompts 14-22)
- **Stream Processor**: <200ms chunk processing (Prompt 17)
- **Diarization**: <50ms per chunk (Prompt 18)
- **Extraction**: <500ms per chunk (Prompt 19)
- **Validation**: <1s CRITICAL, <2s HIGH, <3s MEDIUM (Prompt 21)
- **Total latency**: <2s end-to-end (p95)

### Cost Optimization (Prompt 22)
- **Chunk-level transcription caching**: 60% hit rate after 1st consultation
- **Medication validation caching**: 7-day TTL for stable knowledge
- **Drug interaction caching**: Only "no interaction" results (safety)
- **Total savings**: ~68% cost reduction per session

### Authentication & Security
- JWT authentication same as REST API
- Session ownership verified on connection
- PII sanitization on client-facing events
- Graceful degradation on service failures

### State Management
- **Redis TTL**: 2 hours for all session state
- **State keys**:
  - `session:{session_id}` - Main session data
  - `speaker_state:{session_id}` - Incremental diarization state
  - `transcript_state:{session_id}` - Incremental transcript builder
  - `extraction_state:{session_id}` - Incremental extraction state
  - `validation_queue:*` - Priority queues for RAG validation

### Error Handling
- Service failures don't crash WebSocket (graceful degradation)
- Events include error info when available
- Keep-alive pings prevent connection timeouts
- Automatic reconnection support via session_id persistence

### Client Implementation
- Handle all 8+ event types (transcript_update, speaker_changed, extraction_update, validation_alert, entity_validated, cost_update, session_complete, error)
- Display real-time updates in live dashboard
- Show CRITICAL alerts immediately (<1s)
- Aggregate incremental results for final view
