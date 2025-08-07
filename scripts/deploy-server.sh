#!/bin/bash

# Server Deployment Script for O4O Platform
# This script handles the complete build and deployment process on the server

set -e  # Exit on error

echo "🚀 Starting O4O Platform Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git fetch origin main
git reset --hard origin/main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Build packages first (CRITICAL!)
echo "🏗️ Building packages..."
npm run build:packages

# 4. Build applications
echo "🏗️ Building applications..."

# API Server (if on API server)
if [ -d "apps/api-server" ]; then
    echo "Building API Server..."
    npm run build --workspace=@o4o/api-server || echo "API Server build skipped or failed"
fi

# Frontend applications (if on web server)
if [ "$1" == "web" ] || [ -z "$1" ]; then
    echo "Building Main Site..."
    npm run build --workspace=@o4o/main-site || echo "Main Site build failed"
    
    echo "Building Admin Dashboard..."
    npm run build --workspace=@o4o/admin-dashboard || echo "Admin Dashboard build failed"
    
    echo "Building E-commerce..."
    npm run build --workspace=@o4o/ecommerce || echo "E-commerce build failed"
fi

# 5. Deploy built files (for web server)
if [ "$1" == "web" ]; then
    echo "📂 Deploying to web directories..."
    
    # Main Site
    if [ -d "apps/main-site/dist" ]; then
        sudo rm -rf /var/www/neture.co.kr/*
        sudo cp -r apps/main-site/dist/* /var/www/neture.co.kr/
        sudo chown -R www-data:www-data /var/www/neture.co.kr/
        echo "✅ Main Site deployed"
    fi
    
    # Admin Dashboard
    if [ -d "apps/admin-dashboard/dist" ]; then
        sudo rm -rf /var/www/admin.neture.co.kr/*
        sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/
        sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
        echo "✅ Admin Dashboard deployed"
    fi
    
    # E-commerce (if needed)
    if [ -d "apps/ecommerce/dist" ] && [ -d "/var/www/shop.neture.co.kr" ]; then
        sudo rm -rf /var/www/shop.neture.co.kr/*
        sudo cp -r apps/ecommerce/dist/* /var/www/shop.neture.co.kr/
        sudo chown -R www-data:www-data /var/www/shop.neture.co.kr/
        echo "✅ E-commerce deployed"
    fi
fi

# 6. Restart services (for API server)
if [ "$1" == "api" ]; then
    echo "🔄 Restarting API server..."
    pm2 restart api-server || pm2 start apps/api-server/dist/server.js --name api-server
    pm2 save
    echo "✅ API server restarted"
fi

# 7. Health checks
echo "🏥 Running health checks..."

if [ "$1" == "api" ]; then
    sleep 3
    curl -f http://localhost:4000/api/health || echo "❌ API health check failed"
fi

if [ "$1" == "web" ]; then
    # Check if files exist
    [ -f "/var/www/neture.co.kr/index.html" ] && echo "✅ Main Site files deployed" || echo "❌ Main Site files missing"
    [ -f "/var/www/admin.neture.co.kr/index.html" ] && echo "✅ Admin Dashboard files deployed" || echo "❌ Admin Dashboard files missing"
fi

echo "🎉 Deployment complete!"
echo ""
echo "Usage:"
echo "  ./scripts/deploy-server.sh web   # For web server (13.125.144.8)"
echo "  ./scripts/deploy-server.sh api   # For API server (43.202.242.215)"