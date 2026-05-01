"""
Health, readiness, liveness, and metrics endpoints.
"""
from typing import Dict

from fastapi import APIRouter, Response

from src.core.health import HealthStatus, health_checker
from src.core.metrics import metrics

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> Dict:
    """Comprehensive health check (BSG required)."""
    system_health = await health_checker.check_all()
    return {
        "status": system_health.status.value,
        "version": system_health.version,
        "uptime_seconds": round(system_health.uptime_seconds, 2),
        "components": [
            {
                "name": c.name,
                "status": c.status.value,
                "latency_ms": round(c.latency_ms, 2) if c.latency_ms else None,
                "message": c.message,
                "details": c.details,
            }
            for c in system_health.components
        ],
    }


@router.get("/health/live", tags=["health"])
async def liveness_probe() -> Dict:
    """Kubernetes liveness probe."""
    return {"status": "alive"}


@router.get("/health/ready", tags=["health"])
async def readiness_probe(response: Response) -> Dict:
    """Kubernetes readiness probe."""
    system_health = await health_checker.check_all()
    if system_health.status == HealthStatus.UNHEALTHY:
        response.status_code = 503
        return {"status": "not_ready", "reason": "Critical components unhealthy"}
    return {"status": "ready"}


@router.get("/metrics", tags=["observability"])
async def get_metrics() -> Dict:
    """Metrics snapshot (JSON)."""
    return metrics.get_all_metrics()


@router.get("/metrics/costs", tags=["observability"])
async def get_cost_metrics() -> Dict:
    """API usage and cost breakdown."""
    return {
        "total_cost_usd": sum(metrics.api_cost_usd._values.values()),
        "total_tokens": sum(metrics.tokens_used._values.values()),
        "transcription": {
            "requests": sum(metrics.transcription_requests._values.values()),
            "audio_seconds": sum(metrics.transcription_audio_seconds._values.values()),
        },
        "extraction": {
            "requests": sum(metrics.extraction_requests._values.values()),
        },
        "rag": {
            "queries": sum(metrics.rag_queries._values.values()),
        },
    }
