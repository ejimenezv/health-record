"""Unit tests for src/core/logging.py and src/utils/logger.py."""
import json
import logging

import pytest

from src.core.logging import (
    LogContext,
    add_context_vars,
    configure_logging,
    connection_id_var,
    get_logger as core_get_logger,
    request_id_var,
    session_id_var,
    user_id_var,
)
from src.utils.logger import (
    JSONFormatter,
    LoggerAdapter,
    get_logger as utils_get_logger,
    setup_logging,
)


class TestCoreLogging:
    def test_add_context_vars_with_no_context(self):
        # Reset all context vars
        request_id_var.set(None)
        user_id_var.set(None)
        session_id_var.set(None)
        connection_id_var.set(None)

        result = add_context_vars(None, "info", {"event": "test"})
        # No context fields injected
        for key in ("request_id", "user_id", "session_id", "connection_id"):
            assert key not in result

    def test_add_context_vars_with_full_context(self):
        request_id_var.set("req-1")
        user_id_var.set("user-1")
        session_id_var.set("sess-1")
        connection_id_var.set("conn-1")

        try:
            result = add_context_vars(None, "info", {"event": "test"})
            assert result["request_id"] == "req-1"
            assert result["user_id"] == "user-1"
            assert result["session_id"] == "sess-1"
            assert result["connection_id"] == "conn-1"
        finally:
            request_id_var.set(None)
            user_id_var.set(None)
            session_id_var.set(None)
            connection_id_var.set(None)

    def test_configure_logging_sets_up_structlog(self):
        # Just call it; should not raise
        configure_logging()

    def test_get_logger_returns_bound_logger(self):
        log = core_get_logger("test")
        assert log is not None

    def test_log_context_manager_sets_and_resets(self):
        request_id_var.set(None)
        user_id_var.set(None)

        assert request_id_var.get() is None

        with LogContext(request_id="req-x", user_id="user-x", session_id="s-x", connection_id="c-x"):
            assert request_id_var.get() == "req-x"
            assert user_id_var.get() == "user-x"
            assert session_id_var.get() == "s-x"
            assert connection_id_var.get() == "c-x"

        # After exit, all restored
        assert request_id_var.get() is None
        assert user_id_var.get() is None

    def test_log_context_manager_partial(self):
        request_id_var.set(None)
        with LogContext(request_id="req-y"):
            assert request_id_var.get() == "req-y"
        assert request_id_var.get() is None


class TestJSONFormatter:
    def test_basic_format(self):
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="x.py",
            lineno=1,
            msg="hello %s",
            args=("world",),
            exc_info=None,
        )
        output = formatter.format(record)
        data = json.loads(output)

        assert data["level"] == "INFO"
        assert data["service"] == "medrecord-ai-service"
        assert data["message"] == "hello world"
        assert data["logger"] == "test"
        assert "timestamp" in data

    def test_format_with_request_id(self):
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="x.py",
            lineno=1,
            msg="msg",
            args=(),
            exc_info=None,
        )
        record.request_id = "abc-123"
        data = json.loads(formatter.format(record))
        assert data["trace_id"] == "abc-123"

    def test_format_with_extra_fields(self):
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="x.py",
            lineno=1,
            msg="msg",
            args=(),
            exc_info=None,
        )
        record.user_id = "user-1"
        record.custom_field = "value"
        data = json.loads(formatter.format(record))
        assert data["extra"]["user_id"] == "user-1"
        assert data["extra"]["custom_field"] == "value"

    def test_format_with_exception(self):
        formatter = JSONFormatter()
        try:
            raise ValueError("boom")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="x.py",
            lineno=1,
            msg="failure",
            args=(),
            exc_info=exc_info,
        )
        data = json.loads(formatter.format(record))
        assert "exception" in data
        assert "ValueError" in data["exception"]


class TestUtilsLogger:
    def test_setup_logging_replaces_handlers(self):
        setup_logging("DEBUG")
        root = logging.getLogger()
        assert root.level == logging.DEBUG
        assert len(root.handlers) >= 1

    def test_get_logger_returns_logger(self):
        log = utils_get_logger("foo")
        assert isinstance(log, logging.Logger)
        assert log.name == "foo"

    def test_logger_adapter_merges_extra(self):
        base = utils_get_logger("adapter-test")
        adapter = LoggerAdapter(base, {"service": "test-svc"})
        msg, kwargs = adapter.process("hello", {"extra": {"req_id": "1"}})
        assert msg == "hello"
        assert kwargs["extra"]["service"] == "test-svc"
        assert kwargs["extra"]["req_id"] == "1"

    def test_logger_adapter_creates_extra_when_missing(self):
        base = utils_get_logger("adapter-test-2")
        adapter = LoggerAdapter(base, {"key": "val"})
        msg, kwargs = adapter.process("hi", {})
        assert kwargs["extra"]["key"] == "val"
