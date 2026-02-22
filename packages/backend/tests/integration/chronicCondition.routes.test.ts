import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Chronic Condition Routes', () => {
  let token: string;
  let testPatientId: string;
  let testConditionId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doctor@example.com',
        password: 'password123',
      });
    token = loginResponse.body.data.token;

    // Get provider id
    const provider = await prisma.provider.findFirst({
      where: { email: 'doctor@example.com' },
    });

    // Create a test patient with an appointment to link to the provider
    const patient = await prisma.patient.create({
      data: {
        firstName: 'ConditionTest',
        lastName: 'Patient',
        dateOfBirth: new Date('1985-06-15'),
        sex: 'female',
        phone: '+1-555-0300',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+1-555-0301',
      },
    });
    testPatientId = patient.id;

    // Create an appointment to link patient to provider
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        providerId: provider!.id,
        appointmentDate: new Date(),
        appointmentType: 'new_patient',
        status: 'scheduled',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test patient (cascades to chronic conditions and appointments)
    await prisma.patient.delete({ where: { id: testPatientId } }).catch(() => {});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Re-login to ensure fresh token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doctor@example.com',
        password: 'password123',
      });
    token = loginResponse.body.data.token;
  });

  describe('POST /api/v1/patients/:patientId/chronic-conditions', () => {
    it('should create a new chronic condition for a patient', async () => {
      const newCondition = {
        conditionName: 'Diabetes Tipo 2',
        status: 'active',
        notes: 'Diagnosticado en 2020',
      };

      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/chronic-conditions`)
        .set('Authorization', `Bearer ${token}`)
        .send(newCondition);

      expect(response.status).toBe(201);
      expect(response.body.conditionName).toBe(newCondition.conditionName);
      expect(response.body.status).toBe(newCondition.status);
      expect(response.body.notes).toBe(newCondition.notes);

      testConditionId = response.body.id;
    });

    it('should validate required conditionName field', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/chronic-conditions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'active' });

      expect(response.status).toBe(422);
    });

    it('should validate status enum', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/chronic-conditions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          conditionName: 'Test',
          status: 'invalid_status',
        });

      expect(response.status).toBe(422);
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/v1/patients/00000000-0000-0000-0000-000000000000/chronic-conditions')
        .set('Authorization', `Bearer ${token}`)
        .send({ conditionName: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/chronic-conditions`)
        .send({ conditionName: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should create condition with default status when not provided', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/chronic-conditions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ conditionName: 'Hipertension' });

      expect(response.status).toBe(201);
      expect(response.body.conditionName).toBe('Hipertension');
      expect(response.body.status).toBe('active');

      // Cleanup
      await prisma.chronicCondition.delete({ where: { id: response.body.id } });
    });
  });

  describe('GET /api/v1/patients/:patientId/chronic-conditions', () => {
    it('should return all chronic conditions for a patient', async () => {
      const response = await request(app)
        .get(`/api/v1/patients/${testPatientId}/chronic-conditions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for patient with no conditions', async () => {
      // Create a new patient without conditions
      const provider = await prisma.provider.findFirst({
        where: { email: 'doctor@example.com' },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'NoCondition',
          lastName: 'Patient',
          dateOfBirth: new Date('1992-03-20'),
          sex: 'male',
          phone: '+1-555-0400',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+1-555-0401',
        },
      });

      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          providerId: provider!.id,
          appointmentDate: new Date(),
          appointmentType: 'new_patient',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .get(`/api/v1/patients/${patient.id}/chronic-conditions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      // Cleanup
      await prisma.patient.delete({ where: { id: patient.id } });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/patients/${testPatientId}/chronic-conditions`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/chronic-conditions/:id', () => {
    it('should return chronic condition by id', async () => {
      const response = await request(app)
        .get(`/api/v1/chronic-conditions/${testConditionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testConditionId);
      expect(response.body.conditionName).toBe('Diabetes Tipo 2');
    });

    it('should return 404 for non-existent condition', async () => {
      const response = await request(app)
        .get('/api/v1/chronic-conditions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/chronic-conditions/:id', () => {
    it('should update a chronic condition', async () => {
      const response = await request(app)
        .put(`/api/v1/chronic-conditions/${testConditionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'managed',
          notes: 'Controlado con medicamento',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('managed');
      expect(response.body.notes).toBe('Controlado con medicamento');
    });

    it('should update condition name', async () => {
      const response = await request(app)
        .put(`/api/v1/chronic-conditions/${testConditionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          conditionName: 'Diabetes Mellitus Tipo 2',
        });

      expect(response.status).toBe(200);
      expect(response.body.conditionName).toBe('Diabetes Mellitus Tipo 2');
    });

    it('should return 404 for non-existent condition', async () => {
      const response = await request(app)
        .put('/api/v1/chronic-conditions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'resolved' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/chronic-conditions/:id', () => {
    it('should delete a chronic condition', async () => {
      // Create a condition to delete
      const condition = await prisma.chronicCondition.create({
        data: {
          patientId: testPatientId,
          conditionName: 'ToDelete',
          status: 'active',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/chronic-conditions/${condition.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify deleted
      const deleted = await prisma.chronicCondition.findUnique({ where: { id: condition.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent condition', async () => {
      const response = await request(app)
        .delete('/api/v1/chronic-conditions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Condition status transitions', () => {
    it('should allow transitioning from active to managed', async () => {
      const condition = await prisma.chronicCondition.create({
        data: {
          patientId: testPatientId,
          conditionName: 'StatusTest',
          status: 'active',
        },
      });

      const response = await request(app)
        .put(`/api/v1/chronic-conditions/${condition.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'managed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('managed');

      // Cleanup
      await prisma.chronicCondition.delete({ where: { id: condition.id } });
    });

    it('should allow transitioning from managed to resolved', async () => {
      const condition = await prisma.chronicCondition.create({
        data: {
          patientId: testPatientId,
          conditionName: 'ResolvedTest',
          status: 'managed',
        },
      });

      const response = await request(app)
        .put(`/api/v1/chronic-conditions/${condition.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'resolved' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('resolved');

      // Cleanup
      await prisma.chronicCondition.delete({ where: { id: condition.id } });
    });
  });
});
