# Authentication Endpoints

This document defines the authentication endpoints for the MedRecord AI API.

---

## Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new provider account | No |
| POST | `/api/v1/auth/login` | Login and get access token | No |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |
| PATCH | `/api/v1/auth/profile` | Update user profile | Yes |
| POST | `/api/v1/auth/logout` | Logout (invalidate token) | Yes |

---

## POST /api/v1/auth/register

Register a new healthcare provider account.

### Request

```yaml
/api/v1/auth/register:
  post:
    summary: Register a new doctor account
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - password
              - firstName
              - lastName
            properties:
              email:
                type: string
                format: email
                description: Login email address
                example: "doctor@example.com"
              password:
                type: string
                minLength: 8
                description: Account password (min 8 characters)
                example: "SecurePass123!"
              firstName:
                type: string
                minLength: 2
                maxLength: 50
                description: Provider's first name
                example: "John"
              lastName:
                type: string
                minLength: 2
                maxLength: 50
                description: Provider's last name
                example: "Smith"
              specialty:
                type: string
                maxLength: 100
                description: Medical specialty (optional)
                example: "General Practice"
              licenseNumber:
                type: string
                maxLength: 50
                description: Medical license number (optional)
                example: "MD-12345"
```

### Request Example

```json
{
  "email": "doctor@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Smith",
  "specialty": "General Practice",
  "licenseNumber": "MD-12345"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "doctor@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "specialty": "General Practice",
      "licenseNumber": "MD-12345",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "message": "Account created successfully"
}
```

### Error Responses

**422 Validation Error**

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

**409 Conflict (Email Already Exists)**

```json
{
  "success": false,
  "data": null,
  "message": "Email already registered",
  "errors": []
}
```

---

## POST /api/v1/auth/login

Authenticate and receive an access token.

### Request

```yaml
/api/v1/auth/login:
  post:
    summary: Login to get access token
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - password
            properties:
              email:
                type: string
                format: email
                description: Registered email address
                example: "doctor@example.com"
              password:
                type: string
                description: Account password
                example: "SecurePass123!"
```

### Request Example

```json
{
  "email": "doctor@example.com",
  "password": "SecurePass123!"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "doctor@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "specialty": "General Practice",
      "licenseNumber": "MD-12345",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "message": "Login successful"
}
```

### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid email or password",
  "errors": []
}
```

**422 Validation Error**

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## GET /api/v1/auth/me

Get the current authenticated user's profile.

### Request

```yaml
/api/v1/auth/me:
  get:
    summary: Get current user profile
    tags:
      - Authentication
    security:
      - bearerAuth: []
    responses:
      200:
        description: User profile
```

### Headers

```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "specialty": "General Practice",
    "licenseNumber": "MD-12345",
    "phone": "+1-555-0100",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Success"
}
```

### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid or expired token",
  "errors": []
}
```

---

## PATCH /api/v1/auth/profile

Update the current user's profile.

### Request

```yaml
/api/v1/auth/profile:
  patch:
    summary: Update user profile
    tags:
      - Authentication
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              firstName:
                type: string
                minLength: 2
                maxLength: 50
              lastName:
                type: string
                minLength: 2
                maxLength: 50
              specialty:
                type: string
                maxLength: 100
              licenseNumber:
                type: string
                maxLength: 50
              phone:
                type: string
                description: Contact phone number
```

### Request Example

```json
{
  "specialty": "Family Medicine",
  "phone": "+1-555-0200"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "specialty": "Family Medicine",
    "licenseNumber": "MD-12345",
    "phone": "+1-555-0200",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T09:15:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid or expired token",
  "errors": []
}
```

**422 Validation Error**

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "firstName",
      "message": "First name must be at least 2 characters"
    }
  ]
}
```

---

## POST /api/v1/auth/logout

Logout the current user (invalidate token on client side).

### Request

```yaml
/api/v1/auth/logout:
  post:
    summary: Logout current user
    tags:
      - Authentication
    security:
      - bearerAuth: []
```

### Response (200 OK)

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

## JWT Token Structure

### Token Payload

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "doctor@example.com",
  "iat": 1705312200,
  "exp": 1705398600
}
```

| Field | Description |
|-------|-------------|
| `sub` | User ID (subject) |
| `email` | User email |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp |

### Token Expiration

- Tokens expire after **24 hours** (86400 seconds)
- The `expiresIn` field in login/register responses indicates seconds until expiration

---

## Security Considerations

1. **Password Requirements**:
   - Minimum 8 characters
   - Stored using bcrypt with cost factor 12

2. **Token Security**:
   - Tokens should be stored securely (httpOnly cookies or secure storage)
   - Never log or expose tokens in URLs

3. **Rate Limiting**:
   - Login/register limited to 5 requests per minute per IP

---

## References

- [API Overview](../overview.md)
- [Provider Entity](../../data-model/entities/provider.md)
- [Schemas](../schemas.md)
