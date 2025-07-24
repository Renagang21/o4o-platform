#!/bin/bash

# Emergency Deployment Script for O4O Platform
# This script deploys all services to their respective domains

set -e

echo "🚀 Starting Emergency Deployment for O4O Platform"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_SERVER="api.neture.co.kr"
WEB_SERVER="neture.co.kr"
ADMIN_SERVER="admin.neture.co.kr"
SSH_USER="ubuntu"

# Build status tracking
declare -A BUILD_STATUS

echo -e "${YELLOW}📦 Building all applications...${NC}"

# 1. Build packages first
echo "Building shared packages..."
if npm run build:packages; then
    BUILD_STATUS["packages"]="✅"
else
    BUILD_STATUS["packages"]="❌"
    echo -e "${RED}Failed to build packages${NC}"
    exit 1
fi

# 2. Build API Server
echo -e "\n${YELLOW}Building API Server...${NC}"
if npm run build --workspace=@o4o/api-server; then
    BUILD_STATUS["api"]="✅"
else
    BUILD_STATUS["api"]="❌"
fi

# 3. Build Main Site
echo -e "\n${YELLOW}Building Main Site...${NC}"
if npm run build --workspace=@o4o/main-site; then
    BUILD_STATUS["main-site"]="✅"
else
    BUILD_STATUS["main-site"]="❌"
fi

# 4. Build Admin Dashboard
echo -e "\n${YELLOW}Building Admin Dashboard...${NC}"
if cd apps/admin-dashboard && npx vite build && cd ../..; then
    BUILD_STATUS["admin"]="✅"
else
    BUILD_STATUS["admin"]="❌"
fi

# 5. Build E-commerce
echo -e "\n${YELLOW}Building E-commerce...${NC}"
if [ -d "apps/ecommerce" ]; then
    if npm run build --workspace=@o4o/ecommerce 2>/dev/null; then
        BUILD_STATUS["ecommerce"]="✅"
    else
        BUILD_STATUS["ecommerce"]="❌"
    fi
else
    BUILD_STATUS["ecommerce"]="⏭️"
fi

# 6. Build Forum
echo -e "\n${YELLOW}Building Forum...${NC}"
if [ -d "apps/forum" ]; then
    if npm run build --workspace=@o4o/forum 2>/dev/null; then
        BUILD_STATUS["forum"]="✅"
    else
        BUILD_STATUS["forum"]="❌"
    fi
else
    BUILD_STATUS["forum"]="⏭️"
fi

# 7. Build Digital Signage
echo -e "\n${YELLOW}Building Digital Signage...${NC}"
if [ -d "apps/digital-signage" ]; then
    if npm run build --workspace=@o4o/digital-signage 2>/dev/null; then
        BUILD_STATUS["signage"]="✅"
    else
        BUILD_STATUS["signage"]="❌"
    fi
else
    BUILD_STATUS["signage"]="⏭️"
fi

# 8. Build Crowdfunding
echo -e "\n${YELLOW}Building Crowdfunding...${NC}"
if [ -d "apps/crowdfunding" ]; then
    if npm run build --workspace=@o4o/crowdfunding 2>/dev/null; then
        BUILD_STATUS["crowdfunding"]="✅"
    else
        BUILD_STATUS["crowdfunding"]="❌"
    fi
else
    BUILD_STATUS["crowdfunding"]="⏭️"
fi

# Print build summary
echo -e "\n${YELLOW}========== Build Summary ==========${NC}"
echo -e "Packages:       ${BUILD_STATUS[packages]}"
echo -e "API Server:     ${BUILD_STATUS[api]}"
echo -e "Main Site:      ${BUILD_STATUS[main-site]}"
echo -e "Admin:          ${BUILD_STATUS[admin]}"
echo -e "E-commerce:     ${BUILD_STATUS[ecommerce]}"
echo -e "Forum:          ${BUILD_STATUS[forum]}"
echo -e "Signage:        ${BUILD_STATUS[signage]}"
echo -e "Crowdfunding:   ${BUILD_STATUS[crowdfunding]}"
echo -e "${YELLOW}===================================${NC}"

# Create deployment package
echo -e "\n${YELLOW}📦 Creating deployment packages...${NC}"

# Create dist directories
mkdir -p dist/api-server
mkdir -p dist/main-site
mkdir -p dist/admin-dashboard

# Copy built files
if [ "${BUILD_STATUS[api]}" = "✅" ]; then
    cp -r apps/api-server/dist/* dist/api-server/ 2>/dev/null || true
    cp -r apps/api-server/package.json dist/api-server/
    cp -r apps/api-server/.env.example dist/api-server/ 2>/dev/null || true
fi

if [ "${BUILD_STATUS[main-site]}" = "✅" ]; then
    cp -r apps/main-site/dist/* dist/main-site/ 2>/dev/null || true
fi

if [ "${BUILD_STATUS[admin]}" = "✅" ]; then
    cp -r apps/admin-dashboard/dist/* dist/admin-dashboard/ 2>/dev/null || true
fi

echo -e "${GREEN}✅ Build phase completed!${NC}"

# Display deployment instructions
echo -e "\n${YELLOW}📋 Manual Deployment Instructions${NC}"
echo -e "${YELLOW}===================================${NC}"

echo -e "\n${GREEN}1. API Server (api.neture.co.kr)${NC}"
echo "   SSH to server: ssh $SSH_USER@$API_SERVER"
echo "   Commands to run:"
echo "   - cd /home/ubuntu/o4o-platform"
echo "   - git pull origin main"
echo "   - npm install --production"
echo "   - npm run build:api"
echo "   - pm2 restart o4o-api-server"

echo -e "\n${GREEN}2. Main Site (www.neture.co.kr)${NC}"
echo "   SSH to server: ssh $SSH_USER@$WEB_SERVER"
echo "   Commands to run:"
echo "   - cd /var/www/neture.co.kr"
echo "   - Copy dist/main-site/* files"
echo "   - pm2 restart o4o-main-site"

echo -e "\n${GREEN}3. Admin Dashboard (admin.neture.co.kr)${NC}"
echo "   SSH to server: ssh $SSH_USER@$ADMIN_SERVER"
echo "   Commands to run:"
echo "   - cd /var/www/admin.neture.co.kr"
echo "   - Copy dist/admin-dashboard/* files"
echo "   - pm2 restart o4o-admin-dashboard"

echo -e "\n${GREEN}4. Shop (shop.neture.co.kr)${NC}"
echo "   - Deploy e-commerce module"
echo "   - Configure nginx proxy to port 3002"

echo -e "\n${GREEN}5. Forum (forum.neture.co.kr)${NC}"
echo "   - Deploy forum module"
echo "   - Configure nginx proxy to port 3003"

echo -e "\n${GREEN}6. Signage (signage.neture.co.kr)${NC}"
echo "   - Deploy digital signage module"
echo "   - Configure nginx proxy to port 3004"

echo -e "\n${GREEN}7. Funding (funding.neture.co.kr)${NC}"
echo "   - Deploy crowdfunding module"
echo "   - Configure nginx proxy to port 3005"

echo -e "\n${GREEN}8. Auth (auth.neture.co.kr)${NC}"
echo "   - Use API server auth endpoints"
echo "   - Configure nginx proxy to api.neture.co.kr/auth"

echo -e "\n${YELLOW}🔧 Server Configuration Requirements${NC}"
echo "- Node.js 20.x"
echo "- PM2 installed globally"
echo "- Nginx with SSL certificates"
echo "- PostgreSQL database"
echo "- Redis server"

echo -e "\n${YELLOW}🚀 Quick Deploy Commands${NC}"
echo "For API server:"
echo "  scp -r dist/api-server/* $SSH_USER@$API_SERVER:/home/ubuntu/o4o-platform/apps/api-server/"
echo ""
echo "For Main site:"
echo "  scp -r dist/main-site/* $SSH_USER@$WEB_SERVER:/var/www/neture.co.kr/"
echo ""
echo "For Admin dashboard:"
echo "  scp -r dist/admin-dashboard/* $SSH_USER@$WEB_SERVER:/var/www/admin.neture.co.kr/"

echo -e "\n${GREEN}✅ Deployment preparation complete!${NC}"