#!/usr/bin/env python3
"""
Example WebSocket client for real-time transcription.

Usage:
    python websocket_client.py --token YOUR_JWT_TOKEN --audio path/to/audio.wav
"""
import argparse
import asyncio
import json
from pathlib import Path

import websockets


async def stream_audio(uri: str, audio_path: str, chunk_size: int = 4096):
    """Stream audio file to WebSocket server."""
    async with websockets.connect(uri) as websocket:
        print("Conectado al servidor")

        receiver = asyncio.create_task(receive_messages(websocket))

        audio_file = Path(audio_path)
        with open(audio_file, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                await websocket.send(chunk)
                await asyncio.sleep(0.1)

        print("Audio enviado, finalizando sesión...")
        await websocket.send(json.dumps({"type": "finalize"}))
        await receiver


async def receive_messages(websocket):
    """Receive and display messages from server."""
    async for message in websocket:
        data = json.loads(message)
        msg_type = data.get("type")

        if msg_type == "transcript_update":
            text = data.get("text", "")
            timestamp = data.get("timestamp", 0)
            print(f"[{timestamp:.1f}s] {text}")

        elif msg_type == "speaker_changed":
            new_role = data.get("new_speaker_role", "unknown")
            confidence = data.get("confidence", 0)
            print(f"  Speaker changed -> {new_role} (confidence: {confidence:.2f})")

        elif msg_type == "extraction_update":
            entity_type = data.get("entity_type", "")
            entity = data.get("entity", {})
            name = entity.get("name") if isinstance(entity, dict) else entity
            print(f"  Extracted {entity_type}: {name}")

        elif msg_type == "validation_alert":
            severity = data.get("severity", "")
            description = data.get("description", "")
            print(f"  {severity} ALERT: {description}")

        elif msg_type == "entity_validated":
            entity_name = data.get("entity_name", "")
            status = data.get("validation_status", "")
            print(f"  Validated: {entity_name} - {status}")

        elif msg_type == "cost_update":
            total = data.get("total_cost_usd", 0)
            print(f"  Costo acumulado: ${total:.4f}")

        elif msg_type == "session_complete":
            print("\n=== SESIÓN COMPLETA ===")
            print(json.dumps(data, indent=2, default=str))
            break

        elif msg_type == "error":
            print(f"Error: {data.get('message')}")


def main():
    parser = argparse.ArgumentParser(description="WebSocket transcription client")
    parser.add_argument("--token", required=True, help="JWT authentication token")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--session", default="test_session", help="Session ID")
    parser.add_argument("--host", default="localhost:8000", help="Server host")

    args = parser.parse_args()

    uri = f"ws://{args.host}/ws/session?session_id={args.session}&token={args.token}"
    asyncio.run(stream_audio(uri, args.audio))


if __name__ == "__main__":
    main()
