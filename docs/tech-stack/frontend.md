# Frontend Technology Stack: MedRecord AI

This document defines the complete frontend technology stack for the Medical Record System MVP.

---

## Core Framework

### React 18 with TypeScript

| Specification | Value |
|---------------|-------|
| **Framework** | React |
| **Version** | 18.2.x |
| **Language** | TypeScript 5.x |
| **Rendering** | Client-side SPA |

### Why React Over Alternatives

| Framework | Pros | Cons | Decision |
|-----------|------|------|----------|
| **React** | Largest ecosystem, extensive docs, familiar to most devs, excellent TypeScript support | More boilerplate, virtual DOM overhead | **Selected** |
| Vue.js | Simpler learning curve, better docs | Smaller ecosystem, fewer enterprise adoptions | Rejected |
| Angular | Full framework, enterprise features | Heavy, steep learning curve, overkill for MVP | Rejected |
| Svelte | Best performance, less code | Smaller ecosystem, fewer developers available | Rejected |

**Final Decision**: React 18 selected for:
- Largest component library ecosystem (shadcn/ui, React Hook Form, etc.)
- Excellent TypeScript integration with typed hooks
- React Query for server state management
- Wide hosting platform support
- Most learning resources available

---

## Build Tools

### Vite

| Specification | Value |
|---------------|-------|
| **Build Tool** | Vite |
| **Version** | 5.x |
| **Dev Server** | Native ESM with HMR |
| **Production Build** | Rollup-based bundling |

### Why Vite Over Alternatives

| Tool | Pros | Cons | Decision |
|------|------|------|----------|
| **Vite** | Instant HMR, fast builds, simple config, native TypeScript | Newer ecosystem | **Selected** |
| Create React App | Official, well-documented | Slow, maintenance mode, webpack bloat | Rejected |
| Next.js | SSR, file-based routing | Overkill for SPA, API routes duplicate backend | Rejected |

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## State Management

### React Query + Context API

| State Type | Solution | Purpose |
|------------|----------|---------|
| **Server State** | TanStack Query (React Query) 5.x | API data, caching, refetching |
| **App State** | React Context + useReducer | Auth state, UI state |
| **Form State** | React Hook Form | Form inputs, validation |
| **Local UI State** | useState | Component-level state |

### Why This Approach

| Solution | Pros | Cons | Decision |
|----------|------|------|----------|
| **React Query + Context** | Separation of concerns, built-in caching, optimistic updates | Two patterns to learn | **Selected** |
| Redux Toolkit | Single source of truth, DevTools | Overkill for MVP, boilerplate | Rejected |
| Zustand | Simple, minimal | Less features than React Query for server state | Rejected |
| MobX | Reactive, less boilerplate | Less predictable, different paradigm | Rejected |

### React Query Configuration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## UI Components

### Tailwind CSS + shadcn/ui

| Component | Technology | Version |
|-----------|------------|---------|
| **CSS Framework** | Tailwind CSS | 3.4.x |
| **Component Library** | shadcn/ui | Latest |
| **Icons** | Lucide React | Latest |
| **Animations** | Tailwind Animate | 1.x |

### Why Tailwind + shadcn/ui

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| **Tailwind + shadcn/ui** | Copy-paste components, full customization, no runtime | Learning utility classes | **Selected** |
| Material-UI (MUI) | Complete component set, Material Design | Heavy bundle, opinionated styling | Rejected |
| Chakra UI | Good DX, composable | Runtime CSS-in-JS overhead | Rejected |
| Ant Design | Enterprise-ready, complete | Heavy, Chinese documentation primary | Rejected |

### shadcn/ui Components to Use

| Component | Use Case |
|-----------|----------|
| Button | All buttons |
| Input | Text inputs |
| Select | Dropdowns |
| Dialog | Modals, confirmations |
| Card | Patient cards, record sections |
| Form | Form structure |
| Toast | Notifications |
| Table | Patient lists, appointment history |
| Tabs | Record sections |
| Badge | Status indicators, AI badges |
| Avatar | Patient initials |
| Skeleton | Loading states |

### Tailwind Configuration

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... medical-specific colors
        "medical-blue": "#0066CC",
        "medical-green": "#00AA66",
        "medical-alert": "#FF6B6B",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## Form Handling

### React Hook Form + Zod

| Component | Technology | Version |
|-----------|------------|---------|
| **Form Library** | React Hook Form | 7.x |
| **Validation** | Zod | 3.x |
| **Resolver** | @hookform/resolvers | 3.x |

### Why React Hook Form

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| **React Hook Form** | Minimal re-renders, great TS support, uncontrolled inputs | API learning curve | **Selected** |
| Formik | Mature, well-documented | More re-renders, larger bundle | Rejected |
| Native Forms | No dependencies | Manual validation, more code | Rejected |

### Example Form Schema

```typescript
import { z } from 'zod';

export const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  sex: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  emergencyContactName: z.string().min(2).max(100),
  emergencyContactPhone: z.string().regex(/^\+?[\d\s-]{10,}$/),
  emergencyContactRelationship: z.string().max(50).optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;
```

---

## Audio Handling

### Web Audio API + MediaRecorder

| Specification | Value |
|---------------|-------|
| **Recording API** | MediaRecorder |
| **Audio Format** | WebM with Opus codec |
| **Sample Rate** | 44.1 kHz |
| **Channels** | Mono |
| **Browser Support** | Chrome, Firefox, Edge, Safari 14.1+ |

### Audio Configuration

```typescript
const audioConstraints: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: 44100,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const mediaRecorderOptions: MediaRecorderOptions = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000,
};
```

### Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 49+ | Full support |
| Firefox | 25+ | Full support |
| Edge | 79+ | Full support |
| Safari | 14.1+ | WebM support added |

### Polyfills Required

No polyfills required for target browsers. Fallback to manual entry if MediaRecorder unavailable.

---

## HTTP Client

### Axios

| Specification | Value |
|---------------|-------|
| **Library** | Axios |
| **Version** | 1.6.x |
| **Base URL** | Environment variable |
| **Timeout** | 30 seconds (120s for AI) |

### Why Axios Over Native Fetch

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Axios** | Request/response interceptors, automatic transforms, progress events | Additional dependency | **Selected** |
| Native Fetch | No dependency, modern API | Manual error handling, no interceptors | Rejected |

### API Client Structure

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Routing

### React Router v6

| Specification | Value |
|---------------|-------|
| **Library** | React Router DOM |
| **Version** | 6.x |
| **Pattern** | Client-side routing |

### Route Structure

```typescript
// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'patients', element: <PatientList /> },
      { path: 'patients/new', element: <PatientForm /> },
      { path: 'patients/:patientId', element: <PatientProfile /> },
      { path: 'patients/:patientId/edit', element: <PatientForm /> },
      { path: 'appointments/new', element: <AppointmentForm /> },
      { path: 'appointments/:appointmentId', element: <AppointmentDetail /> },
      { path: 'appointments/:appointmentId/record', element: <MedicalRecordPage /> },
    ],
  },
]);
```

---

## Development Tools

### ESLint Configuration

```javascript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
);
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "jsxSingleQuote": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/                # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── ProtectedLayout.tsx
│   │   ├── patients/              # Patient-related components
│   │   ├── appointments/          # Appointment components
│   │   ├── medical-record/        # Medical record components
│   │   │   ├── AudioRecorder.tsx
│   │   │   ├── TranscriptPanel.tsx
│   │   │   ├── SymptomForm.tsx
│   │   │   └── PrescriptionForm.tsx
│   │   └── common/                # Shared components
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePatients.ts
│   │   ├── useAudioRecorder.ts
│   │   └── useAutoSave.ts
│   ├── lib/
│   │   ├── api.ts                 # Axios instance
│   │   ├── utils.ts               # Utility functions
│   │   └── validators.ts          # Zod schemas
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── PatientProfile.tsx
│   │   └── MedicalRecordPage.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── RecordingContext.tsx
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                  # Tailwind imports
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── .env.example
```

---

## References

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [React Router Documentation](https://reactrouter.com/)
