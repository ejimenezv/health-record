# C4 — Nivel 1: Contexto

**Sistema:** MedRecord AI
**Propósito:** Mostrar el sistema y los actores/sistemas externos con los que interactúa.

```mermaid
%%{init: {'theme':'neutral', 'flowchart':{'curve':'basis'}}}%%
flowchart TB
    classDef person fill:#08427B,stroke:#052E56,color:#fff
    classDef system fill:#1168BD,stroke:#0B4884,color:#fff
    classDef external fill:#999,stroke:#666,color:#fff

    medico["👤 Médico<br/><i>Realiza la consulta, revisa<br/>transcripción y extracciones,<br/>valida la nota SOAP</i>"]:::person
    admin["👤 Administrador<br/><i>Monitorea costos, métricas<br/>de calidad y configuración</i>"]:::person

    sistema["<b>MedRecord AI</b><br/><i>Sistema de gestión de consultas<br/>médicas con transcripción en<br/>tiempo real, diarización y<br/>extracción estructurada de<br/>síntomas, diagnósticos y<br/>prescripciones validadas con RAG</i>"]:::system

    openai["OpenAI API<br/><i>Whisper (transcripción)<br/>GPT-4o (extracción, validación<br/>de speakers, splits)<br/>Embeddings text-embedding-3-small</i>"]:::external
    vademecum["Corpus Vademécum<br/><i>30 medicamentos + 25<br/>interacciones + 40 códigos<br/>CIE-10 (Spanish)</i>"]:::external

    medico -- "Habla durante la consulta /<br/>revisa eventos en UI<br/>[HTTPS + WSS]" --> sistema
    admin -- "Configura, revisa<br/>métricas y costos<br/>[HTTPS]" --> sistema

    sistema -- "Audio para transcripción /<br/>texto para extracción y<br/>generación de SOAP<br/>[HTTPS REST]" --> openai
    sistema -- "Indexa al iniciar /<br/>consulta vía RAG durante<br/>la consulta" --> vademecum
```

## Actores

| Actor | Rol |
|---|---|
| **Médico** | Usuario primario. Inicia sesión de transcripción, habla durante la consulta, revisa transcripción/extracciones en tiempo real, edita y guarda la nota SOAP. |
| **Administrador** | Monitorea costos por sesión y agregados (`/api/v1/costs/*`), revisa métricas de calidad RAG, ajusta thresholds de dedup y umbrales VAD. |

## Sistemas Externos

| Sistema | Uso | Modelos / Datos |
|---|---|---|
| **OpenAI API** | Transcripción + extracción + validación tipográfica + embeddings | `whisper-1`, `gpt-4o`, `gpt-4o-mini`, `text-embedding-3-small` |
| **Corpus Vademécum** | Conocimiento clínico para validación RAG (interacciones, posología, CIE-10) | `ai-service/data/vademecum/*.json` ingestado a ChromaDB |

## Notas

- El **paciente** no es un actor del sistema — su voz es procesada pero no interactúa con la UI.
- Las **bases de conocimiento médico** son provisionadas a tiempo de ingesta, no consultadas online (a diferencia del diseño C4 contexto del prompt 36 original).
- La autenticación es JWT-only, emitida por el Backend (no hay un IdP externo en el alcance actual).
