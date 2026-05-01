"""Generate a comprehensive RAGAS evaluation report."""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)


def _score(results, name: str) -> float:
    value = results[name]
    if hasattr(value, "__iter__") and not isinstance(value, (int, float)):
        values = [v for v in value if v is not None]
        return float(sum(values) / len(values)) if values else 0.0
    return float(value)


class RAGASReportGenerator:
    """Generate RAGAS evaluation reports."""

    def __init__(self, dataset: Dataset) -> None:
        self.dataset = dataset
        self.results = None

    def evaluate(self):
        self.results = evaluate(
            self.dataset,
            metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        )
        return self.results

    def generate_markdown_report(self, output_path: str) -> None:
        if self.results is None:
            self.evaluate()

        f = _score(self.results, "faithfulness")
        ar = _score(self.results, "answer_relevancy")
        cp = _score(self.results, "context_precision")
        cr = _score(self.results, "context_recall")

        f_status = "Pass" if f > 0.80 else "Fail"
        cp_status = "Pass" if cp > 0.75 else "Fail"

        report = f"""# RAGAS Evaluation Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

| Metric | Score | Requirement | Status |
|--------|-------|-------------|--------|
| Faithfulness | {f:.3f} | > 0.80 | {f_status} |
| Context Precision | {cp:.3f} | > 0.75 | {cp_status} |
| Answer Relevancy | {ar:.3f} | - | - |
| Context Recall | {cr:.3f} | - | - |

## Interpretation

### Faithfulness ({f:.3f})
Measures how factually accurate the generated answers are based on the retrieved context.
- High (>0.80): Answers are well-grounded in the provided context
- Medium (0.60-0.80): Some hallucinations or unsupported claims
- Low (<0.60): Significant hallucinations

### Context Precision ({cp:.3f})
Measures how relevant the retrieved context is to the question.
- High (>0.75): Retrieved context is highly relevant
- Medium (0.50-0.75): Some irrelevant context retrieved
- Low (<0.50): Poor retrieval quality

### Answer Relevancy ({ar:.3f})
Measures how relevant the answer is to the question.

### Context Recall ({cr:.3f})
Measures how complete the retrieved context is (requires ground truth).

## Detailed Results

"""
        if hasattr(self.dataset, "to_pandas"):
            df = self.dataset.to_pandas()
            report += "### Per-Question Analysis\n\n"
            for idx, row in df.iterrows():
                report += f"#### Question {int(idx) + 1}\n\n"
                report += f"**Q:** {row['question']}\n\n"
                report += f"**A:** {row['answer']}\n\n"
                report += f"**Contexts:** {len(row['contexts'])} chunks retrieved\n\n"
                report += "---\n\n"

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            fh.write(report)

        print(f"Report saved to: {output_path}")

    def save_json_results(self, output_path: str) -> None:
        if self.results is None:
            self.evaluate()

        f = _score(self.results, "faithfulness")
        ar = _score(self.results, "answer_relevancy")
        cp = _score(self.results, "context_precision")
        cr = _score(self.results, "context_recall")

        output = {
            "timestamp": datetime.now().isoformat(),
            "metrics": {
                "faithfulness": f,
                "answer_relevancy": ar,
                "context_precision": cp,
                "context_recall": cr,
            },
            "requirements_met": {
                "faithfulness": f > 0.80,
                "context_precision": cp > 0.75,
            },
        }

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(output, fh, indent=2, ensure_ascii=False)

        print(f"JSON results saved to: {output_path}")


def _default_dataset() -> Dataset:
    """Inline fixture data so this script is runnable standalone."""
    sys.path.insert(0, str(Path(__file__).parent))
    from conftest import spanish_medical_qa_dataset  # type: ignore[import-not-found]

    fixture = spanish_medical_qa_dataset.__wrapped__  # bypass pytest fixture wrapper
    return fixture()


if __name__ == "__main__":
    dataset = _default_dataset()
    generator = RAGASReportGenerator(dataset)
    generator.evaluate()
    generator.generate_markdown_report("reports/ragas_evaluation.md")
    generator.save_json_results("reports/ragas_results.json")
    print("\nEvaluation complete!")
