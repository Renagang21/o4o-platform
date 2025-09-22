#!/bin/bash

# O4O Platform API Server Production Deployment Script
# This script should be run on the API server (43.202.242.215)

set -e  # Exit on error

echo "🚀 Starting O4O Platform API Server Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/ubuntu/o4o-platform"
API_DIR="$PROJECT_DIR/apps/api-server"
PM2_NAME="o4o-api-production"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running on correct server
echo "Checking environment..."
if [ ! -d "$PROJECT_DIR" ]; then
    print_warning "Project directory not found. Cloning repository..."
    cd /home/ubuntu
    git clone https://github.com/Renagang21/o4o-platform.git
    cd "$PROJECT_DIR"
else
    print_status "Project directory found"
fi

# Navigate to project directory
cd "$PROJECT_DIR"

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main
print_status "Code updated"

# Install dependencies
echo "Installing dependencies..."
cd "$API_DIR"
npm install
print_status "Dependencies installed"

# Build the application
echo "Building API server..."
npm run build
print_status "Build completed"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Stop existing PM2 process if running
echo "Checking for existing PM2 process..."
if pm2 list | grep -q "$PM2_NAME"; then
    print_warning "Stopping existing PM2 process..."
    pm2 stop "$PM2_NAME"
    pm2 delete "$PM2_NAME"
fi

# Start the application with PM2
echo "Starting API server with PM2..."
cd "$PROJECT_DIR"
pm2 start ecosystem.config.production.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo "Setting up PM2 startup script..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

print_status "PM2 configured for auto-restart"

# Show process status
echo ""
echo "Current PM2 processes:"
pm2 list

# Test the API
echo ""
echo "Testing API health endpoint..."
sleep 5  # Wait for server to start

if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    print_status "API server is running and healthy!"
else
    print_error "API server health check failed. Checking logs..."
    pm2 logs "$PM2_NAME" --lines 20
    exit 1
fi

# Test CORS headers
echo ""
echo "Testing CORS configuration..."
CORS_TEST=$(curl -H "Origin: https://admin.neture.co.kr" -I http://localhost:4000/health 2>/dev/null | grep -i "access-control-allow-origin" || true)
if [ ! -z "$CORS_TEST" ]; then
    print_status "CORS headers configured correctly"
    echo "$CORS_TEST"
else
    print_warning "CORS headers might not be configured. Please check nginx configuration."
fi

# Display important information
echo ""
echo "======================================"
echo "  Deployment completed successfully!"
echo "======================================"
echo ""
echo "API Server URL: https://api.neture.co.kr"
echo "Health Check: https://api.neture.co.kr/health"
echo ""
echo "To view logs:"
echo "  pm2 logs $PM2_NAME"
echo ""
echo "To restart:"
echo "  pm2 restart $PM2_NAME"
echo ""
echo "To stop:"
echo "  pm2 stop $PM2_NAME"
echo ""

print_status "Deployment complete!"