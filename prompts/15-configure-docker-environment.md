# Prompt 15: Configure Docker Environment

## Objective
Create the complete Docker configuration for the AI Service, including multi-stage Dockerfile, docker-compose for development, and integration with the existing Node.js backend.

## Context
The Docker setup must:
- Build a production-ready image (multi-stage)
- Include ChromaDB for vector storage
- Support hot-reload in development
- Integrate with existing PostgreSQL database
- Follow BSG Dockerfile and docker-compose requirements

## Reference Documents
- `07_artefactos/02_archivos_obligatorios.md` - Dockerfile and docker-compose templates

## Tasks

### 1. Create Multi-Stage Dockerfile

Create `ai-service/Dockerfile`:

```dockerfile
# ==============================================================
# Dockerfile — MedRecord AI Service
# Multi-stage build for production-ready image
# ==============================================================

# ── Etapa 1: Builder ──────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Instalar dependencias del sistema para compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python (capa cacheada)
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Etapa 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Instalar solo runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Usuario no-root por seguridad
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /home/appuser/.local

# Copiar código fuente
COPY src/ ./src/

# Variables de entorno de runtime
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Cambiar a usuario no-root
USER appuser

# Puerto de la API
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Comando de inicio
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ── Etapa 3: Development ─────────────────────────────────────
FROM runtime AS development

USER root

# Instalar dependencias de desarrollo
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Volver a usuario no-root
USER appuser

# Comando con hot-reload para desarrollo
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### 2. Create docker-compose.yml

Create `ai-service/docker-compose.yml` (Python-service-specific stack; the existing root `docker-compose.yml` for the Node monorepo is left untouched):

```yaml
# ==============================================================
# docker-compose.yml — MedRecord AI Service
# Entorno de desarrollo completo
# ==============================================================

version: "3.9"

services:
  # ─── AI Service (Python/FastAPI) ────────────────────────────
  ai-service:
    build:
      context: .
      target: development
    container_name: medrecord-ai-service
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - ENVIRONMENT=development
      - CHROMADB_HOST=chromadb
      - CHROMADB_PORT=8000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - DATABASE_URL=postgresql://${POSTGRES_USER:-dev_user}:${POSTGRES_PASSWORD:-dev_password}@postgres:5432/${POSTGRES_DB:-medrecord_dev}
    depends_on:
      postgres:
        condition: service_healthy
      chromadb:
        condition: service_started
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src:ro           # Hot reload (read-only for safety)
      - ./data/documents:/app/data/documents
    networks:
      - medrecord-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  # ─── ChromaDB (Vector Store) ────────────────────────────────
  chromadb:
    image: chromadb/chroma:0.5.23
    container_name: medrecord-chromadb
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - ANONYMIZED_TELEMETRY=False
      - CHROMA_SERVER_AUTH_CREDENTIALS_PROVIDER=chromadb.auth.token.TokenConfigServerAuthCredentialsProvider
      - CHROMA_SERVER_AUTH_PROVIDER=chromadb.auth.token.TokenAuthServerProvider
    networks:
      - medrecord-network
    restart: unless-stopped

  # ─── PostgreSQL (Database) ──────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-dev_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_password}
      POSTGRES_DB: ${POSTGRES_DB:-medrecord_dev}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - medrecord-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dev_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Redis (CRITICAL: Real-Time Session State) ──────────────
  redis:
    image: redis:7-alpine
    container_name: medrecord-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --appendfsync everysec
    networks:
      - medrecord-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Redis is ESSENTIAL for real-time streaming:
    # - WebSocket session state (connection tracking)
    # - Event buffering for reconnection (60s window)
    # - RAG cache (60-70% hit rate, 300ms→5ms)
    # - Priority queue for async RAG validation

networks:
  medrecord-network:
    driver: bridge

volumes:
  postgres_data:
  chroma_data:
  redis_data:
```

### 3. Create docker-compose.override.yml for Development

Create `ai-service/docker-compose.override.yml`:

```yaml
# ==============================================================
# docker-compose.override.yml — Development overrides
# Automatically loaded in development
# ==============================================================

version: "3.9"

services:
  ai-service:
    build:
      target: development
    volumes:
      - ./src:/app/src       # Mount source for hot reload
      - ./tests:/app/tests   # Mount tests
    environment:
      - LOG_LEVEL=DEBUG
      - USE_LLM_MOCK=false
    command: ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

  # Add Adminer for database management in development
  adminer:
    image: adminer:latest
    container_name: medrecord-adminer
    ports:
      - "8080:8080"
    networks:
      - medrecord-network
    depends_on:
      - postgres
```

### 4. Create docker-compose.prod.yml for Production

Create `ai-service/docker-compose.prod.yml`:

```yaml
# ==============================================================
# docker-compose.prod.yml — Production configuration
# Usage: docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
# ==============================================================

version: "3.9"

services:
  ai-service:
    build:
      context: .
      target: runtime
    environment:
      - ENVIRONMENT=production
      - LOG_LEVEL=INFO
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    volumes: []  # No source mounts in production

  chromadb:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  postgres:
    deploy:
      resources:
        limits:
          memory: 1G

  redis:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    command: redis-server --appendonly yes --appendfsync everysec --maxmemory 400mb --maxmemory-policy allkeys-lru
```

### 5. Create .dockerignore

Create `ai-service/.dockerignore`:

```
# ==============================================================
# .dockerignore — MedRecord AI Service
# Exclude unnecessary files from Docker build context
# ==============================================================

# Git
.git
.gitignore
.gitattributes

# Python
__pycache__
*.py[cod]
*$py.class
*.so
.Python
.venv
venv/
env/
.eggs/
*.egg-info/
dist/
build/

# Testing
.coverage
.coverage.*
htmlcov/
.pytest_cache/
.mypy_cache/
.ruff_cache/
coverage.xml

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.*
!.env.example

# Documentation (not needed in image)
docs/
*.md
!README.md

# Local data
data/
*.sqlite
*.db

# Reports (not needed in image)
reports/

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Notebooks (not needed in production image)
notebooks/

# Tests (not needed in production image)
tests/

# Infrastructure (IaC)
infrastructure/

# Misc
*.log
tmp/
temp/
```

### 6. Create Integration with Existing Backend

Create `packages/backend/src/services/ai-service-client.ts` (to modify existing backend):

```typescript
/**
 * Cliente HTTP para comunicación con el AI Service (Python).
 * Este archivo debe integrarse en el backend Node.js existente.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

interface QueryRequest {
  query: string;
  appointment_id?: string;
  context_filter?: Record<string, unknown>;
}

interface QueryResponse {
  response: string;
  sources: Array<{
    document_id: string;
    chunk_text: string;
    similarity_score: number;
  }>;
  extraction?: {
    medications: Array<{
      name: string;
      dosage: string;
      validation: {
        status: string;
        rag_confidence: number;
      };
    }>;
    symptoms: Array<{
      description: string;
      suggested_cie10: Array<{
        code: string;
        description: string;
        confidence: number;
      }>;
    }>;
    drug_interactions: Array<{
      medications: string[];
      severity: string;
      description: string;
    }>;
  };
  tokens_used: number;
  latency_ms: number;
}

interface TranscriptionRequest {
  audio_data: string; // Base64 encoded audio
  language?: string;
  appointment_id?: string;
}

interface TranscriptionResponse {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
  duration_seconds: number;
  cost_usd: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    llm_api: string;
    vector_store: string;
    database: string;
  };
  timestamp: string;
}

export class AIServiceClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = process.env.AI_SERVICE_URL || 'http://ai-service:8000') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // 60 seconds for LLM operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      const token = process.env.AI_SERVICE_API_KEY;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[AIServiceClient] Error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        throw error;
      }
    );
  }

  /**
   * Query the AI service with RAG-enhanced response.
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await this.client.post<QueryResponse>('/api/v1/query', request);
    return response.data;
  }

  /**
   * Transcribe audio using Whisper.
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const response = await this.client.post<TranscriptionResponse>(
      '/api/v1/transcribe',
      request
    );
    return response.data;
  }

  /**
   * Transcribe and extract medical information in one call.
   */
  async transcribeAndExtract(request: TranscriptionRequest): Promise<{
    transcription: TranscriptionResponse;
    extraction: QueryResponse['extraction'];
  }> {
    const response = await this.client.post('/api/v1/transcribe-and-extract', request);
    return response.data;
  }

  /**
   * Check health of the AI service.
   */
  async health(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/api/v1/health');
    return response.data;
  }

  /**
   * Ingest documents to the RAG knowledge base.
   */
  async ingest(documents: Array<{ content: string; metadata: Record<string, unknown> }>) {
    const response = await this.client.post('/api/v1/ingest', { documents });
    return response.data;
  }
}

// Singleton instance
export const aiServiceClient = new AIServiceClient();
```

### 7. Update docker-compose.yml to Include Existing Backend

Create `ai-service/docker-compose.full.yml` (full stack including existing services; build contexts are relative to this file under `ai-service/`, so `./packages/...` references should be resolved against the repo root by running compose with `-f ai-service/docker-compose.full.yml --project-directory .`):

```yaml
# ==============================================================
# docker-compose.full.yml — Full Stack (AI + Backend + Frontend)
# Usage: docker-compose -f docker-compose.yml -f docker-compose.full.yml up
# ==============================================================

version: "3.9"

services:
  # Include existing backend
  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
    container_name: medrecord-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER:-dev_user}:${POSTGRES_PASSWORD:-dev_password}@postgres:5432/${POSTGRES_DB:-medrecord_dev}
      - AI_SERVICE_URL=http://ai-service:8000
    depends_on:
      - postgres
      - ai-service
    networks:
      - medrecord-network

  # Include existing frontend
  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile
    container_name: medrecord-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - backend
    networks:
      - medrecord-network
```

## Expected Deliverables

1. `ai-service/Dockerfile` - Multi-stage build (builder, runtime, development)
2. `ai-service/docker-compose.yml` - Development environment
3. `ai-service/docker-compose.override.yml` - Development overrides
4. `ai-service/docker-compose.prod.yml` - Production configuration
5. `ai-service/.dockerignore` - Files to exclude from build
6. `ai-service/docker-compose.full.yml` - Full stack integration
7. `packages/backend/src/services/ai-service-client.ts` - Backend client (Node side, stays at repo root)

## Verification Steps

1. `cd ai-service && docker build -t medrecord-ai-service .` completes successfully
2. `cd ai-service && docker-compose up` starts all services
3. `curl http://localhost:8000/api/v1/health` returns 200
4. Hot reload works in development (change code, see changes)
5. ChromaDB is accessible at localhost:8001
6. PostgreSQL is accessible at localhost:5432

## Notes

- Multi-stage build reduces final image size
- Non-root user for security (BSG requirement)
- Health checks enable proper orchestration
- Volumes for persistence (PostgreSQL, ChromaDB)
- Network isolation between services
- Production config removes source mounts
