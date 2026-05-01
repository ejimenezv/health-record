"""RAGAS evaluation tests for RAG pipeline quality."""
from __future__ import annotations

import pytest
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)


def _score(result, name: str) -> float:
    value = result[name]
    if hasattr(value, "__iter__") and not isinstance(value, (int, float)):
        values = [v for v in value if v is not None]
        return float(sum(values) / len(values)) if values else 0.0
    return float(value)


class TestRAGQuality:
    """Test RAG system quality using RAGAS metrics."""

    @pytest.mark.ragas
    def test_faithfulness_meets_requirement(self, spanish_medical_qa_dataset):
        """RF-009: Faithfulness score (RAGAS) > 0.80."""
        result = evaluate(spanish_medical_qa_dataset, metrics=[faithfulness])
        score = _score(result, "faithfulness")

        print(f"\nFaithfulness Score: {score:.3f}")
        print("Requirement: > 0.80")

        assert score > 0.80, (
            f"Faithfulness score {score:.3f} does not meet requirement of > 0.80"
        )

    @pytest.mark.ragas
    def test_context_precision_meets_requirement(self, spanish_medical_qa_dataset):
        """RF-012: Context Precision (RAGAS) > 0.75."""
        result = evaluate(spanish_medical_qa_dataset, metrics=[context_precision])
        score = _score(result, "context_precision")

        print(f"\nContext Precision Score: {score:.3f}")
        print("Requirement: > 0.75")

        assert score > 0.75, (
            f"Context precision {score:.3f} does not meet requirement of > 0.75"
        )

    @pytest.mark.ragas
    def test_answer_relevancy(self, spanish_medical_qa_dataset):
        """Test answer relevancy to questions."""
        result = evaluate(spanish_medical_qa_dataset, metrics=[answer_relevancy])
        score = _score(result, "answer_relevancy")

        print(f"\nAnswer Relevancy Score: {score:.3f}")
        assert score > 0.75

    @pytest.mark.ragas
    def test_context_recall(self, spanish_medical_qa_dataset):
        """Test context recall - how complete is retrieved context."""
        result = evaluate(spanish_medical_qa_dataset, metrics=[context_recall])
        score = _score(result, "context_recall")

        print(f"\nContext Recall Score: {score:.3f}")
        assert score > 0.70

    @pytest.mark.ragas
    def test_all_metrics_combined(self, spanish_medical_qa_dataset):
        """Evaluate all RAGAS metrics together."""
        result = evaluate(
            spanish_medical_qa_dataset,
            metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        )

        f = _score(result, "faithfulness")
        ar = _score(result, "answer_relevancy")
        cp = _score(result, "context_precision")
        cr = _score(result, "context_recall")

        print("\n" + "=" * 50)
        print("RAGAS Evaluation Results")
        print("=" * 50)
        print(f"Faithfulness:       {f:.3f} (req: > 0.80)")
        print(f"Answer Relevancy:   {ar:.3f}")
        print(f"Context Precision:  {cp:.3f} (req: > 0.75)")
        print(f"Context Recall:     {cr:.3f}")
        print("=" * 50)

        assert f > 0.80
        assert cp > 0.75

    @pytest.mark.ragas
    def test_hallucination_detection(self, hallucination_dataset):
        """Test that faithfulness detects hallucinations."""
        result = evaluate(hallucination_dataset, metrics=[faithfulness])
        score = _score(result, "faithfulness")

        print(f"\nHallucination Test - Faithfulness: {score:.3f}")
        assert score < 0.70, "Faithfulness should be low for hallucinated answers"

    @pytest.mark.ragas
    def test_empty_context_handling(self, empty_context_dataset):
        """Test behavior with poor/empty context."""
        result = evaluate(
            empty_context_dataset,
            metrics=[context_precision, answer_relevancy],
        )

        cp = _score(result, "context_precision")
        ar = _score(result, "answer_relevancy")

        print("\nEmpty Context Test:")
        print(f"  Precision: {cp:.3f}")
        print(f"  Relevancy: {ar:.3f}")

        assert result is not None


class TestRAGQualityByCategory:
    """Test RAG quality for different medical categories."""

    @pytest.fixture
    def medication_queries(self) -> Dataset:
        data = {
            "question": [
                "¿Cuál es la dosis de ibuprofeno?",
                "¿Qué es el paracetamol?",
                "¿Cuáles son los efectos secundarios de la amoxicilina?",
            ],
            "answer": [
                "La dosis de ibuprofeno en adultos es 400-800mg cada 6-8 horas.",
                "El paracetamol es un analgésico y antipirético.",
                "Los efectos secundarios de amoxicilina incluyen diarrea, náuseas y reacciones alérgicas.",
            ],
            "contexts": [
                ["Ibuprofeno - Dosis adultos: 400-800mg cada 6-8 horas."],
                ["Paracetamol (acetaminofén): Analgésico y antipirético de venta libre."],
                ["Amoxicilina - Efectos adversos: Diarrea, náuseas, vómitos, rash cutáneo."],
            ],
            "ground_truth": [
                "400-800mg cada 6-8 horas",
                "Analgésico y antipirético",
                "Diarrea, náuseas, reacciones alérgicas",
            ],
        }
        return Dataset.from_dict(data)

    @pytest.fixture
    def diagnosis_queries(self) -> Dataset:
        data = {
            "question": [
                "¿Qué es la migraña?",
                "¿Cuáles son los síntomas de la diabetes tipo 2?",
            ],
            "answer": [
                "La migraña es un trastorno neurológico caracterizado por cefalea pulsátil, unilateral, de moderada a severa intensidad.",
                "Los síntomas de diabetes tipo 2 incluyen poliuria, polidipsia, polifagia, pérdida de peso y fatiga.",
            ],
            "contexts": [
                ["Migraña: Cefalea primaria con dolor pulsátil, unilateral, náuseas y fotofobia."],
                ["Diabetes tipo 2 - Síntomas: Poliuria, polidipsia, polifagia, fatiga, visión borrosa."],
            ],
            "ground_truth": [
                "Cefalea pulsátil unilateral de moderada a severa intensidad",
                "Poliuria, polidipsia, polifagia, fatiga",
            ],
        }
        return Dataset.from_dict(data)

    @pytest.mark.ragas
    def test_medication_quality(self, medication_queries):
        result = evaluate(medication_queries, metrics=[faithfulness, context_precision])
        f = _score(result, "faithfulness")
        cp = _score(result, "context_precision")

        print("\nMedication Queries:")
        print(f"  Faithfulness: {f:.3f}")
        print(f"  Precision: {cp:.3f}")

        assert f > 0.80
        assert cp > 0.75

    @pytest.mark.ragas
    def test_diagnosis_quality(self, diagnosis_queries):
        result = evaluate(diagnosis_queries, metrics=[faithfulness, context_precision])
        f = _score(result, "faithfulness")
        cp = _score(result, "context_precision")

        print("\nDiagnosis Queries:")
        print(f"  Faithfulness: {f:.3f}")
        print(f"  Precision: {cp:.3f}")

        assert f > 0.80
        assert cp > 0.75
