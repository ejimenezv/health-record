import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { ZodError } from 'zod';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registro exitoso',
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

      const errorMessage = error instanceof Error ? error.message : 'Error en el registro';
      const statusCode = errorMessage === 'El email ya está registrado' ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);

      res.json({
        success: true,
        data: result,
        message: 'Login exitoso',
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

      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const user = await authService.getUser(req.userId!);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Error del servidor',
      });
    }
  }
}

export const authController = new AuthController();
