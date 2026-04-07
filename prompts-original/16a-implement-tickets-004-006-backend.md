# Prompt 16a: Implement TICKET-004 & TICKET-006 - Patients & Appointments Backend

## Context
You are implementing the Medical Record System MVP. Authentication (TICKET-002, TICKET-003) is complete.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-004-patients-backend.md` - Patient backend requirements
- `docs/tickets/TICKET-006-appointments-backend.md` - Appointment backend requirements
- `docs/api/endpoints/patients.md` - Patient API specifications
- `docs/api/endpoints/appointments.md` - Appointment API specifications
- `docs/data-model/entities.md` - Database entities reference
- `docs/implementation/TICKET-002-003-completed.md` - Previous notes

## Verify Prerequisites
```bash
# 1. Backend is running and auth works
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}'
# Should return token

# 2. All current tests pass
cd packages/backend && pnpm test

# 3. Database has seed data
cd packages/backend && pnpm db:studio
# Check Patient table has 3 records
```

**If any verification fails:** Go back to previous prompts.

---

## Objective
Implement backend for:
- Patient CRUD operations with search and pagination
- Appointment CRUD operations with status workflow
- Today's appointments endpoint
- Comprehensive integration tests

---

## Part 1: Patients Backend (TICKET-004)

### Step 1.1: Create Patient Validator
Create `packages/backend/src/validators/patient.validator.ts`:

```typescript
import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de nacimiento inválida',
  }),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Género inválido' }),
  }),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  chronicConditions: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt']).default('lastName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQuery = z.infer<typeof patientQuerySchema>;
```

---

### Step 1.2: Create Patient Service
Create `packages/backend/src/services/patient.service.ts`:

```typescript
import { Patient, Gender, Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { CreatePatientInput, UpdatePatientInput, PatientQuery } from '../validators/patient.validator.js';

export interface PatientWithAppointments extends Patient {
  appointments?: {
    id: string;
    scheduledAt: Date;
    status: string;
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
  async findAll(userId: string, query: PatientQuery): Promise<PaginatedResult<PatientWithAppointments>> {
    const { search, page, limit, sortBy, sortOrder } = query;

    const where: Prisma.PatientWhereInput = {
      userId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          _count: { select: { appointments: true } },
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

  async findById(id: string, userId: string): Promise<PatientWithAppointments | null> {
    return prisma.patient.findFirst({
      where: { id, userId },
      include: {
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          include: {
            medicalRecord: {
              select: { id: true },
            },
          },
        },
        _count: { select: { appointments: true } },
      },
    });
  }

  async create(userId: string, input: CreatePatientInput): Promise<Patient> {
    return prisma.patient.create({
      data: {
        userId,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender as Gender,
        email: input.email,
        phone: input.phone,
        address: input.address,
        bloodType: input.bloodType,
        allergies: input.allergies,
        chronicConditions: input.chronicConditions,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
      },
    });
  }

  async update(id: string, userId: string, input: UpdatePatientInput): Promise<Patient | null> {
    const existing = await prisma.patient.findFirst({
      where: { id, userId },
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
        ...(input.gender && { gender: input.gender as Gender }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.bloodType !== undefined && { bloodType: input.bloodType }),
        ...(input.allergies !== undefined && { allergies: input.allergies }),
        ...(input.chronicConditions !== undefined && { chronicConditions: input.chronicConditions }),
        ...(input.emergencyContactName !== undefined && { emergencyContactName: input.emergencyContactName }),
        ...(input.emergencyContactPhone !== undefined && { emergencyContactPhone: input.emergencyContactPhone }),
      },
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.patient.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.patient.delete({ where: { id } });
    return true;
  }
}

export const patientService = new PatientService();
```

---

### Step 1.3: Create Patient Controller
Create `packages/backend/src/controllers/patient.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { patientService } from '../services/patient.service.js';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
} from '../validators/patient.validator.js';
import { ZodError } from 'zod';

export class PatientController {
  async findAll(req: Request, res: Response) {
    try {
      const query = patientQuerySchema.parse(req.query);
      const result = await patientService.findAll(req.userId!, query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al obtener pacientes',
      });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const patient = await patientService.findById(id, req.userId!);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
        });
      }

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener paciente',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const validatedData = createPatientSchema.parse(req.body);
      const patient = await patientService.create(req.userId!, validatedData);

      res.status(201).json({
        success: true,
        data: patient,
        message: 'Paciente creado exitosamente',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Error al crear paciente',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updatePatientSchema.parse(req.body);
      const patient = await patientService.update(id, req.userId!, validatedData);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
        });
      }

      res.json({
        success: true,
        data: patient,
        message: 'Paciente actualizado exitosamente',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar paciente',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await patientService.delete(id, req.userId!);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
        });
      }

      res.json({
        success: true,
        message: 'Paciente eliminado exitosamente',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar paciente',
      });
    }
  }
}

export const patientController = new PatientController();
```

---

### Step 1.4: Create Patient Routes
Create `packages/backend/src/routes/patient.routes.ts`:

```typescript
import { Router } from 'express';
import { patientController } from '../controllers/patient.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', patientController.findAll.bind(patientController));
router.get('/:id', patientController.findById.bind(patientController));
router.post('/', patientController.create.bind(patientController));
router.put('/:id', patientController.update.bind(patientController));
router.delete('/:id', patientController.delete.bind(patientController));

export default router;
```

---

### Step 1.5: Create Patient Tests
Create `packages/backend/tests/integration/patient.routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Patient Routes', () => {
  let token: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doctor@medrecord.com',
        password: 'password123',
      });
    token = loginResponse.body.data.token;
  });

  describe('GET /api/v1/patients', () => {
    it('should return paginated patients', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
    });

    it('should search patients by name', async () => {
      const response = await request(app)
        .get('/api/v1/patients?search=María')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].firstName).toContain('María');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/patients');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/patients/:id', () => {
    it('should return patient by id with appointments', async () => {
      const patient = await prisma.patient.findFirst();

      const response = await request(app)
        .get(`/api/v1/patients/${patient!.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(patient!.id);
      expect(response.body.data.appointments).toBeDefined();
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/v1/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/patients', () => {
    it('should create a new patient', async () => {
      const newPatient = {
        firstName: 'Nuevo',
        lastName: 'Paciente',
        dateOfBirth: '1995-05-15',
        gender: 'male',
        email: `test-${Date.now()}@example.com`,
        phone: '+52 555 000 0000',
      };

      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send(newPatient);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(newPatient.firstName);
      expect(response.body.data.lastName).toBe(newPatient.lastName);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Test' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate gender enum', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: '1990-01-01',
          gender: 'invalid',
        });

      expect(response.status).toBe(422);
    });
  });

  describe('PUT /api/v1/patients/:id', () => {
    it('should update patient', async () => {
      const patient = await prisma.patient.findFirst();

      const response = await request(app)
        .put(`/api/v1/patients/${patient!.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+52 555 111 2222' });

      expect(response.status).toBe(200);
      expect(response.body.data.phone).toBe('+52 555 111 2222');
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .put('/api/v1/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+52 555 111 2222' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/patients/:id', () => {
    it('should delete patient', async () => {
      // Create a patient to delete
      const patient = await prisma.patient.create({
        data: {
          userId: (await prisma.user.findFirst())!.id,
          firstName: 'ToDelete',
          lastName: 'Patient',
          dateOfBirth: new Date('2000-01-01'),
          gender: 'male',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.patient.findUnique({ where: { id: patient.id } });
      expect(deleted).toBeNull();
    });
  });
});
```

---

## Part 2: Appointments Backend (TICKET-006)

### Step 2.1: Create Appointment Validator
Create `packages/backend/src/validators/appointment.validator.ts`:

```typescript
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  scheduledAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha inválida',
  }),
  type: z.enum(['GENERAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP', 'SPECIALIST']).default('GENERAL'),
  reasonForVisit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha inválida',
  }).optional(),
  type: z.enum(['GENERAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP', 'SPECIALIST']).optional(),
  reasonForVisit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

export const appointmentQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
```

---

### Step 2.2: Create Appointment Service
Create `packages/backend/src/services/appointment.service.ts`:

```typescript
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
  };
  medicalRecord?: {
    id: string;
  } | null;
}

export class AppointmentService {
  async findAll(userId: string, query: AppointmentQuery): Promise<PaginatedResult<AppointmentWithRelations>> {
    const { patientId, status, startDate, endDate, page, limit } = query;

    const where: Prisma.AppointmentWhereInput = {
      patient: { userId },
      ...(patientId && { patientId }),
      ...(status && { status: status as AppointmentStatus }),
      ...(startDate && {
        scheduledAt: {
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
            select: { id: true, firstName: true, lastName: true },
          },
          medicalRecord: {
            select: { id: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
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

  async findById(id: string, userId: string): Promise<AppointmentWithRelations | null> {
    return prisma.appointment.findFirst({
      where: {
        id,
        patient: { userId },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        medicalRecord: {
          select: { id: true },
        },
      },
    });
  }

  async create(userId: string, input: CreateAppointmentInput): Promise<Appointment> {
    // Verify patient belongs to user
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, userId },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    return prisma.appointment.create({
      data: {
        patientId: input.patientId,
        scheduledAt: new Date(input.scheduledAt),
        type: input.type as AppointmentType,
        reasonForVisit: input.reasonForVisit,
        notes: input.notes,
        status: AppointmentStatus.SCHEDULED,
      },
    });
  }

  async update(id: string, userId: string, input: UpdateAppointmentInput): Promise<Appointment | null> {
    const existing = await prisma.appointment.findFirst({
      where: { id, patient: { userId } },
    });

    if (!existing) {
      return null;
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        ...(input.scheduledAt && { scheduledAt: new Date(input.scheduledAt) }),
        ...(input.type && { type: input.type as AppointmentType }),
        ...(input.reasonForVisit !== undefined && { reasonForVisit: input.reasonForVisit }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
  }

  async updateStatus(id: string, userId: string, input: UpdateAppointmentStatusInput): Promise<Appointment | null> {
    const existing = await prisma.appointment.findFirst({
      where: { id, patient: { userId } },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.AppointmentUpdateInput = {
      status: input.status as AppointmentStatus,
    };

    // Set timestamps based on status
    if (input.status === 'IN_PROGRESS' && !existing.startedAt) {
      updateData.startedAt = new Date();
    } else if (input.status === 'COMPLETED' && !existing.endedAt) {
      updateData.endedAt = new Date();
    }

    return prisma.appointment.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.appointment.findFirst({
      where: { id, patient: { userId } },
    });

    if (!existing) {
      return false;
    }

    await prisma.appointment.delete({ where: { id } });
    return true;
  }

  async getTodayAppointments(userId: string): Promise<AppointmentWithRelations[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.appointment.findMany({
      where: {
        patient: { userId },
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        medicalRecord: {
          select: { id: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}

export const appointmentService = new AppointmentService();
```

---

### Step 2.3: Create Appointment Controller
Create `packages/backend/src/controllers/appointment.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  appointmentQuerySchema,
} from '../validators/appointment.validator.js';
import { ZodError } from 'zod';

export class AppointmentController {
  async findAll(req: Request, res: Response) {
    try {
      const query = appointmentQuerySchema.parse(req.query);
      const result = await appointmentService.findAll(req.userId!, query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al obtener citas',
      });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.findById(id, req.userId!);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener cita',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      const appointment = await appointmentService.create(req.userId!, validatedData);

      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Cita creada exitosamente',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const statusCode = error.message === 'Paciente no encontrado' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al crear cita',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateAppointmentSchema.parse(req.body);
      const appointment = await appointmentService.update(id, req.userId!, validatedData);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        data: appointment,
        message: 'Cita actualizada exitosamente',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar cita',
      });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateAppointmentStatusSchema.parse(req.body);
      const appointment = await appointmentService.updateStatus(id, req.userId!, validatedData);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        data: appointment,
        message: 'Estado de cita actualizado',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar estado',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await appointmentService.delete(id, req.userId!);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        message: 'Cita eliminada exitosamente',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar cita',
      });
    }
  }

  async getTodayAppointments(req: Request, res: Response) {
    try {
      const appointments = await appointmentService.getTodayAppointments(req.userId!);

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener citas de hoy',
      });
    }
  }
}

export const appointmentController = new AppointmentController();
```

---

### Step 2.4: Create Appointment Routes
Create `packages/backend/src/routes/appointment.routes.ts`:

```typescript
import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', appointmentController.findAll.bind(appointmentController));
router.get('/today', appointmentController.getTodayAppointments.bind(appointmentController));
router.get('/:id', appointmentController.findById.bind(appointmentController));
router.post('/', appointmentController.create.bind(appointmentController));
router.put('/:id', appointmentController.update.bind(appointmentController));
router.patch('/:id/status', appointmentController.updateStatus.bind(appointmentController));
router.delete('/:id', appointmentController.delete.bind(appointmentController));

export default router;
```

---

### Step 2.5: Update Main Router
Update `packages/backend/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import appointmentRoutes from './appointment.routes.js';

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

export default router;
```

---

## Testing & Verification

### Run All Backend Tests
```bash
cd packages/backend
pnpm test
```

**Expected:** All tests pass (20+ tests including patient and appointment tests).

### Manual API Verification
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' | jq -r '.data.token')

# Test patients
curl http://localhost:3001/api/v1/patients \
  -H "Authorization: Bearer $TOKEN" | jq

# Test appointments
curl http://localhost:3001/api/v1/appointments/today \
  -H "Authorization: Bearer $TOKEN" | jq
```

### TypeScript Check
```bash
cd packages/backend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

**Patients Backend:**
- [ ] Patient validator with Zod schemas
- [ ] Patient service with CRUD + search/pagination
- [ ] Patient controller with error handling
- [ ] Patient routes registered
- [ ] Patient tests passing (10+ tests)

**Appointments Backend:**
- [ ] Appointment validator with Zod schemas
- [ ] Appointment service with CRUD + status workflow
- [ ] Today's appointments endpoint
- [ ] Appointment controller with error handling
- [ ] Appointment routes registered
- [ ] Appointment tests passing (10+ tests)

**General:**
- [ ] All backend tests pass
- [ ] TypeScript compiles without errors
- [ ] Manual API calls work correctly

---

## Debugging Reference

| Issue | Solution |
|-------|----------|
| Patient not found | Check userId ownership filter |
| Date validation failing | Ensure ISO date string format |
| Status update not setting timestamps | Check status transition logic |
| Search not working | Check Prisma insensitive mode |

---

## Next Prompt
Proceed to `16b-implement-tickets-005-007-frontend.md` for patients and appointments frontend.
