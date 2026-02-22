# Story Dependencies: MedRecord AI

## Overview

This document maps the dependencies between user stories and provides a recommended implementation order. Understanding dependencies is crucial for sprint planning and avoiding blocked work.

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    STORY DEPENDENCY GRAPH                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

LEGEND:
  ───▶  "depends on" (arrow points to dependency)
  [P0]  Must-Have priority
  [P1]  Should-Have priority
  [TEC] Technical story

                                    INFRASTRUCTURE LAYER
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                      │
│                              ┌─────────────────────────────────┐                                    │
│                              │    US-011: Data Persistence     │                                    │
│                              │    [TEC] [3 pts]                │                                    │
│                              │    Foundation for all data      │                                    │
│                              └─────────────────────────────────┘                                    │
│                                              │                                                       │
│                                              │ enables all data operations                           │
│                                              ▼                                                       │
│                              ┌─────────────────────────────────┐                                    │
│                              │    US-010: User Authentication  │                                    │
│                              │    [TEC] [5 pts]                │                                    │
│                              │    Gates all application access │                                    │
│                              └─────────────────────────────────┘                                    │
│                                              │                                                       │
└──────────────────────────────────────────────┼──────────────────────────────────────────────────────┘
                                               │
                                               │ required before any feature
                                               ▼
                                    APPLICATION LAYER

     ┌─────────────────────────────────────────────────────────────────────────────────────────┐
     │                                                                                          │
     │    ┌───────────────────────────┐                                                        │
     │    │  US-001: Patient          │                                                        │
     │    │  Registration             │                                                        │
     │    │  [P0] [5 pts]             │                                                        │
     │    └───────────────────────────┘                                                        │
     │                │                                                                         │
     │                │ patients must exist                                                     │
     │                ▼                                                                         │
     │    ┌───────────────────────────┐                                                        │
     │    │  US-002: Patient          │                                                        │
     │    │  Listing & Search         │                                                        │
     │    │  [P0] [3 pts]             │                                                        │
     │    └───────────────────────────┘                                                        │
     │                │                                                                         │
     │                │ patient selection required                                              │
     │                ▼                                                                         │
     │    ┌───────────────────────────┐                                                        │
     │    │  US-004: Create           │                                                        │
     │    │  Appointment              │                                                        │
     │    │  [P0] [3 pts]             │                                                        │
     │    └───────────────────────────┘                                                        │
     │                │                                                                         │
     │       ┌───────┴───────────────────────────────────┐                                     │
     │       │                                           │                                      │
     │       ▼                                           ▼                                      │
     │    ┌───────────────────────────┐    ┌───────────────────────────┐                       │
     │    │  US-005: Manual           │    │  US-006: AI               │                       │
     │    │  Medical Record Entry     │    │  Transcription            │                       │
     │    │  [P0] [8 pts]             │    │  [P0] [8 pts]             │                       │
     │    └───────────────────────────┘    └───────────────────────────┘                       │
     │                │                                 │                                       │
     │                │                                 │                                       │
     │       ┌───────┴─────────────────────────────────┘                                       │
     │       │                                                                                  │
     │       ▼                                                                                  │
     │    ┌───────────────────────────┐                                                        │
     │    │  US-007: AI Auto-Fill     │                                                        │
     │    │  Medical Record           │                                                        │
     │    │  [P0] [13 pts]            │                                                        │
     │    └───────────────────────────┘                                                        │
     │                │                                                                         │
     │                │ records must exist                                                      │
     │       ┌───────┴───────────────────┐                                                     │
     │       │                           │                                                      │
     │       ▼                           ▼                                                      │
     │    ┌───────────────────────────┐  │                                                     │
     │    │  US-003: View Patient     │  │                                                     │
     │    │  Medical History          │  │                                                     │
     │    │  [P0] [5 pts]             │  │                                                     │
     │    └───────────────────────────┘  │                                                     │
     │                │                   │                                                     │
     └────────────────┼───────────────────┼────────────────────────────────────────────────────┘
                      │                   │
                      │                   │
                      ▼                   ▼
          ┌───────────────────────────────────────────────────────┐
          │                  ENHANCEMENT LAYER                     │
          │                                                        │
          │    ┌───────────────────────────┐                      │
          │    │  US-008: Summary          │                      │
          │    │  Generation               │                      │
          │    │  [P1] [5 pts]             │                      │
          │    └───────────────────────────┘                      │
          │                                                        │
          │    ┌───────────────────────────┐                      │
          │    │  US-009: Export           │                      │
          │    │  to PDF                   │                      │
          │    │  [P1] [3 pts]             │                      │
          │    └───────────────────────────┘                      │
          │                                                        │
          └────────────────────────────────────────────────────────┘
```

---

## Dependency Matrix

| Story | Depends On | Is Dependency For |
|-------|------------|-------------------|
| **US-001** | US-010, US-011 | US-002, US-003, US-004 |
| **US-002** | US-001 | US-003, US-004 |
| **US-003** | US-002, US-004, US-005 | US-009 |
| **US-004** | US-002 | US-005, US-006, US-003 |
| **US-005** | US-004, US-011 | US-003, US-007, US-008, US-009 |
| **US-006** | US-004 | US-007 |
| **US-007** | US-005, US-006 | US-008 |
| **US-008** | US-005, US-007 | - |
| **US-009** | US-003, US-005 | - |
| **US-010** | US-011 | All application stories |
| **US-011** | - | All stories |

---

## Critical Path

The critical path represents the longest sequence of dependent stories that must be completed:

```
US-011 → US-010 → US-001 → US-002 → US-004 → US-006 → US-007
   │                                   │
   └──────────── 3 + 5 + 5 + 3 + 3 + 8 + 13 = 40 points ────────────┘

```

This critical path goes through the AI features and represents the core value proposition of the product.

---

## Recommended Implementation Order

### Phase 1: Infrastructure (8 points)

```
ORDER 1: US-011 - Data Persistence [3 pts]
    └──▶ Enables all data storage

ORDER 2: US-010 - User Authentication [5 pts]
    └──▶ Protects application access
```

**Rationale**: Must be completed first as all other stories depend on data persistence and authentication.

### Phase 2: Patient Foundation (8 points)

```
ORDER 3: US-001 - Patient Registration [5 pts]
    └──▶ Creates patients in the system

ORDER 4: US-002 - Patient Listing & Search [3 pts]
    └──▶ Enables finding patients
```

**Rationale**: Patient management is prerequisite for appointments.

### Phase 3: Core Documentation (16 points)

```
ORDER 5: US-004 - Create Appointment [3 pts]
    └──▶ Links patient to medical record

ORDER 6: US-005 - Manual Medical Record Entry [8 pts]
    └──▶ Core documentation functionality

ORDER 7: US-003 - View Patient Medical History [5 pts]
    └──▶ Access past records
```

**Rationale**: Establishes the complete manual workflow before AI features.

### Phase 4: AI Features (21 points)

```
ORDER 8: US-006 - AI Transcription Recording [8 pts]
    └──▶ Capture audio and transcribe

ORDER 9: US-007 - AI Auto-Fill Medical Record [13 pts]
    └──▶ AI extracts structured data
```

**Rationale**: AI features build on manual workflow and add core value proposition.

### Phase 5: Enhancements (8 points)

```
ORDER 10: US-008 - Appointment Summary Generation [5 pts]
    └──▶ AI-generated summaries

ORDER 11: US-009 - Export Medical Record to PDF [3 pts]
    └──▶ Generate printable documents
```

**Rationale**: Nice-to-have features that enhance completed workflows.

---

## Implementation Order Summary

| Order | Story ID | Title | Points | Running Total |
|-------|----------|-------|--------|---------------|
| 1 | US-011 | Data Persistence | 3 | 3 |
| 2 | US-010 | User Authentication | 5 | 8 |
| 3 | US-001 | Patient Registration | 5 | 13 |
| 4 | US-002 | Patient Listing & Search | 3 | 16 |
| 5 | US-004 | Create Appointment | 3 | 19 |
| 6 | US-005 | Manual Medical Record Entry | 8 | 27 |
| 7 | US-003 | View Patient Medical History | 5 | 32 |
| 8 | US-006 | AI Transcription Recording | 8 | 40 |
| 9 | US-007 | AI Auto-Fill Medical Record | 13 | 53 |
| 10 | US-008 | Appointment Summary Generation | 5 | 58 |
| 11 | US-009 | Export Medical Record to PDF | 3 | 61 |

---

## Parallel Work Opportunities

Some stories can be worked on in parallel once their dependencies are met:

### Parallel Set 1 (after US-002)
- US-003 (needs some appointments first)
- US-004

### Parallel Set 2 (after US-004)
- US-005
- US-006

### Parallel Set 3 (after US-007)
- US-008
- US-009

---

## Risk: Blocked Stories

| Story | Blocking Risk | Mitigation |
|-------|---------------|------------|
| US-007 | Blocked if US-006 transcription fails | Implement manual entry first (US-005) as fallback |
| US-006 | Blocked by API issues | Prepare mock transcription for testing |
| All stories | Blocked by US-011 | Prioritize database setup first |

---

## Milestone Definitions

| Milestone | Stories Complete | Value Delivered |
|-----------|------------------|-----------------|
| **M1: Authentication** | US-010, US-011 | Secure, persistent application |
| **M2: Patient Management** | +US-001, US-002 | Can register and find patients |
| **M3: Manual Workflow** | +US-004, US-005, US-003 | Complete manual documentation |
| **M4: AI Features** | +US-006, US-007 | AI-assisted documentation (MVP complete) |
| **M5: Enhanced** | +US-008, US-009 | Full feature set |
