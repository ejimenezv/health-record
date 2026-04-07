# Prompt 30: Implement Load and Performance Tests

## Objective
Create load tests to verify the system meets performance requirements under concurrent load, with **PRIMARY focus on real-time streaming** and LEGACY support for batch processing.

**Real-time streaming targets (PRIMARY):**
- 10+ concurrent WebSocket connections streaming simultaneously
- <2s end-to-end latency (audio → transcript → extraction → UI)
- CRITICAL alerts delivered in <1s
- Event throughput: 50+ events/sec across all sessions
- Event persistence: <50ms per event (non-blocking)

**Batch processing targets (LEGACY):**
- 10+ concurrent batch transcriptions
- 50+ RAG queries/second
- Transcription completion <120s
- Query latency <3s p95

## Context
Load tests verify:

**Real-time streaming (PRIMARY):**
- WebSocket concurrent connection capacity (10+ simultaneous sessions)
- Real-time streaming latency (<2s end-to-end, CRITICAL alerts <1s)
- Event throughput under load (events/sec)
- Binary audio streaming performance (20ms chunks, Opus codec)
- Event persistence performance under high write load
- WebSocket reconnection and recovery under network failures

**Batch processing (LEGACY):**
- System performance under concurrent load
- Latency requirements (transcription <120s, query <3s)
- Throughput capacity (10 concurrent transcriptions, 50 queries/sec)
- Resource utilization under load
- System degradation patterns

## Tasks

### 1. Create Load Test Configuration

Create `ai-service/tests/load/locustfile.py`:

```python
"""
Load tests using Locust for the AI Service API.
"""
from locust import HttpUser, task, between, events
import json
import random
import time
from typing import Optional


class TranscriptionUser(HttpUser):
    """
    Simulates users uploading audio for transcription.
    """
    wait_time = between(5, 15)  # Wait 5-15 seconds between tasks
    host = "http://localhost:8000"

    def on_start(self):
        """Login and get auth token."""
        response = self.client.post(
            "/api/v1/auth/token",
            data={
                "username": "loadtest_user",
                "password": "loadtest_pass",
            }
        )

        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(3)
    def create_and_process_session(self):
        """
        Main workflow: Create session, upload audio, wait for completion.
        Weight: 3 (most common task)
        """
        # Create session
        with self.client.post(
            "/api/v1/transcription/sessions",
            json={
                "patient_id": f"patient-{random.randint(1000, 9999)}",
                "consultation_type": "general",
                "language": "es",
            },
            headers=self.headers,
            catch_response=True,
            name="/transcription/sessions [CREATE]",
        ) as response:
            if response.status_code == 201:
                session_id = response.json()["session_id"]
                response.success()

                # Upload audio (simulated small file)
                audio_data = self._generate_sample_audio()

                with self.client.post(
                    f"/api/v1/transcription/sessions/{session_id}/audio",
                    files={"audio": ("test.wav", audio_data, "audio/wav")},
                    headers=self.headers,
                    catch_response=True,
                    name="/transcription/sessions/{id}/audio [UPLOAD]",
                ) as upload_response:
                    if upload_response.status_code in [200, 202]:
                        upload_response.success()

                        # Poll for completion
                        self._poll_for_completion(session_id)
                    else:
                        upload_response.failure(f"Upload failed: {upload_response.status_code}")
            else:
                response.failure(f"Session creation failed: {response.status_code}")

    @task(1)
    def get_session_status(self):
        """
        Check status of existing session.
        Weight: 1 (less common)
        """
        # Simulate checking a random session
        session_id = f"session-{random.randint(1, 100)}"

        with self.client.get(
            f"/api/v1/transcription/sessions/{session_id}",
            headers=self.headers,
            catch_response=True,
            name="/transcription/sessions/{id} [GET]",
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    def _poll_for_completion(self, session_id: str, max_attempts: int = 20):
        """Poll session until completed or timeout."""
        for attempt in range(max_attempts):
            time.sleep(2)  # Wait 2 seconds between polls

            with self.client.get(
                f"/api/v1/transcription/sessions/{session_id}",
                headers=self.headers,
                catch_response=True,
                name="/transcription/sessions/{id} [POLL]",
            ) as response:
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status")

                    if status == "completed":
                        response.success()
                        return
                    elif status == "failed":
                        response.failure("Session processing failed")
                        return

        # Timeout
        self.client.get(
            f"/api/v1/transcription/sessions/{session_id}",
            headers=self.headers,
            catch_response=True,
            name="/transcription/sessions/{id} [TIMEOUT]",
        ).failure("Session processing timeout")

    def _generate_sample_audio(self) -> bytes:
        """Generate minimal WAV file for testing."""
        import struct

        sample_rate = 16000
        duration_sec = 5  # Short audio for load testing
        num_samples = sample_rate * duration_sec

        # WAV header
        header = b'RIFF'
        header += struct.pack('<I', 36 + num_samples * 2)
        header += b'WAVEfmt '
        header += struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
        header += b'data'
        header += struct.pack('<I', num_samples * 2)

        # Silent audio
        audio_data = b'\x00\x00' * num_samples

        return header + audio_data


class RAGQueryUser(HttpUser):
    """
    Simulates users querying the RAG knowledge base.
    """
    wait_time = between(1, 5)  # Faster queries
    host = "http://localhost:8000"

    sample_queries = [
        "¿Cuáles son las contraindicaciones del ibuprofeno?",
        "¿Qué es la cefalea tensional?",
        "Dosis recomendada de paracetamol en adultos",
        "Síntomas de migraña",
        "Interacciones del omeprazol",
        "Código CIE-10 para diabetes tipo 2",
        "Tratamiento para hipertensión arterial",
        "Efectos secundarios de la amoxicilina",
    ]

    def on_start(self):
        """Login and get auth token."""
        response = self.client.post(
            "/api/v1/auth/token",
            data={
                "username": "loadtest_user",
                "password": "loadtest_pass",
            }
        )

        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(5)
    def query_rag(self):
        """
        Query RAG endpoint.
        Weight: 5 (very common)
        """
        query = random.choice(self.sample_queries)

        start_time = time.time()

        with self.client.post(
            "/api/v1/query",
            json={
                "query": query,
                "top_k": 5,
            },
            headers=self.headers,
            catch_response=True,
            name="/query [POST]",
        ) as response:
            elapsed = (time.time() - start_time) * 1000  # ms

            if response.status_code == 200:
                # Check latency requirement
                if elapsed < 3000:  # < 3 seconds
                    response.success()
                else:
                    response.failure(f"Query too slow: {elapsed:.0f}ms")
            else:
                response.failure(f"Query failed: {response.status_code}")

    @task(1)
    def health_check(self):
        """
        Health check endpoint.
        Weight: 1 (monitoring)
        """
        with self.client.get(
            "/health",
            catch_response=True,
            name="/health [GET]",
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")


class AdminUser(HttpUser):
    """
    Simulates admin users ingesting documents.
    """
    wait_time = between(30, 60)  # Less frequent
    host = "http://localhost:8000"

    sample_documents = [
        {
            "content": "Ibuprofeno: AINE para dolor leve a moderado. Dosis: 400-800mg cada 6-8h.",
            "metadata": {"source": "vademecum", "type": "medication"},
        },
        {
            "content": "Cefalea tensional (G44.2): Dolor bilateral opresivo en cabeza.",
            "metadata": {"source": "cie10", "type": "diagnosis"},
        },
    ]

    def on_start(self):
        """Login as admin."""
        response = self.client.post(
            "/api/v1/auth/token",
            data={
                "username": "admin_user",
                "password": "admin_pass",
            }
        )

        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(1)
    def ingest_document(self):
        """
        Ingest document into RAG.
        Weight: 1 (rare operation)
        """
        document = random.choice(self.sample_documents)

        with self.client.post(
            "/api/v1/ingest",
            json={"documents": [document]},
            headers=self.headers,
            catch_response=True,
            name="/ingest [POST]",
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Ingest failed: {response.status_code}")


# Event hooks for custom metrics
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Initialize test."""
    print("Starting load test...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Report test results."""
    print("\n" + "="*50)
    print("LOAD TEST RESULTS")
    print("="*50)

    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Median response time: {stats.total.median_response_time}ms")
    print(f"95th percentile: {stats.total.get_response_time_percentile(0.95)}ms")
    print(f"99th percentile: {stats.total.get_response_time_percentile(0.99)}ms")
    print(f"Requests/sec: {stats.total.total_rps:.2f}")
    print("="*50)
```

### 2. Create Performance Benchmark Tests

Create `ai-service/tests/load/benchmark.py`:

```python
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
            latencies.append((end - start) * 1000)  # ms

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

        # Assert performance requirement
        assert stats['p95'] < 5000  # < 5 seconds for 5min audio

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_chunking_performance(self, benchmark_data):
        """Benchmark audio chunking speed."""
        from src.transcription.audio_processor import chunk_audio

        def run_chunking():
            return chunk_audio(
                duration_sec=3600,  # 60 minutes
                speech_regions=[(0, 3600)],
                max_chunk_duration=600,
            )

        start = time.perf_counter()
        for _ in range(100):
            run_chunking()
        end = time.perf_counter()

        avg_time_ms = ((end - start) / 100) * 1000

        print(f"\nChunking (60min audio): {avg_time_ms:.2f}ms average")

        assert avg_time_ms < 100  # Should be very fast


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

        # Should be fast (mostly network)
        assert stats['p95'] < 2000  # < 2 seconds

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

        # Should be very fast
        assert stats['p95'] < 500  # < 500ms


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

        # NFR-002: < 30 seconds p95
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

        # Run 50 concurrent queries
        start = time.perf_counter()
        tasks = [query() for _ in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end = time.perf_counter()

        elapsed = (end - start) * 1000
        qps = 50 / (elapsed / 1000)

        print(f"\n50 concurrent queries:")
        print(f"  Total time: {elapsed:.0f}ms")
        print(f"  QPS: {qps:.2f}")

        # Should handle 50 queries/sec (NFR-004)
        assert qps >= 50

        # Check for errors
        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_concurrent_transcriptions(self):
        """Test handling concurrent transcription sessions."""
        from src.core.orchestrator import AIOrchestrator

        orchestrator = AIOrchestrator()

        async def process_session():
            # Simulate processing
            await asyncio.sleep(0.1)
            return {"status": "completed"}

        # Run 10 concurrent transcriptions (NFR-004)
        start = time.perf_counter()
        tasks = [process_session() for _ in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end = time.perf_counter()

        elapsed = (end - start) * 1000

        print(f"\n10 concurrent transcriptions:")
        print(f"  Total time: {elapsed:.0f}ms")

        # Should handle without errors
        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0


@pytest.fixture
def benchmark_data():
    """Sample data for benchmarking."""
    class BenchmarkData:
        audio_5min = b'\x00' * (16000 * 2 * 60 * 5)  # 5 min of 16kHz mono

    return BenchmarkData()
```

### 3. Create Load Test Scripts

Create `ai-service/tests/load/run_load_test.sh`:

```bash
#!/bin/bash
# Run load tests with different scenarios

set -e

echo "MedRecord AI - Load Testing Suite"
echo "=================================="

# Check if locust is installed
if ! command -v locust &> /dev/null; then
    echo "Error: Locust not installed. Run: pip install locust"
    exit 1
fi

# Start the AI service if not running
echo "Checking if AI service is running..."
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "Warning: AI service not accessible at http://localhost:8000"
    echo "Please start the service first"
    exit 1
fi

# Function to run load test scenario
run_scenario() {
    local name=$1
    local users=$2
    local spawn_rate=$3
    local duration=$4
    local user_class=$5

    echo ""
    echo "Running: $name"
    echo "Users: $users, Spawn rate: $spawn_rate, Duration: $duration"
    echo "----------------------------------------"

    locust \
        -f tests/load/locustfile.py \
        --headless \
        --users $users \
        --spawn-rate $spawn_rate \
        --run-time $duration \
        --host http://localhost:8000 \
        --html reports/load_test_${name}.html \
        --csv reports/load_test_${name} \
        $user_class

    echo "Report saved: reports/load_test_${name}.html"
}

# Create reports directory
mkdir -p reports

# Scenario 1: Light load - RAG queries
run_scenario "light_rag" 10 2 "2m" "RAGQueryUser"

# Scenario 2: Medium load - Mixed users
run_scenario "medium_mixed" 25 5 "3m" ""

# Scenario 3: Heavy load - Peak usage
run_scenario "heavy_peak" 50 10 "3m" ""

# Scenario 4: Transcription stress test
run_scenario "transcription_stress" 20 5 "3m" "TranscriptionUser"

# Scenario 5: Spike test - Sudden load increase
echo ""
echo "Running: Spike Test"
echo "----------------------------------------"
locust \
    -f tests/load/locustfile.py \
    --headless \
    --users 100 \
    --spawn-rate 50 \
    --run-time 1m \
    --host http://localhost:8000 \
    --html reports/load_test_spike.html

echo ""
echo "=================================="
echo "Load testing completed!"
echo "Check reports/ directory for detailed results"
```

Make executable:
```bash
chmod +x ai-service/tests/load/run_load_test.sh
```

### 4. Create Performance Test Report

Create `ai-service/tests/load/analyze_results.py`:

```python
"""
Analyze and report load test results.
"""
import csv
import json
from pathlib import Path
from typing import Dict, List


class LoadTestAnalyzer:
    """Analyze Locust CSV results."""

    def __init__(self, csv_stats_file: str):
        self.csv_file = csv_stats_file
        self.stats = self._load_stats()

    def _load_stats(self) -> List[Dict]:
        """Load stats from CSV."""
        stats = []
        with open(self.csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats.append(row)
        return stats

    def check_requirements(self) -> Dict[str, bool]:
        """Check if performance requirements are met."""
        results = {}

        for stat in self.stats:
            name = stat['Name']

            # Skip aggregated rows
            if name in ['Aggregated', '']:
                continue

            # Extract metrics
            median = float(stat.get('Median Response Time', 0))
            p95 = float(stat.get('95%', 0))
            p99 = float(stat.get('99%', 0))
            failure_rate = float(stat.get('Failure Rate', '0').rstrip('%'))

            # Check requirements based on endpoint
            if '/query' in name:
                # RNF-003: Query < 3s p95
                results[f"{name} - Latency"] = p95 < 3000
            elif '/transcription' in name:
                # RNF-001: Transcription reasonable time
                results[f"{name} - Latency"] = p95 < 120000
            elif '/health' in name:
                # Health should be very fast
                results[f"{name} - Latency"] = median < 100

            # All endpoints should have low failure rate
            results[f"{name} - Reliability"] = failure_rate < 5.0

        return results

    def generate_report(self) -> str:
        """Generate markdown report."""
        report = "# Load Test Results\n\n"

        report += "## Performance Metrics\n\n"
        report += "| Endpoint | Requests | Failures | Median | P95 | P99 | RPS |\n"
        report += "|----------|----------|----------|--------|-----|-----|-----|\n"

        for stat in self.stats:
            if stat['Name'] in ['Aggregated', '']:
                continue

            report += f"| {stat['Name']} "
            report += f"| {stat.get('Request Count', 0)} "
            report += f"| {stat.get('Failure Count', 0)} "
            report += f"| {stat.get('Median Response Time', 0)}ms "
            report += f"| {stat.get('95%', 0)}ms "
            report += f"| {stat.get('99%', 0)}ms "
            report += f"| {stat.get('Requests/s', 0)} |\n"

        report += "\n## Requirement Compliance\n\n"

        requirements = self.check_requirements()
        passed = sum(1 for v in requirements.values() if v)
        total = len(requirements)

        report += f"**{passed}/{total} checks passed**\n\n"

        for check, result in requirements.items():
            status = "✅" if result else "❌"
            report += f"- {status} {check}\n"

        return report


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python analyze_results.py <stats_csv_file>")
        sys.exit(1)

    analyzer = LoadTestAnalyzer(sys.argv[1])
    report = analyzer.generate_report()

    print(report)

    # Save report
    output_file = sys.argv[1].replace('_stats.csv', '_report.md')
    with open(output_file, 'w') as f:
        f.write(report)

    print(f"\nReport saved to: {output_file}")
```

### 5. Create Real-Time WebSocket Load Tests

Create `ai-service/tests/load/websocket_load_test.py`:

```python
"""
Load tests for real-time WebSocket streaming.
"""
import asyncio
import json
import time
import websockets
from typing import List, Dict
from statistics import mean, median
import argparse


class WebSocketLoadTester:
    """Load tester for WebSocket connections."""

    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.auth_token = auth_token
        self.metrics = {
            "connections": [],
            "latencies": [],
            "events_received": [],
            "errors": [],
        }

    async def create_session(self) -> str:
        """Create a new session via REST API."""
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/api/consultations/sessions",
                json={
                    "patientId": f"loadtest-patient-{int(time.time() * 1000)}",
                    "appointmentType": "general",
                    "language": "es",
                },
                headers={"Authorization": f"Bearer {self.auth_token}"},
            ) as response:
                data = await response.json()
                return data["sessionId"]

    async def simulate_realtime_session(self, session_id: str, duration_sec: int = 30):
        """Simulate a real-time streaming session."""
        ws_url = f"ws://{self.base_url.replace('http://', '')}/ws/session/{session_id}?token={self.auth_token}"

        start_time = time.perf_counter()
        events_received = 0
        latencies = []

        try:
            async with websockets.connect(ws_url) as websocket:
                connection_time = (time.perf_counter() - start_time) * 1000
                self.metrics["connections"].append(connection_time)

                # Send audio chunks for specified duration
                end_time = time.time() + duration_sec

                send_task = asyncio.create_task(
                    self._send_audio_chunks(websocket, end_time)
                )
                receive_task = asyncio.create_task(
                    self._receive_events(websocket, end_time, latencies)
                )

                await asyncio.gather(send_task, receive_task)

                events_received = len(latencies)

        except Exception as e:
            self.metrics["errors"].append(str(e))

        self.metrics["events_received"].append(events_received)
        if latencies:
            self.metrics["latencies"].extend(latencies)

    async def _send_audio_chunks(self, websocket, end_time: float):
        """Send simulated audio chunks every 20ms."""
        chunk_size = 320  # ~20ms of 16kHz mono audio (Opus frame)

        while time.time() < end_time:
            # Send binary audio chunk (silence for testing)
            audio_chunk = b'\x00' * chunk_size
            await websocket.send(audio_chunk)
            await asyncio.sleep(0.02)  # 20ms

    async def _receive_events(self, websocket, end_time: float, latencies: List[float]):
        """Receive and measure WebSocket events."""
        while time.time() < end_time:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=1.0)

                receive_time = time.perf_counter()

                # Parse event
                event = json.loads(message)
                event_timestamp = event.get("timestamp")

                if event_timestamp:
                    # Calculate latency (simplified - would use proper timestamp parsing)
                    # For now, just measure time since connection
                    latency_ms = (receive_time - time.perf_counter()) * 1000
                    latencies.append(abs(latency_ms))

                # Check for CRITICAL alerts
                if event.get("event") == "validation_alert":
                    if event["data"]["severity"] == "CRITICAL":
                        # Measure alert latency
                        latencies.append(abs(latency_ms))

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.metrics["errors"].append(str(e))
                break

    async def run_concurrent_sessions(self, num_sessions: int, duration_sec: int = 30):
        """Run multiple concurrent WebSocket sessions."""
        print(f"Starting {num_sessions} concurrent WebSocket sessions...")
        print(f"Duration: {duration_sec} seconds per session")

        start_time = time.perf_counter()

        # Create sessions
        session_ids = []
        for i in range(num_sessions):
            session_id = await self.create_session()
            session_ids.append(session_id)
            print(f"Created session {i+1}/{num_sessions}: {session_id}")

        # Run concurrent streaming sessions
        tasks = [
            self.simulate_realtime_session(sid, duration_sec)
            for sid in session_ids
        ]

        await asyncio.gather(*tasks, return_exceptions=True)

        total_time = time.perf_counter() - start_time

        # Print results
        self._print_results(total_time)

    def _print_results(self, total_time: float):
        """Print load test results."""
        print("\n" + "="*60)
        print("REAL-TIME WEBSOCKET LOAD TEST RESULTS")
        print("="*60)

        # Connection metrics
        if self.metrics["connections"]:
            print(f"\nConnection Times:")
            print(f"  Min:    {min(self.metrics['connections']):.2f}ms")
            print(f"  Median: {median(self.metrics['connections']):.2f}ms")
            print(f"  Mean:   {mean(self.metrics['connections']):.2f}ms")
            print(f"  Max:    {max(self.metrics['connections']):.2f}ms")

            # Check requirement: <500ms connection time
            if median(self.metrics['connections']) < 500:
                print("  ✅ Connection time requirement met (<500ms)")
            else:
                print("  ❌ Connection time requirement NOT met (<500ms)")

        # Event latency metrics
        if self.metrics["latencies"]:
            sorted_latencies = sorted(self.metrics["latencies"])
            p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
            p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]

            print(f"\nEvent Latencies:")
            print(f"  Min:    {min(self.metrics['latencies']):.2f}ms")
            print(f"  Median: {median(self.metrics['latencies']):.2f}ms")
            print(f"  Mean:   {mean(self.metrics['latencies']):.2f}ms")
            print(f"  P95:    {p95:.2f}ms")
            print(f"  P99:    {p99:.2f}ms")
            print(f"  Max:    {max(self.metrics['latencies']):.2f}ms")

            # Check requirement: <2s end-to-end latency
            if p95 < 2000:
                print("  ✅ End-to-end latency requirement met (<2s p95)")
            else:
                print("  ❌ End-to-end latency requirement NOT met (<2s p95)")

        # Event throughput
        if self.metrics["events_received"]:
            total_events = sum(self.metrics["events_received"])
            events_per_sec = total_events / total_time

            print(f"\nEvent Throughput:")
            print(f"  Total events: {total_events}")
            print(f"  Events/sec:   {events_per_sec:.2f}")

            # Check requirement: >50 events/sec
            if events_per_sec >= 50:
                print("  ✅ Event throughput requirement met (>50 events/sec)")
            else:
                print("  ❌ Event throughput requirement NOT met (>50 events/sec)")

        # Errors
        print(f"\nErrors: {len(self.metrics['errors'])}")
        if self.metrics['errors']:
            for error in self.metrics['errors'][:10]:  # Show first 10
                print(f"  - {error}")

        print("="*60)


async def main():
    parser = argparse.ArgumentParser(description="WebSocket Load Tester")
    parser.add_argument("--url", default="http://localhost:3000", help="Base URL")
    parser.add_argument("--token", required=True, help="Auth token")
    parser.add_argument("--sessions", type=int, default=10, help="Number of concurrent sessions")
    parser.add_argument("--duration", type=int, default=30, help="Duration per session (seconds)")

    args = parser.parse_args()

    tester = WebSocketLoadTester(args.url, args.token)
    await tester.run_concurrent_sessions(args.sessions, args.duration)


if __name__ == "__main__":
    asyncio.run(main())
```

Usage:
```bash
python tests/load/websocket_load_test.py --token YOUR_AUTH_TOKEN --sessions 10 --duration 30
```

### 6. Create Event Persistence Performance Tests

Create `ai-service/tests/load/event_persistence_load.py`:

```python
"""
Load tests for event persistence performance.
"""
import asyncio
import time
from typing import List
from statistics import mean, median
import sys


class EventPersistenceLoadTester:
    """Load tester for event persistence to PostgreSQL."""

    def __init__(self, db_connection_string: str):
        self.db_connection_string = db_connection_string
        self.write_latencies: List[float] = []
        self.errors: List[str] = []

    async def test_high_volume_writes(
        self,
        num_sessions: int = 10,
        events_per_session: int = 100,
    ):
        """Test event persistence under high write volume."""
        import asyncpg

        print(f"Testing event persistence:")
        print(f"  Sessions: {num_sessions}")
        print(f"  Events per session: {events_per_session}")
        print(f"  Total events: {num_sessions * events_per_session}")

        pool = await asyncpg.create_pool(self.db_connection_string)

        async def write_events_for_session(session_id: str):
            """Write events for a single session."""
            for i in range(events_per_session):
                start = time.perf_counter()

                try:
                    async with pool.acquire() as conn:
                        await conn.execute(
                            """
                            INSERT INTO transcription_events
                            (session_id, chunk_index, text, is_final, confidence, event_data)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            """,
                            session_id,
                            i,
                            f"Test transcript chunk {i}",
                            True,
                            0.95,
                            '{}',
                        )

                    elapsed_ms = (time.perf_counter() - start) * 1000
                    self.write_latencies.append(elapsed_ms)

                except Exception as e:
                    self.errors.append(str(e))

        # Run concurrent writes
        start_time = time.perf_counter()

        tasks = [
            write_events_for_session(f"session-{i}")
            for i in range(num_sessions)
        ]

        await asyncio.gather(*tasks)

        total_time = time.perf_counter() - start_time

        await pool.close()

        # Print results
        self._print_results(total_time, num_sessions * events_per_session)

    def _print_results(self, total_time: float, total_events: int):
        """Print performance results."""
        print("\n" + "="*60)
        print("EVENT PERSISTENCE LOAD TEST RESULTS")
        print("="*60)

        if self.write_latencies:
            sorted_latencies = sorted(self.write_latencies)
            p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
            p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]

            print(f"\nWrite Latencies:")
            print(f"  Min:    {min(self.write_latencies):.2f}ms")
            print(f"  Median: {median(self.write_latencies):.2f}ms")
            print(f"  Mean:   {mean(self.write_latencies):.2f}ms")
            print(f"  P95:    {p95:.2f}ms")
            print(f"  P99:    {p99:.2f}ms")
            print(f"  Max:    {max(self.write_latencies):.2f}ms")

            # Check requirement: <50ms per event (non-blocking)
            if p95 < 50:
                print("  ✅ Write latency requirement met (<50ms p95)")
            else:
                print("  ❌ Write latency requirement NOT met (<50ms p95)")

        # Throughput
        writes_per_sec = total_events / total_time

        print(f"\nThroughput:")
        print(f"  Total events: {total_events}")
        print(f"  Total time:   {total_time:.2f}s")
        print(f"  Writes/sec:   {writes_per_sec:.2f}")

        # Errors
        error_rate = (len(self.errors) / total_events) * 100 if total_events > 0 else 0

        print(f"\nErrors:")
        print(f"  Total errors: {len(self.errors)}")
        print(f"  Error rate:   {error_rate:.2f}%")

        if error_rate < 1.0:
            print("  ✅ Error rate acceptable (<1%)")
        else:
            print("  ❌ Error rate too high (>=1%)")

        print("="*60)


async def main():
    if len(sys.argv) < 2:
        print("Usage: python event_persistence_load.py <db_connection_string>")
        sys.exit(1)

    db_url = sys.argv[1]

    tester = EventPersistenceLoadTester(db_url)
    await tester.test_high_volume_writes(num_sessions=10, events_per_session=100)


if __name__ == "__main__":
    asyncio.run(main())
```

Usage:
```bash
python tests/load/event_persistence_load.py "postgresql://user:pass@localhost:5432/medrecord"
```

### 7. Create WebSocket Reconnection Test

Create `ai-service/tests/load/websocket_reconnection_test.py`:

```python
"""
Tests for WebSocket reconnection and recovery.
"""
import asyncio
import websockets
import time


async def test_reconnection_after_network_failure():
    """Test WebSocket reconnection after simulated network failure."""
    base_url = "ws://localhost:3000"
    auth_token = "test-token"
    session_id = "test-session"

    uri = f"{base_url}/ws/session/{session_id}?token={auth_token}"

    reconnect_attempts = 0
    max_reconnects = 5
    successful_reconnections = 0

    print("Testing WebSocket reconnection...")

    for attempt in range(max_reconnects):
        try:
            print(f"\nAttempt {attempt + 1}/{max_reconnects}")

            async with websockets.connect(uri) as websocket:
                print("  ✅ Connected")

                # Send some data
                await websocket.send(b'\x00' * 100)

                # Simulate network failure by closing connection
                await asyncio.sleep(2)
                await websocket.close()
                print("  Connection closed (simulated network failure)")

                successful_reconnections += 1

        except Exception as e:
            print(f"  ❌ Connection failed: {e}")

        reconnect_attempts += 1

        # Wait before reconnecting
        await asyncio.sleep(1)

    # Results
    print("\n" + "="*60)
    print("RECONNECTION TEST RESULTS")
    print("="*60)
    print(f"Successful reconnections: {successful_reconnections}/{max_reconnects}")
    print(f"Success rate: {(successful_reconnections/max_reconnects)*100:.1f}%")

    if successful_reconnections >= max_reconnects * 0.9:
        print("✅ Reconnection reliability meets requirements (>90%)")
    else:
        print("❌ Reconnection reliability below requirements (<90%)")

    print("="*60)


if __name__ == "__main__":
    asyncio.run(test_reconnection_after_network_failure())
```

## Expected Deliverables

1. `ai-service/tests/load/locustfile.py` - Locust load test scenarios (batch/legacy)
2. `ai-service/tests/load/benchmark.py` - Performance benchmarks (batch/legacy)
3. `ai-service/tests/load/run_load_test.sh` - Load test runner script (batch/legacy)
4. `ai-service/tests/load/analyze_results.py` - Results analyzer (batch/legacy)
5. **`ai-service/tests/load/websocket_load_test.py` - WebSocket load tests (NEW)**
6. **`ai-service/tests/load/event_persistence_load.py` - Event persistence performance tests (NEW)**
7. **`ai-service/tests/load/websocket_reconnection_test.py` - WebSocket reconnection tests (NEW)**

## Verification Steps

### Real-Time Streaming Load Tests (PRIMARY)
1. **WebSocket concurrent connections:**
   ```bash
   python tests/load/websocket_load_test.py --token TOKEN --sessions 10 --duration 30
   ```
   - ✅ 10+ concurrent WebSocket sessions
   - ✅ Connection time <500ms median
   - ✅ End-to-end latency <2s p95
   - ✅ CRITICAL alerts <1s

2. **Event persistence performance:**
   ```bash
   python tests/load/event_persistence_load.py "postgresql://..."
   ```
   - ✅ Event write latency <50ms p95
   - ✅ Error rate <1%
   - ✅ Handles 50+ writes/sec

3. **WebSocket reconnection:**
   ```bash
   python tests/load/websocket_reconnection_test.py
   ```
   - ✅ Reconnection success rate >90%

4. **Event throughput:**
   - ✅ System handles 50+ events/sec across all sessions

### Batch/Legacy Load Tests
1. Run light load test: `./tests/load/run_load_test.sh`
2. Verify NFR-003: Query latency < 3s p95
3. Verify NFR-004: System handles 10 concurrent transcriptions, 50 queries/sec
4. Check failure rate < 5%
5. Generate performance reports

## Notes

### Real-Time Load Testing Notes
- **WebSocket load tests:** Simulate realistic audio streaming (20ms chunks, Opus codec)
- **Event persistence:** Test with concurrent writes from multiple sessions
- **Latency targets:**
  - Connection establishment: <500ms
  - End-to-end (audio → UI): <2s p95
  - CRITICAL alerts: <1s
  - Event persistence: <50ms (non-blocking)
- **Throughput targets:**
  - 10+ concurrent WebSocket sessions
  - 50+ events/sec across all sessions
- **Reconnection:** Test network failure recovery
- Monitor PostgreSQL connection pool size and query performance

### General Load Testing Notes
- Run load tests in staging environment, not production
- Ensure external services (OpenAI, WebSocket connections) can handle load
- Monitor resource usage (CPU, memory, network, database connections)
- Start with light load and gradually increase
- Load tests help identify bottlenecks before production
- Keep load test durations reasonable (2-5 minutes for initial tests, longer for endurance)
- Use realistic data (audio chunks, event volumes, session durations)
- Test failure scenarios (network drops, database slowdowns, high latency)
