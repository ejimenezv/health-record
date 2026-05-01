import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityExtractionView } from '../../../../src/components/realtime/EntityExtractionView';
import type { RealtimeEntity } from '../../../../src/hooks/useRealtimeSession';

describe('EntityExtractionView', () => {
  it('shows empty state when no entities', () => {
    render(<EntityExtractionView entities={[]} showNewIndicator={false} />);
    expect(
      screen.getByText('Esperando extraccion de entidades...')
    ).toBeInTheDocument();
  });

  it('groups entities by type', () => {
    const entities: RealtimeEntity[] = [
      {
        id: 'e1',
        type: 'symptom',
        content: 'cefalea',
        confidence: 0.95,
        timestamp: 0,
      },
      {
        id: 'e2',
        type: 'symptom',
        content: 'nausea',
        confidence: 0.9,
        timestamp: 0,
      },
      {
        id: 'e3',
        type: 'prescription',
        content: 'paracetamol 500mg',
        confidence: 0.85,
        timestamp: 0,
      },
    ];

    render(
      <EntityExtractionView entities={entities} showNewIndicator={false} />
    );

    expect(screen.getByText('Sintoma')).toBeInTheDocument();
    expect(screen.getByText('Prescripcion')).toBeInTheDocument();
    expect(screen.getByText('cefalea')).toBeInTheDocument();
    expect(screen.getByText('paracetamol 500mg')).toBeInTheDocument();
  });

  it('renders validation status badge', () => {
    const entities: RealtimeEntity[] = [
      {
        id: 'e1',
        type: 'diagnosis',
        content: 'Migrana',
        confidence: 0.95,
        timestamp: 0,
        validationStatus: 'approved',
      },
    ];
    render(
      <EntityExtractionView entities={entities} showNewIndicator={false} />
    );
    expect(screen.getByText('✓ Aprobada')).toBeInTheDocument();
  });
});
