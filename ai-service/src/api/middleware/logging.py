"""
HTTP middleware for request logging and request_id propagation.
"""
import time
import uuid

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.logging import request_id_var, user_id_var

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        req_token = request_id_var.set(request_id)

        user_id = getattr(request.state, "user_id", None)
        user_token = user_id_var.set(user_id) if user_id else None

        start_time = time.time()
        logger.info(
            "Request started",
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else None,
        )

        try:
            response = await call_next(request)
        except Exception as e:
            logger.exception(
                "Request failed with exception",
                method=request.method,
                path=request.url.path,
                error=str(e),
            )
            raise
        finally:
            request_id_var.reset(req_token)
            if user_token is not None:
                user_id_var.reset(user_token)

        duration_ms = (time.time() - start_time) * 1000
        logger.info(
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )

        response.headers["X-Request-ID"] = request_id
        return response
