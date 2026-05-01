"""
Logger estructurado en formato JSON para observabilidad.
Cumple con requisitos BSG de logging estructurado.
"""
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class JSONFormatter(logging.Formatter):
    """Formatter que produce logs en JSON estructurado."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "medrecord-ai-service",
            "message": record.getMessage(),
            "logger": record.name,
        }

        if hasattr(record, "request_id"):
            log_data["trace_id"] = record.request_id

        if hasattr(record, "__dict__"):
            extra = {
                k: v
                for k, v in record.__dict__.items()
                if k
                not in (
                    "name", "msg", "args", "created", "filename",
                    "funcName", "levelname", "levelno", "lineno",
                    "module", "msecs", "pathname", "process",
                    "processName", "relativeCreated", "stack_info",
                    "exc_info", "exc_text", "thread", "threadName",
                    "message", "request_id", "taskName",
                )
            }
            if extra:
                log_data["extra"] = extra

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, default=str)


def setup_logging(level: str = "INFO") -> None:
    """Configure logging for the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)

    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """Adapter to add context to all log messages."""

    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict]:
        extra = kwargs.get("extra", {})
        extra.update(self.extra)
        kwargs["extra"] = extra
        return msg, kwargs
