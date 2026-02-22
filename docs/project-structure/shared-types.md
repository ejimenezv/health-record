# Shared Types Definition

This document defines the types that need to be shared between frontend and backend, along with the strategy for sharing them.

---

## Overview

Both frontend and backend use TypeScript and need consistent type definitions for:
- API request/response payloads
- Domain entities (Patient, Appointment, etc.)
- Enums (status values, types)

---

## Types to Share

### Domain Entities

#### Patient

```typescript
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  sex: Sex;
  phone: string;
  email: string | null;
  address: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string | null;
  createdAt: string;
  updatedAt: string;
  allergies?: Allergy[];
  chronicConditions?: ChronicCondition[];
}

interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  reaction: string | null;
  severity: AllergySeverity | null;
  onsetDate: string | null;
  createdAt: string;
}

interface ChronicCondition {
  id: string;
  patientId: string;
  conditionName: string;
  diagnosisDate: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string;
}
```

#### Appointment

```typescript
interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  appointmentDate: string;
  appointmentType: AppointmentType;
  reasonForVisit: string | null;
  durationMinutes: number | null;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  medicalRecord?: MedicalRecord;
  vitalSigns?: VitalSigns;
}
```

#### Medical Record

```typescript
interface MedicalRecord {
  id: string;
  appointmentId: string;
  chiefComplaint: string | null;
  historyOfPresentIllness: string | null;
  physicalExamNotes: string | null;
  diagnosis: string | null;
  diagnosisNotes: string | null;
  treatmentPlan: string | null;
  followUpInstructions: string | null;
  patientEducation: string | null;
  audioFileUrl: string | null;
  transcript: string | null;
  isAIGenerated: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  symptoms?: Symptom[];
  prescriptions?: Prescription[];
}

interface Symptom {
  id: string;
  medicalRecordId: string;
  symptomName: string;
  bodySite: string | null;
  severity: number | null;
  duration: string | null;
  notes: string | null;
  isAIExtracted: boolean;
  createdAt: string;
}

interface Prescription {
  id: string;
  medicalRecordId: string;
  medicationName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  quantity: number | null;
  refills: number | null;
  instructions: string;
  indication: string | null;
  isAIExtracted: boolean;
  createdAt: string;
}
```

#### Vital Signs

```typescript
interface VitalSigns {
  id: string;
  appointmentId: string;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  painLevel: number | null;
  recordedAt: string;
}
```

### Enums

```typescript
enum Sex {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening',
}

enum AppointmentType {
  NEW_PATIENT = 'new_patient',
  FOLLOW_UP = 'follow_up',
  ROUTINE_CHECKUP = 'routine_checkup',
  SICK_VISIT = 'sick_visit',
  TELEHEALTH = 'telehealth',
}

enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}
```

### API Types

#### Request Types

```typescript
// Create Patient
interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
}

// Update Patient
interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: Sex;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

// Create Appointment
interface CreateAppointmentRequest {
  patientId: string;
  appointmentDate: string;
  appointmentType: AppointmentType;
  reasonForVisit?: string;
  durationMinutes?: number;
}

// Update Medical Record
interface UpdateMedicalRecordRequest {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  physicalExamNotes?: string;
  diagnosis?: string;
  diagnosisNotes?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  patientEducation?: string;
  symptoms?: CreateSymptomRequest[];
  prescriptions?: CreatePrescriptionRequest[];
  isDraft?: boolean;
}

interface CreateSymptomRequest {
  symptomName: string;
  bodySite?: string;
  severity?: number;
  duration?: string;
  notes?: string;
  isAIExtracted?: boolean;
}

interface CreatePrescriptionRequest {
  medicationName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions: string;
  indication?: string;
  isAIExtracted?: boolean;
}
```

#### Response Types

```typescript
// Standard API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Paginated Response
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// AI Extraction Response
interface TranscriptionResponse {
  transcript: string;
}

interface ExtractionResponse {
  chiefComplaint: string | null;
  historyOfPresentIllness: string | null;
  symptoms: ExtractedSymptom[];
  diagnosis: string | null;
  diagnosisNotes: string | null;
  treatmentPlan: string | null;
  prescriptions: ExtractedPrescription[];
  followUp: string | null;
}

interface ExtractedSymptom {
  name: string;
  severity: number | null;
  duration: string | null;
  bodySite: string | null;
}

interface ExtractedPrescription {
  medicationName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  instructions: string;
}
```

---

## Sharing Strategies

### Option 1: Copy Types (Recommended for MVP)

**Approach**: Maintain separate but identical type files in frontend and backend.

**Structure**:
```
packages/
├── backend/
│   └── src/types/
│       ├── patients.types.ts
│       ├── appointments.types.ts
│       └── ...
└── frontend/
    └── src/types/
        ├── patients.types.ts
        ├── appointments.types.ts
        └── ...
```

**Pros**:
- Simple setup, no build complexity
- Each package is self-contained
- No circular dependency issues
- Easy to understand

**Cons**:
- Manual synchronization required
- Risk of types drifting apart
- Duplication of code

**Mitigation**:
- Document which types must match
- Use a checklist during PR review
- Consider automated validation in CI

### Option 2: Shared Package (Future Enhancement)

**Approach**: Create a third workspace package for shared types.

**Structure**:
```
packages/
├── shared/
│   └── src/
│       ├── types/
│       │   ├── patients.ts
│       │   ├── appointments.ts
│       │   └── index.ts
│       └── index.ts
├── backend/
│   └── src/
│       └── ... (imports from @health-record/shared)
└── frontend/
    └── src/
        └── ... (imports from @health-record/shared)
```

**package.json** for shared:
```json
{
  "name": "@health-record/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

**Pros**:
- Single source of truth
- No synchronization needed
- Can include shared validation schemas

**Cons**:
- Additional build step
- More complex workspace setup
- Must rebuild on changes

### Option 3: Generate from Schema (Advanced)

**Approach**: Generate TypeScript types from Prisma schema or OpenAPI spec.

**Tools**:
- Prisma: Auto-generates types from schema
- OpenAPI Generator: Generate from API spec
- Custom script: Transform Prisma types to API types

**Pros**:
- Types always match database/API
- No manual synchronization
- Reduces human error

**Cons**:
- Complex setup
- Generated code may need customization
- Learning curve

---

## Recommended Approach for MVP

### Use Option 1: Copy Types

For the MVP phase, manually maintain types in both packages. This is the simplest approach that allows rapid development without additional build complexity.

### Implementation Guidelines

1. **Create canonical types in backend first**
   - Backend types are the source of truth
   - They match Prisma-generated types

2. **Copy to frontend with modifications**
   - Convert `Date` to `string` (JSON serialization)
   - Remove server-only fields if any
   - Add frontend-specific computed types

3. **Document shared types**
   - Mark types that must be synchronized
   - Add comments indicating they're shared

4. **Review during PRs**
   - Check for type changes affecting both packages
   - Update both when API changes

### Type Differences Between Packages

| Field Type | Backend (Prisma) | Frontend (API Response) |
|------------|------------------|------------------------|
| Date/DateTime | `Date` | `string` (ISO format) |
| Decimal | `Prisma.Decimal` | `number` |
| Enums | Prisma enum | String union or const enum |
| Nullable | `Type \| null` | `Type \| null` |

### Example: Patient Type

**Backend** (`packages/backend/src/types/patients.types.ts`):
```typescript
import type { Patient as PrismaPatient, Allergy, ChronicCondition } from '@prisma/client';

// Re-export Prisma types for internal use
export type { PrismaPatient, Allergy, ChronicCondition };

// API response type (serialized)
export interface PatientResponse {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO string
  sex: 'male' | 'female' | 'other';
  phone: string;
  email: string | null;
  address: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string | null;
  createdAt: string;
  updatedAt: string;
  allergies?: AllergyResponse[];
  chronicConditions?: ChronicConditionResponse[];
}
```

**Frontend** (`packages/frontend/src/types/patients.types.ts`):
```typescript
// Matches API response from backend
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  phone: string;
  email: string | null;
  address: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string | null;
  createdAt: string;
  updatedAt: string;
  allergies?: Allergy[];
  chronicConditions?: ChronicCondition[];
}

// Frontend-specific computed types
export interface PatientWithFullName extends Patient {
  fullName: string;
  age: number;
}
```

---

## Future Improvements

When the project scales beyond MVP:

1. **Create shared package**
   - Extract common types to `packages/shared`
   - Both packages depend on it

2. **Add API schema validation**
   - Use Zod schemas in shared package
   - Validate on both client and server

3. **Generate types from OpenAPI**
   - Backend generates OpenAPI spec
   - Frontend generates types from spec

4. **Add type tests**
   - Ensure frontend types match backend responses
   - Catch breaking changes in CI

---

## References

- [Backend Structure](./backend-structure.md)
- [Frontend Structure](./frontend-structure.md)
- [Data Model](../data-model/prisma-schema.md)
