# Database Technology Stack: MedRecord AI

This document defines the database technology stack for the Medical Record System MVP.

---

## Primary Database

### PostgreSQL 15

| Specification | Value |
|---------------|-------|
| **Database** | PostgreSQL |
| **Version** | 15.x |
| **Character Set** | UTF-8 |
| **Collation** | en_US.UTF-8 |

### Why PostgreSQL Over Alternatives

| Database | Pros | Cons | Decision |
|----------|------|------|----------|
| **PostgreSQL** | ACID compliant, JSON support, full-text search, mature | More resource-intensive | **Selected** |
| MySQL | Familiar, fast reads | Weaker JSON support, less strict | Rejected |
| SQLite | Zero config, embedded | Limited concurrency, file-based | Development only |
| MongoDB | Flexible schema, JSON native | Not relational, eventual consistency | Rejected |

### Selection Rationale

PostgreSQL selected for Medical Record System because:

1. **ACID Compliance**: Medical records require strict data integrity
2. **Relational Model**: Patient → Appointments → Records fits naturally
3. **JSON Support**: JSONB can store AI extraction results if needed
4. **Full-Text Search**: Built-in search for patient names, symptoms
5. **Prisma Support**: Excellent Prisma ORM integration
6. **Production Ready**: Battle-tested for healthcare applications

---

## ORM / Query Builder

### Prisma ORM

| Specification | Value |
|---------------|-------|
| **ORM** | Prisma |
| **Version** | 5.10.x |
| **Schema File** | prisma/schema.prisma |
| **Migration Tool** | Prisma Migrate |

### Prisma Features Used

| Feature | Purpose |
|---------|---------|
| **Prisma Client** | Type-safe database access |
| **Prisma Migrate** | Schema migrations |
| **Prisma Studio** | Visual database browser |
| **Relation Queries** | Nested reads/writes |

### Prisma Schema Overview

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Core models: Provider, Patient, Appointment, MedicalRecord
// Supporting models: Allergy, ChronicCondition, Symptom, Prescription, VitalSigns
```

---

## Schema Design

### Entity Relationship Diagram

```
┌─────────────────┐
│    Provider     │
│  (single user)  │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Appointment   │────▶│     Patient     │
│                 │ N:1 │                 │
└────────┬────────┘     └────────┬────────┘
         │ 1:1                   │ 1:N
         ▼                       ├──────────┐
┌─────────────────┐              ▼          ▼
│  MedicalRecord  │     ┌──────────┐  ┌─────────────────┐
│                 │     │ Allergy  │  │ChronicCondition │
└────────┬────────┘     └──────────┘  └─────────────────┘
         │ 1:N
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Symptom │ │ Prescription │
└─────────┘ └──────────────┘
```

### Data Types Mapping

| Application Type | PostgreSQL Type | Prisma Type |
|------------------|-----------------|-------------|
| UUID | uuid | String @id @default(uuid()) |
| Date only | DATE | DateTime @db.Date |
| DateTime | TIMESTAMP | DateTime |
| Enum | Custom ENUM | enum |
| Long text | TEXT | String @db.Text |
| Short string | VARCHAR(255) | String |
| Integer | INTEGER | Int |
| Decimal | DECIMAL | Decimal |
| Boolean | BOOLEAN | Boolean |

### Enum Definitions

```prisma
enum Sex {
  male
  female
  other
}

enum AllergySeverity {
  mild
  moderate
  severe
  life_threatening
}

enum AppointmentType {
  new_patient
  follow_up
  routine_checkup
  sick_visit
  telehealth
}

enum AppointmentStatus {
  scheduled
  checked_in
  in_progress
  completed
  cancelled
  no_show
}
```

---

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============ ENUMS ============

enum Sex {
  male
  female
  other
}

enum AllergySeverity {
  mild
  moderate
  severe
  life_threatening
}

enum AppointmentType {
  new_patient
  follow_up
  routine_checkup
  sick_visit
  telehealth
}

enum AppointmentStatus {
  scheduled
  checked_in
  in_progress
  completed
  cancelled
  no_show
}

// ============ MODELS ============

model Provider {
  id            String        @id @default(uuid())
  email         String        @unique
  passwordHash  String
  firstName     String
  lastName      String
  specialty     String?
  licenseNumber String?
  phone         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  appointments  Appointment[]

  @@map("providers")
}

model Patient {
  id                           String             @id @default(uuid())
  firstName                    String
  lastName                     String
  dateOfBirth                  DateTime           @db.Date
  sex                          Sex
  phone                        String
  email                        String?
  address                      String?
  emergencyContactName         String
  emergencyContactPhone        String
  emergencyContactRelationship String?
  createdAt                    DateTime           @default(now())
  updatedAt                    DateTime           @updatedAt
  allergies                    Allergy[]
  chronicConditions            ChronicCondition[]
  appointments                 Appointment[]

  @@index([lastName, firstName])
  @@index([phone])
  @@index([email])
  @@map("patients")
}

model Allergy {
  id        String           @id @default(uuid())
  patientId String
  patient   Patient          @relation(fields: [patientId], references: [id], onDelete: Cascade)
  allergen  String
  reaction  String?
  severity  AllergySeverity?
  onsetDate DateTime?        @db.Date
  createdAt DateTime         @default(now())

  @@index([patientId])
  @@map("allergies")
}

model ChronicCondition {
  id            String    @id @default(uuid())
  patientId     String
  patient       Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  conditionName String
  diagnosisDate DateTime? @db.Date
  status        String?   @default("active")
  notes         String?
  createdAt     DateTime  @default(now())

  @@index([patientId])
  @@map("chronic_conditions")
}

model Appointment {
  id              String            @id @default(uuid())
  patientId       String
  patient         Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  providerId      String
  provider        Provider          @relation(fields: [providerId], references: [id])
  appointmentDate DateTime
  appointmentType AppointmentType
  reasonForVisit  String?
  durationMinutes Int?              @default(30)
  status          AppointmentStatus @default(scheduled)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  medicalRecord   MedicalRecord?
  vitalSigns      VitalSigns?

  @@index([patientId])
  @@index([providerId])
  @@index([appointmentDate])
  @@index([status])
  @@map("appointments")
}

model MedicalRecord {
  id                      String         @id @default(uuid())
  appointmentId           String         @unique
  appointment             Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  chiefComplaint          String?
  historyOfPresentIllness String?        @db.Text
  physicalExamNotes       String?        @db.Text
  diagnosis               String?
  diagnosisNotes          String?        @db.Text
  treatmentPlan           String?        @db.Text
  followUpInstructions    String?        @db.Text
  patientEducation        String?        @db.Text
  audioFileUrl            String?
  transcript              String?        @db.Text
  isAIGenerated           Boolean        @default(false)
  isDraft                 Boolean        @default(true)
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt
  symptoms                Symptom[]
  prescriptions           Prescription[]

  @@map("medical_records")
}

model Symptom {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  symptomName     String
  bodySite        String?
  severity        Int?          @db.SmallInt
  duration        String?
  notes           String?       @db.Text
  isAIExtracted   Boolean       @default(false)
  createdAt       DateTime      @default(now())

  @@index([medicalRecordId])
  @@map("symptoms")
}

model Prescription {
  id              String        @id @default(uuid())
  medicalRecordId String
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  medicationName  String
  strength        String
  dosage          String
  frequency       String
  duration        String?
  quantity        Int?
  refills         Int?          @default(0)
  instructions    String        @db.Text
  indication      String?
  isAIExtracted   Boolean       @default(false)
  createdAt       DateTime      @default(now())

  @@index([medicalRecordId])
  @@map("prescriptions")
}

model VitalSigns {
  id                     String      @id @default(uuid())
  appointmentId          String      @unique
  appointment            Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  bloodPressureSystolic  Int?
  bloodPressureDiastolic Int?
  heartRate              Int?
  temperature            Decimal?    @db.Decimal(4, 1)
  respiratoryRate        Int?
  oxygenSaturation       Int?
  weight                 Decimal?    @db.Decimal(5, 2)
  height                 Decimal?    @db.Decimal(5, 2)
  bmi                    Decimal?    @db.Decimal(4, 1)
  painLevel              Int?        @db.SmallInt
  recordedAt             DateTime    @default(now())

  @@map("vital_signs")
}
```

---

## Indexing Strategy

### Indexes Created

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| patients | (lastName, firstName) | Composite | Name search |
| patients | (phone) | Single | Phone lookup |
| patients | (email) | Single | Email lookup |
| appointments | (patientId) | Single | Patient history |
| appointments | (providerId) | Single | Provider schedule |
| appointments | (appointmentDate) | Single | Date filtering |
| appointments | (status) | Single | Status filtering |
| symptoms | (medicalRecordId) | Single | Record symptoms |
| prescriptions | (medicalRecordId) | Single | Record prescriptions |
| allergies | (patientId) | Single | Patient allergies |
| chronic_conditions | (patientId) | Single | Patient conditions |

### Unique Constraints

| Table | Constraint | Purpose |
|-------|------------|---------|
| providers | email | No duplicate accounts |
| medical_records | appointmentId | One record per appointment |
| vital_signs | appointmentId | One vital signs per appointment |

---

## Development Database

### Docker PostgreSQL Setup

```yaml
# docker-compose.yml (development)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: medrecord
      POSTGRES_PASSWORD: medrecord_dev
      POSTGRES_DB: medrecord
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medrecord"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Local Development Connection

```bash
# .env.development
DATABASE_URL="postgresql://medrecord:medrecord_dev@localhost:5432/medrecord?schema=public"
```

### Alternative: SQLite for Simpler Setup

For quick local development without Docker:

```bash
# .env.development.local
DATABASE_URL="file:./dev.db"
```

Note: Requires schema adjustments for SQLite compatibility.

---

## Database Administration Tools

### Prisma Studio (Recommended)

```bash
# Built into Prisma
npx prisma studio
```

Opens visual database browser at http://localhost:5555

### pgAdmin (Alternative)

| Specification | Value |
|---------------|-------|
| **Tool** | pgAdmin 4 |
| **Access** | Web-based |
| **Docker Image** | dpage/pgadmin4 |

```yaml
# docker-compose.yml (optional)
services:
  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
```

### DBeaver (Alternative)

Desktop database tool supporting PostgreSQL with visual schema editor.

---

## Migration Strategy

### Prisma Migrate Workflow

```bash
# Create migration from schema changes
npx prisma migrate dev --name descriptive_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### Migration Naming Convention

```
YYYYMMDDHHMMSS_descriptive_action

Examples:
20240220120000_create_initial_schema
20240221150000_add_patient_email_index
20240222100000_add_vital_signs_table
```

### Migration Best Practices

1. **Small, incremental changes**: One logical change per migration
2. **Descriptive names**: Clear indication of what changed
3. **Test locally first**: Always run on dev before production
4. **Never edit deployed migrations**: Create new migrations for fixes
5. **Review generated SQL**: Check migrations/*/migration.sql

---

## Seed Data

### Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create default provider
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
    },
  });

  console.log('Created provider:', provider.email);

  // Create sample patients (development only)
  if (process.env.NODE_ENV === 'development') {
    const patient = await prisma.patient.upsert({
      where: { id: 'sample-patient-1' },
      update: {},
      create: {
        id: 'sample-patient-1',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-03-15'),
        sex: 'female',
        phone: '+1-555-0100',
        email: 'jane.doe@email.com',
        emergencyContactName: 'John Doe',
        emergencyContactPhone: '+1-555-0101',
        emergencyContactRelationship: 'Spouse',
      },
    });

    console.log('Created sample patient:', patient.firstName, patient.lastName);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Package.json Configuration

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Running Seeds

```bash
# Run seed
npx prisma db seed

# Seed runs automatically after:
npx prisma migrate reset
npx prisma migrate dev
```

---

## Connection Pooling

### Prisma Connection Pool

```bash
# Connection string with pooling configuration
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=10"
```

| Parameter | Value | Purpose |
|-----------|-------|---------|
| connection_limit | 10 | Max connections in pool |
| pool_timeout | 10 | Seconds to wait for connection |

### Production Considerations

For MVP with single-server deployment:
- Connection limit: 10-20 connections
- Default Prisma pooling is sufficient
- No external pooler (PgBouncer) needed

---

## Backup Strategy

### Development

No automated backups for development database.

### Production (MVP)

```bash
# Manual backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="medrecord_backup_${TIMESTAMP}.sql"

docker exec medrecord-postgres pg_dump -U medrecord medrecord > backups/$BACKUP_FILE
gzip backups/$BACKUP_FILE

# Keep last 7 days
find backups/ -name "*.gz" -mtime +7 -delete
```

### Restore

```bash
# Restore from backup
gunzip -c backups/medrecord_backup_20240220.sql.gz | \
  docker exec -i medrecord-postgres psql -U medrecord medrecord
```

---

## Data Integrity Rules

### Implemented via Prisma Schema

| Rule | Implementation |
|------|----------------|
| Required fields | Non-nullable types |
| Referential integrity | Foreign key relations |
| Cascade deletes | onDelete: Cascade |
| Unique constraints | @unique directive |
| Enum validation | Prisma enums |

### Implemented via Application

| Rule | Implementation |
|------|----------------|
| Severity range (1-10) | Zod validation |
| Valid date formats | Zod validation |
| Phone number format | Regex validation |
| Email format | Zod email() |
| Duplicate patient check | Service layer logic |

---

## Performance Considerations

### Query Optimization

1. **Use Prisma's select/include wisely**
   ```typescript
   // Only fetch needed fields
   const patients = await prisma.patient.findMany({
     select: {
       id: true,
       firstName: true,
       lastName: true,
       phone: true,
     },
   });
   ```

2. **Pagination for lists**
   ```typescript
   const patients = await prisma.patient.findMany({
     skip: (page - 1) * limit,
     take: limit,
     orderBy: { lastName: 'asc' },
   });
   ```

3. **Avoid N+1 queries**
   ```typescript
   // Use include for related data
   const appointments = await prisma.appointment.findMany({
     include: {
       patient: true,
       medicalRecord: true,
     },
   });
   ```

### MVP Scale Expectations

| Metric | Expected Value |
|--------|----------------|
| Total patients | < 500 |
| Daily appointments | < 20 |
| Database size | < 1 GB |
| Concurrent connections | < 10 |

PostgreSQL handles this scale easily without optimization concerns.

---

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
