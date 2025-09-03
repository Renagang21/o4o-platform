#!/bin/bash

# ============================================
# O4O Platform API Server Rollback Script
# ============================================
# Emergency rollback script for the API server
# Use this when a deployment causes critical issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}🔄 O4O Platform API Server Rollback${NC}"
echo "================================================"

# Navigate to project root
cd /home/ubuntu/o4o-platform || exit 1

# Check current commit
CURRENT_COMMIT=$(git rev-parse HEAD)
echo -e "${YELLOW}Current commit: $CURRENT_COMMIT${NC}"

# Show recent commits
echo -e "${GREEN}Recent commits:${NC}"
git log --oneline -10

echo ""
echo "Enter the commit hash to rollback to (or 'HEAD~1' for previous commit):"
read -r TARGET_COMMIT

if [ -z "$TARGET_COMMIT" ]; then
    TARGET_COMMIT="HEAD~1"
fi

echo -e "${YELLOW}⚠️  Warning: This will rollback to commit: $TARGET_COMMIT${NC}"
echo "Are you sure? (y/N)"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Rollback cancelled${NC}"
    exit 1
fi

echo -e "${GREEN}📥 Step 1: Rolling back to $TARGET_COMMIT${NC}"
git checkout $TARGET_COMMIT

echo -e "${GREEN}📦 Step 2: Installing dependencies${NC}"
pnpm install --frozen-lockfile --prefer-offline 

echo -e "${GREEN}🔨 Step 3: Building packages${NC}"
pnpm run build:packages

echo -e "${GREEN}🏗️  Step 4: Building API server${NC}"
cd apps/api-server
pnpm run build

echo -e "${GREEN}🔄 Step 5: Restarting PM2 process${NC}"
cd /home/ubuntu/o4o-platform
pm2 reload ecosystem.config.apiserver.cjs --update-env

echo -e "${GREEN}✅ Step 6: Health check${NC}"
sleep 5
if curl -f -s https://api.neture.co.kr/api/health > /dev/null; then
    echo -e "${GREEN}✅ API server is healthy after rollback!${NC}"
else
    echo -e "${RED}❌ Health check failed after rollback!${NC}"
    echo "Checking PM2 logs..."
    pm2 logs o4o-api-server --lines 20 --nostream
fi

echo ""
echo -e "${GREEN}🔄 Rollback completed${NC}"
echo "================================================"
echo "Rolled back to: $TARGET_COMMIT"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "1. Fix the issue in the main branch"
echo "2. Create a new deployment with the fix"
echo "3. Return to main branch: git checkout main"