# Arquitectura de Transcripción en Streaming (Cost-Optimized)

## 1. Problema: Real-Time vs Costo

### 1.1 Escenario: Consulta Médica de 60 Minutos

| Fase Consulta | Duración | Contenido | VAD Strategy |
|---------------|----------|-----------|--------------|
| Saludo inicial | 2 min | Conversación continua | Stream inmediato |
| Anamnesis (paciente describe) | 15 min | Voz activa con pausas | Stream + buffer en pausas |
| Exploración física | 10 min | Silencio largo con instrucciones | NO enviar silencios |
| Diagnóstico (doctor explica) | 5 min | Voz activa continua | Stream inmediato |
| Prescripción | 5 min | Voz activa continua | Stream inmediato |
| Cierre | 3 min | Conversación | Stream inmediato |
| **Total** | **40 min** | ~30 min voz activa | |

### 1.2 Distribución Temporal Típica

```
Total: 60 minutos
├─ Voz activa continua: 28 min (47%)
├─ Pausas naturales (<2s): 7 min (12%)  → Bufferizadas con voz
├─ Silencios fin turno (2-10s): 10 min (17%)  → Enviadas como batch
└─ Silencios largos (>10s): 15 min (25%)  → NO enviadas (ahorro)
```

**Audio procesado:** 45 minutos (25% ahorro vs 60 min)

---

## 2. Pipeline de Streaming con VAD Inteligente

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     STREAMING PIPELINE CON VAD                             │
└────────────────────────────────────────────────────────────────────────────┘

WebSocket (Audio Chunks)
  │
  │ Opus codec: ~10KB cada 200ms
  │
  ▼
┌─────────────────────────────────┐
│   Decodificador Opus → PCM     │
│   16kHz, mono, 16-bit           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BUFFER CIRCULAR (10 segundos)                       │
│                                                                          │
│  [chunk_t-10s] [chunk_t-9s] ... [chunk_t-1s] [chunk_t]                  │
│                                                                          │
│  Mantiene contexto para:                                                │
│  • Overlap entre envíos a Whisper                                       │
│  • Recuperación si se pierde paquete WebSocket                          │
│  • Análisis de VAD con contexto                                         │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  SILERO VAD (Análisis en Tiempo Real)                    │
│                                                                          │
│  Procesa cada chunk (200ms):                                            │
│  • Probabilidad de voz: 0.0 - 1.0                                       │
│  • Threshold: 0.5                                                       │
│  • Suavizado temporal: ventana de 3 chunks                              │
│  • Latencia: < 100ms                                                    │
│                                                                          │
│  Output: voice_active | silence                                         │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  ÁRBOL DE DECISIÓN (Cost Optimization)                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ IF voice_active:                                            │         │
│  │   buffer_voz.append(chunk)                                  │         │
│  │                                                             │         │
│  │   IF buffer_voz.duration >= 5.0 seconds:                    │         │
│  │     → SEND_TO_WHISPER(buffer_voz)                           │         │
│  │     → PRIORITY: LATENCY                                     │         │
│  │     → Target: < 2s total latency                            │         │
│  │     → Clear buffer, keep 1s context                         │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ IF silence AND duration < 2.0 seconds:                      │         │
│  │   → CONTINUE_BUFFERING                                      │         │
│  │   → Reason: Pausa natural (pensar, respirar)               │         │
│  │   → No enviar aún                                           │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ IF silence AND 2.0s ≤ duration < 10.0s:                     │         │
│  │   → SEND_BATCH(buffer_voz)                                  │         │
│  │   → PRIORITY: COST                                          │         │
│  │   → Reason: Fin de turno de habla                           │         │
│  │   → Agrupa pausas cortas anteriores                         │         │
│  │   → Clear buffer                                            │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ IF silence AND duration >= 10.0 seconds:                    │         │
│  │   → SKIP_AUDIO (no enviar nada)                             │         │
│  │   → PRIORITY: COST (max savings)                            │         │
│  │   → Reason: Exploración física, escritura, silencio largo  │         │
│  │   → Ahorro: ~25% de audio no procesado                      │         │
│  │   → UI muestra: "Pausado - Sin conversación"               │         │
│  │   → Enviar evento WebSocket: processing_status(vad=silence)│         │
│  └────────────────────────────────────────────────────────────┘         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     WHISPER API (Transcription)                          │
│                                                                          │
│  Request:                                                                │
│  • model: "whisper-1"                                                   │
│  • language: "es"                                                       │
│  • response_format: "verbose_json"                                      │
│  • timestamp_granularities: ["word"]                                    │
│  • prompt: <context from previous chunk> (últimos 200 chars)           │
│                                                                          │
│  Audio: 5-10 segundos de PCM 16kHz                                      │
│                                                                          │
│  Latencia típica: 1.0-1.5 segundos                                      │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  POST-PROCESAMIENTO                                      │
│                                                                          │
│  • Ajustar timestamps a timeline global de sesión                       │
│  • Merge con transcripción anterior (overlap de 1s)                     │
│  • Normalizar terminología médica española                              │
│  • Enviar evento WebSocket: transcription_update                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Configuración Silero VAD para Streaming

### 3.1 Parámetros Óptimos

```python
from silero_vad import load_silero_vad

class StreamingVAD:
    def __init__(self):
        self.model = load_silero_vad()

        # Configuración óptima para consultas médicas
        self.config = {
            "sample_rate": 16000,
            "threshold": 0.5,           # Probabilidad mínima de voz
            "min_speech_duration_ms": 250,  # Mínimo 250ms para considerar voz
            "min_silence_duration_ms": 500, # Mínimo 500ms para considerar silencio
            "speech_pad_ms": 300,       # Padding antes/después de voz
            "window_size_samples": 512, # ~32ms a 16kHz
        }

        # Estado
        self.current_state = "silence"  # voice_active | silence
        self.state_duration_s = 0.0
        self.buffer = []
        self.last_voice_timestamp = 0.0

    def process_chunk(self, audio_chunk: np.ndarray, timestamp: float) -> dict:
        """
        Procesa chunk de audio (200ms) y retorna decisión.

        Returns:
            {
                "action": "send_immediate" | "buffer" | "send_batch" | "skip",
                "audio_to_send": np.ndarray | None,
                "vad_state": "voice_active" | "silence" | "silence_long",
                "state_duration_s": float,
                "reason": str
            }
        """
        # Detectar voz con Silero VAD
        speech_prob = self.model(audio_chunk, self.config["sample_rate"]).item()
        is_speech = speech_prob > self.config["threshold"]

        # Lógica de decisión basada en estado
        if is_speech:
            return self._handle_voice(audio_chunk, timestamp)
        else:
            return self._handle_silence(audio_chunk, timestamp)
```

### 3.2 Algoritmo de Decisión Completo

```python
def _handle_voice(self, audio_chunk: np.ndarray, timestamp: float) -> dict:
    """Maneja detección de voz activa."""
    if self.current_state == "silence":
        self.current_state = "voice_active"
        self.state_duration_s = 0.0
        logging.info(f"VAD: Silence → Voice at {timestamp:.1f}s")

    self.state_duration_s += 0.2  # 200ms chunk
    self.buffer.append(audio_chunk)
    self.last_voice_timestamp = timestamp

    # ¿Suficiente audio para enviar?
    if self.state_duration_s >= 5.0:
        audio_to_send = np.concatenate(self.buffer)
        # Mantener 1s de contexto para overlap
        self.buffer = self.buffer[-5:]  # ~1 segundo
        self.state_duration_s = 1.0

        return {
            "action": "send_immediate",
            "audio_to_send": audio_to_send,
            "vad_state": "voice_active",
            "state_duration_s": self.state_duration_s,
            "reason": "Voice buffer reached 5s, sending immediately"
        }

    return {
        "action": "buffer",
        "audio_to_send": None,
        "vad_state": "voice_active",
        "state_duration_s": self.state_duration_s,
        "reason": "Accumulating voice audio"
    }

def _handle_silence(self, audio_chunk: np.ndarray, timestamp: float) -> dict:
    """Maneja detección de silencio con árbol de decisión."""
    if self.current_state == "voice_active":
        self.current_state = "silence"
        self.state_duration_s = 0.0
        logging.info(f"VAD: Voice → Silence at {timestamp:.1f}s")

    self.state_duration_s += 0.2

    # DECISIÓN: Basada en duración del silencio
    if self.state_duration_s < 2.0:
        # Pausa natural → Continuar buffering
        self.buffer.append(audio_chunk)
        return {
            "action": "buffer",
            "audio_to_send": None,
            "vad_state": "silence",
            "state_duration_s": self.state_duration_s,
            "reason": "Short silence (<2s), natural pause"
        }

    elif 2.0 <= self.state_duration_s < 10.0:
        # Fin de turno → Enviar batch si hay buffer
        if len(self.buffer) > 0:
            audio_to_send = np.concatenate(self.buffer)
            self.buffer = []

            return {
                "action": "send_batch",
                "audio_to_send": audio_to_send,
                "vad_state": "silence",
                "state_duration_s": self.state_duration_s,
                "reason": "End of speaking turn (2-10s silence)"
            }
        return {
            "action": "buffer",
            "audio_to_send": None,
            "vad_state": "silence",
            "state_duration_s": self.state_duration_s,
            "reason": "Waiting for more audio"
        }

    else:  # >= 10.0s
        # Silencio largo → Skip (exploración física, etc.)
        self.buffer = []  # Descartar buffer

        return {
            "action": "skip",
            "audio_to_send": None,
            "vad_state": "silence_long",
            "state_duration_s": self.state_duration_s,
            "reason": "Long silence (≥10s), likely physical exam - SKIPPING"
        }
```

---

## 4. Integración con Whisper API

### 4.1 Configuración para Español Médico

```python
WHISPER_CONFIG_ES_MEDICAL = {
    "model": "whisper-1",
    "language": "es",
    "response_format": "verbose_json",
    "timestamp_granularities": ["word"],

    # Prompt de contexto mejora precisión
    "prompt_template": (
        "Transcripción de consulta médica en español. "
        "Vocabulario: síntomas, diagnóstico, prescripción, "
        "medicamento, dosis, miligramos. "
        "Contexto previo: {previous_text}"
    )
}
```

### 4.2 Streaming Transcriber

```python
class StreamingTranscriber:
    def __init__(self):
        self.vad = StreamingVAD()
        self.whisper_client = openai.OpenAI()
        self.context_window = []  # Últimos 30s de transcripción
        self.session_start_time = time.time()

    async def process_audio_chunk(self, audio_chunk: bytes, timestamp: float):
        """Procesa chunk de audio recibido via WebSocket."""
        # 1. Decodificar Opus → PCM
        pcm_audio = decode_opus(audio_chunk)

        # 2. VAD decision
        vad_result = self.vad.process_chunk(pcm_audio, timestamp)

        # 3. Enviar evento de estado al frontend
        await self.send_websocket_event({
            "type": "processing_status",
            "data": {
                "vad_state": vad_result["vad_state"],
                "action": vad_result["action"],
                "buffer_duration_s": vad_result["state_duration_s"]
            }
        })

        # 4. Si hay audio para enviar → Transcribir
        if vad_result["action"] in ["send_immediate", "send_batch"]:
            audio_to_send = vad_result["audio_to_send"]

            start_time = time.time()
            transcription = await self.transcribe_audio(
                audio_to_send,
                context=self.get_context_prompt()
            )
            latency = time.time() - start_time

            logging.info(f"Whisper latency: {latency:.2f}s for "
                        f"{len(audio_to_send)/16000:.1f}s audio")

            # Procesar y enviar resultado
            await self.process_transcription(transcription, timestamp)

    def get_context_prompt(self) -> str:
        """Genera prompt con contexto de últimos 200 chars."""
        if not self.context_window:
            return "Transcripción de consulta médica en español."

        recent_text = " ".join(self.context_window[-3:])
        return recent_text[-200:] if len(recent_text) > 200 else recent_text
```

### 4.3 Normalización de Español Médico

```python
def normalize_medical_spanish(text: str) -> str:
    """Corrige errores comunes de Whisper en español médico."""
    corrections = {
        r"ibu\s*profeno": "ibuprofeno",
        r"para\s*cetamol": "paracetamol",
        r"mili\s*gramos": "miligramos",
        r"c\s*i\s*e\s*diez": "CIE-10",
        r"c\s*i\s*e\s*10": "CIE-10",
        r"amoxicilina": "amoxicilina",
        r"omeprazol": "omeprazol",
        r"metformina": "metformina",
        # Más correcciones según necesidad
    }

    import re
    for pattern, replacement in corrections.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text
```

---

## 5. Análisis de Costos Detallado

### 5.1 Cálculo para Consulta de 60 Minutos

```
WHISPER API COST:

Streaming puro (sin optimización):
  60 min × $0.006/min = $0.36

Streaming inteligente (con VAD):
  Audio enviado: 45 min (25% skip)
  45 min × $0.006/min = $0.27

Ahorro: $0.09 por consulta (25%)
```

### 5.2 Impacto en Latencia

| Fase | Estrategia | Latencia | % del Tiempo |
|------|------------|----------|--------------|
| Voz activa continua | Send every 5s | ~2.0s | 47% |
| Pausa natural (<2s) | Buffer | +0.5s | 12% |
| Fin de turno (2-10s) | Send batch | +2-3s | 17% |
| Silencio largo (>10s) | Skip | 0s | 25% |

**Latencia promedio ponderada:**
- 47% × 2.0s + 12% × 2.5s + 17% × 4.0s + 25% × 0s = **1.92s** ✅ < 2s target

### 5.3 Proyección Mensual

| Escala | Consultas/mes | Streaming Puro | Streaming Inteligente | Ahorro |
|--------|---------------|----------------|----------------------|--------|
| Pequeña | 500 | $180 | $135 | $45 |
| Mediana | 2,000 | $720 | $540 | $180 |
| Grande | 10,000 | $3,600 | $2,700 | $900 |

---

## 6. Métricas de Calidad

### 6.1 KPIs a Monitorear

| Métrica | Target | Alerta |
|---------|--------|--------|
| Latencia end-to-end (p95) | < 2s | > 3s |
| Latencia end-to-end (p99) | < 3s | > 5s |
| % audio skipped por VAD | 20-30% | < 15% or > 40% |
| WER (Word Error Rate) español | < 10% | > 15% |
| Costo por consulta 60 min | < $0.30 | > $0.40 |
| WebSocket reconnections | < 1 per session | > 3 |

### 6.2 Validación de VAD Performance

```python
def validate_vad_performance(session_data: dict) -> dict:
    """Valida que VAD está funcionando correctamente."""
    total_duration = session_data['total_duration_s']
    audio_sent = session_data['audio_sent_s']
    audio_skipped = session_data['audio_skipped_s']

    skip_percentage = (audio_skipped / total_duration) * 100

    warnings = []

    if skip_percentage < 15:
        warnings.append("VAD skipping too little (<15%)")
    elif skip_percentage > 40:
        warnings.append("VAD skipping too much (>40%)")

    if session_data['avg_latency_s'] > 3.0:
        warnings.append(f"High latency: {session_data['avg_latency_s']:.2f}s")

    return {
        "total_duration_s": total_duration,
        "audio_sent_s": audio_sent,
        "audio_skipped_s": audio_skipped,
        "skip_percentage": skip_percentage,
        "avg_latency_s": session_data['avg_latency_s'],
        "cost_usd": (audio_sent / 60) * 0.006,
        "warnings": warnings,
        "status": "healthy" if not warnings else "warning"
    }
```
