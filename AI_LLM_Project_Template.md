# 🤖 Plantilla Oficial de Documentación — Proyecto Final AI/LLM

**Programa:** AI-LLM Solution Architect  
**Curso:** 5 — Proyecto Final de Arquitectura e Integración AI/LLM  
**Documento:** Plantilla Oficial de Documentación del Proyecto

---

## 📋 Información General del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre del Proyecto** | *Ingrese el nombre descriptivo de su solución AI/LLM* |
| **Participante(s)** | *Nombre completo del/los integrante(s)* |
| **Instructor** | *Nombre del instructor del curso* |
| **Cohorte / Edición** | *Ej. Cohorte 2025-A* |
| **Fecha de Inicio** | *DD/MM/AAAA* |
| **Fecha de Entrega Final** | *DD/MM/AAAA* |
| **Versión del Documento** | *v1.0* |
| **Estado del Proyecto** | *En Planificación / En Desarrollo / Completado* |
| **Repositorio GitHub/GitLab** | *URL del repositorio (público o compartido con instructor)* |
| **Entorno Cloud** | *AWS / Azure / GCP / Otro* |
| **Stack Tecnológico Principal** | *Ej. Python, LangChain, GPT-4o, FastAPI, Docker, Kubernetes* |

---

> ⚠️ **Instrucciones Generales**
>
> 1. Complete **TODOS** los campos marcados. El texto en *cursiva* son instrucciones — reemplácelas con su contenido real.
> 2. Mantenga consistencia en nomenclatura, versiones y referencias cruzadas entre secciones.
> 3. Los diagramas deben insertarse como imágenes de alta resolución (mínimo 150 dpi).
> 4. Cite todas las fuentes técnicas en formato **IEEE** o **APA**.
> 5. La documentación debe reflejar el estado **REAL** del proyecto, no el ideal. Sea preciso y honesto.
> 6. Entregue este archivo `.md` en el repositorio Git del proyecto, junto con el PDF generado.

---

## Tabla de Contenidos

- [1. Resumen Ejecutivo](#1-resumen-ejecutivo)
- [2. Análisis y Especificación de Requerimientos](#2-análisis-y-especificación-de-requerimientos)
- [3. Diseño de Arquitectura AI/LLM](#3-diseño-de-arquitectura-aillm)
- [4. Diseño de APIs y Conectores](#4-diseño-de-apis-y-conectores)
- [5. Seguridad, Cumplimiento y Ética](#5-seguridad-cumplimiento-y-ética)
- [6. Implementación y Configuración de Infraestructura](#6-implementación-y-configuración-de-infraestructura)
- [7. Estrategia de Pruebas y Resultados](#7-estrategia-de-pruebas-y-resultados)
- [8. Despliegue, Escalabilidad y Costos](#8-despliegue-escalabilidad-y-costos)
- [9. Observabilidad y Monitoreo](#9-observabilidad-y-monitoreo)
- [10. Resultados, Conclusiones y Trabajo Futuro](#10-resultados-conclusiones-y-trabajo-futuro)
- [11. Rúbrica de Evaluación](#11-rúbrica-de-evaluación)
- [12. Referencias y Bibliografía](#12-referencias-y-bibliografía)
- [Anexos](#anexos)

---

## 1. Resumen Ejecutivo

*Síntesis ejecutiva del proyecto que debe permitir a un lector técnico-gerencial comprender el alcance, la propuesta de valor, el enfoque arquitectónico y los resultados principales en no más de **600 palabras**.*

### 1.1 Propuesta de Valor y Problema que Resuelve

*Describa el problema empresarial específico abordado. Incluya: contexto del negocio, impacto del problema (cuantificado si es posible), y por qué una solución AI/LLM es la estrategia óptima. Mínimo 150 palabras.*

### 1.2 Alcance y Delimitación

*Defina con precisión qué está IN SCOPE y qué está OUT OF SCOPE para la versión entregada.*

| ✅ EN SCOPE | ❌ OUT OF SCOPE |
|------------|----------------|
| Ej. Integración con fuentes de datos internas de la empresa | Ej. Entrenamiento de modelos desde cero (fine-tuning de base) |
| Ej. Despliegue en entorno cloud (AWS/Azure/GCP) | Ej. Soporte en idiomas distintos al español e inglés |
| *[Agregue más filas según necesidad]* | *[Agregue más filas según necesidad]* |

### 1.3 Indicadores Clave de Éxito (KPIs del Proyecto)

| KPI / Métrica | Línea Base | Meta Objetivo | Resultado Obtenido |
|---------------|-----------|---------------|-------------------|
| Latencia promedio (p95) | N/A | < 2 segundos | *[Completar al final]* |
| Tasa de éxito de respuestas | *[Baseline]* | > 92% | *[Completar al final]* |
| Costo por 1,000 consultas (USD) | *[Baseline]* | *[Definir]* | *[Completar al final]* |
| Cobertura de pruebas (%) | 0% | > 80% | *[Completar al final]* |
| *[KPI adicional]* | | | |

---

## 2. Análisis y Especificación de Requerimientos

### 2.1 Contexto del Caso de Uso Empresarial

*Describa el caso de uso empresarial en detalle. Incluya: industria/sector, actor(es) involucrados, flujo de trabajo actual (AS-IS), y flujo de trabajo propuesto (TO-BE). Responda: ¿Quién usa el sistema? ¿Con qué frecuencia? ¿Cuál es el volumen esperado de transacciones?*

### 2.2 Requerimientos Funcionales

| ID | Descripción del Requerimiento | Prioridad | Criterio de Aceptación |
|----|-------------------------------|-----------|------------------------|
| RF-001 | El sistema debe recibir consultas en lenguaje natural y retornar respuestas coherentes con el contexto empresarial. | Alta | Respuesta generada en < 3s con coherencia > 90% |
| RF-002 | El sistema debe integrar fuentes de datos estructuradas y no estructuradas como contexto (RAG). | Alta | Recuperación correcta en > 85% de consultas de prueba |
| RF-003 | *[Agregue requerimiento]* | *[Alta/Media/Baja]* | *[Criterio medible]* |
| RF-004 | *[Agregue requerimiento]* | | |
| RF-005 | *[Agregue requerimiento]* | | |

### 2.3 Requerimientos No Funcionales

| ID | Categoría | Descripción | Métrica / Umbral |
|----|-----------|-------------|-----------------|
| RNF-001 | Rendimiento | Latencia de respuesta extremo a extremo | p95 < 2s bajo carga normal |
| RNF-002 | Escalabilidad | Capacidad de manejar picos de tráfico | Auto-scaling hasta N instancias |
| RNF-003 | Seguridad | Autenticación y autorización de usuarios | OAuth 2.0 / JWT, MFA habilitado |
| RNF-004 | Disponibilidad | Uptime del servicio | >= 99.5% mensual (SLA) |
| RNF-005 | Cumplimiento | Regulaciones aplicables | GDPR / HIPAA / SOC2 (especificar) |
| RNF-006 | Observabilidad | Monitoreo y trazabilidad | Logs estructurados, dashboards en tiempo real |
| RNF-007 | *[Categoría]* | *[Descripción]* | *[Umbral medible]* |

### 2.4 Restricciones y Supuestos

| Restricciones | Supuestos |
|--------------|-----------|
| Ej. Presupuesto cloud máximo: USD $XXX/mes | Ej. Los usuarios finales tienen acceso estable a Internet |
| Ej. No se permite almacenamiento de PII en logs | Ej. El modelo LLM base ya está disponible via API |
| *[Agregue restricción]* | *[Agregue supuesto]* |

---

## 3. Diseño de Arquitectura AI/LLM

### 3.1 Diagrama de Arquitectura General (Nivel C4 — Contexto y Contenedor)

> 📌 **Instrucción:** Inserte aquí el diagrama de arquitectura de alto nivel. Herramientas recomendadas: Lucidchart, Draw.io, Miro, o AWS Architecture Diagram.
>
> El diagrama **DEBE** incluir: (1) Usuarios/Actores externos, (2) Capa de presentación/API, (3) Servicios de orquestación LLM, (4) Fuentes de datos y vector stores, (5) Servicios cloud, (6) Componentes de seguridad e identidad.
>
> Resolución mínima: 150 dpi. Formato: PNG o SVG.

```
[ INSERTE DIAGRAMA DE ARQUITECTURA GENERAL AQUÍ ]
```

*Figura 1. Diagrama de Arquitectura General — [Nombre del Proyecto] v[X.X]*

### 3.2 Descripción de Componentes Arquitectónicos

| Componente | Tecnología / Servicio | Responsabilidad Principal | Justificación de Selección |
|------------|----------------------|--------------------------|---------------------------|
| API Gateway | AWS API GW / Kong / FastAPI | Enrutamiento, autenticación, rate limiting | Ej. Bajo costo, integración nativa con Lambda |
| Orquestador LLM | LangChain / LlamaIndex / Semantic Kernel | Gestión de prompts, cadenas, agentes | Ej. Ecosistema maduro, soporte RAG nativo |
| Modelo LLM Base | GPT-4o / Claude 3 / Gemini / Llama 3 | Generación de texto e inferencia | *[Justifique la selección con criterios técnicos]* |
| Vector Store | Pinecone / Weaviate / ChromaDB / pgvector | Almacenamiento y búsqueda semántica (RAG) | *[Volumen de datos, latencia, costo]* |
| Capa de Datos | *[Ej. RDS, S3, Blob Storage, Cosmos DB]* | Persistencia de conversaciones, documentos, metadatos | *[Justifique]* |
| Observabilidad | *[Ej. CloudWatch, Prometheus, Grafana, Langfuse]* | Monitoreo, logs, trazas y alertas | *[Justifique]* |
| Seguridad / IAM | *[Ej. AWS Cognito, Azure AD, Okta]* | Identidad, permisos, secrets management | *[Justifique]* |
| *[Componente adicional]* | | | |

### 3.3 Diagrama de Flujo de Datos e Integración

*Inserte diagrama de secuencia o flujo de datos que muestre el ciclo completo de una solicitud: desde el input del usuario hasta la respuesta final, incluyendo pasos de RAG, validación, logging y respuesta.*

```
[ INSERTE DIAGRAMA DE FLUJO DE DATOS / SECUENCIA AQUÍ ]
```

*Figura 2. Flujo de Datos — Ciclo de Request/Response en [Nombre del Proyecto]*

### 3.4 Estrategia de Diseño de Prompts y RAG

**System Prompt Base:**

*Documente el system prompt que guía el comportamiento del modelo. Incluya: rol, restricciones, formato de respuesta esperado, y manejo de casos fuera de alcance.*

```
Eres un asistente experto en [dominio] para [empresa/contexto]. Tu función es [descripción precisa].

RESTRICCIONES:
  - Solo responde en base al contexto proporcionado. Si no tienes información suficiente,
    indica "No tengo información sobre eso."
  - No generes contenido que viole [regulación/política].
  - Responde siempre en [idioma] con un tono [formal/técnico/etc.].

FORMATO DE RESPUESTA: [Especificar estructura esperada: JSON / Markdown / texto libre / etc.]
```

### 3.4 Arquitectura física (equivalencias por nube)

| Capa | AWS | GCP | Azure |
|---|---|---|---|
| Ingesta | Lambda / ECS | Cloud Run / Functions | Azure Functions |
| Raw (Bronze) | S3 | GCS | ADLS Gen2 |
| Transform | Glue / EMR | Dataflow / Dataproc | Synapse / Databricks |
| Curated (Silver) | S3 Parquet | GCS Parquet | ADLS Parquet |
| Serving (Gold) | Athena / Redshift | BigQuery | Synapse SQL |
| Orquestación | Step Functions / MWAA | Composer / Workflows | ADF |
| Observabilidad | CloudWatch | Cloud Monitoring | Azure Monitor |

---

**Estrategia de Recuperación (RAG):**

*Describa: tipo de chunking, tamaño de chunks, overlap, modelo de embeddings utilizado, función de similitud (cosine/dot), número de documentos recuperados (top-k), y estrategia de re-ranking si aplica.*

---

## 4. Diseño de APIs y Conectores

### 4.1 Especificación de Endpoints (API REST / GraphQL)

*Para cada endpoint principal, complete la siguiente tabla. En un proyecto maduro se adjunta el archivo OpenAPI/Swagger como anexo.*

| Endpoint | Método | Descripción | Request Body / Params | Response Schema |
|----------|--------|-------------|----------------------|-----------------|
| `/api/v1/query` | `POST` | Envía una consulta al LLM con contexto RAG | `{"query": string, "session_id": string, "context_filter": object}` | `{"response": string, "sources": array, "tokens_used": int, "latency_ms": float}` |
| `/api/v1/ingest` | `POST` | Carga documentos al vector store | `{"documents": array, "metadata": object}` | `{"status": string, "indexed_docs": int, "errors": array}` |
| `/api/v1/health` | `GET` | Health check del sistema | N/A | `{"status": "healthy\|degraded", "components": object}` |
| *[Endpoint]* | | | | |

### 4.2 Autenticación y Autorización

| Campo | Descripción |
|-------|-------------|
| **Mecanismo Auth** | Ej. JWT Bearer Token con OAuth 2.0 via Azure AD |
| **Proveedor de Identidad** | Ej. AWS Cognito / Okta / Auth0 |
| **Gestión de Secrets** | Ej. AWS Secrets Manager / HashiCorp Vault / Azure Key Vault |
| **Rate Limiting** | Ej. 100 req/min por usuario, 1000 req/min global |
| **Roles definidos** | Ej. `admin`, `analyst`, `readonly` — Adjunte matriz RBAC |

### 4.3 Conectores de Fuentes de Datos

| Fuente de Datos | Tipo | Conector/SDK | Frecuencia de Sync | Manejo de Errores |
|----------------|------|-------------|-------------------|------------------|
| Base de datos CRM | SQL — PostgreSQL | psycopg2 / SQLAlchemy | Tiempo real (CDC) | Retry x3, dead-letter queue |
| SharePoint / OneDrive | Documentos no-estructurados | Microsoft Graph API | Batch diario 02:00 UTC | Alertas email + log |
| *[Fuente]* | | | | |

---

## 5. Seguridad, Cumplimiento y Ética

### 5.1 Modelo de Amenazas y Controles de Seguridad

| Amenaza / Riesgo | Vector de Ataque | Nivel | Control Implementado | Justificación Técnica |
|-----------------|-----------------|-------|---------------------|----------------------|
| Prompt Injection | Input malicioso del usuario | **ALTO** | Input sanitization + guardrails LLM | Validación de input, detección de patrones de inyección con regex + LLM classifier |
| Data Leakage | Respuestas con PII no autorizado | **ALTO** | Output filtering + PII redaction | Integración con AWS Comprehend PII detection o equivalente |
| API Key Exposure | Repositorio público / logs | **CRÍTICO** | Secrets Manager + SAST CI/CD | Pre-commit hooks, rotación automática de keys |
| DoS / Abuso de API | Volumen excesivo de requests | **MEDIO** | Rate limiting + WAF | API Gateway throttling + AWS WAF / CloudFlare |
| *[Amenaza]* | | | | |

### 5.2 Cumplimiento Regulatorio

| Regulación | Requerimiento Aplicable | Control Implementado | Evidencia |
|-----------|------------------------|---------------------|-----------|
| GDPR (si aplica) | Derecho al olvido, consentimiento explícito, notificación de breaches | *[Medidas implementadas]* | *[Link a política / log]* |
| ISO 27001 / SOC 2 | Gestión de accesos, auditoría, continuidad del negocio | *[Controles]* | *[Evidencia]* |
| Política Interna de IA | Uso responsable de IA, revisión humana de decisiones críticas | *[Definir]* | *[Evidencia]* |
| *[Otra regulación]* | | | |

### 5.3 Marco Ético de la Solución AI

| Dimensión Ética | Riesgo Identificado | Mecanismo de Mitigación |
|----------------|--------------------|-----------------------|
| Sesgos algorítmicos | El modelo puede perpetuar sesgos del corpus de entrenamiento | Evaluación periódica de outputs + dataset de benchmarking de equidad |
| Transparencia | Los usuarios pueden no saber que interactúan con IA | Disclosure explícito en interfaz + mecanismo de escalamiento a humano |
| Alucinaciones | El modelo puede generar información falsa con confianza alta | RAG + citación de fuentes + umbral de confianza mínimo configurable |
| Privacidad de datos | Inputs del usuario podrían usarse para reentrenamiento | Opt-out explícito, cero retention policy en APIs de terceros |
| *[Dimensión adicional]* | | |

---

## 6. Implementación y Configuración de Infraestructura

### 6.1 Stack Tecnológico y Justificación

| Capa | Tecnología Seleccionada | Alternativas Evaluadas | Razón de Selección |
|------|------------------------|----------------------|-------------------|
| LLM Provider | Ej. OpenAI GPT-4o | Anthropic Claude 3, Gemini 1.5 Pro | Ej. Mejor relación contexto/precio, ecosystem maduro, soporte function calling avanzado |
| Orquestación | Ej. LangChain v0.2 | LlamaIndex, Semantic Kernel | *[Justificación técnica]* |
| Backend API | Ej. FastAPI + Python 3.11 | Flask, Django, Node.js | *[Justificación]* |
| Embeddings | Ej. text-embedding-3-large | all-MiniLM-L6-v2, Cohere Embed | *[Dimensionalidad, performance, costo]* |
| Vector DB | *[Ej. Pinecone / Weaviate]* | *[Alternativas]* | *[Justificación]* |
| Cloud Provider | *[AWS / Azure / GCP]* | *[Alternativas]* | *[Justificación]* |
| Containerización | Docker + Kubernetes (EKS/AKS/GKE) | ECS, Cloud Run | *[Justificación]* |
| CI/CD | GitHub Actions / GitLab CI | *[Alternativas]* | *[Justificación]* |
| Observabilidad | *[Langfuse / CloudWatch / Grafana]* | *[Alternativas]* | *[Justificación]* |

### 6.2 Estructura del Repositorio

```
repo-ai-llm-proyecto/
├── README.md                    # Descripción del proyecto y guía de inicio rápido
├── docs/                        # Documentación técnica
│   ├── architecture/            # Diagramas de arquitectura (PNG, Draw.io, Lucidchart)
│   ├── adr/                     # Architecture Decision Records
│   └── api/                     # OpenAPI/Swagger specs
├── src/                         # Código fuente principal
│   ├── api/                     # Endpoints y routers (FastAPI / Express)
│   ├── core/                    # Lógica de negocio, orquestación LLM
│   ├── rag/                     # Pipeline RAG: ingestion, chunking, retrieval
│   ├── security/                # Guardrails, validación de input/output
│   └── utils/                   # Utilidades compartidas
├── infrastructure/              # IaC (Terraform, CDK, Bicep)
├── tests/                       # Pruebas unitarias, integración, E2E, de carga
├── notebooks/                   # Jupyter notebooks de exploración y evaluación
├── .github/workflows/           # Pipelines CI/CD
├── docker-compose.yml           # Entorno local de desarrollo
├── requirements.txt             # Dependencias Python
└── .env.example                 # Variables de entorno (NUNCA commitear .env real)
```

### 6.3 Variables de Entorno y Configuración

| Variable de Entorno | Descripción | Gestión / Almacenamiento |
|--------------------|-------------|------------------------|
| `OPENAI_API_KEY` | Clave de autenticación con la API de OpenAI | AWS Secrets Manager — rotación automática 90 días |
| `VECTOR_DB_URL` | Endpoint del vector store | Parameter Store (SecureString) |
| `DATABASE_URL` | String de conexión a base de datos relacional | Secrets Manager — encriptado con KMS |
| `LOG_LEVEL` | Nivel de logging (INFO/DEBUG/WARNING/ERROR) | Variable de entorno en contenedor — no sensitiva |
| *[Variable]* | | |

---

## 7. Estrategia de Pruebas y Resultados

### 7.1 Plan de Pruebas

| Tipo de Prueba | Alcance | Herramienta | Criterio de Aceptación | Estado |
|---------------|---------|-------------|----------------------|--------|
| Unitarias | Funciones de chunking, embeddings, retrievers | pytest + unittest | Cobertura > 80% | ⬜ Pendiente |
| Integración | Pipeline RAG end-to-end, APIs internas | pytest + Docker Compose | Todos los flujos críticos validados | ⬜ Pendiente |
| Rendimiento / Carga | Endpoint `/api/v1/query` bajo carga concurrente | Locust / k6 / Artillery | p95 < 2s con 50 usuarios concurrentes | ⬜ Pendiente |
| Seguridad | OWASP Top 10 para APIs, prompt injection | OWASP ZAP + tests manuales | 0 vulnerabilidades críticas o altas | ⬜ Pendiente |
| LLM Evaluation | Calidad de respuestas: coherencia, relevancia, factualidad | RAGAS / LangSmith / Promptfoo | Faithfulness > 0.85, Relevance > 0.80 | ⬜ Pendiente |
| E2E / Aceptación | Flujos completos desde UI/API hasta respuesta | Playwright / Postman | 100% de casos de uso críticos pasan | ⬜ Pendiente |

### 7.2 Resultados de Pruebas de Rendimiento

*Incluya gráficas y tablas de resultados. Las capturas de pantalla de dashboards (k6, Locust, CloudWatch) deben insertarse como figuras.*

| Métrica | 10 Usuarios Concurrentes | 50 Usuarios | 100 Usuarios | Meta Objetivo |
|---------|------------------------|------------|-------------|--------------|
| Latencia p50 (ms) | *[XXX]* | *[XXX]* | *[XXX]* | < 1,000 ms |
| Latencia p95 (ms) | *[XXX]* | *[XXX]* | *[XXX]* | < 2,000 ms |
| Latencia p99 (ms) | *[XXX]* | *[XXX]* | *[XXX]* | < 4,000 ms |
| Tasa de error (%) | *[XXX]* | *[XXX]* | *[XXX]* | < 1% |
| Throughput (RPS) | *[XXX]* | *[XXX]* | *[XXX]* | *[Definir]* |
| Tokens promedio/req | *[XXX]* | *[XXX]* | *[XXX]* | *[Definir]* |

### 7.3 Evaluación de Calidad LLM (LLM-as-Judge)

*Documente los resultados de evaluación con RAGAS, LangSmith, o evaluación manual estructurada.*

| Métrica RAGAS / Custom | Score Obtenido | Score Mínimo Aceptable | ¿Cumple? | Observaciones |
|----------------------|---------------|----------------------|---------|---------------|
| Faithfulness (fidelidad al contexto) | *[0.XX]* | 0.85 | ✅ / ❌ | |
| Answer Relevancy | *[0.XX]* | 0.80 | ✅ / ❌ | |
| Context Precision | *[0.XX]* | 0.75 | ✅ / ❌ | |
| Context Recall | *[0.XX]* | 0.75 | ✅ / ❌ | |
| Hallucination Rate | *[X%]* | < 5% | ✅ / ❌ | |
| *[Métrica personalizada]* | | | | |

---

## 8. Despliegue, Escalabilidad y Costos

### 8.1 Estrategia de Despliegue

| Campo | Descripción |
|-------|-------------|
| **Estrategia de Despliegue** | Ej. Blue-Green deployment con AWS CodeDeploy |
| **Herramienta CI/CD** | Ej. GitHub Actions — workflows: build, test, security-scan, deploy |
| **Infrastructure as Code** | Ej. Terraform v1.8 — módulos cloud en `/infrastructure/` |
| **Entornos** | Development → Staging → Production |
| **Rollback Strategy** | Ej. Automático vía health check failure — rollback en < 5 min |
| **Container Registry** | Ej. Amazon ECR / GitHub Container Registry / Azure ACR |
| **Versioning** | Semantic Versioning (MAJOR.MINOR.PATCH) + Git tags en releases |

### 8.2 Configuración de Escalabilidad

| Componente | Mínimo de Instancias | Máximo de Instancias | Trigger de Auto-Scaling |
|------------|---------------------|---------------------|------------------------|
| API Service (K8s Deployment) | 2 pods | 20 pods | CPU > 70% durante 2 min \| RPS > 100 |
| Worker / Background Jobs | 1 pod | 10 pods | Queue length > 100 mensajes |
| *[Otro componente]* | | | |

### 8.3 Análisis y Optimización de Costos

| Servicio / Componente | Costo Estimado/mes | Costo Real/mes | Unidad de Medida | Optimización Aplicada |
|----------------------|------------------|---------------|-----------------|----------------------|
| OpenAI API (input tokens) | USD $*[XXX]* | USD $*[XXX]* | Por 1M tokens | Prompt caching, compresión de contexto |
| OpenAI API (output tokens) | USD $*[XXX]* | USD $*[XXX]* | Por 1M tokens | Streaming, max_tokens limit |
| Vector DB | USD $*[XXX]* | USD $*[XXX]* | Por unidades/mes | *[Optimización]* |
| Compute (EKS/AKS/GKE) | USD $*[XXX]* | USD $*[XXX]* | Por hora | Spot instances, right-sizing |
| Almacenamiento | USD $*[XXX]* | USD $*[XXX]* | Por GB/mes | Lifecycle policies, compresión |
| **TOTAL ESTIMADO** | **USD $*[TOTAL]*** | **USD $*[REAL]*** | | |

---

## 9. Observabilidad y Monitoreo

### 9.1 Stack de Observabilidad

| Categoría | Solución Implementada |
|----------|-----------------------|
| **Logging** | Ej. AWS CloudWatch Logs + structured JSON logging con Python `logging` module |
| **Métricas** | Ej. Prometheus + Grafana — métricas custom de LLM (token count, latencia, error rate) |
| **Trazabilidad (Tracing)** | Ej. AWS X-Ray / OpenTelemetry + Langfuse para trazas de prompts/respuestas |
| **Alertas** | Ej. CloudWatch Alarms → SNS → PagerDuty / Slack webhook |
| **Dashboard LLM** | Ej. Langfuse / LangSmith / Phoenix Arize — evaluación continua de calidad |
| **SLO/SLA Monitoring** | Ej. Latencia p95 < 2s medida cada 1 min — alertas si 3 violaciones consecutivas |

### 9.2 Métricas Clave Monitoreadas

| Métrica | Tipo | Umbral de Alerta | Acción Automática / Escalamiento |
|---------|------|-----------------|--------------------------------|
| Latencia p95 de API | Rendimiento | > 2,500 ms | Auto-scaling trigger + notificación Slack |
| Tasa de error de API | Confiabilidad | > 2% | PagerDuty alert + rollback automático |
| Tokens consumidos/hora | Costo | > 80% del budget mensual | Email al equipo + throttling de requests |
| Hallucination Rate (LLM Eval) | Calidad | > 10% | Revisión manual + retraining pipeline |
| Vector Store Query Latency | Rendimiento | > 500 ms | Cache warming + índice rebuild |
| *[Métrica custom]* | | | |

---

## 10. Resultados, Conclusiones y Trabajo Futuro

### 10.1 Resultados Obtenidos vs. Objetivos

| Objetivo | Meta Planificada | Resultado Real | Estado |
|----------|-----------------|---------------|--------|
| Latencia de respuesta | p95 < 2 segundos | *[X.XX] segundos* | ✅ Logrado / ⚠️ Parcial / ❌ No logrado |
| Calidad de respuestas | Faithfulness > 0.85 | *[0.XX]* | |
| Cobertura de pruebas | > 80% | *[XX]%* | |
| Costo operacional | < USD $*[X]*/mes | USD $*[Y]*/mes | |
| *[Objetivo adicional]* | | | |

### 10.2 Conclusiones Técnicas

*Mínimo 300 palabras. Responda: ¿Qué funcionó bien y por qué? ¿Qué no funcionó y cuáles fueron los obstáculos? ¿Qué decisiones arquitectónicas resultaron acertadas? ¿Cuáles cambiaría? ¿Qué aprendizajes aplica a proyectos futuros?*

### 10.3 Lecciones Aprendidas

| Categoría | Lección Aprendida | Aplicación Futura |
|-----------|------------------|------------------|
| Diseño de Prompts | *[Descripción de lección]* | *[Cómo aplicaría esto en el siguiente proyecto]* |
| Arquitectura de Datos | *[Descripción]* | *[Aplicación]* |
| Gestión del Proyecto | *[Descripción]* | *[Aplicación]* |
| Seguridad / Cumplimiento | *[Descripción]* | *[Aplicación]* |
| *[Categoría]* | | |

### 10.4 Hoja de Ruta — Trabajo Futuro

| Horizonte | Mejora / Feature Planeada | Justificación | Complejidad Estimada |
|-----------|--------------------------|---------------|---------------------|
| Corto Plazo (1–3 meses) | *[Ej. Fine-tuning del modelo con datos propios de la empresa]* | *[Mejora esperada en calidad]* | Alta / Media / Baja |
| Mediano Plazo (3–6 meses) | *[Ej. Multi-modal: soporte para imágenes y documentos escaneados vía OCR]* | *[Impacto]* | |
| Largo Plazo (6–12 meses) | *[Ej. Sistema de agentes autónomos multi-step para automatización de procesos]* | *[Impacto]* | |

---

## 11. Rúbrica de Evaluación

*La puntuación máxima es **4.0** por criterio. El promedio ponderado determina la nota final del módulo.*

| Criterio | Excepcional (4) | Competente (3) | En Desarrollo (2) | Insuficiente (1) |
|----------|----------------|---------------|------------------|-----------------|
| **Análisis de Requerimientos** (10%) | Requerimientos funcionales y no funcionales completamente especificados, priorizados con criterios de aceptación medibles, trazables a objetivos de negocio. | Requerimientos bien documentados con criterios de aceptación. Pequeños gaps en trazabilidad. | Requerimientos incompletos o sin criterios de aceptación claros. Falta de priorización. | Requerimientos ausentes, genéricos o sin relación con el caso de uso real. |
| **Diseño Arquitectónico** (25%) | Arquitectura técnicamente sólida, completamente justificada, con diagramas C4, decisiones de diseño documentadas (ADRs), y consideración de trade-offs. | Arquitectura correcta con diagramas claros. Justificaciones presentes pero con algunas decisiones sin fundamentar. | Arquitectura básica presente. Diagramas incompletos. Pocas o ninguna justificación de decisiones técnicas. | Sin diagrama de arquitectura coherente. Componentes mal definidos o sin integración aparente. |
| **Implementación Técnica** (25%) | Código funcional, modular, bien documentado, con manejo de errores robusto, pruebas con cobertura > 80%, y siguiendo principios SOLID / Clean Architecture. | Código funcional con estructura razonable. Pruebas básicas presentes (> 50% cobertura). Documentación parcial. | Código funcional pero monolítico, sin pruebas o con cobertura muy baja (< 30%). Errores sin manejo. | Código no funcional, sin estructura, sin pruebas, o no disponible en repositorio. |
| **Seguridad y Cumplimiento** (15%) | Modelo de amenazas completo, todos los controles implementados y validados, cumplimiento regulatorio documentado con evidencias, marco ético exhaustivo. | Principales controles de seguridad implementados. Cumplimiento parcialmente documentado. Análisis ético presente. | Consideraciones de seguridad básicas. Sin validación de cumplimiento. Análisis ético superficial. | Sin controles de seguridad. Sin consideraciones de cumplimiento ni ética. |
| **Pruebas y Validación** (15%) | Plan de pruebas completo ejecutado. Métricas de rendimiento y calidad LLM documentadas. Todos los KPIs medidos con evidencias. | Pruebas funcionales y de rendimiento ejecutadas. Métricas parcialmente reportadas. | Solo pruebas funcionales básicas. Sin pruebas de carga o evaluación LLM. Métricas escasas. | Sin evidencia de pruebas realizadas o resultados no disponibles. |
| **Documentación y Presentación** (10%) | Documento técnico completo, profesional y preciso. Presentación oral clara, con demo funcional, manejo experto de preguntas técnicas. | Documentación completa con pocos errores. Presentación clara con demo. Respuestas adecuadas. | Documentación incompleta o con inconsistencias. Presentación básica. Dificultades en preguntas técnicas. | Documentación ausente o irrelevante. Presentación confusa o sin demo funcional. |

### Escala de Calificación

| Rango | Equivalencia |
|-------|-------------|
| 3.6 – 4.0 — Excepcional | ✅ Aprobado con Distinción |
| 3.0 – 3.5 — Competente | ✅ Aprobado |
| 2.0 – 2.9 — En Desarrollo | ⚠️ Condicional — revisión requerida |
| < 2.0 — Insuficiente | ❌ Reprobado — nueva entrega requerida |

---

### 11.1 Criterios de evaluación  

***Evaluación técnica (70%)***
| Criterio                | Peso |
| ----------------------- | ---- |
| Diseño de arquitectura  | 20%  |
| Implementación          | 20%  |
| Almacenamiento en cloud | 15%  |
| Automatización          | 10%  |
| Calidad del código (validacion por 3 IAs)      | 5%   |

---
***Conceptual (30%).***  
| Criterio              | Peso |
| --------------------- | ---- |
| Justificación técnica | 15%  |
| Claridad documental   | 10%  |
| Defensa de decisiones | 5%   |


---

### 11.2 Entregables oficiales

- 👨‍💻Código funcional
- 🏛️Arquitectura documentada
- ☁️Datos en la nube
- 📃README técnico
- 🎥Video de no mas de 30 minutos donde se evidencie el funcionamiento del proyecto

---

## 12. Referencias y Bibliografía

*Liste todas las fuentes citadas en el documento en formato **IEEE** o **APA**. Mínimo **10 referencias** técnicas. Incluya: documentación oficial de APIs/SDKs, papers académicos, libros técnicos, y recursos del curso.*

1. M. Kleppmann, *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. Sebastopol, CA: O'Reilly Media, 2017.
2. B. Beyer, C. Jones, J. Petoff, and N. R. Murphy, *Site Reliability Engineering: How Google Runs Production Systems*. Sebastopol, CA: O'Reilly Media, 2016.
3. OpenAI, "GPT-4 Technical Report," arXiv preprint arXiv:2303.08774, 2023. [Online]. Available: https://arxiv.org/abs/2303.08774
4. P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," in *Proc. NeurIPS 2020*, vol. 33, pp. 9459–9474.
5. L. Moroney, *AI and Machine Learning for Coders*. Sebastopol, CA: O'Reilly Media, 2020.
6. B. Wilder, *Cloud Architecture Patterns*. Sebastopol, CA: O'Reilly Media, 2012.
7. A. García Serrano, *Inteligencia Artificial: Fundamentos, Práctica y Aplicaciones*. Madrid: RC Libros, 2016.
8. LangChain, "LangChain Documentation v0.2," [Online]. Available: https://python.langchain.com/docs
9. *[Agregue referencia adicional — artículo, documentación oficial, paper]*
10. *[Agregue referencia adicional]*

---

## Anexos

### Anexo A — Architecture Decision Records (ADR)

Utilice una plantilla ADR para documentar cada decisión arquitectónica clave. Mínimo **3 ADRs** requeridos.

```markdown
# ADR-001: [Título descriptivo de la decisión]

**Fecha:** DD/MM/AAAA  
**Estado:** Propuesto / Aceptado / Rechazado / Deprecado  
**Autores:** [Nombre(s)]

## Contexto
[Describa la situación y el problema que motivó esta decisión arquitectónica.]

## Decisión
[Describa la decisión tomada y cómo resuelve el problema.]

## Consecuencias Positivas
- [Beneficio 1]
- [Beneficio 2]

## Consecuencias Negativas / Trade-offs
- [Desventaja o deuda técnica 1]

## Alternativas Consideradas
- **Opción A:** [Descripción] — Descartada porque [razón]
- **Opción B:** [Descripción] — Descartada porque [razón]
```

---

### Anexo B — Glosario de Términos Técnicos

| Término | Definición |
|---------|-----------|
| **RAG** (Retrieval-Augmented Generation) | Técnica que combina recuperación de información relevante de una base de conocimiento externa con la generación de texto de un LLM, reduciendo alucinaciones y mejorando la factualidad de las respuestas. |
| **LLM** (Large Language Model) | Modelo de lenguaje de gran escala entrenado con enormes corpus de texto usando arquitecturas Transformer, capaz de generar, resumir, traducir y razonar con lenguaje natural. |
| **Embeddings** | Representaciones vectoriales densas de texto que capturan relaciones semánticas, permitiendo búsqueda por similitud en espacios de alta dimensionalidad. |
| **Vector Store** | Base de datos especializada en almacenar y recuperar eficientemente vectores de alta dimensionalidad mediante algoritmos ANN (Approximate Nearest Neighbors) como HNSW o IVF. |
| **Prompt Engineering** | Disciplina de diseño y optimización de instrucciones para guiar el comportamiento de LLMs hacia resultados deseados de forma consistente y controlada. |
| **Guardrails** | Mecanismos de control que validan, filtran o restringen los inputs y outputs de un sistema LLM para garantizar seguridad, cumplimiento y adherencia a políticas. |
| **Hallucination** | Fenómeno en el que un LLM genera información factualmente incorrecta o inventada con aparente confianza, sin base en los datos de entrenamiento o el contexto provisto. |
| **Fine-tuning** | Proceso de ajuste de los pesos de un modelo pre-entrenado sobre un dataset específico del dominio para mejorar su rendimiento en tareas particulares. |
| **ADR** (Architecture Decision Record) | Documento que captura una decisión arquitectónica importante, incluyendo contexto, opciones evaluadas, decisión tomada y consecuencias. |
| **RAGAS** | Framework de evaluación automatizada de pipelines RAG que mide faithfulness, answer relevancy, context precision y context recall. |
| *[Término adicional]* | *[Definición]* |

---

### Anexo C — Checklist de Entrega Final

Marque cada ítem antes de hacer la entrega final:

- [ ] Documento Markdown completado en todas sus secciones
- [ ] Repositorio Git con código fuente, notebooks y configuración IaC
- [ ] `README.md` del repositorio con instrucciones de despliegue local
- [ ] Diagramas de arquitectura en alta resolución (PNG/SVG en `/docs/architecture/`)
- [ ] ADRs documentados para al menos 3 decisiones arquitectónicas clave (en `/docs/adr/`)
- [ ] Especificación OpenAPI/Swagger del API (YAML/JSON en `/docs/api/`)
- [ ] Reporte de pruebas de rendimiento (k6/Locust outputs)
- [ ] Reporte de evaluación LLM (RAGAS o equivalente)
- [ ] Análisis de costos completo con datos reales del entorno cloud
- [ ] Presentación de diapositivas para la defensa oral (15–20 slides)
- [ ] Video demo del sistema funcionando (máx. 5 minutos — link a YouTube/Drive)
- [ ] Evidencias de pruebas de seguridad (OWASP ZAP reporte o equivalente)

---

*— Fin del Documento —*  
*Programa AI-LLM Solution Architect | Curso 5: Proyecto Final*
