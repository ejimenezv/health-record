import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TranscriptionResult } from '../../types/ai.types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class WhisperService {
  /**
   * Transcribe audio buffer using OpenAI Whisper
   * @param audioBuffer - The audio data to transcribe
   * @param language - Language code (default: 'es')
   * @param previousText - Last ~50 words from previous chunk for context continuity
   */
  async transcribe(
    audioBuffer: Buffer,
    language = 'es',
    previousText?: string
  ): Promise<TranscriptionResult> {
    const tempPath = path.join(
      os.tmpdir(),
      `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`
    );

    try {
      fs.writeFileSync(tempPath, audioBuffer);
      const fileStream = fs.createReadStream(tempPath);

      // Build prompt: medical context + last words from previous chunk
      const prompt = this.buildPrompt(previousText);

      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language,
        response_format: 'verbose_json',
        prompt,
      });

      return {
        text: transcription.text,
        segments: transcription.segments?.map((seg) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })),
        language: transcription.language || language,
        duration: transcription.duration || 0,
      };
    } catch (error: unknown) {
      console.error('Whisper transcription error:', error);

      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'audio_too_short') {
        return { text: '', segments: [], language, duration: 0 };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transcription failed: ${errorMessage}`);
    } finally {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        console.warn('Failed to clean up temp file:', tempPath);
      }
    }
  }

  /**
   * Build the prompt for Whisper with medical context and previous text for continuity
   */
  private buildPrompt(previousText?: string): string {
    const medicalContext = `Esta es una consulta médica en español. Términos: síntomas, diagnóstico, receta, medicamento, dosis, dolor, fiebre, presión arterial, diabetes, paracetamol, ibuprofeno, antibiótico.`;

    if (previousText) {
      // Get last ~50 words to provide context for word boundary detection
      const lastWords = this.getLastWords(previousText, 50);
      return `${medicalContext}\n\n...${lastWords}`;
    }

    return medicalContext;
  }

  /**
   * Extract the last N words from text for context continuity
   */
  private getLastWords(text: string, count: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= count) return text;
    return words.slice(-count).join(' ');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await openai.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const whisperService = new WhisperService();
