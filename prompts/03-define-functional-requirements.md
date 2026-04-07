# Prompt 03: Define Functional Requirements

## Objective
Document all functional requirements for the MedRecord AI system with clear acceptance criteria. This maps to Section 2.2 of the BSG template and is part of Delivery 1.

## Context
Functional requirements must be:
- Specific and measurable
- Prioritized (Alta/Media/Baja)
- Traceable to business objectives
- Include acceptance criteria

**Language focus:** All requirements support Spanish language processing.

## Tasks

### 1. Create Functional Requirements Document
Create `docs/delivery-1/03-functional-requirements.md`:

```markdown
# Requerimientos Funcionales

## 1. Módulo de Transcripción

### RF-001: Transcripción de Audio en Tiempo Real (Español)
| Campo | Valor |
|-------|-------|
| **ID** | RF-001 |
| **Descripción** | El sistema debe transcribir audio de consultas médicas en español en tiempo real mediante streaming |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Streaming de audio vía WebSocket<br>- WER (Word Error Rate) < 10% en español médico<br>- Latencia end-to-end < 2 segundos<br>- Soporta consultas de hasta 90 minutos<br>- Incluye timestamps a nivel de palabra<br>- Retorna transcripción incremental<br>- Reconexión automática si se pierde conexión |
| **Dependencias** | OpenAI Whisper API |
| **Trazabilidad** | OBJ-001: Reducir tiempo de documentación |

### RF-002: Detección de Actividad de Voz (VAD) en Streaming
| Campo | Valor |
|-------|-------|
| **ID** | RF-002 |
| **Descripción** | El sistema debe detectar actividad de voz en tiempo real para optimizar procesamiento |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Detecta inicio/fin de voz con latencia < 300ms<br>- Bufferiza solo durante silencios > 2 segundos para enviar en batch<br>- No interrumpe transcripción durante pausas naturales del habla (<1s)<br>- Reduce consumo de API en ~20-30% mediante buffering inteligente<br>- Mantiene timestamps precisos |
| **Dependencias** | Librería VAD (Silero/WebRTC) |
| **Trazabilidad** | OBJ-002: Optimizar costos de API en tiempo real |

### RF-003: Chunking Inteligente en Tiempo Real
| Campo | Valor |
|-------|-------|
| **ID** | RF-003 |
| **Descripción** | El sistema debe agrupar audio en chunks durante streaming para balance latencia/costo |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Envía chunks de 5-10 segundos de voz activa a Whisper<br>- Buffering durante silencios para envío en batch<br>- Mantiene contexto de 1-2 segundos entre chunks<br>- Prioriza latencia en momentos clínicos críticos (prescripción, diagnóstico)<br>- Modo batch automático durante silencios prolongados (>10s) |
| **Dependencias** | RF-002 (VAD) |
| **Trazabilidad** | OBJ-002: Optimizar costos manteniendorespuesta real-time |

### RF-004: Diarización de Hablantes en Tiempo Real
| Campo | Valor |
|-------|-------|
| **ID** | RF-004 |
| **Descripción** | El sistema debe identificar y etiquetar hablantes (doctor/paciente/otros) de forma incremental |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Identifica 2-4 hablantes distintos<br>- Precisión de asignación de rol > 90%<br>- Etiqueta cada segmento con DOCTOR/PACIENTE/ACOMPAÑANTE/DESCONOCIDO<br>- Usa heurísticas (turnos, vocabulario médico, patrones de pregunta-respuesta)<br>- Actualiza etiquetas retroactivamente si detecta corrección |
| **Dependencias** | RF-001 (Transcripción) |
| **Trazabilidad** | OBJ-003: Generar documentación estructurada |

## 2. Módulo de Extracción Médica

### RF-005: Extracción Incremental de Síntomas
| Campo | Valor |
|-------|-------|
| **ID** | RF-005 |
| **Descripción** | El sistema debe extraer síntomas de forma incremental durante la consulta en tiempo real |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Extrae síntomas con latencia < 3 segundos desde mención<br>- Identifica nombre, ubicación anatómica, severidad, duración<br>- F1 Score > 0.85<br>- **Matching inteligente**: detecta si nueva mención se refiere a síntoma ya extraído<br>- **Actualización**: modifica síntoma existente si información posterior lo aclara/contradice<br>- **Versionado**: mantiene historial de cambios con timestamps<br>- Incluye texto fuente de respaldo<br>- Usa modelo económico (GPT-4o-mini) para extracciones simples |
| **Dependencias** | RF-004 (Diarización), RF-012 (RAG) |
| **Trazabilidad** | OBJ-003: Generar documentación estructurada en tiempo real |

### RF-006: Extracción Incremental de Diagnósticos
| Campo | Valor |
|-------|-------|
| **ID** | RF-006 |
| **Descripción** | El sistema debe extraer diagnósticos de forma incremental durante la consulta |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Latencia < 3 segundos desde mención del diagnóstico<br>- Identifica diagnóstico principal y diferenciales<br>- Sugiere código CIE-10 en tiempo real via RAG<br>- F1 Score > 0.90<br>- **Matching**: detecta si diagnóstico mencionado reemplaza uno previo<br>- **Actualización**: marca diagnósticos anteriores como "descartados" si médico cambia de opinión<br>- Nivel de confianza por diagnóstico<br>- Usa GPT-4o para precisión en diagnósticos |
| **Dependencias** | RF-004 (Diarización), RF-012 (RAG incremental) |
| **Trazabilidad** | OBJ-003: Generar documentación estructurada en tiempo real |

### RF-007: Extracción Incremental de Prescripciones con Alertas
| Campo | Valor |
|-------|-------|
| **ID** | RF-007 |
| **Descripción** | El sistema debe extraer prescripciones y validar interacciones en tiempo real |
| **Prioridad** | Alta (Crítico para seguridad) |
| **Criterio de Aceptación** | - Latencia < 3 segundos desde mención de prescripción<br>- Extrae: medicamento, dosis, frecuencia, duración, vía<br>- **Validación inmediata** via RAG: existencia de medicamento<br>- **Detección de interacciones**: verifica contra otras prescripciones en la misma consulta<br>- **Alerta en tiempo real**: notifica al médico si detecta interacción peligrosa (MAYOR/CRÍTICA)<br>- **Matching**: detecta si nueva mención modifica prescripción previa<br>- **Actualización**: reemplaza dosis si médico la corrige<br>- F1 Score > 0.90<br>- Usa GPT-4o para precisión crítica en prescripciones |
| **Dependencias** | RF-004, RF-012 (RAG), RF-019 (Notificaciones real-time) |
| **Trazabilidad** | OBJ-003 + Seguridad del paciente |

### RF-008: Generación Incremental de Nota SOAP
| Campo | Valor |
|-------|-------|
| **ID** | RF-008 |
| **Descripción** | El sistema debe generar una nota SOAP que se actualiza en tiempo real durante la consulta |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - **Actualización en tiempo real**: nota SOAP se construye incrementalmente<br>- Sección Subjective: queja principal + historia (se completa primeros 5-10 min)<br>- Sección Objective: hallazgos mencionados (actualización continua)<br>- Sección Assessment: diagnóstico (se actualiza si médico cambia opinión)<br>- Sección Plan: tratamiento y seguimiento (últimos 10 min típicamente)<br>- Formato consistente y legible<br>- Cada sección cita texto fuente con timestamp<br>- **Vista previa en vivo** disponible en todo momento |
| **Dependencias** | RF-005, RF-006, RF-007, RF-008-A |
| **Trazabilidad** | OBJ-001: Reducir tiempo de documentación en tiempo real |

### RF-008-A: Extracción de Motivo de Consulta (Chief Complaint)
| Campo | Valor |
|-------|-------|
| **ID** | RF-008-A |
| **Descripción** | El sistema debe identificar el motivo principal de la consulta en los primeros minutos |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Detecta motivo en primeros 2-5 minutos de consulta<br>- Formato conciso (1-2 frases)<br>- Identifica si es: consulta nueva, seguimiento, urgencia<br>- Incluye duración del problema si mencionado<br>- F1 Score > 0.90<br>- Notificación inmediata al frontend cuando se detecta<br>- Actualiza si paciente aclara o corrige posteriormente |
| **Dependencias** | RF-001, RF-004 (identificar que es el paciente quien habla) |
| **Trazabilidad** | OBJ-003: SOAP note - Sección Subjective |

### RF-008-B: Matching y Resolución de Conflictos en Extracciones
| Campo | Valor |
|-------|-------|
| **ID** | RF-008-B |
| **Descripción** | El sistema debe detectar cuando nueva información se refiere a entidad ya extraída y fusionar/actualizar inteligentemente |
| **Prioridad** | Alta (Crítico para precisión) |
| **Criterio de Aceptación** | - **Algoritmo de matching**: compara nueva extracción contra existentes usando similaridad semántica + reglas<br>- **Reglas de fusión**:<br>&nbsp;&nbsp;• Síntoma: mismo nombre + ubicación similar → actualizar severidad/duración<br>&nbsp;&nbsp;• Diagnóstico: mismo código CIE-10 o nombre similar → reemplazar si confianza mayor<br>&nbsp;&nbsp;• Prescripción: mismo medicamento → actualizar dosis/frecuencia<br>- **Detección de contradicciones**: marca conflictos irreconciliables para revisión humana<br>- **Historial de cambios**: mantiene log de modificaciones con timestamps<br>- **Threshold de matching**: similaridad > 0.80 para fusión automática<br>- Latencia del matching < 500ms |
| **Dependencias** | RF-005, RF-006, RF-007, embeddings para similaridad |
| **Trazabilidad** | Calidad y precisión de datos extraídos |

### RF-009: Validación Médica con RAG
| Campo | Valor |
|-------|-------|
| **ID** | RF-009 |
| **Descripción** | El sistema debe validar información extraída contra base de conocimiento médico |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Valida nombres de medicamentos en español<br>- Verifica interacciones medicamentosas conocidas<br>- Sugiere códigos CIE-10 para diagnósticos<br>- Incluye advertencias cuando detecta inconsistencias<br>- Faithfulness score (RAGAS) > 0.80 |
| **Dependencias** | RF-012 (RAG Pipeline) |
| **Trazabilidad** | OBJ-004: Mejorar calidad de registros |

## 3. Módulo RAG (Knowledge Base)

### RF-010: Ingesta de Documentos Médicos
| Campo | Valor |
|-------|-------|
| **ID** | RF-010 |
| **Descripción** | El sistema debe permitir ingestar documentos médicos a la base de conocimiento |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Endpoint POST /api/v1/ingest funcional<br>- Soporta PDF, TXT, MD, DOCX<br>- Chunking apropiado para contenido médico<br>- Genera embeddings y almacena en vector store<br>- Retorna cantidad de documentos indexados |
| **Dependencias** | ChromaDB, OpenAI Embeddings |
| **Trazabilidad** | Requisito BSG: Endpoint /ingest |

### RF-011: Consulta de Base de Conocimiento
| Campo | Valor |
|-------|-------|
| **ID** | RF-011 |
| **Descripción** | El sistema debe responder consultas sobre conocimiento médico |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Endpoint POST /api/v1/query funcional<br>- Búsqueda semántica en español<br>- Retorna respuesta generada + fuentes<br>- Incluye score de relevancia<br>- Latencia < 3 segundos |
| **Dependencias** | RF-010, GPT-4 |
| **Trazabilidad** | Requisito BSG: Endpoint /query |

### RF-012: Recuperación de Contexto para Extracción
| Campo | Valor |
|-------|-------|
| **ID** | RF-012 |
| **Descripción** | El sistema debe recuperar contexto relevante del RAG durante la extracción |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Identifica términos médicos en transcripción<br>- Recupera información relevante de KB<br>- Provee contexto al prompt de extracción<br>- Context Precision (RAGAS) > 0.75 |
| **Dependencias** | RF-010 |
| **Trazabilidad** | OBJ-004: Mejorar calidad de registros |

## 4. Módulo de API

### RF-013: Gestión de Sesiones de Streaming en Tiempo Real
| Campo | Valor |
|-------|-------|
| **ID** | RF-013 |
| **Descripción** | El sistema debe gestionar sesiones de transcripción en tiempo real via WebSocket |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Crear sesión de streaming con metadatos (paciente, tipo consulta)<br>- Establecer conexión WebSocket para audio bidireccional<br>- Pausar/reanudar streaming sin perder contexto<br>- Finalizar sesión y persistir resultados<br>- Consultar estado y resultados parciales durante la sesión<br>- **Reconexión automática** con recuperación de estado<br>- **Persistencia incremental**: guarda transcripción y extracciones cada 30s<br>- Eliminar sesión |
| **Dependencias** | Base de datos PostgreSQL, WebSocket server |
| **Trazabilidad** | OBJ-001: Reducir tiempo de documentación en tiempo real |

### RF-014: Autenticación y Autorización
| Campo | Valor |
|-------|-------|
| **ID** | RF-014 |
| **Descripción** | El sistema debe autenticar usuarios y controlar acceso |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Login con username/password<br>- Tokens JWT con expiración<br>- Refresh tokens funcionales<br>- Roles: admin, doctor, readonly<br>- Endpoints protegidos |
| **Dependencias** | - |
| **Trazabilidad** | RNF-003: Seguridad |

### RF-015: Health Check y Monitoreo
| Campo | Valor |
|-------|-------|
| **ID** | RF-015 |
| **Descripción** | El sistema debe exponer endpoints de salud y métricas |
| **Prioridad** | Media |
| **Criterio de Aceptación** | - GET /health retorna estado de componentes<br>- GET /metrics retorna métricas Prometheus<br>- Incluye estado de DB, Vector Store, APIs externas |
| **Dependencias** | - |
| **Trazabilidad** | RNF-006: Observabilidad |

## 5. Módulo de Integración (Frontend/Backend existente)

### RF-016: API de Integración para Backend Node.js
| Campo | Valor |
|-------|-------|
| **ID** | RF-016 |
| **Descripción** | El AI Service debe exponer API compatible con el backend Node.js existente |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - Endpoints RESTful documentados (OpenAPI)<br>- Formatos de request/response compatibles<br>- Manejo de errores consistente<br>- SDK/Cliente generado disponible |
| **Dependencias** | Backend Node.js existente |
| **Trazabilidad** | Integración con sistema existente |

### RF-017: Notificaciones en Tiempo Real (WebSocket Events)
| Campo | Valor |
|-------|-------|
| **ID** | RF-017 |
| **Descripción** | El sistema debe enviar eventos en tiempo real durante la consulta |
| **Prioridad** | Alta |
| **Criterio de Aceptación** | - **WebSocket events**: transcription_update, symptom_extracted, diagnosis_detected, prescription_added, chief_complaint_identified, interaction_warning<br>- Payload incluye: session_id, event_type, data, timestamp, confidence<br>- Latencia de evento < 500ms desde detección<br>- **Manejo de reconexión** sin pérdida de eventos (buffer temporal)<br>- Fallback a Server-Sent Events (SSE) si WebSocket falla<br>- Cliente recibe confirmación de recepción (ACK) |
| **Dependencias** | RF-013 (sesiones streaming) |
| **Trazabilidad** | Integración en tiempo real con frontend |

### RF-018: Dashboard de Costos y Monitoreo
| Campo | Valor |
|-------|-------|
| **ID** | RF-018 |
| **Descripción** | El sistema debe exponer endpoint para monitoreo de costos y uso de API |
| **Prioridad** | Media |
| **Criterio de Aceptación** | - GET /api/v1/costs retorna resumen de costos<br>- Muestra costos por servicio (Whisper, GPT-4, Embeddings)<br>- Incluye proyección mensual y presupuesto restante<br>- Tracking de cache hits para mostrar ahorros<br>- Muestra costo por consulta promedio |
| **Dependencias** | RF-013 |
| **Trazabilidad** | RNF-020: Control de Costos |

## 6. Resumen de Prioridades

| Prioridad | Cantidad | IDs |
|-----------|----------|-----|
| Alta | 14 | RF-001 a RF-014, RF-016 |
| Media | 4 | RF-015, RF-017, RF-018 |
| Baja | 0 | - |

## 7. Matriz de Trazabilidad

| Objetivo de Negocio | Requerimientos |
|---------------------|----------------|
| OBJ-001: Reducir tiempo de documentación | RF-001, RF-008, RF-013 |
| OBJ-002: Optimizar costos de API | RF-002, RF-003 |
| OBJ-003: Generar documentación estructurada | RF-004, RF-005, RF-006, RF-007, RF-008 |
| OBJ-004: Mejorar calidad de registros | RF-009, RF-012 |
| Requisito BSG: Endpoints | RF-010, RF-011 |
| RNF: Seguridad | RF-014 |
| RNF: Observabilidad | RF-015 |
```

## Expected Deliverables
- `docs/delivery-1/03-functional-requirements.md` - Complete functional requirements

## Verification Steps
1. All requirements have unique IDs
2. Each requirement has clear acceptance criteria
3. Priorities are assigned (Alta/Media/Baja)
4. Dependencies are documented
5. Traceability to business objectives exists
6. Requirements cover all use case functionality
7. BSG mandatory endpoints (query/ingest) are included

## Notes
- Use Spanish for requirement descriptions (matches BSG template)
- Every requirement must be testable
- RAG integration requirements (RF-009, RF-012) show value beyond compliance
- Include integration requirements for existing frontend/backend
- This content maps to Section 2.2 of final BSG template
