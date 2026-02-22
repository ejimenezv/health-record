import { z } from 'zod';

export const createChronicConditionSchema = z.object({
  conditionName: z.string().min(1, 'Nombre de condición requerido'),
  diagnosisDate: z.string().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Fecha de diagnóstico inválida',
  }).optional().nullable(),
  status: z.enum(['active', 'resolved', 'managed']).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateChronicConditionSchema = createChronicConditionSchema.partial();

export type CreateChronicConditionInput = z.infer<typeof createChronicConditionSchema>;
export type UpdateChronicConditionInput = z.infer<typeof updateChronicConditionSchema>;
