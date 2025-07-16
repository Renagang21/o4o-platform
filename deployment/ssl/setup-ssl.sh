#!/bin/bash
# SSL Certificate Setup Script using Let's Encrypt
# For admin.neture.co.kr

set -e

echo "🔐 Setting up SSL certificate for admin.neture.co.kr..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Obtain SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot --nginx \
    -d admin.neture.co.kr \
    --non-interactive \
    --agree-tos \
    --email admin@neture.co.kr \
    --redirect

# Setup auto-renewal
echo "🔄 Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

echo "✅ SSL setup complete!"
echo ""
echo "📊 Certificate status:"
certbot certificates
echo ""
echo "🔐 Your site is now available at: https://admin.neture.co.kr"
echo "🔄 Certificates will auto-renew before expiration"