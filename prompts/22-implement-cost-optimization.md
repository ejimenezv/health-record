# Prompt 22: Implement Real-Time Cost Optimization

## Objective
Implement comprehensive cost optimization strategies for real-time AI services, including streaming-aware caching, batching, model selection, and budget monitoring.

## Context
⚠️ **REAL-TIME ARCHITECTURE**: Cost optimization adapted for streaming transcription, incremental extraction, and async RAG validation pipeline.

Cost optimization is critical for:
- Staying within monthly budget ($50 default)
- Maximizing value from streaming LLM calls
- Providing real-time cost transparency to users
- Enabling production scalability with per-session cost tracking
- Optimizing RAG query costs in validation pipeline

**Key Differences from Batch**:
- **Streaming costs**: Whisper streaming charged per audio chunk, not full file
- **Incremental extraction**: Cache entity-level results, not full transcriptions
- **RAG validation**: Cache medication/interaction lookups across sessions
- **Real-time alerts**: Budget warnings during active sessions

## Tasks

### 1. Create Streaming-Aware Caching Layer

Create `src/services/cache.py`:

```python
"""
Caching layer for streaming LLM responses, embeddings, and RAG results.
Optimized for real-time incremental operations.
"""
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any

import redis.asyncio as redis

from src.core.config import get_settings
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class ResponseCache:
    """
    Cache for LLM responses with TTL, optimized for streaming pipeline.
    """

    def __init__(
        self,
        redis_url: str | None = None,
        default_ttl_hours: int = 24,
    ):
        self.redis_url = redis_url or "redis://redis:6379"
        self.default_ttl = timedelta(hours=default_ttl_hours)
        self._client: redis.Redis | None = None

    async def get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    def _generate_key(self, prefix: str, content: str) -> str:
        """Generate cache key from content hash."""
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"medrecord:{prefix}:{content_hash}"

    # ============================================================
    # STREAMING TRANSCRIPTION CACHING
    # ============================================================

    async def get_chunk_transcription(self, audio_chunk_hash: str) -> str | None:
        """
        Get cached transcription for audio chunk.

        Used by StreamingTranscriptionService to avoid re-transcribing
        identical audio chunks (e.g., repeated silence detection).
        """
        key = f"medrecord:transcription:chunk:{audio_chunk_hash}"
        client = await self.get_client()
        data = await client.get(key)
        if data:
            logger.debug("Cache hit for transcription chunk", extra={"hash": audio_chunk_hash[:12]})
            return data
        return None

    async def set_chunk_transcription(
        self,
        audio_chunk_hash: str,
        transcription: str,
        ttl: timedelta | None = None,
    ) -> None:
        """Cache audio chunk transcription."""
        key = f"medrecord:transcription:chunk:{audio_chunk_hash}"
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(hours=1),  # Short TTL for audio chunks
            transcription,
        )

    # ============================================================
    # INCREMENTAL EXTRACTION CACHING
    # ============================================================

    async def get_entity_extraction(self, text_chunk: str, entity_type: str) -> dict | None:
        """
        Get cached entity extraction for text chunk.

        Used by IncrementalExtractor to avoid re-extracting
        identical text segments.
        """
        key = self._generate_key(f"entity:{entity_type}", text_chunk)
        client = await self.get_client()
        data = await client.get(key)
        if data:
            logger.info("Cache hit for entity extraction", extra={
                "entity_type": entity_type,
                "key": key[:30]
            })
            return json.loads(data)
        return None

    async def set_entity_extraction(
        self,
        text_chunk: str,
        entity_type: str,
        extraction: dict,
        ttl: timedelta | None = None,
    ) -> None:
        """Cache entity extraction result."""
        key = self._generate_key(f"entity:{entity_type}", text_chunk)
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(hours=24),
            json.dumps(extraction),
        )
        logger.debug("Cached entity extraction", extra={"entity_type": entity_type})

    # ============================================================
    # RAG VALIDATION CACHING
    # ============================================================

    async def get_medication_validation(self, medication_name: str) -> dict | None:
        """
        Get cached medication validation from RAG.

        High-value cache: Same medications queried frequently across sessions.
        """
        key = f"medrecord:rag:medication:{medication_name.lower()}"
        client = await self.get_client()
        data = await client.get(key)
        if data:
            logger.info("Cache hit for medication validation", extra={
                "medication": medication_name
            })
            return json.loads(data)
        return None

    async def set_medication_validation(
        self,
        medication_name: str,
        validation_result: dict,
        ttl: timedelta | None = None,
    ) -> None:
        """
        Cache medication validation result.

        TTL: 7 days (medical knowledge changes slowly).
        """
        key = f"medrecord:rag:medication:{medication_name.lower()}"
        client = await self.get_client()
        await client.setex(
            key,
            ttl or timedelta(days=7),
            json.dumps(validation_result),
        )

    async def get_drug_interaction(self, med1: str, med2: str) -> dict | None:
        """
        Get cached drug interaction result.

        CRITICAL: Cache ONLY safe (no interaction) results.
        Never cache interaction alerts to ensure fresh validation.
        """
        # Normalize medication order for consistent cache key
        meds = sorted([med1.lower(), med2.lower()])
        key = f"medrecord:rag:interaction:{meds[0]}:{meds[1]}"
        client = await self.get_client()
        data = await client.get(key)

        if data:
            result = json.loads(data)
            # Only return if no interaction was found
            if result.get("has_interaction") is False:
                logger.info("Cache hit for safe drug interaction", extra={
                    "med1": med1,
                    "med2": med2
                })
                return result

        return None

    async def set_drug_interaction(
        self,
        med1: str,
        med2: str,
        interaction_result: dict,
        ttl: timedelta | None = None,
    ) -> None:
        """
        Cache drug interaction result.

        IMPORTANT: Only cache if no interaction found (has_interaction=False).
        """
        # Only cache safe interactions
        if interaction_result.get("has_interaction") is False:
            meds = sorted([med1.lower(), med2.lower()])
            key = f"medrecord:rag:interaction:{meds[0]}:{meds[1]}"
            client = await self.get_client()
            await client.setex(
                key,
                ttl or timedelta(days=7),
                json.dumps(interaction_result),
            )

    async def get_embedding(self, text: str) -> list[float] | None:
        """Get cached embedding."""
        key = self._generate_key("embedding", text)
        client = await self.get_client()
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_embedding(
        self,
        text: str,
        embedding: list[float],
        ttl: timedelta | None = None,
    ) -> None:
        """Cache embedding (long TTL since embeddings are deterministic)."""
        key = self._generate_key("embedding", text)
        client = await self.get_client()
        # Embeddings can be cached longer
        await client.setex(
            key,
            ttl or timedelta(days=30),
            json.dumps(embedding),
        )

    async def get_rag_result(self, query: str, doc_type: str | None = None) -> dict | None:
        """Get cached RAG result."""
        key = self._generate_key("rag", f"{query}:{doc_type or 'all'}")
        client = await self.get_client()
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_rag_result(
        self,
        query: str,
        result: dict,
        doc_type: str | None = None,
        ttl: timedelta | None = None,
    ) -> None:
        """Cache RAG result."""
        key = self._generate_key("rag", f"{query}:{doc_type or 'all'}")
        client = await self.get_client()
        # RAG results can change if KB is updated
        await client.setex(
            key,
            ttl or timedelta(hours=12),
            json.dumps(result),
        )

    async def get_cache_stats(self) -> dict[str, int]:
        """Get cache statistics for monitoring."""
        client = await self.get_client()

        stats = {
            "total_keys": 0,
            "transcription_chunks": 0,
            "entity_extractions": 0,
            "medication_validations": 0,
            "drug_interactions": 0,
            "embeddings": 0,
        }

        # Count keys by prefix
        async for key in client.scan_iter("medrecord:*"):
            stats["total_keys"] += 1
            if ":transcription:chunk:" in key:
                stats["transcription_chunks"] += 1
            elif ":entity:" in key:
                stats["entity_extractions"] += 1
            elif ":rag:medication:" in key:
                stats["medication_validations"] += 1
            elif ":rag:interaction:" in key:
                stats["drug_interactions"] += 1
            elif ":embedding:" in key:
                stats["embeddings"] += 1

        return stats


class InMemoryCache:
    """
    Simple in-memory cache for development/testing.
    Thread-safe for async operations.
    """

    def __init__(self, max_size: int = 1000):
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self.max_size = max_size

    def _generate_key(self, prefix: str, content: str) -> str:
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"{prefix}:{content_hash}"

    def _cleanup(self) -> None:
        """Remove expired entries."""
        now = datetime.now()
        expired = [k for k, (_, exp) in self._cache.items() if exp < now]
        for k in expired:
            del self._cache[k]

        # Evict oldest if over max size
        if len(self._cache) > self.max_size:
            sorted_keys = sorted(
                self._cache.keys(),
                key=lambda k: self._cache[k][1]
            )
            for k in sorted_keys[:len(self._cache) - self.max_size]:
                del self._cache[k]

    async def get(self, prefix: str, content: str) -> Any | None:
        key = self._generate_key(prefix, content)
        if key in self._cache:
            value, expiry = self._cache[key]
            if expiry > datetime.now():
                return value
            del self._cache[key]
        return None

    async def set(
        self,
        prefix: str,
        content: str,
        value: Any,
        ttl_hours: int = 24,
    ) -> None:
        self._cleanup()
        key = self._generate_key(prefix, content)
        expiry = datetime.now() + timedelta(hours=ttl_hours)
        self._cache[key] = (value, expiry)
```

### 2. Create Model Selection Strategy

Create `src/services/cost_tracker.py` (if not already created by Prompt 39):

```python
"""
Lightweight cost tracker for real-time cost monitoring.
Full implementation in Prompt 39 (Monitoring & Observability).
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Any


@dataclass
class CostEvent:
    """Individual cost event."""
    service: str
    operation: str
    cost_usd: float
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CostSummary:
    """Cost summary for a period."""
    total_cost_usd: float
    by_service: Dict[str, float]
    by_operation: Dict[str, float]
    events_count: int
    period_start: datetime
    period_end: datetime
    budget_remaining_usd: float
    budget_percent_used: float


class CostTracker:
    """
    Lightweight cost tracker for real-time monitoring.

    Tracks costs by service and operation, with budget awareness.
    For full monitoring features, see Prompt 39.
    """

    def __init__(self, monthly_budget_usd: float = 50.0):
        self.monthly_budget = monthly_budget_usd
        self.events: List[CostEvent] = []

    def track(
        self,
        service: str,
        operation: str,
        cost_usd: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Track a cost event."""
        event = CostEvent(
            service=service,
            operation=operation,
            cost_usd=cost_usd,
            metadata=metadata or {}
        )
        self.events.append(event)

    def get_summary(self, since: Optional[datetime] = None) -> CostSummary:
        """Get cost summary for period."""
        if since is None:
            since = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        filtered = [e for e in self.events if e.timestamp >= since]

        by_service: Dict[str, float] = {}
        by_operation: Dict[str, float] = {}

        for e in filtered:
            by_service[e.service] = by_service.get(e.service, 0) + e.cost_usd
            by_operation[e.operation] = by_operation.get(e.operation, 0) + e.cost_usd

        total = sum(e.cost_usd for e in filtered)
        remaining = max(0, self.monthly_budget - total)
        percent_used = (total / self.monthly_budget) * 100 if self.monthly_budget > 0 else 0

        return CostSummary(
            total_cost_usd=total,
            by_service=by_service,
            by_operation=by_operation,
            events_count=len(filtered),
            period_start=since,
            period_end=datetime.now(),
            budget_remaining_usd=remaining,
            budget_percent_used=percent_used
        )
```

Create `src/services/model_selector.py`:

```python
"""
Dynamic model selection based on task complexity and budget.
Adapted for real-time streaming operations.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from src.core.config import get_settings
from src.services.cost_tracker import CostTracker
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class ModelTier(Enum):
    """Available model tiers."""
    FAST_CHEAP = "gpt-4o-mini"      # Fast, cheap, good for simple tasks
    BALANCED = "gpt-4o"              # Balanced quality/cost
    PREMIUM = "gpt-4-turbo"          # Highest quality


@dataclass
class ModelConfig:
    """Configuration for a model tier."""
    model_id: str
    max_tokens: int
    temperature: float
    cost_per_1k_input: float
    cost_per_1k_output: float
    use_cases: list[str]


MODEL_CONFIGS = {
    ModelTier.FAST_CHEAP: ModelConfig(
        model_id="gpt-4o-mini",
        max_tokens=1000,
        temperature=0.1,
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0006,
        use_cases=[
            "medication_lookup",
            "simple_extraction",
            "validation",
            "incremental_entity_extraction",  # Streaming use case
        ],
    ),
    ModelTier.BALANCED: ModelConfig(
        model_id="gpt-4o",
        max_tokens=2048,
        temperature=0.1,
        cost_per_1k_input=0.005,
        cost_per_1k_output=0.015,
        use_cases=[
            "full_extraction",
            "complex_analysis",
            "cie10_suggestion",
            "session_summary",  # Streaming use case
        ],
    ),
    ModelTier.PREMIUM: ModelConfig(
        model_id="gpt-4-turbo",
        max_tokens=4096,
        temperature=0.1,
        cost_per_1k_input=0.01,
        cost_per_1k_output=0.03,
        use_cases=[
            "differential_diagnosis",
            "complex_cases",
        ],
    ),
}


class ModelSelector:
    """
    Selects optimal model based on task and budget.
    Real-time aware with per-session cost tracking.
    """

    def __init__(self, cost_tracker: CostTracker | None = None):
        self.cost_tracker = cost_tracker or CostTracker()

    def select_model(
        self,
        task_type: str,
        input_length: int,
        session_id: str | None = None,
        force_tier: ModelTier | None = None,
    ) -> ModelConfig:
        """
        Select optimal model for task.

        Args:
            task_type: Type of task (extraction, validation, etc.)
            input_length: Approximate input token count
            session_id: Session ID for per-session cost tracking
            force_tier: Force specific tier (overrides logic)

        Returns:
            ModelConfig for selected model
        """
        if force_tier:
            return MODEL_CONFIGS[force_tier]

        # Check budget status
        summary = self.cost_tracker.get_summary()
        budget_percent_used = summary.budget_percent_used

        # If budget is tight, use cheaper model
        if budget_percent_used > 80:
            logger.warning(
                "Budget >80%, forcing cheaper model",
                extra={"budget_percent_used": budget_percent_used}
            )
            return MODEL_CONFIGS[ModelTier.FAST_CHEAP]

        # Check per-session cost if session_id provided
        if session_id:
            session_cost = self._get_session_cost(session_id)
            # If session already expensive, downgrade model
            if session_cost > 0.50:  # $0.50 per session threshold
                logger.info(
                    "Session cost high, using cheaper model",
                    extra={"session_id": session_id, "session_cost": session_cost}
                )
                return MODEL_CONFIGS[ModelTier.FAST_CHEAP]

        # Select based on task type (streaming-aware)
        if task_type in [
            "medication_lookup",
            "simple_validation",
            "incremental_entity_extraction",  # Streaming extraction
        ]:
            return MODEL_CONFIGS[ModelTier.FAST_CHEAP]

        elif task_type in [
            "full_extraction",
            "cie10_suggestion",
            "session_summary",  # Streaming session summary
        ]:
            return MODEL_CONFIGS[ModelTier.BALANCED]

        elif task_type in ["complex_analysis", "differential_diagnosis"]:
            if budget_percent_used < 50:
                return MODEL_CONFIGS[ModelTier.PREMIUM]
            return MODEL_CONFIGS[ModelTier.BALANCED]

        # Default to balanced
        return MODEL_CONFIGS[ModelTier.BALANCED]

    def _get_session_cost(self, session_id: str) -> float:
        """Calculate total cost for a session."""
        session_events = [
            e for e in self.cost_tracker.events
            if e.metadata.get("session_id") == session_id
        ]
        return sum(e.cost_usd for e in session_events)

    def estimate_cost(
        self,
        task_type: str,
        input_tokens: int,
        expected_output_tokens: int = 500,
    ) -> dict[str, float]:
        """Estimate cost for different model tiers."""
        estimates = {}

        for tier, config in MODEL_CONFIGS.items():
            cost = (
                (input_tokens / 1000) * config.cost_per_1k_input +
                (expected_output_tokens / 1000) * config.cost_per_1k_output
            )
            estimates[tier.value] = round(cost, 6)

        return estimates
```

### 3. Create Real-Time Cost Dashboard

Create `src/services/cost_dashboard.py`:

```python
"""
Real-time cost dashboard data provider.
Provides metrics for cost monitoring with streaming-aware analytics.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from src.services.cost_tracker import CostTracker, CostSummary
from src.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SessionCostBreakdown:
    """Cost breakdown for a single session."""
    session_id: str
    total_cost: float
    transcription_cost: float
    extraction_cost: float
    validation_cost: float
    rag_cost: float
    duration_seconds: float
    started_at: datetime
    ended_at: datetime | None


@dataclass
class CostAnalytics:
    """Cost analytics data with streaming metrics."""
    current_month: CostSummary
    previous_month: CostSummary | None
    daily_average: float
    projected_month_end: float
    top_cost_drivers: list[dict[str, Any]]
    cost_per_session: float
    active_sessions_cost: float
    savings_from_optimization: dict[str, float]
    recent_sessions: list[SessionCostBreakdown]


class CostDashboard:
    """
    Provides cost analytics for dashboard display.
    Streaming-aware with per-session cost tracking.
    """

    def __init__(self, cost_tracker: CostTracker):
        self.cost_tracker = cost_tracker

    def get_analytics(self) -> CostAnalytics:
        """Get comprehensive cost analytics with streaming metrics."""
        now = datetime.now()

        # Current month
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        current_summary = self.cost_tracker.get_summary(since=current_month_start)

        # Previous month
        prev_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = current_month_start - timedelta(seconds=1)
        prev_events = [
            e for e in self.cost_tracker.events
            if prev_month_start <= e.timestamp <= prev_month_end
        ]

        prev_summary = None
        if prev_events:
            prev_total = sum(e.cost_usd for e in prev_events)
            prev_summary = CostSummary(
                total_cost_usd=prev_total,
                by_service={},
                by_operation={},
                events_count=len(prev_events),
                period_start=prev_month_start,
                period_end=prev_month_end,
                budget_remaining_usd=0,
                budget_percent_used=0,
            )

        # Daily average
        days_in_month = (now - current_month_start).days + 1
        daily_average = current_summary.total_cost_usd / max(days_in_month, 1)

        # Projected month end
        days_remaining = 30 - days_in_month
        projected = current_summary.total_cost_usd + (daily_average * max(days_remaining, 0))

        # Top cost drivers
        top_drivers = sorted(
            [
                {"service": k, "cost": v, "percent": v / max(current_summary.total_cost_usd, 0.01) * 100}
                for k, v in current_summary.by_service.items()
            ],
            key=lambda x: x["cost"],
            reverse=True,
        )[:5]

        # Cost per session (streaming-aware)
        session_costs = self._get_session_costs()
        cost_per_session = sum(s.total_cost for s in session_costs) / max(len(session_costs), 1)

        # Active sessions cost (last 1 hour)
        one_hour_ago = now - timedelta(hours=1)
        active_sessions_cost = sum(
            e.cost_usd for e in self.cost_tracker.events
            if e.timestamp >= one_hour_ago
        )

        # Savings from optimizations
        cache_savings = self._calculate_cache_savings()
        vad_savings = self._calculate_vad_savings()

        # Recent sessions (last 10)
        recent_sessions = sorted(session_costs, key=lambda s: s.started_at, reverse=True)[:10]

        return CostAnalytics(
            current_month=current_summary,
            previous_month=prev_summary,
            daily_average=round(daily_average, 4),
            projected_month_end=round(projected, 4),
            top_cost_drivers=top_drivers,
            cost_per_session=round(cost_per_session, 4),
            active_sessions_cost=round(active_sessions_cost, 4),
            savings_from_optimization={
                "vad_savings_usd": round(vad_savings, 4),
                "cache_savings_usd": round(cache_savings, 4),
            },
            recent_sessions=recent_sessions,
        )

    def _get_session_costs(self) -> list[SessionCostBreakdown]:
        """Calculate cost breakdown per session."""
        sessions: dict[str, SessionCostBreakdown] = {}

        for event in self.cost_tracker.events:
            session_id = event.metadata.get("session_id")
            if not session_id:
                continue

            if session_id not in sessions:
                sessions[session_id] = SessionCostBreakdown(
                    session_id=session_id,
                    total_cost=0.0,
                    transcription_cost=0.0,
                    extraction_cost=0.0,
                    validation_cost=0.0,
                    rag_cost=0.0,
                    duration_seconds=0.0,
                    started_at=event.timestamp,
                    ended_at=None,
                )

            session = sessions[session_id]
            session.total_cost += event.cost_usd
            session.ended_at = max(session.ended_at or event.timestamp, event.timestamp)

            # Categorize by service
            if event.service == "transcription":
                session.transcription_cost += event.cost_usd
            elif event.service == "extraction":
                session.extraction_cost += event.cost_usd
            elif event.service == "rag":
                session.rag_cost += event.cost_usd
            elif event.service == "validation":
                session.validation_cost += event.cost_usd

            # Calculate duration
            if session.ended_at:
                session.duration_seconds = (session.ended_at - session.started_at).total_seconds()

        return list(sessions.values())

    def _calculate_cache_savings(self) -> float:
        """Estimate savings from cache hits."""
        # Track cache hits from metadata
        cache_hit_savings = 0.0

        for event in self.cost_tracker.events:
            if event.metadata.get("cache_hit"):
                # Estimate what it would have cost without cache
                # Assume cache hit saved full operation cost
                cache_hit_savings += event.metadata.get("saved_cost_usd", 0.0)

        return cache_hit_savings

    def _calculate_vad_savings(self) -> float:
        """Calculate savings from VAD (Voice Activity Detection)."""
        vad_savings = 0.0

        for event in self.cost_tracker.events:
            if "vad_savings_percent" in event.metadata:
                # Calculate what would have been spent without VAD
                original_cost = event.cost_usd / (1 - event.metadata["vad_savings_percent"] / 100)
                vad_savings += original_cost - event.cost_usd

        return vad_savings

    def get_cost_breakdown(self) -> dict[str, Any]:
        """Get detailed cost breakdown for display."""
        analytics = self.get_analytics()

        return {
            "summary": {
                "total_spent": analytics.current_month.total_cost_usd,
                "budget_remaining": analytics.current_month.budget_remaining_usd,
                "budget_percent_used": analytics.current_month.budget_percent_used,
                "daily_average": analytics.daily_average,
                "projected_month_end": analytics.projected_month_end,
            },
            "streaming_metrics": {
                "cost_per_session": analytics.cost_per_session,
                "active_sessions_cost": analytics.active_sessions_cost,
                "recent_sessions": [
                    {
                        "session_id": s.session_id,
                        "total_cost": round(s.total_cost, 4),
                        "transcription_cost": round(s.transcription_cost, 4),
                        "extraction_cost": round(s.extraction_cost, 4),
                        "validation_cost": round(s.validation_cost, 4),
                        "rag_cost": round(s.rag_cost, 4),
                        "duration_seconds": round(s.duration_seconds, 1),
                    }
                    for s in analytics.recent_sessions
                ],
            },
            "by_service": analytics.current_month.by_service,
            "by_operation": analytics.current_month.by_operation,
            "top_drivers": analytics.top_cost_drivers,
            "optimizations": analytics.savings_from_optimization,
            "events_count": analytics.current_month.events_count,
        }

    def get_session_cost(self, session_id: str) -> SessionCostBreakdown | None:
        """Get cost breakdown for a specific session."""
        sessions = self._get_session_costs()
        for session in sessions:
            if session.session_id == session_id:
                return session
        return None

    def check_budget_alert(self) -> dict[str, Any] | None:
        """
        Check if budget alert should be triggered.

        Returns alert data if budget >80%, else None.
        """
        summary = self.cost_tracker.get_summary()

        if summary.budget_percent_used > 80:
            return {
                "level": "warning" if summary.budget_percent_used < 90 else "critical",
                "budget_percent_used": summary.budget_percent_used,
                "budget_remaining_usd": summary.budget_remaining_usd,
                "message": f"Budget {summary.budget_percent_used:.1f}% used. ${summary.budget_remaining_usd:.2f} remaining.",
            }

        return None
```

### 4. Integration with RAG Validation

Add to `src/rag/retriever.py` (update existing):

```python
# Add to RetrieverService.__init__:
from src.services.cache import ResponseCache

self.cache = ResponseCache()

# Update retrieve_medications with caching:
async def retrieve_medications(
    self,
    medication_name: str,
    top_k: int = 3
) -> list[RetrievedDocument]:
    """
    Retrieve medication information with caching (ASYNC).

    Cache significantly reduces costs for frequently queried medications.
    """
    # Check cache first
    cached = await self.cache.get_medication_validation(medication_name)
    if cached:
        return [
            RetrievedDocument(**doc)
            for doc in cached.get("documents", [])
        ]

    # Retrieve from RAG
    result = await self.retrieve(
        query=f"medicamento {medication_name}",
        top_k=top_k,
        doc_type_filter="medication",
    )

    # Cache result
    await self.cache.set_medication_validation(
        medication_name=medication_name,
        validation_result={
            "documents": [
                {
                    "content": doc.content,
                    "metadata": doc.metadata,
                    "similarity_score": doc.similarity_score,
                    "chunk_id": doc.chunk_id,
                }
                for doc in result.documents
            ]
        }
    )

    return result.documents

# Update retrieve_interactions with caching:
async def retrieve_interactions(
    self,
    med1: str,
    med2: str,
    top_k: int = 5
) -> list[RetrievedDocument]:
    """
    Retrieve drug interaction information with safe-result caching (ASYNC).

    IMPORTANT: Only caches if no interaction found (safety-critical).
    """
    # Check cache (only returns if no interaction)
    cached = await self.cache.get_drug_interaction(med1, med2)
    if cached:
        return [
            RetrievedDocument(**doc)
            for doc in cached.get("documents", [])
        ]

    # Retrieve from RAG
    result = await self.retrieve(
        query=f"interacción medicamentosa entre {med1} y {med2}",
        top_k=top_k,
        doc_type_filter="drug_interaction",
    )

    # Check if interaction found
    has_interaction = any(
        doc.similarity_score > 0.8 and
        doc.metadata.get("severidad") in ["CRITICA", "MAYOR"]
        for doc in result.documents
    )

    # Cache only if no interaction (safety-critical)
    if not has_interaction:
        await self.cache.set_drug_interaction(
            med1=med1,
            med2=med2,
            interaction_result={
                "has_interaction": False,
                "documents": [
                    {
                        "content": doc.content,
                        "metadata": doc.metadata,
                        "similarity_score": doc.similarity_score,
                        "chunk_id": doc.chunk_id,
                    }
                    for doc in result.documents
                ]
            }
        )

    return result.documents
```

## Expected Deliverables

1. `src/services/cache.py` - Streaming-aware caching layer with:
   - Chunk-level transcription caching
   - Entity extraction caching
   - RAG validation caching (medications, interactions)
   - Cache statistics for monitoring
2. `src/services/model_selector.py` - Dynamic model selection with per-session cost tracking
3. `src/services/cost_dashboard.py` - Real-time cost analytics with:
   - Per-session cost breakdown
   - Active session monitoring
   - Cache savings tracking
   - Budget alerts
4. Updated RAG retriever with caching integration

## Verification Steps

1. Cache correctly stores and retrieves streaming data:
   - Audio chunk transcriptions
   - Entity extractions
   - Medication validations
   - Safe drug interactions (no-interaction results only)
2. Model selector adapts to budget constraints and per-session costs
3. Cost dashboard provides real-time session metrics
4. Budget alerts trigger at 80% and 90% thresholds
5. Cache statistics show hit rates and savings
6. RAG validation caching reduces duplicate queries

## Integration with Real-Time Pipeline

### Streaming Transcription (Prompt 17)
```python
# StreamingTranscriptionService uses chunk-level caching
cached_text = await self.cache.get_chunk_transcription(chunk_hash)
if cached_text:
    return cached_text
```

### Incremental Extraction (Prompt 19)
```python
# IncrementalExtractor uses entity-level caching
cached_entity = await self.cache.get_entity_extraction(text_chunk, "medication")
if cached_entity:
    return cached_entity
```

### RAG Validation (Prompt 21)
```python
# RAGValidationCoordinator uses medication/interaction caching via RetrieverService
docs = await self.retriever.retrieve_medications("Paracetamol")
# Cache hit → no RAG query, saves embedding + vector search cost
```

## Cost Optimization Strategies

| Strategy | Savings | Implementation |
|----------|---------|---------------|
| **VAD (Prompt 14)** | 30-50% transcription cost | Silence detection before Whisper |
| **Chunk caching** | 10-20% transcription cost | Cache repeated audio patterns |
| **Entity caching** | 15-30% extraction cost | Cache entity extractions for similar text |
| **Medication caching** | 40-60% RAG cost | Cache common medication validations |
| **Safe interaction caching** | 20-40% RAG cost | Cache negative interaction results |
| **Embedding caching** | 50-70% embedding cost | Cache embeddings (deterministic) |
| **Model selection** | 30-50% LLM cost | Use gpt-4o-mini for simple tasks |

**Example Session Cost Breakdown**:
- Without optimization: $0.25/session
- With all optimizations: $0.08/session (68% reduction)

## Notes

- **Redis cache**: Production-ready with TTL management
- **In-memory cache**: Development/testing only
- **Safety-critical caching**: Only cache safe drug interactions (no interaction found)
- **Cache invalidation**: TTLs ensure fresh medical data
- **Per-session tracking**: Enables cost monitoring during active sessions
- **Budget alerts**: Real-time warnings at 80%/90% thresholds
- **Streaming-aware**: All caching adapted for incremental operations
