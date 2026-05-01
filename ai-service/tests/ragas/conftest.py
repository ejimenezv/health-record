"""RAGAS evaluation configuration and fixtures."""
from __future__ import annotations

import pytest
from datasets import Dataset


@pytest.fixture
def spanish_medical_qa_dataset() -> Dataset:
    """Spanish medical Q&A dataset for RAGAS evaluation."""
    data = {
        "question": [
            "¿Cuáles son las contraindicaciones del ibuprofeno?",
            "¿Qué dosis de paracetamol se recomienda para adultos?",
            "¿Cuál es el código CIE-10 para migraña?",
            "¿Qué es la cefalea tensional?",
            "¿Puede el ibuprofeno tomarse con anticoagulantes?",
            "¿Cuáles son los síntomas de la hipertensión arterial?",
            "¿Qué medicamentos son AINEs?",
            "¿Cuál es la diferencia entre migraña y cefalea tensional?",
        ],
        "answer": [
            "Las principales contraindicaciones del ibuprofeno incluyen úlcera péptica activa, insuficiencia renal severa, alergia conocida a AINEs, y tercer trimestre del embarazo.",
            "La dosis recomendada de paracetamol para adultos es de 500-1000mg cada 6-8 horas, sin exceder 4000mg en 24 horas.",
            "El código CIE-10 para migraña sin especificación es G43.9.",
            "La cefalea tensional es un tipo de dolor de cabeza caracterizado por dolor bilateral de tipo opresivo, generalmente leve a moderado.",
            "No se recomienda el uso concomitante de ibuprofeno con anticoagulantes debido al aumento del riesgo de sangrado.",
            "La hipertensión arterial es generalmente asintomática, pero en algunos casos puede causar dolor de cabeza, mareos, visión borrosa o sangrado nasal.",
            "Los AINEs (Antiinflamatorios No Esteroideos) incluyen ibuprofeno, naproxeno, diclofenaco, ketoprofeno y ácido acetilsalicílico (aspirina).",
            "La migraña se caracteriza por dolor pulsátil unilateral, de moderado a severo, con náuseas y fotofobia. La cefalea tensional es bilateral, opresiva y de menor intensidad.",
        ],
        "contexts": [
            [
                "Ibuprofeno - Contraindicaciones: Úlcera péptica activa, insuficiencia renal severa, hipersensibilidad conocida a AINEs, tercer trimestre del embarazo.",
                "Los AINEs están contraindicados en pacientes con antecedentes de reacciones alérgicas a estos medicamentos.",
            ],
            [
                "Paracetamol - Dosis adultos: 500-1000mg cada 4-6 horas. Dosis máxima diaria: 4000mg.",
                "No exceder la dosis máxima de paracetamol para evitar hepatotoxicidad.",
            ],
            [
                "Migraña, sin especificación - CIE-10: G43.9",
                "Migraña con aura - CIE-10: G43.1. Migraña sin aura - CIE-10: G43.0",
            ],
            [
                "Cefalea tensional (G44.2): Dolor de cabeza bilateral, de tipo opresivo, leve a moderado. No se acompaña de náuseas ni fotofobia.",
                "La cefalea tensional es el tipo más común de dolor de cabeza primario.",
            ],
            [
                "Ibuprofeno - Interacciones: Anticoagulantes (aumenta riesgo de sangrado), antihipertensivos (reduce eficacia), litio (aumenta niveles).",
                "El uso concomitante de AINEs y anticoagulantes requiere monitoreo cuidadoso.",
            ],
            [
                "Hipertensión arterial - Síntomas: Generalmente asintomática. Ocasionalmente: cefalea, mareos, visión borrosa, epistaxis.",
                "La HTA es conocida como 'asesino silencioso' por ser mayormente asintomática.",
            ],
            [
                "AINEs: Ibuprofeno, naproxeno, diclofenaco, ketoprofeno, indometacina, piroxicam, ácido acetilsalicílico (aspirina).",
                "Los AINEs actúan inhibiendo la ciclooxigenasa (COX), reduciendo la producción de prostaglandinas.",
            ],
            [
                "Migraña: Dolor pulsátil, unilateral, moderado-severo, 4-72 horas, con náuseas, fotofobia, fonofobia. Empeora con actividad física.",
                "Cefalea tensional: Dolor opresivo, bilateral, leve-moderado, 30 min-7 días, sin náuseas. No empeora con actividad.",
            ],
        ],
        "ground_truth": [
            "Las contraindicaciones del ibuprofeno incluyen úlcera péptica activa, insuficiencia renal severa, alergia a AINEs y tercer trimestre de embarazo.",
            "La dosis de paracetamol en adultos es 500-1000mg cada 4-6 horas, máximo 4000mg/día.",
            "G43.9",
            "La cefalea tensional es un dolor de cabeza bilateral y opresivo.",
            "No, aumenta el riesgo de sangrado.",
            "La hipertensión es mayormente asintomática, pero puede causar cefalea, mareos o visión borrosa.",
            "Ibuprofeno, naproxeno, diclofenaco, aspirina, entre otros.",
            "La migraña es pulsátil, unilateral y severa con náuseas. La cefalea tensional es opresiva, bilateral y leve.",
        ],
    }
    return Dataset.from_dict(data)


@pytest.fixture
def empty_context_dataset() -> Dataset:
    """Dataset with poor context retrieval for testing."""
    data = {
        "question": [
            "¿Cuál es la dosis de un medicamento inventado?",
            "¿Qué es la enfermedad XYZ123?",
        ],
        "answer": [
            "No se encontró información sobre este medicamento.",
            "No hay información disponible sobre esta condición.",
        ],
        "contexts": [
            [],
            ["Información no relacionada con la pregunta."],
        ],
        "ground_truth": [
            "No disponible",
            "No disponible",
        ],
    }
    return Dataset.from_dict(data)


@pytest.fixture
def hallucination_dataset() -> Dataset:
    """Dataset with hallucinated answers for testing faithfulness."""
    data = {
        "question": [
            "¿Cuáles son las contraindicaciones del ibuprofeno?",
        ],
        "answer": [
            "Las contraindicaciones del ibuprofeno incluyen diabetes, cáncer y edad mayor de 65 años.",
        ],
        "contexts": [
            [
                "Ibuprofeno - Contraindicaciones: Úlcera péptica activa, insuficiencia renal severa.",
            ],
        ],
        "ground_truth": [
            "Úlcera péptica activa e insuficiencia renal severa.",
        ],
    }
    return Dataset.from_dict(data)
