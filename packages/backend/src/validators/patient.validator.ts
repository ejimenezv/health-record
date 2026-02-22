import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de nacimiento inválida',
  }),
  sex: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Sexo inválido' }),
  }),
  phone: z.string().min(1, 'Teléfono requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  address: z.string().optional().nullable(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable(),
  emergencyContactName: z.string().min(1, 'Nombre de contacto de emergencia requerido'),
  emergencyContactPhone: z.string().min(1, 'Teléfono de contacto de emergencia requerido'),
  emergencyContactRelationship: z.string().optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt']).default('lastName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQuery = z.infer<typeof patientQuerySchema>;
