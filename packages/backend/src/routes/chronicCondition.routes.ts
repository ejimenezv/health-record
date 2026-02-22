import { Router, type IRouter } from 'express';
import { chronicConditionController } from '../controllers/chronicCondition.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/patients/:patientId/chronic-conditions - Get all chronic conditions for a patient
router.get('/patients/:patientId/chronic-conditions', chronicConditionController.getByPatient.bind(chronicConditionController));

// POST /api/patients/:patientId/chronic-conditions - Create chronic condition for a patient
router.post('/patients/:patientId/chronic-conditions', chronicConditionController.create.bind(chronicConditionController));

// GET /api/chronic-conditions/:id - Get chronic condition by ID
router.get('/chronic-conditions/:id', chronicConditionController.getById.bind(chronicConditionController));

// PUT /api/chronic-conditions/:id - Update chronic condition
router.put('/chronic-conditions/:id', chronicConditionController.update.bind(chronicConditionController));

// DELETE /api/chronic-conditions/:id - Delete chronic condition
router.delete('/chronic-conditions/:id', chronicConditionController.delete.bind(chronicConditionController));

export default router;
