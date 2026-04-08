# Selección del Caso de Uso AI/LLM

## 1. Caso de Uso Seleccionado

**Transcripción y Extracción Inteligente de Consultas Médicas en Español**

### 1.1 Descripción

Sistema que procesa grabaciones de audio de consultas médicas en español para:
1. Transcribir la conversación completa
2. Identificar los hablantes (médico/paciente)
3. Extraer información médica estructurada
4. Generar documentación clínica (notas SOAP)
5. Validar información contra base de conocimiento médico

### 1.2 Componentes AI/LLM

| Componente | Tecnología | Función |
|------------|------------|---------|
| Speech-to-Text | OpenAI Whisper | Transcripción de audio en español |
| Diarización | Heurísticas + LLM | Identificación de hablantes |
| Extracción | GPT-4o | Extracción de datos estructurados |
| RAG | ChromaDB + Embeddings | Validación y enriquecimiento |
| Query | GPT-4o + RAG | Consultas sobre conocimiento médico |

### 1.3 Flujo del Caso de Uso (Tiempo Real)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FLUJO EN TIEMPO REAL (< 2s latencia)                  │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ Audio Input │ (Streaming WebSocket, hasta 90 min, español)
│ (Frontend)  │ ──Opus encoded, chunks 200ms──▶
└──────┬──────┘
       │ WebSocket bidireccional
       ▼
┌─────────────────────────────────────────┐
│         VAD + BUFFERING INTELIGENTE     │
│  ┌─────────────────────────────────┐   │
│  │  Silero VAD (< 100ms latencia)  │   │
│  │  • Voz activa → buffer 5s       │   │
│  │  • Silencio <2s → continuar     │   │
│  │  • Silencio 2-10s → batch       │   │
│  │  • Silencio >10s → SKIP (ahorro)│   │
│  └─────────────────────────────────┘   │
└─────────────────────┬───────────────────┘
                      │ chunks 5-10s
                      ▼
┌─────────────────────────────────────────┐
│     TRANSCRIPCIÓN INCREMENTAL           │
│  ┌─────────────────────────────────┐   │
│  │     OpenAI Whisper (es)         │   │
│  │     - Context: últimos 200 chars │   │
│  │     - Timestamps por palabra     │   │
│  │     - Latencia: 1-1.5s           │   │
│  └─────────────────────────────────┘   │
│              │                          │
│              ▼ WebSocket event          │
│     transcription_update ──────────────▶│ Frontend
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│      DIARIZACIÓN INCREMENTAL            │
│  ┌─────────────────────────────────┐   │
│  │  Identificación de hablantes:    │   │
│  │  - DOCTOR / PACIENTE / ACOMPAÑANTE│  │
│  │  - Actualización retroactiva     │   │
│  │  - Precisión > 90%               │   │
│  └─────────────────────────────────┘   │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│   EXTRACCIÓN INCREMENTAL + MATCHING     │
│  ┌──────────┐      ┌────────────────┐  │
│  │ GPT-4o   │      │ Entity Matching│  │
│  │ /mini    │─────▶│ (embeddings +  │  │
│  │          │      │  business rules)│  │
│  │ Extrae:  │      │                │  │
│  │ - Chief  │      │ • sim > 0.85   │  │
│  │   Complaint     │   → MERGE      │  │
│  │ - Síntomas│     │ • sim < 0.85   │  │
│  │ - Dx     │      │   → NEW entity │  │
│  │ - Rx     │      └────────────────┘  │
│  └──────────┘                          │
│              │                          │
│              ▼ WebSocket events         │
│     symptom_extracted ─────────────────▶│
│     diagnosis_detected ────────────────▶│ Frontend
│     prescription_added ────────────────▶│ (en vivo)
│     chief_complaint_identified ────────▶│
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│     RAG VALIDATION (async, no bloquea)  │
│  ┌──────────┐      ┌────────────────┐  │
│  │ Priority │      │ ChromaDB +     │  │
│  │ Queue:   │─────▶│ Spanish KB     │  │
│  │ CRITICAL │      │ - Medicamentos │  │
│  │ (Rx) 1s  │      │ - CIE-10       │  │
│  │ HIGH     │      │ - Interacciones│  │
│  │ (Dx) 2s  │      └────────────────┘  │
│  │ MEDIUM   │                          │
│  │ (Sx) 3s  │      ┌────────────────┐  │
│  └──────────┘      │ Redis Cache    │  │
│                    │ 60-70% hit rate│  │
│                    └────────────────┘  │
│              │                          │
│              ▼ WebSocket events         │
│     entity_validated ──────────────────▶│
│     ⚠️ interaction_warning ────────────▶│ ALERTA < 1s
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│       NOTA SOAP EN VIVO                 │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │Transcript│ │ SOAP    │ │Structured │ │
│  │diarizado │ │ Note    │ │ Data JSON │ │
│  │(en vivo) │ │(en vivo)│ │(versionado)│ │
│  └─────────┘ └─────────┘ └───────────┘ │
│              │                          │
│              ▼ Persistencia cada 30s    │
│           PostgreSQL                    │
└─────────────────────────────────────────┘
```

## 2. Justificación de Selección

### 2.1 Alineación con Objetivos BSG

| Requisito BSG | Cómo lo cumple este caso |
|---------------|-------------------------|
| Integración LLM | Whisper + GPT-4 como core |
| Pipeline RAG | Validación médica integrada |
| API REST | FastAPI con endpoints estándar |
| Endpoints /query e /ingest | RAG para conocimiento médico |
| Observabilidad | Logging, métricas, trazas |
| Evaluación LLM | RAGAS para calidad RAG |
| Seguridad | JWT, sanitización, audit logs |

### 2.2 Complejidad Técnica Apropiada

El caso de uso demuestra:
- **Procesamiento de audio**: No trivial, requiere optimización
- **Múltiples modelos AI**: Whisper + GPT-4 + Embeddings
- **Pipeline complejo**: Audio → Texto → Estructura → Validación
- **RAG real**: No solo compliance, integrado en extracción
- **Optimización de costos**: Necesaria para viabilidad

### 2.3 Valor Empresarial Demostrable

- Problema real y cuantificable
- ROI calculable
- Mercado objetivo claro (LATAM)
- Diferenciación por idioma y costo

## 3. Alcance del Caso de Uso

### 3.1 EN SCOPE

| Funcionalidad | Detalle |
|---------------|---------|
| **Transcripción en tiempo real** | WebSocket streaming, latencia < 2s |
| **Extracción incremental** | Síntomas, diagnósticos, prescripciones mientras se habla |
| **Alertas en tiempo real** | Interacciones medicamentosas < 1s |
| Transcripción de audio | Streaming hasta 90 min, codec Opus |
| Idioma | Español (todas variantes LATAM y España) |
| Diarización | 2-4 hablantes (doctor/paciente/acompañante) |
| Extracción SOAP | Subjective, Objective, Assessment, Plan (en vivo) |
| Extracción síntomas | Nombre, ubicación, severidad, duración + matching inteligente |
| Extracción prescripciones | Medicamento, dosis, frecuencia + validación RAG |
| **Resolución de conflictos** | Matching semántico + actualización de entidades existentes |
| RAG médico | Validación asíncrona de medicamentos, CIE-10 |
| API REST + WebSocket | FastAPI con endpoints REST y WebSocket bidireccional |
| Autenticación | JWT con refresh tokens |
| Despliegue | Docker + cloud-ready (AWS/GCP/Azure) |

### 3.2 OUT OF SCOPE

| Funcionalidad | Razón |
|---------------|-------|
| Más de 4 hablantes | Complejidad de diarización |
| Otros idiomas | Foco en español para diferenciación |
| Integración EHR externos | Requiere partnerships específicos |
| App móvil nativa | Solo web API + frontend demo |
| Certificaciones médicas (HIPAA/ISO) | Requiere proceso regulatorio largo |
| Fine-tuning de modelos | Usar APIs existentes optimizadas |
| Procesamiento de imágenes médicas | Solo audio en este MVP |
| Modo offline | Requiere conexión a Internet |

## 4. Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Precisión insuficiente en español médico | Media | Alto | Prompts especializados, RAG validation |
| Costos de API excedan presupuesto | Media | Alto | VAD, caching, batch processing |
| Latencia inaceptable | Baja | Medio | Procesamiento asíncrono, chunks paralelos |
| Hallucinations en extracción | Media | Alto | RAG validation, confidence scores |
| Datos sensibles expuestos | Baja | Crítico | Encryption, no-logging de contenido |

## 5. Criterios de Aceptación del Caso de Uso

| Criterio | Umbral Mínimo | Meta |
|----------|---------------|------|
| Word Error Rate (WER) transcripción | <10% | <5% |
| F1 Score extracción síntomas | >0.85 | >0.90 |
| F1 Score extracción prescripciones | >0.90 | >0.95 |
| Faithfulness RAG (RAGAS) | >0.80 | >0.90 |
| **Latencia end-to-end (tiempo real)** | <3s (p95) | <2s (p95) |
| **Latencia extracción incremental** | <5s (p95) | <3s (p95) |
| **Latencia alertas críticas** | <2s (p95) | <1s (p95) |
| Costo por consulta 60min | <$0.35 | <$0.28 |
| Disponibilidad API | >99% | >99.5% |
| Cache hit rate RAG | >50% | >65% |
