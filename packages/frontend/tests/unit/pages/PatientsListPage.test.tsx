import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientsListPage } from '../../../src/pages/patients/PatientsListPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/hooks/usePatients', () => ({
  usePatients: vi.fn(),
}));

import { usePatients } from '../../../src/hooks/usePatients';

const mockPatient = {
  id: '1',
  firstName: 'Juan',
  lastName: 'Perez',
  dateOfBirth: '1990-01-15',
  sex: 'male',
  email: 'juan@test.com',
  phone: '555-1234',
  _count: { appointments: 3 },
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

describe('PatientsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render patient list', async () => {
    vi.mocked(usePatients).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('3 citas')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show empty state when no patients', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('No hay pacientes registrados')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Error al cargar pacientes')).toBeInTheDocument();
  });

  it('should navigate to new patient page on button click', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    const newPatientButton = screen.getByText('Nuevo Paciente');
    fireEvent.click(newPatientButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patients/new');
  });

  it('should navigate to patient detail on card click', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    const patientCard = screen.getByText('Juan Perez').closest('div[class*="cursor-pointer"]');
    if (patientCard) {
      fireEvent.click(patientCard);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/patients/1');
  });

  it('should have search input', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should filter patients when typing in search', async () => {
    vi.mocked(usePatients).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    await waitFor(() => {
      expect(usePatients).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Juan' })
      );
    });
  });

  it('should display pagination when multiple pages', () => {
    vi.mocked(usePatients).mockReturnValue({
      data: {
        data: [mockPatient],
        pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
    expect(screen.getByText(/Pagina 1 de 3/i)).toBeInTheDocument();
  });

  it('should calculate age correctly', () => {
    const patientWithBirthDate = {
      ...mockPatient,
      dateOfBirth: '1990-01-15',
    };

    vi.mocked(usePatients).mockReturnValue({
      data: { data: [patientWithBirthDate], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatients>);

    render(<PatientsListPage />, { wrapper: createWrapper() });

    // Should display age (will vary based on current date)
    expect(screen.getByText(/anos - Masculino/)).toBeInTheDocument();
  });
});
