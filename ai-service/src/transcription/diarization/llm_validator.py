import json
from typing import Any, Optional

import structlog

from src.transcription.diarization.models import (
    ConsultationContext,
    SpeakerAssignment,
    SpeakerRole,
    SpeakerState,
)

logger = structlog.get_logger()


class LLMSpeakerValidator:
    """LLM validator for low-confidence role assignments. Duck-typed LLM client."""

    def __init__(self, llm_client: Any):
        self.llm_client = llm_client

    async def validate_roles(
        self,
        state: SpeakerState,
        recent_transcript: str,
        context: Optional[ConsultationContext] = None,
    ) -> SpeakerAssignment:
        prompt = self._build_validation_prompt(state, recent_transcript, context)

        try:
            response = await self.llm_client.complete(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                model="gpt-4o-mini",
                max_tokens=300,
                temperature=0.1,
            )
            content = getattr(response, "content", response)
            result = self._parse_response(content)

            logger.info(
                "LLM speaker validation complete",
                assignments={k: v.value for k, v in result.speakers.items()},
                confidence=result.confidence,
            )
            return result

        except Exception as e:
            logger.error("LLM speaker validation failed", error=str(e))
            current_assignments = {k: v.role for k, v in state.speakers.items()}
            return SpeakerAssignment(
                speakers=current_assignments,
                confidence=0.5,
                method="llm_validation_failed",
                reasoning=f"LLM validation failed: {str(e)}",
            )

    def _get_system_prompt(self) -> str:
        return """Eres un experto en análisis de conversaciones médicas.
Tu tarea es validar o corregir la asignación de roles (médico vs paciente) en una transcripción en progreso.

Analiza el contenido, el tipo de preguntas, las respuestas, y el uso de terminología médica para determinar si las asignaciones actuales son correctas.

Responde SIEMPRE en formato JSON válido."""

    def _build_validation_prompt(
        self,
        state: SpeakerState,
        recent_transcript: str,
        context: Optional[ConsultationContext] = None,
    ) -> str:
        current_assignments = {k: v.role.value for k, v in state.speakers.items()}
        current_confidence = {k: round(v.confidence, 2) for k, v in state.speakers.items()}

        context_info = ""
        if context:
            context_info = f"""
Contexto adicional:
- Tipo de cita: {context.appointment_type}
- Participantes esperados: {context.expected_speakers}
"""

        return f"""Estamos procesando una consulta médica en tiempo real.
Nuestro sistema heurístico ha asignado los siguientes roles a los hablantes, pero la confianza es baja:

Asignaciones actuales:
{json.dumps(current_assignments, indent=2)}

Nivel de confianza:
{json.dumps(current_confidence, indent=2)}

{context_info}

Transcripción reciente (últimos ~30 segundos):
{recent_transcript}

Por favor valida o corrige estas asignaciones de roles.

Responde en formato JSON con la siguiente estructura:
{{
    "speakers": {{
        "SPEAKER_0": "doctor" o "patient",
        "SPEAKER_1": "doctor" o "patient"
    }},
    "confidence": 0.0 a 1.0,
    "reasoning": "Explicación breve"
}}
"""

    def _parse_response(self, response: str) -> SpeakerAssignment:
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)

                speakers = {}
                for speaker_id, role in data.get("speakers", {}).items():
                    if role.lower() == "doctor":
                        speakers[speaker_id] = SpeakerRole.DOCTOR
                    elif role.lower() == "patient":
                        speakers[speaker_id] = SpeakerRole.PATIENT
                    else:
                        speakers[speaker_id] = SpeakerRole.OTHER

                return SpeakerAssignment(
                    speakers=speakers,
                    confidence=data.get("confidence", 0.8),
                    method="llm",
                    reasoning=data.get("reasoning", ""),
                )
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("Failed to parse LLM response", error=str(e))

        return SpeakerAssignment(
            speakers={
                "SPEAKER_0": SpeakerRole.DOCTOR,
                "SPEAKER_1": SpeakerRole.PATIENT,
            },
            confidence=0.5,
            method="llm_parse_error",
        )
