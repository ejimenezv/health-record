import { Router, type IRouter } from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

router.use(authMiddleware);

router.get('/', appointmentController.findAll.bind(appointmentController));
router.get('/today', appointmentController.getTodayAppointments.bind(appointmentController));
router.get('/:id', appointmentController.findById.bind(appointmentController));
router.post('/', appointmentController.create.bind(appointmentController));
router.put('/:id', appointmentController.update.bind(appointmentController));
router.patch('/:id/status', appointmentController.updateStatus.bind(appointmentController));
router.delete('/:id', appointmentController.delete.bind(appointmentController));

export default router;
