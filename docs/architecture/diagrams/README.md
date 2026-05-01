# Diagramas de Arquitectura — MedRecord AI

Diagramas arquitectónicos del sistema **MedRecord AI** (consultas médicas con transcripción y extracción asistida por IA), reflejando el estado **post-prompts 27.x** del pipeline real-time.

> **Formato:** Todos los diagramas están escritos en [Mermaid](https://mermaid.js.org/) embebido en Markdown. GitHub, VS Code (con extensión "Markdown Preview Mermaid Support") y la mayoría de renderizadores los muestran como SVG vectorial — equivalente o superior a 300 dpi para impresión. Los archivos `.md` son la fuente editable; para exportar a PNG/SVG ver sección [Exportar a PNG](#exportar-a-png-300-dpi).

## Índice de Diagramas

| Diagrama | Tipo | Descripción | Archivo |
|----------|------|-------------|---------|
| Contexto C4 | C4 Nivel 1 | Sistema y actores externos | [c4-context.md](c4-context.md) |
| Contenedor C4 | C4 Nivel 2 | Componentes técnicos, REST + WebSocket, persistencia | [c4-container.md](c4-container.md) |
| Pipeline de Transcripción Real-Time | Componente | Capas del pipeline streaming (VAD → Whisper → dedup → diarización → extracción → RAG) | [pipeline-realtime.md](pipeline-realtime.md) |
| Secuencia — Flujo Real-Time (streaming) | Secuencia | Ciclo WebSocket bidireccional con extracción incremental y alertas | [sequence-realtime.md](sequence-realtime.md) |
| Secuencia — Flujo Batch (subida de audio) | Secuencia | Subida REST + procesamiento + polling | [sequence-batch.md](sequence-batch.md) |
| Equivalencias Multi-Cloud | Mapping | AWS ↔ GCP ↔ Azure | [multi-cloud-equivalences.md](multi-cloud-equivalences.md) |

## Convenciones

### Colores (C4)
- 🟦 **Azul** — Sistemas externos (OpenAI, navegador del usuario)
- 🟩 **Verde** — Aplicaciones propias (Frontend React, Backend Node.js, AI Service Python)
- 🟨 **Amarillo** — Datos y vector store (PostgreSQL, ChromaDB, Redis)
- 🟧 **Naranja** — Infraestructura (Nginx, Docker, AWS EC2)

### Flechas
- `-->` Llamada HTTP/REST síncrona
- `-.->` WebSocket / mensajería asíncrona
- `==>` Flujo de datos crítico (audio, alertas)

### Diagramas de secuencia
- **Actor**: `actor`
- **UI/Cliente**: `participant` con label de tecnología
- **Servicios externos**: `participant` con etiqueta `<<external>>`
- **Almacenamiento**: `participant` con sufijo `[(DB)]`

## Cambios respecto al diseño original

El pipeline implementado difiere del diseño inicial (Prompt 27 / `streaming-transcription-architecture.md` apéndice A) en varios puntos clave; los diagramas reflejan **el estado actual**:

| Diseño original | Implementación actual |
|---|---|
| Celery worker para procesamiento batch | **No hay Celery**. El AI Service procesa todo en-proceso via `asyncio` y workers de `RAGValidationCoordinator` |
| Chunks de audio 20 ms Opus, decode independiente | `MediaRecorder` webm/opus con `timeslice=5000ms`; el server acumula `session_audio` y hace slicing con overlap de 1.5 s |
| Diarización por VAD + LLM | **Resemblyzer** (embeddings de voz 256-d) + clustering online por sesión, fallback heurístico por keywords |
| Polling cada 5 s para batch | Real-time es el flujo primario; batch existe pero usa la misma infra de WebSocket / eventos persistidos |
| Sin protección contra hallucinations | Filtro de 6 capas (`hallucination_filter.py`): substring patterns, ALL-CAPS, marcadores de sonido, repetición, mismo-que-previo, low-confidence |
| Entidades emitidas tal cual del LLM | Pipeline de 5 capas: split de compuestos → forbidden-prefix → type-validator (gpt-4o-mini) → exact/containment dedup → semantic dedup (embeddings + cosine ≥ 0.86) |
| RAG síncrono en path crítico | `RAGValidationCoordinator` con colas async por prioridad (CRITICAL / HIGH / MEDIUM); validación no-bloqueante |

## Exportar a PNG (300 dpi)

GitHub renderiza Mermaid como SVG; para PNG de alta resolución:

**Opción A — `mmdc` (Mermaid CLI):**
```bash
npm i -g @mermaid-js/mermaid-cli
mmdc -i c4-container.md -o c4-container.png -s 3 -b white
```
`-s 3` produce ~300 dpi sobre tamaño base; `-b white` fondo blanco para PDF.

**Opción B — VS Code:**
Instala `Markdown Preview Mermaid Support`, abre el `.md`, click derecho en el diagrama renderizado → "Save as image".

**Opción C — mermaid.live:**
Pega el bloque ` ```mermaid ` en https://mermaid.live, exporta SVG/PNG.

## Referencias

- [C4 Model Specification](https://c4model.com/)
- Pipeline real implementado: [`docs/architecture/streaming-transcription-architecture.md`](../streaming-transcription-architecture.md)
- ADRs: [`docs/architecture/decisions/`](../decisions/) (también `docs/adr/`)
- Auditoría operacional: [`docs/architecture/realtime-pipeline-audit.md`](../realtime-pipeline-audit.md)
