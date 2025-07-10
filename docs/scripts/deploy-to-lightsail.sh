#!/bin/bash

# 🚀 AWS Lightsail Deployment Script for TheDANG Homepage
# Deploys the built React app to neture.co.kr

set -e  # Exit on any error

echo "🚀 Starting deployment to AWS Lightsail (neture.co.kr)..."

# Configuration
SERVER_IP="13.125.144.8"
SERVER_USER="ubuntu"
LOCAL_DIST_PATH="./dist"
REMOTE_PROJECT_PATH="/home/ubuntu/o4o-platform"
WEB_ROOT="/var/www/html"
SERVICE_NAME="web-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the main-site directory"
    exit 1
fi

# Step 1: Build the project locally
print_status "Building React application..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed. Please fix the errors and try again."
    exit 1
fi

# Check if dist directory exists
if [ ! -d "$LOCAL_DIST_PATH" ]; then
    print_error "Dist directory not found. Build may have failed."
    exit 1
fi

print_status "Built files ready for deployment:"
ls -la "$LOCAL_DIST_PATH"

# Step 2: Deploy to server
print_status "Deploying to AWS Lightsail server ($SERVER_IP)..."

# Create deployment script to run on server
cat > /tmp/deploy_commands.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Starting server-side deployment..."

# Navigate to project directory
cd /home/ubuntu/o4o-platform/services/main-site

# Pull latest changes from Git
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build on server (backup method)
echo "🔨 Building on server..."
npm run build

# Stop existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 delete web-app || true
pm2 delete all || true

# Copy built files to web root
echo "📋 Copying files to web root..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Start new PM2 process (as backup)
echo "🚀 Starting PM2 service..."
cd /var/www/html
pm2 serve . 3000 --name "web-app" --spa

# Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

# Verify deployment
echo "✅ Deployment verification:"
echo "Files in web root:"
ls -la /var/www/html/

echo "✅ Server-side deployment completed!"
EOF

# Step 3: Execute deployment on server
print_status "Executing deployment commands on server..."

# Copy and execute the deployment script
if scp /tmp/deploy_commands.sh ubuntu@$SERVER_IP:/tmp/deploy_commands.sh; then
    print_success "Deployment script uploaded"
else
    print_error "Failed to upload deployment script"
    exit 1
fi

# Execute the deployment script on server
if ssh ubuntu@$SERVER_IP "chmod +x /tmp/deploy_commands.sh && /tmp/deploy_commands.sh"; then
    print_success "Deployment script executed successfully"
else
    print_error "Deployment script execution failed"
    exit 1
fi

# Step 4: Verification
print_status "Verifying deployment..."

# Check if the site is accessible
if curl -f -s "http://$SERVER_IP" > /dev/null; then
    print_success "Server is responding"
else
    print_warning "Server health check failed"
fi

# Clean up
rm -f /tmp/deploy_commands.sh

print_success "🎉 Deployment completed successfully!"
print_status "Your TheDANG homepage should now be live at:"
echo -e "${GREEN}🌐 https://neture.co.kr${NC}"
echo -e "${GREEN}🌐 http://$SERVER_IP${NC}"

print_status "Next steps:"
echo "1. Visit https://neture.co.kr to verify the deployment"
echo "2. Check browser console for any errors"
echo "3. Test all navigation and functionality"

print_status "If you encounter issues, check:"
echo "- SSH to server: ssh ubuntu@$SERVER_IP"
echo "- Check PM2 status: pm2 status"
echo "- Check Nginx status: sudo systemctl status nginx"
echo "- Check web files: ls -la /var/www/html/"