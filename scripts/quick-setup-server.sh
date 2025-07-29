#!/bin/bash

# Quick Server Setup Script for O4O Platform
# This script sets up the server environment for all services

set -e

echo "🚀 O4O Platform - Quick Server Setup"
echo "===================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "Please run as root (use sudo)"
   exit 1
fi

# Variables
DOMAIN_LIST=(
    "api.neture.co.kr"
    "www.neture.co.kr"
    "admin.neture.co.kr"
    "auth.neture.co.kr"
    "shop.neture.co.kr"
    "forum.neture.co.kr"
    "signage.neture.co.kr"
    "funding.neture.co.kr"
)

echo "📦 Installing required packages..."
apt update
apt install -y nginx postgresql redis-server certbot python3-certbot-nginx

echo "🔧 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "📦 Installing PM2 globally..."
npm install -g pm2 serve

echo "📁 Creating directory structure..."
# Create directories
mkdir -p /var/www/neture.co.kr
mkdir -p /var/www/admin.neture.co.kr
mkdir -p /var/www/shop.neture.co.kr
mkdir -p /var/www/forum.neture.co.kr
mkdir -p /var/www/signage.neture.co.kr
mkdir -p /var/www/funding.neture.co.kr
mkdir -p /var/www/uploads/{products,forum,media}
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/o4o-platform

# Set permissions
chown -R ubuntu:ubuntu /var/www
chown -R ubuntu:ubuntu /home/ubuntu

echo "🔐 Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE o4o_platform;
CREATE USER o4o_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
EOF

echo "🔐 Configuring Redis..."
systemctl enable redis-server
systemctl start redis-server

echo "🌐 Setting up Nginx..."
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Copy nginx configurations
echo "Nginx configurations should be copied from nginx/sites-available/ to /etc/nginx/sites-available/"

echo "🔐 Setting up SSL certificates..."
for domain in "${DOMAIN_LIST[@]}"; do
    echo "Setting up SSL for $domain..."
    certbot --nginx -d $domain --non-interactive --agree-tos --email admin@neture.co.kr || true
done

echo "🚀 Setting up PM2..."
su - ubuntu -c "pm2 startup"
systemctl enable pm2-ubuntu

echo "📝 Creating environment file template..."
cat > /home/ubuntu/o4o-platform/.env.production <<EOF
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=your_secure_password
DB_NAME=o4o_platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://neture.co.kr,https://admin.neture.co.kr,https://shop.neture.co.kr

# API
API_URL=https://api.neture.co.kr
FRONTEND_URL=https://neture.co.kr

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=O4O Platform
SMTP_FROM_EMAIL=noreply@neture.co.kr

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=

# Payment (Optional)
STRIPE_SECRET_KEY=
TOSS_SECRET_KEY=
KCP_SITE_CD=
KCP_SITE_KEY=

# Monitoring (Optional)
SENTRY_DSN=
LOG_LEVEL=info
EOF

chown ubuntu:ubuntu /home/ubuntu/o4o-platform/.env.production
chmod 600 /home/ubuntu/o4o-platform/.env.production

echo "📋 Quick Deployment Checklist:"
echo "=============================="
echo "1. Clone repository: git clone https://github.com/your-repo/o4o-platform.git"
echo "2. Copy built files to respective directories"
echo "3. Configure .env.production with actual values"
echo "4. Enable Nginx sites: ln -s /etc/nginx/sites-available/* /etc/nginx/sites-enabled/"
echo "5. Start PM2 processes: pm2 start ecosystem.config.js"
echo "6. Save PM2 config: pm2 save"
echo ""
echo "🔍 Test URLs:"
for domain in "${DOMAIN_LIST[@]}"; do
    echo "   https://$domain"
done
echo ""
echo "✅ Server setup complete!"
echo ""
echo "⚠️  IMPORTANT: Update the .env.production file with real values!"