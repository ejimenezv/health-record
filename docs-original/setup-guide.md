# Health Record - Development Setup Guide

This guide explains how to set up and run the Health Record project locally.

---

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Docker** | Latest | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Git Bash** | Latest | Included with [Git for Windows](https://git-scm.com/) |

---

## Initial Setup (First Time Only)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd /d/Darkvaz/Repositories/Personal/health-record
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Files

```bash
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

### 4. Start the Database

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 5. Generate Prisma Client

```bash
pnpm db:generate
```

---

## Daily Development Commands

### Start Everything (Backend + Frontend)

```bash
pnpm dev
```

This starts:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Start Individual Services

```bash
# Backend only
pnpm dev:backend

# Frontend only
pnpm dev:frontend
```

### Start/Stop Database

```bash
# Start PostgreSQL
docker-compose -f docker/docker-compose.yml up -d

# Stop PostgreSQL
docker-compose -f docker/docker-compose.yml down

# Stop and remove data
docker-compose -f docker/docker-compose.yml down -v
```

---

## Testing

### Run All Tests

```bash
pnpm test
```

### Run Tests by Package

```bash
# Backend tests
pnpm --filter backend test

# Frontend tests
pnpm --filter frontend test
```

### Watch Mode (re-run on changes)

```bash
# Backend
pnpm --filter backend test:watch

# Frontend
pnpm --filter frontend test:watch
```

### Coverage Report

```bash
pnpm --filter backend test:coverage
pnpm --filter frontend test:coverage
```

---

## Database Commands

All database commands are run from the project root:

```bash
# Generate Prisma client (after schema changes)
pnpm db:generate

# Create and apply migrations
pnpm db:migrate

# Apply migrations in production
pnpm db:migrate:deploy

# Seed the database
pnpm db:seed

# Open Prisma Studio (database GUI)
pnpm db:studio
```

---

## Code Quality

### Linting

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Formatting

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

### Type Checking

```bash
pnpm type-check
```

---

## Build

### Build All Packages

```bash
pnpm build
```

### Build Individual Packages

```bash
pnpm --filter backend build
pnpm --filter frontend build
```

---

## Useful URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api/v1 |
| Health Check | http://localhost:3001/api/v1/health |
| Prisma Studio | http://localhost:5555 (after `pnpm db:studio`) |

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View database logs
docker-compose -f docker/docker-compose.yml logs postgres

# Restart database
docker-compose -f docker/docker-compose.yml restart
```

### Reset Everything

```bash
# Clean all node_modules and build artifacts
pnpm clean

# Reinstall dependencies
pnpm install

# Reset database (WARNING: deletes all data)
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up -d
pnpm db:generate
```

### Prisma Client Issues

```bash
# Regenerate Prisma client
pnpm db:generate

# If schema changed, create migration
pnpm db:migrate
```

---

## Project Structure

```
health-record/
├── packages/
│   ├── backend/          # Express + TypeScript API
│   │   ├── src/          # Source code
│   │   ├── prisma/       # Database schema & migrations
│   │   └── tests/        # Backend tests
│   └── frontend/         # React + Vite app
│       ├── src/          # Source code
│       └── tests/        # Frontend tests
├── docker/               # Docker configuration
├── scripts/              # Setup scripts
└── docs/                 # Documentation
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start dev servers | `pnpm dev` |
| Run tests | `pnpm test` |
| Start database | `docker-compose -f docker/docker-compose.yml up -d` |
| Stop database | `docker-compose -f docker/docker-compose.yml down` |
| Generate Prisma | `pnpm db:generate` |
| Run migrations | `pnpm db:migrate` |
| Open DB GUI | `pnpm db:studio` |
| Build project | `pnpm build` |
| Lint code | `pnpm lint` |
| Format code | `pnpm format` |
