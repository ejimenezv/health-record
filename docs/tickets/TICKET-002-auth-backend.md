# Ticket 002: Authentication Backend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-010: User Authentication

## Description
Implement JWT-based authentication for the API including provider registration, login, token validation middleware, and current user retrieval. This provides secure access control for all protected API endpoints.

## Acceptance Criteria
- [ ] Provider can register with email and password
- [ ] Provider can login and receive JWT access token
- [ ] Protected routes require valid JWT in Authorization header
- [ ] Token includes provider ID, email, and expiration
- [ ] Password is hashed with bcrypt (12 rounds)
- [ ] Invalid credentials return 401 Unauthorized
- [ ] Duplicate email registration returns 409 Conflict
- [ ] Token expiration is configurable (default 7 days)
- [ ] GET /auth/me returns current authenticated provider

## Technical Requirements

### Backend Tasks

#### Auth Service (`src/services/auth.service.ts`)
- [ ] `register(data)` - Create new provider with hashed password
- [ ] `login(email, password)` - Validate credentials, return JWT
- [ ] `validateToken(token)` - Verify JWT and return payload
- [ ] `getProviderById(id)` - Get provider by ID (for /me endpoint)
- [ ] `hashPassword(password)` - Hash password with bcrypt
- [ ] `comparePassword(plain, hashed)` - Verify password

#### Auth Controller (`src/controllers/auth.controller.ts`)
- [ ] `register` - Handle POST /auth/register
- [ ] `login` - Handle POST /auth/login
- [ ] `getMe` - Handle GET /auth/me
- [ ] `updateProfile` - Handle PATCH /auth/profile (optional)

#### Auth Routes (`src/routes/auth.routes.ts`)
- [ ] POST `/api/v1/auth/register`
- [ ] POST `/api/v1/auth/login`
- [ ] GET `/api/v1/auth/me` (protected)
- [ ] PATCH `/api/v1/auth/profile` (protected, optional)

#### Auth Middleware (`src/middleware/auth.middleware.ts`)
- [ ] `authenticate` - Extract and validate JWT from header
- [ ] Attach `req.provider` with decoded token payload
- [ ] Return 401 if token missing or invalid
- [ ] Return 401 if token expired

#### Auth Validator (`src/validators/auth.validator.ts`)
- [ ] `registerSchema` - Validate registration input
  - email: valid email, required
  - password: min 8 chars, required
  - firstName: required
  - lastName: required
  - specialty: optional
  - licenseNumber: optional
- [ ] `loginSchema` - Validate login input
  - email: required
  - password: required

#### JWT Utility (`src/utils/jwt.ts`)
- [ ] `generateToken(payload)` - Create signed JWT
- [ ] `verifyToken(token)` - Verify and decode JWT
- [ ] Configure with JWT_SECRET and JWT_EXPIRES_IN

#### Provider Repository (`src/repositories/provider.repository.ts`)
- [ ] `create(data)` - Create provider in database
- [ ] `findByEmail(email)` - Find provider by email
- [ ] `findById(id)` - Find provider by ID
- [ ] `update(id, data)` - Update provider data

## API Endpoints Involved

### POST /api/v1/auth/register
**Request:**
```json
{
  "email": "doctor@clinic.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Smith",
  "specialty": "General Medicine",
  "licenseNumber": "MD-12345"
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "provider": {
      "id": "uuid",
      "email": "doctor@clinic.com",
      "firstName": "John",
      "lastName": "Smith"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /api/v1/auth/login
**Request:**
```json
{
  "email": "doctor@clinic.com",
  "password": "SecurePass123"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "provider": {
      "id": "uuid",
      "email": "doctor@clinic.com",
      "firstName": "John",
      "lastName": "Smith"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### GET /api/v1/auth/me
**Headers:** `Authorization: Bearer <token>`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "doctor@clinic.com",
    "firstName": "John",
    "lastName": "Smith",
    "specialty": "General Medicine",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

## Components Involved
None - backend only.

## Data Models Involved
- Provider

## Testing Requirements

### Unit Tests (`tests/unit/services/auth.service.test.ts`)
- [ ] `register` creates provider with hashed password
- [ ] `register` throws error for duplicate email
- [ ] `login` returns token for valid credentials
- [ ] `login` throws error for invalid email
- [ ] `login` throws error for invalid password
- [ ] `hashPassword` produces valid bcrypt hash
- [ ] `comparePassword` returns true for matching password
- [ ] `comparePassword` returns false for wrong password
- [ ] `validateToken` returns payload for valid token
- [ ] `validateToken` throws error for invalid token
- [ ] `validateToken` throws error for expired token

### Integration Tests (`tests/integration/routes/auth.routes.test.ts`)
- [ ] POST /register - success returns 201 with token
- [ ] POST /register - duplicate email returns 409
- [ ] POST /register - invalid data returns 400
- [ ] POST /login - success returns 200 with token
- [ ] POST /login - invalid email returns 401
- [ ] POST /login - invalid password returns 401
- [ ] GET /me - valid token returns provider
- [ ] GET /me - missing token returns 401
- [ ] GET /me - invalid token returns 401
- [ ] GET /me - expired token returns 401

## Dependencies
- TICKET-001: Database Schema must be complete (Provider model)

## Estimation
5 Story Points

## Implementation Notes
- Use bcrypt with 12 rounds for password hashing
- JWT should include: `{ providerId, email, iat, exp }`
- Store JWT_SECRET in environment variables (never commit)
- Consider refresh tokens for production (out of MVP scope)
- Return consistent error responses with error codes
- Don't expose password hash in any response
- Use Zod for input validation with descriptive errors
- Consider rate limiting for login attempts (out of MVP scope)

## Files to Create/Modify

### Backend
- `src/routes/auth.routes.ts`
- `src/controllers/auth.controller.ts`
- `src/services/auth.service.ts`
- `src/middleware/auth.middleware.ts`
- `src/validators/auth.validator.ts`
- `src/utils/jwt.ts`
- `src/repositories/provider.repository.ts`
- `src/routes/index.ts` (add auth routes)
- `tests/unit/services/auth.service.test.ts`
- `tests/integration/routes/auth.routes.test.ts`

## Definition of Done
- [ ] All auth endpoints functional and tested
- [ ] Unit tests passing with >80% coverage
- [ ] Integration tests passing for all endpoints
- [ ] Password never exposed in responses
- [ ] JWT validation working correctly
- [ ] Error messages are user-friendly
- [ ] Code reviewed and approved
- [ ] Documentation updated
