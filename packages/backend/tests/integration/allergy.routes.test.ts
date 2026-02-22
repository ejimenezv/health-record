import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Allergy Routes', () => {
  let token: string;
  let testPatientId: string;
  let testAllergyId: string;

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
        firstName: 'AllergyTest',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male',
        phone: '+1-555-0100',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+1-555-0101',
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
    // Cleanup test patient (cascades to allergies and appointments)
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

  describe('POST /api/v1/patients/:patientId/allergies', () => {
    it('should create a new allergy for a patient', async () => {
      const newAllergy = {
        allergen: 'Penicilina',
        reaction: 'Urticaria',
        severity: 'moderate',
      };

      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/allergies`)
        .set('Authorization', `Bearer ${token}`)
        .send(newAllergy);

      expect(response.status).toBe(201);
      expect(response.body.allergen).toBe(newAllergy.allergen);
      expect(response.body.reaction).toBe(newAllergy.reaction);
      expect(response.body.severity).toBe(newAllergy.severity);

      testAllergyId = response.body.id;
    });

    it('should validate required allergen field', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/allergies`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reaction: 'Urticaria' });

      expect(response.status).toBe(422);
    });

    it('should validate severity enum', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/allergies`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          allergen: 'Test',
          severity: 'invalid_severity',
        });

      expect(response.status).toBe(422);
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/v1/patients/00000000-0000-0000-0000-000000000000/allergies')
        .set('Authorization', `Bearer ${token}`)
        .send({ allergen: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/patients/${testPatientId}/allergies`)
        .send({ allergen: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/patients/:patientId/allergies', () => {
    it('should return all allergies for a patient', async () => {
      const response = await request(app)
        .get(`/api/v1/patients/${testPatientId}/allergies`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for patient with no allergies', async () => {
      // Create a new patient without allergies
      const provider = await prisma.provider.findFirst({
        where: { email: 'doctor@example.com' },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'NoAllergy',
          lastName: 'Patient',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'female',
          phone: '+1-555-0200',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+1-555-0201',
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
        .get(`/api/v1/patients/${patient.id}/allergies`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      // Cleanup
      await prisma.patient.delete({ where: { id: patient.id } });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/patients/${testPatientId}/allergies`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/allergies/:id', () => {
    it('should return allergy by id', async () => {
      const response = await request(app)
        .get(`/api/v1/allergies/${testAllergyId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testAllergyId);
      expect(response.body.allergen).toBe('Penicilina');
    });

    it('should return 404 for non-existent allergy', async () => {
      const response = await request(app)
        .get('/api/v1/allergies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/allergies/:id', () => {
    it('should update an allergy', async () => {
      const response = await request(app)
        .put(`/api/v1/allergies/${testAllergyId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reaction: 'Dificultad para respirar',
          severity: 'severe',
        });

      expect(response.status).toBe(200);
      expect(response.body.reaction).toBe('Dificultad para respirar');
      expect(response.body.severity).toBe('severe');
    });

    it('should return 404 for non-existent allergy', async () => {
      const response = await request(app)
        .put('/api/v1/allergies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ reaction: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/allergies/:id', () => {
    it('should delete an allergy', async () => {
      // Create an allergy to delete
      const allergy = await prisma.allergy.create({
        data: {
          patientId: testPatientId,
          allergen: 'ToDelete',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/allergies/${allergy.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify deleted
      const deleted = await prisma.allergy.findUnique({ where: { id: allergy.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent allergy', async () => {
      const response = await request(app)
        .delete('/api/v1/allergies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
