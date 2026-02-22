import { Router, type IRouter } from 'express';
import { patientController } from '../controllers/patient.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

router.use(authMiddleware);

router.get('/', patientController.findAll.bind(patientController));
router.get('/:id', patientController.findById.bind(patientController));
router.get('/:id/appointments', patientController.getAppointments.bind(patientController));
router.post('/', patientController.create.bind(patientController));
router.put('/:id', patientController.update.bind(patientController));
router.delete('/:id', patientController.delete.bind(patientController));

export default router;
