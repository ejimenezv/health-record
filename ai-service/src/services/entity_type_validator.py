"""LLM-based entity-type validator.

The extractor sometimes misclassifies clinical entities (e.g., putting
"resfriado común" — a diagnosis — into the symptoms list). String-based
forbidden-prefix heuristics catch obvious cases like "diagnóstico de X"
but miss bare misclassifications like "resfriado común" as a symptom.

This module asks gpt-4o-mini, per entity, whether the candidate type is
correct. If not, it returns the type the LLM thinks the content actually
belongs to, so the WS layer can either reclassify or drop the entity.

Cost: ~50 tokens in + ~10 tokens out per entity. With gpt-4o-mini at
~$0.15 / 1M input tokens that's ~$0.0001 per call. For a 5-min session
with 20 entities: ~$0.002. Negligible.

Latency: ~300–600 ms per call. Adds noticeable but acceptable lag to
entity emission, which is already gated behind a ~5 s slice.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

import structlog
from openai import AsyncOpenAI

from src.core.config import get_settings

logger = structlog.get_logger()


# Types we currently surface to React (mirrors _PY_TO_REACT_ENTITY_TYPE
# in the WS handler). Validator only ever returns one of these strings;
# if the LLM returns something else, we treat it as "I don't know" and
# default to the original type.
_KNOWN_TYPES: tuple[str, ...] = (
    "symptom",
    "diagnosis",
    "medication",
    "vital_sign",
    "allergy",
    "procedure",
    "chief_complaint",
)


@dataclass
class ValidationResult:
    """Outcome of a type validation."""
    is_correct: bool
    suggested_type: Optional[str] = None
    confidence: float = 0.0
    reason: str = ""

    def __bool__(self) -> bool:
        return self.is_correct


@dataclass
class EntityTypeValidator:
    """Asks gpt-4o-mini whether a clinical phrase matches a candidate type."""

    model: str = "gpt-4o-mini"
    temperature: float = 0.0

    async def validate(self, content: str, candidate_type: str) -> ValidationResult:
        """Return whether ``content`` is a ``candidate_type``.

        On any error or unexpected LLM response, returns
        ``ValidationResult(is_correct=True)`` so we err on the side of
        keeping the entity. Dropping a real clinical finding is worse
        than showing one slightly miscategorized.
        """
        content = (content or "").strip()
        if not content:
            return ValidationResult(False, reason="empty")
        if candidate_type not in _KNOWN_TYPES:
            return ValidationResult(True, reason="unknown_candidate_type")

        try:
            settings = get_settings()
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.chat.completions.create(
                model=self.model,
                temperature=self.temperature,
                max_tokens=80,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f'Phrase: "{content}"\n'
                            f'Candidate type: {candidate_type}\n'
                            'Is the candidate type correct? Return JSON.'
                        ),
                    },
                ],
            )
            content_out = response.choices[0].message.content or "{}"
            parsed = json.loads(content_out)
        except Exception:
            logger.exception("Type validator LLM call failed", content=content)
            return ValidationResult(True, reason="llm_error")

        is_correct = bool(parsed.get("correct"))
        suggested = parsed.get("actual_type")
        if isinstance(suggested, str):
            suggested = suggested.strip().lower()
            if suggested not in _KNOWN_TYPES:
                suggested = None
        else:
            suggested = None
        confidence = parsed.get("confidence", 0.0)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.0

        return ValidationResult(
            is_correct=is_correct,
            suggested_type=suggested,
            confidence=confidence,
            reason="llm",
        )


_SYSTEM_PROMPT = (
    "You classify Spanish clinical phrases into one of these types:\n"
    "  - symptom: what the patient feels or experiences "
    "(dolor de cabeza, fiebre, tos, náuseas, mareo)\n"
    "  - diagnosis: a clinical condition or disease named by the doctor "
    "(resfriado común, gripe, hipertensión, diabetes, neumonía, "
    "faringitis, otitis)\n"
    "  - medication: a drug, INCLUDING brand names commonly used in "
    "Spanish-speaking countries (Latin America and Spain). Generic "
    "examples: paracetamol, ibuprofeno, amoxicilina. Brand-name examples "
    "you must recognize: Tempra, Tylenol, Panadol, Apronax, Advil, "
    "Aspirina, Aspirinetas, Mejoral, Bayer, Vick VapoRub, Buscapina, "
    "Plidan, Sertal, Atamel, Doloneurobión, Dolex, Dolofin, Nolotil, "
    "Frenadol, Iliadin, Vicks, Meritene, Algidol, Termalgin, Ben-Gay, "
    "Gelocatil, Aspirina C. If the phrase is a single capitalized or "
    "proper-noun-like word that doesn't clearly mean a symptom or a "
    "disease in Spanish, prefer 'medication' over 'symptom' — Spanish "
    "speakers often refer to medications by brand name only (e.g. "
    "'le receté Tempra' = 'I prescribed paracetamol').\n"
    "  - vital_sign: a measurement (presión arterial 140/90, "
    "temperatura 38°C, frecuencia cardiaca 90)\n"
    "  - allergy: a known allergy (alergia a penicilina)\n"
    "  - procedure: a procedure performed (radiografía, sutura, biopsia)\n"
    "  - chief_complaint: the main reason for the visit, often a sentence\n\n"
    "You receive a phrase and a candidate type. Decide if the candidate "
    "type is correct.\n\n"
    'Return strict JSON: {"correct": true|false, "actual_type": '
    '"<one of the types above>", "confidence": 0.0-1.0}\n\n'
    'If correct=true, "actual_type" should equal the candidate.\n'
    'If correct=false, "actual_type" must be the type you believe is '
    "right.\n\n"
    "Crucial distinctions:\n"
    "  - 'fiebre' alone is a symptom (patient feels it). 'fiebre alta' "
    "is also a symptom. But 'fiebre tifoidea' is a diagnosis.\n"
    "  - 'resfriado común', 'gripe', 'COVID-19', 'rinitis', "
    "'amigdalitis' are diagnoses, not symptoms.\n"
    "  - 'dolor de cabeza' is a symptom. 'cefalea tensional' is a "
    "diagnosis.\n"
    "  - A measurement with units (mg, °C, mmHg, /min) is usually a "
    "vital_sign or medication, never a symptom.\n"
    "  - Brand-name medications ('Tempra', 'Tylenol', 'Panadol', etc.) "
    "classified as 'symptom' MUST be reclassified to 'medication'. "
    "Brand names are never symptoms.\n"
    "  - 'jarabe para la tos', 'jarabe', 'gotas', 'crema', 'pomada' "
    "are dosage forms — they are medications, never symptoms.\n"
    "  - When in doubt about a single proper-noun-like word that's not "
    "obviously a symptom or disease in Spanish, lean toward 'medication' "
    "with confidence around 0.75."
)
