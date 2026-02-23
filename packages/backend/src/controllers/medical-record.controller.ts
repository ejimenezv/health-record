import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { medicalRecordService } from '../services/medical-record.service.js';
import { vitalSignsService } from '../services/vital-signs.service.js';
import {
  medicalRecordSchema,
  medicalRecordPatchSchema,
  symptomSchema,
  symptomUpdateSchema,
  prescriptionSchema,
  prescriptionUpdateSchema,
  vitalSignsSchema,
  batchSymptomsSchema,
  batchPrescriptionsSchema,
} from '../validators/medical-record.validator.js';

export class MedicalRecordController {
  // ============ MEDICAL RECORD ============

  async getRecord(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const record = await medicalRecordService.findByAppointmentId(appointmentId, req.userId!);

      res.json({
        success: true,
        data: record,
        message: record ? 'Success' : 'No medical record exists for this appointment',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al obtener expediente';
      const statusCode = message === 'Cita no encontrada' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  async updateRecord(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = medicalRecordSchema.parse(req.body);

      const record = await medicalRecordService.update(appointmentId, req.userId!, validatedData);

      res.json({
        success: true,
        data: record,
        message: 'Medical record saved',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al actualizar expediente';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  async patchRecord(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = medicalRecordPatchSchema.parse(req.body);

      const record = await medicalRecordService.patch(appointmentId, req.userId!, validatedData);

      res.json({
        success: true,
        data: record,
        message: 'Medical record updated',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al actualizar expediente';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  async completeRecord(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const record = await medicalRecordService.complete(appointmentId, req.userId!);

      res.json({
        success: true,
        data: record,
        message: 'Medical record completed',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al completar expediente';

      if (message === 'Cita no encontrada') {
        return res.status(404).json({ success: false, message });
      }

      if (message === 'El diagnóstico es requerido para completar el expediente') {
        return res.status(422).json({
          success: false,
          message: 'Cannot complete record without diagnosis',
          errors: [{ field: 'diagnosis', message: 'Diagnosis is required to complete the record' }],
        });
      }

      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  // ============ SYMPTOMS ============

  async addSymptom(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = symptomSchema.parse(req.body);

      const symptom = await medicalRecordService.addSymptom(appointmentId, req.userId!, validatedData);

      res.status(201).json({
        success: true,
        data: symptom,
        message: 'Symptom added',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al agregar síntoma';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  async updateSymptom(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const symptomId = req.params.symptomId as string;
      const validatedData = symptomUpdateSchema.parse(req.body);

      const symptom = await medicalRecordService.updateSymptom(appointmentId, req.userId!, symptomId, validatedData);

      res.json({
        success: true,
        data: symptom,
        message: 'Symptom updated',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Síntoma no encontrado';
      res.status(404).json({
        success: false,
        message,
      });
    }
  }

  async removeSymptom(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const symptomId = req.params.symptomId as string;
      await medicalRecordService.removeSymptom(appointmentId, req.userId!, symptomId);

      res.status(204).send();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Síntoma no encontrado';
      res.status(404).json({
        success: false,
        message,
      });
    }
  }

  async batchAddSymptoms(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = batchSymptomsSchema.parse(req.body);

      const result = await medicalRecordService.batchAddSymptoms(appointmentId, req.userId!, validatedData.symptoms);

      // Fetch the created symptoms
      const record = await medicalRecordService.findByAppointmentId(appointmentId, req.userId!);

      res.status(201).json({
        success: true,
        data: {
          added: result.count,
          symptoms: record?.symptoms ?? [],
        },
        message: 'Symptoms added',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al agregar síntomas';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  // ============ PRESCRIPTIONS ============

  async addPrescription(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = prescriptionSchema.parse(req.body);

      const prescription = await medicalRecordService.addPrescription(appointmentId, req.userId!, validatedData);

      res.status(201).json({
        success: true,
        data: prescription,
        message: 'Prescription added',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al agregar receta';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  async updatePrescription(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const prescriptionId = req.params.prescriptionId as string;
      const validatedData = prescriptionUpdateSchema.parse(req.body);

      const prescription = await medicalRecordService.updatePrescription(
        appointmentId,
        req.userId!,
        prescriptionId,
        validatedData
      );

      res.json({
        success: true,
        data: prescription,
        message: 'Prescription updated',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Receta no encontrada';
      res.status(404).json({
        success: false,
        message,
      });
    }
  }

  async removePrescription(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const prescriptionId = req.params.prescriptionId as string;
      await medicalRecordService.removePrescription(appointmentId, req.userId!, prescriptionId);

      res.status(204).send();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Receta no encontrada';
      res.status(404).json({
        success: false,
        message,
      });
    }
  }

  async batchAddPrescriptions(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = batchPrescriptionsSchema.parse(req.body);

      const result = await medicalRecordService.batchAddPrescriptions(
        appointmentId,
        req.userId!,
        validatedData.prescriptions
      );

      // Fetch the created prescriptions
      const record = await medicalRecordService.findByAppointmentId(appointmentId, req.userId!);

      res.status(201).json({
        success: true,
        data: {
          added: result.count,
          prescriptions: record?.prescriptions ?? [],
        },
        message: 'Prescriptions added',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al agregar recetas';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  // ============ VITAL SIGNS ============

  async getVitalSigns(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const vitalSigns = await vitalSignsService.findByAppointmentId(appointmentId, req.userId!);

      res.json({
        success: true,
        data: vitalSigns,
        message: vitalSigns ? 'Success' : 'No vital signs recorded',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al obtener signos vitales';
      const statusCode = message === 'Cita no encontrada' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  async updateVitalSigns(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const validatedData = vitalSignsSchema.parse(req.body);

      const vitalSigns = await vitalSignsService.update(appointmentId, req.userId!, validatedData);

      res.json({
        success: true,
        data: vitalSigns,
        message: 'Vital signs saved',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Error al guardar signos vitales';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  // ============ AI SUGGESTIONS ============

  async clearAISuggestions(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const result = await medicalRecordService.clearAISuggestions(appointmentId, req.userId!);

      res.json({
        success: true,
        data: result,
        message: 'AI suggestions cleared',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al limpiar sugerencias de IA';
      const statusCode = message === 'Cita no encontrada' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }
}

export const medicalRecordController = new MedicalRecordController();
