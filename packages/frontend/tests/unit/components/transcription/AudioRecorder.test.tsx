import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioRecorder } from '../../../../src/components/transcription/AudioRecorder';

describe('AudioRecorder', () => {
  const defaultProps = {
    isRecording: false,
    duration: 0,
    onStart: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render start button when not recording', () => {
      render(<AudioRecorder {...defaultProps} />);
      expect(screen.getByText('Iniciar Grabacion')).toBeInTheDocument();
    });

    it('should not show duration when not recording', () => {
      render(<AudioRecorder {...defaultProps} />);
      expect(screen.queryByText('00:00')).not.toBeInTheDocument();
    });

    it('should not show audio level indicator when not recording', () => {
      render(<AudioRecorder {...defaultProps} />);
      const levelBar = document.querySelector('.bg-green-500');
      expect(levelBar).not.toBeInTheDocument();
    });
  });

  describe('Recording State', () => {
    it('should render stop button when recording', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} />);
      expect(screen.getByText('Detener')).toBeInTheDocument();
    });

    it('should show duration when recording', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} duration={65} />);
      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('should show recording indicator (red dot) when recording', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} />);
      const indicator = document.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show audio level indicator when recording', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} audioLevel={0.5} />);
      const levelBar = document.querySelector('.bg-green-500');
      expect(levelBar).toBeInTheDocument();
    });
  });

  describe('Paused State', () => {
    it('should show yellow indicator when paused', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} isPaused={true} />);
      const indicator = document.querySelector('.bg-yellow-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show "(Pausado)" text when paused', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} isPaused={true} />);
      expect(screen.getByText('(Pausado)')).toBeInTheDocument();
    });

    it('should not show audio level indicator when paused', () => {
      render(
        <AudioRecorder {...defaultProps} isRecording={true} isPaused={true} audioLevel={0.5} />
      );
      const levelBar = document.querySelector('.bg-green-500');
      expect(levelBar).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onStart when start button is clicked', () => {
      const onStart = vi.fn();
      render(<AudioRecorder {...defaultProps} onStart={onStart} />);
      fireEvent.click(screen.getByText('Iniciar Grabacion'));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when stop button is clicked', () => {
      const onStop = vi.fn();
      render(<AudioRecorder {...defaultProps} isRecording={true} onStop={onStop} />);
      fireEvent.click(screen.getByText('Detener'));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should call onPause when pause button is clicked', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();
      render(
        <AudioRecorder
          {...defaultProps}
          isRecording={true}
          onPause={onPause}
          onResume={onResume}
        />
      );
      const pauseButton = screen.getByRole('button', { name: '' }); // Icon button
      fireEvent.click(pauseButton);
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('should call onResume when resume button is clicked while paused', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();
      render(
        <AudioRecorder
          {...defaultProps}
          isRecording={true}
          isPaused={true}
          onPause={onPause}
          onResume={onResume}
        />
      );
      const resumeButton = screen.getByRole('button', { name: '' }); // Icon button
      fireEvent.click(resumeButton);
      expect(onResume).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('should disable start button when disabled prop is true', () => {
      render(<AudioRecorder {...defaultProps} disabled={true} />);
      expect(screen.getByText('Iniciar Grabacion')).toBeDisabled();
    });

    it('should disable stop button when disabled prop is true', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} disabled={true} />);
      expect(screen.getByText('Detener')).toBeDisabled();
    });
  });

  describe('Status Message', () => {
    it('should display status message when provided', () => {
      render(<AudioRecorder {...defaultProps} status="Grabando y transcribiendo..." />);
      expect(screen.getByText('Grabando y transcribiendo...')).toBeInTheDocument();
    });

    it('should not display status message when not provided', () => {
      render(<AudioRecorder {...defaultProps} />);
      const statusElement = document.querySelector('.text-gray-500');
      expect(statusElement).not.toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('should format single digit seconds with leading zero', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} duration={5} />);
      expect(screen.getByText('00:05')).toBeInTheDocument();
    });

    it('should format minutes correctly', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} duration={125} />);
      expect(screen.getByText('02:05')).toBeInTheDocument();
    });

    it('should handle large durations', () => {
      render(<AudioRecorder {...defaultProps} isRecording={true} duration={3661} />);
      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });
});
