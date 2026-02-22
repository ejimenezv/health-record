# Setup Preview: MedRecord AI

## Overview

This document outlines the anticipated technology requirements and installation steps for MedRecord AI. These are preliminary specifications that will be refined during implementation.

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI component library |
| **Next.js** | 14.x | React framework with SSR/API routes |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **React Hook Form** | 7.x | Form handling |
| **Zod** | 3.x | Schema validation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x LTS | Runtime environment |
| **Next.js API Routes** | 14.x | API endpoints |
| **Prisma** | 5.x | Database ORM |
| **PostgreSQL** | 15.x | Relational database |

### AI/ML Services

| Service | Purpose | Pricing |
|---------|---------|---------|
| **OpenAI Whisper API** | Audio transcription | ~$0.006/min |
| **OpenAI GPT-4** or **Claude API** | Field extraction | ~$0.10/request |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Git** | Version control |
| **npm** or **pnpm** | Package management |
| **VS Code** | Recommended IDE |
| **Postman** or **Insomnia** | API testing |

---

## System Requirements

### Development Machine

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Windows 10, macOS 11, Ubuntu 20.04 | Latest versions |
| **CPU** | 4 cores | 8 cores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 10 GB free | 20 GB SSD |
| **Node.js** | 18.x | 20.x LTS |

### Browser Requirements

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| **Chrome** | 90+ | Recommended |
| **Firefox** | 90+ | Supported |
| **Safari** | 14+ | Supported |
| **Edge** | 90+ | Supported |

**Note**: Audio recording requires browser permissions and HTTPS (or localhost).

---

## API Keys Required

| Service | Key Name | How to Obtain |
|---------|----------|---------------|
| **OpenAI** | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| **Database** | `DATABASE_URL` | From hosting provider |

### Optional (Production)

| Service | Key Name | When Needed |
|---------|----------|-------------|
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | If using Claude instead of GPT-4 |
| **Deepgram** | `DEEPGRAM_API_KEY` | If using Deepgram for transcription |

---

## Expected Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/[username]/medrecord-ai.git
cd medrecord-ai
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Environment Configuration

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medrecord"

# OpenAI
OPENAI_API_KEY="sk-..."

# NextAuth (if using)
NEXTAUTH_SECRET="random-secret-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with sample data
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Application will be available at `http://localhost:3000`

---

## Database Setup Options

### Option A: Local PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb medrecord
```

### Option B: Docker PostgreSQL

```bash
docker run --name medrecord-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=medrecord \
  -p 5432:5432 \
  -d postgres:15
```

### Option C: Cloud PostgreSQL (Recommended for MVP)

| Provider | Free Tier | Connection String |
|----------|-----------|-------------------|
| **Neon** | 0.5 GB | Provided in dashboard |
| **Supabase** | 500 MB | Provided in dashboard |
| **Railway** | $5 credit | Provided in dashboard |
| **Vercel Postgres** | 256 MB | Provided in dashboard |

---

## Project Structure Preview

```
medrecord-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes
│   │   ├── (dashboard)/        # Main app routes
│   │   │   ├── patients/       # Patient management
│   │   │   ├── appointments/   # Appointment management
│   │   │   └── records/        # Medical records
│   │   ├── api/                # API routes
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── transcription/
│   │   │   └── extraction/
│   │   └── layout.tsx
│   ├── components/             # Reusable components
│   │   ├── ui/                 # Base UI components
│   │   ├── forms/              # Form components
│   │   └── features/           # Feature components
│   ├── lib/                    # Utility functions
│   │   ├── db.ts               # Database client
│   │   ├── ai.ts               # AI service clients
│   │   └── utils.ts            # Helper functions
│   └── types/                  # TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Seed data
├── public/                     # Static assets
├── docs/                       # Documentation
├── .env.local                  # Environment variables
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Deployment Options

### Recommended: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Environment Variables to Set in Vercel:**
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`

### Alternative: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Alternative: Render

1. Connect GitHub repository
2. Configure as Web Service
3. Set environment variables
4. Deploy

---

## Development Workflow

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests (if implemented)
npm run test:e2e
```

### Linting and Formatting

```bash
# Lint
npm run lint

# Format
npm run format
```

### Database Management

```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration_name
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection failed | Check `DATABASE_URL` format and credentials |
| OpenAI API error | Verify API key and billing status |
| Audio recording not working | Ensure HTTPS or localhost, check browser permissions |
| Prisma client not found | Run `npx prisma generate` |
| Port 3000 in use | Use `npm run dev -- -p 3001` |

### Browser Audio Permissions

If audio recording fails:
1. Click lock icon in address bar
2. Allow microphone access
3. Refresh page

### API Rate Limits

| Service | Limit | Solution |
|---------|-------|----------|
| OpenAI Whisper | Varies by tier | Queue requests, batch processing |
| OpenAI GPT-4 | Varies by tier | Cache responses, rate limiting |

---

## Estimated Costs

### Development Phase

| Item | Monthly Cost |
|------|--------------|
| Database (free tier) | $0 |
| OpenAI API (light testing) | ~$5 |
| Hosting (free tier) | $0 |
| **Total** | **~$5** |

### Production Phase

| Item | Monthly Cost |
|------|--------------|
| Database (small instance) | $5-15 |
| OpenAI API (50 appointments) | ~$10 |
| Hosting (small instance) | $0-10 |
| **Total** | **~$15-35** |

---

## Next Steps

After setup:

1. **Verify database connection** - Run Prisma migrations
2. **Test API keys** - Make test API calls
3. **Check audio recording** - Test in browser
4. **Run sample workflow** - End-to-end test

---

*This document will be updated with precise instructions after implementation begins.*
