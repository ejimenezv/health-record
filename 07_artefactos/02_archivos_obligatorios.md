# 📁 Archivos Mínimos Obligatorios — Proyecto Final AI/LLM

**Programa:** AI-LLM Solution Architect  
**Curso:** 5 — Proyecto Final de Arquitectura e Integración AI/LLM  
**Versión:** v1.0

> Este documento define la estructura mínima que debe tener el repositorio Git del proyecto. El instructor verificará la presencia de todos los archivos marcados como **obligatorios** antes de proceder a la evaluación de contenido. Un repositorio incompleto en estructura recibirá una deducción del **15% de la nota final**.

---

## Estructura Completa del Repositorio

```
repo-ai-llm-[nombre-proyecto]/
│
├── 📄 README.md                          ← OBLIGATORIO
├── 📄 REQUIRED_FILES.md                  ← OBLIGATORIO (este archivo, auto-verificación)
├── 📄 .env.example                       ← OBLIGATORIO
├── 📄 .gitignore                         ← OBLIGATORIO
├── 📄 Makefile                           ← OBLIGATORIO
├── 📄 docker-compose.yml                 ← OBLIGATORIO
├── 📄 requirements.txt                   ← OBLIGATORIO (o pyproject.toml)
├── 📄 pyproject.toml                     ← Alternativa a requirements.txt
├── 📄 Dockerfile                         ← OBLIGATORIO
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 ci.yml                     ← OBLIGATORIO
│
├── 📁 docs/
│   ├── 📄 PROJECT_DOCUMENTATION.md       ← OBLIGATORIO (plantilla oficial completada)
│   │
│   ├── 📁 architecture/
│   │   ├── 🖼️ architecture_general.png   ← OBLIGATORIO (diagrama C4 nivel contexto)
│   │   ├── 🖼️ data_flow.png             ← OBLIGATORIO (diagrama de flujo de datos)
│   │   └── 📄 architecture_general.drawio ← Recomendado (archivo fuente editable)
│   │
│   ├── 📁 adr/
│   │   ├── 📄 ADR-001.md                 ← OBLIGATORIO (mínimo 2 ADRs)
│   │   ├── 📄 ADR-002.md                 ← OBLIGATORIO
│   │   └── 📄 ADR-003.md                 ← Recomendado
│   │
│   └── 📁 api/
│       └── 📄 openapi.yaml               ← OBLIGATORIO
│
├── 📁 src/
│   ├── 📄 __init__.py
│   │
│   ├── 📁 api/                           ← OBLIGATORIO
│   │   ├── 📄 __init__.py
│   │   ├── 📄 main.py                    ← Entry point de FastAPI / Flask
│   │   ├── 📄 routes.py                  ← Definición de endpoints
│   │   └── 📄 schemas.py                 ← Pydantic models / request-response schemas
│   │
│   ├── 📁 core/                          ← OBLIGATORIO
│   │   ├── 📄 __init__.py
│   │   ├── 📄 llm_client.py              ← Wrapper del proveedor LLM
│   │   ├── 📄 orchestrator.py            ← Lógica de orquestación (LangChain / LlamaIndex)
│   │   └── 📄 config.py                  ← Configuración centralizada desde variables de entorno
│   │
│   ├── 📁 rag/                           ← OBLIGATORIO
│   │   ├── 📄 __init__.py
│   │   ├── 📄 ingestion.py               ← Pipeline de carga y chunking de documentos
│   │   ├── 📄 embeddings.py              ← Generación de embeddings
│   │   ├── 📄 retriever.py               ← Búsqueda semántica en vector store
│   │   └── 📄 vector_store.py            ← Cliente del vector store
│   │
│   ├── 📁 security/                      ← OBLIGATORIO
│   │   ├── 📄 __init__.py
│   │   ├── 📄 auth.py                    ← Autenticación (JWT / API Key)
│   │   └── 📄 guardrails.py              ← Validación de inputs / outputs
│   │
│   └── 📁 utils/                         ← Recomendado
│       ├── 📄 __init__.py
│       ├── 📄 logger.py                  ← Logger estructurado (JSON)
│       └── 📄 helpers.py                 ← Utilidades generales
│
├── 📁 tests/                             ← OBLIGATORIO
│   ├── 📄 conftest.py                    ← Fixtures compartidos de pytest
│   ├── 📄 __init__.py
│   │
│   ├── 📁 unit/                          ← OBLIGATORIO (cobertura ≥ 60%)
│   │   ├── 📄 test_llm_client.py
│   │   ├── 📄 test_retriever.py
│   │   ├── 📄 test_ingestion.py
│   │   └── 📄 test_guardrails.py
│   │
│   ├── 📁 integration/                   ← OBLIGATORIO (mínimo 1 prueba E2E)
│   │   └── 📄 test_rag_pipeline.py
│   │
│   └── 📁 load/                          ← OBLIGATORIO (mínimo 1 prueba de carga)
│       └── 📄 load_test.js               ← Script k6 (o locustfile.py si usa Locust)
│
├── 📁 infrastructure/                    ← Recomendado
│   ├── 📄 main.tf                        ← Terraform (o equivalente CDK / Bicep)
│   ├── 📄 variables.tf
│   └── 📄 outputs.tf
│
├── 📁 notebooks/                         ← OBLIGATORIO
│   └── 📄 evaluation.ipynb               ← Evaluación LLM con RAGAS u otro framework
│
└── 📁 reports/                           ← OBLIGATORIO (completar antes de entrega)
    ├── 📄 test_coverage.xml              ← Reporte de cobertura de pytest-cov
    ├── 📄 ragas_report.json              ← Resultados de evaluación LLM
    └── 📄 load_test_results.html         ← Reporte de prueba de carga
```

---

## Detalle por Archivo

### Archivos Raíz

#### `README.md` — OBLIGATORIO

El README es la **primera impresión** del proyecto. Debe permitir a cualquier persona clonar y ejecutar el sistema en menos de 15 minutos.

**Estructura mínima requerida:**

```markdown
# [Nombre del Proyecto]

> [Descripción en 2–3 oraciones: qué hace, para quién, con qué tecnología]

## 🏗️ Arquitectura

[Imagen del diagrama de arquitectura + descripción en 1 párrafo]

## ⚙️ Requisitos

- Python 3.11+
- Docker y Docker Compose
- Cuenta en [proveedor cloud] con acceso a [servicios específicos]
- API Key de [proveedor LLM]

## 🚀 Instalación

```bash
git clone https://github.com/[usuario]/[repo].git
cd [repo]
cp .env.example .env
# Edita .env con tus credenciales reales
make install
make dev
```

## 📡 Uso

```bash
# Consulta al sistema
curl -X POST http://localhost:8000/api/v1/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cuáles son los requisitos para apertura de cuenta?"}'
```

## 🧪 Pruebas

```bash
make test          # Suite completa
make evaluate      # Evaluación LLM con RAGAS
make load-test     # Prueba de carga con k6
```

## 📊 Resultados

| Métrica | Valor Obtenido | Meta |
|---------|---------------|------|
| Faithfulness | 0.91 | > 0.85 |
| Latencia p95 | 1.8s | < 2s |
| Cobertura tests | 74% | > 60% |

## 🎥 Demo

[Enlace a video demo — YouTube unlisted o Google Drive]

## 📄 Documentación Completa

Ver [`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md)
```

---

#### `.gitignore` — OBLIGATORIO

El `.gitignore` debe excluir **como mínimo** los siguientes patrones:

```gitignore
# Variables de entorno y secretos — NUNCA commitear
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
credentials.json

# Python
__pycache__/
*.py[cod]
*.so
.Python
.venv/
venv/
env/
*.egg-info/
dist/
build/
.eggs/

# Testing y cobertura
.coverage
.coverage.*
htmlcov/
.pytest_cache/
.mypy_cache/
coverage.xml

# Jupyter Notebooks (checkpoints)
.ipynb_checkpoints/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Sistemas operativos
.DS_Store
Thumbs.db

# Docker
*.log

# Datos locales — NO commitear datos reales
data/raw/
data/processed/
*.sqlite
*.db

# Modelos descargados localmente
models/
*.bin
*.safetensors

# Archivos temporales
tmp/
temp/
```

---

#### `Dockerfile` — OBLIGATORIO

El Dockerfile debe producir una imagen lista para producción:

```dockerfile
# ── Etapa 1: Builder ──────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python (capa cacheada)
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Etapa 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Usuario no-root por seguridad
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /home/appuser/.local

# Copiar código fuente
COPY src/ ./src/

# Variables de entorno de runtime
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

#### `docker-compose.yml` — OBLIGATORIO

```yaml
version: "3.9"

services:
  api:
    build:
      context: .
      target: runtime
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      chromadb:
        condition: service_started
    volumes:
      - ./src:/app/src   # Hot reload en desarrollo
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-dev_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_pass}
      POSTGRES_DB: ${POSTGRES_DB:-ai_llm_dev}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dev_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - ANONYMIZED_TELEMETRY=False

volumes:
  postgres_data:
  chroma_data:
```

---

### Carpeta `/docs`

#### `docs/adr/ADR-001.md` — OBLIGATORIO (mínimo 2)

Cada ADR debe seguir esta plantilla exacta:

```markdown
# ADR-[NNN]: [Título conciso en imperativo, ej. "Usar Pinecone como Vector Store"]

**Fecha:** DD/MM/AAAA  
**Estado:** Propuesto | Aceptado | Rechazado | Deprecado | Reemplazado por ADR-[NNN]  
**Autores:** [Nombre(s) del/los participante(s)]  
**Revisado por:** [Instructor / Par]

## Contexto

[2–4 párrafos. Describa el problema específico que motivó esta decisión.
Incluya: restricciones conocidas, volumen de datos, requerimientos de latencia,
presupuesto disponible, y cualquier constraint técnico relevante.]

## Decisión

[1–2 párrafos. Describa la decisión tomada de forma clara y directa.
"Hemos decidido usar X porque Y." Evite ambigüedades.]

## Opciones Evaluadas

| Opción | Latencia (aprox.) | Costo/mes (aprox.) | Escalabilidad | Facilidad integración |
|--------|------------------|-------------------|---------------|-----------------------|
| **[Opción elegida]** | Xms | USD $Y | Alta | Alta |
| Alternativa A | Xms | USD $Y | Media | Media |
| Alternativa B | Xms | USD $Y | Alta | Baja |

## Consecuencias Positivas

- [Beneficio técnico cuantificable]
- [Beneficio de desarrollo / mantenimiento]
- [Beneficio económico]

## Consecuencias Negativas / Trade-offs

- [Deuda técnica o limitación introducida]
- [Riesgo asumido]

## Criterios de Revisión

Esta decisión se revisará si: [condición 1, ej. "el costo mensual supera USD $500"]
o si: [condición 2, ej. "la latencia p95 supera 500ms consistentemente"].
```

---

#### `docs/api/openapi.yaml` — OBLIGATORIO

```yaml
openapi: "3.1.0"
info:
  title: "[Nombre del Proyecto] API"
  description: "API REST para solución AI/LLM — [descripción breve del caso de uso]"
  version: "1.0.0"
  contact:
    name: "[Nombre del participante]"
    email: "[email]"

servers:
  - url: "http://localhost:8000"
    description: "Desarrollo local"
  - url: "https://[tu-dominio]/api"
    description: "Producción"

security:
  - BearerAuth: []

paths:
  /api/v1/query:
    post:
      summary: "Consulta al sistema AI/LLM"
      description: "Recibe una consulta en lenguaje natural, ejecuta el pipeline RAG y retorna una respuesta generada con referencias a las fuentes utilizadas."
      tags: [Inference]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/QueryRequest"
            example:
              query: "¿Cuáles son los requisitos para apertura de cuenta empresarial?"
              session_id: "sess_abc123"
      responses:
        "200":
          description: "Respuesta generada exitosamente"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/QueryResponse"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "422":
          $ref: "#/components/responses/UnprocessableEntity"
        "500":
          $ref: "#/components/responses/InternalError"

  /api/v1/ingest:
    post:
      summary: "Ingesta de documentos al vector store"
      tags: [Ingestion]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/IngestRequest"
      responses:
        "200":
          description: "Documentos indexados exitosamente"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IngestResponse"

  /api/v1/health:
    get:
      summary: "Estado del sistema"
      security: []
      tags: [Operations]
      responses:
        "200":
          description: "Sistema operando normalmente"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthResponse"
        "503":
          description: "Sistema degradado o no disponible"

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    QueryRequest:
      type: object
      required: [query]
      properties:
        query:
          type: string
          minLength: 1
          maxLength: 2048
          description: "Consulta en lenguaje natural"
        session_id:
          type: string
          description: "ID de sesión para mantener historial de conversación"
        context_filter:
          type: object
          description: "Filtros opcionales para restringir la búsqueda en el vector store"

    QueryResponse:
      type: object
      properties:
        response:
          type: string
          description: "Respuesta generada por el LLM"
        sources:
          type: array
          items:
            type: object
            properties:
              document_id:
                type: string
              chunk_text:
                type: string
              similarity_score:
                type: number
        tokens_used:
          type: integer
        latency_ms:
          type: number
        session_id:
          type: string

    IngestRequest:
      type: object
      required: [documents]
      properties:
        documents:
          type: array
          items:
            type: object
            properties:
              content:
                type: string
              metadata:
                type: object
        source_type:
          type: string
          enum: [pdf, text, url, database]

    IngestResponse:
      type: object
      properties:
        status:
          type: string
          enum: [success, partial, failed]
        indexed_docs:
          type: integer
        errors:
          type: array
          items:
            type: string

    HealthResponse:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        components:
          type: object
          properties:
            llm_api:
              type: string
            vector_store:
              type: string
            database:
              type: string
        timestamp:
          type: string
          format: date-time

  responses:
    BadRequest:
      description: "Request malformado"
      content:
        application/json:
          schema:
            type: object
            properties:
              detail:
                type: string
    Unauthorized:
      description: "Token de autenticación inválido o expirado"
    UnprocessableEntity:
      description: "Error de validación en el body del request"
    InternalError:
      description: "Error interno del servidor"
```

---

## Checklist de Verificación — Ejecutar Antes de la Entrega

```bash
# Verificar que todos los archivos obligatorios existen
echo "=== Verificando archivos mínimos obligatorios ==="

files=(
  "README.md"
  ".env.example"
  ".gitignore"
  "Makefile"
  "Dockerfile"
  "docker-compose.yml"
  "requirements.txt"
  ".github/workflows/ci.yml"
  "docs/PROJECT_DOCUMENTATION.md"
  "docs/architecture/architecture_general.png"
  "docs/adr/ADR-001.md"
  "docs/adr/ADR-002.md"
  "docs/api/openapi.yaml"
  "src/api/main.py"
  "src/core/llm_client.py"
  "src/rag/retriever.py"
  "tests/unit/"
  "tests/integration/"
  "tests/load/"
  "notebooks/evaluation.ipynb"
  "reports/"
)

all_ok=true
for f in "${files[@]}"; do
  if [ -e "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ FALTA: $f"
    all_ok=false
  fi
done

if [ "$all_ok" = true ]; then
  echo ""
  echo "✅ Todos los archivos mínimos están presentes. ¡Listo para entrega!"
else
  echo ""
  echo "❌ Faltan archivos obligatorios. Completa antes de entregar."
  exit 1
fi
```

> 💡 **Tip:** Agrega este script como `make check-files` en tu Makefile para ejecutarlo fácilmente antes de la entrega final.

---

*Programa AI-LLM Solution Architect | Curso 5: Proyecto Final | v1.0*
