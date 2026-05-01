"""
Load tests for event persistence performance.

Targets the Postgres `transcription_events` table owned by the backend
(Prisma schema). Seeds a temporary `ai_sessions` row to satisfy the FK,
writes events concurrently, then cleans up (cascade deletes events).

DB URL is taken from --db, then DATABASE_URL env var. Run from ai-service/:
    python tests/load/event_persistence_load.py --sessions 10 --events 100
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
import uuid
from statistics import mean, median
from typing import List


class EventPersistenceLoadTester:
    """Concurrent INSERTs against `transcription_events`."""

    def __init__(self, db_connection_string: str):
        self.db_connection_string = db_connection_string
        self.write_latencies: List[float] = []
        self.errors: List[str] = []

    async def _seed_session(self, conn) -> str:
        """Insert a placeholder ai_sessions row; return its UUID id (FK target)."""
        session_pk = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO ai_sessions (id, "sessionId", status, "createdAt", "totalCostUsd", "audioDurationSeconds")
            VALUES ($1, $2, 'active', NOW(), 0, 0)
            """,
            session_pk,
            f"loadtest-{session_pk[:8]}",
        )
        return session_pk

    async def _cleanup_sessions(self, conn, session_pks: List[str]) -> None:
        if not session_pks:
            return
        # Prisma maps the `id` column to `text` (not native uuid), so cast to text[].
        await conn.execute("DELETE FROM ai_sessions WHERE id = ANY($1::text[])", session_pks)

    async def test_high_volume_writes(self, num_sessions: int, events_per_session: int) -> None:
        import asyncpg

        print("Testing event persistence:")
        print(f"  Sessions: {num_sessions}")
        print(f"  Events per session: {events_per_session}")
        print(f"  Total events: {num_sessions * events_per_session}")

        pool = await asyncpg.create_pool(self.db_connection_string, min_size=2, max_size=20)

        # Seed sessions to satisfy the FK transcription_events.session_id -> ai_sessions.id
        async with pool.acquire() as conn:
            session_pks = [await self._seed_session(conn) for _ in range(num_sessions)]

        async def write_events_for_session(session_pk: str):
            for i in range(events_per_session):
                start = time.perf_counter()
                try:
                    async with pool.acquire() as conn:
                        await conn.execute(
                            """
                            INSERT INTO transcription_events
                            (
                                "sessionId", "eventType", "chunkIndex", text,
                                "isFinal", confidence, "eventData", timestamp
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
                            """,
                            session_pk,
                            "transcript_update",
                            i,
                            f"Test transcript chunk {i}",
                            True,
                            0.95,
                            json.dumps({"source": "loadtest"}),
                        )
                    self.write_latencies.append((time.perf_counter() - start) * 1000)
                except Exception as e:
                    self.errors.append(str(e))

        start_time = time.perf_counter()
        try:
            await asyncio.gather(*(write_events_for_session(pk) for pk in session_pks))
        finally:
            total_time = time.perf_counter() - start_time
            self._print_results(total_time, num_sessions * events_per_session)
            try:
                async with pool.acquire() as conn:
                    await self._cleanup_sessions(conn, session_pks)
            except Exception as e:
                print(f"\n[warn] cleanup failed: {e}")
            await pool.close()

    def _print_results(self, total_time: float, total_events: int) -> None:
        print("\n" + "=" * 60)
        print("EVENT PERSISTENCE LOAD TEST RESULTS")
        print("=" * 60)

        if self.write_latencies:
            sorted_lat = sorted(self.write_latencies)
            p95 = sorted_lat[int(len(sorted_lat) * 0.95)]
            p99 = sorted_lat[int(len(sorted_lat) * 0.99)]
            print("\nWrite Latencies:")
            print(f"  Min:    {min(sorted_lat):.2f}ms")
            print(f"  Median: {median(sorted_lat):.2f}ms")
            print(f"  Mean:   {mean(sorted_lat):.2f}ms")
            print(f"  P95:    {p95:.2f}ms")
            print(f"  P99:    {p99:.2f}ms")
            print(f"  Max:    {max(sorted_lat):.2f}ms")
            verdict = "[PASS]" if p95 < 50 else "[FAIL]"
            print(f"  {verdict} Write latency requirement (<50ms p95)")

        writes_per_sec = total_events / total_time if total_time > 0 else 0
        print("\nThroughput:")
        print(f"  Total events: {total_events}")
        print(f"  Total time:   {total_time:.2f}s")
        print(f"  Writes/sec:   {writes_per_sec:.2f}")

        error_rate = (len(self.errors) / total_events) * 100 if total_events else 0
        print("\nErrors:")
        print(f"  Total errors: {len(self.errors)}")
        print(f"  Error rate:   {error_rate:.2f}%")
        for err in self.errors[:5]:
            print(f"  - {err}")
        verdict = "[PASS]" if error_rate < 1.0 else "[FAIL]"
        print(f"  {verdict} Error rate (<1%)")
        print("=" * 60)


async def _amain():
    parser = argparse.ArgumentParser(description="Event persistence load test")
    parser.add_argument(
        "--db",
        default=os.getenv("DATABASE_URL"),
        help="Postgres connection string (defaults to $DATABASE_URL)",
    )
    parser.add_argument("--sessions", type=int, default=10, help="Concurrent sessions")
    parser.add_argument("--events", type=int, default=100, help="Events per session")
    args = parser.parse_args()

    if not args.db:
        print("Error: provide --db or set DATABASE_URL", file=sys.stderr)
        sys.exit(2)

    tester = EventPersistenceLoadTester(args.db)
    await tester.test_high_volume_writes(args.sessions, args.events)


if __name__ == "__main__":
    asyncio.run(_amain())
