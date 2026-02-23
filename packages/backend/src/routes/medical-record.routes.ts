import { Router, type IRouter } from 'express';
import { medicalRecordController } from '../controllers/medical-record.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authMiddleware);

// Medical record CRUD - nested under appointments
router.get(
  '/appointments/:appointmentId/record',
  medicalRecordController.getRecord.bind(medicalRecordController)
);
router.put(
  '/appointments/:appointmentId/record',
  medicalRecordController.updateRecord.bind(medicalRecordController)
);
router.patch(
  '/appointments/:appointmentId/record',
  medicalRecordController.patchRecord.bind(medicalRecordController)
);
router.post(
  '/appointments/:appointmentId/record/complete',
  medicalRecordController.completeRecord.bind(medicalRecordController)
);

// Symptoms management
router.post(
  '/appointments/:appointmentId/record/symptoms',
  medicalRecordController.addSymptom.bind(medicalRecordController)
);
router.post(
  '/appointments/:appointmentId/record/symptoms/batch',
  medicalRecordController.batchAddSymptoms.bind(medicalRecordController)
);
router.patch(
  '/appointments/:appointmentId/record/symptoms/:symptomId',
  medicalRecordController.updateSymptom.bind(medicalRecordController)
);
router.delete(
  '/appointments/:appointmentId/record/symptoms/:symptomId',
  medicalRecordController.removeSymptom.bind(medicalRecordController)
);

// Prescriptions management
router.post(
  '/appointments/:appointmentId/record/prescriptions',
  medicalRecordController.addPrescription.bind(medicalRecordController)
);
router.post(
  '/appointments/:appointmentId/record/prescriptions/batch',
  medicalRecordController.batchAddPrescriptions.bind(medicalRecordController)
);
router.patch(
  '/appointments/:appointmentId/record/prescriptions/:prescriptionId',
  medicalRecordController.updatePrescription.bind(medicalRecordController)
);
router.delete(
  '/appointments/:appointmentId/record/prescriptions/:prescriptionId',
  medicalRecordController.removePrescription.bind(medicalRecordController)
);

// Vital signs
router.get(
  '/appointments/:appointmentId/vital-signs',
  medicalRecordController.getVitalSigns.bind(medicalRecordController)
);
router.put(
  '/appointments/:appointmentId/vital-signs',
  medicalRecordController.updateVitalSigns.bind(medicalRecordController)
);

// AI suggestions
router.delete(
  '/appointments/:appointmentId/record/ai-suggestions',
  medicalRecordController.clearAISuggestions.bind(medicalRecordController)
);

export default router;
