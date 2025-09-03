#!/bin/bash

# ============================================
# O4O Platform API Server Deployment Script
# ============================================
# This script handles the complete deployment process for the API server
# Designed to be run on the production API server (api.neture.co.kr)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 O4O Platform API Server Deployment${NC}"
echo "================================================"

# Check if we're on the API server
if [ "$SERVER_TYPE" != "apiserver" ] && [ -z "$FORCE_DEPLOY" ]; then
    echo -e "${YELLOW}⚠️  Warning: SERVER_TYPE is not 'apiserver'${NC}"
    echo "Are you sure you want to continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Navigate to project root
cd /home/ubuntu/o4o-platform || exit 1

echo -e "${GREEN}📥 Step 1: Pulling latest code from GitHub${NC}"
git fetch origin
git pull origin main

echo -e "${GREEN}📦 Step 2: Installing dependencies${NC}"
pnpm install --frozen-lockfile --prefer-offline --no-audit

echo -e "${GREEN}🔨 Step 3: Building packages${NC}"
pnpm run build:packages

echo -e "${GREEN}🏗️  Step 4: Building API server${NC}"
cd apps/api-server
pnpm run build

echo -e "${GREEN}🔄 Step 5: Running database migrations${NC}"
pnpm run migration:run || {
    echo -e "${YELLOW}⚠️  Migration failed or no new migrations${NC}"
}

echo -e "${GREEN}🔄 Step 6: Restarting PM2 process${NC}"
cd /home/ubuntu/o4o-platform
pm2 reload ecosystem.config.apiserver.cjs --update-env

echo -e "${GREEN}✅ Step 7: Health check${NC}"
sleep 5
if curl -f -s https://api.neture.co.kr/api/health > /dev/null; then
    echo -e "${GREEN}✅ API server is healthy!${NC}"
    curl -s https://api.neture.co.kr/api/health | jq '.' || curl -s https://api.neture.co.kr/api/health
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo "Checking PM2 logs..."
    pm2 logs o4o-api-server --lines 20 --nostream
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "================================================"
echo "API Server: https://api.neture.co.kr"
echo "PM2 Status: pm2 show o4o-api-server"
echo "Logs: pm2 logs o4o-api-server"