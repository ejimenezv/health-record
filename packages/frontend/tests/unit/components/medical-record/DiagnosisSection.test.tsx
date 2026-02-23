import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiagnosisSection } from '../../../../src/components/medical-record/DiagnosisSection';

describe('DiagnosisSection', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no diagnosis', () => {
    render(<DiagnosisSection onUpdate={mockOnUpdate} />);

    expect(screen.getByText('No hay diagnostico registrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar Diagnostico/i })).toBeInTheDocument();
  });

  it('should render existing diagnosis', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        diagnosisNotes="Paciente con historial familiar"
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Migrania sin aura')).toBeInTheDocument();
    expect(screen.getByText('Paciente con historial familiar')).toBeInTheDocument();
  });

  it('should display AI badge when isAIGenerated is true', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        isAIGenerated={true}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('IA')).toBeInTheDocument();
  });

  it('should not display AI badge when isAIGenerated is false', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        isAIGenerated={false}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.queryByText('IA')).not.toBeInTheDocument();
  });

  it('should show edit button when diagnosis exists', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByRole('button', { name: /Editar/i })).toBeInTheDocument();
  });

  it('should show edit form when clicking "Agregar Diagnostico" button', () => {
    render(<DiagnosisSection onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Agregar Diagnostico/i }));

    expect(screen.getByPlaceholderText('Ingrese el diagnostico...')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Notas adicionales sobre el diagnostico...')
    ).toBeInTheDocument();
  });

  it('should show edit form when clicking edit button', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        diagnosisNotes="Notas existentes"
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));

    expect(screen.getByDisplayValue('Migrania sin aura')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Notas existentes')).toBeInTheDocument();
  });

  it('should call onUpdate when saving new diagnosis', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(<DiagnosisSection onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Agregar Diagnostico/i }));

    fireEvent.change(screen.getByPlaceholderText('Ingrese el diagnostico...'), {
      target: { value: 'Cefalea tensional' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Notas adicionales sobre el diagnostico...'),
      { target: { value: 'Causada por estres' } }
    );

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        diagnosis: 'Cefalea tensional',
        diagnosisNotes: 'Causada por estres',
      });
    });
  });

  it('should call onUpdate with empty values when saving without diagnosis', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(<DiagnosisSection onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Agregar Diagnostico/i }));

    // Save without entering diagnosis - component allows this
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        diagnosis: '',
        diagnosisNotes: '',
      });
    });
  });

  it('should cancel editing when clicking cancel', () => {
    render(<DiagnosisSection onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Agregar Diagnostico/i }));
    expect(screen.getByPlaceholderText('Ingrese el diagnostico...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByPlaceholderText('Ingrese el diagnostico...')).not.toBeInTheDocument();
    expect(screen.getByText('No hay diagnostico registrado')).toBeInTheDocument();
  });

  it('should reset form to original values when cancelling edit', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));

    // Modify the value
    const input = screen.getByDisplayValue('Migrania sin aura');
    fireEvent.change(input, { target: { value: 'Nuevo diagnostico' } });

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    // Original value should be displayed
    expect(screen.getByText('Migrania sin aura')).toBeInTheDocument();
  });

  it('should disable all interactions when disabled prop is true', () => {
    render(
      <DiagnosisSection
        diagnosis="Migrania sin aura"
        onUpdate={mockOnUpdate}
        disabled={true}
      />
    );

    // Edit button should not be visible
    expect(screen.queryByRole('button', { name: /Editar/i })).not.toBeInTheDocument();
  });

  it('should not show add button when disabled and no diagnosis', () => {
    render(
      <DiagnosisSection
        onUpdate={mockOnUpdate}
        disabled={true}
      />
    );

    expect(screen.queryByRole('button', { name: /Agregar Diagnostico/i })).not.toBeInTheDocument();
  });

  it('should update form when props change', () => {
    const { rerender } = render(
      <DiagnosisSection
        diagnosis="Diagnostico inicial"
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Diagnostico inicial')).toBeInTheDocument();

    // Update props
    rerender(
      <DiagnosisSection
        diagnosis="Diagnostico actualizado"
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Diagnostico actualizado')).toBeInTheDocument();
  });
});
