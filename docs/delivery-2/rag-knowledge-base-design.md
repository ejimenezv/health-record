# Diseño de Knowledge Base Médica en Español

> **Estado de implementación:** Este documento define el diseño objetivo
> de la KB médica. La implementación actual incluye un **corpus semilla
> curado manualmente** (30 medicamentos, 25 interacciones críticas, 40
> códigos CIE-10) que demuestra el flujo end-to-end de validación con
> alertas reales. El esquema de documentos en ChromaDB (sección 2) es
> el implementado. Para el procedimiento operativo de carga y para
> extender el corpus a una fuente real (CIMA, Vademecum.es), ver:
>
> - [`../guides/rag-vademecum-setup.md`](../guides/rag-vademecum-setup.md) — guía paso a paso de ingestión, comandos `make ingest-vademecum*`, troubleshooting
> - [`ai-service/data/vademecum/`](../../ai-service/data/vademecum/) — datasets JSON
> - [`ai-service/scripts/ingest_vademecum.py`](../../ai-service/scripts/ingest_vademecum.py) — script idempotente de ingestión
>
> El reemplazo del corpus semilla por una fuente real es una sustitución
> de archivos JSON; el esquema y el flujo de retrieval permanecen iguales.

## 1. Fuentes de Datos

### 1.1 Medicamentos (Prioridad Alta)

| Fuente | Descripción | Formato | Frecuencia Actualización |
|--------|-------------|---------|-------------------------|
| Vademecum.es | Medicamentos España | JSON/PDF | Mensual |
| CIMA (AEMPS) | Agencia Española del Medicamento | API/XML | Semanal |
| Equivalencias genéricos | Principio activo ↔ marca | CSV | Mensual |
| Formulario Nacional | Medicamentos oficiales | PDF | Anual |

### 1.2 Interacciones Medicamentosas

| Fuente | Cobertura | Severidad |
|--------|-----------|-----------|
| DrugBank (traducido) | ~12,000 interacciones | Crítica/Mayor/Moderada/Menor |
| CIMA interacciones | España específico | Sí |
| Bot PLUS 2.0 | Farmacéuticos España | Sí |

### 1.3 Códigos Diagnósticos (CIE-10-ES)

| Fuente | Versión | Cobertura |
|--------|---------|-----------|
| CIE-10-ES (MSCBS) | 2024 | ~70,000 códigos |
| SNOMED CT español | 2024 | Terminología clínica |

### 1.4 Procedimientos Médicos

| Fuente | Descripción |
|--------|-------------|
| CIE-10-PCS español | Procedimientos |
| Nomenclátor SEFH | Farmacia hospitalaria |

## 2. Esquema de Documentos

### 2.1 Documento de Medicamento

```json
{
  "doc_type": "medication",
  "medication_id": "M001",
  "nombre_comercial": "Nolotil",
  "principio_activo": "Metamizol sódico",
  "presentaciones": [
    {"forma": "cápsulas", "dosis": "575mg", "unidades": 20}
  ],
  "indicaciones": ["Dolor agudo moderado", "Fiebre alta"],
  "contraindicaciones": ["Porfiria", "Deficiencia G6PD"],
  "posologia_adultos": "1-2 cápsulas/8h, máx 6 cápsulas/día",
  "embarazo": "Contraindicado tercer trimestre",
  "metadata": {
    "source": "CIMA",
    "updated_at": "2024-01-15",
    "language": "es"
  }
}
```

### 2.2 Documento de Interacción

```json
{
  "doc_type": "drug_interaction",
  "interaction_id": "DI001",
  "medicamento_a": "Metamizol",
  "medicamento_b": "Warfarina",
  "severidad": "MAYOR",
  "descripcion": "Metamizol puede potenciar el efecto anticoagulante",
  "recomendacion": "Monitorizar INR. Considerar alternativa analgésica",
  "evidencia": "Estudios clínicos",
  "metadata": {
    "source": "DrugBank",
    "confidence": 0.95
  }
}
```

### 2.3 Documento de Código CIE-10

```json
{
  "doc_type": "cie10_code",
  "code": "J18.9",
  "descripcion": "Neumonía, no especificada",
  "descripcion_larga": "Neumonía no especificada, organismo no especificado",
  "categoria": "Enfermedades del sistema respiratorio",
  "sinonimos": ["pulmonía", "infección pulmonar"],
  "exclusiones": ["Neumonía por COVID-19 (U07.1)"],
  "metadata": {
    "version": "CIE-10-ES 2024",
    "capitulo": "X"
  }
}
```

## 3. Estrategia de Chunking

### 3.1 Configuración por Tipo de Documento

| Tipo Documento | Chunk Size | Overlap | Estrategia |
|----------------|------------|---------|------------|
| Medicamentos | 500 chars | 50 chars | Por sección (indicaciones, posología, etc.) |
| Interacciones | 300 chars | 30 chars | Documento completo (corto) |
| CIE-10 | 400 chars | 40 chars | Por código individual |
| Guías clínicas | 1000 chars | 200 chars | Recursive character |

### 3.2 Metadata Preservada en Chunks

- doc_type (obligatorio)
- source (obligatorio)
- language (siempre "es")
- confidence_score
- last_updated

## 4. Volumen Estimado

| Tipo | Documentos | Chunks Estimados | Embeddings |
|------|------------|------------------|------------|
| Medicamentos | ~20,000 | ~100,000 | 100,000 |
| Interacciones | ~50,000 | ~50,000 | 50,000 |
| CIE-10 | ~70,000 | ~70,000 | 70,000 |
| **Total** | **~140,000** | **~220,000** | **220,000** |

## 5. Estrategia de Embeddings

### 5.1 Modelo Seleccionado

| Opción | Modelo | Dimensiones | Idioma | Costo |
|--------|--------|-------------|--------|-------|
| **Primaria** | text-embedding-3-small | 1536 | Multilingüe | $0.02/1M tokens |
| Alternativa | text-embedding-3-large | 3072 | Multilingüe | $0.13/1M tokens |
| Local | sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 | 384 | Español nativo | Gratis |

**Decisión:** text-embedding-3-small
- Balance costo/calidad
- Buen rendimiento en español médico
- Integración directa con OpenAI

### 5.2 Preprocesamiento para Español Médico

```python
def preprocess_medical_spanish(text: str) -> str:
    """
    Preprocesamiento específico para texto médico español.
    """
    # 1. Normalizar abreviaturas médicas españolas
    abbreviations = {
        "c/": "cada",
        "mg": "miligramos",
        "ml": "mililitros",
        "comp.": "comprimidos",
        "caps.": "cápsulas",
        "VO": "vía oral",
        "IV": "intravenoso",
        "IM": "intramuscular",
        "SC": "subcutáneo",
        "Hx": "historia",
        "Dx": "diagnóstico",
        "Tx": "tratamiento",
        "Rx": "prescripción",
    }

    for abbr, full in abbreviations.items():
        text = text.replace(abbr, full)

    # 2. Preservar dosis y unidades
    # "500mg/8h" -> "500 miligramos cada 8 horas"

    # 3. Normalizar tildes y caracteres especiales
    import unicodedata
    text = unicodedata.normalize('NFC', text)

    return text
```

### 5.3 Costo Estimado de Embeddings

| Fase | Tokens | Costo (text-embedding-3-small) |
|------|--------|-------------------------------|
| Indexación inicial | ~50M tokens | $1.00 |
| Queries diarios (1000) | ~500K tokens | $0.01/día |
| Re-indexación mensual | ~50M tokens | $1.00/mes |
| **Total mensual** | | **~$2.30** |

## 6. Configuración de Retrieval

### 6.1 Parámetros RAG

```python
RAG_CONFIG = {
    # Retrieval
    "top_k": 5,                      # Documentos a recuperar
    "similarity_threshold": 0.75,    # Mínimo score de similitud
    "rerank_enabled": False,         # Habilitar re-ranking

    # Filtros por tipo de consulta
    "query_filters": {
        "medication_validation": {"doc_type": "medication"},
        "interaction_check": {"doc_type": "drug_interaction"},
        "diagnosis_suggestion": {"doc_type": "cie10_code"},
    },

    # Chunking
    "chunk_size": 500,
    "chunk_overlap": 50,

    # Embeddings
    "embedding_model": "text-embedding-3-small",
    "embedding_dimensions": 1536,
}
```

### 6.2 Estrategia de Búsqueda Híbrida

```
Query: "dolor de cabeza frecuente"
          │
          ▼
    ┌─────────────────────────────────┐
    │     Query Enhancement           │
    │  - Sinónimos: cefalea, migraña  │
    │  - Términos médicos expandidos  │
    └─────────────────────────────────┘
          │
          ▼
    ┌─────────────────┬───────────────┐
    │ Vector Search   │ Keyword Search │
    │ (Semantic)      │ (BM25)         │
    └────────┬────────┴───────┬───────┘
             │                │
             ▼                ▼
    ┌─────────────────────────────────┐
    │      Hybrid Fusion (RRF)        │
    │   - Combina rankings            │
    │   - Peso: 0.7 vector / 0.3 kw   │
    └─────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────┐
    │         Re-ranking              │
    │   - Relevancia médica           │
    │   - Frescura del documento      │
    └─────────────────────────────────┘
          │
          ▼
      Top-K Results
```

### 6.3 Query Templates por Caso de Uso

```python
QUERY_TEMPLATES = {
    "validate_medication": """
        Validar medicamento: {medication_name}
        Buscar: información de dosificación, contraindicaciones,
        presentaciones disponibles en España
    """,

    "check_interactions": """
        Verificar interacciones entre:
        Medicamento 1: {med1}
        Medicamento 2: {med2}
        Buscar: severidad, descripción, recomendación
    """,

    "suggest_cie10": """
        Sugerir código CIE-10 para:
        Síntomas: {symptoms}
        Contexto: {context}
        Buscar: códigos diagnósticos relevantes con descripción
    """,
}
```

## 7. Validación RAG Incremental en Tiempo Real

### 7.1 Desafío: Validar Entidades Durante Streaming

En modo real-time, las entidades se extraen inmediatamente después de mencionarse.
RAG debe validar de forma:
- **Rápida**: < 500ms para no bloquear el flujo
- **Asíncrona**: No bloquear transcripción ni extracción
- **Priorizada**: Prescripciones (seguridad) > Diagnósticos > Síntomas
- **Cacheada**: Evitar queries repetidas

### 7.2 Arquitectura de Validación Incremental

```
┌───────────────────────────────────────────────────────────────────┐
│            PIPELINE DE VALIDACIÓN RAG EN TIEMPO REAL              │
└───────────────────────────────────────────────────────────────────┘

Extracción detecta nueva entidad
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  1. CLASIFICACIÓN DE PRIORIDAD                           │
│                                                          │
│  IF tipo == "prescription":                              │
│    prioridad = CRITICAL (seguridad paciente)             │
│    timeout = 1000ms                                      │
│                                                          │
│  ELIF tipo == "diagnosis":                               │
│    prioridad = HIGH                                      │
│    timeout = 2000ms                                      │
│                                                          │
│  ELSE (symptom, chief_complaint):                        │
│    prioridad = MEDIUM                                    │
│    timeout = 3000ms                                      │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  2. CHECK CACHE (Redis)                                  │
│                                                          │
│  Key: f"rag_validation:{entity_type}:{normalized_name}"  │
│  TTL: 30 minutos para medicamentos, 7 días para CIE-10  │
│                                                          │
│  IF cache_hit:                                           │
│    return cached_result (latency ~5ms)                   │
│    skip_rag_query = True                                 │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ (cache miss)
                   ▼
┌──────────────────────────────────────────────────────────┐
│  3. QUERY RAG (ChromaDB + GPT-4o)                        │
│                                                          │
│  A. Generar query según tipo de entidad                 │
│  B. Búsqueda vectorial (top_k=5, threshold=0.75)        │
│  C. LLM synthesis con contexto RAG                       │
│                                                          │
│  Latencia típica: 300-800ms                              │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  4. PROCESAMIENTO ASÍNCRONO                              │
│                                                          │
│  • Validación corre en background (asyncio task)         │
│  • No bloquea envío de evento WebSocket inicial         │
│  • Cuando completa, envía evento de actualización:       │
│                                                          │
│    {                                                     │
│      "type": "entity_validated",                         │
│      "entity_id": "rx_001",                              │
│      "validation": {                                     │
│        "status": "valid",                                │
│        "warnings": [...],                                │
│        "rag_sources": [...]                              │
│      }                                                   │
│    }                                                     │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  5. CACHE RESULT (para futuros queries)                  │
│                                                          │
│  redis.setex(                                            │
│    key=f"rag_validation:{type}:{name}",                  │
│    ttl=1800,  # 30 minutos                               │
│    value=json.dumps(validation_result)                   │
│  )                                                       │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Implementación del Validador Incremental

```python
class IncrementalRAGValidator:
    def __init__(self, rag_service, redis_client):
        self.rag = rag_service
        self.redis = redis_client
        self.validation_queue = asyncio.PriorityQueue()

        # Configuración de prioridades
        self.priority_config = {
            "prescription": {"priority": 0, "timeout_ms": 1000, "label": "CRITICAL"},
            "diagnosis": {"priority": 1, "timeout_ms": 2000, "label": "HIGH"},
            "symptom": {"priority": 2, "timeout_ms": 3000, "label": "MEDIUM"},
            "chief_complaint": {"priority": 2, "timeout_ms": 3000, "label": "MEDIUM"},
        }

        # TTL de cache por tipo
        self.cache_ttl = {
            "prescription": 1800,    # 30 min (medicamentos pueden cambiar)
            "diagnosis": 604800,     # 7 días (CIE-10 estable)
            "symptom": 3600,         # 1 hora
        }

        # Iniciar worker
        asyncio.create_task(self.validation_worker())

    async def validate_entity(
        self,
        entity: Entity,
        context: dict = None
    ) -> ValidationResult:
        """
        Valida entidad usando RAG. Retorna inmediatamente si cached,
        sino encola para procesamiento asíncrono.
        """
        # 1. Check cache
        cache_key = self._get_cache_key(entity)
        cached = await self.redis.get(cache_key)
        if cached:
            logging.info(f"RAG cache HIT for {entity.id}")
            return ValidationResult.from_json(cached)

        # 2. Determinar prioridad
        config = self.priority_config.get(entity.type, {"priority": 2, "timeout_ms": 3000})

        # 3. Encolar para validación asíncrona
        await self.validation_queue.put((
            config["priority"],
            time.time(),
            entity,
            context
        ))

        # 4. Retornar resultado pending (no bloquea)
        return ValidationResult(
            entity_id=entity.id,
            status="pending",
            message="Validation in progress"
        )

    async def validation_worker(self):
        """Worker que procesa queue de validaciones por prioridad."""
        while True:
            try:
                priority, timestamp, entity, context = await self.validation_queue.get()

                # Ejecutar validación con timeout
                config = self.priority_config.get(entity.type, {})
                timeout_ms = config.get("timeout_ms", 3000)

                try:
                    result = await asyncio.wait_for(
                        self._execute_validation(entity, context),
                        timeout=timeout_ms / 1000
                    )
                except asyncio.TimeoutError:
                    result = ValidationResult(
                        entity_id=entity.id,
                        status="timeout",
                        message=f"Validation timed out after {timeout_ms}ms"
                    )

                # Cache result
                await self._cache_result(entity, result)

                # Enviar evento WebSocket
                await self.send_websocket_event({
                    "type": "entity_validated",
                    "entity_id": entity.id,
                    "validation": result.to_dict()
                })

                self.validation_queue.task_done()

            except Exception as e:
                logging.error(f"Validation worker error: {e}")

    async def _execute_validation(self, entity: Entity, context: dict) -> ValidationResult:
        """Ejecuta validación RAG para una entidad."""
        if entity.type == "prescription":
            return await self._validate_prescription(entity, context)
        elif entity.type == "diagnosis":
            return await self._validate_diagnosis(entity, context)
        else:
            return await self._validate_symptom(entity, context)
```

### 7.4 Validación de Prescripciones con Alertas Críticas

```python
async def _validate_prescription(
    self,
    prescription: Entity,
    context: dict
) -> ValidationResult:
    """
    Valida prescripción: existencia, dosis, interacciones.
    CRÍTICO: Alertar inmediatamente si hay interacción MAYOR.
    """
    medication = prescription.medication
    other_meds = context.get("other_prescriptions", [])

    # 1. Validar medicamento existe
    med_query = f"Validar medicamento: {medication}. Dosis: {prescription.dose}"
    med_result = await self.rag.query(
        query=med_query,
        filters={"doc_type": "medication"},
        top_k=3
    )

    # 2. Check interacciones con otros medicamentos
    interaction_warnings = []
    for other_med in other_meds:
        interaction_query = f"Interacción medicamentosa: {medication} + {other_med}"
        interaction_result = await self.rag.query(
            query=interaction_query,
            filters={"doc_type": "drug_interaction"},
            top_k=2
        )

        # Analizar severidad
        for doc in interaction_result.documents:
            if "MAYOR" in doc.content.upper() or "CRÍTICA" in doc.content.upper():
                interaction_warnings.append({
                    "severity": "MAJOR",
                    "medication_1": medication,
                    "medication_2": other_med,
                    "description": doc.content,
                    "source": doc.metadata.get("source")
                })

    # 3. Si hay interacción MAYOR → Alerta INMEDIATA
    if any(w["severity"] == "MAJOR" for w in interaction_warnings):
        await self.send_critical_alert({
            "type": "interaction_warning",
            "severity": "MAJOR",
            "prescription_id": prescription.id,
            "medications": [medication] + other_meds,
            "warnings": interaction_warnings,
            "timestamp": time.time()
        })

    return ValidationResult(
        entity_id=prescription.id,
        status="valid" if med_result.documents else "not_found",
        medication_exists=bool(med_result.documents),
        warnings=interaction_warnings,
        rag_sources=[doc.metadata.get("source") for doc in med_result.documents]
    )
```

### 7.5 Flujo de Alerta Crítica (<1s)

```
Prescripción extraída: "Warfarina 5mg"
         │
         ▼ (prioridad CRITICAL, timeout 1s)
RAG Query: Interacciones con medicamentos existentes
         │
         ▼ (~300ms)
Resultado: Interacción MAYOR con Ibuprofeno detectada
         │
         ▼ (INMEDIATAMENTE)
WebSocket Event:
{
  "type": "interaction_warning",
  "severity": "MAJOR",
  "medications": ["Ibuprofeno", "Warfarina"],
  "description": "Ibuprofeno puede potenciar efecto anticoagulante",
  "recommendation": "Monitorizar INR. Considerar paracetamol",
  "timestamp": 1705312460.789
}
         │
         ▼ (<1s desde extracción)
Frontend muestra ALERTA al doctor:
⚠️ INTERACCIÓN MEDICAMENTOSA MAYOR
Ibuprofeno + Warfarina
→ Riesgo de sangrado aumentado
```

### 7.6 Optimizaciones de Performance

| Optimización | Mejora | Implementación |
|--------------|--------|----------------|
| **Cache Redis** | 300ms → 5ms | TTL: 30min meds, 7d CIE-10 |
| **Async validation** | No bloquea extracción | asyncio.PriorityQueue |
| **Priorización** | Prescripciones primero | CRITICAL > HIGH > MEDIUM |
| **Batching** | 5 queries → 1 batch | Acumular 500ms o 5 entidades |
| **Prefetching** | Medicamentos comunes cached | Top 100 meds pre-cargados |
| **ChromaDB indexing** | Query 50% más rápido | Metadata index |

**Resultado esperado:**
- **Cache hit rate**: 60-70% (medicamentos comunes se repiten)
- **Latencia con cache**: ~5ms
- **Latencia sin cache**: ~300-500ms
- **No bloquea flujo**: Validación async mientras continúa transcripción

## 8. Integración con Servicio de Extracción

### 8.1 Flujo Integrado (Batch Mode)

```
Transcripción
     │
     ▼
┌────────────────────────────────────────────┐
│         SERVICIO DE EXTRACCIÓN             │
│                                            │
│  1. Extrae entidades (GPT-4)               │
│     - Medicamentos mencionados             │
│     - Síntomas descritos                   │
│     - Procedimientos                       │
│                                            │
│  2. Valida con RAG (en paralelo)           │
│     ┌─────────────────────────────┐        │
│     │ Para cada medicamento:       │        │
│     │   - Validar existencia       │        │
│     │   - Obtener dosis correcta   │        │
│     │   - Verificar interacciones  │        │
│     └─────────────────────────────┘        │
│     ┌─────────────────────────────┐        │
│     │ Para síntomas:               │        │
│     │   - Sugerir códigos CIE-10   │        │
│     └─────────────────────────────┘        │
│                                            │
│  3. Enriquece respuesta                    │
│     - Añade validaciones                   │
│     - Añade alertas de interacción         │
│     - Añade sugerencias CIE-10             │
└────────────────────────────────────────────┘
     │
     ▼
Extracción Enriquecida con Validación
```

### 8.2 Flujo Integrado (Real-Time Streaming Mode)

```
Audio Stream (WebSocket)
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│                    STREAMING PIPELINE                           │
│                                                                 │
│  Transcription → Incremental Extraction → RAG Validation       │
│       │                │                      │                 │
│       │                │                      │                 │
│       ▼                ▼                      ▼                 │
│  WebSocket:       WebSocket:            WebSocket:              │
│  transcription_   symptom_extracted     entity_validated        │
│  update           diagnosis_detected    interaction_warning     │
│                   prescription_added                            │
│                                                                 │
│  PARALELO: Validación RAG NO bloquea extracción                │
│  CRÍTICO: Alertas de interacción en <1s                        │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Schema de Respuesta Enriquecida

```json
{
  "extraction": {
    "medications": [
      {
        "name": "Nolotil",
        "dosage": "575mg cada 8 horas",
        "validation": {
          "status": "VALIDATED",
          "rag_confidence": 0.95,
          "correct_dosage": "1-2 cápsulas/8h, máx 6/día",
          "source": "CIMA"
        }
      }
    ],
    "symptoms": [
      {
        "description": "dolor de cabeza intenso",
        "suggested_cie10": [
          {"code": "R51", "description": "Cefalea", "confidence": 0.88},
          {"code": "G43.9", "description": "Migraña, no especificada", "confidence": 0.72}
        ]
      }
    ],
    "drug_interactions": [
      {
        "medications": ["Nolotil", "Sintrom"],
        "severity": "MAYOR",
        "description": "Metamizol puede potenciar anticoagulantes",
        "recommendation": "Monitorizar INR"
      }
    ]
  },
  "rag_metadata": {
    "queries_executed": 3,
    "documents_retrieved": 12,
    "avg_similarity_score": 0.87,
    "sources_used": ["CIMA", "DrugBank", "CIE-10-ES"],
    "cache_hit_rate": 0.65,
    "avg_latency_ms": 180
  }
}
```

## 9. Mantenimiento de la Knowledge Base

### 9.1 Proceso de Actualización

| Frecuencia | Acción | Responsable |
|------------|--------|-------------|
| Semanal | Sincronizar con CIMA API | Automático (cron) |
| Mensual | Actualizar interacciones DrugBank | Manual + revisión |
| Anual | Actualizar CIE-10-ES | Manual |
| Continuo | Monitorear queries sin resultados | Automático + alertas |

### 9.2 Métricas de Calidad

| Métrica | Objetivo | Acción si falla |
|---------|----------|-----------------|
| Similarity score promedio | > 0.80 | Revisar embeddings/chunking |
| Queries sin resultados | < 5% | Añadir documentos faltantes |
| Latencia p95 | < 500ms | Optimizar índices |
| Cache hit rate | > 60% | Ajustar TTL |

### 9.3 Versionado

- Cada actualización de la KB genera una nueva versión
- Rollback disponible en caso de regresiones
- Changelog mantenido en `kb_versions` table
