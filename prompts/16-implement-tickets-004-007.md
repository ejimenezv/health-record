# Prompt 16: Implement TICKET-004 to TICKET-007 - Patients & Appointments

## Context
You are implementing the Medical Record System MVP. Authentication (TICKET-002, TICKET-003) is complete.

## Prerequisites
Read the following documentation files:
- `docs/tickets/TICKET-004-patients-backend.md`
- `docs/tickets/TICKET-005-patients-frontend.md`
- `docs/tickets/TICKET-006-appointments-backend.md`
- `docs/tickets/TICKET-007-appointments-frontend.md`
- `docs/api/endpoints/patients.md`
- `docs/api/endpoints/appointments.md`
- `docs/frontend/pages/patients-list.md`
- `docs/frontend/pages/patient-detail.md`
- `docs/implementation/TICKET-002-003-completed.md`

## Objective
Implement complete patient management and appointment management (CRUD operations and UI).

## Part 1: Patients Backend (TICKET-004)

### 1. Create Patient Types
Create `packages/backend/src/types/patients.types.ts`:

```typescript
export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {}

export interface PatientFilters {
  search?: string;
  page?: number;
  limit?: number;
}
```

### 2. Create Patient Validator
Create `packages/backend/src/validators/patients.validator.ts`:

```typescript
import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().transform((str) => new Date(str)),
  gender: z.enum(['male', 'female', 'other']),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  chronicConditions: z.string().optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();
```

### 3. Create Patient Repository
Create `packages/backend/src/repositories/patients.repository.ts`:

```typescript
import { PrismaClient, Patient, Prisma } from '@prisma/client';
import { CreatePatientInput, UpdatePatientInput, PatientFilters } from '../types/patients.types';

const prisma = new PrismaClient();

export class PatientsRepository {
  async findAll(userId: string, filters: PatientFilters) {
    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      userId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { appointments: true } },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string) {
    return prisma.patient.findFirst({
      where: { id, userId },
      include: {
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            medicalRecord: {
              include: {
                diagnosis: true,
              },
            },
          },
        },
      },
    });
  }

  async create(userId: string, data: CreatePatientInput) {
    return prisma.patient.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: string, userId: string, data: UpdatePatientInput) {
    // Verify ownership first
    const patient = await prisma.patient.findFirst({ where: { id, userId } });
    if (!patient) return null;

    return prisma.patient.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    // Verify ownership first
    const patient = await prisma.patient.findFirst({ where: { id, userId } });
    if (!patient) return false;

    await prisma.patient.delete({ where: { id } });
    return true;
  }
}

export const patientsRepository = new PatientsRepository();
```

### 4. Create Patient Service
Create `packages/backend/src/services/patients.service.ts`:

```typescript
import { patientsRepository } from '../repositories/patients.repository';
import { CreatePatientInput, UpdatePatientInput, PatientFilters } from '../types/patients.types';

export class PatientsService {
  async list(userId: string, filters: PatientFilters) {
    return patientsRepository.findAll(userId, filters);
  }

  async getById(id: string, userId: string) {
    const patient = await patientsRepository.findById(id, userId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    return patient;
  }

  async create(userId: string, data: CreatePatientInput) {
    return patientsRepository.create(userId, data);
  }

  async update(id: string, userId: string, data: UpdatePatientInput) {
    const patient = await patientsRepository.update(id, userId, data);
    if (!patient) {
      throw new Error('Patient not found');
    }
    return patient;
  }

  async delete(id: string, userId: string) {
    const success = await patientsRepository.delete(id, userId);
    if (!success) {
      throw new Error('Patient not found');
    }
  }
}

export const patientsService = new PatientsService();
```

### 5. Create Patient Controller
Create `packages/backend/src/controllers/patients.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { patientsService } from '../services/patients.service';
import { createPatientSchema, updatePatientSchema } from '../validators/patients.validator';

export class PatientsController {
  async list(req: Request, res: Response) {
    try {
      const { search, page, limit } = req.query;
      const result = await patientsService.list(req.userId!, {
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const patient = await patientsService.getById(req.params.id, req.userId!);
      res.json({ success: true, data: patient });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = createPatientSchema.parse(req.body);
      const patient = await patientsService.create(req.userId!, data);
      res.status(201).json({ success: true, data: patient, message: 'Patient created successfully' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(422).json({ success: false, message: 'Validation error', errors: error.errors });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const data = updatePatientSchema.parse(req.body);
      const patient = await patientsService.update(req.params.id, req.userId!, data);
      res.json({ success: true, data: patient, message: 'Patient updated successfully' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(422).json({ success: false, message: 'Validation error', errors: error.errors });
      }
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await patientsService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
}

export const patientsController = new PatientsController();
```

### 6. Create Patient Routes
Create `packages/backend/src/routes/patients.routes.ts`:

```typescript
import { Router } from 'express';
import { patientsController } from '../controllers/patients.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', patientsController.list.bind(patientsController));
router.get('/:id', patientsController.getById.bind(patientsController));
router.post('/', patientsController.create.bind(patientsController));
router.put('/:id', patientsController.update.bind(patientsController));
router.delete('/:id', patientsController.delete.bind(patientsController));

export default router;
```

### 7. Update Main Router
Add to `packages/backend/src/routes/index.ts`:

```typescript
import patientsRoutes from './patients.routes';
// ... existing routes
router.use('/patients', patientsRoutes);
```

## Part 2: Appointments Backend (TICKET-006)

Create similar structure for appointments:
- `src/types/appointments.types.ts`
- `src/validators/appointments.validator.ts`
- `src/repositories/appointments.repository.ts`
- `src/services/appointments.service.ts`
- `src/controllers/appointments.controller.ts`
- `src/routes/appointments.routes.ts`

Key differences for appointments:
- Include medical record creation on appointment start
- Include status transitions (SCHEDULED → IN_PROGRESS → COMPLETED)
- Include nested relations loading

## Part 3: Patients Frontend (TICKET-005)

### 1. Create Patient Types
Create `packages/frontend/src/types/patients.types.ts`:

```typescript
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { appointments: number };
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
}

export interface PatientsResponse {
  data: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 2. Create Patient API Service
Create `packages/frontend/src/services/patients.api.ts`:

```typescript
import { api } from './api';
import { Patient, CreatePatientRequest, PatientsResponse } from '../types/patients.types';

export const patientsApi = {
  list: async (search?: string, page = 1): Promise<PatientsResponse> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page.toString());

    const response = await api.get<{ success: boolean } & PatientsResponse>(`/patients?${params}`);
    return { data: response.data.data, pagination: response.data.pagination };
  },

  getById: async (id: string): Promise<Patient> => {
    const response = await api.get<{ success: boolean; data: Patient }>(`/patients/${id}`);
    return response.data.data;
  },

  create: async (data: CreatePatientRequest): Promise<Patient> => {
    const response = await api.post<{ success: boolean; data: Patient }>('/patients', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreatePatientRequest>): Promise<Patient> => {
    const response = await api.put<{ success: boolean; data: Patient }>(`/patients/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
};
```

### 3. Create Patient Hooks
Create `packages/frontend/src/hooks/usePatients.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../services/patients.api';
import { CreatePatientRequest } from '../types/patients.types';

export function usePatients(search?: string, page = 1) {
  return useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => patientsApi.list(search, page),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientRequest) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePatientRequest> }) =>
      patientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
```

### 4. Create Patient Components

Create `packages/frontend/src/components/patients/PatientCard.tsx`:
```typescript
import { Patient } from '../../types/patients.types';
import { Card, CardContent } from '../ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const age = Math.floor(
    (new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-gray-500 text-sm">
              {age} años • {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'}
            </p>
          </div>
          {patient._count && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
              {patient._count.appointments} citas
            </span>
          )}
        </div>
        {(patient.allergies || patient.chronicConditions) && (
          <div className="mt-2 text-sm text-gray-600">
            {patient.allergies && <p>Alergias: {patient.allergies}</p>}
            {patient.chronicConditions && <p>Condiciones: {patient.chronicConditions}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

Create `packages/frontend/src/components/patients/PatientForm.tsx`:
- Form with all patient fields
- Validation with react-hook-form and zod
- Loading state handling

Create `packages/frontend/src/components/patients/PatientSearch.tsx`:
- Search input with debounce

### 5. Create Patient Pages

Create `packages/frontend/src/pages/patients/PatientsPage.tsx`:
- Patient list with search
- Pagination
- Link to new patient form

Create `packages/frontend/src/pages/patients/PatientDetailPage.tsx`:
- Patient info card
- Edit button with modal
- Appointment history list
- New appointment button

Create `packages/frontend/src/pages/patients/NewPatientPage.tsx`:
- Patient form
- Submit handling
- Redirect on success

## Part 4: Appointments Frontend (TICKET-007)

Create similar structure for appointments frontend:
- Types, API service, hooks
- AppointmentCard, AppointmentList, AppointmentHistory components
- NewAppointmentPage

### 6. Update Router
Update `packages/frontend/src/router/index.tsx` with all new routes.

## Testing

### Backend Tests
Create integration tests for:
- GET /api/v1/patients
- POST /api/v1/patients
- GET /api/v1/patients/:id
- PUT /api/v1/patients/:id
- DELETE /api/v1/patients/:id

Same for appointments routes.

### Frontend Tests
Create component tests for:
- PatientCard
- PatientForm
- PatientList

## Commit
```bash
git add .
git commit -m "feat: implement patient and appointment management

Backend:
- Add patient CRUD endpoints with validation
- Add appointment CRUD endpoints with status management
- Add repositories for data access layer
- Add integration tests for all endpoints

Frontend:
- Create patient list, detail, and form pages
- Create appointment management components
- Add React Query hooks for data fetching
- Implement search and pagination

TICKET-004, TICKET-005, TICKET-006, TICKET-007"
```

## Definition of Done Checklist
- [ ] Patient CRUD backend working
- [ ] Appointment CRUD backend working
- [ ] Patient list page functional
- [ ] Patient detail page functional
- [ ] New patient form working
- [ ] Appointment history visible
- [ ] New appointment creation working
- [ ] All tests passing
- [ ] Code committed

## Next Prompt
Proceed to `17-implement-tickets-008-009.md` for medical records implementation.
