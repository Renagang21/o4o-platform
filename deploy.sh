#!/bin/bash
# deploy.sh - Manual deployment script for neture.co.kr

echo "🚀 Starting deployment to neture.co.kr..."

ssh -o StrictHostKeyChecking=no ubuntu@13.125.144.8 << 'EOF'
set -e

echo "📍 Connected to server, starting deployment..."

cd /home/ubuntu/o4o-platform
echo "📂 Changed to project directory"

echo "🔄 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci

cd apps/main-site
echo "📂 Changed to main-site directory"

echo "📦 Installing main-site dependencies..."
npm ci

echo "🏗️ Building production version..."
npm run build

echo "🔄 Managing PM2 processes..."
pm2 delete o4o-main-site || true
pm2 delete web-app || true

echo "🚀 Starting new PM2 process..."
pm2 start npm --name "o4o-main-site" -- run preview -- --port 3000 --host 0.0.0.0

echo "💾 Saving PM2 configuration..."
pm2 save
pm2 startup || true

echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "🌐 Site should be available at https://neture.co.kr"
EOF

echo "🎉 Deployment script finished!"