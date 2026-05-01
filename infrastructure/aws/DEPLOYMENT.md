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

## Notes

- Single-instance deployment (not HA) suitable for demo/small-scale production.
- For production scale, consider ECS Fargate, RDS, ElastiCache.
- Estimated monthly cost: ~$35-40. Stop the instance when idle to save costs.
- All data persists in Docker volumes; back up regularly.
- Real-time streaming: Nginx is configured with WebSocket support and 7-day timeouts so React <-> Node.js <-> Python sessions remain stable. Proxy buffering is disabled on `/ws*` so ~20ms Opus audio frames flow without batching.
