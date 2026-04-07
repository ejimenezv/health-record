# 📦 Entregables Oficiales — Proyecto Final AI/LLM

**Programa:** AI-LLM Solution Architect  
**Curso:** 5 — Proyecto Final de Arquitectura e Integración AI/LLM  
**Versión:** v2.0

> Este documento define **qué** debe entregarse, **cuándo**, **cómo** y con qué **peso** en la calificación final (escala 0–100 puntos).  
> Es el contrato oficial entre el participante y el instructor.  
> Un entregable no enviado dentro del plazo equivale a puntaje 0 en ese ítem.

---

## Tabla de Contenidos

- [Estructura de la Calificación y Entregables](#estructura-de-la-calificación-y-entregables)
- [Calendario de Entregables](#calendario-de-entregables)
- [Entregable V — Video de Presentación](#entregable-v--video-de-presentación-30-pts)
- [Entregable 1 — Documento de Alcance y Requerimientos](#entregable-1--documento-de-alcance-y-requerimientos-cap-1)
- [Entregable 2 — Diseño de Arquitectura](#entregable-2--diseño-de-arquitectura-cap-2)
- [Entregable 3 — Implementación Funcional](#entregable-3--implementación-funcional-cap-3)
- [Entregable 4 — Documentación Final](#entregable-4--documentación-final-cap-4)
- [Checklist Maestro de Entrega Final](#checklist-maestro-de-entrega-final)
- [Instrucciones de Entrega](#instrucciones-de-entrega)
- [Política de Retrasos](#política-de-retrasos)

---

## Estructura de la Calificación y Entregables

La calificación final del proyecto es sobre **100 puntos** y se distribuye en **dos bloques independientes**:

| Bloque | Entregable | Puntos | Cuándo se entrega |
|--------|-----------|--------|------------------|
| **A — Video** | **Entregable V:** Video de presentación (máx. 30 min) | **30 pts** | Junto con E4, fin de S8 |
| **B — Técnico** | E1: Alcance y Requerimientos | 7 pts* | Fin de S2 |
| **B — Técnico** | E2: Diseño de Arquitectura | 18 pts* | Fin de S4 |
| **B — Técnico** | E3: Implementación Funcional | 30 pts* | Fin de S6 |
| **B — Técnico** | E4: Documentación Final | 15 pts* | Fin de S8 |
| | **TOTAL** | **100 pts** | |
| | **Mínimo para aprobar** | **80 pts** | |

> *Los pesos por entregable técnico (E1–E4) son **pesos de hito de progreso** durante el curso. La calificación técnica final se calcula aplicando la **rúbrica de 6 dimensiones** (80 pts en total) sobre el proyecto completo al final del curso. Ver [03_criterios_evaluacion.md](03_criterios_evaluacion.md) para el detalle de dimensiones y sub-criterios.

---

## Calendario de Entregables

```
Sesión  S1   S2   S3   S4   S5   S6   S7   S8
Cap. 1  ████████
                   E1↑
Cap. 2            ████████
                               E2↑
Cap. 3                         ████████
                                           E3↑
Cap. 4                                    ████████
                                                      EV + E4↑
```

| Entregable | Capítulo | Sesiones | Fecha Límite | Puntos |
|-----------|---------|---------|-------------|--------|
| E1 — Alcance y Requerimientos | Cap. 1 | S1–S2 | Fin de S2 (23:59 UTC) | 7 pts (hito) |
| E2 — Diseño de Arquitectura | Cap. 2 | S3–S4 | Fin de S4 (23:59 UTC) | 18 pts (hito) |
| E3 — Implementación Funcional | Cap. 3 | S5–S6 | Fin de S6 (23:59 UTC) | 30 pts (hito) |
| **EV — Video de Presentación** | Cap. 4 | S7–S8 | Fin de S8 (23:59 UTC) | **30 pts** |
| E4 — Documentación Final | Cap. 4 | S7–S8 | Fin de S8 (23:59 UTC) | 15 pts (hito) |

---

## Entregable V — Video de Presentación (30 pts)

> **Este es el entregable de mayor peso individual del proyecto.**

**Puntos:** 30 sobre 100  
**Duración máxima:** 30 minutos — videos más largos solo se evalúan hasta el minuto 30  
**Entrega:** Junto con E4, al cierre de la Sesión 8  
**Formato:** Enlace accesible en el `README.md` del repositorio

### Descripción

El video integra en un único entregable la capacidad del participante de demostrar su sistema funcionando, explicar sus decisiones técnicas y presentar resultados reales con reflexión crítica. Reemplaza la defensa oral presencial y permite evaluación asincrónica con consistencia entre participantes.

> El video **no es una grabación de pantalla de diapositivas**. Debe mostrar el sistema funcionando en producción, con el participante explicando en voz propia las decisiones que tomó y los resultados que obtuvo.

### Estructura Recomendada del Video

| Segmento | Contenido | Tiempo sugerido |
|----------|-----------|----------------|
| **Apertura** | Nombre del proyecto, caso de uso en 2 oraciones, stack tecnológico | 1–2 min |
| **Demo en vivo** | Sistema corriendo en URL cloud: `/ingest`, `/query` (3+ consultas reales), `/health`. Mostrar un caso de error o fuera de alcance. | 8–10 min |
| **Arquitectura** | Diagrama C4 en pantalla. Explicar los 3 componentes más críticos y por qué se eligieron. Trade-offs reales. | 6–8 min |
| **Resultados** | Scores de evaluación LLM (RAGAS), latencia p95 medida, costo real vs. estimado. Mostrar el dashboard o reporte. | 4–5 min |
| **Reflexión** | 3 cosas que harías diferente. Limitaciones actuales. Siguiente versión. | 3–4 min |
| **Cierre** | Repositorio, URL del sistema, agradecimiento | 30 seg |

### Cómo se Evalúa el Video

La evaluación del video sigue los 3 sub-criterios definidos en `EVALUATION_CRITERIA.md`:

| Sub-criterio | Puntos |
|-------------|--------|
| A.1 — Demostración funcional del sistema | 12 pts |
| A.2 — Explicación de arquitectura y decisiones técnicas | 10 pts |
| A.3 — Presentación de resultados y reflexión crítica | 8 pts |
| **Total Video** | **30 pts** |

### Qué Hace que un Video Sea Excepcional

- El sistema funciona sin interrupciones en la URL de producción durante toda la demo
- El participante habla con fluidez técnica sin leer guiones ni notas
- Los números son reales: "el Faithfulness de RAGAS fue 0.91" no "las respuestas fueron buenas"
- La reflexión es honesta: se admiten limitaciones reales, no solo logros
- El tiempo se usa con inteligencia: más demo, menos introducción

### Qué Descalifica Parcialmente un Video

- Demo sobre localhost o entorno inestable (−3 pts en A.1)
- Menos de 3 consultas representativas en la demo (−3 pts en A.1)
- Resultados sin datos numéricos reales (−3 pts en A.3)
- Arquitectura explicada sin mencionar trade-offs (−3 pts en A.2)
- Video que termina antes del minuto 20 sin cubrir todos los segmentos

---

## Entregable 1 — Documento de Alcance y Requerimientos (Cap. 1)

**Peso como hito:** 7 puntos (progreso)  
**Sesiones de trabajo:** S1–S2  
**Entrega:** Fin de S2

### Descripción

Establece los cimientos del proyecto: define el problema empresarial, el caso de uso AI/LLM seleccionado, los requerimientos funcionales y no funcionales, el alcance delimitado y el plan de trabajo para el resto del curso.

### Ítems de E1

| # | Ítem | Obligatorio |
|---|------|------------|
| 1.1 | Secciones 1 y 2 de la Plantilla Oficial completadas | ✅ |
| 1.2 | Tabla IN SCOPE / OUT OF SCOPE definida | ✅ |
| 1.3 | Lista de RF (mínimo 5) con criterios de aceptación medibles | ✅ |
| 1.4 | Lista de RNF (mínimo 4) con umbrales cuantificados | ✅ |
| 1.5 | Plan de trabajo preliminar con hitos para los 4 capítulos | ✅ |
| 1.6 | Stack tecnológico preliminar con justificación inicial | ✅ |
| 1.7 | Repositorio Git inicializado con estructura mínima de carpetas | ✅ |
| 1.8 | `.env.example` y `.gitignore` en el repositorio | ✅ |
| 1.9 | Análisis de riesgos preliminar (mínimo 3 riesgos) | ⚠️ Rec. |

### Criterios de Evaluación de E1 (Hito)

| Criterio | Peso |
|----------|------|
| Claridad y profundidad del caso de uso | 30% |
| Calidad y precisión de los RF | 35% |
| Calidad de los RNF con umbrales | 20% |
| Realismo del plan de trabajo | 15% |

---

## Entregable 2 — Diseño de Arquitectura (Cap. 2)

**Peso como hito:** 18 puntos (progreso)  
**Sesiones de trabajo:** S3–S4  
**Entrega:** Fin de S4

### Descripción

Materializa las decisiones de diseño del sistema. Es el blueprint técnico que permite que cualquier ingeniero competente pueda implementar el sistema sin ambigüedades.

### Ítems de E2

| # | Ítem | Obligatorio |
|---|------|------------|
| 2.1 | Secciones 3 y 4 de la Plantilla Oficial completadas | ✅ |
| 2.2 | Diagrama de arquitectura C4 (Contexto + Contenedor) — PNG/SVG alta res. | ✅ |
| 2.3 | Diagrama de flujo de datos / secuencia del ciclo request→response | ✅ |
| 2.4 | ADR-001: Selección del modelo LLM base | ✅ |
| 2.5 | ADR-002: Selección del vector store | ✅ |
| 2.6 | Especificación OpenAPI inicial (endpoints principales con schemas) | ✅ |
| 2.7 | System prompt base documentado con rol, restricciones y formato | ✅ |
| 2.8 | Parámetros RAG especificados y justificados (chunk size, top-k, threshold) | ✅ |
| 2.9 | Modelo de amenazas inicial (sección 5 de la plantilla) | ✅ |
| 2.10 | ADR-003 adicional (cualquier decisión técnica relevante) | ⚠️ Rec. |
| 2.11 | Prototipo mínimo con endpoint `/health` operativo | ⚠️ Rec. |

### Criterios de Evaluación de E2 (Hito)

| Criterio | Peso |
|----------|------|
| Calidad y completitud del diagrama C4 | 30% |
| Profundidad y rigor de los ADRs con trade-offs | 35% |
| Especificación del pipeline RAG y prompts | 20% |
| Modelo de amenazas inicial | 15% |

---

## Entregable 3 — Implementación Funcional (Cap. 3)

**Peso como hito:** 30 puntos (progreso)  
**Sesiones de trabajo:** S5–S6  
**Entrega:** Fin de S6

### Descripción

El corazón técnico del proyecto. Representa la implementación completa y funcional del sistema diseñado en E2, incluyendo código, CI/CD, pruebas, evaluación LLM y despliegue cloud. Es el entregable técnico de mayor peso porque concentra la evidencia directa de las competencias como AI/LLM Solution Architect.

### Ítems de E3

| # | Ítem | Obligatorio |
|---|------|------------|
| 3.1 | Código fuente completo y funcional en `src/` | ✅ |
| 3.2 | Los 3 endpoints operativos en producción: `/query`, `/ingest`, `/health` | ✅ |
| 3.3 | Pipeline RAG funcional end-to-end (demostrable) | ✅ |
| 3.4 | `Dockerfile` multi-stage + `docker-compose.yml` con health checks | ✅ |
| 3.5 | Sistema desplegado en entorno cloud con URL pública en el README | ✅ |
| 3.6 | Suite de pruebas unitarias con cobertura ≥ 60% (`reports/coverage.xml`) | ✅ |
| 3.7 | Al menos 1 prueba de integración del pipeline RAG end-to-end | ✅ |
| 3.8 | Reporte de evaluación LLM con ≥ 3 métricas (`reports/ragas_report.json`) | ✅ |
| 3.9 | Prueba de carga con reporte (≥ 10 usuarios concurrentes) | ✅ |
| 3.10 | Pipeline CI/CD operativo y en verde en GitHub Actions | ✅ |
| 3.11 | `Makefile` con comandos documentados | ✅ |
| 3.12 | Secciones 6 y 7 de la Plantilla Oficial completadas | ✅ |
| 3.13 | Reporte de escaneo de seguridad (`bandit` + `pip-audit`) | ⚠️ Rec. |
| 3.14 | Cobertura de pruebas ≥ 80% | ⚠️ Rec. |
| 3.15 | Dataset de evaluación LLM con ≥ 20 pares Q/A en `notebooks/` | ⚠️ Rec. |

### Criterios de Evaluación de E3 (Hito)

| Criterio | Peso |
|----------|------|
| Funcionalidad del sistema en producción | 35% |
| Calidad del código (lint, tipos, estructura, errores) | 30% |
| Pruebas de código y evaluación LLM | 25% |
| Reproducibilidad y CI/CD | 10% |

---

## Entregable 4 — Documentación Final (Cap. 4)

**Peso como hito:** 15 puntos (progreso)  
**Sesiones de trabajo:** S7–S8  
**Entrega:** Fin de S8 — junto con el Video (EV)

### Descripción

Cierra el proyecto integrando la documentación técnica definitiva y la reflexión crítica sobre el proceso. A diferencia de versiones anteriores del programa, la defensa oral se reemplaza completamente por el Video (EV), por lo que E4 es exclusivamente documentación escrita.

### Ítems de E4

| # | Ítem | Obligatorio |
|---|------|------------|
| 4.1 | Plantilla Oficial completada en su totalidad (todas las secciones, sin placeholders) | ✅ |
| 4.2 | Secciones 8, 9 y 10 completadas: Costos reales, Observabilidad, Conclusiones | ✅ |
| 4.3 | Análisis de costos final con datos reales del entorno cloud usado | ✅ |
| 4.4 | Lecciones aprendidas documentadas (mínimo 4 entradas con aplicación futura) | ✅ |
| 4.5 | Hoja de ruta del trabajo futuro (corto / mediano / largo plazo) | ✅ |
| 4.6 | Tag de versión `v1.0.0` en el repositorio Git | ✅ |
| 4.7 | README final actualizado con resultados reales (scores LLM, latencia, costos) | ✅ |
| 4.8 | Checklist de entrega (`REQUIRED_FILES.md`) completado y verificado | ✅ |
| 4.9 | `make pre-delivery` ejecutado sin errores (evidencia en el CI o captura) | ✅ |
| 4.10 | Feedback de pares completado (si aplica en la cohorte) | ⚠️ Según cohorte |

### Criterios de Evaluación de E4 (Hito)

| Criterio | Peso |
|----------|------|
| Completitud y precisión de la Plantilla Oficial | 50% |
| Profundidad de lecciones aprendidas y hoja de ruta | 30% |
| Calidad del análisis de costos con datos reales | 20% |

---

## Checklist Maestro de Entrega Final

Ejecutar antes de la entrega de E4 + EV. Todos los ítems marcados con ✅ son obligatorios.

### Repositorio Git

- [ ] El repositorio tiene la estructura completa definida en `REQUIRED_FILES.md`
- [ ] El historial de commits tiene mensajes descriptivos (no "update", "fix", "changes")
- [ ] Existe al menos 1 Pull Request mergeado con descripción en el cuerpo del PR
- [ ] El tag `v1.0.0` está creado y pusheado: `git push origin v1.0.0`
- [ ] El archivo `.env` real **no** está commiteado — solo `.env.example`
- [ ] No hay credenciales, tokens ni API keys en el código ni en el historial de Git
- [ ] El CI/CD (`ci.yml`) está en verde en el último commit de `main`

### Video (EV) — 30 pts

- [ ] El enlace al video está en el `README.md` (YouTube unlisted, Drive o Loom)
- [ ] El video dura ≤ 30 minutos (verificar antes de publicar)
- [ ] La demo muestra el sistema en la URL de producción (no localhost)
- [ ] Se demuestran las 3+ consultas representativas del caso de uso
- [ ] Se muestran resultados numéricos reales (RAGAS scores, latencia p95, costos)
- [ ] La reflexión crítica menciona limitaciones reales, no solo logros

### Documentación

- [ ] `README.md` permite reproducir el sistema desde cero en < 15 minutos
- [ ] La Plantilla Oficial está completada al 100% (sin instrucciones sin reemplazar)
- [ ] Los diagramas de arquitectura están en `docs/architecture/` en alta resolución
- [ ] Los ADRs (mínimo 2) están en `docs/adr/` con el template completo
- [ ] La especificación OpenAPI está en `docs/api/openapi.yaml` y es correcta
- [ ] Las secciones de Costos, Observabilidad y Conclusiones tienen datos reales

### Código y Sistema

- [ ] Los 3 endpoints (`/query`, `/ingest`, `/health`) funcionan en la URL cloud
- [ ] `make install && make dev` levanta el entorno local sin errores
- [ ] `make test` pasa con cobertura ≥ 60%
- [ ] `make check-files` pasa sin errores
- [ ] No hay `print()` como mecanismo de logging en producción
- [ ] Las dependencias están versionadas con exactitud en `requirements.txt`

### Pruebas y Evaluación

- [ ] El reporte de cobertura está en `reports/coverage.xml`
- [ ] El reporte de evaluación LLM está en `reports/` (RAGAS o equivalente)
- [ ] El reporte de prueba de carga está en `reports/`
- [ ] El notebook `notebooks/evaluation.ipynb` se ejecuta sin errores

### Entregables de E4

- [ ] Las lecciones aprendidas (≥ 4) están en la sección 10.3 de la plantilla
- [ ] La hoja de ruta (trabajo futuro) está completa con los tres horizontes temporales
- [ ] El análisis de costos final (sección 8.3) tiene datos reales del entorno usado
- [ ] `make pre-delivery` ejecutado sin errores

---

## Instrucciones de Entrega

### Pasos para la Entrega Final (E4 + EV)

**1. Preparar el video**
```
- Duración ≤ 30 minutos
- Subir a YouTube (unlisted), Google Drive compartido, o Loom
- Verificar que el enlace es accesible sin cuenta
```

**2. Actualizar el README con el enlace al video**
```markdown
## 🎥 Video de Presentación
[Ver presentación del proyecto](https://youtube.com/watch?v=XXXX)
Duración: XX minutos
```

**3. Crear el tag de versión**
```bash
git tag -a v1.0.0 -m "Entrega final — Proyecto Final AI/LLM"
git push origin main --tags
```

**4. Auto-verificación final**
```bash
make pre-delivery
# Debe terminar con: ✓ Proyecto listo para entrega final
```

**5. Completar el formulario oficial del programa** con:
- URL del repositorio Git
- URL del sistema desplegado en producción
- URL del video (EV)
- Versión del documento (`v1.0.0`)
- Declaración de autoría firmada

### Qué Revisa el Instructor

| Paso | Acción del instructor |
|------|----------------------|
| 1 | Clona el repositorio en una máquina limpia |
| 2 | Sigue el README — ejecuta `make install && make dev` |
| 3 | Ejecuta `make test` — verifica cobertura ≥ 60% |
| 4 | Ejecuta `make check-files` — verifica estructura |
| 5 | Accede a la URL cloud y prueba los 3 endpoints |
| 6 | Revisa el historial de commits y los PRs |
| 7 | Lee la Plantilla Oficial completa |
| 8 | Revisa los ADRs y los diagramas |
| 9 | Verifica ausencia de secretos en el repositorio |
| 10 | Analiza los reportes en `reports/` |
| 11 | **Ve el video completo** y aplica los sub-criterios A.1, A.2, A.3 |

---

## Política de Retrasos

| Situación | Consecuencia |
|-----------|-------------|
| Entrega hasta 24h después del límite | −5 puntos sobre la nota final |
| Entrega entre 24h y 48h después del límite | −10 puntos sobre la nota final |
| Entrega entre 48h y 72h después del límite | −15 puntos sobre la nota final |
| Entrega después de 72h del límite | Entregable calificado con 0 puntos |
| Video sin enlace en el README a la fecha límite | Video calificado con 0 puntos (30 pts perdidos) |
| Excepción por fuerza mayor notificada ANTES del límite | Extensión de hasta 5 días sin penalización |

> **Política de extensiones:** Para solicitar una extensión, el participante debe notificar al instructor por el canal oficial **antes** del vencimiento del plazo, describiendo brevemente la situación. Las solicitudes post-vencimiento no serán consideradas bajo ninguna circunstancia.

---

## Resumen Visual del Proyecto

```
                    ┌─────────────────────────────────────────────────┐
                    │           CALIFICACIÓN FINAL (100 pts)          │
                    └───────────────────┬─────────────────────────────┘
                                        │
               ┌────────────────────────┴──────────────────────────┐
               │                                                   │
    ┌──────────▼──────────┐                         ┌─────────────▼────────────┐
    │  BLOQUE A — VIDEO   │                         │  BLOQUE B — TÉCNICO      │
    │     (30 puntos)     │                         │     (70 puntos)          │
    └──────────┬──────────┘                         └─────────────┬────────────┘
               │                                                  │
    ┌──────────▼──────────┐              ┌────────────────────────▼──────────────────┐
    │ A.1 Demo funcional  │              │ D1 Análisis y Requerimientos     10 pts   │
    │        12 pts       │              │ D2 Diseño Arquitectónico         20 pts   │
    ├─────────────────────┤              │ D3 Implementación Técnica        18 pts   │
    │ A.2 Arquitectura    │              │ D4 Seguridad, Cumplimiento       10 pts   │
    │        10 pts       │              │ D5 Pruebas y Validación           8 pts   │
    ├─────────────────────┤              │ D6 Documentación Técnica          4 pts   │
    │ A.3 Resultados +    │              └───────────────────────────────────────────┘
    │     Reflexión       │
    │         8 pts       │
    └─────────────────────┘

    Hitos de progreso (no suman directamente a la nota final, pero son requisito):
    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐
    │ E1  │ →  │ E2  │ →  │ E3  │ →  │ E4  │ + EV
    │ S2  │    │ S4  │    │ S6  │    │ S8  │
    └─────┘    └─────┘    └─────┘    └─────┘

    Puntaje mínimo para aprobar: 80 / 100
```

---

*Programa AI-LLM Solution Architect | Curso 5: Proyecto Final | v2.0*  
*Este documento es de referencia oficial — no modificar sin aprobación del coordinador del programa.*
