"""
Tests for WebSocket reconnection and recovery against the live AI service.

Creates a real session via /api/v1/sessions, then repeatedly opens and closes
the /ws/session WebSocket to verify the server tolerates reconnects. Token is
minted in-process (JWT-only contract).

Run from ai-service/:
    python tests/load/websocket_reconnection_test.py --url http://localhost:8000
"""
from __future__ import annotations

import argparse
import asyncio
import time
from urllib.parse import urlsplit

import aiohttp
import websockets

from tests.load._auth import mint_token


async def _create_session(base_url: str, token: str) -> str:
    async with aiohttp.ClientSession() as http:
        async with http.post(
            f"{base_url}/api/v1/sessions",
            json={
                "patient_id": f"reconnect-test-{int(time.time() * 1000)}",
                "doctor_id": "loadtest-doctor",
                "specialty": "medicina general",
            },
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data["session"]["session_id"]


async def _end_session(base_url: str, token: str, session_id: str) -> None:
    async with aiohttp.ClientSession() as http:
        try:
            await http.delete(
                f"{base_url}/api/v1/sessions/{session_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
        except Exception:
            pass


def _ws_url(base_url: str, session_id: str, token: str) -> str:
    parts = urlsplit(base_url)
    scheme = "wss" if parts.scheme == "https" else "ws"
    return f"{scheme}://{parts.netloc}/ws/session?session_id={session_id}&token={token}"


async def test_reconnection(base_url: str, max_reconnects: int = 5) -> None:
    base_url = base_url.rstrip("/")
    token = mint_token(sub="loadtest-reconnect", role="doctor")
    session_id = await _create_session(base_url, token)
    print(f"Session created: {session_id}")

    uri = _ws_url(base_url, session_id, token)
    successful = 0

    print("Testing WebSocket reconnection...")
    for attempt in range(max_reconnects):
        print(f"\nAttempt {attempt + 1}/{max_reconnects}")
        try:
            async with websockets.connect(uri, close_timeout=5) as websocket:
                print("  [OK] Connected")
                # Read the server's "connected" greeting so we know the
                # receive loop is live before we close.
                try:
                    await asyncio.wait_for(websocket.recv(), timeout=2)
                except asyncio.TimeoutError:
                    pass
            # Context manager handled the close cleanly.
            print("  Connection closed (simulated network failure)")
            successful += 1
        except Exception as e:
            print(f"  [FAIL] Connection failed: {e}")
        # Server's connection_manager.disconnect runs in a `finally` block,
        # async, after the receive loop unwinds — give it a healthy margin.
        await asyncio.sleep(5)

    await _end_session(base_url, token, session_id)

    print("\n" + "=" * 60)
    print("RECONNECTION TEST RESULTS")
    print("=" * 60)
    print(f"Successful reconnections: {successful}/{max_reconnects}")
    rate = (successful / max_reconnects) * 100
    print(f"Success rate: {rate:.1f}%")
    verdict = "[PASS]" if successful >= max_reconnects * 0.9 else "[FAIL]"
    print(f"{verdict} Reconnection reliability (>=90%)")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="WebSocket reconnection test")
    parser.add_argument("--url", default="http://localhost:8000", help="AI service base URL")
    parser.add_argument("--reconnects", type=int, default=5, help="Number of reconnect attempts")
    args = parser.parse_args()
    asyncio.run(test_reconnection(args.url, args.reconnects))


if __name__ == "__main__":
    main()
