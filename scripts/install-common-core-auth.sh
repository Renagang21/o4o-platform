#!/bin/bash

# Common-Core Auth System Installation Script
# This script installs the Common-Core Auth system on the server

set -e  # Exit on error

echo "========================================="
echo "Common-Core Auth System Installation"
echo "========================================="

# Step 1: Check if PostgreSQL is installed
echo "Step 1: Checking PostgreSQL installation..."
if command -v psql &> /dev/null; then
    echo "PostgreSQL is installed. Version:"
    psql --version
else
    echo "PostgreSQL is not installed. Installing..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Step 2: Check if common-core repository already exists
echo -e "\nStep 2: Checking for existing common-core repository..."
if [ -d "/home/ubuntu/common-core" ]; then
    echo "common-core repository already exists at /home/ubuntu/common-core"
    cd /home/ubuntu/common-core
    git pull origin main
else
    echo "Cloning common-core repository..."
    cd /home/ubuntu
    git clone https://github.com/Renagang21/common-core.git
fi

# Step 3: Navigate to auth backend directory
echo -e "\nStep 3: Navigating to auth backend directory..."
cd /home/ubuntu/common-core/auth/backend

# Step 4: Install npm dependencies
echo -e "\nStep 4: Installing npm dependencies..."
npm install

# Step 5: Create .env file
echo -e "\nStep 5: Creating .env file..."
cat > .env << 'EOF'
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

# OAuth Configuration (replace with actual values)
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://13.125.144.8:5000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://13.125.144.8:5000/auth/github/callback

# Session Configuration
SESSION_SECRET=your_session_secret_change_me

# CORS Configuration
CORS_ORIGIN=http://neture.co.kr:3000,http://13.125.144.8:3000

# Redis Configuration (if needed)
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

echo "Created .env file. Please update with actual OAuth credentials!"

# Step 6: Set up PostgreSQL database
echo -e "\nStep 6: Setting up PostgreSQL database..."
sudo -u postgres psql << 'EOF'
-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'auth_user') THEN
      CREATE USER auth_user WITH PASSWORD 'auth_password_change_me';
   END IF;
END
$do$;

-- Create database if not exists
SELECT 'CREATE DATABASE common_core_auth OWNER auth_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'common_core_auth')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE common_core_auth TO auth_user;
EOF

# Step 7: Build TypeScript project
echo -e "\nStep 7: Building TypeScript project..."
npm run build || echo "Build script not found, checking for TypeScript..."

# If no build script, compile TypeScript directly
if [ ! -d "dist" ]; then
    echo "Compiling TypeScript..."
    npx tsc || echo "TypeScript compilation might have issues"
fi

# Step 8: Check if PM2 is installed
echo -e "\nStep 8: Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Step 9: Start service with PM2
echo -e "\nStep 9: Starting auth service with PM2..."
pm2 delete common-core-auth || true
pm2 start dist/index.js --name "common-core-auth" || pm2 start index.js --name "common-core-auth"
pm2 save
pm2 startup || true

# Step 10: Verify service is running
echo -e "\nStep 10: Verifying service status..."
sleep 3
pm2 status common-core-auth

# Check if service is responding
echo -e "\nChecking if service is responding on port 5000..."
curl -I http://localhost:5000 || echo "Service might need a moment to start..."

echo -e "\n========================================="
echo "Installation completed!"
echo "========================================="
echo "Please remember to:"
echo "1. Update the .env file with actual OAuth credentials"
echo "2. Change default passwords in .env and PostgreSQL"
echo "3. Configure firewall to allow port 5000 if needed"
echo "4. Set up SSL/TLS for production use"
echo -e "\nLogs can be viewed with: pm2 logs common-core-auth"