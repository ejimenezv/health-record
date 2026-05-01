"""Live RAG evaluation against the running ai-service."""
from __future__ import annotations

import os

import httpx
import pytest
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import context_precision, faithfulness


def _score(result, name: str) -> float:
    value = result[name]
    if hasattr(value, "__iter__") and not isinstance(value, (int, float)):
        values = [v for v in value if v is not None]
        return float(sum(values) / len(values)) if values else 0.0
    return float(value)


class TestLiveRAGEvaluation:
    """Evaluate RAG quality using live API calls against a running service."""

    @pytest.fixture
    async def api_client(self):
        async with httpx.AsyncClient(
            base_url=os.getenv("AI_SERVICE_URL", "http://localhost:8000"),
            timeout=30.0,
        ) as client:
            yield client

    @pytest.fixture
    async def auth_headers(self, api_client):
        """Obtain a JWT for the live service.

        The live contract uses JWT-only auth issued out of band; honor an env
        token if provided, otherwise fall back to anonymous.
        """
        token = os.getenv("AI_SERVICE_TOKEN")
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}

    @pytest.mark.asyncio
    @pytest.mark.live
    async def test_live_rag_queries(self, api_client, auth_headers):
        """Query the live RAG system and evaluate with RAGAS."""
        test_questions = [
            "¿Cuáles son las contraindicaciones del ibuprofeno?",
            "¿Qué dosis de paracetamol se recomienda?",
            "¿Cuál es el código CIE-10 para migraña?",
        ]

        questions: list[str] = []
        answers: list[str] = []
        contexts: list[list[str]] = []

        for question in test_questions:
            try:
                response = await api_client.post(
                    "/api/v1/rag/query",
                    json={"query": question, "top_k": 5},
                    headers=auth_headers,
                )
            except httpx.HTTPError as exc:
                pytest.skip(f"Live ai-service unavailable: {exc}")

            if response.status_code != 200:
                pytest.skip(
                    f"Live RAG endpoint returned {response.status_code}: {response.text[:200]}"
                )

            data = response.json()
            questions.append(question)
            answers.append(data.get("response") or data.get("answer", ""))

            sources = data.get("sources") or data.get("contexts") or []
            context_texts = [
                s.get("text") or s.get("content") or s.get("chunk", "")
                if isinstance(s, dict)
                else str(s)
                for s in sources
            ]
            contexts.append(context_texts)

        if not questions:
            pytest.skip("No live questions could be evaluated")

        dataset = Dataset.from_dict(
            {"question": questions, "answer": answers, "contexts": contexts}
        )

        result = evaluate(dataset, metrics=[faithfulness, context_precision])
        f = _score(result, "faithfulness")
        cp = _score(result, "context_precision")

        print("\n" + "=" * 50)
        print("Live RAG Evaluation Results")
        print("=" * 50)
        print(f"Questions evaluated: {len(questions)}")
        print(f"Faithfulness:       {f:.3f} (req: > 0.80)")
        print(f"Context Precision:  {cp:.3f} (req: > 0.75)")
        print("=" * 50)

        assert f > 0.80, "Live RAG faithfulness below requirement"
        assert cp > 0.75, "Live RAG precision below requirement"
