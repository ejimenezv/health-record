"""
Load tests for real-time WebSocket streaming.

Auth: JWT-only, minted in-process via src.security.auth.create_token. Run from
the ai-service/ directory:

    cd ai-service
    python tests/load/websocket_load_test.py --sessions 10 --duration 30

The default base URL targets the AI service directly (http://localhost:8000).
Override with --url. Set LOADTEST_JWT to reuse an existing token.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import time
from statistics import mean, median
from typing import List
from urllib.parse import urlsplit

import aiohttp
import websockets

from tests.load._auth import mint_token


class WebSocketLoadTester:
    """Load tester for WebSocket connections."""

    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        self.metrics = {
            "connections": [],
            "latencies": [],
            "events_received": [],
            "errors": [],
        }

    def _ws_url(self, session_id: str) -> str:
        parts = urlsplit(self.base_url)
        scheme = "wss" if parts.scheme == "https" else "ws"
        return f"{scheme}://{parts.netloc}/ws/session?session_id={session_id}&token={self.auth_token}"

    async def create_session(self, http: aiohttp.ClientSession) -> str:
        """Create a session via the live REST contract."""
        async with http.post(
            f"{self.base_url}/api/v1/sessions",
            json={
                "patient_id": f"loadtest-patient-{int(time.time() * 1000)}",
                "doctor_id": "loadtest-doctor",
                "specialty": "medicina general",
                "metadata": {"source": "loadtest-ws"},
            },
            headers={"Authorization": f"Bearer {self.auth_token}"},
        ) as response:
            response.raise_for_status()
            data = await response.json()
            # Live contract wraps the session: {"session": {...}, "message": "..."}
            return data["session"]["session_id"]

    async def end_session(self, http: aiohttp.ClientSession, session_id: str) -> None:
        try:
            await http.delete(
                f"{self.base_url}/api/v1/sessions/{session_id}",
                headers={"Authorization": f"Bearer {self.auth_token}"},
            )
        except Exception as e:
            self.metrics["errors"].append(f"end_session({session_id}): {e}")

    async def simulate_realtime_session(self, session_id: str, duration_sec: int = 30):
        """Simulate a real-time streaming session over WebSocket."""
        ws_url = self._ws_url(session_id)

        start_time = time.perf_counter()
        latencies: List[float] = []

        try:
            async with websockets.connect(ws_url, max_size=4 * 1024 * 1024) as websocket:
                connection_time = (time.perf_counter() - start_time) * 1000
                self.metrics["connections"].append(connection_time)

                end_time = time.time() + duration_sec
                send_task = asyncio.create_task(self._send_audio_chunks(websocket, end_time))
                receive_task = asyncio.create_task(self._receive_events(websocket, end_time, latencies))
                await asyncio.gather(send_task, receive_task)
        except Exception as e:
            self.metrics["errors"].append(f"session({session_id}): {e}")

        self.metrics["events_received"].append(len(latencies))
        if latencies:
            self.metrics["latencies"].extend(latencies)

    async def _send_audio_chunks(self, websocket, end_time: float):
        """Send simulated 20ms PCM audio chunks (16kHz mono)."""
        chunk_size = 640  # 20ms * 16000 Hz * 2 bytes
        while time.time() < end_time:
            await websocket.send(b"\x00" * chunk_size)
            await asyncio.sleep(0.02)

    async def _receive_events(self, websocket, end_time: float, latencies: List[float]):
        """Receive WebSocket events and measure server-to-client lag."""
        while time.time() < end_time:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.metrics["errors"].append(f"recv: {e}")
                break

            recv_perf = time.perf_counter()
            try:
                event = json.loads(message)
            except (TypeError, ValueError):
                continue

            # Server emits ISO timestamps. Compute end-to-end lag if present.
            ts = event.get("timestamp") or event.get("data", {}).get("timestamp")
            if ts:
                try:
                    from datetime import datetime
                    server_t = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                    latency_ms = max(0.0, (time.time() - server_t) * 1000)
                    latencies.append(latency_ms)
                except Exception:
                    pass

            if event.get("event") == "validation_alert":
                severity = event.get("data", {}).get("severity")
                if severity == "CRITICAL":
                    # Re-record so CRITICAL alerts stand out in stats
                    latencies.append(latencies[-1] if latencies else 0.0)

    async def run_concurrent_sessions(self, num_sessions: int, duration_sec: int = 30):
        print(f"Starting {num_sessions} concurrent WebSocket sessions...")
        print(f"Duration: {duration_sec} seconds per session")

        start_time = time.perf_counter()

        async with aiohttp.ClientSession() as http:
            session_ids: List[str] = []
            for i in range(num_sessions):
                try:
                    session_id = await self.create_session(http)
                    session_ids.append(session_id)
                    print(f"Created session {i + 1}/{num_sessions}: {session_id}")
                except Exception as e:
                    self.metrics["errors"].append(f"create_session: {e}")
                    print(f"  [FAIL] create_session: {e}")

            tasks = [self.simulate_realtime_session(sid, duration_sec) for sid in session_ids]
            await asyncio.gather(*tasks, return_exceptions=True)

            cleanup = [self.end_session(http, sid) for sid in session_ids]
            await asyncio.gather(*cleanup, return_exceptions=True)

        total_time = time.perf_counter() - start_time
        self._print_results(total_time)

    def _print_results(self, total_time: float):
        print("\n" + "=" * 60)
        print("REAL-TIME WEBSOCKET LOAD TEST RESULTS")
        print("=" * 60)

        if self.metrics["connections"]:
            print("\nConnection Times:")
            print(f"  Min:    {min(self.metrics['connections']):.2f}ms")
            print(f"  Median: {median(self.metrics['connections']):.2f}ms")
            print(f"  Mean:   {mean(self.metrics['connections']):.2f}ms")
            print(f"  Max:    {max(self.metrics['connections']):.2f}ms")
            verdict = "[PASS]" if median(self.metrics["connections"]) < 500 else "[FAIL]"
            print(f"  {verdict} Connection time requirement (<500ms median)")

        if self.metrics["latencies"]:
            sorted_lat = sorted(self.metrics["latencies"])
            p95 = sorted_lat[int(len(sorted_lat) * 0.95)]
            p99 = sorted_lat[int(len(sorted_lat) * 0.99)]
            print("\nEvent Latencies:")
            print(f"  Min:    {min(sorted_lat):.2f}ms")
            print(f"  Median: {median(sorted_lat):.2f}ms")
            print(f"  Mean:   {mean(sorted_lat):.2f}ms")
            print(f"  P95:    {p95:.2f}ms")
            print(f"  P99:    {p99:.2f}ms")
            print(f"  Max:    {max(sorted_lat):.2f}ms")
            verdict = "[PASS]" if p95 < 2000 else "[FAIL]"
            print(f"  {verdict} End-to-end latency requirement (<2s p95)")

        if self.metrics["events_received"]:
            total_events = sum(self.metrics["events_received"])
            events_per_sec = total_events / total_time if total_time > 0 else 0
            print("\nEvent Throughput:")
            print(f"  Total events: {total_events}")
            print(f"  Events/sec:   {events_per_sec:.2f}")
            verdict = "[PASS]" if events_per_sec >= 50 else "[FAIL]"
            print(f"  {verdict} Event throughput requirement (>=50 events/sec)")

        print(f"\nErrors: {len(self.metrics['errors'])}")
        for error in self.metrics["errors"][:10]:
            print(f"  - {error}")
        print("=" * 60)


async def main():
    parser = argparse.ArgumentParser(description="WebSocket Load Tester")
    parser.add_argument("--url", default="http://localhost:8000", help="AI service base URL")
    parser.add_argument("--token", default=None, help="JWT (defaults to a freshly-minted one)")
    parser.add_argument("--sessions", type=int, default=10, help="Concurrent sessions")
    parser.add_argument("--duration", type=int, default=30, help="Duration per session (s)")
    parser.add_argument("--sub", default="loadtest-ws", help="JWT subject")
    parser.add_argument("--role", default="doctor", help="JWT role")
    args = parser.parse_args()

    token = args.token or mint_token(sub=args.sub, role=args.role)
    tester = WebSocketLoadTester(args.url, token)
    await tester.run_concurrent_sessions(args.sessions, args.duration)


if __name__ == "__main__":
    asyncio.run(main())
