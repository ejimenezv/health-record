# Project Setup Instructions

This document provides step-by-step instructions for setting up the MedRecord AI development environment.

---

## Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9.x | `npm install -g pnpm` |
| **Docker** | 24.x+ | [docker.com](https://www.docker.com/products/docker-desktop) |
| **Git** | 2.40+ | [git-scm.com](https://git-scm.com/) |

### Recommended

| Software | Purpose |
|----------|---------|
| **VS Code** | Code editor with recommended extensions |
| **Postman/Insomnia** | API testing |

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd health-record

# Run the setup script
# Unix/macOS/Linux:
./scripts/setup.sh

# Windows PowerShell:
.\scripts\setup.ps1
```

### Option 2: Manual Setup

Follow the detailed steps below.

---

## Detailed Setup Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd health-record
```

### Step 2: Verify Prerequisites

Check that all required tools are installed:

```bash
# Check Node.js (should be 20.x)
node -v

# Check npm
npm -v

# Check pnpm (install if missing)
pnpm -v
# If not installed: npm install -g pnpm

# Check Docker
docker -v

# Check Docker is running
docker info
```

### Step 3: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This installs dependencies for:
- Root workspace (Prettier, TypeScript, Husky)
- Backend package
- Frontend package

### Step 4: Configure Environment Variables

#### Backend Environment

```bash
# Copy the example file
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` and configure:

```bash
# Required - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-your-actual-api-key"

# Optional - Change if needed
PORT=3001
DATABASE_URL="postgresql://medrecord:medrecord_dev@localhost:5432/medrecord?schema=public"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
```

#### Frontend Environment

```bash
# Copy the example file
cp packages/frontend/.env.example packages/frontend/.env
```

The default values should work for local development:

```bash
VITE_API_URL="http://localhost:3001/api"
```

### Step 5: Start the Database

```bash
# Start PostgreSQL in Docker
docker compose -f docker/docker-compose.yml up -d postgres

# Verify it's running
docker compose -f docker/docker-compose.yml ps
```

Wait for PostgreSQL to be ready (about 5-10 seconds).

### Step 6: Setup Prisma

```bash
# Navigate to backend
cd packages/backend

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Return to root
cd ../..
```

### Step 7: Seed Database (Optional)

```bash
cd packages/backend
pnpm db:seed
cd ../..
```

This creates sample data including:
- A test provider account
- Sample patients
- Sample appointments

### Step 8: Start Development Servers

```bash
# Start all services
pnpm dev
```

Or start individually in separate terminals:

```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend
cd packages/frontend && pnpm dev
```

### Step 9: Verify Setup

| Service | URL | Expected Result |
|---------|-----|-----------------|
| Frontend | http://localhost:5173 | Login page loads |
| Backend API | http://localhost:3001/api/health | `{"status":"ok"}` |
| Prisma Studio | Run `pnpm db:studio` | Database browser opens |

---

## Getting an OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)
6. Add to `packages/backend/.env`:
   ```
   OPENAI_API_KEY="sk-your-key-here"
   ```

### API Usage Limits

- Set a spending limit in your OpenAI dashboard
- For development, $5-10 is typically sufficient
- Costs:
  - Whisper: ~$0.006/minute of audio
  - GPT-4: ~$0.03/1K input tokens

---

## VS Code Setup

### Install Recommended Extensions

1. Open VS Code in the project root
2. You'll be prompted to install recommended extensions
3. Click "Install All"

Or manually install:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
```

### Configure VS Code

The project includes `.vscode/settings.json` with:
- Format on save
- ESLint auto-fix
- Tailwind IntelliSense
- TypeScript path resolution

---

## Development Workflow

### Daily Startup

```bash
# 1. Start services
pnpm dev

# 2. Open browser
# Frontend: http://localhost:5173
```

### Before Committing

```bash
# Format code
pnpm format

# Run linting
pnpm lint

# Run tests
pnpm test

# Type check
pnpm type-check
```

### Database Commands

```bash
# View/edit data visually
pnpm db:studio

# Create a new migration
cd packages/backend
pnpm db:migrate -- --name describe_the_change

# Reset database (deletes all data!)
pnpm db:reset

# Regenerate Prisma client
pnpm db:generate
```

---

## Troubleshooting

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**:

```bash
# Find process using port (Windows)
netstat -ano | findstr :3001

# Find process using port (macOS/Linux)
lsof -i :3001

# Kill the process
# Windows: taskkill /PID <pid> /F
# Unix: kill -9 <pid>
```

### Docker Issues

**Error**: `Cannot connect to Docker daemon`

**Solution**:
1. Start Docker Desktop
2. Wait for it to fully initialize
3. Try again

**Error**: PostgreSQL container won't start

**Solution**:

```bash
# Stop all containers
docker compose -f docker/docker-compose.yml down

# Remove volumes (this deletes data!)
docker compose -f docker/docker-compose.yml down -v

# Start fresh
docker compose -f docker/docker-compose.yml up -d postgres
```

### Database Connection Failed

**Error**: `Can't reach database server`

**Solution**:

1. Check if PostgreSQL is running:
   ```bash
   docker compose -f docker/docker-compose.yml ps
   ```

2. Check database logs:
   ```bash
   docker compose -f docker/docker-compose.yml logs postgres
   ```

3. Verify DATABASE_URL in `.env` matches docker-compose settings

### Prisma Issues

**Error**: `Prisma Client has not been generated`

**Solution**:

```bash
cd packages/backend
pnpm db:generate
```

**Error**: `Migration failed`

**Solution**:

```bash
cd packages/backend
# Reset and re-run migrations
pnpm db:reset
```

### Node Modules Issues

**Error**: Module not found or version conflicts

**Solution**:

```bash
# Remove all node_modules
rm -rf node_modules packages/*/node_modules

# Clear pnpm store (if needed)
pnpm store prune

# Reinstall
pnpm install
```

### pnpm Issues

**Error**: `ERR_PNPM_META_FETCH_FAIL`

**Solution**:

```bash
# Clear cache
pnpm cache clean

# Reinstall
pnpm install
```

### TypeScript Issues

**Error**: Type errors in IDE but not in build

**Solution**:
1. Restart TypeScript server in VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
2. Or close and reopen VS Code

---

## Environment-Specific Notes

### Windows

- Use PowerShell or Git Bash for running scripts
- Line endings: Git should handle this automatically
- If using WSL2 with Docker, performance is better with project in WSL filesystem

### macOS

- For M1/M2 Macs, Docker should work natively
- If homebrew node conflicts with nvm, uninstall one

### Linux

- Ensure Docker daemon is running: `sudo systemctl start docker`
- Add user to docker group to avoid sudo: `sudo usermod -aG docker $USER`

---

## Test Credentials

After seeding the database:

| Account | Email | Password |
|---------|-------|----------|
| Test Doctor | doctor@example.com | password123 |

---

## Getting Help

### Documentation

- [Root Structure](./root-structure.md)
- [Backend Structure](./backend-structure.md)
- [Frontend Structure](./frontend-structure.md)
- [Development Scripts](./dev-scripts.md)

### External Resources

- [pnpm Documentation](https://pnpm.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)

---

## Next Steps

After setup is complete:

1. **Explore the codebase** - Start with `packages/backend/src/index.ts` and `packages/frontend/src/main.tsx`

2. **Review the architecture** - Read `docs/architecture/high-level-architecture.md`

3. **Understand the data model** - Check `docs/data-model/prisma-schema.md`

4. **Start developing** - Pick a user story from `docs/stories/` and implement it
