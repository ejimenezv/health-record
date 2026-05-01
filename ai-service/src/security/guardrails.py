"""
Guardrails para validación de input/output.
Protege contra prompt injection y contenido inapropiado.
"""
import re

from fastapi import HTTPException, status

from src.utils.logger import get_logger

logger = get_logger(__name__)

# Patterns that might indicate prompt injection
INJECTION_PATTERNS = [
    r"ignore\s+(previous|above|all)\s+instructions",
    r"disregard\s+(previous|above|all)",
    r"you\s+are\s+now",
    r"new\s+instructions",
    r"forget\s+(everything|all)",
    r"system\s*:\s*",
    r"assistant\s*:\s*",
]


def validate_input(text: str) -> None:
    """
    Validate input text for potential injection attacks.
    Raises HTTPException if suspicious patterns detected.
    """
    text_lower = text.lower()

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text_lower):
            logger.warning(
                "Potential prompt injection detected",
                extra={"pattern": pattern, "text_preview": text[:100]},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input contains potentially harmful content",
            )


def sanitize_output(text: str) -> str:
    """
    Sanitize LLM output to remove potential PII or sensitive data.
    """
    # DNI pattern (Spanish)
    text = re.sub(r"\b\d{8}[A-Z]\b", "[DNI REDACTED]", text)
    # Phone numbers
    text = re.sub(r"\b\d{9}\b", "[PHONE REDACTED]", text)
    # Email
    text = re.sub(r"\b[\w.-]+@[\w.-]+\.\w+\b", "[EMAIL REDACTED]", text)
    return text
