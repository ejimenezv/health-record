#!/bin/bash

# Ubuntu Server Setup Script for Health Record Application
# Run this on a fresh Ubuntu 22.04 server

set -e

echo "=== Health Record Server Setup ==="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
echo "Installing Docker Compose..."
sudo apt install docker-compose-plugin -y

# Install useful tools
echo "Installing additional tools..."
sudo apt install -y git htop curl wget ufw

# Configure firewall
echo "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# Configure swap (for servers with limited RAM)
echo "Configuring swap..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /opt/health-record
sudo chown $USER:$USER /opt/health-record

# Clone repository (replace with your actual repository URL)
echo "Cloning repository..."
cd /opt/health-record
if [ ! -d ".git" ]; then
    git clone https://github.com/YOUR_USERNAME/health-record.git .
fi

# Create environment file
echo "Creating environment file..."
cat > docker/.env << EOF
# Database Configuration
DB_USER=healthrecord
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=healthrecord

# JWT Secret
JWT_SECRET=$(openssl rand -base64 64)

# OpenAI API Key (REQUIRED: Replace with your actual key)
OPENAI_API_KEY=your-openai-key-here

# Frontend URLs
VITE_API_URL=https://your-domain.com/api/v1
VITE_WS_URL=wss://your-domain.com
FRONTEND_URL=https://your-domain.com
EOF

# Secure the env file
chmod 600 docker/.env

# Create certbot directories
mkdir -p docker/certbot/conf docker/certbot/www

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit /opt/health-record/docker/.env with your values:"
echo "   - Replace OPENAI_API_KEY with your actual OpenAI API key"
echo "   - Replace your-domain.com with your actual domain"
echo ""
echo "2. Update domain in /opt/health-record/docker/nginx.conf"
echo "   sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' docker/nginx.conf"
echo ""
echo "3. Set up SSL certificate:"
echo "   a. First start nginx with HTTP only for ACME challenge"
echo "   b. Run: sudo certbot certonly --webroot -w /opt/health-record/docker/certbot/www -d YOUR_DOMAIN"
echo "   c. Or use standalone: sudo certbot certonly --standalone -d YOUR_DOMAIN"
echo ""
echo "4. Start the application:"
echo "   cd /opt/health-record"
echo "   docker-compose -f docker/docker-compose.prod.yml up -d"
echo ""
echo "5. Run database migrations:"
echo "   docker-compose -f docker/docker-compose.prod.yml exec backend npx prisma migrate deploy"
echo ""
echo "IMPORTANT: Log out and back in for docker group changes to take effect"
