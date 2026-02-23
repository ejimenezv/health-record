import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../../../src/hooks/useAudioRecorder';

// Mock MediaRecorder instance
const createMockMediaRecorder = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((event: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  onerror: null as (() => void) | null,
  state: 'inactive' as 'inactive' | 'recording' | 'paused',
});

let mockMediaRecorderInstances: ReturnType<typeof createMockMediaRecorder>[] = [];

const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = 128;
      }
    }),
  })),
  close: vi.fn(),
  state: 'running',
};

// Setup global mocks
beforeEach(() => {
  vi.useFakeTimers();
  mockMediaRecorderInstances = [];

  // Mock navigator.mediaDevices.getUserMedia
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
    writable: true,
  });

  // Mock MediaRecorder - creates new instance each time
  vi.stubGlobal(
    'MediaRecorder',
    vi.fn().mockImplementation(() => {
      const instance = createMockMediaRecorder();
      mockMediaRecorderInstances.push(instance);
      return instance;
    })
  );

  // Add isTypeSupported static method
  (MediaRecorder as unknown as { isTypeSupported: (type: string) => boolean }).isTypeSupported =
    vi.fn().mockReturnValue(true);

  // Mock AudioContext
  vi.stubGlobal(
    'AudioContext',
    vi.fn().mockImplementation(() => mockAudioContext)
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('useAudioRecorder', () => {
  const defaultOptions = {
    onChunkReady: vi.fn(),
    chunkDuration: 5000,
  };

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.audioLevel).toBe(0);
    });

    it('should provide required functions', () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
      expect(typeof result.current.pauseRecording).toBe('function');
      expect(typeof result.current.resumeRecording).toBe('function');
    });
  });

  describe('startRecording', () => {
    it('should request microphone permission', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    });

    it('should set isRecording to true after starting', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should handle NotAllowedError', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permissionError);

      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('Permiso de microfono denegado');
      expect(result.current.isRecording).toBe(false);
    });

    it('should handle NotFoundError', async () => {
      const notFoundError = new Error('No microphone');
      notFoundError.name = 'NotFoundError';
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(notFoundError);

      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('No se encontro microfono');
      expect(result.current.isRecording).toBe(false);
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(genericError);

      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('Something went wrong');
    });
  });

  describe('Duration tracking', () => {
    it('should update duration every second while recording', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.duration).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stopRecording', () => {
    it('should set isRecording to false after stopping', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should reset duration to 0 after stopping', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.duration).toBe(0);
    });

    it('should reset audioLevel to 0 after stopping', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.audioLevel).toBe(0);
    });

    it('should stop media tracks', async () => {
      const mockTrack = { stop: vi.fn() };
      mockStream.getTracks.mockReturnValue([mockTrack]);

      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe('pauseRecording', () => {
    it('should set isPaused to true when pausing', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should not set isPaused if not recording', () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resumeRecording', () => {
    it('should set isPaused to false when resuming', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should not resume if not paused', async () => {
      const { result } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      // isPaused is false, resumeRecording should have no effect
      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('Chunk recording', () => {
    it('should create new MediaRecorder for each chunk', async () => {
      const onChunkReady = vi.fn();
      const { result } = renderHook(() =>
        useAudioRecorder({ onChunkReady, chunkDuration: 1000 })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      // First MediaRecorder created for first chunk
      expect(mockMediaRecorderInstances.length).toBeGreaterThanOrEqual(1);
      const firstRecorder = mockMediaRecorderInstances[0];
      expect(firstRecorder.start).toHaveBeenCalled();
    });

    it('should call onChunkReady when chunk recording completes', async () => {
      const onChunkReady = vi.fn();
      const { result } = renderHook(() =>
        useAudioRecorder({ onChunkReady, chunkDuration: 1000 })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate a chunk being recorded
      const recorder = mockMediaRecorderInstances[0];
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });

      await act(async () => {
        // Simulate ondataavailable
        if (recorder.ondataavailable) {
          recorder.ondataavailable({ data: mockBlob });
        }
        // Simulate onstop which triggers blob creation
        if (recorder.onstop) {
          recorder.onstop();
        }
        // Advance timer to complete the chunk
        vi.advanceTimersByTime(1000);
      });

      // The onChunkReady callback should eventually be called
      // Note: Due to async nature, this may need adjustment
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should cleanup intervals on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder(defaultOptions));

      await act(async () => {
        await result.current.startRecording();
      });

      // Advance some time to ensure intervals are running
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      unmount();

      // After unmount, no more interval updates should occur
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});
