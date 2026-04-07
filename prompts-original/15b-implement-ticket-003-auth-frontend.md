# Prompt 15b: Implement TICKET-003 - Authentication Frontend

## Context
You are implementing the Medical Record System MVP. Backend authentication (TICKET-002) is complete.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-003-auth-frontend.md` - Frontend auth requirements
- `docs/frontend/pages/login.md` - Login page design
- `docs/implementation/TICKET-002-completed.md` - Backend implementation notes

## Verify Prerequisites
Before starting, verify TICKET-002 (backend auth) is complete:

```bash
# 1. Backend is running
cd packages/backend && pnpm dev

# 2. Login endpoint works
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}'
# Should return token

# 3. Backend tests pass
cd packages/backend && pnpm test
```

**If any verification fails:** Go back to Prompt 15a and complete TICKET-002.

---

## Objective
Implement frontend authentication with:
- Auth types for TypeScript
- API client with auth interceptors
- Auth API service for login/register/me
- Auth store with Zustand + persist
- Login page with form validation
- Protected route component
- Dashboard placeholder page
- React Router with auth guards

---

## Step 1: Create Auth Types
Create `packages/frontend/src/types/auth.types.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}
```

---

## Step 2: Create API Client
Create `packages/frontend/src/services/api.ts`:

```typescript
import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth-token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Step 3: Create Auth API Service
Create `packages/frontend/src/services/auth.api.ts`:

```typescript
import api from './api';
import { LoginRequest, RegisterRequest, AuthResponse, User, ApiResponse } from '../types/auth.types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  me: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  },
};
```

---

## Step 4: Create Auth Store
Create `packages/frontend/src/store/auth.store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/auth.api';
import { User, LoginRequest } from '../types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);

          // Save token to localStorage
          localStorage.setItem('auth-token', response.token);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Error al iniciar sesión';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('auth-token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      loadUser: async () => {
        const token = localStorage.getItem('auth-token');

        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          localStorage.removeItem('auth-token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
```

---

## Step 5: Create Login Page
Create `packages/frontend/src/pages/auth/LoginPage.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch {
      // Error is handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary-600">MedRecord AI</CardTitle>
          <CardDescription>Inicia sesión en tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@ejemplo.com"
                autoComplete="email"
                {...register('email')}
                onChange={(e) => {
                  register('email').onChange(e);
                  clearError();
                }}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                autoComplete="current-password"
                {...register('password')}
                onChange={(e) => {
                  register('password').onChange(e);
                  clearError();
                }}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Credenciales de prueba:</p>
              <p>Email: doctor@medrecord.com</p>
              <p>Password: password123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
```

---

## Step 6: Create Protected Route Component
Create `packages/frontend/src/components/auth/ProtectedRoute.tsx`:

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
```

---

## Step 7: Create Dashboard Page (Placeholder)
Create `packages/frontend/src/pages/dashboard/DashboardPage.tsx`:

```typescript
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function DashboardPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary-600">MedRecord AI</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Dr. {user?.firstName} {user?.lastName}
            </span>
            <Button variant="outline" onClick={logout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-gray-500 text-sm">Total registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Citas Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-gray-500 text-sm">Programadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Esta Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-gray-500 text-sm">Consultas completadas</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg border">
          <p className="text-gray-600">
            Bienvenido al sistema de expediente clínico. Los módulos de pacientes y citas
            serán implementados en los siguientes tickets.
          </p>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
```

---

## Step 8: Create Router
Create `packages/frontend/src/router/index.tsx`:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
```

---

## Step 9: Update App.tsx
Replace `packages/frontend/src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './store/auth.store';

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return <RouterProvider router={router} />;
}

export default App;
```

---

## Step 10: Create Frontend Tests
Create `packages/frontend/tests/unit/LoginPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../../src/pages/auth/LoginPage';

// Mock the auth store
vi.mock('../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    isAuthenticated: false,
  })),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderLoginPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    renderLoginPage();

    expect(screen.getByText('MedRecord AI')).toBeInTheDocument();
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty form', async () => {
    renderLoginPage();

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      expect(screen.getByText(/contraseña requerida/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    renderLoginPage();

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('should display test credentials', () => {
    renderLoginPage();

    expect(screen.getByText(/doctor@medrecord.com/i)).toBeInTheDocument();
    expect(screen.getByText(/password123/i)).toBeInTheDocument();
  });
});
```

---

## Testing & Verification

### Run Frontend Tests
```bash
cd packages/frontend
pnpm test
```

**Expected:** All LoginPage tests pass (4+ tests).

### Start Services and Manual Test
```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend
cd packages/frontend && pnpm dev
```

### Manual Verification Checklist

**Login Flow:**
- [ ] Open http://localhost:5173
- [ ] Should redirect to /login (not authenticated)
- [ ] Enter invalid credentials -> Should show "Credenciales inválidas"
- [ ] Enter valid credentials (doctor@medrecord.com / password123) -> Should redirect to /dashboard
- [ ] Dashboard shows user name
- [ ] Refresh page -> Should stay logged in
- [ ] Click "Cerrar Sesión" -> Should redirect to /login

### TypeScript Check
```bash
cd packages/frontend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

- [ ] Auth types defined (User, LoginRequest, AuthResponse, ApiResponse)
- [ ] API client with auth interceptors
- [ ] Auth API service for login/register/me
- [ ] Auth store with Zustand + persist
- [ ] Login page with form validation
- [ ] Protected route component with loading state
- [ ] Dashboard placeholder page
- [ ] Router with auth guards
- [ ] Frontend tests pass (4+ tests)
- [ ] Manual login flow works end-to-end
- [ ] TypeScript compiles without errors

---

## Debugging Reference

| Issue | Solution |
|-------|----------|
| `CORS error` | Verify FRONTEND_URL in backend .env |
| Frontend not redirecting | Clear localStorage and refresh |
| Token not persisting | Check localStorage in browser DevTools |
| Zustand state not updating | Check persist middleware configuration |
| Form validation not working | Verify zodResolver import |

---

## Commit (Only After ALL Tests Pass)

```bash
git add .
git commit -m "feat: implement authentication system (TICKET-002, TICKET-003)

Backend:
- Add JWT token generation and validation utility
- Create Prisma client singleton for database connections
- Create auth service with register/login/getUser methods
- Create auth middleware for protecting routes
- Add auth controller with input validation
- Add auth routes (POST /register, POST /login, GET /me)
- Add comprehensive auth integration tests

Frontend:
- Create API client with auth interceptors
- Create auth API service for login/register/me
- Implement auth store with Zustand + persist
- Create LoginPage with form validation
- Create ProtectedRoute component
- Create placeholder DashboardPage
- Set up React Router with auth guards
- Add LoginPage unit tests

Test credentials:
- Email: doctor@medrecord.com
- Password: password123

TICKET-002, TICKET-003"
```

---

## Documentation
Create `docs/implementation/TICKET-002-003-completed.md`:

```markdown
# TICKET-002 & TICKET-003 Implementation Complete

## Date
[Current Date]

## Summary
Complete authentication flow implemented with JWT tokens.

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/register | Create new user | No |
| POST | /api/v1/auth/login | Login user | No |
| GET | /api/v1/auth/me | Get current user | Yes |

## Frontend Routes

| Path | Component | Protected |
|------|-----------|-----------|
| /login | LoginPage | No |
| /dashboard | DashboardPage | Yes |
| / | Redirect to /dashboard | - |

## Test Credentials
- **Email:** doctor@medrecord.com
- **Password:** password123

## Token Storage
- Token stored in localStorage as `auth-token`
- Token included in all API requests via axios interceptor
- Token expiration: 7 days

## Tests
- Backend: 11 auth tests passing
- Frontend: 4 LoginPage tests passing
```

---

## Next Prompt
Proceed to `16a-implement-tickets-004-005-patients-backend.md` for patient management backend.
