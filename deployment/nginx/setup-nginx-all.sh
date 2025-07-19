#!/bin/bash
# Nginx Setup Script for All O4O Platform Sites
# This script sets up nginx configurations for both admin and main sites

set -e

echo "🚀 O4O Platform Nginx Setup Script"
echo "=================================="

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo "📋 Setting up Nginx configurations..."

# Setup admin.neture.co.kr
echo ""
echo "1️⃣ Setting up admin.neture.co.kr..."
if [ -f "$SCRIPT_DIR/admin.neture.co.kr.conf" ]; then
    cp "$SCRIPT_DIR/admin.neture.co.kr.conf" /etc/nginx/sites-available/
    ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
    echo "✅ admin.neture.co.kr configuration installed"
else
    echo "❌ admin.neture.co.kr.conf not found in $SCRIPT_DIR"
    exit 1
fi

# Setup neture.co.kr
echo ""
echo "2️⃣ Setting up neture.co.kr..."
if [ -f "$SCRIPT_DIR/neture.co.kr.conf" ]; then
    cp "$SCRIPT_DIR/neture.co.kr.conf" /etc/nginx/sites-available/
    ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/
    echo "✅ neture.co.kr configuration installed"
else
    echo "❌ neture.co.kr.conf not found in $SCRIPT_DIR"
    exit 1
fi

# Test Nginx configuration
echo ""
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Reload Nginx
echo ""
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "✅ Nginx configuration complete!"
echo ""
echo "📝 Current sites enabled:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "🌐 Next steps:"
echo ""
echo "1. Install SSL certificates:"
echo "   sudo certbot --nginx -d admin.neture.co.kr"
echo "   sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr"
echo ""
echo "2. Ensure PM2 services are running:"
echo "   pm2 status"
echo ""
echo "3. Check service ports:"
echo "   - Admin Dashboard: localhost:3001"
echo "   - Main Site: localhost:3000"
echo "   - API Server: localhost:4000"
echo ""
echo "4. Verify DNS records point to this server:"
echo "   - admin.neture.co.kr → $(curl -s ifconfig.me)"
echo "   - neture.co.kr → $(curl -s ifconfig.me)"
echo ""
echo "🔍 To check nginx logs:"
echo "   tail -f /var/log/nginx/admin.neture.co.kr.error.log"
echo "   tail -f /var/log/nginx/neture.co.kr.error.log"