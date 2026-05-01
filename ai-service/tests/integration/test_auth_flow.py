"""
Integration tests for the authentication layer.

The AI service consumes JWTs minted upstream by the Node.js backend. It does
not expose token issuance, refresh, or login endpoints; this module therefore
exercises:

  * src.security.auth.create_token / verify_token (HTTP request auth)
  * src.security.websocket_auth.verify_websocket_token (WebSocket auth)
  * The 401 surface presented through the API for missing/invalid tokens
"""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from src.core.config import get_settings
from src.security import auth
from src.security.websocket_auth import verify_websocket_token


class TestTokenGeneration:
    def test_token_contains_subject(self):
        settings = get_settings()
        token = auth.create_token({"sub": "doctor-1", "role": "doctor"})

        decoded = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        assert decoded["sub"] == "doctor-1"
        assert decoded["role"] == "doctor"
        assert "exp" in decoded

    def test_token_default_expiry_is_in_the_future(self):
        settings = get_settings()
        token = auth.create_token({"sub": "u"})

        decoded = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        exp = datetime.utcfromtimestamp(decoded["exp"])
        assert exp > datetime.utcnow()

    def test_token_custom_expiry_is_respected(self):
        settings = get_settings()
        token = auth.create_token({"sub": "u"}, expires_delta=timedelta(minutes=5))

        decoded = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        exp = datetime.utcfromtimestamp(decoded["exp"])
        now = datetime.utcnow()
        assert now < exp <= now + timedelta(minutes=6)


class TestTokenVerification:
    def test_verify_valid_token(self):
        token = auth.create_token({"sub": "u-1", "role": "doctor"})
        payload = auth.verify_token(token)
        assert payload["sub"] == "u-1"
        assert payload["role"] == "doctor"

    def test_verify_expired_token_raises_401(self):
        token = auth.create_token({"sub": "u"}, expires_delta=timedelta(seconds=-1))
        with pytest.raises(HTTPException) as exc:
            auth.verify_token(token)
        assert exc.value.status_code == 401

    def test_verify_garbage_token_raises_401(self):
        with pytest.raises(HTTPException) as exc:
            auth.verify_token("not.a.jwt")
        assert exc.value.status_code == 401

    def test_verify_token_signed_with_wrong_key_raises_401(self):
        settings = get_settings()
        bad = jwt.encode({"sub": "u"}, "different-secret-key", algorithm=settings.jwt_algorithm)
        with pytest.raises(HTTPException) as exc:
            auth.verify_token(bad)
        assert exc.value.status_code == 401


class TestWebSocketTokenVerification:
    @pytest.mark.asyncio
    async def test_valid_token_returns_token_data(self):
        token = auth.create_token({"sub": "u-1", "username": "doc1", "roles": ["doctor"]})
        data = await verify_websocket_token(token)
        assert data.user_id == "u-1"
        assert data.username == "doc1"
        assert "doctor" in data.roles

    @pytest.mark.asyncio
    async def test_token_without_sub_rejected(self):
        settings = get_settings()
        bad = jwt.encode({"foo": "bar"}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        with pytest.raises(HTTPException) as exc:
            await verify_websocket_token(bad)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self):
        with pytest.raises(HTTPException) as exc:
            await verify_websocket_token("definitely.not.valid")
        assert exc.value.status_code == 401


class TestApiAuthEnforcement:
    """The 401 surface presented by the API to unauthenticated callers."""

    def test_no_header_returns_401(self, client):
        assert client.get("/api/v1/sessions").status_code == 401

    def test_malformed_bearer_returns_401(self, client):
        resp = client.get(
            "/api/v1/sessions",
            headers={"Authorization": "Bearer not-a-token"},
        )
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client):
        token = auth.create_token({"sub": "u"}, expires_delta=timedelta(seconds=-1))
        resp = client.get(
            "/api/v1/sessions",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_valid_token_passes(self, client, auth_headers):
        resp = client.get("/api/v1/sessions", headers=auth_headers)
        assert resp.status_code == 200
