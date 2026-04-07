# Prompt 09: Analyze Current Architecture

## Objective
Perform a comprehensive analysis of the existing MedRecord AI codebase to understand its current implementation, identify reusable components, and document what needs adaptation for the BSG course.

## Context
The project has an existing frontend (React) and backend (Node.js) from the AI4Devs course. This analysis will:
- Document the current AI transcription implementation
- Identify what can be reused
- Define the integration points for the new Python AI Service
- Focus on Spanish language support requirements

**Important:** The existing frontend/backend will be kept and modified only to connect to the new AI Service. The AI Service (Python) is the focus of BSG evaluation.

## Tasks

### 1. Backend Analysis
Navigate to `packages/backend/` and analyze:

**Required Analysis:**
- Directory structure and organization
- Existing AI services in `src/services/ai/`
- Current transcription implementation
- WebSocket handlers for real-time features
- Authentication and middleware
- Prisma schema and data model
- All API endpoints

**Create Analysis Notes:**
```markdown
## Backend Analysis

### Structure
- [ ] Document folder organization
- [ ] List all services and their purposes
- [ ] Map dependencies

### AI Services (Current)
- [ ] How is Whisper currently called?
- [ ] How is GPT-4 extraction done?
- [ ] What prompts are used?
- [ ] Is Spanish specifically handled?

### Transcription Flow (Current)
- [ ] How is audio captured?
- [ ] Real-time vs batch processing?
- [ ] Where is audio stored?
- [ ] How are results returned?

### Real-Time Streaming (Current/Required)
- [ ] Is WebSocket used for bidirectional streaming?
- [ ] Audio format (Opus vs WAV)?
- [ ] Chunking strategy (time-based, VAD-based)?
- [ ] Latency: audio → transcription → extraction?
- [ ] Reconnection handling?
- [ ] Session state management?

### Data Model
- [ ] Patient model
- [ ] Appointment model
- [ ] Transcription model
- [ ] Any medical extraction models?

### Integration Points
- [ ] Which endpoints call AI?
- [ ] How would these call the new AI Service?
- [ ] What data format is expected?
```

### 2. Frontend Analysis
Navigate to `packages/frontend/` and analyze:

**Required Analysis:**
- Audio recording implementation (`useAudioRecorder` hook)
- Transcription panel components
- Real-time data extraction UI
- How frontend communicates with backend for transcription

**Create Analysis Notes:**
```markdown
## Frontend Analysis

### Audio Recording
- [ ] How is audio captured?
- [ ] What formats are supported?
- [ ] Is there VAD on frontend?

### Transcription UI
- [ ] Where are results displayed?
- [ ] Real-time updates or polling?
- [ ] Editing capabilities?

### Integration Points
- [ ] API calls to backend for AI
- [ ] WebSocket usage
- [ ] What needs to change for new AI Service?

### Real-Time Streaming UI
- [ ] Incremental transcription display?
- [ ] Progressive extraction rendering?
- [ ] Entity matching visualization (merge, new, conflict)?
- [ ] Latency indicators?
- [ ] Reconnection handling in UI?
```

### 3. Current AI Implementation Analysis
Specifically analyze the AI/LLM implementation:

**Document:**
- OpenAI Whisper integration details
- GPT-4 extraction service
- Prompt engineering approach
- Spanish language handling (or lack thereof)
- Cost tracking (if any)

**Cost Analysis for 60-minute Spanish Consultation:**
```markdown
## Current Cost Analysis

### Assumptions
- 60 min audio
- ~6000-8000 words spoken (Spanish)
- Current implementation approach

### Current Costs
| Component | Calculation | Cost |
|-----------|-------------|------|
| Whisper API | 60 min × $0.006/min | $0.36 |
| GPT-4 extraction | Estimate tokens | $X.XX |
| **Total** | | $X.XX |

### Observations
- Is VAD used? (Could save X%)
- Is chunking optimized?
- Any caching?
```

### 4. Infrastructure Analysis
Review:
- Docker configurations in `docker/`
- Environment variables used
- Current deployment approach
- Database setup

### 5. Create Analysis Report
Create `docs/analysis/current-architecture-analysis.md`:

```markdown
# Análisis de Arquitectura Actual - MedRecord AI

## 1. Resumen Ejecutivo

[Breve resumen de hallazgos principales]

## 2. Arquitectura Actual

### 2.1 Diagrama de Componentes
```
[Diagrama ASCII de la arquitectura actual]
```

### 2.2 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Frontend | React + TypeScript | X.X |
| Backend | Node.js + Express | X.X |
| Database | PostgreSQL | X.X |
| AI/LLM | OpenAI API | - |
| Containers | Docker | X.X |

## 3. Implementación AI Actual

### 3.1 Transcripción
- **Servicio:** [ubicación del código]
- **Approach:** [Real-time / Batch]
- **Idioma:** [¿Español específico o genérico?]
- **Optimizaciones:** [VAD, chunking, etc.]

### 3.2 Extracción
- **Servicio:** [ubicación del código]
- **Prompt actual:** [Descripción del prompt]
- **Output format:** [JSON schema]
- **Idioma:** [¿Prompts en español?]

### 3.3 Costo Estimado (60 min consulta)
| Componente | Costo Actual | Costo Optimizado Esperado |
|------------|--------------|--------------------------|
| Transcripción | $X.XX | $X.XX |
| Extracción | $X.XX | $X.XX |
| **Total** | $X.XX | $X.XX |

### 3.4 Streaming en Tiempo Real

#### Estado Actual
| Aspecto | Actual | Requerido |
|---------|--------|-----------|
| Transporte | HTTP/Polling? | WebSocket bidireccional |
| Formato audio | WAV? | Opus 16kHz mono |
| Latencia transcripción | X segundos | < 2 segundos |
| Latencia extracción | X segundos | < 1 segundo post-transcripción |
| Reconexión | No? | Con replay de eventos |
| Estados sesión | Básico | STREAMING, PAUSED, RECONNECTING |

#### VAD Inteligente (Requerido)
```
VOZ ACTIVA → Chunks cada 5s a Whisper
SILENCIO 0-2s → Buffer, NO enviar
SILENCIO 2-10s → Enviar batch acumulado
SILENCIO >10s → SKIP (ahorro 20-30%)
```

#### Entity Matching (Requerido)
- Matching semántico con umbral 0.85
- Resolución de conflictos (merge/override)
- Seguimiento de menciones múltiples

## 4. Análisis para Migración

### 4.1 Componentes Reutilizables
| Componente | Ubicación | Acción |
|------------|-----------|--------|
| Frontend UI | packages/frontend | Mantener, modificar llamadas API |
| Backend API | packages/backend | Mantener, agregar proxy a AI Service |
| Data model | prisma/schema | Mantener |
| Docker config | docker/ | Extender para AI Service |

### 4.2 Componentes a Reemplazar
| Componente | Razón | Nuevo Enfoque |
|------------|-------|---------------|
| AI services (Node) | BSG requiere Python | Nuevo AI Service Python |
| Transcription logic | Optimización de costos | VAD + chunking + batch |
| Extraction prompts | Mejorar para español | Prompts optimizados + RAG |

### 4.3 Nuevos Componentes Requeridos
| Componente | Propósito |
|------------|-----------|
| Python AI Service | Core BSG deliverable |
| RAG Pipeline | Validación médica |
| Cost tracking | Control de presupuesto |
| Spanish KB | Knowledge base médico español |

## 5. Puntos de Integración

### 5.1 Backend → AI Service
```
Backend (Node.js)
      │
      │ HTTP REST
      ▼
AI Service (Python/FastAPI)
      │
      │ OpenAI API
      ▼
Whisper / GPT-4
```

### 5.2 Cambios Requeridos en Backend
1. [ ] Agregar cliente HTTP para AI Service
2. [ ] Modificar endpoints de transcripción
3. [ ] Agregar manejo de webhooks
4. [ ] Actualizar tipos/interfaces

### 5.3 Cambios Requeridos en Frontend
1. [ ] Actualizar llamadas API si cambian
2. [ ] Mostrar información de costos
3. [ ] Mostrar validaciones RAG
4. [ ] Agregar disclaimer de AI

## 6. Soporte de Idioma Español

### 6.1 Estado Actual
- [ ] Whisper: ¿Configurado para español?
- [ ] Prompts: ¿En español o inglés?
- [ ] UI: ¿Localizada?

### 6.2 Requerimientos para Español Médico
- Whisper con `language="es"`
- Prompts de extracción en español
- Knowledge base en español
- Vocabulario médico español
- Manejo de variantes (LATAM vs España)

## 7. Recomendaciones

### 7.1 Prioridad Alta
1. [Recomendación 1]
2. [Recomendación 2]

### 7.2 Prioridad Media
1. [Recomendación 3]

### 7.3 Nice-to-Have
1. [Recomendación 4]

## 8. Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| [Riesgo 1] | Media | Alto | [Mitigación] |
```

## Expected Deliverables
- `docs/analysis/current-architecture-analysis.md` - Comprehensive analysis report
- Clear understanding of integration points
- Cost baseline for comparison

## Verification Steps
1. All existing AI code is documented
2. Integration points are clearly identified
3. Spanish language gaps are noted
4. Cost baseline is established
5. Reusable vs replaceable components listed

## Notes
- Do NOT make any code changes in this prompt
- Focus purely on analysis and documentation
- This analysis guides all subsequent implementation
- Pay special attention to Spanish language handling
- Document everything that will help the AI Service integration
