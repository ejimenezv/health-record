# ADR-001: Selección del modelo LLM con estrategia multi-tier

**Fecha:** 01/05/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

## Contexto

MedRecord AI necesita un modelo LLM capaz de:

- Comprender español médico (terminología clínica, abreviaturas, latinismos farmacológicos)
- Generar **salida estructurada** confiable para extracción de síntomas, diagnósticos y prescripciones
- Razonar sobre interacciones medicamentosas y clasificación CIE-10
- Generar notas SOAP coherentes a partir de transcripciones diarizadas

**Requerimientos cuantificables:**

| Requerimiento | Valor objetivo |
|---|---|
| Latencia p95 (extracción incremental) | < 3 s |
| Latencia p95 (validación crítica de fármaco) | < 1 s |
| Costo por consulta de 60 min | ≤ $0.50 |
| Tokens de entrada típicos por chunk | 500–2,000 |
| Tokens de salida estructurada | 200–800 |
| Tasa de fallo de JSON parsing | < 1 % |

**Restricciones:**

- No hay fine-tuning en el alcance del MVP
- Solo APIs comerciales (no se hospedan modelos propios)
- Stack del servicio AI es Python — el SDK debe ser de primera clase

## Decisión

Adoptar una **estrategia multi-tier** con tres modelos de OpenAI seleccionados dinámicamente según la naturaleza de la tarea, implementada en [ai-service/src/services/model_selector.py](../../ai-service/src/services/model_selector.py).

| Tier | Modelo | Casos de uso |
|---|---|---|
| `FAST_CHEAP` | `gpt-4o-mini` | Validaciones rápidas, lookups, deduplicación de entidades, clasificación binaria |
| `BALANCED` | `gpt-4o` | Extracción incremental de entidades médicas, generación SOAP, clasificación CIE-10 |
| `PREMIUM` | `gpt-4-turbo` | Casos complejos: diagnóstico diferencial, múltiples comorbilidades, validación crítica de interacciones medicamentosas |

El `ModelSelector` decide el tier en función de: tamaño del prompt, criticidad clínica del campo, presupuesto consumido en la sesión, y reglas de negocio (p. ej. cualquier prescripción → al menos `BALANCED`; interacción detectada → `PREMIUM`).

**Justificación:**

- **GPT-4o** es el mejor balance precio/capacidad para extracción médica en español; soporta `response_format={"type": "json_object"}` y function calling de forma estable.
- **GPT-4o-mini** corta el costo en ~80 % para tareas que no requieren razonamiento profundo, sin pérdida medible de precisión en validaciones simples.
- **GPT-4-turbo** se reserva para los casos donde un error tiene impacto clínico (interacciones, comorbilidades) — su mayor costo se amortiza porque representa < 5 % del volumen.
- Single-vendor (OpenAI) simplifica el manejo de credenciales, retry logic, rate limiting y métricas de costo en `cost_tracker`.

## Opciones evaluadas

| Opción | Costo input/output (USD/1M tok) | Latencia p95 aprox. | Español médico | JSON estructurado | Contexto | Veredicto |
|---|---|---|---|---|---|---|
| **GPT-4o (BALANCED, elegido)** | 2.50 / 10.00 | ~1.2 s | Excelente | Nativo (`response_format`) | 128k | Elegido |
| **GPT-4o-mini (FAST_CHEAP, elegido)** | 0.15 / 0.60 | ~0.6 s | Bueno | Nativo | 128k | Elegido para tier económico |
| **GPT-4-turbo (PREMIUM, elegido)** | 10.00 / 30.00 | ~1.8 s | Excelente | Nativo | 128k | Elegido para tier crítico |
| Claude 3.5 Sonnet | 3.00 / 15.00 | ~1.4 s | Excelente | Requiere prompt engineering adicional | 200k | Rechazado: ~25 % más caro sin ventaja medida en español médico |
| Gemini 1.5 Pro | 1.25 / 5.00 | ~2.1 s | Bueno | Schema validation menos estable | 2M | Rechazado: latencia y consistencia de JSON inferiores |
| Llama 3.1 70B (vía Groq) | 0 (rate-limited) | ~0.9 s | Aceptable | JSON inconsistente | 128k | Rechazado: rate limits incompatibles con picos, JSON requiere validación manual |

**Estimación de costo mensual** (500 consultas/mes, distribución observada en tests: 75 % BALANCED, 20 % FAST_CHEAP, 5 % PREMIUM):

```
BALANCED:    375 × (2,000 in + 800 out) tok × ($2.50 / $10.00 / 1M) ≈ $4.88
FAST_CHEAP:  100 × 2,800 tok × ($0.15 / $0.60 / 1M)                ≈ $0.06
PREMIUM:      25 × 2,800 tok × ($10.00 / $30.00 / 1M)              ≈ $1.10
TOTAL                                                              ≈ $6.04 / mes
```

Esto deja amplio margen sobre el presupuesto de $200/mes y permite absorber crecimiento o cambios de mix.

## Consecuencias positivas

- **Costo optimizado**: ~70 % menor vs. usar `gpt-4-turbo` siempre.
- **Calidad clínica preservada** en los puntos donde importa (PREMIUM para fármacos).
- **JSON estructurado nativo** elimina parsers tolerantes y reduce defectos.
- **Métrica de costo por sesión** trivial de instrumentar (`cost_tracker.py`) porque todos los modelos comparten el mismo proveedor.
- **Degradación graceful**: si el presupuesto de sesión supera un umbral, `ModelSelector` puede forzar tier inferior antes de fallar.

## Consecuencias negativas / Trade-offs

- **Vendor lock-in con OpenAI.** Migrar a Anthropic/Google requeriría re-validar prompts y schemas en cada tier.
- **Sin fine-tuning** → no se puede sesgar el modelo hacia el vocabulario clínico mexicano específico (por ejemplo, marcas de medicamentos locales).
- **Privacidad**: las consultas viajan a servidores de OpenAI. Mitigado con el header `OpenAI-Organization` en plan empresarial y opt-out de entrenamiento, pero no elimina el envío.
- **Variabilidad de pricing**: histórico ha sido a la baja, pero no garantizado.
- **Three models to monitor**: cada tier requiere su propio rate-limit handling y su propia línea de costo.

## Criterios de revisión

Esta decisión se revisará si:

| Trigger | Acción |
|---|---|
| Costo mensual > $150 sostenido por 3 meses | Considerar fine-tuning de un modelo más pequeño |
| Latencia p95 de extracción > 3 s en > 20 % de chunks por una semana | Cambiar `BALANCED` a un modelo más rápido o agregar caché agresiva |
| Precisión RAGAS de extracción < 85 % | Re-evaluar Claude 3.5 / 4 contra GPT-4o |
| Aparece un competidor con español médico claramente superior a < 50 % del costo | Re-evaluar tier por tier |
| Restricción regulatoria prohíbe envío de PHI a APIs externas | Migración a modelo autoalojado (cambio de alcance) |

## Referencias

- Implementación: [ai-service/src/services/model_selector.py](../../ai-service/src/services/model_selector.py)
- Tracking de costo: [ai-service/src/services/cost_tracker.py](../../ai-service/src/services/cost_tracker.py)
- Cliente GPT en backend Node.js: [packages/backend/src/services/ai/gpt.service.ts](../../packages/backend/src/services/ai/gpt.service.ts)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- ADR-002: Selección del Vector Store (embeddings de OpenAI compatibles con esta decisión)
- ADR-006: Arquitectura de streaming en tiempo real (donde el tiering tiene mayor impacto)
