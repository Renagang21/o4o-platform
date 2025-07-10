#!/bin/bash

# 🚀 Quick Deploy Script for TheDANG Homepage
# Fast deployment of built files to neture.co.kr

set -e

echo "⚡ Quick deployment to neture.co.kr..."

# Configuration
SERVER_IP="13.125.144.8"
SERVER_USER="ubuntu"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the main-site directory"
    exit 1
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "🔨 Building project first..."
    npm run build
fi

echo "📤 Uploading files to server..."

# Upload dist files directly to server web root
rsync -avz --delete dist/ ubuntu@$SERVER_IP:/tmp/new-dist/

# Execute deployment commands on server
ssh ubuntu@$SERVER_IP << 'EOF'
echo "🔄 Deploying files on server..."

# Backup current files
sudo cp -r /var/www/html /var/www/html.backup.$(date +%Y%m%d_%H%M%S) || true

# Replace with new files
sudo rm -rf /var/www/html/*
sudo mv /tmp/new-dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Restart services
sudo systemctl restart nginx
pm2 restart web-app || pm2 serve /var/www/html 3000 --name "web-app" --spa

echo "✅ Quick deployment completed!"
echo "🌐 Check: https://neture.co.kr"
EOF

echo "🎉 Quick deployment finished!"
echo "🌐 Visit: https://neture.co.kr"