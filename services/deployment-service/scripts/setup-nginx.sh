#!/bin/bash
# Setup Nginx on Amazon Linux 2023

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

echo "==================================="
echo "Installing and configuring Nginx"
echo "Domain: $DOMAIN"
echo "==================================="

# Install Nginx
echo "[1/6] Installing Nginx..."
sudo dnf install -y nginx

# Create web root directory
echo "[2/6] Creating web root directory..."
sudo mkdir -p /var/www/$DOMAIN/main-site
sudo chown -R $USER:$USER /var/www/$DOMAIN

# Create logs directory
echo "[3/6] Creating logs directory..."
sudo mkdir -p /home/ubuntu/logs
sudo chown -R $USER:$USER /home/ubuntu/logs

# Backup default config if exists
if [ -f /etc/nginx/nginx.conf ]; then
  echo "[4/6] Backing up default Nginx config..."
  sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
fi

# Copy and configure nginx.conf (this will be uploaded separately)
echo "[5/6] Nginx configuration will be uploaded separately..."

# Start and enable Nginx
echo "[6/6] Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

echo "==================================="
echo "Nginx setup completed!"
echo "==================================="
echo "Next steps:"
echo "1. Upload nginx.conf to /etc/nginx/sites-available/$DOMAIN"
echo "2. Create symlink: sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/"
echo "3. Test config: sudo nginx -t"
echo "4. Reload nginx: sudo systemctl reload nginx"
