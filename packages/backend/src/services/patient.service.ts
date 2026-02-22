import { Patient, Sex, Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { CreatePatientInput, UpdatePatientInput, PatientQuery } from '../validators/patient.validator.js';

export interface PatientWithRelations extends Patient {
  appointments?: {
    id: string;
    appointmentDate: Date;
    status: string;
    medicalRecord?: {
      id: string;
    } | null;
  }[];
  allergies?: {
    id: string;
    allergen: string;
    severity: string | null;
  }[];
  chronicConditions?: {
    id: string;
    conditionName: string;
    status: string | null;
  }[];
  _count?: {
    appointments: number;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PatientService {
  async findAll(providerId: string, query: PatientQuery): Promise<PaginatedResult<PatientWithRelations>> {
    const { search, page, limit, sortBy, sortOrder } = query;

    // Get patients that have appointments with this provider OR have no appointments (newly created)
    const where: Prisma.PatientWhereInput = {
      OR: [
        {
          appointments: {
            some: {
              providerId,
            },
          },
        },
        {
          appointments: {
            none: {},
          },
        },
      ],
      ...(search && {
        AND: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          _count: { select: { appointments: true } },
          allergies: {
            select: { id: true, allergen: true, severity: true },
          },
          chronicConditions: {
            select: { id: true, conditionName: true, status: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.patient.count({ where }),
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

  async findById(id: string, providerId: string): Promise<PatientWithRelations | null> {
    // Find patient if:
    // 1. They have at least one appointment with this provider, OR
    // 2. They have no appointments at all (newly created patient)
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        OR: [
          {
            appointments: {
              some: {
                providerId,
              },
            },
          },
          {
            appointments: {
              none: {},
            },
          },
        ],
      },
      include: {
        appointments: {
          where: { providerId },
          orderBy: { appointmentDate: 'desc' },
          take: 10,
          include: {
            medicalRecord: {
              select: { id: true },
            },
          },
        },
        allergies: true,
        chronicConditions: true,
        _count: { select: { appointments: true } },
      },
    });

    return patient;
  }

  async create(_providerId: string, input: CreatePatientInput): Promise<Patient> {
    // Create patient (providerId kept for API consistency, patient is linked via appointments)
    const patient = await prisma.patient.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        sex: input.sex as Sex,
        phone: input.phone,
        email: input.email,
        address: input.address,
        bloodType: input.bloodType,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelationship: input.emergencyContactRelationship,
      },
    });

    return patient;
  }

  async update(id: string, providerId: string, input: UpdatePatientInput): Promise<Patient | null> {
    // Verify patient exists and has appointment with this provider OR has no appointments
    const existing = await prisma.patient.findFirst({
      where: {
        id,
        OR: [
          {
            appointments: {
              some: {
                providerId,
              },
            },
          },
          {
            appointments: {
              none: {},
            },
          },
        ],
      },
    });

    if (!existing) {
      return null;
    }

    return prisma.patient.update({
      where: { id },
      data: {
        ...(input.firstName && { firstName: input.firstName }),
        ...(input.lastName && { lastName: input.lastName }),
        ...(input.dateOfBirth && { dateOfBirth: new Date(input.dateOfBirth) }),
        ...(input.sex && { sex: input.sex as Sex }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.bloodType !== undefined && { bloodType: input.bloodType }),
        ...(input.emergencyContactName !== undefined && { emergencyContactName: input.emergencyContactName }),
        ...(input.emergencyContactPhone !== undefined && { emergencyContactPhone: input.emergencyContactPhone }),
        ...(input.emergencyContactRelationship !== undefined && { emergencyContactRelationship: input.emergencyContactRelationship }),
      },
    });
  }

  async delete(id: string, providerId: string): Promise<boolean> {
    // Verify patient exists and has appointment with this provider OR has no appointments
    const existing = await prisma.patient.findFirst({
      where: {
        id,
        OR: [
          {
            appointments: {
              some: {
                providerId,
              },
            },
          },
          {
            appointments: {
              none: {},
            },
          },
        ],
      },
    });

    if (!existing) {
      return false;
    }

    await prisma.patient.delete({ where: { id } });
    return true;
  }

  async getAppointments(patientId: string, providerId: string) {
    return prisma.appointment.findMany({
      where: {
        patientId,
        providerId,
      },
      include: {
        medicalRecord: {
          select: {
            id: true,
            chiefComplaint: true,
            diagnosis: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }
}

export const patientService = new PatientService();
