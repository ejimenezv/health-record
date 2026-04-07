# Prompt 39: Implement Monitoring & Observability

## Objective
Implement comprehensive observability stack with structured logging, health checks, cost tracking, and metrics collection to meet BSG requirements for production-ready systems.

## Context
BSG requires:
- **Structured logging** (JSON format) with timestamp, level, service, trace_id, message
- **Health check endpoint** (`/api/v1/health`) reporting status of all components
- **Cost analysis with real data** (not estimates) for BSG section 8.3
- **Logging includes**: tokens consumed, LLM latency, vector store latency, errors with stack trace
- **No print() statements** in production code (structured logger only)

This prompt implements all observability requirements for the BSG final delivery.

## Tasks

### 1. Create Structured Logger (Python AI Service)

**File:** `ai-service/src/utils/logger.py`

**Content:**
```python
"""
Structured JSON logger for AI Service.
Compliant with BSG observability requirements.
"""

import logging
import json
import sys
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from contextvars import ContextVar
import uuid

# Context variable for request/trace ID (propagated across async calls)
trace_id_var: ContextVar[str] = ContextVar('trace_id', default='')


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.

    Output format:
    {
        "timestamp": "2025-01-15T14:30:45.123Z",
        "level": "INFO",
        "service": "ai-service",
        "trace_id": "req_abc123xyz",
        "message": "Transcription completed",
        "context": {
            "duration": 78.2,
            "tokens": 2500,
            "cost": 0.18
        },
        "error": {
            "type": "ValueError",
            "message": "Invalid audio format",
            "stack_trace": "..."
        }
    }
    """

    def __init__(self, service_name: str = "ai-service"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_dict: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": self.service_name,
            "trace_id": trace_id_var.get() or "no-trace",
            "message": record.getMessage(),
        }

        # Add context from extra fields
        if hasattr(record, 'context') and record.context:
            log_dict["context"] = record.context

        # Add error information if exception occurred
        if record.exc_info:
            exc_type, exc_value, exc_traceback = record.exc_info
            log_dict["error"] = {
                "type": exc_type.__name__ if exc_type else "Unknown",
                "message": str(exc_value),
                "stack_trace": ''.join(traceback.format_exception(
                    exc_type, exc_value, exc_traceback
                ))
            }

        # Add module/function information
        log_dict["source"] = {
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        return json.dumps(log_dict, default=str)


class PrettyFormatter(logging.Formatter):
    """
    Human-readable formatter for development.

    Output format:
    2025-01-15 14:30:45 [INFO] ai-service [req_abc123] Transcription completed
      └─ duration=78.2s tokens=2500 cost=$0.18
    """

    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, '')
        reset = self.COLORS['RESET']

        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        trace_id = trace_id_var.get() or 'no-trace'

        base_msg = (
            f"{timestamp} "
            f"{color}[{record.levelname}]{reset} "
            f"ai-service "
            f"[{trace_id}] "
            f"{record.getMessage()}"
        )

        # Add context if present
        if hasattr(record, 'context') and record.context:
            context_str = ' '.join([f"{k}={v}" for k, v in record.context.items()])
            base_msg += f"\n  └─ {context_str}"

        # Add error if present
        if record.exc_info:
            exc_type, exc_value, _ = record.exc_info
            base_msg += f"\n  └─ {exc_type.__name__}: {exc_value}"

        return base_msg


def setup_logger(
    name: str = "ai-service",
    level: str = "INFO",
    format_type: str = "json"
) -> logging.Logger:
    """
    Setup structured logger.

    Args:
        name: Logger name
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_type: "json" for production, "pretty" for development

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)

    # Set formatter based on format type
    if format_type == "json":
        formatter = StructuredFormatter(service_name=name)
    else:
        formatter = PrettyFormatter()

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


def set_trace_id(trace_id: Optional[str] = None) -> str:
    """
    Set trace ID for current context.

    Args:
        trace_id: Custom trace ID or generate new one

    Returns:
        The trace ID that was set
    """
    if trace_id is None:
        trace_id = f"req_{uuid.uuid4().hex[:12]}"

    trace_id_var.set(trace_id)
    return trace_id


def get_trace_id() -> str:
    """Get current trace ID."""
    return trace_id_var.get() or "no-trace"


# Create default logger instance
import os

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv("LOG_FORMAT", "pretty")  # "json" in production

logger = setup_logger(
    name="ai-service",
    level=LOG_LEVEL,
    format_type=LOG_FORMAT
)


# Usage example:
if __name__ == "__main__":
    # Set trace ID for request
    set_trace_id("req_test123")

    # Standard logging
    logger.info("Processing transcription request")

    # Logging with context
    logger.info(
        "Transcription completed",
        extra={
            "context": {
                "duration_seconds": 78.2,
                "tokens_consumed": 2500,
                "cost_usd": 0.18,
                "audio_duration": 3542.1
            }
        }
    )

    # Error logging
    try:
        raise ValueError("Invalid audio format: expected MP3")
    except Exception as e:
        logger.error("Audio processing failed", exc_info=True)

    # Warning
    logger.warning(
        "Budget threshold exceeded",
        extra={
            "context": {
                "budget_used_percent": 85,
                "threshold": 80
            }
        }
    )

    # WebSocket event logging (real-time streaming)
    logger.info(
        "WebSocket event sent",
        extra={
            "context": {
                "event_type": "symptom_extracted",
                "session_id": "sess_rt_abc123",
                "latency_ms": 2450,  # Time from audio to event
                "entity_action": "created"  # created, updated, merged
            }
        }
    )

    # Real-time streaming session metrics
    logger.info(
        "Streaming session completed",
        extra={
            "context": {
                "session_id": "sess_rt_abc123",
                "mode": "realtime",  # "realtime" or "batch"
                "duration_seconds": 3542,
                "audio_chunks_processed": 1254,
                "events_sent": 87,
                "reconnections": 1,
                "avg_transcription_latency_ms": 1850,
                "avg_extraction_latency_ms": 2650,
                "cost_usd": 0.28
            }
        }
    )
```

### 2. Create Cost Tracker

**File:** `ai-service/src/core/cost_tracker.py`

**Content:**
```python
"""
Cost tracking for OpenAI API usage.
Tracks costs per service (Whisper, GPT-4o, Embeddings) and enforces budget limits.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Optional
import os
from enum import Enum

from src.utils.logger import logger


class ServiceType(str, Enum):
    """OpenAI service types for cost tracking."""
    WHISPER = "whisper"
    GPT4O = "gpt-4o"
    GPT4O_MINI = "gpt-4o-mini"
    GPT4_TURBO = "gpt-4-turbo"
    EMBEDDINGS = "text-embedding-3-large"


# Pricing per 1M tokens (as of January 2025)
PRICING = {
    ServiceType.WHISPER: {
        "per_second": 0.0001  # $0.006 per minute = $0.0001 per second
    },
    ServiceType.GPT4O: {
        "input": 2.50,   # per 1M tokens
        "output": 10.00
    },
    ServiceType.GPT4O_MINI: {
        "input": 0.15,
        "output": 0.60
    },
    ServiceType.GPT4_TURBO: {
        "input": 10.00,
        "output": 30.00
    },
    ServiceType.EMBEDDINGS: {
        "per_token": 0.13  # per 1M tokens
    }
}


class ProcessingMode(str, Enum):
    """Processing mode for cost tracking."""
    BATCH = "batch"
    REALTIME = "realtime"


@dataclass
class CostEntry:
    """Single cost entry."""
    service: ServiceType
    cost: float
    tokens_input: int = 0
    tokens_output: int = 0
    duration_seconds: float = 0
    timestamp: datetime = datetime.utcnow()
    session_id: str = ""
    mode: ProcessingMode = ProcessingMode.BATCH  # Track batch vs realtime costs


class CostTracker:
    """
    Track OpenAI API costs in-memory and persist to database.

    BSG Requirement: Section 8.3 - Cost analysis with real data
    """

    def __init__(self):
        self.entries: list[CostEntry] = []
        self.monthly_budget = float(os.getenv("MONTHLY_BUDGET_USD", 200))
        self.alert_threshold = float(os.getenv("COST_ALERT_THRESHOLD", 0.8))

    def track_whisper(
        self,
        duration_seconds: float,
        session_id: str = "",
        mode: ProcessingMode = ProcessingMode.BATCH
    ) -> float:
        """
        Track Whisper API cost.

        Args:
            duration_seconds: Audio duration in seconds
            session_id: Session identifier for grouping
            mode: Processing mode (batch or realtime)

        Returns:
            Cost in USD
        """
        cost = duration_seconds * PRICING[ServiceType.WHISPER]["per_second"]

        entry = CostEntry(
            service=ServiceType.WHISPER,
            cost=cost,
            duration_seconds=duration_seconds,
            session_id=session_id,
            mode=mode
        )
        self.entries.append(entry)

        logger.info(
            f"Whisper cost tracked: ${cost:.4f}",
            extra={
                "context": {
                    "duration_seconds": duration_seconds,
                    "cost_usd": cost,
                    "session_id": session_id,
                    "mode": mode.value
                }
            }
        )

        self._check_budget()
        return cost

    def track_llm(
        self,
        service: ServiceType,
        tokens_input: int,
        tokens_output: int,
        session_id: str = ""
    ) -> float:
        """
        Track LLM API cost (GPT-4o, GPT-4o-mini, GPT-4-turbo).

        Args:
            service: Which model was used
            tokens_input: Input tokens consumed
            tokens_output: Output tokens generated
            session_id: Session identifier

        Returns:
            Cost in USD
        """
        pricing = PRICING[service]
        cost_input = (tokens_input / 1_000_000) * pricing["input"]
        cost_output = (tokens_output / 1_000_000) * pricing["output"]
        total_cost = cost_input + cost_output

        entry = CostEntry(
            service=service,
            cost=total_cost,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            session_id=session_id
        )
        self.entries.append(entry)

        logger.info(
            f"{service} cost tracked: ${total_cost:.4f}",
            extra={
                "context": {
                    "tokens_input": tokens_input,
                    "tokens_output": tokens_output,
                    "cost_input": cost_input,
                    "cost_output": cost_output,
                    "total_cost": total_cost,
                    "session_id": session_id
                }
            }
        )

        self._check_budget()
        return total_cost

    def track_embeddings(
        self,
        tokens: int,
        session_id: str = ""
    ) -> float:
        """
        Track embeddings API cost.

        Args:
            tokens: Number of tokens embedded
            session_id: Session identifier

        Returns:
            Cost in USD
        """
        cost = (tokens / 1_000_000) * PRICING[ServiceType.EMBEDDINGS]["per_token"]

        entry = CostEntry(
            service=ServiceType.EMBEDDINGS,
            cost=cost,
            tokens_input=tokens,
            session_id=session_id
        )
        self.entries.append(entry)

        logger.info(
            f"Embeddings cost tracked: ${cost:.4f}",
            extra={
                "context": {
                    "tokens": tokens,
                    "cost_usd": cost,
                    "session_id": session_id
                }
            }
        )

        return cost

    def get_monthly_cost(self, period: Optional[str] = None) -> float:
        """
        Get total cost for current month (or specified period).

        Args:
            period: Optional period in format "YYYY-MM" (default: current month)

        Returns:
            Total cost in USD
        """
        if period is None:
            # Current month
            now = datetime.utcnow()
            start_of_month = datetime(now.year, now.month, 1)
            entries = [e for e in self.entries if e.timestamp >= start_of_month]
        else:
            # Specific month
            year, month = map(int, period.split('-'))
            start = datetime(year, month, 1)
            if month == 12:
                end = datetime(year + 1, 1, 1)
            else:
                end = datetime(year, month + 1, 1)

            entries = [e for e in self.entries if start <= e.timestamp < end]

        return sum(e.cost for e in entries)

    def get_cost_breakdown(self) -> Dict[str, float]:
        """
        Get cost breakdown by service type.

        Returns:
            Dict with service name as key and cost as value
        """
        breakdown = {}
        for service in ServiceType:
            service_entries = [e for e in self.entries if e.service == service]
            breakdown[service.value] = sum(e.cost for e in service_entries)

        return breakdown

    def get_consultations_processed(self) -> int:
        """
        Count unique sessions (consultations) processed.

        Returns:
            Number of consultations
        """
        session_ids = {e.session_id for e in self.entries if e.session_id}
        return len(session_ids)

    def get_avg_cost_per_consultation(self) -> float:
        """
        Calculate average cost per consultation.

        Returns:
            Average cost in USD
        """
        total_cost = self.get_monthly_cost()
        consultations = self.get_consultations_processed()

        if consultations == 0:
            return 0.0

        return total_cost / consultations

    def _check_budget(self):
        """Check if budget threshold exceeded and log warning."""
        monthly_cost = self.get_monthly_cost()
        percent_used = monthly_cost / self.monthly_budget

        if percent_used >= self.alert_threshold:
            logger.warning(
                f"Budget threshold exceeded: {percent_used:.1%}",
                extra={
                    "context": {
                        "monthly_cost": monthly_cost,
                        "monthly_budget": self.monthly_budget,
                        "percent_used": percent_used,
                        "threshold": self.alert_threshold
                    }
                }
            )

        if percent_used >= 0.95:
            logger.critical(
                "Budget critically exceeded! Consider pausing service.",
                extra={
                    "context": {
                        "monthly_cost": monthly_cost,
                        "monthly_budget": self.monthly_budget,
                        "percent_used": percent_used
                    }
                }
            )

    def get_cost_by_mode(self) -> Dict[str, float]:
        """
        Get cost breakdown by processing mode (batch vs realtime).

        Returns:
            Dict with mode as key and cost as value
        """
        batch_cost = sum(e.cost for e in self.entries if e.mode == ProcessingMode.BATCH)
        realtime_cost = sum(e.cost for e in self.entries if e.mode == ProcessingMode.REALTIME)
        return {
            "batch": batch_cost,
            "realtime": realtime_cost
        }

    def get_dashboard_data(self) -> Dict:
        """
        Get complete cost dashboard data for API endpoint.

        BSG Requirement: RF-018 Dashboard de Costos

        Returns:
            Dict with all cost metrics
        """
        monthly_cost = self.get_monthly_cost()
        breakdown = self.get_cost_breakdown()
        mode_breakdown = self.get_cost_by_mode()
        consultations = self.get_consultations_processed()
        avg_cost = self.get_avg_cost_per_consultation()
        percent_used = monthly_cost / self.monthly_budget

        # Projected monthly cost (linear projection based on days passed)
        now = datetime.utcnow()
        days_in_month = 30  # Approximation
        day_of_month = now.day
        projected = (monthly_cost / day_of_month) * days_in_month if day_of_month > 0 else 0

        # Count consultations by mode
        batch_sessions = {e.session_id for e in self.entries if e.mode == ProcessingMode.BATCH and e.session_id}
        realtime_sessions = {e.session_id for e in self.entries if e.mode == ProcessingMode.REALTIME and e.session_id}

        return {
            "period": now.strftime("%Y-%m"),
            "total_cost": round(monthly_cost, 2),
            "budget": self.monthly_budget,
            "percent_used": round(percent_used * 100, 1),
            "projected_monthly": round(projected, 2),
            "breakdown": {k: round(v, 2) for k, v in breakdown.items()},
            "mode_breakdown": {
                "batch": round(mode_breakdown["batch"], 2),
                "realtime": round(mode_breakdown["realtime"], 2)
            },
            "consultations_processed": consultations,
            "consultations_by_mode": {
                "batch": len(batch_sessions),
                "realtime": len(realtime_sessions)
            },
            "avg_cost_per_consultation": round(avg_cost, 2),
            "cache_hit_rate": 0.0,  # TODO: Implement cache metrics
        }


# Global instance
cost_tracker = CostTracker()
```

### 3. Create Health Check Endpoint

**File:** `ai-service/src/api/routes/health.py`

**Content:**
```python
"""
Health check endpoint.
BSG Requirement: GET /api/v1/health reporting status of all components
"""

from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Dict, Literal
from datetime import datetime
import httpx
import asyncpg
import redis.asyncio as redis
import os

from src.utils.logger import logger

router = APIRouter(tags=["Operations"])


class ComponentStatus(BaseModel):
    """Status of individual component."""
    status: Literal["up", "down"]
    latency_ms: float | None = None
    details: Dict | None = None


class HealthResponse(BaseModel):
    """Complete health check response."""
    status: Literal["healthy", "degraded", "unhealthy"]
    timestamp: datetime
    components: Dict[str, ComponentStatus]


async def check_postgres() -> ComponentStatus:
    """Check PostgreSQL connectivity."""
    try:
        start = datetime.utcnow()
        conn = await asyncpg.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=int(os.getenv("POSTGRES_PORT", 5432)),
            user=os.getenv("POSTGRES_USER", "medrecord_user"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB", "medrecord_db"),
            timeout=5
        )
        await conn.execute("SELECT 1")
        await conn.close()
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        return ComponentStatus(
            status="up",
            latency_ms=round(latency, 2)
        )
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        return ComponentStatus(
            status="down",
            details={"error": str(e)}
        )


async def check_redis() -> ComponentStatus:
    """Check Redis connectivity."""
    try:
        start = datetime.utcnow()
        r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
        await r.ping()
        await r.close()
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        return ComponentStatus(
            status="up",
            latency_ms=round(latency, 2)
        )
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return ComponentStatus(
            status="down",
            details={"error": str(e)}
        )


async def check_chromadb() -> ComponentStatus:
    """Check ChromaDB connectivity."""
    try:
        start = datetime.utcnow()
        chroma_url = f"http://{os.getenv('CHROMA_HOST', 'chromadb')}:{os.getenv('CHROMA_PORT', 8000)}"

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{chroma_url}/api/v1/heartbeat")
            response.raise_for_status()

        latency = (datetime.utcnow() - start).total_seconds() * 1000

        return ComponentStatus(
            status="up",
            latency_ms=round(latency, 2)
        )
    except Exception as e:
        logger.error(f"ChromaDB health check failed: {e}")
        return ComponentStatus(
            status="down",
            details={"error": str(e)}
        )


async def check_openai() -> ComponentStatus:
    """Check OpenAI API connectivity."""
    try:
        from openai import AsyncOpenAI

        start = datetime.utcnow()
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Simple API call to check connectivity
        await client.models.list()
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        return ComponentStatus(
            status="up",
            latency_ms=round(latency, 2)
        )
    except Exception as e:
        logger.error(f"OpenAI API health check failed: {e}")
        return ComponentStatus(
            status="down",
            details={"error": str(e)}
        )


async def check_websocket_pool() -> ComponentStatus:
    """Check WebSocket connection pool status."""
    try:
        start = datetime.utcnow()
        r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

        # Get active streaming sessions from Redis
        active_sessions = await r.keys("session:*:state")
        session_count = len(active_sessions)

        # Get WebSocket connection count (stored in Redis)
        ws_connections = await r.get("websocket:connection_count") or 0
        ws_connections = int(ws_connections)

        # Get max allowed from env
        max_connections = int(os.getenv("WS_MAX_CONCURRENT_SESSIONS", 100))

        await r.close()
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        status = "up"
        if ws_connections >= max_connections * 0.9:  # 90% capacity warning
            status = "degraded"

        return ComponentStatus(
            status=status,
            latency_ms=round(latency, 2),
            details={
                "active_streaming_sessions": session_count,
                "websocket_connections": ws_connections,
                "max_connections": max_connections,
                "capacity_percent": round(ws_connections / max_connections * 100, 1) if max_connections > 0 else 0
            }
        )
    except Exception as e:
        logger.error(f"WebSocket pool health check failed: {e}")
        return ComponentStatus(
            status="down",
            details={"error": str(e)}
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check del sistema",
    description="Retorna el estado de todos los componentes del sistema"
)
async def health_check():
    """
    Health check endpoint.

    Verifica conectividad con:
    - PostgreSQL
    - Redis
    - ChromaDB (vector store)
    - OpenAI API
    - **WebSocket Pool** (active streaming sessions, connection capacity)

    Returns:
        - `healthy`: Todos los componentes operativos
        - `degraded`: Algunos componentes down o WebSocket pool near capacity (>90%)
        - `unhealthy`: Componentes críticos down
    """
    components = {}

    # Check all components in parallel
    import asyncio
    results = await asyncio.gather(
        check_postgres(),
        check_redis(),
        check_chromadb(),
        check_openai(),
        check_websocket_pool(),
        return_exceptions=True
    )

    components["postgresql"] = results[0] if not isinstance(results[0], Exception) else ComponentStatus(status="down")
    components["redis"] = results[1] if not isinstance(results[1], Exception) else ComponentStatus(status="down")
    components["chromadb"] = results[2] if not isinstance(results[2], Exception) else ComponentStatus(status="down")
    components["openai"] = results[3] if not isinstance(results[3], Exception) else ComponentStatus(status="down")
    components["websocket_pool"] = results[4] if not isinstance(results[4], Exception) else ComponentStatus(status="down")

    # Determine overall status
    down_components = [name for name, comp in components.items() if comp.status == "down"]
    degraded_components = [name for name, comp in components.items() if comp.status == "degraded"]

    if not down_components and not degraded_components:
        overall_status = "healthy"
    elif "postgresql" in down_components or "openai" in down_components:
        # Critical components down
        overall_status = "unhealthy"
    elif degraded_components or down_components:
        # Non-critical components down (Redis, ChromaDB, WebSocket pool at capacity)
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    logger.info(
        f"Health check completed: {overall_status}",
        extra={
            "context": {
                "status": overall_status,
                "down_components": down_components
            }
        }
    )

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        components=components
    )
```

### 4. Add Costs Endpoint

**File:** `ai-service/src/api/routes/costs.py`

**Content:**
```python
"""
Costs monitoring endpoint.
BSG Requirement: RF-018 Dashboard de Costos y Monitoreo
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict

from src.core.cost_tracker import cost_tracker
from src.api.dependencies import get_current_user  # Assuming auth dependency exists

router = APIRouter(tags=["Costs"])


class CostsDashboardResponse(BaseModel):
    """Dashboard de costos y uso de API."""
    period: str
    total_cost: float
    budget: float
    percent_used: float
    projected_monthly: float
    breakdown: Dict[str, float]
    consultations_processed: int
    avg_cost_per_consultation: float
    cache_hit_rate: float


@router.get(
    "/costs",
    response_model=CostsDashboardResponse,
    summary="Dashboard de costos y uso",
    description="Retorna resumen de costos de OpenAI API con proyección mensual"
)
async def get_costs_dashboard(
    # current_user: User = Depends(get_current_user)  # Require auth
):
    """
    Get costs dashboard data.

    Returns:
        - Costos por servicio (Whisper, GPT-4o, Embeddings)
        - Proyección mensual
        - Presupuesto restante
        - Cache hit rate (ahorros)
        - Costo promedio por consulta
    """
    data = cost_tracker.get_dashboard_data()
    return CostsDashboardResponse(**data)
```

### 5. Update FastAPI main.py to Include Routes

**File:** `ai-service/src/api/main.py` (add these imports and include routes)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import health, costs
from src.utils.logger import logger, set_trace_id
from src.core.config import settings

app = FastAPI(
    title="MedRecord AI - AI Service",
    description="Servicio AI para transcripción, extracción médica y RAG",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para trace ID
@app.middleware("http")
async def add_trace_id(request, call_next):
    # Generate or extract trace ID from header
    trace_id = request.headers.get("X-Trace-ID") or set_trace_id()
    request.state.trace_id = trace_id

    response = await call_next(request)
    response.headers["X-Trace-ID"] = trace_id
    return response

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(costs.router, prefix="/api/v1")
# ... other routers

logger.info("AI Service started successfully")
```

### 6. Create Monitoring README

**File:** `docs/observability/README.md`

**Content:**
```markdown
# Observabilidad y Monitoreo — MedRecord AI

Este documento describe el stack de observabilidad implementado para cumplir con los requisitos BSG.

---

## Stack de Observabilidad

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Logging** | Structured JSON logging | Trazabilidad de requests, debugging |
| **Metrics** | Cost tracker (in-memory) | Monitoreo de costos OpenAI API |
| **Health Checks** | FastAPI endpoint | Verificar estado de componentes |
| **Tracing** | Trace ID propagation | Seguimiento de requests a través del sistema |

---

## Structured Logging

### Formato JSON

```json
{
  "timestamp": "2025-01-15T14:30:45.123Z",
  "level": "INFO",
  "service": "ai-service",
  "trace_id": "req_abc123xyz",
  "message": "Transcription completed",
  "context": {
    "duration_seconds": 78.2,
    "tokens_consumed": 2500,
    "cost_usd": 0.18
  },
  "source": {
    "module": "transcription",
    "function": "process_audio",
    "line": 142
  }
}
```

### Niveles de Log

- **DEBUG**: Información detallada para debugging
- **INFO**: Eventos importantes del sistema (transcription started, completed)
- **WARNING**: Situaciones anómalas pero no críticas (budget threshold, cache miss)
- **ERROR**: Errores manejados (invalid audio format, API timeout)
- **CRITICAL**: Errores críticos (budget exceeded, database down)

### Uso en Código

```python
from src.utils.logger import logger, set_trace_id

# Set trace ID al inicio del request
trace_id = set_trace_id()

# Logging simple
logger.info("Processing transcription request")

# Logging con contexto
logger.info(
    "Transcription completed",
    extra={
        "context": {
            "duration": 78.2,
            "tokens": 2500,
            "cost": 0.18
        }
    }
)

# Error logging
try:
    process_audio(file)
except Exception as e:
    logger.error("Audio processing failed", exc_info=True)
```

---

## Health Check

### Endpoint

```
GET /api/v1/health
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T14:30:45.123Z",
  "components": {
    "postgresql": {
      "status": "up",
      "latency_ms": 15.2
    },
    "redis": {
      "status": "up",
      "latency_ms": 3.1
    },
    "chromadb": {
      "status": "up",
      "latency_ms": 42.8
    },
    "openai": {
      "status": "up",
      "latency_ms": 156.4
    }
  }
}
```

### Estados

- **healthy**: Todos los componentes operativos
- **degraded**: Componentes no críticos down (Redis, ChromaDB) o WebSocket pool near capacity
- **unhealthy**: Componentes críticos down (PostgreSQL, OpenAI API)

### Ejemplo con WebSocket Pool

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T14:30:45.123Z",
  "components": {
    "postgresql": {"status": "up", "latency_ms": 15.2},
    "redis": {"status": "up", "latency_ms": 3.1},
    "chromadb": {"status": "up", "latency_ms": 42.8},
    "openai": {"status": "up", "latency_ms": 156.4},
    "websocket_pool": {
      "status": "up",
      "latency_ms": 5.3,
      "details": {
        "active_streaming_sessions": 12,
        "websocket_connections": 15,
        "max_connections": 100,
        "capacity_percent": 15.0
      }
    }
  }
}
```

---

## Cost Tracking

### Endpoint

```
GET /api/v1/costs
Authorization: Bearer {token}
```

### Response

```json
{
  "period": "2025-01",
  "total_cost": 18.45,
  "budget": 200.00,
  "percent_used": 9.2,
  "projected_monthly": 55.35,
  "breakdown": {
    "whisper": 8.20,
    "gpt-4o": 7.15,
    "gpt-4o-mini": 2.30,
    "text-embedding-3-large": 0.80
  },
  "mode_breakdown": {
    "batch": 10.15,
    "realtime": 8.30
  },
  "consultations_processed": 52,
  "consultations_by_mode": {
    "batch": 35,
    "realtime": 17
  },
  "avg_cost_per_consultation": 0.35,
  "cache_hit_rate": 0.42
}
```

### Métricas Trackeadas

| Servicio | Métrica | Unidad |
|----------|---------|--------|
| Whisper | Duración de audio | Segundos |
| GPT-4o / GPT-4o-mini | Tokens input/output | Tokens |
| Embeddings | Tokens embedded | Tokens |
| **Total** | Costo acumulado | USD |

### Métricas por Modo de Procesamiento

| Modo | Costo Promedio | Latencia Típica | Uso |
|------|---------------|-----------------|-----|
| **Batch** | $0.23/consulta | 2-3 minutos | Post-consulta |
| **Real-time** | $0.28/consulta | < 2s transcripción | Durante consulta |

---

## Trace ID Propagation

Los trace IDs permiten seguir un request a través de todo el sistema:

```
Frontend → Backend → AI Service → OpenAI API
[req_abc123] → [req_abc123] → [req_abc123] → [req_abc123]
```

### Headers HTTP

```
X-Trace-ID: req_abc123xyz
```

### Logs Correlacionados

```json
// Frontend log
{"trace_id": "req_abc123", "message": "Audio upload started"}

// Backend log
{"trace_id": "req_abc123", "message": "Forwarding to AI service"}

// AI Service log
{"trace_id": "req_abc123", "message": "Transcription completed"}
```

---

## Alertas y Notificaciones

### Budget Alerts

Cuando el uso del presupuesto excede el umbral (default: 80%):

```python
logger.warning(
    "Budget threshold exceeded: 85%",
    extra={"context": {"monthly_cost": 170, "budget": 200}}
)
```

### Critical Alerts

Cuando el uso excede 95%:

```python
logger.critical(
    "Budget critically exceeded! Consider pausing service.",
    extra={"context": {"monthly_cost": 192, "budget": 200}}
)
```

---

## Revisión de Logs

### En Desarrollo

```bash
# Logs en formato pretty (human-readable)
LOG_FORMAT=pretty docker-compose up

# Output:
# 2025-01-15 14:30:45 [INFO] ai-service [req_abc123] Transcription completed
#   └─ duration=78.2s tokens=2500 cost=$0.18
```

### En Producción

```bash
# Logs en formato JSON
LOG_FORMAT=json docker-compose -f docker-compose.prod.yml up

# Filtrar por nivel
docker logs ai-service 2>&1 | jq 'select(.level == "ERROR")'

# Filtrar por trace ID
docker logs ai-service 2>&1 | jq 'select(.trace_id == "req_abc123")'

# Buscar errores con costo alto
docker logs ai-service 2>&1 | jq 'select(.context.cost_usd > 1.0)'
```

---

## Real-Time Streaming Metrics

### Latency Targets

| Métrica | Target | Descripción |
|---------|--------|-------------|
| **Transcription Latency** | < 2s | Audio chunk → texto visible en frontend |
| **Extraction Latency** | < 3s | Mención verbal → entidad extraída y mostrada |
| **Critical Alert Latency** | < 1s | Interacción medicamentosa → alerta UI |
| **WebSocket Message Latency** | < 500ms (p95) | Server → client event delivery |

### Real-Time Logging Examples

```json
// Transcription event latency tracking
{
  "timestamp": "2025-01-15T14:30:45.123Z",
  "level": "INFO",
  "service": "ai-service",
  "trace_id": "sess_rt_abc123",
  "message": "Transcription chunk processed",
  "context": {
    "chunk_index": 42,
    "audio_duration_ms": 5200,
    "transcription_latency_ms": 1850,
    "speaker": "DOCTOR",
    "word_count": 47
  }
}

// Extraction with entity matching
{
  "timestamp": "2025-01-15T14:30:47.456Z",
  "level": "INFO",
  "service": "ai-service",
  "trace_id": "sess_rt_abc123",
  "message": "Entity extracted",
  "context": {
    "entity_type": "symptom",
    "entity_name": "cefalea frontal",
    "action": "updated",  // created, updated, merged
    "match_similarity": 0.87,
    "extraction_latency_ms": 2450,
    "model_used": "gpt-4o-mini",
    "tokens_used": 245
  }
}

// Critical alert (drug interaction)
{
  "timestamp": "2025-01-15T14:31:02.789Z",
  "level": "WARNING",
  "service": "ai-service",
  "trace_id": "sess_rt_abc123",
  "message": "Drug interaction detected",
  "context": {
    "severity": "MAJOR",
    "medications": ["Ibuprofeno", "Warfarina"],
    "alert_latency_ms": 720,
    "rag_source": "DrugBank",
    "confidence": 0.95
  }
}

// WebSocket reconnection event
{
  "timestamp": "2025-01-15T14:32:15.123Z",
  "level": "INFO",
  "service": "ai-service",
  "trace_id": "sess_rt_abc123",
  "message": "WebSocket reconnection handled",
  "context": {
    "disconnection_duration_ms": 3500,
    "events_replayed": 12,
    "last_event_id": "evt_sess_rt_abc123_00000087",
    "state_recovered": true
  }
}
```

### Aggregated Session Metrics

At session end, log complete metrics:

```json
{
  "timestamp": "2025-01-15T15:30:00.000Z",
  "level": "INFO",
  "service": "ai-service",
  "trace_id": "sess_rt_abc123",
  "message": "Streaming session completed",
  "context": {
    "session_id": "sess_rt_abc123",
    "mode": "realtime",
    "duration_seconds": 3542,
    "audio_chunks_processed": 1254,
    "total_audio_seconds": 2856,
    "events_sent": 87,
    "entities_extracted": {
      "symptoms": 5,
      "diagnoses": 2,
      "prescriptions": 3
    },
    "entity_updates": 8,
    "entity_merges": 2,
    "reconnections": 1,
    "latency_p50_ms": {
      "transcription": 1650,
      "extraction": 2300,
      "websocket": 125
    },
    "latency_p95_ms": {
      "transcription": 1950,
      "extraction": 2850,
      "websocket": 380
    },
    "cost_breakdown": {
      "whisper": 0.17,
      "gpt4o_mini": 0.06,
      "gpt4o": 0.04,
      "embeddings": 0.01,
      "total": 0.28
    },
    "vad_stats": {
      "voice_active_percent": 47,
      "silence_skipped_percent": 25,
      "batched_percent": 17,
      "cost_savings_percent": 22
    }
  }
}
```

---

## Dashboards (Futuro)

Para BSG v2.0, considerar:

- **Grafana + Prometheus**: Métricas en tiempo real
- **Langfuse**: Trazabilidad de prompts y respuestas LLM
- **CloudWatch Dashboards**: Métricas AWS (EC2, latencia, error rate)
- **Custom WebSocket Dashboard**: Active sessions, latency percentiles, reconnection rates

---

## Referencias

- [BSG Requirement: RNF-006 Observabilidad](../../prompts-BSG-new/04-define-non-functional-requirements.md)
- [Structured Logging Best Practices](https://www.structlog.org/)
- [OpenTelemetry for Python](https://opentelemetry.io/docs/instrumentation/python/)
```

## Expected Deliverables

After completing this prompt:

- ✅ `ai-service/src/utils/logger.py` - Structured JSON logger
- ✅ `ai-service/src/core/cost_tracker.py` - Cost tracking system
- ✅ `ai-service/src/api/routes/health.py` - Health check endpoint
- ✅ `ai-service/src/api/routes/costs.py` - Costs dashboard endpoint
- ✅ `ai-service/src/api/main.py` - Updated with routes
- ✅ `docs/observability/README.md` - Observability documentation

## BSG Compliance

This prompt ensures:
- ✅ **Structured logging** (JSON format with timestamp, level, service, trace_id, message)
- ✅ **Health check endpoint** reporting status of all components (PostgreSQL, Redis, ChromaDB, OpenAI, **WebSocket Pool**)
- ✅ **Cost tracking** with real data (tokens, duration, USD) **including batch vs realtime breakdown**
- ✅ **Logging includes**: tokens consumed, LLM latency, vector store latency, errors with stack trace
- ✅ **No print() statements** (only structured logger used)
- ✅ **Dashboard endpoint** for cost monitoring (RF-018) **with mode breakdown**
- ✅ **Trace ID propagation** for distributed tracing
- ✅ **Real-time streaming metrics**: transcription latency, extraction latency, critical alert latency, WebSocket message latency
- ✅ **WebSocket pool monitoring**: active sessions, connection capacity, reconnection events

## Notes

- Logger supports both JSON (production) and pretty (development) formats
- Cost tracker calculates exact costs based on OpenAI pricing (January 2025)
- **Cost tracker differentiates batch vs realtime mode** for accurate cost analysis
- Health check runs all component checks in parallel for low latency
- **Health check includes WebSocket pool capacity monitoring** (warns at 90%)
- Budget alerts at 80% and critical alerts at 95%
- All logs include contextual information for debugging
- Trace IDs propagate through headers for end-to-end request tracking
- **Real-time logging tracks latency at each stage**: audio→transcription, transcription→extraction, extraction→event
- **Aggregated session metrics** logged at session completion for post-hoc analysis
- **Entity matching actions logged**: created, updated, merged with similarity scores
