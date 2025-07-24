#!/bin/bash

# Emergency 503 Error Fix Script
# This script quickly fixes 503 errors by starting essential services

set -e

echo "🚨 O4O Platform - Emergency 503 Fix"
echo "==================================="
echo "Starting time: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 not found. Installing...${NC}"
    sudo npm install -g pm2 serve
fi

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ $name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is NOT running${NC}"
        return 1
    fi
}

# Function to start a service
start_service() {
    local name=$1
    local path=$2
    local port=$3
    
    echo -e "${YELLOW}Starting $name on port $port...${NC}"
    
    if [ -d "$path" ]; then
        pm2 serve "$path" "$port" --name "$name" --spa
        sleep 2
    else
        echo -e "${RED}Directory $path not found!${NC}"
        return 1
    fi
}

echo "🔍 Checking current service status..."
echo "===================================="

# Check API Server
if ! check_service "API Server" "http://localhost:4000/health"; then
    echo "Attempting to start API server..."
    
    # Check if API is built
    if [ -f "/home/ubuntu/o4o-platform/apps/api-server/dist/main.js" ]; then
        cd /home/ubuntu/o4o-platform
        pm2 start ecosystem.config.js --only o4o-api-server
    else
        echo -e "${RED}API server not built! Build it first.${NC}"
    fi
fi

# Check Main Site
if ! check_service "Main Site" "http://localhost:3000"; then
    start_service "o4o-main-site" "/var/www/neture.co.kr" 3000
fi

# Check Admin Dashboard
if ! check_service "Admin Dashboard" "http://localhost:3001"; then
    start_service "o4o-admin-dashboard" "/var/www/admin.neture.co.kr" 3001
fi

# Check Nginx
echo ""
echo "🔍 Checking Nginx configuration..."
if ! sudo nginx -t; then
    echo -e "${RED}Nginx configuration error!${NC}"
    exit 1
fi

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

# Final status check
echo ""
echo "📊 Final Status Check"
echo "===================="
pm2 list

echo ""
echo "🌐 Testing public URLs..."
echo "======================="

# Test each domain
domains=("api.neture.co.kr/health" "www.neture.co.kr" "admin.neture.co.kr" "auth.neture.co.kr")

for domain in "${domains[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://$domain" || echo "000")
    
    if [[ "$response" == "200" ]] || [[ "$response" == "301" ]] || [[ "$response" == "302" ]]; then
        echo -e "${GREEN}✅ http://$domain - Response: $response${NC}"
    else
        echo -e "${RED}❌ http://$domain - Response: $response${NC}"
    fi
done

echo ""
echo "🔧 Quick Fix Commands:"
echo "===================="
echo "View logs:        pm2 logs"
echo "Restart all:      pm2 restart all"
echo "Check processes:  pm2 status"
echo "Nginx logs:       sudo tail -f /var/log/nginx/error.log"

echo ""
echo "✅ Emergency fix completed at $(date)"
echo ""
echo "If services are still showing 503:"
echo "1. Check PM2 logs: pm2 logs --lines 100"
echo "2. Check Nginx error: sudo tail -f /var/log/nginx/error.log"
echo "3. Verify port binding: sudo netstat -tlnp | grep -E '3000|3001|4000'"