# Prompt 14: Setup Python Project Structure

## Objective
Create the complete Python project structure for the AI Service following BSG mandatory requirements. This establishes the foundation for all AI/LLM functionality.

## Context
The AI Service is a Python/FastAPI application with **real-time streaming capabilities** that will:
- Handle WebSocket bidirectional audio/event streaming
- Real-time audio transcription with intelligent VAD buffering (Whisper)
- Incremental medical entity extraction with conflict resolution (GPT-4o/mini)
- Async RAG validation with priority queue (ChromaDB)
- Session state management (Redis)
- Expose BSG mandatory endpoints (REST + WebSocket)

The existing Node.js backend will proxy WebSocket connections and call this service via HTTP for REST endpoints.

## Reference Documents
- `07_artefactos/02_archivos_obligatorios.md` - Required file structure
- `07_artefactos/Makefile` - Standard Makefile
- `07_artefactos/env.example` - Environment variables template

## Tasks

### 1. Create Directory Structure

Create the following structure in project root:

```
health-record/
├── src/                          # Python AI Service (BSG required)
│   ├── __init__.py
│   ├── api/                      # OBLIGATORIO
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI entry point
│   │   ├── routes.py             # Endpoint definitions
│   │   └── schemas.py            # Pydantic models
│   ├── core/                     # OBLIGATORIO
│   │   ├── __init__.py
│   │   ├── config.py             # Configuration from env
│   │   ├── llm_client.py         # OpenAI wrapper
│   │   └── orchestrator.py       # Service orchestration
│   ├── rag/                      # OBLIGATORIO
│   │   ├── __init__.py
│   │   ├── ingestion.py          # Document loading + chunking
│   │   ├── embeddings.py         # Embedding generation
│   │   ├── retriever.py          # Semantic search
│   │   └── vector_store.py       # ChromaDB client
│   ├── security/                 # OBLIGATORIO
│   │   ├── __init__.py
│   │   ├── auth.py               # JWT authentication
│   │   └── guardrails.py         # Input/output validation
│   ├── services/                 # Additional services (Real-Time)
│   │   ├── __init__.py
│   │   ├── websocket_gateway.py  # WebSocket connection management
│   │   ├── stream_processor.py   # VAD + intelligent buffering
│   │   ├── transcription.py      # Whisper streaming transcription
│   │   ├── extraction.py         # Incremental medical entity extraction
│   │   ├── entity_matching.py    # Semantic matching + conflict resolution
│   │   ├── session_manager.py    # Redis session state management
│   │   └── cost_tracker.py       # Token/cost tracking
│   └── utils/                    # Utilities
│       ├── __init__.py
│       ├── logger.py             # Structured logging
│       └── helpers.py            # General utilities
├── tests/                        # OBLIGATORIO
│   ├── __init__.py
│   ├── conftest.py               # Pytest fixtures
│   ├── unit/                     # OBLIGATORIO (≥60% coverage)
│   │   ├── __init__.py
│   │   ├── test_llm_client.py
│   │   ├── test_retriever.py
│   │   ├── test_ingestion.py
│   │   ├── test_entity_matching.py
│   │   ├── test_stream_processor.py
│   │   └── test_guardrails.py
│   ├── integration/              # OBLIGATORIO (≥1 E2E test)
│   │   ├── __init__.py
│   │   ├── test_rag_pipeline.py
│   │   └── test_websocket_streaming.py
│   └── load/                     # OBLIGATORIO (≥10 users)
│       └── load_test.js          # k6 script
├── notebooks/                    # OBLIGATORIO
│   └── evaluation.ipynb          # RAGAS evaluation
├── reports/                      # OBLIGATORIO
│   └── .gitkeep
├── docs/                         # Already created in prompt 01
├── data/                         # Local data (gitignored)
│   ├── documents/
│   └── chromadb/
├── .github/
│   └── workflows/
│       └── ci.yml                # OBLIGATORIO
├── requirements.txt              # OBLIGATORIO
├── requirements-dev.txt
├── Dockerfile                    # OBLIGATORIO
├── docker-compose.yml            # OBLIGATORIO
├── Makefile                      # OBLIGATORIO
├── .env.example                  # OBLIGATORIO
├── .gitignore                    # OBLIGATORIO
├── pyproject.toml
└── README.md                     # Already exists
```

### 2. Create Core Configuration

Create `src/core/config.py`:

```python
"""
Configuración centralizada desde variables de entorno.
Sigue el patrón de 12-factor app para configuración externa.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración de la aplicación."""

    # ─── General ────────────────────────────────────────────────
    environment: Literal["development", "staging", "production", "testing"] = "development"
    project_name: str = "MedRecord AI Service"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    log_level: str = "INFO"
    app_version: str = "1.0.0"

    # ─── OpenAI / LLM ───────────────────────────────────────────
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 2048
    openai_temperature: float = 0.1
    openai_timeout_seconds: int = 30
    openai_max_retries: int = 3

    # ─── Whisper (Transcription) ────────────────────────────────
    whisper_model: str = "whisper-1"
    whisper_language: str = "es"  # Spanish
    whisper_response_format: str = "verbose_json"

    # ─── Embeddings ─────────────────────────────────────────────
    embeddings_provider: str = "openai"
    embeddings_model: str = "text-embedding-3-small"
    embeddings_dimensions: int = 1536
    embeddings_batch_size: int = 100

    # ─── Vector Store (ChromaDB) ────────────────────────────────
    vector_db_provider: str = "chromadb"
    chromadb_host: str = "chromadb"
    chromadb_port: int = 8000
    chromadb_collection_name: str = "medrecord_spanish_medical"

    # ─── RAG Configuration ──────────────────────────────────────
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.75
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50
    rag_chunking_strategy: str = "recursive"

    # ─── Database ───────────────────────────────────────────────
    database_url: str | None = None

    # ─── Security ───────────────────────────────────────────────
    jwt_secret_key: str = Field(..., description="JWT signing key")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    rate_limit_per_minute: int = 60

    # ─── Observability ──────────────────────────────────────────
    langfuse_enabled: bool = False
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str = "https://cloud.langfuse.com"

    # ─── Cost Tracking ──────────────────────────────────────────
    cost_tracking_enabled: bool = True
    monthly_budget_usd: float = 50.0

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.upper()

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Singleton para configuración."""
    return Settings()
```

### 3. Create FastAPI Main Entry Point

Create `src/api/main.py`:

```python
"""
Entry point de la API FastAPI.
Configura middleware, routers y documentación OpenAPI.
"""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes import router
from src.core.config import get_settings
from src.utils.logger import get_logger, setup_logging

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hooks para startup/shutdown."""
    # Startup
    setup_logging(settings.log_level)
    logger.info(
        "Starting MedRecord AI Service",
        extra={
            "environment": settings.environment,
            "version": settings.app_version,
        }
    )
    yield
    # Shutdown
    logger.info("Shutting down MedRecord AI Service")


app = FastAPI(
    title=settings.project_name,
    description="Servicio de IA para transcripción y extracción médica en español",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# ─── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request Logging Middleware ─────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing."""
    start_time = time.time()
    request_id = request.headers.get("X-Request-ID", "no-id")

    response = await call_next(request)

    process_time = time.time() - start_time
    logger.info(
        "Request processed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time_ms": round(process_time * 1000, 2),
        }
    )

    response.headers["X-Process-Time"] = str(process_time)
    return response


# ─── Exception Handlers ─────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.exception(
        "Unhandled exception",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error": str(exc),
        }
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_type": type(exc).__name__,
        }
    )


# ─── Include Routers ────────────────────────────────────────────
app.include_router(router, prefix="/api/v1")


# ─── Root Endpoint ──────────────────────────────────────────────
@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": settings.project_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "docs": "/docs",
    }
```

### 4. Create Structured Logger

Create `src/utils/logger.py`:

```python
"""
Logger estructurado en formato JSON para observabilidad.
Cumple con requisitos BSG de logging estructurado.
"""
import logging
import sys
from datetime import datetime, timezone
from typing import Any

import json


class JSONFormatter(logging.Formatter):
    """Formatter que produce logs en JSON estructurado."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "medrecord-ai-service",
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Add trace_id if available
        if hasattr(record, "request_id"):
            log_data["trace_id"] = record.request_id

        # Add extra fields
        if hasattr(record, "__dict__"):
            extra = {
                k: v for k, v in record.__dict__.items()
                if k not in (
                    "name", "msg", "args", "created", "filename",
                    "funcName", "levelname", "levelno", "lineno",
                    "module", "msecs", "pathname", "process",
                    "processName", "relativeCreated", "stack_info",
                    "exc_info", "exc_text", "thread", "threadName",
                    "message", "request_id"
                )
            }
            if extra:
                log_data["extra"] = extra

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, default=str)


def setup_logging(level: str = "INFO") -> None:
    """Configure logging for the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add JSON handler for stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
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
```

### 5. Create Requirements Files

Create `requirements.txt`:

```
# ═══════════════════════════════════════════════════════════════
# MedRecord AI Service - Production Dependencies
# Versiones exactas para reproducibilidad (BSG requirement)
# ═══════════════════════════════════════════════════════════════

# ─── Web Framework ──────────────────────────────────────────────
fastapi==0.109.2
uvicorn[standard]==0.27.1
pydantic==2.6.1
pydantic-settings==2.1.0

# ─── OpenAI / LLM ───────────────────────────────────────────────
openai==1.12.0
tiktoken==0.5.2

# ─── RAG / Vector Store ─────────────────────────────────────────
chromadb==0.4.22
langchain==0.1.6
langchain-openai==0.0.5
langchain-community==0.0.19

# ─── Document Processing ────────────────────────────────────────
pypdf==4.0.1
python-docx==1.1.0
unstructured==0.12.4

# ─── Audio Processing & Streaming (Real-Time) ──────────────────
pydub==0.25.1
opuslib==3.0.1           # Opus codec for WebSocket streaming
numpy==1.26.4            # For audio processing
silero-vad==4.0.0        # Voice Activity Detection
torch==2.2.0             # Required by Silero VAD (CPU-only)

# ─── Security ───────────────────────────────────────────────────
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
slowapi==0.1.9

# ─── Database ───────────────────────────────────────────────────
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1

# ─── Redis (Session State & Cache - CRITICAL for Real-Time) ─────
redis==5.0.1
aioredis==2.0.1

# ─── HTTP Client ────────────────────────────────────────────────
httpx==0.26.0
aiohttp==3.9.3

# ─── Observability ──────────────────────────────────────────────
langfuse==2.7.3
prometheus-client==0.19.0
structlog==24.1.0

# ─── Utilities ──────────────────────────────────────────────────
python-multipart==0.0.7
python-dotenv==1.0.1
tenacity==8.2.3
```

Create `requirements-dev.txt`:

```
# ═══════════════════════════════════════════════════════════════
# Development & Testing Dependencies
# ═══════════════════════════════════════════════════════════════

-r requirements.txt

# ─── Testing ────────────────────────────────────────────────────
pytest==8.0.0
pytest-cov==4.1.0
pytest-asyncio==0.23.4
pytest-mock==3.12.0
httpx==0.26.0

# ─── LLM Evaluation ─────────────────────────────────────────────
ragas==0.1.4
datasets==2.16.1

# ─── Code Quality ───────────────────────────────────────────────
ruff==0.2.1
mypy==1.8.0
types-python-jose==3.3.4.8

# ─── Security Scanning ──────────────────────────────────────────
bandit==1.7.7
pip-audit==2.7.1

# ─── Jupyter for Evaluation ─────────────────────────────────────
jupyter==1.0.0
ipykernel==6.29.0
nbval==0.11.0
```

### 6. Create Makefile

Create `Makefile` (based on BSG template with Spanish medical project specifics):

```makefile
# ==============================================================
# Makefile — MedRecord AI Service
# ==============================================================

PYTHON      := python3
PIP         := pip3
PROJECT_DIR := src
TEST_DIR    := tests
REPORTS_DIR := reports
COV_MINIMUM := 60
IMAGE_NAME  := medrecord-ai-service
IMAGE_TAG   := $(shell git rev-parse --short HEAD 2>/dev/null || echo "latest")

.PHONY: help install install-dev dev test lint format check-files pre-delivery

help:
	@echo "MedRecord AI Service - Comandos disponibles:"
	@echo ""
	@echo "  make install        Instalar dependencias de producción"
	@echo "  make install-dev    Instalar dependencias de desarrollo"
	@echo "  make dev            Levantar entorno de desarrollo"
	@echo "  make test           Ejecutar tests con cobertura"
	@echo "  make test-unit      Ejecutar solo tests unitarios"
	@echo "  make lint           Verificar estilo de código"
	@echo "  make format         Formatear código"
	@echo "  make evaluate       Ejecutar evaluación RAGAS"
	@echo "  make check-files    Verificar archivos obligatorios"
	@echo "  make pre-delivery   Verificación completa pre-entrega"

install:
	@echo "▶ Instalando dependencias..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@cp -n .env.example .env 2>/dev/null || true
	@mkdir -p $(REPORTS_DIR) data/documents data/chromadb
	@echo "✓ Instalación completada"

install-dev: install
	@echo "▶ Instalando dependencias de desarrollo..."
	$(PIP) install -r requirements-dev.txt
	@echo "✓ Entorno de desarrollo listo"

dev:
	@echo "▶ Iniciando entorno de desarrollo..."
	docker-compose up --build

dev-detached:
	docker-compose up --build -d
	@echo "✓ Entorno iniciado"
	@echo "  API: http://localhost:8000"
	@echo "  Docs: http://localhost:8000/docs"

stop:
	docker-compose down

test:
	@echo "▶ Ejecutando tests..."
	@mkdir -p $(REPORTS_DIR)
	pytest $(TEST_DIR)/ \
		--verbose \
		--cov=$(PROJECT_DIR) \
		--cov-report=term-missing \
		--cov-report=xml:$(REPORTS_DIR)/coverage.xml \
		--cov-fail-under=$(COV_MINIMUM)
	@echo "✓ Tests completados"

test-unit:
	pytest $(TEST_DIR)/unit/ --verbose --cov=$(PROJECT_DIR)

test-integration:
	pytest $(TEST_DIR)/integration/ --verbose

test-load:
	@which k6 > /dev/null || (echo "❌ k6 no instalado" && exit 1)
	k6 run $(TEST_DIR)/load/load_test.js

lint:
	@echo "▶ Verificando estilo..."
	ruff check $(PROJECT_DIR)/ $(TEST_DIR)/
	mypy $(PROJECT_DIR)/ --ignore-missing-imports

format:
	ruff format $(PROJECT_DIR)/ $(TEST_DIR)/

evaluate:
	@echo "▶ Ejecutando evaluación RAGAS..."
	jupyter nbconvert --execute notebooks/evaluation.ipynb --to notebook

check-files:
	@echo "▶ Verificando archivos obligatorios BSG..."
	@all_ok=true; \
	files=("README.md" ".env.example" ".gitignore" "Makefile" \
		"Dockerfile" "docker-compose.yml" "requirements.txt" \
		".github/workflows/ci.yml" \
		"docs/PROJECT_DOCUMENTATION.md" \
		"docs/architecture/architecture_general.png" \
		"docs/adr/ADR-001.md" "docs/adr/ADR-002.md" \
		"docs/api/openapi.yaml" \
		"src/api/main.py" "src/core/llm_client.py" \
		"src/rag/retriever.py" "src/security/auth.py" \
		"tests/unit" "tests/integration" "tests/load" \
		"notebooks/evaluation.ipynb" "reports"); \
	for f in $${files[@]}; do \
		if [ -e "$$f" ]; then \
			echo "  ✅ $$f"; \
		else \
			echo "  ❌ FALTA: $$f"; \
			all_ok=false; \
		fi; \
	done; \
	$$all_ok || exit 1
	@echo "✓ Archivos verificados"

pre-delivery: lint test check-files
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  ✓ Proyecto listo para entrega"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

tag-release:
	@[ -n "$(VERSION)" ] || (echo "❌ Usar: make tag-release VERSION=1.0.0" && exit 1)
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@echo "✓ Tag v$(VERSION) creado"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .coverage .pytest_cache .mypy_cache .ruff_cache htmlcov/
```

### 7. Create .env.example

Create `.env.example`:

```bash
# ==============================================================
# MedRecord AI Service - Variables de Entorno
# ==============================================================
# 1. Copia: cp .env.example .env
# 2. Edita .env con valores reales
# 3. NUNCA commitees .env
# ==============================================================

# ─── General ────────────────────────────────────────────────────
ENVIRONMENT=development
PROJECT_NAME=MedRecord AI Service
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
APP_VERSION=1.0.0

# ─── OpenAI / LLM ───────────────────────────────────────────────
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2048
OPENAI_TEMPERATURE=0.1
OPENAI_TIMEOUT_SECONDS=30

# ─── Whisper (Transcripción) ────────────────────────────────────
WHISPER_MODEL=whisper-1
WHISPER_LANGUAGE=es
WHISPER_RESPONSE_FORMAT=verbose_json

# ─── Embeddings ─────────────────────────────────────────────────
EMBEDDINGS_PROVIDER=openai
EMBEDDINGS_MODEL=text-embedding-3-small
EMBEDDINGS_DIMENSIONS=1536

# ─── Vector Store (ChromaDB) ────────────────────────────────────
VECTOR_DB_PROVIDER=chromadb
CHROMADB_HOST=chromadb
CHROMADB_PORT=8000
CHROMADB_COLLECTION_NAME=medrecord_spanish_medical

# ─── RAG ────────────────────────────────────────────────────────
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.75
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50

# ─── Database ───────────────────────────────────────────────────
DATABASE_URL=postgresql://dev_user:dev_password@postgres:5432/medrecord_dev
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=medrecord_dev

# ─── Security ───────────────────────────────────────────────────
JWT_SECRET_KEY=change-this-to-a-secure-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
RATE_LIMIT_PER_MINUTE=60

# ─── Observability ──────────────────────────────────────────────
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=pk-lf-your-key
LANGFUSE_SECRET_KEY=sk-lf-your-key
LANGFUSE_HOST=https://cloud.langfuse.com

# ─── Cost Tracking ──────────────────────────────────────────────
COST_TRACKING_ENABLED=true
MONTHLY_BUDGET_USD=50.0

# ─── Testing ────────────────────────────────────────────────────
USE_LLM_MOCK=false
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/medrecord_test
```

### 8. Create pyproject.toml

Create `pyproject.toml`:

```toml
[project]
name = "medrecord-ai-service"
version = "1.0.0"
description = "Servicio de IA para transcripción y extracción médica en español"
readme = "README.md"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "Your Name", email = "your.email@example.com"}
]

[tool.ruff]
target-version = "py311"
line-length = 100
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # Pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by formatter)
    "B008",  # do not perform function calls in argument defaults
]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
asyncio_mode = "auto"
addopts = "-v --tb=short"
markers = [
    "slow: marks tests as slow",
    "integration: marks tests as integration tests",
]

[tool.coverage.run]
source = ["src"]
branch = true
omit = ["*/tests/*", "*/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
]
```

## Expected Deliverables

1. Complete Python project structure in `src/`
2. `requirements.txt` and `requirements-dev.txt`
3. `Makefile` with all BSG commands
4. `.env.example` with all variables
5. `pyproject.toml` with tool configurations
6. Core configuration module (`src/core/config.py`)
7. FastAPI entry point (`src/api/main.py`)
8. Structured logger (`src/utils/logger.py`)

## Verification Steps

1. `make install` runs without errors
2. Directory structure matches BSG requirements
3. All `__init__.py` files are present
4. Configuration loads from environment
5. FastAPI app starts: `uvicorn src.api.main:app --reload`

## Notes

- This is the foundation - actual service implementations come in later prompts
- All BSG mandatory folders must exist even if empty initially
- Use exact versions in requirements.txt (BSG requirement)
- Logger must be JSON structured (BSG requirement)
