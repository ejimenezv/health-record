import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentDetailPage } from '../../../../src/pages/appointments/AppointmentDetailPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../src/hooks/useAppointments', () => ({
  useAppointment: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(),
  useDeleteAppointment: vi.fn(),
}));

import { useAppointment, useUpdateAppointmentStatus, useDeleteAppointment } from '../../../../src/hooks/useAppointments';

const mockAppointment = {
  id: '1',
  patientId: 'p1',
  providerId: 'pr1',
  appointmentDate: '2024-01-15T10:30:00Z',
  appointmentType: 'follow_up',
  reasonForVisit: 'Control presion arterial',
  durationMinutes: 30,
  status: 'scheduled',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z',
  patient: {
    id: 'p1',
    firstName: 'Juan',
    lastName: 'Perez',
    dateOfBirth: '1990-05-15',
    phone: '555-1234',
  },
  medicalRecord: null,
};

const mockUpdateStatusMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

const createWrapper = (appointmentId: string = '1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[`/appointments/${appointmentId}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/appointments/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AppointmentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutateAsync: mockUpdateStatusMutateAsync,
      isPending: false,
    } as ReturnType<typeof useUpdateAppointmentStatus>);

    vi.mocked(useDeleteAppointment).mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as ReturnType<typeof useDeleteAppointment>);
  });

  it('should render page title', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Detalle de Cita')).toBeInTheDocument();
  });

  it('should render patient name', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });

  it('should render reason for visit', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Control presion arterial')).toBeInTheDocument();
  });

  it('should render status badge', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Programada')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Cita no encontrada')).toBeInTheDocument();
  });

  it('should show delete button for scheduled appointment', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('should not show delete button for completed appointment', () => {
    const completedAppointment = { ...mockAppointment, status: 'completed' };
    vi.mocked(useAppointment).mockReturnValue({
      data: completedAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  });

  it('should navigate to patient profile on patient card click', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    const patientCard = screen.getByText('Ver perfil del paciente →').closest('.cursor-pointer');
    if (patientCard) {
      fireEvent.click(patientCard);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/patients/p1');
  });

  it('should navigate to appointments list on back button', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Volver'));

    expect(mockNavigate).toHaveBeenCalledWith('/appointments');
  });

  it('should delete appointment on confirm', async () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteMutateAsync.mockResolvedValue(undefined);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('1');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/appointments');
  });

  it('should show status change dropdown for scheduled appointment', () => {
    vi.mocked(useAppointment).mockReturnValue({
      data: mockAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Cambiar Estado')).toBeInTheDocument();
  });

  it('should not show status change dropdown for completed appointment', () => {
    const completedAppointment = { ...mockAppointment, status: 'completed' };
    vi.mocked(useAppointment).mockReturnValue({
      data: completedAppointment,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointment>);

    render(<AppointmentDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByText('Cambiar Estado')).not.toBeInTheDocument();
  });
});
