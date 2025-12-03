#!/bin/bash
# Setup SSL certificate using Let's Encrypt

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <domain> <email>"
  exit 1
fi

echo "==================================="
echo "Setting up SSL certificate"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "==================================="

# Install certbot
echo "[1/4] Installing certbot..."
sudo dnf install -y certbot python3-certbot-nginx

# Obtain SSL certificate
echo "[2/4] Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx \
  -d $DOMAIN \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  --redirect

# Test automatic renewal
echo "[3/4] Testing certificate renewal..."
sudo certbot renew --dry-run

# Setup automatic renewal cron job
echo "[4/4] Setting up automatic renewal..."
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab > /dev/null

echo "==================================="
echo "SSL setup completed!"
echo "==================================="
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo "Renewal will run automatically twice daily"
