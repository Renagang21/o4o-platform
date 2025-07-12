#!/bin/bash
# Nginx Setup Script for admin.neture.co.kr

set -e

echo "🔧 Setting up Nginx configuration for admin.neture.co.kr..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

# Copy Nginx configuration
echo "📋 Copying Nginx configuration..."
cp /home/sohae21/Coding/o4o-platform/deployment/nginx/admin.neture.co.kr.conf /etc/nginx/sites-available/

# Create symbolic link
echo "🔗 Creating symbolic link..."
ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo "✅ Nginx configuration complete!"
echo ""
echo "🌐 Next steps:"
echo "1. Make sure your domain DNS points to this server"
echo "2. Install SSL certificate with: sudo certbot --nginx -d admin.neture.co.kr"
echo "3. Start the application with: pm2 start deployment/pm2/ecosystem.config.js"