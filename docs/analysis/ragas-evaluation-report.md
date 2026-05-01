# RAGAS Evaluation Report

**Last run:** 2026-04-30 21:57 UTC
**Source prompt:** [prompts/31-implement-ragas-evaluation.md](../../prompts/31-implement-ragas-evaluation.md)
**Implementation:** [ai-service/tests/ragas/](../../ai-service/tests/ragas/)
**Generated artifacts:** [ai-service/reports/](../../ai-service/reports/)

## 1. Purpose

RAGAS (Retrieval-Augmented Generation Assessment) measures the quality of the
medical RAG pipeline that backs RF-009 (validación médica con RAG). This
report documents the first end-to-end run of the RAGAS suite against a
curated Spanish medical Q&A fixture and explains how to read, reproduce, and
extend the results.

## 2. Requirements gated

| ID     | Requirement                                  | Threshold |
|--------|----------------------------------------------|-----------|
| RF-009 | Faithfulness (RAGAS)                         | > 0.80    |
| RF-012 | Context Precision (RAGAS)                    | > 0.75    |

Two additional metrics — Answer Relevancy and Context Recall — are tracked
for trend analysis but are not gated.

## 3. Run setup

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Runner           | `docker exec medrecord-ai-service pytest tests/ragas/ -v -m ragas`     |
| Judge model      | OpenAI default for RAGAS 0.1.4 (uses `OPENAI_API_KEY`)                 |
| RAGAS version    | 0.1.4                                                                  |
| Datasets version | 2.16.1                                                                 |
| Dataset          | 8-question Spanish medical fixture (synthetic Q/A/contexts/ground_truth) |
| Live retrieval   | Not used in this run — fixture-only                                    |

The dataset lives in
[ai-service/tests/ragas/conftest.py](../../ai-service/tests/ragas/conftest.py)
and covers medications (ibuprofeno, paracetamol, AINEs), diagnoses (migraña,
cefalea tensional, hipertensión, diabetes), and a CIE-10 code lookup.

## 4. Headline metrics

Authoritative scores from
[ai-service/reports/ragas_results.json](../../ai-service/reports/ragas_results.json):

| Metric            | Score  | Gate    | Status |
|-------------------|--------|---------|--------|
| Faithfulness      | 0.938  | > 0.80  | Pass   |
| Context Precision | 1.000  | > 0.75  | Pass   |
| Answer Relevancy  | 0.964  | —       | —      |
| Context Recall    | 1.000  | —       | —      |

Both gating requirements are met on the curated dataset.

## 5. Test outcomes

`pytest tests/ragas/ -m ragas` collected 17 tests, ran 9 (8 deselected by
unrelated marks), in **61.8 s**.

| Test                                                        | Result | Notes |
|-------------------------------------------------------------|--------|-------|
| `test_faithfulness_meets_requirement`                       | Pass   | Faithfulness > 0.80 on full set |
| `test_context_precision_meets_requirement`                  | Pass   | Precision > 0.75 |
| `test_answer_relevancy`                                     | Pass   | > 0.75 |
| `test_context_recall`                                       | Pass   | > 0.70 |
| `test_all_metrics_combined`                                 | Pass   | All four metrics in one call |
| `test_hallucination_detection`                              | Pass   | Hallucinated answer scores < 0.70 — RAGAS flags it correctly |
| `test_empty_context_handling`                               | Pass   | Pipeline handles `[]` and irrelevant contexts gracefully |
| `TestRAGQualityByCategory::test_medication_quality`         | Pass   | Faithfulness > 0.80, precision > 0.75 |
| `TestRAGQualityByCategory::test_diagnosis_quality`          | **Fail** | Faithfulness 0.500 (< 0.80), precision 1.000 — fixture issue, see §6 |

## 6. Failure analysis — `test_diagnosis_quality`

The diagnosis fixture has 2 questions. RAGAS reports per-question
faithfulness ≈ 0 and ≈ 1, mean **0.500**.

- **Q1: "¿Qué es la migraña?"** — fixture answer adds *"trastorno
  neurológico"* and *"moderada a severa intensidad"* that do not appear in
  the single retrieved chunk. RAGAS treats both as unsupported claims.
- **Q2: "¿Cuáles son los síntomas de la diabetes tipo 2?"** — fixture answer
  adds *"pérdida de peso"*, which is absent from the context (context lists
  poliuria, polidipsia, polifagia, fatiga, visión borrosa).

**Root cause:** the synthetic answer cites facts that the synthetic context
does not contain. This is a *fixture-quality issue*, not a regression in the
RAG pipeline. Context precision being 1.000 confirms retrieval is fine; the
problem is answer grounding.

**Recommended fix:** tighten the diagnosis fixture so every claim in the
answer appears verbatim in `contexts`. Keep the > 0.80 threshold — lowering
it would weaken the guardrail. The hallucination-detection test passing on a
known-bad answer confirms the threshold is calibrated correctly.

## 7. Coverage gaps in this run

| Suite                                | Status   | Reason |
|--------------------------------------|----------|--------|
| `-m ragas` (curated fixtures)        | Run      | — |
| `-m live` (live RAG endpoint)        | Skipped  | No `AI_SERVICE_TOKEN`; the project's live contract is JWT-only and the contract for the RAG endpoint still has open items (see [ai_service_contract memory](../../ai-service/tests/ragas/test_live_rag_evaluation.py) skip logic) |
| `-m performance` (latency targets)   | Skipped  | `RAGValidationCoordinator` does not yet expose a `validate_entity[_with_rag]` coroutine that matches the prompt-24 priority queue contract; the module self-skips |

## 8. Cost & runtime notes

- The 9-test run completed in ~62 s and the standalone report generator in
  ~12 s (32 RAGAS evaluator calls). Each call hits the OpenAI judge model.
- For CI, prefer running the tests, not the standalone report generator —
  the tests share dataset evaluations more efficiently and surface
  threshold violations as failures.
- Treat `-m live` as on-demand only; it hits whatever environment
  `AI_SERVICE_URL` points at and consumes additional OpenAI tokens.

## 9. Reproducing the run

```bash
# Run gated RAGAS tests
docker exec medrecord-ai-service pytest tests/ragas/ -v -m ragas

# Generate the standalone JSON + Markdown reports
docker exec medrecord-ai-service bash -c "cd /app && python tests/ragas/generate_report.py"

# Copy reports out of the container for review
docker cp medrecord-ai-service:/app/reports/ragas_results.json  ai-service/reports/
docker cp medrecord-ai-service:/app/reports/ragas_evaluation.md ai-service/reports/
```

`OPENAI_API_KEY` must be set in the container environment (already wired via
`docker-compose.yml`).

## 10. CI integration

[`.github/workflows/ragas-evaluation.yml`](../../.github/workflows/ragas-evaluation.yml)
runs the suite on push/PR touching `ai-service/src/rag/**` or
`ai-service/tests/ragas/**`, and weekly on Mondays at 09:00 UTC. It uploads
both report artifacts and fails the job if either gated requirement regresses.

## 11. Related artifacts

- [ai-service/reports/ragas_results.json](../../ai-service/reports/ragas_results.json) — machine-readable metrics
- [ai-service/reports/ragas_evaluation.md](../../ai-service/reports/ragas_evaluation.md) — auto-generated per-question report
- [ai-service/reports/ragas_run_summary.md](../../ai-service/reports/ragas_run_summary.md) — short run summary
- [ai-service/tests/ragas/](../../ai-service/tests/ragas/) — fixtures, tests, generator
