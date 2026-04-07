# 📐 Alcance Mínimo Obligatorio — Proyecto Final AI/LLM

**Programa:** AI-LLM Solution Architect  
**Curso:** 5 — Proyecto Final de Arquitectura e Integración AI/LLM  
**Versión del documento:** v1.0  
**Aplica a partir de:** Cohorte 2025-A

> Este documento define el estándar mínimo que debe cumplir un proyecto para ser considerado **completo y evaluable**. Actúa como contrato técnico entre el instructor y los participantes. Un proyecto que no cumpla los requisitos marcados como **obligatorios** no será admitido a evaluación final.

---

## Tabla de Contenidos

- [1. Solución Funcional End-to-End](#1-solución-funcional-end-to-end)
- [2. Arquitectura y Diseño](#2-arquitectura-y-diseño)
- [3. Implementación Técnica](#3-implementación-técnica)
- [4. Seguridad](#4-seguridad)
- [5. Pruebas y Calidad](#5-pruebas-y-calidad)
- [6. Observabilidad](#6-observabilidad)
- [7. Documentación](#7-documentación)
- [8. Repositorio y Entrega](#8-repositorio-y-entrega)
- [9. Presentación y Defensa](#9-presentación-y-defensa)
- [10. Lo que NO se exige en v1.0](#10-lo-que-no-se-exige-en-v10)
- [11. Tabla Resumen de Umbrales](#11-tabla-resumen-de-umbrales)

---

## 1. Solución Funcional End-to-End

### ✅ Obligatorio

- [ ] La solución debe ser un **sistema AI/LLM funcional completo**, no un notebook de exploración ni un prototipo de demo aislado.
- [ ] Debe existir un **flujo de usuario real y ejecutable**: desde el input (consulta en lenguaje natural) hasta el output (respuesta generada con contexto recuperado), pasando por todos los componentes declarados en la arquitectura.
- [ ] El sistema debe operar sobre un **caso de uso empresarial específico y delimitado**, documentado en la sección 2 de la Plantilla Oficial.
- [ ] El sistema debe estar **desplegado y accesible** en algún entorno (cloud tier gratuito aceptado: AWS Free Tier, Azure for Students, GCP Sandbox, Railway, Render, Fly.io).
- [ ] Debe existir evidencia de que el sistema fue **ejecutado con datos reales o suficientemente representativos** del caso de uso (capturas de pantalla, logs, reportes de evaluación).

### ⚠️ Recomendado

- [ ] El despliegue incluye un entorno de staging separado del de desarrollo.
- [ ] El sistema soporta al menos 10 usuarios concurrentes sin degradación severa (medido con herramienta de carga).

---

## 2. Arquitectura y Diseño

### ✅ Obligatorio

- [ ] **Diagrama de arquitectura C4** (nivel Contexto + Contenedor) que muestre todos los componentes del sistema y sus relaciones, exportado como imagen PNG o SVG en alta resolución (mínimo 150 dpi).
- [ ] El diagrama debe incluir explícitamente: actores externos, API Gateway, orquestador LLM, modelo base, vector store, fuentes de datos, capa de seguridad/IAM y componentes de observabilidad.
- [ ] **Diagrama de flujo de datos / secuencia** que ilustre el ciclo completo de una solicitud (request → RAG retrieval → LLM inference → response → logging).
- [ ] **Mínimo 2 ADRs** (Architecture Decision Records) documentados en `/docs/adr/`, usando la plantilla oficial, que justifiquen al menos: (a) selección del modelo LLM base, y (b) selección del vector store.
- [ ] **Justificación técnica** de cada componente del stack en la Sección 6.1 de la Plantilla Oficial. "Lo usé porque lo conozco" no es justificación válida.

### ⚠️ Recomendado

- [ ] Los ADRs incluyen análisis de alternativas evaluadas con criterios cuantificables (latencia, costo por token, dimensionalidad de embeddings, etc.).
- [ ] El diagrama de arquitectura fue construido con una herramienta colaborativa (Lucidchart, Draw.io, Miro, Excalidraw).

---

## 3. Implementación Técnica

### ✅ Obligatorio

- [ ] **API REST funcional** con mínimo 3 endpoints operativos:
  - `POST /api/v1/query` — recibe consulta, ejecuta RAG + LLM inference, retorna respuesta con fuentes
  - `POST /api/v1/ingest` — recibe documentos/datos y los indexa en el vector store
  - `GET /api/v1/health` — retorna estado de todos los componentes del sistema
- [ ] **Pipeline RAG implementado** con al menos una fuente de datos real o representativa del caso de uso (PDFs, base de datos, SharePoint, APIs, etc.), no con documentos de ejemplo genéricos (ej. "lorem ipsum").
- [ ] El código fuente está organizado según la **estructura de repositorio definida** en la Plantilla Oficial (sección 6.2), con separación clara entre `api/`, `core/`, `rag/`, `security/` y `tests/`.
- [ ] Existe un `docker-compose.yml` funcional que levanta el entorno de desarrollo completo con un único comando (`make dev` o `docker-compose up`).
- [ ] Las dependencias están declaradas con **versiones exactas** (`==`) en `requirements.txt` o `pyproject.toml`. No se aceptan rangos abiertos (`>=`) para dependencias críticas.
- [ ] Existe manejo explícito de errores en los endpoints de API: errores HTTP apropiados (400, 401, 404, 422, 500), mensajes descriptivos, y logging de excepciones.

### ⚠️ Recomendado

- [ ] La API incluye documentación automática vía OpenAPI/Swagger (`/docs` en FastAPI).
- [ ] Se implementa al menos una estrategia de optimización de prompts (few-shot examples, chain-of-thought, o prompt caching).
- [ ] El pipeline RAG incluye estrategia de re-ranking o filtrado por score de similitud mínimo.

---

## 4. Seguridad

### ✅ Obligatorio

- [ ] **Ninguna API key, secret o credencial** está hardcodeada en el código fuente ni en archivos commiteados al repositorio. Toda credencial se gestiona vía variables de entorno.
- [ ] El repositorio tiene un `.gitignore` que excluye explícitamente: `.env`, `*.pem`, `*.key`, `secrets/`, `__pycache__/`, `.venv/`, carpetas de datos locales.
- [ ] Existe un archivo `.env.example` con todas las variables de entorno documentadas (sin valores reales).
- [ ] La API implementa **autenticación** en todos los endpoints que no sean `/health` (mínimo: API Key en header, recomendado: JWT Bearer Token).
- [ ] Se implementa **rate limiting** básico en la API para prevenir abuso (ej. slowapi en FastAPI, express-rate-limit en Node.js).
- [ ] El Modelo de Amenazas (sección 5.1 de la Plantilla Oficial) documenta al menos 4 amenazas con su nivel de riesgo y control implementado.

### ⚠️ Recomendado

- [ ] Se implementan guardrails de input/output para detectar y bloquear prompt injection básica.
- [ ] Los secrets en producción se gestionan con un servicio dedicado (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault).
- [ ] Se ejecuta un escaneo de seguridad con `bandit` (análisis estático) y `pip-audit` (vulnerabilidades en dependencias) antes de la entrega.

---

## 5. Pruebas y Calidad

### ✅ Obligatorio

- [ ] **Cobertura de pruebas unitarias ≥ 60%** sobre el código fuente en `src/`, medida con `pytest-cov`. El reporte debe incluirse como evidencia.
- [ ] **Al menos 1 prueba de integración** que valide el flujo end-to-end del pipeline RAG (desde ingesta de un documento hasta recuperación y generación de respuesta).
- [ ] **Evaluación de calidad LLM** ejecutada con al menos un framework formal (RAGAS, LangSmith, Promptfoo, o evaluación manual estructurada), reportando mínimo 3 métricas:
  - Faithfulness / Fidelidad al contexto
  - Answer Relevancy / Relevancia de la respuesta
  - Una métrica adicional a elección (Context Recall, Hallucination Rate, etc.)
- [ ] Los resultados de evaluación LLM se reportan en la **Sección 7.3** de la Plantilla Oficial con scores obtenidos vs. scores mínimos definidos.
- [ ] **Al menos 1 prueba de carga** ejecutada con k6, Locust o Artillery, reportando latencia p95 y tasa de error bajo carga mínima (10 usuarios concurrentes).

### ⚠️ Recomendado

- [ ] Cobertura de pruebas unitarias ≥ 80%.
- [ ] Dataset de evaluación LLM con mínimo 20 pares pregunta/respuesta esperada documentados en `/notebooks/`.
- [ ] Prueba de carga con 50 usuarios concurrentes y reporte completo de percentiles.
- [ ] Tests de regresión automáticos para los endpoints de la API.

---

## 6. Observabilidad

### ✅ Obligatorio

- [ ] **Logging estructurado** implementado en toda la aplicación (formato JSON, con campos: `timestamp`, `level`, `service`, `trace_id`, `message`). No se aceptan `print()` como mecanismo de logging en producción.
- [ ] Los logs incluyen al menos: número de tokens consumidos por request, latencia de inferencia LLM, latencia de búsqueda en vector store, y errores con stack trace.
- [ ] Existe un **health check endpoint** (`/api/v1/health`) que reporta el estado individual de cada componente dependiente (LLM API, vector store, base de datos).
- [ ] El análisis de costos (Sección 8.3 de la Plantilla Oficial) está completo con datos reales del entorno usado, no solo estimaciones.

### ⚠️ Recomendado

- [ ] Integración con Langfuse, LangSmith u otra herramienta de observabilidad LLM para trazabilidad de prompts y respuestas.
- [ ] Dashboard básico de métricas (puede ser Grafana con Prometheus, o CloudWatch Dashboard, o incluso Langfuse dashboard).
- [ ] Alertas configuradas para al menos 2 umbrales críticos (ej. error rate > 5%, latencia p95 > 3s).

---

## 7. Documentación

### ✅ Obligatorio

- [ ] **Plantilla Oficial completada en su totalidad** — todas las secciones con contenido real, sin placeholders sin llenar ni instrucciones sin reemplazar. Disponible en `docs/PROJECT_DOCUMENTATION.md`.
- [ ] **README.md** en la raíz del repositorio que incluya: descripción del proyecto (problema + solución), arquitectura en 1 párrafo, requisitos del sistema, instrucciones de instalación paso a paso, instrucciones de ejecución, y enlace al video demo.
- [ ] **Especificación OpenAPI/Swagger** en `docs/api/openapi.yaml` o `docs/api/openapi.json` que documente todos los endpoints con sus schemas de request/response y ejemplos.
- [ ] Las instrucciones del README deben ser **reproducibles desde cero** — el instructor debe poder clonar el repositorio y tener el sistema corriendo en menos de 15 minutos siguiendo exclusivamente el README.

### ⚠️ Recomendado

- [ ] El README incluye badges de estado del CI, cobertura de código, y versión del proyecto.
- [ ] Existe un `CHANGELOG.md` que documenta los cambios relevantes entre versiones del proyecto.
- [ ] Los notebooks de evaluación están bien documentados con celdas Markdown que explican cada paso.

---

## 8. Repositorio y Entrega

### ✅ Obligatorio

- [ ] El repositorio es **privado** con acceso compartido al instructor (o público, según política del programa).
- [ ] El historial de commits es **limpio y descriptivo** — commits con mensajes significativos en formato Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). No se aceptan repositorios con un único commit o con mensajes genéricos ("update", "fix", "cambios").
- [ ] El repositorio tiene al menos **1 Pull Request mergeado** que muestre el uso del flujo de trabajo Git (feature branch → PR → revisión → merge a main).
- [ ] **Ningún archivo de datos sensibles, credenciales, o modelos de gran tamaño** (> 100MB) está commiteado. Usar Git LFS o almacenamiento externo para archivos grandes.
- [ ] Existe un **tag de versión** (`git tag v1.0.0`) en el commit final de entrega.
- [ ] El repositorio incluye todos los archivos mínimos definidos en `REQUIRED_FILES.md`.

### ⚠️ Recomendado

- [ ] Se usa el sistema de Issues de GitHub para trackear tareas y bugs durante el desarrollo.
- [ ] El repositorio tiene protección de rama en `main` (requerir PR + CI passing para merge).
- [ ] Existe una carpeta `reports/` con los resultados de pruebas, evaluación LLM y análisis de costos.

---

## 9. Presentación y Defensa

### ✅ Obligatorio

- [ ] **Presentación de diapositivas** de 15–20 slides que cubra: caso de uso, arquitectura, decisiones técnicas clave, resultados de pruebas, costos, y trabajo futuro.
- [ ] **Demo funcional en vivo** (o video pregrabado de máximo 5 minutos) del sistema respondiendo al menos 3 consultas representativas del caso de uso.
- [ ] El participante debe poder **responder preguntas técnicas** sobre cualquier componente de su sistema: por qué eligió ese modelo, cómo funciona el chunking del RAG, cuál es la estrategia de escalado, cómo maneja los errores, etc.
- [ ] La demo muestra el sistema funcionando **en el entorno de despliegue real** (no en localhost del portátil).

### ⚠️ Recomendado

- [ ] La presentación incluye un análisis honesto de las limitaciones actuales del sistema y cómo se abordarían en una v2.0.
- [ ] El video demo está disponible públicamente en YouTube (unlisted) o Google Drive con enlace en el README.

---

## 10. Lo que NO se exige en v1.0

Los siguientes ítems están **explícitamente fuera de alcance** para la entrega del proyecto final. Su ausencia **no penaliza la nota**:

| Ítem | Razón de exclusión |
|------|--------------------|
| Fine-tuning o RLHF del modelo base | Complejidad y costo desproporcionados para el alcance del curso |
| Interfaz de usuario frontend (web/mobile) | El foco es la arquitectura backend y el pipeline AI/LLM |
| Soporte multimodal (imágenes, audio, video) | Requiere infraestructura adicional fuera del alcance del módulo |
| SLA enterprise (> 99.9% uptime) | Los entornos de práctica no garantizan este nivel |
| Datos de producción real de una empresa | Restricciones legales y de privacidad |
| Integración con más de 3 fuentes de datos externas | Complejidad de conectores fuera del foco de aprendizaje |
| Multi-tenancy completo | Arquitectura adicional no cubierta en módulos previos |
| Estrategias avanzadas de caché distribuido | Optimización avanzada fuera del alcance del MVP |

---

## 11. Tabla Resumen de Umbrales

| Criterio | Umbral Mínimo Obligatorio | Umbral Recomendado (Excepcional) |
|----------|--------------------------|----------------------------------|
| Cobertura de pruebas unitarias | ≥ 60% | ≥ 80% |
| Latencia p95 (carga normal) | < 4 segundos | < 2 segundos |
| Endpoints de API operativos | 3 (`/query`, `/ingest`, `/health`) | 5+ (incluyendo `/sessions`, `/feedback`) |
| Métricas LLM reportadas (RAGAS) | 3 métricas | 5+ métricas |
| ADRs documentados | 2 | 4+ |
| Amenazas en modelo de seguridad | 4 | 6+ |
| Commits con mensajes descriptivos | 100% | 100% con Conventional Commits |
| Usuarios concurrentes probados (carga) | 10 | 50 |
| Fuentes de datos en pipeline RAG | 1 | 3+ |
| Tiempo de setup desde cero (README) | < 15 minutos | < 10 minutos |

---

*Programa AI-LLM Solution Architect | Curso 5: Proyecto Final | v1.0*
