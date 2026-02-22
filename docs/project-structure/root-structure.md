# Root Project Structure

This document defines the root-level project structure for the MedRecord AI monorepo.

---

## Overview

The project uses a **pnpm workspace monorepo** structure with separate packages for frontend and backend applications. This approach provides:

- **Shared tooling**: Common ESLint, Prettier, and TypeScript configurations
- **Unified dependency management**: Single lockfile, shared devDependencies
- **Simple orchestration**: Run commands across all packages
- **Clear boundaries**: Separate build and deployment for each package

---

## Complete Root Structure

```
health-record/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI pipeline
├── .vscode/
│   ├── settings.json              # VS Code workspace settings
│   ├── launch.json                # Debug configurations
│   └── extensions.json            # Recommended extensions
├── docs/                          # All documentation (existing)
│   ├── research/
│   ├── product/
│   ├── stories/
│   ├── architecture/
│   ├── tech-stack/
│   ├── ai-integration/
│   ├── data-model/
│   ├── project-structure/
│   └── deliverables/
├── packages/
│   ├── backend/                   # Node.js + Express API
│   └── frontend/                  # React + Vite app
├── docker/
│   ├── Dockerfile.backend         # Backend production image
│   ├── Dockerfile.frontend        # Frontend production image
│   └── docker-compose.yml         # Development containers
├── scripts/
│   ├── setup.sh                   # Initial setup script
│   ├── setup.ps1                  # Windows setup script
│   └── dev.sh                     # Development startup script
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore patterns
├── .prettierrc                    # Prettier configuration
├── .prettierignore                # Prettier ignore patterns
├── eslint.config.js               # ESLint flat config
├── package.json                   # Root package.json (workspaces)
├── pnpm-workspace.yaml            # pnpm workspace config
├── pnpm-lock.yaml                 # Lockfile (auto-generated)
├── tsconfig.base.json             # Shared TypeScript config
└── README.md                      # Project README
```

---

## Directory Descriptions

### `.github/`

GitHub-specific configurations including CI/CD workflows.

| File | Purpose |
|------|---------|
| `workflows/ci.yml` | Automated testing, linting, and build verification |

### `.vscode/`

VS Code workspace settings for consistent development experience.

| File | Purpose |
|------|---------|
| `settings.json` | Editor settings, format on save, linting |
| `launch.json` | Debug configurations for backend and tests |
| `extensions.json` | Recommended extensions for the team |

### `docs/`

Complete project documentation organized by topic.

| Directory | Content |
|-----------|---------|
| `research/` | Initial research and market analysis |
| `product/` | Product definition and requirements |
| `stories/` | User stories and acceptance criteria |
| `architecture/` | System architecture documentation |
| `tech-stack/` | Technology stack decisions |
| `ai-integration/` | AI features documentation |
| `data-model/` | Database schema and ERD |
| `project-structure/` | This documentation |
| `deliverables/` | Final course deliverables |

### `packages/`

Application code organized as workspace packages.

| Package | Technology | Purpose |
|---------|------------|---------|
| `backend/` | Node.js + Express + Prisma | REST API server |
| `frontend/` | React + Vite + Tailwind | Web application |

### `docker/`

Docker configurations for development and production.

| File | Purpose |
|------|---------|
| `Dockerfile.backend` | Multi-stage build for backend |
| `Dockerfile.frontend` | Multi-stage build for frontend |
| `docker-compose.yml` | Local development environment |

### `scripts/`

Helper scripts for project setup and development.

| Script | Purpose |
|--------|---------|
| `setup.sh` | Initial project setup (Unix) |
| `setup.ps1` | Initial project setup (Windows) |
| `dev.sh` | Start all development services |

---

## Root Configuration Files

### `package.json`

Root package.json for workspace orchestration. Does not contain application code.

**Key sections:**
- Workspace configuration
- Shared scripts
- Root devDependencies (Prettier, TypeScript)

### `pnpm-workspace.yaml`

Defines workspace package locations for pnpm.

### `tsconfig.base.json`

Shared TypeScript compiler options extended by each package.

### `.prettierrc`

Consistent code formatting across all packages.

### `eslint.config.js`

Shared ESLint rules (flat config format).

### `.env.example`

Template for environment variables needed by both packages.

---

## Workspace Commands

All commands are run from the root directory.

### Development

```bash
# Start all services in development mode
pnpm dev

# Start specific package
pnpm --filter backend dev
pnpm --filter frontend dev
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter backend build
pnpm --filter frontend build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter backend test
pnpm --filter frontend test
```

### Linting & Formatting

```bash
# Lint all packages
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format all files
pnpm format
```

### Database

```bash
# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Directories** | kebab-case | `medical-records/` |
| **TypeScript files** | kebab-case | `auth.service.ts` |
| **React components** | PascalCase | `PatientCard.tsx` |
| **Configuration** | lowercase/kebab | `tsconfig.json` |
| **Environment** | SCREAMING_SNAKE | `.env.example` |
| **Documentation** | kebab-case | `root-structure.md` |

---

## Import Aliases

Both packages use path aliases for cleaner imports:

```typescript
// Instead of
import { logger } from '../../../utils/logger';

// Use
import { logger } from '@/utils/logger';
```

Configured in `tsconfig.json` of each package:
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

---

## References

- [Backend Structure](./backend-structure.md)
- [Frontend Structure](./frontend-structure.md)
- [Configuration Files](./config-files.md)
- [Setup Instructions](./setup-instructions.md)
