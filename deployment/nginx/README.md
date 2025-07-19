# Nginx Configuration for O4O Platform

This directory contains nginx configuration files for the O4O Platform.

## Files

- `admin.neture.co.kr.conf` - Admin Dashboard nginx configuration
- `neture.co.kr.conf` - Main Site nginx configuration
- `setup-nginx.sh` - Setup script for admin site only
- `setup-nginx-all.sh` - Complete setup script for all sites

## Quick Setup

### 1. Run the setup script (on the server)

```bash
cd /home/ubuntu/o4o-platform/deployment/nginx
sudo ./setup-nginx-all.sh
```

### 2. Install SSL certificates

```bash
# For admin dashboard
sudo certbot --nginx -d admin.neture.co.kr

# For main site
sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr
```

### 3. Verify services are running

```bash
# Check PM2 services
pm2 status

# Expected output:
# o4o-admin-dashboard - running on port 3001
# o4o-main-site - running on port 3000
# o4o-api-server - running on port 4000
```

## Architecture

```
Internet
    ↓
Nginx (80/443)
    ├── admin.neture.co.kr → localhost:3001 (Admin Dashboard)
    ├── neture.co.kr → localhost:3000 (Main Site)
    └── /api/* → localhost:4000 (API Server)
```

## Configuration Details

### Admin Dashboard (admin.neture.co.kr)
- Proxies to PM2 service on port 3001
- SSL with automatic redirect from HTTP
- API routes proxied to port 4000
- WebSocket support for real-time features

### Main Site (neture.co.kr)
- Proxies to PM2 service on port 3000
- SSL with automatic redirect from HTTP
- Redirects www to non-www
- API routes proxied to port 4000

## Troubleshooting

### Check nginx configuration
```bash
sudo nginx -t
```

### View nginx logs
```bash
# Admin site logs
sudo tail -f /var/log/nginx/admin.neture.co.kr.error.log
sudo tail -f /var/log/nginx/admin.neture.co.kr.access.log

# Main site logs
sudo tail -f /var/log/nginx/neture.co.kr.error.log
sudo tail -f /var/log/nginx/neture.co.kr.access.log
```

### Reload nginx after changes
```bash
sudo systemctl reload nginx
```

### Check if services are listening
```bash
sudo lsof -i :3000  # Main site
sudo lsof -i :3001  # Admin dashboard
sudo lsof -i :4000  # API server
```

## Common Issues

### 502 Bad Gateway
- Check if PM2 services are running: `pm2 status`
- Start services if needed: `pm2 start ecosystem.config.js`

### SSL Certificate Issues
- Ensure DNS is properly configured
- Run certbot with correct domain names
- Check certificate expiry: `sudo certbot certificates`

### Static Files Not Loading
- Verify PM2 services are using `serve` package
- Check build output exists in dist directories
- Ensure correct ports in nginx configuration

## Manual Deployment

If automatic deployment fails, you can manually update nginx:

```bash
# 1. Copy configuration files
sudo cp admin.neture.co.kr.conf /etc/nginx/sites-available/
sudo cp neture.co.kr.conf /etc/nginx/sites-available/

# 2. Create symbolic links
sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/

# 3. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```