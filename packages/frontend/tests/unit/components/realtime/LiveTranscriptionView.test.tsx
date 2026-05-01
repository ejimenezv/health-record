import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveTranscriptionView } from '../../../../src/components/realtime/LiveTranscriptionView';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('LiveTranscriptionView', () => {
  it('renders empty state when no chunks', () => {
    render(
      <LiveTranscriptionView transcriptChunks={[]} currentSpeaker={null} />
    );
    expect(screen.getByText('Esperando transcripcion...')).toBeInTheDocument();
  });

  it('renders transcript chunks', () => {
    render(
      <LiveTranscriptionView
        transcriptChunks={[
          { chunkIndex: 0, text: 'Hola doctor', isFinal: true, confidence: 0.95 },
          { chunkIndex: 1, text: 'me duele la cabeza', isFinal: false, confidence: 0.7 },
        ]}
        currentSpeaker={null}
      />
    );
    expect(screen.getByText('Hola doctor')).toBeInTheDocument();
    expect(screen.getByText('me duele la cabeza')).toBeInTheDocument();
  });

  it('shows current speaker badge', () => {
    render(
      <LiveTranscriptionView
        transcriptChunks={[]}
        currentSpeaker={{ id: 'spk_1', role: 'DOCTOR', confidence: 0.92 }}
      />
    );
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('displays word count in stats', () => {
    render(
      <LiveTranscriptionView
        transcriptChunks={[
          { chunkIndex: 0, text: 'uno dos tres', isFinal: true, confidence: 1 },
        ]}
        currentSpeaker={null}
      />
    );
    expect(screen.getByText('Palabras: 3')).toBeInTheDocument();
  });
});
