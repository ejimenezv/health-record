# Work Tickets Index

## Implementation Order

### Phase 1: Foundation (Sprint 1)
| Ticket | Title | Priority | Story Points | Dependencies |
|--------|-------|----------|--------------|--------------|
| [TICKET-000](./TICKET-000-project-setup.md) | Project Setup and Configuration | P0-Critical | 5 | None |
| [TICKET-001](./TICKET-001-database-schema.md) | Database Schema Implementation | P0-Critical | 3 | TICKET-000 |
| [TICKET-002](./TICKET-002-auth-backend.md) | Authentication Backend | P0-Critical | 5 | TICKET-001 |
| [TICKET-003](./TICKET-003-auth-frontend.md) | Authentication Frontend | P0-Critical | 5 | TICKET-002 |

**Phase 1 Total: 18 Story Points**

### Phase 2: Patient Management (Sprint 2)
| Ticket | Title | Priority | Story Points | Dependencies |
|--------|-------|----------|--------------|--------------|
| [TICKET-004](./TICKET-004-patients-backend.md) | Patients Backend | P0-Critical | 5 | TICKET-002 |
| [TICKET-005](./TICKET-005-patients-frontend.md) | Patients Frontend | P0-Critical | 8 | TICKET-003, TICKET-004 |

**Phase 2 Total: 13 Story Points**

### Phase 3: Appointment Management (Sprint 3)
| Ticket | Title | Priority | Story Points | Dependencies |
|--------|-------|----------|--------------|--------------|
| [TICKET-006](./TICKET-006-appointments-backend.md) | Appointments Backend | P0-Critical | 5 | TICKET-004 |
| [TICKET-007](./TICKET-007-appointments-frontend.md) | Appointments Frontend | P0-Critical | 5 | TICKET-005, TICKET-006 |

**Phase 3 Total: 10 Story Points**

### Phase 4: Medical Records (Sprint 4)
| Ticket | Title | Priority | Story Points | Dependencies |
|--------|-------|----------|--------------|--------------|
| [TICKET-008](./TICKET-008-medical-records-backend.md) | Medical Records Backend | P0-Critical | 8 | TICKET-006 |
| [TICKET-009](./TICKET-009-medical-records-frontend.md) | Medical Records Frontend | P0-Critical | 8 | TICKET-007, TICKET-008 |

**Phase 4 Total: 16 Story Points**

### Phase 5: AI Integration (Sprint 5)
| Ticket | Title | Priority | Story Points | Dependencies |
|--------|-------|----------|--------------|--------------|
| [TICKET-010](./TICKET-010-transcription-backend.md) | AI Transcription Backend | P1-High | 8 | TICKET-008 |
| [TICKET-011](./TICKET-011-transcription-frontend.md) | AI Transcription Frontend | P1-High | 8 | TICKET-009, TICKET-010 |

**Phase 5 Total: 16 Story Points**

### Phase 6: Enhancements (Sprint 6)
| Ticket | Title | Priority | Story Points | Dependencies |
|--------|-------|----------|--------------|--------------|
| [TICKET-012](./TICKET-012-summary-generation.md) | Appointment Summary Generation | P2-Medium | 3 | TICKET-010 |

**Phase 6 Total: 3 Story Points**

---

## Summary Statistics

### By Priority
| Priority | Count | Story Points |
|----------|-------|--------------|
| P0-Critical | 10 | 57 |
| P1-High | 2 | 16 |
| P2-Medium | 1 | 3 |
| **Total** | **13** | **76** |

### By Type
| Type | Count |
|------|-------|
| Technical | 2 |
| Feature | 11 |
| **Total** | **13** |

### By Component
| Component | Count |
|-----------|-------|
| Backend | 6 |
| Frontend | 6 |
| Infrastructure | 1 |
| **Total** | **13** |

---

## Dependency Graph

```
TICKET-000 (Project Setup)
    │
    └── TICKET-001 (Database Schema)
            │
            └── TICKET-002 (Auth Backend)
                    │
                    ├── TICKET-003 (Auth Frontend)
                    │       │
                    │       └── TICKET-005 (Patients Frontend)
                    │               │
                    │               └── TICKET-007 (Appointments Frontend)
                    │                       │
                    │                       └── TICKET-009 (Medical Records Frontend)
                    │                               │
                    │                               └── TICKET-011 (Transcription Frontend)
                    │
                    └── TICKET-004 (Patients Backend)
                            │
                            └── TICKET-006 (Appointments Backend)
                                    │
                                    └── TICKET-008 (Medical Records Backend)
                                            │
                                            └── TICKET-010 (Transcription Backend)
                                                    │
                                                    └── TICKET-012 (Summary Generation)
```

---

## Critical Path

The critical path determines the minimum time to complete the project:

1. **TICKET-000** → Project Setup (5 pts)
2. **TICKET-001** → Database Schema (3 pts)
3. **TICKET-002** → Auth Backend (5 pts)
4. **TICKET-004** → Patients Backend (5 pts)
5. **TICKET-006** → Appointments Backend (5 pts)
6. **TICKET-008** → Medical Records Backend (8 pts)
7. **TICKET-010** → Transcription Backend (8 pts)
8. **TICKET-011** → Transcription Frontend (8 pts)

**Critical Path Total: 47 Story Points**

---

## User Story Coverage

| User Story | Ticket(s) |
|------------|-----------|
| US-001: Patient Registration | TICKET-004, TICKET-005 |
| US-002: Patient Listing & Search | TICKET-004, TICKET-005 |
| US-003: View Medical History | TICKET-005 |
| US-004: Create Appointment | TICKET-006, TICKET-007 |
| US-005: Manual Medical Record Entry | TICKET-008, TICKET-009 |
| US-006: AI Transcription Recording | TICKET-010, TICKET-011 |
| US-007: AI Auto-Fill Medical Record | TICKET-010, TICKET-011 |
| US-008: Appointment Summary Generation | TICKET-012 |
| US-010: User Authentication | TICKET-002, TICKET-003 |
| US-011: Data Persistence | TICKET-001 |

---

## Sprint Planning Suggestion

Assuming 2-week sprints with 20-25 story points capacity:

| Sprint | Tickets | Story Points |
|--------|---------|--------------|
| Sprint 1 | TICKET-000, TICKET-001, TICKET-002, TICKET-003 | 18 |
| Sprint 2 | TICKET-004, TICKET-005 | 13 |
| Sprint 3 | TICKET-006, TICKET-007, TICKET-008 (partial) | 18 |
| Sprint 4 | TICKET-008 (complete), TICKET-009 | 16 |
| Sprint 5 | TICKET-010, TICKET-011 | 16 |
| Sprint 6 | TICKET-012, Buffer/Polish | 3+ |

**Estimated Total Duration: 6 Sprints (12 weeks)**
