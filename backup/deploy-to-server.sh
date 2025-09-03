#!/bin/bash

# Deploy script for memory-constrained servers
# This script builds locally and deploys only the necessary files to the server

set -e

echo "🚀 Starting deployment process..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_SERVER_HOST="43.202.242.215"
API_SERVER_USER="ubuntu"
API_SERVER_PATH="/home/ubuntu/o4o-platform"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Build locally
print_status "Building packages locally..."
./scripts/dev.sh build:packages || {
    print_error "Package build failed"
    exit 1
}

print_status "Building API server..."
pnpm run build --workspace=@o4o/api-server || {
    print_error "API server build failed"
    exit 1
}

# Step 2: Create deployment package
print_status "Creating deployment package..."
rm -rf /tmp/deploy-package
mkdir -p /tmp/deploy-package

# Copy only built files and essential configs
cp -r apps/api-server/dist /tmp/deploy-package/
cp apps/api-server/package.json /tmp/deploy-package/
cp apps/api-server/package-lock.json /tmp/deploy-package/ 2>/dev/null || true

# Create a minimal deployment script
cat > /tmp/deploy-package/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "📦 Installing production dependencies only..."
# Install only production dependencies with reduced memory usage
NODE_OPTIONS="--max-old-space-size=1024" pnpm install --frozen-lockfile --production --no-audit --no-fund || {
    echo "❌ pnpm install --frozen-lockfile failed, trying pnpm install..."
    NODE_OPTIONS="--max-old-space-size=1024" pnpm install --production --no-audit --no-fund
}

echo "✅ Dependencies installed"

# Restart PM2 with memory limit
pm2 restart api-server --max-memory-restart 500M || {
    echo "Starting new PM2 process..."
    pm2 start dist/server.js --name api-server --max-memory-restart 500M
}

echo "✅ API server restarted"
EOF

chmod +x /tmp/deploy-package/deploy.sh

# Step 3: Create tarball
print_status "Creating deployment archive..."
cd /tmp/deploy-package
tar -czf deploy.tar.gz *
cd - > /dev/null

# Step 4: Deploy to server
print_status "Deploying to server..."

# Check if we can connect to the server
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $API_SERVER_USER@$API_SERVER_HOST "echo 'Connected'" &>/dev/null; then
    print_error "Cannot connect to server. Please check SSH configuration."
    print_warning "You can manually deploy by:"
    echo "  1. Copy /tmp/deploy-package/deploy.tar.gz to the server"
    echo "  2. Extract it in $API_SERVER_PATH/apps/api-server/"
    echo "  3. Run the deploy.sh script"
    exit 1
fi

# Upload and extract
print_status "Uploading files to server..."
scp /tmp/deploy-package/deploy.tar.gz $API_SERVER_USER@$API_SERVER_HOST:/tmp/ || {
    print_error "Failed to upload files"
    exit 1
}

print_status "Extracting and deploying on server..."
ssh $API_SERVER_USER@$API_SERVER_HOST << ENDSSH
set -e
cd $API_SERVER_PATH/apps/api-server

# Backup current deployment
if [ -d dist ]; then
    mv dist dist.backup.\$(date +%Y%m%d_%H%M%S)
fi

# Extract new deployment
tar -xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

# Run deployment script
bash deploy.sh

# Clean up old backups (keep only last 3)
ls -dt dist.backup.* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

echo "✅ Deployment complete"
ENDSSH

# Step 5: Verify deployment
print_status "Verifying deployment..."
sleep 5

if curl -s -f http://$API_SERVER_HOST:4000/api/health > /dev/null; then
    print_status "API server is healthy!"
else
    print_warning "Health check failed. Please check the server logs."
fi

# Cleanup
rm -rf /tmp/deploy-package

print_status "Deployment process complete!"
echo ""
echo "📝 Summary:"
echo "  - Built locally to avoid server memory issues"
echo "  - Deployed only production files"
echo "  - Configured PM2 with memory limits"
echo ""
echo "🔍 To check server status:"
echo "  ssh $API_SERVER_USER@$API_SERVER_HOST 'pm2 status'"
echo ""
echo "📊 To view logs:"
echo "  ssh $API_SERVER_USER@$API_SERVER_HOST 'pm2 logs api-server --lines 50'"