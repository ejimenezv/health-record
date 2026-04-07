# Technology Decisions: MedRecord AI

This document summarizes all technology choices for the MedRecord AI MVP, including justifications and alternatives considered.

---

## Decision Summary

### Technology Stack Overview

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React | 18.x |
| **Frontend Language** | TypeScript | 5.x |
| **Build Tool** | Vite | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **State Management** | React Query + Context | 5.x |
| **Backend** | Node.js + Express | 20 LTS + 4.x |
| **Backend Language** | TypeScript | 5.x |
| **ORM** | Prisma | 5.x |
| **Database** | PostgreSQL | 15 |
| **Authentication** | JWT | - |
| **AI (Speech-to-Text)** | OpenAI Whisper | whisper-1 |
| **AI (Extraction)** | OpenAI GPT-4 | gpt-4 |
| **Containerization** | Docker | 24+ |
| **Reverse Proxy** | Nginx | alpine |
| **Hosting** | Ubuntu VPS | 22.04 LTS |

---

## Frontend Decisions

### Decision 1: React 18

| Aspect | Details |
|--------|---------|
| **Choice** | React 18 |
| **Alternatives** | Vue.js, Svelte, Angular |
| **Rationale** | Largest ecosystem, most learning resources, familiar to most developers |

**Pros:**
- Extensive component library ecosystem
- Large community and documentation
- React Query integrates seamlessly
- Good TypeScript support

**Cons:**
- More boilerplate than some alternatives
- Performance overhead vs. Svelte
- Learning curve for hooks

### Decision 2: Vite

| Aspect | Details |
|--------|---------|
| **Choice** | Vite 5 |
| **Alternatives** | Create React App, Next.js, Webpack |
| **Rationale** | Fast development builds, simple configuration, modern defaults |

**Pros:**
- Near-instant hot module replacement
- Simple configuration
- Built-in TypeScript support
- Smaller bundle sizes

**Cons:**
- Less mature than Webpack
- Some plugins less available

**Why not Next.js:**
- SSR not needed for internal tool
- API routes would duplicate Express backend
- Additional complexity not justified for MVP

### Decision 3: Tailwind CSS

| Aspect | Details |
|--------|---------|
| **Choice** | Tailwind CSS 3 |
| **Alternatives** | CSS Modules, styled-components, MUI |
| **Rationale** | Rapid prototyping, consistent design, no runtime overhead |

**Pros:**
- Fast development with utility classes
- Consistent spacing/colors
- No CSS file management
- Small production bundle (purged)

**Cons:**
- Verbose HTML
- Learning utility names
- Less semantic class names

### Decision 4: React Query for Server State

| Aspect | Details |
|--------|---------|
| **Choice** | TanStack Query (React Query) 5 |
| **Alternatives** | Redux Toolkit Query, SWR, Apollo Client |
| **Rationale** | Best-in-class caching, refetching, and mutation handling |

**Pros:**
- Automatic caching and refetching
- Built-in loading/error states
- Optimistic updates
- DevTools included

**Cons:**
- Additional library to learn
- Overkill for very simple apps

### Decision 5: React Hook Form + Zod

| Aspect | Details |
|--------|---------|
| **Choice** | React Hook Form + Zod |
| **Alternatives** | Formik + Yup, native forms |
| **Rationale** | Performance, TypeScript integration, schema-first validation |

**Pros:**
- Minimal re-renders
- Type-safe schemas
- Same schemas for frontend/backend
- Small bundle size

---

## Backend Decisions

### Decision 6: Node.js + Express

| Aspect | Details |
|--------|---------|
| **Choice** | Node.js 20 LTS + Express 4 |
| **Alternatives** | Python/FastAPI, Go/Gin, Nest.js |
| **Rationale** | JavaScript ecosystem, simple setup, wide hosting support |

**Pros:**
- Same language as frontend
- Huge package ecosystem (npm)
- Simple and flexible
- Easy to deploy anywhere

**Cons:**
- Single-threaded (worker threads available)
- Less structured than Nest.js
- Manual setup required

**Why not Python/FastAPI:**
- Would require two language ecosystems
- JavaScript familiarity assumed

**Why not Nest.js:**
- More opinionated/complex
- Overkill for MVP scope
- Express sufficient for CRUD + AI integration

### Decision 7: TypeScript

| Aspect | Details |
|--------|---------|
| **Choice** | TypeScript 5 |
| **Alternatives** | JavaScript (vanilla) |
| **Rationale** | Type safety prevents bugs, better IDE support, self-documenting code |

**Pros:**
- Catch errors at compile time
- Better autocomplete and refactoring
- Self-documenting interfaces
- Prisma generates types

**Cons:**
- Compilation step required
- Learning curve for strict mode
- Some library type definitions incomplete

### Decision 8: Prisma ORM

| Aspect | Details |
|--------|---------|
| **Choice** | Prisma 5 |
| **Alternatives** | TypeORM, Sequelize, Drizzle, raw SQL |
| **Rationale** | Type-safe queries, excellent DX, automatic migrations |

**Pros:**
- Auto-generated TypeScript types
- Intuitive query syntax
- Visual database browser (Prisma Studio)
- Migration management

**Cons:**
- Additional abstraction layer
- Some complex queries need raw SQL
- Vendor lock-in to Prisma syntax

**Why not TypeORM:**
- Decorators feel legacy
- Less intuitive relations
- Weaker TypeScript support

### Decision 9: PostgreSQL 15

| Aspect | Details |
|--------|---------|
| **Choice** | PostgreSQL 15 |
| **Alternatives** | MySQL, SQLite, MongoDB |
| **Rationale** | Full-featured, ACID compliant, JSON support, widely supported |

**Pros:**
- Robust and reliable
- Excellent JSON support (JSONB)
- Full-text search built-in
- Free managed tiers available (Neon, Supabase)

**Cons:**
- More resource-heavy than SQLite
- Setup more complex than MongoDB

**Why not MongoDB:**
- Relational data model better fits medical records
- ACID transactions important for medical data
- Prisma has better PostgreSQL support

---

## AI Integration Decisions

### Decision 10: OpenAI Whisper API

| Aspect | Details |
|--------|---------|
| **Choice** | OpenAI Whisper API (whisper-1) |
| **Alternatives** | Self-hosted Whisper, Google Cloud Speech, Amazon Transcribe |
| **Rationale** | Excellent accuracy, simple API, cost-effective for MVP volume |

**Pros:**
- High accuracy with medical terms
- Simple REST API
- No infrastructure to manage
- Good price (~$0.006/minute)

**Cons:**
- No HIPAA BAA available
- Requires internet connection
- API rate limits

**Why not self-hosted:**
- GPU infrastructure required
- Additional maintenance burden
- Higher complexity for MVP

### Decision 11: OpenAI GPT-4

| Aspect | Details |
|--------|---------|
| **Choice** | OpenAI GPT-4 |
| **Alternatives** | Claude, GPT-3.5-turbo, local LLM |
| **Rationale** | Best extraction accuracy, JSON mode, strong reasoning |

**Pros:**
- Excellent medical term understanding
- JSON response format
- Reliable structured output
- Strong prompt following

**Cons:**
- Higher cost than GPT-3.5
- No HIPAA BAA
- Slower than GPT-3.5

**Why not GPT-3.5-turbo:**
- Lower extraction accuracy
- Weaker with complex medical terminology
- Price difference acceptable for MVP volume

**Why not Claude:**
- Either would work well
- OpenAI chosen for unified API (Whisper + GPT)
- Can easily swap later

---

## Infrastructure Decisions

### Decision 12: Docker

| Aspect | Details |
|--------|---------|
| **Choice** | Docker + Docker Compose |
| **Alternatives** | Bare metal, Kubernetes, serverless |
| **Rationale** | Portable, reproducible, simple orchestration |

**Pros:**
- Consistent environments (dev/prod)
- Easy deployment
- Isolated services
- Version-controlled infrastructure

**Cons:**
- Docker learning curve
- Resource overhead
- Container management

**Why not Kubernetes:**
- Massive overkill for single-server MVP
- Would revisit for multi-node scaling

### Decision 13: Nginx

| Aspect | Details |
|--------|---------|
| **Choice** | Nginx |
| **Alternatives** | Traefik, Caddy, HAProxy |
| **Rationale** | Battle-tested, excellent performance, wide documentation |

**Pros:**
- High performance
- SSL/TLS termination
- Easy configuration
- Extensive documentation

**Cons:**
- Manual SSL renewal (certbot)
- Configuration syntax learning

**Why not Caddy:**
- Nginx more familiar
- Better for custom configurations
- More documentation available

### Decision 14: Ubuntu VPS

| Aspect | Details |
|--------|---------|
| **Choice** | Ubuntu 22.04 LTS on VPS |
| **Alternatives** | AWS ECS, Vercel + Railway, Render |
| **Rationale** | Full control, cost-effective, meets requirements |

**Pros:**
- Predictable monthly cost (~$24)
- Full server control
- No vendor lock-in
- Can run all services

**Cons:**
- Manual server management
- Must handle backups
- No auto-scaling

**Why not Vercel/Railway:**
- Would need separate database service
- Audio file handling more complex
- Potentially higher costs at scale

---

## Authentication Decision

### Decision 15: JWT Authentication

| Aspect | Details |
|--------|---------|
| **Choice** | JWT (JSON Web Tokens) |
| **Alternatives** | Session cookies, OAuth 2.0, Auth0 |
| **Rationale** | Stateless, simple implementation, works well with SPA |

**Pros:**
- No server-side session storage
- Works well with React SPA
- Self-contained tokens
- Easy to implement

**Cons:**
- Cannot revoke tokens instantly
- Token size larger than session ID
- Must handle refresh carefully

**Why not Auth0/Clerk:**
- Additional cost
- Complexity for single-user MVP
- External dependency

---

## Decision Matrix

### Criteria Weights

| Criterion | Weight |
|-----------|--------|
| Development Speed | 25% |
| Simplicity | 20% |
| Type Safety | 15% |
| Performance | 15% |
| Cost | 15% |
| Ecosystem | 10% |

### Frontend Framework Comparison

| Framework | Dev Speed | Simplicity | Type Safety | Performance | Ecosystem | Score |
|-----------|-----------|------------|-------------|-------------|-----------|-------|
| React | 8 | 7 | 9 | 7 | 10 | **8.0** |
| Vue | 9 | 8 | 7 | 8 | 7 | 7.8 |
| Svelte | 8 | 9 | 7 | 10 | 5 | 7.5 |
| Angular | 6 | 5 | 10 | 7 | 8 | 6.8 |

### Backend Framework Comparison

| Framework | Dev Speed | Simplicity | Type Safety | Performance | Ecosystem | Score |
|-----------|-----------|------------|-------------|-------------|-----------|-------|
| Express | 9 | 9 | 8 | 7 | 9 | **8.4** |
| Nest.js | 7 | 6 | 10 | 7 | 8 | 7.4 |
| FastAPI | 8 | 8 | 8 | 9 | 7 | 8.0 |
| Go/Gin | 6 | 7 | 9 | 10 | 6 | 7.3 |

### Database Comparison

| Database | Dev Speed | Simplicity | Type Safety | Performance | Ecosystem | Score |
|----------|-----------|------------|-------------|-------------|-----------|-------|
| PostgreSQL | 8 | 7 | 9 | 8 | 9 | **8.1** |
| MySQL | 7 | 8 | 7 | 8 | 8 | 7.6 |
| MongoDB | 9 | 8 | 6 | 7 | 8 | 7.6 |
| SQLite | 9 | 10 | 7 | 6 | 6 | 7.6 |

---

## Technology Versions

### Pinned Versions (package.json)

```json
{
  "frontend": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.20.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "tailwindcss": "^3.4.0"
  },
  "backend": {
    "express": "^4.18.0",
    "@prisma/client": "^5.10.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "zod": "^3.22.0",
    "multer": "^1.4.0",
    "openai": "^4.28.0",
    "pino": "^8.19.0"
  }
}
```

---

## Future Technology Considerations

### Phase 2 Additions

| Technology | Purpose | When to Add |
|------------|---------|-------------|
| Redis | Session storage, caching | Multi-user scale |
| Bull/BullMQ | Background job queue | AI processing queue |
| Socket.io | Real-time transcription | Real-time feature |
| Sentry | Error monitoring | Production launch |
| Prometheus | Metrics collection | Production scaling |

### Phase 3 Considerations

| Technology | Purpose | When to Consider |
|------------|---------|------------------|
| Kubernetes | Container orchestration | Multi-node deployment |
| AWS/Azure | Managed services | HIPAA compliance needed |
| Elasticsearch | Full-text search | Large record volumes |
| Kafka | Event streaming | Audit logging scale |

---

## References

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Docker Documentation](https://docs.docker.com/)
