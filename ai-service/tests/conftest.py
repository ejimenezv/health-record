"""Shared pytest fixtures for the AI Service test suite."""
import os

import pytest


@pytest.fixture(autouse=True)
def _set_test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provide minimum required env vars so Settings() can instantiate."""
    monkeypatch.setenv("ENVIRONMENT", "testing")
    monkeypatch.setenv("OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", "sk-test"))
    monkeypatch.setenv(
        "JWT_SECRET_KEY",
        os.getenv("JWT_SECRET_KEY", "test-secret-key-min-32-characters-long-xx"),
    )
