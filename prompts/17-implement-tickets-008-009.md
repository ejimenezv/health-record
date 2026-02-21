# Prompt 17: Implement TICKET-008 & TICKET-009 - Medical Records

## Context
You are implementing the Medical Record System MVP. Patient and appointment management is complete.

## Prerequisites
Read the following documentation files:
- `docs/tickets/TICKET-008-medical-records-backend.md`
- `docs/tickets/TICKET-009-medical-records-frontend.md`
- `docs/api/endpoints/medical-records.md`
- `docs/frontend/pages/appointment.md`
- `docs/frontend/components/medical-record-components.md`
- `docs/implementation/TICKET-004-007-completed.md`

## Objective
Implement complete medical record management including symptoms, diagnosis, and prescriptions.

## Part 1: Medical Records Backend (TICKET-008)

### 1. Create Medical Record Types
Create `packages/backend/src/types/medical-records.types.ts`:

```typescript
export interface SymptomInput {
  description: string;
  severity?: string;
  duration?: string;
  onset?: string;
  aiGenerated?: boolean;
}

export interface DiagnosisInput {
  description: string;
  icdCode?: string;
  severity?: string;
  aiGenerated?: boolean;
  confidence?: number;
}

export interface PrescriptionInput {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  aiGenerated?: boolean;
}

export interface MedicalRecordInput {
  chiefComplaint?: string;
  presentIllness?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
}

export interface UpdateMedicalRecordInput {
  medicalRecord?: MedicalRecordInput;
  symptoms?: SymptomInput[];
  diagnosis?: DiagnosisInput;
  prescriptions?: PrescriptionInput[];
}
```

### 2. Create Medical Record Service
Create `packages/backend/src/services/medical-records.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import {
  MedicalRecordInput,
  SymptomInput,
  DiagnosisInput,
  PrescriptionInput,
} from '../types/medical-records.types';

const prisma = new PrismaClient();

export class MedicalRecordsService {
  async getByAppointmentId(appointmentId: string, userId: string) {
    // Verify appointment belongs to user's patient
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patient: { userId },
      },
      include: {
        medicalRecord: {
          include: {
            symptoms: true,
            diagnosis: true,
            prescriptions: true,
          },
        },
        patient: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  async createOrUpdate(appointmentId: string, userId: string, data: MedicalRecordInput) {
    // Verify ownership
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.medicalRecord) {
      return prisma.medicalRecord.update({
        where: { id: appointment.medicalRecord.id },
        data,
        include: { symptoms: true, diagnosis: true, prescriptions: true },
      });
    } else {
      return prisma.medicalRecord.create({
        data: {
          appointmentId,
          ...data,
        },
        include: { symptoms: true, diagnosis: true, prescriptions: true },
      });
    }
  }

  async addSymptom(appointmentId: string, userId: string, symptom: SymptomInput) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    return prisma.symptom.create({
      data: {
        medicalRecordId: record.id,
        ...symptom,
      },
    });
  }

  async updateSymptom(symptomId: string, userId: string, data: Partial<SymptomInput>) {
    // Verify ownership through relations
    const symptom = await prisma.symptom.findFirst({
      where: {
        id: symptomId,
        medicalRecord: {
          appointment: { patient: { userId } },
        },
      },
    });

    if (!symptom) {
      throw new Error('Symptom not found');
    }

    return prisma.symptom.update({
      where: { id: symptomId },
      data,
    });
  }

  async deleteSymptom(symptomId: string, userId: string) {
    const symptom = await prisma.symptom.findFirst({
      where: {
        id: symptomId,
        medicalRecord: { appointment: { patient: { userId } } },
      },
    });

    if (!symptom) {
      throw new Error('Symptom not found');
    }

    await prisma.symptom.delete({ where: { id: symptomId } });
  }

  async setDiagnosis(appointmentId: string, userId: string, diagnosis: DiagnosisInput) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    // Update or create diagnosis
    if (record.diagnosis) {
      return prisma.diagnosis.update({
        where: { id: record.diagnosis.id },
        data: diagnosis,
      });
    } else {
      return prisma.diagnosis.create({
        data: {
          medicalRecordId: record.id,
          ...diagnosis,
        },
      });
    }
  }

  async addPrescription(appointmentId: string, userId: string, prescription: PrescriptionInput) {
    const record = await this.ensureMedicalRecord(appointmentId, userId);

    return prisma.prescription.create({
      data: {
        medicalRecordId: record.id,
        ...prescription,
      },
    });
  }

  async updatePrescription(prescriptionId: string, userId: string, data: Partial<PrescriptionInput>) {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        medicalRecord: { appointment: { patient: { userId } } },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    return prisma.prescription.update({
      where: { id: prescriptionId },
      data,
    });
  }

  async deletePrescription(prescriptionId: string, userId: string) {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        medicalRecord: { appointment: { patient: { userId } } },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    await prisma.prescription.delete({ where: { id: prescriptionId } });
  }

  private async ensureMedicalRecord(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId } },
      include: { medicalRecord: { include: { diagnosis: true } } },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (!appointment.medicalRecord) {
      return prisma.medicalRecord.create({
        data: { appointmentId },
        include: { diagnosis: true },
      });
    }

    return appointment.medicalRecord;
  }
}

export const medicalRecordsService = new MedicalRecordsService();
```

### 3. Create Medical Records Controller
Create `packages/backend/src/controllers/medical-records.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { medicalRecordsService } from '../services/medical-records.service';

export class MedicalRecordsController {
  async get(req: Request, res: Response) {
    try {
      const data = await medicalRecordsService.getByAppointmentId(
        req.params.appointmentId,
        req.userId!
      );
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const data = await medicalRecordsService.createOrUpdate(
        req.params.appointmentId,
        req.userId!,
        req.body
      );
      res.json({ success: true, data, message: 'Medical record updated' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async addSymptom(req: Request, res: Response) {
    try {
      const symptom = await medicalRecordsService.addSymptom(
        req.params.appointmentId,
        req.userId!,
        req.body
      );
      res.status(201).json({ success: true, data: symptom });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateSymptom(req: Request, res: Response) {
    try {
      const symptom = await medicalRecordsService.updateSymptom(
        req.params.symptomId,
        req.userId!,
        req.body
      );
      res.json({ success: true, data: symptom });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async deleteSymptom(req: Request, res: Response) {
    try {
      await medicalRecordsService.deleteSymptom(req.params.symptomId, req.userId!);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async setDiagnosis(req: Request, res: Response) {
    try {
      const diagnosis = await medicalRecordsService.setDiagnosis(
        req.params.appointmentId,
        req.userId!,
        req.body
      );
      res.json({ success: true, data: diagnosis });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async addPrescription(req: Request, res: Response) {
    try {
      const prescription = await medicalRecordsService.addPrescription(
        req.params.appointmentId,
        req.userId!,
        req.body
      );
      res.status(201).json({ success: true, data: prescription });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updatePrescription(req: Request, res: Response) {
    try {
      const prescription = await medicalRecordsService.updatePrescription(
        req.params.prescriptionId,
        req.userId!,
        req.body
      );
      res.json({ success: true, data: prescription });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async deletePrescription(req: Request, res: Response) {
    try {
      await medicalRecordsService.deletePrescription(req.params.prescriptionId, req.userId!);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
}

export const medicalRecordsController = new MedicalRecordsController();
```

### 4. Create Medical Records Routes
Create `packages/backend/src/routes/medical-records.routes.ts`:

```typescript
import { Router } from 'express';
import { medicalRecordsController } from '../controllers/medical-records.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Medical record CRUD
router.get('/appointments/:appointmentId/medical-record', medicalRecordsController.get.bind(medicalRecordsController));
router.put('/appointments/:appointmentId/medical-record', medicalRecordsController.update.bind(medicalRecordsController));

// Symptoms
router.post('/appointments/:appointmentId/symptoms', medicalRecordsController.addSymptom.bind(medicalRecordsController));
router.put('/symptoms/:symptomId', medicalRecordsController.updateSymptom.bind(medicalRecordsController));
router.delete('/symptoms/:symptomId', medicalRecordsController.deleteSymptom.bind(medicalRecordsController));

// Diagnosis
router.put('/appointments/:appointmentId/diagnosis', medicalRecordsController.setDiagnosis.bind(medicalRecordsController));

// Prescriptions
router.post('/appointments/:appointmentId/prescriptions', medicalRecordsController.addPrescription.bind(medicalRecordsController));
router.put('/prescriptions/:prescriptionId', medicalRecordsController.updatePrescription.bind(medicalRecordsController));
router.delete('/prescriptions/:prescriptionId', medicalRecordsController.deletePrescription.bind(medicalRecordsController));

export default router;
```

## Part 2: Medical Records Frontend (TICKET-009)

### 1. Create Types
Create `packages/frontend/src/types/medical-records.types.ts` with all interfaces.

### 2. Create API Service
Create `packages/frontend/src/services/medical-records.api.ts` with all API calls.

### 3. Create Hooks
Create `packages/frontend/src/hooks/useMedicalRecord.ts` with React Query hooks.

### 4. Create Components

**SymptomsSection.tsx**:
- Display list of symptoms
- Add symptom form
- Edit/delete buttons
- AI indicator badge

**DiagnosisSection.tsx**:
- Display/edit diagnosis
- ICD code field (optional)
- AI indicator badge

**PrescriptionsSection.tsx**:
- Display list of prescriptions
- Add prescription modal
- Edit/delete buttons
- AI indicator badge

**MedicalRecordForm.tsx**:
- Combined form with all sections
- Auto-save functionality
- Unsaved changes indicator

### 5. Create Appointment Page
Create `packages/frontend/src/pages/appointments/AppointmentPage.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppointment, useUpdateAppointmentStatus } from '../../hooks/useAppointments';
import { useMedicalRecord, useSaveMedicalRecord } from '../../hooks/useMedicalRecord';
import { MedicalRecordForm } from '../../components/medical-records/MedicalRecordForm';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardContent } from '../../components/ui/card';

export function AppointmentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const { data: appointment, isLoading } = useAppointment(appointmentId!);
  const { data: medicalRecord, refetch: refetchRecord } = useMedicalRecord(appointmentId!);
  const saveMedicalRecord = useSaveMedicalRecord();
  const updateStatus = useUpdateAppointmentStatus();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSave = async (data: any) => {
    await saveMedicalRecord.mutateAsync({
      appointmentId: appointmentId!,
      data,
    });
    setHasUnsavedChanges(false);
    refetchRecord();
  };

  const handleStartAppointment = async () => {
    await updateStatus.mutateAsync({
      id: appointmentId!,
      status: 'IN_PROGRESS',
    });
  };

  const handleCompleteAppointment = async () => {
    await updateStatus.mutateAsync({
      id: appointmentId!,
      status: 'COMPLETED',
    });
    navigate(-1);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!appointment) {
    return <div className="p-8">Appointment not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </h1>
          <p className="text-gray-500">
            {new Date(appointment.scheduledAt).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {appointment.status === 'SCHEDULED' && (
            <Button onClick={handleStartAppointment}>Iniciar Cita</Button>
          )}
          {appointment.status === 'IN_PROGRESS' && (
            <Button onClick={handleCompleteAppointment} variant="outline">
              Finalizar Cita
            </Button>
          )}
          <Button
            onClick={() => handleSave(medicalRecord)}
            disabled={!hasUnsavedChanges || saveMedicalRecord.isPending}
          >
            {saveMedicalRecord.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MedicalRecordForm
            appointmentId={appointmentId!}
            medicalRecord={medicalRecord}
            onChange={() => setHasUnsavedChanges(true)}
            onSave={handleSave}
          />
        </div>

        <div>
          {/* Transcription Panel - will be added in next ticket */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Transcripción</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                La transcripción con IA estará disponible próximamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

## Testing
Create tests for all services, controllers, and components.

## Commit
```bash
git add .
git commit -m "feat: implement medical records management

Backend:
- Add medical record CRUD operations
- Add symptoms management (add/update/delete)
- Add diagnosis management
- Add prescriptions management
- Support for AI-generated field indicators

Frontend:
- Create medical record form component
- Create symptoms, diagnosis, prescriptions sections
- Create appointment page with medical record form
- Implement auto-save functionality
- Add unsaved changes indicator

TICKET-008, TICKET-009"
```

## Definition of Done Checklist
- [ ] Medical record backend CRUD working
- [ ] Symptoms management working
- [ ] Diagnosis management working
- [ ] Prescriptions management working
- [ ] Appointment page functional
- [ ] Medical record form working
- [ ] All sections editable
- [ ] Tests passing
- [ ] Code committed

## Next Prompt
Proceed to `18-implement-tickets-010-011.md` for AI transcription.
