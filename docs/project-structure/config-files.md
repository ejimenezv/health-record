# Configuration Files

This document contains all configuration file templates for the MedRecord AI project.

---

## Root Configuration Files

### `package.json` (Root)

```json
{
  "name": "health-record",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "pnpm --parallel run dev",
    "build": "pnpm --recursive run build",
    "test": "pnpm --recursive run test",
    "lint": "pnpm --recursive run lint",
    "lint:fix": "pnpm --recursive run lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\"",
    "type-check": "pnpm --recursive run type-check",
    "db:migrate": "pnpm --filter backend run db:migrate",
    "db:migrate:deploy": "pnpm --filter backend run db:migrate:deploy",
    "db:seed": "pnpm --filter backend run db:seed",
    "db:studio": "pnpm --filter backend run db:studio",
    "db:generate": "pnpm --filter backend run db:generate",
    "clean": "pnpm --recursive run clean && rm -rf node_modules",
    "prepare": "husky"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "typescript": "^5.3.0"
  },
  "lint-staged": {
    "packages/frontend/src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "packages/backend/src/**/*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

### `tsconfig.base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### `.prettierrc`

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
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### `.prettierignore`

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/

# Package manager
pnpm-lock.yaml
package-lock.json

# Generated
*.generated.ts
prisma/migrations/

# IDE
.idea/
.vscode/

# Coverage
coverage/

# Misc
*.min.js
*.min.css
```

### `eslint.config.js` (Root)

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
    },
  }
);
```

### `.env.example` (Root)

```bash
# ===========================================
# MedRecord AI - Environment Configuration
# ===========================================
# Copy this file to .env and fill in the values.
# Never commit .env to version control.

# -------------------------------------------
# Backend Configuration
# -------------------------------------------

# Application
NODE_ENV=development
PORT=3001

# Database (PostgreSQL)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://medrecord:medrecord_dev@localhost:5432/medrecord?schema=public"

# JWT Authentication
# Generate with: openssl rand -base64 32
JWT_SECRET="your-super-secret-jwt-key-minimum-32-chars"

# OpenAI API
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-your-openai-api-key"

# Logging
LOG_LEVEL="debug"

# -------------------------------------------
# Frontend Configuration
# -------------------------------------------

# API URL (used by frontend)
VITE_API_URL="http://localhost:3001/api"

# WebSocket URL (future use)
VITE_WS_URL="ws://localhost:3001"
```

### `.gitignore`

```gitignore
# ===========================================
# Dependencies
# ===========================================
node_modules/
.pnpm-store/

# ===========================================
# Build outputs
# ===========================================
dist/
build/
.next/
out/

# ===========================================
# Environment files
# ===========================================
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Keep examples
!.env.example
!.env.test.example

# ===========================================
# IDE / Editor
# ===========================================
.vscode/*
!.vscode/settings.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# ===========================================
# OS Files
# ===========================================
.DS_Store
Thumbs.db
desktop.ini

# ===========================================
# Logs
# ===========================================
*.log
logs/
npm-debug.log*
pnpm-debug.log*

# ===========================================
# Testing
# ===========================================
coverage/
.nyc_output/

# ===========================================
# TypeScript
# ===========================================
*.tsbuildinfo

# ===========================================
# Prisma
# ===========================================
*.db
*.db-journal

# ===========================================
# Uploads (development)
# ===========================================
uploads/
!uploads/.gitkeep

# ===========================================
# Docker
# ===========================================
docker-compose.override.yml

# ===========================================
# Misc
# ===========================================
.cache/
.temp/
.tmp/
```

---

## Backend Configuration Files

### `packages/backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:reset": "prisma migrate reset",
    "clean": "rm -rf dist coverage"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.3",
    "express-rate-limit": "^7.1.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.28.0",
    "pino": "^8.19.0",
    "pino-http": "^9.0.0",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/uuid": "^9.0.8",
    "@vitest/coverage-v8": "^1.3.0",
    "eslint": "^8.57.0",
    "pino-pretty": "^10.3.1",
    "prisma": "^5.10.0",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "typescript-eslint": "^7.1.0",
    "vitest": "^1.3.0"
  }
}
```

### `packages/backend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"]
  },
  "include": ["src/**/*", "prisma/seed.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `packages/backend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### `packages/backend/nodemon.json`

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.test.ts"],
  "exec": "tsx src/index.ts"
}
```

### `packages/backend/.env.example`

```bash
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="postgresql://medrecord:medrecord_dev@localhost:5432/medrecord?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# Logging
LOG_LEVEL="debug"
```

### `packages/backend/.env.test`

```bash
NODE_ENV=test
PORT=3002
DATABASE_URL="postgresql://medrecord:medrecord_dev@localhost:5432/medrecord_test?schema=public"
JWT_SECRET="test-jwt-secret-for-testing-purposes-only"
OPENAI_API_KEY="sk-test-key"
FRONTEND_URL="http://localhost:5173"
LOG_LEVEL="error"
```

---

## Frontend Configuration Files

### `packages/frontend/package.json`

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "clean": "rm -rf dist coverage"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@tanstack/react-query": "^5.24.0",
    "axios": "^1.6.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.50.1",
    "react-router-dom": "^6.22.2",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.1",
    "@types/react": "^18.2.61",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/coverage-v8": "^1.3.0",
    "@vitest/ui": "^1.3.0",
    "autoprefixer": "^10.4.18",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.35",
    "prettier-plugin-tailwindcss": "^0.5.11",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "typescript-eslint": "^7.1.0",
    "vite": "^5.1.4",
    "vitest": "^1.3.0"
  }
}
```

### `packages/frontend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `packages/frontend/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

### `packages/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### `packages/frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types/**', 'src/**/*.d.ts', 'src/components/ui/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### `packages/frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Medical-specific colors
        'medical-blue': '#0066CC',
        'medical-green': '#00AA66',
        'medical-alert': '#FF6B6B',
        'ai-purple': '#7C3AED',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-recording': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### `packages/frontend/postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `packages/frontend/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/assets/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### `packages/frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="MedRecord AI - Medical Record System" />
    <title>MedRecord AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `packages/frontend/.env.example`

```bash
# API URL
VITE_API_URL="http://localhost:3001/api"

# WebSocket URL (future use)
VITE_WS_URL="ws://localhost:3001"
```

---

## Docker Configuration Files

### `docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: medrecord
      POSTGRES_PASSWORD: medrecord_dev
      POSTGRES_DB: medrecord
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U medrecord -d medrecord']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    container_name: medrecord-backend
    environment:
      NODE_ENV: development
      PORT: 3001
      DATABASE_URL: postgresql://medrecord:medrecord_dev@postgres:5432/medrecord?schema=public
      JWT_SECRET: docker-dev-secret-minimum-32-characters-long
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      FRONTEND_URL: http://localhost:5173
    ports:
      - '3001:3001'
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ../packages/backend/src:/app/packages/backend/src
      - ../packages/backend/prisma:/app/packages/backend/prisma

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    container_name: medrecord-frontend
    environment:
      VITE_API_URL: http://localhost:3001/api
    ports:
      - '5173:5173'
    depends_on:
      - backend
    volumes:
      - ../packages/frontend/src:/app/packages/frontend/src

volumes:
  postgres_data:
```

### `docker/Dockerfile.backend`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend
COPY tsconfig.base.json ./

# Generate Prisma client
RUN cd packages/backend && pnpm db:generate

# Build
RUN cd packages/backend && pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy built application
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p uploads/audio

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### `docker/Dockerfile.frontend`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/frontend ./packages/frontend
COPY tsconfig.base.json ./

# Build
RUN cd packages/frontend && pnpm build

# Production stage
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### `docker/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (development)
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## GitHub Actions

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linting
        run: pnpm lint

      - name: Check formatting
        run: pnpm format:check

      - name: Type check
        run: pnpm type-check

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: medrecord
          POSTGRES_PASSWORD: medrecord_test
          POSTGRES_DB: medrecord_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma Client
        run: pnpm db:generate

      - name: Run migrations
        run: pnpm db:migrate:deploy
        env:
          DATABASE_URL: postgresql://medrecord:medrecord_test@localhost:5432/medrecord_test

      - name: Run tests
        run: pnpm --filter backend test:coverage
        env:
          DATABASE_URL: postgresql://medrecord:medrecord_test@localhost:5432/medrecord_test
          JWT_SECRET: test-secret-key-for-ci-testing
          OPENAI_API_KEY: sk-test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm --filter frontend test:coverage

  build:
    runs-on: ubuntu-latest
    needs: [lint, test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma Client
        run: pnpm db:generate

      - name: Build all packages
        run: pnpm build
```

---

## VS Code Configuration

### `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "pnpm-lock.yaml": true
  }
}
```

### `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "src/index.ts"],
      "cwd": "${workspaceFolder}/packages/backend",
      "envFile": "${workspaceFolder}/packages/backend/.env",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Backend Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vitest", "--no-coverage"],
      "cwd": "${workspaceFolder}/packages/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

### `.vscode/extensions.json`

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "Prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "eamodio.gitlens",
    "ms-azuretools.vscode-docker",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense"
  ]
}
```

---

## References

- [Root Structure](./root-structure.md)
- [Backend Structure](./backend-structure.md)
- [Frontend Structure](./frontend-structure.md)
- [Setup Instructions](./setup-instructions.md)
