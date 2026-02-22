import { ChronicCondition } from '@prisma/client';
import prisma from '../config/database.js';
import { CreateChronicConditionInput, UpdateChronicConditionInput } from '../validators/chronicCondition.validator.js';

export class ChronicConditionService {
  async findByPatientId(patientId: string, providerId: string): Promise<ChronicCondition[]> {
    // Verify patient has at least one appointment with this provider
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        appointments: {
          some: {
            providerId,
          },
        },
      },
    });

    if (!patient) {
      return [];
    }

    return prisma.chronicCondition.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, providerId: string): Promise<ChronicCondition | null> {
    const condition = await prisma.chronicCondition.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            appointments: {
              where: { providerId },
              take: 1,
            },
          },
        },
      },
    });

    if (!condition || condition.patient.appointments.length === 0) {
      return null;
    }

    return condition;
  }

  async create(patientId: string, providerId: string, input: CreateChronicConditionInput): Promise<ChronicCondition | null> {
    // Verify patient has at least one appointment with this provider
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        appointments: {
          some: {
            providerId,
          },
        },
      },
    });

    if (!patient) {
      return null;
    }

    return prisma.chronicCondition.create({
      data: {
        patientId,
        conditionName: input.conditionName,
        diagnosisDate: input.diagnosisDate ? new Date(input.diagnosisDate) : null,
        status: input.status || 'active',
        notes: input.notes,
      },
    });
  }

  async update(id: string, providerId: string, input: UpdateChronicConditionInput): Promise<ChronicCondition | null> {
    // Verify condition exists and patient has appointment with this provider
    const existing = await this.findById(id, providerId);
    if (!existing) {
      return null;
    }

    return prisma.chronicCondition.update({
      where: { id },
      data: {
        ...(input.conditionName !== undefined && { conditionName: input.conditionName }),
        ...(input.diagnosisDate !== undefined && { diagnosisDate: input.diagnosisDate ? new Date(input.diagnosisDate) : null }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
  }

  async delete(id: string, providerId: string): Promise<boolean> {
    // Verify condition exists and patient has appointment with this provider
    const existing = await this.findById(id, providerId);
    if (!existing) {
      return false;
    }

    await prisma.chronicCondition.delete({ where: { id } });
    return true;
  }
}

export const chronicConditionService = new ChronicConditionService();
