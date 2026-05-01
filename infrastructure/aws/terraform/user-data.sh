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

echo "Server setup complete!"
