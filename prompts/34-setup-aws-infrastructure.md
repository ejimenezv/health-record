# Prompt 34: Setup AWS Infrastructure (Simple EC2 Deployment)

## Objective
Create a simple, cost-effective AWS infrastructure using a single EC2 instance to host the entire MedRecord AI system. This approach minimizes costs while demonstrating a working deployment for the BSG course.

## Context
**Cost-Effective Strategy:**
- Single EC2 instance (t3.medium or t3.large)
- Docker Compose to run all services
- Local PostgreSQL in Docker
- ChromaDB in Docker
- Nginx as reverse proxy
- Let's Encrypt for SSL
- Estimated cost: ~$25-40/month

## Tasks

### 1. Create Infrastructure Documentation

Create `infrastructure/aws/README.md`:

```markdown
# AWS Infrastructure - Single EC2 Instance

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AWS EC2 Instance (t3.medium)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Nginx (Port 80, 443)                     │  │
│  │              - SSL Termination                        │  │
│  │              - Reverse Proxy                          │  │
│  │              - Static file serving                    │  │
│  └──────────┬──────────────────────────────┬─────────────┘  │
│             │                               │                │
│             ▼                               ▼                │
│  ┌──────────────────┐          ┌──────────────────────┐     │
│  │  Frontend        │          │  Backend             │     │
│  │  (React)         │          │  (Node.js)           │     │
│  │  Port 3000       │          │  Port 3001           │     │
│  └──────────────────┘          └──────────┬───────────┘     │
│                                            │                 │
│                                            ▼                 │
│                               ┌──────────────────────┐       │
│                               │  AI Service          │       │
│                               │  (Python/FastAPI)    │       │
│                               │  Port 8000           │       │
│                               └──────────┬───────────┘       │
│                                          │                   │
│             ┌────────────────────────────┼──────────┐        │
│             │                            │          │        │
│             ▼                            ▼          ▼        │
│  ┌──────────────────┐       ┌──────────────┐  ┌─────────┐  │
│  │  PostgreSQL      │       │  ChromaDB    │  │  Redis  │  │
│  │  Port 5432       │       │  Port 8001   │  │  Port   │  │
│  │  (Docker)        │       │  (Docker)    │  │  6379   │  │
│  └──────────────────┘       └──────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Resources

### EC2 Instance
- **Type**: t3.medium (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 30GB gp3 EBS volume
- **Security Group**: Allow ports 80, 443, 22

### Estimated Costs (Monthly)
- EC2 t3.medium: ~$30
- EBS 30GB: ~$3
- Data transfer: ~$2-5
- **Total**: ~$35-40/month

## Requirements

### Software
- Docker Engine 24+
- Docker Compose 2.20+
- Nginx
- Certbot (Let's Encrypt)
- Git

### Domain
- Domain name pointing to EC2 public IP
- DNS A record configured
```

### 2. Create Terraform Configuration

Create `infrastructure/aws/terraform/main.tf`:

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC - Use default VPC for simplicity
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group
resource "aws_security_group" "medrecord" {
  name        = "medrecord-${var.environment}"
  description = "Security group for MedRecord AI"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # SSH (restrict to your IP in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_ips
    description = "SSH"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
    Project     = "MedRecord-AI"
  }
}

# EC2 Key Pair
resource "aws_key_pair" "medrecord" {
  key_name   = "medrecord-${var.environment}"
  public_key = file(var.ssh_public_key_path)

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
  }
}

# EC2 Instance
resource "aws_instance" "medrecord" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  key_name               = aws_key_pair.medrecord.key_name
  vpc_security_group_ids = [aws_security_group.medrecord.id]
  subnet_id              = data.aws_subnets.default.ids[0]

  root_block_device {
    volume_size           = var.volume_size
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "medrecord-${var.environment}-root"
    }
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  })

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
    Project     = "MedRecord-AI"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Elastic IP
resource "aws_eip" "medrecord" {
  instance = aws_instance.medrecord.id
  domain   = "vpc"

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
  }
}
```

Create `infrastructure/aws/terraform/variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (staging/production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production"
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 30
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "ssh_allowed_ips" {
  description = "IPs allowed to SSH (use your IP)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # CHANGE THIS in production!
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}
```

Create `infrastructure/aws/terraform/outputs.tf`:

```hcl
output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.medrecord.id
}

output "instance_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_eip.medrecord.public_ip
}

output "instance_public_dns" {
  description = "EC2 instance public DNS"
  value       = aws_instance.medrecord.public_dns
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh ubuntu@${aws_eip.medrecord.public_ip}"
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.medrecord.id
}
```

Create `infrastructure/aws/terraform/user-data.sh`:

```bash
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Install utilities
apt-get install -y git htop curl wget unzip

# Create deployment directory
mkdir -p /home/ubuntu/medrecord
chown ubuntu:ubuntu /home/ubuntu/medrecord

# Enable Docker service
systemctl enable docker
systemctl start docker

echo "✅ Server setup complete!"
```

### 3. Create Production Docker Compose

Create `infrastructure/aws/docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: medrecord-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-medrecord}
      POSTGRES_USER: ${POSTGRES_USER:-medrecord}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - medrecord-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-medrecord}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: medrecord-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - medrecord-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ChromaDB Vector Store
  chromadb:
    image: chromadb/chroma:latest
    container_name: medrecord-chromadb
    restart: unless-stopped
    volumes:
      - chroma-data:/chroma/chroma
    environment:
      CHROMA_SERVER_AUTH_CREDENTIALS: ${CHROMA_AUTH_TOKEN}
      CHROMA_SERVER_AUTH_PROVIDER: token
    networks:
      - medrecord-network
    ports:
      - "8001:8000"

  # AI Service
  ai-service:
    image: medrecord-ai-service:latest
    container_name: medrecord-ai
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      # Database
      DATABASE_URL: postgresql://${POSTGRES_USER:-medrecord}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-medrecord}

      # OpenAI
      OPENAI_API_KEY: ${OPENAI_API_KEY}

      # ChromaDB
      CHROMA_HOST: chromadb
      CHROMA_PORT: 8000
      CHROMA_AUTH_TOKEN: ${CHROMA_AUTH_TOKEN}

      # Redis
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0

      # JWT
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}

      # App settings
      API_ENV: production
      DEBUG: "false"
      MONTHLY_BUDGET_USD: ${MONTHLY_BUDGET_USD:-50}
    volumes:
      - ai-logs:/app/logs
    networks:
      - medrecord-network
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend (Node.js) - WebSocket Gateway for Real-Time Streaming
  backend:
    image: medrecord-backend:latest
    container_name: medrecord-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      ai-service:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-medrecord}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-medrecord}
      AI_SERVICE_URL: http://ai-service:8000
      AI_SERVICE_WS_URL: ws://ai-service:8000/ws
      JWT_SECRET: ${JWT_SECRET_KEY}
      NODE_ENV: production
      # Real-time streaming settings
      WEBSOCKET_PING_INTERVAL: ${WEBSOCKET_PING_INTERVAL:-30000}
      WEBSOCKET_MAX_CONNECTIONS: ${WEBSOCKET_MAX_CONNECTIONS:-100}
    networks:
      - medrecord-network
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (React)
  frontend:
    image: medrecord-frontend:latest
    container_name: medrecord-frontend
    restart: unless-stopped
    environment:
      REACT_APP_API_URL: https://${DOMAIN_NAME}/api
      NODE_ENV: production
    networks:
      - medrecord-network
    ports:
      - "3000:80"

networks:
  medrecord-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  chroma-data:
  ai-logs:
```

### 4. Create Nginx Configuration

Create `infrastructure/aws/nginx/medrecord.conf`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/m;

# Upstream backends
upstream backend {
    server localhost:3001;
}

upstream ai_service {
    server localhost:8000;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name medrecord.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name medrecord.example.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/medrecord.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medrecord.example.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # AI Service API (if direct access needed)
    location /ai/ {
        limit_req zone=api_limit burst=10 nodelay;

        proxy_pass http://ai_service/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Longer timeout for AI operations
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # WebSocket support for real-time streaming (React ↔ Node.js)
    location /ws {
        proxy_pass http://backend/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts for real-time streaming sessions
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Buffer settings for binary audio streaming
        proxy_buffering off;
        proxy_buffer_size 4k;
    }

    # WebSocket for session-specific real-time streaming
    location ~ ^/ws/session/(.+)$ {
        proxy_pass http://backend/ws/session/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Real-time streaming session timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering for real-time audio
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://backend/health;
    }

    # File uploads (higher limits)
    location /api/consultations {
        limit_req zone=upload_limit burst=5 nodelay;

        client_max_body_size 100M;
        proxy_pass http://backend/consultations;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Upload timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### 5. Create Deployment Guide

Create `infrastructure/aws/DEPLOYMENT.md`:

```markdown
# AWS EC2 Deployment Guide

## Prerequisites

1. AWS account
2. Domain name
3. AWS CLI installed and configured
4. Terraform installed
5. SSH key pair generated

## Step 1: Generate SSH Key (if needed)

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/medrecord-aws
```

## Step 2: Deploy Infrastructure with Terraform

```bash
cd infrastructure/aws/terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region           = "us-east-1"
environment          = "production"
instance_type        = "t3.medium"
volume_size          = 30
ssh_public_key_path  = "~/.ssh/medrecord-aws.pub"
ssh_allowed_ips      = ["YOUR_IP/32"]  # Replace with your IP
domain_name          = "medrecord.example.com"
EOF

# Preview changes
terraform plan

# Deploy
terraform apply

# Save the output
terraform output > ../outputs.txt
```

## Step 3: Configure DNS

Point your domain A record to the Elastic IP:

```bash
# Get the Elastic IP
terraform output instance_public_ip

# Add A record in your DNS provider:
# medrecord.example.com -> <ELASTIC_IP>
```

## Step 4: Initial Server Setup

```bash
# SSH into the server
ssh -i ~/.ssh/medrecord-aws ubuntu@<ELASTIC_IP>

# Clone repository
cd /home/ubuntu/medrecord
git clone https://github.com/your-org/medrecord-ai.git .

# Copy docker-compose file
cp infrastructure/aws/docker-compose.production.yml docker-compose.yml

# Create .env file
cat > .env <<EOF
POSTGRES_DB=medrecord
POSTGRES_USER=medrecord
POSTGRES_PASSWORD=<STRONG_PASSWORD>
REDIS_PASSWORD=<STRONG_PASSWORD>
CHROMA_AUTH_TOKEN=<STRONG_TOKEN>
OPENAI_API_KEY=<YOUR_OPENAI_KEY>
JWT_SECRET_KEY=<STRONG_SECRET>
MONTHLY_BUDGET_USD=50
DOMAIN_NAME=medrecord.example.com
EOF

chmod 600 .env
```

## Step 5: Setup SSL with Let's Encrypt

```bash
# Copy Nginx configuration
sudo cp infrastructure/aws/nginx/medrecord.conf /etc/nginx/sites-available/medrecord
sudo ln -s /etc/nginx/sites-available/medrecord /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d medrecord.example.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 6: Start Services

```bash
cd /home/ubuntu/medrecord

# Pull images (if using pre-built)
docker compose pull

# Or build locally
docker compose build

# Start services
docker compose up -d

# Check logs
docker compose logs -f

# Verify health
curl http://localhost:8000/health
```

## Step 7: Setup Automated Deployment

Add deployment user to GitHub secrets:

```bash
# Get instance IP
echo "PRODUCTION_EC2_HOST=$(terraform output -raw instance_public_ip)"

# Generate deployment key
ssh-keygen -t ed25519 -f ~/.ssh/medrecord-deploy

# Add public key to server
ssh-copy-id -i ~/.ssh/medrecord-deploy ubuntu@<ELASTIC_IP>

# Add private key to GitHub Secrets as EC2_SSH_PRIVATE_KEY
cat ~/.ssh/medrecord-deploy
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f ai-service
```

### Restart Services

```bash
docker compose restart ai-service
```

### Update Services

```bash
# Pull latest images
docker compose pull

# Restart
docker compose up -d
```

### Backup Database

```bash
docker compose exec postgres pg_dump -U medrecord medrecord > backup.sql
```

## Cost Optimization

- Stop instance when not needed: `aws ec2 stop-instances --instance-ids <ID>`
- Use t3.medium with burstable CPU
- Clean old Docker images: `docker system prune -a`
- Monitor costs with AWS Cost Explorer

## Troubleshooting

### Service won't start

```bash
docker compose logs <service-name>
docker compose restart <service-name>
```

### Out of memory

```bash
# Check memory
free -h

# Increase swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### SSL certificate issues

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```
```

## Expected Deliverables

1. `infrastructure/aws/README.md` - Infrastructure overview
2. `infrastructure/aws/terraform/` - Terraform configuration
   - `main.tf` - Main infrastructure
   - `variables.tf` - Input variables
   - `outputs.tf` - Output values
   - `user-data.sh` - Instance initialization
3. `infrastructure/aws/docker-compose.production.yml` - Production compose
4. `infrastructure/aws/nginx/medrecord.conf` - Nginx configuration
5. `infrastructure/aws/DEPLOYMENT.md` - Step-by-step deployment guide

## Verification Steps

1. Terraform applies successfully
2. EC2 instance is created and accessible
3. All Docker services start correctly
4. Nginx serves the application
5. SSL certificate is obtained and auto-renews
6. Application is accessible at https://domain.com
7. Health checks pass
8. WebSocket connections work: `wscat -c wss://domain.com/ws/session/test`
9. Real-time streaming events flow correctly through the pipeline

## Notes

- This is a single-instance deployment - not HA
- Suitable for demo/small-scale production
- For production scale, consider: ECS Fargate, RDS, ElastiCache
- Estimated monthly cost: ~$35-40
- Can be stopped when not in use to save costs
- All data persists in Docker volumes
- Regular backups recommended for production use
- **Real-Time Streaming**: Nginx configured with WebSocket support for bidirectional streaming (React ↔ Node.js ↔ Python)
- **WebSocket Timeouts**: 7-day connection timeout to support long consultation sessions
- **Binary Audio**: Proxy buffering disabled for real-time audio streaming (~20ms Opus frames)
