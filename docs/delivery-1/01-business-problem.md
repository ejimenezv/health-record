# Problema Empresarial y Propuesta de Valor

## 1. Contexto del Problema

### 1.1 Situación Actual en el Sector Salud

Los profesionales médicos en Latinoamérica enfrentan una carga administrativa significativa:

| Problema | Impacto Cuantificado |
|----------|---------------------|
| Tiempo en documentación | 25-35% del tiempo de consulta |
| Errores de transcripción manual | 15-20% de registros con errores |
| Fatiga del profesional | Burnout en 60%+ de médicos |
| Costo de transcripción externa | $15-25 USD por hora de audio |
| Tiempo promedio por nota SOAP | 8-12 minutos manual |

### 1.2 Flujo Actual (AS-IS)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Consulta   │────▶│   Médico     │────▶│  Registro   │
│  60 min     │     │  toma notas  │     │  manual     │
└─────────────┘     │  durante     │     │  posterior  │
                    │  consulta    │     │  15-20 min  │
                    └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Atención    │
                    │  dividida    │
                    │  al paciente │
                    └──────────────┘
```

**Problemas identificados:**
1. El médico divide atención entre paciente y documentación
2. Notas incompletas por falta de tiempo
3. Transcripción posterior consume tiempo adicional
4. Información se pierde entre consulta y registro
5. Inconsistencia en formato de notas SOAP

### 1.3 Flujo Propuesto (TO-BE) - Tiempo Real

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  Consulta   │────▶│  Streaming   │────▶│     AI Service          │
│  60 min     │     │  WebSocket   │     │  (procesa en tiempo     │
└─────────────┘     │  bidireccional│     │   real, < 2s latencia)  │
                    └──────────────┘     └───────────┬─────────────┘
                           ▲                         │
                           │    Eventos en tiempo real:
                           │    • transcription_update
                           │    • symptom_extracted
                           │    • diagnosis_detected
                           │    • prescription_added
                           │    • interaction_warning ⚠️
                           │                         │
                    ┌──────┴───────┐                 │
                    │  Médico ve   │◀────────────────┘
                    │  nota SOAP   │
                    │  construirse │     ┌─────────────┐
                    │  en vivo     │────▶│  Registro   │
                    │  (revisión   │     │  completo   │
                    │   mínima)    │     │  al terminar│
                    └──────────────┘     └─────────────┘
```

**Beneficios esperados:**
1. Médico enfocado 100% en el paciente durante toda la consulta
2. Transcripción automática en español EN TIEMPO REAL (< 2s latencia)
3. Extracción incremental de datos médicos mientras se habla
4. Nota SOAP se construye en vivo - visible durante la consulta
5. **Alertas inmediatas** de interacciones medicamentosas (< 1s)
6. Tiempo de revisión al final: ~1 minuto (solo confirmar)
7. Costo optimizado: $0.25-0.30 por consulta (20-30% menos que streaming puro)

## 2. Propuesta de Valor

### 2.1 Solución: MedRecord AI

**MedRecord AI** es un sistema de transcripción médica **en tiempo real** potenciado por IA que:
- Transcribe consultas médicas en español usando OpenAI Whisper **en streaming** (< 2s latencia)
- Identifica automáticamente doctor y paciente (diarización incremental)
- Extrae datos estructurados **mientras se habla** (síntomas, diagnósticos, prescripciones)
- Genera notas SOAP que **se construyen en vivo** durante la consulta
- Valida información médica contra base de conocimiento (RAG) **de forma asíncrona**
- **Alerta inmediatamente** sobre interacciones medicamentosas peligrosas (< 1s)
- Optimiza costos mediante **buffering inteligente durante silencios** (20-30% ahorro vs streaming puro)

### 2.2 Diferenciadores Clave

| Aspecto | Soluciones Existentes | MedRecord AI |
|---------|----------------------|--------------|
| Idioma | Optimizadas para inglés | Optimizado para español médico |
| **Modo de operación** | Batch (post-consulta) | **Tiempo real (durante consulta)** |
| **Latencia** | 5-10 min post-consulta | **< 2 segundos** |
| Costo por hora | $0.80 - $1.20 USD | ~$0.28 USD (65% menos) |
| Integración | Sistemas cerrados | API abierta + WebSocket bidireccional |
| Validación | Sin validación médica | RAG con conocimiento médico + alertas inmediatas |
| **Alertas de seguridad** | No disponible | **Interacciones detectadas < 1s** |
| Despliegue | Solo cloud propietario | Multi-cloud / On-premise |

### 2.3 Análisis de Costos: Tiempo Real vs Batch

| Enfoque | Costo 60 min | Estrategia | Trade-off |
|---------|--------------|------------|-----------|
| **Batch (tradicional)** | $0.21 | VAD elimina 35-40% audio antes de procesar | SIN tiempo real |
| **Streaming puro** | $0.36 | Envía todo el audio inmediatamente | Costo alto |
| **Streaming inteligente** ✅ | $0.25-0.28 | Buffer durante silencios, stream durante voz | **BALANCEADO** |

**Ahorro vs streaming puro**: 20-30%
**Incremento vs batch**: 19-33% (justificado por capacidad real-time)
**Capacidad tiempo real**: ✅ SÍ

### 2.4 ROI Estimado

Para una clínica con 5 médicos, 20 consultas/día cada uno:

| Métrica | Antes | Después | Ahorro |
|---------|-------|---------|--------|
| Tiempo documentación/día | 5h (total) | 0.8h | 4.2h |
| Costo transcripción/mes | $2,000 USD | $480 USD | $1,520 USD |
| Consultas adicionales posibles | - | +21/día | +$2,100/día* |

*Asumiendo $100 USD promedio por consulta

## 3. Por qué AI/LLM es la Estrategia Óptima

### 3.1 Justificación Técnica

1. **Procesamiento de Lenguaje Natural**: Las consultas médicas son conversaciones no estructuradas que requieren comprensión de contexto, jerga médica, y matices del español latinoamericano.

2. **Extracción de Información**: Los LLMs (GPT-4) pueden extraer información estructurada de texto libre con alta precisión, algo que sistemas rule-based no logran.

3. **Adaptabilidad**: Los modelos de lenguaje pueden manejar variaciones en:
   - Acentos regionales
   - Terminología local vs. técnica
   - Estilos de comunicación médico-paciente

4. **Madurez de la Tecnología**:
   - Whisper tiene 99%+ precisión en español
   - GPT-4 comprende contexto médico
   - Costos han bajado 80% en 2 años

### 3.2 Alternativas Descartadas

| Alternativa | Razón de Descarte |
|-------------|-------------------|
| Transcripción manual | Costo prohibitivo, no escalable |
| Speech-to-text tradicional | Baja precisión en español médico |
| Sistemas rule-based | No manejan variabilidad del lenguaje |
| Fine-tuning de modelos | Requiere datos etiquetados costosos |

## 4. Usuarios Objetivo

### 4.1 Usuario Primario: Médico General/Especialista

**Perfil:**
- Edad: 30-55 años
- Consultas: 15-25 pacientes/día
- Duración consulta: 15-60 minutos
- Familiaridad tecnológica: Media
- Idioma: Español (variantes latinoamericanas)

**Necesidades:**
- Reducir tiempo de documentación
- Mantener calidad de registros
- No interrumpir flujo de consulta
- Interfaz simple, no intrusiva

### 4.2 Usuario Secundario: Personal Administrativo

**Perfil:**
- Gestiona agenda y registros
- Necesita acceso a notas para facturación
- Requiere datos estructurados

### 4.3 Volumen Esperado

| Escenario | Consultas/día | Audio/día | Costo estimado/día |
|-----------|---------------|-----------|-------------------|
| Clínica pequeña | 50 | 25 horas | $12 USD |
| Clínica mediana | 200 | 100 horas | $48 USD |
| Hospital | 1,000+ | 500+ horas | $240+ USD |

## 5. Métricas de Éxito

| KPI | Línea Base | Meta | Método de Medición |
|-----|-----------|------|-------------------|
| Precisión transcripción | N/A | >95% WER | Evaluación manual muestra |
| Precisión extracción | N/A | >90% F1 | RAGAS evaluation |
| Tiempo ahorro/consulta | 0 | >10 min | Comparación pre/post |
| Satisfacción médico | N/A | >4.0/5.0 | Encuesta NPS |
| Costo por consulta | $0.80 | <$0.50 | Tracking de API calls |
| Latencia procesamiento | N/A | <30s para 60min audio | Métricas de sistema |
