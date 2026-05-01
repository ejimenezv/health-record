"""Semantic deduper for extracted entities.

Layered with the WebSocket handler's exact/containment string check, this
module catches synonyms the string match misses:

    "Cefalea"           ↔ "dolor de cabeza"
    "fiebre alta"       ↔ "hipertermia"
    "tensión 140/90"    ↔ "presión arterial 140/90"

It uses OpenAI ``text-embedding-3-small`` via the existing
``EmbeddingsService`` to embed each new entity, cosine-compares against
all previously seen entities of the same type, and drops if max
similarity ≥ ``similarity_threshold`` (default 0.86 — empirically tight
enough to keep false positives rare while catching common synonyms).

For borderline cases (between ``llm_tiebreaker_low`` and
``similarity_threshold``) an optional GPT tiebreaker can be enabled; it
asks the model a yes/no whether the two phrases refer to the same
clinical concept. Off by default — turn on with
``enable_llm_tiebreaker=True``.

Cost ballpark per session (20 entities, threshold off):
    20 × 1 embedding × ~10 tokens × $0.02 / 1M = $0.000004
With LLM tiebreaker firing ~5 times per session:
    5 × ~150 tokens × gpt-4o-mini $0.15/1M = $0.0001

Both negligible. Embeddings add ~80–150 ms per entity; LLM tiebreaker
adds ~400–800 ms when invoked.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional, Tuple

import structlog

from src.core.config import get_settings
from src.rag.embeddings import EmbeddingsService

logger = structlog.get_logger()


@dataclass
class _SeenEntity:
    norm_text: str
    embedding: list[float]


@dataclass
class DedupDecision:
    """Outcome of a semantic dedup check."""
    is_duplicate: bool
    matched_text: Optional[str] = None
    similarity: float = 0.0
    method: str = ""  # "embedding" | "llm_tiebreaker" | "below_threshold"

    def __bool__(self) -> bool:
        return self.is_duplicate


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Standard cosine similarity. Returns 0 for incompatible inputs."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


@dataclass
class EntitySemanticDeduper:
    """Embedding-based semantic dedup with optional LLM tiebreaker.

    Construct one per WebSocket session. State (``_by_type``) is a per-
    entity-type list of ``(norm_text, embedding)`` tuples.

    Args:
        embeddings: shared ``EmbeddingsService`` (process singleton).
        similarity_threshold: ≥ this similarity drops the new entity.
        llm_tiebreaker_low: similarity in
            ``[llm_tiebreaker_low, similarity_threshold)`` triggers the
            LLM tiebreaker if ``enable_llm_tiebreaker`` is True.
        enable_llm_tiebreaker: when True, GPT decides borderline cases.
    """

    embeddings: EmbeddingsService
    similarity_threshold: float = 0.86
    llm_tiebreaker_low: float = 0.78
    enable_llm_tiebreaker: bool = False
    _by_type: dict[str, list[_SeenEntity]] = field(default_factory=dict)

    async def check_and_remember(
        self,
        entity_type: str,
        norm_text: str,
    ) -> DedupDecision:
        """Decide whether ``norm_text`` is a duplicate; if not, remember it."""
        if not norm_text:
            return DedupDecision(False, method="empty")

        try:
            new_emb = await self.embeddings.generate_query_embedding_async(norm_text)
        except Exception:
            logger.exception("embedding failed during dedup; treating as not-dup")
            self._by_type.setdefault(entity_type, []).append(
                _SeenEntity(norm_text, [])
            )
            return DedupDecision(False, method="embedding_error")

        seen = self._by_type.get(entity_type, [])
        max_sim = 0.0
        match_text: Optional[str] = None
        for prior in seen:
            sim = cosine_similarity(new_emb, prior.embedding)
            if sim > max_sim:
                max_sim = sim
                match_text = prior.norm_text

        if max_sim >= self.similarity_threshold:
            return DedupDecision(True, match_text, max_sim, "embedding")

        if (
            self.enable_llm_tiebreaker
            and match_text
            and max_sim >= self.llm_tiebreaker_low
        ):
            llm_says_dup = await self._llm_same_concept(norm_text, match_text)
            if llm_says_dup:
                return DedupDecision(True, match_text, max_sim, "llm_tiebreaker")

        seen.append(_SeenEntity(norm_text, new_emb))
        self._by_type[entity_type] = seen
        return DedupDecision(False, match_text, max_sim, "below_threshold")

    def reset(self) -> None:
        self._by_type.clear()

    @staticmethod
    async def _llm_same_concept(a: str, b: str) -> bool:
        """Ask gpt-4o-mini whether two short phrases refer to the same clinical concept.

        Returns False on any error so we err on the side of keeping the
        entity (false positive in the UI is recoverable; a dropped real
        diagnosis is not).
        """
        try:
            from openai import AsyncOpenAI

            settings = get_settings()
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0,
                max_tokens=4,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You answer YES or NO only. Decide whether the two "
                            "Spanish medical phrases refer to the SAME clinical "
                            "concept (synonyms, lay vs medical terms, or trivial "
                            "rephrasings). Answer NO if they are related but "
                            "distinct (e.g., a symptom vs a different symptom)."
                        ),
                    },
                    {"role": "user", "content": f"A: {a}\nB: {b}\nSame concept?"},
                ],
            )
            content = (response.choices[0].message.content or "").strip().upper()
            return content.startswith("YES")
        except Exception:
            logger.exception("LLM tiebreaker failed; defaulting to not-dup")
            return False
