import { Request, Response } from 'express';
import { chronicConditionService } from '../services/chronicCondition.service.js';
import { createChronicConditionSchema, updateChronicConditionSchema } from '../validators/chronicCondition.validator.js';
import { ZodError } from 'zod';

export class ChronicConditionController {
  async getByPatient(req: Request, res: Response) {
    try {
      const patientId = req.params.patientId as string;
      const providerId = req.userId!;

      const conditions = await chronicConditionService.findByPatientId(patientId, providerId);
      res.json(conditions);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener condiciones crónicas',
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const providerId = req.userId!;

      const condition = await chronicConditionService.findById(id, providerId);
      if (!condition) {
        return res.status(404).json({ error: 'Condición crónica no encontrada' });
      }

      res.json(condition);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener condición crónica',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const patientId = req.params.patientId as string;
      const providerId = req.userId!;

      const validatedData = createChronicConditionSchema.parse(req.body);
      const condition = await chronicConditionService.create(patientId, providerId, validatedData);

      if (!condition) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.status(201).json(condition);
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
        message: 'Error al crear condición crónica',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const providerId = req.userId!;

      const validatedData = updateChronicConditionSchema.parse(req.body);
      const condition = await chronicConditionService.update(id, providerId, validatedData);

      if (!condition) {
        return res.status(404).json({ error: 'Condición crónica no encontrada' });
      }

      res.json(condition);
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
        message: 'Error al actualizar condición crónica',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const providerId = req.userId!;

      const deleted = await chronicConditionService.delete(id, providerId);
      if (!deleted) {
        return res.status(404).json({ error: 'Condición crónica no encontrada' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar condición crónica',
      });
    }
  }
}

export const chronicConditionController = new ChronicConditionController();
