"""
Lightweight cost tracker for real-time cost monitoring.
Full implementation in Prompt 39 (Monitoring & Observability).
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


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
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Track a cost event."""
        event = CostEvent(
            service=service,
            operation=operation,
            cost_usd=cost_usd,
            metadata=metadata or {},
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
            budget_percent_used=percent_used,
        )
