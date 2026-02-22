import { Router, type IRouter } from 'express';
import authRoutes from './auth.routes.js';

const router: IRouter = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API routes
router.use('/auth', authRoutes);

export default router;
