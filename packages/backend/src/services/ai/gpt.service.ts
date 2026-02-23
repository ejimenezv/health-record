import OpenAI from 'openai';
import { ExtractionResult, ExtractedSymptom, ExtractedDiagnosis, ExtractedPrescription } from '../../types/ai.types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_SYSTEM_PROMPT = `Eres un asistente de documentación médica. Analiza transcripciones de consultas médicas en español.

Extrae la información y responde con este EXACTO formato JSON (usa estos nombres de campos en inglés):

{
  "symptoms": [{"description": "...", "severity": "mild|moderate|severe", "duration": "...", "onset": "..."}],
  "diagnosis": {"description": "...", "icdCode": "...", "confidence": 0.0-1.0} o null,
  "prescriptions": [{"medication": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}],
  "chiefComplaint": "..." o null,
  "summary": "resumen breve en español (2-3 oraciones)"
}

IMPORTANTE:
- USA EXACTAMENTE los nombres de campos mostrados arriba (en inglés)
- El contenido/valores pueden estar en español
- Si algo no se menciona, usa null o array vacío []
- Sé conservador con la confianza del diagnóstico`;

// Interface for existing records to maintain consistency
export interface ExistingRecords {
  symptoms: Array<{ name: string; severity?: number; duration?: string }>;
  prescriptions: Array<{ medicationName: string; dosage?: string; frequency?: string; duration?: string }>;
  diagnosis?: string;
}

interface GPTExtractionResponse {
  symptoms?: Array<{
    description?: string;
    severity?: string;
    duration?: string;
    onset?: string;
  }>;
  diagnosis?: {
    description?: string;
    icdCode?: string;
    confidence?: number;
  } | null;
  prescriptions?: Array<{
    medication?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  chiefComplaint?: string;
  summary?: string;
}

export class GPTService {
  async extractMedicalFields(
    transcription: string,
    existingRecords?: ExistingRecords
  ): Promise<ExtractionResult> {
    console.log('extractMedicalFields called with transcription:', transcription?.substring(0, 200) || 'EMPTY');

    if (!transcription || transcription.trim().length < 10) {
      console.log('Transcription too short, returning empty result');
      return this.getEmptyResult();
    }

    // Build context message with existing records to maintain naming consistency
    let contextMessage = '';
    if (existingRecords) {
      const parts: string[] = [];

      if (existingRecords.symptoms.length > 0) {
        parts.push(`Síntomas ya registrados (usa EXACTAMENTE estos nombres si aparecen en la transcripción):\n${existingRecords.symptoms.map(s => `- "${s.name}"`).join('\n')}`);
      }

      if (existingRecords.prescriptions.length > 0) {
        parts.push(`Medicamentos ya registrados (usa EXACTAMENTE estos nombres si aparecen en la transcripción):\n${existingRecords.prescriptions.map(p => `- "${p.medicationName}"`).join('\n')}`);
      }

      if (existingRecords.diagnosis) {
        parts.push(`Diagnóstico actual: "${existingRecords.diagnosis}"`);
      }

      if (parts.length > 0) {
        contextMessage = `CONTEXTO IMPORTANTE - Registros existentes en el expediente:\n${parts.join('\n\n')}\n\nSi la transcripción menciona alguno de estos síntomas o medicamentos, USA EL MISMO NOMBRE EXACTO que aparece arriba para mantener consistencia. Solo agrega nuevos items si son realmente diferentes.\n\n`;
      }
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: `${contextMessage}Transcripción:\n\n${transcription}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Lower temperature for more consistent naming
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return this.getEmptyResult();
      }

      try {
        const parsed = JSON.parse(content) as GPTExtractionResponse;
        console.log('GPT-4 raw response:', JSON.stringify(parsed).substring(0, 500));
        const normalized = this.normalizeResult(parsed);
        console.log('GPT-4 normalized result:', JSON.stringify(normalized).substring(0, 500));
        return normalized;
      } catch {
        console.error('Failed to parse GPT response:', content);
        return this.getEmptyResult();
      }
    } catch (error: unknown) {
      console.error('GPT extraction error:', error);

      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'rate_limit_exceeded') {
        throw new Error('Rate limit exceeded. Please try again.');
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Field extraction failed: ${errorMessage}`);
    }
  }

  async extractFieldsIncremental(transcription: string, existingRecords?: ExistingRecords): Promise<ExtractionResult> {
    if (transcription.trim().length < 20) {
      console.log('Transcription too short for extraction:', transcription.length, 'chars');
      return this.getEmptyResult();
    }

    console.log('Extracting from transcription:', transcription.substring(0, 100) + '...');

    // Build context for existing records
    let existingContext = '';
    if (existingRecords) {
      const parts: string[] = [];
      if (existingRecords.symptoms.length > 0) {
        parts.push(`Síntomas existentes: ${existingRecords.symptoms.map(s => `"${s.name}"`).join(', ')}`);
      }
      if (existingRecords.prescriptions.length > 0) {
        parts.push(`Medicamentos existentes: ${existingRecords.prescriptions.map(p => `"${p.medicationName}"`).join(', ')}`);
      }
      if (parts.length > 0) {
        existingContext = `\n\nIMPORTANTE: Si mencionas estos items, usa EXACTAMENTE los mismos nombres:\n${parts.join('\n')}`;
      }
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente médico. Analiza la transcripción de una consulta médica en español y extrae:
- symptoms: array de síntomas mencionados (cada uno con description, severity opcional: mild/moderate/severe, duration opcional, onset opcional)
- diagnosis: objeto con description, icdCode opcional, confidence (0-1), o null si no hay diagnóstico
- prescriptions: array de medicamentos recetados (cada uno con medication, dosage, frequency, duration, instructions opcional)
- summary: resumen breve de la consulta (2-3 oraciones)

Responde SOLO con JSON válido. Si no hay información para un campo, usa array vacío [] o null.${existingContext}`,
          },
          { role: 'user', content: `Transcripción de consulta médica:\n\n${transcription}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      console.log('GPT response:', content?.substring(0, 200));

      if (!content) return this.getEmptyResult();

      try {
        const result = this.normalizeResult(JSON.parse(content) as GPTExtractionResponse);
        console.log('Normalized result:', JSON.stringify(result).substring(0, 200));
        return result;
      } catch (parseError) {
        console.error('Failed to parse GPT response:', parseError);
        return this.getEmptyResult();
      }
    } catch (error) {
      console.error('GPT incremental extraction error:', error);
      return this.getEmptyResult();
    }
  }

  private normalizeResult(result: GPTExtractionResponse): ExtractionResult {
    const symptoms: ExtractedSymptom[] = Array.isArray(result.symptoms)
      ? result.symptoms
          .filter((s): s is { description: string; severity?: string; duration?: string; onset?: string } =>
            Boolean(s.description))
          .map((s) => ({
            description: s.description,
            severity: this.normalizeSeverity(s.severity),
            duration: s.duration,
            onset: s.onset,
          }))
      : [];

    const diagnosis: ExtractedDiagnosis | null = result.diagnosis?.description
      ? {
          description: result.diagnosis.description,
          icdCode: result.diagnosis.icdCode,
          confidence: Math.min(1, Math.max(0, result.diagnosis.confidence || 0.5)),
        }
      : null;

    const prescriptions: ExtractedPrescription[] = Array.isArray(result.prescriptions)
      ? result.prescriptions
          .filter((p): p is { medication: string; dosage?: string; frequency?: string; duration?: string; instructions?: string } =>
            Boolean(p.medication))
          .map((p) => ({
            medication: p.medication,
            dosage: p.dosage || 'No especificada',
            frequency: p.frequency || 'No especificada',
            duration: p.duration || 'No especificada',
            instructions: p.instructions,
          }))
      : [];

    return {
      symptoms,
      diagnosis,
      prescriptions,
      chiefComplaint: result.chiefComplaint,
      summary: result.summary,
    };
  }

  private normalizeSeverity(severity?: string): 'mild' | 'moderate' | 'severe' | undefined {
    if (!severity) return undefined;
    const lower = severity.toLowerCase();
    if (['mild', 'leve', 'light'].includes(lower)) return 'mild';
    if (['moderate', 'moderado', 'medium'].includes(lower)) return 'moderate';
    if (['severe', 'severo', 'grave', 'serious'].includes(lower)) return 'severe';
    return undefined;
  }

  private getEmptyResult(): ExtractionResult {
    return { symptoms: [], diagnosis: null, prescriptions: [] };
  }
}

export const gptService = new GPTService();
