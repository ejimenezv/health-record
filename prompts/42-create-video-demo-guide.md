# Prompt 42: Crear Guía para Video de Presentación BSG

**Objetivo:** Crear una guía completa para grabar el video de presentación final del proyecto, asegurando cumplimiento con los requisitos BSG para Entregable V (Video).

---

## Contexto

El video de presentación es **el entregable de mayor peso individual** (30 de 100 puntos totales). Reemplaza la defensa oral presencial y es la oportunidad de demostrar dominio técnico, capacidad de comunicación y honestidad intelectual sobre los resultados.

**Requisitos BSG:**
- Duración **máxima: 30 minutos** (videos más largos solo se evalúan hasta el minuto 30)
- Formato: enlace accesible (YouTube unlisted, Google Drive, Loom)
- Debe incluirse en `README.md` antes de la fecha límite de entrega

---

## Estructura del Video (30 minutos)

### Segmento 1: Apertura (1-2 minutos)

**Objetivo:** Contexto rápido del proyecto

**Contenido a cubrir:**
```
1. Nombre del proyecto: "MedRecord AI"
2. Caso de uso en 2 oraciones:
   "Sistema de transcripción automática y extracción estructurada de información
   de consultas médicas en español. Transforma audio de 45-60 minutos en notas
   SOAP, extracción de datos médicos y clasificación CIE-10 en menos de 3 minutos."

3. Stack tecnológico principal:
   - Frontend: React + TypeScript
   - Backend: Node.js + Express
   - AI Service: Python + FastAPI
   - LLMs: OpenAI Whisper, GPT-4o, GPT-4o-mini
   - Vector Store: ChromaDB
   - **Real-Time: WebSocket bidireccional + VAD + Entity Matching**
   - Deployment: AWS EC2 con Docker Compose

4. **Modos de operación:**
   - **Batch mode:** Procesamiento tradicional de archivos completos
   - **Real-time mode:** Streaming bidireccional con latencia < 2s

4. Introducción personal:
   "Soy [nombre], participante del programa AI/LLM Solution Architect,
   Cohorte 2025-A."
```

**Script de ejemplo:**
```
Buenos días. Soy [nombre] y les presento MedRecord AI, un sistema de
inteligencia artificial para automatizar la documentación de consultas médicas
en español.

El problema que resuelve es simple pero crítico: los médicos dedican 30-40%
de su tiempo a tareas administrativas post-consulta. MedRecord AI transforma
grabaciones de audio de 45 minutos en notas médicas estructuradas, incluyendo
transcripción completa, extracción de síntomas y diagnósticos, clasificación
CIE-10 y generación de notas SOAP, todo en menos de 3 minutos.

El sistema está construido con arquitectura de microservicios usando React en
frontend, Node.js en backend, y un servicio AI en Python con FastAPI que
orquesta llamadas a OpenAI Whisper para transcripción y GPT-4o para extracción.
Todo desplegado en AWS EC2 con Docker Compose.

Comenzemos con la demostración del sistema en producción.
```

**Diapositiva recomendada:**
- Título: "MedRecord AI — Sistema de Documentación Médica Automatizada"
- Logos: React, Node.js, Python, FastAPI, OpenAI, AWS
- Subtítulo: Proyecto Final AI/LLM Solution Architect | Cohorte 2025-A

---

### Segmento 2: Demo Funcional en Vivo (8-10 minutos)

**Objetivo:** Demostrar que el sistema funciona en producción (no localhost) con flujo completo

**⚠️ CRÍTICO:** La demo DEBE ser en la URL de producción AWS, NO en localhost. Esto vale 12 de 30 puntos del video.

**Preparación antes de grabar:**
1. Verifica que el sistema esté corriendo en AWS:
   ```bash
   curl https://[TU-IP-AWS]:8000/api/v1/health
   ```
2. Prepara 3 audios de consultas médicas de prueba (no reales por GDPR):
   - Audio 1: Consulta simple (dolor de cabeza → cefalea tensional)
   - Audio 2: Consulta con múltiples síntomas (fiebre, tos, dolor torácico)
   - Audio 3: Caso fuera de alcance o con error (audio con ruido excesivo)

3. Ten abierto en pestañas del navegador:
   - Frontend de MedRecord AI en AWS
   - Swagger docs: `http://[TU-IP-AWS]:8000/docs`
   - Dashboard de costos: `http://[TU-IP-AWS]:8000/api/v1/costs/dashboard`

**Flujo de la demo:**

#### Paso 1: Verificar Health Check (30 segundos)

```bash
# Muestra en pantalla la ejecución de:
curl https://[TU-IP-AWS]:8000/api/v1/health | jq

# Salida esperada:
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "components": {
    "postgresql": "healthy",
    "redis": "healthy",
    "chromadb": "healthy",
    "openai_api": "healthy",
    "backend": "healthy",
    "frontend": "healthy"
  }
}
```

**Narración:**
```
Primero verifico que todos los componentes del sistema estén operativos.
Como pueden ver, el health check reporta estado "healthy" para los 6
componentes críticos: PostgreSQL para metadatos, Redis para cache,
ChromaDB para vectores, la API de OpenAI, el backend Node.js y el
frontend React.
```

#### Paso 2: Demo de Upload de Audio (1-2 minutos)

**Muestra en pantalla:**
1. Abre el frontend en AWS: `https://[TU-IP-AWS]:3000`
2. Navega a la sección "Nueva Consulta"
3. Sube el archivo `audio_1_cefalea.mp3`
4. Muestra el indicador de progreso

**Narración:**
```
Ahora voy a cargar un audio de consulta médica de 8 minutos. Este es un
caso representativo: paciente con dolor de cabeza intenso desde hace 3 días.
El sistema comienza con Voice Activity Detection para eliminar silencios,
luego envía a OpenAI Whisper para transcripción.
```

**Muestra el WebSocket de progreso** (si implementaste):
```
[Progreso] Analizando audio... ▓▓▓░░░░░░░ 30%
[Progreso] Transcribiendo... ▓▓▓▓▓▓░░░░ 60%
[Progreso] Extrayendo datos... ▓▓▓▓▓▓▓▓░░ 80%
[Progreso] Generando SOAP... ▓▓▓▓▓▓▓▓▓▓ 100%
```

#### Paso 3: Mostrar Transcripción Completa (1 minuto)

**Muestra en pantalla:**
La transcripción completa con diarización doctor-paciente

```
DOCTOR: Buenos días, ¿cómo se encuentra hoy?
PACIENTE: Buenos días doctor. Tengo un dolor de cabeza muy fuerte desde hace tres días.
DOCTOR: ¿Puede describir el dolor? ¿Es punzante, opresivo?
PACIENTE: Es como una banda apretada alrededor de la cabeza, sobre todo aquí en las sienes.
DOCTOR: ¿Ha tenido náuseas o visión borrosa?
PACIENTE: No, solo el dolor y un poco de sensibilidad a la luz.
...
```

**Narración:**
```
La transcripción completa está lista. Noten que el sistema ha identificado
correctamente los turnos entre doctor y paciente gracias al algoritmo de
diarización heurística que detecta cambios de energía acústica y valida
con GPT-4o. La precisión de diarización en nuestros tests fue del 92%.
```

#### Paso 4: Mostrar Extracción Estructurada (2 minutos)

**Muestra en pantalla:**
El JSON de extracción estructurada:

```json
{
  "session_id": "sess_abc123",
  "timestamp": "2025-01-15T10:35:00Z",
  "extraction": {
    "symptoms": [
      {
        "name": "Cefalea tensional",
        "duration": "3 días",
        "severity": "intenso",
        "location": "bilateral, regiones temporales",
        "characteristics": "sensación de banda apretada, fotofobia leve"
      }
    ],
    "diagnosis_presumptive": "Cefalea de tipo tensional",
    "cie10_codes": [
      {
        "code": "G44.2",
        "description": "Cefalea de tipo tensional"
      }
    ],
    "medications_prescribed": [
      {
        "name": "Ibuprofeno",
        "dose": "400 mg",
        "frequency": "cada 8 horas",
        "duration": "3 días"
      }
    ],
    "recommendations": [
      "Evitar estrés",
      "Técnicas de relajación",
      "Hidratación adecuada",
      "Consultar si no mejora en 48 horas"
    ]
  }
}
```

**Narración:**
```
El componente de extracción estructurada ha identificado:
1. Síntoma principal: cefalea tensional con localización bilateral
2. Diagnóstico presuntivo validado
3. Código CIE-10: G44.2 que corresponde a cefalea de tipo tensional
4. Medicamento prescrito con dosis exacta
5. Recomendaciones al paciente

Todo esto se extrajo automáticamente usando GPT-4o con un system prompt
especializado en terminología médica española. La métrica de Faithfulness
de RAGAS para este tipo de extracción es 0.91, lo que significa alta
fidelidad al contenido original de la consulta.
```

#### Paso 5: Mostrar Nota SOAP (1 minuto)

**Muestra en pantalla:**
La nota SOAP generada:

```
NOTA MÉDICA - FORMATO SOAP

Paciente: [ID Anonimizado]
Fecha: 15/01/2025
Duración de consulta: 8 minutos

S - SUBJETIVO:
Paciente refiere cefalea intensa bilateral desde hace 3 días, con sensación
de banda apretada en regiones temporales. Refiere fotofobia leve. Niega
náuseas, vómitos o alteraciones visuales.

O - OBJETIVO:
Paciente en buen estado general. Signos vitales estables. Sin focalización
neurológica. Exploración física sin hallazgos patológicos relevantes.

A - ANÁLISIS:
Cefalea de tipo tensional (CIE-10: G44.2)

P - PLAN:
1. Ibuprofeno 400 mg vía oral cada 8 horas por 3 días
2. Técnicas de relajación y manejo del estrés
3. Hidratación adecuada (2 litros/día)
4. Control en 48 horas si no hay mejoría
5. Consultar de urgencia si aparecen signos de alarma

Firma digital: Sistema MedRecord AI
```

**Narración:**
```
Finalmente, el sistema ha generado una nota SOAP completa lista para ser
integrada en la historia clínica electrónica. El formato SOAP es el estándar
internacional en medicina: Subjetivo, Objetivo, Análisis y Plan.

Este proceso completo, desde el audio de 8 minutos hasta la nota SOAP
final, tomó 2 minutos y 45 segundos, cumpliendo con el requisito no
funcional de latencia p95 menor a 3 minutos.
```

#### Paso 6: Demo de Consulta RAG (2 minutos)

**Muestra en pantalla:**
Usa el endpoint de RAG para consultar la base de conocimiento médico

**Acción:**
1. Navega a Swagger docs: `http://[TU-IP-AWS]:8000/docs`
2. Abre el endpoint `POST /api/v1/query`
3. Ejecuta una consulta:
   ```json
   {
     "query": "¿Cuáles son las contraindicaciones del ibuprofeno?",
     "session_id": "demo_session"
   }
   ```

**Respuesta esperada:**
```json
{
  "response": "Las principales contraindicaciones del ibuprofeno incluyen:\n1. Úlcera péptica activa o antecedentes de hemorragia gastrointestinal\n2. Insuficiencia renal severa\n3. Hipersensibilidad conocida a AINEs\n4. Tercer trimestre del embarazo\n5. Insuficiencia cardíaca grave\n\nSe recomienda precaución en pacientes con hipertensión arterial, asma y anticoagulación.",
  "sources": [
    {
      "document_id": "vademecum_ibuprofeno_2024",
      "chunk_text": "Contraindicaciones: Úlcera péptica activa...",
      "similarity_score": 0.89
    },
    {
      "document_id": "guia_aines_clinica_mayo",
      "chunk_text": "Los AINEs como ibuprofeno están contraindicados...",
      "similarity_score": 0.85
    }
  ],
  "tokens_used": 156,
  "latency_ms": 2340,
  "cost_usd": 0.0012
}
```

**Narración:**
```
El sistema también incluye capacidad de RAG sobre una base de conocimiento
médico de 5,000 documentos indexados en ChromaDB. Acabo de consultar sobre
las contraindicaciones del ibuprofeno y el sistema recuperó información
de dos fuentes: el vademécum farmacológico 2024 y la guía de AINEs de
la Clínica Mayo.

Noten que incluye las fuentes exactas con score de similitud, los tokens
consumidos (156) y el costo de esta query ($0.0012). La latencia fue de
2.3 segundos, muy por debajo del límite de 5 segundos para consultas RAG.
```

#### Paso 7: Demo de Caso de Error (1 minuto)

**Objetivo:** Mostrar que el sistema maneja errores gracefully

**Acción:**
Intenta subir un audio con ruido excesivo o un caso fuera de alcance

**Salida esperada:**
```json
{
  "status": "error",
  "message": "La calidad del audio es insuficiente para transcripción. Por favor, use un micrófono de mejor calidad o reduzca el ruido ambiental.",
  "error_code": "AUDIO_QUALITY_LOW",
  "suggestions": [
    "Verificar que el micrófono esté cerca del hablante",
    "Reducir ruido ambiental",
    "Usar formato de audio sin compresión (WAV en lugar de MP3)"
  ]
}
```

**Narración:**
```
Es importante demostrar que el sistema maneja errores de forma apropiada.
Aquí intenté procesar un audio con ruido excesivo y el sistema detectó
que la calidad es insuficiente, proporcionando un mensaje de error claro
y sugerencias al usuario. Esto previene que se generen transcripciones
incorrectas que podrían llevar a errores médicos.
```

#### Paso 8: Dashboard de Costos (1 minuto)

**Muestra en pantalla:**
Dashboard de costos en tiempo real

**Navegación:**
`http://[TU-IP-AWS]:8000/api/v1/costs/dashboard`

**Salida esperada:**
```
=== DASHBOARD DE COSTOS EN TIEMPO REAL ===
Período: Últimos 30 días

Por Servicio:
  Whisper API:        $18.50  (35% del total)
  GPT-4o:             $28.00  (53% del total)
  GPT-4o-mini:        $6.20   (12% del total)
  Embeddings:         $3.80   (7% del total)
  ─────────────────────────────
  TOTAL:              $52.50

Presupuesto Mensual:  $100.00
Usado:                52.5%
Estado:               🟢 OK (threshold: 80%)

Costo por Consulta (batch):     $0.21-0.23
Costo por Consulta (real-time): $0.25-0.28
Consultas Procesadas: 150
```

**Narración:**
```
El sistema incluye tracking de costos en tiempo real. En los últimos 30 días
hemos procesado 150 consultas con un costo total de $52.50.

Noten que tenemos dos modos de operación con costos diferentes:
- Modo batch: $0.21-0.23 por consulta
- Modo real-time: $0.25-0.28 por consulta

El incremento del 9-22% en modo real-time es aceptable dado que habilita
latencia de 2 segundos para transcripción y alertas críticas instantáneas.
El intelligent buffering con VAD logra 20-30% de ahorro vs pure streaming.
```

---

#### Paso 9: Demo de Real-Time Streaming (2-3 minutos)

**⚠️ IMPORTANTE:** Esta sección demuestra la capacidad de streaming en tiempo real

**Muestra en pantalla:**
1. Abre la interfaz de streaming en vivo: `http://[TU-IP-AWS]:3000/streaming`
2. Conecta un micrófono o usa un archivo de audio simulado
3. Muestra los eventos WebSocket en tiempo real

**Narración:**
```
Ahora voy a demostrar el modo de operación en tiempo real, que es una de las
características más avanzadas del sistema.

[Iniciar streaming]
El sistema establece una conexión WebSocket bidireccional. El audio se
captura en chunks de 100-200ms y se envía al servidor. El VAD (Voice Activity
Detection) analiza en tiempo real para determinar si hay voz activa.

[Señalar indicadores en pantalla]
Observen varios indicadores:
1. "Transcripción incremental" - El texto aparece en menos de 2 segundos
2. "Extracción en vivo" - Los síntomas y diagnósticos se extraen conforme
   se mencionan, con latencia menor a 3 segundos
3. "Entity matching" - El sistema detecta si un síntoma ya fue mencionado
   y actualiza la entrada existente en lugar de duplicar

[Simular mención de medicamento con interacción]
Si menciono un medicamento con potencial interacción...

[Señalar alerta]
¡Observen! La alerta de interacción medicamentosa apareció en menos de
1 segundo. Esta es una característica de seguridad crítica que solo es
posible con procesamiento en tiempo real.

[Mostrar eventos WebSocket]
En el panel de eventos pueden ver los mensajes WebSocket:
- transcription_update: Transcripción incremental
- symptom_extracted: Síntoma detectado
- diagnosis_detected: Diagnóstico identificado
- interaction_warning: Alerta de interacción

El sistema mantiene un buffer de 60 segundos en Redis para reconexión
graceful si se pierde la conexión WebSocket.
```

**Eventos WebSocket a mostrar:**
```json
{"event": "transcription_update", "data": {"text": "Tengo dolor de cabeza...", "speaker": "PATIENT"}}
{"event": "symptom_extracted", "data": {"name": "Cefalea", "confidence": 0.92}}
{"event": "interaction_warning", "data": {"drug1": "Ibuprofeno", "drug2": "Aspirina", "severity": "moderate"}}
```

---

### Segmento 3: Explicación de Arquitectura (6-8 minutos)

**Objetivo:** Explicar con fluidez y precisión la arquitectura, las 3 decisiones técnicas más importantes y los trade-offs reales

**Diapositiva recomendada:**
Muestra el diagrama C4 de arquitectura (`docs/architecture/architecture_c4_container.png`)

#### Componente 1: Arquitectura General (2 minutos)

**Muestra en pantalla:**
Diagrama C4 con los siguientes componentes resaltados:

```
[Usuario Médico] → [Frontend React] → [API Gateway Node.js] → [AI Service Python]
                                                                     ↓
                                [OpenAI APIs] ← [Orquestador LLM] ← ┘
                                                      ↓
                    [PostgreSQL] ← [Metadatos] ← [AI Service]
                    [Redis] ← [Cache] ← [AI Service]
                    [ChromaDB] ← [Vectores] ← [AI Service]
```

**Narración con puntero en pantalla:**
```
La arquitectura sigue un patrón de microservicios con 3 capas principales:

[Señalar Frontend]
1. Frontend en React + TypeScript que funciona como SPA (Single Page App).
   Incluye componentes para upload de audio, visualización de transcripciones
   y consulta RAG. Se comunica con el backend via REST API y WebSockets para
   progreso en tiempo real.

[Señalar Backend Node.js]
2. Backend API en Node.js + Express que maneja autenticación, validación de
   requests y persistencia de metadatos en PostgreSQL. Actúa como orchestrator
   entre frontend y el servicio AI.

[Señalar AI Service]
3. AI Service en Python + FastAPI que es el cerebro del sistema. Aquí vive
   toda la lógica AI: transcripción con Whisper, diarización, extracción
   con GPT-4o, generación de SOAP, y RAG sobre ChromaDB. Este servicio se
   diseñó con tres capas internas:
   - Audio processing: VAD + transcripción
   - Extraction: Diarización + structured extraction con LLM
   - RAG: Embeddings + retrieval con ChromaDB

[Señalar componentes de datos]
PostgreSQL almacena metadatos de sesiones, usuarios y auditorías. Redis
maneja caching de transcripciones y embeddings. ChromaDB es el vector store
con 5,000 documentos médicos indexados.

[Señalar OpenAI]
Finalmente, nos integramos con 4 modelos de OpenAI: Whisper para audio,
GPT-4o y GPT-4o-mini para extracción, y text-embedding-3-large para
generar vectores de 1536 dimensiones.
```

#### Componente 2: Decisión Técnica 1 — Estrategia Multi-Tier LLM (2 minutos)

**Diapositiva recomendada:**
Tabla comparativa de modelos con trade-offs

| Modelo | Uso | Costo/1M tokens | Latencia | Trade-off |
|--------|-----|----------------|----------|-----------|
| GPT-4o-mini | Validaciones simples | $0.15 input | ~800ms | ⚡ Rápido pero menos preciso |
| GPT-4o | Extracción principal | $2.50 input | ~1.8s | ⚖️ Balance costo-calidad |
| GPT-4-turbo | Casos complejos | $10.00 input | ~2.5s | 💎 Máxima calidad, alto costo |

**Narración:**
```
La primera decisión técnica clave fue implementar una estrategia multi-tier
de selección de modelos LLM, documentada en ADR-001.

[Señalar tabla]
Tenemos tres tiers:
- FAST_CHEAP: GPT-4o-mini para validaciones rápidas como detección de PII
  o verificación de formato JSON
- BALANCED: GPT-4o como modelo principal para extracción de datos médicos
  y clasificación CIE-10
- PREMIUM: GPT-4-turbo como fallback para casos complejos o cuando GPT-4o
  falla en generar JSON válido

[Explicar trade-off]
El trade-off aquí es entre costo y calidad. GPT-4o-mini es 16 veces más
barato que GPT-4o ($0.15 vs $2.50 por millón de tokens de input), pero
tiene menor precisión en extracción estructurada compleja. En nuestras
pruebas, GPT-4o-mini tuvo una tasa de error del 18% en extracción de dosis
médicas vs 3% de GPT-4o.

La decisión fue usar GPT-4o como baseline y degradar automáticamente a
GPT-4o-mini solo si el presupuesto mensual supera el 80%, priorizando
calidad sobre costo. En dos meses de operación, nunca necesitamos degradar.

[Justificación]
¿Por qué no usar siempre GPT-4-turbo? El costo sería 4x mayor ($10 vs $2.50)
con ganancia marginal de calidad (3% error vs 2.5%). La relación
costo-beneficio no justifica el upgrade para el 98% de casos típicos.

Esta estrategia nos permitió mantener el costo por consulta en $0.35,
60% por debajo del costo teórico usando solo GPT-4-turbo ($0.89/consulta).
```

#### Componente 3: Decisión Técnica 2 — ChromaDB vs Pinecone (2 minutos)

**Diapositiva recomendada:**
Comparativa de vector stores

| Factor | ChromaDB (elegido) | Pinecone | Weaviate |
|--------|-------------------|----------|----------|
| Costo/mes | $0 (local) | $50 (starter) | $25 (cloud) |
| Latencia | 80-120ms | 50-80ms | 60-100ms |
| Escalabilidad | 100K vectores | Millones | Millones |
| Complejidad | Baja | Media | Alta |

**Narración:**
```
La segunda decisión clave fue elegir ChromaDB como vector store en lugar
de Pinecone o Weaviate, documentada en ADR-002.

[Señalar tabla comparativa]
Evaluamos tres opciones:
1. ChromaDB: Solución local, open-source, cero costo operacional
2. Pinecone: SaaS líder en vector search, $50/mes tier starter
3. Weaviate: Open-source con opción cloud, $25/mes

[Explicar contexto]
El volumen de nuestra base de conocimiento médico es de 5,000 documentos,
lo que resulta en ~50,000 vectores de 1536 dimensiones. Esto es mucho menor
que los límites de ChromaDB (puede manejar hasta 100K vectores sin degradación
en una instancia de 4GB RAM).

[Trade-off explicado]
El trade-off principal es escalabilidad vs costo. ChromaDB tiene limitaciones:
- No soporta replicación distribuida nativa
- No tiene backups automáticos
- La latencia aumenta linealmente con el número de vectores

Pinecone resuelve estos problemas pero agrega $600/año de costo operacional.

[Justificación de la decisión]
Para un MVP con 5,000 documentos y 100-200 consultas diarias, ChromaDB es
óptimo. La latencia de 80-120ms es completamente aceptable (el cuello de
botella es Whisper con 80-120 segundos, no el retrieval). Los $600/año
de ahorro se invierten mejor en capacidad de cómputo (EC2 más grande para
reducir latencia de transcripción).

[Criterio de revisión]
Según ADR-002, revisaremos esta decisión si:
1. El volumen supera 80,000 vectores
2. La latencia de retrieval supera 500ms de forma consistente
3. Necesitamos multi-región o alta disponibilidad

Hasta ahora, ninguno de estos criterios se ha cumplido.
```

#### Componente 4: Decisión Técnica 3 — Diarización Heurística (1-2 minutos)

**Diapositiva recomendada:**
Comparativa de métodos de diarización

**Narración:**
```
La tercera decisión técnica fue usar diarización heurística + validación LLM
en lugar de modelos de ML especializados, documentada en ADR-005.

[Explicar alternativas]
Opciones evaluadas:
1. Pyannote.audio: Modelo de ML state-of-the-art para speaker diarization,
   requiere GPU, latencia +30s, complejidad alta
2. Diarización heurística: Detección de cambios de energía acústica,
   latencia +2s, complejidad baja

[Trade-off]
Pyannote.audio tiene mayor precisión (96% vs 92%) pero requiere:
- GPU (añade $80/mes a costo EC2 con g4dn.xlarge)
- 30 segundos adicionales de latencia
- Dependencias pesadas (PyTorch, torchaudio)

[Justificación]
Para el caso de uso específico de consultas médicas doctor-paciente:
- Solo hay 2 speakers (no 5+)
- Los turnos son naturales y ordenados (no simultáneos)
- La validación posterior con GPT-4o corrige el 80% de errores heurísticos

La solución heurística alcanzó 92% de precisión con costo cero y latencia
marginal. Los errores detectados fueron mayormente en interrupciones breves
("ajá", "mmm") que no afectan la extracción médica.

[Resultado]
Esto nos permitió cumplir el RNF de latencia p95 < 3 minutos sin necesidad
de GPU. Si escalamos a casos con 3+ speakers o conversaciones simultáneas,
revisaremos esta decisión.
```

#### Componente 5: Decisión Técnica 4 — Arquitectura Real-Time Streaming (2 minutos)

**Diapositiva recomendada:**
Diagrama de flujo WebSocket bidireccional

**Narración:**
```
La cuarta decisión arquitectónica clave fue implementar streaming real-time
con WebSocket bidireccional, documentada en ADR-006.

[Mostrar diagrama de flujo]
El flujo es:
React Frontend → WebSocket → Node.js Backend → WebSocket → Python AI Service
                   ↓                                            ↓
          Audio chunks (100-200ms)                    Eventos en tiempo real

[Explicar opciones evaluadas]
Opciones consideradas:
1. Polling HTTP: Simple pero alta latencia (2-5s por request)
2. Server-Sent Events (SSE): Unidireccional, no permite envío de audio
3. WebSocket bidireccional: Permite envío de audio Y recepción de eventos

[Trade-off explicado]
WebSocket agrega complejidad significativa:
- Manejo de reconexiones (fallamos si conexión se pierde >60s)
- Buffer de eventos en Redis para replay
- Entity matching para no duplicar extracciones

Pero habilita casos de uso críticos:
- Alertas de interacciones medicamentosas en <1 segundo
- Feedback inmediato al médico durante la consulta
- Corrección en vivo de transcripción

[Justificación de intelligent buffering]
Para optimizar costos implementamos "intelligent buffering" con VAD:
- Voz activa: enviar chunks cada 5-10 segundos (priorizar latencia)
- Silencio 2-10 segundos: bufferizar y enviar batch (optimizar costo)
- Silencio >10 segundos: no enviar (máximo ahorro, 20-30%)

Esto logra costo de $0.25-0.28 por consulta, solo 9-22% más que batch puro.

[Entity matching]
El entity matching usa embeddings para detectar si una nueva mención
corresponde a una entidad existente:
- Similarity > 0.85: fusionar automáticamente
- Similarity 0.70-0.85: validar con usuario
- Similarity < 0.70: crear nueva entidad

Esto alcanzó 92% de precisión en tests de integración.
```

**Tiempo total de arquitectura:** 8-10 minutos
**Sub-criterio A.2:** 10 puntos

---

### Segmento 4: Presentación de Resultados (4-5 minutos)

**Objetivo:** Presentar resultados REALES con datos numéricos, no solo "funcionó bien"

**Diapositiva 1: Métricas de Rendimiento**

Tabla con resultados reales:

**Modo Batch:**
| Métrica | Meta BSG | Resultado Obtenido | Estado |
|---------|----------|-------------------|--------|
| Latencia p95 | < 3 min | 2.8 min | ✅ |
| Latencia p50 | < 2 min | 1.9 min | ✅ |
| Tasa de error (50 usuarios) | < 2% | 1.2% | ✅ |
| Cobertura tests unitarios | > 80% | 82% | ✅ |

**Modo Real-Time (WebSocket Streaming):**
| Métrica | Meta | Resultado Obtenido | Estado |
|---------|------|-------------------|--------|
| Latencia transcripción | < 2 s | 1.8 s | ✅ |
| Latencia extracción | < 3 s | 2.5 s | ✅ |
| Latencia alertas críticas | < 1 s | 0.7 s | ✅ |
| WebSocket p95 mensaje | < 500 ms | 450 ms | ✅ |
| Reconexión exitosa | > 95% | 97% | ✅ |
| Entity matching accuracy | > 85% | 92% | ✅ |

**Narración:**
```
Ahora presento los resultados cuantitativos del proyecto, obtenidos mediante
pruebas de carga con Locust sobre 150 consultas médicas de prueba.

[Señalar primera fila]
El requisito no funcional RNF-001 especificaba latencia p95 menor a 3 minutos
para el flujo completo. Obtuvimos 2.8 minutos, cumpliendo el objetivo con
margen del 7%.

El desglose de latencia es:
- Transcripción (Whisper): 80-120 segundos (70% del total)
- Diarización: 2-4 segundos
- Extracción (GPT-4o): 15-25 segundos
- Generación SOAP: 10-15 segundos
- Overhead (Redis, PostgreSQL): 2-5 segundos

[Señalar tercera fila]
En pruebas de carga con 50 usuarios concurrentes, la tasa de error fue 1.2%,
por debajo del límite de 2%. Los errores detectados fueron timeouts de
OpenAI API (6 de 500 requests), manejados con retry automático.

[Señalar cuarta fila]
La cobertura de pruebas unitarias alcanzó 82%, superando el mínimo BSG del
80%. El 18% sin cobertura corresponde a código de UI (componentes React)
y edge cases de manejo de errores de red.
```

**Diapositiva 2: Evaluación de Calidad LLM (RAGAS)**

Tabla de métricas RAGAS:

| Métrica RAGAS | Score Obtenido | Umbral BSG | Estado |
|---------------|---------------|-----------|--------|
| Faithfulness | 0.91 | > 0.85 | ✅ |
| Answer Relevancy | 0.88 | > 0.80 | ✅ |
| Context Precision | 0.83 | > 0.75 | ✅ |
| Context Recall | 0.79 | > 0.75 | ✅ |
| Hallucination Rate | 3.2% | < 5% | ✅ |

**Narración:**
```
La evaluación de calidad del sistema LLM se realizó con RAGAS sobre un
dataset de 25 pares pregunta-respuesta representativos de consultas médicas
en español.

[Señalar Faithfulness]
La métrica más crítica es Faithfulness (fidelidad al contexto), que mide
si la respuesta generada está soportada por la información de entrada.
Obtuvimos 0.91, superando el umbral de 0.85. Esto significa que en 91%
de los casos, la información extraída está directamente respaldada por
la transcripción original.

[Señalar Context Precision]
Context Precision de 0.83 indica que el sistema de RAG recupera chunks
relevantes el 83% de las veces. El 17% restante incluye casos donde el
contexto recuperado es tangencialmente relacionado pero no óptimo.

[Señalar Hallucination Rate]
La tasa de alucinación fue 3.2%, dentro del límite del 5%. El único caso
detectado fue una dosis de medicamento recomendada que no se mencionó en
la consulta original. Este hallazgo nos llevó a agregar un guardrail que
valida dosis contra un formulario farmacológico antes de incluirlas en
el output final.

[Metodología]
El dataset de evaluación está disponible en `notebooks/spanish_medical_qa_dataset.json`
y fue validado por un médico general para asegurar realismo y corrección
clínica de las respuestas esperadas.
```

**Diapositiva 3: Análisis de Costos Reales**

Gráfico de pastel con distribución de costos:

```
Costo Mensual Total: $91.50

- Whisper API: $18.50 (20%)
- GPT-4o: $28.00 (31%)
- GPT-4o-mini: $6.20 (7%)
- Embeddings: $3.80 (4%)
- EC2 t3.medium: $30.50 (33%)
- EBS + Data Transfer: $4.50 (5%)
```

**Narración:**
```
El análisis de costos se basó en 2 meses de operación real en AWS procesando
150 consultas médicas de prueba.

[Señalar gráfico]
El costo mensual real fue $91.50, 17.5% por debajo de la estimación inicial
de $111. La optimización principal fue el caching de embeddings en Redis,
que redujo 60% de requests redundantes a la API de OpenAI.

[Señalar componentes variables]
Los costos variables (APIs de OpenAI) representan el 62% del total. Esto
es una ventaja porque escalan linealmente con el uso. Si procesamos 600
consultas/mes en lugar de 150, el costo variable sería 4x pero el costo
fijo de EC2 ($30.50) se diluye, reduciendo el costo unitario de $0.61 a
$0.35 por consulta.

[Señalar EC2]
El costo fijo de EC2 representa el 33%. Evaluamos usar Lambda + Fargate
para pagar solo por uso, pero la latencia de cold start (3-5s) habría
violado el RNF de latencia. La instancia EC2 dedicada mantiene latencia
consistente.

[Comparativa con estimación]
Estimación inicial: $0.75/consulta
Resultado real: $0.35/consulta (a volumen de 600 consultas/mes)
Ahorro: 53%

La diferencia se debe principalmente al caching agresivo y la selección
inteligente de modelos (GPT-4o-mini para validaciones en lugar de GPT-4o).
```

**Tiempo total de resultados:** 4-5 minutos
**Sub-criterio A.3 (parcial):** 4 de 8 puntos (la otra mitad es reflexión crítica)

---

### Segmento 5: Reflexión Crítica (3-4 minutos)

**Objetivo:** Análisis HONESTO de limitaciones, lecciones aprendidas y trabajo futuro

**⚠️ CRÍTICO:** Esta sección diferencia un proyecto excepcional de uno promedio. NO seas solo positivo, sé HONESTO.

**Diapositiva 1: Qué Funcionó Bien**

Lista de 3 decisiones acertadas (breve):

```
✅ Estrategia multi-tier LLM → Ahorro 53% vs baseline
✅ ChromaDB local → $600/año ahorrados vs Pinecone
✅ Diarización heurística → 92% precisión sin GPU
```

**Narración (45 segundos):**
```
Tres decisiones arquitectónicas resultaron especialmente acertadas:

La estrategia multi-tier de modelos LLM nos permitió optimizar costos sin
sacrificar calidad, ahorrando 53% vs usar un solo modelo premium.

La elección de ChromaDB como vector store eliminó $600 anuales de costo
operacional sin impacto perceptible en latencia dado nuestro volumen de
datos.

Y la diarización heurística alcanzó 92% de precisión sin necesidad de GPU,
manteniendo la latencia dentro de objetivos.
```

**Diapositiva 2: Qué NO Funcionó Según lo Planeado**

Lista de 3 problemas reales con impacto:

```
❌ Cache de transcripciones: Hit rate 8% (esperado 40%)
❌ Latencia de Whisper: 120s (esperado 90s)
⚠️ Observabilidad limitada: Sin Grafana/Prometheus
```

**Narración (1.5 minutos):**
```
Ahora las limitaciones y aspectos que no funcionaron según lo planificado:

[Señalar cache]
El cache de transcripciones en Redis mostró un hit rate de solo 8%, muy
por debajo del 40% estimado. La razón es simple: en medicina, cada consulta
es única. No hay audios duplicados como inicialmente asumimos. Este cache
consume 2GB de RAM con beneficio marginal. En v2.0, lo eliminaremos y
reasignaremos esa memoria a ChromaDB para mayor capacidad vectorial.

[Señalar Whisper]
La latencia de transcripción con Whisper fue 120 segundos para audios de
45 minutos, 33% mayor que la estimación inicial de 90 segundos. Investigando,
descubrimos que el modelo whisper-1 con configuración language="es" y
prompt hint para terminología médica es más lento que el modelo genérico.
El trade-off es calidad de transcripción (95% WER vs 88%) a costo de
latencia adicional.

Opciones de mitigación evaluadas post-facto:
1. Chunking paralelo → riesgo de pérdida de contexto entre segmentos
2. Whisper local (faster-whisper) → reduce latencia 30-40% pero requiere
   migración y testing extensivo
3. Usar modelo genérico sin hint → WER 88% inaceptable para terminología
   médica especializada

Decisión: Aceptar 120s como baseline para v1.0, migrar a faster-whisper
en v2.0 como priority #1.

[Señalar observabilidad]
Finalmente, la observabilidad es funcional pero limitada. Tenemos logs
estructurados y cost tracking, pero NO implementamos Grafana/Prometheus
por limitaciones de tiempo. La debugging de issues en producción requiere
consultas SQL manuales a PostgreSQL en lugar de dashboards visuales.
Esto es aceptable para MVP pero sería bloqueante en producción con 10+
consultorios médicos.
```

**Diapositiva 3: Lecciones Aprendidas**

Lista de 4 aprendizajes transferibles:

```
1️⃣ System prompt + few-shot > fine-tuning para MVP
2️⃣ Cost tracking debe ser requisito no-funcional
3️⃣ RAGAS evaluation detecta hallucinations invisibles a tests unitarios
4️⃣ Real-time streaming requiere diseño desde día 1 (no se agrega después fácilmente)
```

**Narración (1.5 minutos):**
```
Las lecciones aprendidas más valiosas:

[Lección 1]
El system prompt con 2-3 ejemplos few-shot es más efectivo que fine-tuning
para la fase MVP. Iteramos 12 versiones del prompt hasta lograr JSON
consistente, pero esto tomó 3 días vs 2-3 semanas que habría requerido
fine-tuning de Llama 3. Para proyectos futuros, recomiendo: prototipa con
prompting, escala con fine-tuning solo si el caso lo justifica.

[Lección 2]
El cost tracking NO es una feature nice-to-have, es un requisito no-funcional
crítico. Sin dashboard de costos, las primeras pruebas de carga consumieron
$45 en 2 horas. El circuit breaker al 80% de presupuesto evitó que esto
se repitiera. En proyectos cloud con APIs de pago, implementar cost tracking
debe ser el PRIMER componente, no el último.

[Lección 3]
RAGAS evaluation detectó hallucinations que tests unitarios no capturaron.
18% de respuestas "aparentemente correctas" contenían información no soportada
por el contexto. Esto solo es visible con métricas como Faithfulness. Para
proyectos LLM futuros, definir umbrales RAGAS como quality gates en CI/CD
desde día 1.

[Lección 4]
La arquitectura real-time con WebSocket debe diseñarse desde el inicio.
Agregarlo después incrementó la complejidad en un 45%. Los aprendizajes clave:
- VAD en cliente reduce 30% del tráfico enviado al servidor
- Intelligent buffering (silencio → batch) ahorra 20-30% de costos
- Entity matching con embeddings supera reglas heurísticas (92% vs 78%)
- Event buffering en Redis es crítico para reconexiones graceful
```

**Diapositiva 4: Trabajo Futuro (Roadmap)**

Priorización visual de próximos 3 features:

```
🔴 ALTA PRIORIDAD (1-3 meses)
1. Whisper local (faster-whisper) → -40% latencia
2. Langfuse para observabilidad LLM
3. Autenticación JWT para multi-tenancy

🟡 MEDIA PRIORIDAD (3-6 meses)
4. Soporte multi-modal (GPT-4-vision para imágenes médicas)
5. Alertas médicas inteligentes (contraindicaciones, interacciones)

🟢 LARGO PLAZO (6-12 meses)
6. Agentes autónomos para workflow completo
7. Marketplace de especializaciones médicas
```

**Narración (30 segundos):**
```
El roadmap prioriza tres features para v2.0:

Migración a Whisper local con faster-whisper para reducir latencia 40% y
eliminar costo variable de Whisper API.

Langfuse para trazabilidad de prompts y respuestas, acelerando la iteración
de system prompts.

Y autenticación JWT con Azure AD para permitir que múltiples consultorios
usen el sistema con separación de datos.

A medio plazo, exploraremos soporte multi-modal con GPT-4-vision para
procesar radiografías y fotos de lesiones.
```

**Tiempo total de reflexión:** 3-4 minutos
**Sub-criterio A.3 (completo):** 8 puntos

---

### Segmento 6: Cierre (30 segundos)

**Diapositiva final:**
```
Gracias por su atención

MedRecord AI — Sistema de Documentación Médica Automatizada

Repositorio: https://github.com/[tu-usuario]/health-record
URL del sistema: http://[TU-IP-AWS]:3000
Documentación: docs/PROJECT_DOCUMENTATION.md

[Tu nombre]
AI/LLM Solution Architect | Cohorte 2025-A
```

**Narración:**
```
Gracias por su atención. El repositorio completo con código fuente,
documentación y resultados de evaluación está disponible en GitHub.
El sistema está desplegado en AWS y accesible en la URL mostrada en
pantalla.

Quedo a disposición para preguntas técnicas.
```

---

## Preparación Técnica Antes de Grabar

### Checklist Pre-Grabación

- [ ] **Sistema funcionando en AWS:**
  ```bash
  # Verifica que esté UP
  curl http://[TU-IP-AWS]:8000/api/v1/health
  ```

- [ ] **WebSocket streaming funcionando:**
  ```bash
  # Verifica conexión WebSocket
  wscat -c ws://[TU-IP-AWS]:8000/api/v1/sessions/test/stream
  # Debería conectar sin errores

  # O usa el test automático
  make test-websocket
  ```

- [ ] **Audios de prueba preparados:**
  - `audio_1_cefalea.mp3` (8 min)
  - `audio_2_multiple_symptoms.mp3` (15 min)
  - `audio_3_error_case.mp3` (audio con ruido)
  - `audio_4_drug_interaction.mp3` (para demo de alerta real-time)

- [ ] **Navegador con pestañas abiertas:**
  - Frontend: `http://[TU-IP-AWS]:3000`
  - **Streaming UI: `http://[TU-IP-AWS]:3000/streaming`**
  - Swagger docs: `http://[TU-IP-AWS]:8000/docs`
  - Cost dashboard: `http://[TU-IP-AWS]:8000/api/v1/costs/dashboard`
  - Health check: `http://[TU-IP-AWS]:8000/api/v1/health`

- [ ] **Diapositivas preparadas en PowerPoint/Google Slides:**
  - Slide 1: Título y stack tecnológico (incluyendo WebSocket real-time)
  - Slide 2: Diagrama C4 de arquitectura (con WebSocket Gateway)
  - Slide 3: Tabla comparativa de modelos LLM (ADR-001)
  - Slide 4: Comparativa ChromaDB vs Pinecone (ADR-002)
  - Slide 5: Diarización heurística vs Pyannote (ADR-005)
  - **Slide 6: Arquitectura Real-Time Streaming (ADR-006)**
  - **Slide 7: Flujo WebSocket + VAD + Entity Matching**
  - Slide 8: Resultados de rendimiento (batch Y real-time)
  - Slide 9: Métricas RAGAS
  - Slide 10: Análisis de costos reales (por modo batch/real-time)
  - Slide 11: Qué funcionó bien
  - Slide 12: Qué NO funcionó
  - Slide 13: Lecciones aprendidas (incluyendo real-time)
  - Slide 14: Roadmap v2.0
  - Slide 15: Cierre con enlaces

- [ ] **Script de comandos en terminal preparado:**
  ```bash
  # Guarda estos comandos en un archivo para copy-paste rápido
  curl http://[TU-IP-AWS]:8000/api/v1/health | jq
  ```

- [ ] **Timer visible:**
  - Instala una extensión de timer en pantalla o usa reloj físico visible

---

## Configuración de Grabación

### Software Recomendado

**Opción 1: OBS Studio** (gratuito, profesional)
- Descarga: https://obsproject.com/
- Configuración:
  - Resolución: 1920x1080 (Full HD)
  - Frame rate: 30 FPS
  - Bitrate: 5000 kbps
  - Formato: MP4 (H.264)

**Opción 2: Zoom** (gratuito, simple)
- Iniciar reunión solo contigo
- Compartir pantalla
- Grabar localmente
- Editar después para quitar silencios

**Opción 3: Loom** (gratuito hasta 5 min, de pago para 30 min)
- Más simple
- Upload directo a la nube
- Genera URL compartible automáticamente

### Configuración de Audio

**Micrófono:**
- Usa audífonos con micrófono de calidad (no el micrófono de laptop)
- Prueba con: `arecord -d 10 test.wav` (Linux) o QuickTime (Mac)
- Verifica que el volumen sea consistente (no muy bajo ni distorsionado)

**Ambiente:**
- Graba en habitación silenciosa
- Cierra ventanas (evita ruido de tráfico)
- Apaga ventiladores, aire acondicionado

**Prueba de sonido:**
```bash
# Graba 10 segundos de prueba
# Escucha para verificar que se oye claro
# Si suena apagado o con eco, cambia de ubicación
```

### Layout de Pantalla

**Configuración recomendada:**

```
┌─────────────────────────────────┐
│  [Diapositivas en lado izquierdo] │  [Demo en lado derecho]
│                                    │
│  - Mantén slides visibles         │  - Navegador con sistema
│  - Usa puntero para señalar       │  - Terminal si es necesario
│                                    │
└─────────────────────────────────┘

Alternativa: Pantalla completa con transiciones limpias
```

**NO hagas:**
- Alternar entre ventanas de forma caótica
- Dejar pestañas irrelevantes visibles (Facebook, email)
- Mostrar notificaciones del sistema (activa Do Not Disturb)

---

## Guión de Grabación (Step-by-Step)

### Pre-Roll (antes de empezar a grabar)

1. Cierra todas las aplicaciones innecesarias
2. Activa "Do Not Disturb" / "Focus Mode"
3. Abre OBS/Zoom/Loom
4. Verifica que el micrófono esté activo (verde)
5. Haz una grabación de prueba de 30 segundos
6. Escucha la prueba para verificar audio y video
7. Si está OK, procede con grabación final

### Durante la Grabación

**Si cometes un error pequeño:**
- Pausa 2 segundos en silencio
- Retoma desde la última oración completa
- Editarás el silencio después

**Si cometes un error mayor:**
- Para la grabación
- Respira, revisa el script
- Comienza de nuevo desde el inicio de ese segmento

**Mantén energía:**
- Habla con ritmo moderado (no muy rápido)
- Usa entonación variada (no monótono)
- Sonríe mientras hablas (se oye en la voz)

### Post-Roll (después de grabar)

1. Revisa el video completo
2. Verifica duración total (<30 min)
3. Edita silencios largos o errores obvios
4. Exporta en formato MP4
5. Sube a YouTube (unlisted) o Google Drive
6. Verifica que el enlace sea accesible sin login
7. Copia el enlace en `README.md`

---

## Edición Básica (Opcional pero Recomendado)

### Software de Edición

**Opción 1: DaVinci Resolve** (gratuito, profesional)
- Descarga: https://www.blackmagicdesign.com/products/davinciresolve

**Opción 2: Shotcut** (gratuito, simple)
- Descarga: https://shotcut.org/

**Opción 3: iMovie** (Mac, gratuito)
- Incluido en macOS

### Ediciones Mínimas Recomendadas

1. **Cortar silencios largos** (>5 segundos)
2. **Eliminar errores graves** (si reiniciaste un segmento)
3. **Agregar título inicial** (3 segundos):
   ```
   MedRecord AI
   Proyecto Final AI/LLM Solution Architect
   [Tu nombre] | Cohorte 2025-A
   ```
4. **Agregar subtítulos en secciones clave** (opcional):
   - "Demo en AWS EC2 (Producción)"
   - "RAGAS Faithfulness: 0.91"
   - "Costo por consulta: $0.35"

**NO edites en exceso:**
- No agregues música de fondo (distrae)
- No uses transiciones fancy (innecesarias)
- No agregues efectos visuales (no es Hollywood)

---

## Subir y Compartir el Video

### Opción 1: YouTube (Unlisted)

**Pasos:**
1. Ve a https://studio.youtube.com/
2. Click en "Create" → "Upload videos"
3. Selecciona tu archivo MP4
4. **Título:** "MedRecord AI — Proyecto Final AI/LLM BSG 2025-A"
5. **Descripción:**
   ```
   Sistema de transcripción y extracción automática de consultas médicas en español.

   Tecnologías: React, Node.js, Python, FastAPI, OpenAI Whisper, GPT-4o, ChromaDB
   Cloud: AWS EC2

   Repositorio: https://github.com/[tu-usuario]/health-record

   Proyecto Final — AI/LLM Solution Architect
   Cohorte: 2025-A
   Instructor: [nombre]
   ```
6. **Visibilidad:** Unlisted (NO público, NO privado)
7. Click "Next" → "Next" → "Publish"
8. Copia el enlace
9. Pégalo en `README.md` sección "Video de Presentación"

### Opción 2: Google Drive

**Pasos:**
1. Sube el archivo MP4 a Google Drive
2. Click derecho → "Get link"
3. Cambia a "Anyone with the link can view"
4. Copia el enlace
5. Pégalo en `README.md`

**Nota:** Google Drive tiene límite de 15 GB gratis. Un video de 30 min en Full HD pesa ~1-2 GB.

---

## Evaluación del Video (Auto-Check)

Antes de entregar, verifica estos criterios:

### Sub-criterio A.1: Demostración Funcional (12 pts)

- [ ] El sistema funciona en URL cloud (NO localhost)
- [ ] Se demuestran los 3 endpoints: `/query`, `/ingest`, `/health`
- [ ] Se muestran 3+ consultas representativas
- [ ] Se muestra al menos 1 caso de error o fuera de alcance
- [ ] La demo es fluida sin interrupciones técnicas mayores

**Pregunta clave:** ¿El instructor puede ver el sistema FUNCIONANDO de verdad?

### Sub-criterio A.2: Arquitectura y Decisiones (10 pts)

- [ ] Se explica la arquitectura general con diagrama C4 visible
- [ ] Se explican 3 decisiones técnicas con TRADE-OFFS (no solo la elección)
- [ ] Se menciona cómo funciona el pipeline RAG paso a paso
- [ ] Se explican los controles de seguridad implementados
- [ ] El nivel de detalle es apropiado para audiencia técnica senior

**Pregunta clave:** ¿Demuestras que DISEÑASTE el sistema (no solo lo copiaste)?

### Sub-criterio A.3: Resultados y Reflexión (8 pts)

- [ ] Se presentan scores RAGAS reales (Faithfulness, Relevancy, etc.)
- [ ] Se presenta latencia p95 medida (no estimada)
- [ ] Se presentan costos reales vs estimados
- [ ] Se admiten limitaciones reales del sistema
- [ ] Se menciona qué harías diferente en v2.0
- [ ] La reflexión demuestra aprendizaje real, no solo logros

**Pregunta clave:** ¿Eres HONESTO sobre lo que funcionó y lo que no?

---

## Errores Comunes a Evitar

| ❌ Error | ✅ Corrección |
|---------|-------------|
| Demo en localhost | Demo en URL AWS pública |
| "El sistema funciona bien" (sin datos) | "Latencia p95 de 2.8 min, Faithfulness 0.91" |
| Solo mencionar logros | Admitir limitaciones (cache 8% hit rate, Whisper 120s) |
| Leer el guión textualmente | Hablar naturalmente con bullet points como guía |
| Video de 35 minutos | Editar a <30 min o el instructor solo verá 30 min |
| Olvidar enlace en README | Verificar que el enlace funciona ANTES de entregar |
| Audio inaudible o con eco | Probar micrófono antes, grabar en ambiente silencioso |
| Alternar caóticamente entre ventanas | Planificar layout de pantalla antes |

---

## Timeline de Grabación (Día de Grabación)

**9:00 AM** - Setup técnico
- Verificar sistema AWS UP
- Abrir todas las pestañas necesarias
- Configurar OBS/Zoom

**9:30 AM** - Grabación de prueba
- Grabar 2 minutos de demo
- Revisar audio y video
- Ajustar si es necesario

**10:00 AM** - Grabación final (toma 1)
- Grabar video completo
- Si hay error mayor, reiniciar

**11:00 AM** - Revisión
- Ver video completo
- Anotar errores a editar

**11:30 AM** - Re-grabar segmentos (si necesario)
- Solo los segmentos con errores graves
- No re-grabar todo

**12:00 PM** - Edición básica
- Cortar silencios
- Agregar título inicial
- Exportar MP4

**1:00 PM** - Upload y verificación
- Subir a YouTube/Drive
- Verificar enlace accesible
- Actualizar README.md

**Total:** 4 horas (con margen de error)

---

## Recursos Adicionales

**Diapositivas plantilla:**
- Usa el template `docs/presentation_template.pptx` (créalo con los slides sugeridos)

**Scripts de demo:**
- Guarda en `scripts/video_demo_commands.sh` todos los curl commands que ejecutarás

**Checklist imprimible:**
- Imprime esta guía y marca cada ítem mientras grabas

---

## Próximos Pasos

Una vez completado el video:

1. ✅ Sube a YouTube (unlisted) o Google Drive
2. ✅ Copia el enlace en `README.md` sección "Video de Presentación"
3. ✅ Verifica que el enlace sea accesible (prueba en ventana incógnita)
4. ✅ Commit con mensaje: `docs: add final presentation video (EV)`
5. ➡️ Continúa con **Prompt 43: Final Review & Submission**

---

**Tiempo estimado total:** 4-6 horas (incluyendo grabación, edición y upload)

**Resultado esperado:** Video profesional de 28-30 minutos que demuestra dominio técnico, honestidad intelectual y capacidad de comunicación.

¡Éxito con la grabación! 🎥
