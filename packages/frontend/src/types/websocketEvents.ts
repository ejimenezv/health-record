export interface BaseEvent {
  event: string;
  session_id: string;
  timestamp: string;
}

export interface WSTranscriptUpdateEvent extends BaseEvent {
  event: 'transcript_update';
  data: {
    chunk_index: number;
    text: string;
    is_final: boolean;
    language: string;
    confidence: number;
  };
}

export interface WSSpeakerChangedEvent extends BaseEvent {
  event: 'speaker_changed';
  data: {
    speaker_id: string;
    role: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
    confidence: number;
    start_time: number;
  };
}

export type EntityType =
  | 'symptom'
  | 'diagnosis'
  | 'prescription'
  | 'vital_sign'
  | 'allergy'
  | 'procedure';

export interface WSExtractionUpdateEvent extends BaseEvent {
  event: 'extraction_update';
  data: {
    entity_type: EntityType;
    entity: {
      id: string;
      content: string;
      confidence: number;
      speaker?: string;
      timestamp: number;
      metadata?: Record<string, unknown>;
    };
    chunk_index: number;
  };
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AlertType =
  | 'drug_interaction'
  | 'allergy_conflict'
  | 'dosage_error'
  | 'contraindication'
  | 'missing_info';

export interface WSValidationAlertEvent extends BaseEvent {
  event: 'validation_alert';
  data: {
    alert_id: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    related_entities: string[];
    recommended_action?: string;
    requires_immediate_attention: boolean;
  };
}

export interface WSEntityValidatedEvent extends BaseEvent {
  event: 'entity_validated';
  data: {
    entity_id: string;
    entity_type: string;
    validation_status: 'approved' | 'flagged' | 'needs_review';
    confidence_score: number;
    validation_notes?: string;
  };
}

export interface WSCostUpdateEvent extends BaseEvent {
  event: 'cost_update';
  data: {
    transcription_cost_usd: number;
    extraction_cost_usd: number;
    total_cost_usd: number;
    chunks_processed: number;
    cache_hit_rate: number;
  };
}

export interface WSSessionCompleteEvent extends BaseEvent {
  event: 'session_complete';
  data: {
    status: 'success' | 'partial' | 'failed';
    final_transcript: string;
    total_chunks: number;
    total_entities: number;
    total_alerts: number;
    processing_time_ms: number;
    final_cost_summary: {
      transcription_cost_usd: number;
      extraction_cost_usd: number;
      total_cost_usd: number;
      audio_duration_seconds: number;
    };
  };
}

export interface WSErrorEvent extends BaseEvent {
  event: 'error';
  data: {
    error_code: string;
    message: string;
    details?: Record<string, unknown>;
    recoverable: boolean;
  };
}

export type WebSocketEvent =
  | WSTranscriptUpdateEvent
  | WSSpeakerChangedEvent
  | WSExtractionUpdateEvent
  | WSValidationAlertEvent
  | WSEntityValidatedEvent
  | WSCostUpdateEvent
  | WSSessionCompleteEvent
  | WSErrorEvent;
