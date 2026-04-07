# Deployment Guide

This guide covers deploying the Health Record application to an Ubuntu server with Docker, Nginx, and SSL.

## Prerequisites

- Ubuntu 22.04 LTS server (minimum 2 vCPU, 4GB RAM)
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

# Log out and back in for docker group to take effect
exit
ssh user@your-server-ip
```

### 2. Configure Environment

```bash
cd /opt/health-record/docker
nano .env
```

Update the following values:
- `OPENAI_API_KEY`: Your actual OpenAI API key
- `VITE_API_URL`: `https://your-domain.com/api/v1`
- `VITE_WS_URL`: `wss://your-domain.com`
- `FRONTEND_URL`: `https://your-domain.com`

### 3. Update Domain

```bash
# Update nginx.conf with your domain
cd /opt/health-record
sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' docker/nginx.conf
```

### 4. Setup SSL Certificate

#### Option A: Using Certbot Standalone (Recommended for initial setup)

```bash
# Install certbot
sudo apt install certbot -y

# Stop any service on port 80
sudo systemctl stop nginx 2>/dev/null || true

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to docker directory
sudo cp -r /etc/letsencrypt docker/certbot/conf/
sudo chown -R $USER:$USER docker/certbot/conf/
```

#### Option B: Using Docker Certbot

```bash
# Create initial certificate (nginx must not be running)
docker run -it --rm \
  -v $(pwd)/docker/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/docker/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com
```

### 5. Start Application

```bash
cd /opt/health-record
docker-compose -f docker/docker-compose.prod.yml up -d
```

### 6. Run Database Migrations

```bash
docker-compose -f docker/docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 7. Verify Deployment

```bash
# Check all containers are running
docker-compose -f docker/docker-compose.prod.yml ps

# Check health endpoint
curl https://your-domain.com/api/v1/health
```

## Maintenance

### View Logs

```bash
# All services
docker-compose -f docker/docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.prod.yml logs -f backend
docker-compose -f docker/docker-compose.prod.yml logs -f frontend
docker-compose -f docker/docker-compose.prod.yml logs -f postgres
```

### Update Application

```bash
cd /opt/health-record
git pull origin main
docker-compose -f docker/docker-compose.prod.yml down
docker-compose -f docker/docker-compose.prod.yml build
docker-compose -f docker/docker-compose.prod.yml up -d

# Run any new migrations
docker-compose -f docker/docker-compose.prod.yml exec backend npx prisma migrate deploy

# Clean up old images
docker system prune -f
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker/docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker/docker-compose.prod.yml restart backend
```

### Database Backup

```bash
# Create backup
docker exec -t health-record-postgres pg_dump -U healthrecord healthrecord > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_*.sql
```

### Database Restore

```bash
# Decompress if needed
gunzip backup.sql.gz

# Restore
cat backup.sql | docker exec -i health-record-postgres psql -U healthrecord healthrecord
```

### SSL Certificate Renewal

SSL certificates from Let's Encrypt expire after 90 days. The certbot container handles automatic renewal, but you can manually renew:

```bash
# Check certificate status
docker-compose -f docker/docker-compose.prod.yml exec certbot certbot certificates

# Manual renewal
docker-compose -f docker/docker-compose.prod.yml exec certbot certbot renew

# Reload nginx after renewal
docker-compose -f docker/docker-compose.prod.yml exec nginx nginx -s reload
```

## GitHub Actions CI/CD

The repository includes a GitHub Actions workflow that automatically:
1. Runs linting and type checking
2. Runs backend and frontend tests
3. Builds Docker images
4. Deploys to the server on push to `main`

### Required GitHub Secrets

Add these secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Your server's IP address or domain |
| `SERVER_USER` | SSH username (e.g., `ubuntu`) |
| `SERVER_SSH_KEY` | Private SSH key for authentication |
| `VITE_API_URL` | Production API URL |
| `VITE_WS_URL` | Production WebSocket URL |

### Setting Up SSH Key

```bash
# On your local machine, generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server-ip

# Add private key content as SERVER_SSH_KEY secret in GitHub
cat ~/.ssh/id_ed25519
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker/docker-compose.prod.yml logs backend

# Common issues:
# - Database connection: Check DATABASE_URL in .env
# - Port conflicts: Check if ports 80/443 are in use
# - Memory issues: Check with `free -m`
```

### Database Connection Issues

```bash
# Check if postgres is running
docker-compose -f docker/docker-compose.prod.yml ps postgres

# Connect to database directly
docker exec -it health-record-postgres psql -U healthrecord healthrecord

# Check logs
docker-compose -f docker/docker-compose.prod.yml logs postgres
```

### SSL Certificate Issues

```bash
# Check certificate paths
ls -la docker/certbot/conf/live/your-domain.com/

# Verify certificate
openssl x509 -in docker/certbot/conf/live/your-domain.com/fullchain.pem -text -noout

# Check nginx config
docker exec health-record-nginx nginx -t
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a

# Remove old backups
find /opt/health-record -name "backup_*.sql*" -mtime +7 -delete
```

## Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| Network | 1 Gbps | 1 Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

## Cost Estimates

### VPS Providers

| Provider | Plan | Estimated Cost |
|----------|------|----------------|
| DigitalOcean | Basic Droplet 4GB | $24/month |
| Linode | Linode 4GB | $24/month |
| Vultr | Cloud Compute | $24/month |
| Hetzner | CPX21 | ~$10/month |
| AWS EC2 | t3.medium | ~$30/month |

### Additional Costs

| Service | Estimated Cost |
|---------|----------------|
| Domain | $10-15/year |
| SSL Certificate | Free (Let's Encrypt) |
| OpenAI API | ~$15-20/month (varies by usage) |
