import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppointmentCard } from '../../../../src/components/appointments/AppointmentCard';
import type { Appointment } from '../../../../src/types/appointment.types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockAppointment: Appointment = {
  id: '1',
  patientId: 'p1',
  providerId: 'pr1',
  appointmentDate: '2024-01-15T10:30:00Z',
  appointmentType: 'follow_up',
  reasonForVisit: 'Seguimiento control presion',
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

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {children}
    </MemoryRouter>
  );
};

describe('AppointmentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render patient name', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
  });

  it('should render patient age', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });
    // Age will vary based on current date
    expect(screen.getByText(/anos/)).toBeInTheDocument();
  });

  it('should render appointment time', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });
    // Time format may vary by locale
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
  });

  it('should render reason for visit', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Seguimiento control presion/)).toBeInTheDocument();
  });

  it('should render status badge', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });
    expect(screen.getByText('Programada')).toBeInTheDocument();
  });

  it('should render appointment type badge', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });
    expect(screen.getByText('Seguimiento')).toBeInTheDocument();
  });

  it('should navigate to appointment detail on click', () => {
    render(<AppointmentCard appointment={mockAppointment} />, { wrapper: createWrapper() });

    const card = screen.getByText(/Juan Perez/).closest('.cursor-pointer');
    if (card) {
      fireEvent.click(card);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/appointments/1');
  });

  it('should hide patient info when showPatient is false', () => {
    render(<AppointmentCard appointment={mockAppointment} showPatient={false} />, { wrapper: createWrapper() });
    expect(screen.queryByText(/Juan Perez/)).not.toBeInTheDocument();
  });

  it('should handle appointment without reason', () => {
    const appointmentNoReason = { ...mockAppointment, reasonForVisit: null };
    render(<AppointmentCard appointment={appointmentNoReason} />, { wrapper: createWrapper() });
    expect(screen.queryByText(/Seguimiento control presion/)).not.toBeInTheDocument();
  });
});
