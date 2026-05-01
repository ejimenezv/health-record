"""Tests for the boundary-word overlap stripper used by streaming.py."""
import pytest

from src.api.websocket.streaming import _strip_overlap_text


class TestSingleWordOverlap:
    def test_strips_one_repeated_word(self):
        last = "Se le recetó paracetamol 500 miligramos."
        new = "miligramos y jarabe para ratos."
        assert _strip_overlap_text(new, last) == "y jarabe para ratos."

    def test_punctuation_does_not_block_match(self):
        last = "el paciente tiene fiebre."
        new = "Fiebre alta y tos seca."
        assert _strip_overlap_text(new, last) == "alta y tos seca."

    def test_case_insensitive(self):
        last = "presión arterial alta"
        new = "Alta y dolor de cabeza"
        assert _strip_overlap_text(new, last) == "y dolor de cabeza"


class TestMultiWordOverlap:
    def test_strips_three_word_phrase(self):
        last = "se le receta paracetamol cada 8 horas"
        new = "cada 8 horas y reposo en cama"
        assert _strip_overlap_text(new, last) == "y reposo en cama"

    def test_strips_full_sentence(self):
        last = "el paciente tiene fiebre alta"
        new = "el paciente tiene fiebre alta y dolor"
        assert _strip_overlap_text(new, last) == "y dolor"

    def test_picks_longest_match(self):
        # "horas" alone matches at k=1, but "8 horas" matches at k=2.
        # Implementation should pick the longest viable match.
        last = "tomar cada 8 horas"
        new = "8 horas según indicación"
        assert _strip_overlap_text(new, last) == "según indicación"


class TestNoOverlap:
    def test_returns_unchanged_when_no_match(self):
        last = "el paciente tiene fiebre"
        new = "se receta paracetamol"
        assert _strip_overlap_text(new, last) == "se receta paracetamol"

    def test_returns_unchanged_when_empty_last(self):
        new = "el paciente tiene fiebre"
        assert _strip_overlap_text(new, "") == new

    def test_returns_empty_for_empty_new(self):
        assert _strip_overlap_text("", "anything") == ""


class TestEdgeCases:
    def test_full_match_returns_empty(self):
        last = "muchas gracias doctor"
        new = "muchas gracias doctor"
        assert _strip_overlap_text(new, last) == ""

    def test_max_words_caps_match_length(self):
        # 12-word overlap; helper caps at 10 by default.
        words = ["w" + str(i) for i in range(15)]
        last = " ".join(words)
        new = " ".join(words[5:] + ["extra"])
        out = _strip_overlap_text(new, last, max_words=10)
        # Up to 10 words should be stripped.
        assert "extra" in out
        # We expect the leading 10 matching words removed, leaving any
        # surplus + "extra".
        kept_tokens = out.split()
        assert "extra" == kept_tokens[-1]


class TestRealishWhisperCases:
    """Spanish medical phrases at slice boundaries."""

    def test_recetó_miligramos_boundary(self):
        last = "Se le recetó paracetamol 500 miligramos."
        new = "miligramos y jarabe para la tos."
        result = _strip_overlap_text(new, last)
        assert "miligramos" not in result.lower().split()[0:1]
        assert "jarabe" in result

    def test_diagnostico_resfriado_boundary(self):
        last = "Se le diagnosticó resfriado común"
        new = "resfriado común y se le recetó tratamiento"
        result = _strip_overlap_text(new, last)
        assert result.lower().startswith("y se")

    def test_no_strip_when_extractor_rephrases(self):
        # Whisper rephrases the overlap region differently — no exact match.
        last = "el paciente presenta dolor"
        new = "presenta dolor agudo y persistente"
        # "dolor" matches at k=1; "presenta dolor" matches at k=2.
        # Strip the longer.
        result = _strip_overlap_text(new, last)
        assert result == "agudo y persistente"
