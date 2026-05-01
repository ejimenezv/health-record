#!/usr/bin/env bash
# =============================================================================
# File Verification Script - MedRecord AI
# =============================================================================
# Verifies that all BSG-required files exist before final delivery.
# Aligned with the actual project layout (pnpm workspaces, ai-service/).
# =============================================================================

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Resolve project root (this script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo -e "${YELLOW}Verificando archivos mínimos obligatorios (BSG)...${NC}"
echo "Project root: ${ROOT_DIR}"
echo ""

MISSING=0
TOTAL=0

check() {
    local file="$1"
    local desc="$2"
    TOTAL=$((TOTAL + 1))
    if [ -e "$file" ]; then
        echo -e "  ${GREEN}OK${NC}   $file"
    else
        echo -e "  ${RED}MISS${NC} $file  — $desc"
        MISSING=$((MISSING + 1))
    fi
}

echo -e "${YELLOW}Root:${NC}"
check "README.md"        "Readme principal"
check ".env.example"     "Plantilla de variables de entorno"
check ".gitignore"       "Exclusiones de Git"
check "Makefile"         "Comandos estandarizados"
check "pnpm-workspace.yaml" "Definición del monorepo pnpm"
echo ""

echo -e "${YELLOW}CI/CD (.github/workflows):${NC}"
check ".github/workflows/ci.yml"               "Pipeline CI"
check ".github/workflows/ci-cd.yml"            "Pipeline CI/CD"
check ".github/workflows/security.yml"         "Pipeline de seguridad"
check ".github/workflows/ragas-evaluation.yml" "Pipeline de evaluación RAGAS"
echo ""

echo -e "${YELLOW}Documentación:${NC}"
check "docs/architecture/diagrams/c4-context.md"   "C4 Contexto (Mermaid)"
check "docs/architecture/diagrams/c4-container.md" "C4 Contenedor (Mermaid)"
check "docs/architecture/diagrams/README.md"       "Índice de diagramas"
check "docs/adr/ADR-001-seleccion-modelo-llm.md"   "ADR-001"
check "docs/adr/ADR-002-vector-store-selection.md" "ADR-002"
check "docs/adr/README.md"                         "Índice de ADRs"
check "docs/api/openapi.yaml"                      "Especificación OpenAPI"
check "docs/security/threat-model.md"              "Modelo de amenazas (STRIDE)"
check "docs/PRE_DELIVERY_CHECKLIST.md"             "Checklist de entrega"
echo ""

echo -e "${YELLOW}AI Service (ai-service/):${NC}"
check "ai-service/Dockerfile"                "Dockerfile AI service"
check "ai-service/docker-compose.yml"        "docker-compose AI service"
check "ai-service/requirements.txt"          "Python deps producción"
check "ai-service/requirements-dev.txt"      "Python deps desarrollo"
check "ai-service/Makefile"                  "Makefile del servicio AI"
check "ai-service/pyproject.toml"            "pyproject.toml"
check "ai-service/.env.example"              "Plantilla env AI"
check "ai-service/src/__init__.py"           "Paquete src"
check "ai-service/src/api/main.py"           "Entrada FastAPI"
check "ai-service/src/services/model_selector.py" "LLM client / model selector"
check "ai-service/src/rag/retriever.py"      "RAG retriever"
check "ai-service/src/security/auth.py"      "Auth (JWT)"
check "ai-service/src/transcription"         "Módulo transcripción/streaming"
echo ""

echo -e "${YELLOW}Backend (packages/backend):${NC}"
check "packages/backend/package.json"        "Dependencias backend"
check "packages/backend/tsconfig.json"       "tsconfig backend"
check "packages/backend/src/index.ts"        "Entrada backend"
check "packages/backend/src/app.ts"          "Aplicación Express"
check "packages/backend/src/websocket"       "Gateway WebSocket"
check "packages/backend/prisma/schema.prisma" "Esquema Prisma"
echo ""

echo -e "${YELLOW}Frontend (packages/frontend):${NC}"
check "packages/frontend/package.json"                       "Dependencias frontend"
check "packages/frontend/tsconfig.json"                      "tsconfig frontend"
check "packages/frontend/src/main.tsx"                       "Entrada frontend"
check "packages/frontend/src/App.tsx"                        "App raíz"
check "packages/frontend/src/hooks/useRealtimeSession.ts"    "Hook sesión real-time"
echo ""

echo -e "${YELLOW}Tests:${NC}"
check "ai-service/tests/conftest.py"         "Fixtures pytest"
check "ai-service/tests/unit"                "Tests unitarios AI"
check "ai-service/tests/integration"         "Tests integración AI"
check "ai-service/tests/load"                "Tests de carga"
check "ai-service/tests/load/locustfile.py"  "Locust load test"
check "ai-service/tests/ragas"               "Evaluación RAGAS"
check "packages/backend/tests"               "Tests backend"
check "packages/frontend/tests"              "Tests frontend"
echo ""

echo -e "${YELLOW}Infraestructura:${NC}"
check "infrastructure/aws/terraform/main.tf"      "Terraform main"
check "infrastructure/aws/terraform/variables.tf" "Terraform variables"
check "infrastructure/aws/terraform/outputs.tf"   "Terraform outputs"
check "infrastructure/aws/README.md"              "Guía despliegue AWS"
check "infrastructure/aws/DEPLOYMENT.md"          "Procedimiento de deployment"
echo ""

echo -e "${YELLOW}Seguridad:${NC}"
check "scripts/security-scan.sh"             "Script de escaneo de seguridad"
echo ""

echo "----------------------------------------------------------------"
echo -e "Total verificados: ${TOTAL}"
echo -e "Faltantes:         ${MISSING}"
echo "----------------------------------------------------------------"
echo ""

if [ "$MISSING" -eq 0 ]; then
    echo -e "${GREEN}Todos los archivos mínimos están presentes.${NC}"
    exit 0
else
    echo -e "${RED}Faltan ${MISSING} archivos obligatorios.${NC}"
    exit 1
fi
