# Architecture Decision Records (ADRs)

Este directorio contiene los registros de decisiones arquitectónicas (ADRs) del proyecto **MedRecord AI**.

Las ADRs documentan decisiones técnicas significativas que afectan la estructura, dependencias o comportamiento del sistema, junto con su justificación, alternativas evaluadas y criterios bajo los cuales serían revisitadas.

## Índice

| ID | Título | Estado | Fecha |
|----|--------|--------|-------|
| [ADR-001](ADR-001-seleccion-modelo-llm.md) | Selección del modelo LLM con estrategia multi-tier | Aceptado | 01/05/2026 |
| [ADR-002](ADR-002-vector-store-selection.md) | Selección de ChromaDB como vector store | Aceptado | 07/04/2026 |
| [ADR-003](ADR-003-nodejs-python-ai-integration.md) | Integración Node.js Backend ↔ Python AI Service | Aceptado | 30/04/2026 |
| [ADR-004](ADR-004-arquitectura-ai-service.md) | Arquitectura del servicio AI (FastAPI + WebSockets + Redis) | Aceptado | 01/05/2026 |
| [ADR-005](ADR-005-estrategia-diarizacion.md) | Estrategia híbrida de diarización de hablantes | Aceptado | 01/05/2026 |
| [ADR-006](ADR-006-arquitectura-streaming-realtime.md) | Arquitectura de streaming bidireccional en tiempo real | Aceptado | 01/05/2026 |
| [ADR-007](ADR-007-seleccion-cloud-provider.md) | Selección de AWS EC2 + Terraform como cloud target | Aceptado | 01/05/2026 |

> Nota sobre numeración: ADR-003 quedó asignada a la decisión de integración Node↔Python (la primera divergencia significativa entre la especificación de los prompts y el código real). La selección de cloud provider, originalmente listada como ADR-003 en el prompt 35, se renumeró a ADR-007 para no colisionar.

## Template

Cada ADR sigue esta estructura:

### Encabezado
- **Título**: Verbo o sustantivo describiendo la decisión
- **Fecha**: DD/MM/AAAA
- **Estado**: Propuesto | Aceptado | Rechazado | Deprecado | Reemplazado por ADR-XXX
- **Autores**: Persona(s) responsable(s)

### Secciones
1. **Contexto** — problema, restricciones, requerimientos cuantificables
2. **Decisión** — qué se decidió y la justificación principal
3. **Opciones evaluadas** — tabla comparativa con criterios cuantificables
4. **Consecuencias positivas** — beneficios técnicos, económicos, operacionales
5. **Consecuencias negativas / Trade-offs** — deuda, limitaciones, riesgos
6. **Criterios de revisión** — condiciones que dispararían revisitar la decisión
7. **Referencias** — código, documentos relacionados, fuentes externas

## Cuándo crear una nueva ADR

Crear una ADR cuando una decisión:

- Afecta varios servicios o el modelo de despliegue
- Introduce o reemplaza una dependencia significativa (LLM, base de datos, framework)
- Establece un contrato entre componentes que no es derivable del código
- Documenta un trade-off no obvio (por qué se rechazó la opción "obvia")
- Diverge intencionalmente de un prompt o especificación previa

No crear una ADR para:

- Cambios puramente locales a un módulo
- Convenciones de código (van a CLAUDE.md o linters)
- Bugs y sus fixes (van al historial de git)
