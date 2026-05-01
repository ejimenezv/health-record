# ADR-005: Estrategia híbrida de diarización de hablantes

**Fecha:** 01/05/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

## Contexto

Las consultas médicas son diálogos entre **doctor** y **paciente** (ocasionalmente un acompañante). Para generar notas SOAP estructuradas, cada segmento de la transcripción debe atribuirse al hablante correcto.

**Requerimientos:**

- Identificar 2 hablantes principales (doctor / paciente) con precisión > 85 %
- Funcionar en **modo streaming** — etiquetas deben actualizarse mientras la consulta avanza, no solo al final
- No requerir GPU (el deployment es CPU-only en EC2 t3.medium, ver ADR-007)
- Costo incremental por consulta < $0.20 sobre el costo de transcripción base
- Soportar audio en español médico, calidad típica de micrófono de laptop

**Restricciones técnicas:**

- Whisper API no devuelve etiquetas de hablante
- Pyannote.audio (estado del arte) requiere GPU para inferencia razonable en consultas de 60 min
- AssemblyAI tiene diarización buena pero costo prohibitivo (~$1.50/consulta)

## Decisión

Adoptar una **estrategia híbrida en tres capas** implementada en [ai-service/src/transcription/diarization/](../../ai-service/src/transcription/diarization/):

1. **`AudioFeatureDiarizer`** — analiza features acústicos (energía, pitch, MFCC) por chunk para proponer cambios de hablante.
2. **`LLMValidator`** — usa GPT-4o-mini (tier `FAST_CHEAP`, ver ADR-001) para validar/corregir atribuciones usando el contexto lingüístico (preguntas → doctor; respuestas con síntomas → paciente; expresiones de empatía → doctor).
3. **`IncrementalDiarizer` + `IncrementalBuilder`** — mantienen el estado de la sesión y pueden **emitir actualizaciones retroactivas** cuando un patrón claro contradice una etiqueta previa.

**Modos de operación:**

| Modo | Precisión observada | Latencia adicional | Uso |
|---|---|---|---|
| Streaming (online) | ~87 % | < 2 s por chunk | Default — el médico ve la diarización mientras habla |
| Refinamiento batch (post-sesión) | ~92 % | + 30 s al cerrar la sesión | Triggered por `session_complete`; reescribe etiquetas finales antes de persistir SOAP |

**Heurística de bootstrap**: en consultas donde la primera frase es una bienvenida (~90 % de los casos), el primer hablante se etiqueta como `DOCTOR`. El `LLMValidator` puede corregir esto retroactivamente si los primeros 3 turnos contradicen la asunción.

**Lo que NO se usa, y por qué:**

- **Pyannote.audio**: requiere GPU; la inferencia CPU para 60 min toma > 5 min — incompatible con tiempo real.
- **OpenAI Whisper diarization (experimental)**: inestable para > 2 hablantes y no expuesto en la API hosteada.
- **Speaker embeddings (Resemblyzer)**: precisión ~80 %, no mejora el baseline heurístico lo suficiente para justificar la dependencia.

## Opciones evaluadas

| Opción | Precisión | Costo/consulta | Latencia incremental | GPU | Veredicto |
|---|---|---|---|---|---|
| **Híbrida VAD + features acústicos + LLM (elegida)** | ~87 % streaming / ~92 % batch | ~$0.10 (LLM mini) | < 2 s | No | Elegida |
| Pyannote.audio CPU | ~92 % | $0 (self-hosted) | > 60 s/min de audio | No (lento) | Rechazada: incompatible con tiempo real |
| Pyannote.audio GPU (T4) | ~92 % | ~$0.20 (cloud GPU) | ~5 s | Sí | Rechazada: añade dependencia de GPU al deployment |
| AssemblyAI Diarization | ~90 % | ~$1.50 | ~10 s | N/A | Rechazada: 15× el costo objetivo |
| Resemblyzer + clustering | ~80 % | ~$0 | ~3 s | No | Rechazada: precisión insuficiente |
| Solo heurística (sin LLM) | ~75 % | ~$0 | < 1 s | No | Rechazada: precisión por debajo del umbral de 85 % |

## Consecuencias positivas

- **Sin GPU** → deployment cabe en EC2 t3.medium (ADR-007).
- **Costo bajo y predecible**: la validación LLM usa el tier más barato y solo corre cuando hay incertidumbre.
- **Actualizaciones incrementales reales**: el frontend recibe `speaker_changed` y reasignaciones retroactivas vía WebSocket sin esperar al final.
- **Refinamiento batch opcional**: las sesiones donde la precisión streaming no fue suficiente pueden re-procesarse al cerrar sin afectar la UX.
- **Precisión clínicamente útil** (87 %) — el médico puede corregir manualmente los pocos errores en el editor de SOAP.

## Consecuencias negativas / Trade-offs

- **5 % menos precisión** que Pyannote con GPU. Aceptable porque hay corrección manual downstream.
- **Edge cases**: consultas con > 2 hablantes (acompañante hablando frecuentemente), consultas que no inician con el doctor, voces muy similares en pitch.
- **Costo extra de tokens LLM**: ~150 tokens por validación, multiplicado por chunks → ~$0.10/consulta. Asumido en presupuesto.
- **Dependencia de calidad de audio**: ruido de fondo degrada las features acústicas más que un modelo neural dedicado.
- **Diarización retroactiva** complica el contrato del WebSocket: el frontend debe poder mutar etiquetas de chunks ya renderizados (resuelto con `chunk_index` estable).

## Criterios de revisión

| Trigger | Acción |
|---|---|
| Precisión < 80 % en evaluación manual de 100 consultas | Reevaluar Pyannote con GPU o AssemblyAI |
| Deployment migra a infra con GPU | Reevaluar Pyannote local |
| Aparece un modelo open-source CPU-friendly con > 90 % | Sustituir capa de features |
| > 30 % de consultas con 3+ hablantes | Generalizar el modelo a N speakers (rediseño) |

## Referencias

- Implementación: [ai-service/src/transcription/diarization/](../../ai-service/src/transcription/diarization/)
  - `audio_feature_diarizer.py` — capa acústica
  - `llm_validator.py` — capa de validación LLM
  - `incremental_diarizer.py`, `incremental_builder.py` — orquestación streaming
  - `base.py`, `models.py` — contratos
- Pipeline completo: [docs/architecture/streaming-transcription-architecture.md](../architecture/streaming-transcription-architecture.md)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [Pyannote.audio](https://github.com/pyannote/pyannote-audio) (alternativa rechazada)
- ADR-001: Selección del modelo LLM (tier `FAST_CHEAP` usado por el validador)
- ADR-006: Arquitectura de streaming en tiempo real
