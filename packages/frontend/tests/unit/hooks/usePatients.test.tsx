import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients, usePatient, useCreatePatient, useDeletePatient } from '../../../src/hooks/usePatients';
import { patientsApi } from '../../../src/services/patients.api';
import React from 'react';

// Mock the patients API
vi.mock('../../../src/services/patients.api', () => ({
  patientsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockPatient = {
  id: '1',
  firstName: 'Juan',
  lastName: 'Perez',
  dateOfBirth: '1990-01-15',
  gender: 'male' as const,
  email: 'juan@test.com',
  phone: '555-1234',
  address: null,
  bloodType: 'O+',
  allergies: null,
  chronicConditions: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockPaginatedResponse = {
  data: [mockPatient],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
};

describe('usePatients hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePatients', () => {
    it('should fetch patients successfully', async () => {
      vi.mocked(patientsApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => usePatients(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(patientsApi.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should fetch patients with search parameter', async () => {
      vi.mocked(patientsApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => usePatients({ search: 'Juan' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(patientsApi.getAll).toHaveBeenCalledWith({ search: 'Juan' });
    });

    it('should handle error state', async () => {
      vi.mocked(patientsApi.getAll).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePatients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('usePatient', () => {
    it('should fetch a single patient by id', async () => {
      vi.mocked(patientsApi.getById).mockResolvedValue(mockPatient);

      const { result } = renderHook(() => usePatient('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPatient);
      expect(patientsApi.getById).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => usePatient(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(patientsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreatePatient', () => {
    it('should create a patient successfully', async () => {
      vi.mocked(patientsApi.create).mockResolvedValue(mockPatient);

      const { result } = renderHook(() => useCreatePatient(), {
        wrapper: createWrapper(),
      });

      const newPatient = {
        firstName: 'Juan',
        lastName: 'Perez',
        dateOfBirth: '1990-01-15',
        gender: 'male' as const,
      };

      result.current.mutate(newPatient);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(patientsApi.create).toHaveBeenCalledWith(newPatient);
    });
  });

  describe('useDeletePatient', () => {
    it('should delete a patient successfully', async () => {
      vi.mocked(patientsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePatient(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(patientsApi.delete).toHaveBeenCalledWith('1');
    });
  });
});
