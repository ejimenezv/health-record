import { Server, Socket } from 'socket.io';
import { transcriptionService } from '../services/transcription.service.js';
import { verifyToken } from '../utils/jwt.js';

interface TranscriptionSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

export function setupTranscriptionWebSocket(io: Server): void {
  const namespace = io.of('/transcription');

  // Auth middleware
  namespace.use((socket: TranscriptionSocket, next) => {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  namespace.on('connection', (socket: TranscriptionSocket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('start_session', async (data: { appointmentId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'No autenticado', code: 'AUTH_ERROR' });
          return;
        }

        const sessionId = await transcriptionService.startSession(data.appointmentId, socket.userId);
        socket.sessionId = sessionId;

        socket.emit('session_started', { sessionId, message: 'Sesión iniciada' });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        socket.emit('error', { message: errorMessage, code: 'START_ERROR' });
      }
    });

    socket.on('audio_chunk', async (data: { audio: string; chunkIndex: number }) => {
      console.log(`Received chunk ${data.chunkIndex}, size: ${data.audio.length} bytes`);

      if (!socket.sessionId) {
        socket.emit('error', { message: 'No hay sesión activa', code: 'NO_SESSION' });
        return;
      }

      try {
        const audioBuffer = Buffer.from(data.audio, 'base64');

        if (audioBuffer.length < 1000) {
          console.log(`Chunk ${data.chunkIndex} too small (${audioBuffer.length} bytes), skipping`);
          return;
        }

        const { text, fullText } = await transcriptionService.processAudioChunk(
          socket.sessionId,
          audioBuffer,
          data.chunkIndex
        );

        socket.emit('transcription_update', {
          text,
          fullText,
          chunkIndex: data.chunkIndex,
          isFinal: false,
        });

        // Extract fields every 2 chunks (~30 seconds with 15s chunks)
        // chunkIndex 1 = after 2 chunks (30s), chunkIndex 3 = after 4 chunks (60s), etc.
        if (data.chunkIndex % 2 === 1) {
          console.log(`Extracting fields at chunk ${data.chunkIndex}...`);
          try {
            const extraction = await transcriptionService.extractFields(socket.sessionId);
            console.log('Extraction result:', JSON.stringify(extraction).substring(0, 200));
            socket.emit('field_extraction', extraction);
          } catch (extractionError) {
            console.error('Extraction failed:', extractionError);
            // Continue without extraction
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        socket.emit('error', {
          message: errorMessage,
          code: 'CHUNK_ERROR',
          chunkIndex: data.chunkIndex,
        });
      }
    });

    socket.on('stop_session', async () => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No hay sesión activa', code: 'NO_SESSION' });
        return;
      }

      try {
        socket.emit('status', { status: 'processing', message: 'Procesando...' });

        const result = await transcriptionService.stopSession(socket.sessionId);

        socket.emit('session_completed', {
          transcription: result.transcription,
          extraction: result.extraction,
          duration: result.duration,
        });

        socket.sessionId = undefined;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        socket.emit('error', { message: errorMessage, code: 'STOP_ERROR' });
      }
    });

    socket.on('cancel_session', async () => {
      if (socket.sessionId) {
        await transcriptionService.cancelSession(socket.sessionId);
        socket.emit('session_cancelled', { message: 'Sesión cancelada' });
        socket.sessionId = undefined;
      }
    });

    socket.on('request_extraction', async () => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'No hay sesión activa', code: 'NO_SESSION' });
        return;
      }

      try {
        const extraction = await transcriptionService.extractFields(socket.sessionId);
        socket.emit('field_extraction', extraction);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        socket.emit('error', { message: errorMessage, code: 'EXTRACTION_ERROR' });
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.sessionId) {
        await transcriptionService.cancelSession(socket.sessionId);
      }
    });
  });

  console.log('Transcription WebSocket handler initialized');
}
