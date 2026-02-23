import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'El paciente refiere dolor de cabeza desde hace 3 días.',
          language: 'es',
          duration: 10,
          segments: [
            { start: 0, end: 5, text: 'El paciente refiere dolor de cabeza' },
            { start: 5, end: 10, text: 'desde hace 3 días.' },
          ],
        }),
      },
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                symptoms: [{ description: 'Dolor de cabeza', severity: 'moderate', duration: '3 días' }],
                diagnosis: { description: 'Cefalea tensional', confidence: 0.85 },
                prescriptions: [{
                  medication: 'Paracetamol',
                  dosage: '500mg',
                  frequency: 'Cada 8 horas',
                  duration: '5 días',
                  instructions: 'Tomar con alimentos',
                }],
                chiefComplaint: 'Dolor de cabeza persistente',
                summary: 'Paciente con cefalea de 3 días de evolución.',
              }),
            },
          }],
        }),
      },
    },
    models: { list: vi.fn().mockResolvedValue({ data: [] }) },
  })),
}));

describe('Transcription API', () => {
  let authToken: string;
  let testAppointmentId: string;
  let testPatientId: string;
  let providerId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Get provider and patient
    const provider = await prisma.provider.findFirst();
    providerId = provider!.id;

    const patient = await prisma.patient.findFirst();
    testPatientId = patient!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor@example.com', password: 'password123' });
    authToken = loginRes.body.data.token;

    // Create a fresh test appointment for each test
    const appointment = await prisma.appointment.create({
      data: {
        patientId: testPatientId,
        providerId,
        appointmentDate: new Date(),
        appointmentType: 'follow_up',
        status: 'in_progress',
      },
    });
    testAppointmentId = appointment.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.transcription.deleteMany({
      where: { appointmentId: testAppointmentId },
    });
    await prisma.appointment.deleteMany({
      where: { id: testAppointmentId },
    });
  });

  describe('GET /api/v1/appointments/:appointmentId/transcription', () => {
    it('should return 404 when no transcription exists', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/transcription`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return transcription when it exists', async () => {
      await prisma.transcription.create({
        data: {
          appointmentId: testAppointmentId,
          fullText: 'Test transcription text',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          durationSeconds: 120,
        },
      });

      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/transcription`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullText).toBe('Test transcription text');
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/transcription`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/00000000-0000-0000-0000-000000000000/transcription')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/ai/health', () => {
    it('should return AI service health status', async () => {
      const res = await request(app)
        .get('/api/v1/ai/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('whisper');
      expect(res.body.data).toHaveProperty('configured');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/ai/health');

      expect(res.status).toBe(401);
    });
  });
});

describe('Whisper Service (Mocked)', () => {
  it('should return mocked transcription', async () => {
    const { whisperService } = await import('../../src/services/ai/whisper.service.js');

    const result = await whisperService.transcribe(Buffer.from('test audio data'));

    expect(result.text).toContain('dolor de cabeza');
    expect(result.language).toBe('es');
    expect(result.duration).toBe(10);
  });

  it('should return health check status', async () => {
    const { whisperService } = await import('../../src/services/ai/whisper.service.js');

    const result = await whisperService.healthCheck();

    expect(typeof result).toBe('boolean');
  });
});

describe('GPT Service (Mocked)', () => {
  it('should extract medical fields', async () => {
    const { gptService } = await import('../../src/services/ai/gpt.service.js');

    const result = await gptService.extractMedicalFields(
      'Paciente con dolor de cabeza. Diagnóstico: cefalea. Receto paracetamol 500mg cada 8 horas por 5 días.'
    );

    expect(result.symptoms).toHaveLength(1);
    expect(result.symptoms[0].description).toBe('Dolor de cabeza');
    expect(result.diagnosis).toBeDefined();
    expect(result.diagnosis?.description).toBe('Cefalea tensional');
    expect(result.prescriptions).toHaveLength(1);
    expect(result.prescriptions[0].medication).toBe('Paracetamol');
  });

  it('should return empty result for short text', async () => {
    const { gptService } = await import('../../src/services/ai/gpt.service.js');

    const result = await gptService.extractMedicalFields('Hola');

    expect(result.symptoms).toHaveLength(0);
    expect(result.diagnosis).toBeNull();
    expect(result.prescriptions).toHaveLength(0);
  });

  it('should extract fields incrementally', async () => {
    const { gptService } = await import('../../src/services/ai/gpt.service.js');

    const result = await gptService.extractFieldsIncremental(
      'El paciente tiene dolor de cabeza desde hace 3 días. Le receto paracetamol.'
    );

    expect(result).toBeDefined();
    expect(result.symptoms).toBeDefined();
    expect(result.prescriptions).toBeDefined();
  });
});

describe('Transcription Service', () => {
  let testAppointmentId: string;
  let testPatientId: string;
  let providerId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const provider = await prisma.provider.findFirst();
    providerId = provider!.id;

    const patient = await prisma.patient.findFirst();
    testPatientId = patient!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: testPatientId,
        providerId,
        appointmentDate: new Date(),
        appointmentType: 'follow_up',
        status: 'in_progress',
      },
    });
    testAppointmentId = appointment.id;
  });

  afterEach(async () => {
    await prisma.transcription.deleteMany({
      where: { appointmentId: testAppointmentId },
    });
    await prisma.appointment.deleteMany({
      where: { id: testAppointmentId },
    });
  });

  it('should start a transcription session', async () => {
    const { transcriptionService } = await import('../../src/services/transcription.service.js');

    const sessionId = await transcriptionService.startSession(testAppointmentId, providerId);

    expect(sessionId).toBeDefined();
    expect(sessionId).toContain('session-');
    expect(sessionId).toContain(testAppointmentId);

    // Verify transcription was created in database
    const transcription = await prisma.transcription.findFirst({
      where: { appointmentId: testAppointmentId },
    });
    expect(transcription).toBeDefined();
    expect(transcription?.status).toBe('recording');
  });

  it('should return existing session if one is active', async () => {
    const { transcriptionService } = await import('../../src/services/transcription.service.js');

    const sessionId1 = await transcriptionService.startSession(testAppointmentId, providerId);
    const sessionId2 = await transcriptionService.startSession(testAppointmentId, providerId);

    expect(sessionId1).toBe(sessionId2);

    // Cleanup
    await transcriptionService.cancelSession(sessionId1);
  });

  it('should throw error for non-existent appointment', async () => {
    const { transcriptionService } = await import('../../src/services/transcription.service.js');

    await expect(
      transcriptionService.startSession('00000000-0000-0000-0000-000000000000', providerId)
    ).rejects.toThrow('Cita no encontrada');
  });

  it('should cancel a transcription session', async () => {
    const { transcriptionService } = await import('../../src/services/transcription.service.js');

    const sessionId = await transcriptionService.startSession(testAppointmentId, providerId);
    await transcriptionService.cancelSession(sessionId);

    // Verify session is removed
    const session = transcriptionService.getSession(sessionId);
    expect(session).toBeUndefined();

    // Verify database status
    const transcription = await prisma.transcription.findFirst({
      where: { appointmentId: testAppointmentId },
    });
    expect(transcription?.status).toBe('cancelled');
  });
});
