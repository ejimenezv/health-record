import { Router, type IRouter } from 'express';
import { aiSessionController } from '../controllers/ai-session.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

router.use(authMiddleware);

// Real-time streaming session lifecycle
router.post('/ai/sessions', (req, res, next) =>
  aiSessionController.createSession(req, res, next)
);
router.post('/ai/sessions/:sessionId/finalize', (req, res, next) =>
  aiSessionController.finalizeSession(req, res, next)
);
router.get('/ai/sessions/:sessionId/events', (req, res, next) =>
  aiSessionController.getSessionEvents(req, res, next)
);

// Validation alerts
router.post('/ai/alerts/:alertId/acknowledge', (req, res, next) =>
  aiSessionController.acknowledgeAlert(req, res, next)
);

// RAG queries (Python AI service)
router.post('/ai/query', (req, res, next) =>
  aiSessionController.queryKnowledgeBase(req, res, next)
);

// Health proxy for the Python AI service
router.get('/ai/python/health', (req, res, next) =>
  aiSessionController.checkAiHealth(req, res, next)
);

export default router;
