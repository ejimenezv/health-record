# Prompt 04: Define Non-Functional Requirements

## Objective
Document all non-functional requirements for the MedRecord AI system covering performance, security, scalability, and compliance. This maps to Section 2.3 and 2.4 of the BSG template and completes Delivery 1.

## Context
Non-functional requirements define quality attributes of the system. For a medical AI system processing Spanish consultations, these are critical for:
- Patient data protection (HIPAA considerations)
- Cost predictability (API usage)
- Reliability for clinical use
- Observability for debugging and improvement

## Tasks

### 1. Create Non-Functional Requirements Document
Create `docs/delivery-1/04-non-functional-requirements.md`:

```markdown
# Requerimientos No Funcionales

## 1. Rendimiento en Tiempo Real

### RNF-001: Latencia End-to-End de Transcripción en Streaming
| Campo | Valor |
|-------|-------|
| **ID** | RNF-001 |
| **Categoría** | Rendimiento - Tiempo Real |
| **Descripción** | La transcripción en streaming debe tener latencia mínima desde que se habla hasta que aparece en pantalla |
| **Métrica / Umbral** | - Latencia end-to-end < 2 segundos (p95)<br>- Latencia end-to-end < 3 segundos (p99)<br>- Medido desde audio hablado hasta texto visible en UI |
| **Método de Medición** | Métricas de sistema con timestamps de audio + eventos WebSocket |
| **Justificación** | **CRÍTICO** - Experiencia de tiempo real para el médico durante la consulta |

### RNF-002: Latencia de Extracción Incremental
| Campo | Valor |
|-------|-------|
| **ID** | RNF-002 |
| **Categoría** | Rendimiento - Tiempo Real |
| **Descripción** | Las entidades médicas deben extraerse inmediatamente después de mencionarse |
| **Métrica / Umbral** | - Síntomas extraídos en < 3 segundos desde mención (p95)<br>- Diagnósticos extraídos en < 3 segundos (p95)<br>- Prescripciones extraídas en < 3 segundos (p95)<br>- Chief complaint identificado en < 5 segundos (p95) |
| **Método de Medición** | Métricas de eventos con timestamps |
| **Justificación** | **CRÍTICO** - Validación y alertas en tiempo real (ej: interacciones medicamentosas) |

### RNF-002-A: Latencia de Alertas Críticas
| Campo | Valor |
|-------|-------|
| **ID** | RNF-002-A |
| **Categoría** | Rendimiento - Seguridad Paciente |
| **Descripción** | Las alertas críticas (interacciones medicamentosas) deben mostrarse inmediatamente |
| **Métrica / Umbral** | - Alerta de interacción MAYOR/CRÍTICA en < 1 segundo desde detección de segunda prescripción (p95)<br>- Evento WebSocket enviado con prioridad alta |
| **Método de Medición** | Métricas de eventos críticos |
| **Justificación** | **SEGURIDAD DEL PACIENTE** - Prevenir prescripciones peligrosas en tiempo real |

### RNF-003: Latencia de WebSocket Messaging
| Campo | Valor |
|-------|-------|
| **ID** | RNF-003 |
| **Categoría** | Rendimiento - Infraestructura |
| **Descripción** | Los mensajes WebSocket deben transmitirse con latencia mínima |
| **Métrica / Umbral** | - Latencia de mensaje WebSocket < 500ms (p95)<br>- Latencia < 1s (p99)<br>- Aplica a todos los eventos: transcription_update, extraction events, alerts |
| **Método de Medición** | Timestamps de envío/recepción en logs |
| **Justificación** | Base para todas las latencias de tiempo real |

### RNF-003: Latencia de API Query
| Campo | Valor |
|-------|-------|
| **ID** | RNF-003 |
| **Categoría** | Rendimiento |
| **Descripción** | Las consultas al endpoint /query deben ser responsivas |
| **Métrica / Umbral** | - Respuesta en < 3 segundos (p95)<br>- < 5 segundos (p99) |
| **Método de Medición** | Métricas de API |
| **Justificación** | Requisito BSG, experiencia de usuario |

### RNF-004: Throughput del Sistema
| Campo | Valor |
|-------|-------|
| **ID** | RNF-004 |
| **Categoría** | Rendimiento |
| **Descripción** | El sistema debe manejar carga concurrente |
| **Métrica / Umbral** | - Mínimo 10 transcripciones simultáneas<br>- Mínimo 50 queries/segundo<br>- Sin degradación significativa |
| **Método de Medición** | Pruebas de carga (Locust/k6) |
| **Justificación** | Soporte para múltiples médicos simultáneos |

## 2. Escalabilidad

### RNF-005: Escalabilidad Horizontal
| Campo | Valor |
|-------|-------|
| **ID** | RNF-005 |
| **Categoría** | Escalabilidad |
| **Descripción** | El sistema debe escalar horizontalmente para manejar más carga |
| **Métrica / Umbral** | - Auto-scaling de 2 a 10 instancias<br>- Trigger: CPU > 70% o queue > 20 jobs<br>- Scale-down después de 5 min bajo carga |
| **Método de Medición** | Kubernetes HPA metrics |
| **Justificación** | Manejo de picos de demanda (ej: mañanas) |

### RNF-006: Escalabilidad de Datos
| Campo | Valor |
|-------|-------|
| **ID** | RNF-006 |
| **Categoría** | Escalabilidad |
| **Descripción** | El vector store debe manejar crecimiento de knowledge base |
| **Métrica / Umbral** | - Hasta 1 millón de chunks<br>- Latencia de búsqueda < 500ms con carga máxima |
| **Método de Medición** | Benchmarks de ChromaDB |
| **Justificación** | Crecimiento de base de conocimiento médico |

## 3. Seguridad

### RNF-007: Autenticación
| Campo | Valor |
|-------|-------|
| **ID** | RNF-007 |
| **Categoría** | Seguridad |
| **Descripción** | Todos los endpoints deben requerir autenticación |
| **Métrica / Umbral** | - JWT tokens con expiración (30 min access, 7 días refresh)<br>- Algoritmo HS256 mínimo<br>- 0 endpoints desprotegidos (excepto /health, /docs) |
| **Método de Medición** | Auditoría de seguridad, OWASP ZAP |
| **Justificación** | Protección de datos médicos sensibles |

### RNF-008: Autorización
| Campo | Valor |
|-------|-------|
| **ID** | RNF-008 |
| **Categoría** | Seguridad |
| **Descripción** | Control de acceso basado en roles |
| **Métrica / Umbral** | - Roles definidos: admin, doctor, readonly<br>- Matriz RBAC documentada<br>- Principio de mínimo privilegio |
| **Método de Medición** | Pruebas de autorización |
| **Justificación** | Segregación de funciones |

### RNF-009: Protección de Datos en Tránsito
| Campo | Valor |
|-------|-------|
| **ID** | RNF-009 |
| **Categoría** | Seguridad |
| **Descripción** | Todas las comunicaciones deben ser cifradas |
| **Métrica / Umbral** | - TLS 1.2+ obligatorio<br>- Certificados válidos<br>- HSTS habilitado |
| **Método de Medición** | SSL Labs test, configuración |
| **Justificación** | Confidencialidad de datos médicos |

### RNF-010: Protección de Datos en Reposo
| Campo | Valor |
|-------|-------|
| **ID** | RNF-010 |
| **Categoría** | Seguridad |
| **Descripción** | Datos sensibles deben estar cifrados en almacenamiento |
| **Métrica / Umbral** | - Base de datos con encryption at rest<br>- Archivos de audio cifrados<br>- Secrets en vault/secret manager |
| **Método de Medición** | Auditoría de configuración |
| **Justificación** | Protección ante acceso no autorizado |

### RNF-011: Sanitización de Inputs
| Campo | Valor |
|-------|-------|
| **ID** | RNF-011 |
| **Categoría** | Seguridad |
| **Descripción** | Todos los inputs deben ser validados y sanitizados |
| **Métrica / Umbral** | - Validación de tipos y formatos<br>- Protección contra prompt injection<br>- Límites de tamaño de archivo |
| **Método de Medición** | Pruebas de seguridad, SAST |
| **Justificación** | OWASP Top 10: Injection prevention |

### RNF-012: Gestión de Secretos
| Campo | Valor |
|-------|-------|
| **ID** | RNF-012 |
| **Categoría** | Seguridad |
| **Descripción** | API keys y secretos deben gestionarse de forma segura |
| **Métrica / Umbral** | - No secretos en código (0 en scans)<br>- Rotación de keys configurable<br>- Secretos en variables de entorno o vault |
| **Método de Medición** | Gitleaks, Trufflehog scans |
| **Justificación** | Prevención de exposición de credenciales |

## 4. Disponibilidad

### RNF-013: Uptime del Servicio
| Campo | Valor |
|-------|-------|
| **ID** | RNF-013 |
| **Categoría** | Disponibilidad |
| **Descripción** | El sistema debe mantener alta disponibilidad |
| **Métrica / Umbral** | - Uptime >= 99.5% mensual<br>- Máximo 3.6 horas downtime/mes<br>- Excluye mantenimiento programado |
| **Método de Medición** | Monitoreo uptime (Prometheus/CloudWatch) |
| **Justificación** | Servicio crítico para operación clínica |

### RNF-014: Recuperación ante Fallos
| Campo | Valor |
|-------|-------|
| **ID** | RNF-014 |
| **Categoría** | Disponibilidad |
| **Descripción** | El sistema debe recuperarse de fallos gracefully |
| **Métrica / Umbral** | - RTO (Recovery Time Objective): < 15 minutos<br>- RPO (Recovery Point Objective): < 1 hora<br>- Retry automático para APIs externas |
| **Método de Medición** | Pruebas de chaos engineering |
| **Justificación** | Minimizar impacto de fallos |

### RNF-015: Degradación Graceful
| Campo | Valor |
|-------|-------|
| **ID** | RNF-015 |
| **Categoría** | Disponibilidad |
| **Descripción** | El sistema debe degradar funcionalidad sin fallar completamente |
| **Métrica / Umbral** | - Si RAG falla: extracción continúa sin validación<br>- Si Whisper falla: retorna error claro, no crash<br>- Circuit breaker para APIs externas |
| **Método de Medición** | Pruebas de fault injection |
| **Justificación** | Resiliencia ante fallos parciales |

## 5. Observabilidad

### RNF-016: Logging Estructurado
| Campo | Valor |
|-------|-------|
| **ID** | RNF-016 |
| **Categoría** | Observabilidad |
| **Descripción** | Todos los eventos deben registrarse de forma estructurada |
| **Métrica / Umbral** | - Formato JSON<br>- Incluye: timestamp, level, request_id, user_id<br>- NO incluye: contenido médico, PII en logs<br>- Retención: 30 días |
| **Método de Medición** | Revisión de configuración de logging |
| **Justificación** | Debugging y auditoría |

### RNF-017: Métricas de Sistema
| Campo | Valor |
|-------|-------|
| **ID** | RNF-017 |
| **Categoría** | Observabilidad |
| **Descripción** | Métricas clave deben estar disponibles en tiempo real |
| **Métrica / Umbral** | - Latencia por endpoint (p50, p95, p99)<br>- Tasa de errores<br>- Tokens consumidos por request<br>- Costo acumulado diario |
| **Método de Medición** | Prometheus + Grafana dashboard |
| **Justificación** | Monitoreo proactivo y control de costos |

### RNF-018: Trazabilidad
| Campo | Valor |
|-------|-------|
| **ID** | RNF-018 |
| **Categoría** | Observabilidad |
| **Descripción** | Cada request debe ser trazable end-to-end |
| **Métrica / Umbral** | - Request ID único por transacción<br>- Propagación de trace a servicios externos<br>- Correlación entre logs |
| **Método de Medición** | Revisión de tracing |
| **Justificación** | Debugging de flujos complejos |

### RNF-019: Alertas
| Campo | Valor |
|-------|-------|
| **ID** | RNF-019 |
| **Categoría** | Observabilidad |
| **Descripción** | Alertas automáticas para condiciones anómalas |
| **Métrica / Umbral** | - Alerta si error rate > 5%<br>- Alerta si latencia p95 > 2x normal<br>- Alerta si costo diario > 80% budget |
| **Método de Medición** | Configuración de alertas |
| **Justificación** | Respuesta proactiva a incidentes |

## 6. Costos

### RNF-020: Control de Costos de API
| Campo | Valor |
|-------|-------|
| **ID** | RNF-020 |
| **Categoría** | Costos |
| **Descripción** | Los costos de APIs externas deben ser predecibles y controlados |
| **Métrica / Umbral** | - Costo por consulta 60 min < $0.60 USD<br>- Budget mensual configurable<br>- Rate limiting cuando se acerca al límite |
| **Método de Medición** | Tracking de costos integrado |
| **Justificación** | Viabilidad económica del sistema |

### RNF-021: Optimización de Tokens y Selección de Modelos
| Campo | Valor |
|-------|-------|
| **ID** | RNF-021 |
| **Categoría** | Costos |
| **Descripción** | El uso de tokens LLM debe estar optimizado con selección dinámica de modelos |
| **Métrica / Umbral** | - Prompts optimizados (no redundancia)<br>- Caching de respuestas LLM y embeddings en Redis/memoria<br>- TTL de caché: 24h para extracciones, 7 días para embeddings, 12h para RAG<br>- Selección de modelo por tiers:<br>&nbsp;&nbsp;• FAST_CHEAP (GPT-4o-mini): validación simple, lookups<br>&nbsp;&nbsp;• BALANCED (GPT-4o): extracción completa, CIE-10<br>&nbsp;&nbsp;• PREMIUM (GPT-4-turbo): casos complejos, diagnóstico diferencial<br>- Degradación automática a tier más bajo si presupuesto > 80% usado |
| **Método de Medición** | Análisis de uso de tokens, métricas de cache hits |
| **Justificación** | Reducción de costos operativos mediante caching y selección inteligente de modelos |

## 7. Cumplimiento

### RNF-022: Consideraciones HIPAA
| Campo | Valor |
|-------|-------|
| **ID** | RNF-022 |
| **Categoría** | Cumplimiento |
| **Descripción** | El sistema debe seguir mejores prácticas de protección de datos médicos |
| **Métrica / Umbral** | - Audit logging de accesos<br>- Control de acceso granular<br>- Cifrado de datos sensibles<br>- No almacenamiento de audio en cloud de terceros |
| **Método de Medición** | Auditoría de cumplimiento |
| **Justificación** | Datos de salud requieren protección especial |

### RNF-023: Retención de Datos
| Campo | Valor |
|-------|-------|
| **ID** | RNF-023 |
| **Categoría** | Cumplimiento |
| **Descripción** | Políticas de retención de datos definidas |
| **Métrica / Umbral** | - Audio: eliminar después de procesamiento exitoso<br>- Transcripciones: según política del cliente<br>- Logs: 30 días máximo |
| **Método de Medición** | Configuración de políticas |
| **Justificación** | Minimización de datos |

## 8. Calidad de Código

### RNF-024: Cobertura de Tests
| Campo | Valor |
|-------|-------|
| **ID** | RNF-024 |
| **Categoría** | Calidad |
| **Descripción** | El código debe tener cobertura de pruebas adecuada |
| **Métrica / Umbral** | - Cobertura total > 80%<br>- Cobertura de core business logic > 90%<br>- Tests unitarios, integración y carga |
| **Método de Medición** | pytest-cov, CI pipeline |
| **Justificación** | Requisito BSG, confiabilidad |

### RNF-025: Estándares de Código
| Campo | Valor |
|-------|-------|
| **ID** | RNF-025 |
| **Categoría** | Calidad |
| **Descripción** | El código debe seguir estándares definidos |
| **Métrica / Umbral** | - Formato: Black<br>- Linting: Ruff (0 errores)<br>- Type hints: MyPy strict<br>- Documentación: Docstrings en funciones públicas |
| **Método de Medición** | CI pipeline checks |
| **Justificación** | Mantenibilidad y consistencia |

---

## 9. Restricciones y Supuestos

### 9.1 Restricciones

| ID | Restricción | Impacto |
|----|-------------|---------|
| REST-001 | Presupuesto cloud máximo: $200 USD/mes | Limita escalabilidad y almacenamiento |
| REST-002 | No almacenar PII en logs | Dificulta debugging de ciertos casos |
| REST-003 | Solo idioma español | Limita mercado potencial |
| REST-004 | Usar APIs de OpenAI (no fine-tuning) | Dependencia de proveedor |
| REST-005 | Tiempo de desarrollo: 8 semanas | Limita alcance |

### 9.2 Supuestos

| ID | Supuesto | Riesgo si falso |
|----|----------|-----------------|
| SUP-001 | Usuarios tienen conexión estable a Internet | Sistema no funciona offline |
| SUP-002 | Audio de entrada tiene calidad aceptable | Degradación de precisión |
| SUP-003 | Whisper mantiene precisión para español médico | Requiere evaluación y ajustes |
| SUP-004 | Costo de OpenAI se mantiene estable | Presupuesto afectado |
| SUP-005 | 2 hablantes máximo por consulta | Limita casos de uso |

---

## 10. Resumen de Métricas Clave

| Categoría | Métrica Principal | Umbral |
|-----------|-------------------|--------|
| Rendimiento | Latencia transcripción 60min | < 120s p95 |
| Rendimiento | Latencia /query | < 3s p95 |
| Disponibilidad | Uptime | >= 99.5% |
| Seguridad | Vulnerabilidades críticas | 0 |
| Costos | Costo por consulta 60min | < $0.60 |
| Calidad | Cobertura de tests | > 80% |
| Calidad LLM | Faithfulness (RAGAS) | > 0.80 |
```

## Expected Deliverables
- `docs/delivery-1/04-non-functional-requirements.md` - Complete non-functional requirements

## Verification Steps
1. All NFRs have unique IDs and categories
2. Metrics and thresholds are specific and measurable
3. Security requirements cover OWASP basics
4. Observability requirements are comprehensive
5. Cost constraints are realistic
6. Restrictions and assumptions documented
7. BSG requirements (testing, documentation) covered

## Notes
- NFRs are as important as functional requirements
- Every metric must be measurable
- Security is critical for medical data
- Cost control is essential for viability
- This content maps to Sections 2.3 and 2.4 of BSG template
- Combined with prompts 02-03, this completes Delivery 1 core content
