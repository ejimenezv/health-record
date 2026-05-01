import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationAlertPanel } from '../../../../src/components/realtime/ValidationAlertPanel';
import type { RealtimeAlert } from '../../../../src/hooks/useRealtimeSession';

const sampleAlert: RealtimeAlert = {
  id: 'a1',
  type: 'drug_interaction',
  severity: 'CRITICAL',
  message: 'Posible interaccion entre warfarina y aspirina',
  relatedEntities: ['med_1', 'med_2'],
  recommendedAction: 'Reevaluar prescripcion',
  requiresImmediateAttention: true,
  acknowledged: false,
};

describe('ValidationAlertPanel', () => {
  it('shows empty state when no alerts', () => {
    render(<ValidationAlertPanel alerts={[]} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('No hay alertas de validacion')).toBeInTheDocument();
  });

  it('renders critical alert with message and recommended action', () => {
    render(
      <ValidationAlertPanel alerts={[sampleAlert]} onAcknowledge={vi.fn()} />
    );
    expect(screen.getByText(sampleAlert.message)).toBeInTheDocument();
    expect(screen.getByText(/Reevaluar prescripcion/)).toBeInTheDocument();
    expect(screen.getByText('⚡ Requiere Atencion Inmediata')).toBeInTheDocument();
  });

  it('calls onAcknowledge when button clicked', () => {
    const onAcknowledge = vi.fn();
    render(
      <ValidationAlertPanel alerts={[sampleAlert]} onAcknowledge={onAcknowledge} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reconocer' }));
    expect(onAcknowledge).toHaveBeenCalledWith('a1');
  });

  it('hides Reconocer button when acknowledged', () => {
    render(
      <ValidationAlertPanel
        alerts={[{ ...sampleAlert, acknowledged: true }]}
        onAcknowledge={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Reconocer' })).toBeNull();
    expect(screen.getByText('✓ Reconocida')).toBeInTheDocument();
  });

  it('counts critical and high alerts in summary', () => {
    const alerts: RealtimeAlert[] = [
      sampleAlert,
      { ...sampleAlert, id: 'a2', severity: 'HIGH' },
      { ...sampleAlert, id: 'a3', severity: 'HIGH' },
    ];
    render(<ValidationAlertPanel alerts={alerts} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('1 Criticas')).toBeInTheDocument();
    expect(screen.getByText('2 Altas')).toBeInTheDocument();
    expect(screen.getByText('Total: 3')).toBeInTheDocument();
  });
});
