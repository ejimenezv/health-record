# Ticket 003: Authentication Frontend

## Type
Feature

## Priority
P0-Critical

## Story Reference
US-010: User Authentication

## Description
Implement login page and authentication state management in the frontend. This includes the login form, auth state persistence, protected route wrapper, axios interceptor for auth headers, and logout functionality.

## Acceptance Criteria
- [ ] Login page renders with email and password fields
- [ ] Form validation shows errors for invalid input
- [ ] Successful login redirects to dashboard
- [ ] Auth state (token) persisted in localStorage
- [ ] Protected routes redirect to login if not authenticated
- [ ] Logout clears auth state and redirects to login
- [ ] Auth token automatically included in API requests
- [ ] Token expiration handled gracefully (redirect to login)
- [ ] Loading state shown during authentication

## Technical Requirements

### Frontend Tasks

#### Login Page (`src/pages/auth/LoginPage.tsx`)
- [ ] Create login form with email and password fields
- [ ] Use react-hook-form with zod validation
- [ ] Show validation errors inline
- [ ] Show API error messages (invalid credentials)
- [ ] Display loading state on submit button
- [ ] Redirect to dashboard on successful login
- [ ] Link to registration (optional, for MVP just login)

#### Auth API Service (`src/services/auth.api.ts`)
- [ ] `login(email, password)` - POST /auth/login
- [ ] `register(data)` - POST /auth/register
- [ ] `getMe()` - GET /auth/me
- [ ] Configure axios instance with base URL
- [ ] Handle error responses consistently

#### useAuth Hook (`src/hooks/useAuth.ts`)
- [ ] `login(email, password)` - Authenticate and store token
- [ ] `logout()` - Clear auth state
- [ ] `isAuthenticated` - Check if user is logged in
- [ ] `provider` - Current provider data
- [ ] `isLoading` - Auth state loading
- [ ] Initialize auth state from localStorage on mount
- [ ] Validate stored token on mount (call /me)

#### Auth Store (`src/store/auth.store.ts`)
- [ ] Zustand store for auth state
- [ ] `token` - JWT access token
- [ ] `provider` - Current provider object
- [ ] `isAuthenticated` - Computed from token
- [ ] `setAuth(token, provider)` - Set auth state
- [ ] `clearAuth()` - Clear auth state
- [ ] `hydrate()` - Load from localStorage
- [ ] Persist token to localStorage on change

#### Protected Route (`src/components/auth/ProtectedRoute.tsx`)
- [ ] Wrapper component for protected pages
- [ ] Check authentication state
- [ ] Redirect to /login if not authenticated
- [ ] Show loading while checking auth
- [ ] Render children if authenticated

#### Axios Configuration (`src/services/api.ts`)
- [ ] Create axios instance with base URL
- [ ] Request interceptor: Add Authorization header
- [ ] Response interceptor: Handle 401 errors
- [ ] On 401: Clear auth state, redirect to login
- [ ] Export configured instance for use in services

#### App Router Updates (`src/App.tsx`)
- [ ] Add /login route
- [ ] Wrap dashboard and other routes with ProtectedRoute
- [ ] Add logout handler in header/layout

## API Endpoints Involved
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/register`
- GET `/api/v1/auth/me`

## Components Involved
- LoginPage
- ProtectedRoute
- Layout (Header with logout button)
- Form components (Input, Button, Label, Alert)

## Data Models Involved
- Provider (frontend type)

## Testing Requirements

### Unit Tests

#### useAuth Hook (`tests/unit/hooks/useAuth.test.ts`)
- [ ] `login` stores token and provider on success
- [ ] `login` throws error on invalid credentials
- [ ] `logout` clears auth state
- [ ] `isAuthenticated` returns true when token exists
- [ ] `isAuthenticated` returns false when no token
- [ ] Hydrates auth state from localStorage on mount
- [ ] Validates token on mount by calling /me

#### LoginPage (`tests/unit/pages/LoginPage.test.tsx`)
- [ ] Renders email and password inputs
- [ ] Shows validation error for empty email
- [ ] Shows validation error for invalid email format
- [ ] Shows validation error for empty password
- [ ] Submits form with valid credentials
- [ ] Shows loading state during submission
- [ ] Shows error message for invalid credentials
- [ ] Redirects to dashboard on success

#### ProtectedRoute (`tests/unit/components/ProtectedRoute.test.tsx`)
- [ ] Renders children when authenticated
- [ ] Redirects to login when not authenticated
- [ ] Shows loading state while checking auth

### E2E Tests (`tests/e2e/auth.spec.ts`)
- [ ] Complete login flow with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Protected route redirects to login
- [ ] Logout clears session and redirects
- [ ] Auth persists across page refresh

## Dependencies
- TICKET-002: Auth Backend must be complete
- TICKET-000: Project Setup (frontend structure)

## Estimation
5 Story Points

## Implementation Notes
- Use `localStorage` for token persistence (sessionStorage for extra security)
- Clear localStorage completely on logout
- Axios interceptor should not retry on 401 (avoid infinite loops)
- Consider showing "Session expired" toast on 401
- Login form should disable submit button while loading
- Use React Router's `Navigate` component for redirects
- Password field should have toggle visibility option (nice to have)
- Remember to handle edge case: token in localStorage but expired

## Files to Create/Modify

### Frontend
- `src/pages/auth/LoginPage.tsx`
- `src/services/auth.api.ts`
- `src/services/api.ts` (axios instance)
- `src/hooks/useAuth.ts`
- `src/store/auth.store.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/types/auth.types.ts`
- `src/App.tsx` (add routes, protected wrapper)
- `src/components/layout/Header.tsx` (add logout)
- `tests/unit/hooks/useAuth.test.ts`
- `tests/unit/pages/LoginPage.test.tsx`
- `tests/unit/components/ProtectedRoute.test.tsx`
- `tests/e2e/auth.spec.ts`

## Definition of Done
- [ ] Login page works end-to-end with backend
- [ ] Auth state persists on page refresh
- [ ] Protected routes correctly guard pages
- [ ] Logout works and clears all state
- [ ] Unit tests passing with >70% coverage
- [ ] E2E test passing for login flow
- [ ] Form validation provides good UX
- [ ] Error messages are user-friendly
- [ ] Code reviewed and approved
