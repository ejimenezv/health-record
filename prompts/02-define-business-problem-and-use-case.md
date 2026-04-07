# Prompt 02: Define Business Problem and AI Use Case

## Objective
Create the foundational documentation for BSG Delivery 1: Define the business problem, select the AI/LLM use case, and establish the value proposition. This maps to Sections 1.1 and 2.1 of the final template.

## Context
**BSG Delivery 1 Requirements:**
> "Establece los cimientos del proyecto: define el problema empresarial, el caso de uso AI/LLM seleccionado, los requerimientos funcionales y no funcionales, el alcance delimitado y el plan de trabajo para el resto del curso."

This prompt focuses on the business problem and use case selection.

## Tasks

### 1. Create Business Problem Document
Create `docs/delivery-1/01-business-problem.md`:

```markdown
# Problema Empresarial y Propuesta de Valor

## 1. Contexto del Problema

### 1.1 Situación Actual en el Sector Salud

Los profesionales médicos en Latinoamérica enfrentan una carga administrativa significativa:

| Problema | Impacto Cuantificado |
|----------|---------------------|
| Tiempo en documentación | 25-35% del tiempo de consulta |
| Errores de transcripción manual | 15-20% de registros con errores |
| Fatiga del profesional | Burnout en 60%+ de médicos |
| Costo de transcripción externa | $15-25 USD por hora de audio |
| Tiempo promedio por nota SOAP | 8-12 minutos manual |

### 1.2 Flujo Actual (AS-IS)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Consulta   │────▶│   Médico     │────▶│  Registro   │
│  60 min     │     │  toma notas  │     │  manual     │
└─────────────┘     │  durante     │     │  posterior  │
                    │  consulta    │     │  15-20 min  │
                    └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Atención    │
                    │  dividida    │
                    │  al paciente │
                    └──────────────┘
```

**Problemas identificados:**
1. El médico divide atención entre paciente y documentación
2. Notas incompletas por falta de tiempo
3. Transcripción posterior consume tiempo adicional
4. Información se pierde entre consulta y registro
5. Inconsistencia en formato de notas SOAP

### 1.3 Flujo Propuesto (TO-BE) - Tiempo Real

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  Consulta   │────▶│  Streaming   │────▶│     AI Service          │
│  60 min     │     │  WebSocket   │     │  (procesa en tiempo     │
└─────────────┘     │  bidireccional│     │   real, < 2s latencia)  │
                    └──────────────┘     └───────────┬─────────────┘
                           ▲                         │
                           │    Eventos en tiempo real:
                           │    • transcription_update
                           │    • symptom_extracted
                           │    • diagnosis_detected
                           │    • prescription_added
                           │    • interaction_warning ⚠️
                           │                         │
                    ┌──────┴───────┐                 │
                    │  Médico ve   │◀────────────────┘
                    │  nota SOAP   │
                    │  construirse │     ┌─────────────┐
                    │  en vivo     │────▶│  Registro   │
                    │  (revisión   │     │  completo   │
                    │   mínima)    │     │  al terminar│
                    └──────────────┘     └─────────────┘
```

**Beneficios esperados:**
1. Médico enfocado 100% en el paciente durante toda la consulta
2. Transcripción automática en español EN TIEMPO REAL (< 2s latencia)
3. Extracción incremental de datos médicos mientras se habla
4. Nota SOAP se construye en vivo - visible durante la consulta
5. **Alertas inmediatas** de interacciones medicamentosas (< 1s)
6. Tiempo de revisión al final: ~1 minuto (solo confirmar)
7. Costo optimizado: $0.25-0.30 por consulta (20-30% menos que streaming puro)

## 2. Propuesta de Valor

### 2.1 Solución: MedRecord AI

**MedRecord AI** es un sistema de transcripción médica **en tiempo real** potenciado por IA que:
- Transcribe consultas médicas en español usando OpenAI Whisper **en streaming** (< 2s latencia)
- Identifica automáticamente doctor y paciente (diarización incremental)
- Extrae datos estructurados **mientras se habla** (síntomas, diagnósticos, prescripciones)
- Genera notas SOAP que **se construyen en vivo** durante la consulta
- Valida información médica contra base de conocimiento (RAG) **de forma asíncrona**
- **Alerta inmediatamente** sobre interacciones medicamentosas peligrosas (< 1s)
- Optimiza costos mediante **buffering inteligente durante silencios** (20-30% ahorro vs streaming puro)

### 2.2 Diferenciadores Clave

| Aspecto | Soluciones Existentes | MedRecord AI |
|---------|----------------------|--------------|
| Idioma | Optimizadas para inglés | Optimizado para español médico |
| **Modo de operación** | Batch (post-consulta) | **Tiempo real (durante consulta)** |
| **Latencia** | 5-10 min post-consulta | **< 2 segundos** |
| Costo por hora | $0.80 - $1.20 USD | ~$0.28 USD (65% menos) |
| Integración | Sistemas cerrados | API abierta + WebSocket bidireccional |
| Validación | Sin validación médica | RAG con conocimiento médico + alertas inmediatas |
| **Alertas de seguridad** | No disponible | **Interacciones detectadas < 1s** |
| Despliegue | Solo cloud propietario | Multi-cloud / On-premise |

### 2.3 Análisis de Costos: Tiempo Real vs Batch

| Enfoque | Costo 60 min | Estrategia | Trade-off |
|---------|--------------|------------|-----------|
| **Batch (tradicional)** | $0.21 | VAD elimina 35-40% audio antes de procesar | SIN tiempo real |
| **Streaming puro** | $0.36 | Envía todo el audio inmediatamente | Costo alto |
| **Streaming inteligente** ✅ | $0.25-0.28 | Buffer durante silencios, stream durante voz | **BALANCEADO** |

**Ahorro vs streaming puro**: 20-30%
**Incremento vs batch**: 19-33% (justificado por capacidad real-time)
**Capacidad tiempo real**: ✅ SÍ

### 2.4 ROI Estimado

Para una clínica con 5 médicos, 20 consultas/día cada uno:

| Métrica | Antes | Después | Ahorro |
|---------|-------|---------|--------|
| Tiempo documentación/día | 5h (total) | 0.8h | 4.2h |
| Costo transcripción/mes | $2,000 USD | $480 USD | $1,520 USD |
| Consultas adicionales posibles | - | +21/día | +$2,100/día* |

*Asumiendo $100 USD promedio por consulta

## 3. Por qué AI/LLM es la Estrategia Óptima

### 3.1 Justificación Técnica

1. **Procesamiento de Lenguaje Natural**: Las consultas médicas son conversaciones no estructuradas que requieren comprensión de contexto, jerga médica, y matices del español latinoamericano.

2. **Extracción de Información**: Los LLMs (GPT-4) pueden extraer información estructurada de texto libre con alta precisión, algo que sistemas rule-based no logran.

3. **Adaptabilidad**: Los modelos de lenguaje pueden manejar variaciones en:
   - Acentos regionales
   - Terminología local vs. técnica
   - Estilos de comunicación médico-paciente

4. **Madurez de la Tecnología**:
   - Whisper tiene 99%+ precisión en español
   - GPT-4 comprende contexto médico
   - Costos han bajado 80% en 2 años

### 3.2 Alternativas Descartadas

| Alternativa | Razón de Descarte |
|-------------|-------------------|
| Transcripción manual | Costo prohibitivo, no escalable |
| Speech-to-text tradicional | Baja precisión en español médico |
| Sistemas rule-based | No manejan variabilidad del lenguaje |
| Fine-tuning de modelos | Requiere datos etiquetados costosos |

## 4. Usuarios Objetivo

### 4.1 Usuario Primario: Médico General/Especialista

**Perfil:**
- Edad: 30-55 años
- Consultas: 15-25 pacientes/día
- Duración consulta: 15-60 minutos
- Familiaridad tecnológica: Media
- Idioma: Español (variantes latinoamericanas)

**Necesidades:**
- Reducir tiempo de documentación
- Mantener calidad de registros
- No interrumpir flujo de consulta
- Interfaz simple, no intrusiva

### 4.2 Usuario Secundario: Personal Administrativo

**Perfil:**
- Gestiona agenda y registros
- Necesita acceso a notas para facturación
- Requiere datos estructurados

### 4.3 Volumen Esperado

| Escenario | Consultas/día | Audio/día | Costo estimado/día |
|-----------|---------------|-----------|-------------------|
| Clínica pequeña | 50 | 25 horas | $12 USD |
| Clínica mediana | 200 | 100 horas | $48 USD |
| Hospital | 1,000+ | 500+ horas | $240+ USD |

## 5. Métricas de Éxito

| KPI | Línea Base | Meta | Método de Medición |
|-----|-----------|------|-------------------|
| Precisión transcripción | N/A | >95% WER | Evaluación manual muestra |
| Precisión extracción | N/A | >90% F1 | RAGAS evaluation |
| Tiempo ahorro/consulta | 0 | >10 min | Comparación pre/post |
| Satisfacción médico | N/A | >4.0/5.0 | Encuesta NPS |
| Costo por consulta | $0.80 | <$0.50 | Tracking de API calls |
| Latencia procesamiento | N/A | <30s para 60min audio | Métricas de sistema |
```

### 2. Create Use Case Selection Document
Create `docs/delivery-1/02-ai-use-case-selection.md`:

```markdown
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
```

## Expected Deliverables
- `docs/delivery-1/01-business-problem.md` - Business problem and value proposition
- `docs/delivery-1/02-ai-use-case-selection.md` - AI use case selection and justification

## Verification Steps
1. Business problem is clearly quantified
2. AS-IS and TO-BE flows are documented
3. Value proposition is compelling and differentiated
4. Use case aligns with BSG requirements
5. Scope is clearly defined (IN/OUT)
6. Risks are identified with mitigations
7. Success criteria are measurable

## Notes
- This is Delivery 1 content - must be complete before implementation
- Focus on Spanish language as key differentiator
- Quantify everything possible (time, cost, percentages)
- Use the BSG template language and structure
- This content will be integrated into final document sections 1.1, 2.1
