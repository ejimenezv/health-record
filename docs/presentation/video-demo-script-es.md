# Guion de Video — MedRecord (Entregable V, BSG)

> Guion en español para grabar el video final (~28–30 min).
> Las indicaciones entre `[corchetes]` no se leen: son acciones en
> pantalla. Lo demás se lee tal cual, con tono natural — no monótono.
> Asume que la demo en tiempo real funciona end-to-end.

---

## Segmento 1 — Apertura (1:30)

[En pantalla: portada con título "MedRecord — Sistema de Documentación
Médica Automatizada", logos del stack.]

Buenos días. Soy Enrique Jiménez y les presento **MedRecord**, un
sistema de inteligencia artificial para automatizar la documentación
de consultas médicas en español.

El problema que resuelve es concreto: los médicos dedican entre el
treinta y el cuarenta por ciento de su tiempo posterior a la consulta
a tareas de documentación. MedRecord transcribe la consulta **en vivo**
mientras ocurre, identifica turnos de doctor y paciente, y va
extrayendo entidades clínicas — síntomas, diagnósticos, medicamentos,
códigos CIE-10 — en paralelo, validándolas contra una base de
conocimiento médico mediante RAG. Todo durante la propia consulta,
no después.

La decisión arquitectónica central fue apostar por **streaming en
tiempo real desde el inicio**, no como funcionalidad agregada. Eso
habilita el caso de uso que diferencia al sistema: alertas de
interacciones medicamentosas emitidas en cuanto se detectan, mientras
el médico todavía está prescribiendo.

[En pantalla: diagrama de stack con logos.]

El stack: React con TypeScript en el frontend; Node.js con Express y
Prisma en el backend de negocio; un servicio de IA en Python con
FastAPI que orquesta toda la lógica de modelos; ChromaDB como vector
store; PostgreSQL para datos clínicos; Redis para sesiones y buffer
de eventos; y los modelos de OpenAI: Whisper para audio, la familia
GPT-4o para extracción y `text-embedding-3-small` para embeddings.
Todo desplegado en AWS sobre Docker Compose, con Terraform para
infraestructura.

Este es el proyecto final del programa AI/LLM Solution Architect.
Empecemos con la demostración funcional.

---

## Segmento 2 — Demo del flujo clínico (4–5 min)

### 2.1 Health checks (~30 s)

[En pantalla: terminal limpia.]

Antes de tocar el frontend, verifico que los componentes estén vivos.

[Ejecutar:]
```bash
curl -s http://localhost:3001/api/v1/health | jq
curl -s http://localhost:8000/health | jq
```

El backend de Node responde sano. El servicio de IA también, y reporta
el estado de sus dependencias: PostgreSQL, Redis, ChromaDB y
conectividad con la API de OpenAI. Los seis componentes críticos
están operativos.

### 2.2 Login y dashboard (~1 min)

[Abrir `http://localhost:5173/login`.]

La autenticación es por JWT. El backend de Node emite el token, y el
servicio de IA en Python lo valida usando exactamente el mismo
secreto compartido — esto está documentado en el ADR-003, que cubre
la integración entre los dos servicios. La decisión de no usar OAuth
ni un proveedor externo en esta versión fue deliberada: simplifica el
MVP y deja la puerta abierta a Azure AD o Cognito en una v2.

[Ingresar credenciales. Llegar al dashboard.]

Aquí tenemos el dashboard con la actividad reciente del médico:
próximas citas, pacientes recientes, accesos rápidos.

### 2.3 Paciente y cita (~2 min)

[Navegar a `/patients`.]

El sistema cubre el flujo clínico completo, no solo la parte de IA.
Tenemos CRUD de pacientes, gestión de citas, y por cada cita se
puede abrir una consulta médica.

[Crear un paciente nuevo o abrir uno existente. Mostrar campos:
nombre, identificación, alergias, condiciones crónicas.]

Noten que el modelo de paciente incluye **alergias** y **condiciones
crónicas** como entidades separadas. Esto importa porque el
extractor de IA las usa después para validar que las prescripciones
nuevas no generen contraindicaciones — es una pieza clave de
seguridad clínica.

[Navegar a `/appointments`, crear o abrir una cita, entrar a
`/appointments/:id/record`.]

Esta es la página de consulta médica. Aquí es donde ocurre todo el
trabajo de IA, en tiempo real.

---

## Segmento 3 — Demo en tiempo real (8–10 min)

[Estar en `/appointments/:id/record` con el panel de transcripción
visible.]

Esta es la pieza arquitectónicamente más interesante del sistema y
la que justifica su existencia frente a herramientas similares.

### 3.1 Inicio de sesión (~1 min)

[Hacer click en "Iniciar consulta" o el control equivalente. Mostrar
el indicador de conexión WebSocket en verde.]

Al iniciar la consulta, el frontend hace POST a
`/api/v1/sessions` para abrir una sesión, recibe un identificador, y
abre la conexión de streaming hacia el servicio de IA. El audio del
micrófono se captura en chunks cortos y se envía continuamente.

Del lado del servidor, hay un componente clave: el `StreamProcessor`
con **Silero VAD** — detección de actividad de voz — que decide
cuándo bufferizar y cuándo enviar a Whisper. Cuando hay voz activa,
envía chunks cada cinco segundos para priorizar latencia; cuando
detecta silencio, batchea para optimizar costo; cuando el silencio
se prolonga, no envía nada. Esto está documentado en el ADR-006.

### 3.2 Transcripción incremental (~2 min)

[Comenzar a hablar al micrófono o reproducir un audio simulado de una
consulta médica corta — paciente con dolor de cabeza, por ejemplo.]

Mientras hablo, observen tres cosas.

[Señalar el panel de transcripción.]

Primero: la **transcripción aparece de forma incremental** en menos
de dos segundos desde que termino una frase. Está usando Whisper en
español, con un prompt hint con terminología médica para mejorar la
precisión en términos clínicos.

[Continuar hablando o reproduciendo el audio. Mostrar cómo aparecen
las etiquetas de hablante.]

Segundo: la **diarización** asigna turnos de doctor y paciente
automáticamente. Esto es una decisión de trade-off documentada en
el ADR-005. Evaluamos Pyannote — el modelo de ML estado del arte —
y lo descartamos: requiere GPU y, en CPU, su latencia es
incompatible con tiempo real. Implementamos en cambio una
estrategia híbrida en tres capas: un `AudioFeatureDiarizer` que
analiza features acústicos, un `LLMValidator` con GPT-4o-mini que
valida atribuciones por contexto lingüístico — preguntas al doctor,
síntomas al paciente — y un `IncrementalDiarizer` que mantiene el
estado y puede emitir correcciones retroactivas. El resultado:
alrededor de **ochenta y siete por ciento** de precisión en
streaming y **noventa y dos por ciento** tras un refinamiento batch
opcional al cerrar la sesión, todo sin GPU.

### 3.3 Extracción en vivo (~2 min)

[Señalar el panel de extracción que se va poblando.]

Tercero, y lo más importante: la **extracción de entidades clínicas
ocurre en vivo**, no al final.

[A medida que se mencionan síntomas, mostrar cómo van apareciendo en
el panel.]

Conforme menciono síntomas, el sistema los detecta como entidades:
"cefalea bilateral", "fotofobia", "tres días de evolución". Si más
adelante en la consulta vuelvo a mencionar el mismo síntoma con
otras palabras, el sistema usa **embeddings semánticos para detectar
que es la misma entidad y la actualiza en lugar de duplicarla**. El
componente de entity matching usa similitud coseno con dos umbrales:
por encima de cero coma ochenta y cinco se fusiona automáticamente,
entre cero coma setenta y cero coma ochenta y cinco se marca como
incierto para revisión.

A medida que la consulta avanza, también aparecen el diagnóstico
presuntivo y el código CIE-10 candidato — en este caso, G44.2,
cefalea de tipo tensional.

### 3.4 Alerta crítica (~1:30)

[Provocar la mención de un medicamento con interacción conocida.
Por ejemplo: decir "voy a recetar ibuprofeno cuatrocientos
miligramos cada ocho horas, y como el paciente ya toma aspirina
profiláctica, vamos a manejarlo así".]

Aquí viene la pieza más crítica del sistema.

[Señalar la alerta de interacción que aparece en pantalla.]

En menos de un segundo apareció una alerta: ibuprofeno y aspirina,
interacción moderada, riesgo de sangrado gastrointestinal.

Esto solo es posible porque el procesamiento ocurre en streaming. Si
la transcripción y la extracción fueran un proceso posterior a la
consulta, esa alerta llegaría tres minutos después, cuando el médico
ya cerró el expediente y firmó la receta. En tiempo real, llega
antes de que el médico termine de prescribir. Es la diferencia entre
una herramienta de documentación y una herramienta de seguridad
clínica activa.

La alerta se generó cruzando la extracción en vivo contra el
vademécum indexado en ChromaDB. La validación RAG corre en paralelo
al pipeline principal, sin bloquearlo.

### 3.5 Cierre de sesión y entregables (~1:30)

[Cerrar la sesión. Mostrar la transcripción completa con turnos
diarizados.]

Cierro la consulta. Lo que queda persistido es:

[Mostrar la transcripción consolidada.]

La **transcripción completa** con turnos doctor-paciente
identificados. Cuando el refinamiento batch de diarización está
activo, las etiquetas finales se reescriben en este momento antes
de persistirse.

[Mostrar el panel de extracción consolidada.]

La **extracción estructurada** consolidada: síntoma principal con
duración, severidad y localización; diagnóstico presuntivo con
código CIE-10 candidato; medicamento con dosis y frecuencia;
recomendaciones al paciente.

[Mostrar el modelo de expediente médico en pantalla — los campos
del MedicalRecord en el frontend o en el schema de Prisma.]

El modelo de datos del expediente médico ya tiene los campos para
una nota SOAP estructurada — motivo de consulta, examen físico,
diagnóstico, plan de tratamiento. La generación automática del
borrador SOAP a partir de la extracción es el siguiente paso,
parte del backlog de v2.

Lo importante es que el médico termina la consulta con la
**transcripción y la extracción ya hechas**, no con una grabación
sin procesar esperando trabajo posterior.

---

## Segmento 4 — Consulta RAG sobre la base de conocimiento (1–2 min)

[Abrir Swagger en `http://localhost:8000/docs`.]

Más allá del flujo de consulta, el sistema expone una capa RAG
directa sobre la base de conocimiento médico — vademécum
farmacológico, guías clínicas y catálogo CIE-10 — indexados en
ChromaDB con embeddings de OpenAI. La uso aquí desde Swagger porque
es la forma más limpia de mostrar la respuesta cruda.

[Ejecutar `POST /api/v1/query` con el cuerpo:
`{"query": "¿Cuáles son las contraindicaciones del ibuprofeno?"}`.]

[Mostrar la respuesta.]

El sistema devuelve una respuesta sintetizada — úlcera péptica
activa, insuficiencia renal severa, tercer trimestre del embarazo,
entre otras — y, lo más importante, devuelve las **fuentes** con su
score de similitud. Esto no es opcional en un sistema clínico: el
médico tiene que poder verificar de dónde salió la información. La
respuesta es solo tan buena como sus citaciones.

---

## Segmento 5 — Arquitectura y decisiones técnicas (7–8 min)

### 5.1 Visión general (~2 min)

[Mostrar el diagrama C4 de contenedores en pantalla.]

La arquitectura sigue un patrón de microservicios con separación
clara de responsabilidades.

[Señalar el frontend.]

En el cliente, una SPA en React + TypeScript con Vite. Maneja CRUD
clínico vía REST y abre WebSockets directos al servicio de IA para
la sesión en tiempo real.

[Señalar el backend de Node.]

El backend en Node.js es responsable del **dominio clínico**:
pacientes, citas, autenticación, expedientes, persistencia con
Prisma sobre PostgreSQL. Es deliberadamente **delgado** en lo que
se refiere a IA — no orquesta modelos, solo los invoca.

[Señalar el servicio de IA.]

Toda la lógica de IA vive en el servicio de Python con FastAPI:
ingesta de audio, transcripción, diarización, extracción de
entidades, generación de SOAP, RAG, validación contra el vademécum.
La razón de tener este servicio separado en Python está en el
ADR-003: el ecosistema maduro de Python para IA — Whisper, RAGAS,
Resemblyzer, ChromaDB — no tiene paralelo en Node.

[Señalar el plano de datos.]

En el plano de datos: PostgreSQL para metadatos clínicos y de
sesión; Redis para cache de embeddings, estado de sesión activa y
buffer de eventos para reconexión; ChromaDB como vector store con
los embeddings del vademécum y las guías clínicas.

### 5.2 Decisión 1 — Estrategia multi-tier de LLMs (~2 min)

[Mostrar la tabla del ADR-001.]

La primera decisión clave fue **no usar un solo modelo para todo**,
sino una estrategia de tres tiers, documentada en el ADR-001.

- **FAST_CHEAP** — GPT-4o-mini, para validaciones rápidas: detección
  de PII, verificación de formato JSON, clasificaciones simples.
- **BALANCED** — GPT-4o, modelo principal para extracción
  estructurada y CIE-10.
- **PREMIUM** — GPT-4-turbo, fallback para casos complejos o cuando
  GPT-4o falla en generar JSON válido.

El trade-off real es costo contra precisión. GPT-4o-mini es
dieciséis veces más barato que GPT-4o, pero en nuestras pruebas
tuvo dieciocho por ciento de error en extracción de dosis médicas,
versus tres por ciento de GPT-4o. En medicina, ese diferencial no
es aceptable como camino principal.

La decisión fue: GPT-4o como baseline, GPT-4o-mini solo para tareas
no críticas, y degradación automática solo si el budget mensual
supera el ochenta por ciento. Esto nos mantiene en alta calidad por
defecto y nos da una red de seguridad de costos.

¿Por qué no usar siempre GPT-4-turbo? El costo sería cuatro veces
mayor con una ganancia marginal de calidad — del tres al dos y medio
por ciento de error. La relación costo-beneficio no lo justifica
para el noventa y ocho por ciento de los casos.

### 5.3 Decisión 2 — ChromaDB sobre Pinecone (~2 min)

[Mostrar tabla comparativa del ADR-002.]

La segunda decisión fue elegir **ChromaDB** como vector store, en
lugar de Pinecone o Weaviate. Está documentada en el ADR-002.

Evaluamos las tres opciones contra nuestro contexto: una base de
conocimiento de cinco mil documentos, aproximadamente cincuenta mil
chunks vectorizados de mil quinientas treinta y seis dimensiones.

ChromaDB cubre ese volumen sobradamente, con latencias de retrieval
entre ochenta y ciento veinte milisegundos. Pinecone tiene mejor
latencia, sí — entre cincuenta y ochenta milisegundos — pero el
cuello de botella real del sistema no es el retrieval, es Whisper.
Optimizar el componente que pesa el cero coma uno por ciento del
tiempo total no tiene sentido.

El trade-off explícito: ChromaDB no tiene replicación distribuida ni
backups automáticos. Pinecone resuelve eso, pero al costo de
seiscientos dólares anuales. Para un MVP ese dinero rinde más
invertido en una instancia EC2 más grande.

El ADR define criterios de revisión claros: si superamos ochenta mil
vectores, o si la latencia de retrieval pasa de quinientos
milisegundos de forma sostenida, o si necesitamos multi-región,
revisamos la decisión. Hasta hoy, ninguno se cumplió.

### 5.4 Decisión 3 — Streaming en tiempo real (~2 min)

[Mostrar el diagrama del ADR-006.]

La tercera decisión, y arquitectónicamente la más comprometida, fue
implementar **streaming en tiempo real** desde el inicio, con
WebSocket bidireccional. Está en el ADR-006.

Las alternativas que evaluamos fueron polling HTTP — descartado por
latencia de dos a cinco segundos por request — y Server-Sent Events —
descartado porque es unidireccional y no permite enviar audio.

WebSocket bidireccional agrega complejidad significativa: gestión
de estado de sesión, persistencia de eventos en Redis, entity
matching para no duplicar extracciones, coordinación entre el
pipeline principal y el coordinador de validación RAG. Pero
habilita los casos de uso que diferencian al sistema, como la
alerta de interacción que mostramos hace un momento.

Una pieza clave de optimización es el **intelligent buffering** con
VAD del lado servidor: cuando hay voz activa, enviamos chunks cada
cinco segundos para priorizar latencia; cuando hay silencio entre
dos y diez segundos, bufferizamos y enviamos en batch para optimizar
costo; cuando hay silencio prolongado, no enviamos nada al modelo.
La implementación está en el `StreamProcessor` con Silero VAD.

---

## Segmento 6 — Resultados medidos (4 min)

[Mostrar `docs/delivery-4/01-results-and-metrics.md` en pantalla.]

Voy a presentar resultados **medidos**, no estimados. Las fuentes
están todas linkeadas en el repositorio.

### 6.1 Calidad RAGAS

[Señalar la tabla RAGAS.]

La evaluación de calidad la hicimos con RAGAS, ejecución del treinta
de abril de 2026. Los resultados:

- **Faithfulness: cero coma novecientos treinta y ocho** — umbral
  cero coma ochenta. Mide qué tanto la respuesta generada está
  efectivamente sustentada por el contexto recuperado.
- **Context Precision: uno coma cero** — umbral cero coma setenta y
  cinco. El sistema recupera consistentemente chunks relevantes.
- **Answer Relevancy: cero coma novecientos sesenta y cuatro**.
- **Context Recall: uno coma cero**.

Los cuatro indicadores pasan con margen. Una caveat importante,
dicha en voz alta: el dataset de evaluación tiene ocho preguntas
sintéticas validadas por un médico general. Esto es un **guardrail
de regresión**, no una prueba de calidad en producción. La calidad
real con consultas médicas reales requiere un dataset mayor y
revisión clínica formal — eso es trabajo de v2.

### 6.2 Carga y latencia

[Señalar la tabla de load test.]

Las pruebas de carga del treinta de abril:

- **Persistencia de eventos**: write p95 de catorce coma cuarenta y
  cinco milisegundos, throughput de setecientos doce escrituras por
  segundo, cero por ciento de error sobre mil escrituras. Pasa
  cómodamente.
- **WebSocket handshake**: mediana de cincuenta y nueve milisegundos
  contra un objetivo de quinientos. Pasa.
- **WebSocket throughput sostenido en streaming**: tras cerrar la
  incidencia OI-1 en torchaudio, el sistema sostiene la tasa
  objetivo sin degradación de latencia.

### 6.3 Costos

[Mostrar el desglose de costos del documento
`docs/delivery-4/02-cost-analysis.md`.]

Sobre los costos: el sistema instrumenta un cost tracker en cada
llamada a OpenAI, expone un endpoint backend con desglose por
servicio y por modo, e implementa caching agresivo de embeddings
en Redis para evitar llamadas redundantes. Eso es lo construido.

Lo medido es más limitado, y vale la pena ser explícito: el
documento de análisis de costos modela un costo por consulta en
tiempo real de entre veinticinco y veintiocho centavos de dólar,
**pero esa cifra es una proyección del modelo de costos, no un
promedio observado sobre sesiones reales completadas**. El
documento lo declara así literalmente. La reconciliación con la
facturación real de AWS, junto con una interfaz de visualización
para el médico administrador, están identificadas como pendientes
en el OI-5. Es prioridad para v2.

---

## Segmento 7 — Reflexión honesta (3–4 min)

[Mostrar slide "Qué funcionó / Qué no funcionó / Lecciones".]

Esta sección es deliberadamente honesta. Un proyecto que solo cuenta
sus victorias no demuestra aprendizaje real.

### 7.1 Lo que funcionó (~45 s)

Tres decisiones acertadas, en orden de impacto:

Primero, la **estrategia multi-tier de modelos LLM**. Documentada
en el ADR-001, permite usar GPT-4o como baseline para extracción
crítica y GPT-4o-mini para validaciones secundarias como la
diarización lingüística, optimizando costo sin sacrificar la
calidad donde importa.

Segundo, **elegir ChromaDB local** en lugar de Pinecone. Eliminó el
costo operacional recurrente sin impacto perceptible en latencia
para el volumen actual.

Tercero, la **diarización híbrida con validación LLM**. Alcanzó
ochenta y siete por ciento en streaming y noventa y dos por ciento
con refinamiento batch, sin necesidad de GPU. Demostró que para dos
hablantes en un contexto ordenado, no hace falta traer Pyannote y
todo su peso.

### 7.2 Lo que no funcionó como esperaba (~1:30)

[Cambiar a la slide de limitaciones.]

Tres cosas que se quedaron por fuera del scope o resultaron menos
útiles de lo esperado:

**Primero, la generación automática de la nota SOAP.** El modelo de
datos del expediente médico tiene los campos para SOAP estructurada,
y la extracción en vivo provee toda la materia prima. Pero el paso
final — orquestar un LLM para producir el borrador SOAP a partir de
la transcripción y la extracción consolidada — quedó fuera del
alcance de v1 por restricciones de tiempo. Hoy el médico ve la
extracción y la transcripción consolidadas, no un SOAP listo. Es
prioridad uno para v2 y técnicamente es una composición de piezas
que ya existen.

**Segundo, la dependencia de la API de Whisper para latencia.** La
transcripción en streaming va a la API de OpenAI; eso significa que
estamos atados a su latencia y a su costo variable. Migrar a
`faster-whisper` local reduciría ambos significativamente y es un
candidato claro para v2, pero requiere validar que la calidad en
español médico se sostenga.

**Tercero, observabilidad e interfaces de administración.** Tenemos
logs estructurados y métricas in-process — incluyendo un endpoint
de costos completamente funcional en el backend. Pero **no
construimos las interfaces de visualización**: ni dashboard de
costos en el frontend, ni Grafana, ni Prometheus. Hoy, auditar
costos o debuggear un issue requiere consultas directas a la API o
al log. Es aceptable para un MVP; sería bloqueante en producción
con varios consultorios.

### 7.3 Lecciones aprendidas (~1:30)

[Cambiar a la slide de lecciones.]

Cuatro lecciones transferibles:

**Primera**: para la fase MVP, prompt engineering con few-shot vence
a fine-tuning. Iteré doce versiones del system prompt hasta lograr
JSON consistente — eso me tomó tres días. Fine-tunear Llama 3
habría sido dos a tres semanas. Recomendación general: prototipa con
prompting, escala con fine-tuning solo si el caso lo justifica.

**Segunda**: el **cost tracking no es una feature, es un requisito
no funcional**. Instrumentar costo por llamada desde el día uno
permite descubrir desviaciones temprano y construir alertas y
políticas de degradación encima. La interfaz de visualización
puede esperar; los datos no.

**Tercera**: RAGAS detecta problemas de fidelidad que los tests
unitarios no ven. La métrica de faithfulness mide específicamente si
la respuesta está respaldada por el contexto recuperado, y eso es
exactamente la propiedad que importa en un dominio clínico. En
cualquier proyecto LLM futuro, los umbrales RAGAS van como quality
gate en CI/CD desde el día uno.

**Cuarta**: la **arquitectura en tiempo real se diseña desde el
inicio, no se agrega después**. Construir el sistema directamente
sobre WebSocket fue más caro al principio que un flujo batch
tradicional, pero retrofitear streaming a un sistema batch hubiera
sido prohibitivo. Las piezas críticas — VAD del lado cliente,
intelligent buffering, entity matching, event buffer en Redis — solo
encajan limpio si están en el diseño original.

### 7.4 Roadmap (~30 s)

[Mostrar slide del roadmap.]

Para v2, en orden de prioridad: **generación automática del borrador
SOAP** a partir de la extracción consolidada, completando el
contrato de "el médico cierra y la documentación está hecha";
migración a `faster-whisper` local para reducir latencia y
eliminar el costo variable de la API; **dashboard de costos en el
frontend** consumiendo el endpoint que ya existe, más observabilidad
con Langfuse y Grafana; y multi-tenancy con autenticación federada
para que múltiples consultorios usen el sistema con separación
estricta de datos.

A medio plazo, soporte multimodal con GPT-4-vision para procesar
radiografías y fotos de lesiones, y alertas clínicas más ricas
basadas en el historial completo del paciente.

---

## Segmento 8 — Cierre (30 s)

[Slide final con repositorio y enlaces.]

Eso es MedRecord. El repositorio completo, los siete ADRs, el
informe consolidado del entregable cuatro y los reportes de RAGAS y
de carga están disponibles en GitHub, en el enlace que aparece en
pantalla.

Gracias por su atención. Quedo a disposición para preguntas técnicas.

[Mantener el slide tres segundos antes de cortar.]

---

## Notas de lectura

- **Cadencia**: ~140 palabras por minuto. Si vas más rápido pierdes
  claridad; más lento te pasas de los treinta minutos.
- **Pausas**: deja medio segundo de silencio entre segmentos. Ayuda
  al editor a cortar limpio si necesitas.
- **Números**: dilos hablados, no leídos como dígitos —
  "cero coma novecientos treinta y ocho", no "cero punto nueve tres
  ocho".
- **Si te equivocas**: pausa dos segundos en silencio y retoma desde
  la última oración completa. Editas el silencio después.
- **Tono**: técnico pero conversacional. Sonríe ligeramente al
  hablar — se nota en la voz.
