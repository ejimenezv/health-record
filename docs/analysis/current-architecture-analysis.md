# Análisis de Arquitectura Actual - MedRecord AI

## 1. Resumen Ejecutivo

Este documento presenta un análisis exhaustivo del codebase existente de MedRecord AI, identificando componentes reutilizables, puntos de integración para el nuevo AI Service en Python, y requisitos para el soporte de español médico.

### Hallazgos Principales

1. **Arquitectura Sólida:** El proyecto tiene una arquitectura bien estructurada con separación clara de responsabilidades entre frontend (React), backend (Node.js/Express), y base de datos (PostgreSQL).

2. **AI Implementado en Español:** El sistema actual ya tiene soporte para español con Whisper (`language: "es"`) y prompts de extracción GPT-4 en español.

3. **WebSocket Funcional:** Transcripción en tiempo real implementada con Socket.IO, chunks de 15 segundos, y extracción incremental cada 30 segundos.

4. **Sin VAD:** No hay Voice Activity Detection - todo el audio se envía sin filtrar silencio.

5. **Costos No Optimizados:** Sin tracking de costos ni optimizaciones para reducir llamadas API.

---

## 2. Arquitectura Actual

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         (React + TypeScript)                            │
│                                                                          │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────────────┐ │
│  │  useAudioRecorder │  │ useTranscription│  │   Medical Record UI     │ │
│  │  - 15s chunks     │  │ - Socket.IO     │  │   - Symptoms editing    │ │
│  │  - Opus/WebM      │  │ - Real-time     │  │   - Prescriptions       │ │
│  │  - 16kHz mono     │  │ - Base64 audio  │  │   - SOAP notes          │ │
│  └────────┬─────────┘  └────────┬────────┘  └──────────────────────────┘ │
│           │                     │                                        │
└───────────┼─────────────────────┼────────────────────────────────────────┘
            │                     │ WebSocket (/transcription)
            │                     ▼
┌───────────┼─────────────────────────────────────────────────────────────┐
│           │              BACKEND (Node.js + Express)                     │
│           │                                                              │
│  ┌────────▼────────┐  ┌─────────────────────────────────────────────┐   │
│  │ REST API        │  │         WebSocket Handler                    │   │
│  │ /api/v1/*       │  │  - audio_chunk → transcription_update       │   │
│  │                 │  │  - start/stop_session                        │   │
│  │ - patients      │  │  - field_extraction (every 2 chunks)         │   │
│  │ - appointments  │  └──────────────────┬──────────────────────────┘   │
│  │ - records       │                     │                              │
│  │ - allergies     │  ┌──────────────────▼──────────────────────────┐   │
│  │ - conditions    │  │              AI Services                     │   │
│  └─────────────────┘  │                                              │   │
│                       │  ┌─────────────────┐ ┌────────────────────┐  │   │
│                       │  │ WhisperService  │ │    GPTService      │  │   │
│                       │  │ - language: es  │ │ - gpt-4-turbo      │  │   │
│                       │  │ - medical prompt│ │ - Spanish prompts  │  │   │
│                       │  │ - context carry │ │ - JSON extraction  │  │   │
│                       │  └────────┬────────┘ └─────────┬──────────┘  │   │
│                       │           │                    │             │   │
│                       └───────────┼────────────────────┼─────────────┘   │
│                                   │                    │                 │
└───────────────────────────────────┼────────────────────┼─────────────────┘
                                    │                    │
                    ┌───────────────▼────────────────────▼───────────────┐
                    │                  OpenAI API                         │
                    │  - Whisper API (transcription)                      │
                    │  - GPT-4 Turbo (extraction)                         │
                    │  - GPT-3.5 Turbo (incremental extraction)           │
                    └─────────────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────┼─────────────────────────────┐
│                                           │                             │
│                         DATABASE (PostgreSQL)                           │
│                                                                          │
│  ┌───────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Provider  │ │  Patient    │ │ Appointment  │ │  MedicalRecord     │  │
│  │           │ │ - allergies │ │ - vitalSigns │ │  - symptoms        │  │
│  │           │ │ - conditions│ │ - transcript │ │  - prescriptions   │  │
│  └───────────┘ └─────────────┘ └──────────────┘ └────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Frontend | React + TypeScript | 18.2.0 |
| Build Tool | Vite | 5.1.4 |
| Backend | Node.js + Express | 20 LTS / 4.18.3 |
| WebSocket | Socket.IO | 4.6.1 |
| Database | PostgreSQL | 15 (Alpine) |
| ORM | Prisma | 5.10.0 |
| AI/LLM | OpenAI API | SDK 4.28.0 |
| Containers | Docker | Alpine images |
| CSS | Tailwind CSS | 3.4.1 |
| State | Zustand + React Query | 4.5.1 / 5.24.0 |

---

## 3. Implementación AI Actual

### 3.1 Transcripción (Whisper)

- **Servicio:** `packages/backend/src/services/ai/whisper.service.ts`
- **Modelo:** `whisper-1`
- **Approach:** Real-time (chunk por chunk)
- **Idioma:** Español (`language: "es"`)
- **Formato Audio:** WebM con Opus codec, 16kHz mono, 128kbps
- **Chunks:** 15 segundos cada uno

**Prompt de Contexto (línea 78):**
```
"Esta es una consulta médica en español. Términos: síntomas, diagnóstico,
receta, medicamento, dosis, dolor, fiebre, presión arterial, diabetes,
paracetamol, ibuprofeno, antibiótico."
```

**Optimizaciones Existentes:**
- ✅ Context carry: últimas 50 palabras del chunk anterior
- ❌ Sin VAD (Voice Activity Detection)
- ❌ Sin chunking inteligente
- ❌ Sin detección de silencio

### 3.2 Extracción (GPT-4)

- **Servicio:** `packages/backend/src/services/ai/gpt.service.ts`
- **Modelo Final:** `gpt-4-turbo-preview` (al finalizar sesión)
- **Modelo Incremental:** `gpt-3.5-turbo` (cada 30 segundos)
- **Idioma:** Prompts completamente en español
- **Output Format:** JSON estructurado

**Estructura JSON de Extracción:**
```json
{
  "symptoms": [{
    "description": "string",
    "severity": "mild|moderate|severe",
    "duration": "string",
    "onset": "string"
  }],
  "diagnosis": {
    "description": "string",
    "icdCode": "string",
    "confidence": 0.0-1.0
  },
  "prescriptions": [{
    "medication": "string",
    "dosage": "string",
    "frequency": "string",
    "duration": "string",
    "instructions": "string"
  }],
  "chiefComplaint": "string",
  "summary": "resumen breve en español (2-3 oraciones)"
}
```

**Mecanismo de Consistencia (líneas 70-87):**
- Recupera síntomas y recetas existentes del registro
- Instruye a GPT usar EXACTAMENTE los mismos nombres si se mencionan
- Evita duplicados y mantiene consistencia de nomenclatura

### 3.3 Costo Estimado (60 min consulta)

| Componente | Cálculo | Costo Actual |
|------------|---------|--------------|
| **Whisper API** | 60 min × $0.006/min | $0.36 |
| **GPT-4 Turbo (final)** | ~8000 palabras = ~12000 tokens input + 2000 output | ~$0.14 |
| **GPT-3.5 (incremental)** | 4 extracciones × ~4000 tokens | ~$0.02 |
| **Total sin optimizar** | | **~$0.52** |

**Potencial de Ahorro con VAD:**
- Silencio típico en consulta: 20-30%
- Ahorro estimado en Whisper: $0.07-0.11
- **Total optimizado:** ~$0.41-0.45

### 3.4 Streaming en Tiempo Real

#### Estado Actual

| Aspecto | Actual | Requerido |
|---------|--------|-----------|
| **Transporte** | WebSocket (Socket.IO) | ✅ WebSocket bidireccional |
| **Formato audio** | Opus/WebM 16kHz mono | ✅ Correcto |
| **Tamaño chunk** | 15 segundos | ⚠️ Considerar 5-10s |
| **Latencia transcripción** | 2-5 segundos | ⚠️ < 2 segundos |
| **Latencia extracción** | 20-30 segundos (final) | ⚠️ < 1 segundo incremental |
| **Reconexión** | Básica (5 intentos) | ⚠️ Con replay de eventos |
| **Estados sesión** | active/processing/completed | ⚠️ +STREAMING, PAUSED, RECONNECTING |

#### VAD Inteligente (NO Implementado - Requerido)
```
VOZ ACTIVA → Chunks cada 5s a Whisper
SILENCIO 0-2s → Buffer, NO enviar
SILENCIO 2-10s → Enviar batch acumulado
SILENCIO >10s → SKIP (ahorro 20-30%)
```

#### Entity Matching (NO Implementado - Requerido)
- Matching semántico con umbral 0.85
- Resolución de conflictos (merge/override)
- Seguimiento de menciones múltiples

---

## 4. Análisis para Migración

### 4.1 Componentes Reutilizables

| Componente | Ubicación | Acción |
|------------|-----------|--------|
| Frontend UI completo | `packages/frontend/` | **Mantener**, modificar endpoints AI |
| useAudioRecorder hook | `src/hooks/useAudioRecorder.ts` | **Mantener**, añadir VAD opcional |
| useTranscription hook | `src/hooks/useTranscription.ts` | **Modificar**, apuntar a AI Service |
| Backend REST API | `packages/backend/src/` | **Mantener**, agregar proxy a AI Service |
| TranscriptionService | `src/services/transcription.service.ts` | **Modificar**, delegar a AI Service |
| Prisma data model | `prisma/schema.prisma` | **Mantener** |
| Docker config | `docker/` | **Extender** para AI Service |
| Auth middleware | `src/middleware/auth.middleware.ts` | **Mantener** |
| Medical Record CRUD | `src/services/medical-record.service.ts` | **Mantener** |

### 4.2 Componentes a Reemplazar/Mover a AI Service

| Componente Actual | Ubicación | Razón | Nuevo Enfoque |
|-------------------|-----------|-------|---------------|
| WhisperService | `src/services/ai/whisper.service.ts` | BSG requiere Python | AI Service Python |
| GPTService | `src/services/ai/gpt.service.ts` | BSG requiere Python | AI Service Python |
| WebSocket handler AI | `src/websocket/transcription.handler.ts` | Optimizaciones requeridas | AI Service con VAD |

### 4.3 Nuevos Componentes Requeridos (AI Service Python)

| Componente | Propósito | Tecnología |
|------------|-----------|------------|
| **FastAPI Server** | Core AI Service | FastAPI + Uvicorn |
| **Transcription Pipeline** | Whisper + VAD + Chunking | OpenAI + Silero VAD |
| **Extraction Pipeline** | GPT-4 + RAG | LangChain + ChromaDB |
| **Cost Tracker** | Control de presupuesto | Custom middleware |
| **Spanish Medical KB** | Knowledge base médico | Embeddings + Vector DB |
| **WebSocket Handler** | Streaming bidireccional | FastAPI WebSockets |

---

## 5. Puntos de Integración

### 5.1 Backend → AI Service (Propuesto)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                                  │
│                                                                      │
│  ┌────────────────┐                    ┌────────────────────────┐   │
│  │ Audio Recording │───WebSocket──────▶│ Backend (Node.js)      │   │
│  │                 │◀─────────────────│ Proxy + Auth           │   │
│  └────────────────┘                    └───────────┬────────────┘   │
│                                                    │                │
└────────────────────────────────────────────────────┼────────────────┘
                                                     │
                                         HTTP REST / WebSocket
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Service (Python/FastAPI)                       │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ Transcription│  │ Extraction  │  │    RAG      │  │   Cost     │  │
│  │ + VAD       │  │ Pipeline    │  │  Pipeline   │  │  Tracker   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │                │               │          │
│         └────────────────┴────────────────┴───────────────┘          │
│                                   │                                  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │        External APIs          │
                    │  - OpenAI (Whisper, GPT-4)    │
                    │  - ChromaDB (embeddings)      │
                    └───────────────────────────────┘
```

### 5.2 Cambios Requeridos en Backend

1. **Nuevo AI Service Client** (`src/services/ai/aiServiceClient.ts`)
   - HTTP client para AI Service REST endpoints
   - WebSocket proxy para streaming
   - Manejo de errores y reintentos

2. **Modificar TranscriptionService** (`src/services/transcription.service.ts`)
   - Delegar transcripción a AI Service
   - Mantener lógica de sesión existente
   - Agregar tracking de costos recibido de AI Service

3. **Actualizar WebSocket Handler** (`src/websocket/transcription.handler.ts`)
   - Proxy de audio chunks a AI Service
   - Forward de eventos de AI Service a frontend
   - Mantener autenticación existente

4. **Nuevos Endpoints REST**
   ```
   GET  /api/v1/ai/health          → Health check AI Service
   GET  /api/v1/ai/costs           → Estadísticas de costos
   POST /api/v1/ai/validate        → Validación RAG
   ```

### 5.3 Cambios Requeridos en Frontend

1. **Actualizar useTranscription hook** (`src/hooks/useTranscription.ts`)
   - Sin cambios si backend hace proxy transparente
   - O: conectar directamente a AI Service WebSocket

2. **Nuevas Features UI**
   - [ ] Mostrar información de costos por sesión
   - [ ] Mostrar validaciones RAG (fuentes médicas)
   - [ ] Agregar disclaimer de AI generativo
   - [ ] Indicador de latencia en tiempo real

3. **Mejoras Opcionales**
   - [ ] VAD frontend (reducir envío de silencio)
   - [ ] Indicador de nivel de confianza en extracción
   - [ ] Visualización de entidades médicas detectadas

---

## 6. Soporte de Idioma Español

### 6.1 Estado Actual

| Aspecto | Estado | Ubicación |
|---------|--------|-----------|
| Whisper `language` | ✅ Configurado `"es"` | whisper.service.ts:38 |
| Prompt Whisper | ✅ Español médico | whisper.service.ts:78 |
| System prompt GPT | ✅ Español | gpt.service.ts:8-24 |
| Extracción | ✅ Español | gpt.service.ts (todo el archivo) |
| UI Labels | ✅ Español hardcoded | Todos los componentes |
| Error messages | ✅ Español | Backend y Frontend |
| DB default | ✅ `language: "es"` | schema.prisma:251 |

### 6.2 Gaps Identificados

| Gap | Impacto | Solución Propuesta |
|-----|---------|-------------------|
| Sin detección de idioma | Bajo (español asumido) | Añadir detección automática |
| Sin fallback a inglés | Bajo | Añadir soporte multiidioma |
| Vocabulario médico limitado | Medio | Expandir KB médico español |
| Sin variantes LATAM vs España | Bajo | Considerar variantes regionales |
| Sin i18n framework | Medio | Implementar si se requiere multiidioma |

### 6.3 Requerimientos para Español Médico

```
✅ Ya Implementado:
- Whisper con language="es"
- Prompts de extracción en español
- Términos médicos básicos en prompt

❌ Pendiente para AI Service:
- Knowledge base médico en español (ICD-10 ES, medicamentos España/LATAM)
- Vocabulario médico extenso (especialidades, procedimientos)
- Validación RAG con fuentes médicas españolas
- Manejo de abreviaciones médicas en español
- Normalización de unidades (mg vs miligramos)
```

---

## 7. Modelo de Datos

### 7.1 Modelos Principales (Prisma)

```prisma
// Proveedor de salud (médico)
model Provider {
  id            String @id @default(uuid())
  email         String @unique
  password      String  // bcrypt hash
  firstName     String
  lastName      String
  specialty     String?
  licenseNumber String?
  appointments  Appointment[]
}

// Paciente
model Patient {
  id                String @id @default(uuid())
  firstName         String
  lastName          String
  dateOfBirth       DateTime
  sex               String  // male|female|other
  phone             String
  email             String?
  address           String?
  bloodType         String?
  emergencyContact* String  // nombre, relación, teléfono
  appointments      Appointment[]
  allergies         Allergy[]
  chronicConditions ChronicCondition[]
}

// Cita médica
model Appointment {
  id              String @id @default(uuid())
  patientId       String
  providerId      String
  appointmentDate DateTime
  appointmentType String  // new_patient|follow_up|routine_checkup|sick_visit|telehealth
  status          String  // scheduled|checked_in|in_progress|completed|cancelled|no_show
  duration        Int @default(30)
  notes           String?

  medicalRecord   MedicalRecord?
  vitalSigns      VitalSigns?
  transcription   Transcription?
}

// Registro médico (SOAP)
model MedicalRecord {
  id                     String @id @default(uuid())
  appointmentId          String @unique

  // Subjective
  chiefComplaint         String?
  historyOfPresentIllness String?

  // Objective
  physicalExamNotes      String?

  // Assessment
  diagnosis              String?
  diagnosisNotes         String?

  // Plan
  treatmentPlan          String?
  followUpInstructions   String?
  patientEducation       String?

  // AI metadata
  audioFileUrl           String?
  transcript             String?
  isAIGenerated          Boolean @default(false)
  isDraft                Boolean @default(true)

  symptoms               Symptom[]
  prescriptions          Prescription[]
}

// Transcripción (sesión de grabación)
model Transcription {
  id              String @id @default(uuid())
  appointmentId   String @unique
  fullText        String? @db.Text
  language        String? @default("es")
  durationSeconds Int?
  status          String @default("pending")  // pending|recording|processing|completed|error|cancelled
  startedAt       DateTime?
  completedAt     DateTime?
}
```

### 7.2 Modelos de Extracción AI

```prisma
// Síntoma extraído
model Symptom {
  id              String @id @default(uuid())
  medicalRecordId String
  symptomName     String
  bodySite        String?
  severity        Int?     // 1-10
  duration        String?
  notes           String?
  isAIExtracted   Boolean @default(false)  // Flag para identificar AI
}

// Prescripción extraída
model Prescription {
  id              String @id @default(uuid())
  medicalRecordId String
  medicationName  String
  strength        String?
  dosage          String
  frequency       String
  duration        String?
  quantity        Int?
  refills         Int @default(0)
  instructions    String?
  indication      String?
  isAIExtracted   Boolean @default(false)  // Flag para identificar AI
}
```

---

## 8. Infraestructura

### 8.1 Docker Services (Production)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | postgres:15-alpine | 5432 (internal) | Base de datos |
| backend | Node 20 Alpine | 3001 (internal) | API REST + WebSocket |
| frontend | Nginx Alpine | 80 (internal) | SPA React |
| nginx | nginx:alpine | 80, 443 (public) | Reverse proxy + SSL |
| certbot | certbot/certbot | - | SSL certificates |

### 8.2 Infraestructura AI Service (Propuesta)

```yaml
# docker-compose.ai-service.yml
services:
  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - CHROMA_HOST=chromadb
    depends_on:
      - chromadb

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma
```

### 8.3 Environment Variables

```bash
# Backend (existente)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@postgres:5432/healthrecord
JWT_SECRET=secure-secret
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://app.domain.com

# AI Service (nuevo)
API_HOST=0.0.0.0
API_PORT=8000
WHISPER_MODEL=whisper-1
WHISPER_LANGUAGE=es
EXTRACTION_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-3-small
CHROMA_HOST=chromadb
CHROMA_PORT=8001
MAX_COST_PER_SESSION=5.00
```

---

## 9. Recomendaciones

### 9.1 Prioridad Alta

1. **Implementar VAD en AI Service**
   - Usar Silero VAD para detección de voz
   - Ahorrar 20-30% en costos de Whisper
   - Mejorar calidad de transcripción (menos silencio)

2. **Migrar AI Services a Python**
   - WhisperService → Python con chunking inteligente
   - GPTService → Python con LangChain + RAG
   - Mantener compatibilidad de API con backend Node.js

3. **Implementar Cost Tracking**
   - Middleware en AI Service para tracking
   - Almacenar costos por sesión/paciente
   - Dashboard de costos para administrador

### 9.2 Prioridad Media

1. **RAG Pipeline para Validación Médica**
   - ChromaDB para embeddings de knowledge base
   - ICD-10 en español
   - Vademécum de medicamentos

2. **Mejorar Latencia de Extracción**
   - Streaming de extracción (no esperar fin de sesión)
   - Modelo más rápido (gpt-4o-mini) para incremental
   - Cache de extracciones parciales

3. **Entity Matching Semántico**
   - Matching de entidades con umbral 0.85
   - Merge inteligente de síntomas duplicados
   - Tracking de menciones múltiples

### 9.3 Nice-to-Have

1. **VAD Frontend**
   - Reducir envío de silencio desde navegador
   - Indicator visual de voz detectada

2. **Soporte Multiidioma**
   - Detección automática de idioma
   - Fallback a inglés
   - i18n framework para UI

3. **Métricas de Calidad**
   - Confidence scores en extracción
   - Validación de ICD-10 codes
   - Alertas de interacciones medicamentosas

---

## 10. Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Latencia excesiva en transcripción | Media | Alto | VAD + chunks más pequeños + streaming |
| Costos API no controlados | Media | Alto | Cost tracker + límites por sesión |
| Errores en extracción médica | Media | Alto | RAG validation + human review |
| Incompatibilidad de audio formato | Baja | Medio | Mantener Opus/WebM, añadir fallbacks |
| Pérdida de sesión por desconexión | Media | Medio | Session persistence + reconnection logic |
| Extracción incorrecta de medicamentos | Media | Alto | Vademécum RAG + confidence threshold |

---

## 11. Archivos Clave de Referencia

### Backend
- `packages/backend/src/services/ai/whisper.service.ts` - Transcripción actual
- `packages/backend/src/services/ai/gpt.service.ts` - Extracción actual
- `packages/backend/src/services/transcription.service.ts` - Gestión de sesiones
- `packages/backend/src/websocket/transcription.handler.ts` - WebSocket handlers
- `packages/backend/prisma/schema.prisma` - Modelo de datos

### Frontend
- `packages/frontend/src/hooks/useAudioRecorder.ts` - Captura de audio
- `packages/frontend/src/hooks/useTranscription.ts` - WebSocket client
- `packages/frontend/src/components/transcription/TranscriptionPanel.tsx` - UI principal

### Infrastructure
- `docker/docker-compose.prod.yml` - Docker production
- `docker/nginx.conf` - Reverse proxy config
- `.env.example` - Variables de entorno

---

## 12. Próximos Pasos

1. [ ] Crear estructura base de AI Service (FastAPI)
2. [ ] Implementar TranscriptionPipeline con VAD
3. [ ] Implementar ExtractionPipeline con streaming
4. [ ] Configurar ChromaDB + RAG pipeline
5. [ ] Crear API endpoints compatibles con backend Node.js
6. [ ] Implementar WebSocket handler en AI Service
7. [ ] Modificar backend para usar AI Service
8. [ ] Testing de integración end-to-end
9. [ ] Deployment con Docker Compose extendido
