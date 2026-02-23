import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrescriptionsSection } from '../../../../src/components/medical-record/PrescriptionsSection';
import type { Prescription } from '../../../../src/types/medical-records.types';

const mockPrescriptions: Prescription[] = [
  {
    id: '1',
    medicationName: 'Ibuprofeno',
    strength: '400mg',
    dosage: '1 tableta',
    frequency: 'Cada 8 horas',
    duration: '5 dias',
    quantity: 15,
    refills: 0,
    instructions: 'Tomar con alimentos',
    indication: 'Dolor de cabeza',
    isAIExtracted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    medicationName: 'Paracetamol',
    strength: '500mg',
    dosage: '2 tabletas',
    frequency: 'Cada 6 horas',
    duration: '3 dias',
    quantity: null,
    refills: 2,
    instructions: 'No exceder 4g al dia',
    indication: null,
    isAIExtracted: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('PrescriptionsSection', () => {
  const mockOnAdd = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no prescriptions', () => {
    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('No hay recetas registradas')).toBeInTheDocument();
  });

  it('should render list of prescriptions', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Ibuprofeno.*400mg/)).toBeInTheDocument();
    expect(screen.getByText(/Paracetamol.*500mg/)).toBeInTheDocument();
  });

  it('should display dosage and frequency', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/1 tableta - Cada 8 horas/)).toBeInTheDocument();
    expect(screen.getByText(/2 tabletas - Cada 6 horas/)).toBeInTheDocument();
  });

  it('should display duration when present', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/por 5 dias/)).toBeInTheDocument();
  });

  it('should display instructions', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Tomar con alimentos')).toBeInTheDocument();
    expect(screen.getByText('No exceder 4g al dia')).toBeInTheDocument();
  });

  it('should display indication when present', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Indicacion: Dolor de cabeza/)).toBeInTheDocument();
  });

  it('should display AI badge for AI-extracted prescriptions', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Should have one AI badge (for Paracetamol)
    const aiBadges = screen.getAllByText('IA');
    expect(aiBadges).toHaveLength(1);
  });

  it('should display quantity and refills when present', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Cantidad: 15/)).toBeInTheDocument();
    expect(screen.getByText(/Refills: 2/)).toBeInTheDocument();
  });

  it('should show add form when clicking "Agregar" button', () => {
    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    expect(screen.getByPlaceholderText('Medicamento *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Dosis * (ej: 1 tableta)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Frecuencia * (ej: Cada 8 horas)')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Instrucciones * (ej: Tomar con alimentos)')
    ).toBeInTheDocument();
  });

  it('should call onAdd when saving new prescription with required fields', async () => {
    mockOnAdd.mockResolvedValue(undefined);

    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    fireEvent.change(screen.getByPlaceholderText('Medicamento *'), {
      target: { value: 'Amoxicilina' },
    });
    fireEvent.change(screen.getByPlaceholderText('Dosis * (ej: 1 tableta)'), {
      target: { value: '1 capsula' },
    });
    fireEvent.change(screen.getByPlaceholderText('Frecuencia * (ej: Cada 8 horas)'), {
      target: { value: 'Cada 8 horas' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Instrucciones * (ej: Tomar con alimentos)'),
      { target: { value: 'Completar el tratamiento' } }
    );

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationName: 'Amoxicilina',
          dosage: '1 capsula',
          frequency: 'Cada 8 horas',
          instructions: 'Completar el tratamiento',
        })
      );
    });
  });

  it('should not call onAdd when required fields are empty', () => {
    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    // Only fill medication name, leave others empty
    fireEvent.change(screen.getByPlaceholderText('Medicamento *'), {
      target: { value: 'Amoxicilina' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should cancel adding when clicking cancel', () => {
    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));
    expect(screen.getByPlaceholderText('Medicamento *')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByPlaceholderText('Medicamento *')).not.toBeInTheDocument();
  });

  it('should call onDelete when clicking delete button', () => {
    mockOnDelete.mockResolvedValue(undefined);

    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Find all icon buttons (size="icon" buttons are the edit and delete buttons)
    // Each prescription has 2 icon buttons: edit and delete. Delete is the second one.
    const allButtons = screen.getAllByRole('button');
    const iconButtons = allButtons.filter(btn => btn.textContent === '');

    // First prescription's delete button is the second icon button (index 1)
    fireEvent.click(iconButtons[1]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should disable all interactions when disabled prop is true', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        disabled={true}
      />
    );

    // Add button should not be visible
    expect(screen.queryByRole('button', { name: /Agregar/i })).not.toBeInTheDocument();

    // Delete buttons should not be visible
    const deleteButtons = screen.queryAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-trash-2')
    );
    expect(deleteButtons).toHaveLength(0);
  });

  it('should show edit form when clicking edit button', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Find all icon buttons (size="icon" buttons are the edit and delete buttons)
    const allButtons = screen.getAllByRole('button');
    const iconButtons = allButtons.filter(btn => btn.textContent === '');

    // First prescription's edit button is the first icon button (index 0)
    fireEvent.click(iconButtons[0]);

    expect(screen.getByDisplayValue('Ibuprofeno')).toBeInTheDocument();
    expect(screen.getByDisplayValue('400mg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1 tableta')).toBeInTheDocument();
  });

  it('should call onUpdate when saving edited prescription', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Find all icon buttons (size="icon" buttons are the edit and delete buttons)
    const allButtons = screen.getAllByRole('button');
    const iconButtons = allButtons.filter(btn => btn.textContent === '');

    // First prescription's edit button is the first icon button (index 0)
    fireEvent.click(iconButtons[0]);

    const medicationInput = screen.getByDisplayValue('Ibuprofeno');
    fireEvent.change(medicationInput, { target: { value: 'Naproxeno' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          medicationName: 'Naproxeno',
        })
      );
    });
  });

  it('should render the Recetas title with pill icon', () => {
    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Recetas')).toBeInTheDocument();
  });
});
