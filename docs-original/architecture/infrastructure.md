# Infrastructure Architecture: MedRecord AI

This document defines the infrastructure architecture including development environment, deployment strategy, containerization, and CI/CD approach.

---

## Infrastructure Overview

### Target Environment

| Aspect | MVP Choice | Rationale |
|--------|-----------|-----------|
| Server | Ubuntu 22.04 LTS | Stable, well-supported |
| Container | Docker + Docker Compose | Simplified deployment |
| Reverse Proxy | Nginx | Performance, SSL termination |
| Database | PostgreSQL 15 | Reliable, full-featured |
| Hosting | VPS or Cloud VM | Cost-effective for MVP |

### Infrastructure Diagram

```mermaid
graph TB
    subgraph Internet
        User[User Browser]
        OpenAI[OpenAI API]
    end

    subgraph VPS["Ubuntu Server (VPS)"]
        subgraph Docker["Docker Environment"]
            Nginx[Nginx:443/80]

            subgraph App["Application Stack"]
                Frontend[Frontend Container<br/>React Build]
                Backend[Backend Container<br/>Node.js]
            end

            Postgres[(PostgreSQL<br/>Container)]
        end

        subgraph Storage["Persistent Storage"]
            DBData[Database Volume]
            AudioFiles[Audio Files Volume]
            Logs[Log Files]
        end
    end

    User -->|HTTPS| Nginx
    Nginx -->|/| Frontend
    Nginx -->|/api| Backend
    Backend --> Postgres
    Backend -->|HTTPS| OpenAI
    Postgres --> DBData
    Backend --> AudioFiles
    Backend --> Logs
```

---

## Development Environment Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | JavaScript runtime |
| npm/pnpm | Latest | Package manager |
| Docker | 24+ | Containerization |
| Docker Compose | v2+ | Multi-container orchestration |
| Git | Latest | Version control |
| VS Code | Latest | Recommended IDE |

### Project Structure

```
medrecord-ai/
├── frontend/                   # React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── .env.example
│
├── backend/                    # Node.js API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker/                     # Docker configurations
│   ├── nginx/
│   │   └── nginx.conf
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml          # Development compose
├── docker-compose.prod.yml     # Production compose
├── .env.example                # Root environment template
├── .gitignore
└── README.md
```

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/username/medrecord-ai.git
cd medrecord-ai

# 2. Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 3. Start development database
docker compose up -d postgres

# 4. Install dependencies
cd backend && npm install && npx prisma migrate dev
cd ../frontend && npm install

# 5. Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Development Environment Variables

```bash
# .env (root)
COMPOSE_PROJECT_NAME=medrecord

# backend/.env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medrecord
JWT_SECRET=development-secret-key-minimum-32-characters
OPENAI_API_KEY=sk-your-api-key
FRONTEND_URL=http://localhost:3000

# frontend/.env
VITE_API_URL=http://localhost:3001/api
```

### Development Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: medrecord
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## Deployment Architecture

### Single Server Deployment

```
Ubuntu Server (2 vCPU, 4GB RAM, 50GB SSD)
├── Docker Engine
│   ├── nginx (reverse proxy)
│   ├── frontend (React build served by nginx)
│   ├── backend (Node.js application)
│   └── postgres (database)
├── Persistent Volumes
│   ├── /var/lib/medrecord/postgres/
│   ├── /var/lib/medrecord/uploads/
│   └── /var/lib/medrecord/logs/
└── SSL Certificates
    └── /etc/letsencrypt/
```

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Network | 1 Gbps | 1 Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Recommended VPS Providers

| Provider | Plan | Estimated Cost |
|----------|------|----------------|
| DigitalOcean | Basic Droplet | $24/month |
| Linode | Linode 4GB | $24/month |
| Vultr | Cloud Compute | $24/month |
| Hetzner | CPX21 | ~$10/month |
| AWS EC2 | t3.medium | ~$30/month |

---

## Container Strategy

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production image
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npx prisma generate

# Production image
FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache dumb-init

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: medrecord-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
    container_name: medrecord-frontend
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: medrecord-backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - FRONTEND_URL=${FRONTEND_URL}
    volumes:
      - audio_uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/medrecord/postgres
  audio_uploads:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/medrecord/uploads
```

### Nginx Production Configuration

```nginx
# docker/nginx/nginx.prod.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Upstream servers
    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:3001;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name medrecord.example.com;

        ssl_certificate /etc/letsencrypt/live/medrecord.example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/medrecord.example.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # API
        location /api {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts for AI processing
            proxy_read_timeout 120s;
            proxy_connect_timeout 60s;

            # File upload size
            client_max_body_size 30M;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://backend/api/health;
        }
    }
}
```

---

## CI/CD Pipeline Approach

### Simple Deployment Script

For MVP, a simple shell script deployment is sufficient:

```bash
#!/bin/bash
# deploy.sh

set -e

SERVER="user@server-ip"
APP_DIR="/opt/medrecord"

echo "==> Building and deploying MedRecord AI"

# 1. SSH to server and pull latest code
ssh $SERVER "cd $APP_DIR && git pull origin main"

# 2. Build and restart containers
ssh $SERVER "cd $APP_DIR && docker compose -f docker-compose.prod.yml build"
ssh $SERVER "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"

# 3. Run database migrations
ssh $SERVER "docker exec medrecord-backend npx prisma migrate deploy"

# 4. Health check
sleep 10
curl -f https://medrecord.example.com/health || exit 1

echo "==> Deployment complete!"
```

### GitHub Actions (Optional Enhancement)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/medrecord
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker exec medrecord-backend npx prisma migrate deploy

      - name: Health check
        run: |
          sleep 15
          curl -f https://medrecord.example.com/health
```

---

## Environment Configuration

### Production Environment Variables

```bash
# /opt/medrecord/.env
# Database
POSTGRES_USER=medrecord
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=medrecord
DATABASE_URL=postgresql://medrecord:<password>@postgres:5432/medrecord

# Application
NODE_ENV=production
JWT_SECRET=<256-bit-secret>
OPENAI_API_KEY=sk-<api-key>
FRONTEND_URL=https://medrecord.example.com
VITE_API_URL=https://medrecord.example.com/api
```

### Secret Generation

```bash
# Generate strong passwords and secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -base64 24  # For POSTGRES_PASSWORD
```

---

## Server Setup Guide

### Initial Server Setup

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Install Docker Compose
sudo apt install docker-compose-plugin

# 4. Create application directories
sudo mkdir -p /opt/medrecord
sudo mkdir -p /var/lib/medrecord/{postgres,uploads,logs}
sudo chown -R $USER:$USER /opt/medrecord /var/lib/medrecord

# 5. Clone repository
git clone https://github.com/username/medrecord-ai.git /opt/medrecord

# 6. Setup SSL with Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d medrecord.example.com

# 7. Configure environment
cd /opt/medrecord
cp .env.example .env
nano .env  # Edit with production values

# 8. Start application
docker compose -f docker-compose.prod.yml up -d
```

### Firewall Configuration

```bash
# UFW firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## Monitoring and Logging

### Basic Logging

```bash
# View container logs
docker logs medrecord-backend -f
docker logs medrecord-frontend -f
docker logs medrecord-postgres -f

# Combined logs
docker compose -f docker-compose.prod.yml logs -f
```

### Health Check Endpoint

```typescript
// backend/src/routes/health.routes.ts
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});
```

### Simple Monitoring Script

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="https://medrecord.example.com/health"
ALERT_EMAIL="admin@example.com"

if ! curl -sf "$HEALTH_URL" > /dev/null; then
    echo "Health check failed at $(date)" | mail -s "MedRecord Alert" $ALERT_EMAIL
fi
```

Add to crontab:
```bash
*/5 * * * * /opt/medrecord/health-check.sh
```

---

## Backup Strategy

### Database Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/medrecord"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec medrecord-postgres pg_dump -U medrecord medrecord | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/lib/medrecord/uploads

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
0 2 * * * /opt/medrecord/backup.sh
```

### Restore Process

```bash
# Restore database
gunzip -c backup.sql.gz | docker exec -i medrecord-postgres psql -U medrecord medrecord

# Restore uploads
tar -xzf uploads_backup.tar.gz -C /
```

---

## Scaling Considerations (Future)

### Horizontal Scaling Path

```
Phase 1 (Current):
Single Server → All services on one machine

Phase 2 (Growth):
├── Load Balancer (Nginx/HAProxy)
├── App Server 1 (Frontend + Backend)
├── App Server 2 (Frontend + Backend)
└── Database Server (PostgreSQL)

Phase 3 (Scale):
├── CDN (Static assets)
├── Load Balancer
├── App Servers (auto-scaling)
├── Database (managed PostgreSQL)
├── Redis (sessions, caching)
└── Object Storage (audio files)
```

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [High-Level Architecture](./high-level-architecture.md)
