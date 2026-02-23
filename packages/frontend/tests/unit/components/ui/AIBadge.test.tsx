import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIBadge } from '../../../../src/components/ui/ai-badge';

describe('AIBadge', () => {
  it('should render with default text', () => {
    render(<AIBadge />);
    expect(screen.getByText('IA')).toBeInTheDocument();
  });

  it('should have default title when no confidence provided', () => {
    render(<AIBadge />);
    const badge = screen.getByText('IA').closest('span');
    expect(badge).toHaveAttribute('title', 'Generado por IA');
  });

  it('should display confidence percentage when provided', () => {
    render(<AIBadge confidence={0.85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should have confidence in title when provided', () => {
    render(<AIBadge confidence={0.92} />);
    const badge = screen.getByText('IA').closest('span');
    expect(badge).toHaveAttribute('title', 'Confianza: 92%');
  });

  it('should round confidence to nearest integer', () => {
    render(<AIBadge confidence={0.876} />);
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<AIBadge className="custom-class" />);
    const badge = screen.getByText('IA').closest('span');
    expect(badge).toHaveClass('custom-class');
  });

  it('should have default styling classes', () => {
    render(<AIBadge />);
    const badge = screen.getByText('IA').closest('span');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-700');
    expect(badge).toHaveClass('rounded-full');
  });
});
