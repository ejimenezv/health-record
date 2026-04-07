# Prompt 37: Create Final Documentation

## Objective
Create comprehensive, professional documentation that enables anyone to understand, install, run, and evaluate the system, meeting all BSG requirements for technical documentation excellence.

## Context
BSG requires:
- **README.md**: Must allow system reproduction in <15 minutes with clear instructions
- **PROJECT_DOCUMENTATION.md**: Complete BSG template without placeholders
- **OpenAPI specification**: Full API documentation in `docs/api/openapi.yaml`
- All documentation must reflect **real data** (not estimates or placeholders)
- Professional writing: clear, concise, technically accurate
- Results tables with actual metrics from testing and evaluation

This prompt completes the documentation deliverables for the BSG final submission.

## Tasks

### 1. Create Root README.md

**File:** `README.md` (project root)

**Content:**
```markdown
# MedRecord AI — Sistema de Gestión de Consultas Médicas con IA

> Transcripción automática, extracción de información médica y generación de notas SOAP mediante IA para consultas en español.

[![CI/CD](https://github.com/[usuario]/health-record/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/[usuario]/health-record/actions)
[![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Características](#características)
- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación](#instalación)
- [Uso](#uso)
- [Pruebas](#pruebas)
- [Resultados](#resultados)
- [Documentación Completa](#documentación-completa)
- [Video Demo](#video-demo)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Descripción

**MedRecord AI** es un sistema de gestión de consultas médicas que automatiza la transcripción de audio de consultas médicas (60 minutos en español), identifica hablantes (médico y paciente), extrae información médica estructurada (síntomas, diagnósticos, prescripciones) y genera notas clínicas en formato SOAP.

### Problema que Resuelve

Los médicos dedican ~20 minutos post-consulta a documentar manualmente cada encuentro clínico. Este tiempo administrativo:
- Reduce el número de pacientes atendidos por día en 30%
- Aumenta el burnout médico
- Introduce errores por transcripción manual tardía

### Solución con IA

MedRecord AI reduce el tiempo de documentación de **20 minutos a 2 minutos** (90% de reducción) mediante:
1. **Transcripción automática** con OpenAI Whisper (español médico)
2. **Diarización de hablantes** (VAD + validación LLM)
3. **Extracción médica** con GPT-4o (síntomas, diagnósticos, medicamentos, CIE-10)
4. **RAG** para validar interacciones medicamentosas y sugerir códigos CIE-10
5. **Generación automática** de nota SOAP estructurada

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS |
| **Backend** | Node.js 20 + Express 4 + TypeORM |
| **AI Service** | Python 3.11 + FastAPI + Celery + LangChain |
| **LLM** | OpenAI GPT-4o, GPT-4o-mini, Whisper API |
| **Vector Store** | ChromaDB (embeddings con text-embedding-3-large) |
| **Databases** | PostgreSQL 15 (datos), Redis 7 (cache + broker) |
| **Infrastructure** | AWS EC2 t3.medium + Docker Compose + Nginx + Terraform |
| **CI/CD** | GitHub Actions con quality gates (coverage, RAGAS, security) |

---

## Arquitectura

![Diagrama C4 Contenedor](docs/architecture/architecture-c4-container.png)

### Componentes Principales

- **Frontend React**: SPA para médicos (carga audio, WebSocket client para streaming en tiempo real)
- **Backend Node.js**: API REST + WebSocket Gateway para streaming bidireccional
- **AI Service FastAPI**: Transcripción, diarización, extracción, RAG, SOAP, WebSocket streaming
- **Celery Workers**: Procesamiento asíncrono de audio batch (tareas de 2-5 minutos)
- **PostgreSQL**: Almacenamiento de usuarios, sesiones, consultas, extracciones, eventos persistidos
- **ChromaDB**: Vector store para RAG (50k documentos médicos: guías, CIE-10, vademécums)
- **Redis**: Cache LLM (24h TTL) + broker Celery + session state + event buffering (60s)
- **Nginx**: Reverse proxy, SSL termination (Let's Encrypt), WebSocket proxy, rate limiting

**Modos de Operación:**
- **Batch**: Procesamiento post-consulta (audio completo, mayor precisión)
- **Real-Time**: Streaming durante consulta (WebSocket, latencia < 2s, alertas < 1s)

Ver [Documentación de Arquitectura Completa](docs/architecture/README.md)

---

## Características

### ✅ Implementadas

- [x] **Transcripción automática** de audio médico (español) con Whisper API
- [x] **Diarización de hablantes** (Doctor/Paciente) con VAD + LLM validation
- [x] **Extracción médica estructurada**:
  - Síntomas y signos vitales
  - Diagnósticos (principal + diferenciales)
  - Prescripciones farmacológicas
  - Indicaciones y contraindicaciones
  - Clasificación CIE-10 automática
- [x] **RAG** con ChromaDB para:
  - Validación de interacciones medicamentosas
  - Sugerencias de códigos CIE-10
  - Consulta de guías clínicas
- [x] **Generación automática** de notas SOAP (Subjetivo, Objetivo, Análisis, Plan)
- [x] **Streaming en tiempo real** via WebSocket:
  - Transcripción en vivo (latencia < 2s)
  - Extracción incremental de entidades (latencia < 3s)
  - Entity matching para evitar duplicados y actualizar información
  - Alertas críticas inmediatas para interacciones medicamentosas (< 1s)
  - Reconexión automática con event replay (60s buffer)
- [x] **Optimización de costos**:
  - Selección dinámica de modelos (GPT-4o-mini / GPT-4o / GPT-4-turbo)
  - Cache de respuestas LLM (Redis, 24h TTL)
  - Buffering inteligente VAD (20-30% ahorro vs. streaming puro)
  - Degradación automática si presupuesto >80% usado
- [x] **Observabilidad**:
  - Logging estructurado (JSON)
  - Tracking de costos por consulta
  - Métricas de latencia y tokens consumidos
  - Monitoreo de WebSocket connections
- [x] **CI/CD** con GitHub Actions:
  - Quality gates (coverage >80%, RAGAS metrics)
  - Security scanning (bandit, pip-audit)
  - Real-time component tests (WebSocket, Event Persistence)
  - Deployment automatizado a staging/production
- [x] **Deployment cloud** en AWS EC2 con Terraform IaC

### 🚧 Roadmap (v2.0)

- [ ] Soporte multimodal (imágenes médicas, radiografías)
- [ ] Fine-tuning de modelo con datos propios
- [ ] Multi-tenancy para múltiples clínicas
- [ ] Integración con sistemas EMR/EHR (HL7 FHIR)
- [ ] App móvil para grabación de consultas

---

## Requisitos del Sistema

### Para Desarrollo Local

- **Sistema Operativo**: Ubuntu 22.04+, macOS 13+, Windows 11 (con WSL2)
- **Software**:
  - Docker 24.0+ y Docker Compose 2.20+
  - Node.js 20+ y pnpm 8+
  - Python 3.11+ (para desarrollo del AI service)
  - Git 2.40+
- **Hardware**:
  - Mínimo: 8 GB RAM, 4 vCPUs, 20 GB espacio en disco
  - Recomendado: 16 GB RAM, 8 vCPUs, 50 GB SSD
- **Cuentas Externas**:
  - Cuenta OpenAI con API key (necesita créditos para Whisper y GPT-4o)
  - Cuenta GitHub (para CI/CD)
  - Cuenta AWS (opcional, solo para deployment cloud)

### Para Deployment en Cloud (AWS)

- AWS Account con acceso programático (IAM user con permisos EC2, VPC, Route53)
- Dominio DNS (opcional, se puede usar IP pública)
- Terraform 1.5+ instalado localmente

---

## Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/[usuario]/health-record.git
cd health-record
```

### 2. Configurar Variables de Entorno

```bash
# Copiar plantilla de variables de entorno
cp .env.example .env

# Editar .env con tus credenciales reales
nano .env
```

**Variables obligatorias en `.env`:**

```bash
# OpenAI API
OPENAI_API_KEY=sk-...                    # Tu API key de OpenAI

# Databases
POSTGRES_USER=medrecord_user
POSTGRES_PASSWORD=[password-seguro]
POSTGRES_DB=medrecord_db
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Redis
REDIS_URL=redis://redis:6379/0

# ChromaDB
CHROMA_HOST=chromadb
CHROMA_PORT=8000

# AI Service
AI_SERVICE_URL=http://ai-service:8000
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# Backend
JWT_SECRET=[generar-secret-aleatorio-32-chars]
SESSION_SECRET=[generar-secret-aleatorio-32-chars]

# Presupuesto y optimización
MONTHLY_BUDGET_USD=200
COST_ALERT_THRESHOLD=0.8                 # Alertar al 80% del presupuesto
```

### 3. Levantar el Entorno de Desarrollo

```bash
# Opción A: Usar Makefile (recomendado)
make install      # Instala dependencias
make dev          # Levanta todos los servicios

# Opción B: Docker Compose directo
docker-compose up -d
```

**Servicios levantados:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- AI Service API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs
- PostgreSQL: localhost:5432
- ChromaDB: http://localhost:8001
- Redis: localhost:6379

### 4. Verificar la Instalación

```bash
# Health check de todos los servicios
make health

# Output esperado:
# ✅ Frontend: OK
# ✅ Backend: OK
# ✅ AI Service: OK
# ✅ PostgreSQL: OK
# ✅ Redis: OK
# ✅ ChromaDB: OK
```

### 5. Cargar Datos de Conocimiento (RAG)

```bash
# Ejecutar script de ingesta de documentos médicos
make ingest-knowledge

# Este proceso carga:
# - 15,000 entradas de CIE-10 (códigos de diagnóstico)
# - 8,000 fichas de vademécum farmacológico
# - 120 guías clínicas en español
# Tiempo estimado: 10-15 minutos
```

---

## Uso

### Flujo Completo: De Audio a Nota SOAP

MedRecord AI soporta dos modos de operación:

#### Modo 1: Batch Processing (Post-Consulta)

**Frontend:**
```
1. Login en http://localhost:3001
2. Click en "Nueva Consulta" → "Subir Audio"
3. Subir archivo MP3/WAV (máx. 200 MB, hasta 60 min)
4. Click en "Procesar Consulta"
5. Esperar 2-3 minutos para procesamiento completo
```

**API (alternativa):**
```bash
curl -X POST http://localhost:3000/api/consultations/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@consulta-ejemplo.mp3" \
  -F "patientId=123"
```

#### Modo 2: Real-Time Streaming (Durante Consulta)

**Frontend:**
```
1. Login en http://localhost:3001
2. Click en "Nueva Consulta" → "Iniciar Grabación en Vivo"
3. Permitir acceso al micrófono
4. Hablar - transcripción aparece en tiempo real (< 2s)
5. Ver entidades extraídas mientras se mencionan (< 3s)
6. Recibir alertas inmediatas de interacciones medicamentosas (< 1s)
7. Click en "Finalizar Consulta" para generar nota SOAP completa
```

**WebSocket API (para integraciones):**
```javascript
// 1. Crear sesión de streaming
const response = await fetch('/api/v1/sessions/stream', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { sessionId, wsUrl } = await response.json();

// 2. Conectar WebSocket
const ws = new WebSocket(wsUrl);

// 3. Enviar audio chunks (Opus encoded)
ws.send(JSON.stringify({
  type: 'audio_chunk',
  data: base64AudioChunk,
  timestamp: Date.now()
}));

// 4. Recibir eventos en tiempo real
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.event) {
    case 'transcription_update':
      updateTranscription(msg.data.text, msg.data.speaker);
      break;
    case 'symptom_extracted':
      addSymptom(msg.data);
      break;
    case 'interaction_warning':
      showCriticalAlert(msg.data); // < 1s latency
      break;
  }
};

// 5. Manejar reconexión
ws.onclose = () => {
  // Reconectar con last_event_id para replay
  reconnectWithEventReplay(lastEventId);
};
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "status": "processing",
  "estimatedTime": "120-180 seconds"
}
```

#### 2. Monitorear Estado de Procesamiento

**Polling (automático en frontend):**
```bash
# El frontend hace polling cada 5 segundos
GET /api/ai/sessions/{sessionId}
```

**Response (en procesamiento):**
```json
{
  "sessionId": "sess_abc123xyz",
  "status": "processing",
  "progress": {
    "transcription": "completed",
    "diarization": "in_progress",
    "extraction": "pending",
    "rag": "pending",
    "soap": "pending"
  }
}
```

#### 3. Obtener Resultados Completos

**Response (completado):**
```json
{
  "sessionId": "sess_abc123xyz",
  "status": "completed",
  "transcription": {
    "text": "DOCTOR: Buenos días, ¿cómo se encuentra hoy?\nPACIENTE: Hola doctor...",
    "segments": [
      {"speaker": "DOCTOR", "text": "Buenos días, ¿cómo se encuentra hoy?", "timestamp": 0.5},
      {"speaker": "PACIENTE", "text": "Hola doctor...", "timestamp": 3.2}
    ],
    "duration": 3542.1,
    "language": "es"
  },
  "extraction": {
    "symptoms": [
      {
        "name": "Cefalea",
        "severity": "moderada",
        "duration": "3 días",
        "description": "Dolor frontal bilateral, pulsátil"
      }
    ],
    "diagnoses": {
      "principal": {
        "name": "Cefalea tensional",
        "cie10": "G44.2",
        "confidence": 0.89
      },
      "differential": [
        {"name": "Migraña sin aura", "cie10": "G43.0", "confidence": 0.45}
      ]
    },
    "prescriptions": [
      {
        "medication": "Ibuprofeno",
        "dose": "400 mg",
        "frequency": "cada 8 horas",
        "duration": "5 días",
        "via": "oral",
        "interactions": []
      }
    ],
    "vitalSigns": {
      "bloodPressure": "120/80 mmHg",
      "heartRate": "72 bpm",
      "temperature": "36.5°C"
    }
  },
  "soap": {
    "subjective": "Paciente de 35 años que refiere cefalea frontal bilateral...",
    "objective": "PA: 120/80 mmHg, FC: 72 lpm, T: 36.5°C. Examen neurológico sin alteraciones...",
    "assessment": "Cefalea tensional (CIE-10: G44.2)",
    "plan": "1. Ibuprofeno 400mg c/8h VO x 5 días\n2. Control en 7 días si no mejora\n3. Evitar estrés..."
  },
  "costs": {
    "transcription": 0.18,
    "extraction": 0.12,
    "rag": 0.03,
    "total": 0.33,
    "currency": "USD"
  },
  "latency": {
    "transcription": 78.2,
    "extraction": 12.4,
    "rag": 3.1,
    "total": 156.8,
    "unit": "seconds"
  }
}
```

### Consultar Dashboard de Costos

```bash
curl http://localhost:3000/api/costs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "period": "2025-01",
  "totalCost": 18.45,
  "budget": 200.00,
  "percentUsed": 9.2,
  "projectedMonthly": 55.35,
  "breakdown": {
    "whisper": 8.20,
    "gpt4o": 7.15,
    "gpt4o-mini": 2.30,
    "embeddings": 0.80
  },
  "consultationsProcessed": 52,
  "avgCostPerConsultation": 0.35,
  "cacheHitRate": 0.42
}
```

---

## Pruebas

### Suite Completa de Pruebas

```bash
# Ejecutar todas las pruebas (unit + integration + load)
make test

# Pruebas unitarias con coverage
make test-unit

# Pruebas de integración
make test-integration

# Pruebas de carga (Locust)
make test-load

# Evaluación RAGAS (calidad LLM)
make test-ragas
```

### Resultados de Coverage

```bash
# Generar reporte de cobertura
make coverage

# Ver reporte HTML
open reports/coverage/index.html
```

**Target de cobertura:** ≥80% (actualmente: 82%)

### Evaluación de Calidad LLM (RAGAS)

```bash
# Ejecutar evaluación RAGAS con dataset de 50 casos médicos
cd ai-service
pytest tests/evaluation/test_ragas.py --verbose

# Ver reporte detallado
cat reports/ragas_results.json
```

**Métricas objetivo:**
- Faithfulness: >0.85 (actual: 0.91)
- Answer Relevancy: >0.80 (actual: 0.87)
- Context Precision: >0.75 (actual: 0.82)
- Context Recall: >0.75 (actual: 0.79)

---

## Resultados

### Métricas de Rendimiento

| Métrica | Meta Objetivo | Resultado Obtenido | Estado |
|---------|--------------|-------------------|--------|
| **Latencia p95 (transcripción completa - batch)** | < 3 minutos | 2.8 minutos | ✅ Logrado |
| **Latencia p95 (transcripción real-time)** | < 2 segundos | 1.8 segundos | ✅ Logrado |
| **Latencia p95 (extracción real-time)** | < 3 segundos | 2.5 segundos | ✅ Logrado |
| **Latencia p95 (alertas críticas)** | < 1 segundo | 0.7 segundos | ✅ Logrado |
| **Latencia p95 (consulta RAG)** | < 3 segundos | 1.9 segundos | ✅ Logrado |
| **Cobertura de pruebas** | > 80% | 82% | ✅ Logrado |
| **Faithfulness (RAGAS)** | > 0.85 | 0.91 | ✅ Logrado |
| **Answer Relevancy (RAGAS)** | > 0.80 | 0.87 | ✅ Logrado |
| **Context Precision (RAGAS)** | > 0.75 | 0.82 | ✅ Logrado |
| **Costo por consulta (batch)** | < $0.35 | $0.23 | ✅ Logrado |
| **Costo por consulta (real-time)** | < $0.35 | $0.28 | ✅ Logrado |
| **Precisión de diarización (batch)** | > 85% | 92% | ✅ Logrado |
| **Precisión de diarización (real-time)** | > 85% | 87% | ✅ Logrado |

### Análisis de Costos Reales (Enero 2025)

| Servicio | Costo/Mes | % del Total | Optimizaciones Aplicadas |
|----------|-----------|------------|-------------------------|
| OpenAI Whisper (transcripción) | $8.20 | 44% | Cache de transcripciones (24h TTL) |
| OpenAI GPT-4o (extracción) | $7.15 | 39% | Selección dinámica de modelo (tiers) |
| OpenAI GPT-4o-mini (validaciones) | $2.30 | 12% | Usado para tareas simples (80% reduction vs GPT-4o) |
| OpenAI Embeddings | $0.80 | 4% | Cache de embeddings (7 días TTL) |
| **Total Mensual** | **$18.45** | **100%** | **90.8% bajo presupuesto ($200/mes)** |

**Consultas procesadas:** 52 (promedio: $0.35/consulta)

---

## Documentación Completa

| Documento | Descripción | Ubicación |
|-----------|-------------|-----------|
| **Documentación Técnica Completa** | Plantilla BSG completa con todas las secciones | [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) |
| **Architecture Decision Records (ADRs)** | Decisiones arquitectónicas con trade-offs (incluye ADR-006 Real-Time) | [docs/adr/](docs/adr/) |
| **Diagramas de Arquitectura** | C4 (Contexto + Contenedor), Secuencia Batch, Secuencia Real-Time, Multi-Cloud | [docs/architecture/](docs/architecture/) |
| **Especificación OpenAPI** | API REST + WebSocket completa con schemas y ejemplos | [docs/api/openapi.yaml](docs/api/openapi.yaml) |
| **Guía de Deployment en AWS** | Terraform, EC2, Docker Compose, Nginx (WebSocket proxy), SSL | [infrastructure/aws/README.md](infrastructure/aws/README.md) |
| **Notebooks de Evaluación** | RAGAS, benchmarks, análisis de costos (batch + real-time) | [notebooks/](notebooks/) |
| **Makefile Commands** | Todos los comandos disponibles | [Makefile](Makefile) |

---

## Video Demo

🎥 **[Ver Presentación del Proyecto (28 minutos)](https://youtube.com/watch?v=XXXXX)**

**Contenido del video:**
- Demo funcional del sistema en AWS (0:00 - 10:00)
- Explicación de arquitectura y decisiones técnicas (10:00 - 18:00)
- Resultados de evaluación RAGAS y análisis de costos (18:00 - 23:00)
- Reflexión crítica y trabajo futuro (23:00 - 28:00)

---

## Contribución

Este es un proyecto académico para el curso **AI-LLM Solution Architect (BSG)**. No se aceptan contribuciones externas en esta versión.

Para reportar issues o sugerencias:
- Abrir un issue en GitHub: [Issues](https://github.com/[usuario]/health-record/issues)

---

## Licencia

MIT License - ver archivo [LICENSE](LICENSE) para detalles.

---

## Equipo

**Autor:** [Tu Nombre]
**Instructor:** [Nombre del Instructor]
**Cohorte:** BSG AI-LLM Solution Architect 2025-A
**Entrega Final:** DD/MM/2025

---

## Agradecimientos

- **OpenAI** por las APIs de Whisper y GPT-4o
- **LangChain** por el framework de orquestación LLM
- **ChromaDB** por el vector store open-source
- **BSG (Business School for Growth)** por el curso AI-LLM Solution Architect
```

---

### 2. Create PROJECT_DOCUMENTATION.md

**File:** `docs/PROJECT_DOCUMENTATION.md`

Use the **AI_LLM_Project_Template.md** as base and fill ALL sections with real data.

**Key sections to complete:**

```markdown
# MedRecord AI — Documentación Técnica Completa

[Copy complete template from AI_LLM_Project_Template.md and fill in EVERY section]

## 1. Resumen Ejecutivo

### 1.1 Propuesta de Valor y Problema que Resuelve

Los médicos en consultas ambulatorias dedican en promedio 18-22 minutos por paciente en tareas administrativas post-consulta (documentación de historia clínica, recetas, notas de evolución). Esto representa:
- 40% del tiempo total de trabajo del médico destinado a documentación
- Reducción del 30% en la capacidad de atención de pacientes
- Incremento del burnout médico en 45% según estudios de 2024
- Errores de transcripción manual que afectan al 15% de las prescripciones

MedRecord AI aborda este problema automatizando la transcripción y documentación médica mediante:
- Transcripción automática de audio de consulta (60 min) con 95% precisión
- Extracción estructurada de información médica (síntomas, diagnósticos, tratamiento)
- Generación automática de nota SOAP revisable por el médico
- Reducción del tiempo de documentación de 20 minutos a 2 minutos (90% reducción)

**ROI esperado:**
- Por médico: +3 pacientes/día adicionales = +60 pacientes/mes
- Incremento de ingresos: $15,000 USD/año por médico
- Costo del sistema: $200/mes = $2,400/año
- ROI: 525% anual

[Continue filling all sections with real data from the project...]

### 1.2 Alcance y Delimitación

[Use the table format from template and fill with project-specific scope]

### 1.3 Indicadores Clave de Éxito (KPIs del Proyecto)

[Fill with ACTUAL results from testing]

## 2. Análisis y Especificación de Requerimientos

[Import from prompts 03-04, ensure consistency]

## 3. Diseño de Arquitectura AI/LLM

[Reference ADRs and diagrams created in prompts 35-36]

## 4. Diseño de APIs y Conectores

[Import OpenAPI spec created below]

## 5. Seguridad, Cumplimiento y Ética

[Complete with threat model, security measures]

## 6. Implementación y Configuración de Infraestructura

[Reference infrastructure/ folder and Terraform configs]

## 7. Estrategia de Pruebas y Resultados

[Import ACTUAL test results from reports/ folder]

## 8. Despliegue, Escalabilidad y Costos

[Fill with REAL cost data from AWS bill + cost tracker]

## 9. Observabilidad y Monitoreo

[Document actual logging, metrics, dashboards implemented]

## 10. Resultados, Conclusiones y Trabajo Futuro

[Honest reflection on what worked, what didn't, lessons learned]
```

**Critical:** Every placeholder `[XXX]` or `[Completar al final]` in the template MUST be replaced with real data. No section can be left incomplete.

---

### 3. Create OpenAPI Specification

**File:** `docs/api/openapi.yaml`

**Content:**
```yaml
openapi: 3.1.0
info:
  title: MedRecord AI API
  description: |
    API REST para sistema de gestión de consultas médicas con transcripción automática y extracción de información mediante IA.

    **Características:**
    - Transcripción automática de audio médico (OpenAI Whisper)
    - Diarización de hablantes (Doctor/Paciente)
    - Extracción médica estructurada (síntomas, diagnósticos, prescripciones)
    - RAG para validación de interacciones medicamentosas y CIE-10
    - Generación automática de notas SOAP

    **Arquitectura:**
    - Backend: Node.js + Express + TypeORM
    - AI Service: Python + FastAPI + Celery
    - Databases: PostgreSQL + ChromaDB + Redis
  version: 1.0.0
  contact:
    name: "[Tu Nombre]"
    email: "[tu.email@ejemplo.com]"
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000
    description: Desarrollo local
  - url: https://api.medrecord-ai.ejemplo.com
    description: Producción (AWS EC2)

security:
  - BearerAuth: []

tags:
  - name: Authentication
    description: Registro e inicio de sesión
  - name: AI Processing
    description: Transcripción, extracción, RAG (batch)
  - name: Real-Time Streaming
    description: WebSocket para streaming en tiempo real
  - name: Consultations
    description: Gestión de consultas médicas
  - name: Costs
    description: Monitoreo de costos y uso de API
  - name: Operations
    description: Health checks, métricas

paths:
  # ===== AUTHENTICATION =====
  /api/auth/register:
    post:
      tags: [Authentication]
      summary: Registrar nuevo usuario
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, name]
              properties:
                email:
                  type: string
                  format: email
                  example: doctor@ejemplo.com
                password:
                  type: string
                  format: password
                  minLength: 8
                  example: SecurePass123!
                name:
                  type: string
                  example: Dr. Juan Pérez
                role:
                  type: string
                  enum: [doctor, admin]
                  default: doctor
      responses:
        '201':
          description: Usuario registrado exitosamente
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
                    example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Email ya registrado

  /api/auth/login:
    post:
      tags: [Authentication]
      summary: Iniciar sesión
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  format: password
      responses:
        '200':
          description: Login exitoso
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
        '401':
          $ref: '#/components/responses/Unauthorized'

  # ===== AI PROCESSING =====
  /api/ai/sessions:
    post:
      tags: [AI Processing]
      summary: Crear sesión de procesamiento de audio
      description: |
        Crea una nueva sesión de procesamiento y encola la tarea de transcripción en Celery.
        El audio se procesa de forma asíncrona. Usar GET /api/ai/sessions/{id} para consultar estado.
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [audio]
              properties:
                audio:
                  type: string
                  format: binary
                  description: Archivo de audio (MP3, WAV, M4A, max 200MB)
                patientId:
                  type: string
                  format: uuid
                  description: ID del paciente (opcional)
                metadata:
                  type: object
                  description: Metadatos adicionales (fecha, notas, etc.)
      responses:
        '201':
          description: Sesión creada, procesamiento iniciado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionCreated'
        '400':
          description: Archivo inválido o muy grande
        '429':
          description: Límite de rate exceeded

  # ===== REAL-TIME STREAMING =====
  /api/v1/sessions/stream:
    post:
      tags: [Real-Time Streaming]
      summary: Crear sesión de streaming en tiempo real
      description: |
        Crea una nueva sesión para streaming de audio en tiempo real via WebSocket.
        Retorna el session_id y la URL del WebSocket para conectar.
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                patientId:
                  type: string
                  format: uuid
                  description: ID del paciente (opcional)
                metadata:
                  type: object
                  description: Metadatos adicionales
      responses:
        '201':
          description: Sesión de streaming creada
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessionId:
                    type: string
                    example: sess_rt_abc123
                  wsUrl:
                    type: string
                    example: wss://api.medrecord-ai.ejemplo.com/ws/session/sess_rt_abc123
                  status:
                    type: string
                    enum: [created]
                  expiresAt:
                    type: string
                    format: date-time
                    description: Sesión expira si no se conecta en 5 minutos
        '429':
          description: Límite de sesiones concurrentes alcanzado

  /ws/session/{sessionId}:
    get:
      tags: [Real-Time Streaming]
      summary: WebSocket para streaming bidireccional (documentación)
      description: |
        **Nota**: Este es un endpoint WebSocket, no REST. Se documenta aquí para referencia.

        **Conexión:**
        ```
        ws://localhost:3001/ws/session/{sessionId}
        wss://api.medrecord-ai.ejemplo.com/ws/session/{sessionId}
        ```

        **Handshake headers:**
        - `Authorization: Bearer {jwt_token}`
        - `X-Last-Event-Id: {event_id}` (para reconexión)

        **Mensajes Cliente → Servidor:**

        ```json
        // Audio chunk (enviar cada 20ms)
        {
          "type": "audio_chunk",
          "data": "<base64_opus_audio>",
          "timestamp": 1234567890123
        }

        // Finalizar sesión
        {
          "type": "end_session"
        }

        // Ping (keepalive)
        {
          "type": "ping"
        }
        ```

        **Mensajes Servidor → Cliente:**

        ```json
        // Transcripción actualizada (latencia < 2s)
        {
          "event": "transcription_update",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_001",
          "timestamp": 1234567890123,
          "data": {
            "chunk_index": 15,
            "text": "Me duele la cabeza desde hace tres días",
            "speaker": "PACIENTE",
            "is_final": true,
            "confidence": 0.95
          }
        }

        // Síntoma extraído (latencia < 3s)
        {
          "event": "symptom_extracted",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_002",
          "timestamp": 1234567890123,
          "data": {
            "id": "sym_abc123",
            "name": "Cefalea",
            "severity": "moderada",
            "duration": "3 días",
            "location": "cabeza",
            "action": "created"
          }
        }

        // Síntoma actualizado (entity matching)
        {
          "event": "symptom_updated",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_003",
          "timestamp": 1234567890123,
          "data": {
            "id": "sym_abc123",
            "action": "updated",
            "changes": {
              "severity": {"old": "moderada", "new": "grave"},
              "location": {"old": "cabeza", "new": "cabeza frontal"}
            },
            "reason": "Patient clarified symptom"
          }
        }

        // Diagnóstico detectado
        {
          "event": "diagnosis_detected",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_004",
          "timestamp": 1234567890123,
          "data": {
            "id": "diag_xyz789",
            "name": "Cefalea tensional",
            "cie10": "G44.2",
            "confidence": 0.89,
            "is_principal": true
          }
        }

        // Prescripción añadida
        {
          "event": "prescription_added",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_005",
          "timestamp": 1234567890123,
          "data": {
            "id": "rx_def456",
            "medication": "Ibuprofeno",
            "dose": "400 mg",
            "frequency": "cada 8 horas",
            "duration": "5 días",
            "via": "oral"
          }
        }

        // ⚠️ ALERTA CRÍTICA: Interacción medicamentosa (latencia < 1s)
        {
          "event": "interaction_warning",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_006",
          "timestamp": 1234567890123,
          "data": {
            "severity": "MAJOR",
            "medications": ["Ibuprofeno", "Warfarina"],
            "description": "Ibuprofeno puede potenciar efecto anticoagulante de Warfarina",
            "recommendation": "Monitorizar INR. Considerar paracetamol como alternativa",
            "source": "DrugBank"
          }
        }

        // Entidad validada por RAG
        {
          "event": "entity_validated",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_007",
          "timestamp": 1234567890123,
          "data": {
            "entity_id": "diag_xyz789",
            "entity_type": "diagnosis",
            "validation": {
              "cie10_confirmed": true,
              "suggested_codes": ["G44.2", "G43.0"],
              "sources": ["CIE-10 2024", "Guía Clínica Cefaleas"]
            }
          }
        }

        // Sesión completada
        {
          "event": "session_complete",
          "session_id": "sess_rt_abc123",
          "event_id": "evt_final",
          "timestamp": 1234567890123,
          "data": {
            "duration_seconds": 3542,
            "soap": {
              "subjective": "...",
              "objective": "...",
              "assessment": "...",
              "plan": "..."
            },
            "costs": {
              "transcription": 0.18,
              "extraction": 0.08,
              "rag": 0.02,
              "total": 0.28
            }
          }
        }

        // Error
        {
          "event": "error",
          "session_id": "sess_rt_abc123",
          "timestamp": 1234567890123,
          "data": {
            "code": "TRANSCRIPTION_ERROR",
            "message": "Failed to process audio chunk",
            "recoverable": true
          }
        }
        ```

        **Códigos de error WebSocket:**
        - 4000: Invalid session
        - 4001: Session expired
        - 4002: Authentication failed
        - 4003: Rate limit exceeded
        - 4004: Invalid message format
        - 4005: Audio codec error
        - 4006: Server overloaded
        - 4007: Session already connected
        - 4008: Reconnection window expired (>60s)
        - 4009: Internal error

        **Reconexión:**
        Si la conexión se pierde, el cliente puede reconectar dentro de 60 segundos
        enviando `X-Last-Event-Id` header. El servidor reenviará todos los eventos
        posteriores a ese ID desde el buffer de Redis.
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            example: sess_rt_abc123
      responses:
        '101':
          description: Switching Protocols (WebSocket upgrade)
        '400':
          description: Invalid session ID
        '401':
          description: Authentication required
        '404':
          description: Session not found or expired

  /api/ai/sessions/{sessionId}:
    get:
      tags: [AI Processing]
      summary: Obtener estado de sesión de procesamiento
      description: |
        Consulta el estado actual de una sesión de procesamiento.
        Estados: "processing", "completed", "failed"
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            example: sess_abc123xyz
      responses:
        '200':
          description: Estado de la sesión
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/SessionProcessing'
                  - $ref: '#/components/schemas/SessionCompleted'
                  - $ref: '#/components/schemas/SessionFailed'
        '404':
          description: Sesión no encontrada

  /api/ai/query:
    post:
      tags: [AI Processing]
      summary: Consulta RAG (Retrieval-Augmented Generation)
      description: |
        Envía una consulta médica y obtiene respuesta generada por el LLM con contexto recuperado
        del vector store (guías clínicas, CIE-10, vademécums).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [query]
              properties:
                query:
                  type: string
                  minLength: 5
                  maxLength: 2048
                  example: "¿Cuáles son las contraindicaciones del ibuprofeno en pacientes con hipertensión?"
                filters:
                  type: object
                  description: Filtros opcionales para la búsqueda vectorial
                  properties:
                    documentType:
                      type: string
                      enum: [guia_clinica, vademecum, cie10]
                    specialty:
                      type: string
                      example: cardiologia
                topK:
                  type: integer
                  minimum: 1
                  maximum: 20
                  default: 5
                  description: Número de documentos a recuperar
      responses:
        '200':
          description: Respuesta generada exitosamente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RAGResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalError'

  # ===== CONSULTATIONS =====
  /api/consultations:
    get:
      tags: [Consultations]
      summary: Listar consultas del médico
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 10
            maximum: 100
            default: 20
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, completed, reviewed]
      responses:
        '200':
          description: Lista de consultas
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Consultation'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

  /api/consultations/{id}:
    get:
      tags: [Consultations]
      summary: Obtener detalles de consulta
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Detalles de la consulta
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Consultation'
        '404':
          description: Consulta no encontrada

  # ===== COSTS =====
  /api/costs:
    get:
      tags: [Costs]
      summary: Dashboard de costos y uso de API
      description: |
        Retorna resumen de costos de OpenAI API (Whisper, GPT-4o, Embeddings) con:
        - Costos por servicio
        - Proyección mensual
        - Presupuesto restante
        - Cache hit rate (ahorros)
        - Costo promedio por consulta
      parameters:
        - name: period
          in: query
          schema:
            type: string
            pattern: '^\d{4}-\d{2}$'
            example: "2025-01"
            default: "current month"
      responses:
        '200':
          description: Resumen de costos
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CostsDashboard'

  # ===== OPERATIONS =====
  /api/health:
    get:
      tags: [Operations]
      summary: Health check del sistema
      security: []
      responses:
        '200':
          description: Sistema operando normalmente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'
        '503':
          description: Sistema degradado o no disponible

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtenido en /api/auth/login

  schemas:
    # ===== USERS & AUTH =====
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [doctor, admin]
        createdAt:
          type: string
          format: date-time

    # ===== AI PROCESSING =====
    SessionCreated:
      type: object
      properties:
        sessionId:
          type: string
          example: sess_abc123xyz
        status:
          type: string
          enum: [processing]
        estimatedTime:
          type: string
          example: "120-180 seconds"
        pollUrl:
          type: string
          example: "/api/ai/sessions/sess_abc123xyz"

    SessionProcessing:
      type: object
      properties:
        sessionId:
          type: string
        status:
          type: string
          enum: [processing]
        progress:
          type: object
          properties:
            transcription:
              type: string
              enum: [pending, in_progress, completed]
            diarization:
              type: string
              enum: [pending, in_progress, completed]
            extraction:
              type: string
              enum: [pending, in_progress, completed]
            rag:
              type: string
              enum: [pending, in_progress, completed]
            soap:
              type: string
              enum: [pending, in_progress, completed]

    SessionCompleted:
      type: object
      properties:
        sessionId:
          type: string
        status:
          type: string
          enum: [completed]
        transcription:
          $ref: '#/components/schemas/Transcription'
        extraction:
          $ref: '#/components/schemas/MedicalExtraction'
        soap:
          $ref: '#/components/schemas/SOAPNote'
        costs:
          $ref: '#/components/schemas/SessionCosts'
        latency:
          $ref: '#/components/schemas/SessionLatency'

    SessionFailed:
      type: object
      properties:
        sessionId:
          type: string
        status:
          type: string
          enum: [failed]
        error:
          type: object
          properties:
            code:
              type: string
              example: "TRANSCRIPTION_ERROR"
            message:
              type: string
              example: "Audio file is corrupted or unsupported format"
            details:
              type: object

    Transcription:
      type: object
      properties:
        text:
          type: string
          example: "DOCTOR: Buenos días, ¿cómo se encuentra hoy?\nPACIENTE: Hola doctor..."
        segments:
          type: array
          items:
            type: object
            properties:
              speaker:
                type: string
                enum: [DOCTOR, PACIENTE]
              text:
                type: string
              timestamp:
                type: number
                description: Timestamp en segundos desde el inicio
        duration:
          type: number
          description: Duración del audio en segundos
        language:
          type: string
          example: "es"

    MedicalExtraction:
      type: object
      properties:
        symptoms:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
                example: "Cefalea"
              severity:
                type: string
                enum: [leve, moderada, grave]
              duration:
                type: string
                example: "3 días"
              description:
                type: string
        diagnoses:
          type: object
          properties:
            principal:
              type: object
              properties:
                name:
                  type: string
                  example: "Cefalea tensional"
                cie10:
                  type: string
                  example: "G44.2"
                confidence:
                  type: number
                  minimum: 0
                  maximum: 1
            differential:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  cie10:
                    type: string
                  confidence:
                    type: number
        prescriptions:
          type: array
          items:
            type: object
            properties:
              medication:
                type: string
                example: "Ibuprofeno"
              dose:
                type: string
                example: "400 mg"
              frequency:
                type: string
                example: "cada 8 horas"
              duration:
                type: string
                example: "5 días"
              via:
                type: string
                enum: [oral, intravenosa, intramuscular, tópica, sublingual]
              interactions:
                type: array
                items:
                  type: object
                  properties:
                    medication:
                      type: string
                    severity:
                      type: string
                      enum: [leve, moderada, grave]
                    description:
                      type: string
        vitalSigns:
          type: object
          properties:
            bloodPressure:
              type: string
              example: "120/80 mmHg"
            heartRate:
              type: string
              example: "72 bpm"
            temperature:
              type: string
              example: "36.5°C"

    SOAPNote:
      type: object
      properties:
        subjective:
          type: string
          description: "Síntomas y quejas del paciente"
        objective:
          type: string
          description: "Hallazgos objetivos (signos vitales, examen físico)"
        assessment:
          type: string
          description: "Diagnóstico principal y diferenciales"
        plan:
          type: string
          description: "Plan terapéutico y seguimiento"

    SessionCosts:
      type: object
      properties:
        transcription:
          type: number
          example: 0.18
          description: "Costo de transcripción Whisper (USD)"
        extraction:
          type: number
          example: 0.12
          description: "Costo de extracción GPT-4o (USD)"
        rag:
          type: number
          example: 0.03
          description: "Costo de consultas RAG (USD)"
        total:
          type: number
          example: 0.33
        currency:
          type: string
          enum: [USD]

    SessionLatency:
      type: object
      properties:
        transcription:
          type: number
          example: 78.2
          description: "Latencia de transcripción (segundos)"
        extraction:
          type: number
          example: 12.4
        rag:
          type: number
          example: 3.1
        total:
          type: number
          example: 156.8
        unit:
          type: string
          enum: [seconds]

    RAGResponse:
      type: object
      properties:
        response:
          type: string
          description: "Respuesta generada por el LLM"
          example: "El ibuprofeno está contraindicado en pacientes con hipertensión mal controlada..."
        sources:
          type: array
          items:
            type: object
            properties:
              documentId:
                type: string
              title:
                type: string
                example: "Guía Clínica de AINE en Hipertensión"
              chunkText:
                type: string
              similarityScore:
                type: number
                minimum: 0
                maximum: 1
              metadata:
                type: object
        tokensUsed:
          type: integer
          example: 1250
        latency:
          type: number
          example: 1.8
          description: "Latencia en segundos"

    # ===== CONSULTATIONS =====
    Consultation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        patientId:
          type: string
          format: uuid
        doctorId:
          type: string
          format: uuid
        sessionId:
          type: string
        status:
          type: string
          enum: [draft, completed, reviewed]
        transcription:
          $ref: '#/components/schemas/Transcription'
        extraction:
          $ref: '#/components/schemas/MedicalExtraction'
        soap:
          $ref: '#/components/schemas/SOAPNote'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    # ===== COSTS =====
    CostsDashboard:
      type: object
      properties:
        period:
          type: string
          example: "2025-01"
        totalCost:
          type: number
          example: 18.45
        budget:
          type: number
          example: 200.00
        percentUsed:
          type: number
          example: 9.2
        projectedMonthly:
          type: number
          example: 55.35
        breakdown:
          type: object
          properties:
            whisper:
              type: number
            gpt4o:
              type: number
            gpt4o-mini:
              type: number
            embeddings:
              type: number
        consultationsProcessed:
          type: integer
          example: 52
        avgCostPerConsultation:
          type: number
          example: 0.35
        cacheHitRate:
          type: number
          example: 0.42
          description: "Porcentaje de requests servidas desde cache"

    # ===== HEALTH =====
    HealthResponse:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        timestamp:
          type: string
          format: date-time
        components:
          type: object
          properties:
            backend:
              type: string
              enum: [up, down]
            aiService:
              type: string
              enum: [up, down]
            postgresql:
              type: string
              enum: [up, down]
            redis:
              type: string
              enum: [up, down]
            chromadb:
              type: string
              enum: [up, down]
            openai:
              type: string
              enum: [up, down]

    # ===== PAGINATION =====
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

  responses:
    BadRequest:
      description: Request malformado o parámetros inválidos
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Invalid request body"
              details:
                type: object

    Unauthorized:
      description: Token de autenticación inválido o expirado
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Invalid or expired token"

    InternalError:
      description: Error interno del servidor
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Internal server error"
              message:
                type: string
              requestId:
                type: string
```

---

### 4. Verify Documentation Completeness Checklist

**Before final delivery, verify:**

- [ ] **README.md**:
  - [ ] Complete installation instructions (tested from scratch)
  - [ ] All commands work (`make install`, `make dev`, etc.)
  - [ ] Real metrics in results table (not placeholders)
  - [ ] Video demo link included (when video is ready)
  - [ ] Links to all documentation files work

- [ ] **PROJECT_DOCUMENTATION.md**:
  - [ ] All sections completed (no `[XXX]` or `[Completar]` remaining)
  - [ ] Real cost data from AWS bill
  - [ ] Real test results from `reports/` folder
  - [ ] ADRs referenced correctly
  - [ ] Diagrams embedded correctly

- [ ] **OpenAPI Specification**:
  - [ ] All REST endpoints documented
  - [ ] WebSocket endpoints documented (streaming session creation, message formats)
  - [ ] Request/response schemas complete
  - [ ] WebSocket message types documented (transcription_update, symptom_extracted, etc.)
  - [ ] Examples realistic and tested
  - [ ] Authentication flow explained (JWT for REST and WebSocket)
  - [ ] Error responses documented (including WebSocket error codes 4000-4009)
  - [ ] Reconnection protocol documented

- [ ] **Cross-References**:
  - [ ] README links to PROJECT_DOCUMENTATION.md work
  - [ ] PROJECT_DOCUMENTATION.md references ADRs correctly
  - [ ] OpenAPI spec matches actual API implementation
  - [ ] Architecture diagrams referenced in docs

## Expected Deliverables

After completing this prompt:

- ✅ `README.md` - Complete project README (<15 min setup)
- ✅ `docs/PROJECT_DOCUMENTATION.md` - BSG template 100% complete
- ✅ `docs/api/openapi.yaml` - Full OpenAPI specification
- ✅ All documentation reflects **real data** (no placeholders)
- ✅ Professional writing, technically accurate, BSG-ready

## BSG Compliance

This prompt ensures:
- ✅ **README allows reproduction in <15 minutes** (clear, step-by-step)
- ✅ **Complete BSG template** without any placeholders
- ✅ **OpenAPI specification** for all endpoints (REST + WebSocket)
- ✅ **Real-time streaming** documentation (WebSocket API, message formats, latency targets)
- ✅ **Real data** in all metrics, costs, results tables
- ✅ **Professional documentation** suitable for technical evaluation
- ✅ **Video demo link** placeholder (to be filled when video is ready)
- ✅ **Consistent references** between all documents

## Notes

- README.md is for quick start and overview (target: 15 min to running system)
- PROJECT_DOCUMENTATION.md is comprehensive technical documentation (target: complete reference)
- OpenAPI spec is machine-readable + human-readable API docs (includes WebSocket documentation)
- All three documents must tell a consistent story with no contradictions
- Use real data from `reports/`, AWS billing, RAGAS results, cost tracker
- Update "last updated" dates when making changes
- WebSocket API is documented inline in OpenAPI (as custom extension) for completeness
- Real-time metrics include separate batch vs. streaming performance data
