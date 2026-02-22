import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentTypeBadge, getAppointmentTypeLabel } from '../../../../src/components/appointments/AppointmentTypeBadge';

describe('AppointmentTypeBadge', () => {
  it('should render new_patient type', () => {
    render(<AppointmentTypeBadge type="new_patient" />);
    expect(screen.getByText('Nuevo Paciente')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Paciente')).toHaveClass('bg-purple-100');
  });

  it('should render follow_up type', () => {
    render(<AppointmentTypeBadge type="follow_up" />);
    expect(screen.getByText('Seguimiento')).toBeInTheDocument();
    expect(screen.getByText('Seguimiento')).toHaveClass('bg-blue-100');
  });

  it('should render routine_checkup type', () => {
    render(<AppointmentTypeBadge type="routine_checkup" />);
    expect(screen.getByText('Chequeo Rutina')).toBeInTheDocument();
    expect(screen.getByText('Chequeo Rutina')).toHaveClass('bg-green-100');
  });

  it('should render sick_visit type', () => {
    render(<AppointmentTypeBadge type="sick_visit" />);
    expect(screen.getByText('Consulta Enfermedad')).toBeInTheDocument();
    expect(screen.getByText('Consulta Enfermedad')).toHaveClass('bg-orange-100');
  });

  it('should render telehealth type', () => {
    render(<AppointmentTypeBadge type="telehealth" />);
    expect(screen.getByText('Telemedicina')).toBeInTheDocument();
    expect(screen.getByText('Telemedicina')).toHaveClass('bg-cyan-100');
  });

  it('should apply custom className', () => {
    render(<AppointmentTypeBadge type="follow_up" className="custom-class" />);
    expect(screen.getByText('Seguimiento')).toHaveClass('custom-class');
  });
});

describe('getAppointmentTypeLabel', () => {
  it('should return correct labels', () => {
    expect(getAppointmentTypeLabel('new_patient')).toBe('Nuevo Paciente');
    expect(getAppointmentTypeLabel('follow_up')).toBe('Seguimiento');
    expect(getAppointmentTypeLabel('routine_checkup')).toBe('Chequeo Rutina');
    expect(getAppointmentTypeLabel('sick_visit')).toBe('Consulta Enfermedad');
    expect(getAppointmentTypeLabel('telehealth')).toBe('Telemedicina');
  });
});
