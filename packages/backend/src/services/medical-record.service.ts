import { MedicalRecord, Symptom, Prescription, AppointmentStatus } from '@prisma/client';
import prisma from '../config/database.js';
import type {
  MedicalRecordInput,
  MedicalRecordPatchInput,
  SymptomInput,
  SymptomUpdateInput,
  PrescriptionInput,
  PrescriptionUpdateInput,
} from '../validators/medical-record.validator.js';

export interface MedicalRecordWithRelations extends MedicalRecord {
  symptoms: Symptom[];
  prescriptions: Prescription[];
}

export class MedicalRecordService {
  /**
   * Get medical record with all related data for an appointment
   */
  async findByAppointmentId(appointmentId: string, providerId: string): Promise<MedicalRecordWithRelations | null> {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        providerId,
      },
      include: {
        medicalRecord: {
          include: {
            symptoms: {
              orderBy: { createdAt: 'asc' },
            },
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

    return appointment.medicalRecord;
  }

  /**
   * Create a new medical record for an appointment
   */
  async create(appointmentId: string, providerId: string, data: MedicalRecordInput): Promise<MedicalRecordWithRelations> {
    // Verify ownership and that no record exists
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.medicalRecord) {
      throw new Error('Ya existe un expediente médico para esta cita');
    }

    return prisma.medicalRecord.create({
      data: {
        appointmentId,
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        physicalExamNotes: data.physicalExamNotes,
        diagnosis: data.diagnosis,
        diagnosisNotes: data.diagnosisNotes,
        treatmentPlan: data.treatmentPlan,
        followUpInstructions: data.followUpInstructions,
        patientEducation: data.patientEducation,
        isAIGenerated: data.isAIGenerated ?? false,
        isDraft: data.isDraft ?? true,
      },
      include: {
        symptoms: true,
        prescriptions: true,
      },
    });
  }

  /**
   * Update an existing medical record (full update)
   */
  async update(appointmentId: string, providerId: string, data: MedicalRecordInput): Promise<MedicalRecordWithRelations> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (!appointment.medicalRecord) {
      // Create if doesn't exist (upsert behavior)
      return this.create(appointmentId, providerId, data);
    }

    return prisma.medicalRecord.update({
      where: { id: appointment.medicalRecord.id },
      data: {
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        physicalExamNotes: data.physicalExamNotes,
        diagnosis: data.diagnosis,
        diagnosisNotes: data.diagnosisNotes,
        treatmentPlan: data.treatmentPlan,
        followUpInstructions: data.followUpInstructions,
        patientEducation: data.patientEducation,
        isAIGenerated: data.isAIGenerated,
        isDraft: data.isDraft,
      },
      include: {
        symptoms: true,
        prescriptions: true,
      },
    });
  }

  /**
   * Partial update for auto-save
   */
  async patch(appointmentId: string, providerId: string, data: MedicalRecordPatchInput): Promise<MedicalRecordWithRelations> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (!appointment.medicalRecord) {
      // Create with partial data
      return prisma.medicalRecord.create({
        data: {
          appointmentId,
          ...data,
        },
        include: {
          symptoms: true,
          prescriptions: true,
        },
      });
    }

    // Filter out undefined values
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    return prisma.medicalRecord.update({
      where: { id: appointment.medicalRecord.id },
      data: updateData,
      include: {
        symptoms: true,
        prescriptions: true,
      },
    });
  }

  /**
   * Mark medical record as complete (non-draft)
   */
  async complete(appointmentId: string, providerId: string): Promise<MedicalRecordWithRelations> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (!appointment.medicalRecord) {
      throw new Error('No existe expediente médico para esta cita');
    }

    if (!appointment.medicalRecord.diagnosis) {
      throw new Error('El diagnóstico es requerido para completar el expediente');
    }

    // Use transaction to update both record and appointment
    const [record] = await prisma.$transaction([
      prisma.medicalRecord.update({
        where: { id: appointment.medicalRecord.id },
        data: { isDraft: false },
        include: {
          symptoms: true,
          prescriptions: true,
        },
      }),
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.completed },
      }),
    ]);

    return record;
  }

  /**
   * Ensure a medical record exists for an appointment
   */
  private async ensureMedicalRecord(appointmentId: string, providerId: string): Promise<MedicalRecord> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.medicalRecord) {
      return appointment.medicalRecord;
    }

    return prisma.medicalRecord.create({
      data: { appointmentId },
    });
  }

  // ============ SYMPTOMS MANAGEMENT ============

  async addSymptom(appointmentId: string, providerId: string, data: SymptomInput): Promise<Symptom> {
    const record = await this.ensureMedicalRecord(appointmentId, providerId);

    return prisma.symptom.create({
      data: {
        medicalRecordId: record.id,
        symptomName: data.symptomName,
        bodySite: data.bodySite,
        severity: data.severity,
        duration: data.duration,
        notes: data.notes,
        isAIExtracted: data.isAIExtracted ?? false,
      },
    });
  }

  async updateSymptom(appointmentId: string, providerId: string, symptomId: string, data: SymptomUpdateInput): Promise<Symptom> {
    // Verify ownership through appointment
    const symptom = await prisma.symptom.findFirst({
      where: {
        id: symptomId,
        medicalRecord: {
          appointment: { id: appointmentId, providerId },
        },
      },
    });

    if (!symptom) {
      throw new Error('Síntoma no encontrado');
    }

    return prisma.symptom.update({
      where: { id: symptomId },
      data: {
        ...(data.symptomName !== undefined && { symptomName: data.symptomName }),
        ...(data.bodySite !== undefined && { bodySite: data.bodySite }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isAIExtracted !== undefined && { isAIExtracted: data.isAIExtracted }),
      },
    });
  }

  async removeSymptom(appointmentId: string, providerId: string, symptomId: string): Promise<void> {
    const symptom = await prisma.symptom.findFirst({
      where: {
        id: symptomId,
        medicalRecord: {
          appointment: { id: appointmentId, providerId },
        },
      },
    });

    if (!symptom) {
      throw new Error('Síntoma no encontrado');
    }

    await prisma.symptom.delete({ where: { id: symptomId } });
  }

  async batchAddSymptoms(appointmentId: string, providerId: string, symptoms: SymptomInput[]): Promise<{ count: number }> {
    const record = await this.ensureMedicalRecord(appointmentId, providerId);

    const result = await prisma.symptom.createMany({
      data: symptoms.map((s) => ({
        medicalRecordId: record.id,
        symptomName: s.symptomName,
        bodySite: s.bodySite,
        severity: s.severity,
        duration: s.duration,
        notes: s.notes,
        isAIExtracted: s.isAIExtracted ?? true,
      })),
    });

    return result;
  }

  // ============ PRESCRIPTIONS MANAGEMENT ============

  async addPrescription(appointmentId: string, providerId: string, data: PrescriptionInput): Promise<Prescription> {
    const record = await this.ensureMedicalRecord(appointmentId, providerId);

    return prisma.prescription.create({
      data: {
        medicalRecordId: record.id,
        medicationName: data.medicationName,
        strength: data.strength,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        quantity: data.quantity,
        refills: data.refills ?? 0,
        instructions: data.instructions,
        indication: data.indication,
        isAIExtracted: data.isAIExtracted ?? false,
      },
    });
  }

  async updatePrescription(appointmentId: string, providerId: string, prescriptionId: string, data: PrescriptionUpdateInput): Promise<Prescription> {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        medicalRecord: {
          appointment: { id: appointmentId, providerId },
        },
      },
    });

    if (!prescription) {
      throw new Error('Receta no encontrada');
    }

    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        ...(data.medicationName !== undefined && { medicationName: data.medicationName }),
        ...(data.strength !== undefined && { strength: data.strength }),
        ...(data.dosage !== undefined && { dosage: data.dosage }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.refills !== undefined && { refills: data.refills }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.indication !== undefined && { indication: data.indication }),
        ...(data.isAIExtracted !== undefined && { isAIExtracted: data.isAIExtracted }),
      },
    });
  }

  async removePrescription(appointmentId: string, providerId: string, prescriptionId: string): Promise<void> {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        medicalRecord: {
          appointment: { id: appointmentId, providerId },
        },
      },
    });

    if (!prescription) {
      throw new Error('Receta no encontrada');
    }

    await prisma.prescription.delete({ where: { id: prescriptionId } });
  }

  async batchAddPrescriptions(appointmentId: string, providerId: string, prescriptions: PrescriptionInput[]): Promise<{ count: number }> {
    const record = await this.ensureMedicalRecord(appointmentId, providerId);

    const result = await prisma.prescription.createMany({
      data: prescriptions.map((p) => ({
        medicalRecordId: record.id,
        medicationName: p.medicationName,
        strength: p.strength,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        quantity: p.quantity,
        refills: p.refills ?? 0,
        instructions: p.instructions,
        indication: p.indication,
        isAIExtracted: p.isAIExtracted ?? true,
      })),
    });

    return result;
  }

  // ============ AI SUGGESTIONS ============

  async clearAISuggestions(appointmentId: string, providerId: string): Promise<{ symptomsRemoved: number; prescriptionsRemoved: number; fieldsCleared: string[] }> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (!appointment.medicalRecord) {
      return { symptomsRemoved: 0, prescriptionsRemoved: 0, fieldsCleared: [] };
    }

    const recordId = appointment.medicalRecord.id;

    // Delete AI-extracted symptoms and prescriptions
    const [symptomsResult, prescriptionsResult] = await prisma.$transaction([
      prisma.symptom.deleteMany({
        where: { medicalRecordId: recordId, isAIExtracted: true },
      }),
      prisma.prescription.deleteMany({
        where: { medicalRecordId: recordId, isAIExtracted: true },
      }),
    ]);

    // Clear AI-generated text fields if the record is AI-generated
    const fieldsCleared: string[] = [];
    if (appointment.medicalRecord.isAIGenerated) {
      await prisma.medicalRecord.update({
        where: { id: recordId },
        data: {
          chiefComplaint: null,
          historyOfPresentIllness: null,
          physicalExamNotes: null,
          diagnosis: null,
          diagnosisNotes: null,
          treatmentPlan: null,
          isAIGenerated: false,
        },
      });
      fieldsCleared.push('chiefComplaint', 'historyOfPresentIllness', 'physicalExamNotes', 'diagnosis', 'diagnosisNotes', 'treatmentPlan');
    }

    return {
      symptomsRemoved: symptomsResult.count,
      prescriptionsRemoved: prescriptionsResult.count,
      fieldsCleared,
    };
  }
}

export const medicalRecordService = new MedicalRecordService();
