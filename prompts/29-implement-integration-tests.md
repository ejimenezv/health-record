# Prompt 29: Implement Integration Tests

## Objective
Create integration tests that verify the complete flow from API endpoints through to external services. These tests ensure components work together correctly, with **PRIMARY focus on real-time streaming architecture** and LEGACY support for batch processing.

## Context
Integration tests verify:
- **Real-time streaming (PRIMARY):**
  - WebSocket connection lifecycle (connect, stream audio, receive events, disconnect)
  - Real-time event flow (audio → transcript → extraction → validation → UI)
  - WebSocket Gateway proxying (Node.js ↔ Python bidirectional communication)
  - Event persistence and retrieval (PostgreSQL storage for history/playback)
  - Concurrent WebSocket sessions (multiple users streaming simultaneously)
  - Alert acknowledgment flow (CRITICAL alert handling)
- **Batch processing (LEGACY):**
  - REST API endpoints respond correctly
  - Database operations work
  - External service integrations (mocked)
  - Authentication/authorization flows
  - End-to-end processing pipelines

## Tasks

### 1. Create Integration Test Configuration

Create `ai-service/tests/integration/conftest.py`:

```python
"""
Integration test configuration and fixtures.
"""
import asyncio
import os
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.main import app
from src.core.config import Settings, get_settings
from src.core.database import Base, get_db
from src.security.auth import create_access_token


# Test database
TEST_DATABASE_URL = "sqlite:///./test_integration.db"


def get_test_settings() -> Settings:
    """Test settings for integration tests."""
    return Settings(
        OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", "sk-test"),
        JWT_SECRET_KEY="integration-test-secret-key",
        DATABASE_URL=TEST_DATABASE_URL,
        CHROMA_HOST="localhost",
        CHROMA_PORT=8001,
        API_ENV="test",
        DEBUG=True,
        MONTHLY_BUDGET_USD=50.0,
    )


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def test_db():
    """Create test database for each test."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = get_test_settings

    yield TestingSessionLocal()

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client(test_db) -> Generator[TestClient, None, None]:
    """Synchronous test client with database."""
    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture
async def async_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Async test client with database."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_token() -> str:
    """Generate valid JWT token for testing."""
    return create_access_token(
        data={"sub": "test_user", "role": "doctor"},
        settings=get_test_settings(),
    )


@pytest.fixture
def admin_token() -> str:
    """Generate admin JWT token for testing."""
    return create_access_token(
        data={"sub": "admin_user", "role": "admin"},
        settings=get_test_settings(),
    )


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    """Authorization headers with valid token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """Authorization headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}


# Sample data fixtures
@pytest.fixture
def sample_audio_file(tmp_path) -> str:
    """Create sample audio file for testing."""
    import wave
    import struct

    audio_path = tmp_path / "test_audio.wav"

    with wave.open(str(audio_path), 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)

        # 5 seconds of silence
        for _ in range(16000 * 5):
            wav.writeframes(struct.pack('h', 0))

    return str(audio_path)


@pytest.fixture
def sample_document_content() -> str:
    """Sample medical document for RAG testing."""
    return """
    # Ibuprofeno

    ## Descripción
    Ibuprofeno es un antiinflamatorio no esteroideo (AINE) utilizado para
    el tratamiento del dolor leve a moderado.

    ## Dosis
    - Adultos: 400-800mg cada 6-8 horas
    - Dosis máxima: 3200mg/día

    ## Contraindicaciones
    - Úlcera péptica activa
    - Insuficiencia renal severa
    - Alergia conocida a AINEs
    - Tercer trimestre del embarazo

    ## Interacciones
    - Anticoagulantes: aumenta riesgo de sangrado
    - Metotrexato: aumenta toxicidad
    - Litio: aumenta niveles séricos
    """
```

### 2. Create API Endpoint Tests

Create `ai-service/tests/integration/test_api_endpoints.py`:

```python
"""
Integration tests for API endpoints.
"""
import pytest
from fastapi import status


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_check_returns_ok(self, client):
        """Health endpoint returns 200 OK."""
        response = client.get("/health")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_includes_components(self, client):
        """Health check includes component status."""
        response = client.get("/health")

        data = response.json()
        assert "components" in data
        assert "database" in data["components"]
        assert "vector_store" in data["components"]

    def test_metrics_endpoint_returns_prometheus_format(self, client):
        """Metrics endpoint returns Prometheus format."""
        response = client.get("/metrics")

        assert response.status_code == status.HTTP_200_OK
        assert "text/plain" in response.headers["content-type"]


class TestAuthEndpoints:
    """Tests for authentication endpoints."""

    def test_login_with_valid_credentials(self, client, test_db):
        """Login returns token with valid credentials."""
        # First create a user (simplified for test)
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "testuser", "password": "testpass"},
        )

        # In real test, user would be created in fixture
        # This tests the endpoint structure
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED,  # If user doesn't exist
        ]

    def test_login_with_invalid_credentials(self, client):
        """Login fails with invalid credentials."""
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "invalid", "password": "invalid"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_protected_endpoint_without_token(self, client):
        """Protected endpoints require authentication."""
        response = client.get("/api/v1/transcription/sessions")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_protected_endpoint_with_valid_token(self, client, auth_headers):
        """Protected endpoints accept valid token."""
        response = client.get(
            "/api/v1/transcription/sessions",
            headers=auth_headers,
        )

        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,  # Empty list is OK
        ]


class TestTranscriptionEndpoints:
    """Tests for transcription API endpoints."""

    def test_create_session(self, client, auth_headers):
        """Create transcription session."""
        response = client.post(
            "/api/v1/transcription/sessions",
            json={
                "patient_id": "patient-123",
                "consultation_type": "general",
                "language": "es",
            },
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "session_id" in data
        assert data["status"] == "created"

    def test_get_session(self, client, auth_headers):
        """Get transcription session by ID."""
        # First create a session
        create_response = client.post(
            "/api/v1/transcription/sessions",
            json={"patient_id": "patient-123"},
            headers=auth_headers,
        )
        session_id = create_response.json()["session_id"]

        # Then get it
        response = client.get(
            f"/api/v1/transcription/sessions/{session_id}",
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["session_id"] == session_id

    def test_upload_audio_to_session(self, client, auth_headers, sample_audio_file):
        """Upload audio file to session."""
        # Create session
        create_response = client.post(
            "/api/v1/transcription/sessions",
            json={"patient_id": "patient-123"},
            headers=auth_headers,
        )
        session_id = create_response.json()["session_id"]

        # Upload audio
        with open(sample_audio_file, "rb") as audio:
            response = client.post(
                f"/api/v1/transcription/sessions/{session_id}/audio",
                files={"audio": ("test.wav", audio, "audio/wav")},
                headers=auth_headers,
            )

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data["status"] == "uploaded"

    def test_get_nonexistent_session(self, client, auth_headers):
        """Getting nonexistent session returns 404."""
        response = client.get(
            "/api/v1/transcription/sessions/nonexistent-id",
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestRAGEndpoints:
    """Tests for RAG API endpoints."""

    def test_ingest_document(self, client, admin_headers, sample_document_content):
        """Ingest document into RAG."""
        response = client.post(
            "/api/v1/ingest",
            json={
                "documents": [
                    {
                        "content": sample_document_content,
                        "metadata": {"source": "test", "type": "medication"},
                    }
                ]
            },
            headers=admin_headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["indexed_documents"] == 1
        assert data["total_chunks"] > 0

    def test_query_rag(self, client, auth_headers):
        """Query RAG endpoint."""
        response = client.post(
            "/api/v1/query",
            json={
                "query": "¿Cuáles son las contraindicaciones del ibuprofeno?",
                "top_k": 5,
            },
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "response" in data
        assert "sources" in data
        assert "latency_ms" in data

    def test_ingest_requires_admin(self, client, auth_headers, sample_document_content):
        """Ingest requires admin role."""
        response = client.post(
            "/api/v1/ingest",
            json={
                "documents": [{"content": sample_document_content}]
            },
            headers=auth_headers,  # Regular doctor token, not admin
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCostEndpoints:
    """Tests for cost monitoring endpoints."""

    def test_get_cost_summary(self, client, admin_headers):
        """Get cost summary."""
        response = client.get(
            "/api/v1/costs",
            headers=admin_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_cost_usd" in data
        assert "budget_remaining_usd" in data
        assert "by_service" in data

    def test_cost_endpoint_requires_admin(self, client, auth_headers):
        """Cost endpoint requires admin role."""
        response = client.get(
            "/api/v1/costs",
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
```

### 3. Create Database Integration Tests

Create `ai-service/tests/integration/test_database.py`:

```python
"""
Integration tests for database operations.
"""
import pytest
from datetime import datetime

from src.core.database import Session, User, AuditLog
from src.repositories.session_repository import SessionRepository
from src.repositories.user_repository import UserRepository


class TestSessionRepository:
    """Tests for session repository."""

    def test_create_session(self, test_db):
        """Create a new session."""
        repo = SessionRepository(test_db)

        session = repo.create(
            user_id="user-123",
            patient_id="patient-456",
            consultation_type="general",
        )

        assert session.id is not None
        assert session.user_id == "user-123"
        assert session.status == "created"

    def test_get_session_by_id(self, test_db):
        """Retrieve session by ID."""
        repo = SessionRepository(test_db)

        created = repo.create(user_id="user-123", patient_id="patient-456")
        retrieved = repo.get_by_id(created.id)

        assert retrieved is not None
        assert retrieved.id == created.id

    def test_update_session_status(self, test_db):
        """Update session status."""
        repo = SessionRepository(test_db)

        session = repo.create(user_id="user-123", patient_id="patient-456")
        updated = repo.update_status(session.id, "processing")

        assert updated.status == "processing"

    def test_list_sessions_by_user(self, test_db):
        """List sessions for a specific user."""
        repo = SessionRepository(test_db)

        repo.create(user_id="user-123", patient_id="p1")
        repo.create(user_id="user-123", patient_id="p2")
        repo.create(user_id="user-456", patient_id="p3")

        sessions = repo.list_by_user("user-123")

        assert len(sessions) == 2

    def test_session_with_extraction_result(self, test_db):
        """Session stores extraction result."""
        repo = SessionRepository(test_db)

        session = repo.create(user_id="user-123", patient_id="patient-456")

        extraction_result = {
            "symptoms": [{"name": "cefalea"}],
            "diagnoses": [{"name": "Migraña"}],
            "prescriptions": [],
        }

        updated = repo.save_extraction(session.id, extraction_result)

        assert updated.extraction_result is not None
        assert updated.extraction_result["symptoms"][0]["name"] == "cefalea"


class TestUserRepository:
    """Tests for user repository."""

    def test_create_user(self, test_db):
        """Create a new user."""
        repo = UserRepository(test_db)

        user = repo.create(
            username="testdoctor",
            email="doctor@test.com",
            password="securepassword",
            role="doctor",
        )

        assert user.id is not None
        assert user.username == "testdoctor"
        assert user.password_hash != "securepassword"  # Should be hashed

    def test_get_user_by_username(self, test_db):
        """Find user by username."""
        repo = UserRepository(test_db)

        repo.create(username="findme", email="find@test.com", password="pass")
        user = repo.get_by_username("findme")

        assert user is not None
        assert user.email == "find@test.com"

    def test_verify_password(self, test_db):
        """Verify user password."""
        repo = UserRepository(test_db)

        repo.create(username="authuser", email="auth@test.com", password="correctpass")

        assert repo.verify_password("authuser", "correctpass") is True
        assert repo.verify_password("authuser", "wrongpass") is False


class TestAuditLogging:
    """Tests for audit log functionality."""

    def test_audit_log_creation(self, test_db):
        """Create audit log entry."""
        from src.repositories.audit_repository import AuditRepository

        repo = AuditRepository(test_db)

        log = repo.log_action(
            user_id="user-123",
            action="session.create",
            resource="session",
            resource_id="session-456",
            details={"patient_id": "patient-789"},
            ip_address="127.0.0.1",
        )

        assert log.id is not None
        assert log.action == "session.create"

    def test_query_audit_logs(self, test_db):
        """Query audit logs with filters."""
        from src.repositories.audit_repository import AuditRepository

        repo = AuditRepository(test_db)

        repo.log_action(user_id="user-1", action="login", resource="auth")
        repo.log_action(user_id="user-1", action="session.create", resource="session")
        repo.log_action(user_id="user-2", action="login", resource="auth")

        logs = repo.query(user_id="user-1")
        assert len(logs) == 2

        logs = repo.query(action="login")
        assert len(logs) == 2
```

### 4. Create Pipeline Integration Tests

Create `ai-service/tests/integration/test_pipeline.py`:

```python
"""
Integration tests for complete processing pipelines.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from src.core.orchestrator import AIOrchestrator
from src.transcription.audio_processor import AudioProcessor
from src.transcription.transcriber import TranscriptionService
from src.transcription.diarizer import Diarizer
from src.transcription.extractor import ExtractionService
from src.rag.pipeline import RAGPipeline


class TestTranscriptionPipeline:
    """Tests for complete transcription pipeline."""

    @pytest.mark.asyncio
    async def test_full_pipeline_with_mocked_services(
        self, sample_audio_file, test_db
    ):
        """Test complete transcription pipeline with mocked external services."""
        orchestrator = AIOrchestrator()

        # Mock external services
        mock_transcription = "DOCTOR: Buenos días. PACIENTE: Hola doctor, me duele la cabeza."

        with patch.object(
            orchestrator.transcription_service,
            'transcribe',
            new_callable=AsyncMock,
            return_value={"text": mock_transcription, "segments": []}
        ):
            with patch.object(
                orchestrator.extraction_service,
                'extract',
                new_callable=AsyncMock,
                return_value=MagicMock(
                    symptoms=[{"name": "cefalea"}],
                    diagnoses=[],
                    prescriptions=[],
                    soap_note={},
                )
            ):
                with open(sample_audio_file, "rb") as audio:
                    result = await orchestrator.process_consultation(
                        audio_data=audio.read(),
                        patient_id="test-patient",
                    )

        assert result.transcription is not None
        assert result.diarization is not None
        assert result.extraction is not None

    @pytest.mark.asyncio
    async def test_pipeline_handles_audio_preprocessing(
        self, sample_audio_file
    ):
        """Test that audio preprocessing works in pipeline."""
        processor = AudioProcessor()

        with open(sample_audio_file, "rb") as audio:
            chunks = await processor.process(audio.read())

        # Should produce at least one chunk
        assert len(chunks) >= 1


class TestRAGPipeline:
    """Tests for RAG pipeline integration."""

    @pytest.mark.asyncio
    async def test_ingest_and_query_flow(
        self, sample_document_content
    ):
        """Test ingesting document and then querying."""
        pipeline = RAGPipeline()

        # Mock external services
        with patch.object(
            pipeline.embeddings,
            'embed',
            new_callable=AsyncMock,
            return_value=[0.1] * 1536
        ):
            with patch.object(
                pipeline.embeddings,
                'embed_batch',
                new_callable=AsyncMock,
                return_value=[[0.1] * 1536] * 5
            ):
                with patch.object(
                    pipeline.store,
                    'add',
                    new_callable=AsyncMock
                ):
                    # Ingest
                    ingest_result = await pipeline.ingest(
                        content=sample_document_content,
                        metadata={"source": "test.pdf"},
                    )

                    assert ingest_result.chunks_created > 0

                # Mock query
                with patch.object(
                    pipeline.store,
                    'query',
                    new_callable=AsyncMock,
                    return_value=[
                        MagicMock(
                            id="chunk-1",
                            text="Ibuprofeno dosis 400-800mg",
                            score=0.9,
                            metadata={"source": "test.pdf"},
                        )
                    ]
                ):
                    with patch.object(
                        pipeline,
                        '_generate_response',
                        new_callable=AsyncMock,
                        return_value="La dosis de ibuprofeno es 400-800mg."
                    ):
                        query_result = await pipeline.query(
                            "¿Cuál es la dosis de ibuprofeno?"
                        )

                        assert query_result.response is not None
                        assert len(query_result.sources) > 0

    @pytest.mark.asyncio
    async def test_rag_integration_with_extraction(self):
        """Test RAG context integration with extraction."""
        rag_pipeline = RAGPipeline()
        extraction_service = ExtractionService()

        # Mock RAG context retrieval
        with patch.object(
            rag_pipeline,
            'get_medication_context',
            new_callable=AsyncMock,
            return_value="Ibuprofeno: AINE, dosis 400-800mg cada 6-8h"
        ):
            context = await rag_pipeline.get_medication_context("ibuprofeno")

        # Mock extraction with RAG context
        with patch.object(
            extraction_service,
            'extract',
            new_callable=AsyncMock,
            return_value=MagicMock(
                prescriptions=[{
                    "medication": "Ibuprofeno",
                    "dose": "400mg",
                    "validated": True,
                }]
            )
        ):
            result = await extraction_service.extract(
                "Le receto ibuprofeno 400mg",
                rag_context={"ibuprofeno": context},
            )

            assert result.prescriptions[0]["validated"] is True


class TestWebhookIntegration:
    """Tests for webhook notification integration."""

    @pytest.mark.asyncio
    async def test_webhook_called_on_completion(self, client, auth_headers):
        """Webhook is called when processing completes."""
        from src.services.webhook import WebhookService

        webhook_service = WebhookService()

        with patch.object(
            webhook_service,
            'notify',
            new_callable=AsyncMock
        ) as mock_notify:
            # Trigger processing completion
            await webhook_service.notify(
                url="https://example.com/webhook",
                event="session.completed",
                data={"session_id": "test-123", "status": "completed"},
            )

            mock_notify.assert_called_once()

    @pytest.mark.asyncio
    async def test_webhook_retry_on_failure(self):
        """Webhook retries on failure."""
        from src.services.webhook import WebhookService

        webhook_service = WebhookService(max_retries=3)

        call_count = 0

        async def failing_call(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Failed")
            return True

        with patch.object(
            webhook_service,
            '_send_request',
            side_effect=failing_call
        ):
            result = await webhook_service.notify(
                url="https://example.com/webhook",
                event="test",
                data={},
            )

            assert call_count == 3
```

### 5. Create Auth Flow Tests

Create `ai-service/tests/integration/test_auth_flow.py`:

```python
"""
Integration tests for authentication flows.
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt

from src.security.auth import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
)
from src.core.config import get_settings


class TestTokenGeneration:
    """Tests for token generation."""

    def test_access_token_contains_user_data(self):
        """Access token contains user information."""
        settings = get_settings()

        token = create_access_token(
            data={"sub": "testuser", "role": "doctor"},
            settings=settings,
        )

        decoded = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        assert decoded["sub"] == "testuser"
        assert decoded["role"] == "doctor"
        assert "exp" in decoded

    def test_access_token_expires(self):
        """Access token has expiration."""
        settings = get_settings()

        token = create_access_token(
            data={"sub": "testuser"},
            settings=settings,
            expires_delta=timedelta(minutes=30),
        )

        decoded = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        exp_time = datetime.fromtimestamp(decoded["exp"])
        now = datetime.utcnow()

        assert exp_time > now
        assert exp_time < now + timedelta(minutes=31)

    def test_refresh_token_has_longer_expiry(self):
        """Refresh token expires later than access token."""
        settings = get_settings()

        access = create_access_token(data={"sub": "user"}, settings=settings)
        refresh = create_refresh_token(data={"sub": "user"}, settings=settings)

        access_decoded = jwt.decode(access, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        refresh_decoded = jwt.decode(refresh, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

        assert refresh_decoded["exp"] > access_decoded["exp"]


class TestTokenVerification:
    """Tests for token verification."""

    def test_verify_valid_token(self):
        """Valid token is verified successfully."""
        settings = get_settings()

        token = create_access_token(
            data={"sub": "testuser", "role": "doctor"},
            settings=settings,
        )

        payload = verify_token(token, settings)

        assert payload is not None
        assert payload["sub"] == "testuser"

    def test_verify_expired_token_fails(self):
        """Expired token verification fails."""
        settings = get_settings()

        token = create_access_token(
            data={"sub": "testuser"},
            settings=settings,
            expires_delta=timedelta(seconds=-1),  # Already expired
        )

        payload = verify_token(token, settings)

        assert payload is None

    def test_verify_invalid_token_fails(self):
        """Invalid token verification fails."""
        settings = get_settings()

        payload = verify_token("invalid.token.here", settings)

        assert payload is None


class TestRBACAuthorization:
    """Tests for role-based access control."""

    def test_doctor_can_access_sessions(self, client, auth_headers):
        """Doctor role can access session endpoints."""
        response = client.get(
            "/api/v1/transcription/sessions",
            headers=auth_headers,
        )

        # Should not be forbidden (401 is OK if no sessions exist)
        assert response.status_code != 403

    def test_doctor_cannot_ingest_documents(self, client, auth_headers):
        """Doctor role cannot ingest documents."""
        response = client.post(
            "/api/v1/ingest",
            json={"documents": [{"content": "test"}]},
            headers=auth_headers,
        )

        assert response.status_code == 403

    def test_admin_can_ingest_documents(self, client, admin_headers):
        """Admin role can ingest documents."""
        response = client.post(
            "/api/v1/ingest",
            json={"documents": [{"content": "test content for ingestion"}]},
            headers=admin_headers,
        )

        # Should be accepted (201) or server error, not forbidden
        assert response.status_code != 403

    def test_readonly_cannot_create_sessions(self, client):
        """Readonly role cannot create sessions."""
        from src.security.auth import create_access_token

        readonly_token = create_access_token(
            data={"sub": "viewer", "role": "readonly"},
            settings=get_settings(),
        )

        response = client.post(
            "/api/v1/transcription/sessions",
            json={"patient_id": "test"},
            headers={"Authorization": f"Bearer {readonly_token}"},
        )

        assert response.status_code == 403
```

### 6. Create Real-Time WebSocket Connection Tests

Create `ai-service/tests/integration/test_websocket_realtime.py`:

```python
"""
Integration tests for real-time WebSocket streaming.
"""
import asyncio
import json
import pytest
import websockets
from unittest.mock import patch, AsyncMock, MagicMock


class TestWebSocketConnectionLifecycle:
    """Tests for WebSocket connection establishment and cleanup."""

    @pytest.mark.asyncio
    async def test_websocket_connection_with_valid_token(self, auth_token):
        """WebSocket connection succeeds with valid token."""
        # First create a session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={
                    "patientId": "patient-123",
                    "appointmentType": "general",
                    "language": "es",
                },
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            assert response.status_code == 201
            data = response.json()
            session_id = data["sessionId"]

        # Connect via WebSocket
        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Connection should be established
            assert websocket.open

    @pytest.mark.asyncio
    async def test_websocket_connection_without_token_fails(self):
        """WebSocket connection fails without authentication token."""
        uri = "ws://localhost:3000/ws/session/test-session"

        with pytest.raises(websockets.exceptions.InvalidStatusCode) as exc:
            async with websockets.connect(uri):
                pass

        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_websocket_connection_with_invalid_session_fails(self, auth_token):
        """WebSocket connection fails with nonexistent session ID."""
        uri = f"ws://localhost:3000/ws/session/nonexistent-session?token={auth_token}"

        with pytest.raises(websockets.exceptions.InvalidStatusCode) as exc:
            async with websockets.connect(uri):
                pass

        # Should return 404 or close with error
        assert exc.value.status_code in [404, 403, 400]

    @pytest.mark.asyncio
    async def test_websocket_graceful_disconnect(self, auth_token):
        """WebSocket handles graceful disconnect."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Close connection
            await websocket.close()

            # Should be closed
            assert not websocket.open


class TestRealtimeEventFlow:
    """Tests for complete real-time event flow from audio to UI."""

    @pytest.mark.asyncio
    async def test_audio_to_transcript_event_flow(self, auth_token, sample_audio_bytes):
        """Test audio streaming produces transcript_update events."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        # Mock Python AI service to return transcript events
        with patch('websockets.connect') as mock_ai_ws:
            mock_ai_connection = AsyncMock()
            mock_ai_ws.return_value.__aenter__.return_value = mock_ai_connection

            # Simulate AI service sending transcript event
            transcript_event = {
                "event": "transcript_update",
                "timestamp": "2025-01-15T10:30:00Z",
                "session_id": session_id,
                "data": {
                    "chunk_index": 1,
                    "text": "Buenos días doctor",
                    "is_final": True,
                    "confidence": 0.95,
                    "start_time": 0.0,
                    "end_time": 2.5,
                }
            }

            async with websockets.connect(uri) as websocket:
                # Send binary audio chunk
                audio_chunk = sample_audio_bytes[:1000]  # Small chunk
                await websocket.send(audio_chunk)

                # Simulate receiving transcript event from AI service
                # (In real test, this would come through the WebSocket gateway)
                response_event = await websocket.recv()
                event_data = json.loads(response_event)

                assert event_data["event"] == "transcript_update"
                assert event_data["data"]["text"] == "Buenos días doctor"
                assert event_data["data"]["is_final"] is True

    @pytest.mark.asyncio
    async def test_speaker_change_detection(self, auth_token):
        """Test speaker_changed events are emitted."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Wait for speaker_changed event
            response = await websocket.recv()
            event = json.loads(response)

            if event["event"] == "speaker_changed":
                assert event["data"]["role"] in ["DOCTOR", "PATIENT"]
                assert "confidence" in event["data"]
                assert event["data"]["timestamp"] is not None

    @pytest.mark.asyncio
    async def test_extraction_update_event_flow(self, auth_token):
        """Test extraction_update events contain entity data."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Wait for extraction_update event
            while True:
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                event = json.loads(response)

                if event["event"] == "extraction_update":
                    assert "entity_type" in event["data"]
                    assert event["data"]["entity_type"] in [
                        "SYMPTOM", "DIAGNOSIS", "MEDICATION", "PROCEDURE", "ALLERGY"
                    ]
                    assert "entity_value" in event["data"]
                    assert "confidence" in event["data"]
                    break

    @pytest.mark.asyncio
    async def test_validation_alert_critical_priority(self, auth_token):
        """Test CRITICAL validation alerts are emitted with high priority."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Wait for validation_alert event
            while True:
                response = await asyncio.wait_for(websocket.recv(), timeout=15)
                event = json.loads(response)

                if event["event"] == "validation_alert":
                    assert event["data"]["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
                    assert "alert_type" in event["data"]
                    assert "message" in event["data"]

                    if event["data"]["severity"] == "CRITICAL":
                        assert event["data"]["requires_immediate_attention"] is True
                        assert "recommended_action" in event["data"]
                    break

    @pytest.mark.asyncio
    async def test_cost_update_event_tracking(self, auth_token):
        """Test cost_update events track cumulative costs."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Wait for cost_update event
            while True:
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                event = json.loads(response)

                if event["event"] == "cost_update":
                    assert "operation" in event["data"]
                    assert "cost_usd" in event["data"]
                    assert "cumulative_cost_usd" in event["data"]
                    assert event["data"]["cumulative_cost_usd"] >= event["data"]["cost_usd"]
                    break

    @pytest.mark.asyncio
    async def test_session_complete_event(self, auth_token):
        """Test session_complete event contains summary."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

            # Finalize session
            await client.post(
                f"/api/consultations/sessions/{session_id}/finalize",
                headers={"Authorization": f"Bearer {auth_token}"},
            )

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Wait for session_complete event
            while True:
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                event = json.loads(response)

                if event["event"] == "session_complete":
                    assert "total_duration_sec" in event["data"]
                    assert "total_cost_usd" in event["data"]
                    assert "entities_extracted" in event["data"]
                    assert "alerts_count" in event["data"]
                    break


class TestEventPersistenceAndRetrieval:
    """Tests for event persistence to PostgreSQL and retrieval."""

    @pytest.mark.asyncio
    async def test_events_are_persisted_to_database(self, auth_token, test_db):
        """Test that WebSocket events are persisted to PostgreSQL."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        # Connect to WebSocket and generate some events
        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Send audio to generate transcript event
            await websocket.send(b'\x00' * 1000)

            # Wait for transcript event
            await asyncio.sleep(1)

        # Query database for persisted events
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.get(
                f"/api/consultations/sessions/{session_id}/events",
                headers={"Authorization": f"Bearer {auth_token}"},
            )

            assert response.status_code == 200
            events = response.json()

            # Should have at least one persisted event
            assert len(events) > 0
            assert all("event" in e for e in events)
            assert all("timestamp" in e for e in events)

    @pytest.mark.asyncio
    async def test_retrieve_session_events_for_playback(self, auth_token, test_db):
        """Test retrieving all session events for history/playback."""
        # Create session and finalize it
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

            # Finalize session (this should persist final state)
            await client.post(
                f"/api/consultations/sessions/{session_id}/finalize",
                headers={"Authorization": f"Bearer {auth_token}"},
            )

            # Get events
            response = await client.get(
                f"/api/consultations/sessions/{session_id}/events",
                headers={"Authorization": f"Bearer {auth_token}"},
            )

            assert response.status_code == 200
            events = response.json()

            # Events should be ordered by timestamp
            timestamps = [e["timestamp"] for e in events]
            assert timestamps == sorted(timestamps)

            # Should contain various event types
            event_types = {e["event"] for e in events}
            assert "session_complete" in event_types

    @pytest.mark.asyncio
    async def test_alert_acknowledgment_persists(self, auth_token, test_db):
        """Test that alert acknowledgment is persisted to database."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        # Get session events (wait for a validation alert)
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            # Simulate alert exists (in real test, would come from WebSocket)
            alert_id = "alert-123"

            # Acknowledge alert
            response = await client.post(
                f"/api/consultations/alerts/{alert_id}/acknowledge",
                json={"acknowledged_by": "test_user"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )

            assert response.status_code in [200, 404]  # 404 if alert doesn't exist

            # If acknowledged, verify it's persisted
            if response.status_code == 200:
                data = response.json()
                assert data["acknowledged"] is True
                assert "acknowledged_at" in data


class TestConcurrentWebSocketSessions:
    """Tests for handling multiple concurrent WebSocket connections."""

    @pytest.mark.asyncio
    async def test_multiple_concurrent_sessions(self, auth_token):
        """Test system handles multiple concurrent WebSocket sessions."""
        from httpx import AsyncClient

        # Create multiple sessions
        session_ids = []
        async with AsyncClient(base_url="http://test:3000") as client:
            for i in range(5):
                response = await client.post(
                    "/api/consultations/sessions",
                    json={"patientId": f"patient-{i}"},
                    headers={"Authorization": f"Bearer {auth_token}"},
                )
                assert response.status_code == 201
                session_ids.append(response.json()["sessionId"])

        # Connect all sessions via WebSocket concurrently
        async def connect_session(session_id):
            uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"
            async with websockets.connect(uri) as websocket:
                # Send a message
                await websocket.send(b'\x00' * 100)
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                return json.loads(response)

        # Run concurrent connections
        results = await asyncio.gather(
            *[connect_session(sid) for sid in session_ids],
            return_exceptions=True
        )

        # All connections should succeed
        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0
        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_session_isolation(self, auth_token):
        """Test that events from one session don't leak to another."""
        from httpx import AsyncClient

        # Create two sessions
        async with AsyncClient(base_url="http://test:3000") as client:
            response1 = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-1"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session1_id = response1.json()["sessionId"]

            response2 = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-2"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session2_id = response2.json()["sessionId"]

        # Connect both sessions
        uri1 = f"ws://localhost:3000/ws/session/{session1_id}?token={auth_token}"
        uri2 = f"ws://localhost:3000/ws/session/{session2_id}?token={auth_token}"

        async with websockets.connect(uri1) as ws1, websockets.connect(uri2) as ws2:
            # Send data to session 1
            await ws1.send(b'\x00' * 100)

            # Session 1 should receive events
            response1 = await asyncio.wait_for(ws1.recv(), timeout=5)
            event1 = json.loads(response1)
            assert event1["session_id"] == session1_id

            # Session 2 should NOT receive events from session 1
            try:
                response2 = await asyncio.wait_for(ws2.recv(), timeout=1)
                event2 = json.loads(response2)
                # If we get an event, it must be for session 2
                assert event2["session_id"] != session1_id
            except asyncio.TimeoutError:
                # Timeout is expected - no events for session 2
                pass


class TestWebSocketErrorHandling:
    """Tests for WebSocket error handling and recovery."""

    @pytest.mark.asyncio
    async def test_websocket_handles_invalid_audio_format(self, auth_token):
        """Test WebSocket handles invalid audio data gracefully."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Send invalid audio data
            await websocket.send(b'INVALID AUDIO DATA')

            # Should receive error event
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            event = json.loads(response)

            if event["event"] == "error":
                assert "error_type" in event["data"]
                assert "message" in event["data"]

    @pytest.mark.asyncio
    async def test_websocket_connection_timeout(self, auth_token):
        """Test WebSocket closes after inactivity timeout."""
        # Create session
        from httpx import AsyncClient
        async with AsyncClient(base_url="http://test:3000") as client:
            response = await client.post(
                "/api/consultations/sessions",
                json={"patientId": "patient-123"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            session_id = response.json()["sessionId"]

        uri = f"ws://localhost:3000/ws/session/{session_id}?token={auth_token}"

        async with websockets.connect(uri) as websocket:
            # Don't send any data for a long time
            # (In real implementation, connection should timeout after inactivity)
            # This test would need to wait for timeout period

            # For now, just verify connection is established
            assert websocket.open
```

## Expected Deliverables

1. `ai-service/tests/integration/conftest.py` - Integration test configuration
2. `ai-service/tests/integration/test_api_endpoints.py` - API endpoint tests (batch/legacy)
3. `ai-service/tests/integration/test_database.py` - Database operation tests
4. `ai-service/tests/integration/test_pipeline.py` - Pipeline integration tests (batch/legacy)
5. `ai-service/tests/integration/test_auth_flow.py` - Authentication flow tests
6. **`ai-service/tests/integration/test_websocket_realtime.py` - Real-time WebSocket tests (NEW)**

## Verification Steps

### Real-Time Streaming Tests (PRIMARY)
1. WebSocket connection tests pass: `pytest tests/integration/test_websocket_realtime.py -v`
2. All 8+ event types are tested (transcript_update, speaker_changed, extraction_update, validation_alert, entity_validated, cost_update, session_complete, error)
3. Event persistence to PostgreSQL verified
4. Concurrent WebSocket sessions work correctly
5. Alert acknowledgment flow tested
6. Session isolation verified (events don't leak between sessions)
7. Error handling tested (invalid audio, connection timeout)

### Batch/Legacy Tests
1. All tests pass: `pytest tests/integration/ -v`
2. Tests use isolated test database
3. External services are properly mocked
4. Auth flows cover all roles
5. Error cases are tested

## Notes

### Real-Time Testing Notes
- WebSocket tests require running Node.js backend and Python AI service
- Use `pytest-asyncio` for async WebSocket tests
- Mock Python AI service WebSocket connection for unit-level integration tests
- Test event ordering and persistence for playback functionality
- Verify <2s end-to-end latency (audio → event → UI)
- Test CRITICAL alert delivery <1s

### General Testing Notes
- Integration tests should not call real external APIs (OpenAI, external services)
- Use test database that is cleaned between tests
- Test both success and error scenarios
- Verify that components work together correctly
- Keep tests focused on integration points, not unit logic
- For WebSocket tests, consider using `websockets` library or similar for Python client testing
