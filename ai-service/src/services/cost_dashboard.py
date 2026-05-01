"""
Real-time cost dashboard data provider.
Provides metrics for cost monitoring with streaming-aware analytics.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from src.services.cost_tracker import CostSummary, CostTracker
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

        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        current_summary = self.cost_tracker.get_summary(since=current_month_start)

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

        days_in_month = (now - current_month_start).days + 1
        daily_average = current_summary.total_cost_usd / max(days_in_month, 1)

        days_remaining = 30 - days_in_month
        projected = current_summary.total_cost_usd + (daily_average * max(days_remaining, 0))

        top_drivers = sorted(
            [
                {
                    "service": k,
                    "cost": v,
                    "percent": v / max(current_summary.total_cost_usd, 0.01) * 100,
                }
                for k, v in current_summary.by_service.items()
            ],
            key=lambda x: x["cost"],
            reverse=True,
        )[:5]

        session_costs = self._get_session_costs()
        cost_per_session = sum(s.total_cost for s in session_costs) / max(len(session_costs), 1)

        one_hour_ago = now - timedelta(hours=1)
        active_sessions_cost = sum(
            e.cost_usd for e in self.cost_tracker.events
            if e.timestamp >= one_hour_ago
        )

        cache_savings = self._calculate_cache_savings()
        vad_savings = self._calculate_vad_savings()

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

            if event.service == "transcription":
                session.transcription_cost += event.cost_usd
            elif event.service == "extraction":
                session.extraction_cost += event.cost_usd
            elif event.service == "rag":
                session.rag_cost += event.cost_usd
            elif event.service == "validation":
                session.validation_cost += event.cost_usd

            if session.ended_at:
                session.duration_seconds = (session.ended_at - session.started_at).total_seconds()

        return list(sessions.values())

    def _calculate_cache_savings(self) -> float:
        """Estimate savings from cache hits."""
        cache_hit_savings = 0.0

        for event in self.cost_tracker.events:
            if event.metadata.get("cache_hit"):
                cache_hit_savings += event.metadata.get("saved_cost_usd", 0.0)

        return cache_hit_savings

    def _calculate_vad_savings(self) -> float:
        """Calculate savings from VAD (Voice Activity Detection)."""
        vad_savings = 0.0

        for event in self.cost_tracker.events:
            if "vad_savings_percent" in event.metadata:
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
        """Check if budget alert should be triggered."""
        summary = self.cost_tracker.get_summary()

        if summary.budget_percent_used > 80:
            return {
                "level": "warning" if summary.budget_percent_used < 90 else "critical",
                "budget_percent_used": summary.budget_percent_used,
                "budget_remaining_usd": summary.budget_remaining_usd,
                "message": f"Budget {summary.budget_percent_used:.1f}% used. ${summary.budget_remaining_usd:.2f} remaining.",
            }

        return None
