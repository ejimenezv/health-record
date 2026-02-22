import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewPatientPage } from '../../../src/pages/patients/NewPatientPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMutateAsync = vi.fn();

vi.mock('../../../src/hooks/usePatients', () => ({
  useCreatePatient: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

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

describe('NewPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    render(<NewPatientPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Nuevo Paciente')).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de nacimiento \*/i)).toBeInTheDocument();
    expect(screen.getByText(/sexo \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefono \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/direccion/i)).toBeInTheDocument();
    expect(screen.getByText(/tipo de sangre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contacto de emergencia \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefono de emergencia \*/i)).toBeInTheDocument();
  });

  it('should show validation errors for empty required fields', async () => {
    render(<NewPatientPage />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /crear paciente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Nombre requerido')).toBeInTheDocument();
      expect(screen.getByText('Apellido requerido')).toBeInTheDocument();
      expect(screen.getByText('Fecha de nacimiento requerida')).toBeInTheDocument();
      expect(screen.getByText('Telefono requerido')).toBeInTheDocument();
      expect(screen.getByText('Nombre de contacto de emergencia requerido')).toBeInTheDocument();
      expect(screen.getByText('Telefono de emergencia requerido')).toBeInTheDocument();
    });
  });

  it('should call createPatient mutation on valid submit', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'new-patient-id' });

    render(<NewPatientPage />, { wrapper: createWrapper() });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/nombre \*/i), {
      target: { value: 'Juan' },
    });
    fireEvent.change(screen.getByLabelText(/apellido \*/i), {
      target: { value: 'Perez' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento \*/i), {
      target: { value: '1990-01-15' },
    });
    fireEvent.change(screen.getByLabelText(/telefono \*/i), {
      target: { value: '5551234567' },
    });
    fireEvent.change(screen.getByLabelText(/contacto de emergencia \*/i), {
      target: { value: 'Maria Perez' },
    });
    fireEvent.change(screen.getByLabelText(/telefono de emergencia \*/i), {
      target: { value: '5559876543' },
    });

    const submitButton = screen.getByRole('button', { name: /crear paciente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Juan',
          lastName: 'Perez',
          dateOfBirth: '1990-01-15',
          sex: 'male',
          phone: '5551234567',
          emergencyContactName: 'Maria Perez',
          emergencyContactPhone: '5559876543',
        })
      );
    });
  });

  it('should navigate to patient detail after successful creation', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'new-patient-id' });

    render(<NewPatientPage />, { wrapper: createWrapper() });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/nombre \*/i), {
      target: { value: 'Juan' },
    });
    fireEvent.change(screen.getByLabelText(/apellido \*/i), {
      target: { value: 'Perez' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento \*/i), {
      target: { value: '1990-01-15' },
    });
    fireEvent.change(screen.getByLabelText(/telefono \*/i), {
      target: { value: '5551234567' },
    });
    fireEvent.change(screen.getByLabelText(/contacto de emergencia \*/i), {
      target: { value: 'Maria Perez' },
    });
    fireEvent.change(screen.getByLabelText(/telefono de emergencia \*/i), {
      target: { value: '5559876543' },
    });

    const submitButton = screen.getByRole('button', { name: /crear paciente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/patients/new-patient-id');
    });
  });

  it('should navigate back to patients list on cancel', () => {
    render(<NewPatientPage />, { wrapper: createWrapper() });

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patients');
  });

  it('should have email input with correct type for browser validation', () => {
    render(<NewPatientPage />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should submit form with valid email', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'new-patient-id' });

    render(<NewPatientPage />, { wrapper: createWrapper() });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/nombre \*/i), {
      target: { value: 'Juan' },
    });
    fireEvent.change(screen.getByLabelText(/apellido \*/i), {
      target: { value: 'Perez' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento \*/i), {
      target: { value: '1990-01-15' },
    });
    fireEvent.change(screen.getByLabelText(/telefono \*/i), {
      target: { value: '5551234567' },
    });
    fireEvent.change(screen.getByLabelText(/contacto de emergencia \*/i), {
      target: { value: 'Maria Perez' },
    });
    fireEvent.change(screen.getByLabelText(/telefono de emergencia \*/i), {
      target: { value: '5559876543' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'juan@example.com' },
    });

    const submitButton = screen.getByRole('button', { name: /crear paciente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'juan@example.com',
        })
      );
    });
  });
});
