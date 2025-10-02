#!/bin/bash

# O4O Platform Web Server Deployment Script
# Usage: ./deploy-web.sh [--skip-build]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
WEB_SERVER="o4o-web"
WEB_HOST="13.125.144.8"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   O4O Web Server Deployment${NC}"
echo -e "${GREEN}   Target: $WEB_HOST${NC}"
echo -e "${GREEN}======================================${NC}"

# Test connection
echo -e "\n${GREEN}[1/5]${NC} Testing SSH connection..."
if ssh $WEB_SERVER "echo 'Connected successfully'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} SSH connection successful"
else
    echo -e "${RED}✗${NC} Cannot connect to Web server"
    exit 1
fi

# Build if not skipped
if [[ "$1" != "--skip-build" ]]; then
    echo -e "\n${GREEN}[2/5]${NC} Building web applications..."
    
    echo "  Building admin dashboard..."
    cd apps/admin-dashboard
    pnpm run build
    cd ../..
    
    echo "  Building main site..."
    cd apps/main-site
    pnpm run build
    cd ../..
    
    echo -e "${GREEN}✓${NC} Build completed"
else
    echo -e "\n${GREEN}[2/5]${NC} Skipping build (--skip-build flag)"
fi

# Create directories
echo -e "\n${GREEN}[3/5]${NC} Creating remote directories..."
ssh $WEB_SERVER "mkdir -p ~/o4o-platform/apps/admin-dashboard/dist ~/o4o-platform/apps/main-site/dist"

# Sync files
echo -e "\n${GREEN}[4/5]${NC} Syncing files to Web server..."

if [ -d "apps/admin-dashboard/dist" ]; then
    echo "  Syncing admin dashboard..."
    rsync -avz --delete \
        apps/admin-dashboard/dist/ \
        $WEB_SERVER:~/o4o-platform/apps/admin-dashboard/dist/
else
    echo -e "${YELLOW}⚠${NC} Admin dashboard build not found"
fi

if [ -d "apps/main-site/dist" ]; then
    echo "  Syncing main site..."
    rsync -avz --delete \
        apps/main-site/dist/ \
        $WEB_SERVER:~/o4o-platform/apps/main-site/dist/
else
    echo -e "${YELLOW}⚠${NC} Main site build not found"
fi

echo -e "${GREEN}✓${NC} Files synced"

# Deploy on remote
echo -e "\n${GREEN}[5/5]${NC} Configuring Web server..."
ssh $WEB_SERVER << 'ENDSSH'
# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

# Clear cache if Redis is available
if command -v redis-cli &> /dev/null; then
    echo "Clearing cache..."
    redis-cli FLUSHALL 2>/dev/null || true
fi

echo "Web server configured successfully"
ENDSSH

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Web Server Deployment Complete!${NC}"
echo -e "${GREEN}  Server: $WEB_HOST${NC}"
echo -e "${GREEN}  Services: nginx${NC}"
echo -e "${GREEN}======================================${NC}"
