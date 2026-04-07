# ==============================================================
# Makefile — Proyecto Final AI/LLM Solution Architect
# ==============================================================
# Uso:
#   make help          → Lista todos los comandos disponibles
#   make install       → Configura el entorno por primera vez
#   make dev           → Levanta el entorno de desarrollo
#   make test          → Ejecuta la suite completa de pruebas
# ==============================================================

# Variables configurables
PYTHON      := python3
PIP         := pip3
PROJECT_DIR := src
TEST_DIR    := tests
REPORTS_DIR := reports
COV_MINIMUM := 60
IMAGE_NAME  := ai-llm-project
IMAGE_TAG   := $(shell git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Colores para output legible
RESET  := \033[0m
BOLD   := \033[1m
GREEN  := \033[32m
YELLOW := \033[33m
CYAN   := \033[36m
RED    := \033[31m

.PHONY: help install install-dev env-check dev dev-logs stop \
        test test-unit test-integration test-load test-security \
        lint format type-check quality \
        build run shell \
        ingest evaluate \
        clean clean-docker clean-all \
        check-files tag-release docs-serve

# ──────────────────────────────────────────────────────────────
# DEFAULT: help
# ──────────────────────────────────────────────────────────────

help: ## Muestra todos los comandos disponibles
	@echo ""
	@echo "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(BOLD)  Proyecto Final AI/LLM — Comandos Disponibles$(RESET)"
	@echo "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; \
		       /^[#]/ {print "\n$(BOLD)" $$0 "$(RESET)"} \
		       !/^[#]/ {printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""


# ──────────────────────────────────────────────────────────────
# SETUP E INSTALACIÓN
# ──────────────────────────────────────────────────────────────

install: ## [SETUP] Instala dependencias y prepara el entorno por primera vez
	@echo "$(YELLOW)▶ Instalando dependencias de producción...$(RESET)"
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "$(YELLOW)▶ Copiando plantilla de variables de entorno...$(RESET)"
	@cp -n .env.example .env 2>/dev/null && \
		echo "$(GREEN)✓ .env creado desde .env.example — edítalo con tus credenciales$(RESET)" || \
		echo "$(CYAN)ℹ .env ya existe — no se sobrescribió$(RESET)"
	@echo "$(YELLOW)▶ Creando carpetas necesarias...$(RESET)"
	@mkdir -p $(REPORTS_DIR) data/documents data/chromadb
	@echo "$(GREEN)✓ Instalación completada$(RESET)"

install-dev: install ## [SETUP] Instala también dependencias de desarrollo y testing
	@echo "$(YELLOW)▶ Instalando dependencias de desarrollo...$(RESET)"
	$(PIP) install -r requirements-dev.txt
	@echo "$(GREEN)✓ Entorno de desarrollo listo$(RESET)"

env-check: ## [SETUP] Verifica que las variables de entorno críticas estén configuradas
	@echo "$(YELLOW)▶ Verificando variables de entorno...$(RESET)"
	@python3 -c " \
import os, sys; \
required = ['OPENAI_API_KEY', 'ENVIRONMENT', 'JWT_SECRET_KEY', 'VECTOR_DB_PROVIDER']; \
missing = [v for v in required if not os.getenv(v)]; \
[print(f'  ❌ Falta: {v}') for v in missing]; \
[print(f'  ✅ OK: {v}') for v in required if os.getenv(v)]; \
sys.exit(1) if missing else print('\n✓ Todas las variables críticas están configuradas') \
	"


# ──────────────────────────────────────────────────────────────
# DESARROLLO LOCAL
# ──────────────────────────────────────────────────────────────

dev: ## [DEV] Levanta el entorno completo de desarrollo con Docker Compose
	@echo "$(YELLOW)▶ Iniciando entorno de desarrollo...$(RESET)"
	docker-compose up --build

dev-detached: ## [DEV] Levanta el entorno en segundo plano
	docker-compose up --build -d
	@echo "$(GREEN)✓ Entorno iniciado en segundo plano$(RESET)"
	@echo "  API:      http://localhost:8000"
	@echo "  Docs:     http://localhost:8000/docs"
	@echo "  ChromaDB: http://localhost:8001"

dev-logs: ## [DEV] Muestra los logs del entorno en ejecución
	docker-compose logs -f api

stop: ## [DEV] Detiene el entorno de desarrollo
	docker-compose down
	@echo "$(GREEN)✓ Entorno detenido$(RESET)"

shell: ## [DEV] Abre una shell interactiva dentro del contenedor de la API
	docker-compose exec api /bin/bash


# ──────────────────────────────────────────────────────────────
# PRUEBAS
# ──────────────────────────────────────────────────────────────

test: ## [TEST] Ejecuta la suite completa de pruebas con reporte de cobertura
	@echo "$(YELLOW)▶ Ejecutando suite completa de pruebas...$(RESET)"
	@mkdir -p $(REPORTS_DIR)
	pytest $(TEST_DIR)/ \
		--verbose \
		--tb=short \
		--cov=$(PROJECT_DIR) \
		--cov-report=term-missing \
		--cov-report=xml:$(REPORTS_DIR)/coverage.xml \
		--cov-report=html:$(REPORTS_DIR)/coverage_html \
		--cov-fail-under=$(COV_MINIMUM) \
		-W ignore::DeprecationWarning
	@echo "$(GREEN)✓ Pruebas completadas$(RESET)"
	@echo "  Reporte HTML: $(REPORTS_DIR)/coverage_html/index.html"

test-unit: ## [TEST] Ejecuta solo las pruebas unitarias (rápido)
	@echo "$(YELLOW)▶ Ejecutando pruebas unitarias...$(RESET)"
	pytest $(TEST_DIR)/unit/ \
		--verbose \
		--tb=short \
		--cov=$(PROJECT_DIR) \
		--cov-report=term-missing \
		-W ignore::DeprecationWarning
	@echo "$(GREEN)✓ Pruebas unitarias completadas$(RESET)"

test-integration: ## [TEST] Ejecuta solo las pruebas de integración
	@echo "$(YELLOW)▶ Ejecutando pruebas de integración...$(RESET)"
	@echo "$(CYAN)  Nota: Requiere que el entorno Docker esté corriendo (make dev-detached)$(RESET)"
	pytest $(TEST_DIR)/integration/ \
		--verbose \
		--tb=long \
		-W ignore::DeprecationWarning
	@echo "$(GREEN)✓ Pruebas de integración completadas$(RESET)"

test-load: ## [TEST] Ejecuta la prueba de carga con k6 (requiere k6 instalado)
	@echo "$(YELLOW)▶ Ejecutando prueba de carga...$(RESET)"
	@echo "$(CYAN)  Target: http://localhost:8000$(RESET)"
	@which k6 > /dev/null 2>&1 || (echo "$(RED)❌ k6 no está instalado. Ver: https://k6.io/docs/getting-started/installation/$(RESET)" && exit 1)
	@mkdir -p $(REPORTS_DIR)
	k6 run \
		--out json=$(REPORTS_DIR)/load_test_results.json \
		$(TEST_DIR)/load/load_test.js
	@echo "$(GREEN)✓ Prueba de carga completada — ver $(REPORTS_DIR)/load_test_results.json$(RESET)"

test-security: ## [TEST] Escaneo de seguridad (bandit + pip-audit)
	@echo "$(YELLOW)▶ Ejecutando análisis de seguridad estático (bandit)...$(RESET)"
	@mkdir -p $(REPORTS_DIR)
	bandit -r $(PROJECT_DIR)/ \
		--severity-level medium \
		--confidence-level medium \
		--format json \
		--output $(REPORTS_DIR)/bandit_report.json \
		--exclude tests/ || true
	bandit -r $(PROJECT_DIR)/ \
		--severity-level medium \
		--confidence-level medium \
		--exclude tests/
	@echo ""
	@echo "$(YELLOW)▶ Verificando vulnerabilidades en dependencias (pip-audit)...$(RESET)"
	pip-audit -r requirements.txt \
		--format json \
		--output $(REPORTS_DIR)/pip_audit_report.json || true
	pip-audit -r requirements.txt
	@echo "$(GREEN)✓ Análisis de seguridad completado$(RESET)"


# ──────────────────────────────────────────────────────────────
# CALIDAD DE CÓDIGO
# ──────────────────────────────────────────────────────────────

lint: ## [QUALITY] Verifica estilo y convenciones de código (ruff)
	@echo "$(YELLOW)▶ Verificando estilo de código...$(RESET)"
	ruff check $(PROJECT_DIR)/ $(TEST_DIR)/
	@echo "$(GREEN)✓ Sin errores de estilo$(RESET)"

format: ## [QUALITY] Formatea el código automáticamente (ruff format)
	@echo "$(YELLOW)▶ Formateando código...$(RESET)"
	ruff format $(PROJECT_DIR)/ $(TEST_DIR)/
	@echo "$(GREEN)✓ Código formateado$(RESET)"

type-check: ## [QUALITY] Verificación de tipos estática (mypy)
	@echo "$(YELLOW)▶ Verificando tipos...$(RESET)"
	mypy $(PROJECT_DIR)/ \
		--ignore-missing-imports \
		--show-error-codes \
		--pretty
	@echo "$(GREEN)✓ Sin errores de tipos$(RESET)"

quality: lint type-check test-security ## [QUALITY] Ejecuta todas las verificaciones de calidad (lint + tipos + seguridad)
	@echo "$(GREEN)$(BOLD)✓ Todas las verificaciones de calidad pasaron$(RESET)"


# ──────────────────────────────────────────────────────────────
# DOCKER Y DESPLIEGUE
# ──────────────────────────────────────────────────────────────

build: ## [DEPLOY] Construye la imagen Docker de producción
	@echo "$(YELLOW)▶ Construyendo imagen Docker...$(RESET)"
	docker build \
		--target runtime \
		--tag $(IMAGE_NAME):$(IMAGE_TAG) \
		--tag $(IMAGE_NAME):latest \
		--build-arg BUILD_DATE=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ") \
		--build-arg VCS_REF=$(IMAGE_TAG) \
		.
	@echo "$(GREEN)✓ Imagen construida: $(IMAGE_NAME):$(IMAGE_TAG)$(RESET)"

run: ## [DEPLOY] Ejecuta el contenedor de producción localmente
	@echo "$(YELLOW)▶ Iniciando contenedor de producción...$(RESET)"
	docker run \
		--rm \
		--name $(IMAGE_NAME)-prod \
		--env-file .env \
		-p 8000:8000 \
		$(IMAGE_NAME):$(IMAGE_TAG)

smoke-test: ## [DEPLOY] Verifica que la API responde correctamente (smoke test)
	@echo "$(YELLOW)▶ Ejecutando smoke test...$(RESET)"
	@sleep 3
	@curl -sf http://localhost:8000/api/v1/health | \
		python3 -m json.tool || \
		(echo "$(RED)❌ La API no responde. Verifica que esté corriendo.$(RESET)" && exit 1)
	@echo "$(GREEN)✓ Smoke test pasó — API operativa$(RESET)"


# ──────────────────────────────────────────────────────────────
# PIPELINE RAG Y EVALUACIÓN LLM
# ──────────────────────────────────────────────────────────────

ingest: ## [RAG] Ejecuta el pipeline de ingesta de documentos
	@echo "$(YELLOW)▶ Iniciando ingesta de documentos...$(RESET)"
	@echo "$(CYAN)  Fuente: $(SOURCE)$(RESET)"
	@[ -n "$(SOURCE)" ] || (echo "$(RED)❌ Especifica la fuente: make ingest SOURCE=./data/documents$(RESET)" && exit 1)
	$(PYTHON) -m src.rag.ingestion \
		--source $(SOURCE) \
		--chunk-size 1000 \
		--chunk-overlap 200 \
		--batch-size 50
	@echo "$(GREEN)✓ Ingesta completada$(RESET)"

evaluate: ## [EVAL] Ejecuta evaluación LLM con RAGAS y genera reporte
	@echo "$(YELLOW)▶ Ejecutando evaluación de calidad LLM con RAGAS...$(RESET)"
	@mkdir -p $(REPORTS_DIR)
	$(PYTHON) -m pytest notebooks/evaluation.ipynb \
		--nbval-lax \
		--tb=short 2>/dev/null || \
	jupyter nbconvert \
		--to notebook \
		--execute notebooks/evaluation.ipynb \
		--output notebooks/evaluation_output.ipynb
	@echo "$(GREEN)✓ Evaluación completada$(RESET)"
	@echo "  Reporte: $(REPORTS_DIR)/ragas_report.json"


# ──────────────────────────────────────────────────────────────
# VERIFICACIÓN PREVIA A LA ENTREGA
# ──────────────────────────────────────────────────────────────

check-files: ## [ENTREGA] Verifica que todos los archivos mínimos obligatorios existen
	@echo "$(YELLOW)▶ Verificando archivos mínimos obligatorios...$(RESET)"
	@echo ""
	@all_ok=true; \
	files=( \
		"README.md" ".env.example" ".gitignore" "Makefile" \
		"Dockerfile" "docker-compose.yml" "requirements.txt" \
		".github/workflows/ci.yml" \
		"docs/PROJECT_DOCUMENTATION.md" \
		"docs/architecture/architecture_general.png" \
		"docs/adr/ADR-001.md" "docs/adr/ADR-002.md" \
		"docs/api/openapi.yaml" \
		"src/api/main.py" "src/core/llm_client.py" \
		"src/rag/retriever.py" "src/security/auth.py" \
		"tests/unit" "tests/integration" "tests/load" \
		"notebooks/evaluation.ipynb" \
		"reports" \
	); \
	for f in "$${files[@]}"; do \
		if [ -e "$$f" ]; then \
			echo "  $(GREEN)✅ $$f$(RESET)"; \
		else \
			echo "  $(RED)❌ FALTA: $$f$(RESET)"; \
			all_ok=false; \
		fi; \
	done; \
	echo ""; \
	if [ "$$all_ok" = true ]; then \
		echo "$(GREEN)$(BOLD)✓ Todos los archivos mínimos están presentes. ¡Listo para entrega!$(RESET)"; \
	else \
		echo "$(RED)$(BOLD)❌ Faltan archivos obligatorios. Completa antes de entregar.$(RESET)"; \
		exit 1; \
	fi

pre-delivery: quality test check-files ## [ENTREGA] Ejecuta TODAS las verificaciones previas a la entrega final
	@echo ""
	@echo "$(GREEN)$(BOLD)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)$(BOLD)  ✓ Proyecto listo para entrega final$(RESET)"
	@echo "$(GREEN)$(BOLD)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo "  Próximos pasos:"
	@echo "  1. Crea el tag de versión:  make tag-release VERSION=1.0.0"
	@echo "  2. Push al repositorio:     git push origin main --tags"
	@echo "  3. Verifica CI/CD:          gh run list (o revisa GitHub Actions)"
	@echo ""

tag-release: ## [ENTREGA] Crea un tag de versión Git (uso: make tag-release VERSION=1.0.0)
	@[ -n "$(VERSION)" ] || (echo "$(RED)❌ Especifica la versión: make tag-release VERSION=1.0.0$(RESET)" && exit 1)
	@echo "$(YELLOW)▶ Creando tag v$(VERSION)...$(RESET)"
	git tag -a v$(VERSION) -m "Release v$(VERSION) — Proyecto Final AI/LLM"
	@echo "$(GREEN)✓ Tag v$(VERSION) creado$(RESET)"
	@echo "  Para publicar: git push origin v$(VERSION)"


# ──────────────────────────────────────────────────────────────
# LIMPIEZA
# ──────────────────────────────────────────────────────────────

clean: ## [CLEAN] Elimina archivos temporales y caché de Python
	@echo "$(YELLOW)▶ Limpiando archivos temporales...$(RESET)"
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	rm -rf .coverage .coverage.* htmlcov/ .pytest_cache/ .mypy_cache/ .ruff_cache/
	@echo "$(GREEN)✓ Limpieza completada$(RESET)"

clean-docker: ## [CLEAN] Detiene y elimina contenedores, redes y volúmenes de Docker Compose
	@echo "$(YELLOW)▶ Eliminando entorno Docker...$(RESET)"
	docker-compose down --volumes --remove-orphans
	docker image rm $(IMAGE_NAME):latest $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
	@echo "$(GREEN)✓ Entorno Docker eliminado$(RESET)"

clean-all: clean clean-docker ## [CLEAN] Limpieza completa (Python + Docker)
	@echo "$(GREEN)✓ Limpieza completa realizada$(RESET)"
