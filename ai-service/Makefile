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

.PHONY: help install install-dev dev test lint format check-files pre-delivery \
        ingest-vademecum ingest-vademecum-reset vademecum-counts

help:
	@echo "MedRecord AI Service - Comandos disponibles:"
	@echo ""
	@echo "  make install                Instalar dependencias de producción"
	@echo "  make install-dev            Instalar dependencias de desarrollo"
	@echo "  make dev                    Levantar entorno de desarrollo"
	@echo "  make test                   Ejecutar tests con cobertura"
	@echo "  make test-unit              Ejecutar solo tests unitarios"
	@echo "  make lint                   Verificar estilo de código"
	@echo "  make format                 Formatear código"
	@echo "  make evaluate               Ejecutar evaluación RAGAS"
	@echo "  make check-files            Verificar archivos obligatorios"
	@echo "  make pre-delivery           Verificación completa pre-entrega"
	@echo "  make ingest-vademecum       Cargar vademécum + interacciones + CIE-10 en ChromaDB"
	@echo "  make ingest-vademecum-reset Igual, pero borra la colección antes"
	@echo "  make vademecum-counts       Imprimir nº de documentos en la colección"

ingest-vademecum:
	docker exec medrecord-ai-service python -m scripts.ingest_vademecum

ingest-vademecum-reset:
	docker exec medrecord-ai-service python -m scripts.ingest_vademecum --reset

vademecum-counts:
	docker exec medrecord-ai-service python -m scripts.ingest_vademecum --counts

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

# Note: paths to docs/ and .github/ are project-root relative (../)
# because this Makefile lives under ai-service/.
check-files:
	@echo "▶ Verificando archivos obligatorios BSG..."
	@all_ok=true; \
	files=("README.md" ".env.example" "../.gitignore" "Makefile" \
		"requirements.txt" \
		"../.github/workflows/ci.yml" \
		"../docs/PROJECT_DOCUMENTATION.md" \
		"../docs/architecture/architecture_general.png" \
		"../docs/adr/ADR-001.md" "../docs/adr/ADR-002.md" \
		"../docs/api/openapi.yaml" \
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
