import { Router, type IRouter } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import appointmentRoutes from './appointment.routes.js';
import allergyRoutes from './allergy.routes.js';
import chronicConditionRoutes from './chronicCondition.routes.js';

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
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use(allergyRoutes);
router.use(chronicConditionRoutes);

export default router;
