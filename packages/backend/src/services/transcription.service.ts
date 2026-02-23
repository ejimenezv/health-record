import prisma from '../config/database.js';
import { whisperService } from './ai/whisper.service.js';
import { gptService, ExistingRecords } from './ai/gpt.service.js';
import { TranscriptionSession, AudioChunk, ExtractionResult } from '../types/ai.types.js';

const activeSessions = new Map<string, TranscriptionSession>();

export class TranscriptionService {
  async startSession(appointmentId: string, userId: string): Promise<string> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId: userId },
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    const existingSession = Array.from(activeSessions.values()).find(
      (s) => s.appointmentId === appointmentId && s.status === 'active'
    );

    if (existingSession) {
      return existingSession.id;
    }

    const sessionId = `session-${appointmentId}-${Date.now()}`;

    const session: TranscriptionSession = {
      id: sessionId,
      appointmentId,
      userId,
      status: 'active',
      startedAt: new Date(),
      chunks: [],
      fullTranscription: '',
    };

    activeSessions.set(sessionId, session);

    await prisma.transcription.upsert({
      where: { appointmentId },
      update: { status: 'recording', startedAt: new Date() },
      create: { appointmentId, status: 'recording', startedAt: new Date() },
    });

    return sessionId;
  }

  async processAudioChunk(
    sessionId: string,
    audioBuffer: Buffer,
    chunkIndex: number
  ): Promise<{ text: string; fullText: string }> {
    const session = activeSessions.get(sessionId);

    if (!session) throw new Error('Sesión no encontrada');
    // Allow processing if session is 'active' or 'processing' (for final chunks in flight)
    if (session.status !== 'active' && session.status !== 'processing') {
      throw new Error('Sesión no está activa');
    }

    const chunk: AudioChunk = {
      index: chunkIndex,
      buffer: audioBuffer,
      timestamp: Date.now(),
    };

    session.chunks.push(chunk);

    try {
      // Each chunk is now a complete WebM file (recorded with stop/start approach)
      // Pass previous transcription for context continuity (prevents word clipping)
      const previousText = session.fullTranscription || undefined;
      const result = await whisperService.transcribe(audioBuffer, 'es', previousText);
      chunk.transcription = result.text;

      if (result.text) {
        session.fullTranscription += (session.fullTranscription ? ' ' : '') + result.text;
      }

      return { text: result.text, fullText: session.fullTranscription };
    } catch (error: unknown) {
      console.error(`Chunk ${chunkIndex} transcription error:`, error);
      throw error;
    }
  }

  async extractFields(sessionId: string): Promise<ExtractionResult> {
    const session = activeSessions.get(sessionId);

    if (!session) throw new Error('Sesión no encontrada');
    if (!session.fullTranscription) {
      return { symptoms: [], diagnosis: null, prescriptions: [] };
    }

    // Fetch existing records to maintain naming consistency
    const existingRecords = await this.getExistingRecords(session.appointmentId);

    return gptService.extractFieldsIncremental(session.fullTranscription, existingRecords);
  }

  private async getExistingRecords(appointmentId: string): Promise<ExistingRecords | undefined> {
    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: {
        symptoms: true,
        prescriptions: true,
      },
    });

    if (!medicalRecord) return undefined;

    const hasData =
      medicalRecord.symptoms.length > 0 ||
      medicalRecord.prescriptions.length > 0 ||
      medicalRecord.diagnosis;

    if (!hasData) return undefined;

    return {
      symptoms: medicalRecord.symptoms.map((s) => ({
        name: s.symptomName,
        severity: s.severity ?? undefined,
        duration: s.duration ?? undefined,
      })),
      prescriptions: medicalRecord.prescriptions.map((p) => ({
        medicationName: p.medicationName,
        dosage: p.dosage ?? undefined,
        frequency: p.frequency ?? undefined,
        duration: p.duration ?? undefined,
      })),
      diagnosis: medicalRecord.diagnosis ?? undefined,
    };
  }

  async stopSession(sessionId: string): Promise<{
    transcription: string;
    extraction: ExtractionResult;
    duration: number;
  }> {
    const session = activeSessions.get(sessionId);

    if (!session) throw new Error('Sesión no encontrada');

    session.status = 'processing';

    // Wait a moment for any in-flight chunks to arrive
    // The frontend waits for all chunks to be transcribed before calling stop_session,
    // but there may be a small race condition
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Use the accumulated transcription from real-time processing
      // Each chunk was already transcribed individually (stop/start approach creates valid standalone WebM files)
      const finalTranscription = session.fullTranscription;
      console.log('stopSession - finalTranscription:', finalTranscription?.substring(0, 200) || 'EMPTY');
      console.log('stopSession - chunks count:', session.chunks.length);

      // Estimate duration: 15 seconds per chunk (based on chunkDuration setting)
      const estimatedDuration = session.chunks.length * 15;

      // Fetch existing records to maintain naming consistency
      const existingRecords = await this.getExistingRecords(session.appointmentId);
      console.log('stopSession - existing records:', existingRecords ? JSON.stringify(existingRecords).substring(0, 200) : 'NONE');

      // Extract medical fields from the complete transcription
      const extraction = await gptService.extractMedicalFields(finalTranscription, existingRecords);
      console.log('stopSession - extraction result:', JSON.stringify(extraction).substring(0, 300));

      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: {
          fullText: finalTranscription,
          durationSeconds: estimatedDuration,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      session.status = 'completed';
      activeSessions.delete(sessionId);

      return { transcription: finalTranscription, extraction, duration: estimatedDuration };
    } catch (error: unknown) {
      session.status = 'error';
      activeSessions.delete(sessionId);

      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: { status: 'error' },
      });

      throw error;
    }
  }

  async getTranscription(appointmentId: string, userId: string) {
    return prisma.transcription.findFirst({
      where: { appointmentId, appointment: { providerId: userId } },
    });
  }

  async cancelSession(sessionId: string): Promise<void> {
    const session = activeSessions.get(sessionId);

    if (session) {
      activeSessions.delete(sessionId);
      await prisma.transcription.update({
        where: { appointmentId: session.appointmentId },
        data: { status: 'cancelled' },
      });
    }
  }

  getSession(sessionId: string): TranscriptionSession | undefined {
    return activeSessions.get(sessionId);
  }
}

export const transcriptionService = new TranscriptionService();
