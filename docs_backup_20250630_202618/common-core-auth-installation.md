# Common-Core Auth System Installation Guide

## Prerequisites
- SSH access to server at 13.125.144.8
- Server user: `ubuntu`
- Node.js 20.x installed
- PostgreSQL installed

## Installation Steps

### 1. SSH into the server
```bash
ssh ubuntu@13.125.144.8
```

### 2. Check existing installations
```bash
# Check PostgreSQL
psql --version
sudo systemctl status postgresql

# Check if common-core already exists
ls -la /home/ubuntu/common-core

# Check Node.js version
node --version
```

### 3. Clone or update the repository
```bash
# If repository doesn't exist
cd /home/ubuntu
git clone https://github.com/Renagang21/common-core.git

# If repository exists
cd /home/ubuntu/common-core
git pull origin main
```

### 4. Navigate to auth backend
```bash
cd /home/ubuntu/common-core/auth/backend
```

### 5. Install dependencies
```bash
npm install
```

### 6. Create .env file
```bash
nano .env
```

Add the following content (update with actual values):
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=auth_user
DB_PASSWORD=auth_password_change_me
DB_NAME=common_core_auth

# JWT Configuration
JWT_SECRET=your_jwt_secret_change_me
JWT_EXPIRES_IN=7d

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://13.125.144.8:5000/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://13.125.144.8:5000/auth/github/callback

# Session Configuration
SESSION_SECRET=your_session_secret_change_me

# CORS Configuration
CORS_ORIGIN=http://neture.co.kr:3000,http://13.125.144.8:3000
```

### 7. Set up PostgreSQL database
```bash
# Create database user and database
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER auth_user WITH PASSWORD 'auth_password_change_me';
CREATE DATABASE common_core_auth OWNER auth_user;
GRANT ALL PRIVILEGES ON DATABASE common_core_auth TO auth_user;
\q
```

### 8. Build the project
```bash
# Check if there's a build script
npm run build

# Or compile TypeScript directly
npx tsc
```

### 9. Start with PM2
```bash
# Install PM2 if not installed
npm install -g pm2

# Start the service
pm2 start dist/index.js --name "common-core-auth"
# Or if no dist folder
pm2 start index.js --name "common-core-auth"

# Save PM2 configuration
pm2 save
pm2 startup
```

### 10. Verify installation
```bash
# Check PM2 status
pm2 status

# Check if service is running on port 5000
curl -I http://localhost:5000

# View logs
pm2 logs common-core-auth
```

## Automated Installation

You can use the provided scripts:

```bash
# Make scripts executable
chmod +x /home/ubuntu/o4o-platform/scripts/install-common-core-auth.sh
chmod +x /home/ubuntu/o4o-platform/scripts/verify-common-core-auth.sh

# Run installation
/home/ubuntu/o4o-platform/scripts/install-common-core-auth.sh

# Verify installation
/home/ubuntu/o4o-platform/scripts/verify-common-core-auth.sh
```

## Post-Installation Tasks

1. **Update OAuth Credentials**: Edit the `.env` file with actual OAuth client IDs and secrets
2. **Change Default Passwords**: Update database password and JWT secret
3. **Configure Firewall**: Ensure port 5000 is accessible if needed
   ```bash
   sudo ufw allow 5000/tcp
   ```
4. **Set up SSL/TLS**: For production, configure HTTPS
5. **Configure Nginx** (optional): Set up reverse proxy for the auth service

## Troubleshooting

### Service not starting
```bash
# Check logs
pm2 logs common-core-auth --lines 100

# Check for port conflicts
sudo lsof -i :5000
```

### Database connection issues
```bash
# Test database connection
psql -h localhost -U auth_user -d common_core_auth

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Module not found errors
```bash
# Ensure all dependencies are installed
rm -rf node_modules package-lock.json
npm install

# Check Node.js version compatibility
node --version  # Should be 20.x
```

## Integration with O4O Platform

After installation, update the O4O platform configuration to use the Common-Core Auth service:

1. Update API server configuration to validate tokens with auth service
2. Configure frontend to redirect to auth service for OAuth flows
3. Set up proper CORS headers for cross-origin requests