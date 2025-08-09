# Environment Variables Setup Guide

## 🔐 Important Security Note
**Never commit `.env` files to Git!** Only `.env.example` files should be committed.

## 📋 Setup Instructions

### Local Development
```bash
# 1. Copy example files
cp apps/admin-dashboard/.env.example apps/admin-dashboard/.env
cp apps/main-site/.env.example apps/main-site/.env

# 2. Edit .env files with your specific values (if needed)
nano apps/admin-dashboard/.env
nano apps/main-site/.env
```

### Production Server Setup

#### Web Server (13.125.144.8)
```bash
# After git pull, create .env files
cd /home/ubuntu/o4o-platform

# Admin Dashboard
cat > apps/admin-dashboard/.env << 'EOF'
VITE_API_URL=https://api.neture.co.kr/api/v1
VITE_API_BASE_URL=https://api.neture.co.kr/api
VITE_AUTH_URL=https://api.neture.co.kr
VITE_USE_MOCK=false
EOF

# Main Site
cat > apps/main-site/.env << 'EOF'
VITE_API_URL=https://api.neture.co.kr/api/v1
VITE_API_BASE_URL=https://api.neture.co.kr/api
VITE_AUTH_URL=https://api.neture.co.kr
VITE_USE_MOCK=false
EOF

# Build with environment variables
npm run build:web
```

#### API Server (43.202.242.215)
```bash
# API Server needs different env variables
cd /home/ubuntu/o4o-platform

cat > apps/api-server/.env << 'EOF'
NODE_ENV=production
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_NAME=o4o_platform

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Add other production configs as needed
EOF
```

## 🔄 Automatic Setup Script

Create this script on each server:

```bash
#!/bin/bash
# setup-env.sh

echo "Setting up environment variables..."

# Check which server we're on
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

if [ "$PUBLIC_IP" = "13.125.144.8" ]; then
    echo "Setting up Web Server environment..."
    
    # Setup frontend .env files
    cp apps/admin-dashboard/.env.example apps/admin-dashboard/.env
    cp apps/main-site/.env.example apps/main-site/.env
    
elif [ "$PUBLIC_IP" = "43.202.242.215" ]; then
    echo "Setting up API Server environment..."
    
    # API server env setup
    if [ ! -f apps/api-server/.env ]; then
        echo "Please create apps/api-server/.env with production values"
    fi
fi

echo "Environment setup complete!"
```

## 📝 Environment Variables Reference

### Frontend Apps (admin-dashboard, main-site)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | API base URL with version | https://api.neture.co.kr/api/v1 |
| VITE_API_BASE_URL | API base URL without version | https://api.neture.co.kr/api |
| VITE_AUTH_URL | Auth service URL | https://api.neture.co.kr |
| VITE_USE_MOCK | Enable mock mode | false |

### Backend (api-server)
| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment | production |
| PORT | Server port | 4000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_USERNAME | Database user | postgres |
| DB_PASSWORD | Database password | [secure] |
| DB_NAME | Database name | o4o_platform |
| JWT_SECRET | JWT signing key | [secure] |

## ⚠️ Security Best Practices

1. **Never commit real credentials**
2. **Use strong, unique passwords**
3. **Rotate secrets regularly**
4. **Limit access to .env files** (`chmod 600 .env`)
5. **Use environment-specific values**
6. **Keep .env.example updated** with new variables

## 🚀 Quick Start

```bash
# For new developers
npm run setup:env  # Coming soon - will auto-copy .env.example files
```