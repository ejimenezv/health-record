# ADR-002: Selección de ChromaDB como Vector Store

**Fecha:** 07/04/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

## Contexto

El sistema MedRecord AI requiere un vector store para:
- Almacenar ~220,000 embeddings de conocimiento médico español
- Búsqueda semántica de alta precisión para validación médica
- **Latencia < 200ms para queries en tiempo real** (crítico para streaming)
- Persistencia y durabilidad de datos
- Presupuesto limitado para MVP/desarrollo

El sistema de RAG debe validar medicamentos, detectar interacciones medicamentosas, y sugerir códigos CIE-10 durante la transcripción en tiempo real de consultas médicas.

## Decisión

Seleccionamos **ChromaDB** como vector store para el MVP y desarrollo inicial.

## Opciones Evaluadas

| Criterio | ChromaDB | Pinecone | Weaviate | pgvector |
|----------|----------|----------|----------|----------|
| **Costo/mes (220K vectors)** | $0 (self-hosted) | ~$70 | ~$25 | $0 (incluido en PG) |
| **Latencia p95** | ~50ms | ~30ms | ~40ms | ~100ms |
| **Setup** | Simple (Docker) | Managed | Moderado | Requiere PostgreSQL |
| **Escalabilidad** | Limitada | Alta | Alta | Moderada |
| **Hybrid search** | Sí (v0.4+) | No nativo | Sí | Extensiones |
| **Persistencia** | Sí | Sí | Sí | Sí |
| **Filtrado metadata** | Sí | Sí | Sí | Sí |
| **Python SDK** | Nativo | Sí | Sí | SQLAlchemy |
| **Comunidad** | Activa | Enterprise | Activa | PostgreSQL |

### Análisis Detallado

#### ChromaDB (Seleccionado)
- **Pros**: Gratuito, Python-native, setup simple con Docker, suficiente para volumen MVP
- **Contras**: Escalabilidad limitada, sin SLA enterprise
- **Veredicto**: Ideal para MVP y desarrollo

#### Pinecone
- **Pros**: Mejor latencia, alta disponibilidad, managed service
- **Contras**: Costo recurrente ($70+/mes), vendor lock-in
- **Veredicto**: Considerar para producción enterprise

#### Weaviate
- **Pros**: Híbrido nativo, buena escalabilidad, open source disponible
- **Contras**: Setup más complejo, menos familiar para el equipo
- **Veredicto**: Alternativa válida si ChromaDB no escala

#### pgvector
- **Pros**: Integración con PostgreSQL existente, sin servicio adicional
- **Contras**: Latencia superior (~100ms), queries más complejos
- **Veredicto**: Buena opción de fallback, pero latencia insuficiente para real-time

## Consecuencias

### Positivas

- **Costo cero** para desarrollo y MVP
- **Setup simple** con Docker Compose (5 minutos)
- **Python-native** - integración directa sin SDKs complejos
- **Suficiente capacidad** para volumen esperado (~220K vectors)
- **Búsqueda híbrida** disponible en versiones recientes (v0.4+)
- **Latencia adecuada** (~50ms p95) para validación en tiempo real
- **Desarrollo local** sin dependencias externas
- **Consistencia** con stack Python del AI Service

### Negativas / Trade-offs

- **Escalabilidad limitada** - si superamos 1M vectors, necesitaremos migrar
- **Sin SLA enterprise** - no adecuado para producción crítica sin respaldo
- **Single-node** - sin replicación nativa para alta disponibilidad
- **Menos features avanzados** que soluciones enterprise (Pinecone, Weaviate)

## Criterios de Revisión

Esta decisión se revisará si ocurre cualquiera de las siguientes condiciones:

| Trigger | Umbral | Acción |
|---------|--------|--------|
| Volumen de vectores | > 500,000 | Evaluar migración a Weaviate/Pinecone |
| Latencia p95 | > 200ms consistente | Optimizar índices o migrar |
| Alta disponibilidad | Requerimiento >99.9% | Migrar a solución managed |
| Multi-región | Requerimiento geográfico | Evaluar Pinecone |

## Configuración Recomendada

```python
# config/chromadb.py
CHROMADB_CONFIG = {
    "persist_directory": "/data/chromadb",
    "collection_name": "medical_knowledge_es",
    "embedding_function": "openai",  # text-embedding-3-small
    "distance_function": "cosine",
    "metadata_config": {
        "hnsw:space": "cosine",
        "hnsw:construction_ef": 128,
        "hnsw:search_ef": 64,
        "hnsw:M": 16,
    }
}
```

```yaml
# docker-compose.yml
services:
  chromadb:
    image: chromadb/chroma:latest
    volumes:
      - chromadb_data:/chroma/chroma
    ports:
      - "8000:8000"
    environment:
      - CHROMA_SERVER_AUTH_PROVIDER=token
      - CHROMA_SERVER_AUTH_TOKEN_TRANSPORT_HEADER=X-Chroma-Token
```

## Referencias

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Pinecone Pricing](https://www.pinecone.io/pricing/)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- Documento relacionado: [rag-knowledge-base-design.md](../delivery-2/rag-knowledge-base-design.md)
