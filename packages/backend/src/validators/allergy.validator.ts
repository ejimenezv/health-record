import { z } from 'zod';

export const createAllergySchema = z.object({
  allergen: z.string().min(1, 'Alérgeno requerido'),
  reaction: z.string().optional().nullable(),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening']).optional().nullable(),
  onsetDate: z.string().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Fecha de inicio inválida',
  }).optional().nullable(),
});

export const updateAllergySchema = createAllergySchema.partial();

export type CreateAllergyInput = z.infer<typeof createAllergySchema>;
export type UpdateAllergyInput = z.infer<typeof updateAllergySchema>;
