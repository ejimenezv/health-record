import { Request, Response } from 'express';
import { allergyService } from '../services/allergy.service.js';
import { createAllergySchema, updateAllergySchema } from '../validators/allergy.validator.js';
import { ZodError } from 'zod';

export class AllergyController {
  async getByPatient(req: Request, res: Response) {
    try {
      const patientId = req.params.patientId as string;
      const providerId = req.userId!;

      const allergies = await allergyService.findByPatientId(patientId, providerId);
      res.json(allergies);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener alergias',
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const providerId = req.userId!;

      const allergy = await allergyService.findById(id, providerId);
      if (!allergy) {
        return res.status(404).json({ error: 'Alergia no encontrada' });
      }

      res.json(allergy);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener alergia',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const patientId = req.params.patientId as string;
      const providerId = req.userId!;

      const validatedData = createAllergySchema.parse(req.body);
      const allergy = await allergyService.create(patientId, providerId, validatedData);

      if (!allergy) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.status(201).json(allergy);
    } catch (error: unknown) {
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

      res.status(500).json({
        success: false,
        message: 'Error al crear alergia',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const providerId = req.userId!;

      const validatedData = updateAllergySchema.parse(req.body);
      const allergy = await allergyService.update(id, providerId, validatedData);

      if (!allergy) {
        return res.status(404).json({ error: 'Alergia no encontrada' });
      }

      res.json(allergy);
    } catch (error: unknown) {
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

      res.status(500).json({
        success: false,
        message: 'Error al actualizar alergia',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const providerId = req.userId!;

      const deleted = await allergyService.delete(id, providerId);
      if (!deleted) {
        return res.status(404).json({ error: 'Alergia no encontrada' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar alergia',
      });
    }
  }
}

export const allergyController = new AllergyController();
