"""
Costs dashboard endpoint (BSG RF-018).

Reports OpenAI API spend with the BSG-required shape: monthly total,
budget usage, projected month-end, per-service breakdown, and per-mode
(batch vs realtime) breakdown. Backed by the in-memory metrics collector
and settings.monthly_budget_usd.
"""
from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter

from src.core.config import get_settings
from src.core.metrics import metrics

router = APIRouter()


def _sum_counter(values: Dict[str, float]) -> float:
    return sum(values.values())


def _sum_counter_by_label(values: Dict[str, float], label: str, value: str) -> float:
    """Sum counter values whose labels-key string contains a given (label, value) pair."""
    needle = f"('{label}', '{value}')"
    return sum(v for k, v in values.items() if needle in k)


def _consultations_processed() -> int:
    """
    Approximate consultations as the count of distinct active+completed sessions.
    The metrics collector tracks transcription_requests per session label when
    available; otherwise fall back to the active_sessions gauge.
    """
    transcription_keys = list(metrics.transcription_requests._values.keys())
    if transcription_keys:
        return len(transcription_keys)
    return int(_sum_counter(metrics.active_sessions._values))


@router.get("/costs", tags=["observability"], summary="Cost dashboard (BSG RF-018)")
async def get_costs_dashboard() -> Dict:
    """
    Return cost dashboard data conforming to BSG RF-018.

    Shape:
        period, total_cost, budget, percent_used, projected_monthly,
        breakdown (per service), mode_breakdown (batch vs realtime),
        consultations_processed, avg_cost_per_consultation, cache_hit_rate.
    """
    settings = get_settings()
    budget = settings.monthly_budget_usd

    total_cost = _sum_counter(metrics.api_cost_usd._values)
    percent_used = (total_cost / budget * 100) if budget > 0 else 0.0

    now = datetime.now(timezone.utc)
    day_of_month = now.day
    days_in_month = 30
    projected = (total_cost / day_of_month) * days_in_month if day_of_month > 0 else 0.0

    breakdown: Dict[str, float] = {}
    for label_key, value in metrics.api_cost_usd._values.items():
        # label_key is the str(sorted(labels.items())); extract a "service" label if present.
        if "'service'" in label_key:
            start = label_key.find("'service', '") + len("'service', '")
            end = label_key.find("'", start)
            service = label_key[start:end] if start >= 0 and end > start else "unknown"
        else:
            service = "unknown"
        breakdown[service] = breakdown.get(service, 0.0) + value

    batch_cost = _sum_counter_by_label(metrics.api_cost_usd._values, "mode", "batch")
    realtime_cost = _sum_counter_by_label(metrics.api_cost_usd._values, "mode", "realtime")

    consultations = _consultations_processed()
    avg_per_consultation = (total_cost / consultations) if consultations > 0 else 0.0

    return {
        "period": now.strftime("%Y-%m"),
        "total_cost": round(total_cost, 4),
        "budget": budget,
        "percent_used": round(percent_used, 2),
        "projected_monthly": round(projected, 4),
        "breakdown": {k: round(v, 4) for k, v in breakdown.items()},
        "mode_breakdown": {
            "batch": round(batch_cost, 4),
            "realtime": round(realtime_cost, 4),
        },
        "consultations_processed": consultations,
        "avg_cost_per_consultation": round(avg_per_consultation, 4),
        "cache_hit_rate": 0.0,
    }
