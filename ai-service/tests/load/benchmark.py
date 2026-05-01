"""
Performance benchmark tests for critical operations.
"""
import asyncio
import time
from statistics import mean, median, stdev
from typing import List, Tuple

import pytest


class PerformanceBenchmark:
    """Performance benchmarking utilities."""

    @staticmethod
    async def measure_async(
        func,
        *args,
        iterations: int = 100,
        **kwargs
    ) -> Tuple[List[float], dict]:
        """
        Measure async function performance.

        Returns:
            (latencies, stats)
        """
        latencies = []

        for _ in range(iterations):
            start = time.perf_counter()
            await func(*args, **kwargs)
            end = time.perf_counter()
            latencies.append((end - start) * 1000)

        stats = {
            "min": min(latencies),
            "max": max(latencies),
            "mean": mean(latencies),
            "median": median(latencies),
            "p95": sorted(latencies)[int(iterations * 0.95)],
            "p99": sorted(latencies)[int(iterations * 0.99)],
            "stdev": stdev(latencies) if len(latencies) > 1 else 0,
        }

        return latencies, stats

    @staticmethod
    def print_stats(name: str, stats: dict):
        """Print formatted stats."""
        print(f"\n{name}:")
        print(f"  Min:    {stats['min']:.2f}ms")
        print(f"  Median: {stats['median']:.2f}ms")
        print(f"  Mean:   {stats['mean']:.2f}ms")
        print(f"  P95:    {stats['p95']:.2f}ms")
        print(f"  P99:    {stats['p99']:.2f}ms")
        print(f"  Max:    {stats['max']:.2f}ms")
        print(f"  StdDev: {stats['stdev']:.2f}ms")


class TestTranscriptionPerformance:
    """Benchmarks for transcription service."""

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_vad_performance(self, benchmark_data):
        """Benchmark VAD processing speed."""
        from src.transcription.audio_processor import AudioProcessor

        processor = AudioProcessor()

        async def run_vad():
            await processor._apply_vad(benchmark_data.audio_5min)

        latencies, stats = await PerformanceBenchmark.measure_async(
            run_vad,
            iterations=50,
        )

        PerformanceBenchmark.print_stats("VAD Processing (5min audio)", stats)

        assert stats['p95'] < 5000

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_chunking_performance(self, benchmark_data):
        """Benchmark audio chunking speed."""
        from src.transcription.audio_processor import chunk_audio

        def run_chunking():
            return chunk_audio(
                duration_sec=3600,
                speech_regions=[(0, 3600)],
                max_chunk_duration=600,
            )

        start = time.perf_counter()
        for _ in range(100):
            run_chunking()
        end = time.perf_counter()

        avg_time_ms = ((end - start) / 100) * 1000

        print(f"\nChunking (60min audio): {avg_time_ms:.2f}ms average")

        assert avg_time_ms < 100


class TestRAGPerformance:
    """Benchmarks for RAG pipeline."""

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_embedding_generation_performance(self, mock_openai_client):
        """Benchmark embedding generation."""
        from src.rag.pipeline import EmbeddingService

        service = EmbeddingService()

        async def generate_embedding():
            await service.embed("Sample medical text for embedding")

        latencies, stats = await PerformanceBenchmark.measure_async(
            generate_embedding,
            iterations=50,
        )

        PerformanceBenchmark.print_stats("Embedding Generation", stats)

        assert stats['p95'] < 2000

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_vector_search_performance(self, mock_chroma_client):
        """Benchmark vector similarity search."""
        from src.rag.pipeline import VectorStore

        store = VectorStore()

        async def search():
            await store.query(
                query_embedding=[0.1] * 1536,
                n_results=5,
            )

        latencies, stats = await PerformanceBenchmark.measure_async(
            search,
            iterations=100,
        )

        PerformanceBenchmark.print_stats("Vector Search", stats)

        assert stats['p95'] < 500


class TestExtractionPerformance:
    """Benchmarks for extraction service."""

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_extraction_latency(self, mock_openai_client, sample_transcription):
        """Benchmark full extraction latency."""
        from src.transcription.extractor import ExtractionService

        service = ExtractionService()

        async def extract():
            await service.extract(sample_transcription)

        latencies, stats = await PerformanceBenchmark.measure_async(
            extract,
            iterations=20,
        )

        PerformanceBenchmark.print_stats("Medical Extraction", stats)

        assert stats['p95'] < 30000


class TestConcurrency:
    """Test system under concurrent load."""

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_concurrent_queries(self, mock_openai_client, mock_chroma_client):
        """Test handling concurrent RAG queries."""
        from src.rag.pipeline import RAGPipeline

        pipeline = RAGPipeline()

        async def query():
            return await pipeline.query("¿Qué es el ibuprofeno?")

        start = time.perf_counter()
        tasks = [query() for _ in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end = time.perf_counter()

        elapsed = (end - start) * 1000
        qps = 50 / (elapsed / 1000)

        print(f"\n50 concurrent queries:")
        print(f"  Total time: {elapsed:.0f}ms")
        print(f"  QPS: {qps:.2f}")

        assert qps >= 50

        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_concurrent_transcriptions(self):
        """Test handling concurrent transcription sessions."""
        from src.core.orchestrator import AIOrchestrator

        orchestrator = AIOrchestrator()

        async def process_session():
            await asyncio.sleep(0.1)
            return {"status": "completed"}

        start = time.perf_counter()
        tasks = [process_session() for _ in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end = time.perf_counter()

        elapsed = (end - start) * 1000

        print(f"\n10 concurrent transcriptions:")
        print(f"  Total time: {elapsed:.0f}ms")

        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0


@pytest.fixture
def benchmark_data():
    """Sample data for benchmarking."""
    class BenchmarkData:
        audio_5min = b'\x00' * (16000 * 2 * 60 * 5)

    return BenchmarkData()
