# API Overview

This document provides an overview of the MedRecord AI REST API, including authentication, common patterns, and error handling.

---

## Base URL

```
/api/v1
```

**Development**: `http://localhost:3001/api/v1`
**Production**: `https://api.medrecord.app/api/v1`

---

## Authentication

The API uses **Bearer JWT tokens** for authentication. Most endpoints require authentication.

### Obtaining a Token

1. Register a new account via `POST /api/v1/auth/register`
2. Or login via `POST /api/v1/auth/login`
3. Both endpoints return an `accessToken`

### Using the Token

Include the token in the `Authorization` header for all authenticated requests:

```
Authorization: Bearer <token>
```

### Token Expiration

- Tokens expire after **24 hours**
- Expired tokens return `401 Unauthorized`
- Request a new token via `/auth/login`

---

## Common Headers

### Request Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Authorization` | `Bearer <token>` | Yes* | JWT access token (*except public endpoints) |
| `Content-Type` | `application/json` | Yes | Request body format |
| `Accept` | `application/json` | No | Expected response format |

### Response Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | Always `application/json` |
| `X-Request-Id` | Unique request identifier for debugging |

---

## Response Format

### Success Response

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message"
}
```

### Success Response with Pagination

For list endpoints:

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Success"
}
```

### Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## HTTP Status Codes

### Success Codes

| Code | Name | Usage |
|------|------|-------|
| `200` | OK | Successful GET, PUT, PATCH, DELETE |
| `201` | Created | Successful POST creating a resource |
| `204` | No Content | Successful DELETE with no response body |

### Client Error Codes

| Code | Name | Usage |
|------|------|-------|
| `400` | Bad Request | Malformed request syntax |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Valid auth but insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Validation error |

### Server Error Codes

| Code | Name | Usage |
|------|------|-------|
| `500` | Internal Server Error | Unexpected server error |
| `502` | Bad Gateway | External service unavailable |
| `503` | Service Unavailable | Server temporarily unavailable |

---

## Error Handling

### Validation Errors (422)

Returned when request data fails validation:

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Authentication Errors (401)

Returned when authentication fails:

```json
{
  "success": false,
  "data": null,
  "message": "Invalid or expired token",
  "errors": []
}
```

### Not Found Errors (404)

Returned when a resource is not found:

```json
{
  "success": false,
  "data": null,
  "message": "Patient not found",
  "errors": []
}
```

---

## Pagination

List endpoints support pagination via query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |

### Example Request

```
GET /api/v1/patients?page=2&limit=10
```

### Example Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Filtering & Search

### Search

Many list endpoints support search via the `search` query parameter:

```
GET /api/v1/patients?search=john
```

### Date Filtering

Date range filtering where applicable:

```
GET /api/v1/appointments?startDate=2024-01-01&endDate=2024-01-31
```

### Status Filtering

Filter by status:

```
GET /api/v1/appointments?status=completed
```

---

## Data Types

### UUID

All entity IDs use UUIDv4 format:

```
"id": "550e8400-e29b-41d4-a716-446655440000"
```

### DateTime

All timestamps use ISO 8601 format in UTC:

```
"createdAt": "2024-01-15T10:30:00.000Z"
```

### Date

Date-only fields use ISO 8601 date format:

```
"dateOfBirth": "1985-03-15"
```

### Enums

Enum values are lowercase strings:

```
"sex": "male" | "female" | "other"
"status": "scheduled" | "in_progress" | "completed"
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | per minute |
| AI Endpoints | 10 requests | per minute |
| Other Endpoints | 100 requests | per minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
```

### Rate Limit Exceeded (429)

```json
{
  "success": false,
  "data": null,
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "errors": []
}
```

---

## CORS

Cross-Origin Resource Sharing is enabled for:

- **Development**: `http://localhost:5173`
- **Production**: Configured domains only

---

## Versioning

The API is versioned via the URL path:

- Current version: `v1`
- Format: `/api/v{version}/...`

Major version changes may introduce breaking changes. Minor updates are backwards compatible.

---

## API Endpoint Categories

| Category | Base Path | Description |
|----------|-----------|-------------|
| Authentication | `/api/v1/auth` | Login, register, profile |
| Patients | `/api/v1/patients` | Patient management |
| Appointments | `/api/v1/appointments` | Appointment management |
| Medical Records | `/api/v1/appointments/:id/record` | Clinical documentation |
| Transcription | `/api/v1/appointments/:id/transcription` | AI transcription |

---

## References

- [Authentication Endpoints](./endpoints/auth.md)
- [Patient Endpoints](./endpoints/patients.md)
- [Appointment Endpoints](./endpoints/appointments.md)
- [Medical Record Endpoints](./endpoints/medical-records.md)
- [Transcription Endpoints](./endpoints/transcription.md)
- [WebSocket Events](./websocket.md)
- [API Schemas](./schemas.md)
- [OpenAPI Specification](./openapi.yaml)
