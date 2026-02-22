import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentsListPage } from '../../../../src/pages/appointments/AppointmentsListPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../src/hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
}));

import { useAppointments } from '../../../../src/hooks/useAppointments';

const mockAppointment = {
  id: '1',
  patientId: 'p1',
  providerId: 'pr1',
  appointmentDate: '2024-01-15T10:30:00Z',
  appointmentType: 'follow_up',
  reasonForVisit: 'Control presion',
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

const mockPaginatedResponse = {
  data: [mockAppointment],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
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

describe('AppointmentsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Citas')).toBeInTheDocument();
  });

  it('should render appointment list', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should show empty state', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/No se encontraron citas/)).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Error al cargar las citas')).toBeInTheDocument();
  });

  it('should have status filter', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('should have date filters', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Desde')).toBeInTheDocument();
    expect(screen.getByText('Hasta')).toBeInTheDocument();
  });

  it('should have clear filters button', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Limpiar Filtros')).toBeInTheDocument();
  });

  it('should navigate to patients on new appointment button click', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    const newButton = screen.getByText('Nueva Cita (desde paciente)');
    fireEvent.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patients');
  });

  it('should show pagination when multiple pages', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: {
        data: [mockAppointment],
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAppointments>);

    render(<AppointmentsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
    expect(screen.getByText(/Pagina 1 de 3/)).toBeInTheDocument();
  });
});
