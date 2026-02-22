# API Summary

Quick reference guide for the MedRecord AI API.

---

## Endpoint Count by Category

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Authentication | 4 | Register, login, profile management |
| Patients | 8 | Patient CRUD, allergies, conditions |
| Appointments | 6 | Appointment CRUD, status management |
| Medical Records | 10 | SOAP notes, symptoms, prescriptions |
| Transcription | 5 | AI transcription and field extraction |
| **Total** | **33** | |

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Register Account                                           │
│      POST /api/v1/auth/register                                 │
│      └─> Returns: accessToken + user                            │
│                                                                 │
│   2. Login (if already registered)                              │
│      POST /api/v1/auth/login                                    │
│      └─> Returns: accessToken + user                            │
│                                                                 │
│   3. Use Token in All Requests                                  │
│      Header: Authorization: Bearer <accessToken>                │
│                                                                 │
│   4. Token Expires After 24 Hours                               │
│      └─> Re-login to get new token                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Table

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Create new account | No |
| POST | `/auth/login` | Get access token | No |
| GET | `/auth/me` | Get current user | Yes |
| PATCH | `/auth/profile` | Update profile | Yes |

### Patient Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/patients` | List patients | Yes |
| POST | `/patients` | Create patient | Yes |
| GET | `/patients/{id}` | Get patient details | Yes |
| PUT | `/patients/{id}` | Update patient | Yes |
| DELETE | `/patients/{id}` | Delete patient | Yes |
| GET | `/patients/{id}/appointments` | Get patient history | Yes |
| POST | `/patients/{id}/allergies` | Add allergy | Yes |
| POST | `/patients/{id}/conditions` | Add chronic condition | Yes |

### Appointment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/appointments` | List appointments | Yes |
| POST | `/appointments` | Create appointment | Yes |
| GET | `/appointments/{id}` | Get appointment | Yes |
| PUT | `/appointments/{id}` | Update appointment | Yes |
| PATCH | `/appointments/{id}/status` | Update status | Yes |
| DELETE | `/appointments/{id}` | Cancel appointment | Yes |

### Medical Record Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/appointments/{id}/record` | Get medical record | Yes |
| PUT | `/appointments/{id}/record` | Create/update record | Yes |
| PATCH | `/appointments/{id}/record` | Partial update | Yes |
| POST | `/appointments/{id}/record/complete` | Mark as complete | Yes |
| POST | `/appointments/{id}/record/symptoms` | Add symptom | Yes |
| PATCH | `/appointments/{id}/record/symptoms/{sid}` | Update symptom | Yes |
| DELETE | `/appointments/{id}/record/symptoms/{sid}` | Delete symptom | Yes |
| POST | `/appointments/{id}/record/prescriptions` | Add prescription | Yes |
| PATCH | `/appointments/{id}/record/prescriptions/{pid}` | Update prescription | Yes |
| DELETE | `/appointments/{id}/record/prescriptions/{pid}` | Delete prescription | Yes |

### Transcription Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/appointments/{id}/transcription/start` | Start session | Yes |
| POST | `/appointments/{id}/transcription/audio` | Upload audio | Yes |
| POST | `/appointments/{id}/transcription/stop` | Stop session | Yes |
| GET | `/appointments/{id}/transcription` | Get transcription | Yes |
| POST | `/appointments/{id}/extract-fields` | AI field extraction | Yes |

---

## WebSocket Events Summary

### Client → Server

| Event | Description |
|-------|-------------|
| `audio_chunk` | Send base64-encoded audio data |
| `stop_recording` | Signal end of recording |
| `ping` | Keep connection alive |

### Server → Client

| Event | Description |
|-------|-------------|
| `connected` | Connection established |
| `transcription_update` | Real-time transcription text |
| `field_extraction` | AI-extracted medical fields |
| `status` | Session status update |
| `error` | Error notification |
| `completed` | Transcription finished |
| `pong` | Ping response |

---

## Error Handling Reference

### HTTP Status Codes

| Code | Name | Common Causes |
|------|------|---------------|
| 400 | Bad Request | Malformed JSON, invalid query params |
| 401 | Unauthorized | Missing/invalid token, expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, concurrent edit |
| 422 | Validation Error | Invalid field values |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "message": "Human-readable error message",
  "errors": [
    {"field": "fieldName", "message": "Specific error"}
  ]
}
```

---

## Common Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `search` | string | - | Search term |
| `status` | string | - | Filter by status |
| `startDate` | date | - | Filter from date |
| `endDate` | date | - | Filter to date |

---

## Data Types

| Type | Format | Example |
|------|--------|---------|
| UUID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | `550e8400-e29b-41d4-a716-446655440000` |
| DateTime | ISO 8601 | `2024-01-15T10:30:00.000Z` |
| Date | ISO 8601 | `2024-01-15` |
| Sex | enum | `male`, `female`, `other` |
| AppointmentType | enum | `new_patient`, `follow_up`, `routine_checkup`, `sick_visit`, `telehealth` |
| AppointmentStatus | enum | `scheduled`, `checked_in`, `in_progress`, `completed`, `cancelled`, `no_show` |
| AllergySeverity | enum | `mild`, `moderate`, `severe`, `life_threatening` |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | per minute |
| AI Endpoints | 10 requests | per minute |
| Standard Endpoints | 100 requests | per minute |

---

## Typical Workflow

```
1. AUTHENTICATION
   POST /auth/login → Get accessToken

2. PATIENT MANAGEMENT
   GET /patients?search=name → Find patient
   POST /patients → Create if new
   GET /patients/{id} → Get full details

3. START APPOINTMENT
   POST /appointments → Create appointment
   PATCH /appointments/{id}/status → Set to "in_progress"

4. AI TRANSCRIPTION (Optional)
   POST /appointments/{id}/transcription/start → Get WebSocket URL
   [Connect to WebSocket, stream audio]
   POST /appointments/{id}/transcription/stop → Finalize
   POST /appointments/{id}/extract-fields → AI extraction

5. DOCUMENT VISIT
   PUT /appointments/{id}/record → Save medical record
   POST /appointments/{id}/record/symptoms → Add symptoms
   POST /appointments/{id}/record/prescriptions → Add prescriptions
   POST /appointments/{id}/record/complete → Finalize record

6. COMPLETE APPOINTMENT
   PATCH /appointments/{id}/status → Set to "completed"
```

---

## Files Structure

```
docs/api/
├── overview.md              # API overview and conventions
├── openapi.yaml            # Complete OpenAPI 3.0 specification
├── schemas.md              # All request/response schemas
├── websocket.md            # WebSocket events documentation
├── api-summary.md          # This quick reference
└── endpoints/
    ├── auth.md             # Authentication endpoints
    ├── patients.md         # Patient endpoints
    ├── appointments.md     # Appointment endpoints
    ├── medical-records.md  # Medical record endpoints
    └── transcription.md    # Transcription endpoints
```

---

## Related Documentation

- [API Overview](./overview.md)
- [OpenAPI Specification](./openapi.yaml)
- [WebSocket Events](./websocket.md)
- [API Schemas](./schemas.md)
- [AI Integration Interfaces](../ai-integration/interfaces.md)
