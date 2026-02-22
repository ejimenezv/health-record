import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  appointmentQuerySchema,
} from '../validators/appointment.validator.js';
import { ZodError } from 'zod';

export class AppointmentController {
  async findAll(req: Request, res: Response) {
    try {
      const query = appointmentQuerySchema.parse(req.query);
      const result = await appointmentService.findAll(req.userId!, query);

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
        message: 'Error al obtener citas',
      });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const appointment = await appointmentService.findById(id, req.userId!);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener cita',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      const appointment = await appointmentService.create(req.userId!, validatedData);

      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Cita creada exitosamente',
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

      const errorMessage = error instanceof Error ? error.message : 'Error al crear cita';
      const statusCode = errorMessage === 'Paciente no encontrado' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateAppointmentSchema.parse(req.body);
      const appointment = await appointmentService.update(id, req.userId!, validatedData);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        data: appointment,
        message: 'Cita actualizada exitosamente',
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

      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar cita';
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateAppointmentStatusSchema.parse(req.body);
      const appointment = await appointmentService.updateStatus(id, req.userId!, validatedData);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        data: appointment,
        message: 'Estado de cita actualizado',
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar estado';
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const deleted = await appointmentService.delete(id, req.userId!);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada',
        });
      }

      res.json({
        success: true,
        message: 'Cita eliminada exitosamente',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar cita';
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async getTodayAppointments(req: Request, res: Response) {
    try {
      const appointments = await appointmentService.getTodayAppointments(req.userId!);

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener citas de hoy',
      });
    }
  }
}

export const appointmentController = new AppointmentController();
