# Server Prerequisites for O4O Platform Deployment

This document lists the server setup requirements that must be completed by a server administrator before deploying the O4O Platform.

## Required Directories

The following directories must be created with proper ownership before deployment:

### For Web Server (neture.co.kr, admin.neture.co.kr)

```bash
# Create web directories
sudo mkdir -p /var/www/admin.neture.co.kr
sudo mkdir -p /var/www/neture.co.kr

# Set ownership to deployment user
sudo chown -R ubuntu:ubuntu /var/www/admin.neture.co.kr
sudo chown -R ubuntu:ubuntu /var/www/neture.co.kr

# Set appropriate permissions
sudo chmod 755 /var/www/admin.neture.co.kr
sudo chmod 755 /var/www/neture.co.kr
```

### For Application Deployment

```bash
# Create application directory
sudo mkdir -p /home/ubuntu/o4o-platform
sudo chown -R ubuntu:ubuntu /home/ubuntu/o4o-platform
```

### For Logs

```bash
# Create log directories
sudo mkdir -p /home/ubuntu/o4o-platform/logs
sudo chown -R ubuntu:ubuntu /home/ubuntu/o4o-platform/logs
```

## Nginx Configuration

Ensure nginx is installed and the sites-enabled directory exists:

```bash
sudo apt update
sudo apt install nginx
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

## PM2 Setup

Install PM2 globally:

```bash
sudo npm install -g pm2
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## PostgreSQL Setup

For API server, ensure PostgreSQL is installed and configured:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql -c "CREATE DATABASE o4o_platform;"
sudo -u postgres psql -c "CREATE USER o4o_user WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;"
```

## Redis Setup

Install Redis for caching:

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

## SSL Certificates

Install certbot for SSL certificates:

```bash
sudo apt install certbot python3-certbot-nginx
```

## Node.js Version

Ensure Node.js 20.x is installed:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs
```

## GitHub Actions Runner User

Ensure the deployment user (ubuntu) has:
- SSH access without password
- Access to all required directories
- No sudo requirements for deployment operations

## Environment Variables

Create environment files in the deployment directory:

```bash
# For API server
touch /home/ubuntu/o4o-platform/.env.production

# Add required environment variables
# DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, etc.
```

## Verification

Run these commands to verify setup:

```bash
# Check directory ownership
ls -la /var/www/
ls -la /home/ubuntu/

# Check PM2
pm2 status

# Check nginx
sudo nginx -t

# Check PostgreSQL
sudo -u postgres psql -c "\l"

# Check Redis
redis-cli ping

# Check Node.js version
node --version
```

## Important Notes

1. All directories must be created BEFORE running GitHub Actions workflows
2. The deployment user (ubuntu) must own all deployment directories
3. No sudo commands should be required during deployment
4. All services (PostgreSQL, Redis, nginx) must be running before deployment