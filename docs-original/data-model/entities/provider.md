# Entity: Provider

## Overview

The Provider entity represents a healthcare provider (doctor) who uses the Medical Record System. In the MVP scope, this is a single-user system, but the data model supports future multi-tenant expansion.

---

## Schema Definition

```prisma
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
```

---

## Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | PK, Auto-generated | Unique identifier |
| `email` | String | Yes | UNIQUE, NOT NULL | Login email address |
| `passwordHash` | String | Yes | NOT NULL | bcrypt password hash |
| `firstName` | String | Yes | NOT NULL | Provider's first name |
| `lastName` | String | Yes | NOT NULL | Provider's last name |
| `specialty` | String | No | NULL | Medical specialty (e.g., "General Practice") |
| `licenseNumber` | String | No | NULL | Medical license number |
| `phone` | String | No | NULL | Contact phone number |
| `createdAt` | DateTime | Yes | DEFAULT NOW | Account creation timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated | Last modification timestamp |

---

## Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| `email` | Valid email format | "Invalid email format" |
| `email` | Unique | "Email already registered" |
| `passwordHash` | Min 60 chars (bcrypt) | N/A (internal) |
| `firstName` | 2-50 characters | "First name must be 2-50 characters" |
| `lastName` | 2-50 characters | "Last name must be 2-50 characters" |
| `specialty` | Max 100 characters | "Specialty too long" |
| `licenseNumber` | Max 50 characters | "License number too long" |
| `phone` | Valid phone format | "Invalid phone format" |

---

## Relationships

| Relation | Type | Target | Description |
|----------|------|--------|-------------|
| `appointments` | 1:N | Appointment | Appointments created by this provider |

---

## Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Record lookup |
| Unique | `email` | Unique | Login/duplicate prevention |

---

## Default Values

| Field | Default Value |
|-------|---------------|
| `id` | `uuid()` |
| `createdAt` | `now()` |
| `specialty` | `null` |
| `licenseNumber` | `null` |
| `phone` | `null` |

---

## Business Rules

1. **Authentication**: Email and password are required for login
2. **Password Security**: Passwords must be hashed using bcrypt with cost factor 12
3. **Unique Email**: No two providers can have the same email
4. **MVP Scope**: Currently single-provider system

---

## Example Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "doctor@example.com",
  "passwordHash": "$2b$12$...",
  "firstName": "John",
  "lastName": "Smith",
  "specialty": "General Practice",
  "licenseNumber": "MD-12345",
  "phone": "+1-555-0100",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## API Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Login | `/api/auth/login` | POST |
| Get Profile | `/api/auth/me` | GET |
| Update Profile | `/api/auth/profile` | PATCH |

---

## References

- [ER Design](../er-design.md)
- [Prisma Schema](../prisma-schema.md)
