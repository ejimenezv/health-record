import { Provider } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';

export type SafeProvider = Omit<Provider, 'passwordHash'>;

export interface AuthResponse {
  user: SafeProvider;
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingProvider = await prisma.provider.findUnique({
      where: { email: input.email },
    });

    if (existingProvider) {
      throw new Error('El email ya está registrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create provider
    const provider = await prisma.provider.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber,
      },
    });

    // Generate token
    const token = generateToken({ userId: provider.id, email: provider.email });

    // Return provider without password
    const { passwordHash: _, ...safeProvider } = provider;
    return { user: safeProvider, token };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Find provider
    const provider = await prisma.provider.findUnique({
      where: { email: input.email },
    });

    if (!provider) {
      throw new Error('Credenciales inválidas');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, provider.passwordHash);

    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generate token
    const token = generateToken({ userId: provider.id, email: provider.email });

    // Return provider without password
    const { passwordHash: _, ...safeProvider } = provider;
    return { user: safeProvider, token };
  }

  async getUser(userId: string): Promise<SafeProvider | null> {
    const provider = await prisma.provider.findUnique({
      where: { id: userId },
    });

    if (!provider) return null;

    const { passwordHash: _, ...safeProvider } = provider;
    return safeProvider;
  }
}

export const authService = new AuthService();
