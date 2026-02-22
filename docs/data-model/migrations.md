# Database Migrations Strategy

## Overview

This document defines the database migration strategy for the Medical Record System MVP using Prisma Migrate. It covers migration workflows, naming conventions, and deployment considerations.

---

## Migration Tool

| Aspect | Value |
|--------|-------|
| **Tool** | Prisma Migrate |
| **Schema File** | `prisma/schema.prisma` |
| **Migrations Directory** | `prisma/migrations/` |
| **Migration Format** | SQL + metadata |

---

## Migration Naming Convention

### Format

```
YYYYMMDDHHMMSS_description_of_change
```

### Examples

| Migration Name | Description |
|----------------|-------------|
| `20240215120000_initial_schema` | Initial database schema |
| `20240216140000_add_patient_email_index` | Add index on patient email |
| `20240217100000_add_vital_signs_table` | Add vital signs table |
| `20240218090000_rename_provider_to_user` | Rename provider model |
| `20240219110000_add_transcription_status` | Add status enum to transcription |

### Naming Guidelines

1. Use snake_case for descriptions
2. Start with verb: `add_`, `remove_`, `update_`, `rename_`, `create_`
3. Be specific about the change
4. Keep descriptions under 50 characters

---

## Development Workflow

### Creating Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_feature_name

# Create migration without applying
npx prisma migrate dev --create-only --name add_feature_name
```

### Applying Migrations

```bash
# Apply pending migrations (development)
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy
```

### Resetting Database

```bash
# Reset and re-apply all migrations (development only)
npx prisma migrate reset

# Force reset (dangerous)
npx prisma migrate reset --force
```

---

## Initial Migration

### Content

The initial migration creates all tables for the MVP:

```sql
-- prisma/migrations/20240215120000_initial_schema/migration.sql

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female', 'other');
CREATE TYPE "AllergySeverity" AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');
CREATE TYPE "AppointmentType" AS ENUM ('new_patient', 'follow_up', 'routine_checkup', 'sick_visit', 'telehealth');
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "specialty" VARCHAR(255),
    "licenseNumber" VARCHAR(255),
    "phone" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "address" VARCHAR(255),
    "emergencyContactName" VARCHAR(255) NOT NULL,
    "emergencyContactPhone" VARCHAR(255) NOT NULL,
    "emergencyContactRelationship" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "allergen" VARCHAR(255) NOT NULL,
    "reaction" VARCHAR(255),
    "severity" "AllergySeverity",
    "onsetDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chronic_conditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "conditionName" VARCHAR(255) NOT NULL,
    "diagnosisDate" DATE,
    "status" VARCHAR(255) DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chronic_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentType" "AppointmentType" NOT NULL,
    "reasonForVisit" VARCHAR(255),
    "durationMinutes" INTEGER DEFAULT 30,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointmentId" UUID NOT NULL,
    "chiefComplaint" VARCHAR(255),
    "historyOfPresentIllness" TEXT,
    "physicalExamNotes" TEXT,
    "diagnosis" VARCHAR(255),
    "diagnosisNotes" TEXT,
    "treatmentPlan" TEXT,
    "followUpInstructions" TEXT,
    "patientEducation" TEXT,
    "audioFileUrl" VARCHAR(255),
    "transcript" TEXT,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicalRecordId" UUID NOT NULL,
    "symptomName" VARCHAR(255) NOT NULL,
    "bodySite" VARCHAR(255),
    "severity" SMALLINT,
    "duration" VARCHAR(255),
    "notes" TEXT,
    "isAIExtracted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicalRecordId" UUID NOT NULL,
    "medicationName" VARCHAR(255) NOT NULL,
    "strength" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(255) NOT NULL,
    "frequency" VARCHAR(255) NOT NULL,
    "duration" VARCHAR(255),
    "quantity" INTEGER,
    "refills" INTEGER DEFAULT 0,
    "instructions" TEXT NOT NULL,
    "indication" VARCHAR(255),
    "isAIExtracted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointmentId" UUID NOT NULL,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "heartRate" INTEGER,
    "temperature" DECIMAL(4,1),
    "respiratoryRate" INTEGER,
    "oxygenSaturation" INTEGER,
    "weight" DECIMAL(5,2),
    "height" DECIMAL(5,2),
    "bmi" DECIMAL(4,1),
    "painLevel" SMALLINT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_email_key" ON "providers"("email");
CREATE INDEX "patients_lastName_firstName_idx" ON "patients"("lastName", "firstName");
CREATE INDEX "patients_phone_idx" ON "patients"("phone");
CREATE INDEX "patients_email_idx" ON "patients"("email");
CREATE INDEX "allergies_patientId_idx" ON "allergies"("patientId");
CREATE INDEX "chronic_conditions_patientId_idx" ON "chronic_conditions"("patientId");
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");
CREATE INDEX "appointments_providerId_idx" ON "appointments"("providerId");
CREATE INDEX "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
CREATE UNIQUE INDEX "medical_records_appointmentId_key" ON "medical_records"("appointmentId");
CREATE INDEX "symptoms_medicalRecordId_idx" ON "symptoms"("medicalRecordId");
CREATE INDEX "prescriptions_medicalRecordId_idx" ON "prescriptions"("medicalRecordId");
CREATE UNIQUE INDEX "vital_signs_appointmentId_key" ON "vital_signs"("appointmentId");

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chronic_conditions" ADD CONSTRAINT "chronic_conditions_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_medicalRecordId_fkey"
    FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medicalRecordId_fkey"
    FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Migration Best Practices

### Do

1. **Small, incremental changes**: One logical change per migration
2. **Test locally first**: Run `migrate dev` before pushing
3. **Review generated SQL**: Check `migration.sql` files
4. **Backup before production**: Always backup before `migrate deploy`
5. **Use transactions**: Prisma wraps migrations in transactions

### Don't

1. **Never edit deployed migrations**: Create new migrations for fixes
2. **Never delete migrations**: They're part of history
3. **Avoid breaking changes**: Plan backwards-compatible changes
4. **Don't skip migrations**: Apply all pending migrations in order

---

## Development vs Production

### Development

```bash
# Full development workflow
npx prisma migrate dev --name description

# This will:
# 1. Create migration files
# 2. Apply migrations
# 3. Regenerate Prisma Client
# 4. Run seed (if configured)
```

### Production

```bash
# Production deployment
npx prisma migrate deploy

# This will:
# 1. Apply pending migrations only
# 2. NOT regenerate client
# 3. NOT run seed
```

---

## Rollback Strategy

Prisma Migrate does not support automatic rollbacks. For rollback scenarios:

### Option 1: Reverse Migration

Create a new migration that reverses the changes:

```bash
npx prisma migrate dev --name revert_previous_change
```

### Option 2: Database Restore

Restore from backup if migration causes issues:

```bash
# Restore from backup (example)
pg_restore -d medrecord backup_20240215.dump
```

### Option 3: Manual SQL

For emergencies, apply manual SQL fixes:

```sql
-- Revert specific changes
ALTER TABLE patients DROP COLUMN new_column;
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'prisma/schema.prisma'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Seed Data Strategy

### When to Seed

| Environment | Seed Data |
|-------------|-----------|
| Development | Full test dataset |
| Staging | Minimal test data |
| Production | Default provider only |

### Seed Configuration

```json
// package.json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Running Seeds

```bash
# Run seed manually
npx prisma db seed

# Seed runs automatically after:
npx prisma migrate reset
npx prisma migrate dev
```

---

## Common Migration Scenarios

### Adding a Column

```prisma
// Before
model Patient {
  firstName String
}

// After
model Patient {
  firstName  String
  middleName String?  // Add optional column
}
```

### Adding Required Column

```prisma
// Step 1: Add as optional
model Patient {
  newField String?
}

// Step 2: Backfill data
// (manually or via script)

// Step 3: Make required
model Patient {
  newField String
}
```

### Renaming Column

```prisma
// Prisma will drop and create - use @map instead
model Patient {
  fullName String @map("full_name")  // DB column is full_name
}
```

### Changing Type

```sql
-- May require manual migration
ALTER TABLE patients
ALTER COLUMN phone TYPE VARCHAR(20);
```

---

## Troubleshooting

### Migration Drift

```bash
# Check for drift between schema and database
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

### Resolve Conflicts

```bash
# Mark migrations as applied without running
npx prisma migrate resolve --applied 20240215120000_initial_schema

# Mark migrations as rolled back
npx prisma migrate resolve --rolled-back 20240215120000_initial_schema
```

### Reset Migration History

```bash
# Development only - resets everything
npx prisma migrate reset
```

---

## References

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema](./prisma-schema.md)
- [Seed Data](./seed-data.md)
