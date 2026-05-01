# 06 — Roadmap

Each item has a measurable rationale (current bottleneck, current cost
line, current open issue) so the priority ordering is auditable rather
than aspirational.

## Short term — 1 to 3 months

| # | Item | Rationale | Effort | Impact |
|---|---|---|---|---|
| S1 | **Fix OI-1 (WebSocket slot leak + `torchaudio` import)** | Without this fix the streaming path is unusable: 0 events/s, 0/3 reconnects in the [load test](../../ai-service/reports/2026-04-30/load_test_report.md). Two-part fix: pin compatible `torchaudio` wheel + move `StreamProcessor` construction inside the `try` block. | S | High — unblocks all realtime metrics |
| S2 | **Fix OI-2 (`/api/v1/query` 88% failure rate at 10 VUs)** | Re-tune `slowapi` limits to the documented 50 qps target; capture and fix the 30× HTTP 500 stack traces. | S | High — unblocks BSG RNF-004 |
| S3 | **Fix OI-3 (`/health` does live OpenAI probe)** | Split into `/health` (cached) and `/health/deep` (live). Probes go to the cached one. | S | Medium — eliminates an OpenAI quota line item driven by load-balancer probes |
| S4 | **Provision the AWS environment** | Terraform stack already exists in [`infrastructure/aws/terraform/`](../../infrastructure/aws/terraform/). Apply it, run the load suite against the deployed service, and pull two days of `/api/v1/costs` data so the cost analysis stops being modeled. | M | High — closes the biggest doc gap in this delivery |
| S5 | **Replace OpenAI Whisper with `faster-whisper` (local)** | At $0.006/min, Whisper is ~80% of per-consultation cost (see [02-cost-analysis.md §4](02-cost-analysis.md#4-modeled-cost-per-consultation-analytic-not-measured)). Local inference removes the variable cost line entirely and reduces latency 30–40%. | M | High — biggest single cost and latency win |
| S6 | **Wire Langfuse for prompt tracing** | Settings already scaffolded; the client is not initialized. Iterating on prompts without Langfuse means greping logs, which costs hours per change. | S | Medium — accelerates prompt iteration |

## Medium term — 3 to 6 months

| # | Item | Rationale | Effort | Impact |
|---|---|---|---|---|
| M1 | **Multi-tenancy (consultorio-level isolation)** | Currently the JWT carries a user id but not a tenant id; the RAG retrieval does not filter by tenant. Multi-tenancy was deferred to keep the MVP focused but is a prerequisite for any real customer. | L | High |
| M2 | **Prometheus exporter + Grafana dashboard** | The `MetricsCollector` API is shaped for a Prometheus drop-in. Build the text-format exporter, run a Grafana stack, and define dashboards for the SLOs in [03-observability.md](03-observability.md). | M | Medium — makes operational metrics visible to ops, not just to `/metrics` callers |
| M3 | **Vademecum-driven medication interaction alerts** | Detect contraindications and dosage issues using RAG over a structured pharmacological knowledge base. Significant clinical-safety value; requires a curated, validated source corpus. | L | High |
| M4 | **Image modality (GPT-4 vision) for dermatology / radiology** | Expands use cases; requires multi-modal model integration and image storage. | L | Medium |
| M5 | **Spanish-medical fine-tuning of a 7B model** | Reduce dependency on managed LLM APIs; pursue if S5 (local Whisper) demonstrates the operational pattern. | L | Medium |

## Long term — 6 to 12 months

| # | Item | Rationale | Effort | Impact |
|---|---|---|---|---|
| L1 | **Agent workflow: transcription → extraction → cross-check vs history → prescription draft → follow-up scheduling** | Transitions the system from assistive to semi-autonomous. Requires HIS integration, agent orchestration (LangGraph or similar), and regulatory review. | XL | High strategic |
| L2 | **Multi-region deployment (EU / LATAM-N / LATAM-S)** | Latency from Mexico/Argentina to `us-east-1` is 180–250 ms RTT. Regional deployments + Route 53 routing + ChromaDB replication. | L | Medium |
| L3 | **Specialty marketplace (per-specialty knowledge bases)** | Each specialty (cardiology, oncology, pediatrics) gets its own vector store with vetted content. Requires robust multi-tenancy (depends on M1) and clinical content review. | XL | Strategic |

## Priorities for v1.1 (next 3 months)

1. **S1 + S2** — without these, the realtime path and the synchronous
   query path are both unusable under load.
2. **S4** — closes the documentation gap on real cost data.
3. **S5** — biggest cost and latency win; depends on the streaming path
   being healthy after S1.
