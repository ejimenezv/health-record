#!/bin/bash
set -e

echo "=========================================="
echo "  Health Record - Development Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}pnpm is not installed. Please install it first: npm install -g pnpm${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites met!${NC}"

# Copy environment files
echo -e "\n${YELLOW}Setting up environment files...${NC}"
cp -n .env.example .env 2>/dev/null || true
cp -n packages/backend/.env.example packages/backend/.env 2>/dev/null || true
cp -n packages/frontend/.env.example packages/frontend/.env 2>/dev/null || true
echo -e "${GREEN}Environment files created!${NC}"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Start database
echo -e "\n${YELLOW}Starting PostgreSQL database...${NC}"
docker-compose -f docker/docker-compose.yml up -d

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Generate Prisma client
echo -e "\n${YELLOW}Generating Prisma client...${NC}"
cd packages/backend
pnpm db:generate
cd ../..

echo -e "\n${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm dev' to start development servers"
echo "  2. Backend: http://localhost:3001/api/v1/health"
echo "  3. Frontend: http://localhost:5173"
echo ""
