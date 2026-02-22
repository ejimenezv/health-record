import { Allergy, AllergySeverity } from '@prisma/client';
import prisma from '../config/database.js';
import { CreateAllergyInput, UpdateAllergyInput } from '../validators/allergy.validator.js';

export class AllergyService {
  async findByPatientId(patientId: string, providerId: string): Promise<Allergy[]> {
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

    return prisma.allergy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, providerId: string): Promise<Allergy | null> {
    const allergy = await prisma.allergy.findUnique({
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

    if (!allergy || allergy.patient.appointments.length === 0) {
      return null;
    }

    return allergy;
  }

  async create(patientId: string, providerId: string, input: CreateAllergyInput): Promise<Allergy | null> {
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

    return prisma.allergy.create({
      data: {
        patientId,
        allergen: input.allergen,
        reaction: input.reaction,
        severity: input.severity as AllergySeverity | undefined,
        onsetDate: input.onsetDate ? new Date(input.onsetDate) : null,
      },
    });
  }

  async update(id: string, providerId: string, input: UpdateAllergyInput): Promise<Allergy | null> {
    // Verify allergy exists and patient has appointment with this provider
    const existing = await this.findById(id, providerId);
    if (!existing) {
      return null;
    }

    return prisma.allergy.update({
      where: { id },
      data: {
        ...(input.allergen !== undefined && { allergen: input.allergen }),
        ...(input.reaction !== undefined && { reaction: input.reaction }),
        ...(input.severity !== undefined && { severity: input.severity as AllergySeverity | null }),
        ...(input.onsetDate !== undefined && { onsetDate: input.onsetDate ? new Date(input.onsetDate) : null }),
      },
    });
  }

  async delete(id: string, providerId: string): Promise<boolean> {
    // Verify allergy exists and patient has appointment with this provider
    const existing = await this.findById(id, providerId);
    if (!existing) {
      return false;
    }

    await prisma.allergy.delete({ where: { id } });
    return true;
  }
}

export const allergyService = new AllergyService();
