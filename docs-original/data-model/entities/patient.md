# Entity: Patient

## Overview

The Patient entity stores demographic and contact information for individuals receiving medical care. This is a core entity that links to appointments, allergies, and chronic conditions.

---

## Schema Definition

```prisma
model Patient {
  id                           String             @id @default(uuid())
  firstName                    String
  lastName                     String
  dateOfBirth                  DateTime           @db.Date
  sex                          Sex
  phone                        String
  email                        String?
  address                      String?
  bloodType                    String?
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
```

---

## Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `firstName` | String | Yes | NOT NULL | Patient's first name |
| `lastName` | String | Yes | NOT NULL | Patient's last name |
| `dateOfBirth` | Date | Yes | NOT NULL | Birth date (DATE type) |
| `sex` | Enum | Yes | NOT NULL | Biological sex |
| `phone` | String | Yes | NOT NULL | Primary contact phone |
| `email` | String | No | NULL | Email address |
| `address` | String | No | NULL | Full address (single field) |
| `bloodType` | String | No | NULL | Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-) |
| `emergencyContactName` | String | Yes | NOT NULL | Emergency contact full name |
| `emergencyContactPhone` | String | Yes | NOT NULL | Emergency contact phone |
| `emergencyContactRelationship` | String | No | NULL | Relationship to patient |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Record creation timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated | Last modification timestamp |

---

## Sex Enum Values

| Value | Description |
|-------|-------------|
| `male` | Male |
| `female` | Female |
| `other` | Other / Prefer not to say |

---

## Blood Type Values

| Value | Description |
|-------|-------------|
| `A+` | A positive |
| `A-` | A negative |
| `B+` | B positive |
| `B-` | B negative |
| `AB+` | AB positive |
| `AB-` | AB negative |
| `O+` | O positive |
| `O-` | O negative |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `firstName` | 2-50 characters | "First name must be 2-50 characters" |
| `lastName` | 2-50 characters | "Last name must be 2-50 characters" |
| `dateOfBirth` | Not future date | "Date of birth cannot be in the future" |
| `dateOfBirth` | Reasonable age (0-150 years) | "Invalid date of birth" |
| `sex` | Valid enum value | "Invalid sex value" |
| `phone` | Valid phone format | "Invalid phone format" |
| `email` | Valid email format (if provided) | "Invalid email format" |
| `address` | Max 200 characters | "Address too long" |
| `emergencyContactName` | 2-100 characters | "Emergency contact name must be 2-100 characters" |
| `emergencyContactPhone` | Valid phone format | "Invalid emergency contact phone" |
| `emergencyContactRelationship` | Max 50 characters | "Relationship too long" |
| `bloodType` | Valid enum value (if provided) | "Invalid blood type" |

---

## Relationships

| Relation | Type | Target | Cascade |
|----------|------|--------|---------|
| `allergies` | 1:N | Allergy | DELETE |
| `chronicConditions` | 1:N | ChronicCondition | DELETE |
| `appointments` | 1:N | Appointment | DELETE |

---

## Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Record lookup |
| Composite | `[lastName, firstName]` | Non-unique | Name search |
| Single | `phone` | Non-unique | Phone lookup |
| Single | `email` | Non-unique | Email lookup |

---

## Default Values

| Field | Default Value |
|-------|---------------|
| `id` | `uuid()` |
| `createdAt` | `now()` |
| `email` | `null` |
| `address` | `null` |
| `bloodType` | `null` |
| `emergencyContactRelationship` | `null` |

---

## Business Rules

1. **Emergency Contact Required**: All patients must have emergency contact information
2. **Duplicate Detection**: Warn if patient with same name + DOB exists
3. **Age Calculation**: Age is calculated from `dateOfBirth`, not stored
4. **Cascade Deletes**: Deleting patient removes all related records

---

## Computed Properties

| Property | Calculation | Description |
|----------|-------------|-------------|
| `age` | `today - dateOfBirth` | Current age in years |
| `fullName` | `firstName + " " + lastName` | Full display name |

---

## Example Data

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1985-03-15",
  "sex": "female",
  "phone": "+1-555-0100",
  "email": "jane.doe@email.com",
  "address": "123 Main Street, Springfield, IL 62701",
  "bloodType": "O+",
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+1-555-0101",
  "emergencyContactRelationship": "Spouse",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List Patients | `/api/patients` | GET |
| Search Patients | `/api/patients?search=query` | GET |
| Get Patient | `/api/patients/:id` | GET |
| Create Patient | `/api/patients` | POST |
| Update Patient | `/api/patients/:id` | PATCH |
| Delete Patient | `/api/patients/:id` | DELETE |

---

## References

- [ER Design](../er-design.md)
- [Prisma Schema](../prisma-schema.md)
- [MVP Fields Selection](../../research/mvp-fields-selection.md)
