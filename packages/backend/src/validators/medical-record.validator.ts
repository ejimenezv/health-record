import { z } from 'zod';

// ============ MEDICAL RECORD SCHEMAS ============

export const medicalRecordSchema = z.object({
  chiefComplaint: z.string().max(500).optional().nullable(),
  historyOfPresentIllness: z.string().max(5000).optional().nullable(),
  physicalExamNotes: z.string().max(5000).optional().nullable(),
  diagnosis: z.string().max(500).optional().nullable(),
  diagnosisNotes: z.string().max(2000).optional().nullable(),
  treatmentPlan: z.string().max(5000).optional().nullable(),
  followUpInstructions: z.string().max(2000).optional().nullable(),
  patientEducation: z.string().max(2000).optional().nullable(),
  isAIGenerated: z.boolean().optional().default(false),
  isDraft: z.boolean().optional().default(true),
});

export const medicalRecordPatchSchema = medicalRecordSchema.partial();

// ============ SYMPTOM SCHEMAS ============

export const symptomSchema = z.object({
  symptomName: z.string().min(2, 'El nombre del síntoma debe tener al menos 2 caracteres').max(200),
  bodySite: z.string().max(100).optional().nullable(),
  severity: z.coerce.number().int().min(1).max(10).optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isAIExtracted: z.boolean().optional().default(false),
});

export const symptomUpdateSchema = symptomSchema.partial();

export const batchSymptomsSchema = z.object({
  symptoms: z.array(symptomSchema).min(1).max(20),
});

// ============ PRESCRIPTION SCHEMAS ============

export const prescriptionSchema = z.object({
  medicationName: z.string().min(2, 'El nombre del medicamento es requerido').max(200),
  strength: z.string().max(50).optional().nullable(),
  dosage: z.string().min(1, 'La dosis es requerida').max(100),
  frequency: z.string().min(1, 'La frecuencia es requerida').max(100),
  duration: z.string().max(50).optional().nullable(),
  quantity: z.coerce.number().int().positive().optional().nullable(),
  refills: z.coerce.number().int().min(0).max(12).optional().default(0),
  instructions: z.string().max(1000).optional().nullable(),
  indication: z.string().max(200).optional().nullable(),
  isAIExtracted: z.boolean().optional().default(false),
});

export const prescriptionUpdateSchema = prescriptionSchema.partial();

export const batchPrescriptionsSchema = z.object({
  prescriptions: z.array(prescriptionSchema).min(1).max(20),
});

// ============ VITAL SIGNS SCHEMAS ============

export const vitalSignsSchema = z.object({
  bloodPressureSystolic: z.coerce.number().int().min(50).max(300).optional().nullable(),
  bloodPressureDiastolic: z.coerce.number().int().min(30).max(200).optional().nullable(),
  heartRate: z.coerce.number().int().min(30).max(250).optional().nullable(),
  temperature: z.coerce.number().min(30).max(45).optional().nullable(),
  respiratoryRate: z.coerce.number().int().min(5).max(60).optional().nullable(),
  oxygenSaturation: z.coerce.number().int().min(50).max(100).optional().nullable(),
  weight: z.coerce.number().min(0.5).max(500).optional().nullable(),
  height: z.coerce.number().min(20).max(300).optional().nullable(),
  painLevel: z.coerce.number().int().min(0).max(10).optional().nullable(),
});

// ============ TYPE EXPORTS ============

export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
export type MedicalRecordPatchInput = z.infer<typeof medicalRecordPatchSchema>;
export type SymptomInput = z.infer<typeof symptomSchema>;
export type SymptomUpdateInput = z.infer<typeof symptomUpdateSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type PrescriptionUpdateInput = z.infer<typeof prescriptionUpdateSchema>;
export type VitalSignsInput = z.infer<typeof vitalSignsSchema>;
export type BatchSymptomsInput = z.infer<typeof batchSymptomsSchema>;
export type BatchPrescriptionsInput = z.infer<typeof batchPrescriptionsSchema>;
