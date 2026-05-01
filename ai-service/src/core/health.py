"""
Health check service: aggregates component health for liveness/readiness probes.
"""
import asyncio
import time
from dataclasses import dataclass
from enum import Enum
from typing import Awaitable, Callable, Dict, List, Optional

import structlog

logger = structlog.get_logger()


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class ComponentHealth:
    name: str
    status: HealthStatus
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    details: Optional[Dict] = None


@dataclass
class SystemHealth:
    status: HealthStatus
    components: List[ComponentHealth]
    version: str
    uptime_seconds: float


CheckFn = Callable[[], Awaitable[ComponentHealth]]


class HealthChecker:
    def __init__(self):
        self._start_time = time.time()
        self._checks: Dict[str, CheckFn] = {}

    def register_check(self, name: str, check_fn: CheckFn) -> None:
        self._checks[name] = check_fn

    async def check_all(self) -> SystemHealth:
        from src.core.config import get_settings

        settings = get_settings()
        components: List[ComponentHealth] = []
        overall_status = HealthStatus.HEALTHY

        tasks = [self._run_check(name, fn) for name, fn in self._checks.items()]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                components.append(
                    ComponentHealth(name="unknown", status=HealthStatus.UNHEALTHY, message=str(result))
                )
                overall_status = HealthStatus.UNHEALTHY
                continue

            components.append(result)
            if result.status == HealthStatus.UNHEALTHY:
                overall_status = HealthStatus.UNHEALTHY
            elif result.status == HealthStatus.DEGRADED and overall_status == HealthStatus.HEALTHY:
                overall_status = HealthStatus.DEGRADED

        return SystemHealth(
            status=overall_status,
            components=components,
            version=settings.app_version,
            uptime_seconds=time.time() - self._start_time,
        )

    async def _run_check(self, name: str, check_fn: CheckFn) -> ComponentHealth:
        start = time.time()
        try:
            result = await check_fn()
            latency_ms = (time.time() - start) * 1000

            if isinstance(result, ComponentHealth):
                result.latency_ms = latency_ms
                return result

            return ComponentHealth(
                name=name,
                status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                latency_ms=latency_ms,
            )
        except Exception as e:
            logger.error("Health check failed", check=name, error=str(e))
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                latency_ms=(time.time() - start) * 1000,
                message=str(e),
            )

    async def check_openai(self) -> ComponentHealth:
        from src.core.config import get_settings
        import httpx

        settings = get_settings()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    timeout=5.0,
                )
            if response.status_code == 200:
                return ComponentHealth(name="openai_api", status=HealthStatus.HEALTHY)
            return ComponentHealth(
                name="openai_api",
                status=HealthStatus.DEGRADED,
                message=f"Status code: {response.status_code}",
            )
        except Exception as e:
            return ComponentHealth(name="openai_api", status=HealthStatus.UNHEALTHY, message=str(e))

    async def check_vector_store(self) -> ComponentHealth:
        from src.core.config import get_settings
        import httpx

        settings = get_settings()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://{settings.chromadb_host}:{settings.chromadb_port}/api/v1/heartbeat",
                    timeout=5.0,
                )
            if response.status_code == 200:
                return ComponentHealth(name="vector_store", status=HealthStatus.HEALTHY)
            return ComponentHealth(
                name="vector_store",
                status=HealthStatus.DEGRADED,
                message=f"Status code: {response.status_code}",
            )
        except Exception as e:
            return ComponentHealth(name="vector_store", status=HealthStatus.UNHEALTHY, message=str(e))


health_checker = HealthChecker()


def setup_health_checks() -> None:
    """Register default health checks. Idempotent."""
    health_checker._checks.setdefault("openai_api", health_checker.check_openai)
    health_checker._checks.setdefault("vector_store", health_checker.check_vector_store)
