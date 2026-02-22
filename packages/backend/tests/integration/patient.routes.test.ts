import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Patient Routes', () => {
  let token: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doctor@example.com',
        password: 'password123',
      });
    token = loginResponse.body.data.token;
  });

  describe('GET /api/v1/patients', () => {
    it('should return paginated patients', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
    });

    it('should search patients by name', async () => {
      const response = await request(app)
        .get('/api/v1/patients?search=Jane')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Search should work (may or may not have results depending on data)
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/patients');

      expect(response.status).toBe(401);
    });

    it('should accept pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/patients?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/v1/patients/:id', () => {
    it('should return patient by id with relations', async () => {
      // Get a patient that has an appointment with the provider
      const patient = await prisma.patient.findFirst({
        where: {
          appointments: {
            some: {},
          },
        },
      });

      if (!patient) {
        // Skip if no patients with appointments
        return;
      }

      const response = await request(app)
        .get(`/api/v1/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(patient.id);
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/v1/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/patients', () => {
    it('should create a new patient', async () => {
      const newPatient = {
        firstName: 'Nuevo',
        lastName: 'Paciente',
        dateOfBirth: '1995-05-15',
        sex: 'male',
        phone: '+1-555-0999',
        email: `test-${Date.now()}@example.com`,
        emergencyContactName: 'Contact Name',
        emergencyContactPhone: '+1-555-0998',
      };

      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send(newPatient);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(newPatient.firstName);
      expect(response.body.data.lastName).toBe(newPatient.lastName);

      // Cleanup
      await prisma.patient.delete({ where: { id: response.body.data.id } });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Test' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate sex enum', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: '1990-01-01',
          sex: 'invalid',
          phone: '+1-555-0000',
          emergencyContactName: 'Contact',
          emergencyContactPhone: '+1-555-0001',
        });

      expect(response.status).toBe(422);
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: 'not-a-date',
          sex: 'male',
          phone: '+1-555-0000',
          emergencyContactName: 'Contact',
          emergencyContactPhone: '+1-555-0001',
        });

      expect(response.status).toBe(422);
    });
  });

  describe('PUT /api/v1/patients/:id', () => {
    it('should update patient', async () => {
      // Get a patient that has an appointment with the provider
      const patient = await prisma.patient.findFirst({
        where: {
          appointments: {
            some: {},
          },
        },
      });

      if (!patient) {
        return;
      }

      const response = await request(app)
        .put(`/api/v1/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+1-555-9999' });

      expect(response.status).toBe(200);
      expect(response.body.data.phone).toBe('+1-555-9999');

      // Restore original phone
      await prisma.patient.update({
        where: { id: patient.id },
        data: { phone: patient.phone },
      });
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .put('/api/v1/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+1-555-1111' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/patients/:id', () => {
    it('should delete patient', async () => {
      // Create a patient to delete (without appointments)
      const patient = await prisma.patient.create({
        data: {
          firstName: 'ToDelete',
          lastName: 'Patient',
          dateOfBirth: new Date('2000-01-01'),
          sex: 'male',
          phone: '+1-555-0000',
          emergencyContactName: 'Contact',
          emergencyContactPhone: '+1-555-0001',
        },
      });

      // Get provider and create an appointment to link them
      const provider = await prisma.provider.findFirst();
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
        .delete(`/api/v1/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.patient.findUnique({ where: { id: patient.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .delete('/api/v1/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/patients/:id/appointments', () => {
    it('should return patient appointments', async () => {
      const patient = await prisma.patient.findFirst({
        where: {
          appointments: {
            some: {},
          },
        },
      });

      if (!patient) {
        return;
      }

      const response = await request(app)
        .get(`/api/v1/patients/${patient.id}/appointments`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
