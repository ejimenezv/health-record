import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Medical Record Routes', () => {
  let token: string;
  let providerId: string;
  let testAppointmentId: string;
  let testPatientId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const provider = await prisma.provider.findFirst();
    providerId = provider!.id;

    // Get a patient
    const patient = await prisma.patient.findFirst();
    testPatientId = patient!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doctor@example.com',
        password: 'password123',
      });
    token = loginResponse.body.data.token;

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
    // Clean up test data in order (prescriptions -> symptoms -> medical records -> vital signs -> appointments)
    await prisma.prescription.deleteMany({
      where: { medicalRecord: { appointmentId: testAppointmentId } },
    });
    await prisma.symptom.deleteMany({
      where: { medicalRecord: { appointmentId: testAppointmentId } },
    });
    await prisma.medicalRecord.deleteMany({
      where: { appointmentId: testAppointmentId },
    });
    await prisma.vitalSigns.deleteMany({
      where: { appointmentId: testAppointmentId },
    });
    await prisma.appointment.deleteMany({
      where: { id: testAppointmentId },
    });
  });

  // ============ MEDICAL RECORD TESTS ============

  describe('GET /api/v1/appointments/:appointmentId/record', () => {
    it('should return null when no medical record exists', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return medical record with symptoms and prescriptions', async () => {
      // Create medical record with data
      await prisma.medicalRecord.create({
        data: {
          appointmentId: testAppointmentId,
          chiefComplaint: 'Test complaint',
          diagnosis: 'Test diagnosis',
        },
      });

      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chiefComplaint).toBe('Test complaint');
      expect(response.body.data.symptoms).toBeDefined();
      expect(response.body.data.prescriptions).toBeDefined();
    });

    it('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .get('/api/v1/appointments/00000000-0000-0000-0000-000000000000/record')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/record`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/appointments/:appointmentId/record', () => {
    it('should create medical record when none exists', async () => {
      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chiefComplaint: 'Dolor de cabeza persistente',
          historyOfPresentIllness: 'Paciente refiere cefalea de 3 días',
          diagnosis: 'Cefalea tensional',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chiefComplaint).toBe('Dolor de cabeza persistente');
      expect(response.body.data.diagnosis).toBe('Cefalea tensional');
    });

    it('should update existing medical record', async () => {
      // Create first
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ chiefComplaint: 'Initial complaint' });

      // Update
      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chiefComplaint: 'Updated complaint',
          diagnosis: 'New diagnosis',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.chiefComplaint).toBe('Updated complaint');
      expect(response.body.data.diagnosis).toBe('New diagnosis');
    });
  });

  describe('PATCH /api/v1/appointments/:appointmentId/record', () => {
    it('should partially update medical record', async () => {
      // Create record first
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chiefComplaint: 'Initial complaint',
          diagnosis: 'Initial diagnosis',
        });

      // Partial update
      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          diagnosis: 'Updated diagnosis only',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.chiefComplaint).toBe('Initial complaint');
      expect(response.body.data.diagnosis).toBe('Updated diagnosis only');
    });

    it('should create record if none exists', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          diagnosis: 'Created via patch',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.diagnosis).toBe('Created via patch');
    });
  });

  describe('POST /api/v1/appointments/:appointmentId/record/complete', () => {
    it('should complete record with diagnosis', async () => {
      // Create record with diagnosis
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chiefComplaint: 'Test complaint',
          diagnosis: 'Test diagnosis',
        });

      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isDraft).toBe(false);

      // Verify appointment status was updated
      const appointment = await prisma.appointment.findUnique({
        where: { id: testAppointmentId },
      });
      expect(appointment?.status).toBe('completed');
    });

    it('should reject completion without diagnosis', async () => {
      // Create record without diagnosis
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chiefComplaint: 'Test complaint',
        });

      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject completion without record', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  // ============ SYMPTOMS TESTS ============

  describe('POST /api/v1/appointments/:appointmentId/record/symptoms', () => {
    it('should add a symptom', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          symptomName: 'Headache',
          bodySite: 'Bilateral temporal region',
          severity: 7,
          duration: '3 days',
          notes: 'Throbbing pain',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.symptomName).toBe('Headache');
      expect(response.body.data.severity).toBe(7);
      expect(response.body.data.isAIExtracted).toBe(false);
    });

    it('should add AI-extracted symptom', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          symptomName: 'Nausea',
          severity: 3,
          isAIExtracted: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isAIExtracted).toBe(true);
    });

    it('should fail without symptom name', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms`)
        .set('Authorization', `Bearer ${token}`)
        .send({ severity: 5 });

      expect(response.status).toBe(422);
    });

    it('should validate severity range', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          symptomName: 'Test',
          severity: 15, // Invalid: should be 1-10
        });

      expect(response.status).toBe(422);
    });
  });

  describe('PATCH /api/v1/appointments/:appointmentId/record/symptoms/:symptomId', () => {
    it('should update a symptom', async () => {
      // Create symptom first
      const createResponse = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms`)
        .set('Authorization', `Bearer ${token}`)
        .send({ symptomName: 'Original symptom' });

      const symptomId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointmentId}/record/symptoms/${symptomId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          symptomName: 'Updated symptom',
          severity: 8,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.symptomName).toBe('Updated symptom');
      expect(response.body.data.severity).toBe(8);
    });

    it('should return 404 for non-existent symptom', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointmentId}/record/symptoms/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .send({ symptomName: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/appointments/:appointmentId/record/symptoms/:symptomId', () => {
    it('should delete a symptom', async () => {
      // Create symptom
      const createResponse = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms`)
        .set('Authorization', `Bearer ${token}`)
        .send({ symptomName: 'To delete' });

      const symptomId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/appointments/${testAppointmentId}/record/symptoms/${symptomId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify deleted
      const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });
      expect(symptom).toBeNull();
    });
  });

  describe('POST /api/v1/appointments/:appointmentId/record/symptoms/batch', () => {
    it('should add multiple symptoms', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/symptoms/batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          symptoms: [
            { symptomName: 'Headache', severity: 7 },
            { symptomName: 'Nausea', severity: 3 },
            { symptomName: 'Fatigue', severity: 5 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.added).toBe(3);
      expect(response.body.data.symptoms).toHaveLength(3);
    });
  });

  // ============ PRESCRIPTIONS TESTS ============

  describe('POST /api/v1/appointments/:appointmentId/record/prescriptions', () => {
    it('should add a prescription', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/prescriptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          medicationName: 'Ibuprofen',
          strength: '400mg',
          dosage: '1 tablet',
          frequency: 'Every 6-8 hours',
          duration: '5 days',
          quantity: 20,
          refills: 0,
          instructions: 'Take with food',
          indication: 'Pain relief',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.medicationName).toBe('Ibuprofen');
      expect(response.body.data.strength).toBe('400mg');
      expect(response.body.data.isAIExtracted).toBe(false);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/prescriptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          medicationName: 'Ibuprofen',
          // Missing strength, dosage, frequency, instructions
        });

      expect(response.status).toBe(422);
    });
  });

  describe('PATCH /api/v1/appointments/:appointmentId/record/prescriptions/:prescriptionId', () => {
    it('should update a prescription', async () => {
      // Create prescription first
      const createResponse = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/prescriptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          medicationName: 'Ibuprofen',
          strength: '400mg',
          dosage: '1 tablet',
          frequency: 'Every 8 hours',
          instructions: 'Take with food',
        });

      const prescriptionId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointmentId}/record/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          quantity: 30,
          refills: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe(30);
      expect(response.body.data.refills).toBe(1);
    });
  });

  describe('DELETE /api/v1/appointments/:appointmentId/record/prescriptions/:prescriptionId', () => {
    it('should delete a prescription', async () => {
      // Create prescription
      const createResponse = await request(app)
        .post(`/api/v1/appointments/${testAppointmentId}/record/prescriptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          medicationName: 'To delete',
          strength: '100mg',
          dosage: '1 tablet',
          frequency: 'Daily',
          instructions: 'Take in morning',
        });

      const prescriptionId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/appointments/${testAppointmentId}/record/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
    });
  });

  // ============ VITAL SIGNS TESTS ============

  describe('GET /api/v1/appointments/:appointmentId/vital-signs', () => {
    it('should return null when no vital signs exist', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/vital-signs`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return vital signs when they exist', async () => {
      // Create vital signs
      await prisma.vitalSigns.create({
        data: {
          appointmentId: testAppointmentId,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          heartRate: 72,
        },
      });

      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointmentId}/vital-signs`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.bloodPressureSystolic).toBe(120);
      expect(response.body.data.heartRate).toBe(72);
    });
  });

  describe('PUT /api/v1/appointments/:appointmentId/vital-signs', () => {
    it('should create vital signs', async () => {
      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/vital-signs`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          heartRate: 72,
          temperature: 36.5,
          respiratoryRate: 16,
          oxygenSaturation: 98,
          weight: 70,
          height: 175,
          painLevel: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.bloodPressureSystolic).toBe(120);
      expect(response.body.data.heartRate).toBe(72);
      // BMI should be calculated
      expect(response.body.data.bmi).toBeDefined();
    });

    it('should update existing vital signs', async () => {
      // Create first
      await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/vital-signs`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
        });

      // Update
      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/vital-signs`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          heartRate: 80,
          temperature: 37.2,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.heartRate).toBe(80);
    });

    it('should validate blood pressure range', async () => {
      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointmentId}/vital-signs`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bloodPressureSystolic: 500, // Invalid
        });

      expect(response.status).toBe(422);
    });
  });

  // ============ AI SUGGESTIONS TESTS ============

  describe('DELETE /api/v1/appointments/:appointmentId/record/ai-suggestions', () => {
    it('should clear AI-extracted symptoms and prescriptions', async () => {
      // Create record with AI content
      await prisma.medicalRecord.create({
        data: {
          appointmentId: testAppointmentId,
          chiefComplaint: 'AI generated complaint',
          isAIGenerated: true,
          symptoms: {
            create: [
              { symptomName: 'AI symptom 1', isAIExtracted: true },
              { symptomName: 'Manual symptom', isAIExtracted: false },
            ],
          },
          prescriptions: {
            create: [
              {
                medicationName: 'AI Medication',
                strength: '100mg',
                dosage: '1 tablet',
                frequency: 'Daily',
                instructions: 'Take daily',
                isAIExtracted: true,
              },
            ],
          },
        },
      });

      const response = await request(app)
        .delete(`/api/v1/appointments/${testAppointmentId}/record/ai-suggestions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.symptomsRemoved).toBe(1);
      expect(response.body.data.prescriptionsRemoved).toBe(1);
      expect(response.body.data.fieldsCleared.length).toBeGreaterThan(0);

      // Verify manual symptom still exists
      const record = await prisma.medicalRecord.findFirst({
        where: { appointmentId: testAppointmentId },
        include: { symptoms: true },
      });
      expect(record?.symptoms).toHaveLength(1);
      expect(record?.symptoms[0].symptomName).toBe('Manual symptom');
    });
  });

  // ============ PROVIDER SCOPING TESTS ============

  describe('Provider scoping', () => {
    it('should not access another provider appointment', async () => {
      // Create another provider
      const otherProvider = await prisma.provider.create({
        data: {
          email: 'other@example.com',
          passwordHash: 'hash',
          firstName: 'Other',
          lastName: 'Doctor',
        },
      });

      // Create appointment for other provider
      const otherAppointment = await prisma.appointment.create({
        data: {
          patientId: testPatientId,
          providerId: otherProvider.id,
          appointmentDate: new Date(),
          appointmentType: 'follow_up',
          status: 'in_progress',
        },
      });

      // Try to access with current provider token
      const response = await request(app)
        .get(`/api/v1/appointments/${otherAppointment.id}/record`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);

      // Cleanup
      await prisma.appointment.delete({ where: { id: otherAppointment.id } });
      await prisma.provider.delete({ where: { id: otherProvider.id } });
    });
  });
});
