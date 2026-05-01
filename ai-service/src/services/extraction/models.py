"""
Modelos de datos para extracción incremental médica.
"""
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EntityType(str, Enum):
    """Tipos de entidades médicas."""

    MEDICATION = "medication"
    SYMPTOM = "symptom"
    DIAGNOSIS = "diagnosis"
    PROCEDURE = "procedure"
    VITAL_SIGN = "vital_sign"
    ALLERGY = "allergy"
    CHIEF_COMPLAINT = "chief_complaint"


class ExtractionPriority(str, Enum):
    """Prioridad para RAG validation."""

    CRITICAL = "critical"  # Prescriptions, drug interactions - <1s
    HIGH = "high"          # Diagnoses, procedures - <2s
    MEDIUM = "medium"      # Symptoms, vital signs - <3s


class MedicationEntity(BaseModel):
    """Medicamento extraído."""

    id: Optional[str] = None
    name: str = Field(description="Nombre del medicamento")
    dosage: Optional[str] = Field(None, description="Dosis, ej: '500mg'")
    frequency: Optional[str] = Field(None, description="Frecuencia, ej: 'cada 8h'")
    duration: Optional[str] = Field(None, description="Duración del tratamiento")
    route: Optional[str] = Field(None, description="Vía: oral, IV, IM, etc.")
    instructions: Optional[str] = Field(None, description="Instrucciones adicionales")
    is_new_prescription: bool = Field(True, description="Nueva prescripción o continuación")
    extracted_from: Optional[str] = Field(None, description="Snippet de transcripción")
    timestamp: float = Field(description="Timestamp de extracción")
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class SymptomEntity(BaseModel):
    """Síntoma extraído."""

    id: Optional[str] = None
    description: str = Field(description="Descripción del síntoma")
    location: Optional[str] = Field(None, description="Localización corporal")
    severity: Optional[str] = Field(None, description="leve, moderado, severo")
    duration: Optional[str] = Field(None, description="Duración del síntoma")
    frequency: Optional[str] = Field(None, description="constante, intermitente, etc.")
    extracted_from: Optional[str] = None
    timestamp: float
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class DiagnosisEntity(BaseModel):
    """Diagnóstico extraído."""

    id: Optional[str] = None
    description: str = Field(description="Descripción del diagnóstico")
    status: str = Field(description="confirmado, sospechado, descartado, antecedente")
    icd10_code: Optional[str] = Field(None, description="Código CIE-10 si es obvio")
    extracted_from: Optional[str] = None
    timestamp: float
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ChiefComplaintEntity(BaseModel):
    """Motivo principal de consulta."""

    id: Optional[str] = None
    complaint: str = Field(description="Motivo principal")
    extracted_from: Optional[str] = None
    timestamp: float
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ExtractionEvent(BaseModel):
    """Evento de extracción para WebSocket."""

    event_type: str
    entity_type: EntityType
    entity_data: dict
    priority: ExtractionPriority
    timestamp: float
    session_id: str
