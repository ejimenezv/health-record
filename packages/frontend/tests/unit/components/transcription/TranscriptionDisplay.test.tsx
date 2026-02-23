import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptionDisplay } from '../../../../src/components/transcription/TranscriptionDisplay';

describe('TranscriptionDisplay', () => {
  describe('Empty State', () => {
    it('should show placeholder text when no text is provided', () => {
      render(<TranscriptionDisplay text="" />);
      expect(
        screen.getByText('La transcripcion aparecera aqui cuando comience a grabar...')
      ).toBeInTheDocument();
    });

    it('should have italic styling for placeholder', () => {
      render(<TranscriptionDisplay text="" />);
      const placeholder = screen.getByText(
        'La transcripcion aparecera aqui cuando comience a grabar...'
      );
      expect(placeholder).toHaveClass('italic');
    });
  });

  describe('With Text Content', () => {
    it('should display transcription text', () => {
      render(<TranscriptionDisplay text="El paciente presenta dolor de cabeza" />);
      expect(screen.getByText('El paciente presenta dolor de cabeza')).toBeInTheDocument();
    });

    it('should preserve whitespace in text', () => {
      render(<TranscriptionDisplay text="Linea 1\nLinea 2" />);
      const textElement = screen.getByText(/Linea 1/);
      expect(textElement).toHaveClass('whitespace-pre-wrap');
    });

    it('should not show placeholder when text is provided', () => {
      render(<TranscriptionDisplay text="Algun texto" />);
      expect(
        screen.queryByText('La transcripcion aparecera aqui cuando comience a grabar...')
      ).not.toBeInTheDocument();
    });
  });

  describe('Live Mode', () => {
    it('should show cursor animation when isLive is true', () => {
      render(<TranscriptionDisplay text="Texto en vivo" isLive={true} />);
      const cursor = document.querySelector('.animate-pulse');
      expect(cursor).toBeInTheDocument();
    });

    it('should not show cursor when isLive is false', () => {
      render(<TranscriptionDisplay text="Texto estatico" isLive={false} />);
      const cursor = document.querySelector('.animate-pulse');
      expect(cursor).not.toBeInTheDocument();
    });

    it('should not show cursor by default', () => {
      render(<TranscriptionDisplay text="Texto estatico" />);
      const cursor = document.querySelector('.animate-pulse');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have border styling', () => {
      render(<TranscriptionDisplay text="Texto" />);
      const container = document.querySelector('.border');
      expect(container).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      render(<TranscriptionDisplay text="Texto" />);
      const container = document.querySelector('.rounded-md');
      expect(container).toBeInTheDocument();
    });

    it('should have background color', () => {
      render(<TranscriptionDisplay text="Texto" />);
      const container = document.querySelector('.bg-gray-50');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Max Height', () => {
    it('should apply default max height', () => {
      render(<TranscriptionDisplay text="Texto largo" />);
      const container = document.querySelector('.rounded-md');
      expect(container).toHaveStyle({ maxHeight: '200px' });
    });

    it('should apply custom max height', () => {
      render(<TranscriptionDisplay text="Texto largo" maxHeight={300} />);
      const container = document.querySelector('.rounded-md');
      expect(container).toHaveStyle({ maxHeight: '300px' });
    });
  });
});
