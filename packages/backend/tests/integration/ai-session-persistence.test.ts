import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../../src/config/database.js';
import { eventPersistence } from '../../src/services/event-persistence.service.js';
import type {
  WSCostUpdateEvent,
  WSEntityValidatedEvent,
  WSErrorEvent,
  WSExtractionUpdateEvent,
  WSSessionCompleteEvent,
  WSSpeakerChangedEvent,
  WSTranscriptUpdateEvent,
  WSValidationAlertEvent,
} from '../../src/types/websocket-events.js';

const EXTERNAL_SESSION_ID = `test-session-${Date.now()}`;

describe('Event persistence service', () => {
  beforeAll(async () => {
    await prisma.aiSession.create({
      data: {
        sessionId: EXTERNAL_SESSION_ID,
        appointmentType: 'general_consultation',
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    await prisma.aiSession.delete({ where: { sessionId: EXTERNAL_SESSION_ID } });
    await prisma.$disconnect();
  });

  it('persists transcript_update events', async () => {
    const event: WSTranscriptUpdateEvent = {
      event: 'transcript_update',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: {
        chunk_index: 0,
        text: 'Buenos días doctor',
        is_final: false,
        language: 'es',
        confidence: 0.95,
      },
    };

    await eventPersistence.saveTranscriptEvent(EXTERNAL_SESSION_ID, event);

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: EXTERNAL_SESSION_ID },
    });
    const rows = await prisma.transcriptionEvent.findMany({
      where: { sessionId: session.id, eventType: 'transcript_update' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe('Buenos días doctor');
    expect(Number(rows[0]?.confidence)).toBeCloseTo(0.95);
  });

  it('persists speaker_changed events', async () => {
    const event: WSSpeakerChangedEvent = {
      event: 'speaker_changed',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: { speaker_id: 'spk_1', role: 'DOCTOR', confidence: 0.88, start_time: 1.25 },
    };
    await eventPersistence.saveSpeakerChangeEvent(EXTERNAL_SESSION_ID, event);

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: EXTERNAL_SESSION_ID },
    });
    const rows = await prisma.transcriptionEvent.findMany({
      where: { sessionId: session.id, eventType: 'speaker_changed' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.speakerRole).toBe('DOCTOR');
  });

  it('persists extraction_update + entity_validated events', async () => {
    const extraction: WSExtractionUpdateEvent = {
      event: 'extraction_update',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: {
        entity_type: 'symptom',
        entity: { id: 'ent_1', content: 'dolor de cabeza', confidence: 0.92, timestamp: 2 },
        chunk_index: 1,
      },
    };
    const validated: WSEntityValidatedEvent = {
      event: 'entity_validated',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: {
        entity_id: 'ent_1',
        entity_type: 'symptom',
        validation_status: 'approved',
        confidence_score: 0.96,
      },
    };

    await eventPersistence.saveExtractionEvent(EXTERNAL_SESSION_ID, extraction);
    await eventPersistence.saveEntityValidatedEvent(EXTERNAL_SESSION_ID, validated);

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: EXTERNAL_SESSION_ID },
    });
    const rows = await prisma.extractionEvent.findMany({
      where: { sessionId: session.id, entityId: 'ent_1' },
      orderBy: { id: 'asc' },
    });
    expect(rows.map((r) => r.eventType)).toEqual(['extraction_update', 'entity_validated']);
    expect(rows[1]?.validationStatus).toBe('approved');
  });

  it('persists CRITICAL validation_alert', async () => {
    const event: WSValidationAlertEvent = {
      event: 'validation_alert',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: {
        alert_id: `alert-${Date.now()}`,
        type: 'drug_interaction',
        severity: 'CRITICAL',
        message: 'Interacción grave entre medicamentos',
        related_entities: ['ent_1', 'ent_2'],
        recommended_action: 'Revisar prescripción',
        requires_immediate_attention: true,
      },
    };
    await eventPersistence.saveValidationAlert(EXTERNAL_SESSION_ID, event);

    const row = await prisma.validationAlert.findUniqueOrThrow({
      where: { alertId: event.data.alert_id },
    });
    expect(row.severity).toBe('CRITICAL');
    expect(row.requiresImmediateAttention).toBe(true);
    expect(row.relatedEntities).toEqual(['ent_1', 'ent_2']);
  });

  it('persists cost_update and updates session total cost', async () => {
    const event: WSCostUpdateEvent = {
      event: 'cost_update',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: {
        transcription_cost_usd: 0.01,
        extraction_cost_usd: 0.02,
        total_cost_usd: 0.03,
        chunks_processed: 5,
        cache_hit_rate: 0.4,
      },
    };
    await eventPersistence.saveCostEvent(EXTERNAL_SESSION_ID, event);

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: EXTERNAL_SESSION_ID },
    });
    expect(Number(session.totalCostUsd)).toBeCloseTo(0.03);
    const costs = await prisma.costEvent.findMany({ where: { sessionId: session.id } });
    expect(costs).toHaveLength(1);
  });

  it('marks session failed on non-recoverable error', async () => {
    const event: WSErrorEvent = {
      event: 'error',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: { error_code: 'FATAL', message: 'Pipeline crashed', recoverable: false },
    };
    await eventPersistence.saveErrorEvent(EXTERNAL_SESSION_ID, event);

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: EXTERNAL_SESSION_ID },
    });
    expect(session.status).toBe('failed');
  });

  it('finalizes session on session_complete', async () => {
    const event: WSSessionCompleteEvent = {
      event: 'session_complete',
      session_id: EXTERNAL_SESSION_ID,
      timestamp: new Date().toISOString(),
      data: {
        status: 'success',
        final_transcript: 'Transcripción final completa.',
        total_chunks: 10,
        total_entities: 4,
        total_alerts: 1,
        processing_time_ms: 4321,
        final_cost_summary: {
          transcription_cost_usd: 0.05,
          extraction_cost_usd: 0.07,
          total_cost_usd: 0.12,
          audio_duration_seconds: 180,
        },
      },
    };
    await eventPersistence.saveSessionComplete(EXTERNAL_SESSION_ID, event);

    const session = await prisma.aiSession.findUniqueOrThrow({
      where: { sessionId: EXTERNAL_SESSION_ID },
    });
    expect(session.status).toBe('success');
    expect(session.finalTranscript).toBe('Transcripción final completa.');
    expect(Number(session.totalCostUsd)).toBeCloseTo(0.12);
    expect(session.audioDurationSeconds).toBe(180);
    expect(session.completedAt).not.toBeNull();
  });

  it('returns aggregated events from getSessionEvents', async () => {
    const events = await eventPersistence.getSessionEvents(EXTERNAL_SESSION_ID);
    expect(events.transcriptEvents.length).toBeGreaterThan(0);
    expect(events.extractionEvents.length).toBeGreaterThan(0);
    expect(events.validationAlerts.length).toBeGreaterThan(0);
    expect(events.costEvents.length).toBeGreaterThan(0);
  });
});
