# RAG vademecum setup — how to populate ChromaDB on a clean deploy

The realtime validation pipeline ([Alertas de Validación] panel, drug-interaction
checks, dose validation, CIE-10 suggestions) is driven by RAG retrieval against
ChromaDB. **An empty ChromaDB means zero alerts will ever fire**, no matter
how many medications a doctor prescribes during a session.

This guide walks you through populating the knowledge base on a fresh
checkout. ~5 minutes start to finish.

## Prerequisites

- The dev docker stack is up:
  ```bash
  cd ai-service
  docker compose up -d
  ```
  Wait for AI service to log `Application startup complete`.

- `OPENAI_API_KEY` is set in `ai-service/.env` (the script uses it to embed
  documents via `text-embedding-3-small`; ~120 embedding calls, costs less
  than $0.001 per ingest).

- ChromaDB and the AI service are reachable:
  ```bash
  curl -sf http://localhost:8000/api/v1/health
  ```

## Files

```
ai-service/
├── data/vademecum/
│   ├── medications.json        # 30 common Spanish medications
│   ├── drug_interactions.json  # 25 clinically-important interactions
│   └── cie10_codes.json        # 40 common CIE-10 diagnosis codes
└── scripts/
    └── ingest_vademecum.py     # one-shot ingestion script
```

The volume mounts in `docker-compose.yml` (`./data:/app/data`,
`./scripts:/app/scripts`) ensure the container sees changes to these files
without rebuilding the image.

## Running the ingestion

From the `ai-service/` directory:

```bash
# First-time ingest on a clean ChromaDB
make ingest-vademecum-reset

# Or, idempotent upsert (re-run after editing the JSON files)
make ingest-vademecum

# Sanity-check the document count
make vademecum-counts
```

What `make ingest-vademecum-reset` does:

1. Drops the `medrecord_spanish_medical` ChromaDB collection (if it exists).
2. Reads the three JSON files.
3. Composes embed-friendly text per record (e.g. for medications:
   `"Paracetamol. Principio activo: paracetamol. Indicaciones:
   Dolor leve a moderado, fiebre. Posología: 500-1000 mg cada 6-8 horas..."`).
4. Generates embeddings via OpenAI `text-embedding-3-small` in batches.
5. Uploads to ChromaDB with `doc_type` metadata (`medication` /
   `drug_interaction` / `cie10_code`).

Drug interactions are inserted **bidirectionally** (one row for `A→B`, one
for `B→A`) so the cosine query at runtime matches regardless of the order
the doctor mentions the medications.

Expected output:

```
Reset collection: medrecord_spanish_medical
Prepared 30 records for medications
Prepared 50 records for drug_interactions
Prepared 40 records for cie10_codes
Embedding 120 documents (this calls OpenAI)...
Added 120 documents to collection
Ingested 30 medications, 25 interactions (2x = 50 bidirectional rows), and 40 CIE-10 codes.
Collection now contains: 120 total documents.
```

## Verification

### Quick: count documents

```bash
make vademecum-counts
# → Total documents in collection: 120
```

### End-to-end: trigger an alert

After `make ingest-vademecum-reset`, run a real consultation in the browser
(or via the synthetic WS smoke test) and prescribe two interacting drugs:

> "Le voy a recetar **warfarina** cinco miligramos al día. También
> **ibuprofeno** seiscientos miligramos cada ocho horas."

Within ~1 second of the second medication being extracted, an
`interaction_alert` event fires:

```bash
docker logs medrecord-ai-service --since 30s | grep -E "interaction|alert"
# → Drug interaction check task queued ... priority=CRITICAL
# → Validation task completed task_type=interaction priority=critical
```

The React UI shows a red card in *Alertas de Validación*:

> **CRITICA — warfarina + ibuprofeno — Aumento marcado del riesgo
> hemorrágico. AINE inhiben la función plaquetaria... Recomendación:
> Evitar la combinación.**

### Other realistic test pairs

| Med A | Med B | Severity |
|---|---|---|
| diclofenaco | warfarina | CRITICA |
| omeprazol | clopidogrel | MAYOR |
| aspirina | ibuprofeno | MAYOR |
| ibuprofeno | losartán | MAYOR |
| ibuprofeno | enalapril | MAYOR |
| atenolol | salbutamol | MAYOR |
| ciprofloxacino | warfarina | MAYOR |
| dexametasona | ibuprofeno | MAYOR |

Pairs **not** in the dataset (e.g. paracetamol + omeprazol) correctly
return *no alert*.

## Extending the dataset

### Add a medication

Edit `ai-service/data/vademecum/medications.json` — append an object with
a unique `id` (e.g. `med_omeprazol_iv`). At minimum populate `id`, `name`,
`ingrediente_activo`, `posologia`. Then:

```bash
make ingest-vademecum   # incremental upsert; safe to run repeatedly
```

### Add an interaction

Edit `ai-service/data/vademecum/drug_interactions.json`. Required fields:

```json
{
  "id": "int_<unique-slug>",
  "med_a": "<medication name as the doctor would say it>",
  "med_b": "<other medication>",
  "severidad": "CRITICA | MAYOR | MODERADA | MENOR",
  "description": "<what happens, in Spanish>",
  "recomendacion": "<clinical action>",
  "source": "<reference, e.g. AEMPS>"
}
```

Only `severidad` ∈ `{CRITICA, MAYOR}` produces a `validation_alert`
frame; lower severities are stored but not surfaced as red-banner alerts
(by design — they get the per-entity validation badge instead).

Re-run `make ingest-vademecum`.

### Add a CIE-10 code

Edit `ai-service/data/vademecum/cie10_codes.json`. The `synonyms` array
is what makes a symptom phrase match the code (e.g. `"resfriado común"`
in synonyms makes "el paciente tiene resfriado común" trigger a
suggestion for `J00`).

## Troubleshooting

### "ChromaDB connected, 0 documents" in health check

The vademecum hasn't been ingested. Run `make ingest-vademecum-reset`.

### `Reset failed (collection may not exist yet)`

Harmless — the script tries to drop the collection before re-creating it.
On a brand-new ChromaDB there's nothing to drop. The ingest still proceeds.

### `Expected where to have exactly one operator, got {}`

Client/server version mismatch on ChromaDB. The repo pins `chromadb==0.5.23`
in `requirements.txt` to match the `chromadb/chroma:0.5.23` server image.
If you upgrade one, upgrade the other:

```bash
docker exec -u root medrecord-ai-service pip install --upgrade 'chromadb==X.Y.Z'
docker compose restart ai-service
```

### `cannot cache function ... no locator available` (numba/librosa)

The audio-feature diarizer transitively imports librosa, which uses numba's
JIT cache. Set `NUMBA_CACHE_DIR=/tmp/numba_cache` (already in
`docker-compose.yml` and the `Dockerfile`). For a running container without
the env var:

```bash
docker compose up -d --force-recreate ai-service
```

### `Failed building wheel for webrtcvad` during pip install

`webrtcvad` (transitive via `resemblyzer`) needs a C compiler. The
`Dockerfile` builder stage includes `build-essential`. If you're installing
into a running container manually, run as root and ensure build tools are
present:

```bash
docker exec -u root medrecord-ai-service apt-get update
docker exec -u root medrecord-ai-service apt-get install -y build-essential python3-dev
docker exec -u root medrecord-ai-service pip install resemblyzer librosa
```

### `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`

`openai<2.0` is incompatible with `httpx>=0.28` (which `chromadb 0.5.x`
requires). Upgrade OpenAI:

```bash
docker exec -u root medrecord-ai-service pip install --upgrade openai
```

`requirements.txt` already pins `openai==2.33.0` for new installs.

### Volume mounts didn't pick up new JSON files

If you edited the JSON files and the container doesn't see them, verify
the mounts:

```bash
docker exec medrecord-ai-service ls /app/data/vademecum
```

If empty or stale, ensure `docker-compose.yml` includes:

```yaml
volumes:
  - ./src:/app/src
  - ./scripts:/app/scripts
  - ./data:/app/data
```

Then `docker compose up -d` (no rebuild needed; volumes are bind-mounts).

## Production note

This dataset is **a curated MVP** intended to demonstrate the alert flow on
dev. For real users you'd want to replace the JSONs with output from a
real source — CIMA (AEMPS, free API), Vademecum-es scrape, or a licensed
DrugBank-Spanish export. The schema is stable: as long as the JSON shape
matches, the same `make ingest-vademecum` command handles the larger
corpus. Cost scales linearly with embedding calls (~$0.02 / 1M tokens for
`text-embedding-3-small`; a 5000-medication corpus is roughly $0.05 to
embed).
