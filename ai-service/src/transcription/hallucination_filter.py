"""Filter for Whisper hallucinations.

Whisper, when fed silence or low-information audio, falls back to phrases
from its training data. Common patterns observed in dev:

- YouTube subtitle credits ("Subtítulos realizados por la comunidad de
  Amara.org", "SUBTITULO SOLOCHILENOS40 AL VERNESTO").
- Channel promotion ("No olvides suscribirte", "Gracias por ver el video").
- Generic pleasantries on near-silence ("Muchas gracias.", "Adiós.").
- Repetition loops ("gracias. gracias. gracias. gracias.").
- Sound markers ("[Música]", "♪").

These are NEVER what a doctor said. Emitting them into a medical record is
a data-integrity issue. This module gives the WebSocket layer one
`HallucinationFilter` to consult.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Tuple


_SUBSTRING_PATTERNS: Tuple[str, ...] = (
    "amara.org",
    "subtítulos realizados",
    "subtítulos por la comunidad",
    "subtitulado por la comunidad",
    "subtítulos en español",
    "subtítulos creados",
    "gracias por ver el video",
    "gracias por ver este video",
    "no olvides suscribirte",
    "suscríbete al canal",
    "dale like",
    "comparte este video",
    "www.mooji.org",
    "transcripción realizada por",
    "subtitulos por",
    "sub. español",
)

# Whole-string matches (after normalising punctuation/whitespace). These
# fire when the *entire* slice transcribes to a short pleasantry, which is
# almost always Whisper hallucinating on silence — not a doctor whose only
# 5-second utterance was "Hola.".
_PLEASANTRY_FULL_MATCHES = frozenset(
    {
        "muchas gracias",
        "muchas gracias por ver",
        "gracias",
        "hasta luego",
        "adiós",
        "adios",
        "bye",
        "okay",
        "ok",
        "hola",
        "buenas",
        "buenos días",
        "buenas tardes",
        "sí",
        "si",
        "no",
        "claro",
        "bueno",
        "vale",
        "ya",
        "ajá",
        "mhm",
        "uhm",
    }
)

# Sound/music markers Whisper emits in brackets when the audio is
# non-speech.
_BRACKET_MARKER_RE = re.compile(
    r"^\s*[\[\(\<]?\s*(música|musica|aplausos|risas|silencio|ruido|tos|sound|music|applause|laughter)\s*[\]\)\>]?\s*$",
    re.IGNORECASE,
)
# Lone musical-note glyphs used by Whisper for music.
_MUSIC_GLYPH_RE = re.compile(r"^[\s♪♫🎵🎶]+$")


def _normalise(text: str) -> str:
    """Lowercase + strip surrounding whitespace and surrounding punctuation."""
    return text.strip().lower().strip(" .,!¡?¿…\"'")


def _has_long_repetition(text: str, *, min_repeats: int = 3) -> bool:
    """Return True if a short phrase repeats >= min_repeats times in a row.

    Catches Whisper's "gracias. gracias. gracias." failure mode.
    """
    tokens = re.split(r"[\s,.;:!¡?¿]+", text.strip().lower())
    tokens = [t for t in tokens if t]
    if len(tokens) < min_repeats:
        return False
    # 1-token and 2-token rolling repetition windows.
    for window in (1, 2, 3):
        if len(tokens) < window * min_repeats:
            continue
        for start in range(len(tokens) - window * min_repeats + 1):
            phrase = tokens[start : start + window]
            ok = True
            for k in range(1, min_repeats):
                if tokens[start + k * window : start + (k + 1) * window] != phrase:
                    ok = False
                    break
            if ok:
                return True
    return False


@dataclass
class FilterDecision:
    """Result of asking the filter about a single transcription slice."""
    is_hallucination: bool
    reason: str = ""

    def __bool__(self) -> bool:  # truthy if it IS a hallucination
        return self.is_hallucination


@dataclass
class HallucinationFilter:
    """Stateful filter consulted once per Whisper response.

    The session-scoped state (``_last_emitted``) lets us suppress
    same-as-last outputs that almost always indicate Whisper repeating its
    fallback on continued silence. Construct one per WebSocket session.
    """

    no_speech_prob_threshold: float = 0.6
    avg_logprob_threshold: float = -1.0
    repetition_min_repeats: int = 3
    _last_emitted: str = field(default="", init=False, repr=False)

    def reset(self) -> None:
        """Forget last-emitted state (use between sessions)."""
        self._last_emitted = ""

    def check(
        self,
        text: str,
        *,
        segments: Optional[Iterable[dict]] = None,
    ) -> FilterDecision:
        """Decide whether to drop a Whisper response.

        Args:
            text: ``response.text`` from a Whisper transcription.
            segments: ``response.segments`` (verbose_json) — list of dicts
                with ``no_speech_prob`` and ``avg_logprob`` keys, when
                available. Pass ``None`` if not using ``verbose_json``.
        """
        raw = (text or "").strip()
        if not raw:
            return FilterDecision(True, "empty")

        norm = _normalise(raw)
        lo = raw.lower()

        if any(p in lo for p in _SUBSTRING_PATTERNS):
            return FilterDecision(True, "substring_pattern")

        # YouTube subtitle credit lines: ALL CAPS starting with SUBTITUL*
        if raw.isupper() and raw.lstrip().upper().startswith("SUBTITUL"):
            return FilterDecision(True, "all_caps_subtitulo")

        if _MUSIC_GLYPH_RE.match(raw) or _BRACKET_MARKER_RE.match(raw):
            return FilterDecision(True, "sound_marker")

        if norm in _PLEASANTRY_FULL_MATCHES:
            return FilterDecision(True, "standalone_pleasantry")

        if _has_long_repetition(raw, min_repeats=self.repetition_min_repeats):
            return FilterDecision(True, "repetition_loop")

        if segments is not None:
            segs = self._segments_as_dicts(segments)
            if segs:
                # Whisper's own confidence signals. If most of the slice
                # is non-speech or the average logprob is very negative,
                # the text is almost certainly hallucinated.
                if self._mostly_no_speech(segs):
                    return FilterDecision(True, "high_no_speech_prob")
                if self._very_low_logprob(segs):
                    return FilterDecision(True, "low_avg_logprob")

        if norm and norm == self._last_emitted:
            return FilterDecision(True, "same_as_previous_slice")

        self._last_emitted = norm
        return FilterDecision(False)

    @staticmethod
    def _segments_as_dicts(segments: Iterable) -> List[dict]:
        """Whisper SDK returns objects; tests pass dicts. Normalise."""
        out: List[dict] = []
        for s in segments:
            if isinstance(s, dict):
                out.append(s)
            else:
                out.append(
                    {
                        "no_speech_prob": getattr(s, "no_speech_prob", None),
                        "avg_logprob": getattr(s, "avg_logprob", None),
                    }
                )
        return out

    def _mostly_no_speech(self, segs: List[dict]) -> bool:
        probs = [s.get("no_speech_prob") for s in segs]
        probs = [p for p in probs if isinstance(p, (int, float))]
        if not probs:
            return False
        # If the *median* segment is mostly silence, the whole slice is.
        probs.sort()
        median = probs[len(probs) // 2]
        return median >= self.no_speech_prob_threshold

    def _very_low_logprob(self, segs: List[dict]) -> bool:
        probs = [s.get("avg_logprob") for s in segs]
        probs = [p for p in probs if isinstance(p, (int, float))]
        if not probs:
            return False
        avg = sum(probs) / len(probs)
        return avg <= self.avg_logprob_threshold
