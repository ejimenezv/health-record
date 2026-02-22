import { Router, type IRouter } from 'express';
import { allergyController } from '../controllers/allergy.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/patients/:patientId/allergies - Get all allergies for a patient
router.get('/patients/:patientId/allergies', allergyController.getByPatient.bind(allergyController));

// POST /api/patients/:patientId/allergies - Create allergy for a patient
router.post('/patients/:patientId/allergies', allergyController.create.bind(allergyController));

// GET /api/allergies/:id - Get allergy by ID
router.get('/allergies/:id', allergyController.getById.bind(allergyController));

// PUT /api/allergies/:id - Update allergy
router.put('/allergies/:id', allergyController.update.bind(allergyController));

// DELETE /api/allergies/:id - Delete allergy
router.delete('/allergies/:id', allergyController.delete.bind(allergyController));

export default router;
