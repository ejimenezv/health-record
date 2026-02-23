import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import type { AIExtractionResult } from '../types/medical-records.types';

type TranscriptionStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'completed' | 'error';

interface UseTranscriptionOptions {
  appointmentId: string;
  onTranscriptionUpdate: (text: string, fullText: string) => void;
  onFieldExtraction: (extraction: AIExtractionResult) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: TranscriptionStatus) => void;
}

interface UseTranscriptionReturn {
  isConnected: boolean;
  status: TranscriptionStatus;
  startSession: () => void;
  sendAudioChunk: (chunk: Blob, index: number) => Promise<void>;
  stopSession: () => void;
  cancelSession: () => void;
  requestExtraction: () => void;
  waitForPendingChunks: () => Promise<void>;
}

export function useTranscription({
  appointmentId,
  onTranscriptionUpdate,
  onFieldExtraction,
  onError,
  onStatusChange,
}: UseTranscriptionOptions): UseTranscriptionReturn {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const pendingChunksRef = useRef<Set<number>>(new Set());
  const chunkResolversRef = useRef<Map<number, () => void>>(new Map());

  const updateStatus = useCallback(
    (newStatus: TranscriptionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

    const socket = io(`${WS_URL}/transcription`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      updateStatus('idle');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      if (status === 'recording') {
        updateStatus('error');
        onError('Conexion perdida');
      }
    });

    socket.on('connect_error', () => {
      onError('Error de conexion');
    });

    socket.on('session_started', () => {
      updateStatus('recording');
    });

    socket.on('transcription_update', (data: { text: string; fullText: string; chunkIndex: number }) => {
      onTranscriptionUpdate(data.text, data.fullText);
      // Mark chunk as processed
      pendingChunksRef.current.delete(data.chunkIndex);
      const resolver = chunkResolversRef.current.get(data.chunkIndex);
      if (resolver) {
        resolver();
        chunkResolversRef.current.delete(data.chunkIndex);
      }
    });

    socket.on('field_extraction', (data: AIExtractionResult) => {
      onFieldExtraction(data);
    });

    socket.on('status', (data: { status: string }) => {
      if (data.status === 'processing') updateStatus('processing');
    });

    socket.on('session_completed', (data: { transcription: string; extraction: AIExtractionResult }) => {
      console.log('session_completed received:', {
        transcription: data.transcription?.substring(0, 100),
        extraction: data.extraction,
      });
      updateStatus('completed');
      onTranscriptionUpdate(data.transcription, data.transcription);
      // Only update extraction if the final one has data
      // This prevents overwriting a good real-time extraction with an empty one
      if (
        data.extraction &&
        (data.extraction.symptoms?.length > 0 ||
          data.extraction.diagnosis ||
          data.extraction.prescriptions?.length > 0 ||
          data.extraction.summary)
      ) {
        console.log('Calling onFieldExtraction with:', data.extraction);
        onFieldExtraction(data.extraction);
      } else {
        console.log('Extraction filtered out - no meaningful data');
      }
    });

    socket.on('session_cancelled', () => {
      updateStatus('idle');
    });

    socket.on('error', (data: { message?: string; code?: string }) => {
      onError(data.message || 'Error');
      if (data.code !== 'CHUNK_ERROR') updateStatus('error');
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, appointmentId]);

  const startSession = useCallback(() => {
    if (!socketRef.current?.connected) {
      onError('No hay conexion');
      return;
    }
    updateStatus('connecting');
    socketRef.current.emit('start_session', { appointmentId });
  }, [appointmentId, updateStatus, onError]);

  const sendAudioChunk = useCallback(async (chunk: Blob, index: number) => {
    if (!socketRef.current?.connected) throw new Error('No hay conexion');

    const arrayBuffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i] as number);
    }
    const base64 = btoa(binary);

    // Track this chunk as pending
    pendingChunksRef.current.add(index);

    socketRef.current.emit('audio_chunk', { audio: base64, chunkIndex: index });
  }, []);

  const waitForPendingChunks = useCallback(async () => {
    if (pendingChunksRef.current.size === 0) return;

    // Create promises for all pending chunks
    const promises = Array.from(pendingChunksRef.current).map((chunkIndex) => {
      return new Promise<void>((resolve) => {
        // If already resolved, resolve immediately
        if (!pendingChunksRef.current.has(chunkIndex)) {
          resolve();
          return;
        }
        chunkResolversRef.current.set(chunkIndex, resolve);
      });
    });

    // Wait for all with a timeout
    await Promise.race([
      Promise.all(promises),
      new Promise<void>((resolve) => setTimeout(resolve, 10000)), // 10s timeout
    ]);

    // Clear any remaining
    pendingChunksRef.current.clear();
    chunkResolversRef.current.clear();
  }, []);

  const stopSession = useCallback(() => {
    socketRef.current?.emit('stop_session');
  }, []);

  const cancelSession = useCallback(() => {
    socketRef.current?.emit('cancel_session');
    updateStatus('idle');
  }, [updateStatus]);

  const requestExtraction = useCallback(() => {
    socketRef.current?.emit('request_extraction');
  }, []);

  return {
    isConnected,
    status,
    startSession,
    sendAudioChunk,
    stopSession,
    cancelSession,
    requestExtraction,
    waitForPendingChunks,
  };
}
