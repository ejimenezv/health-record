import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../../../src/pages/dashboard/DashboardPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/hooks/useAppointments', () => ({
  useTodayAppointments: vi.fn(),
}));

vi.mock('../../../src/hooks/usePatients', () => ({
  usePatients: vi.fn(),
}));

import { useTodayAppointments } from '../../../src/hooks/useAppointments';
import { usePatients } from '../../../src/hooks/usePatients';

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  providerId: 'provider-1',
  appointmentDate: '2024-01-15T10:00:00Z',
  appointmentType: 'follow_up',
  status: 'scheduled',
  reasonForVisit: 'Consulta general',
  durationMinutes: 30,
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z',
  patient: {
    id: 'patient-1',
    firstName: 'Juan',
    lastName: 'Perez',
    dateOfBirth: '1990-05-15',
    phone: '555-1234',
  },
  medicalRecord: null,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display dashboard title', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should show patient count', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 15, totalPages: 15 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Total registrados')).toBeInTheDocument();
  });

  it('should show today appointments count', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [mockAppointment, { ...mockAppointment, id: 'apt-2' }],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Citas Hoy')).toBeInTheDocument();
  });

  it('should display today appointments list', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [mockAppointment],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
  });

  it('should show empty state when no appointments today', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('No hay citas programadas para hoy')).toBeInTheDocument();
  });

  it('should show loading state for appointments', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should have quick action buttons', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Acciones Rapidas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nuevo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva cita/i })).toBeInTheDocument();
  });

  it('should navigate to new patient on quick action click', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    const newPatientButton = screen.getByRole('button', { name: /nuevo paciente/i });
    fireEvent.click(newPatientButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patients/new');
  });

  it('should navigate to patients on new appointment click', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    const newAppointmentButton = screen.getByRole('button', { name: /nueva cita/i });
    fireEvent.click(newAppointmentButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patients');
  });

  it('should navigate to appointment detail on appointment click', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [mockAppointment],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    const appointmentCard = screen.getByText(/Juan Perez/).closest('div[class*="cursor-pointer"]');
    if (appointmentCard) {
      fireEvent.click(appointmentCard);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/appointments/apt-1');
  });

  it('should navigate to all appointments on view all click', () => {
    vi.mocked(useTodayAppointments).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useTodayAppointments>);

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePatients>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    const viewAllButton = screen.getByRole('button', { name: /ver todas/i });
    fireEvent.click(viewAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('/appointments');
  });
});
