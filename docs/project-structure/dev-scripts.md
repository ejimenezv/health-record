# Development Scripts

This document contains the development and setup scripts for the MedRecord AI project.

---

## Overview

The project includes several helper scripts for:
- Initial project setup
- Development environment startup
- Database management
- Common development tasks

---

## Script Files

### `scripts/setup.sh` (Unix/macOS/Linux)

```bash
#!/bin/bash

# ===========================================
# MedRecord AI - Project Setup Script
# ===========================================
# This script sets up the development environment
# for the MedRecord AI project.
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Header
echo ""
echo "========================================"
echo "  MedRecord AI - Development Setup"
echo "========================================"
echo ""

# Check required tools
print_step "Checking required tools..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 20.x LTS from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version must be 20 or higher (found: $(node -v))"
    exit 1
fi
print_success "Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Installing..."
    npm install -g pnpm
fi
print_success "pnpm $(pnpm -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi
print_success "Docker $(docker -v | cut -d' ' -f3 | tr -d ',')"

# Check Git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    exit 1
fi
print_success "Git $(git --version | cut -d' ' -f3)"

echo ""
print_step "Installing dependencies..."
pnpm install
print_success "Dependencies installed"

echo ""
print_step "Setting up environment files..."

# Create backend .env if not exists
if [ ! -f "packages/backend/.env" ]; then
    if [ -f "packages/backend/.env.example" ]; then
        cp packages/backend/.env.example packages/backend/.env
        print_success "Created packages/backend/.env from example"
        print_warning "Please update packages/backend/.env with your OpenAI API key"
    else
        print_warning "packages/backend/.env.example not found, skipping"
    fi
else
    print_success "packages/backend/.env already exists"
fi

# Create frontend .env if not exists
if [ ! -f "packages/frontend/.env" ]; then
    if [ -f "packages/frontend/.env.example" ]; then
        cp packages/frontend/.env.example packages/frontend/.env
        print_success "Created packages/frontend/.env from example"
    else
        print_warning "packages/frontend/.env.example not found, skipping"
    fi
else
    print_success "packages/frontend/.env already exists"
fi

echo ""
print_step "Starting PostgreSQL database..."
docker compose -f docker/docker-compose.yml up -d postgres
print_success "PostgreSQL container started"

echo ""
print_step "Waiting for database to be ready..."
sleep 5

# Wait for PostgreSQL to be ready
MAX_RETRIES=30
RETRY_COUNT=0
until docker compose -f docker/docker-compose.yml exec -T postgres pg_isready -U medrecord -d medrecord &> /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "Database failed to start after $MAX_RETRIES attempts"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
print_success "Database is ready"

echo ""
print_step "Generating Prisma client..."
cd packages/backend
pnpm db:generate
cd ../..
print_success "Prisma client generated"

echo ""
print_step "Running database migrations..."
cd packages/backend
pnpm db:migrate
cd ../..
print_success "Database migrations applied"

echo ""
print_step "Seeding database (optional)..."
read -p "Do you want to seed the database with sample data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd packages/backend
    pnpm db:seed
    cd ../..
    print_success "Database seeded"
else
    print_warning "Skipping database seed"
fi

# Create uploads directory
echo ""
print_step "Creating uploads directory..."
mkdir -p packages/backend/uploads/audio
print_success "Uploads directory created"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "To start development:"
echo ""
echo "  Option 1 - Start all services:"
echo "    pnpm dev"
echo ""
echo "  Option 2 - Start services individually:"
echo "    Terminal 1: docker compose -f docker/docker-compose.yml up postgres"
echo "    Terminal 2: cd packages/backend && pnpm dev"
echo "    Terminal 3: cd packages/frontend && pnpm dev"
echo ""
echo "Access:"
echo "  Frontend:      http://localhost:5173"
echo "  Backend API:   http://localhost:3001/api"
echo "  Prisma Studio: pnpm db:studio (http://localhost:5555)"
echo ""
if [ ! -f "packages/backend/.env" ] || ! grep -q "OPENAI_API_KEY=sk-" packages/backend/.env 2>/dev/null; then
    echo -e "${YELLOW}Important:${NC}"
    echo "  Don't forget to add your OpenAI API key to packages/backend/.env"
    echo ""
fi
```

### `scripts/setup.ps1` (Windows PowerShell)

```powershell
# ===========================================
# MedRecord AI - Project Setup Script
# ===========================================
# PowerShell script for Windows
# Run: .\scripts\setup.ps1
# ===========================================

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "! " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

Write-Host ""
Write-Host "========================================"
Write-Host "  MedRecord AI - Development Setup"
Write-Host "========================================"
Write-Host ""

# Check required tools
Write-Step "Checking required tools..."

# Check Node.js
try {
    $nodeVersion = node -v
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 20) {
        throw "Node.js version must be 20 or higher"
    }
    Write-Success "Node.js $nodeVersion"
} catch {
    Write-Error "Node.js 20.x is not installed"
    Write-Host "Please install from https://nodejs.org/"
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm -v
    Write-Success "pnpm $pnpmVersion"
} catch {
    Write-Warning "pnpm is not installed. Installing..."
    npm install -g pnpm
    Write-Success "pnpm installed"
}

# Check Docker
try {
    $dockerVersion = docker -v
    Write-Success "Docker found"
} catch {
    Write-Error "Docker is not installed"
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit 1
}

Write-Host ""
Write-Step "Installing dependencies..."
pnpm install
Write-Success "Dependencies installed"

Write-Host ""
Write-Step "Setting up environment files..."

# Create backend .env if not exists
$backendEnv = "packages\backend\.env"
$backendEnvExample = "packages\backend\.env.example"

if (-not (Test-Path $backendEnv)) {
    if (Test-Path $backendEnvExample) {
        Copy-Item $backendEnvExample $backendEnv
        Write-Success "Created packages\backend\.env from example"
        Write-Warning "Please update packages\backend\.env with your OpenAI API key"
    } else {
        Write-Warning "packages\backend\.env.example not found, skipping"
    }
} else {
    Write-Success "packages\backend\.env already exists"
}

# Create frontend .env if not exists
$frontendEnv = "packages\frontend\.env"
$frontendEnvExample = "packages\frontend\.env.example"

if (-not (Test-Path $frontendEnv)) {
    if (Test-Path $frontendEnvExample) {
        Copy-Item $frontendEnvExample $frontendEnv
        Write-Success "Created packages\frontend\.env from example"
    } else {
        Write-Warning "packages\frontend\.env.example not found, skipping"
    }
} else {
    Write-Success "packages\frontend\.env already exists"
}

Write-Host ""
Write-Step "Starting PostgreSQL database..."
docker compose -f docker/docker-compose.yml up -d postgres
Write-Success "PostgreSQL container started"

Write-Host ""
Write-Step "Waiting for database to be ready..."
Start-Sleep -Seconds 5

$maxRetries = 30
$retryCount = 0
do {
    $result = docker compose -f docker/docker-compose.yml exec -T postgres pg_isready -U medrecord -d medrecord 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    $retryCount++
    if ($retryCount -ge $maxRetries) {
        Write-Error "Database failed to start after $maxRetries attempts"
        exit 1
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
} while ($true)
Write-Host ""
Write-Success "Database is ready"

Write-Host ""
Write-Step "Generating Prisma client..."
Push-Location packages\backend
pnpm db:generate
Pop-Location
Write-Success "Prisma client generated"

Write-Host ""
Write-Step "Running database migrations..."
Push-Location packages\backend
pnpm db:migrate
Pop-Location
Write-Success "Database migrations applied"

Write-Host ""
Write-Step "Seeding database (optional)..."
$seedResponse = Read-Host "Do you want to seed the database with sample data? (y/N)"
if ($seedResponse -eq "y" -or $seedResponse -eq "Y") {
    Push-Location packages\backend
    pnpm db:seed
    Pop-Location
    Write-Success "Database seeded"
} else {
    Write-Warning "Skipping database seed"
}

# Create uploads directory
Write-Host ""
Write-Step "Creating uploads directory..."
New-Item -ItemType Directory -Force -Path "packages\backend\uploads\audio" | Out-Null
Write-Success "Uploads directory created"

Write-Host ""
Write-Host "========================================"
Write-Host "  Setup Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "To start development:"
Write-Host ""
Write-Host "  Option 1 - Start all services:"
Write-Host "    pnpm dev"
Write-Host ""
Write-Host "  Option 2 - Start services individually:"
Write-Host "    Terminal 1: docker compose -f docker/docker-compose.yml up postgres"
Write-Host "    Terminal 2: cd packages\backend; pnpm dev"
Write-Host "    Terminal 3: cd packages\frontend; pnpm dev"
Write-Host ""
Write-Host "Access:"
Write-Host "  Frontend:      http://localhost:5173"
Write-Host "  Backend API:   http://localhost:3001/api"
Write-Host "  Prisma Studio: pnpm db:studio (http://localhost:5555)"
Write-Host ""
```

### `scripts/dev.sh` (Unix/macOS/Linux)

```bash
#!/bin/bash

# ===========================================
# MedRecord AI - Development Startup Script
# ===========================================
# Starts all development services
# ===========================================

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Starting MedRecord AI development environment...${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Start PostgreSQL if not running
if ! docker compose -f docker/docker-compose.yml ps postgres | grep -q "Up"; then
    echo "Starting PostgreSQL..."
    docker compose -f docker/docker-compose.yml up -d postgres
    sleep 3
fi

echo -e "${GREEN}PostgreSQL is running${NC}"

# Check if .env files exist
if [ ! -f "packages/backend/.env" ]; then
    echo -e "${YELLOW}Warning: packages/backend/.env not found. Run scripts/setup.sh first.${NC}"
    exit 1
fi

echo ""
echo "Starting development servers..."
echo ""
echo "Frontend will be available at: http://localhost:5173"
echo "Backend API will be available at: http://localhost:3001/api"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start both frontend and backend in parallel
pnpm dev
```

---

## Database Management Scripts

### Database Reset Script

Create `scripts/db-reset.sh`:

```bash
#!/bin/bash

# ===========================================
# MedRecord AI - Database Reset Script
# ===========================================
# WARNING: This will delete all data!
# ===========================================

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}========================================"
echo "  WARNING: Database Reset"
echo "========================================"
echo -e "${NC}"
echo "This will:"
echo "  - Drop all tables"
echo "  - Re-run all migrations"
echo "  - Delete all data"
echo ""

read -p "Are you sure you want to reset the database? (yes/N) " -r
if [[ ! $REPLY == "yes" ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Resetting database..."

cd packages/backend
pnpm db:reset
cd ../..

echo ""
echo "Database reset complete."
echo ""

read -p "Do you want to seed the database? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd packages/backend
    pnpm db:seed
    cd ../..
    echo "Database seeded."
fi
```

### Database Backup Script

Create `scripts/db-backup.sh`:

```bash
#!/bin/bash

# ===========================================
# MedRecord AI - Database Backup Script
# ===========================================

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/medrecord_${TIMESTAMP}.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

echo "Creating database backup..."

docker compose -f docker/docker-compose.yml exec -T postgres \
    pg_dump -U medrecord -d medrecord > $BACKUP_FILE

echo "Backup saved to: $BACKUP_FILE"
echo "Size: $(du -h $BACKUP_FILE | cut -f1)"
```

---

## Package.json Scripts Reference

### Root Package Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `pnpm --parallel run dev` | Start all dev servers |
| `build` | `pnpm --recursive run build` | Build all packages |
| `test` | `pnpm --recursive run test` | Run all tests |
| `lint` | `pnpm --recursive run lint` | Lint all packages |
| `lint:fix` | `pnpm --recursive run lint:fix` | Fix lint issues |
| `format` | `prettier --write "**/*.{ts,tsx,js,json,md}"` | Format all files |
| `format:check` | `prettier --check "**/*.{ts,tsx,js,json,md}"` | Check formatting |
| `type-check` | `pnpm --recursive run type-check` | Check types |
| `db:migrate` | `pnpm --filter backend run db:migrate` | Run migrations |
| `db:seed` | `pnpm --filter backend run db:seed` | Seed database |
| `db:studio` | `pnpm --filter backend run db:studio` | Open Prisma Studio |
| `clean` | Remove node_modules and dist | Clean all packages |

### Backend Package Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/index.ts` | Development server |
| `build` | `tsc` | Compile TypeScript |
| `start` | `node dist/index.js` | Start production server |
| `test` | `vitest run` | Run tests |
| `test:watch` | `vitest` | Watch mode tests |
| `test:coverage` | `vitest run --coverage` | Tests with coverage |
| `db:migrate` | `prisma migrate dev` | Run migrations |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:studio` | `prisma studio` | Open Prisma Studio |
| `db:seed` | `tsx prisma/seed.ts` | Seed database |
| `db:reset` | `prisma migrate reset` | Reset database |

### Frontend Package Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Development server |
| `build` | `tsc && vite build` | Production build |
| `preview` | `vite preview` | Preview production build |
| `test` | `vitest run` | Run tests |
| `test:watch` | `vitest` | Watch mode tests |
| `test:ui` | `vitest --ui` | Vitest UI |
| `test:coverage` | `vitest run --coverage` | Tests with coverage |

---

## Quick Reference

### Initial Setup

```bash
# Clone and setup
git clone <repository-url>
cd health-record

# Run setup script
# Unix/macOS/Linux:
./scripts/setup.sh

# Windows PowerShell:
.\scripts\setup.ps1
```

### Daily Development

```bash
# Start everything
pnpm dev

# Or start individually
docker compose -f docker/docker-compose.yml up -d postgres
cd packages/backend && pnpm dev    # Terminal 1
cd packages/frontend && pnpm dev   # Terminal 2
```

### Before Committing

```bash
# Format and lint
pnpm format
pnpm lint

# Run tests
pnpm test

# Type check
pnpm type-check
```

### Database Operations

```bash
# View data
pnpm db:studio

# Add migration
cd packages/backend
pnpm db:migrate -- --name add_new_field

# Reset database
pnpm db:reset

# Seed database
pnpm db:seed
```

---

## References

- [Setup Instructions](./setup-instructions.md)
- [Configuration Files](./config-files.md)
- [Development Environment](../tech-stack/dev-environment.md)
