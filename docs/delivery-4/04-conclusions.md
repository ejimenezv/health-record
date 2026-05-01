# 04 — Technical Conclusions

The MedRecord AI project set out to build an end-to-end pipeline for
Spanish-language medical consultations: real-time transcription with
speaker diarization, structured extraction, RAG-grounded validation
against a clinical knowledge base, and SOAP-formatted output. The system
delivered most of that surface — the RAG pipeline, the cost-tracking and
observability stack, the WebSocket protocol design, the security
controls, and the test infrastructure are all in place — but two
deployment-blocking server-side bugs surfaced in the 2026-04-30 load
test, and an AWS production deployment was not completed in time for
this delivery. Both gaps are documented honestly elsewhere in this
folder; this section covers the technical takeaways from what *was*
built.

**What worked well.** The decision in [ADR-001](../adr/ADR-001-seleccion-modelo-llm.md)
to use a multi-tier LLM strategy (GPT-4o for the heavy extraction path,
GPT-4o-mini for cheap validations and fallback, with explicit budget
gating in `CostDashboard`) gave the system a graceful failure mode under
cost pressure that does not require code changes. The instrumented
`CostTracker` paid for itself early: every call records tokens, mode,
and cost in one place, so the BSG RF-018 dashboard endpoint at
`/api/v1/costs` is a thin projection of an already-correct ledger rather
than a separate accounting system. The choice in [ADR-002](../adr/ADR-002-vector-store-selection.md)
to use ChromaDB as a single-process vector store kept the local dev loop
fast (no managed-DB cold start) and removed a recurring cost line from
the projection — a pragmatic call at MVP scale that we would revisit
only when corpus size crosses ~100K vectors. The RAGAS guardrail
(faithfulness > 0.80, context precision > 0.75) was wired into the test
suite from the start and currently shows 0.938 / 1.000 on the synthetic
fixture; this is a regression check, not a quality claim, but it has
already caught one prompt regression during development that traditional
unit tests would have missed.

**What did not work as planned.** The streaming WebSocket handler at
[`ai-service/src/api/websocket/streaming.py:71`](../../ai-service/src/api/websocket/streaming.py#L71)
illustrates a class of bug specific to long-lived bidirectional
connections: the connection slot is registered before the construction
of the heavy components (`StreamProcessor`, diarizer, extractor,
coordinator), but the cleanup path lives in a `finally` after a `try`
that begins *below* that construction. When `StreamProcessor.__init__`
fails — in this case because `silero_vad` pulls a broken `torchaudio`
wheel — the slot never releases and every subsequent reconnect for that
session is rejected with WS close `4002`. The fix is mechanical (move
construction into the existing `try` or wrap it in its own
`try/except` that calls `disconnect()` on failure), but the underlying
lesson is that resource registration and cleanup must bracket each
other in the same scope, not in different ones. The
`/api/v1/query` rate limiter is the second real-load casualty: at 10
concurrent VUs, 88% of requests fail (44× HTTP 429, 30× HTTP 500), which
means the chosen `slowapi` configuration is too aggressive for the
target workload of 50 queries/sec from BSG RNF-004. Both issues only
surfaced under load — unit tests and isolated integration tests pass
cleanly — which validates the decision to invest in a Locust-based load
suite even though it took longer to build than mock-based testing.

**Architectural choices we would make again.** A single-EC2,
docker-compose-based deployment instead of Kubernetes (planned in
[ADR-007](../adr/ADR-007-seleccion-cloud-provider.md)) — at this scale
the operational savings are real. PostgreSQL for application metadata
and ChromaDB for vectors instead of a unified Supabase-style stack — the
GDPR/LOPD "right to be forgotten" semantics are clearer when patient
data and knowledge-base data live in physically separate stores with
different retention policies. JWT-only authentication on the AI service
without a token-mint endpoint (per the AI-service contract memo) — it
forces the backend to treat the AI service as a trust boundary rather
than a session participant.

**Architectural choices we would change.** Move Whisper from the OpenAI
managed API to a local `faster-whisper` instance: at $0.006/minute,
Whisper accounts for ~80% of per-consultation cost and is the dominant
latency driver. Wire Langfuse from day one so prompt iteration has
proper trace history rather than ad-hoc log greps. Provision the AWS
target environment in week one, even if empty — the cost analysis
section of this delivery is weaker than it should be precisely because
there is no production billing data to anchor it.

**Top engineering takeaways.** The system prompt drives 80% of
extraction quality; the JSON-schema-with-few-shot-examples pattern
documented in the extraction service is what eventually got field-name
consistency above 95%. Cost tracking must be a first-class concern, not
a post-hoc dashboard — the budget circuit breaker exists today because
we instrumented from the start. RAGAS is stricter than it sounds; the
0.500 faithfulness on the diagnosis fixture is a real signal about
fixture quality, not noise, and the same scrutiny applied to production
answers will surface real issues. And, most concretely: load-test the
WebSocket path the same week you build it, because race conditions in
construction-time code are the kind of bug that only surfaces under
concurrent connect/disconnect storms.
