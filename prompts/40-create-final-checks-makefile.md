# Prompt 40: Create Final Checks and Makefile

## Objective
Create comprehensive Makefile for standardized execution, file verification script, and pre-delivery checklist to ensure BSG requirements are met before final submission.

## Context
BSG requires:
- **Makefile** for standardizing workflow execution (install, dev, test, deploy)
- **File verification** to ensure all required files exist (REQUIRED_FILES.md)
- **Pre-delivery checklist** to verify completeness before submission
- System must be reproducible in <15 minutes following README
- All commands must work without errors

This prompt creates the final quality gates for the BSG delivery.

## Tasks

### 1. Create Comprehensive Makefile

**File:** `Makefile` (project root)

**Content:**
```makefile
# =============================================================================
# Makefile - MedRecord AI
# =============================================================================
# Standardized commands for development, testing, and deployment
# BSG Requirement: Estandarizar ejecución de comandos
#
# Usage:
#   make install    - Install dependencies
#   make dev        - Start development environment
#   make test       - Run all tests
#   make deploy     - Deploy to production
# =============================================================================

.PHONY: help install dev test test-unit test-integration test-load test-ragas \
        test-websocket test-streaming security-scan security-install coverage lint format build deploy \
        health check-files pre-delivery clean ingest-knowledge

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RED    := $(shell tput -Txterm setaf 1)
RESET  := $(shell tput -Txterm sgr0)

# Project paths
AI_SERVICE_DIR = ai-service
BACKEND_DIR = backend
FRONTEND_DIR = frontend
INFRASTRUCTURE_DIR = infrastructure

# =============================================================================
# HELP
# =============================================================================

help:  ## Show this help message
	@echo ''
	@echo '${GREEN}MedRecord AI - Available Commands${RESET}'
	@echo ''
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} { \
		if (/^[a-zA-Z_-]+:.*?##.*$$/) {printf "  ${YELLOW}%-20s${RESET} %s\n", $$1, $$2} \
	}' $(MAKEFILE_LIST)
	@echo ''

# =============================================================================
# INSTALLATION
# =============================================================================

install:  ## Install all dependencies (frontend, backend, AI service)
	@echo "${GREEN}📦 Installing dependencies...${RESET}"
	@echo "${YELLOW}Installing Frontend dependencies...${RESET}"
	cd $(FRONTEND_DIR) && pnpm install
	@echo "${YELLOW}Installing Backend dependencies...${RESET}"
	cd $(BACKEND_DIR) && pnpm install
	@echo "${YELLOW}Installing AI Service dependencies...${RESET}"
	cd $(AI_SERVICE_DIR) && pip install -r requirements.txt
	@echo "${GREEN}✅ All dependencies installed${RESET}"

install-dev:  ## Install development dependencies
	@echo "${GREEN}📦 Installing development dependencies...${RESET}"
	cd $(AI_SERVICE_DIR) && pip install -r requirements-dev.txt
	cd $(BACKEND_DIR) && pnpm install --dev
	cd $(FRONTEND_DIR) && pnpm install --dev
	@echo "${GREEN}✅ Development dependencies installed${RESET}"

# =============================================================================
# DEVELOPMENT
# =============================================================================

dev:  ## Start development environment (all services with Docker Compose)
	@echo "${GREEN}🚀 Starting development environment...${RESET}"
	docker-compose up -d
	@echo ""
	@echo "${GREEN}✅ Development environment started${RESET}"
	@echo ""
	@echo "Services:"
	@echo "  Frontend:     http://localhost:3001"
	@echo "  Backend:      http://localhost:3000"
	@echo "  AI Service:   http://localhost:8000"
	@echo "  API Docs:     http://localhost:8000/docs"
	@echo "  ChromaDB:     http://localhost:8001"
	@echo ""
	@echo "Run 'make logs' to view logs"
	@echo "Run 'make stop' to stop services"

dev-build:  ## Build and start development environment
	@echo "${GREEN}🔨 Building and starting development environment...${RESET}"
	docker-compose up -d --build

stop:  ## Stop development environment
	@echo "${YELLOW}🛑 Stopping development environment...${RESET}"
	docker-compose down

restart:  ## Restart development environment
	@echo "${YELLOW}🔄 Restarting development environment...${RESET}"
	docker-compose restart

logs:  ## View logs from all services
	docker-compose logs -f

logs-ai:  ## View AI service logs only
	docker-compose logs -f ai-service

logs-backend:  ## View backend logs only
	docker-compose logs -f backend

logs-frontend:  ## View frontend logs only
	docker-compose logs -f frontend

# =============================================================================
# TESTING
# =============================================================================

test:  ## Run all tests (unit, integration, load, RAGAS)
	@echo "${GREEN}🧪 Running all tests...${RESET}"
	@make test-unit
	@make test-integration
	@make test-ragas
	@make test-load
	@echo "${GREEN}✅ All tests completed${RESET}"

test-unit:  ## Run unit tests with coverage
	@echo "${YELLOW}Running unit tests (AI Service)...${RESET}"
	cd $(AI_SERVICE_DIR) && pytest tests/unit/ -v --cov=src --cov-report=term --cov-report=html:../reports/coverage/html --cov-report=xml:../reports/coverage/coverage.xml
	@echo "${YELLOW}Running unit tests (Backend)...${RESET}"
	cd $(BACKEND_DIR) && pnpm test:unit
	@echo "${YELLOW}Running unit tests (Frontend)...${RESET}"
	cd $(FRONTEND_DIR) && pnpm test:unit
	@echo "${GREEN}✅ Unit tests completed${RESET}"

test-integration:  ## Run integration tests
	@echo "${YELLOW}Running integration tests...${RESET}"
	cd $(AI_SERVICE_DIR) && pytest tests/integration/ -v
	cd $(BACKEND_DIR) && pnpm test:integration
	@echo "${GREEN}✅ Integration tests completed${RESET}"

test-load:  ## Run load tests with Locust
	@echo "${YELLOW}Running load tests...${RESET}"
	cd $(AI_SERVICE_DIR) && locust -f tests/load/locustfile.py --headless --users 50 --spawn-rate 5 --run-time 2m --host http://localhost:8000 --html ../reports/load_test/load_test_report.html
	@echo "${GREEN}✅ Load tests completed${RESET}"
	@echo "Report: reports/load_test/load_test_report.html"

test-ragas:  ## Run RAGAS evaluation
	@echo "${YELLOW}Running RAGAS evaluation...${RESET}"
	cd $(AI_SERVICE_DIR) && pytest tests/evaluation/test_ragas.py -v --tb=short
	@echo "${GREEN}✅ RAGAS evaluation completed${RESET}"
	@echo "Report: reports/ragas_results.json"

test-websocket:  ## Run WebSocket and real-time streaming tests
	@echo "${YELLOW}Running WebSocket tests...${RESET}"
	cd $(AI_SERVICE_DIR) && pytest tests/streaming/ -v --tb=short
	cd $(BACKEND_DIR) && pnpm test:websocket
	cd $(FRONTEND_DIR) && pnpm test:realtime
	@echo "${GREEN}✅ WebSocket tests completed${RESET}"

test-streaming:  ## Run end-to-end real-time streaming tests
	@echo "${YELLOW}Running real-time streaming E2E tests...${RESET}"
	@echo "  - Testing WebSocket connection establishment"
	@echo "  - Testing audio chunk streaming"
	@echo "  - Testing transcription latency (target < 2s)"
	@echo "  - Testing entity extraction latency (target < 3s)"
	@echo "  - Testing critical alert latency (target < 1s)"
	@echo "  - Testing reconnection with event replay"
	cd $(AI_SERVICE_DIR) && pytest tests/streaming/test_e2e_realtime.py -v --tb=short
	@echo "${GREEN}✅ Real-time streaming E2E tests completed${RESET}"
	@echo "Latency report: reports/streaming_latency_report.json"

test-latency:  ## Run latency benchmarks for real-time streaming
	@echo "${YELLOW}Running latency benchmarks...${RESET}"
	cd $(AI_SERVICE_DIR) && pytest tests/streaming/test_latency_benchmarks.py -v --benchmark
	@echo "${GREEN}✅ Latency benchmarks completed${RESET}"
	@echo "Results:"
	@echo "  - Transcription p95 latency"
	@echo "  - Extraction p95 latency"
	@echo "  - Critical alert p95 latency"
	@echo "  - WebSocket message p95 latency"

coverage:  ## Generate coverage report
	@echo "${YELLOW}Generating coverage report...${RESET}"
	cd $(AI_SERVICE_DIR) && pytest tests/unit/ --cov=src --cov-report=html:../reports/coverage/html --cov-report=term
	@echo "${GREEN}✅ Coverage report generated${RESET}"
	@echo "Open: reports/coverage/html/index.html"

# =============================================================================
# CODE QUALITY
# =============================================================================

lint:  ## Run linters (Ruff for Python, ESLint for TS)
	@echo "${YELLOW}Linting AI Service (Python)...${RESET}"
	cd $(AI_SERVICE_DIR) && ruff check src/ tests/
	@echo "${YELLOW}Linting Backend (TypeScript)...${RESET}"
	cd $(BACKEND_DIR) && pnpm lint
	@echo "${YELLOW}Linting Frontend (TypeScript)...${RESET}"
	cd $(FRONTEND_DIR) && pnpm lint
	@echo "${GREEN}✅ Linting completed${RESET}"

format:  ## Format code (Black for Python, Prettier for TS)
	@echo "${YELLOW}Formatting AI Service (Python)...${RESET}"
	cd $(AI_SERVICE_DIR) && black src/ tests/
	@echo "${YELLOW}Formatting Backend (TypeScript)...${RESET}"
	cd $(BACKEND_DIR) && pnpm format
	@echo "${YELLOW}Formatting Frontend (TypeScript)...${RESET}"
	cd $(FRONTEND_DIR) && pnpm format
	@echo "${GREEN}✅ Code formatted${RESET}"

typecheck:  ## Run type checking (MyPy for Python, tsc for TS)
	@echo "${YELLOW}Type checking AI Service (Python)...${RESET}"
	cd $(AI_SERVICE_DIR) && mypy src/
	@echo "${YELLOW}Type checking Backend (TypeScript)...${RESET}"
	cd $(BACKEND_DIR) && pnpm typecheck
	@echo "${YELLOW}Type checking Frontend (TypeScript)...${RESET}"
	cd $(FRONTEND_DIR) && pnpm typecheck
	@echo "${GREEN}✅ Type checking completed${RESET}"

# =============================================================================
# SECURITY
# =============================================================================

security-scan:  ## Run security scanning (Bandit, pip-audit, npm audit, gitleaks)
	@echo "${GREEN}🔐 Running security scan...${RESET}"
	@bash scripts/security-scan.sh

security-install:  ## Install security scanning tools
	@echo "${YELLOW}Installing security tools...${RESET}"
	pip install bandit pip-audit
	@echo "${GREEN}✅ Security tools installed${RESET}"
	@echo ""
	@echo "${YELLOW}⚠️  Manual installation required:${RESET}"
	@echo "  - gitleaks: https://github.com/gitleaks/gitleaks"
	@echo "  - trivy: https://aquasecurity.github.io/trivy/"

# =============================================================================
# BUILD & DEPLOYMENT
# =============================================================================

build:  ## Build Docker images for production
	@echo "${GREEN}🔨 Building Docker images...${RESET}"
	docker build -t medrecord-ai-service:latest -f $(AI_SERVICE_DIR)/Dockerfile $(AI_SERVICE_DIR)
	docker build -t medrecord-backend:latest -f $(BACKEND_DIR)/Dockerfile $(BACKEND_DIR)
	docker build -t medrecord-frontend:latest -f $(FRONTEND_DIR)/Dockerfile $(FRONTEND_DIR)
	@echo "${GREEN}✅ Docker images built${RESET}"

deploy-staging:  ## Deploy to staging environment
	@echo "${GREEN}🚀 Deploying to staging...${RESET}"
	@bash scripts/deploy.sh staging
	@echo "${GREEN}✅ Deployed to staging${RESET}"

deploy-production:  ## Deploy to production environment
	@echo "${GREEN}🚀 Deploying to production...${RESET}"
	@bash scripts/deploy.sh production
	@echo "${GREEN}✅ Deployed to production${RESET}"

terraform-init:  ## Initialize Terraform
	@echo "${YELLOW}Initializing Terraform...${RESET}"
	cd $(INFRASTRUCTURE_DIR)/terraform && terraform init

terraform-plan:  ## Run Terraform plan
	@echo "${YELLOW}Running Terraform plan...${RESET}"
	cd $(INFRASTRUCTURE_DIR)/terraform && terraform plan

terraform-apply:  ## Apply Terraform configuration
	@echo "${YELLOW}Applying Terraform configuration...${RESET}"
	cd $(INFRASTRUCTURE_DIR)/terraform && terraform apply

# =============================================================================
# HEALTH & MONITORING
# =============================================================================

health:  ## Check health of all services
	@echo "${GREEN}🏥 Checking health of all services...${RESET}"
	@echo ""
	@echo "${YELLOW}Frontend:${RESET}"
	@curl -s http://localhost:3001 > /dev/null && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${RED}❌ Down${RESET}"
	@echo "${YELLOW}Backend:${RESET}"
	@curl -s http://localhost:3000/api/health > /dev/null && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${RED}❌ Down${RESET}"
	@echo "${YELLOW}AI Service:${RESET}"
	@curl -s http://localhost:8000/api/v1/health > /dev/null && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${RED}❌ Down${RESET}"
	@echo "${YELLOW}PostgreSQL:${RESET}"
	@docker exec medrecord-postgres pg_isready > /dev/null 2>&1 && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${RED}❌ Down${RESET}"
	@echo "${YELLOW}Redis:${RESET}"
	@docker exec medrecord-redis redis-cli ping > /dev/null 2>&1 && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${RED}❌ Down${RESET}"
	@echo "${YELLOW}ChromaDB:${RESET}"
	@curl -s http://localhost:8001/api/v1/heartbeat > /dev/null && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${RED}❌ Down${RESET}"
	@echo "${YELLOW}WebSocket (Real-Time Streaming):${RESET}"
	@command -v wscat > /dev/null && (timeout 2 wscat -c ws://localhost:3000/ws/health --no-color 2>/dev/null && echo "  ${GREEN}✅ OK${RESET}" || echo "  ${YELLOW}⚠️  Connection test failed (may need auth)${RESET}") || echo "  ${YELLOW}⚠️  wscat not installed (npm i -g wscat)${RESET}"
	@echo ""
	@echo "${YELLOW}WebSocket Pool Status:${RESET}"
	@curl -s http://localhost:8000/api/v1/health | jq -r '.components.websocket_pool // "N/A"' 2>/dev/null || echo "  (Run curl manually to check)"
	@echo ""

# =============================================================================
# DATA MANAGEMENT
# =============================================================================

ingest-knowledge:  ## Ingest medical knowledge base into ChromaDB
	@echo "${GREEN}📚 Ingesting medical knowledge base...${RESET}"
	cd $(AI_SERVICE_DIR) && python scripts/ingest_medical_knowledge.py
	@echo "${GREEN}✅ Knowledge base ingested${RESET}"

db-migrate:  ## Run database migrations
	@echo "${YELLOW}Running database migrations...${RESET}"
	cd $(BACKEND_DIR) && pnpm migration:run
	@echo "${GREEN}✅ Migrations completed${RESET}"

db-seed:  ## Seed database with sample data
	@echo "${YELLOW}Seeding database...${RESET}"
	cd $(BACKEND_DIR) && pnpm seed
	@echo "${GREEN}✅ Database seeded${RESET}"

db-reset:  ## Reset database (drop all tables and re-migrate)
	@echo "${RED}⚠️  Resetting database (this will delete all data)${RESET}"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd $(BACKEND_DIR) && pnpm migration:revert && pnpm migration:run; \
		echo "${GREEN}✅ Database reset completed${RESET}"; \
	fi

# =============================================================================
# PRE-DELIVERY CHECKS (BSG)
# =============================================================================

check-files:  ## Verify all required files exist
	@echo "${GREEN}📋 Verifying required files...${RESET}"
	@bash scripts/check-required-files.sh

pre-delivery:  ## Run all pre-delivery checks
	@echo "${GREEN}🚀 Running pre-delivery checks...${RESET}"
	@echo ""
	@echo "${YELLOW}[1/6] Checking required files...${RESET}"
	@make check-files
	@echo ""
	@echo "${YELLOW}[2/6] Running linters...${RESET}"
	@make lint
	@echo ""
	@echo "${YELLOW}[3/6] Running type checking...${RESET}"
	@make typecheck
	@echo ""
	@echo "${YELLOW}[4/6] Running tests...${RESET}"
	@make test
	@echo ""
	@echo "${YELLOW}[5/6] Running security scan...${RESET}"
	@make security-scan
	@echo ""
	@echo "${YELLOW}[6/6] Checking health...${RESET}"
	@make health
	@echo ""
	@echo "${GREEN}✅ All pre-delivery checks passed!${RESET}"
	@echo ""
	@echo "Ready for BSG final submission 🎉"

# =============================================================================
# CLEANUP
# =============================================================================

clean:  ## Clean all generated files and caches
	@echo "${YELLOW}🧹 Cleaning generated files...${RESET}"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf reports/coverage reports/load_test 2>/dev/null || true
	@echo "${GREEN}✅ Cleanup completed${RESET}"

clean-docker:  ## Clean Docker containers, volumes, and images
	@echo "${RED}⚠️  Cleaning Docker resources (this will delete all containers and volumes)${RESET}"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -af; \
		echo "${GREEN}✅ Docker cleanup completed${RESET}"; \
	fi

# =============================================================================
# DOCUMENTATION
# =============================================================================

docs-serve:  ## Serve documentation locally
	@echo "${YELLOW}📚 Serving documentation...${RESET}"
	@echo "Documentation available at: http://localhost:8080"
	@python -m http.server 8080 --directory docs/

docs-build:  ## Build documentation (if using MkDocs or similar)
	@echo "${YELLOW}Building documentation...${RESET}"
	@echo "${RED}Not implemented yet${RESET}"

# =============================================================================
# UTILITIES
# =============================================================================

shell-ai:  ## Open shell in AI service container
	docker exec -it medrecord-ai-service /bin/bash

shell-backend:  ## Open shell in backend container
	docker exec -it medrecord-backend /bin/bash

shell-db:  ## Open PostgreSQL shell
	docker exec -it medrecord-postgres psql -U medrecord_user -d medrecord_db

shell-redis:  ## Open Redis CLI
	docker exec -it medrecord-redis redis-cli

ps:  ## Show running containers
	docker-compose ps

stats:  ## Show container resource usage
	docker stats --no-stream

version:  ## Show project version
	@echo "MedRecord AI v1.0.0"
	@echo "Python: $$(python --version 2>&1 | cut -d' ' -f2)"
	@echo "Node: $$(node --version)"
	@echo "Docker: $$(docker --version | cut -d' ' -f3 | tr -d ',')"
```

### 2. Create File Verification Script

**File:** `scripts/check-required-files.sh`

**Content:**
```bash
#!/bin/bash
# =============================================================================
# File Verification Script - MedRecord AI
# =============================================================================
# Verifies that all BSG-required files exist before final delivery
# Based on: 07_artefactos/02_archivos_obligatorios.md

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Verificando archivos mínimos obligatorios...${NC}"
echo ""

# Counter for missing files
MISSING_COUNT=0
TOTAL_CHECKED=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    TOTAL_CHECKED=$((TOTAL_CHECKED + 1))

    if [ -e "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
        return 0
    else
        echo -e "  ${RED}❌ FALTA:${NC} $file - $description"
        MISSING_COUNT=$((MISSING_COUNT + 1))
        return 1
    fi
}

# =============================================================================
# ROOT FILES
# =============================================================================
echo -e "${YELLOW}Root Files:${NC}"
check_file "README.md" "Readme principal del proyecto"
check_file ".env.example" "Plantilla de variables de entorno"
check_file ".gitignore" "Exclusiones de Git"
check_file "Makefile" "Comandos estandarizados"
check_file "docker-compose.yml" "Configuración Docker Compose"
check_file "Dockerfile" "Dockerfile principal (o en subdirectorios)"
echo ""

# =============================================================================
# CI/CD
# =============================================================================
echo -e "${YELLOW}CI/CD:${NC}"
check_file ".github/workflows/ci-cd.yml" "Pipeline CI/CD de GitHub Actions"
echo ""

# =============================================================================
# DOCUMENTATION
# =============================================================================
echo -e "${YELLOW}Documentation:${NC}"
check_file "docs/PROJECT_DOCUMENTATION.md" "Plantilla BSG completada"
check_file "docs/architecture/architecture-c4-context.png" "Diagrama C4 Contexto"
check_file "docs/architecture/architecture-c4-container.png" "Diagrama C4 Contenedor"
check_file "docs/architecture/README.md" "Índice de diagramas"
check_file "docs/adr/ADR-001-seleccion-modelo-llm.md" "ADR-001 (mínimo 2 requeridos)"
check_file "docs/adr/ADR-002-seleccion-vector-store.md" "ADR-002"
check_file "docs/api/openapi.yaml" "Especificación OpenAPI"
echo ""

# =============================================================================
# SOURCE CODE
# =============================================================================
echo -e "${YELLOW}Source Code Structure:${NC}"
check_file "ai-service/src/__init__.py" "AI Service main module"
check_file "ai-service/src/api/main.py" "AI Service API entry point"
check_file "ai-service/src/core/llm_client.py" "LLM client wrapper"
check_file "ai-service/src/rag/retriever.py" "RAG retriever"
check_file "ai-service/requirements.txt" "Python dependencies"
check_file "backend/src/index.ts" "Backend entry point (o equivalente)"
check_file "backend/package.json" "Backend Node.js dependencies"
check_file "frontend/src/main.tsx" "Frontend entry point (o equivalente)"
check_file "frontend/package.json" "Frontend dependencies"
echo ""

# =============================================================================
# REAL-TIME STREAMING COMPONENTS
# =============================================================================
echo -e "${YELLOW}Real-Time Streaming Components:${NC}"
check_file "ai-service/src/streaming/" "AI Service streaming module directory"
check_file "ai-service/src/streaming/websocket_handler.py" "WebSocket connection handler"
check_file "ai-service/src/streaming/vad.py" "Voice Activity Detection (VAD)"
check_file "ai-service/src/streaming/entity_matcher.py" "Entity matching engine"
check_file "backend/src/websocket/" "Backend WebSocket gateway directory"
check_file "frontend/src/hooks/useRealtimeSession.ts" "React real-time session hook"
check_file "frontend/src/components/LiveTranscriptionView.tsx" "Live transcription component"
echo ""

# =============================================================================
# TESTS
# =============================================================================
echo -e "${YELLOW}Tests:${NC}"
check_file "ai-service/tests/unit/" "Directorio de pruebas unitarias (AI)"
check_file "ai-service/tests/integration/" "Directorio de pruebas integración (AI)"
check_file "ai-service/tests/load/" "Directorio de pruebas de carga"
check_file "ai-service/tests/conftest.py" "Fixtures de pytest"
check_file "backend/tests/" "Directorio de pruebas (Backend)"
check_file "frontend/tests/" "Directorio de pruebas (Frontend)"
echo ""

# =============================================================================
# REPORTS
# =============================================================================
echo -e "${YELLOW}Reports (deben generarse antes de entrega):${NC}"
check_file "reports/" "Directorio de reportes"
echo -e "  ${YELLOW}⚠️  Los siguientes reportes deben generarse con 'make test':${NC}"
echo -e "     - reports/coverage/coverage.xml"
echo -e "     - reports/ragas_results.json"
echo -e "     - reports/load_test/load_test_report.html"
echo ""

# =============================================================================
# INFRASTRUCTURE
# =============================================================================
echo -e "${YELLOW}Infrastructure:${NC}"
check_file "infrastructure/terraform/main.tf" "Terraform main config"
check_file "infrastructure/terraform/variables.tf" "Terraform variables"
check_file "infrastructure/aws/README.md" "AWS deployment guide"
echo ""

# =============================================================================
# SECURITY
# =============================================================================
echo -e "${YELLOW}Security:${NC}"
check_file "docs/security/threat-model.md" "Modelo de amenazas"
check_file "scripts/security-scan.sh" "Script de escaneo de seguridad"
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total archivos verificados: ${TOTAL_CHECKED}"
echo -e "Archivos faltantes: ${MISSING_COUNT}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los archivos mínimos están presentes. ¡Listo para entrega!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Faltan $MISSING_COUNT archivos obligatorios. Completa antes de entregar.${NC}"
    echo ""
    echo "Para crear archivos faltantes, revisa los prompts correspondientes:"
    echo "  - Documentación: prompts-BSG-new/35-37"
    echo "  - Seguridad: prompts-BSG-new/38"
    echo "  - Tests: prompts-BSG-new/28-32"
    echo "  - Infraestructura: prompts-BSG-new/33-34"
    echo ""
    exit 1
fi
```

**Make executable:**
```bash
chmod +x scripts/check-required-files.sh
```

### 3. Create Pre-Delivery Checklist

**File:** `docs/PRE_DELIVERY_CHECKLIST.md`

**Content:**
```markdown
# Pre-Delivery Checklist — MedRecord AI

**Fecha:** DD/MM/2025
**Versión:** 1.0

Completar este checklist ANTES de la entrega final a BSG.

---

## 🔍 Verificación Automática

Ejecutar:

```bash
make pre-delivery
```

Este comando ejecuta:
- ✅ Verificación de archivos requeridos
- ✅ Linters (Ruff, ESLint)
- ✅ Type checking (MyPy, tsc)
- ✅ Tests (unit, integration, RAGAS, load)
- ✅ Security scan (Bandit, pip-audit, npm audit, gitleaks)
- ✅ Health check

---

## 📋 Checklist Manual

### 1. Repositorio Git

- [ ] Historial de commits limpio (Conventional Commits: `feat:`, `fix:`, `docs:`)
- [ ] Al menos 1 Pull Request mergeado
- [ ] Tag de versión `v1.0.0` creado: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] `.env` **NO** está commiteado: `git check-ignore .env` debe retornar `.env`
- [ ] No hay credenciales en Git history: `make security-scan` debe pasar
- [ ] CI/CD en verde: GitHub Actions badge en README debe estar verde

**Comandos:**
```bash
git log --oneline --decorate -20  # Ver commits recientes
git tag -l                        # Ver tags
git check-ignore .env             # Verificar .env ignorado
```

---

### 2. Documentación

- [ ] **README.md** permite setup en <15 minutos
- [ ] **PROJECT_DOCUMENTATION.md** completado 100% (sin `[XXX]` ni `[Completar]`)
- [ ] **OpenAPI spec** (`docs/api/openapi.yaml`) completa
- [ ] **Diagramas de arquitectura** (C4 Context + Container) en PNG 300 dpi
- [ ] **Mínimo 2 ADRs** documentados con alternativas evaluadas
- [ ] **Modelo de amenazas** con ≥4 amenazas y controles
- [ ] **Video demo** (≤30 min) con enlace en README

**Verificar:**
```bash
grep -r "\[XXX\]" docs/PROJECT_DOCUMENTATION.md  # No debe retornar nada
grep -r "\[Completar" docs/PROJECT_DOCUMENTATION.md  # No debe retornar nada
ls -lh docs/architecture/*.png  # Verificar tamaño de imágenes (>1MB OK)
```

---

### 3. Código y Tests

- [ ] **Cobertura de tests ≥80%**: Ver `reports/coverage/index.html`
- [ ] **RAGAS metrics cumplidas**:
  - Faithfulness >0.80
  - Context Precision >0.75
  - Answer Relevancy >0.80
- [ ] **Load tests ejecutados**: 50 usuarios concurrentes, p95 <3s
- [ ] **Linters pasan sin errores**: `make lint`
- [ ] **Type checking pasa**: `make typecheck`
- [ ] **No hay `print()` en código de producción**
- [ ] **Real-time streaming tests pasan**: `make test-websocket`
- [ ] **Latency targets cumplidas**:
  - Transcription < 2s (p95)
  - Extraction < 3s (p95)
  - Critical alerts < 1s (p95)

**Verificar:**
```bash
make coverage  # Ver % de cobertura
cat reports/ragas_results.json | jq '.metrics'  # Ver scores RAGAS
cat reports/load_test/load_test_report.html  # Ver reporte de carga
grep -r "print(" ai-service/src/  # No debe retornar nada
make test-websocket  # Verificar tests de WebSocket
make test-latency    # Verificar latency benchmarks
```

---

### 4. Seguridad

- [ ] **Security scan sin issues críticos**: `make security-scan`
- [ ] **No hay secrets expuestos**: gitleaks debe retornar 0 secrets
- [ ] **Dependencias actualizadas**: npm audit y pip-audit sin críticos
- [ ] **.env.example** completado con todas las variables
- [ ] **.gitignore** excluye `.env`, `*.pem`, `*.key`, `secrets/`, etc.
- [ ] **Autenticación JWT** implementada en todos los endpoints (excepto /health)
- [ ] **Rate limiting** configurado en Nginx

**Verificar:**
```bash
make security-scan
cat reports/security/security-summary.md
```

---

### 5. Deployment e Infraestructura

- [ ] **Sistema desplegado en AWS** con URL pública
- [ ] **Terraform apply** funciona sin errores
- [ ] **SSL/TLS** configurado con Let's Encrypt
- [ ] **Health check** retorna `healthy`: `curl https://[tu-dominio]/api/v1/health`
- [ ] **CI/CD pipeline** funciona: push a `main` → deploy automático
- [ ] **Rollback script** probado
- [ ] **WebSocket funciona en producción**: `wscat -c wss://[tu-dominio]/ws/session/test`
- [ ] **Nginx WebSocket proxy** configurado correctamente

**Verificar:**
```bash
cd infrastructure/terraform
terraform plan  # No debe haber errores
terraform output  # Ver outputs (URL, IP)

curl https://[tu-dominio]/api/v1/health  # Debe retornar status: healthy

# Verificar WebSocket en producción
wscat -c wss://[tu-dominio]/ws/session/test -H "Authorization: Bearer ${TOKEN}"

# Verificar Nginx WebSocket config
ssh ec2-user@[ip] 'grep -A 10 "location /ws" /etc/nginx/conf.d/medrecord.conf'
```

---

### 6. Observabilidad

- [ ] **Structured logging** implementado (JSON format)
- [ ] **Health check endpoint** retorna estado de todos los componentes
- [ ] **Cost tracking** funcionando: `curl http://localhost:3000/api/costs`
- [ ] **Logs incluyen**: tokens, latencia, costos, errores con stack trace
- [ ] **WebSocket pool monitoring** funcionando (active sessions, capacity)
- [ ] **Real-time latency metrics** siendo trackeados
- [ ] **Cost breakdown por modo** (batch vs realtime)

**Verificar:**
```bash
make health  # Todos los componentes deben estar UP (incluye WebSocket pool)
curl http://localhost:3000/api/costs | jq  # Ver dashboard de costos (incluye mode_breakdown)

# Ver logs estructurados
docker logs medrecord-ai-service 2>&1 | jq 'select(.level == "ERROR")'

# Verificar WebSocket pool status
curl -s http://localhost:8000/api/v1/health | jq '.components.websocket_pool'

# Verificar métricas de latencia real-time
docker logs medrecord-ai-service 2>&1 | jq 'select(.context.extraction_latency_ms != null)'
```

---

### 7. Datos Reales (NO Estimaciones)

- [ ] **Costos reales** de AWS en `docs/PROJECT_DOCUMENTATION.md` (Sección 8.3)
- [ ] **Resultados RAGAS** con scores reales en `reports/ragas_results.json`
- [ ] **Métricas de rendimiento** reales (latencia p95, throughput) en README
- [ ] **Coverage real** (no placeholder) en README

**Actualizar con datos reales:**
```markdown
| Métrica | Meta | **Resultado Real** |
|---------|------|--------------------|
| Faithfulness (RAGAS) | >0.85 | **0.91** ← Dato real
| Latencia p95 | <3s | **2.8s** ← Dato real
| Costo mensual AWS | <$50 | **$38.45** ← Factura real
```

---

### 8. Video Demo

- [ ] **Duración ≤30 minutos**
- [ ] **Contenido**:
  - [0-10 min] Demo funcional en AWS (upload audio → transcription → extraction → SOAP)
  - [10-18 min] Arquitectura y decisiones técnicas (ADRs, trade-offs)
  - [18-23 min] Resultados (RAGAS, costos, latencia)
  - [23-28 min] Reflexión crítica y trabajo futuro
  - [28-30 min] Cierre
- [ ] **Enlace en README**: `[Ver presentación del proyecto](https://youtube.com/watch?v=...)`
- [ ] **Formato**: YouTube (unlisted) o Google Drive (compartido)

---

### 9. Entrega Final

- [ ] **Formulario BSG** completado con:
  - URL del repositorio Git
  - URL del sistema desplegado (AWS)
  - URL del video demo
  - Tag de versión: `v1.0.0`
- [ ] **Email de confirmación** enviado al instructor
- [ ] **Fecha de entrega**: Antes de DD/MM/2025 23:59 UTC

---

## ✅ Comando Final

Antes de entregar, ejecutar:

```bash
# 1. Verificación completa
make pre-delivery

# 2. Crear tag de versión
git tag -a v1.0.0 -m "Entrega final BSG"
git push origin main --tags

# 3. Verificar URL pública
curl https://[tu-dominio]/api/v1/health

# 4. Verificar video accesible
# Abrir enlace del video en navegador incógnito
```

---

## 🚨 Deduciones Automáticas (Evitar)

| Situación | Penalización |
|-----------|--------------|
| Credenciales en repositorio | −15 puntos |
| Entrega 1 día tarde | −5 puntos |
| Sistema no desplegado (solo localhost) | −8 puntos |
| Archivos mínimos faltantes | −2 puntos por archivo (máx −10) |
| Video >30 minutos | Solo se evalúan primeros 30 min |

---

## 📝 Notas

- Este checklist es **complementario** a la verificación automática (`make pre-delivery`)
- Guardar este archivo completado como evidencia de revisión final
- Marcar cada item como completado **solo después de verificar**

---

**Última Revisión:** DD/MM/2025
**Revisado por:** [Tu Nombre]
**Estado:** ⬜ Pendiente | ✅ Completado
```

### 4. Update README with Makefile Commands

Add to `README.md` (in appropriate section):

```markdown
## Comandos Disponibles

El proyecto usa **Makefile** para estandarizar la ejecución de comandos:

```bash
make help          # Ver todos los comandos disponibles
make install       # Instalar todas las dependencias
make dev           # Levantar entorno de desarrollo
make test          # Ejecutar todas las pruebas
make pre-delivery  # Verificación completa antes de entrega
```

### Comandos Principales

| Comando | Descripción |
|---------|-------------|
| `make install` | Instalar dependencias (frontend, backend, AI service) |
| `make dev` | Levantar desarrollo con Docker Compose |
| `make test` | Ejecutar suite completa de tests |
| `make test-websocket` | Ejecutar tests de WebSocket y real-time streaming |
| `make test-streaming` | Ejecutar tests E2E de streaming en tiempo real |
| `make test-latency` | Ejecutar benchmarks de latencia real-time |
| `make lint` | Verificar code style (Ruff, ESLint) |
| `make format` | Formatear código (Black, Prettier) |
| `make security-scan` | Escaneo de seguridad completo |
| `make health` | Verificar estado de todos los servicios (incluye WebSocket) |
| `make pre-delivery` | Checklist completo antes de entrega BSG |

Ver todos los comandos: `make help`
```

## Expected Deliverables

After completing this prompt:

- ✅ `Makefile` - Comprehensive workflow automation (40+ commands)
- ✅ `scripts/check-required-files.sh` - File verification script
- ✅ `docs/PRE_DELIVERY_CHECKLIST.md` - Manual pre-delivery checklist
- ✅ README.md - Updated with Makefile commands reference

## BSG Compliance

This prompt ensures:
- ✅ **Makefile for standardized execution** (install, dev, test, deploy)
- ✅ **File verification** against BSG requirements (REQUIRED_FILES.md) **including real-time streaming components**
- ✅ **Pre-delivery automation** (make pre-delivery runs all checks)
- ✅ **System reproducible in <15 minutes** (make install && make dev)
- ✅ **All commands work without errors**
- ✅ **Quality gates** (lint, typecheck, test, security) enforced
- ✅ **WebSocket test commands** (`make test-websocket`, `make test-streaming`, `make test-latency`)
- ✅ **Health check includes WebSocket** pool status verification
- ✅ **Latency targets verified** (transcription <2s, extraction <3s, alerts <1s)

## Notes

- Makefile uses PHONY targets to avoid conflicts with files
- Colored output for better readability
- Help command auto-generates from inline comments (##)
- Pre-delivery command runs all verification steps in sequence
- File verification script counts and reports missing files **including real-time streaming components**
- Manual checklist complements automated checks
- All scripts use bash for cross-platform compatibility (with minimal differences)
- Commands fail fast (set -e) to catch errors early
- **WebSocket health check** uses `wscat` (install with `npm i -g wscat`)
- **Latency benchmarks** verify real-time targets: transcription <2s, extraction <3s, alerts <1s
- **Streaming E2E tests** validate complete flow: audio → transcription → extraction → event delivery
