import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientDetailPage } from '../../../src/pages/patients/PatientDetailPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockDeleteMutateAsync = vi.fn();
const mockCreateAllergyAsync = vi.fn();
const mockDeleteAllergyAsync = vi.fn();
const mockCreateConditionAsync = vi.fn();
const mockDeleteConditionAsync = vi.fn();

vi.mock('../../../src/hooks/usePatients', () => ({
  usePatient: vi.fn(),
  useDeletePatient: vi.fn(() => ({
    mutateAsync: mockDeleteMutateAsync,
  })),
}));

vi.mock('../../../src/hooks/useAllergies', () => ({
  usePatientAllergies: vi.fn(() => ({
    data: [],
  })),
  useCreateAllergy: vi.fn(() => ({
    mutateAsync: mockCreateAllergyAsync,
    isPending: false,
  })),
  useDeleteAllergy: vi.fn(() => ({
    mutateAsync: mockDeleteAllergyAsync,
  })),
}));

vi.mock('../../../src/hooks/useChronicConditions', () => ({
  usePatientChronicConditions: vi.fn(() => ({
    data: [],
  })),
  useCreateChronicCondition: vi.fn(() => ({
    mutateAsync: mockCreateConditionAsync,
    isPending: false,
  })),
  useDeleteChronicCondition: vi.fn(() => ({
    mutateAsync: mockDeleteConditionAsync,
  })),
}));

import { usePatient } from '../../../src/hooks/usePatients';
import { usePatientAllergies } from '../../../src/hooks/useAllergies';
import { usePatientChronicConditions } from '../../../src/hooks/useChronicConditions';

const mockPatient = {
  id: '1',
  firstName: 'Juan',
  lastName: 'Perez',
  dateOfBirth: '1990-01-15',
  sex: 'male',
  email: 'juan@test.com',
  phone: '555-1234',
  address: 'Calle Principal 123',
  bloodType: 'O+',
  emergencyContactName: 'Maria Perez',
  emergencyContactPhone: '555-5678',
  emergencyContactRelationship: 'Madre',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  appointments: [
    {
      id: 'apt-1',
      appointmentDate: '2024-01-10T10:00:00Z',
      status: 'completed',
      medicalRecord: { id: 'mr-1' },
    },
  ],
};

const mockAllergies = [
  {
    id: 'allergy-1',
    patientId: '1',
    allergen: 'Penicilina',
    reaction: 'Urticaria',
    severity: 'moderate' as const,
    onsetDate: null,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockChronicConditions = [
  {
    id: 'condition-1',
    patientId: '1',
    conditionName: 'Diabetes',
    diagnosisDate: null,
    status: 'active' as const,
    notes: 'Tipo 2',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/patients/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/patients/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('should display patient information', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText(/anos/)).toBeInTheDocument();
  });

  it('should display contact information', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Informacion de Contacto')).toBeInTheDocument();
    expect(screen.getByText('juan@test.com')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('Calle Principal 123')).toBeInTheDocument();
  });

  it('should display medical information', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Informacion Medica')).toBeInTheDocument();
    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('Masculino')).toBeInTheDocument();
  });

  it('should display allergies when present', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    vi.mocked(usePatientAllergies).mockReturnValue({
      data: mockAllergies,
    } as ReturnType<typeof usePatientAllergies>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Alergias')).toBeInTheDocument();
    expect(screen.getByText('Penicilina')).toBeInTheDocument();
  });

  it('should display chronic conditions when present', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    vi.mocked(usePatientChronicConditions).mockReturnValue({
      data: mockChronicConditions,
    } as ReturnType<typeof usePatientChronicConditions>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Condiciones Cronicas')).toBeInTheDocument();
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
  });

  it('should display emergency contact', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Contacto de Emergencia')).toBeInTheDocument();
    expect(screen.getByText('Maria Perez')).toBeInTheDocument();
    expect(screen.getByText('555-5678')).toBeInTheDocument();
  });

  it('should display appointments history', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Historial de Citas')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show error state when patient not found', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Paciente no encontrado')).toBeInTheDocument();
  });

  it('should navigate to edit page on edit button click', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    const editButton = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patients/1/edit');
  });

  it('should delete patient on confirmation', async () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    mockDeleteMutateAsync.mockResolvedValue(undefined);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    // Get all delete buttons and select the first one (patient delete button in the header)
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    const patientDeleteButton = deleteButtons[0];
    fireEvent.click(patientDeleteButton);

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('1');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/patients');
  });

  it('should navigate to new appointment page', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    const newAppointmentButton = screen.getByRole('button', { name: /nueva cita/i });
    fireEvent.click(newAppointmentButton);

    expect(mockNavigate).toHaveBeenCalledWith('/appointments/new?patientId=1');
  });

  it('should display empty state for appointments when none exist', () => {
    const patientWithoutAppointments = {
      ...mockPatient,
      appointments: [],
    };

    vi.mocked(usePatient).mockReturnValue({
      data: patientWithoutAppointments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Sin citas registradas')).toBeInTheDocument();
  });

  it('should display empty state for allergies when none exist', () => {
    vi.mocked(usePatient).mockReturnValue({
      data: mockPatient,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePatient>);

    vi.mocked(usePatientAllergies).mockReturnValue({
      data: [],
    } as ReturnType<typeof usePatientAllergies>);

    render(<PatientDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Ninguna registrada')).toBeInTheDocument();
  });
});
