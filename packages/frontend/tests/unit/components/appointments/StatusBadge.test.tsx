import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, getStatusLabel, getStatusColor } from '../../../../src/components/appointments/StatusBadge';

describe('StatusBadge', () => {
  it('should render scheduled status', () => {
    render(<StatusBadge status="scheduled" />);
    expect(screen.getByText('Programada')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toHaveClass('bg-blue-100');
  });

  it('should render checked_in status', () => {
    render(<StatusBadge status="checked_in" />);
    expect(screen.getByText('Registrado')).toBeInTheDocument();
    expect(screen.getByText('Registrado')).toHaveClass('bg-yellow-100');
  });

  it('should render in_progress status', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('En Progreso')).toBeInTheDocument();
    expect(screen.getByText('En Progreso')).toHaveClass('bg-orange-100');
  });

  it('should render completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByText('Completada')).toHaveClass('bg-green-100');
  });

  it('should render cancelled status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toHaveClass('bg-gray-100');
  });

  it('should render no_show status', () => {
    render(<StatusBadge status="no_show" />);
    expect(screen.getByText('No Asistio')).toBeInTheDocument();
    expect(screen.getByText('No Asistio')).toHaveClass('bg-red-100');
  });

  it('should apply custom className', () => {
    render(<StatusBadge status="scheduled" className="custom-class" />);
    expect(screen.getByText('Programada')).toHaveClass('custom-class');
  });
});

describe('getStatusLabel', () => {
  it('should return correct labels', () => {
    expect(getStatusLabel('scheduled')).toBe('Programada');
    expect(getStatusLabel('checked_in')).toBe('Registrado');
    expect(getStatusLabel('in_progress')).toBe('En Progreso');
    expect(getStatusLabel('completed')).toBe('Completada');
    expect(getStatusLabel('cancelled')).toBe('Cancelada');
    expect(getStatusLabel('no_show')).toBe('No Asistio');
  });
});

describe('getStatusColor', () => {
  it('should return correct colors', () => {
    expect(getStatusColor('scheduled')).toContain('bg-blue-100');
    expect(getStatusColor('checked_in')).toContain('bg-yellow-100');
    expect(getStatusColor('in_progress')).toContain('bg-orange-100');
    expect(getStatusColor('completed')).toContain('bg-green-100');
    expect(getStatusColor('cancelled')).toContain('bg-gray-100');
    expect(getStatusColor('no_show')).toContain('bg-red-100');
  });
});
