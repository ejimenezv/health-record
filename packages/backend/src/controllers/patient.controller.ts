import { Request, Response } from 'express';
import { patientService } from '../services/patient.service.js';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
} from '../validators/patient.validator.js';
import { ZodError } from 'zod';

export class PatientController {
  async findAll(req: Request, res: Response) {
    try {
      const query = patientQuerySchema.parse(req.query);
      const result = await patientService.findAll(req.userId!, query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al obtener pacientes',
      });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const patient = await patientService.findById(id, req.userId!);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
        });
      }

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener paciente',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const validatedData = createPatientSchema.parse(req.body);
      const patient = await patientService.create(req.userId!, validatedData);

      res.status(201).json({
        success: true,
        data: patient,
        message: 'Paciente creado exitosamente',
      });
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

      const errorMessage = error instanceof Error ? error.message : 'Error al crear paciente';
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updatePatientSchema.parse(req.body);
      const patient = await patientService.update(id, req.userId!, validatedData);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
        });
      }

      res.json({
        success: true,
        data: patient,
        message: 'Paciente actualizado exitosamente',
      });
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

      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar paciente';
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const deleted = await patientService.delete(id, req.userId!);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
        });
      }

      res.json({
        success: true,
        message: 'Paciente eliminado exitosamente',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar paciente',
      });
    }
  }

  async getAppointments(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const appointments = await patientService.getAppointments(id, req.userId!);

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener citas del paciente',
      });
    }
  }
}

export const patientController = new PatientController();
