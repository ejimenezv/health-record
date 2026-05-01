"""
HTTP middleware for collecting request metrics.
"""
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.metrics import metrics


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        labels = {
            "method": request.method,
            "path": self._normalize_path(request.url.path),
        }
        start_time = time.time()

        try:
            response = await call_next(request)
            labels["status"] = str(response.status_code)
        except Exception:
            labels["status"] = "500"
            raise
        finally:
            duration = time.time() - start_time
            metrics.requests_total.inc(labels=labels)
            metrics.request_duration.observe(duration, labels=labels)

        return response

    def _normalize_path(self, path: str) -> str:
        return "/".join("{id}" if self._is_id(part) else part for part in path.split("/"))

    @staticmethod
    def _is_id(part: str) -> bool:
        if not part:
            return False
        if len(part) == 36 and part.count("-") == 4:
            return True
        return part.isdigit()
