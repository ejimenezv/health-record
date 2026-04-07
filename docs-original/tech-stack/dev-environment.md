# Development Environment: MedRecord AI

This document defines the development environment setup for the Medical Record System MVP.

---

## Required Software

### Core Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime |
| **npm** | 10.x+ | Package manager (included with Node.js) |
| **Docker** | 24.x+ | Containerization |
| **Docker Compose** | V2 | Multi-container orchestration |
| **Git** | 2.40+ | Version control |

### Optional but Recommended

| Software | Version | Purpose |
|----------|---------|---------|
| **VS Code** | Latest | Code editor |
| **pnpm** | 8.x+ | Alternative package manager (faster) |
| **PostgreSQL** | 15.x | Local DB (alternative to Docker) |

---

## Installation Guide

### Windows

#### Node.js

```powershell
# Using winget
winget install OpenJS.NodeJS.LTS

# Or download from https://nodejs.org/
```

#### Docker Desktop

```powershell
# Using winget
winget install Docker.DockerDesktop

# Or download from https://www.docker.com/products/docker-desktop
```

After installation:
1. Open Docker Desktop
2. Enable WSL 2 backend (recommended)
3. Accept Docker terms

#### Git

```powershell
# Using winget
winget install Git.Git

# Or download from https://git-scm.com/
```

### macOS

#### Node.js

```bash
# Using Homebrew
brew install node@20

# Or use nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Docker Desktop

```bash
# Using Homebrew
brew install --cask docker

# Or download from https://www.docker.com/products/docker-desktop
```

#### Git

```bash
# Usually pre-installed, or:
brew install git
```

### Linux (Ubuntu/Debian)

#### Node.js

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

#### Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Git

```bash
sudo apt-get update
sudo apt-get install -y git
```

---

## VS Code Setup

### Download

Download from [https://code.visualstudio.com/](https://code.visualstudio.com/)

### Required Extensions

| Extension | ID | Purpose |
|-----------|-----|---------|
| **ESLint** | dbaeumer.vscode-eslint | JavaScript linting |
| **Prettier** | esbenp.prettier-vscode | Code formatting |
| **TypeScript** | (built-in) | TypeScript support |
| **Prisma** | Prisma.prisma | Prisma schema support |

### Recommended Extensions

| Extension | ID | Purpose |
|-----------|-----|---------|
| **Tailwind CSS IntelliSense** | bradlc.vscode-tailwindcss | Tailwind autocomplete |
| **GitLens** | eamodio.gitlens | Git integration |
| **Docker** | ms-azuretools.vscode-docker | Docker support |
| **Error Lens** | usernamehw.errorlens | Inline error display |
| **Auto Rename Tag** | formulahendry.auto-rename-tag | HTML tag renaming |
| **ES7+ Snippets** | dsznajder.es7-react-js-snippets | React snippets |
| **Path Intellisense** | christian-kohler.path-intellisense | Path autocomplete |
| **Thunder Client** | rangav.vscode-thunder-client | API testing |

### Install All Extensions (Command)

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension eamodio.gitlens
code --install-extension ms-azuretools.vscode-docker
code --install-extension usernamehw.errorlens
```

### VS Code Settings

Create `.vscode/settings.json` in project root:

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
  }
}
```

### VS Code Launch Configuration

Create `.vscode/launch.json`:

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
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vitest", "--no-coverage"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Project Setup

### Clone Repository

```bash
git clone https://github.com/your-repo/medrecord-ai.git
cd medrecord-ai
```

### Directory Structure

```
medrecord-ai/
├── frontend/           # React frontend
├── backend/            # Express backend
├── docs/               # Documentation
├── docker-compose.yml  # Development containers
└── README.md
```

### Initial Setup Script

```bash
#!/bin/bash
# setup.sh

set -e

echo "Setting up MedRecord AI development environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
npx prisma generate
cd ..

# Create environment files
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env..."
    cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend/.env..."
    cp frontend/.env.example frontend/.env
fi

# Start database
echo "Starting database..."
docker compose up -d postgres

# Wait for database
echo "Waiting for database..."
sleep 5

# Run migrations
echo "Running database migrations..."
cd backend
npx prisma migrate dev
cd ..

echo "Setup complete!"
echo ""
echo "To start development:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Or use Docker Compose:"
echo "  docker compose up"
```

---

## Environment Variables

### Backend (.env)

```bash
# backend/.env.example

# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://medrecord:medrecord_dev@localhost:5432/medrecord?schema=public"

# Authentication
JWT_SECRET="development-secret-key-minimum-32-characters-long"

# OpenAI API
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# Logging
LOG_LEVEL="debug"
```

### Frontend (.env)

```bash
# frontend/.env.example

# API URL
VITE_API_URL="http://localhost:3000/api"
```

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `NODE_ENV` | No | Environment (default: development) |
| `PORT` | No | Backend port (default: 3000) |
| `LOG_LEVEL` | No | Pino log level (default: info) |
| `VITE_API_URL` | Yes | Backend API URL for frontend |

---

## Running the Application

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Access:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API: http://localhost:3000/api

### Option 2: Manual Start

#### Terminal 1: Database

```bash
# Start PostgreSQL
docker compose up postgres
```

#### Terminal 2: Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

#### Terminal 3: Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Development Commands

### Backend Commands

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format

# Tests
npm test
npm run test:watch
npm run test:coverage

# Database
npx prisma migrate dev          # Create/apply migrations
npx prisma migrate reset        # Reset database
npx prisma studio               # Visual database browser
npx prisma generate             # Generate Prisma client
npx prisma db seed              # Run seed script
```

### Frontend Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format

# Tests
npm test
npm run test:watch
npm run test:coverage
npm run test:ui                 # Vitest UI
```

### Docker Commands

```bash
# Start services
docker compose up

# Start specific service
docker compose up postgres
docker compose up backend

# Rebuild containers
docker compose up --build

# Stop services
docker compose down

# Remove volumes (reset data)
docker compose down -v

# View logs
docker compose logs -f
docker compose logs backend -f

# Execute command in container
docker compose exec backend sh
docker compose exec postgres psql -U medrecord
```

---

## Database Management

### Prisma Studio

```bash
cd backend
npx prisma studio
```

Opens visual database browser at http://localhost:5555

### Direct Database Access

```bash
# Via Docker
docker compose exec postgres psql -U medrecord

# Common psql commands
\l                  # List databases
\c medrecord        # Connect to database
\dt                 # List tables
\d patients         # Describe table
SELECT * FROM patients;
```

### Create Migration

```bash
cd backend

# After modifying prisma/schema.prisma
npx prisma migrate dev --name descriptive_name
```

### Reset Database

```bash
cd backend
npx prisma migrate reset
```

---

## Getting an OpenAI API Key

### Steps

1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Add to `backend/.env`:
   ```
   OPENAI_API_KEY="sk-your-key-here"
   ```

### Cost Management

- Set a usage limit in OpenAI dashboard
- Start with $5-10 for development
- Whisper: ~$0.006/minute
- GPT-4: ~$0.03/1K input tokens

---

## Git Configuration

### Recommended .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test coverage
coverage/

# Prisma
*.db
*.db-journal

# Docker
docker-compose.override.yml

# Uploads (development)
uploads/

# Misc
*.tsbuildinfo
```

### Pre-commit Hook (Optional)

Install husky for pre-commit checks:

```bash
# In root directory
npm install -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:

```bash
#!/bin/sh
npx lint-staged
```

`package.json`:

```json
{
  "lint-staged": {
    "frontend/src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "backend/src/**/*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# Kill process
# Windows
taskkill /PID <pid> /F

# macOS/Linux
kill -9 <pid>
```

### Docker Issues

```bash
# Reset Docker
docker compose down -v
docker system prune -f
docker compose up --build
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps

# Check logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Prisma Issues

```bash
# Regenerate client
cd backend
npx prisma generate

# Reset database
npx prisma migrate reset

# Check schema
npx prisma validate
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Quick Reference

### Start Development

```bash
# Full stack with Docker
docker compose up

# Or manual (3 terminals)
docker compose up postgres      # Terminal 1
cd backend && npm run dev       # Terminal 2
cd frontend && npm run dev      # Terminal 3
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Prisma Studio | http://localhost:5555 |

### Default Credentials

| Account | Email | Password |
|---------|-------|----------|
| Test Doctor | doctor@example.com | password123 |

---

## References

- [Node.js Download](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [VS Code](https://code.visualstudio.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vite Documentation](https://vitejs.dev/)
