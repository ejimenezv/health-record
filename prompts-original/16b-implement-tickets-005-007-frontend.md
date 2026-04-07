# Prompt 16b: Implement TICKET-005 & TICKET-007 - Patients & Appointments Frontend

## Context
You are implementing the Medical Record System MVP. Patients and Appointments backend (TICKET-004, TICKET-006) is complete.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-005-patients-frontend.md` - Frontend requirements
- `docs/tickets/TICKET-007-appointments-frontend.md` - Frontend requirements
- `docs/frontend/pages/patients-list.md` - Patients list design
- `docs/frontend/pages/patient-detail.md` - Patient detail design
- `docs/frontend/pages/new-patient.md` - New patient form design
- `docs/frontend/pages/new-appointment.md` - New appointment form design

## Verify Prerequisites
```bash
# 1. Backend is running
cd packages/backend && pnpm dev

# 2. Patients and appointments APIs work
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' | jq -r '.data.token')

curl http://localhost:3001/api/v1/patients \
  -H "Authorization: Bearer $TOKEN" | jq

curl http://localhost:3001/api/v1/appointments/today \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Backend tests pass
cd packages/backend && pnpm test
```

**If any verification fails:** Go back to Prompt 16a.

---

## Objective
Implement frontend for:
- Patient types and API service
- Patient hooks with React Query
- Patients list page with search/pagination
- Patient detail page
- New/Edit patient forms
- Appointment types and API service
- Appointment hooks
- Appointments list and today view
- New appointment form
- Main layout with navigation

---

## Part 1: Patients Frontend (TICKET-005)

### Step 1.1: Create Patient Types
Create `packages/frontend/src/types/patient.types.ts`:

```typescript
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    appointments: number;
  };
  appointments?: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    medicalRecord?: { id: string } | null;
  }>;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export type UpdatePatientRequest = Partial<CreatePatientRequest>;

export interface PatientQuery {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
```

---

### Step 1.2: Create Common Types
Create `packages/frontend/src/types/common.types.ts`:

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

### Step 1.3: Create Patient API Service
Create `packages/frontend/src/services/patients.api.ts`:

```typescript
import api from './api';
import { Patient, CreatePatientRequest, UpdatePatientRequest, PatientQuery } from '../types/patient.types';
import { PaginatedResponse } from '../types/common.types';
import { ApiResponse } from '../types/auth.types';

export const patientsApi = {
  getAll: async (query?: PatientQuery): Promise<PaginatedResponse<Patient>> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const response = await api.get<ApiResponse<Patient[]> & { pagination: any }>(
      `/patients?${params.toString()}`
    );
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  getById: async (id: string): Promise<Patient> => {
    const response = await api.get<ApiResponse<Patient>>(`/patients/${id}`);
    return response.data.data!;
  },

  create: async (data: CreatePatientRequest): Promise<Patient> => {
    const response = await api.post<ApiResponse<Patient>>('/patients', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdatePatientRequest): Promise<Patient> => {
    const response = await api.put<ApiResponse<Patient>>(`/patients/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
};
```

---

### Step 1.4: Create Patient Hooks
Create `packages/frontend/src/hooks/usePatients.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../services/patients.api';
import { PatientQuery, CreatePatientRequest, UpdatePatientRequest } from '../types/patient.types';

export const usePatients = (query?: PatientQuery) => {
  return useQuery({
    queryKey: ['patients', query],
    queryFn: () => patientsApi.getAll(query),
  });
};

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientRequest) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientRequest }) =>
      patientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.id] });
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};
```

---

### Step 1.5: Create Patients List Page
Create `packages/frontend/src/pages/patients/PatientsListPage.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../../hooks/usePatients';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';

export function PatientsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = usePatients({
    search: search || undefined,
    page,
    limit: 10,
  });

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getGenderLabel = (gender: string): string => {
    const labels: Record<string, string> = {
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro',
    };
    return labels[gender] || gender;
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error al cargar pacientes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Button onClick={() => navigate('/patients/new')}>
          Nuevo Paciente
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {data?.data.map((patient) => (
              <Card
                key={patient.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {calculateAge(patient.dateOfBirth)} años - {getGenderLabel(patient.gender)}
                      </p>
                      {patient.phone && (
                        <p className="text-gray-500 text-sm">{patient.phone}</p>
                      )}
                      {patient.email && (
                        <p className="text-gray-500 text-sm">{patient.email}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{patient._count?.appointments || 0} citas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data?.data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {search ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="py-2 px-4 text-gray-600">
                Página {page} de {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PatientsListPage;
```

---

### Step 1.6: Create New Patient Page
Create `packages/frontend/src/pages/patients/NewPatientPage.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePatient } from '../../hooks/usePatients';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';

const patientSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  dateOfBirth: z.string().min(1, 'Fecha de nacimiento requerida'),
  gender: z.enum(['male', 'female', 'other']),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

export function NewPatientPage() {
  const navigate = useNavigate();
  const createPatient = useCreatePatient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'male',
    },
  });

  const onSubmit = async (data: PatientFormData) => {
    try {
      const patient = await createPatient.mutateAsync({
        ...data,
        email: data.email || null,
      });
      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-red-500 text-sm">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-red-500 text-sm">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de Nacimiento *</Label>
                <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Género *</Label>
                <Select
                  defaultValue="male"
                  onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register('address')} />
            </div>

            {/* Medical Info */}
            <div className="space-y-2">
              <Label htmlFor="bloodType">Tipo de Sangre</Label>
              <Select onValueChange={(value) => setValue('bloodType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea id="allergies" {...register('allergies')} placeholder="Lista de alergias conocidas..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chronicConditions">Condiciones Crónicas</Label>
              <Textarea id="chronicConditions" {...register('chronicConditions')} placeholder="Lista de condiciones crónicas..." />
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contacto de Emergencia</Label>
                <Input id="emergencyContactName" {...register('emergencyContactName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Teléfono de Emergencia</Label>
                <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={createPatient.isPending}>
                {createPatient.isPending ? 'Guardando...' : 'Crear Paciente'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/patients')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default NewPatientPage;
```

---

### Step 1.7: Create Patient Detail Page
Create `packages/frontend/src/pages/patients/PatientDetailPage.tsx`:

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { usePatient, useDeletePatient } from '../../hooks/usePatients';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading, error } = usePatient(id!);
  const deletePatient = useDeletePatient();

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDelete = async () => {
    if (window.confirm('¿Está seguro de eliminar este paciente?')) {
      await deletePatient.mutateAsync(id!);
      navigate('/patients');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-8 text-red-500">
        Paciente no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-gray-600">
            {calculateAge(patient.dateOfBirth)} años
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/patients/${id}/edit`)}>
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Email:</strong> {patient.email || 'No registrado'}</p>
            <p><strong>Teléfono:</strong> {patient.phone || 'No registrado'}</p>
            <p><strong>Dirección:</strong> {patient.address || 'No registrada'}</p>
          </CardContent>
        </Card>

        {/* Medical Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información Médica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Tipo de Sangre:</strong> {patient.bloodType || 'No registrado'}</p>
            <p><strong>Alergias:</strong> {patient.allergies || 'Ninguna registrada'}</p>
            <p><strong>Condiciones Crónicas:</strong> {patient.chronicConditions || 'Ninguna'}</p>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contacto de Emergencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Nombre:</strong> {patient.emergencyContactName || 'No registrado'}</p>
            <p><strong>Teléfono:</strong> {patient.emergencyContactPhone || 'No registrado'}</p>
          </CardContent>
        </Card>

        {/* Appointments History */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Historial de Citas</CardTitle>
            <Button size="sm" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>
              Nueva Cita
            </Button>
          </CardHeader>
          <CardContent>
            {patient.appointments?.length === 0 ? (
              <p className="text-gray-500">Sin citas registradas</p>
            ) : (
              <ul className="space-y-2">
                {patient.appointments?.map((apt) => (
                  <li
                    key={apt.id}
                    className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                  >
                    <p className="font-medium">
                      {new Date(apt.scheduledAt).toLocaleDateString('es-MX')}
                    </p>
                    <p className="text-sm text-gray-600">{apt.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PatientDetailPage;
```

---

## Part 2: Appointments Frontend (TICKET-007)

### Step 2.1: Create Appointment Types
Create `packages/frontend/src/types/appointment.types.ts`:

```typescript
export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AppointmentType = 'GENERAL' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE_CHECKUP' | 'SPECIALIST';

export interface Appointment {
  id: string;
  patientId: string;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status: AppointmentStatus;
  type: AppointmentType;
  reasonForVisit?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  medicalRecord?: {
    id: string;
  } | null;
}

export interface CreateAppointmentRequest {
  patientId: string;
  scheduledAt: string;
  type?: AppointmentType;
  reasonForVisit?: string | null;
  notes?: string | null;
}

export interface UpdateAppointmentRequest {
  scheduledAt?: string;
  type?: AppointmentType;
  reasonForVisit?: string | null;
  notes?: string | null;
}

export interface AppointmentQuery {
  patientId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

---

### Step 2.2: Create Appointment API Service
Create `packages/frontend/src/services/appointments.api.ts`:

```typescript
import api from './api';
import { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest, AppointmentQuery, AppointmentStatus } from '../types/appointment.types';
import { PaginatedResponse } from '../types/common.types';
import { ApiResponse } from '../types/auth.types';

export const appointmentsApi = {
  getAll: async (query?: AppointmentQuery): Promise<PaginatedResponse<Appointment>> => {
    const params = new URLSearchParams();
    if (query?.patientId) params.append('patientId', query.patientId);
    if (query?.status) params.append('status', query.status);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await api.get<ApiResponse<Appointment[]> & { pagination: any }>(
      `/appointments?${params.toString()}`
    );
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  getToday: async (): Promise<Appointment[]> => {
    const response = await api.get<ApiResponse<Appointment[]>>('/appointments/today');
    return response.data.data!;
  },

  getById: async (id: string): Promise<Appointment> => {
    const response = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateAppointmentRequest): Promise<Appointment> => {
    const response = await api.post<ApiResponse<Appointment>>('/appointments', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateAppointmentRequest): Promise<Appointment> => {
    const response = await api.put<ApiResponse<Appointment>>(`/appointments/${id}`, data);
    return response.data.data!;
  },

  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const response = await api.patch<ApiResponse<Appointment>>(`/appointments/${id}/status`, { status });
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },
};
```

---

### Step 2.3: Create Appointment Hooks
Create `packages/frontend/src/hooks/useAppointments.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../services/appointments.api';
import { AppointmentQuery, CreateAppointmentRequest, UpdateAppointmentRequest, AppointmentStatus } from '../types/appointment.types';

export const useAppointments = (query?: AppointmentQuery) => {
  return useQuery({
    queryKey: ['appointments', query],
    queryFn: () => appointmentsApi.getAll(query),
  });
};

export const useTodayAppointments = () => {
  return useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentsApi.getToday(),
  });
};

export const useAppointment = (id: string) => {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => appointmentsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentRequest) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentRequest }) =>
      appointmentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', variables.id] });
    },
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};
```

---

### Step 2.4: Create Main Layout
Create `packages/frontend/src/components/layout/MainLayout.tsx`:

```typescript
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui/button';

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary-600">MedRecord AI</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Dr. {user?.firstName} {user?.lastName}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/patients"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              Pacientes
            </NavLink>
            <NavLink
              to="/appointments"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              Citas
            </NavLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
```

---

### Step 2.5: Update Router
Update `packages/frontend/src/router/index.tsx`:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PatientsListPage } from '../pages/patients/PatientsListPage';
import { PatientDetailPage } from '../pages/patients/PatientDetailPage';
import { NewPatientPage } from '../pages/patients/NewPatientPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'patients',
        element: <PatientsListPage />,
      },
      {
        path: 'patients/new',
        element: <NewPatientPage />,
      },
      {
        path: 'patients/:id',
        element: <PatientDetailPage />,
      },
      {
        path: 'appointments',
        element: <div>Appointments page - to be implemented</div>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
```

---

## Testing & Verification

### Run Frontend Tests
```bash
cd packages/frontend
pnpm test
```

### Start Services
```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend
cd packages/frontend && pnpm dev
```

### Manual Verification Checklist

**Patients:**
- [ ] View patients list at /patients
- [ ] Search patients by name
- [ ] Pagination works
- [ ] Create new patient at /patients/new
- [ ] View patient detail at /patients/:id
- [ ] Edit patient (if implemented)
- [ ] Delete patient

**Navigation:**
- [ ] Sidebar navigation works
- [ ] Active state shows correctly
- [ ] Logout works

### TypeScript Check
```bash
cd packages/frontend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

**Patients Frontend:**
- [ ] Patient types defined
- [ ] Patient API service created
- [ ] Patient hooks with React Query
- [ ] Patients list with search/pagination
- [ ] New patient form with validation
- [ ] Patient detail page

**Appointments Frontend:**
- [ ] Appointment types defined
- [ ] Appointment API service created
- [ ] Appointment hooks

**Layout:**
- [ ] Main layout with sidebar navigation
- [ ] Router updated with all routes
- [ ] Protected routes working

**General:**
- [ ] TypeScript compiles without errors
- [ ] Manual testing passes

---

## Commit (Only After ALL Tests Pass)

```bash
git add .
git commit -m "feat: implement patient and appointment management (TICKET-004 to TICKET-007)

Backend:
- Add patient validator with Zod schemas
- Add patient service with CRUD operations
- Add patient controller with error handling
- Add patient routes (GET, POST, PUT, DELETE)
- Add patient search and pagination
- Add appointment validator and service
- Add appointment controller with status workflow
- Add appointment routes including /today
- Add comprehensive tests for all endpoints

Frontend:
- Create patient types and API service
- Create usePatients hooks with React Query
- Create PatientsListPage with search/pagination
- Create PatientDetailPage with medical info
- Create NewPatientPage form with validation
- Create appointment types and API service
- Create useAppointments hooks
- Create MainLayout with navigation
- Update router with all new routes

TICKET-004, TICKET-005, TICKET-006, TICKET-007"
```

---

## Next Prompt
Proceed to `17a-implement-ticket-008-medical-records-backend.md` for medical records backend implementation.
