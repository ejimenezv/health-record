# Seed Data

## Overview

This document defines the seed data strategy for the Medical Record System MVP. Seed data provides initial database content for development and testing purposes.

---

## Seed Data Strategy

### By Environment

| Environment | Data | Purpose |
|-------------|------|---------|
| Development | Full test dataset | Feature development and testing |
| Staging | Minimal dataset | Integration testing |
| Production | Default provider only | Initial system setup |

---

## Seed Script

### File Location

```
prisma/
├── schema.prisma
├── seed.ts           # Main seed script
└── migrations/
```

### Package.json Configuration

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

---

## Complete Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient, Sex, AppointmentType, AppointmentStatus, AllergySeverity } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // 1. CREATE DEFAULT PROVIDER
  // ============================================
  const passwordHash = await bcrypt.hash('password123', 12);

  const provider = await prisma.provider.upsert({
    where: { email: 'doctor@example.com' },
    update: {},
    create: {
      email: 'doctor@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Smith',
      specialty: 'General Practice',
      licenseNumber: 'MD-12345',
      phone: '+1-555-0100',
    },
  });

  console.log('✅ Created provider:', provider.email);

  // Skip remaining seed data in production
  if (process.env.NODE_ENV === 'production') {
    console.log('🏁 Production seed complete (provider only)');
    return;
  }

  // ============================================
  // 2. CREATE SAMPLE PATIENTS
  // ============================================
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      update: {},
      create: {
        id: '11111111-1111-1111-1111-111111111111',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-03-15'),
        sex: Sex.female,
        phone: '+1-555-0101',
        email: 'jane.doe@email.com',
        address: '123 Main Street, Springfield, IL 62701',
        emergencyContactName: 'John Doe',
        emergencyContactPhone: '+1-555-0102',
        emergencyContactRelationship: 'Spouse',
      },
    }),
    prisma.patient.upsert({
      where: { id: '22222222-2222-2222-2222-222222222222' },
      update: {},
      create: {
        id: '22222222-2222-2222-2222-222222222222',
        firstName: 'Robert',
        lastName: 'Johnson',
        dateOfBirth: new Date('1972-08-22'),
        sex: Sex.male,
        phone: '+1-555-0201',
        email: 'robert.j@email.com',
        address: '456 Oak Avenue, Springfield, IL 62702',
        emergencyContactName: 'Mary Johnson',
        emergencyContactPhone: '+1-555-0202',
        emergencyContactRelationship: 'Wife',
      },
    }),
    prisma.patient.upsert({
      where: { id: '33333333-3333-3333-3333-333333333333' },
      update: {},
      create: {
        id: '33333333-3333-3333-3333-333333333333',
        firstName: 'Maria',
        lastName: 'Garcia',
        dateOfBirth: new Date('1990-11-08'),
        sex: Sex.female,
        phone: '+1-555-0301',
        email: 'maria.garcia@email.com',
        address: '789 Pine Road, Springfield, IL 62703',
        emergencyContactName: 'Carlos Garcia',
        emergencyContactPhone: '+1-555-0302',
        emergencyContactRelationship: 'Brother',
      },
    }),
    prisma.patient.upsert({
      where: { id: '44444444-4444-4444-4444-444444444444' },
      update: {},
      create: {
        id: '44444444-4444-4444-4444-444444444444',
        firstName: 'Michael',
        lastName: 'Chen',
        dateOfBirth: new Date('1968-05-30'),
        sex: Sex.male,
        phone: '+1-555-0401',
        email: 'michael.chen@email.com',
        emergencyContactName: 'Linda Chen',
        emergencyContactPhone: '+1-555-0402',
        emergencyContactRelationship: 'Wife',
      },
    }),
    prisma.patient.upsert({
      where: { id: '55555555-5555-5555-5555-555555555555' },
      update: {},
      create: {
        id: '55555555-5555-5555-5555-555555555555',
        firstName: 'Emily',
        lastName: 'Williams',
        dateOfBirth: new Date('1995-02-14'),
        sex: Sex.female,
        phone: '+1-555-0501',
        emergencyContactName: 'Sarah Williams',
        emergencyContactPhone: '+1-555-0502',
        emergencyContactRelationship: 'Mother',
      },
    }),
  ]);

  console.log(`✅ Created ${patients.length} patients`);

  // ============================================
  // 3. CREATE ALLERGIES
  // ============================================
  await prisma.allergy.createMany({
    data: [
      {
        patientId: '11111111-1111-1111-1111-111111111111',
        allergen: 'Penicillin',
        reaction: 'Rash, hives',
        severity: AllergySeverity.moderate,
      },
      {
        patientId: '22222222-2222-2222-2222-222222222222',
        allergen: 'Peanuts',
        reaction: 'Anaphylaxis',
        severity: AllergySeverity.life_threatening,
      },
      {
        patientId: '22222222-2222-2222-2222-222222222222',
        allergen: 'Latex',
        reaction: 'Skin irritation',
        severity: AllergySeverity.mild,
      },
      {
        patientId: '33333333-3333-3333-3333-333333333333',
        allergen: 'Sulfa drugs',
        reaction: 'Difficulty breathing',
        severity: AllergySeverity.severe,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created allergies');

  // ============================================
  // 4. CREATE CHRONIC CONDITIONS
  // ============================================
  await prisma.chronicCondition.createMany({
    data: [
      {
        patientId: '22222222-2222-2222-2222-222222222222',
        conditionName: 'Hypertension',
        diagnosisDate: new Date('2018-06-15'),
        status: 'active',
        notes: 'Controlled with medication',
      },
      {
        patientId: '22222222-2222-2222-2222-222222222222',
        conditionName: 'Type 2 Diabetes',
        diagnosisDate: new Date('2020-03-10'),
        status: 'active',
        notes: 'Diet-controlled, A1C 6.8%',
      },
      {
        patientId: '44444444-4444-4444-4444-444444444444',
        conditionName: 'Asthma',
        diagnosisDate: new Date('2015-01-20'),
        status: 'active',
        notes: 'Mild intermittent, uses rescue inhaler as needed',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created chronic conditions');

  // ============================================
  // 5. CREATE SAMPLE APPOINTMENTS
  // ============================================
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const appointment1 = await prisma.appointment.upsert({
    where: { id: 'aaaa1111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      patientId: '11111111-1111-1111-1111-111111111111',
      providerId: provider.id,
      appointmentDate: oneWeekAgo,
      appointmentType: AppointmentType.sick_visit,
      reasonForVisit: 'Persistent headache for 3 days',
      durationMinutes: 30,
      status: AppointmentStatus.completed,
    },
  });

  const appointment2 = await prisma.appointment.upsert({
    where: { id: 'aaaa2222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: 'aaaa2222-2222-2222-2222-222222222222',
      patientId: '22222222-2222-2222-2222-222222222222',
      providerId: provider.id,
      appointmentDate: twoWeeksAgo,
      appointmentType: AppointmentType.follow_up,
      reasonForVisit: 'Blood pressure follow-up',
      durationMinutes: 20,
      status: AppointmentStatus.completed,
    },
  });

  const appointment3 = await prisma.appointment.upsert({
    where: { id: 'aaaa3333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      id: 'aaaa3333-3333-3333-3333-333333333333',
      patientId: '33333333-3333-3333-3333-333333333333',
      providerId: provider.id,
      appointmentDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      appointmentType: AppointmentType.routine_checkup,
      reasonForVisit: 'Annual physical exam',
      durationMinutes: 45,
      status: AppointmentStatus.scheduled,
    },
  });

  console.log('✅ Created appointments');

  // ============================================
  // 6. CREATE MEDICAL RECORDS
  // ============================================
  await prisma.medicalRecord.upsert({
    where: { appointmentId: appointment1.id },
    update: {},
    create: {
      appointmentId: appointment1.id,
      chiefComplaint: 'Persistent headache for 3 days',
      historyOfPresentIllness: 'Patient reports dull, throbbing headache starting Sunday morning. Pain rated 6/10. Located in bilateral temporal regions. No visual disturbances, no fever, no neck stiffness. Tylenol provided minimal relief. Reports increased work stress recently.',
      physicalExamNotes: 'Alert and oriented x3. No focal neurological deficits. Mild tenderness in temporal region bilaterally. Pupils equal and reactive. No papilledema.',
      diagnosis: 'Tension headache',
      diagnosisNotes: 'Likely stress-related. No red flags for secondary causes.',
      treatmentPlan: 'Rest, hydration, OTC ibuprofen 400mg every 6 hours as needed. Consider stress reduction techniques.',
      followUpInstructions: 'Return if symptoms worsen, develop fever, visual changes, or persist beyond 1 week.',
      patientEducation: 'Discussed headache triggers including stress, dehydration, and poor sleep. Recommended sleep hygiene improvements.',
      isAIGenerated: true,
      isDraft: false,
      symptoms: {
        create: [
          {
            symptomName: 'Headache',
            bodySite: 'Bilateral temporal region',
            severity: 6,
            duration: '3 days',
            notes: 'Dull, throbbing quality. Worse in morning.',
            isAIExtracted: true,
          },
          {
            symptomName: 'Stress',
            severity: 7,
            duration: '2 weeks',
            notes: 'Work-related stress',
            isAIExtracted: true,
          },
        ],
      },
      prescriptions: {
        create: [
          {
            medicationName: 'Ibuprofen',
            strength: '400mg',
            dosage: '1 tablet',
            frequency: 'Every 6-8 hours as needed',
            duration: '5 days',
            quantity: 20,
            refills: 0,
            instructions: 'Take with food. Do not exceed 1200mg per day. Stop if stomach upset occurs.',
            indication: 'Headache pain relief',
            isAIExtracted: true,
          },
        ],
      },
    },
  });

  await prisma.medicalRecord.upsert({
    where: { appointmentId: appointment2.id },
    update: {},
    create: {
      appointmentId: appointment2.id,
      chiefComplaint: 'Blood pressure follow-up',
      historyOfPresentIllness: 'Patient returns for blood pressure check. Reports good medication compliance. No headaches, chest pain, or shortness of breath. Diet modifications ongoing.',
      physicalExamNotes: 'Well-appearing male. BP 132/84 (improved from 148/92). HR 72 regular. No edema.',
      diagnosis: 'Hypertension - improving',
      diagnosisNotes: 'Blood pressure improved with current regimen. Continue monitoring.',
      treatmentPlan: 'Continue Lisinopril 10mg daily. Maintain low-sodium diet. Regular exercise.',
      followUpInstructions: 'Return in 3 months for follow-up. Check labs in 6 weeks.',
      isDraft: false,
      symptoms: {
        create: [],
      },
      prescriptions: {
        create: [],
      },
    },
  });

  console.log('✅ Created medical records with symptoms and prescriptions');

  // ============================================
  // 7. CREATE VITAL SIGNS
  // ============================================
  await prisma.vitalSigns.createMany({
    data: [
      {
        appointmentId: appointment1.id,
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 76,
        heartRate: 78,
        temperature: 98.4,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 145.5,
        height: 65.0,
        painLevel: 6,
      },
      {
        appointmentId: appointment2.id,
        bloodPressureSystolic: 132,
        bloodPressureDiastolic: 84,
        heartRate: 72,
        temperature: 98.2,
        respiratoryRate: 14,
        oxygenSaturation: 99,
        weight: 195.0,
        height: 70.0,
        painLevel: 0,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created vital signs');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Test Data Summary

### Provider (1)

| Field | Value |
|-------|-------|
| Email | doctor@example.com |
| Password | password123 |
| Name | Dr. John Smith |
| Specialty | General Practice |

### Patients (5)

| Name | DOB | Conditions |
|------|-----|------------|
| Jane Doe | 1985-03-15 | Penicillin allergy |
| Robert Johnson | 1972-08-22 | Hypertension, Diabetes, Peanut allergy |
| Maria Garcia | 1990-11-08 | Sulfa drug allergy |
| Michael Chen | 1968-05-30 | Asthma |
| Emily Williams | 1995-02-14 | None |

### Appointments (3)

| Patient | Type | Status | Date |
|---------|------|--------|------|
| Jane Doe | Sick Visit | Completed | 1 week ago |
| Robert Johnson | Follow-up | Completed | 2 weeks ago |
| Maria Garcia | Routine | Scheduled | 2 days from now |

---

## Running Seeds

### Development

```bash
# Run seed script
npx prisma db seed

# Reset and seed
npx prisma migrate reset
```

### First-Time Setup

```bash
# Full setup
npx prisma migrate dev
npx prisma db seed
```

### Reset Everything

```bash
# Warning: Destroys all data
npx prisma migrate reset --force
```

---

## References

- [Prisma Seeding Documentation](https://www.prisma.io/docs/guides/database/seed-database)
- [Migrations Strategy](./migrations.md)
- [Prisma Schema](./prisma-schema.md)
