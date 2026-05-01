"""Tests for the Whisper hallucination filter."""
import pytest

from src.transcription.hallucination_filter import (
    FilterDecision,
    HallucinationFilter,
    _has_long_repetition,
    _normalise,
)


@pytest.fixture
def filt() -> HallucinationFilter:
    return HallucinationFilter()


class TestRealSpeech:
    def test_real_doctor_phrase_passes(self, filt):
        d = filt.check("El paciente presenta dolor de cabeza intenso.")
        assert not d.is_hallucination

    def test_medication_phrase_passes(self, filt):
        d = filt.check("Le receto paracetamol 500 miligramos cada 8 horas.")
        assert not d.is_hallucination

    def test_diagnosis_phrase_passes(self, filt):
        d = filt.check("Se le diagnostica resfriado común.")
        assert not d.is_hallucination


class TestSubtitleCredits:
    def test_amara_full_phrase(self, filt):
        d = filt.check("Subtítulos realizados por la comunidad de Amara.org")
        assert d.is_hallucination
        assert d.reason == "substring_pattern"

    def test_amara_inline_still_caught(self, filt):
        d = filt.check("Hola, esto es contenido y luego amara.org junk")
        assert d.is_hallucination

    def test_all_caps_subtitulo_credit(self, filt):
        d = filt.check("SUBTITULO SOLOCHILENOS40ALVERNESTO")
        assert d.is_hallucination
        assert d.reason == "all_caps_subtitulo"

    def test_subtitulado_por_comunidad(self, filt):
        d = filt.check("Subtitulado por la comunidad de Amara")
        assert d.is_hallucination


class TestChannelPromo:
    def test_subscribe_prompt(self, filt):
        d = filt.check("No olvides suscribirte al canal")
        assert d.is_hallucination

    def test_thanks_for_watching(self, filt):
        d = filt.check("Gracias por ver el video")
        assert d.is_hallucination


class TestPleasantries:
    @pytest.mark.parametrize(
        "phrase",
        [
            "Muchas gracias.",
            "Gracias.",
            "Hola.",
            "Adiós.",
            "Bueno.",
            "Sí.",
            "OK",
            "Ya",
        ],
    )
    def test_standalone_pleasantry(self, filt, phrase):
        d = filt.check(phrase)
        assert d.is_hallucination, f"{phrase!r} should be filtered"

    def test_pleasantry_inside_real_speech_passes(self, filt):
        d = filt.check("Muchas gracias doctor, me siento mejor con el tratamiento.")
        assert not d.is_hallucination


class TestSoundMarkers:
    @pytest.mark.parametrize(
        "phrase",
        [
            "[Música]",
            "(música)",
            "♪",
            "♪♪♪",
            "[Aplausos]",
            "[Risas]",
            "🎵",
        ],
    )
    def test_sound_markers(self, filt, phrase):
        d = filt.check(phrase)
        assert d.is_hallucination


class TestRepetitionLoops:
    def test_three_word_repeat(self, filt):
        d = filt.check("gracias gracias gracias gracias")
        assert d.is_hallucination
        assert d.reason == "repetition_loop"

    def test_two_word_phrase_repeat(self, filt):
        d = filt.check("muy bien muy bien muy bien muy bien")
        assert d.is_hallucination

    def test_repetition_helper(self):
        assert _has_long_repetition("a a a a")
        assert _has_long_repetition("hola hola hola")
        assert not _has_long_repetition("hola, ¿cómo está?")


class TestSameAsPrevious:
    def test_identical_consecutive_drops_second(self, filt):
        first = filt.check("El paciente presenta tos seca.")
        second = filt.check("El paciente presenta tos seca.")
        assert not first.is_hallucination
        assert second.is_hallucination
        assert second.reason == "same_as_previous_slice"

    def test_different_after_drop_passes(self, filt):
        filt.check("El paciente presenta tos seca.")
        filt.check("El paciente presenta tos seca.")
        third = filt.check("Le receto antitusivo.")
        assert not third.is_hallucination


class TestWhisperConfidenceSignals:
    def test_high_no_speech_prob_drops(self, filt):
        segments = [
            {"no_speech_prob": 0.9, "avg_logprob": -0.2},
            {"no_speech_prob": 0.85, "avg_logprob": -0.3},
        ]
        d = filt.check("looks plausible", segments=segments)
        assert d.is_hallucination
        assert d.reason == "high_no_speech_prob"

    def test_normal_no_speech_prob_passes(self, filt):
        segments = [
            {"no_speech_prob": 0.05, "avg_logprob": -0.2},
            {"no_speech_prob": 0.1, "avg_logprob": -0.25},
        ]
        d = filt.check("El paciente tiene fiebre.", segments=segments)
        assert not d.is_hallucination

    def test_low_avg_logprob_drops(self, filt):
        segments = [
            {"no_speech_prob": 0.2, "avg_logprob": -1.5},
            {"no_speech_prob": 0.15, "avg_logprob": -1.4},
        ]
        d = filt.check("looks plausible", segments=segments)
        assert d.is_hallucination
        assert d.reason == "low_avg_logprob"

    def test_object_segments_supported(self, filt):
        class _Seg:
            def __init__(self, n, l):
                self.no_speech_prob = n
                self.avg_logprob = l

        segments = [_Seg(0.9, -0.2), _Seg(0.95, -0.3)]
        d = filt.check("plausible text", segments=segments)
        assert d.is_hallucination


class TestEmpty:
    def test_empty_string(self, filt):
        d = filt.check("")
        assert d.is_hallucination
        assert d.reason == "empty"

    def test_whitespace_only(self, filt):
        d = filt.check("   \n  ")
        assert d.is_hallucination


class TestNormalise:
    def test_strips_punctuation(self):
        assert _normalise("¡Hola!") == "hola"
        assert _normalise("Gracias.") == "gracias"
        assert _normalise("  Adiós…  ") == "adiós"


class TestReset:
    def test_reset_clears_last_emitted(self, filt):
        filt.check("repeat me")
        d_before_reset = filt.check("repeat me")
        assert d_before_reset.is_hallucination
        filt.reset()
        d_after_reset = filt.check("repeat me")
        assert not d_after_reset.is_hallucination


class TestDecisionTruthiness:
    def test_truthy_when_hallucination(self):
        d = FilterDecision(True, "x")
        assert bool(d) is True

    def test_falsy_when_clean(self):
        d = FilterDecision(False)
        assert bool(d) is False
