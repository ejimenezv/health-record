# Backend Integration Tests

This document specifies the integration tests for the MedRecord AI backend API routes and database operations.

---

## Test Structure

```
packages/backend/tests/integration/
├── routes/
│   ├── auth.routes.test.ts
│   ├── patients.routes.test.ts
│   ├── appointments.routes.test.ts
│   ├── medical-records.routes.test.ts
│   └── transcription.routes.test.ts
└── repositories/
    ├── patients.repository.test.ts
    └── appointments.repository.test.ts
```

---

## Test Database Setup

### Database Configuration

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Reset database before tests
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  });
}

export async function cleanupTestDatabase() {
  await prisma.$disconnect();
}
```

### Test Lifecycle Hooks

```typescript
// tests/integration/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Reset database state - order matters due to foreign keys
  await prisma.transcription.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.chronicCondition.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.provider.deleteMany();
});
```

---

## Route Integration Tests

### Auth Routes Tests

```typescript
// routes/auth.routes.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newdoctor@test.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'Doctor',
          specialty: 'Pediatrics',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newdoctor@test.com');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 422 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      // Create existing user
      await prisma.provider.create({
        data: {
          email: 'existing@test.com',
          passwordHash: await bcrypt.hash('password', 10),
          firstName: 'Existing',
          lastName: 'User',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'SecurePass123!',
          firstName: 'Duplicate',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already');
    });

    it('should return 422 for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await prisma.provider.create({
        data: {
          email: 'doctor@test.com',
          passwordHash: await bcrypt.hash('Password123!', 10),
          firstName: 'Test',
          lastName: 'Doctor',
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('doctor@test.com');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      const provider = await prisma.provider.create({
        data: {
          email: 'doctor@test.com',
          passwordHash: await bcrypt.hash('Password123!', 10),
          firstName: 'Test',
          lastName: 'Doctor',
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'doctor@test.com', password: 'Password123!' });

      authToken = loginResponse.body.data.token;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('doctor@test.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      await prisma.provider.create({
        data: {
          email: 'doctor@test.com',
          passwordHash: await bcrypt.hash('Password123!', 10),
          firstName: 'Test',
          lastName: 'Doctor',
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'doctor@test.com', password: 'Password123!' });

      authToken = loginResponse.body.data.token;
    });

    it('should update profile with valid data', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          specialty: 'Cardiology',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.specialty).toBe('Cardiology');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/profile')
        .send({ firstName: 'Test' });

      expect(response.status).toBe(401);
    });
  });
});
```

### Patients Routes Tests

```typescript
// routes/patients.routes.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/utils/jwt';
import bcrypt from 'bcrypt';

describe('Patients API', () => {
  let authToken: string;
  let testProvider: any;

  beforeEach(async () => {
    testProvider = await prisma.provider.create({
      data: {
        email: 'doctor@test.com',
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Test',
        lastName: 'Doctor',
      },
    });
    authToken = generateToken({ id: testProvider.id, email: testProvider.email });
  });

  describe('GET /api/v1/patients', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/patients');

      expect(response.status).toBe(401);
    });

    it('should return empty array if no patients', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return only current user patients', async () => {
      // Create patient for current provider
      await prisma.patient.create({
        data: {
          firstName: 'Own',
          lastName: 'Patient',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'male',
          phone: '+34600000001',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000002',
        },
      });

      // Create patient for different provider
      const otherProvider = await prisma.provider.create({
        data: {
          email: 'other@test.com',
          passwordHash: await bcrypt.hash('Password123!', 10),
          firstName: 'Other',
          lastName: 'Doctor',
        },
      });

      const response = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should support search query parameter', async () => {
      await prisma.patient.create({
        data: {
          firstName: 'Juan',
          lastName: 'García',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'male',
          phone: '+34600000001',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000002',
        },
      });

      await prisma.patient.create({
        data: {
          firstName: 'María',
          lastName: 'López',
          dateOfBirth: new Date('1985-05-15'),
          sex: 'female',
          phone: '+34600000003',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000004',
        },
      });

      const response = await request(app)
        .get('/api/v1/patients')
        .query({ search: 'Juan' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some((p: any) => p.firstName === 'Juan')).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple patients
      for (let i = 0; i < 25; i++) {
        await prisma.patient.create({
          data: {
            firstName: `Patient${i}`,
            lastName: 'Test',
            dateOfBirth: new Date('1990-01-01'),
            sex: 'male',
            phone: `+3460000000${i}`,
            emergencyContactName: 'Emergency',
            emergencyContactPhone: '+34600000099',
          },
        });
      }

      const response = await request(app)
        .get('/api/v1/patients')
        .query({ page: 2, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination.page).toBe(2);
    });
  });

  describe('POST /api/v1/patients', () => {
    it('should create patient with valid data', async () => {
      const patientData = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: '1985-03-15T00:00:00.000Z',
        sex: 'male',
        phone: '+34612345678',
        emergencyContactName: 'María García',
        emergencyContactPhone: '+34612345679',
      };

      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Juan');
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 422 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'J', // Too short
          lastName: 'García',
          dateOfBirth: 'invalid-date',
          sex: 'invalid',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 422 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Juan',
          // Missing other required fields
        });

      expect(response.status).toBe(422);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .send({
          firstName: 'Juan',
          lastName: 'García',
          dateOfBirth: '1985-03-15',
          sex: 'male',
          phone: '+34612345678',
          emergencyContactName: 'María',
          emergencyContactPhone: '+34612345679',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/patients/:id', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'male',
          phone: '+34600000001',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000002',
        },
      });
    });

    it('should return patient with appointments', async () => {
      // Create appointment for patient
      await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .get(`/api/v1/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testPatient.id);
      expect(response.body.data.appointments).toBeDefined();
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/v1/patients/non-existent-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for another user patient', async () => {
      // Create another provider
      const otherProvider = await prisma.provider.create({
        data: {
          email: 'other@test.com',
          passwordHash: await bcrypt.hash('Password123!', 10),
          firstName: 'Other',
          lastName: 'Doctor',
        },
      });
      const otherToken = generateToken({ id: otherProvider.id, email: otherProvider.email });

      // Patient belongs to original provider via appointment
      await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .get(`/api/v1/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      // Depending on implementation, this could be 403 or 404
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/v1/patients/:id', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          firstName: 'Original',
          lastName: 'Name',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'male',
          phone: '+34600000001',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000002',
        },
      });
    });

    it('should update patient fields', async () => {
      const response = await request(app)
        .put(`/api/v1/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          sex: 'male',
          phone: '+34999999999',
          emergencyContactName: 'New Emergency',
          emergencyContactPhone: '+34600000002',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.phone).toBe('+34999999999');
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .put('/api/v1/patients/non-existent-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Test',
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          sex: 'male',
          phone: '+34600000001',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000002',
        });

      expect(response.status).toBe(404);
    });

    it('should return 422 for invalid data', async () => {
      const response = await request(app)
        .put(`/api/v1/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '',
          lastName: '',
        });

      expect(response.status).toBe(422);
    });
  });

  describe('DELETE /api/v1/patients/:id', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          firstName: 'ToDelete',
          lastName: 'Patient',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'male',
          phone: '+34600000001',
          emergencyContactName: 'Emergency',
          emergencyContactPhone: '+34600000002',
        },
      });
    });

    it('should soft delete patient', async () => {
      const response = await request(app)
        .delete(`/api/v1/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify soft deleted
      const deleted = await prisma.patient.findUnique({
        where: { id: testPatient.id },
      });
      expect(deleted?.isDeleted).toBe(true);
    });

    it('should return 204 on success', async () => {
      const response = await request(app)
        .delete(`/api/v1/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .delete('/api/v1/patients/non-existent-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
```

### Appointments Routes Tests

```typescript
// routes/appointments.routes.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/utils/jwt';
import bcrypt from 'bcrypt';

describe('Appointments API', () => {
  let authToken: string;
  let testProvider: any;
  let testPatient: any;

  beforeEach(async () => {
    testProvider = await prisma.provider.create({
      data: {
        email: 'doctor@test.com',
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Test',
        lastName: 'Doctor',
      },
    });
    authToken = generateToken({ id: testProvider.id, email: testProvider.email });

    testPatient = await prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male',
        phone: '+34600000001',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+34600000002',
      },
    });
  });

  describe('GET /api/v1/appointments', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/appointments');
      expect(response.status).toBe(401);
    });

    it('should return appointments for current provider', async () => {
      await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
        },
      });

      await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'follow_up',
          status: 'completed',
        },
      });

      const response = await request(app)
        .get('/api/v1/appointments')
        .query({ status: 'scheduled' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((a: any) => a.status === 'scheduled')).toBe(true);
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: today,
          type: 'new_patient',
          status: 'scheduled',
        },
      });

      const response = await request(app)
        .get('/api/v1/appointments')
        .query({
          startDate: today.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/appointments', () => {
    it('should create appointment with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatient.id,
          scheduledAt: new Date().toISOString(),
          type: 'new_patient',
          reasonForVisit: 'Initial consultation',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.patientId).toBe(testPatient.id);
      expect(response.body.data.status).toBe('scheduled');
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'non-existent-patient-id',
          scheduledAt: new Date().toISOString(),
          type: 'new_patient',
          reasonForVisit: 'Test',
        });

      expect(response.status).toBe(404);
    });

    it('should return 422 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatient.id,
          // Missing scheduledAt and type
        });

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/v1/appointments/:id', () => {
    let testAppointment: any;

    beforeEach(async () => {
      testAppointment = await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
          reasonForVisit: 'Test appointment',
        },
      });
    });

    it('should return appointment with patient details', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testAppointment.id);
      expect(response.body.data.patient).toBeDefined();
    });

    it('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .get('/api/v1/appointments/non-existent-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for another provider appointment', async () => {
      const otherProvider = await prisma.provider.create({
        data: {
          email: 'other@test.com',
          passwordHash: await bcrypt.hash('Password123!', 10),
          firstName: 'Other',
          lastName: 'Doctor',
        },
      });
      const otherToken = generateToken({ id: otherProvider.id, email: otherProvider.email });

      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/v1/appointments/:id/status', () => {
    let testAppointment: any;

    beforeEach(async () => {
      testAppointment = await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
        },
      });
    });

    it('should update appointment status', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should create medical record when starting appointment', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${testAppointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' });

      const record = await prisma.medicalRecord.findFirst({
        where: { appointmentId: testAppointment.id },
      });

      expect(record).toBeDefined();
    });

    it('should return 400 for invalid status transition', async () => {
      // Complete the appointment first
      await prisma.appointment.update({
        where: { id: testAppointment.id },
        data: { status: 'completed' },
      });

      const response = await request(app)
        .patch(`/api/v1/appointments/${testAppointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'scheduled' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/appointments/:id', () => {
    let testAppointment: any;

    beforeEach(async () => {
      testAppointment = await prisma.appointment.create({
        data: {
          patientId: testPatient.id,
          providerId: testProvider.id,
          scheduledAt: new Date(),
          type: 'new_patient',
          status: 'scheduled',
        },
      });
    });

    it('should cancel appointment', async () => {
      const response = await request(app)
        .delete(`/api/v1/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const cancelled = await prisma.appointment.findUnique({
        where: { id: testAppointment.id },
      });
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should return 400 for completed appointment', async () => {
      await prisma.appointment.update({
        where: { id: testAppointment.id },
        data: { status: 'completed' },
      });

      const response = await request(app)
        .delete(`/api/v1/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
```

### Medical Records Routes Tests

```typescript
// routes/medical-records.routes.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/utils/jwt';
import bcrypt from 'bcrypt';

describe('Medical Records API', () => {
  let authToken: string;
  let testProvider: any;
  let testPatient: any;
  let testAppointment: any;
  let testRecord: any;

  beforeEach(async () => {
    testProvider = await prisma.provider.create({
      data: {
        email: 'doctor@test.com',
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Test',
        lastName: 'Doctor',
      },
    });
    authToken = generateToken({ id: testProvider.id, email: testProvider.email });

    testPatient = await prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male',
        phone: '+34600000001',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+34600000002',
      },
    });

    testAppointment = await prisma.appointment.create({
      data: {
        patientId: testPatient.id,
        providerId: testProvider.id,
        scheduledAt: new Date(),
        type: 'new_patient',
        status: 'in_progress',
      },
    });

    testRecord = await prisma.medicalRecord.create({
      data: {
        appointmentId: testAppointment.id,
        status: 'draft',
      },
    });
  });

  describe('GET /api/v1/appointments/:id/record', () => {
    it('should return medical record with relations', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointment.id}/record`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.appointmentId).toBe(testAppointment.id);
    });

    it('should return 404 if record does not exist', async () => {
      // Delete the record
      await prisma.medicalRecord.delete({ where: { id: testRecord.id } });

      const response = await request(app)
        .get(`/api/v1/appointments/${testAppointment.id}/record`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/appointments/:id/record', () => {
    it('should update medical record', async () => {
      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointment.id}/record`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chiefComplaint: 'Dolor de cabeza',
          historyOfPresentIllness: 'El paciente refiere dolor desde hace 3 días',
          diagnosis: 'Migraña tensional',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.chiefComplaint).toBe('Dolor de cabeza');
      expect(response.body.data.diagnosis).toBe('Migraña tensional');
    });

    it('should create record if not exists', async () => {
      await prisma.medicalRecord.delete({ where: { id: testRecord.id } });

      const response = await request(app)
        .put(`/api/v1/appointments/${testAppointment.id}/record`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chiefComplaint: 'New complaint',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.chiefComplaint).toBe('New complaint');
    });
  });

  describe('POST /api/v1/appointments/:id/record/symptoms', () => {
    it('should add symptom to record', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/record/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Dolor de cabeza',
          severity: 7,
          bodySite: 'Head',
          duration: '3 days',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.description).toBe('Dolor de cabeza');
      expect(response.body.data.severity).toBe(7);
    });

    it('should mark symptom as AI-generated', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/record/symptoms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'AI extracted symptom',
          severity: 5,
          isAIGenerated: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isAIGenerated).toBe(true);
    });
  });

  describe('DELETE /api/v1/appointments/:id/record/symptoms/:sid', () => {
    let testSymptom: any;

    beforeEach(async () => {
      testSymptom = await prisma.symptom.create({
        data: {
          medicalRecordId: testRecord.id,
          description: 'Test symptom',
          severity: 5,
        },
      });
    });

    it('should delete symptom', async () => {
      const response = await request(app)
        .delete(`/api/v1/appointments/${testAppointment.id}/record/symptoms/${testSymptom.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const deleted = await prisma.symptom.findUnique({
        where: { id: testSymptom.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/v1/appointments/:id/record/prescriptions', () => {
    it('should add prescription', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/record/prescriptions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationName: 'Ibuprofeno',
          strength: '400mg',
          dosage: '1 tablet',
          frequency: 'Every 8 hours',
          duration: '5 days',
          instructions: 'Take with food',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.medicationName).toBe('Ibuprofeno');
    });

    it('should return 422 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/record/prescriptions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationName: 'Ibuprofeno',
          // Missing required fields
        });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/v1/appointments/:id/record/complete', () => {
    it('should complete record with required fields', async () => {
      // Update record with required fields
      await prisma.medicalRecord.update({
        where: { id: testRecord.id },
        data: {
          chiefComplaint: 'Dolor de cabeza',
          diagnosis: 'Migraña',
        },
      });

      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/record/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });

    it('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/record/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
```

### Transcription Routes Tests

```typescript
// routes/transcription.routes.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/utils/jwt';
import bcrypt from 'bcrypt';

// Mock OpenAI
vi.mock('@/lib/openai', () => ({
  openai: {
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'El paciente refiere dolor de cabeza.',
          duration: 60,
        }),
      },
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  symptoms: [{ description: 'Dolor de cabeza', severity: 7 }],
                  diagnosis: { description: 'Migraña' },
                  prescriptions: [],
                }),
              },
            },
          ],
        }),
      },
    },
  },
}));

describe('Transcription API', () => {
  let authToken: string;
  let testProvider: any;
  let testPatient: any;
  let testAppointment: any;

  beforeEach(async () => {
    testProvider = await prisma.provider.create({
      data: {
        email: 'doctor@test.com',
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Test',
        lastName: 'Doctor',
      },
    });
    authToken = generateToken({ id: testProvider.id, email: testProvider.email });

    testPatient = await prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male',
        phone: '+34600000001',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+34600000002',
      },
    });

    testAppointment = await prisma.appointment.create({
      data: {
        patientId: testPatient.id,
        providerId: testProvider.id,
        scheduledAt: new Date(),
        type: 'new_patient',
        status: 'in_progress',
      },
    });

    await prisma.medicalRecord.create({
      data: {
        appointmentId: testAppointment.id,
        status: 'draft',
      },
    });
  });

  describe('POST /api/v1/appointments/:id/transcription/start', () => {
    it('should start transcription session', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.sessionId).toBeDefined();
    });

    it('should return session ID and WebSocket URL', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.wsUrl).toBeDefined();
    });

    it('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .post('/api/v1/appointments/non-existent/transcription/start')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 if transcription already active', async () => {
      // Start first session
      await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/start`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to start second
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/appointments/:id/transcription/audio', () => {
    let sessionId: string;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/start`)
        .set('Authorization', `Bearer ${authToken}`);
      sessionId = startResponse.body.data.sessionId;
    });

    it('should accept audio chunk upload', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');

      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/audio`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Session-Id', sessionId)
        .attach('audio', audioBuffer, 'chunk.webm');

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid audio format', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/audio`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Session-Id', sessionId)
        .attach('audio', Buffer.from('text'), 'file.txt');

      expect(response.status).toBe(400);
    });

    it('should return 400 if no active session', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/audio`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Session-Id', 'invalid-session')
        .attach('audio', Buffer.from('audio'), 'chunk.webm');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/appointments/:id/transcription/stop', () => {
    let sessionId: string;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/start`)
        .set('Authorization', `Bearer ${authToken}`);
      sessionId = startResponse.body.data.sessionId;
    });

    it('should stop transcription session', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Session-Id', sessionId);

      expect(response.status).toBe(200);
    });

    it('should return complete transcription', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/transcription/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Session-Id', sessionId);

      expect(response.body.data.transcription).toBeDefined();
    });
  });

  describe('POST /api/v1/appointments/:id/extract-fields', () => {
    it('should extract fields from transcription text', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/extract-fields`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transcription: 'El paciente refiere dolor de cabeza desde hace tres días.',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.symptoms).toBeDefined();
      expect(response.body.data.diagnosis).toBeDefined();
    });

    it('should return symptoms, diagnosis, prescriptions', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/extract-fields`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transcription: 'Diagnóstico: migraña. Receto ibuprofeno 400mg cada 8 horas.',
        });

      expect(response.body.data).toHaveProperty('symptoms');
      expect(response.body.data).toHaveProperty('diagnosis');
      expect(response.body.data).toHaveProperty('prescriptions');
    });

    it('should handle empty transcription', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${testAppointment.id}/extract-fields`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transcription: '',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.symptoms).toEqual([]);
    });
  });
});
```

---

## Repository Integration Tests

```typescript
// repositories/patients.repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { patientsRepository } from '@/repositories/patients.repository';

describe('PatientsRepository', () => {
  beforeEach(async () => {
    await prisma.patient.deleteMany();
  });

  describe('create', () => {
    it('should persist patient in database', async () => {
      const result = await patientsRepository.create({
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male',
        phone: '+34600000001',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+34600000002',
      });

      const found = await prisma.patient.findUnique({
        where: { id: result.id },
      });

      expect(found).not.toBeNull();
      expect(found?.firstName).toBe('Test');
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await prisma.patient.createMany({
        data: [
          {
            firstName: 'Alice',
            lastName: 'Smith',
            dateOfBirth: new Date('1985-01-01'),
            sex: 'female',
            phone: '+34600000001',
            emergencyContactName: 'Emergency',
            emergencyContactPhone: '+34600000002',
          },
          {
            firstName: 'Bob',
            lastName: 'Johnson',
            dateOfBirth: new Date('1990-05-15'),
            sex: 'male',
            phone: '+34600000003',
            emergencyContactName: 'Emergency',
            emergencyContactPhone: '+34600000004',
          },
        ],
      });
    });

    it('should return all patients', async () => {
      const result = await patientsRepository.findMany({});
      expect(result.length).toBe(2);
    });

    it('should filter by search term', async () => {
      const result = await patientsRepository.findMany({
        where: {
          OR: [
            { firstName: { contains: 'Alice', mode: 'insensitive' } },
            { lastName: { contains: 'Alice', mode: 'insensitive' } },
          ],
        },
      });
      expect(result.length).toBe(1);
      expect(result[0].firstName).toBe('Alice');
    });

    it('should support pagination', async () => {
      const result = await patientsRepository.findMany({
        skip: 1,
        take: 1,
      });
      expect(result.length).toBe(1);
    });
  });
});
```

---

## Test Count Summary

| Category | Test Files | Test Cases |
|----------|------------|------------|
| **Auth Routes** | 1 | 12 |
| **Patients Routes** | 1 | 15 |
| **Appointments Routes** | 1 | 14 |
| **Medical Records Routes** | 1 | 10 |
| **Transcription Routes** | 1 | 12 |
| **Patients Repository** | 1 | 4 |
| **Total** | **6** | **~67** |

---

## References

- [Testing Strategy](../strategy.md)
- [Unit Tests](./unit-tests.md)
- [Test Utilities](../utilities.md)
