"""LLM-based compound-entity splitter.

The extractor sometimes returns compound clinical entities like
"fiebre y dolor de cabeza" alongside the atomics it already extracted
("fiebre", "dolor de cabeza"). Because the React UI is append-only, once
a compound has been emitted we can't retract it, so the user sees both
the compound and the atomics — looks like a duplicate.

This module splits compound phrases into atomics BEFORE they reach the
WebSocket dedup pipeline. Strategy:

1. Heuristic short-circuit: if the text shows no compound markers
   (" y ", " e ", ", " followed by a clinical word), pass through
   unchanged. Avoids an LLM call for the common case.
2. Otherwise, ask gpt-4o-mini to split into atomics. Cheap (~$0.0001)
   and fast (~400 ms).

Failure modes are handled by returning the original text unchanged so
nothing is lost on LLM error.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import List, Optional

import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


# Markers that suggest a phrase is compound. The heuristic deliberately
# err on the side of "looks compound" — false positives just mean an
# extra LLM call (cheap), false negatives mean a duplicate slipping
# through (the bug we're trying to fix).
_COMPOUND_MARKERS = (" y ", " e ", ", ", "; ", " junto con ", " además de ")


def _looks_compound(text: str) -> bool:
    """Cheap heuristic: does the text look like multiple atomics joined?"""
    lo = text.lower().strip()
    if any(m in lo for m in _COMPOUND_MARKERS):
        return True
    return False


@dataclass
class AtomicEntitySplitter:
    """Splits compound clinical entities into atomic ones via LLM."""

    model: str = "gpt-4o-mini"
    temperature: float = 0.0

    async def split(self, text: str, entity_type: str) -> List[str]:
        """Return one or more atomic phrases for the given entity content.

        For non-compound input, returns ``[text]`` after the heuristic
        short-circuit (no LLM call). For compound input, calls the LLM;
        on any error, falls back to ``[text]`` so the caller never loses
        data.
        """
        text = text.strip()
        if not text:
            return []
        if not _looks_compound(text):
            return [text]

        atomics = await self._llm_split(text, entity_type)
        if not atomics:
            return [text]
        # Dedupe within the LLM output and preserve order.
        seen = set()
        out: List[str] = []
        for a in atomics:
            a_norm = a.strip().lower()
            if a_norm and a_norm not in seen:
                seen.add(a_norm)
                out.append(a.strip())
        return out or [text]

    async def _llm_split(self, text: str, entity_type: str) -> Optional[List[str]]:
        """Ask the model to split. Returns None on any error."""
        try:
            from openai import AsyncOpenAI

            settings = get_settings()
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            prompt = self._build_prompt(text, entity_type)
            response = await client.chat.completions.create(
                model=self.model,
                temperature=self.temperature,
                max_tokens=200,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You split compound Spanish clinical phrases into "
                            "atomic clinical entities. Output strict JSON with "
                            'a single key "atomics" mapping to an array of '
                            "Spanish strings. Each atomic must be a single, "
                            "minimal clinical concept (one symptom, one "
                            "medication, one diagnosis). Do not add words "
                            "that were not in the input. Preserve clinically "
                            "relevant qualifiers (location, severity, dose). "
                            'Example input: "fiebre y dolor de cabeza" → '
                            '{"atomics": ["fiebre", "dolor de cabeza"]}. '
                            'Example input: "paracetamol 500mg cada 8 horas" '
                            '→ {"atomics": ["paracetamol 500mg cada 8 horas"]} '
                            "(single atomic, do not split a dose specifier)."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            content = response.choices[0].message.content or ""
            parsed = json.loads(content)
            atomics = parsed.get("atomics")
            if not isinstance(atomics, list):
                return None
            cleaned = [str(a).strip() for a in atomics if str(a).strip()]
            return cleaned or None
        except Exception:
            logger.exception("Atomic-split LLM call failed", text=text)
            return None

    @staticmethod
    def _build_prompt(text: str, entity_type: str) -> str:
        return (
            f'Entity type: {entity_type}\n'
            f'Input phrase: "{text}"\n'
            "Split into atomic clinical entities. Return JSON: "
            '{"atomics": [...]}'
        )
