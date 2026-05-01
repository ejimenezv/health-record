import prisma from '../config/database.js';
import type {
  WebSocketEvent,
  WSCostUpdateEvent,
  WSEntityValidatedEvent,
  WSErrorEvent,
  WSExtractionUpdateEvent,
  WSSessionCompleteEvent,
  WSSpeakerChangedEvent,
  WSTranscriptUpdateEvent,
  WSValidationAlertEvent,
} from '../types/websocket-events.js';

/**
 * Persists WebSocket events from the Python AI service to PostgreSQL.
 * All methods accept the Python `sessionId` (the AI service's external ID)
 * and resolve it to the AiSession primary key internally.
 */
export class EventPersistenceService {
  private async resolveSessionPk(externalSessionId: string): Promise<string | null> {
    const row = await prisma.aiSession.findUnique({
      where: { sessionId: externalSessionId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async persist(externalSessionId: string, event: WebSocketEvent): Promise<void> {
    switch (event.event) {
      case 'transcript_update':
        return this.saveTranscriptEvent(externalSessionId, event);
      case 'speaker_changed':
        return this.saveSpeakerChangeEvent(externalSessionId, event);
      case 'extraction_update':
        return this.saveExtractionEvent(externalSessionId, event);
      case 'validation_alert':
        return this.saveValidationAlert(externalSessionId, event);
      case 'entity_validated':
        return this.saveEntityValidatedEvent(externalSessionId, event);
      case 'cost_update':
        return this.saveCostEvent(externalSessionId, event);
      case 'session_complete':
        return this.saveSessionComplete(externalSessionId, event);
      case 'error':
        return this.saveErrorEvent(externalSessionId, event);
    }
  }

  async saveTranscriptEvent(
    externalSessionId: string,
    event: WSTranscriptUpdateEvent
  ): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;
    await prisma.transcriptionEvent.create({
      data: {
        sessionId,
        eventType: 'transcript_update',
        chunkIndex: event.data.chunk_index,
        text: event.data.text,
        confidence: event.data.confidence,
        isFinal: event.data.is_final,
        eventData: event as unknown as object,
      },
    });
  }

  async saveSpeakerChangeEvent(
    externalSessionId: string,
    event: WSSpeakerChangedEvent
  ): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;
    await prisma.transcriptionEvent.create({
      data: {
        sessionId,
        eventType: 'speaker_changed',
        speakerId: event.data.speaker_id,
        speakerRole: event.data.role,
        confidence: event.data.confidence,
        startTime: event.data.start_time,
        eventData: event as unknown as object,
      },
    });
  }

  async saveExtractionEvent(
    externalSessionId: string,
    event: WSExtractionUpdateEvent
  ): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;
    await prisma.extractionEvent.create({
      data: {
        sessionId,
        eventType: 'extraction_update',
        entityId: event.data.entity.id,
        entityType: event.data.entity_type,
        content: event.data.entity.content,
        confidence: event.data.entity.confidence,
        chunkIndex: event.data.chunk_index,
        speaker: event.data.entity.speaker,
        eventData: event as unknown as object,
      },
    });
  }

  async saveValidationAlert(
    externalSessionId: string,
    event: WSValidationAlertEvent
  ): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;
    await prisma.validationAlert.create({
      data: {
        sessionId,
        alertId: event.data.alert_id,
        alertType: event.data.type,
        severity: event.data.severity,
        message: event.data.message,
        relatedEntities: event.data.related_entities,
        recommendedAction: event.data.recommended_action,
        requiresImmediateAttention: event.data.requires_immediate_attention,
        eventData: event as unknown as object,
      },
    });

    if (event.data.severity === 'CRITICAL') {
      console.warn('[ai-session] CRITICAL validation alert persisted', {
        sessionId: externalSessionId,
        alertId: event.data.alert_id,
        type: event.data.type,
      });
    }
  }

  async saveEntityValidatedEvent(
    externalSessionId: string,
    event: WSEntityValidatedEvent
  ): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;
    await prisma.extractionEvent.create({
      data: {
        sessionId,
        eventType: 'entity_validated',
        entityId: event.data.entity_id,
        entityType: event.data.entity_type,
        validationStatus: event.data.validation_status,
        confidence: event.data.confidence_score,
        eventData: event as unknown as object,
      },
    });
  }

  async saveCostEvent(externalSessionId: string, event: WSCostUpdateEvent): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;
    await prisma.$transaction([
      prisma.costEvent.create({
        data: {
          sessionId,
          transcriptionCostUsd: event.data.transcription_cost_usd,
          extractionCostUsd: event.data.extraction_cost_usd,
          totalCostUsd: event.data.total_cost_usd,
          chunksProcessed: event.data.chunks_processed,
          cacheHitRate: event.data.cache_hit_rate,
          eventData: event as unknown as object,
        },
      }),
      prisma.aiSession.update({
        where: { id: sessionId },
        data: { totalCostUsd: event.data.total_cost_usd },
      }),
    ]);
  }

  async saveSessionComplete(
    externalSessionId: string,
    event: WSSessionCompleteEvent
  ): Promise<void> {
    await prisma.aiSession.update({
      where: { sessionId: externalSessionId },
      data: {
        status: event.data.status,
        completedAt: new Date(),
        finalTranscript: event.data.final_transcript,
        totalCostUsd: event.data.final_cost_summary.total_cost_usd,
        audioDurationSeconds: event.data.final_cost_summary.audio_duration_seconds,
      },
    });
  }

  async saveErrorEvent(externalSessionId: string, event: WSErrorEvent): Promise<void> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) return;

    await prisma.transcriptionEvent.create({
      data: {
        sessionId,
        eventType: 'error',
        text: event.data.message,
        eventData: event as unknown as object,
      },
    });

    if (!event.data.recoverable) {
      await prisma.aiSession.update({
        where: { id: sessionId },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * Get all events for a session (for playback / history).
   */
  async getSessionEvents(externalSessionId: string): Promise<{
    transcriptEvents: unknown[];
    extractionEvents: unknown[];
    validationAlerts: unknown[];
    costEvents: unknown[];
  }> {
    const sessionId = await this.resolveSessionPk(externalSessionId);
    if (!sessionId) {
      throw new Error(`Session not found: ${externalSessionId}`);
    }

    const [transcriptEvents, extractionEvents, validationAlerts, costEvents] =
      await Promise.all([
        prisma.transcriptionEvent.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
        }),
        prisma.extractionEvent.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
        }),
        prisma.validationAlert.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
        }),
        prisma.costEvent.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
        }),
      ]);

    return { transcriptEvents, extractionEvents, validationAlerts, costEvents };
  }
}

export const eventPersistence = new EventPersistenceService();
