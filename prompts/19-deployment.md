# Prompt 19: Deployment to Ubuntu Server

## Context
You are implementing the Medical Record System MVP. All features are complete. Now we deploy to an Ubuntu server.

## Prerequisites
Read the following documentation files:
- `docs/architecture/infrastructure.md`
- `docs/tech-stack/devops.md`
- `docs/project-structure/config-files.md`

Ensure all previous implementation prompts are completed successfully.

## Objective
Deploy the application to an Ubuntu server with:
- Nginx reverse proxy
- PostgreSQL database
- PM2 process management
- SSL with Let's Encrypt
- CI/CD with GitHub Actions

## Tasks

### 1. Create Dockerfiles

Create `docker/Dockerfile.backend`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend
COPY tsconfig.base.json ./

# Generate Prisma client
RUN cd packages/backend && npx prisma generate

# Build
RUN pnpm --filter backend build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

Create `docker/Dockerfile.frontend`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/frontend ./packages/frontend
COPY tsconfig.base.json ./

# Build
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN pnpm --filter frontend build

# Production stage with nginx
FROM nginx:alpine AS production

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY docker/nginx.frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `docker/nginx.frontend.conf`:
```nginx
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

### 2. Create Production Docker Compose

Create `docker/docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    restart: always
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      PORT: 3001
    depends_on:
      - postgres
    networks:
      - app_network

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_WS_URL: ${VITE_WS_URL}
    restart: always
    depends_on:
      - backend
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app_network

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
```

Create `docker/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /socket.io {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
```

### 3. Create GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: healthrecord_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Run backend tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/healthrecord_test
          JWT_SECRET: test-secret
        run: |
          cd packages/backend
          npx prisma migrate deploy
          pnpm test

      - name: Run frontend tests
        run: pnpm --filter frontend test

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: |
          docker build -f docker/Dockerfile.backend -t health-record-backend .
          docker build -f docker/Dockerfile.frontend -t health-record-frontend \
            --build-arg VITE_API_URL=${{ secrets.VITE_API_URL }} \
            --build-arg VITE_WS_URL=${{ secrets.VITE_WS_URL }} .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/health-record
            git pull origin main
            docker-compose -f docker/docker-compose.prod.yml down
            docker-compose -f docker/docker-compose.prod.yml build
            docker-compose -f docker/docker-compose.prod.yml up -d
            docker system prune -f
```

### 4. Create Server Setup Script

Create `scripts/server-setup.sh`:
```bash
#!/bin/bash

# Ubuntu Server Setup Script for Health Record Application
# Run this on a fresh Ubuntu 22.04 server

set -e

echo "=== Health Record Server Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Nginx (for host-level proxy if needed)
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Create application directory
sudo mkdir -p /opt/health-record
sudo chown $USER:$USER /opt/health-record

# Clone repository
cd /opt/health-record
git clone https://github.com/YOUR_USERNAME/health-record.git .

# Create environment file
cat > docker/.env << EOF
DB_USER=healthrecord
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=healthrecord

JWT_SECRET=$(openssl rand -base64 64)
OPENAI_API_KEY=your-openai-key-here

VITE_API_URL=https://your-domain.com/api/v1
VITE_WS_URL=wss://your-domain.com
EOF

echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Edit /opt/health-record/docker/.env with your values"
echo "2. Update domain in docker/nginx.conf"
echo "3. Run: docker-compose -f docker/docker-compose.prod.yml up -d"
echo "4. Set up SSL with: certbot --nginx -d your-domain.com"
```

### 5. Create Deployment Documentation

Create `docs/deployment/deployment-guide.md`:
```markdown
# Deployment Guide

## Prerequisites
- Ubuntu 22.04 LTS server
- Domain name pointing to server IP
- OpenAI API key

## Quick Deployment

### 1. Server Setup
```bash
# SSH into your server
ssh user@your-server-ip

# Download and run setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/health-record/main/scripts/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

### 2. Configure Environment
```bash
cd /opt/health-record/docker
nano .env
# Fill in your values
```

### 3. Update Domain
```bash
# Update nginx.conf with your domain
sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' nginx.conf
```

### 4. Start Application
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Setup SSL
```bash
# Initial certificate (without Docker nginx running)
docker-compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d your-domain.com
docker-compose -f docker-compose.prod.yml up -d
```

## Maintenance

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Update Application
```bash
cd /opt/health-record
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Database Backup
```bash
docker exec -t health-record-postgres pg_dump -U healthrecord healthrecord > backup_$(date +%Y%m%d).sql
```

### Database Restore
```bash
cat backup.sql | docker exec -i health-record-postgres psql -U healthrecord healthrecord
```
```

## Commit
```bash
git add .
git commit -m "feat: add deployment configuration

- Add Docker production configuration
- Add Nginx configuration with SSL support
- Add GitHub Actions CI/CD pipeline
- Add server setup script
- Add deployment documentation

Deployment ready for Ubuntu server"
```

## Definition of Done Checklist
- [ ] Dockerfiles created for backend and frontend
- [ ] Production docker-compose created
- [ ] Nginx configuration with SSL support
- [ ] GitHub Actions workflow created
- [ ] Server setup script created
- [ ] Deployment guide documented
- [ ] All files committed

## Next Prompt
Proceed to `20-final-documentation.md` for final documentation generation.
