#!/bin/bash
set -e

ENVIRONMENT=$1
IMAGE_TAG=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$IMAGE_TAG" ]; then
    echo "Usage: ./deploy.sh <environment> <image-tag>"
    exit 1
fi

echo "Deploying MedRecord AI to $ENVIRONMENT with tag $IMAGE_TAG"

# Navigate to deployment directory
cd /home/ubuntu/medrecord

# Backup current compose file for rollback
if [ -f "docker-compose.$ENVIRONMENT.yml" ]; then
    cp "docker-compose.$ENVIRONMENT.yml" docker-compose.backup.yml
fi

# Login to GitHub Container Registry
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

# Pull latest images
docker pull "ghcr.io/$GITHUB_REPOSITORY/ai-service:$IMAGE_TAG"
docker pull "ghcr.io/$GITHUB_REPOSITORY/backend:$IMAGE_TAG"
docker pull "ghcr.io/$GITHUB_REPOSITORY/frontend:$IMAGE_TAG"

# Tag images for docker-compose
docker tag "ghcr.io/$GITHUB_REPOSITORY/ai-service:$IMAGE_TAG" medrecord-ai-service:latest
docker tag "ghcr.io/$GITHUB_REPOSITORY/backend:$IMAGE_TAG" medrecord-backend:latest
docker tag "ghcr.io/$GITHUB_REPOSITORY/frontend:$IMAGE_TAG" medrecord-frontend:latest

# Stop current containers
docker-compose -f "docker-compose.$ENVIRONMENT.yml" down

# Start new containers
docker-compose -f "docker-compose.$ENVIRONMENT.yml" up -d

# Run migrations
docker-compose -f "docker-compose.$ENVIRONMENT.yml" exec -T backend npx prisma migrate deploy

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 15

# Check health
curl -f http://localhost:8000/health || exit 1

echo "Deployment successful"

# Clean up old images
docker image prune -f
