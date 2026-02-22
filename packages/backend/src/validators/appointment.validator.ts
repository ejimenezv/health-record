import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  appointmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha inválida',
  }),
  appointmentType: z.enum(['new_patient', 'follow_up', 'routine_checkup', 'sick_visit', 'telehealth'], {
    errorMap: () => ({ message: 'Tipo de cita inválido' }),
  }),
  reasonForVisit: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().min(5).max(480).default(30),
});

export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha inválida',
  }).optional(),
  appointmentType: z.enum(['new_patient', 'follow_up', 'routine_checkup', 'sick_visit', 'telehealth']).optional(),
  reasonForVisit: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().min(5).max(480).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'], {
    errorMap: () => ({ message: 'Estado inválido' }),
  }),
});

export const appointmentQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
