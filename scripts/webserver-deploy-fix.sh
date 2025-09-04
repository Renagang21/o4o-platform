#!/bin/bash

# Webserver deployment fix script
# This script ensures proper deployment with cache-busting

echo "🚀 Webserver Deployment Fix Script"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 completed successfully${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Step 1: Pull latest changes${NC}"
git pull
check_success "Git pull"

echo -e "${YELLOW}Step 2: Install dependencies${NC}"
pnpm install --frozen-lockfile
check_success "Dependencies installation"

echo -e "${YELLOW}Step 3: Build packages in order${NC}"
pnpm run build:packages
check_success "Packages build"

echo -e "${YELLOW}Step 4: Build admin dashboard${NC}"
cd apps/admin-dashboard
pnpm run build
check_success "Admin dashboard build"

echo -e "${YELLOW}Step 5: Add cache-control headers${NC}"
# Add cache-control meta tags to index.html
VERSION=$(date +%s)
sed -i '/<head>/a\
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\
    <meta http-equiv="Pragma" content="no-cache">\
    <meta http-equiv="Expires" content="0">\
    <meta name="build-version" content="'$VERSION'">' dist/index.html

# Create version.json
echo "{\"version\": \"$VERSION\", \"buildTime\": \"$(date)\"}" > dist/version.json

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "📝 Next steps for webserver:"
echo "1. Copy dist folder to webserver location"
echo "2. If using Nginx, add these headers to your config:"
echo "   location ~* \.(html)$ {"
echo "       add_header Cache-Control \"no-cache, no-store, must-revalidate\";"
echo "   }"
echo "3. If using Apache, the .htaccess file will handle it"
echo ""
echo -e "${YELLOW}To force users to reload:${NC}"
echo "- Tell them to press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "- The auto-refresh will kick in within 5 minutes"
echo ""
echo -e "${GREEN}Build version: $VERSION${NC}"