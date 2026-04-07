# Login Page Specification

## Overview

| Property | Value |
|----------|-------|
| **Route** | `/login` |
| **Layout** | Public (centered card, no sidebar) |
| **Protection** | Guest only (redirects authenticated users) |
| **Title** | Iniciar Sesión |

## Description

The login page provides a simple, centered authentication form for doctors to access the medical record system. It features the application logo, email/password fields, and a login button.

## Components Used

- `Logo` - Application branding
- `Card` (shadcn/ui) - Form container
- `Form` (shadcn/ui + react-hook-form) - Form handling
- `Input` (shadcn/ui) - Email and password fields
- `Button` (shadcn/ui) - Submit button
- `Alert` (shadcn/ui) - Error display

## Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                                                                  │
│                         ┌─────────────┐                          │
│                         │  [LOGO]     │                          │
│                         │  MedRecord  │                          │
│                         │     AI      │                          │
│                         └─────────────┘                          │
│                                                                  │
│              ┌─────────────────────────────────────┐             │
│              │                                     │             │
│              │  Iniciar Sesión                     │             │
│              │  ─────────────────                  │             │
│              │                                     │             │
│              │  Email                              │             │
│              │  ┌─────────────────────────────┐   │             │
│              │  │ correo@ejemplo.com          │   │             │
│              │  └─────────────────────────────┘   │             │
│              │                                     │             │
│              │  Contraseña                         │             │
│              │  ┌─────────────────────────────┐   │             │
│              │  │ ••••••••••                  │   │             │
│              │  └─────────────────────────────┘   │             │
│              │                                     │             │
│              │  ┌─────────────────────────────┐   │             │
│              │  │      Iniciar Sesión         │   │             │
│              │  └─────────────────────────────┘   │             │
│              │                                     │             │
│              │  ┌───────────────────────────────┐ │             │
│              │  │ ⚠ Credenciales inválidas     │ │             │
│              │  └───────────────────────────────┘ │             │
│              │         (shown on error)           │             │
│              │                                     │             │
│              └─────────────────────────────────────┘             │
│                                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## State

```typescript
interface LoginPageState {
  // Form fields (managed by react-hook-form)
  email: string;
  password: string;

  // UI state
  isLoading: boolean;
  error: string | null;
}
```

## Props

This is a page component with no props. It uses route state for redirect handling.

## Data Flow

```
User Input → Form Validation → API Call → Success/Error
                                    ↓
                              On Success:
                              - Store token
                              - Redirect to intended page or /dashboard
                                    ↓
                              On Error:
                              - Display error message
                              - Clear password field
```

## API Integration

```typescript
// Login mutation
const loginMutation = useMutation({
  mutationFn: (credentials: { email: string; password: string }) =>
    authApi.login(credentials),
  onSuccess: (data) => {
    // Store auth token and user
    setAuth(data.accessToken, data.user);
    // Redirect to intended destination
    navigate(from || '/dashboard');
  },
  onError: (error) => {
    setError(getErrorMessage(error));
  },
});
```

## Behavior

### Form Validation
- Email: Required, valid email format
- Password: Required, minimum 8 characters

### On Submit
1. Validate form fields
2. Display loading state on button
3. Call login API
4. On success: Store token, redirect to dashboard (or intended page)
5. On failure: Display error message, clear password field

### Keyboard Support
- Enter key submits form when focused on any field
- Tab navigation between fields

### Error States
| Error | Message |
|-------|---------|
| Invalid credentials | "Credenciales inválidas. Verifica tu email y contraseña." |
| Network error | "Error de conexión. Intenta de nuevo." |
| Server error | "Error del servidor. Intenta más tarde." |
| Rate limited | "Demasiados intentos. Espera un momento." |

## Accessibility

- Form labels associated with inputs via `htmlFor`
- Error messages announced to screen readers
- Focus management on error (focus first invalid field)
- Password field has toggle visibility option
- Loading state communicated via `aria-busy`

## Responsive Design

- Card maintains max-width of 400px
- Padding adjusts for mobile screens
- Logo scales appropriately
- Touch-friendly input sizes on mobile

## Code Structure

```
src/pages/LoginPage/
├── index.tsx          # Main component
├── LoginForm.tsx      # Form component
└── useLogin.ts        # Login hook
```
