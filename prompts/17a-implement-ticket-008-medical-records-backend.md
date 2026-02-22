# Prompt 17a: Implement TICKET-008 - Medical Records Backend

## Context
You are implementing the Medical Record System MVP. Patient and Appointment management (TICKET-004 to TICKET-007) is complete.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-008-medical-records-backend.md` - Backend requirements
- `docs/api/endpoints/medical-records.md` - API specifications
- `docs/data-model/entities.md` - Database entities reference
- `docs/testing/debugging-template.md` - Testing guidelines

## Verify Prerequisites
```bash
cd packages/backend

# Verify database has required tables
pnpm prisma db push --force-reset
pnpm prisma db seed

# Run existing tests
pnpm test

# Check appointments endpoint works
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' | jq -r '.data.token')

curl http://localhost:3001/api/v1/appointments/today \
  -H "Authorization: Bearer $TOKEN" | jq
```

**If any verification fails:** Go back to previous prompts.

---

## Objective
Implement backend for medical records with:
- Medical record CRUD linked to appointments
- Symptoms management (add/update/delete)
- Diagnosis management (single per record)
- Prescriptions management (add/update/delete)
- AI-generated field indicators
- Bulk operations for AI auto-fill
- Comprehensive integration tests

---

## Step 1: Create Medical Record Validator
Create `packages/backend/src/validators/medical-records.validator.ts`:

```typescript
import { z } from 'zod';

export const symptomSchema = z.object({
  description: z.string().min(1, 'La descripción del síntoma es requerida').max(500),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  duration: z.string().max(100).optional(),
  onset: z.string().max(100).optional(),
  aiGenerated: z.boolean().optional().default(false),
});

export const diagnosisSchema = z.object({
  description: z.string().min(1, 'La descripción del diagnóstico es requerida').max(1000),
  icdCode: z.string().max(20).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  aiGenerated: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).optional(),
});

export const prescriptionSchema = z.object({
  medication: z.string().min(1, 'El medicamento es requerido').max(200),
  dosage: z.string().min(1, 'La dosis es requerida').max(100),
  frequency: z.string().min(1, 'La frecuencia es requerida').max(100),
  duration: z.string().min(1, 'La duración es requerida').max(100),
  instructions: z.string().max(500).optional(),
  aiGenerated: z.boolean().optional().default(false),
});

export const medicalRecordSchema = z.object({
  chiefComplaint: z.string().max(500).optional(),
  presentIllness: z.string().max(2000).optional(),
  physicalExam: z.string().max(2000).optional(),
  assessment: z.string().max(2000).optional(),
  plan: z.string().max(2000).optional(),
});

export type SymptomInput = z.infer<typeof symptomSchema>;
export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
```

---

## Step 2: Create Medical Records Service
Create `packages/backend/src/services/medical-records.service.ts`:

```typescript
import prisma from '../config/database.js';
import type {
  MedicalRecordInput,
  SymptomInput,
  DiagnosisInput,
  PrescriptionInput,
} from '../validators/medical-records.validator.js';

export class MedicalRecordsService {
  /**
   * Get medical record with all related data for an appointment
   */
  async getByAppointmentId(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patient: { userId },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        medicalRecord: {
          include: {
            symptoms: {
              orderBy: { createdAt: 'asc' },
            },
            diagnosis: true,
            prescriptions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    return appointment;
  }

  /**
   * Create or update the main medical record fields
   */
  async createOrUpdate(appointmentId: string, userId: string, data: MedicalRecordInput) {
    // Verify ownership
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.medicalRecord) {
      return prisma.medicalRecord.update({
        where: { id: appointment.medicalRecord.id },
        data: {
          chiefComplaint: data.chiefComplaint,
          presentIllness: data.presentIllness,
          physicalExam: data.physicalExam,
          assessment: data.assessment,
          plan: data.plan,
          updatedAt: new Date(),
        },
        include: {
          symptoms: true,
          diagnosis: true,
          prescriptions: true,
        },
      });
    }

    return prisma.medicalRecord.create({
      data: {
        appointmentId,
        chiefComplaint: data.chiefComplaint,
        presentIllness: data.presentIllness,
        physicalExam: data.physicalExam,
        assessment: data.assessment,
        plan: data.plan,
      },
      include: {
        symptoms: true,
        diagnosis: true,
        prescriptions: true,
      },
    });
  }

  /**
   * Ensure a medical record exists for an appointment
   */
  private async ensureMedicalRecord(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
      include: {
        medicalRecord: {
          include: { diagnosis: true },
        },
      },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.medicalRecord) {
      return appointment.medicalRecord;
    }

    return prisma.medicalRecord.create({
      data: { appointmentId },
      include: { diagnosis: true },
    });
  }

  // ============ SYMPTOMS MANAGEMENT ============

  async addSymptom(appointmentId: string, userId: string, symptom: SymptomInput) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    return prisma.symptom.create({
      data: {
        medicalRecordId: record.id,
        description: symptom.description,
        severity: symptom.severity,
        duration: symptom.duration,
        onset: symptom.onset,
        aiGenerated: symptom.aiGenerated ?? false,
      },
    });
  }

  async updateSymptom(symptomId: string, userId: string, data: Partial<SymptomInput>) {
    const symptom = await prisma.symptom.findFirst({
      where: {
        id: symptomId,
        medicalRecord: {
          appointment: { patient: { userId } },
        },
      },
    });

    if (!symptom) {
      throw new Error('Síntoma no encontrado');
    }

    return prisma.symptom.update({
      where: { id: symptomId },
      data: {
        description: data.description,
        severity: data.severity,
        duration: data.duration,
        onset: data.onset,
        aiGenerated: data.aiGenerated,
        updatedAt: new Date(),
      },
    });
  }

  async deleteSymptom(symptomId: string, userId: string) {
    const symptom = await prisma.symptom.findFirst({
      where: {
        id: symptomId,
        medicalRecord: {
          appointment: { patient: { userId } },
        },
      },
    });

    if (!symptom) {
      throw new Error('Síntoma no encontrado');
    }

    await prisma.symptom.delete({ where: { id: symptomId } });
  }

  // ============ DIAGNOSIS MANAGEMENT ============

  async setDiagnosis(appointmentId: string, userId: string, diagnosis: DiagnosisInput) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    // Upsert diagnosis (one per medical record)
    if (record.diagnosis) {
      return prisma.diagnosis.update({
        where: { id: record.diagnosis.id },
        data: {
          description: diagnosis.description,
          icdCode: diagnosis.icdCode,
          severity: diagnosis.severity,
          aiGenerated: diagnosis.aiGenerated ?? false,
          confidence: diagnosis.confidence,
          updatedAt: new Date(),
        },
      });
    }

    return prisma.diagnosis.create({
      data: {
        medicalRecordId: record.id,
        description: diagnosis.description,
        icdCode: diagnosis.icdCode,
        severity: diagnosis.severity,
        aiGenerated: diagnosis.aiGenerated ?? false,
        confidence: diagnosis.confidence,
      },
    });
  }

  async deleteDiagnosis(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
      include: {
        medicalRecord: {
          include: { diagnosis: true },
        },
      },
    });

    if (!appointment?.medicalRecord?.diagnosis) {
      throw new Error('Diagnóstico no encontrado');
    }

    await prisma.diagnosis.delete({
      where: { id: appointment.medicalRecord.diagnosis.id },
    });
  }

  // ============ PRESCRIPTIONS MANAGEMENT ============

  async addPrescription(appointmentId: string, userId: string, prescription: PrescriptionInput) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    return prisma.prescription.create({
      data: {
        medicalRecordId: record.id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions,
        aiGenerated: prescription.aiGenerated ?? false,
      },
    });
  }

  async updatePrescription(prescriptionId: string, userId: string, data: Partial<PrescriptionInput>) {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        medicalRecord: {
          appointment: { patient: { userId } },
        },
      },
    });

    if (!prescription) {
      throw new Error('Receta no encontrada');
    }

    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        medication: data.medication,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        instructions: data.instructions,
        aiGenerated: data.aiGenerated,
        updatedAt: new Date(),
      },
    });
  }

  async deletePrescription(prescriptionId: string, userId: string) {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        medicalRecord: {
          appointment: { patient: { userId } },
        },
      },
    });

    if (!prescription) {
      throw new Error('Receta no encontrada');
    }

    await prisma.prescription.delete({ where: { id: prescriptionId } });
  }

  // ============ BULK OPERATIONS (for AI auto-fill) ============

  async bulkAddSymptoms(appointmentId: string, userId: string, symptoms: SymptomInput[]) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    return prisma.symptom.createMany({
      data: symptoms.map((s) => ({
        medicalRecordId: record.id,
        description: s.description,
        severity: s.severity,
        duration: s.duration,
        onset: s.onset,
        aiGenerated: s.aiGenerated ?? true,
      })),
    });
  }

  async bulkAddPrescriptions(appointmentId: string, userId: string, prescriptions: PrescriptionInput[]) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    return prisma.prescription.createMany({
      data: prescriptions.map((p) => ({
        medicalRecordId: record.id,
        medication: p.medication,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
        aiGenerated: p.aiGenerated ?? true,
      })),
    });
  }
}

export const medicalRecordsService = new MedicalRecordsService();
```

---

## Step 3: Create Medical Records Controller
Create `packages/backend/src/controllers/medical-records.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { medicalRecordsService } from '../services/medical-records.service.js';
import {
  medicalRecordSchema,
  symptomSchema,
  diagnosisSchema,
  prescriptionSchema,
} from '../validators/medical-records.validator.js';

export class MedicalRecordsController {
  // ============ MEDICAL RECORD ============

  async get(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const data = await medicalRecordsService.getByAppointmentId(appointmentId, req.userId!);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Expediente no encontrado',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const validatedData = medicalRecordSchema.parse(req.body);

      const data = await medicalRecordsService.createOrUpdate(
        appointmentId,
        req.userId!,
        validatedData
      );

      res.json({
        success: true,
        data,
        message: 'Expediente actualizado',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors,
        });
      }
      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar expediente',
      });
    }
  }

  // ============ SYMPTOMS ============

  async addSymptom(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const validatedData = symptomSchema.parse(req.body);

      const symptom = await medicalRecordsService.addSymptom(
        appointmentId,
        req.userId!,
        validatedData
      );

      res.status(201).json({
        success: true,
        data: symptom,
        message: 'Síntoma agregado',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors,
        });
      }
      res.status(400).json({
        success: false,
        message: error.message || 'Error al agregar síntoma',
      });
    }
  }

  async updateSymptom(req: Request, res: Response) {
    try {
      const { symptomId } = req.params;
      const validatedData = symptomSchema.partial().parse(req.body);

      const symptom = await medicalRecordsService.updateSymptom(
        symptomId,
        req.userId!,
        validatedData
      );

      res.json({
        success: true,
        data: symptom,
        message: 'Síntoma actualizado',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors,
        });
      }
      res.status(404).json({
        success: false,
        message: error.message || 'Síntoma no encontrado',
      });
    }
  }

  async deleteSymptom(req: Request, res: Response) {
    try {
      const { symptomId } = req.params;
      await medicalRecordsService.deleteSymptom(symptomId, req.userId!);

      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Síntoma no encontrado',
      });
    }
  }

  // ============ DIAGNOSIS ============

  async setDiagnosis(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const validatedData = diagnosisSchema.parse(req.body);

      const diagnosis = await medicalRecordsService.setDiagnosis(
        appointmentId,
        req.userId!,
        validatedData
      );

      res.json({
        success: true,
        data: diagnosis,
        message: 'Diagnóstico actualizado',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors,
        });
      }
      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar diagnóstico',
      });
    }
  }

  async deleteDiagnosis(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      await medicalRecordsService.deleteDiagnosis(appointmentId, req.userId!);

      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Diagnóstico no encontrado',
      });
    }
  }

  // ============ PRESCRIPTIONS ============

  async addPrescription(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const validatedData = prescriptionSchema.parse(req.body);

      const prescription = await medicalRecordsService.addPrescription(
        appointmentId,
        req.userId!,
        validatedData
      );

      res.status(201).json({
        success: true,
        data: prescription,
        message: 'Receta agregada',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors,
        });
      }
      res.status(400).json({
        success: false,
        message: error.message || 'Error al agregar receta',
      });
    }
  }

  async updatePrescription(req: Request, res: Response) {
    try {
      const { prescriptionId } = req.params;
      const validatedData = prescriptionSchema.partial().parse(req.body);

      const prescription = await medicalRecordsService.updatePrescription(
        prescriptionId,
        req.userId!,
        validatedData
      );

      res.json({
        success: true,
        data: prescription,
        message: 'Receta actualizada',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors,
        });
      }
      res.status(404).json({
        success: false,
        message: error.message || 'Receta no encontrada',
      });
    }
  }

  async deletePrescription(req: Request, res: Response) {
    try {
      const { prescriptionId } = req.params;
      await medicalRecordsService.deletePrescription(prescriptionId, req.userId!);

      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Receta no encontrada',
      });
    }
  }
}

export const medicalRecordsController = new MedicalRecordsController();
```

---

## Step 4: Create Medical Records Routes
Create `packages/backend/src/routes/medical-records.routes.ts`:

```typescript
import { Router } from 'express';
import { medicalRecordsController } from '../controllers/medical-records.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Medical record CRUD
router.get(
  '/appointments/:appointmentId/medical-record',
  medicalRecordsController.get.bind(medicalRecordsController)
);
router.put(
  '/appointments/:appointmentId/medical-record',
  medicalRecordsController.update.bind(medicalRecordsController)
);

// Symptoms management
router.post(
  '/appointments/:appointmentId/symptoms',
  medicalRecordsController.addSymptom.bind(medicalRecordsController)
);
router.put(
  '/symptoms/:symptomId',
  medicalRecordsController.updateSymptom.bind(medicalRecordsController)
);
router.delete(
  '/symptoms/:symptomId',
  medicalRecordsController.deleteSymptom.bind(medicalRecordsController)
);

// Diagnosis management
router.put(
  '/appointments/:appointmentId/diagnosis',
  medicalRecordsController.setDiagnosis.bind(medicalRecordsController)
);
router.delete(
  '/appointments/:appointmentId/diagnosis',
  medicalRecordsController.deleteDiagnosis.bind(medicalRecordsController)
);

// Prescriptions management
router.post(
  '/appointments/:appointmentId/prescriptions',
  medicalRecordsController.addPrescription.bind(medicalRecordsController)
);
router.put(
  '/prescriptions/:prescriptionId',
  medicalRecordsController.updatePrescription.bind(medicalRecordsController)
);
router.delete(
  '/prescriptions/:prescriptionId',
  medicalRecordsController.deletePrescription.bind(medicalRecordsController)
);

export default router;
```

---

## Step 5: Register Routes
Update `packages/backend/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import appointmentRoutes from './appointment.routes.js';
import medicalRecordsRoutes from './medical-records.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
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
router.use('/', medicalRecordsRoutes);

export default router;
```

---

## Step 6: Create Integration Tests
Create `packages/backend/tests/integration/medical-records.routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Medical Records API', () => {
  let authToken: string;
  let testUserId: string;
  let testPatientId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor@medrecord.com', password: 'password123' });
    authToken = loginRes.body.data.token;
    testUserId = loginRes.body.data.user.id;

    // Get a patient
    const patient = await prisma.patient.findFirst({ where: { userId: testUserId } });
    testPatientId = patient!.id;

    // Create test appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: testPatientId,
        scheduledAt: new Date(),
        status: 'IN_PROGRESS',
      },
    });
    testAppointmentId = appointment.id;
  });

  afterAll(async () => {
    await prisma.prescription.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.symptom.deleteMany({});
    await prisma.medicalRecord.deleteMany({});
    await prisma.appointment.delete({ where: { id: testAppointmentId } });
  });

  beforeEach(async () => {
    // Reset medical record state
    await prisma.prescription.deleteMany({
      where: { medicalRecord: { appointmentId: testAppointmentId } },
    });
    await prisma.diagnosis.deleteMany({
      where: { medicalRecord: { appointmentId: testAppointmentId } },
    });
    await prisma.symptom.deleteMany({
      where: { medicalRecord: { appointmentId: testAppointmentId } },
    });
    await prisma.medicalRecord.deleteMany({
      where: { appointmentId: testAppointmentId },
    });
  });

  // ============ MEDICAL RECORD TESTS ============

  describe('GET /api/v1/appointments/:appointmentId/medical-record', () => {
    it('should return appointment with empty medical record', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/medical-record`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testAppointmentId);
      expect(res.body.data.medicalRecord).toBeNull();
    });

    it('should return 404 for non-existent appointment', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/non-existent-id/medical-record')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/medical-record`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/appointments/:appointmentId/medical-record', () => {
    it('should create medical record when none exists', async () => {
      const res = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/medical-record`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chiefComplaint: 'Dolor de cabeza',
          presentIllness: 'Paciente refiere cefalea de 3 días',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.chiefComplaint).toBe('Dolor de cabeza');
    });

    it('should update existing medical record', async () => {
      // First create
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/medical-record`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ chiefComplaint: 'Initial' });

      // Then update
      const res = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/medical-record`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chiefComplaint: 'Updated',
          assessment: 'Cefalea tensional',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.chiefComplaint).toBe('Updated');
      expect(res.body.data.assessment).toBe('Cefalea tensional');
    });
  });

  // ============ SYMPTOMS TESTS ============

  describe('POST /api/v1/appointments/:appointmentId/symptoms', () => {
    it('should add a symptom', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Dolor de cabeza intenso',
          severity: 'severe',
          duration: '3 días',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.description).toBe('Dolor de cabeza intenso');
      expect(res.body.data.severity).toBe('severe');
      expect(res.body.data.aiGenerated).toBe(false);
    });

    it('should add AI-generated symptom', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Náuseas',
          severity: 'mild',
          aiGenerated: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.aiGenerated).toBe(true);
    });

    it('should fail without description', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ severity: 'mild' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/symptoms/:symptomId', () => {
    it('should update a symptom', async () => {
      const createRes = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Original symptom' });

      const symptomId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/v1/symptoms/${symptomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated symptom',
          severity: 'moderate',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated symptom');
      expect(res.body.data.severity).toBe('moderate');
    });
  });

  describe('DELETE /api/v1/symptoms/:symptomId', () => {
    it('should delete a symptom', async () => {
      const createRes = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Symptom to delete' });

      const symptomId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/v1/symptoms/${symptomId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(204);
    });
  });

  // ============ DIAGNOSIS TESTS ============

  describe('PUT /api/v1/appointments/:appointmentId/diagnosis', () => {
    it('should set diagnosis', async () => {
      const res = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/diagnosis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Cefalea tensional',
          icdCode: 'G44.2',
          severity: 'moderate',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Cefalea tensional');
      expect(res.body.data.icdCode).toBe('G44.2');
    });

    it('should update existing diagnosis', async () => {
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/diagnosis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Initial diagnosis' });

      const res = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/diagnosis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated diagnosis',
          confidence: 0.95,
          aiGenerated: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated diagnosis');
      expect(res.body.data.confidence).toBe(0.95);
    });
  });

  // ============ PRESCRIPTIONS TESTS ============

  describe('POST /api/v1/appointments/:appointmentId/prescriptions', () => {
    it('should add a prescription', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/prescriptions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medication: 'Paracetamol',
          dosage: '500mg',
          frequency: 'Cada 8 horas',
          duration: '5 días',
          instructions: 'Tomar con alimentos',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.medication).toBe('Paracetamol');
      expect(res.body.data.dosage).toBe('500mg');
    });

    it('should fail without required fields', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/prescriptions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ medication: 'Paracetamol' });

      expect(res.status).toBe(400);
    });
  });
});
```

---

## Testing & Verification

### Run All Tests
```bash
cd packages/backend
pnpm test
```

**Expected:** All medical records tests pass (15+ tests).

### Manual API Verification
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' | jq -r '.data.token')

# Get appointment ID (use one from today's appointments)
APPOINTMENT_ID="<appointment-id>"

# Add symptom
curl -X POST "http://localhost:3001/api/v1/appointments/$APPOINTMENT_ID/symptoms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Dolor de cabeza","severity":"moderate"}' | jq

# Set diagnosis
curl -X PUT "http://localhost:3001/api/v1/appointments/$APPOINTMENT_ID/diagnosis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Cefalea tensional","icdCode":"G44.2"}' | jq

# Get medical record
curl "http://localhost:3001/api/v1/appointments/$APPOINTMENT_ID/medical-record" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### TypeScript Check
```bash
cd packages/backend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

- [ ] Medical record validator with Zod schemas
- [ ] Medical records service with all CRUD operations
- [ ] Symptoms add/update/delete
- [ ] Diagnosis set/delete (one per record)
- [ ] Prescriptions add/update/delete
- [ ] Bulk operations for AI auto-fill
- [ ] aiGenerated field support
- [ ] Medical records controller with error handling
- [ ] Routes registered
- [ ] Integration tests passing (15+ tests)
- [ ] TypeScript compiles without errors

---

## Debugging Reference

| Issue | Solution |
|-------|----------|
| Symptom not found | Check userId ownership through relations |
| Medical record not created | Verify appointment exists and belongs to user |
| Diagnosis not updating | Check if it's an update vs create (upsert logic) |
| Prescription validation failing | Ensure all required fields (medication, dosage, frequency, duration) |

---

## Next Prompt
Proceed to `17b-implement-ticket-009-medical-records-frontend.md` for medical records frontend implementation.
