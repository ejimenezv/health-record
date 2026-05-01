import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostMonitor } from '../../../../src/components/realtime/CostMonitor';

describe('CostMonitor', () => {
  it('renders cost breakdown', () => {
    render(
      <CostMonitor
        cost={{
          transcriptionCostUsd: 0.012,
          extractionCostUsd: 0.008,
          totalCostUsd: 0.02,
          chunksProcessed: 5,
          cacheHitRate: 0.5,
        }}
        budgetLimit={1.0}
      />
    );
    expect(screen.getByText('$0.0200')).toBeInTheDocument();
    expect(screen.getByText('$0.0120')).toBeInTheDocument();
    expect(screen.getByText('$0.0080')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('shows warning when over 75% of budget', () => {
    render(
      <CostMonitor
        cost={{
          transcriptionCostUsd: 0.5,
          extractionCostUsd: 0.3,
          totalCostUsd: 0.8,
          chunksProcessed: 100,
          cacheHitRate: 0,
        }}
        budgetLimit={1.0}
      />
    );
    expect(
      screen.getByText('Acercandose al limite de presupuesto')
    ).toBeInTheDocument();
  });

  it('shows critical warning when over 90% of budget', () => {
    render(
      <CostMonitor
        cost={{
          transcriptionCostUsd: 0.6,
          extractionCostUsd: 0.35,
          totalCostUsd: 0.95,
          chunksProcessed: 200,
          cacheHitRate: 0,
        }}
        budgetLimit={1.0}
      />
    );
    expect(
      screen.getByText('Advertencia: cerca del limite de presupuesto')
    ).toBeInTheDocument();
  });
});
