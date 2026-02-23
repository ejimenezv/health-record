import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SymptomsSection } from '../../../../src/components/medical-record/SymptomsSection';
import type { Symptom } from '../../../../src/types/medical-records.types';

const mockSymptoms: Symptom[] = [
  {
    id: '1',
    symptomName: 'Cefalea',
    bodySite: 'Frontal',
    severity: 7,
    duration: '2 semanas',
    notes: 'Empeora por las tardes',
    isAIExtracted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    symptomName: 'Nauseas',
    bodySite: null,
    severity: 4,
    duration: '3 dias',
    notes: null,
    isAIExtracted: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('SymptomsSection', () => {
  const mockOnAdd = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no symptoms', () => {
    render(
      <SymptomsSection
        symptoms={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('No hay sintomas registrados')).toBeInTheDocument();
  });

  it('should render list of symptoms', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Cefalea')).toBeInTheDocument();
    expect(screen.getByText('Nauseas')).toBeInTheDocument();
  });

  it('should display severity labels correctly', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Severity 7 should be "Severo"
    expect(screen.getByText(/Severo.*7\/10/)).toBeInTheDocument();
    // Severity 4 should be "Moderado"
    expect(screen.getByText(/Moderado.*4\/10/)).toBeInTheDocument();
  });

  it('should display AI badge for AI-extracted symptoms', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Should have one AI badge (for Nauseas)
    const aiBadges = screen.getAllByText('IA');
    expect(aiBadges).toHaveLength(1);
  });

  it('should display body site and duration', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Ubicacion: Frontal/)).toBeInTheDocument();
    expect(screen.getByText(/Duracion: 2 semanas/)).toBeInTheDocument();
  });

  it('should display notes when present', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Empeora por las tardes')).toBeInTheDocument();
  });

  it('should show add form when clicking "Agregar" button', () => {
    render(
      <SymptomsSection
        symptoms={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    const addButton = screen.getByRole('button', { name: /Agregar/i });
    fireEvent.click(addButton);

    expect(screen.getByPlaceholderText('Nombre del sintoma *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ubicacion (ej: Frontal)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Severidad (1-10)')).toBeInTheDocument();
  });

  it('should call onAdd when saving new symptom', async () => {
    mockOnAdd.mockResolvedValue(undefined);

    render(
      <SymptomsSection
        symptoms={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Open add form
    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('Nombre del sintoma *'), {
      target: { value: 'Dolor de cabeza' },
    });
    fireEvent.change(screen.getByPlaceholderText('Duracion (ej: 2 semanas)'), {
      target: { value: '1 semana' },
    });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          symptomName: 'Dolor de cabeza',
          duration: '1 semana',
        })
      );
    });
  });

  it('should not call onAdd when symptom name is empty', () => {
    render(
      <SymptomsSection
        symptoms={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    // Try to save without entering symptom name
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('should cancel adding when clicking cancel', () => {
    render(
      <SymptomsSection
        symptoms={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));
    expect(screen.getByPlaceholderText('Nombre del sintoma *')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByPlaceholderText('Nombre del sintoma *')).not.toBeInTheDocument();
  });

  it('should call onDelete when clicking delete button', async () => {
    mockOnDelete.mockResolvedValue(undefined);

    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Find all icon buttons (size="icon" buttons are the edit and delete buttons)
    // Each symptom has 2 icon buttons: edit and delete. Delete is the second one.
    const allButtons = screen.getAllByRole('button');
    // Filter to only icon-sized buttons (those without text content)
    const iconButtons = allButtons.filter(btn => btn.textContent === '');

    // First symptom's delete button is the second icon button (index 1)
    fireEvent.click(iconButtons[1]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should disable all interactions when disabled prop is true', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        disabled={true}
      />
    );

    // Add button should not be visible
    expect(screen.queryByRole('button', { name: /Agregar/i })).not.toBeInTheDocument();

    // Edit and delete buttons should not be visible
    const editButtons = screen.queryAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-edit-2')
    );
    expect(editButtons).toHaveLength(0);
  });

  it('should show edit form when clicking edit button', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Find all icon buttons (size="icon" buttons are the edit and delete buttons)
    const allButtons = screen.getAllByRole('button');
    const iconButtons = allButtons.filter(btn => btn.textContent === '');

    // First symptom's edit button is the first icon button (index 0)
    fireEvent.click(iconButtons[0]);

    // Should show the edit form with pre-filled values
    const input = screen.getByDisplayValue('Cefalea');
    expect(input).toBeInTheDocument();
  });

  it('should call onUpdate when saving edited symptom', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Find all icon buttons (size="icon" buttons are the edit and delete buttons)
    const allButtons = screen.getAllByRole('button');
    const iconButtons = allButtons.filter(btn => btn.textContent === '');

    // First symptom's edit button is the first icon button (index 0)
    fireEvent.click(iconButtons[0]);

    // Modify the symptom name
    const nameInput = screen.getByDisplayValue('Cefalea');
    fireEvent.change(nameInput, { target: { value: 'Migrania' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          symptomName: 'Migrania',
        })
      );
    });
  });
});
