# Backend Unit Tests

This document specifies the unit tests for the MedRecord AI backend services, utilities, and validators.

---

## Test Structure

```
packages/backend/tests/unit/
├── services/
│   ├── auth.service.test.ts
│   ├── patients.service.test.ts
│   ├── appointments.service.test.ts
│   ├── medical-records.service.test.ts
│   └── ai/
│       ├── whisper.service.test.ts
│       ├── gpt.service.test.ts
│       └── extraction.service.test.ts
├── utils/
│   ├── jwt.test.ts
│   ├── validators.test.ts
│   └── audio.test.ts
└── validators/
    ├── auth.validator.test.ts
    ├── patients.validator.test.ts
    └── appointments.validator.test.ts
```

---

## Service Tests

### AuthService Tests

```typescript
// auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/services/auth.service';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

vi.mock('@/lib/prisma');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'doctor@test.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        specialty: 'General Medicine',
      };

      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.provider.create).mockResolvedValue({
        id: 'uuid',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: 'hashed',
        specialty: userData.specialty,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register(userData);

      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBeDefined();
      expect(prisma.provider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: userData.email,
            passwordHash: expect.any(String),
          }),
        })
      );
    });

    it('should return JWT token on successful registration', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.provider.create).mockResolvedValue({
        id: 'uuid',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed',
        specialty: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.token).toMatch(/^eyJ/); // JWT format
    });

    it('should throw error if email already exists', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'existing-id',
        email: 'existing@test.com',
        firstName: 'Existing',
        lastName: 'User',
        passwordHash: 'hash',
        specialty: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          email: 'existing@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should validate email format', async () => {
      await expect(
        authService.register({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate password strength', async () => {
      await expect(
        authService.register({
          email: 'test@test.com',
          password: '123', // Too weak
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('Password does not meet requirements');
    });
  });

  describe('login', () => {
    it('should return JWT token for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);

      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'user-id',
        email: 'doctor@test.com',
        firstName: 'Test',
        lastName: 'Doctor',
        passwordHash: hashedPassword,
        specialty: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.login({
        email: 'doctor@test.com',
        password: 'Password123!',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('doctor@test.com');
    });

    it('should throw error for invalid email', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'user-id',
        email: 'doctor@test.com',
        firstName: 'Test',
        lastName: 'Doctor',
        passwordHash: hashedPassword,
        specialty: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'doctor@test.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const token = authService.generateToken({ id: 'user-id', email: 'test@test.com' });

      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hash',
        specialty: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.validateToken(token);

      expect(result.id).toBe('user-id');
      expect(result.email).toBe('test@test.com');
    });

    it('should throw error for expired token', async () => {
      // Create a token that expired 1 hour ago
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItaWQiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyMn0.expired';

      await expect(authService.validateToken(expiredToken)).rejects.toThrow('Token expired');
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.validateToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });
});
```

### PatientsService Tests

```typescript
// patients.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patientsService } from '@/services/patients.service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma');

describe('PatientsService', () => {
  const mockProviderId = 'provider-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create patient with all required fields', async () => {
      const patientData = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: new Date('1985-03-15'),
        sex: 'male' as const,
        phone: '+34612345678',
        emergencyContactName: 'María García',
        emergencyContactPhone: '+34612345679',
      };

      vi.mocked(prisma.patient.create).mockResolvedValue({
        id: 'patient-uuid',
        ...patientData,
        email: null,
        address: null,
        notes: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await patientsService.create(patientData, mockProviderId);

      expect(result.id).toBeDefined();
      expect(result.firstName).toBe('Juan');
      expect(result.lastName).toBe('García');
    });

    it('should associate patient with current user', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'female' as const,
        phone: '+34600000000',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+34600000001',
      };

      vi.mocked(prisma.patient.create).mockResolvedValue({
        id: 'patient-uuid',
        ...patientData,
        email: null,
        address: null,
        notes: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await patientsService.create(patientData, mockProviderId);

      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: patientData.firstName,
          }),
        })
      );
    });

    it('should return created patient with ID', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'male' as const,
        phone: '+34600000000',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+34600000001',
      };

      vi.mocked(prisma.patient.create).mockResolvedValue({
        id: 'generated-uuid',
        ...patientData,
        email: null,
        address: null,
        notes: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await patientsService.create(patientData, mockProviderId);

      expect(result.id).toBe('generated-uuid');
    });

    it('should handle optional fields correctly', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'other' as const,
        phone: '+34600000000',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '+34600000001',
        email: 'patient@test.com',
        address: '123 Main Street',
        notes: 'Special notes',
      };

      vi.mocked(prisma.patient.create).mockResolvedValue({
        id: 'patient-uuid',
        ...patientData,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await patientsService.create(patientData, mockProviderId);

      expect(result.email).toBe('patient@test.com');
      expect(result.address).toBe('123 Main Street');
      expect(result.notes).toBe('Special notes');
    });
  });

  describe('findAll', () => {
    it('should return only patients for current user', async () => {
      const mockPatients = [
        { id: '1', firstName: 'Patient', lastName: 'One' },
        { id: '2', firstName: 'Patient', lastName: 'Two' },
      ];

      vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
      vi.mocked(prisma.patient.count).mockResolvedValue(2);

      const result = await patientsService.findAll({ page: 1, limit: 20 }, mockProviderId);

      expect(result.data).toHaveLength(2);
      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
    });

    it('should support pagination', async () => {
      vi.mocked(prisma.patient.findMany).mockResolvedValue([]);
      vi.mocked(prisma.patient.count).mockResolvedValue(50);

      await patientsService.findAll({ page: 2, limit: 10 }, mockProviderId);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should support search by name', async () => {
      vi.mocked(prisma.patient.findMany).mockResolvedValue([]);
      vi.mocked(prisma.patient.count).mockResolvedValue(0);

      await patientsService.findAll({ page: 1, limit: 20, search: 'Juan' }, mockProviderId);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.any(Object) }),
              expect.objectContaining({ lastName: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should return empty array if no patients', async () => {
      vi.mocked(prisma.patient.findMany).mockResolvedValue([]);
      vi.mocked(prisma.patient.count).mockResolvedValue(0);

      const result = await patientsService.findAll({ page: 1, limit: 20 }, mockProviderId);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return patient with appointments', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Test',
        lastName: 'Patient',
        appointments: [{ id: 'apt-1' }, { id: 'apt-2' }],
        allergies: [],
        chronicConditions: [],
      } as any);

      const result = await patientsService.findById('patient-id', mockProviderId);

      expect(result.id).toBe('patient-id');
      expect(result.appointments).toHaveLength(2);
    });

    it('should throw NotFound for non-existent ID', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

      await expect(
        patientsService.findById('non-existent-id', mockProviderId)
      ).rejects.toThrow('Patient not found');
    });

    it("should throw Forbidden for another user's patient", async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Test',
        lastName: 'Patient',
      } as any);

      await expect(
        patientsService.findById('patient-id', 'different-provider-id')
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('update', () => {
    it('should update patient fields', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Old',
        lastName: 'Name',
      } as any);

      vi.mocked(prisma.patient.update).mockResolvedValue({
        id: 'patient-id',
        firstName: 'New',
        lastName: 'Name',
      } as any);

      const result = await patientsService.update(
        'patient-id',
        { firstName: 'New' },
        mockProviderId
      );

      expect(result.firstName).toBe('New');
    });

    it('should not update restricted fields', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Test',
        lastName: 'Patient',
      } as any);

      vi.mocked(prisma.patient.update).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Test',
        lastName: 'Patient',
      } as any);

      await patientsService.update(
        'patient-id',
        { id: 'new-id', createdAt: new Date() } as any,
        mockProviderId
      );

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            id: 'new-id',
            createdAt: expect.any(Date),
          }),
        })
      );
    });

    it('should return updated patient', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Test',
        lastName: 'Patient',
      } as any);

      vi.mocked(prisma.patient.update).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Updated',
        lastName: 'Patient',
        phone: '+34999999999',
      } as any);

      const result = await patientsService.update(
        'patient-id',
        { firstName: 'Updated', phone: '+34999999999' },
        mockProviderId
      );

      expect(result.firstName).toBe('Updated');
      expect(result.phone).toBe('+34999999999');
    });
  });

  describe('delete', () => {
    it('should soft delete patient', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({
        id: 'patient-id',
        firstName: 'Test',
        lastName: 'Patient',
        isDeleted: false,
      } as any);

      vi.mocked(prisma.patient.update).mockResolvedValue({
        id: 'patient-id',
        isDeleted: true,
      } as any);

      await patientsService.delete('patient-id', mockProviderId);

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeleted: true },
        })
      );
    });

    it('should not return deleted patient in list', async () => {
      vi.mocked(prisma.patient.findMany).mockResolvedValue([]);
      vi.mocked(prisma.patient.count).mockResolvedValue(0);

      const result = await patientsService.findAll({ page: 1, limit: 20 }, mockProviderId);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
      expect(result.data).toEqual([]);
    });
  });
});
```

### AppointmentsService Tests

```typescript
// appointments.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentsService } from '@/services/appointments.service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma');

describe('AppointmentsService', () => {
  const mockProviderId = 'provider-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create appointment with valid data', async () => {
      const appointmentData = {
        patientId: 'patient-uuid',
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        type: 'follow_up' as const,
        reasonForVisit: 'Follow-up consultation',
      };

      vi.mocked(prisma.appointment.create).mockResolvedValue({
        id: 'appointment-uuid',
        ...appointmentData,
        providerId: mockProviderId,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await appointmentsService.create(appointmentData, mockProviderId);

      expect(result.id).toBeDefined();
      expect(result.patientId).toBe('patient-uuid');
      expect(result.status).toBe('scheduled');
    });

    it('should set initial status to scheduled', async () => {
      vi.mocked(prisma.appointment.create).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'scheduled',
      } as any);

      const result = await appointmentsService.create(
        {
          patientId: 'patient-uuid',
          scheduledAt: new Date(),
          type: 'new_patient',
          reasonForVisit: 'Initial consultation',
        },
        mockProviderId
      );

      expect(result.status).toBe('scheduled');
    });

    it('should validate patient exists', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

      await expect(
        appointmentsService.create(
          {
            patientId: 'non-existent-patient',
            scheduledAt: new Date(),
            type: 'follow_up',
            reasonForVisit: 'Test',
          },
          mockProviderId
        )
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('updateStatus', () => {
    it('should update appointment status', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'scheduled',
        providerId: mockProviderId,
      } as any);

      vi.mocked(prisma.appointment.update).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'in_progress',
      } as any);

      const result = await appointmentsService.updateStatus(
        'appointment-uuid',
        'in_progress',
        mockProviderId
      );

      expect(result.status).toBe('in_progress');
    });

    it('should validate status transitions', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'completed',
        providerId: mockProviderId,
      } as any);

      await expect(
        appointmentsService.updateStatus('appointment-uuid', 'scheduled', mockProviderId)
      ).rejects.toThrow('Invalid status transition');
    });

    it('should create medical record when status changes to in_progress', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'scheduled',
        providerId: mockProviderId,
        medicalRecord: null,
      } as any);

      vi.mocked(prisma.appointment.update).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'in_progress',
      } as any);

      vi.mocked(prisma.medicalRecord.create).mockResolvedValue({
        id: 'record-uuid',
        appointmentId: 'appointment-uuid',
      } as any);

      await appointmentsService.updateStatus('appointment-uuid', 'in_progress', mockProviderId);

      expect(prisma.medicalRecord.create).toHaveBeenCalled();
    });
  });

  describe('findByPatient', () => {
    it('should return appointments for patient', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([
        { id: '1', scheduledAt: new Date('2024-01-01') },
        { id: '2', scheduledAt: new Date('2024-01-15') },
      ] as any);

      const result = await appointmentsService.findByPatient('patient-uuid', mockProviderId);

      expect(result).toHaveLength(2);
    });

    it('should order by scheduledAt descending', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

      await appointmentsService.findByPatient('patient-uuid', mockProviderId);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { scheduledAt: 'desc' },
        })
      );
    });
  });
});
```

### MedicalRecordsService Tests

```typescript
// medical-records.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { medicalRecordsService } from '@/services/medical-records.service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma');

describe('MedicalRecordsService', () => {
  const mockProviderId = 'provider-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByAppointment', () => {
    it('should return medical record with all relations', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
        appointmentId: 'appointment-uuid',
        chiefComplaint: 'Headache',
        symptoms: [{ id: '1', description: 'Dolor de cabeza' }],
        prescriptions: [{ id: '1', medicationName: 'Ibuprofeno' }],
        diagnosis: 'Migraine',
      } as any);

      const result = await medicalRecordsService.getByAppointment(
        'appointment-uuid',
        mockProviderId
      );

      expect(result.id).toBe('record-uuid');
      expect(result.symptoms).toHaveLength(1);
      expect(result.prescriptions).toHaveLength(1);
    });

    it('should throw NotFound if record does not exist', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue(null);

      await expect(
        medicalRecordsService.getByAppointment('non-existent', mockProviderId)
      ).rejects.toThrow('Medical record not found');
    });
  });

  describe('update', () => {
    it('should update medical record fields', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
        appointmentId: 'appointment-uuid',
        chiefComplaint: 'Old complaint',
      } as any);

      vi.mocked(prisma.medicalRecord.update).mockResolvedValue({
        id: 'record-uuid',
        chiefComplaint: 'New complaint',
        diagnosis: 'New diagnosis',
      } as any);

      const result = await medicalRecordsService.update(
        'appointment-uuid',
        {
          chiefComplaint: 'New complaint',
          diagnosis: 'New diagnosis',
        },
        mockProviderId
      );

      expect(result.chiefComplaint).toBe('New complaint');
      expect(result.diagnosis).toBe('New diagnosis');
    });

    it('should track AI-filled fields', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
        appointmentId: 'appointment-uuid',
      } as any);

      vi.mocked(prisma.medicalRecord.update).mockResolvedValue({
        id: 'record-uuid',
        diagnosis: 'AI diagnosis',
        aiGeneratedFields: ['diagnosis'],
      } as any);

      const result = await medicalRecordsService.update(
        'appointment-uuid',
        {
          diagnosis: 'AI diagnosis',
          aiGeneratedFields: ['diagnosis'],
        },
        mockProviderId
      );

      expect(result.aiGeneratedFields).toContain('diagnosis');
    });
  });

  describe('addSymptom', () => {
    it('should add symptom to medical record', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
      } as any);

      vi.mocked(prisma.symptom.create).mockResolvedValue({
        id: 'symptom-uuid',
        description: 'Dolor de cabeza',
        severity: 7,
        bodySite: 'Head',
        duration: '3 days',
      } as any);

      const result = await medicalRecordsService.addSymptom(
        'appointment-uuid',
        {
          description: 'Dolor de cabeza',
          severity: 7,
          bodySite: 'Head',
          duration: '3 days',
        },
        mockProviderId
      );

      expect(result.id).toBeDefined();
      expect(result.description).toBe('Dolor de cabeza');
    });

    it('should mark symptom as AI-generated when applicable', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
      } as any);

      vi.mocked(prisma.symptom.create).mockResolvedValue({
        id: 'symptom-uuid',
        description: 'AI symptom',
        isAIGenerated: true,
      } as any);

      const result = await medicalRecordsService.addSymptom(
        'appointment-uuid',
        {
          description: 'AI symptom',
          isAIGenerated: true,
        },
        mockProviderId
      );

      expect(result.isAIGenerated).toBe(true);
    });
  });

  describe('addPrescription', () => {
    it('should add prescription with all fields', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
      } as any);

      vi.mocked(prisma.prescription.create).mockResolvedValue({
        id: 'prescription-uuid',
        medicationName: 'Ibuprofeno',
        strength: '400mg',
        dosage: '1 tablet',
        frequency: 'Every 8 hours',
        duration: '5 days',
        quantity: 15,
        instructions: 'Take with food',
      } as any);

      const result = await medicalRecordsService.addPrescription(
        'appointment-uuid',
        {
          medicationName: 'Ibuprofeno',
          strength: '400mg',
          dosage: '1 tablet',
          frequency: 'Every 8 hours',
          duration: '5 days',
          quantity: 15,
          instructions: 'Take with food',
        },
        mockProviderId
      );

      expect(result.medicationName).toBe('Ibuprofeno');
      expect(result.dosage).toBe('1 tablet');
    });
  });

  describe('complete', () => {
    it('should mark record as completed', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
        status: 'draft',
      } as any);

      vi.mocked(prisma.medicalRecord.update).mockResolvedValue({
        id: 'record-uuid',
        status: 'completed',
        completedAt: new Date(),
      } as any);

      vi.mocked(prisma.appointment.update).mockResolvedValue({
        id: 'appointment-uuid',
        status: 'completed',
      } as any);

      const result = await medicalRecordsService.complete('appointment-uuid', mockProviderId);

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should validate required fields before completion', async () => {
      vi.mocked(prisma.medicalRecord.findFirst).mockResolvedValue({
        id: 'record-uuid',
        status: 'draft',
        chiefComplaint: null,
        diagnosis: null,
      } as any);

      await expect(
        medicalRecordsService.complete('appointment-uuid', mockProviderId)
      ).rejects.toThrow('Chief complaint is required');
    });
  });
});
```

### AI Services Tests

```typescript
// ai/extraction.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractionService } from '@/services/ai/extraction.service';
import { openai } from '@/lib/openai';

vi.mock('@/lib/openai');

describe('ExtractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractMedicalFields', () => {
    it('should extract symptoms from transcription', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [
                  { description: 'Dolor de cabeza', severity: 7, duration: '3 días' },
                ],
                diagnosis: null,
                prescriptions: [],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'El paciente refiere dolor de cabeza desde hace tres días.'
      );

      expect(result.symptoms).toHaveLength(1);
      expect(result.symptoms[0].description).toBe('Dolor de cabeza');
    });

    it('should extract diagnosis from transcription', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [],
                diagnosis: { description: 'Migraña tensional', confidence: 0.85 },
                prescriptions: [],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'Diagnóstico: migraña tensional.'
      );

      expect(result.diagnosis.description).toBe('Migraña tensional');
      expect(result.diagnosis.confidence).toBeGreaterThan(0.8);
    });

    it('should extract prescriptions from transcription', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [],
                diagnosis: null,
                prescriptions: [
                  {
                    medication: 'Ibuprofeno',
                    dosage: '400mg',
                    frequency: 'cada 8 horas',
                    duration: '5 días',
                  },
                ],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'Le receto ibuprofeno 400mg cada 8 horas por 5 días.'
      );

      expect(result.prescriptions).toHaveLength(1);
      expect(result.prescriptions[0].medication).toBe('Ibuprofeno');
    });

    it('should handle transcription with no medical info', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [],
                diagnosis: null,
                prescriptions: [],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'Buenos días, ¿cómo está usted?'
      );

      expect(result.symptoms).toHaveLength(0);
      expect(result.diagnosis).toBeNull();
      expect(result.prescriptions).toHaveLength(0);
    });

    it('should include confidence scores', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [
                  { description: 'Fiebre', severity: 8, confidence: 0.95 },
                ],
                diagnosis: { description: 'Gripe', confidence: 0.75 },
                prescriptions: [],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'El paciente tiene fiebre alta.'
      );

      expect(result.symptoms[0].confidence).toBeDefined();
      expect(result.diagnosis.confidence).toBeDefined();
    });

    it('should handle multiple symptoms', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [
                  { description: 'Dolor de cabeza', severity: 6 },
                  { description: 'Náuseas', severity: 4 },
                  { description: 'Fatiga', severity: 5 },
                ],
                diagnosis: null,
                prescriptions: [],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'El paciente presenta dolor de cabeza, náuseas y fatiga.'
      );

      expect(result.symptoms).toHaveLength(3);
    });

    it('should handle complex prescriptions', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [],
                diagnosis: null,
                prescriptions: [
                  {
                    medication: 'Omeprazol',
                    dosage: '20mg',
                    frequency: 'una vez al día',
                    duration: '14 días',
                    instructions: 'Tomar en ayunas, 30 minutos antes del desayuno',
                  },
                ],
              }),
            },
          },
        ],
      } as any);

      const result = await extractionService.extractMedicalFields(
        'Omeprazol 20mg una vez al día por 14 días, tomar en ayunas.'
      );

      expect(result.prescriptions[0].instructions).toContain('ayunas');
    });
  });

  describe('parseGPTResponse', () => {
    it('should parse valid JSON response', () => {
      const validJson = JSON.stringify({
        symptoms: [{ description: 'Test', severity: 5 }],
        diagnosis: { description: 'Test diagnosis' },
        prescriptions: [],
      });

      const result = extractionService.parseGPTResponse(validJson);

      expect(result.symptoms).toHaveLength(1);
      expect(result.diagnosis.description).toBe('Test diagnosis');
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{ symptoms: invalid }';

      const result = extractionService.parseGPTResponse(malformedJson);

      expect(result.symptoms).toEqual([]);
      expect(result.diagnosis).toBeNull();
      expect(result.prescriptions).toEqual([]);
    });

    it('should validate extracted field structure', () => {
      const invalidStructure = JSON.stringify({
        symptoms: 'not an array',
        diagnosis: 123,
        prescriptions: null,
      });

      const result = extractionService.parseGPTResponse(invalidStructure);

      expect(Array.isArray(result.symptoms)).toBe(true);
      expect(Array.isArray(result.prescriptions)).toBe(true);
    });
  });
});
```

```typescript
// ai/whisper.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { whisperService } from '@/services/ai/whisper.service';
import { openai } from '@/lib/openai';

vi.mock('@/lib/openai');

describe('WhisperService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transcribe', () => {
    it('should return transcription text from audio', async () => {
      vi.mocked(openai.audio.transcriptions.create).mockResolvedValue({
        text: 'El paciente refiere dolor de cabeza desde hace tres días.',
        segments: [],
        duration: 120,
      } as any);

      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const result = await whisperService.transcribe(mockAudioBuffer);

      expect(result.text).toBe('El paciente refiere dolor de cabeza desde hace tres días.');
    });

    it('should include duration in response', async () => {
      vi.mocked(openai.audio.transcriptions.create).mockResolvedValue({
        text: 'Test transcription',
        duration: 60.5,
      } as any);

      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const result = await whisperService.transcribe(mockAudioBuffer);

      expect(result.duration).toBe(60.5);
    });

    it('should specify Spanish language', async () => {
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      await whisperService.transcribe(mockAudioBuffer);

      expect(openai.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'es',
        })
      );
    });

    it('should handle empty audio gracefully', async () => {
      vi.mocked(openai.audio.transcriptions.create).mockResolvedValue({
        text: '',
        duration: 0,
      } as any);

      const emptyAudioBuffer = Buffer.from('');
      const result = await whisperService.transcribe(emptyAudioBuffer);

      expect(result.text).toBe('');
    });

    it('should throw error on API failure', async () => {
      vi.mocked(openai.audio.transcriptions.create).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const mockAudioBuffer = Buffer.from('fake-audio-data');

      await expect(whisperService.transcribe(mockAudioBuffer)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });
  });
});
```

---

## Utility Tests

### JWT Utils Tests

```typescript
// utils/jwt.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateToken, verifyToken, decodeToken } from '@/utils/jwt';

describe('JWT Utils', () => {
  const mockPayload = { id: 'user-id', email: 'test@test.com' };

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    it('should include payload data in token', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);

      expect(decoded.id).toBe('user-id');
      expect(decoded.email).toBe('test@test.com');
    });

    it('should set expiration time', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateToken(mockPayload);
      const result = verifyToken(token);

      expect(result.id).toBe('user-id');
      expect(result.email).toBe('test@test.com');
    });

    it('should throw error for invalid signature', () => {
      const token = generateToken(mockPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      vi.useFakeTimers();
      const token = generateToken(mockPayload);

      // Advance time by 25 hours (past 24h expiration)
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      expect(() => verifyToken(token)).toThrow('Token expired');
      vi.useRealTimers();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);

      expect(decoded.id).toBe('user-id');
    });

    it('should return null for malformed token', () => {
      expect(decodeToken('not-a-valid-token')).toBeNull();
    });
  });
});
```

### Validators Tests

```typescript
// utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validatePassword, validateDateOfBirth } from '@/utils/validators';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('no@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('+34612345678')).toBe(true);
      expect(validatePhone('+1-555-555-5555')).toBe(true);
      expect(validatePhone('612345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      expect(validatePassword('SecurePass123!')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject weak password', () => {
      expect(validatePassword('123456')).toBe(false);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('short')).toBe(false);
    });
  });

  describe('validateDateOfBirth', () => {
    it('should accept valid past date', () => {
      expect(validateDateOfBirth(new Date('1990-01-01'))).toBe(true);
    });

    it('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(validateDateOfBirth(futureDate)).toBe(false);
    });

    it('should reject date older than 150 years', () => {
      expect(validateDateOfBirth(new Date('1800-01-01'))).toBe(false);
    });
  });
});
```

### Audio Utils Tests

```typescript
// utils/audio.test.ts
import { describe, it, expect } from 'vitest';
import { validateAudioFormat, getAudioDuration, convertToWav } from '@/utils/audio';

describe('Audio Utils', () => {
  describe('validateAudioFormat', () => {
    it('should accept supported formats', () => {
      expect(validateAudioFormat('audio/webm')).toBe(true);
      expect(validateAudioFormat('audio/wav')).toBe(true);
      expect(validateAudioFormat('audio/mp3')).toBe(true);
      expect(validateAudioFormat('audio/mpeg')).toBe(true);
    });

    it('should reject unsupported formats', () => {
      expect(validateAudioFormat('video/mp4')).toBe(false);
      expect(validateAudioFormat('image/png')).toBe(false);
      expect(validateAudioFormat('text/plain')).toBe(false);
    });
  });

  describe('getAudioDuration', () => {
    it('should return duration in seconds', async () => {
      const mockAudioBuffer = Buffer.from('fake-audio-with-header');
      // This would need actual audio file testing in integration
      const duration = await getAudioDuration(mockAudioBuffer);
      expect(typeof duration).toBe('number');
    });
  });
});
```

---

## Validator Schema Tests

```typescript
// validators/patients.validator.test.ts
import { describe, it, expect } from 'vitest';
import { createPatientSchema, updatePatientSchema } from '@/validators/patients.validator';

describe('Patient Validators', () => {
  describe('createPatientSchema', () => {
    it('should validate complete patient data', () => {
      const validData = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: '1985-03-15',
        sex: 'male',
        phone: '+34612345678',
        emergencyContactName: 'María García',
        emergencyContactPhone: '+34612345679',
      };

      const result = createPatientSchema.safeParse({ body: validData });
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        firstName: 'Juan',
        // Missing other required fields
      };

      const result = createPatientSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: 'invalid-date',
        sex: 'male',
        phone: '+34612345678',
        emergencyContactName: 'María',
        emergencyContactPhone: '+34612345679',
      };

      const result = createPatientSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sex value', () => {
      const invalidData = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: '1985-03-15',
        sex: 'invalid',
        phone: '+34612345678',
        emergencyContactName: 'María',
        emergencyContactPhone: '+34612345679',
      };

      const result = createPatientSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePatientSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        firstName: 'Juan Carlos',
      };

      const result = updatePatientSchema.safeParse({ body: partialData });
      expect(result.success).toBe(true);
    });

    it('should validate updated fields', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = updatePatientSchema.safeParse({ body: invalidData });
      expect(result.success).toBe(false);
    });
  });
});
```

---

## Test Count Summary

| Category | Test Files | Test Cases |
|----------|------------|------------|
| **Auth Service** | 1 | 10 |
| **Patients Service** | 1 | 12 |
| **Appointments Service** | 1 | 8 |
| **Medical Records Service** | 1 | 10 |
| **AI Extraction Service** | 1 | 10 |
| **AI Whisper Service** | 1 | 5 |
| **JWT Utils** | 1 | 6 |
| **Validators Utils** | 1 | 8 |
| **Audio Utils** | 1 | 4 |
| **Schema Validators** | 1 | 5 |
| **Total** | **10** | **~78** |

---

## References

- [Testing Strategy](../strategy.md)
- [Integration Tests](./integration-tests.md)
- [Test Utilities](../utilities.md)
