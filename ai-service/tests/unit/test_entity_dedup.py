"""Tests for the semantic entity deduper."""
import math
from unittest.mock import AsyncMock, patch

import pytest

from src.services.entity_dedup import (
    DedupDecision,
    EntitySemanticDeduper,
    cosine_similarity,
)


def _vec(*xs: float) -> list[float]:
    return list(xs)


class TestCosineSimilarity:
    def test_identical_vectors(self):
        assert cosine_similarity(_vec(1, 0, 0), _vec(1, 0, 0)) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        assert cosine_similarity(_vec(1, 0), _vec(0, 1)) == pytest.approx(0.0)

    def test_opposite_vectors(self):
        assert cosine_similarity(_vec(1, 0), _vec(-1, 0)) == pytest.approx(-1.0)

    def test_empty(self):
        assert cosine_similarity([], _vec(1)) == 0.0
        assert cosine_similarity(_vec(1), []) == 0.0

    def test_mismatched_dims(self):
        assert cosine_similarity(_vec(1, 0), _vec(1, 0, 0)) == 0.0

    def test_zero_vector(self):
        assert cosine_similarity(_vec(0, 0), _vec(1, 1)) == 0.0


def _fake_embeddings(mapping: dict[str, list[float]]):
    """Build a fake EmbeddingsService that returns canned vectors per text."""
    fake = AsyncMock()

    async def lookup(text: str) -> list[float]:
        if text in mapping:
            return mapping[text]
        # default: orthogonal-ish unique vector keyed off the text
        seed = sum(ord(c) for c in text) % 7 + 1
        return [1 / math.sqrt(seed)] * seed + [0.0] * (10 - seed)

    fake.generate_query_embedding_async = AsyncMock(side_effect=lookup)
    return fake


class TestExactDuplicateDetection:
    @pytest.mark.asyncio
    async def test_first_entity_is_not_duplicate(self):
        embeddings = _fake_embeddings({"fiebre": [1.0, 0.0, 0.0]})
        d = EntitySemanticDeduper(embeddings=embeddings)
        result = await d.check_and_remember("symptom", "fiebre")
        assert not result.is_duplicate

    @pytest.mark.asyncio
    async def test_identical_re_emission_dropped(self):
        embeddings = _fake_embeddings({"fiebre": [1.0, 0.0, 0.0]})
        d = EntitySemanticDeduper(embeddings=embeddings)
        await d.check_and_remember("symptom", "fiebre")
        result = await d.check_and_remember("symptom", "fiebre")
        assert result.is_duplicate
        assert result.method == "embedding"
        assert result.similarity == pytest.approx(1.0)


class TestSynonymDetection:
    @pytest.mark.asyncio
    async def test_high_similarity_synonym_dropped(self):
        embeddings = _fake_embeddings(
            {
                "dolor de cabeza": [1.0, 0.0, 0.0],
                "cefalea": [0.95, 0.31, 0.0],  # ~0.95 cosine
            }
        )
        d = EntitySemanticDeduper(embeddings=embeddings, similarity_threshold=0.86)
        await d.check_and_remember("symptom", "dolor de cabeza")
        result = await d.check_and_remember("symptom", "cefalea")
        assert result.is_duplicate
        assert result.matched_text == "dolor de cabeza"
        assert result.similarity > 0.86

    @pytest.mark.asyncio
    async def test_distinct_concepts_kept(self):
        embeddings = _fake_embeddings(
            {
                "fiebre": [1.0, 0.0, 0.0],
                "tos": [0.0, 1.0, 0.0],  # orthogonal -> sim 0
            }
        )
        d = EntitySemanticDeduper(embeddings=embeddings)
        await d.check_and_remember("symptom", "fiebre")
        result = await d.check_and_remember("symptom", "tos")
        assert not result.is_duplicate


class TestPerTypeIsolation:
    @pytest.mark.asyncio
    async def test_same_text_different_types_not_dup(self):
        embeddings = _fake_embeddings({"fiebre": [1.0, 0.0, 0.0]})
        d = EntitySemanticDeduper(embeddings=embeddings)
        await d.check_and_remember("symptom", "fiebre")
        result = await d.check_and_remember("diagnosis", "fiebre")
        assert not result.is_duplicate, "different types are independent"


class TestLLMTiebreaker:
    @pytest.mark.asyncio
    async def test_borderline_falls_to_llm_when_enabled(self):
        embeddings = _fake_embeddings(
            {
                "presión 140/90": [1.0, 0.0, 0.0],
                "tensión arterial 140/90": [0.81, 0.59, 0.0],  # ~0.81 — borderline
            }
        )
        d = EntitySemanticDeduper(
            embeddings=embeddings,
            similarity_threshold=0.86,
            llm_tiebreaker_low=0.78,
            enable_llm_tiebreaker=True,
        )
        with patch.object(
            EntitySemanticDeduper, "_llm_same_concept", AsyncMock(return_value=True)
        ):
            await d.check_and_remember("vital_sign", "presión 140/90")
            result = await d.check_and_remember("vital_sign", "tensión arterial 140/90")
        assert result.is_duplicate
        assert result.method == "llm_tiebreaker"

    @pytest.mark.asyncio
    async def test_borderline_kept_when_llm_says_no(self):
        embeddings = _fake_embeddings(
            {
                "presión 140/90": [1.0, 0.0, 0.0],
                "frecuencia cardiaca": [0.81, 0.59, 0.0],
            }
        )
        d = EntitySemanticDeduper(
            embeddings=embeddings,
            enable_llm_tiebreaker=True,
        )
        with patch.object(
            EntitySemanticDeduper, "_llm_same_concept", AsyncMock(return_value=False)
        ):
            await d.check_and_remember("vital_sign", "presión 140/90")
            result = await d.check_and_remember("vital_sign", "frecuencia cardiaca")
        assert not result.is_duplicate

    @pytest.mark.asyncio
    async def test_disabled_by_default(self):
        embeddings = _fake_embeddings(
            {
                "a": [1.0, 0.0, 0.0],
                "b": [0.81, 0.59, 0.0],
            }
        )
        d = EntitySemanticDeduper(embeddings=embeddings)  # default: LLM off
        with patch.object(
            EntitySemanticDeduper, "_llm_same_concept", AsyncMock(return_value=True)
        ) as mock_llm:
            await d.check_and_remember("symptom", "a")
            result = await d.check_and_remember("symptom", "b")
        assert not result.is_duplicate
        mock_llm.assert_not_awaited()


class TestErrorHandling:
    @pytest.mark.asyncio
    async def test_embedding_failure_treats_as_not_dup(self):
        embeddings = AsyncMock()
        embeddings.generate_query_embedding_async = AsyncMock(
            side_effect=RuntimeError("API down")
        )
        d = EntitySemanticDeduper(embeddings=embeddings)
        result = await d.check_and_remember("symptom", "fiebre")
        assert not result.is_duplicate
        assert result.method == "embedding_error"

    @pytest.mark.asyncio
    async def test_empty_text_passes(self):
        embeddings = _fake_embeddings({})
        d = EntitySemanticDeduper(embeddings=embeddings)
        result = await d.check_and_remember("symptom", "")
        assert not result.is_duplicate
        assert result.method == "empty"


class TestReset:
    @pytest.mark.asyncio
    async def test_reset_clears_state(self):
        embeddings = _fake_embeddings({"fiebre": [1.0, 0.0, 0.0]})
        d = EntitySemanticDeduper(embeddings=embeddings)
        await d.check_and_remember("symptom", "fiebre")
        d.reset()
        result = await d.check_and_remember("symptom", "fiebre")
        assert not result.is_duplicate, "state should be cleared after reset()"


class TestDecisionTruthiness:
    def test_truthy_when_dup(self):
        assert bool(DedupDecision(True)) is True

    def test_falsy_when_not_dup(self):
        assert bool(DedupDecision(False)) is False
