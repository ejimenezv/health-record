import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderOptions {
  onChunkReady: (chunk: Blob, index: number) => void | Promise<void>;
  chunkDuration?: number; // milliseconds
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

export function useAudioRecorder({
  onChunkReady,
  chunkDuration = 5000,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const onChunkReadyRef = useRef(onChunkReady);
  const currentRecorderRef = useRef<MediaRecorder | null>(null);
  const stopResolveRef = useRef<(() => void) | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    onChunkReadyRef.current = onChunkReady;
  }, [onChunkReady]);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    audioContextRef.current = null;
    analyzerRef.current = null;
    streamRef.current = null;
    isRecordingRef.current = false;
    isPausedRef.current = false;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  /**
   * Record a single chunk as a complete WebM file
   * This ensures each chunk has proper headers and is valid standalone
   * @param isFinalChunk - If true, this is the final chunk before stopping
   */
  const recordChunk = useCallback((isFinalChunk = false): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const stream = streamRef.current;
      if (!stream || (!isRecordingRef.current && !isFinalChunk) || isPausedRef.current) {
        resolve(null);
        return;
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeTypeRef.current,
        audioBitsPerSecond: 128000,
      });

      currentRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        currentRecorderRef.current = null;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mimeTypeRef.current });
          resolve(blob);
        } else {
          resolve(null);
          // If no blob, signal stop completion immediately
          if (stopResolveRef.current) {
            stopResolveRef.current();
            stopResolveRef.current = null;
          }
        }
      };

      recorder.onerror = () => {
        currentRecorderRef.current = null;
        resolve(null);
      };

      recorder.start();

      // Stop after chunkDuration (unless this is the final chunk, which will be stopped manually)
      if (!isFinalChunk) {
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, chunkDuration);
      }
    });
  }, [chunkDuration]);

  /**
   * Continuously record chunks until stopped
   */
  const recordLoop = useCallback(async () => {
    while (isRecordingRef.current) {
      if (isPausedRef.current) {
        // Wait while paused
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const blob = await recordChunk();
      if (blob && blob.size > 0) {
        await onChunkReadyRef.current(blob, chunkIndexRef.current);
        chunkIndexRef.current++;
      }

      // Signal stop completion after the chunk has been sent
      // (this handles the final chunk when stopRecording was called)
      if (stopResolveRef.current) {
        stopResolveRef.current();
        stopResolveRef.current = null;
      }
    }
  }, [recordChunk]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunkIndexRef.current = 0;
      pausedTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Audio level monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      levelIntervalRef.current = setInterval(() => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
      }, 100);

      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);

      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
        }
      }, 1000);

      // Start the recording loop
      recordLoop();
    } catch (err) {
      const error = err as Error & { name?: string };
      if (error.name === 'NotAllowedError') {
        setError('Permiso de microfono denegado');
      } else if (error.name === 'NotFoundError') {
        setError('No se encontro microfono');
      } else {
        setError(error.message || 'Error al iniciar grabacion');
      }
      cleanup();
    }
  }, [cleanup, recordLoop]);

  const stopRecording = useCallback(async () => {
    // Signal to stop the loop
    isRecordingRef.current = false;
    isPausedRef.current = false;

    // If there's a recorder currently running, stop it and wait for it to finish
    // The recordLoop will handle sending the final chunk via the existing onstop handler
    if (currentRecorderRef.current && currentRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const recorder = currentRecorderRef.current!;

        // Store resolver so onstop can signal completion
        stopResolveRef.current = resolve;

        // Stop the recorder - the existing onstop handler in recordChunk will:
        // 1. Create the blob and resolve it
        // 2. Call stopResolveRef.current() to signal we're done
        recorder.stop();
      });
    }

    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioLevel(0);
  }, [cleanup]);

  const pauseRecording = useCallback(() => {
    if (isRecordingRef.current && !isPausedRef.current) {
      isPausedRef.current = true;
      setIsPaused(true);
      pausedTimeRef.current = Date.now();
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (isRecordingRef.current && isPausedRef.current) {
      const pauseDuration = Date.now() - pausedTimeRef.current;
      pausedTimeRef.current = pauseDuration;
      isPausedRef.current = false;
      setIsPaused(false);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
