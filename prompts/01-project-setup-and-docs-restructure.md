# Prompt 01: Project Setup and Documentation Restructure

## Objective
Prepare the project structure for BSG course requirements by reorganizing documentation folders and creating the foundation for the new AI service.

## Context
This project adapts an existing medical records system (from AI4Devs course) for the BSG AI Architecture course. The existing `docs/` folder contains frontend/backend documentation that must be preserved but separated from the new BSG documentation.

**Key decisions:**
- Keep existing frontend (React) and backend (Node.js) as-is
- Create a new Python AI service that the frontend/backend will call
- All new documentation follows BSG template structure
- Project focuses on Spanish language medical consultations

## Tasks

### 1. Rename Existing Documentation
```bash
# Rename existing docs to preserve original documentation
mv docs docs-original
```

### 2. Create New BSG Documentation Structure
Create the following folder structure:

```
docs/
├── architecture/           # Architecture diagrams (C4, sequence, deployment)
│   ├── diagrams/          # Image exports (PNG, SVG)
│   └── decisions/         # Architecture decision context
├── adr/                   # Architecture Decision Records
├── api/                   # OpenAPI/Swagger specifications
├── delivery-1/            # First BSG delivery documents
├── delivery-2/            # Second BSG delivery documents
├── guides/                # User and developer guides
├── analysis/              # Project analysis documents
└── presentation/          # Video presentation materials
```

### 3. Create AI Service Folder Structure
Create the Python AI service structure:

```
ai-service/
├── src/
│   ├── api/               # FastAPI endpoints and routers
│   ├── core/              # Core configuration and utilities
│   ├── transcription/     # Transcription and extraction services
│   ├── rag/               # RAG pipeline components
│   ├── security/          # Authentication and guardrails
│   └── utils/             # Shared utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── load/
│   └── fixtures/
├── data/
│   └── medical_knowledge/ # Spanish medical knowledge base for RAG
├── infrastructure/        # Terraform/IaC files
├── scripts/               # Utility scripts
├── notebooks/             # Jupyter notebooks for exploration
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```

### 4. Create Initial Configuration Files

Create `ai-service/pyproject.toml`:
```toml
[project]
name = "medrecord-ai"
version = "0.1.0"
description = "AI-powered medical consultation transcription service for Spanish language"
readme = "README.md"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "Your Name", email = "your.email@example.com"}
]
keywords = ["medical", "transcription", "ai", "llm", "spanish", "whisper", "rag"]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.5.0",
    "pre-commit>=3.4.0",
]

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W", "UP"]

[tool.mypy]
python_version = "3.11"
strict = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

Create `ai-service/.env.example`:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_ENV=development
DEBUG=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medrecord_ai

# Vector Store (ChromaDB)
CHROMA_HOST=localhost
CHROMA_PORT=8001
CHROMA_COLLECTION=medical_knowledge_es

# Authentication
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Transcription Settings
WHISPER_MODEL=whisper-1
WHISPER_LANGUAGE=es
DEFAULT_AUDIO_SAMPLE_RATE=16000

# Extraction Settings
EXTRACTION_MODEL=gpt-4o
EXTRACTION_TEMPERATURE=0.1

# RAG Settings
EMBEDDING_MODEL=text-embedding-3-small
RAG_TOP_K=5
RAG_MIN_SCORE=0.75

# Cost Tracking
ENABLE_COST_TRACKING=true
MONTHLY_BUDGET_USD=100.0

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### 5. Create README for AI Service
Create `ai-service/README.md`:
```markdown
# MedRecord AI Service

Servicio de IA para transcripción y extracción de datos médicos de consultas en español.

## Características

- **Transcripción de Audio**: OpenAI Whisper optimizado para español médico
- **Diarización de Hablantes**: Identificación automática de doctor/paciente
- **Extracción Médica**: Notas SOAP, síntomas, diagnósticos, prescripciones
- **RAG Integrado**: Base de conocimiento médico en español para validación
- **Optimización de Costos**: VAD, chunking inteligente, caché

## Requisitos

- Python 3.11+
- Docker y Docker Compose
- OpenAI API Key

## Inicio Rápido

```bash
# Clonar y navegar al servicio
cd ai-service

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar con Docker
docker-compose up -d

# O ejecutar localmente
uvicorn src.api.main:app --reload
```

## API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/query` | POST | Consultar base de conocimiento médico |
| `/api/v1/ingest` | POST | Ingestar documentos al RAG |
| `/api/v1/transcription/sessions` | POST | Crear sesión de transcripción |
| `/api/v1/transcription/sessions/{id}/audio` | POST | Subir audio |
| `/api/v1/transcription/sessions/{id}/finalize` | POST | Finalizar y extraer |
| `/health` | GET | Health check |

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │
│   (React)       │────▶│   (Node.js)     │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   AI Service (Python)  │
                    │   - Transcription      │
                    │   - Extraction         │
                    │   - RAG                │
                    └────────────────────────┘
```

## Documentación

- [Documentación del Proyecto](../docs/)
- [API OpenAPI Spec](../docs/api/openapi.yaml)
- [Guía de Usuario](../docs/guides/user-guide.md)
```

### 6. Update Root README
Create a note in the root README about the project structure:

Update the main `README.md` to include:
```markdown
## Project Structure

This project consists of three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| `frontend/` | React + TypeScript | User interface for medical records |
| `backend/` | Node.js + Express | API and data persistence |
| `ai-service/` | Python + FastAPI | AI transcription and extraction |

### Documentation

- `docs/` - BSG course documentation (architecture, ADRs, API specs)
- `docs-original/` - Original AI4Devs course documentation

### Quick Start

```bash
# Start all services
docker-compose up -d

# Or start individually
cd ai-service && docker-compose up -d
cd ../backend && npm run dev
cd ../frontend && npm run dev
```
```

### 7. Create .gitignore Updates
Add to root `.gitignore`:
```
# AI Service
ai-service/venv/
ai-service/.env
ai-service/__pycache__/
ai-service/*.pyc
ai-service/.pytest_cache/
ai-service/.mypy_cache/
ai-service/.ruff_cache/
ai-service/htmlcov/
ai-service/.coverage
ai-service/dist/
ai-service/*.egg-info/

# Documentation builds
docs/_build/
docs/presentation/img/*.png

# ChromaDB local data
chroma_data/
```

## Expected Deliverables
- `docs-original/` - Renamed from original `docs/`
- `docs/` - New BSG documentation structure (empty folders)
- `ai-service/` - Python AI service skeleton
- `ai-service/pyproject.toml` - Python project configuration
- `ai-service/.env.example` - Environment variables template
- `ai-service/README.md` - AI service documentation
- Updated root `README.md`
- Updated `.gitignore`

## Verification Steps
1. Original documentation preserved in `docs-original/`
2. New `docs/` folder has BSG-compliant structure
3. `ai-service/` folder structure is complete
4. Configuration files are valid
5. Git ignores appropriate files

## Notes
- Do not delete or modify the original frontend/backend code
- The AI service will be the focus of BSG evaluation
- All prompts and comments in AI service should support Spanish
- This setup enables the documentation-first approach for deliveries
