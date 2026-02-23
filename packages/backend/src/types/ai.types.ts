export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language: string;
  duration: number;
}

export interface ExtractedSymptom {
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  onset?: string;
}

export interface ExtractedDiagnosis {
  description: string;
  icdCode?: string;
  confidence: number;
}

export interface ExtractedPrescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ExtractionResult {
  symptoms: ExtractedSymptom[];
  diagnosis: ExtractedDiagnosis | null;
  prescriptions: ExtractedPrescription[];
  chiefComplaint?: string;
  summary?: string;
}

export interface TranscriptionSession {
  id: string;
  appointmentId: string;
  userId: string;
  status: 'active' | 'processing' | 'completed' | 'error';
  startedAt: Date;
  chunks: AudioChunk[];
  fullTranscription: string;
  webmHeader?: Buffer; // WebM header from first chunk, prepended to subsequent chunks
}

export interface AudioChunk {
  index: number;
  buffer: Buffer;
  timestamp: number;
  transcription?: string;
}
