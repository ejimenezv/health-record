"""
Shared auth helper for load tests.

Mints JWTs locally via src.security.auth.create_token using the same
JWT_SECRET_KEY the AI service is configured with. No /auth/token endpoint
exists in the live contract — auth is JWT-only.

Run load tests from the `ai-service/` directory so this import resolves,
or set PYTHONPATH=ai-service.
"""
from __future__ import annotations

import os
from datetime import timedelta
from typing import Any

from src.security.auth import create_token


DEFAULT_TTL_MIN = 60


def mint_token(
    sub: str = "loadtest-user",
    role: str = "doctor",
    ttl_minutes: int = DEFAULT_TTL_MIN,
    **extra: Any,
) -> str:
    """Mint a JWT for load tests. Mirrors the integration-test helpers."""
    payload = {"sub": sub, "role": role, **extra}
    return create_token(payload, expires_delta=timedelta(minutes=ttl_minutes))


def auth_headers(token: str | None = None, **mint_kwargs: Any) -> dict[str, str]:
    """Return Bearer headers; mints a token if one is not supplied."""
    token = token or os.getenv("LOADTEST_JWT") or mint_token(**mint_kwargs)
    return {"Authorization": f"Bearer {token}"}
