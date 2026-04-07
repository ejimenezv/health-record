# 📊 Criterios de Evaluación — Proyecto Final AI/LLM

**Programa:** AI-LLM Solution Architect  
**Curso:** 5 — Proyecto Final de Arquitectura e Integración AI/LLM  
**Versión:** v2.0

---

> **Cómo usar este documento**  
> La calificación es sobre **100 puntos**. Se compone de dos bloques independientes:
> - **Video de presentación** (máx. 30 minutos): **30 puntos**
> - **Criterios técnicos del proyecto** (6 dimensiones): **70 puntos**
>
> El puntaje mínimo para aprobar el módulo es **70 puntos**.  
> El instructor evalúa ambos bloques de forma independiente y suma los resultados.

---

## Tabla de Contenidos

- [Estructura General de la Calificación](#estructura-general-de-la-calificación)
- [Escala de Calificación](#escala-de-calificación)
- [Bloque A — Video de Presentación (30 pts)](#bloque-a--video-de-presentación-30-pts)
- [Bloque B — Criterios Técnicos (70 pts)](#bloque-b--criterios-técnicos-70-pts)
  - [Dimensión 1 — Análisis y Requerimientos (10 pts)](#dimensión-1--análisis-y-requerimientos-10-pts)
  - [Dimensión 2 — Diseño Arquitectónico (20 pts)](#dimensión-2--diseño-arquitectónico-20-pts)
  - [Dimensión 3 — Implementación Técnica (18 pts)](#dimensión-3--implementación-técnica-18-pts)
  - [Dimensión 4 — Seguridad, Cumplimiento y Ética (10 pts)](#dimensión-4--seguridad-cumplimiento-y-ética-10-pts)
  - [Dimensión 5 — Pruebas y Validación (8 pts)](#dimensión-5--pruebas-y-validación-8-pts)
  - [Dimensión 6 — Documentación Técnica (4 pts)](#dimensión-6--documentación-técnica-4-pts)
- [Penalizaciones](#penalizaciones)
- [Bonificaciones](#bonificaciones)
- [Cómo Calcular la Nota Final](#cómo-calcular-la-nota-final)
- [Consideraciones Éticas Transversales](#consideraciones-éticas-transversales)

---

## Estructura General de la Calificación

| Bloque | Componente | Puntos | % del Total |
|--------|-----------|--------|------------|
| **A** | Video de presentación (máx. 30 min) | **30** | **30%** |
| **B** | Dimensión 1 — Análisis y Requerimientos | 10 | 10% |
| **B** | Dimensión 2 — Diseño Arquitectónico | 20 | 20% |
| **B** | Dimensión 3 — Implementación Técnica | 18 | 18% |
| **B** | Dimensión 4 — Seguridad, Cumplimiento y Ética | 10 | 10% |
| **B** | Dimensión 5 — Pruebas y Validación | 8 | 8% |
| **B** | Dimensión 6 — Documentación Técnica | 4 | 4% |
| | **TOTAL** | **100** | **100%** |
| | **Mínimo para aprobar** | **80** | **80%** |

---

## Bloque A — Video de Presentación (30 pts)

> **Requisito de forma:** El video debe tener una duración **máxima de 30 minutos**.  
> Videos que excedan este límite serán evaluados **solo hasta el minuto 30**.  
> Formato aceptado: enlace a YouTube (unlisted), Google Drive, o Loom.  
> El enlace debe estar en el `README.md` del repositorio antes de la fecha límite de entrega.

El video es el componente de mayor peso individual porque integra en un solo entregable la capacidad del participante de **demostrar**, **explicar** y **defender** su solución de forma autónoma. Evalúa simultáneamente dominio técnico, capacidad de comunicación y honestidad intelectual sobre los resultados obtenidos.

### Sub-criterios del Video

#### A.1 — Demostración Funcional del Sistema (12 pts)

| Puntaje | Descripción |
|---------|-------------|
| **11 – 12** | El sistema funciona en el entorno de despliegue real (URL cloud, no localhost). Se demuestran los 3 endpoints obligatorios (`/query`, `/ingest`, `/health`). El pipeline RAG retorna respuestas relevantes con al menos 3 consultas representativas del caso de uso real. Se muestra el manejo de al menos 1 caso de error o consulta fuera de alcance. La demo es fluida y sin interrupciones técnicas. |
| **8 – 10** | El sistema funciona en producción. Se demuestran los endpoints principales. Las consultas son representativas aunque el manejo de errores no se muestra. Puede haber alguna interrupción menor durante la demo. |
| **5 – 7** | El sistema funciona pero la demo es en localhost o staging inestable. Menos de 3 consultas demostradas. La demo tiene cortes o requiere explicaciones de "normalmente funciona así". |
| **2 – 4** | La demo es parcial: algunos endpoints no funcionan, o se usa un notebook en lugar del sistema desplegado. |
| **0 – 1** | No hay demo funcional. Se muestra solo código o diapositivas sin sistema operativo. |

#### A.2 — Explicación de la Arquitectura y Decisiones Técnicas (10 pts)

| Puntaje | Descripción |
|---------|-------------|
| **9 – 10** | El participante explica con fluidez y precisión: la arquitectura general apoyado en el diagrama C4, las 3 decisiones técnicas más importantes justificando trade-offs reales (no solo la elección), cómo funciona el pipeline RAG paso a paso, y los controles de seguridad implementados. El nivel de detalle es adecuado para una audiencia técnica senior. |
| **6 – 8** | La explicación cubre arquitectura y decisiones principales. Puede haber imprecisiones en los trade-offs o falta de profundidad en algún componente. El diagrama se usa como apoyo visual. |
| **3 – 5** | La explicación es superficial: se describe qué hace el sistema pero no por qué se diseñó así. Los componentes se mencionan sin explicar su rol o interacción entre ellos. |
| **1 – 2** | La explicación es confusa, incorrecta técnicamente, o el participante claramente no diseñó el sistema que está presentando. |
| **0** | No hay explicación de arquitectura ni de decisiones técnicas en el video. |

#### A.3 — Presentación de Resultados y Reflexión Crítica (8 pts)

| Puntaje | Descripción |
|---------|-------------|
| **7 – 8** | Se presentan resultados reales de evaluación LLM (scores RAGAS u otro framework), pruebas de rendimiento (latencia p95 con datos medidos), y análisis de costos reales vs. estimados. El participante analiza honestamente las limitaciones del sistema y lo que haría diferente en una v2.0. La reflexión demuestra aprendizaje real, no solo logros. |
| **5 – 6** | Se presentan algunos resultados con datos reales. La reflexión existe aunque puede ser superficial o enfocada solo en logros sin mencionar limitaciones. |
| **3 – 4** | Los resultados se mencionan sin datos concretos ("el sistema respondió bien"). Poca o nula reflexión crítica sobre limitaciones o mejoras futuras. |
| **1 – 2** | No se presentan resultados medibles. La reflexión está ausente o es genérica. |
| **0** | Esta sección del video no existe o el video termina antes de llegar a los resultados. |

---

## Bloque B — Criterios Técnicos (70 pts)

> El Bloque B evalúa el artefacto técnico: repositorio Git, código fuente, documentación, pruebas y despliegue.  
> El instructor lo revisa directamente sobre el repositorio y los entregables escritos, de forma independiente al video.

---

### Dimensión 1 — Análisis y Requerimientos (10 pts)

> **Propósito:** Evalúa la capacidad de descomponer un problema empresarial real y traducirlo en especificaciones accionables que guíen el diseño del sistema.

#### 1.1 — Definición del Caso de Uso (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | El caso de uso está definido con el framework 5W+H completo. El problema está cuantificado (volumen, impacto económico, frecuencia). El análisis AS-IS/TO-BE es detallado. La justificación de por qué AI/LLM es la estrategia óptima frente a alternativas (RPA, búsqueda clásica, reglas de negocio) es técnicamente sólida. |
| **2** | El caso de uso está bien definido con actores y contexto claros. El AS-IS/TO-BE existe con algunos gaps. La justificación de AI/LLM es razonable pero le falta profundidad comparativa. |
| **1** | El caso de uso es genérico o ambiguo. Falta información crítica sobre actores, frecuencia o impacto. El análisis AS-IS/TO-BE es superficial o ausente. |
| **0** | El caso de uso no está definido con precisión suficiente para diseñar una solución sobre él. |

#### 1.2 — Requerimientos Funcionales (4 pts)

| Puntaje | Descripción |
|---------|-------------|
| **4** | Todos los RF tienen identificador único, prioridad, verbo modal preciso y criterio de aceptación medible e independientemente verificable. Cubren el 100% del caso de uso sin gaps ni redundancias. Se identifican casos de borde y comportamientos ante inputs inválidos. |
| **3** | La mayoría de RF tienen criterios de aceptación medibles. La cobertura del caso de uso es adecuada. Algunos RF podrían ser más precisos. |
| **2** | Los RF son genéricos o sin criterios de aceptación claros. La cobertura tiene gaps importantes. |
| **1** | Los RF están ausentes, son una lista de features sin estructura, o son indistinguibles de los RNF. |
| **0** | No hay requerimientos funcionales documentados. |

#### 1.3 — Requerimientos No Funcionales y Restricciones (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | Los RNF cubren las 6 dimensiones críticas (rendimiento, escalabilidad, seguridad, disponibilidad, observabilidad, cumplimiento) con umbrales cuantificados y justificados. Las restricciones y supuestos están explícitamente documentados. Se demuestra comprensión de cómo los RNF condicionan las decisiones arquitectónicas. |
| **2** | Los RNF principales están presentes con umbrales numéricos. Puede faltar alguna dimensión o algún umbral sin justificar. |
| **1** | Los RNF son incompletos. Faltan dimensiones críticas. Los umbrales son vagos o inexistentes. |
| **0** | Los RNF están ausentes o se confunden con los RF. |

---

### Dimensión 2 — Diseño Arquitectónico (20 pts)

> **Propósito:** Evalúa la capacidad de diseñar una arquitectura AI/LLM técnicamente sólida, justificada con trade-offs explícitos, y comunicable mediante diagramas estándar de la industria.

#### 2.1 — Diagrama de Arquitectura (6 pts)

| Puntaje | Descripción |
|---------|-------------|
| **6** | Sigue la notación C4 (Contexto + Contenedor). Todos los componentes están presentes: actores, API Gateway, orquestador LLM, modelo base, vector store, fuentes de datos, IAM y observabilidad. Las relaciones incluyen protocolo de comunicación, dirección del flujo y tecnología concreta. El diagrama es auto-explicativo sin necesidad de texto adicional. |
| **4 – 5** | El diagrama muestra los componentes principales con relaciones claras. Puede faltar algún componente secundario o el nivel de detalle en los protocolos es parcial. |
| **2 – 3** | El diagrama existe pero está incompleto. Faltan componentes críticos o las relaciones son ambiguas. |
| **1** | El diagrama no corresponde a la solución implementada o es un esquema genérico copiado sin adaptación al caso de uso. |
| **0** | No existe diagrama de arquitectura. |

#### 2.2 — Architecture Decision Records (ADRs) (7 pts)

| Puntaje | Descripción |
|---------|-------------|
| **7** | Existen ≥ 3 ADRs cubriendo las decisiones más relevantes (LLM base, vector store, framework de orquestación). Cada ADR incluye: contexto técnico, decisión tomada, tabla de alternativas con criterios cuantificables comparados, consecuencias positivas y negativas, y condiciones de revisión. Los trade-offs demuestran pensamiento crítico real. |
| **5 – 6** | Existen ≥ 2 ADRs bien documentados. Las alternativas están identificadas aunque la comparación podría ser más rigurosa. |
| **3 – 4** | Existe 1 ADR o los ADRs son superficiales (solo describen la decisión sin evaluar alternativas ni trade-offs). |
| **1 – 2** | Los ADRs existen pero son mínimos, sin estructura o sin justificación técnica verificable. |
| **0** | No existen ADRs. Las decisiones arquitectónicas no están documentadas. |

#### 2.3 — Diseño del Pipeline RAG y Estrategia de Prompts (4 pts)

| Puntaje | Descripción |
|---------|-------------|
| **4** | Pipeline RAG completamente especificado: chunking (tipo, tamaño, overlap) justificado para el tipo de documentos del caso de uso; modelo de embeddings con justificación de dimensionalidad y costo; top-k y umbral de similitud definidos. System prompt con rol, restricciones, formato de respuesta y manejo de out-of-scope. Se documenta al menos una técnica avanzada (re-ranking, HyDE, multi-query retrieval). |
| **3** | Pipeline RAG especificado con los parámetros principales. System prompt existe y guía el comportamiento del modelo. Puede faltar algún parámetro avanzado o su justificación. |
| **2** | Pipeline RAG presente con parámetros por defecto sin justificación. System prompt genérico o mínimo. |
| **1** | El pipeline RAG o el system prompt están ausentes o sin especificación real. |
| **0** | No hay diseño de RAG ni de prompts documentado en el proyecto. |

#### 2.4 — Diseño de APIs y Flujo de Integración (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | Especificación OpenAPI completa con schemas request/response, ejemplos reales, códigos de error documentados y descripción funcional precisa. Diagrama de secuencia que muestra el ciclo completo request→RAG→LLM→response incluyendo manejo de errores y timeouts. |
| **2** | OpenAPI cubre los endpoints principales con schemas básicos. El flujo de datos está documentado aunque puede faltar el manejo de errores o casos borde. |
| **1** | La especificación de APIs es parcial o inconsistente con la implementación real. El flujo de datos no está documentado. |
| **0** | No existe especificación de APIs ni documentación del flujo de integración. |

---

### Dimensión 3 — Implementación Técnica (18 pts)

> **Propósito:** Evalúa la calidad del código producido, la funcionalidad real del sistema desplegado, y la adherencia a buenas prácticas de ingeniería de software en el contexto de sistemas AI/LLM.

#### 3.1 — Funcionalidad del Sistema (7 pts)

| Puntaje | Descripción |
|---------|-------------|
| **7** | Los 3 endpoints obligatorios (`/query`, `/ingest`, `/health`) funcionan correctamente en el entorno de despliegue cloud. El pipeline RAG retorna respuestas relevantes con fuentes citadas. El sistema maneja gracefully errores comunes (modelo no disponible, vector store vacío, input inválido). |
| **5 – 6** | Los 3 endpoints funcionan. El pipeline RAG opera correctamente. El manejo de errores es básico pero presente. Pueden existir casos borde sin manejar. |
| **3 – 4** | El sistema funciona parcialmente. Algún endpoint falla o el pipeline RAG no opera end-to-end de forma consistente. |
| **1 – 2** | El sistema solo corre localmente en el entorno del participante. El despliegue cloud falla o no existe. |
| **0** | El sistema no funciona. La demo no es posible o muestra un prototipo de notebook no deployado. |

#### 3.2 — Calidad del Código (7 pts)

| Puntaje | Descripción |
|---------|-------------|
| **7** | El código sigue principios SOLID con módulos de responsabilidad clara y bajo acoplamiento. Manejo de errores explícito con excepciones tipadas. Type hints en todas las funciones públicas. Pasa `ruff` y `mypy` sin errores. Sin hardcoding de credenciales, sin código muerto, sin `print()` como logging en producción. Dependencias versionadas con exactitud (`==`). |
| **5 – 6** | El código está bien organizado. El manejo de errores existe aunque no es exhaustivo. Type hints en los componentes principales. Supera lint con advertencias menores. |
| **3 – 4** | El código funciona pero está poco organizado. El manejo de errores es mínimo. Existen valores hardcodeados que deberían ser configurables. |
| **1 – 2** | El código es un notebook convertido a script sin estructura. Las credenciales están hardcodeadas. No supera verificaciones básicas de lint. |
| **0** | El código no está estructurado como una aplicación software. No es posible evaluarlo como un sistema production-ready. |

#### 3.3 — Reproducibilidad y Despliegue (4 pts)

| Puntaje | Descripción |
|---------|-------------|
| **4** | El sistema es completamente reproducible siguiendo solo el README en < 15 minutos en una máquina limpia. Dockerfile multi-stage. `docker-compose.yml` con health checks y dependencias correctamente configuradas. Sistema desplegado en cloud accesible. `Makefile` cubre todos los flujos de trabajo. |
| **3** | El sistema es reproducible con algunos pasos adicionales no documentados. Docker funciona. El despliegue cloud existe aunque puede no estar completamente estable. |
| **2** | El sistema solo corre localmente. Docker existe pero falla en algunos casos. README incompleto para reproducción. |
| **1** | Las instrucciones de reproducción son insuficientes o incorrectas. |
| **0** | El sistema no es reproducible por un tercero. No existe Docker ni entorno de despliegue configurado. |

---

### Dimensión 4 — Seguridad, Cumplimiento y Ética (10 pts)

> **Propósito:** Evalúa la madurez en el diseño de controles de seguridad, la comprensión del entorno regulatorio y la capacidad de identificar y mitigar riesgos éticos inherentes a los sistemas AI/LLM.

#### 4.1 — Gestión de Secretos y Autenticación (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | Ninguna credencial está commiteada al repositorio (verificado con gitleaks o equivalente). Todas las variables sensitivas se gestionan vía `.env` en desarrollo y secrets manager en producción. Autenticación con JWT o equivalente robusto. Rate limiting implementado. Escaneo con `bandit` y `pip-audit` sin hallazgos de severidad media o alta. |
| **2** | No hay credenciales expuestas en el repositorio. La autenticación existe y funciona. El rate limiting puede estar ausente. El escaneo reporta solo hallazgos de baja severidad. |
| **1** | La gestión de secretos es parcial. La autenticación existe pero tiene gaps (endpoints sin proteger). |
| **0** | Hay credenciales expuestas en el código o en el historial de Git. No existe autenticación en la API. |

#### 4.2 — Modelo de Amenazas y Controles Específicos de AI/LLM (4 pts)

| Puntaje | Descripción |
|---------|-------------|
| **4** | El modelo de amenazas documenta ≥ 6 amenazas con nivel de riesgo (probabilidad × impacto), control implementado y evidencia. Se cubren amenazas específicas de AI/LLM: prompt injection, data leakage vía output del modelo, hallucinations con consecuencias de negocio, model abuse (jailbreaking), exfiltración de datos del contexto RAG. Guardrails de input/output implementados y probados. |
| **3** | El modelo cubre ≥ 4 amenazas con controles implementados. Las amenazas críticas de AI/LLM están identificadas, aunque algunos controles son básicos. |
| **2** | El modelo existe pero cubre solo amenazas genéricas de API, sin las específicas de AI/LLM. Los controles son declarativos pero no verificablemente implementados. |
| **1** | El modelo de amenazas es superficial (solo menciona "usar HTTPS" sin profundidad adicional). |
| **0** | No existe modelo de amenazas o control de seguridad documentado. |

#### 4.3 — Cumplimiento Regulatorio y Marco Ético (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | El análisis identifica las regulaciones aplicables al caso de uso con controles implementados documentados. El marco ético analiza sesgos, transparencia, alucinaciones, privacidad y equidad con mecanismos de mitigación concretos. Se propone un mecanismo de auditoría o revisión humana para decisiones de alto impacto generadas por el sistema. |
| **2** | El cumplimiento y la ética están identificados con controles razonables. La profundidad puede ser menor en algunas dimensiones. |
| **1** | El cumplimiento y la ética se mencionan superficialmente sin análisis concreto ni controles verificables. |
| **0** | No hay análisis de cumplimiento ni consideraciones éticas documentadas. |

---

### Dimensión 5 — Pruebas y Validación (8 pts)

> **Propósito:** Evalúa el rigor metodológico aplicado a la verificación del sistema, desde pruebas de código hasta la evaluación de calidad del componente LLM mediante frameworks especializados.

#### 5.1 — Pruebas de Código (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | Cobertura de pruebas unitarias ≥ 80% con casos significativos (no solo happy path). Al menos 1 prueba de integración que valida el flujo RAG end-to-end. Fixtures y mocks apropiados para aislar dependencias externas. El CI ejecuta las pruebas automáticamente en cada push. |
| **2** | Cobertura ≥ 60%. Al menos 1 prueba de integración. El CI ejecuta las pruebas. |
| **1** | Cobertura entre 30–59% o las pruebas existen pero no corren en CI. Pruebas de integración ausentes. |
| **0** | Cobertura < 30% o no hay evidencia de que las pruebas se ejecuten de forma automática. |

#### 5.2 — Evaluación de Calidad LLM (3 pts)

| Puntaje | Descripción |
|---------|-------------|
| **3** | Evaluación con framework formal (RAGAS, LangSmith, Promptfoo o equivalente). Se reportan ≥ 5 métricas con scores obtenidos vs. umbrales definidos. Dataset de ≥ 20 pares Q/A representativos del caso de uso. Se analiza el impacto de parámetros RAG (top-k, chunk size, threshold) en los scores. |
| **2** | Evaluación con framework formal con ≥ 3 métricas reportadas. Dataset de ≥ 10 pares Q/A. Los resultados se comparan contra los umbrales definidos. |
| **1** | La evaluación es informal (pruebas manuales sin métricas cuantificadas o con < 5 consultas de prueba). No se usa ningún framework de evaluación. |
| **0** | No hay evaluación de calidad LLM o se limita a "probé el sistema y respondió bien". |

#### 5.3 — Pruebas de Rendimiento (2 pts)

| Puntaje | Descripción |
|---------|-------------|
| **2** | Prueba de carga con herramienta formal (k6, Locust, Artillery) con ≥ 50 usuarios virtuales concurrentes. Reporte con latencia p50, p95, p99, tasa de error y throughput. Resultados comparados contra los RNF definidos. Cuellos de botella identificados y documentados. |
| **1** | Prueba de carga ejecutada con ≥ 10 usuarios concurrentes. Se reportan p95 y tasa de error. Los resultados se contrastan con los RNF. |
| **0** | No hay evidencia de pruebas de rendimiento o los resultados son estimaciones sin medición real. |

---

### Dimensión 6 — Documentación Técnica (4 pts)

> **Propósito:** Evalúa la calidad y completitud de la documentación escrita del proyecto. La capacidad de comunicación oral se evalúa exclusivamente en el Bloque A (Video).

#### 6.1 — Completitud de la Plantilla Oficial (2 pts)

| Puntaje | Descripción |
|---------|-------------|
| **2** | La Plantilla Oficial está completada en su totalidad sin campos sin llenar ni instrucciones sin reemplazar. La documentación es precisa, coherente entre secciones, y refleja el estado real del sistema. Los diagramas son de alta calidad y están actualizados con la implementación final. |
| **1** | La Plantilla tiene gaps menores o algunas inconsistencias entre la documentación y la implementación. |
| **0** | La Plantilla tiene gaps importantes, secciones vacías o placeholders sin completar. |

#### 6.2 — README y Reproducibilidad Documental (1 pt)

| Puntaje | Descripción |
|---------|-------------|
| **1** | El README permite reproducir el sistema desde cero en < 15 minutos. El lenguaje técnico es preciso y consistente. Los resultados del proyecto (KPIs, scores LLM, costos reales) están reflejados con datos reales actualizados. |
| **0** | El README es insuficiente para reproducir el sistema o contiene información incorrecta o desactualizada. |

#### 6.3 — Historial de Commits y Prácticas Git (1 pt)

| Puntaje | Descripción |
|---------|-------------|
| **1** | Los mensajes de commit son descriptivos (Conventional Commits recomendado). Hay evidencia de al menos 1 Pull Request con descripción y merge a `main`. Existe el tag `v1.0.0` en el commit final. El historial muestra progreso iterativo real, no un único commit masivo. |
| **0** | Los mensajes son genéricos ("update", "fix", "changes") o hay un único commit masivo sin progreso iterativo visible en el historial. |

---

## Penalizaciones

Las siguientes situaciones aplican deducciones automáticas **sobre la nota final calculada**:

| Situación | Deducción |
|-----------|-----------|
| Entrega después de la fecha límite (por cada día, máximo 3 días) | −5 puntos por día |
| Entrega después de 3 días del límite sin excepción aprobada | Nota 0 en ese entregable |
| Credenciales o secretos reales encontrados en el repositorio | −15 puntos |
| Video que excede los 30 minutos | Solo se evalúan los primeros 30 min |
| Archivos mínimos obligatorios faltantes (por archivo) | −2 puntos por archivo, máximo −10 puntos |
| Plagio o uso de código de otro participante sin atribución | Nota 0 automática en el curso |
| Sistema no desplegado (solo corre en localhost del participante) | −8 puntos de Dimensión 3 |

> Las penalizaciones no pueden llevar la nota por debajo de 0. En caso de circunstancias especiales (enfermedad, fuerza mayor), el participante debe notificar al instructor **antes** de la fecha límite para acordar una extensión.

---

## Bonificaciones

Las siguientes contribuciones suman puntos **adicionales** sobre la nota final (máximo +5 puntos sobre 100):

| Contribución | Bonificación |
|-------------|-------------|
| Implementación de fine-tuning o RLHF documentado y funcional | +3 pts |
| Dataset de evaluación LLM con ≥ 50 pares Q/A bien documentados | +1 pt |
| Interfaz de usuario frontend funcional (web/mobile) | +1 pt |
| Integración con ≥ 3 fuentes de datos heterogéneas | +1 pt |
| Análisis de costos con optimizaciones implementadas (≥ 20% ahorro documentado) | +1 pt |
| Contribución de lección aprendida al repositorio compartido del programa | +1 pt |

---

## Cómo Calcular la Nota Final

```
Nota Final = Bloque A + Bloque B − Penalizaciones + Bonificaciones

─────────────────────────────────────────────────────────────────────
Bloque A — Video (máx. 30 pts)
  A.1  Demostración funcional del sistema        → máx. 12 pts
  A.2  Explicación de arquitectura y decisiones  → máx. 10 pts
  A.3  Resultados y reflexión crítica            → máx.  8 pts

Bloque B — Criterios técnicos (máx. 70 pts)
  D1   Análisis y Requerimientos                 → máx. 10 pts
  D2   Diseño Arquitectónico                     → máx. 20 pts
  D3   Implementación Técnica                    → máx. 18 pts
  D4   Seguridad, Cumplimiento y Ética           → máx. 10 pts
  D5   Pruebas y Validación                      → máx.  8 pts
  D6   Documentación Técnica                     → máx.  4 pts
─────────────────────────────────────────────────────────────────────

Ejemplo de cálculo:

  A.1  Demostración funcional:                    9 / 12
  A.2  Arquitectura y decisiones:                 8 / 10
  A.3  Resultados y reflexión:                    6 /  8
                                    Bloque A:    23 / 30

  D1   Análisis y Requerimientos:                 8 / 10
  D2   Diseño Arquitectónico:                    16 / 20
  D3   Implementación Técnica:                   14 / 18
  D4   Seguridad, Cumplimiento:                   7 / 10
  D5   Pruebas y Validación:                      5 /  8
  D6   Documentación Técnica:                     3 /  4
                                    Bloque B:    53 / 70

                                    Subtotal:    76 / 100
  Penalización (1 día tarde):                   − 5
  Bonificación (frontend funcional):            + 1
  ─────────────────────────────────────────────────────
  NOTA FINAL:                                    72 / 100  → 🆘 No aprueba el curso
```

### Hoja de Cálculo (autoevaluación previa a la entrega)

**Bloque A — Video**

| Sub-criterio | Máx. | Puntaje obtenido |
|-------------|------|-----------------|
| A.1 Demostración funcional del sistema | 12 | |
| A.2 Explicación de arquitectura y decisiones | 10 | |
| A.3 Resultados y reflexión crítica | 8 | |
| **Subtotal Bloque A** | **30** | |

**Bloque B — Criterios Técnicos**

| Dimensión | Máx. | Puntaje obtenido |
|-----------|------|-----------------|
| D1 — Análisis y Requerimientos | 10 | |
| D2 — Diseño Arquitectónico | 20 | |
| D3 — Implementación Técnica | 18 | |
| D4 — Seguridad, Cumplimiento y Ética | 10 | |
| D5 — Pruebas y Validación | 8 | |
| D6 — Documentación Técnica | 4 | |
| **Subtotal Bloque B** | **70** | |

| Concepto | Puntos |
|---------|--------|
| Subtotal (A + B) | / 100 |
| Penalizaciones | − |
| Bonificaciones | + |
| **NOTA FINAL** | / 100 |
| **¿Aprobado? (≥ 70 pts)** | ✅ / ❌ |

---

## Consideraciones Éticas Transversales

Independientemente del puntaje obtenido en los criterios anteriores, el instructor puede aplicar un **ajuste discrecional de hasta −10 puntos** si detecta alguna de las siguientes situaciones durante la evaluación:

- El sistema genera respuestas con **sesgos discriminatorios** evidentes sin que el participante los haya identificado ni mitigado.
- El participante demuestra **desconocimiento completo** del impacto ético de su solución en el caso de uso descrito.
- El sistema está diseñado para **engañar a usuarios finales** sobre su naturaleza artificial sin ningún mecanismo de disclosure.
- El caso de uso involucra **datos sensibles** (PII, médicos, financieros) sin los controles de privacidad correspondientes.
- El participante claramente **no diseñó ni comprende** el sistema que presenta, lo que indica generación automática sin comprensión real.

> Este ajuste se aplicará de forma transparente, documentada y comunicada al participante con justificación específica por escrito.

---

*Programa AI-LLM Solution Architect | Curso 5: Proyecto Final | v2.0*  
*Documento de referencia oficial — no modificar sin aprobación del coordinador del programa.*
