import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Appointment Routes', () => {
  let token: string;
  let providerId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const provider = await prisma.provider.findFirst();
    providerId = provider!.id;
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

  describe('GET /api/v1/appointments', () => {
    it('should return paginated appointments', async () => {
      const response = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/appointments?status=scheduled')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by patient', async () => {
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const response = await request(app)
        .get(`/api/v1/appointments?patientId=${patient.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/appointments');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/appointments/today', () => {
    it('should return today appointments', async () => {
      const response = await request(app)
        .get('/api/v1/appointments/today')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/appointments/:id', () => {
    it('should return appointment by id', async () => {
      const appointment = await prisma.appointment.findFirst({
        where: { providerId },
      });

      if (!appointment) return;

      const response = await request(app)
        .get(`/api/v1/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(appointment.id);
      expect(response.body.data.patient).toBeDefined();
    });

    it('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .get('/api/v1/appointments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/appointments', () => {
    it('should create a new appointment', async () => {
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const newAppointment = {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        appointmentType: 'follow_up',
        reasonForVisit: 'Test appointment',
        durationMinutes: 30,
      };

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(newAppointment);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.patientId).toBe(patient.id);
      expect(response.body.data.status).toBe('scheduled');

      // Cleanup
      await prisma.appointment.delete({ where: { id: response.body.data.id } });
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId: '00000000-0000-0000-0000-000000000000',
          appointmentDate: new Date().toISOString(),
          appointmentType: 'follow_up',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Paciente no encontrado');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({ appointmentType: 'follow_up' });

      expect(response.status).toBe(422);
    });

    it('should validate appointment type', async () => {
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId: patient.id,
          appointmentDate: new Date().toISOString(),
          appointmentType: 'invalid_type',
        });

      expect(response.status).toBe(422);
    });
  });

  describe('PUT /api/v1/appointments/:id', () => {
    it('should update appointment', async () => {
      const appointment = await prisma.appointment.findFirst({
        where: { providerId, status: 'scheduled' },
      });

      if (!appointment) return;

      const response = await request(app)
        .put(`/api/v1/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasonForVisit: 'Updated reason' });

      expect(response.status).toBe(200);
      expect(response.body.data.reasonForVisit).toBe('Updated reason');

      // Restore
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reasonForVisit: appointment.reasonForVisit },
      });
    });

    it('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .put('/api/v1/appointments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ reasonForVisit: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/appointments/:id/status', () => {
    it('should update appointment status', async () => {
      // Create a new appointment to test status transitions
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          providerId,
          appointmentDate: new Date(),
          appointmentType: 'follow_up',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .patch(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'checked_in' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('checked_in');

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointment.id } });
    });

    it('should reject invalid status transition', async () => {
      // Create a completed appointment
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          providerId,
          appointmentDate: new Date(),
          appointmentType: 'follow_up',
          status: 'completed',
        },
      });

      const response = await request(app)
        .patch(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'scheduled' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Transición de estado inválida');

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointment.id } });
    });

    it('should validate status enum', async () => {
      const appointment = await prisma.appointment.findFirst({
        where: { providerId },
      });

      if (!appointment) return;

      const response = await request(app)
        .patch(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(422);
    });
  });

  describe('DELETE /api/v1/appointments/:id', () => {
    it('should delete appointment', async () => {
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          providerId,
          appointmentDate: new Date(),
          appointmentType: 'follow_up',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(deleted).toBeNull();
    });

    it('should not delete completed appointment', async () => {
      const patient = await prisma.patient.findFirst();
      if (!patient) return;

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          providerId,
          appointmentDate: new Date(),
          appointmentType: 'follow_up',
          status: 'completed',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No se puede eliminar');

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointment.id } });
    });

    it('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .delete('/api/v1/appointments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
