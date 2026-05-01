import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server as HttpServer } from 'http';
import { WebSocket as WSClient, WebSocketServer } from 'ws';
import type { AddressInfo } from 'net';
import prisma from '../../src/config/database.js';
import { generateToken } from '../../src/utils/jwt.js';
import { setupAiSessionGateway } from '../../src/websocket/ai-session-gateway.js';

let gatewayServer: HttpServer;
let mockPython: WebSocketServer;
let upstreamConnections: WSClient[] = [];

let gatewayPort: number;
let pythonPort: number;
const externalSessionId = `gw-test-${Date.now()}`;
const token = generateToken({ userId: 'test-user', email: 'test@example.com' });

beforeAll(async () => {
  // 1. Mock Python WS server.
  await new Promise<void>((resolve) => {
    mockPython = new WebSocketServer({ port: 0 }, () => {
      pythonPort = (mockPython.address() as AddressInfo).port;
      resolve();
    });
  });

  mockPython.on('connection', (ws) => {
    upstreamConnections.push(ws);
    // Echo binary audio back as a transcript_update; tests use this to confirm forwarding.
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const buf = Array.isArray(data) ? Buffer.concat(data) : (data as Buffer);
        ws.send(
          JSON.stringify({
            event: 'transcript_update',
            session_id: externalSessionId,
            timestamp: new Date().toISOString(),
            data: {
              chunk_index: 0,
              text: `received ${buf.length} bytes`,
              is_final: false,
              language: 'es',
              confidence: 0.9,
            },
          })
        );
      }
    });
  });

  // 2. Point gateway upstream at the mock and start the gateway HTTP server.
  process.env.AI_SERVICE_WS_URL = `ws://localhost:${pythonPort}`;
  gatewayServer = createServer();
  setupAiSessionGateway(gatewayServer);
  await new Promise<void>((resolve) => gatewayServer.listen(0, resolve));
  gatewayPort = (gatewayServer.address() as AddressInfo).port;

  // 3. Seed the AiSession row so persistence can resolve the FK.
  await prisma.aiSession.create({
    data: { sessionId: externalSessionId, status: 'active' },
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => gatewayServer.close(() => resolve()));
  mockPython.close();
  await prisma.aiSession.delete({ where: { sessionId: externalSessionId } });
  await prisma.$disconnect();
});

function connectClient(sessionId: string, t: string): Promise<WSClient> {
  const url = `ws://localhost:${gatewayPort}/ws/session/${sessionId}?token=${t}`;
  return new Promise((resolve, reject) => {
    const ws = new WSClient(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

describe('AI session WebSocket gateway', () => {
  it('rejects connections without a token', async () => {
    const ws = new WSClient(`ws://localhost:${gatewayPort}/ws/session/${externalSessionId}`);
    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
      ws.on('error', () => {
        /* error then close */
      });
    });
    expect(closeCode).toBe(4001);
  });

  it('rejects connections with an invalid token', async () => {
    const ws = new WSClient(
      `ws://localhost:${gatewayPort}/ws/session/${externalSessionId}?token=not-a-jwt`
    );
    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
      ws.on('error', () => {});
    });
    expect(closeCode).toBe(4001);
  });

  it('proxies binary audio upstream and forwards JSON events back, persisting them', async () => {
    const client = await connectClient(externalSessionId, token);

    const event = await new Promise<{ event: string; data: { text: string } }>(
      (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), 5_000);
        client.on('message', (raw) => {
          clearTimeout(timer);
          resolve(JSON.parse(raw.toString()));
        });
        // Wait one tick so upstream is open + buffered messages flush.
        setTimeout(() => client.send(Buffer.from([1, 2, 3, 4, 5])), 50);
      }
    );

    expect(event.event).toBe('transcript_update');
    expect(event.data.text).toBe('received 5 bytes');

    client.close();
    // Allow async persistence to settle.
    await new Promise((r) => setTimeout(r, 200));

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: externalSessionId },
    });
    const rows = await prisma.transcriptionEvent.findMany({
      where: { sessionId: session.id, eventType: 'transcript_update' },
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.text === 'received 5 bytes')).toBe(true);
  });
});
