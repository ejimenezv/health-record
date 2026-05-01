import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { aiService } from '../services/ai-service.client.js';
import { eventPersistence } from '../services/event-persistence.service.js';

const createSessionSchema = z.object({
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  /** Free-form descriptor stored on our side (e.g. "follow_up"). Not sent to Python. */
  appointmentType: z.string().optional(),
  /** Medical specialty sent to Python; defaults to "medicina general" upstream. */
  specialty: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const querySchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional(),
  contextFilter: z.record(z.unknown()).optional(),
  includeSources: z.boolean().optional(),
});

export class AiSessionController {
  /**
   * Create a real-time streaming session.
   *
   * Flow:
   *  1. POST /api/v1/sessions on Python AI service (returns wrapped session).
   *  2. Mirror the session in our `ai_sessions` table.
   *  3. Return the Node-side WebSocket gateway URL — Python doesn't return one,
   *     and the React client must connect through us so we can persist events.
   */
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createSessionSchema.parse(req.body);
      const providerId = req.userId!;

      const upstream = await aiService.createSession(
        {
          appointmentId: body.appointmentId,
          patientId: body.patientId,
          doctorId: providerId,
          specialty: body.specialty,
          metadata: body.metadata,
        },
        providerId
      );

      const websocketUrl = `/ws/session/${upstream.sessionId}`;
      const session = await prisma.aiSession.create({
        data: {
          appointmentId: body.appointmentId,
          sessionId: upstream.sessionId,
          patientId: body.patientId,
          providerId,
          appointmentType: body.appointmentType,
          status: upstream.status,
          websocketUrl,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: session.id,
          sessionId: upstream.sessionId,
          websocketUrl,
          status: upstream.status,
          specialty: upstream.specialty,
          createdAt: upstream.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Finalize a streaming session.
   *
   * The Python service has no /finalize endpoint — DELETE is the lifecycle terminator.
   * The session_complete event has already arrived through the WebSocket gateway
   * and updated `ai_sessions` (status, finalTranscript, totalCostUsd, audioDurationSeconds).
   * Here we just close upstream and return our persisted state + the event log.
   */
  async finalizeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const providerId = req.userId!;

      try {
        await aiService.closeSession(sessionId, providerId);
      } catch (err) {
        // If upstream is already gone (404) we still want to surface our DB state.
        if (!(err instanceof Error && /404|not found/i.test(err.message))) throw err;
      }

      const session = await prisma.aiSession.findUnique({ where: { sessionId } });
      const events = await eventPersistence.getSessionEvents(sessionId);

      res.json({
        success: true,
        data: {
          sessionId,
          status: session?.status,
          finalTranscript: session?.finalTranscript,
          totalCostUsd: session?.totalCostUsd ? Number(session.totalCostUsd) : 0,
          audioDurationSeconds: session?.audioDurationSeconds ?? 0,
          completedAt: session?.completedAt,
          events,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessionEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventPersistence.getSessionEvents(req.params.sessionId as string);
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alertId } = req.params;
      const userId = req.userId!;
      await prisma.validationAlert.update({
        where: { alertId },
        data: {
          acknowledged: true,
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
        },
      });
      res.json({ success: true, message: 'Alerta confirmada' });
    } catch (error) {
      next(error);
    }
  }

  async queryKnowledgeBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = querySchema.parse(req.body);
      const result = await aiService.query(body, req.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async checkAiHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await aiService.checkHealth();
      res.json({ success: true, data: health });
    } catch (error) {
      next(error);
    }
  }
}

export const aiSessionController = new AiSessionController();
