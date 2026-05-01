"""Ingest the curated Spanish vademecum + drug-interactions + CIE-10 dataset
into ChromaDB so the RAG validation pipeline produces real alerts.

Usage (inside the ai-service container):

    python -m scripts.ingest_vademecum            # incremental upsert
    python -m scripts.ingest_vademecum --reset    # wipe collection first
    python -m scripts.ingest_vademecum --counts   # just print counts, exit

The script is idempotent at the document-id level: re-running with the same
JSON files updates existing entries via Chroma's id semantics. Use --reset
when you've removed entries from the JSON and want them gone from the
vector store too.

Document schema written to ChromaDB:

  doc_type=medication
    id        med_<slug>
    document  "<name>. <ingrediente_activo>. <indicaciones>. ..."   (embedded)
    metadata  posologia, contraindicaciones, advertencias, source, name, ingrediente_activo

  doc_type=drug_interaction
    id        int_<slug>
    document  "Interacción medicamentosa entre <a> y <b>. <description>"  (embedded)
    metadata  med_a, med_b, severidad (CRITICA|MAYOR|MODERADA|MENOR),
              recomendacion, mecanismo, source

  doc_type=cie10_code
    id        cie10_<code>
    document  "<description>. Sinónimos: <synonyms joined>"  (embedded)
    metadata  code, description, source
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable

# Make the script runnable as `python -m scripts.ingest_vademecum`
# from /app inside the container (PYTHONPATH=/app already).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.rag.embeddings import EmbeddingsService  # noqa: E402
from src.rag.vector_store import VectorStoreClient  # noqa: E402
from src.utils.logger import get_logger  # noqa: E402

logger = get_logger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "vademecum"


# ─── Document builders ────────────────────────────────────────────


def _med_doc_text(med: dict[str, Any]) -> str:
    """Compose the text that gets embedded for a medication entry."""
    parts = [
        med.get("name", ""),
        f"Principio activo: {med.get('ingrediente_activo', '')}",
        f"Indicaciones: {med.get('indicaciones', '')}",
        f"Posología: {med.get('posologia', '')}",
    ]
    if med.get("contraindicaciones"):
        parts.append(f"Contraindicaciones: {med['contraindicaciones']}")
    if med.get("advertencias"):
        parts.append(f"Advertencias: {med['advertencias']}")
    return ". ".join(p for p in parts if p)


def _interaction_doc_text(it: dict[str, Any]) -> str:
    return (
        f"Interacción medicamentosa entre {it['med_a']} y {it['med_b']}. "
        f"Severidad: {it['severidad']}. {it.get('description', '')} "
        f"{it.get('mecanismo', '')}".strip()
    )


def _cie10_doc_text(c: dict[str, Any]) -> str:
    syn = ", ".join(c.get("synonyms", []))
    base = f"{c['code']}: {c['description']}"
    return f"{base}. Sinónimos: {syn}" if syn else base


# ─── Loaders ──────────────────────────────────────────────────────


def _load_json(name: str) -> list[dict[str, Any]]:
    path = DATA_DIR / name
    if not path.exists():
        logger.warning(f"Dataset {name} not found at {path}; skipping")
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _build_medication_records(meds: Iterable[dict]) -> tuple[list[str], list[str], list[dict]]:
    ids, docs, metas = [], [], []
    for m in meds:
        ids.append(m["id"])
        docs.append(_med_doc_text(m))
        metas.append(
            {
                "doc_type": "medication",
                "name": m.get("name", ""),
                "ingrediente_activo": m.get("ingrediente_activo", ""),
                "posologia": m.get("posologia", ""),
                "contraindicaciones": m.get("contraindicaciones", ""),
                "advertencias": m.get("advertencias", ""),
                "indicaciones": m.get("indicaciones", ""),
                "source": m.get("source", "manual"),
            }
        )
    return ids, docs, metas


def _build_interaction_records(
    interactions: Iterable[dict],
) -> tuple[list[str], list[str], list[dict]]:
    ids, docs, metas = [], [], []
    for it in interactions:
        # Insert two records per interaction: one for each direction so
        # the query "interacción entre A y B" and "entre B y A" both
        # retrieve via cosine similarity.
        for direction, (a, b) in enumerate([(it["med_a"], it["med_b"]), (it["med_b"], it["med_a"])]):
            doc_id = f"{it['id']}__{direction}"
            ids.append(doc_id)
            doc = it.copy()
            doc["med_a"], doc["med_b"] = a, b
            docs.append(_interaction_doc_text(doc))
            metas.append(
                {
                    "doc_type": "drug_interaction",
                    "med_a": a,
                    "med_b": b,
                    "severidad": it.get("severidad", "DESCONOCIDA"),
                    "recomendacion": it.get("recomendacion", ""),
                    "mecanismo": it.get("mecanismo", ""),
                    "source": it.get("source", "manual"),
                }
            )
    return ids, docs, metas


def _build_cie10_records(codes: Iterable[dict]) -> tuple[list[str], list[str], list[dict]]:
    ids, docs, metas = [], [], []
    for c in codes:
        ids.append(f"cie10_{c['code'].replace('.', '_').replace(' ', '_')}")
        docs.append(_cie10_doc_text(c))
        metas.append(
            {
                "doc_type": "cie10_code",
                "code": c["code"],
                "description": c["description"],
                "synonyms": ", ".join(c.get("synonyms", [])),
                "source": c.get("source", "manual"),
            }
        )
    return ids, docs, metas


# ─── Driver ───────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Ingest vademecum into ChromaDB")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop the collection before ingest (deletes ALL documents).",
    )
    parser.add_argument(
        "--counts",
        action="store_true",
        help="Print collection counts and exit.",
    )
    args = parser.parse_args()

    embedder = EmbeddingsService()
    store = VectorStoreClient()

    if args.counts:
        # Trigger collection creation if missing.
        _ = store.collection
        print(f"Total documents in collection: {store.count()}")
        return

    if args.reset:
        try:
            store.reset()
            logger.warning("ChromaDB collection reset")
        except Exception as exc:
            logger.warning(f"Reset failed (collection may not exist yet): {exc}")

    meds = _load_json("medications.json")
    interactions = _load_json("drug_interactions.json")
    cie10 = _load_json("cie10_codes.json")

    if not (meds or interactions or cie10):
        logger.error("No data files found; nothing to ingest")
        sys.exit(1)

    all_ids: list[str] = []
    all_docs: list[str] = []
    all_metas: list[dict] = []

    for build, items, label in [
        (_build_medication_records, meds, "medications"),
        (_build_interaction_records, interactions, "drug_interactions"),
        (_build_cie10_records, cie10, "cie10_codes"),
    ]:
        ids, docs, metas = build(items)
        all_ids += ids
        all_docs += docs
        all_metas += metas
        logger.info(f"Prepared {len(ids)} records for {label}")

    if not all_ids:
        logger.error("Nothing to embed")
        sys.exit(1)

    logger.info(f"Embedding {len(all_docs)} documents (this calls OpenAI)...")
    embeddings = embedder.generate(all_docs)

    # add_documents fails if any id already exists. We use upsert
    # semantics: delete-then-add, scoped to the ids we're inserting.
    if not args.reset:
        try:
            store.delete(all_ids)
        except Exception:
            pass  # ignore if absent

    store.add_documents(
        ids=all_ids,
        embeddings=embeddings,
        documents=all_docs,
        metadatas=all_metas,
    )

    print(
        f"\nIngested {len(meds)} medications, {len(interactions)} interactions "
        f"(2x = {len(interactions) * 2} bidirectional rows), "
        f"and {len(cie10)} CIE-10 codes."
    )
    print(f"Collection now contains: {store.count()} total documents.\n")


if __name__ == "__main__":
    main()
