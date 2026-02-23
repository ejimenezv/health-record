import { VitalSigns, Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import type { VitalSignsInput } from '../validators/medical-record.validator.js';

export class VitalSignsService {
  /**
   * Get vital signs for an appointment
   */
  async findByAppointmentId(appointmentId: string, providerId: string): Promise<VitalSigns | null> {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        providerId,
      },
      include: {
        vitalSigns: true,
      },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    return appointment.vitalSigns;
  }

  /**
   * Create vital signs for an appointment
   */
  async create(appointmentId: string, providerId: string, data: VitalSignsInput): Promise<VitalSigns> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { vitalSigns: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.vitalSigns) {
      throw new Error('Ya existen signos vitales para esta cita');
    }

    const bmi = this.calculateBMI(data.weight, data.height);

    return prisma.vitalSigns.create({
      data: {
        appointmentId,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        heartRate: data.heartRate,
        temperature: data.temperature ? new Prisma.Decimal(data.temperature) : null,
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        weight: data.weight ? new Prisma.Decimal(data.weight) : null,
        height: data.height ? new Prisma.Decimal(data.height) : null,
        bmi: bmi ? new Prisma.Decimal(bmi) : null,
        painLevel: data.painLevel,
      },
    });
  }

  /**
   * Update vital signs for an appointment (upsert)
   */
  async update(appointmentId: string, providerId: string, data: VitalSignsInput): Promise<VitalSigns> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId },
      include: { vitalSigns: true },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    // Calculate BMI if weight and height are provided
    const weight = data.weight ?? (appointment.vitalSigns?.weight ? Number(appointment.vitalSigns.weight) : null);
    const height = data.height ?? (appointment.vitalSigns?.height ? Number(appointment.vitalSigns.height) : null);
    const bmi = this.calculateBMI(weight, height);

    if (appointment.vitalSigns) {
      return prisma.vitalSigns.update({
        where: { id: appointment.vitalSigns.id },
        data: {
          ...(data.bloodPressureSystolic !== undefined && { bloodPressureSystolic: data.bloodPressureSystolic }),
          ...(data.bloodPressureDiastolic !== undefined && { bloodPressureDiastolic: data.bloodPressureDiastolic }),
          ...(data.heartRate !== undefined && { heartRate: data.heartRate }),
          ...(data.temperature !== undefined && { temperature: data.temperature ? new Prisma.Decimal(data.temperature) : null }),
          ...(data.respiratoryRate !== undefined && { respiratoryRate: data.respiratoryRate }),
          ...(data.oxygenSaturation !== undefined && { oxygenSaturation: data.oxygenSaturation }),
          ...(data.weight !== undefined && { weight: data.weight ? new Prisma.Decimal(data.weight) : null }),
          ...(data.height !== undefined && { height: data.height ? new Prisma.Decimal(data.height) : null }),
          ...(data.painLevel !== undefined && { painLevel: data.painLevel }),
          bmi: bmi ? new Prisma.Decimal(bmi) : null,
        },
      });
    }

    // Create if doesn't exist
    return this.create(appointmentId, providerId, data);
  }

  /**
   * Calculate BMI from weight (kg) and height (cm)
   */
  private calculateBMI(weight: number | null | undefined, height: number | null | undefined): number | null {
    if (!weight || !height || height === 0) {
      return null;
    }

    // BMI = weight (kg) / height (m)^2
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10; // Round to 1 decimal
  }
}

export const vitalSignsService = new VitalSignsService();
