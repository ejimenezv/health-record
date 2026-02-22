# Story Map: MedRecord AI

## Overview

This document provides a visual representation of how user stories connect and the end-to-end user journey through the system. The story map helps visualize dependencies, identify gaps, and plan implementation order.

---

## Story Map by User Activity

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MEDRECORD AI - USER STORY MAP                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

USER ACTIVITIES (Backbone)
═══════════════════════════════════════════════════════════════════════════════════════════════════════
   LOGIN         PATIENT           APPOINTMENT        DOCUMENTATION         REVIEW &          OUTPUT
                 MANAGEMENT        MANAGEMENT                               HISTORY
═══════════════════════════════════════════════════════════════════════════════════════════════════════

MUST-HAVE (P0)
───────────────────────────────────────────────────────────────────────────────────────────────────────
┌──────────┐  ┌─────────────────┐  ┌───────────────┐  ┌───────────────────┐  ┌─────────────────┐
│ US-010   │  │ US-001          │  │ US-004        │  │ US-005            │  │ US-003          │
│ User     │  │ Patient         │  │ Create New    │  │ Manual Medical    │  │ View Patient    │
│ Auth     │  │ Registration    │  │ Appointment   │  │ Record Entry      │  │ Medical History │
│ [5 pts]  │  │ [5 pts]         │  │ [3 pts]       │  │ [8 pts]           │  │ [5 pts]         │
└──────────┘  └─────────────────┘  └───────────────┘  └───────────────────┘  └─────────────────┘
      │              │                    │                    │                     │
      │       ┌─────────────────┐         │           ┌───────────────────┐          │
      │       │ US-002          │         │           │ US-006            │          │
      │       │ Patient         │         │           │ AI Transcription  │          │
      │       │ Listing/Search  │         │           │ Recording         │          │
      │       │ [3 pts]         │         │           │ [8 pts]           │          │
      │       └─────────────────┘         │           └───────────────────┘          │
      │                                   │                    │                     │
      │                                   │           ┌───────────────────┐          │
      │                                   │           │ US-007            │          │
      │                                   │           │ AI Auto-Fill      │          │
      │                                   │           │ Medical Record    │          │
      │                                   │           │ [13 pts]          │          │
      │                                   │           └───────────────────┘          │
      │                                   │                                          │
INFRASTRUCTURE                            │                                          │
───────────────────────────────────────────────────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ US-011: Data Persistence [3 pts]                                                                  │
│ (Foundation for all data operations - supports all stories above)                                 │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘

SHOULD-HAVE (P1)
───────────────────────────────────────────────────────────────────────────────────────────────────────
                                                      ┌───────────────────┐  ┌─────────────────┐
                                                      │ US-008            │  │ US-009          │
                                                      │ Appointment       │  │ Export Medical  │
                                                      │ Summary           │  │ Record to PDF   │
                                                      │ Generation        │  │ [3 pts]         │
                                                      │ [5 pts]           │  │                 │
                                                      └───────────────────┘  └─────────────────┘
```

---

## E2E Flow: Story Participation

### Flow 1: Complete Appointment with AI Transcription (Golden Path)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              GOLDEN PATH: AI-ASSISTED DOCUMENTATION                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: Access System
└──▶ US-010: User Authentication
     └──▶ US-011: Data Persistence
           │
           ▼
STEP 2: Find or Create Patient
└──▶ US-002: Patient Listing and Search
     ├──▶ [Patient Found] → Select Patient
     └──▶ [Not Found] → US-001: Patient Registration
           │
           ▼
STEP 3: Create Appointment
└──▶ US-004: Create New Appointment
     └──▶ US-003: View Patient Medical History (optional review)
           │
           ▼
STEP 4: Record Consultation
└──▶ US-006: AI Transcription Recording
     ├──▶ Start Recording
     ├──▶ Conduct Consultation
     └──▶ Stop Recording
           │
           ▼
STEP 5: AI Processing
└──▶ US-006: Transcription Processing
     └──▶ US-007: AI Auto-Fill Medical Record
           │
           ▼
STEP 6: Review & Edit
└──▶ US-007: Review AI Suggestions
     └──▶ US-005: Manual Medical Record Entry (edit/add)
           │
           ▼
STEP 7: Complete Appointment
└──▶ US-005: Save Medical Record
     └──▶ US-008: Generate Summary (optional)
           └──▶ US-009: Export to PDF (optional)
```

### Flow 2: Manual Documentation (No AI)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ALTERNATIVE PATH: MANUAL DOCUMENTATION                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: Access System
└──▶ US-010: User Authentication
           │
           ▼
STEP 2: Find or Create Patient
└──▶ US-002: Patient Listing and Search
     └──▶ US-001: Patient Registration (if new)
           │
           ▼
STEP 3: Create Appointment
└──▶ US-004: Create New Appointment
           │
           ▼
STEP 4: Document Manually
└──▶ US-005: Manual Medical Record Entry
     ├──▶ Enter Chief Complaint
     ├──▶ Add Symptoms
     ├──▶ Enter Diagnosis
     └──▶ Add Prescriptions
           │
           ▼
STEP 5: Complete
└──▶ US-005: Save Record
     └──▶ US-009: Export to PDF (optional)
```

### Flow 3: Review Patient History

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HISTORY REVIEW FLOW                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

US-010: Login
    │
    ▼
US-002: Search for Patient
    │
    ▼
US-003: View Medical History
    │
    ├──▶ Browse Appointment List
    ├──▶ View Individual Records
    ├──▶ Navigate Between Appointments
    │
    └──▶ US-009: Export Record to PDF (optional)
```

---

## Story Priority Matrix

```
                    URGENCY
         ┌────────────────────────────────────┐
         │  HIGH                    LOW       │
    ─────┼────────────────────────────────────┼─────
    HIGH │  US-010 Authentication             │  US-008 Summary Gen
         │  US-011 Data Persistence           │  US-009 PDF Export
I        │  US-001 Patient Registration       │
M        │  US-002 Patient Listing            │
P        │  US-004 Create Appointment         │
A        │  US-005 Manual Record Entry        │
C        │  US-006 AI Transcription           │
T        │  US-007 AI Auto-Fill               │
         │  US-003 View History               │
    ─────┼────────────────────────────────────┼─────
    LOW  │                                    │
         │                                    │
         └────────────────────────────────────┘
```

---

## Stories by Screen/Component

| Screen | Stories Involved |
|--------|-----------------|
| **Login Page** | US-010 |
| **Dashboard** | US-002, US-010 |
| **Patient List** | US-002, US-001 (link to create) |
| **Patient Registration Form** | US-001, US-011 |
| **Patient Profile** | US-003, US-004 (button) |
| **Appointment Form** | US-004, US-011 |
| **Medical Record Entry** | US-005, US-006, US-007 |
| **Transcript Panel** | US-006, US-007 |
| **History View** | US-003, US-008, US-009 |

---

## Story Dependencies Quick Reference

| Story | Depends On | Enables |
|-------|------------|---------|
| US-001 | US-010, US-011 | US-002, US-004 |
| US-002 | US-001 | US-003, US-004 |
| US-003 | US-002, US-005 | US-009 |
| US-004 | US-002 | US-005, US-006 |
| US-005 | US-004, US-011 | US-003, US-007, US-008, US-009 |
| US-006 | US-004 | US-007 |
| US-007 | US-005, US-006 | US-008 |
| US-008 | US-005, US-007 | (standalone) |
| US-009 | US-005, US-003 | (standalone) |
| US-010 | - | All stories |
| US-011 | - | All stories |

---

## Sprint Planning Suggestions

### Sprint 1: Foundation (16 points)
- US-011: Data Persistence (3)
- US-010: User Authentication (5)
- US-001: Patient Registration (5)
- US-002: Patient Listing (3)

### Sprint 2: Core Workflow (16 points)
- US-004: Create Appointment (3)
- US-005: Manual Record Entry (8)
- US-003: View Medical History (5)

### Sprint 3: AI Features (21 points)
- US-006: AI Transcription (8)
- US-007: AI Auto-Fill (13)

### Sprint 4: Enhancements (8 points)
- US-008: Summary Generation (5)
- US-009: PDF Export (3)

**Total: 61 points across 4 sprints**
