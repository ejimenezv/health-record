"""
Structured logging with context propagation for HTTP and WebSocket sessions.
"""
import logging
import sys
from contextvars import ContextVar
from typing import Optional

import structlog

from src.core.config import get_settings

request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
session_id_var: ContextVar[Optional[str]] = ContextVar("session_id", default=None)
connection_id_var: ContextVar[Optional[str]] = ContextVar("connection_id", default=None)


def add_context_vars(logger, method_name, event_dict):
    request_id = request_id_var.get()
    user_id = user_id_var.get()
    session_id = session_id_var.get()
    connection_id = connection_id_var.get()

    if request_id:
        event_dict["request_id"] = request_id
    if user_id:
        event_dict["user_id"] = user_id
    if session_id:
        event_dict["session_id"] = session_id
    if connection_id:
        event_dict["connection_id"] = connection_id

    return event_dict


def configure_logging() -> None:
    settings = get_settings()
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    processors = [
        structlog.contextvars.merge_contextvars,
        add_context_vars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.environment == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=log_level)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)


def get_logger(name: Optional[str] = None) -> structlog.BoundLogger:
    return structlog.get_logger(name)


class LogContext:
    """Context manager for setting log context vars."""

    def __init__(
        self,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        connection_id: Optional[str] = None,
    ):
        self.request_id = request_id
        self.user_id = user_id
        self.session_id = session_id
        self.connection_id = connection_id
        self._tokens = []

    def __enter__(self):
        if self.request_id:
            self._tokens.append((request_id_var, request_id_var.set(self.request_id)))
        if self.user_id:
            self._tokens.append((user_id_var, user_id_var.set(self.user_id)))
        if self.session_id:
            self._tokens.append((session_id_var, session_id_var.set(self.session_id)))
        if self.connection_id:
            self._tokens.append((connection_id_var, connection_id_var.set(self.connection_id)))
        return self

    def __exit__(self, *args):
        for var, token in self._tokens:
            var.reset(token)
