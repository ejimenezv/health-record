import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Sex, AppointmentStatus, AppointmentType } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Schema', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });
  });

  describe('Provider table', () => {
    it('should have seeded provider', async () => {
      const provider = await prisma.provider.findUnique({
        where: { email: 'doctor@example.com' },
      });

      expect(provider).not.toBeNull();
      expect(provider?.firstName).toBe('John');
      expect(provider?.lastName).toBe('Smith');
      expect(provider?.specialty).toBe('General Practice');
    });

    it('should have password hash stored', async () => {
      const provider = await prisma.provider.findUnique({
        where: { email: 'doctor@example.com' },
      });

      expect(provider?.passwordHash).toBeDefined();
      expect(provider?.passwordHash).not.toBe('password123'); // Should be hashed
    });
  });

  describe('Patient table', () => {
    it('should have seeded patients', async () => {
      const patients = await prisma.patient.findMany();
      expect(patients.length).toBeGreaterThanOrEqual(5);
    });

    it('should support sex enum', async () => {
      const femalePatient = await prisma.patient.findFirst({
        where: { sex: Sex.female },
      });

      expect(femalePatient).not.toBeNull();
    });

    it('should have patient with allergies relation', async () => {
      const patient = await prisma.patient.findFirst({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        include: { allergies: true },
      });

      expect(patient).not.toBeNull();
      expect(patient?.allergies.length).toBeGreaterThan(0);
    });

    it('should have patient with chronic conditions relation', async () => {
      const patient = await prisma.patient.findFirst({
        where: { id: '22222222-2222-2222-2222-222222222222' },
        include: { chronicConditions: true },
      });

      expect(patient).not.toBeNull();
      expect(patient?.chronicConditions.length).toBeGreaterThan(0);
    });
  });

  describe('Appointment table', () => {
    it('should have seeded appointments', async () => {
      const appointments = await prisma.appointment.findMany();
      expect(appointments.length).toBeGreaterThanOrEqual(3);
    });

    it('should have correct appointment-patient relationship', async () => {
      const appointment = await prisma.appointment.findFirst({
        include: { patient: true },
      });

      expect(appointment?.patient).toBeDefined();
    });

    it('should have correct appointment-provider relationship', async () => {
      const appointment = await prisma.appointment.findFirst({
        include: { provider: true },
      });

      expect(appointment?.provider).toBeDefined();
      expect(appointment?.provider.email).toBe('doctor@example.com');
    });

    it('should support status enum', async () => {
      const completedAppointment = await prisma.appointment.findFirst({
        where: { status: AppointmentStatus.completed },
      });

      expect(completedAppointment).not.toBeNull();
    });

    it('should support appointmentType enum', async () => {
      const sickVisit = await prisma.appointment.findFirst({
        where: { appointmentType: AppointmentType.sick_visit },
      });

      expect(sickVisit).not.toBeNull();
    });
  });

  describe('Medical Record with relations', () => {
    it('should have medical records with all relations', async () => {
      const record = await prisma.medicalRecord.findFirst({
        include: {
          appointment: true,
          symptoms: true,
          prescriptions: true,
        },
      });

      expect(record).not.toBeNull();
      expect(record?.appointment).toBeDefined();
      expect(record?.symptoms.length).toBeGreaterThan(0);
    });

    it('should have one-to-one relationship with appointment', async () => {
      const appointment = await prisma.appointment.findFirst({
        where: { status: AppointmentStatus.completed },
        include: { medicalRecord: true },
      });

      expect(appointment?.medicalRecord).toBeDefined();
    });

    it('should have prescriptions relation', async () => {
      const record = await prisma.medicalRecord.findFirst({
        where: {
          prescriptions: {
            some: {},
          },
        },
        include: { prescriptions: true },
      });

      expect(record).not.toBeNull();
      expect(record?.prescriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Vital Signs', () => {
    it('should have vital signs for completed appointments', async () => {
      const vitalSigns = await prisma.vitalSigns.findMany();
      expect(vitalSigns.length).toBeGreaterThanOrEqual(2);
    });

    it('should have one-to-one relationship with appointment', async () => {
      const appointment = await prisma.appointment.findFirst({
        where: { id: 'aaaa1111-1111-1111-1111-111111111111' },
        include: { vitalSigns: true },
      });

      expect(appointment?.vitalSigns).toBeDefined();
      expect(appointment?.vitalSigns?.bloodPressureSystolic).toBe(118);
    });
  });

  describe('Cascade delete', () => {
    it('should cascade delete allergies when patient is deleted', async () => {
      // Create test patient with allergy
      const testPatient = await prisma.patient.create({
        data: {
          firstName: 'Test',
          lastName: 'Cascade',
          dateOfBirth: new Date('2000-01-01'),
          sex: Sex.other,
          phone: '+1-555-9999',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+1-555-9998',
        },
      });

      await prisma.allergy.create({
        data: {
          patientId: testPatient.id,
          allergen: 'Test Allergen',
        },
      });

      // Delete patient
      await prisma.patient.delete({
        where: { id: testPatient.id },
      });

      // Verify allergy is deleted
      const allergy = await prisma.allergy.findFirst({
        where: { patientId: testPatient.id },
      });
      expect(allergy).toBeNull();
    });

    it('should cascade delete medical record when appointment is deleted', async () => {
      const provider = await prisma.provider.findFirst();
      const patient = await prisma.patient.findFirst();

      // Create test appointment with medical record
      const testAppointment = await prisma.appointment.create({
        data: {
          patientId: patient!.id,
          providerId: provider!.id,
          appointmentDate: new Date(),
          appointmentType: AppointmentType.sick_visit,
          status: AppointmentStatus.completed,
        },
      });

      const testRecord = await prisma.medicalRecord.create({
        data: {
          appointmentId: testAppointment.id,
          chiefComplaint: 'Test complaint',
        },
      });

      // Delete appointment
      await prisma.appointment.delete({
        where: { id: testAppointment.id },
      });

      // Verify medical record is deleted
      const record = await prisma.medicalRecord.findUnique({
        where: { id: testRecord.id },
      });
      expect(record).toBeNull();
    });

    it('should cascade delete symptoms when medical record is deleted', async () => {
      const provider = await prisma.provider.findFirst();
      const patient = await prisma.patient.findFirst();

      // Create test data
      const testAppointment = await prisma.appointment.create({
        data: {
          patientId: patient!.id,
          providerId: provider!.id,
          appointmentDate: new Date(),
          appointmentType: AppointmentType.sick_visit,
          status: AppointmentStatus.completed,
        },
      });

      const testRecord = await prisma.medicalRecord.create({
        data: {
          appointmentId: testAppointment.id,
          chiefComplaint: 'Test complaint',
        },
      });

      await prisma.symptom.create({
        data: {
          medicalRecordId: testRecord.id,
          symptomName: 'Test symptom',
        },
      });

      // Delete medical record
      await prisma.medicalRecord.delete({
        where: { id: testRecord.id },
      });

      // Verify symptom is deleted
      const symptom = await prisma.symptom.findFirst({
        where: { medicalRecordId: testRecord.id },
      });
      expect(symptom).toBeNull();

      // Cleanup
      await prisma.appointment.delete({ where: { id: testAppointment.id } });
    });
  });

  describe('Unique constraints', () => {
    it('should enforce unique email for providers', async () => {
      await expect(
        prisma.provider.create({
          data: {
            email: 'doctor@example.com', // Already exists
            passwordHash: 'hash',
            firstName: 'Another',
            lastName: 'Doctor',
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique appointmentId for medical records', async () => {
      const existingRecord = await prisma.medicalRecord.findFirst();

      await expect(
        prisma.medicalRecord.create({
          data: {
            appointmentId: existingRecord!.appointmentId, // Already exists
            chiefComplaint: 'Test',
          },
        })
      ).rejects.toThrow();
    });
  });
});
