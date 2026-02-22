import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppointments, useTodayAppointments, useAppointment, useCreateAppointment, useUpdateAppointmentStatus } from '../../../src/hooks/useAppointments';
import { appointmentsApi } from '../../../src/services/appointments.api';
import React from 'react';

// Mock the appointments API
vi.mock('../../../src/services/appointments.api', () => ({
  appointmentsApi: {
    getAll: vi.fn(),
    getToday: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
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

const mockAppointment = {
  id: '1',
  patientId: 'patient-1',
  scheduledAt: '2024-01-15T10:00:00Z',
  startedAt: null,
  endedAt: null,
  status: 'SCHEDULED' as const,
  type: 'GENERAL' as const,
  reasonForVisit: 'Consulta general',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  patient: {
    id: 'patient-1',
    firstName: 'Juan',
    lastName: 'Perez',
  },
  medicalRecord: null,
};

const mockPaginatedResponse = {
  data: [mockAppointment],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
};

describe('useAppointments hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAppointments', () => {
    it('should fetch appointments successfully', async () => {
      vi.mocked(appointmentsApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(appointmentsApi.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should fetch appointments with filters', async () => {
      vi.mocked(appointmentsApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const filters = { status: 'SCHEDULED' as const, patientId: 'patient-1' };
      const { result } = renderHook(() => useAppointments(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(appointmentsApi.getAll).toHaveBeenCalledWith(filters);
    });

    it('should handle error state', async () => {
      vi.mocked(appointmentsApi.getAll).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useTodayAppointments', () => {
    it('should fetch today appointments successfully', async () => {
      vi.mocked(appointmentsApi.getToday).mockResolvedValue([mockAppointment]);

      const { result } = renderHook(() => useTodayAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockAppointment]);
      expect(appointmentsApi.getToday).toHaveBeenCalled();
    });

    it('should return empty array when no appointments', async () => {
      vi.mocked(appointmentsApi.getToday).mockResolvedValue([]);

      const { result } = renderHook(() => useTodayAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAppointment', () => {
    it('should fetch a single appointment by id', async () => {
      vi.mocked(appointmentsApi.getById).mockResolvedValue(mockAppointment);

      const { result } = renderHook(() => useAppointment('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAppointment);
      expect(appointmentsApi.getById).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useAppointment(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(appointmentsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAppointment', () => {
    it('should create an appointment successfully', async () => {
      vi.mocked(appointmentsApi.create).mockResolvedValue(mockAppointment);

      const { result } = renderHook(() => useCreateAppointment(), {
        wrapper: createWrapper(),
      });

      const newAppointment = {
        patientId: 'patient-1',
        scheduledAt: '2024-01-15T10:00:00Z',
        type: 'GENERAL' as const,
        reasonForVisit: 'Consulta general',
      };

      result.current.mutate(newAppointment);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(appointmentsApi.create).toHaveBeenCalledWith(newAppointment);
    });
  });

  describe('useUpdateAppointmentStatus', () => {
    it('should update appointment status successfully', async () => {
      const updatedAppointment = { ...mockAppointment, status: 'IN_PROGRESS' as const };
      vi.mocked(appointmentsApi.updateStatus).mockResolvedValue(updatedAppointment);

      const { result } = renderHook(() => useUpdateAppointmentStatus(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '1', status: 'IN_PROGRESS' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(appointmentsApi.updateStatus).toHaveBeenCalledWith('1', 'IN_PROGRESS');
    });
  });
});
