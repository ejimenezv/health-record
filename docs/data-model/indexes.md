# Database Indexes

## Overview

This document defines the indexing strategy for the Medical Record System database. Indexes are optimized for the expected query patterns of a single-provider practice with < 500 patients.

---

## Automatic Indexes

Prisma automatically creates indexes for:

### Primary Keys

| Table | Column | Index Type |
|-------|--------|------------|
| providers | id | UNIQUE B-tree |
| patients | id | UNIQUE B-tree |
| allergies | id | UNIQUE B-tree |
| chronic_conditions | id | UNIQUE B-tree |
| appointments | id | UNIQUE B-tree |
| medical_records | id | UNIQUE B-tree |
| symptoms | id | UNIQUE B-tree |
| prescriptions | id | UNIQUE B-tree |
| vital_signs | id | UNIQUE B-tree |

### Unique Constraints

| Table | Column | Purpose |
|-------|--------|---------|
| providers | email | Login uniqueness |
| medical_records | appointmentId | 1:1 relationship |
| vital_signs | appointmentId | 1:1 relationship |

---

## Explicit Indexes

### Patient Search Indexes

```prisma
model Patient {
  @@index([lastName, firstName])
  @@index([phone])
  @@index([email])
}
```

| Index | Type | Query Pattern |
|-------|------|---------------|
| `[lastName, firstName]` | Composite B-tree | Name search, sorting |
| `[phone]` | Single B-tree | Phone lookup |
| `[email]` | Single B-tree | Email lookup |

### Appointment Indexes

```prisma
model Appointment {
  @@index([patientId])
  @@index([providerId])
  @@index([appointmentDate])
  @@index([status])
}
```

| Index | Type | Query Pattern |
|-------|------|---------------|
| `[patientId]` | Single B-tree | Patient appointment history |
| `[providerId]` | Single B-tree | Provider schedule |
| `[appointmentDate]` | Single B-tree | Date range queries |
| `[status]` | Single B-tree | Status filtering |

### Child Entity Indexes

```prisma
model Allergy {
  @@index([patientId])
}

model ChronicCondition {
  @@index([patientId])
}

model Symptom {
  @@index([medicalRecordId])
}

model Prescription {
  @@index([medicalRecordId])
}
```

| Table | Index | Query Pattern |
|-------|-------|---------------|
| allergies | `[patientId]` | Patient allergies lookup |
| chronic_conditions | `[patientId]` | Patient conditions lookup |
| symptoms | `[medicalRecordId]` | Record symptoms lookup |
| prescriptions | `[medicalRecordId]` | Record prescriptions lookup |

---

## Index Analysis by Query

### Patient List with Search

```sql
SELECT * FROM patients
WHERE lower(lastName) LIKE 'smi%'
   OR lower(firstName) LIKE 'smi%'
ORDER BY lastName, firstName
LIMIT 20;
```

**Index Used**: `[lastName, firstName]` composite index

### Patient Appointment History

```sql
SELECT * FROM appointments
WHERE patientId = $1
ORDER BY appointmentDate DESC;
```

**Index Used**: `[patientId]` index

### Today's Appointments

```sql
SELECT * FROM appointments
WHERE appointmentDate >= $1 AND appointmentDate < $2
  AND status != 'cancelled'
ORDER BY appointmentDate;
```

**Indexes Used**: `[appointmentDate]`, `[status]`

### Patient Complete Profile

```sql
SELECT p.*, a.*, cc.*
FROM patients p
LEFT JOIN allergies a ON a.patientId = p.id
LEFT JOIN chronic_conditions cc ON cc.patientId = p.id
WHERE p.id = $1;
```

**Indexes Used**: Primary key, `[patientId]` on allergies and chronic_conditions

### Medical Record with Details

```sql
SELECT mr.*, s.*, rx.*
FROM medical_records mr
LEFT JOIN symptoms s ON s.medicalRecordId = mr.id
LEFT JOIN prescriptions rx ON rx.medicalRecordId = mr.id
WHERE mr.appointmentId = $1;
```

**Indexes Used**: `[appointmentId]` unique, `[medicalRecordId]` on symptoms and prescriptions

---

## Composite Index Considerations

### Name Search Index

The `[lastName, firstName]` composite index supports:
- Search by lastName alone (prefix match)
- Search by lastName AND firstName
- Sorting by lastName, firstName

It does NOT efficiently support:
- Search by firstName alone (requires separate index or full scan)

### Potential Additional Indexes

For future optimization if needed:

| Index | Table | Use Case |
|-------|-------|----------|
| `[firstName]` | patients | First name search |
| `[patientId, appointmentDate]` | appointments | Patient history sorted by date |
| `[providerId, appointmentDate]` | appointments | Provider schedule by date |
| `[status, appointmentDate]` | appointments | Status-filtered date queries |

---

## Index Storage Estimate

Based on MVP scale expectations:

| Table | Rows | Index Size Estimate |
|-------|------|---------------------|
| providers | 1 | < 1 KB |
| patients | 500 | ~ 50 KB |
| allergies | 1,000 | ~ 30 KB |
| chronic_conditions | 1,000 | ~ 30 KB |
| appointments | 5,000 | ~ 200 KB |
| medical_records | 5,000 | ~ 150 KB |
| symptoms | 15,000 | ~ 300 KB |
| prescriptions | 10,000 | ~ 200 KB |
| vital_signs | 5,000 | ~ 150 KB |

**Total Estimated Index Size**: < 2 MB

---

## PostgreSQL Index Types

### B-tree (Default)

Used for all indexes in this schema. Optimal for:
- Equality comparisons (`=`)
- Range queries (`<`, `>`, `BETWEEN`)
- Pattern matching with prefix (`LIKE 'abc%'`)
- `ORDER BY` operations

### Future Considerations

| Index Type | Use Case | When Needed |
|------------|----------|-------------|
| GIN | Full-text search | If implementing diagnosis/symptom search |
| GiST | Geographic queries | If adding location-based features |
| BRIN | Time-series data | For large appointment tables |

---

## Prisma Index Syntax

### Single Column Index

```prisma
model Patient {
  phone String
  @@index([phone])
}
```

### Composite Index

```prisma
model Patient {
  lastName  String
  firstName String
  @@index([lastName, firstName])
}
```

### Unique Constraint (Creates Unique Index)

```prisma
model Provider {
  email String @unique
}
```

### Relation Field Index

```prisma
model Appointment {
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id])
  @@index([patientId])
}
```

---

## Index Maintenance

### Automatic

PostgreSQL handles:
- Index updates on INSERT/UPDATE/DELETE
- VACUUM for dead tuple cleanup
- Auto-analyze for query planning

### Manual (Production)

Consider periodic:

```sql
-- Rebuild indexes (requires downtime)
REINDEX TABLE table_name;

-- Update statistics
ANALYZE table_name;
```

---

## Query Performance Monitoring

### Useful PostgreSQL Commands

```sql
-- Check index usage
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes;

-- Check table statistics
SELECT schemaname, relname, seq_scan, idx_scan
FROM pg_stat_user_tables;

-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM patients WHERE lastName = 'Smith';
```

---

## References

- [Prisma Schema](./prisma-schema.md)
- [Database Technology Stack](../tech-stack/database.md)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/15/indexes.html)
