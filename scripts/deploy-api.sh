#!/bin/bash

# ⚠️  DEPRECATED: This script is no longer recommended
# Use ./scripts/deploy-api-local.sh instead for local API server deployment
# This script tries to deploy to remote server (43.202.242.215) which is not accessible

echo "⚠️  WARNING: This script is DEPRECATED"
echo "Please use: ./scripts/deploy-api-local.sh"
echo "Continuing in 5 seconds... (Ctrl+C to cancel)"
sleep 5

# O4O Platform API Server Deployment Script
# Usage: ./deploy-api.sh [--skip-build]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_SERVER="o4o-apiserver"
API_HOST="43.202.242.215"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   O4O API Server Deployment${NC}"
echo -e "${GREEN}   Target: $API_HOST${NC}"
echo -e "${GREEN}======================================${NC}"

# Test connection
echo -e "\n${GREEN}[1/5]${NC} Testing SSH connection..."
if ssh $API_SERVER "echo 'Connected successfully'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} SSH connection successful"
else
    echo -e "${RED}✗${NC} Cannot connect to API server"
    exit 1
fi

# Build if not skipped
if [[ "$1" != "--skip-build" ]]; then
    echo -e "\n${GREEN}[2/5]${NC} Building API server..."
    cd apps/api-server
    pnpm run build
    cd ../..
    echo -e "${GREEN}✓${NC} Build completed"
else
    echo -e "\n${GREEN}[2/5]${NC} Skipping build (--skip-build flag)"
fi

# Create directories
echo -e "\n${GREEN}[3/5]${NC} Creating remote directories..."
ssh $API_SERVER "mkdir -p ~/o4o-platform/apps/api-server ~/o4o-platform/packages"

# Sync files
echo -e "\n${GREEN}[4/5]${NC} Syncing files to API server..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env.local' \
    --exclude 'coverage' \
    apps/api-server/ $API_SERVER:~/o4o-platform/apps/api-server/

rsync -avz --delete \
    --exclude 'node_modules' \
    packages/ $API_SERVER:~/o4o-platform/packages/

rsync -avz \
    package.json pnpm-workspace.yaml turbo.json \
    $API_SERVER:~/o4o-platform/

echo -e "${GREEN}✓${NC} Files synced"

# Deploy on remote
echo -e "\n${GREEN}[5/5]${NC} Deploying on API server..."
ssh $API_SERVER << 'ENDSSH'
cd ~/o4o-platform
echo "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || npm install

cd apps/api-server
if [ ! -d "dist" ]; then
    echo "Building API server..."
    pnpm run build || npm run build
fi

echo "Restarting PM2 process..."
pm2 restart o4o-api 2>/dev/null || pm2 start dist/main.js --name o4o-api
pm2 save

echo "API server started successfully"
ENDSSH

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ API Server Deployment Complete!${NC}"
echo -e "${GREEN}  Server: $API_HOST${NC}"
echo -e "${GREEN}  Process: o4o-api (PM2)${NC}"
echo -e "${GREEN}======================================${NC}"
