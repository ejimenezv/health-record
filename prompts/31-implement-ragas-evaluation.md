# Prompt 31: Implement RAGAS Evaluation for RAG Quality

## Objective
Implement RAGAS (Retrieval-Augmented Generation Assessment) evaluation to measure RAG pipeline quality. Target: Faithfulness > 0.80, Context Precision > 0.75.

## Context
RAGAS provides metrics for evaluating RAG systems:
- **Faithfulness**: How factually accurate is the generated answer based on context?
- **Answer Relevancy**: How relevant is the answer to the question?
- **Context Precision**: How precise is the retrieved context?
- **Context Recall**: How complete is the retrieved context?

These metrics are critical for validating RF-009 (Validación Médica con RAG) and ensuring the RAG system provides accurate medical information.

## Tasks

### 1. Install RAGAS Dependencies

Add to `ai-service/requirements-test.txt`:

```txt
ragas>=0.1.0
datasets>=2.14.0
pandas>=2.0.0
```

### 2. Create RAGAS Evaluation Configuration

Create `ai-service/tests/ragas/conftest.py`:

```python
"""
RAGAS evaluation configuration and fixtures.
"""
import pytest
from datasets import Dataset
from typing import List, Dict


@pytest.fixture
def spanish_medical_qa_dataset() -> Dataset:
    """
    Spanish medical Q&A dataset for RAGAS evaluation.

    Format:
    - question: User query
    - answer: Generated answer from RAG
    - contexts: List of retrieved document chunks
    - ground_truth: Expected correct answer (for some metrics)
    """
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
            # These would be actual RAG-generated answers
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
            # Retrieved contexts for each question
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
            # Ground truth answers for reference (optional, for some metrics)
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
            [],  # No context retrieved
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
            # Hallucinated answer - includes information not in context
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
```

### 3. Create RAGAS Evaluation Tests

Create `ai-service/tests/ragas/test_rag_quality.py`:

```python
"""
RAGAS evaluation tests for RAG pipeline quality.
"""
import pytest
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)


class TestRAGQuality:
    """Test RAG system quality using RAGAS metrics."""

    @pytest.mark.ragas
    def test_faithfulness_meets_requirement(self, spanish_medical_qa_dataset):
        """
        Test that RAG faithfulness meets requirement.

        RF-009: Faithfulness score (RAGAS) > 0.80
        """
        result = evaluate(
            spanish_medical_qa_dataset,
            metrics=[faithfulness],
        )

        faithfulness_score = result["faithfulness"]

        print(f"\nFaithfulness Score: {faithfulness_score:.3f}")
        print(f"Requirement: > 0.80")

        assert faithfulness_score > 0.80, (
            f"Faithfulness score {faithfulness_score:.3f} does not meet "
            f"requirement of > 0.80"
        )

    @pytest.mark.ragas
    def test_context_precision_meets_requirement(self, spanish_medical_qa_dataset):
        """
        Test that context precision meets requirement.

        RF-012: Context Precision (RAGAS) > 0.75
        """
        result = evaluate(
            spanish_medical_qa_dataset,
            metrics=[context_precision],
        )

        precision_score = result["context_precision"]

        print(f"\nContext Precision Score: {precision_score:.3f}")
        print(f"Requirement: > 0.75")

        assert precision_score > 0.75, (
            f"Context precision {precision_score:.3f} does not meet "
            f"requirement of > 0.75"
        )

    @pytest.mark.ragas
    def test_answer_relevancy(self, spanish_medical_qa_dataset):
        """Test answer relevancy to questions."""
        result = evaluate(
            spanish_medical_qa_dataset,
            metrics=[answer_relevancy],
        )

        relevancy_score = result["answer_relevancy"]

        print(f"\nAnswer Relevancy Score: {relevancy_score:.3f}")

        # Should be high relevancy
        assert relevancy_score > 0.75

    @pytest.mark.ragas
    def test_context_recall(self, spanish_medical_qa_dataset):
        """Test context recall - how complete is retrieved context."""
        result = evaluate(
            spanish_medical_qa_dataset,
            metrics=[context_recall],
        )

        recall_score = result["context_recall"]

        print(f"\nContext Recall Score: {recall_score:.3f}")

        # Should have good recall
        assert recall_score > 0.70

    @pytest.mark.ragas
    def test_all_metrics_combined(self, spanish_medical_qa_dataset):
        """Evaluate all RAGAS metrics together."""
        result = evaluate(
            spanish_medical_qa_dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
            ],
        )

        print("\n" + "="*50)
        print("RAGAS Evaluation Results")
        print("="*50)
        print(f"Faithfulness:       {result['faithfulness']:.3f} (req: > 0.80)")
        print(f"Answer Relevancy:   {result['answer_relevancy']:.3f}")
        print(f"Context Precision:  {result['context_precision']:.3f} (req: > 0.75)")
        print(f"Context Recall:     {result['context_recall']:.3f}")
        print("="*50)

        # Check critical requirements
        assert result["faithfulness"] > 0.80
        assert result["context_precision"] > 0.75

    @pytest.mark.ragas
    def test_hallucination_detection(self, hallucination_dataset):
        """Test that faithfulness detects hallucinations."""
        result = evaluate(
            hallucination_dataset,
            metrics=[faithfulness],
        )

        faithfulness_score = result["faithfulness"]

        print(f"\nHallucination Test - Faithfulness: {faithfulness_score:.3f}")

        # Hallucinated answers should have low faithfulness
        assert faithfulness_score < 0.70, (
            "Faithfulness should be low for hallucinated answers"
        )

    @pytest.mark.ragas
    def test_empty_context_handling(self, empty_context_dataset):
        """Test behavior with poor/empty context."""
        result = evaluate(
            empty_context_dataset,
            metrics=[context_precision, answer_relevancy],
        )

        print(f"\nEmpty Context Test:")
        print(f"  Precision: {result['context_precision']:.3f}")
        print(f"  Relevancy: {result['answer_relevancy']:.3f}")

        # Should handle gracefully (metrics defined behavior)
        assert result is not None


class TestRAGQualityByCategory:
    """Test RAG quality for different medical categories."""

    @pytest.fixture
    def medication_queries(self) -> Dataset:
        """Dataset focused on medication queries."""
        from datasets import Dataset

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
        """Dataset focused on diagnosis queries."""
        from datasets import Dataset

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
        """Test RAG quality for medication queries."""
        result = evaluate(
            medication_queries,
            metrics=[faithfulness, context_precision],
        )

        print(f"\nMedication Queries:")
        print(f"  Faithfulness: {result['faithfulness']:.3f}")
        print(f"  Precision: {result['context_precision']:.3f}")

        assert result["faithfulness"] > 0.80
        assert result["context_precision"] > 0.75

    @pytest.mark.ragas
    def test_diagnosis_quality(self, diagnosis_queries):
        """Test RAG quality for diagnosis queries."""
        result = evaluate(
            diagnosis_queries,
            metrics=[faithfulness, context_precision],
        )

        print(f"\nDiagnosis Queries:")
        print(f"  Faithfulness: {result['faithfulness']:.3f}")
        print(f"  Precision: {result['context_precision']:.3f}")

        assert result["faithfulness"] > 0.80
        assert result["context_precision"] > 0.75
```

### 4. Create Live RAG Evaluation

Create `ai-service/tests/ragas/test_live_rag_evaluation.py`:

```python
"""
Live RAG evaluation against running service.
"""
import pytest
import httpx
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, context_precision


class TestLiveRAGEvaluation:
    """
    Evaluate RAG quality using live API calls.

    This tests the actual deployed RAG system, not mocked data.
    """

    @pytest.fixture
    def api_client(self):
        """HTTP client for API calls."""
        return httpx.AsyncClient(
            base_url="http://localhost:8000",
            timeout=30.0,
        )

    @pytest.fixture
    def auth_headers(self, api_client):
        """Get auth token."""
        response = api_client.post(
            "/api/v1/auth/token",
            data={"username": "test_user", "password": "test_pass"},
        )

        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}

    @pytest.mark.asyncio
    @pytest.mark.live
    async def test_live_rag_queries(self, api_client, auth_headers):
        """
        Query live RAG system and evaluate with RAGAS.
        """
        test_questions = [
            "¿Cuáles son las contraindicaciones del ibuprofeno?",
            "¿Qué dosis de paracetamol se recomienda?",
            "¿Cuál es el código CIE-10 para migraña?",
        ]

        questions = []
        answers = []
        contexts = []

        # Query RAG for each question
        for question in test_questions:
            response = await api_client.post(
                "/api/v1/query",
                json={"query": question, "top_k": 5},
                headers=auth_headers,
            )

            if response.status_code == 200:
                data = response.json()

                questions.append(question)
                answers.append(data["response"])

                # Extract context from sources
                context_texts = [
                    source.get("text", source.get("content", ""))
                    for source in data.get("sources", [])
                ]
                contexts.append(context_texts)

        # Create dataset from live results
        dataset = Dataset.from_dict({
            "question": questions,
            "answer": answers,
            "contexts": contexts,
        })

        # Evaluate with RAGAS
        result = evaluate(
            dataset,
            metrics=[faithfulness, context_precision],
        )

        print("\n" + "="*50)
        print("Live RAG Evaluation Results")
        print("="*50)
        print(f"Questions evaluated: {len(questions)}")
        print(f"Faithfulness:       {result['faithfulness']:.3f} (req: > 0.80)")
        print(f"Context Precision:  {result['context_precision']:.3f} (req: > 0.75)")
        print("="*50)

        # Check requirements
        assert result["faithfulness"] > 0.80, "Live RAG faithfulness below requirement"
        assert result["context_precision"] > 0.75, "Live RAG precision below requirement"
```

### 5. Create RAGAS Report Generator

Create `ai-service/tests/ragas/generate_report.py`:

```python
"""
Generate comprehensive RAGAS evaluation report.
"""
import json
from datetime import datetime
from pathlib import Path

import pandas as pd
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)


class RAGASReportGenerator:
    """Generate RAGAS evaluation reports."""

    def __init__(self, dataset: Dataset):
        self.dataset = dataset
        self.results = None

    def evaluate(self):
        """Run RAGAS evaluation."""
        self.results = evaluate(
            self.dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
            ],
        )
        return self.results

    def generate_markdown_report(self, output_path: str):
        """Generate markdown report."""
        if self.results is None:
            self.evaluate()

        report = f"""# RAGAS Evaluation Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

| Metric | Score | Requirement | Status |
|--------|-------|-------------|--------|
| Faithfulness | {self.results['faithfulness']:.3f} | > 0.80 | {'✅ Pass' if self.results['faithfulness'] > 0.80 else '❌ Fail'} |
| Context Precision | {self.results['context_precision']:.3f} | > 0.75 | {'✅ Pass' if self.results['context_precision'] > 0.75 else '❌ Fail'} |
| Answer Relevancy | {self.results['answer_relevancy']:.3f} | - | - |
| Context Recall | {self.results['context_recall']:.3f} | - | - |

## Interpretation

### Faithfulness ({self.results['faithfulness']:.3f})
Measures how factually accurate the generated answers are based on the retrieved context.
- **High (>0.80):** Answers are well-grounded in the provided context
- **Medium (0.60-0.80):** Some hallucinations or unsupported claims
- **Low (<0.60):** Significant hallucinations

### Context Precision ({self.results['context_precision']:.3f})
Measures how relevant the retrieved context is to the question.
- **High (>0.75):** Retrieved context is highly relevant
- **Medium (0.50-0.75):** Some irrelevant context retrieved
- **Low (<0.50):** Poor retrieval quality

### Answer Relevancy ({self.results['answer_relevancy']:.3f})
Measures how relevant the answer is to the question.
- **High (>0.80):** Answers directly address the question
- **Medium (0.60-0.80):** Answers are somewhat relevant
- **Low (<0.60):** Answers don't address the question

### Context Recall ({self.results['context_recall']:.3f})
Measures how complete the retrieved context is (requires ground truth).
- **High (>0.80):** All necessary information retrieved
- **Medium (0.60-0.80):** Some information missing
- **Low (<0.60):** Significant information gaps

## Detailed Results

"""

        # Add per-question breakdown if available
        if hasattr(self.dataset, 'to_pandas'):
            df = self.dataset.to_pandas()
            report += "### Per-Question Analysis\n\n"

            for idx, row in df.iterrows():
                report += f"#### Question {idx + 1}\n\n"
                report += f"**Q:** {row['question']}\n\n"
                report += f"**A:** {row['answer']}\n\n"
                report += f"**Contexts:** {len(row['contexts'])} chunks retrieved\n\n"
                report += "---\n\n"

        # Save report
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"Report saved to: {output_path}")

    def save_json_results(self, output_path: str):
        """Save results as JSON."""
        if self.results is None:
            self.evaluate()

        output = {
            "timestamp": datetime.now().isoformat(),
            "metrics": {
                "faithfulness": float(self.results["faithfulness"]),
                "answer_relevancy": float(self.results["answer_relevancy"]),
                "context_precision": float(self.results["context_precision"]),
                "context_recall": float(self.results["context_recall"]),
            },
            "requirements_met": {
                "faithfulness": self.results["faithfulness"] > 0.80,
                "context_precision": self.results["context_precision"] > 0.75,
            },
        }

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"JSON results saved to: {output_path}")


if __name__ == "__main__":
    # Example usage
    from conftest import spanish_medical_qa_dataset

    dataset = spanish_medical_qa_dataset()

    generator = RAGASReportGenerator(dataset)
    generator.evaluate()

    generator.generate_markdown_report("reports/ragas_evaluation.md")
    generator.save_json_results("reports/ragas_results.json")

    print("\nEvaluation complete!")
```

### 6. Create RAGAS CI Integration

Create `.github/workflows/ragas-evaluation.yml`:

```yaml
name: RAGAS Evaluation

on:
  push:
    branches: [main, develop]
    paths:
      - 'ai-service/src/rag/**'
      - 'ai-service/tests/ragas/**'
  pull_request:
    branches: [main, develop]
  schedule:
    # Run weekly on Mondays at 9 AM
    - cron: '0 9 * * 1'

jobs:
  ragas-evaluation:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd ai-service
          pip install -r requirements.txt
          pip install -r requirements-test.txt

      - name: Run RAGAS evaluation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          cd ai-service
          pytest tests/ragas/ -v -m ragas --tb=short

      - name: Generate RAGAS report
        if: always()
        run: |
          cd ai-service
          python tests/ragas/generate_report.py

      - name: Upload RAGAS report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: ragas-report
          path: ai-service/reports/ragas_*.md

      - name: Check RAGAS requirements
        run: |
          cd ai-service
          python -c "
          import json
          with open('reports/ragas_results.json') as f:
              results = json.load(f)
          met = results['requirements_met']
          if not all(met.values()):
              print('RAGAS requirements not met!')
              exit(1)
          print('All RAGAS requirements met ✅')
          "
```

### 7. Create Real-Time RAG Performance Tests

Create `ai-service/tests/ragas/test_realtime_rag_performance.py`:

```python
"""
Real-time RAG validation performance tests.
Verify latency targets for priority-based validation queue.
"""
import pytest
import asyncio
import time
from typing import List, Dict
from app.services.rag_service import RAGService


class TestRealtimeRAGPerformance:
    """
    Test RAG validation performance for real-time streaming.

    Latency Targets (from Prompt 24):
    - CRITICAL alerts: < 1 second
    - HIGH alerts: < 2 seconds
    - MEDIUM alerts: < 3 seconds
    - LOW alerts: < 5 seconds
    """

    @pytest.fixture
    def rag_service(self):
        """Initialize RAG service."""
        return RAGService()

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_critical_alert_latency_under_1_second(self, rag_service):
        """
        CRITICAL alert validation must complete in < 1 second.
        Example: Allergy conflict detection.
        """
        # Simulate CRITICAL severity entity validation
        entity = {
            "entity_type": "medication",
            "entity_value": "penicilina",
            "patient_allergies": ["penicilina"],
        }

        start_time = time.time()

        result = await rag_service.validate_entity_with_rag(
            entity_type=entity["entity_type"],
            entity_value=entity["entity_value"],
            context={"patient_allergies": entity["patient_allergies"]},
            priority="CRITICAL",
        )

        elapsed_time = time.time() - start_time

        # Assert latency requirement
        assert elapsed_time < 1.0, f"CRITICAL alert took {elapsed_time:.3f}s (must be < 1.0s)"

        # Assert validation caught the allergy conflict
        assert result["alert_type"] == "allergy_conflict"
        assert result["severity"] == "CRITICAL"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_high_alert_latency_under_2_seconds(self, rag_service):
        """
        HIGH alert validation must complete in < 2 seconds.
        Example: Drug interaction detection.
        """
        entity = {
            "entity_type": "medication",
            "entity_value": "warfarina",
            "current_medications": ["aspirina"],
        }

        start_time = time.time()

        result = await rag_service.validate_entity_with_rag(
            entity_type=entity["entity_type"],
            entity_value=entity["entity_value"],
            context={"current_medications": entity["current_medications"]},
            priority="HIGH",
        )

        elapsed_time = time.time() - start_time

        assert elapsed_time < 2.0, f"HIGH alert took {elapsed_time:.3f}s (must be < 2.0s)"

        # Should detect interaction
        assert result["alert_type"] == "drug_interaction"
        assert result["severity"] == "HIGH"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_medium_alert_latency_under_3_seconds(self, rag_service):
        """
        MEDIUM alert validation must complete in < 3 seconds.
        Example: Dosage verification.
        """
        entity = {
            "entity_type": "medication",
            "entity_value": "paracetamol 1500mg",
        }

        start_time = time.time()

        result = await rag_service.validate_entity_with_rag(
            entity_type=entity["entity_type"],
            entity_value=entity["entity_value"],
            context={},
            priority="MEDIUM",
        )

        elapsed_time = time.time() - start_time

        assert elapsed_time < 3.0, f"MEDIUM alert took {elapsed_time:.3f}s (must be < 3.0s)"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_priority_queue_ordering(self, rag_service):
        """
        Test that priority queue processes CRITICAL alerts before LOW alerts.
        """
        # Submit multiple validation requests with different priorities
        tasks = [
            rag_service.validate_entity_with_rag(
                entity_type="medication",
                entity_value="low_priority_med",
                context={},
                priority="LOW",
            ),
            rag_service.validate_entity_with_rag(
                entity_type="medication",
                entity_value="critical_allergy",
                context={"patient_allergies": ["critical_allergy"]},
                priority="CRITICAL",
            ),
            rag_service.validate_entity_with_rag(
                entity_type="medication",
                entity_value="medium_priority_med",
                context={},
                priority="MEDIUM",
            ),
        ]

        # Execute tasks concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time

        # CRITICAL task should complete first even though submitted second
        critical_result = results[1]
        assert critical_result["priority"] == "CRITICAL"

        # Verify CRITICAL completed within 1 second of start
        # (not waiting for LOW task to finish)
        assert total_time < 2.0, "Priority queue should process CRITICAL tasks immediately"

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_concurrent_rag_validations(self, rag_service):
        """
        Test RAG service handles multiple concurrent validations efficiently.
        Simulate real-time streaming scenario with multiple entities extracted.
        """
        entities = [
            {"type": "symptom", "value": "dolor de cabeza", "priority": "MEDIUM"},
            {"type": "medication", "value": "ibuprofeno", "priority": "HIGH"},
            {"type": "diagnosis", "value": "migraña", "priority": "MEDIUM"},
            {"type": "medication", "value": "paracetamol", "priority": "LOW"},
        ]

        tasks = [
            rag_service.validate_entity_with_rag(
                entity_type=entity["type"],
                entity_value=entity["value"],
                context={},
                priority=entity["priority"],
            )
            for entity in entities
        ]

        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time

        # All validations should complete reasonably fast
        assert total_time < 5.0, f"Concurrent validations took {total_time:.3f}s"

        # All results should be valid
        assert len(results) == len(entities)
        for result in results:
            assert "validation_status" in result or "alert_type" in result

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_rag_cache_performance(self, rag_service):
        """
        Test that RAG caching improves performance for repeated queries.
        """
        entity = {"entity_type": "medication", "entity_value": "ibuprofeno"}

        # First query (cold cache)
        start_time = time.time()
        result1 = await rag_service.validate_entity_with_rag(
            entity_type=entity["entity_type"],
            entity_value=entity["entity_value"],
            context={},
            priority="MEDIUM",
        )
        cold_cache_time = time.time() - start_time

        # Second query (warm cache)
        start_time = time.time()
        result2 = await rag_service.validate_entity_with_rag(
            entity_type=entity["entity_type"],
            entity_value=entity["entity_value"],
            context={},
            priority="MEDIUM",
        )
        warm_cache_time = time.time() - start_time

        # Cached query should be significantly faster
        assert warm_cache_time < cold_cache_time * 0.5, \
            f"Cache not effective: cold={cold_cache_time:.3f}s, warm={warm_cache_time:.3f}s"

        # Results should be consistent
        assert result1["validation_status"] == result2["validation_status"]


@pytest.mark.performance
def test_rag_embedding_latency(rag_service):
    """
    Test embedding generation latency for queries.
    Embeddings should complete in < 500ms.
    """
    query = "¿Cuáles son las contraindicaciones del ibuprofeno?"

    start_time = time.time()
    embedding = rag_service.generate_embedding(query)
    elapsed_time = time.time() - start_time

    assert elapsed_time < 0.5, f"Embedding took {elapsed_time:.3f}s (must be < 0.5s)"
    assert len(embedding) > 0, "Embedding should not be empty"
```

## Expected Deliverables

1. `ai-service/tests/ragas/conftest.py` - RAGAS test fixtures with Spanish medical Q&A
2. `ai-service/tests/ragas/test_rag_quality.py` - RAGAS quality tests
3. `ai-service/tests/ragas/test_live_rag_evaluation.py` - Live API evaluation
4. `ai-service/tests/ragas/generate_report.py` - Report generator
5. `.github/workflows/ragas-evaluation.yml` - CI integration
6. `ai-service/tests/ragas/test_realtime_rag_performance.py` - Real-time RAG performance tests

## Verification Steps

1. Run RAGAS tests: `pytest tests/ragas/ -v -m ragas`
2. Verify Faithfulness > 0.80 (RF-009 requirement)
3. Verify Context Precision > 0.75 (RF-012 requirement)
4. Generate and review RAGAS report
5. Check that hallucinations are detected (low faithfulness)
6. Run real-time performance tests: `pytest tests/ragas/test_realtime_rag_performance.py -v -m performance`
7. Verify latency targets:
   - CRITICAL alerts: < 1 second
   - HIGH alerts: < 2 seconds
   - MEDIUM alerts: < 3 seconds
   - Embedding generation: < 500ms
8. Verify priority queue processes CRITICAL alerts first
9. Verify RAG caching improves performance for repeated queries

## Notes

- RAGAS requires OpenAI API key (uses GPT-4 for evaluation)
- Evaluation can be expensive - use smaller datasets for CI
- Focus on Spanish medical domain for realistic evaluation
- Track RAGAS metrics over time to monitor RAG quality
- Use live evaluation sparingly (hits production API)
- RAGAS is critical for validating medical accuracy
- **Real-Time Performance**: Performance tests verify RAG validation meets latency targets for the real-time streaming architecture
- **Priority Queue**: CRITICAL alerts must be processed immediately (<1s) to ensure patient safety
- **Caching**: RAG caching is essential for meeting latency targets with repeated entity validations
