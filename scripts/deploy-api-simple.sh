#!/bin/bash

# ⚠️  DEPRECATED: This script has been replaced
# Use ./scripts/deploy-api-local.sh instead for better error handling and features

echo "⚠️  WARNING: This script is DEPRECATED"
echo "Please use: ./scripts/deploy-api-local.sh"
echo "Continuing in 5 seconds... (Ctrl+C to cancel)"
sleep 5

# Simple O4O Platform API Server Deployment Script
# This script performs a minimal deployment - git pull and PM2 restart

set -e  # Exit on error

echo "🚀 Starting Simple O4O Platform API Server Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/sohae21/o4o-platform"
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

# Navigate to project directory
cd "$PROJECT_DIR"

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main
print_status "Code updated"

# Build the API server if dist doesn't exist
cd "$API_DIR"
if [ ! -d "dist" ]; then
    echo "Building API server..."
    npm run build
    print_status "Build completed"
else
    print_status "Using existing build (dist directory found)"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Stop existing PM2 process if running
echo "Checking for existing PM2 process..."
if pm2 list | grep -q "$PM2_NAME"; then
    print_warning "Restarting existing PM2 process..."
    pm2 restart "$PM2_NAME"
else
    print_warning "Starting new PM2 process..."
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.production.cjs
fi

# Save PM2 configuration
pm2 save

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

# Display important information
echo ""
echo "======================================"
echo "  Simple Deployment completed!"
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

print_status "Simple deployment complete!"