import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIExtractionStatus } from '../../../../src/components/transcription/AIExtractionStatus';

describe('AIExtractionStatus', () => {
  const defaultProps = {
    symptoms: 'pending' as const,
    diagnosis: 'pending' as const,
    prescriptions: 'pending' as const,
  };

  describe('Header', () => {
    it('should display the header text', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      expect(screen.getByText('Extraccion con IA')).toBeInTheDocument();
    });

    it('should have sparkles icon', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      const header = screen.getByText('Extraccion con IA').closest('div');
      expect(header?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Field Labels', () => {
    it('should display symptoms label', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      expect(screen.getByText(/Sintomas/)).toBeInTheDocument();
    });

    it('should display diagnosis label', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      expect(screen.getByText('Diagnostico')).toBeInTheDocument();
    });

    it('should display prescriptions label', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      expect(screen.getByText(/Recetas/)).toBeInTheDocument();
    });
  });

  describe('Pending Status', () => {
    it('should show gray background for pending status', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      expect(symptomsCard).toHaveClass('bg-gray-50');
    });

    it('should show gray border for pending status', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      expect(symptomsCard).toHaveClass('border-gray-200');
    });
  });

  describe('Extracting Status', () => {
    it('should show yellow background for extracting status', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="extracting" />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      expect(symptomsCard).toHaveClass('bg-yellow-50');
    });

    it('should show yellow border for extracting status', () => {
      render(<AIExtractionStatus {...defaultProps} diagnosis="extracting" />);
      const diagnosisCard = screen.getByText('Diagnostico').closest('div');
      expect(diagnosisCard).toHaveClass('border-yellow-200');
    });

    it('should show spinning icon for extracting status', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="extracting" />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      const icon = symptomsCard?.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Done Status', () => {
    it('should show green background for done status', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="done" />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      expect(symptomsCard).toHaveClass('bg-green-50');
    });

    it('should show green border for done status', () => {
      render(<AIExtractionStatus {...defaultProps} diagnosis="done" />);
      const diagnosisCard = screen.getByText('Diagnostico').closest('div');
      expect(diagnosisCard).toHaveClass('border-green-200');
    });

    it('should show check icon for done status', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="done" />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      const icon = symptomsCard?.querySelector('.text-green-500');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Error Status', () => {
    it('should show red background for error status', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="error" />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      expect(symptomsCard).toHaveClass('bg-red-50');
    });

    it('should show red border for error status', () => {
      render(<AIExtractionStatus {...defaultProps} diagnosis="error" />);
      const diagnosisCard = screen.getByText('Diagnostico').closest('div');
      expect(diagnosisCard).toHaveClass('border-red-200');
    });

    it('should show alert icon for error status', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="error" />);
      const symptomsCard = screen.getByText(/Sintomas/).closest('div');
      const icon = symptomsCard?.querySelector('.text-red-500');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Counts', () => {
    it('should display symptoms count when done and count > 0', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="done" symptomsCount={3} />);
      expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
    });

    it('should not display symptoms count when pending', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="pending" symptomsCount={3} />);
      expect(screen.queryByText(/\(3\)/)).not.toBeInTheDocument();
    });

    it('should not display symptoms count when count is 0', () => {
      render(<AIExtractionStatus {...defaultProps} symptoms="done" symptomsCount={0} />);
      expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument();
    });

    it('should display prescriptions count when done and count > 0', () => {
      render(<AIExtractionStatus {...defaultProps} prescriptions="done" prescriptionsCount={2} />);
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('should not display prescriptions count when pending', () => {
      render(
        <AIExtractionStatus {...defaultProps} prescriptions="pending" prescriptionsCount={2} />
      );
      expect(screen.queryByText(/\(2\)/)).not.toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('should have 3 column grid layout', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      const grid = document.querySelector('.grid-cols-3');
      expect(grid).toBeInTheDocument();
    });

    it('should render 3 status cards', () => {
      render(<AIExtractionStatus {...defaultProps} />);
      const cards = document.querySelectorAll('.border.rounded');
      expect(cards.length).toBe(3);
    });
  });
});
