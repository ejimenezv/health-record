# Delivery 4 — Final Results, Conclusions, and Roadmap

**Project:** MedRecord AI — Medical consultation transcription, extraction, and SOAP generation.
**Delivery target:** 2026-05-03
**Version:** v1.0.0-rc (release candidate — see [open issues](#open-issues))

This folder consolidates the BSG E4 deliverable. It uses **measured data
only** — every metric in this document points to a file in `ai-service/reports/`,
a code path, or an explicit "not measured" annotation. Where the original
project plan assumed an AWS deployment and 2 months of billing history,
those sections call out the gap rather than estimating.

## Index

| # | Document | Purpose |
|---|----------|---------|
| 1 | [01-results-and-metrics.md](01-results-and-metrics.md) | KPIs vs. measured results (RAGAS, load tests, latency) |
| 2 | [02-cost-analysis.md](02-cost-analysis.md) | Implemented cost-tracking surface and projections (no AWS bill yet) |
| 3 | [03-observability.md](03-observability.md) | Pointer to the implemented observability stack |
| 4 | [04-conclusions.md](04-conclusions.md) | Technical conclusions (≥300 words) |
| 5 | [05-lessons-learned.md](05-lessons-learned.md) | 7 lessons with future application |
| 6 | [06-roadmap.md](06-roadmap.md) | Short / medium / long-term roadmap |

## How this maps to the BSG E4 rubric

| BSG E4 item | Where it lives |
|---|---|
| 4.1 Plantilla completada sin placeholders | This folder + the existing `docs/delivery-1` and `docs/delivery-2` (E1/E2/E3 sources); no template gaps remain |
| 4.2 Secciones 8, 9 y 10 (costos, observabilidad, conclusiones) | [02-cost-analysis.md](02-cost-analysis.md), [03-observability.md](03-observability.md), [04-conclusions.md](04-conclusions.md) |
| 4.3 Análisis de costos con datos reales | [02-cost-analysis.md](02-cost-analysis.md) — measured per-call costs from the cost tracker; AWS billing is a documented gap |
| 4.4 ≥4 lecciones aprendidas | [05-lessons-learned.md](05-lessons-learned.md) — 7 lessons |
| 4.5 Hoja de ruta corto/medio/largo | [06-roadmap.md](06-roadmap.md) |
| 4.6 Tag `v1.0.0` | Pending — see [PRE_DELIVERY_CHECKLIST.md](../PRE_DELIVERY_CHECKLIST.md) |
| 4.7 README con resultados reales | [../../README.md](../../README.md) — Results section updated |
| 4.8 Checklist completado | [../PRE_DELIVERY_CHECKLIST.md](../PRE_DELIVERY_CHECKLIST.md) |
| 4.9 `make pre-delivery` sin errores | Pending — blocked on the open issues below |

## Open issues

These are tracked here so the final delivery is honest about state.

| ID | Description | Source | Severity |
|---|---|---|---|
| OI-1 | WebSocket streaming handler crashes mid-init (broken `torchaudio` install in the AI-service image), leaking the connection slot. Documented at [`ai-service/src/api/websocket/streaming.py:71`](../../ai-service/src/api/websocket/streaming.py#L71). | [Load test report §2 + §A](../../ai-service/reports/2026-04-30/load_test_report.md) | High |
| OI-2 | `/api/v1/query` returns 88% failures at 10 concurrent VUs (44× HTTP 429, 30× HTTP 500). | [Load test report §4 + §B](../../ai-service/reports/2026-04-30/load_test_report.md) | High |
| OI-3 | `/health` issues a live OpenAI roundtrip on every probe (median ~570ms). Should split into `/health` (cached) and `/health/deep` (live). | [Load test report §C](../../ai-service/reports/2026-04-30/load_test_report.md) | Medium |
| OI-4 | RAGAS diagnosis-category test fails on the synthetic fixture (faithfulness 0.500 on two questions whose synthetic answers cite facts the synthetic contexts don't include). Headline aggregate is unaffected. | [RAGAS run summary](../../ai-service/reports/ragas_run_summary.md) | Low (fixture quality) |
| OI-5 | No AWS deployment yet; cost analysis is based on the in-process cost tracker only. | This folder | Medium |
