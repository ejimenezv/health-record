import { Appointment, AppointmentStatus, AppointmentType, Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
  AppointmentQuery,
} from '../validators/appointment.validator.js';
import { PaginatedResult } from './patient.service.js';

export interface AppointmentWithRelations extends Appointment {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    phone: string;
  };
  medicalRecord?: {
    id: string;
  } | null;
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['checked_in', 'in_progress', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'no_show'],
  in_progress: ['completed'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
  no_show: [], // Terminal state
};

export class AppointmentService {
  async findAll(providerId: string, query: AppointmentQuery): Promise<PaginatedResult<AppointmentWithRelations>> {
    const { patientId, status, startDate, endDate, page, limit } = query;

    const where: Prisma.AppointmentWhereInput = {
      providerId,
      ...(patientId && { patientId }),
      ...(status && { status: status as AppointmentStatus }),
      ...(startDate && {
        appointmentDate: {
          gte: new Date(startDate),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, dateOfBirth: true, phone: true },
          },
          medicalRecord: {
            select: { id: true },
          },
        },
        orderBy: { appointmentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, providerId: string): Promise<AppointmentWithRelations | null> {
    return prisma.appointment.findFirst({
      where: {
        id,
        providerId,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true, phone: true },
        },
        medicalRecord: {
          select: { id: true },
        },
      },
    });
  }

  async create(providerId: string, input: CreateAppointmentInput): Promise<Appointment> {
    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    return prisma.appointment.create({
      data: {
        patientId: input.patientId,
        providerId,
        appointmentDate: new Date(input.appointmentDate),
        appointmentType: input.appointmentType as AppointmentType,
        reasonForVisit: input.reasonForVisit,
        durationMinutes: input.durationMinutes,
        status: AppointmentStatus.scheduled,
      },
    });
  }

  async update(id: string, providerId: string, input: UpdateAppointmentInput): Promise<Appointment | null> {
    const existing = await prisma.appointment.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return null;
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        ...(input.appointmentDate && { appointmentDate: new Date(input.appointmentDate) }),
        ...(input.appointmentType && { appointmentType: input.appointmentType as AppointmentType }),
        ...(input.reasonForVisit !== undefined && { reasonForVisit: input.reasonForVisit }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
      },
    });
  }

  async updateStatus(id: string, providerId: string, input: UpdateAppointmentStatusInput): Promise<Appointment | null> {
    const existing = await prisma.appointment.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return null;
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(input.status)) {
      throw new Error(`Transición de estado inválida de '${existing.status}' a '${input.status}'`);
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status: input.status as AppointmentStatus,
      },
    });
  }

  async delete(id: string, providerId: string): Promise<boolean> {
    const existing = await prisma.appointment.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return false;
    }

    // Don't allow deleting completed appointments
    if (existing.status === 'completed') {
      throw new Error('No se puede eliminar una cita completada');
    }

    await prisma.appointment.delete({ where: { id } });
    return true;
  }

  async getTodayAppointments(providerId: string): Promise<AppointmentWithRelations[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.appointment.findMany({
      where: {
        providerId,
        appointmentDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true, phone: true },
        },
        medicalRecord: {
          select: { id: true },
        },
      },
      orderBy: { appointmentDate: 'asc' },
    });
  }
}

export const appointmentService = new AppointmentService();
