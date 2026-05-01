# RAGAS Evaluation — Run Summary

**Run date:** 2026-04-30 21:57 UTC
**Runner:** `docker exec medrecord-ai-service pytest tests/ragas/ -v -m ragas`
**Judge model:** OpenAI (default RAGAS 0.1.4 — GPT-3.5/4 via `OPENAI_API_KEY`)
**Dataset:** Synthetic Spanish medical Q&A from
[tests/ragas/conftest.py](../tests/ragas/conftest.py) (8 questions, fixed
contexts and answers — no live retrieval).

## Headline metrics — full 8-question dataset

Source: [reports/ragas_results.json](ragas_results.json)

| Metric            | Score  | Requirement | Status |
|-------------------|--------|-------------|--------|
| Faithfulness      | 0.938  | > 0.80      | Pass   |
| Context Precision | 1.000  | > 0.75      | Pass   |
| Answer Relevancy  | 0.964  | —           | —      |
| Context Recall    | 1.000  | —           | —      |

Both gating requirements (RF-009 faithfulness > 0.80, RF-012 context
precision > 0.75) are met on the curated dataset.

## Test results — `pytest -m ragas`

**8 passed, 1 failed, 8 deselected** in 61.80 s.

| Test                                                  | Result | Notes |
|-------------------------------------------------------|--------|-------|
| `test_faithfulness_meets_requirement`                 | Pass   | Asserts faithfulness > 0.80 on the 8-question set |
| `test_context_precision_meets_requirement`            | Pass   | Asserts precision > 0.75 |
| `test_answer_relevancy`                               | Pass   | Asserts > 0.75 |
| `test_context_recall`                                 | Pass   | Asserts > 0.70 |
| `test_all_metrics_combined`                           | Pass   | All four metrics in one call |
| `test_hallucination_detection`                        | Pass   | Hallucinated answer scores < 0.70 faithfulness — RAGAS correctly flags it |
| `test_empty_context_handling`                         | Pass   | Pipeline handles `[]` and irrelevant contexts without crashing |
| `test_medication_quality` (3 medication queries)      | Pass   | Faithfulness > 0.80, precision > 0.75 |
| `test_diagnosis_quality` (2 diagnosis queries)        | **Fail** | Faithfulness 0.500 (< 0.80), precision 1.000 |

### Failure detail

`TestRAGQualityByCategory.test_diagnosis_quality` — fixture in
[test_rag_quality.py](../tests/ragas/test_rag_quality.py):

- Q1: "¿Qué es la migraña?" — answer adds "trastorno neurológico" and
  "moderada a severa intensidad" not present in the single retrieved chunk.
  RAGAS counts those as unsupported claims, dropping faithfulness on this
  question to ~0.
- Q2: "¿Cuáles son los síntomas de la diabetes tipo 2?" — answer adds
  "pérdida de peso", which is absent from the context (context lists
  poliuria/polidipsia/polifagia/fatiga/visión borrosa). Partial penalty.

Mean faithfulness over the two diagnosis questions: **0.500**. Precision is
1.0 because the single retrieved chunk per question is fully relevant — the
issue is answer grounding, not retrieval.

This is a fixture-quality issue (the synthetic answers cite facts the
synthetic contexts do not contain), not a regression in the RAG pipeline.
Two options to address before treating this as a real failure:

1. Tighten the diagnosis fixture answers so every claim appears verbatim in
   the contexts (recommended — keeps the test as a guardrail).
2. Expand the contexts to include the extra clinical facts the answers
   reference.

## What this run does *not* cover

- `-m live`: skipped — no `AI_SERVICE_TOKEN` provided and the live RAG
  endpoint contract still needs verification per memory note
  `ai_service_contract.md`.
- `-m performance`: skipped — `RAGValidationCoordinator.validate_entity*` is
  not yet exposed; the perf module skips itself until a compatible
  coroutine exists on the coordinator.

## Reproduce

```bash
docker exec medrecord-ai-service pytest tests/ragas/ -v -m ragas
docker exec medrecord-ai-service bash -c "cd /app && python tests/ragas/generate_report.py"
docker cp medrecord-ai-service:/app/reports/ragas_results.json    ai-service/reports/
docker cp medrecord-ai-service:/app/reports/ragas_evaluation.md   ai-service/reports/
```
