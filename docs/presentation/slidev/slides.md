---
theme: seriph
title: MedRecord — Documentación médica automatizada
info: |
  Sistema de transcripción y extracción clínica en vivo para consultas
  médicas en español. Proyecto final AI/LLM Solution Architect.
class: text-center
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
fonts:
  sans: 'Inter'
  serif: 'Lora'
  mono: 'JetBrains Mono'
background: https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1920&q=70
---

# MedRecord

Documentación médica automatizada en español

<div class="pt-12">
  <span class="px-3 py-1 rounded bg-white/20 text-sm">
    Enrique Jiménez · AI/LLM Solution Architect
  </span>
</div>

<div class="abs-br m-6 flex gap-2 text-xs opacity-80">
  <carbon-logo-github /> github.com/ejimenezv/health-record
</div>

---
layout: center
class: text-center
---

# El problema

<div class="text-5xl font-bold text-amber-600 my-8">30 – 40 %</div>

del tiempo del médico se va en documentación post-consulta

<div class="grid grid-cols-2 gap-6 mt-12 text-left text-base">
  <div class="p-4 rounded border-l-4 border-red-400 bg-red-50">
    <carbon-document /> Notas SOAP redactadas a mano, horas después
  </div>
  <div class="p-4 rounded border-l-4 border-red-400 bg-red-50">
    <carbon-warning /> Información perdida entre consulta y expediente
  </div>
  <div class="p-4 rounded border-l-4 border-red-400 bg-red-50">
    <carbon-error /> Errores difíciles de auditar
  </div>
  <div class="p-4 rounded border-l-4 border-red-400 bg-red-50">
    <carbon-alarm /> Alertas de interacción que llegan tarde
  </div>
</div>

---
layout: center
class: text-center
---

# La propuesta

Transcripción y extracción clínica **en vivo**, mientras la consulta ocurre

<div class="grid grid-cols-5 gap-4 mt-10 text-sm">
  <div class="p-4 rounded bg-teal-50 border border-teal-200">
    <carbon-microphone class="text-3xl text-teal-600 mx-auto" />
    <div class="mt-2 font-semibold">Audio en vivo</div>
    <div class="text-xs opacity-70">WebSocket bidireccional</div>
  </div>
  <div class="p-4 rounded bg-teal-50 border border-teal-200">
    <carbon-text-link-analysis class="text-3xl text-teal-600 mx-auto" />
    <div class="mt-2 font-semibold">Transcripción</div>
    <div class="text-xs opacity-70">Whisper + diarización</div>
  </div>
  <div class="p-4 rounded bg-teal-50 border border-teal-200">
    <carbon-data-vis-1 class="text-3xl text-teal-600 mx-auto" />
    <div class="mt-2 font-semibold">Extracción</div>
    <div class="text-xs opacity-70">Síntomas · CIE-10 · fármacos</div>
  </div>
  <div class="p-4 rounded bg-teal-50 border border-teal-200">
    <carbon-search class="text-3xl text-teal-600 mx-auto" />
    <div class="mt-2 font-semibold">RAG</div>
    <div class="text-xs opacity-70">Vademécum + citaciones</div>
  </div>
  <div class="p-4 rounded bg-amber-50 border border-amber-300">
    <carbon-warning-alt class="text-3xl text-amber-600 mx-auto" />
    <div class="mt-2 font-semibold">Alertas</div>
    <div class="text-xs opacity-70">Interacciones en vivo</div>
  </div>
</div>

<div class="mt-10 text-base italic opacity-80">
  Streaming desde el día uno. No es una funcionalidad agregada después.
</div>

---
layout: default
---

# Stack tecnológico

<div class="grid grid-cols-4 gap-6 mt-6 text-center">

  <div>
    <div class="text-xs uppercase opacity-60 mb-3">Frontend</div>
    <div class="flex flex-col items-center gap-3">
      <logos-react class="text-5xl" />
      <logos-typescript-icon class="text-5xl" />
      <logos-vitejs class="text-5xl" />
    </div>
    <div class="mt-3 text-sm opacity-80">React · TypeScript · Vite</div>
  </div>

  <div>
    <div class="text-xs uppercase opacity-60 mb-3">Backend de negocio</div>
    <div class="flex flex-col items-center gap-3">
      <logos-nodejs-icon class="text-5xl" />
      <logos-express class="text-5xl bg-white p-1 rounded" />
      <logos-prisma class="text-5xl" />
    </div>
    <div class="mt-3 text-sm opacity-80">Node.js · Express · Prisma</div>
  </div>

  <div>
    <div class="text-xs uppercase opacity-60 mb-3">Servicio de IA</div>
    <div class="flex flex-col items-center gap-3">
      <logos-python class="text-5xl" />
      <logos-fastapi-icon class="text-5xl" />
      <logos-openai-icon class="text-5xl" />
    </div>
    <div class="mt-3 text-sm opacity-80">Python · FastAPI · OpenAI</div>
  </div>

  <div>
    <div class="text-xs uppercase opacity-60 mb-3">Datos e infraestructura</div>
    <div class="flex flex-col items-center gap-3">
      <logos-postgresql class="text-5xl" />
      <logos-redis class="text-5xl" />
      <logos-aws class="text-5xl" />
    </div>
    <div class="mt-3 text-sm opacity-80">PostgreSQL · Redis · ChromaDB · AWS</div>
  </div>

</div>

<div class="mt-10 grid grid-cols-3 gap-4 text-center text-xs opacity-80">
  <div class="p-2 rounded bg-slate-100">
    <logos-docker-icon class="text-2xl mx-auto" />
    Docker Compose
  </div>
  <div class="p-2 rounded bg-slate-100">
    <logos-terraform-icon class="text-2xl mx-auto" />
    Terraform
  </div>
  <div class="p-2 rounded bg-slate-100">
    <carbon-data-base class="text-2xl mx-auto" />
    ChromaDB
  </div>
</div>

---
layout: default
---

# Arquitectura — vista de contenedores

```mermaid {scale: 0.75}
flowchart LR
  user([Médico])
  UI["Frontend<br/>React + Vite"]
  API["Backend<br/>Node + Express<br/>JWT · Prisma"]
  AI["AI Service<br/>Python + FastAPI<br/>WebSocket · Whisper<br/>Diarizer · RAG"]
  PG[(PostgreSQL)]
  RD[(Redis)]
  CH[(ChromaDB)]
  OAI{{OpenAI}}

  user --> UI
  UI -->|REST + JWT| API
  UI -->|WebSocket| AI
  API -->|JWT compartido| AI
  API --> PG
  AI --> RD
  AI --> CH
  AI --> OAI

  classDef ext fill:#fef3c7,stroke:#f59e0b,color:#000
  classDef store fill:#e0f2fe,stroke:#0284c7,color:#000
  class OAI ext
  class PG,RD,CH store
```

<div class="text-xs opacity-70 mt-4">
  Frontera deliberada: Node.js no toca prompts; Python no toca pacientes.
  JWT HS256 compartido byte-a-byte (ADR-003).
</div>

---
layout: default
---

# Demo en vivo — flujo

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">

<div class="p-3 rounded border-l-4 border-teal-500 bg-teal-50">
  <div class="font-bold flex items-center gap-2"><carbon-checkmark-filled class="text-teal-600" /> 1 · Health checks</div>
  <div class="text-xs opacity-80 mt-1">Backend + AI service responden healthy</div>
</div>

<div class="p-3 rounded border-l-4 border-teal-500 bg-teal-50">
  <div class="font-bold flex items-center gap-2"><carbon-user-avatar class="text-teal-600" /> 2 · Login + dashboard</div>
  <div class="text-xs opacity-80 mt-1">JWT compartido, navegación clínica</div>
</div>

<div class="p-3 rounded border-l-4 border-teal-500 bg-teal-50">
  <div class="font-bold flex items-center gap-2"><carbon-user-multiple class="text-teal-600" /> 3 · Paciente + cita</div>
  <div class="text-xs opacity-80 mt-1">Alergias y crónicas como entidades</div>
</div>

<div class="p-3 rounded border-l-4 border-amber-500 bg-amber-50">
  <div class="font-bold flex items-center gap-2"><carbon-microphone-filled class="text-amber-600" /> 4 · Sesión en vivo</div>
  <div class="text-xs opacity-80 mt-1">WebSocket, transcripción incremental</div>
</div>

<div class="p-3 rounded border-l-4 border-amber-500 bg-amber-50">
  <div class="font-bold flex items-center gap-2"><carbon-collaborate class="text-amber-600" /> 5 · Diarización</div>
  <div class="text-xs opacity-80 mt-1">Doctor / paciente en tiempo real</div>
</div>

<div class="p-3 rounded border-l-4 border-amber-500 bg-amber-50">
  <div class="font-bold flex items-center gap-2"><carbon-data-vis-4 class="text-amber-600" /> 6 · Extracción en vivo</div>
  <div class="text-xs opacity-80 mt-1">Síntomas, dx, CIE-10 candidato</div>
</div>

<div class="p-3 rounded border-l-4 border-red-500 bg-red-50">
  <div class="font-bold flex items-center gap-2"><carbon-warning-alt class="text-red-600" /> 7 · Alerta de interacción</div>
  <div class="text-xs opacity-80 mt-1">drug_interaction vía WebSocket</div>
</div>

<div class="p-3 rounded border-l-4 border-teal-500 bg-teal-50">
  <div class="font-bold flex items-center gap-2"><carbon-document-tasks class="text-teal-600" /> 8 · Cierre de sesión</div>
  <div class="text-xs opacity-80 mt-1">Transcripción + extracción consolidadas</div>
</div>

<div class="p-3 rounded border-l-4 border-teal-500 bg-teal-50">
  <div class="font-bold flex items-center gap-2"><carbon-search class="text-teal-600" /> 9 · Consulta RAG</div>
  <div class="text-xs opacity-80 mt-1">POST /query con citaciones</div>
</div>

</div>

---
layout: section
---

# Decisiones técnicas
## Trade-offs documentados como ADRs

---

# ADR-001 · Estrategia multi-tier de LLMs

<div class="grid grid-cols-3 gap-4 mt-6">

<div class="p-5 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300">
  <div class="text-xs uppercase font-bold text-emerald-700">FAST_CHEAP</div>
  <div class="text-xl font-bold mt-1">GPT-4o-mini</div>
  <div class="text-sm mt-3 opacity-80">Validaciones rápidas, validador de diarización lingüística, formato JSON.</div>
  <div class="mt-4 text-xs"><logos-openai-icon /> ~ $0.15 / 1M tokens</div>
</div>

<div class="p-5 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-500 shadow-md">
  <div class="text-xs uppercase font-bold text-teal-700">BALANCED · baseline</div>
  <div class="text-xl font-bold mt-1">GPT-4o</div>
  <div class="text-sm mt-3 opacity-80">Extracción clínica estructurada, generación principal, CIE-10.</div>
  <div class="mt-4 text-xs"><logos-openai-icon /> ~ $2.50 / 1M tokens</div>
</div>

<div class="p-5 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300">
  <div class="text-xs uppercase font-bold text-amber-700">PREMIUM</div>
  <div class="text-xl font-bold mt-1">GPT-4-turbo</div>
  <div class="text-sm mt-3 opacity-80">Fallback para casos complejos o cuando BALANCED falla en JSON.</div>
  <div class="mt-4 text-xs"><logos-openai-icon /> ~ $10 / 1M tokens</div>
</div>

</div>

<div class="mt-8 p-4 rounded bg-slate-100 text-sm">
  <span class="font-bold">Trade-off:</span> GPT-4o-mini es <b>~16× más barato</b> que GPT-4o,
  pero menos preciso en dosis (18 % vs 3 % de error). Por eso GPT-4o queda como
  baseline y mini se usa solo en validaciones secundarias.
</div>

---

# ADR-002 · ChromaDB sobre Pinecone

<div class="mt-4">

| Opción | Costo / mes | Latencia retrieval | Veredicto |
|---|---|---|---|
| **ChromaDB** (elegido) | $0 (local) | 80 – 120 ms | Suficiente al volumen actual |
| Pinecone | ~$50 starter | 50 – 80 ms | Mejor latencia, pero overkill |
| Weaviate cloud | ~$25 / mes | 60 – 100 ms | Complejidad operacional alta |

</div>

<div class="grid grid-cols-2 gap-4 mt-8">

<div class="p-4 rounded bg-teal-50 border border-teal-200">
  <div class="font-bold flex items-center gap-2"><carbon-idea class="text-teal-600" /> Por qué</div>
  <div class="text-sm mt-2 opacity-80">
    El cuello de botella real es Whisper (~80 s), no el retrieval.
    Optimizar el componente que pesa el 0.1 % del tiempo no tiene sentido.
  </div>
</div>

<div class="p-4 rounded bg-amber-50 border border-amber-200">
  <div class="font-bold flex items-center gap-2"><carbon-renew class="text-amber-600" /> Cuándo revisar</div>
  <div class="text-sm mt-2 opacity-80">
    Si superamos 80 k vectores, retrieval p95 &gt; 500 ms,
    o necesidad de multi-región / alta disponibilidad.
  </div>
</div>

</div>

---

# ADR-003 · Node.js + Python con JWT compartido

<div class="grid grid-cols-2 gap-8 mt-6">

<div>
  <div class="flex items-center gap-3 mb-3">
    <logos-nodejs-icon class="text-4xl" />
    <div class="font-bold text-xl">Node.js · dominio clínico</div>
  </div>
  <div class="text-sm opacity-80">
    Pacientes, citas, expediente, autenticación. Express + Prisma sobre PostgreSQL.
    <b>Deliberadamente delgado en IA</b>: invoca, no orquesta.
  </div>
</div>

<div>
  <div class="flex items-center gap-3 mb-3">
    <logos-python class="text-4xl" />
    <div class="font-bold text-xl">Python · IA</div>
  </div>
  <div class="text-sm opacity-80">
    Streaming, Whisper, diarización, extracción, RAG, RAGAS, cost tracking.
    Ecosistema sin equivalente real en Node.
  </div>
</div>

</div>

<div class="mt-10 p-5 rounded bg-gradient-to-r from-teal-50 to-emerald-50 border-l-4 border-teal-500">
  <div class="font-bold flex items-center gap-2"><carbon-password class="text-teal-600" /> JWT HS256 compartido</div>
  <div class="text-sm mt-2 opacity-80">
    Un solo token vale en ambos servicios. Secreto byte-a-byte idéntico.
    El frontend autentica una vez; backend y AI service validan
    independientemente.
  </div>
</div>

---

# ADR-005 · Diarización híbrida sin GPU

<div class="text-sm opacity-70 mt-2">
  AudioFeatureDiarizer + LLMValidator + IncrementalDiarizer
</div>

<div class="grid grid-cols-2 gap-6 mt-6">

<div class="p-5 rounded-lg bg-emerald-50 border border-emerald-300">
  <div class="text-xs uppercase font-bold text-emerald-700">Streaming (online)</div>
  <div class="text-5xl font-bold text-emerald-600 my-3">~ 87 %</div>
  <div class="text-sm opacity-80">precisión · &lt; 2 s por chunk</div>
</div>

<div class="p-5 rounded-lg bg-teal-50 border border-teal-300">
  <div class="text-xs uppercase font-bold text-teal-700">Refinamiento batch al cerrar</div>
  <div class="text-5xl font-bold text-teal-600 my-3">~ 92 %</div>
  <div class="text-sm opacity-80">precisión · + 30 s al cerrar</div>
</div>

</div>

<div class="mt-8 grid grid-cols-3 gap-3 text-xs">
  <div class="p-3 rounded bg-red-50 border border-red-200">
    <b>Pyannote (GPU)</b> — descartado: requiere GPU; en CPU es incompatible con tiempo real.
  </div>
  <div class="p-3 rounded bg-red-50 border border-red-200">
    <b>Resemblyzer</b> — descartado: ~80 % de precisión, no mejora baseline.
  </div>
  <div class="p-3 rounded bg-red-50 border border-red-200">
    <b>AssemblyAI</b> — descartado: ~$1.50/consulta, 15× el costo objetivo.
  </div>
</div>

---

# ADR-006 · Streaming en tiempo real

```mermaid {scale: 0.65}
sequenceDiagram
  participant C as Frontend
  participant W as WebSocket · Python
  participant V as VAD + Whisper
  participant E as Extractor + RAG
  C->>W: POST /sessions → WS connect (JWT)
  loop por cada chunk (~100 ms)
    C->>W: audio bytes
    alt voz activa
      W->>V: batch 5 s → transcribir
      V-->>C: transcript_update
      V->>E: extract + validate
      E-->>C: entity_extracted
      E-->>C: validation_alert (drug_interaction)
    else silencio largo
      W-->>W: skip
    end
  end
```

<div class="text-xs opacity-70 mt-4">
  Intelligent buffering: voz activa → 5 s · silencio 2-10 s → batch · silencio largo → skip.
</div>

---
layout: section
---

# Resultados medidos
## Source-of-truth: <code>docs/delivery-4/</code>

---

# RAGAS · calidad del RAG

<div class="text-xs opacity-60 mt-1">
  Ejecución 2026-04-30 · 8 preguntas sintéticas validadas · regresión guardrail
</div>

<div class="grid grid-cols-4 gap-4 mt-8">

<div class="p-5 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-300 text-center">
  <div class="text-xs uppercase font-bold text-emerald-700">Faithfulness</div>
  <div class="text-5xl font-bold text-emerald-600 my-2">0.938</div>
  <div class="text-xs opacity-70">umbral &gt; 0.80</div>
</div>

<div class="p-5 rounded-lg bg-gradient-to-br from-teal-100 to-teal-50 border border-teal-300 text-center">
  <div class="text-xs uppercase font-bold text-teal-700">Context Precision</div>
  <div class="text-5xl font-bold text-teal-600 my-2">1.000</div>
  <div class="text-xs opacity-70">umbral &gt; 0.75</div>
</div>

<div class="p-5 rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-50 border border-cyan-300 text-center">
  <div class="text-xs uppercase font-bold text-cyan-700">Answer Relevancy</div>
  <div class="text-5xl font-bold text-cyan-600 my-2">0.964</div>
  <div class="text-xs opacity-70">umbral &gt; 0.75</div>
</div>

<div class="p-5 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-300 text-center">
  <div class="text-xs uppercase font-bold text-blue-700">Context Recall</div>
  <div class="text-5xl font-bold text-blue-600 my-2">1.000</div>
  <div class="text-xs opacity-70">umbral &gt; 0.70</div>
</div>

</div>

<div class="mt-10 p-3 rounded bg-amber-50 border-l-4 border-amber-400 text-sm">
  <b>Caveat explícito:</b> dataset sintético de 8 preguntas. Es un guardrail
  de regresión, no una prueba de calidad clínica en producción.
</div>

---

# Carga y latencia

<div class="mt-4">

| Escenario | Métrica | Valor | Objetivo | |
|---|---|---|---|---|
| Persistencia de eventos | Write p95 | **14.45 ms** | &lt; 50 ms | <carbon-checkmark-filled class="text-emerald-600" /> |
| Persistencia de eventos | Throughput | **712 writes/s** | ≥ 50 w/s | <carbon-checkmark-filled class="text-emerald-600" /> |
| Persistencia de eventos | Error rate | **0.00 %** | &lt; 1 % | <carbon-checkmark-filled class="text-emerald-600" /> |
| WebSocket handshake | Latencia mediana | **59 ms** | &lt; 500 ms | <carbon-checkmark-filled class="text-emerald-600" /> |

</div>

<div class="mt-8 grid grid-cols-2 gap-4 text-sm">

<div class="p-4 rounded bg-emerald-50 border border-emerald-200">
  <carbon-rocket class="text-emerald-600 text-2xl" />
  <div class="font-bold mt-1">Throughput sostenido</div>
  <div class="text-xs opacity-80 mt-1">14× sobre el objetivo de persistencia.</div>
</div>

<div class="p-4 rounded bg-emerald-50 border border-emerald-200">
  <carbon-flash class="text-emerald-600 text-2xl" />
  <div class="font-bold mt-1">Conexión WebSocket instantánea</div>
  <div class="text-xs opacity-80 mt-1">Mediana 8.5× por debajo del límite.</div>
</div>

</div>

<div class="text-xs opacity-60 mt-6">
  Fuente: ai-service/reports/2026-04-30/load_test_report.md
</div>

---

# Costos

<div class="grid grid-cols-2 gap-6 mt-6">

<div>
  <div class="font-bold mb-3 flex items-center gap-2">
    <carbon-checkmark-filled class="text-emerald-600" /> Construido
  </div>
  <ul class="text-sm space-y-2 opacity-90">
    <li>Cost tracker en cada llamada a OpenAI</li>
    <li>Endpoint <code>GET /api/v1/costs</code> con desglose por servicio y modo</li>
    <li>Caching de embeddings en Redis para evitar llamadas redundantes</li>
    <li>Modelo de costos proyectado en <code>delivery-4/02-cost-analysis.md</code></li>
  </ul>
</div>

<div>
  <div class="font-bold mb-3 flex items-center gap-2">
    <carbon-warning class="text-amber-600" /> No medido aún
  </div>
  <ul class="text-sm space-y-2 opacity-90">
    <li>Costo promedio observado sobre sesiones reales completadas</li>
    <li>Reconciliación con facturación AWS (<b>OI-5</b>)</li>
    <li>Dashboard de costos en el frontend</li>
  </ul>
</div>

</div>

<div class="mt-8 p-4 rounded bg-slate-100 text-sm">
  <b>Honestidad:</b> la cifra <b>$0.25 – 0.28 por consulta</b> en tiempo real
  es del modelo de costos, no un promedio observado. La reconciliación con
  AWS y la visualización son trabajo de v2.
</div>

---
layout: section
---

# Reflexión
## Lo que funcionó · lo pendiente · lecciones

---

# Lo que funcionó

<div class="grid grid-cols-1 gap-3 mt-6">

<div class="p-4 rounded bg-emerald-50 border-l-4 border-emerald-500 flex items-start gap-3">
  <carbon-checkmark-filled class="text-emerald-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Multi-tier LLM (ADR-001)</div>
    <div class="text-sm opacity-80">GPT-4o donde importa, mini para validaciones secundarias.</div>
  </div>
</div>

<div class="p-4 rounded bg-emerald-50 border-l-4 border-emerald-500 flex items-start gap-3">
  <carbon-checkmark-filled class="text-emerald-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">ChromaDB local (ADR-002)</div>
    <div class="text-sm opacity-80">Cero costo operacional, latencia suficiente al volumen actual.</div>
  </div>
</div>

<div class="p-4 rounded bg-emerald-50 border-l-4 border-emerald-500 flex items-start gap-3">
  <carbon-checkmark-filled class="text-emerald-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Diarización híbrida (ADR-005)</div>
    <div class="text-sm opacity-80">87 % streaming · 92 % batch · sin GPU.</div>
  </div>
</div>

<div class="p-4 rounded bg-emerald-50 border-l-4 border-emerald-500 flex items-start gap-3">
  <carbon-checkmark-filled class="text-emerald-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Streaming desde día uno (ADR-006)</div>
    <div class="text-sm opacity-80">Habilitó alertas en cuanto se detectan, no después.</div>
  </div>
</div>

<div class="p-4 rounded bg-emerald-50 border-l-4 border-emerald-500 flex items-start gap-3">
  <carbon-checkmark-filled class="text-emerald-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">RAGAS como guardrail de regresión</div>
    <div class="text-sm opacity-80">Integrado al ciclo de desarrollo, no añadido al final.</div>
  </div>
</div>

</div>

---

# Lo que quedó pendiente

<div class="grid grid-cols-1 gap-3 mt-6">

<div class="p-4 rounded bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
  <carbon-warning-alt class="text-red-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Generación automática del borrador SOAP</div>
    <div class="text-sm opacity-80">Modelo de datos listo, orquestación pendiente para v2.</div>
  </div>
</div>

<div class="p-4 rounded bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
  <carbon-warning-alt class="text-red-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Dependencia de la API de Whisper</div>
    <div class="text-sm opacity-80">Latencia y costo variable; <code>faster-whisper</code> local es la migración candidata.</div>
  </div>
</div>

<div class="p-4 rounded bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
  <carbon-warning-alt class="text-red-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Sin dashboard de costos en el frontend</div>
    <div class="text-sm opacity-80">El endpoint backend existe; falta la UI.</div>
  </div>
</div>

<div class="p-4 rounded bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
  <carbon-warning-alt class="text-red-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Sin Grafana / Prometheus</div>
    <div class="text-sm opacity-80">Solo logs estructurados y métricas in-process.</div>
  </div>
</div>

<div class="p-4 rounded bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
  <carbon-warning-alt class="text-red-600 text-2xl mt-1" />
  <div>
    <div class="font-bold">Reconciliación con facturación AWS (OI-5)</div>
    <div class="text-sm opacity-80">Pendiente para v2.</div>
  </div>
</div>

</div>

---

# Lecciones aprendidas

<div class="grid grid-cols-2 gap-5 mt-6">

<div class="p-5 rounded-lg bg-teal-50 border border-teal-200">
  <div class="text-3xl text-teal-600"><carbon-edit /></div>
  <div class="font-bold mt-2">Prompt > fine-tuning en MVP</div>
  <div class="text-sm opacity-80 mt-2">
    Few-shot prompting llega antes y más barato. Fine-tuning solo si el caso lo justifica.
  </div>
</div>

<div class="p-5 rounded-lg bg-teal-50 border border-teal-200">
  <div class="text-3xl text-teal-600"><carbon-currency-dollar /></div>
  <div class="font-bold mt-2">Cost tracking es un RNF</div>
  <div class="text-sm opacity-80 mt-2">
    Se instrumenta primero. La interfaz puede esperar; los datos no.
  </div>
</div>

<div class="p-5 rounded-lg bg-teal-50 border border-teal-200">
  <div class="text-3xl text-teal-600"><carbon-microscope /></div>
  <div class="font-bold mt-2">RAGAS detecta lo que tests no</div>
  <div class="text-sm opacity-80 mt-2">
    Faithfulness es la propiedad que importa en dominio clínico.
  </div>
</div>

<div class="p-5 rounded-lg bg-teal-50 border border-teal-200">
  <div class="text-3xl text-teal-600"><carbon-flash /></div>
  <div class="font-bold mt-2">Streaming se diseña, no se retrofitea</div>
  <div class="text-sm opacity-80 mt-2">
    VAD, buffering, entity matching y reconexión solo encajan limpios desde el día uno.
  </div>
</div>

</div>

---

# Roadmap v2

<div class="mt-6 grid grid-cols-2 gap-6">

<div>
  <div class="text-xs uppercase font-bold text-red-600 mb-3 flex items-center gap-2">
    <carbon-flag /> Prioridad alta · 1 – 3 meses
  </div>
  <ul class="space-y-3 text-sm">
    <li class="p-3 rounded bg-red-50 border border-red-200">
      <b>Generación automática del borrador SOAP</b><br>
      <span class="text-xs opacity-80">Completa el contrato "el médico cierra y la documentación está hecha"</span>
    </li>
    <li class="p-3 rounded bg-red-50 border border-red-200">
      <b>Migración a faster-whisper local</b><br>
      <span class="text-xs opacity-80">−40 % latencia + elimina costo variable de la API</span>
    </li>
    <li class="p-3 rounded bg-red-50 border border-red-200">
      <b>Dashboard de costos + observabilidad</b><br>
      <span class="text-xs opacity-80">Frontend para /api/v1/costs · Langfuse · Grafana</span>
    </li>
  </ul>
</div>

<div>
  <div class="text-xs uppercase font-bold text-amber-600 mb-3 flex items-center gap-2">
    <carbon-time /> Medio · largo plazo · 3 – 12 meses
  </div>
  <ul class="space-y-3 text-sm">
    <li class="p-3 rounded bg-amber-50 border border-amber-200">
      <b>Multi-tenancy con auth federada</b><br>
      <span class="text-xs opacity-80">Azure AD / Cognito · separación estricta de datos</span>
    </li>
    <li class="p-3 rounded bg-amber-50 border border-amber-200">
      <b>Soporte multimodal</b><br>
      <span class="text-xs opacity-80">GPT-4-vision para radiografías y fotos clínicas</span>
    </li>
    <li class="p-3 rounded bg-amber-50 border border-amber-200">
      <b>Alertas clínicas más ricas</b><br>
      <span class="text-xs opacity-80">Cruzando historial completo del paciente</span>
    </li>
  </ul>
</div>

</div>

---
layout: cover
background: https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=70
class: text-center
---

# Gracias

MedRecord — documentación médica automatizada en español

<div class="pt-10 text-base flex flex-col items-center gap-3">
  <div class="flex items-center gap-2">
    <carbon-logo-github />
    <a href="https://github.com/ejimenezv/health-record" class="underline">github.com/ejimenezv/health-record</a>
  </div>
  <div class="flex items-center gap-2 opacity-80">
    <carbon-document />
    docs/delivery-4/ · docs/adr/
  </div>
</div>

<div class="abs-bl m-6 text-xs opacity-70">
  Enrique Jiménez · AI/LLM Solution Architect
</div>
