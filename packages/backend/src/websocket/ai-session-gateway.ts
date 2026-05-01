import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket as WS } from 'ws';
import { verifyToken } from '../utils/jwt.js';
import { aiService } from '../services/ai-service.client.js';
import { eventPersistence } from '../services/event-persistence.service.js';
import type {
  WebSocketEvent,
  WSSessionCompleteEvent,
  WSValidationAlertEvent,
  WSErrorEvent,
} from '../types/websocket-events.js';

const WS_PATH_PREFIX = '/ws/session/';

/**
 * Bidirectional WebSocket proxy between the React client and the Python AI service.
 *
 *   React  <—JSON events / binary audio—>  Node gateway  <—same—>  Python AI service
 *
 * Node persists every Python → React event to PostgreSQL.
 */
export function setupAiSessionGateway(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = req.url ?? '';
    if (!url.startsWith(WS_PATH_PREFIX)) return; // not for us, let other handlers respond
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (clientWs, req) => handleConnection(clientWs, req));

  console.log(`AI session WebSocket gateway initialized on ${WS_PATH_PREFIX}:sessionId`);
}

function handleConnection(clientWs: WS, req: IncomingMessage): void {
  let aiWs: WS | null = null;

  try {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const sessionId = url.pathname.slice(WS_PATH_PREFIX.length).split('/')[0];
    const token = url.searchParams.get('token');

    if (!sessionId || !token) {
      clientWs.close(4001, 'Missing token or session ID');
      return;
    }

    let userId: string;
    try {
      userId = verifyToken(token).userId;
    } catch {
      clientWs.close(4001, 'Invalid token');
      return;
    }

    const aiBase = process.env.AI_SERVICE_WS_URL ?? 'ws://localhost:8000';
    // Python expects /ws/session?session_id=X&token=Y where token is signed with
    // AI_SERVICE_JWT_SECRET (the Node↔Python service realm, NOT the React JWT).
    const upstreamToken = aiService.mintWebSocketToken(userId);
    const upstreamUrl =
      `${aiBase}/ws/session?session_id=${encodeURIComponent(sessionId)}` +
      `&token=${encodeURIComponent(upstreamToken)}`;
    aiWs = new WS(upstreamUrl);

    console.log('[ai-gateway] connection established', { sessionId, userId });

    // Buffer client messages until upstream is open
    const pending: Array<Buffer | string> = [];
    let aiOpen = false;

    aiWs.on('open', () => {
      aiOpen = true;
      for (const msg of pending) aiWs!.send(msg);
      pending.length = 0;
    });

    clientWs.on('message', (data, isBinary) => {
      const payload = isBinary
        ? (Array.isArray(data) ? Buffer.concat(data) : (data as Buffer))
        : data.toString();
      if (!aiWs) return;
      if (aiOpen && aiWs.readyState === WS.OPEN) {
        aiWs.send(payload);
      } else {
        pending.push(payload);
      }
    });

    aiWs.on('message', (data) => {
      const text = data.toString();
      let event: WebSocketEvent | null = null;
      try {
        event = JSON.parse(text) as WebSocketEvent;
      } catch {
        // Forward non-JSON messages verbatim and skip persistence.
        if (clientWs.readyState === WS.OPEN) clientWs.send(text);
        return;
      }

      // Persist asynchronously; never block forwarding.
      eventPersistence.persist(sessionId, event).catch((err: unknown) => {
        console.error('[ai-gateway] persist failed', {
          sessionId,
          eventType: event?.event,
          error: err instanceof Error ? err.message : err,
        });
      });

      if (clientWs.readyState === WS.OPEN) clientWs.send(text);

      logImportant(sessionId, event);
    });

    aiWs.on('close', (code, reason) => {
      console.log('[ai-gateway] upstream closed', { sessionId, code });
      if (clientWs.readyState !== WS.OPEN) return;
      // ws forbids reserved codes (1004, 1005, 1006, 1015) and codes outside
      // 1000 / 3000-4999 from being sent on the wire. Map anything invalid to
      // 1011 (server error) so we don't crash the gateway on abnormal close.
      const safeCode =
        code === 1000 || (code >= 3000 && code <= 4999) ? code : 1011;
      clientWs.close(safeCode, reason);
    });

    aiWs.on('error', (err) => {
      console.error('[ai-gateway] upstream error', { sessionId, error: err.message });
      if (clientWs.readyState === WS.OPEN) clientWs.close(4500, 'AI service error');
    });

    clientWs.on('close', () => {
      console.log('[ai-gateway] client closed', { sessionId });
      if (aiWs && aiWs.readyState === WS.OPEN) aiWs.close();
    });

    clientWs.on('error', (err) => {
      console.error('[ai-gateway] client error', { sessionId, error: err.message });
      if (aiWs && aiWs.readyState === WS.OPEN) aiWs.close();
    });
  } catch (err) {
    console.error('[ai-gateway] connection error', {
      error: err instanceof Error ? err.message : err,
    });
    clientWs.close(4500, 'Connection error');
    if (aiWs && aiWs.readyState === WS.OPEN) aiWs.close();
  }
}

function logImportant(sessionId: string, event: WebSocketEvent): void {
  switch (event.event) {
    case 'validation_alert': {
      const e = event as WSValidationAlertEvent;
      if (e.data.severity === 'CRITICAL') {
        console.warn('[ai-gateway] CRITICAL alert', {
          sessionId,
          alertType: e.data.type,
          message: e.data.message,
        });
      }
      break;
    }
    case 'session_complete': {
      const e = event as WSSessionCompleteEvent;
      console.log('[ai-gateway] session complete', {
        sessionId,
        status: e.data.status,
        totalCost: e.data.final_cost_summary.total_cost_usd,
        durationSec: e.data.final_cost_summary.audio_duration_seconds,
      });
      break;
    }
    case 'error': {
      const e = event as WSErrorEvent;
      console.error('[ai-gateway] session error', {
        sessionId,
        errorCode: e.data.error_code,
        recoverable: e.data.recoverable,
      });
      break;
    }
  }
}
