# =============================================================================
# Makefile — MedRecord AI (monorepo root)
# =============================================================================
# Standardized commands for development, testing, security, and pre-delivery.
# BSG requirement: estandarizar la ejecución de comandos.
#
# Component-specific targets also live in:
#   - ai-service/Makefile           (Python tooling)
#   - packages/backend/package.json (pnpm scripts)
#   - packages/frontend/package.json (pnpm scripts)
#
# Usage:
#   make help            Show all available targets
#   make install         Install all dependencies
#   make dev             Start full dev environment (Docker)
#   make test            Run all tests across services
#   make pre-delivery    Run BSG pre-delivery quality gates
# =============================================================================

.PHONY: help install install-dev dev dev-build stop restart logs logs-ai logs-backend logs-frontend \
        test test-unit test-integration test-load test-ragas test-websocket test-streaming \
        coverage lint format typecheck \
        security-scan security-install security-bandit security-pip-audit security-pnpm-audit security-gitleaks \
        build deploy-staging deploy-production terraform-init terraform-plan terraform-apply \
        health ingest-vademecum db-migrate db-seed db-reset \
        check-files pre-delivery clean clean-docker \
        ps stats version

.DEFAULT_GOAL := help

# Colors (use 'tput' if available; fall back to empty strings on minimal shells)
GREEN  := $(shell tput -Txterm setaf 2 2>/dev/null)
YELLOW := $(shell tput -Txterm setaf 3 2>/dev/null)
RED    := $(shell tput -Txterm setaf 1 2>/dev/null)
RESET  := $(shell tput -Txterm sgr0 2>/dev/null)

# Project paths
AI_SERVICE_DIR := ai-service
BACKEND_DIR    := packages/backend
FRONTEND_DIR   := packages/frontend
INFRA_DIR      := infrastructure/aws

# AI service Docker container name (per ai-service/docker-compose.yml)
AI_CONTAINER   := medrecord-ai-service

# =============================================================================
# HELP
# =============================================================================

help:  ## Show this help message
	@echo ''
	@echo '$(GREEN)MedRecord AI — Available Commands$(RESET)'
	@echo ''
	@echo 'Usage: $(YELLOW)make$(RESET) $(GREEN)<target>$(RESET)'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} { \
		if (/^[a-zA-Z_-]+:.*?##.*$$/) {printf "  $(YELLOW)%-22s$(RESET) %s\n", $$1, $$2} \
	}' $(MAKEFILE_LIST)
	@echo ''
	@echo 'Component-specific targets:'
	@echo '  AI service:  cd ai-service && make help'
	@echo '  Backend:     pnpm --filter backend <script>'
	@echo '  Frontend:    pnpm --filter frontend <script>'

# =============================================================================
# INSTALLATION
# =============================================================================

install:  ## Install all dependencies (frontend, backend, AI service)
	@echo "$(GREEN)Installing JS workspaces (frontend + backend) via pnpm...$(RESET)"
	pnpm install
	@echo "$(GREEN)Installing AI service Python deps...$(RESET)"
	cd $(AI_SERVICE_DIR) && pip install -r requirements.txt
	@echo "$(GREEN)All dependencies installed$(RESET)"

install-dev:  ## Install development dependencies (incl. Python dev)
	pnpm install
	cd $(AI_SERVICE_DIR) && pip install -r requirements-dev.txt

# =============================================================================
# DEVELOPMENT
# =============================================================================

dev:  ## Start full dev environment (AI service Docker stack)
	@echo "$(GREEN)Starting AI service stack (Docker)...$(RESET)"
	cd $(AI_SERVICE_DIR) && docker compose up -d
	@echo ""
	@echo "$(GREEN)AI stack is up. Start backend/frontend separately:$(RESET)"
	@echo "  pnpm --filter backend dev"
	@echo "  pnpm --filter frontend dev"
	@echo ""
	@echo "Endpoints:"
	@echo "  AI Service:   http://localhost:8000"
	@echo "  AI API Docs:  http://localhost:8000/docs"
	@echo "  Backend:      http://localhost:3000"
	@echo "  Frontend:     http://localhost:5173"

dev-build:  ## Rebuild and start AI service stack
	cd $(AI_SERVICE_DIR) && docker compose up -d --build

stop:  ## Stop AI service stack
	cd $(AI_SERVICE_DIR) && docker compose down

restart:  ## Restart AI service stack
	cd $(AI_SERVICE_DIR) && docker compose restart

logs:  ## Tail logs from AI service stack
	cd $(AI_SERVICE_DIR) && docker compose logs -f

logs-ai:  ## Tail AI service logs only
	cd $(AI_SERVICE_DIR) && docker compose logs -f ai-service

logs-backend:  ## Tail backend dev server (must be running)
	@echo "Backend runs outside Docker. Use the terminal where 'pnpm --filter backend dev' is running."

logs-frontend:  ## Tail frontend dev server (must be running)
	@echo "Frontend runs outside Docker. Use the terminal where 'pnpm --filter frontend dev' is running."

# =============================================================================
# TESTING
# =============================================================================

test:  ## Run all tests (unit + integration + RAGAS + load)
	@$(MAKE) test-unit
	@$(MAKE) test-integration
	@$(MAKE) test-ragas
	@echo "$(GREEN)Test suite completed (skip load with: make test-load)$(RESET)"

test-unit:  ## Run unit tests across services
	@echo "$(YELLOW)AI service unit tests (Docker)...$(RESET)"
	docker exec $(AI_CONTAINER) pytest tests/unit/ -v --cov=src --cov-report=term --cov-report=xml:reports/coverage.xml
	@echo "$(YELLOW)Backend unit tests...$(RESET)"
	pnpm --filter backend test
	@echo "$(YELLOW)Frontend unit tests...$(RESET)"
	pnpm --filter frontend test

test-integration:  ## Run integration tests
	docker exec $(AI_CONTAINER) pytest tests/integration/ -v

test-load:  ## Run load tests (Locust + WebSocket scripts)
	@echo "$(YELLOW)Locust HTTP load test (50 users / 2 min)...$(RESET)"
	cd $(AI_SERVICE_DIR) && locust -f tests/load/locustfile.py --headless --users 50 --spawn-rate 5 --run-time 2m --host http://localhost:8000 --html reports/load_test_report.html
	@echo "$(GREEN)Report: ai-service/reports/load_test_report.html$(RESET)"

test-ragas:  ## Run RAGAS evaluation suite
	docker exec $(AI_CONTAINER) pytest tests/ragas/ -v --tb=short
	@echo "$(GREEN)RAGAS report: ai-service/reports/ (when configured)$(RESET)"

test-websocket:  ## Run WebSocket / real-time tests across services
	docker exec $(AI_CONTAINER) pytest tests/integration/test_websocket_realtime.py tests/integration/test_websocket_streaming.py tests/unit/test_websocket.py tests/unit/test_websocket_streaming.py -v
	pnpm --filter backend test -- websocket

test-streaming:  ## Run real-time streaming integration tests (AI service)
	docker exec $(AI_CONTAINER) pytest tests/integration/test_websocket_streaming.py tests/integration/test_rag_real_time.py -v --tb=short

coverage:  ## Generate AI service coverage HTML report
	docker exec $(AI_CONTAINER) pytest tests/unit/ --cov=src --cov-report=html:reports/coverage_html --cov-report=term
	@echo "$(GREEN)Open: ai-service/reports/coverage_html/index.html$(RESET)"

# =============================================================================
# CODE QUALITY
# =============================================================================

lint:  ## Run linters (Ruff for Python, ESLint for TS)
	cd $(AI_SERVICE_DIR) && ruff check src/ tests/
	pnpm --filter backend lint
	pnpm --filter frontend lint

format:  ## Format code (Ruff format for Python, Prettier for TS)
	cd $(AI_SERVICE_DIR) && ruff format src/ tests/
	pnpm exec prettier --write "packages/**/src/**/*.{ts,tsx,js,jsx,json,md}"

typecheck:  ## Type checking (MyPy + tsc)
	cd $(AI_SERVICE_DIR) && mypy src/ --ignore-missing-imports
	pnpm --filter backend type-check
	pnpm --filter frontend type-check

# =============================================================================
# SECURITY
# =============================================================================

security-scan:  ## Full security scan (bandit + pip-audit + pnpm audit + gitleaks)
	@bash scripts/security-scan.sh

security-install:  ## Install Python security tooling (bandit, pip-audit)
	pip install --upgrade bandit pip-audit
	@echo ""
	@echo "$(YELLOW)Manual installs (platform-specific):$(RESET)"
	@echo "  gitleaks: https://github.com/gitleaks/gitleaks"
	@echo "  trivy:    https://aquasecurity.github.io/trivy/"

security-bandit:  ## Run Bandit (Python SAST) only
	bandit -r $(AI_SERVICE_DIR)/src --severity-level medium --confidence-level medium --exclude $(AI_SERVICE_DIR)/tests

security-pip-audit:  ## Run pip-audit only
	cd $(AI_SERVICE_DIR) && pip-audit -r requirements.txt

security-pnpm-audit:  ## Run pnpm audit only
	pnpm audit --audit-level=moderate

security-gitleaks:  ## Run gitleaks only
	gitleaks detect --source . --no-banner --redact --verbose

# =============================================================================
# BUILD & DEPLOYMENT
# =============================================================================

build:  ## Build production Docker image for AI service
	docker build -t medrecord-ai-service:latest -f $(AI_SERVICE_DIR)/Dockerfile $(AI_SERVICE_DIR)

deploy-staging:  ## Deploy to staging (placeholder — wire to your script)
	@echo "$(YELLOW)Staging deploy not configured. See infrastructure/aws/DEPLOYMENT.md$(RESET)"

deploy-production:  ## Deploy to production (placeholder — wire to your script)
	@echo "$(YELLOW)Production deploy not configured. See infrastructure/aws/DEPLOYMENT.md$(RESET)"

terraform-init:  ## terraform init
	cd $(INFRA_DIR)/terraform && terraform init

terraform-plan:  ## terraform plan
	cd $(INFRA_DIR)/terraform && terraform plan

terraform-apply:  ## terraform apply
	cd $(INFRA_DIR)/terraform && terraform apply

# =============================================================================
# HEALTH & MONITORING
# =============================================================================

health:  ## Check health of all local services
	@echo "$(GREEN)Health check$(RESET)"
	@echo "$(YELLOW)AI Service:$(RESET)"
	@curl -fsS http://localhost:8000/health > /dev/null 2>&1 && echo "  $(GREEN)OK$(RESET)" || echo "  $(RED)DOWN$(RESET)"
	@echo "$(YELLOW)Backend:$(RESET)"
	@curl -fsS http://localhost:3000/api/health > /dev/null 2>&1 && echo "  $(GREEN)OK$(RESET)" || echo "  $(RED)DOWN$(RESET)"
	@echo "$(YELLOW)Frontend:$(RESET)"
	@curl -fsS http://localhost:5173 > /dev/null 2>&1 && echo "  $(GREEN)OK$(RESET)" || echo "  $(RED)DOWN$(RESET)"
	@echo "$(YELLOW)PostgreSQL:$(RESET)"
	@docker exec medrecord-postgres pg_isready > /dev/null 2>&1 && echo "  $(GREEN)OK$(RESET)" || echo "  $(RED)DOWN$(RESET)"
	@echo "$(YELLOW)Redis:$(RESET)"
	@docker exec medrecord-redis redis-cli ping > /dev/null 2>&1 && echo "  $(GREEN)OK$(RESET)" || echo "  $(RED)DOWN$(RESET)"
	@echo "$(YELLOW)ChromaDB:$(RESET)"
	@curl -fsS http://localhost:8001/api/v1/heartbeat > /dev/null 2>&1 && echo "  $(GREEN)OK$(RESET)" || echo "  $(RED)DOWN$(RESET)"

# =============================================================================
# DATA MANAGEMENT
# =============================================================================

ingest-vademecum:  ## Ingest medical knowledge base (vademecum) into ChromaDB
	docker exec $(AI_CONTAINER) python -m scripts.ingest_vademecum

db-migrate:  ## Run Prisma migrations (backend)
	pnpm --filter backend db:migrate:deploy

db-seed:  ## Seed database with sample data
	pnpm --filter backend db:seed

db-reset:  ## Reset database (DESTRUCTIVE — drops and re-runs migrations)
	@echo "$(RED)This will delete all data.$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r REPLY; echo; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		pnpm --filter backend db:reset; \
	fi

# =============================================================================
# PRE-DELIVERY (BSG)
# =============================================================================

check-files:  ## Verify required BSG files exist
	@bash scripts/check-required-files.sh

pre-delivery:  ## Run all pre-delivery quality gates
	@echo "$(GREEN)Pre-delivery checks$(RESET)"
	@echo "$(YELLOW)[1/5] Required files...$(RESET)"
	@$(MAKE) check-files
	@echo "$(YELLOW)[2/5] Linters...$(RESET)"
	@$(MAKE) lint
	@echo "$(YELLOW)[3/5] Type checking...$(RESET)"
	@$(MAKE) typecheck
	@echo "$(YELLOW)[4/5] Tests...$(RESET)"
	@$(MAKE) test
	@echo "$(YELLOW)[5/5] Security scan...$(RESET)"
	@$(MAKE) security-scan
	@echo ""
	@echo "$(GREEN)All pre-delivery checks passed.$(RESET)"

# =============================================================================
# CLEANUP & UTILITIES
# =============================================================================

clean:  ## Remove caches and generated artifacts
	@find . -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf $(AI_SERVICE_DIR)/reports/coverage_html $(AI_SERVICE_DIR)/reports/load_test_report.html 2>/dev/null || true

clean-docker:  ## DESTRUCTIVE — remove containers/volumes/images for the stack
	@echo "$(RED)This will delete all Docker volumes and images.$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r REPLY; echo; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		cd $(AI_SERVICE_DIR) && docker compose down -v; \
		docker system prune -af; \
	fi

ps:  ## Show running containers
	cd $(AI_SERVICE_DIR) && docker compose ps

stats:  ## Show container resource usage
	docker stats --no-stream

version:  ## Show project versions
	@echo "MedRecord AI"
	@echo "  Node:    $$(node --version 2>/dev/null || echo 'not installed')"
	@echo "  pnpm:    $$(pnpm --version 2>/dev/null || echo 'not installed')"
	@echo "  Python:  $$(python --version 2>&1 | cut -d' ' -f2)"
	@echo "  Docker:  $$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')"
