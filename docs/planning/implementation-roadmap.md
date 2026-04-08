# Roadmap de Implementación - MedRecord AI

## Resumen de Entregables BSG

| Entregable | Sesiones | Fecha Límite | Puntos | Estado |
|------------|----------|--------------|--------|--------|
| E1 - Alcance y Requerimientos | S1-S2 | Fin S2 | 7 pts | ⬜ Pendiente |
| E2 - Diseño de Arquitectura | S3-S4 | Fin S4 | 18 pts | ⬜ Pendiente |
| E3 - Implementación Funcional | S5-S6 | Fin S6 | 30 pts | ⬜ Pendiente |
| E4 - Documentación Final | S7-S8 | Fin S8 | 15 pts | ⬜ Pendiente |
| EV - Video Presentación | S7-S8 | Fin S8 | 30 pts | ⬜ Pendiente |
| **TOTAL** | | | **100 pts** | |

---

## ⚠️ ARCHITECTURE UPDATE: REAL-TIME STREAMING

**CRITICAL CHANGE:** The architecture has been updated from **batch processing** to **real-time streaming** based on core business requirements.

### Key Changes

| Aspect | Original (Batch) | Updated (Real-Time) |
|--------|------------------|---------------------|
| **Audio Processing** | Upload file → process → webhook | WebSocket bidirectional streaming |
| **Transcription** | Batch with VAD chunking | Streaming with intelligent VAD buffering |
| **Extraction** | Complete at end | Incremental during consultation |
| **Entity Resolution** | N/A | Semantic matching + conflict resolution |
| **RAG Validation** | Synchronous | Async with priority queue |
| **Latency Target** | Minutes | <2s end-to-end (p95) |
| **Cost per 60min** | $0.21 (batch optimized) | $0.27-0.32 (real-time optimized) |

### New Prompts for Real-Time

- **PROMPT-07**: Real-time streaming pipeline architecture
- **PROMPT-08**: WebSocket API specification
- **PROMPT-11**: Streaming cost optimization (VAD decision tree)
- **PROMPT-12**: Incremental RAG with async validation
- **Prompt 16-A**: WebSocket Gateway implementation guide
- **Prompt 19-A**: Entity Matching Engine implementation

### Why Real-Time?

1. **Business Requirement**: Doctor needs feedback DURING consultation, not after
2. **Safety Critical**: Drug interaction alerts in <1s can prevent prescription errors
3. **UX Superior**: Immediate feedback allows doctor to clarify in the moment
4. **Cost Acceptable**: Only +14-52% vs batch, -11% vs pure streaming (through intelligent VAD buffering)

---

## Entregable 1: Alcance y Requerimientos (7 pts)

### Checklist de Ítems

| # | Ítem | Obligatorio | Prompt | Estado |
|---|------|------------|--------|--------|
| 1.1 | Secciones 1 y 2 de Plantilla completadas | ✅ | 02, 03, 04 | ⬜ |
| 1.2 | Tabla IN SCOPE / OUT OF SCOPE | ✅ | 05 | ⬜ |
| 1.3 | Lista RF (mín 5) con criterios aceptación | ✅ | 03 | ⬜ |
| 1.4 | Lista RNF (mín 4) con umbrales | ✅ | 04 | ⬜ |
| 1.5 | Plan de trabajo con hitos | ✅ | 05 | ⬜ |
| 1.6 | Stack tecnológico con justificación | ✅ | 06 | ⬜ |
| 1.7 | Repositorio Git con estructura mínima | ✅ | 01 | ⬜ |
| 1.8 | .env.example y .gitignore | ✅ | 01 | ⬜ |
| 1.9 | Análisis de riesgos (mín 3) | ⚠️ | 05 | ⬜ |

### Tareas Específicas

```
E1-T1: Ejecutar prompt 01 (estructura proyecto)
E1-T2: Ejecutar prompt 02 (problema y caso de uso)
E1-T3: Ejecutar prompt 03 (requerimientos funcionales)
E1-T4: Ejecutar prompt 04 (requerimientos no funcionales)
E1-T5: Ejecutar prompt 05 (alcance y plan de trabajo)
E1-T6: Revisar y consolidar docs/delivery-1/
E1-T7: Crear primera versión de docs/PROJECT_DOCUMENTATION.md (secciones 1-2)
```

---

## Entregable 2: Diseño de Arquitectura (18 pts)

### Checklist de Ítems

| # | Ítem | Obligatorio | Prompt | Estado |
|---|------|------------|--------|--------|
| 2.1 | Secciones 3 y 4 de Plantilla | ✅ | 06, PROMPT-07, PROMPT-08 | ⬜ |
| 2.2 | Diagrama C4 (Contexto + Contenedor) - Real-time | ✅ | 06 | ⬜ |
| 2.3 | Diagrama de flujo de datos streaming | ✅ | PROMPT-07 | ⬜ |
| 2.4 | Arquitectura WebSocket documentada | ✅ | 16-A | ⬜ |
| 2.5 | Entity Matching Engine diseñado | ✅ | 19-A | ⬜ |
| 2.6 | ADR-001: Arquitectura Real-time | ✅ | PROMPT-07 | ⬜ |
| 2.7 | ADR-002: Selección vector store | ✅ | PROMPT-12 | ⬜ |
| 2.8 | Especificación OpenAPI + WebSocket | ✅ | PROMPT-08, 16-A | ⬜ |
| 2.9 | System prompt documentado | ✅ | PROMPT-07 | ⬜ |
| 2.10 | Parámetros RAG incremental justificados | ✅ | PROMPT-12 | ⬜ |
| 2.11 | Estrategia cost-optimization VAD | ✅ | PROMPT-11 | ⬜ |
| 2.12 | Modelo de amenazas inicial | ✅ | PROMPT-08 | ⬜ |
| 2.13 | ADR-003 adicional | ⚠️ | - | ⬜ |
| 2.14 | Prototipo /health operativo | ⚠️ | 14 | ⬜ |

### Tareas Específicas

```
E2-T1: Ejecutar prompt 06 (arquitectura alto nivel C4 - REAL-TIME)
E2-T2: Ejecutar PROMPT-07 (pipeline streaming real-time)
E2-T3: Ejecutar PROMPT-08 (API WebSocket real-time)
E2-T4: Ejecutar PROMPT-11 (cost optimization VAD streaming)
E2-T5: Ejecutar PROMPT-12 (RAG incremental async)
E2-T6: Ejecutar prompt 16-A (WebSocket implementation guide)
E2-T7: Ejecutar prompt 19-A (Entity Matching Engine)
E2-T8: Ejecutar prompt 09 (análisis arquitectura actual)
E2-T9: Ejecutar prompt 10 (gap analysis)
E2-T10: Crear diagramas C4 en Draw.io (reflejar real-time)
E2-T11: Exportar diagramas a docs/architecture/
E2-T12: Actualizar PROJECT_DOCUMENTATION.md (secciones 3-4)
E2-T13: Crear ADR-003 (orquestador LLM o framework)
E2-T14: Crear docs/api/openapi.yaml + WebSocket spec
```

---

## Entregable 3: Implementación Funcional (30 pts)

### Checklist de Ítems (Real-Time Implementation)

| # | Ítem | Obligatorio | Prompt | Estado |
|---|------|------------|--------|--------|
| 3.1 | Código fuente en src/ (real-time) | ✅ | 14-23 | ⬜ |
| 3.2 | WebSocket Gateway operativo | ✅ | 16, 16-A | ⬜ |
| 3.3 | Stream Processor con VAD | ✅ | 17 (PROMPT-11) | ⬜ |
| 3.4 | Entity Matching Engine funcional | ✅ | 19, 19-A | ⬜ |
| 3.5 | 3 endpoints operativos (REST + WS) | ✅ | 21-23 | ⬜ |
| 3.6 | Pipeline RAG incremental funcional | ✅ | 20-A (PROMPT-12) | ⬜ |
| 3.7 | Dockerfile + docker-compose | ✅ | 14-15 | ⬜ |
| 3.8 | Sistema desplegado con URL | ✅ | 33-35 | ⬜ |
| 3.9 | Tests unitarios ≥60% | ✅ | 26-27 | ⬜ |
| 3.10 | Test integración RAG E2E | ✅ | 28 | ⬜ |
| 3.11 | Test WebSocket streaming E2E | ✅ | 28 | ⬜ |
| 3.12 | Evaluación LLM ≥3 métricas | ✅ | 29 | ⬜ |
| 3.13 | Prueba de carga WebSocket (≥10 usuarios) | ✅ | 28 | ⬜ |
| 3.14 | CI/CD operativo en verde | ✅ | 31 | ⬜ |
| 3.15 | Makefile con comandos | ✅ | 14 | ⬜ |
| 3.16 | Secciones 6 y 7 de Plantilla | ✅ | - | ⬜ |
| 3.17 | Métricas latencia real-time | ✅ | 32 | ⬜ |
| 3.18 | Escaneo seguridad | ⚠️ | 31 | ⬜ |
| 3.19 | Cobertura ≥80% | ⚠️ | 27 | ⬜ |
| 3.20 | Dataset eval ≥20 Q/A | ⚠️ | 29 | ⬜ |

### Tareas Específicas

#### Fase 3A: Project Setup
```
E3-T1: Ejecutar prompt 14 (setup proyecto Python)
E3-T2: Ejecutar prompt 15 (configuración Docker)
```

#### Fase 3B: Core AI Services (Real-Time Streaming)
```
E3-T3: Ejecutar prompt 16 (WebSocket Gateway - basado en 16-A)
E3-T4: Ejecutar prompt 17 (Stream Processor - basado en PROMPT-11)
E3-T5: Ejecutar prompt 18 (servicio transcripción streaming)
E3-T6: Ejecutar prompt 19 (Entity Matching Engine - basado en 19-A)
E3-T7: Ejecutar prompt 20 (servicio extracción incremental)
E3-T8: Ejecutar prompt 20-A (pipeline RAG incremental - basado en PROMPT-12)
E3-T9: Ejecutar prompt 20-B (integración completa real-time)
```

#### Fase 3C: API Implementation
```
E3-T10: Ejecutar prompt 21 (endpoint /health)
E3-T11: Ejecutar prompt 22 (endpoint /ingest)
E3-T12: Ejecutar prompt 23 (endpoint /query)
```

#### Fase 3D: Integration
```
E3-T13: Ejecutar prompt 24 (modificar backend Node.js)
E3-T14: Ejecutar prompt 25 (actualizar frontend)
```

#### Fase 3E: Testing
```
E3-T15: Ejecutar prompt 26 (tests unitarios)
E3-T16: Ejecutar prompt 27 (tests integración)
E3-T17: Ejecutar prompt 28 (tests carga)
E3-T18: Ejecutar prompt 29 (evaluación RAGAS)
```

#### Fase 3F: CI/CD & Observability
```
E3-T19: Ejecutar prompt 30 (logging estructurado)
E3-T20: Ejecutar prompt 31 (CI/CD GitHub Actions)
E3-T21: Ejecutar prompt 32 (métricas y alertas)
```

---

## Entregable 4: Documentación Final (15 pts)

### Checklist de Ítems

| # | Ítem | Obligatorio | Prompt | Estado |
|---|------|------------|--------|--------|
| 4.1 | Plantilla 100% completada | ✅ | 36 | ⬜ |
| 4.2 | Secciones 8, 9, 10 | ✅ | 36 | ⬜ |
| 4.3 | Análisis costos con datos reales | ✅ | 37 | ⬜ |
| 4.4 | Lecciones aprendidas (mín 4) | ✅ | 38 | ⬜ |
| 4.5 | Roadmap trabajo futuro | ✅ | 38 | ⬜ |
| 4.6 | Tag v1.0.0 en Git | ✅ | 39 | ⬜ |
| 4.7 | README final actualizado | ✅ | 39 | ⬜ |
| 4.8 | Checklist entrega verificado | ✅ | 39 | ⬜ |
| 4.9 | make pre-delivery sin errores | ✅ | 39 | ⬜ |

### Tareas Específicas

```
E4-T1: Ejecutar prompt 33 (configuración despliegue)
E4-T2: Ejecutar prompt 34 (despliegue staging)
E4-T3: Ejecutar prompt 35 (despliegue producción)
E4-T4: Ejecutar prompt 36 (documentación final)
E4-T5: Ejecutar prompt 37 (análisis costos real)
E4-T6: Ejecutar prompt 38 (conclusiones y lecciones)
E4-T7: Ejecutar prompt 39 (checklist y release)
```

---

## Video de Presentación (30 pts)

### Checklist de Ítems

| # | Ítem | Puntos | Prompt | Estado |
|---|------|--------|--------|--------|
| A.1 | Demo funcional del sistema | 12 pts | 40 | ⬜ |
| A.2 | Explicación arquitectura y decisiones | 10 pts | 40 | ⬜ |
| A.3 | Resultados y reflexión crítica | 8 pts | 40 | ⬜ |

### Estructura del Video (máx 30 min)

| Segmento | Contenido | Tiempo |
|----------|-----------|--------|
| Apertura | Proyecto, caso de uso, stack REAL-TIME | 1-2 min |
| Demo | Sistema en URL cloud, streaming en VIVO | 8-10 min |
| | - Demostrar WebSocket streaming bidireccional | |
| | - Mostrar transcripción en tiempo real | |
| | - Mostrar extracción incremental con entity matching | |
| | - Demostrar alerta de interacción medicamentosa <1s | |
| Arquitectura | Diagrama C4 real-time, WebSocket Gateway, decisiones | 6-8 min |
| | - Explicar decisión real-time vs batch | |
| | - VAD intelligent buffering cost optimization | |
| | - Entity Matching Engine architecture | |
| Resultados | Latencia end-to-end, RAGAS, costos real vs target | 4-5 min |
| | - Latencia p95 <2s | |
| | - Costo $0.27-0.32 por consulta 60min | |
| Reflexión | Limitaciones, trade-offs real-time, mejoras futuras | 3-4 min |
| Cierre | Repositorio, URL, agradecimiento | 30 seg |

### Tareas Específicas

```
EV-T1: Ejecutar prompt 40 (preparación video)
EV-T2: Grabar demo del sistema en producción
EV-T3: Preparar slides con arquitectura y resultados
EV-T4: Grabar explicación de arquitectura
EV-T5: Grabar análisis de resultados y reflexión
EV-T6: Editar y consolidar video
EV-T7: Subir a YouTube (unlisted)
EV-T8: Agregar enlace al README.md
```

---

## Cronograma Semanal

```
Semana 1-2 (E1):
├── Día 1-2: Prompts 01-02 (setup, problema)
├── Día 3-4: Prompts 03-05 (requerimientos, alcance)
├── Día 5-6: Prompts 06-08 (arquitectura inicial)
└── Día 7: Consolidación E1, revisión

Semana 3-4 (E2 - Arquitectura Real-Time):
├── Día 1-2: Prompts 09-10 (análisis, gap)
├── Día 3-4: PROMPT-07, PROMPT-08 (pipeline streaming, API WebSocket)
├── Día 5-6: PROMPT-11, PROMPT-12 (VAD cost optimization, RAG incremental)
├── Día 7-8: Prompts 16-A, 19-A (WebSocket impl, Entity Matching)
├── Día 9-10: Prompt 13, diagramas C4 (real-time), ADRs
├── Día 11: Consolidación E2, OpenAPI + WebSocket spec

Semana 5-6 (E3 - Implementation Real-Time):
├── Día 1-2: Prompts 14-15 (setup Python, Docker)
├── Día 3-5: Prompts 16-20 (WebSocket Gateway, Stream Processor, Transcription)
├── Día 6-7: Prompts 19, 20, 20-A (Entity Matching, Extraction, RAG incremental)
├── Día 8-9: Prompts 21-23 (endpoints API REST + WebSocket)
├── Día 10-11: Prompts 24-25 (integración frontend/backend)
├── Día 12-14: Prompts 26-29 (testing: unit, integration, load, RAGAS)
└── Día 15-16: Prompts 30-32 (CI/CD, observabilidad, metrics)

Semana 7-8 (E4 + Video):
├── Día 1-3: Prompts 33-35 (despliegue)
├── Día 4-5: Prompts 36-38 (documentación)
├── Día 6: Prompt 39 (checklist, release)
├── Día 7-10: Prompt 40 (video)
├── Día 11-12: Revisión final
└── Día 13-14: Buffer para correcciones
```

---

## Criterios de Éxito por Entregable

### E1 (7 pts)
- [ ] Caso de uso claro con 5W+H
- [ ] ≥5 RF con criterios medibles
- [ ] ≥4 RNF con umbrales
- [ ] Plan de trabajo realista

### E2 (18 pts)
- [ ] Diagrama C4 completo y legible (REAL-TIME architecture)
- [ ] WebSocket Gateway architecture documented
- [ ] Entity Matching Engine design complete
- [ ] Streaming pipeline with VAD cost optimization
- [ ] ≥2 ADRs con trade-offs reales (Real-time, Vector Store)
- [ ] System prompt documentado
- [ ] Modelo de amenazas ≥4 amenazas

### E3 (30 pts) - Real-Time System
- [ ] WebSocket Gateway funcionando en cloud
- [ ] Stream Processor con VAD inteligente operativo
- [ ] Entity Matching Engine con semantic similarity
- [ ] 3 endpoints REST + WebSocket streaming funcionando
- [ ] Pipeline RAG incremental E2E operativo
- [ ] Latencia end-to-end <2s (p95)
- [ ] Cobertura tests ≥60% (incluyendo WebSocket)
- [ ] CI/CD en verde

### E4 (15 pts)
- [ ] Plantilla 100% completa
- [ ] Costos con datos reales
- [ ] ≥4 lecciones aprendidas
- [ ] make pre-delivery sin errores

### Video (30 pts)
- [ ] Demo en URL producción (no localhost)
- [ ] 3+ consultas representativas
- [ ] Resultados numéricos reales
- [ ] Reflexión honesta sobre limitaciones

---

## Mapeo de Prompts Real-Time

| Prompt | Purpose | Replaces/Extends |
|--------|---------|------------------|
| **PROMPT-07** | Real-time streaming pipeline with VAD decision tree | Original prompt 07 (batch) |
| **PROMPT-08** | WebSocket API specification and event protocol | Original prompt 08 (REST only) |
| **PROMPT-11** | Streaming cost optimization with intelligent VAD buffering | Original prompt 11 (batch VAD) |
| **PROMPT-12** | Incremental RAG with async validation and priority queue | Original prompt 12 (batch RAG) |
| **Prompt 16-A** | WebSocket Gateway implementation guide (NEW) | - |
| **Prompt 19-A** | Entity Matching Engine implementation (NEW) | - |

---

## Key Real-Time Components

- **WebSocket Gateway**: Opus codec, bidirectional streaming
- **Stream Processor**: Intelligent VAD buffering (voice→5s, silence 0-2s→buffer, 2-10s→batch, >10s→skip)
- **Entity Matching Engine**: Semantic similarity + business rules for conflict resolution
- **Incremental Extraction**: GPT-4o-mini/GPT-4o with entity matching
- **Async RAG Validation**: Priority queue (CRITICAL <1s, HIGH <2s, MEDIUM <3s)

---

## Performance Targets

| Metric | Target |
|--------|--------|
| End-to-end latency | <2s (p95) |
| Critical alerts (drug interactions) | <1s |
| WebSocket message latency | <500ms (p95) |
| Cost per 60-min consultation | $0.27-0.32 |
| Cost savings vs pure streaming | 20-30% |

---

## Task Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           E1: Requirements                              │
│  [01] → [02] → [03] → [04] → [05] → [06] → Consolidation               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         E2: Architecture                                │
│  [09] → [10] → [PROMPT-07] → [PROMPT-08]                               │
│                    │              │                                     │
│                    ▼              ▼                                     │
│              [PROMPT-11]    [16-A, 19-A]                               │
│                    │              │                                     │
│                    └──────┬───────┘                                     │
│                           ▼                                             │
│              [PROMPT-12] → [13] → C4 Diagrams → ADRs                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       E3: Implementation                                │
│  Phase A: [14] → [15]                                                   │
│              │                                                          │
│              ▼                                                          │
│  Phase B: [16] → [17] → [18] → [19] → [20] → [20-A] → [20-B]          │
│              │                                                          │
│              ▼                                                          │
│  Phase C: [21] → [22] → [23]                                           │
│              │                                                          │
│              ▼                                                          │
│  Phase D: [24] → [25]                                                   │
│              │                                                          │
│              ▼                                                          │
│  Phase E: [26] → [27] → [28] → [29]                                    │
│              │                                                          │
│              ▼                                                          │
│  Phase F: [30] → [31] → [32]                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     E4: Documentation + Video                           │
│  [33] → [34] → [35] → [36] → [37] → [38] → [39]                       │
│                                               │                         │
│                                               ▼                         │
│                                      [40] → Video                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Notes

- This roadmap is the master reference for implementation
- Update status (⬜ → 🔄 → ✅) as prompts are executed
- Adjust timeline based on actual progress
- Keep aligned with BSG evaluation criteria at all times
- Real-time architecture is MANDATORY - do not fall back to batch processing
