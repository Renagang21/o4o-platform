#!/bin/bash
# O4O Platform Deployment Script
# admin.neture.co.kr

set -e

echo "🚀 Starting O4O Platform deployment..."

# Change to project directory
cd /home/sohae21/Coding/o4o-platform

# Pull latest changes (if using git)
# git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build all packages
echo "🔨 Building packages..."
npm run build:packages

# Build admin dashboard
echo "🏗️ Building admin dashboard..."
npm run build:admin

# Build API server
echo "🏗️ Building API server..."
npm run build:api

# Create logs directory if it doesn't exist
mkdir -p logs

# Install serve globally if not installed
if ! command -v serve &> /dev/null; then
    echo "📦 Installing serve..."
    npm install -g serve
fi

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop ecosystem.config.js || true

# Start services with PM2
echo "🚀 Starting services with PM2..."
pm2 start deployment/pm2/ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u sohae21 --hp /home/sohae21

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs"
echo "🔄 Restart with: pm2 restart all"
echo ""
echo "🌐 Admin dashboard will be available at: https://admin.neture.co.kr"
echo "🔧 Make sure to configure Nginx and SSL certificates!"