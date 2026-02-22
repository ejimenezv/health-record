# DevOps Technology Stack: MedRecord AI

This document defines the DevOps technology stack for the Medical Record System MVP, including containerization, CI/CD, deployment, and monitoring.

---

## Overview

| Component | Technology |
|-----------|------------|
| **Containerization** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |
| **Deployment** | Ubuntu VPS |
| **Reverse Proxy** | Nginx |
| **Process Management** | Docker (or PM2) |
| **SSL** | Let's Encrypt (Certbot) |
| **Monitoring** | Application Logs + Health Checks |

---

## Containerization

### Docker

| Specification | Value |
|---------------|-------|
| **Engine** | Docker |
| **Version** | 24.x+ |
| **Compose** | Docker Compose V2 |
| **Registry** | Docker Hub (optional) |

### Why Docker

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Docker** | Portable, reproducible, isolated | Learning curve | **Selected** |
| Bare Metal | Simple, direct | Environment inconsistency | Rejected |
| Podman | Rootless, compatible | Less tooling | Rejected |

---

## Dockerfile: Frontend

```dockerfile
# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Frontend Nginx Config

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## Dockerfile: Backend

```dockerfile
# backend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/

# Copy built application
COPY --from=builder /app/dist ./dist/

# Create uploads directory
RUN mkdir -p uploads/audio && chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

---

## Docker Compose: Development

```yaml
# docker-compose.yml (development)
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: medrecord
      POSTGRES_PASSWORD: medrecord_dev
      POSTGRES_DB: medrecord
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medrecord"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Backend API (development with hot reload)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: medrecord-backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://medrecord:medrecord_dev@postgres:5432/medrecord?schema=public
      JWT_SECRET: dev-secret-key-min-32-characters-long
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      FRONTEND_URL: http://localhost:5173
    ports:
      - "3000:3000"
    volumes:
      - ./backend/src:/app/src
      - ./backend/prisma:/app/prisma
      - backend_uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run dev

  # Frontend (development with hot reload)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: medrecord-frontend
    environment:
      VITE_API_URL: http://localhost:3000/api
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    depends_on:
      - backend

volumes:
  postgres_data:
  backend_uploads:
```

### Development Dockerfiles

```dockerfile
# backend/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

```dockerfile
# frontend/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

---

## Docker Compose: Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: medrecord-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

  # Certbot for SSL
  certbot:
    image: certbot/certbot
    container_name: medrecord-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: medrecord-frontend
    restart: unless-stopped
    expose:
      - "80"

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: medrecord-backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://medrecord:${DB_PASSWORD}@postgres:5432/medrecord?schema=public
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      FRONTEND_URL: https://${DOMAIN}
    expose:
      - "3000"
    volumes:
      - backend_uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    environment:
      POSTGRES_USER: medrecord
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: medrecord
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medrecord"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  backend_uploads:
```

---

## Nginx Reverse Proxy Configuration

```nginx
# nginx/conf.d/default.conf

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name medrecord.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name medrecord.example.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/medrecord.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medrecord.example.com/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # API Backend
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout for AI endpoints
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;

        # File upload size
        client_max_body_size 30M;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## CI/CD: GitHub Actions

### Main Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # Lint and Type Check
  lint:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [frontend, backend]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: ${{ matrix.package }}/package-lock.json

      - name: Install dependencies
        working-directory: ${{ matrix.package }}
        run: npm ci

      - name: Run linter
        working-directory: ${{ matrix.package }}
        run: npm run lint

      - name: Type check
        working-directory: ${{ matrix.package }}
        run: npm run type-check

  # Run Tests
  test:
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        working-directory: backend
        run: npm ci

      - name: Generate Prisma client
        working-directory: backend
        run: npx prisma generate

      - name: Run migrations
        working-directory: backend
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/medrecord_test?schema=public

      - name: Run backend tests
        working-directory: backend
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/medrecord_test?schema=public
          JWT_SECRET: test-secret-key-min-32-characters

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Run frontend tests
        working-directory: frontend
        run: npm test

  # Build
  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Build frontend
        working-directory: frontend
        run: |
          npm ci
          npm run build

      - name: Build backend
        working-directory: backend
        run: |
          npm ci
          npx prisma generate
          npm run build

      - name: Upload frontend build
        uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/dist

      - name: Upload backend build
        uses: actions/upload-artifact@v4
        with:
          name: backend-build
          path: backend/dist
```

### Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [lint, test, build]

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/medrecord
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker system prune -f
```

---

## Deployment

### Ubuntu Server Setup

| Specification | Value |
|---------------|-------|
| **OS** | Ubuntu 22.04 LTS |
| **RAM** | 4 GB minimum |
| **vCPU** | 2 cores |
| **Storage** | 40 GB SSD |
| **Provider** | DigitalOcean, Linode, Hetzner |

### Initial Server Setup Script

```bash
#!/bin/bash
# setup-server.sh

set -e

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Create app user
useradd -m -s /bin/bash medrecord
usermod -aG docker medrecord

# Create app directory
mkdir -p /opt/medrecord
chown medrecord:medrecord /opt/medrecord

# Configure firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Configure swap (for 4GB RAM servers)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "Server setup complete!"
```

### SSL Certificate Setup

```bash
#!/bin/bash
# setup-ssl.sh

DOMAIN="medrecord.example.com"
EMAIL="admin@example.com"

# Create certbot directories
mkdir -p certbot/conf certbot/www

# Get initial certificate
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN

echo "SSL certificate obtained!"
```

---

## Process Management

### Using Docker (Recommended for MVP)

Docker handles process management automatically with:
- `restart: unless-stopped` policy
- Health checks for auto-restart
- Container logs for debugging

### Alternative: PM2 (Without Docker)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'medrecord-api',
      script: './dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      max_memory_restart: '1G',
    },
  ],
};
```

```bash
# PM2 commands
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Monitoring (MVP)

### Health Check Endpoints

```typescript
// Backend health check
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});
```

### Application Logs

```bash
# View Docker logs
docker compose logs -f backend
docker compose logs -f --tail=100 backend

# View specific service logs
docker logs medrecord-backend -f
```

### Log Rotation

```yaml
# docker-compose.prod.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Simple Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Run via cron every 5 minutes

HEALTH_URL="http://localhost:3000/api/health"
WEBHOOK_URL="https://hooks.slack.com/services/xxx"  # Optional

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$response" != "200" ]; then
  echo "$(date): Health check failed with status $response" >> /var/log/medrecord-monitor.log

  # Restart containers
  cd /opt/medrecord && docker compose -f docker-compose.prod.yml restart

  # Send alert (optional)
  # curl -X POST -H 'Content-type: application/json' \
  #   --data '{"text":"MedRecord health check failed!"}' $WEBHOOK_URL
fi
```

### Crontab Entry

```bash
# crontab -e
*/5 * * * * /opt/medrecord/scripts/monitor.sh
0 0 * * * /opt/medrecord/scripts/backup.sh
```

---

## Backup Strategy

### Database Backup Script

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="/opt/medrecord/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/medrecord_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
docker exec medrecord-postgres pg_dump -U medrecord medrecord > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Restore from Backup

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file.sql.gz>"
  exit 1
fi

# Stop backend
docker compose stop backend

# Restore
gunzip -c $BACKUP_FILE | docker exec -i medrecord-postgres psql -U medrecord medrecord

# Start backend
docker compose start backend

echo "Restore completed!"
```

---

## Environment Variables

### Production .env File

```bash
# .env.production

# Application
NODE_ENV=production
DOMAIN=medrecord.example.com

# Database
DB_PASSWORD=secure_random_password_here

# Authentication
JWT_SECRET=secure_random_string_minimum_32_characters

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# Logging
LOG_LEVEL=info
```

### Secrets Management

For MVP, use `.env` file with restricted permissions:

```bash
chmod 600 .env
chown medrecord:medrecord .env
```

For production scaling, consider:
- Docker Secrets
- HashiCorp Vault
- AWS Secrets Manager
- Environment-specific config

---

## AWS EC2 Deployment

This section provides complete instructions for deploying MedRecord AI on a single AWS EC2 instance.

### Recommended EC2 Instance

| Instance Type | vCPUs | RAM | Storage | Monthly Cost | Use Case |
|---------------|-------|-----|---------|--------------|----------|
| t3.small | 2 | 2 GB | EBS | ~$15 | Minimum viable |
| **t3.medium** | 2 | 4 GB | EBS | ~$30 | **Recommended** |
| t3.large | 2 | 8 GB | EBS | ~$60 | Heavy usage |

**Recommendation**: t3.medium provides sufficient resources for the MVP with room for AI processing overhead.

### Architecture on EC2

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 (t3.medium)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Docker Compose                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │
│  │  │    Nginx    │  │  Frontend   │  │     Backend     │  │ │
│  │  │   :80/:443  │──│   (React)   │  │   (Express)     │  │ │
│  │  └──────┬──────┘  └─────────────┘  └────────┬────────┘  │ │
│  │         │                                    │           │ │
│  │         │         ┌─────────────────────────┘           │ │
│  │         │         │                                      │ │
│  │         │         ▼                                      │ │
│  │         │    ┌─────────────┐                            │ │
│  │         │    │ PostgreSQL  │                            │ │
│  │         │    │   :5432     │                            │ │
│  │         │    └─────────────┘                            │ │
│  └─────────│────────────────────────────────────────────────┘ │
│            │                                                  │
│  ┌─────────▼────────┐    ┌────────────────────────────────┐  │
│  │   Elastic IP     │    │   EBS Volume (30 GB gp3)       │  │
│  │  (Static IP)     │    │   - PostgreSQL data            │  │
│  └──────────────────┘    │   - Audio uploads              │  │
│                          └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   OpenAI APIs   │
                    │ (Whisper, GPT-4)│
                    └─────────────────┘
```

### Step 1: Create EC2 Instance

#### Via AWS Console

1. **Navigate to EC2 Dashboard**
   - Go to AWS Console → EC2 → Launch Instance

2. **Choose AMI**
   - Select: **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
   - Architecture: 64-bit (x86)

3. **Choose Instance Type**
   - Select: **t3.medium**

4. **Configure Key Pair**
   - Create new key pair or select existing
   - Download `.pem` file (keep secure!)

5. **Configure Network Settings**
   - VPC: Default or your VPC
   - Subnet: Public subnet
   - Auto-assign public IP: Enable

6. **Configure Security Group**
   Create new security group with rules:

   | Type | Port | Source | Description |
   |------|------|--------|-------------|
   | SSH | 22 | Your IP | Admin access |
   | HTTP | 80 | 0.0.0.0/0 | Web traffic |
   | HTTPS | 443 | 0.0.0.0/0 | Secure web |

7. **Configure Storage**
   - Size: **30 GB**
   - Volume type: **gp3**
   - Delete on termination: No (for data safety)

8. **Launch Instance**

#### Via AWS CLI

```bash
# Create security group
aws ec2 create-security-group \
  --group-name medrecord-sg \
  --description "MedRecord AI Security Group"

# Add security group rules
aws ec2 authorize-security-group-ingress \
  --group-name medrecord-sg \
  --protocol tcp --port 22 --cidr YOUR_IP/32

aws ec2 authorize-security-group-ingress \
  --group-name medrecord-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name medrecord-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups medrecord-sg \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=medrecord-ai}]'
```

### Step 2: Allocate Elastic IP

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance (replace values)
aws ec2 associate-address \
  --instance-id i-1234567890abcdef0 \
  --allocation-id eipalloc-1234567890abcdef0
```

Or via Console: EC2 → Elastic IPs → Allocate → Associate

### Step 3: Connect to Instance

```bash
# Set permissions on key file
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### Step 4: Initial Server Setup

```bash
#!/bin/bash
# ec2-setup.sh - Run on EC2 instance

set -e

echo "=== MedRecord AI EC2 Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Install useful tools
sudo apt install -y git htop curl wget

# Create application directory
sudo mkdir -p /opt/medrecord
sudo chown ubuntu:ubuntu /opt/medrecord

# Configure swap (important for t3.medium)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Configure firewall (UFW)
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Set timezone
sudo timedatectl set-timezone UTC

echo "=== Setup Complete ==="
echo "Please log out and back in for docker group to take effect"
echo "Run: exit && ssh -i your-key.pem ubuntu@YOUR_IP"
```

Save and run:

```bash
chmod +x ec2-setup.sh
./ec2-setup.sh
exit
# Reconnect
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### Step 5: Clone and Configure Application

```bash
# Navigate to app directory
cd /opt/medrecord

# Clone repository
git clone https://github.com/your-repo/medrecord-ai.git .

# Or if private repo, use SSH key or token
git clone https://YOUR_TOKEN@github.com/your-repo/medrecord-ai.git .

# Create environment file
cat > .env << 'EOF'
# Domain
DOMAIN=medrecord.yourdomain.com

# Database
DB_PASSWORD=$(openssl rand -base64 32)

# JWT Secret
JWT_SECRET=$(openssl rand -base64 48)

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Logging
LOG_LEVEL=info
EOF

# Secure the env file
chmod 600 .env

# View generated passwords (save these!)
cat .env
```

### Step 6: Configure DNS

Point your domain to the Elastic IP:

| Record Type | Name | Value |
|-------------|------|-------|
| A | medrecord.yourdomain.com | YOUR_ELASTIC_IP |
| A | www.medrecord.yourdomain.com | YOUR_ELASTIC_IP |

Wait for DNS propagation (can take up to 48 hours, usually minutes).

```bash
# Verify DNS
dig medrecord.yourdomain.com
```

### Step 7: Setup SSL Certificate

```bash
cd /opt/medrecord

# Create directories
mkdir -p certbot/conf certbot/www nginx/conf.d

# Update domain in nginx config
export DOMAIN="medrecord.yourdomain.com"

# Create initial nginx config (HTTP only for cert)
cat > nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

# Start nginx temporarily
docker run -d --name temp-nginx \
  -p 80:80 \
  -v $(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro \
  -v $(pwd)/certbot/www:/var/www/certbot:ro \
  nginx:alpine

# Get SSL certificate
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d ${DOMAIN}

# Stop temporary nginx
docker stop temp-nginx && docker rm temp-nginx

echo "SSL certificate obtained!"
```

### Step 8: Update Nginx for Production

```bash
export DOMAIN="medrecord.yourdomain.com"

cat > nginx/conf.d/default.conf << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # API Backend
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        client_max_body_size 30M;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
```

### Step 9: Deploy Application

```bash
cd /opt/medrecord

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Run database migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed database (optional)
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

### Step 10: Verify Deployment

```bash
# Check health endpoint
curl https://medrecord.yourdomain.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...}

# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Should show:
# medrecord-nginx      running
# medrecord-frontend   running
# medrecord-backend    running
# medrecord-postgres   running
```

### Step 11: Setup Automatic SSL Renewal

```bash
# Create renewal script
cat > /opt/medrecord/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
cd /opt/medrecord
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
EOF

chmod +x /opt/medrecord/scripts/renew-ssl.sh

# Add to crontab (runs twice daily)
(crontab -l 2>/dev/null; echo "0 0,12 * * * /opt/medrecord/scripts/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1") | crontab -
```

### Step 12: Setup Backups to S3

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region

# Create backup script
cat > /opt/medrecord/scripts/backup-s3.sh << 'EOF'
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/medrecord-backup-${TIMESTAMP}"
S3_BUCKET="s3://your-backup-bucket/medrecord"

mkdir -p $BACKUP_DIR

# Backup database
docker exec medrecord-postgres pg_dump -U medrecord medrecord > $BACKUP_DIR/database.sql

# Compress
tar -czf $BACKUP_DIR.tar.gz -C /tmp medrecord-backup-${TIMESTAMP}

# Upload to S3
aws s3 cp $BACKUP_DIR.tar.gz $S3_BUCKET/backup-${TIMESTAMP}.tar.gz

# Cleanup
rm -rf $BACKUP_DIR $BACKUP_DIR.tar.gz

# Remove old backups (keep last 7)
aws s3 ls $S3_BUCKET/ | sort | head -n -7 | awk '{print $4}' | xargs -I {} aws s3 rm $S3_BUCKET/{}

echo "Backup completed: backup-${TIMESTAMP}.tar.gz"
EOF

chmod +x /opt/medrecord/scripts/backup-s3.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/medrecord/scripts/backup-s3.sh >> /var/log/medrecord-backup.log 2>&1") | crontab -
```

### GitHub Actions: Deploy to EC2

Update the deployment workflow for EC2:

```yaml
# .github/workflows/deploy-ec2.yml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /opt/medrecord
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
            docker system prune -f
            echo "Deployment complete!"
```

**Required GitHub Secrets:**
- `EC2_HOST`: Your Elastic IP address
- `EC2_SSH_KEY`: Contents of your `.pem` private key

### AWS Cost Estimate

| Service | Specification | Monthly Cost |
|---------|---------------|--------------|
| EC2 t3.medium | On-Demand | ~$30 |
| EBS 30 GB gp3 | Storage | ~$2.40 |
| Elastic IP | Associated | Free |
| Data Transfer | 10 GB out | ~$1 |
| **AWS Total** | | **~$35/month** |
| OpenAI APIs | ~100 appointments | ~$18 |
| Domain (Route 53) | Optional | ~$0.50 |
| **Grand Total** | | **~$55/month** |

### Cost Optimization Tips

1. **Reserved Instances**: Save up to 40% with 1-year commitment
2. **Spot Instances**: Not recommended (interruptions affect availability)
3. **Use Free Tier**: t2.micro free for 12 months (limited for production)
4. **S3 Backups**: ~$0.023/GB (minimal cost)

### EC2 Monitoring

#### CloudWatch Metrics (Free Tier)

- CPU Utilization
- Network In/Out
- Disk Read/Write

#### Enable Detailed Monitoring (Optional)

```bash
aws ec2 monitor-instances --instance-ids i-1234567890abcdef0
```

#### CloudWatch Alarm for High CPU

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "MedRecord-High-CPU" \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:region:account:topic
```

### Troubleshooting EC2

#### SSH Connection Issues

```bash
# Check security group allows your IP
aws ec2 describe-security-groups --group-names medrecord-sg

# Check instance is running
aws ec2 describe-instance-status --instance-ids i-xxx
```

#### Application Not Responding

```bash
# SSH into instance
ssh -i key.pem ubuntu@IP

# Check Docker containers
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend

# Check system resources
htop
df -h
free -m
```

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker logs medrecord-postgres

# Connect to database directly
docker exec -it medrecord-postgres psql -U medrecord
```

---

## Cost Estimate

### Monthly Infrastructure Costs

| Service | Provider | Cost |
|---------|----------|------|
| VPS (4GB RAM) | DigitalOcean/Hetzner | $20-24 |
| EC2 t3.medium | AWS | ~$35 |
| Domain | Namecheap | ~$1 |
| SSL Certificate | Let's Encrypt | Free |
| **Total (VPS)** | | **~$25/month** |
| **Total (AWS)** | | **~$36/month** |

### Including AI Services

| Service | Estimated | Cost |
|---------|-----------|------|
| Infrastructure | VPS or EC2 | $25-36 |
| OpenAI APIs | ~100 appointments | $18 |
| **Total** | | **~$45-55/month** |

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Let's Encrypt / Certbot](https://certbot.eff.org/)
- [DigitalOcean Docker Tutorials](https://www.digitalocean.com/community/tutorials)
