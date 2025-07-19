# O4O Platform Deployment Guide
## admin.neture.co.kr

This guide covers the deployment process for the O4O Platform admin dashboard to admin.neture.co.kr.

## Prerequisites

- Ubuntu/Debian server
- Node.js 20.x installed
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed
- PostgreSQL installed (optional for development)
- Domain DNS configured to point to your server IP

## Deployment Steps

### 1. Initial Setup

```bash
# Clone or update the repository
cd /home/sohae21/Coding/o4o-platform

# Install dependencies
npm install
```

### 2. Configure Environment Variables

1. Edit production environment files:
   - `/apps/api-server/.env.production` - Update database credentials, JWT secrets, etc.
   - `/apps/admin-dashboard/.env.production` - Already configured

2. Copy production env files:
```bash
cp apps/api-server/.env.production apps/api-server/.env
cp apps/admin-dashboard/.env.production apps/admin-dashboard/.env
```

### 3. Build the Application

```bash
# Run the deployment script
./deployment/scripts/deploy.sh
```

This script will:
- Install dependencies
- Build all packages
- Build admin dashboard
- Build API server
- Start services with PM2

### 4. Configure Nginx

```bash
# Run as root or with sudo
sudo ./deployment/nginx/setup-nginx.sh
```

### 5. Setup SSL Certificate

```bash
# Run as root or with sudo
sudo ./deployment/ssl/setup-ssl.sh
```

## Service Management

### PM2 Commands

```bash
# View service status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Monitor services
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/admin.neture.co.kr.access.log
sudo tail -f /var/log/nginx/admin.neture.co.kr.error.log
```

## Troubleshooting

### Port Issues
- Ensure ports 3001 (frontend) and 4000 (API) are not in use
- Check with: `sudo lsof -i :3001` and `sudo lsof -i :4000`

### Database Connection
- If running without database, the API will use mock data in development mode
- For production, ensure PostgreSQL is running and credentials are correct

### SSL Issues
- Ensure domain DNS is properly configured before running SSL setup
- Check certificate status: `sudo certbot certificates`

## Directory Structure

```
deployment/
├── nginx/
│   ├── admin.neture.co.kr.conf  # Nginx configuration
│   └── setup-nginx.sh           # Nginx setup script
├── pm2/
│   └── ecosystem.config.js      # PM2 configuration
├── scripts/
│   └── deploy.sh               # Main deployment script
├── ssl/
│   └── setup-ssl.sh           # SSL setup script
└── README.md                  # This file
```

## Security Notes

1. **Never commit** `.env` files with real credentials
2. Use strong passwords for database and JWT secrets
3. Regularly update SSL certificates (auto-renewal is configured)
4. Monitor logs for suspicious activity
5. Keep system packages updated

## Backup

Regular backups should include:
- Database dumps (if using PostgreSQL)
- Uploaded media files
- Environment configuration files
- Nginx configuration

## Support

For issues or questions:
- Check PM2 logs: `pm2 logs`
- Check Nginx error logs
- Verify environment variables are set correctly
- Ensure all ports are accessible