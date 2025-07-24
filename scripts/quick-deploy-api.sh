#!/bin/bash

# Quick API Server Deployment Script
# Deploys API server in under 30 minutes

set -e

echo "🚀 Quick API Server Deployment"
echo "=============================="
echo "Target: api.neture.co.kr"
echo "Start time: $(date)"
echo ""

# Variables
API_HOST="api.neture.co.kr"
API_USER="ubuntu"
API_PATH="/home/ubuntu/o4o-platform"
LOCAL_API_PATH="apps/api-server"

# Step 1: Local build check
echo "📦 Step 1: Checking local build..."
if [ -f "$LOCAL_API_PATH/dist/main.js" ]; then
    echo "✅ API server is built"
else
    echo "❌ API server not built. Building now..."
    cd $LOCAL_API_PATH
    npm run build
    cd ../..
fi

# Step 2: Create deployment package
echo ""
echo "📦 Step 2: Creating deployment package..."
rm -rf /tmp/api-deploy
mkdir -p /tmp/api-deploy

# Copy only necessary files
cp -r apps/api-server/dist /tmp/api-deploy/
cp -r apps/api-server/src/migrations /tmp/api-deploy/
cp apps/api-server/package*.json /tmp/api-deploy/
cp ecosystem.config.js /tmp/api-deploy/
cp -r nginx /tmp/api-deploy/

# Create minimal package.json for production
cat > /tmp/api-deploy/package.json << 'EOF'
{
  "name": "@o4o/api-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/main.js",
    "migration:run": "typeorm migration:run -d dist/database/connection.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "typeorm": "^0.3.20",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "ioredis": "^5.3.2",
    "socket.io": "^4.6.1",
    "winston": "^3.11.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.8",
    "geoip-lite": "^1.4.7",
    "ua-parser-js": "^1.0.37"
  }
}
EOF

# Step 3: Deploy to server
echo ""
echo "🚀 Step 3: Deploying to $API_HOST..."

# Create deployment script
cat > /tmp/api-deploy/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Setting up API server..."

# Install dependencies
npm install --production --prefer-offline --no-audit

# Create .env.production if not exists
if [ ! -f .env.production ]; then
    cat > .env.production << 'ENVEOF'
NODE_ENV=production
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=CHANGE_ME
DB_NAME=o4o_platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://neture.co.kr,https://www.neture.co.kr,https://admin.neture.co.kr

# API
API_URL=https://api.neture.co.kr
FRONTEND_URL=https://www.neture.co.kr

LOG_LEVEL=info
ENVEOF
    
    echo "⚠️  IMPORTANT: Edit .env.production with real database password!"
fi

# Set permissions
chmod 600 .env.production

# Stop existing PM2 process if running
pm2 stop o4o-api-server 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js --only o4o-api-server
pm2 save

echo "✅ API server deployed!"
EOF

chmod +x /tmp/api-deploy/deploy.sh

# Upload files
echo "Uploading files to server..."
scp -r /tmp/api-deploy/* $API_USER@$API_HOST:$API_PATH/

# Execute deployment on server
echo ""
echo "🔧 Executing deployment on server..."
ssh $API_USER@$API_HOST "cd $API_PATH && ./deploy.sh"

# Step 4: Configure Nginx
echo ""
echo "🌐 Step 4: Configuring Nginx..."
ssh $API_USER@$API_HOST << 'EOF'
# Copy Nginx config
sudo cp ~/o4o-platform/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
EOF

# Step 5: Health check
echo ""
echo "🔍 Step 5: Health check..."
sleep 5

# Check local health endpoint
if ssh $API_USER@$API_HOST "curl -s http://localhost:4000/health | grep -q 'healthy'"; then
    echo "✅ API server is healthy!"
else
    echo "❌ API server health check failed"
    echo "Checking logs..."
    ssh $API_USER@$API_HOST "pm2 logs o4o-api-server --lines 50"
fi

# Check public endpoint
if curl -s http://$API_HOST/health | grep -q 'healthy'; then
    echo "✅ Public endpoint is accessible!"
else
    echo "⚠️  Public endpoint not accessible yet (might need SSL)"
fi

# Cleanup
rm -rf /tmp/api-deploy

echo ""
echo "🎉 API Server Deployment Complete!"
echo "================================="
echo "Internal: http://localhost:4000"
echo "Public: http://api.neture.co.kr"
echo ""
echo "Next steps:"
echo "1. Update .env.production with real database password"
echo "2. Run database migrations: npm run migration:run"
echo "3. Set up SSL: sudo certbot --nginx -d api.neture.co.kr"
echo ""
echo "Completed at: $(date)"