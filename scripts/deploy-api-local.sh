#!/bin/bash

# O4O Platform API Server Local Deployment Script
# This script is designed to run ON the API server itself (not remotely)
# Usage: ./deploy-api-local.sh [--skip-build] [--skip-deps]

set -e  # Exit on error

echo "🚀 Starting O4O Platform API Server Local Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/sohae21/o4o-platform"
API_DIR="$PROJECT_DIR/apps/api-server"
PM2_NAME="o4o-api-production"
SKIP_BUILD=false
SKIP_DEPS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      echo "Usage: ./deploy-api-local.sh [--skip-build] [--skip-deps]"
      exit 1
      ;;
  esac
done

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

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Validate environment
echo "Checking deployment environment..."
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

if [ ! -d "$API_DIR" ]; then
    print_error "API server directory not found: $API_DIR"
    exit 1
fi

print_status "Environment validated"

# Navigate to project directory
cd "$PROJECT_DIR"

# Pull latest changes
echo ""
print_info "Pulling latest changes from GitHub..."
git pull origin main
print_status "Code updated"

# Install/update dependencies if not skipped
if [ "$SKIP_DEPS" = false ]; then
    echo ""
    print_info "Installing/updating dependencies..."
    npm install --legacy-peer-deps > /dev/null 2>&1 || {
        print_warning "Full dependency install failed, trying API server only..."
        cd "$API_DIR"
        npm install > /dev/null 2>&1 || {
            print_warning "API server dependency install failed, continuing..."
        }
        cd "$PROJECT_DIR"
    }
    print_status "Dependencies updated"
else
    print_warning "Skipping dependency installation (--skip-deps flag)"
fi

# Build the API server if not skipped
cd "$API_DIR"
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    print_info "Building API server..."
    npm run build
    print_status "Build completed"
else
    print_warning "Skipping build (--skip-build flag)"
    if [ ! -d "dist" ]; then
        print_error "No dist directory found and build was skipped!"
        exit 1
    fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Stop existing PM2 process if running
echo ""
print_info "Managing PM2 processes..."

# Check for existing processes and handle them
EXISTING_PRODUCTION=$(pm2 list | grep "ecosystem.config.production" || true)
EXISTING_NAMED=$(pm2 list | grep "$PM2_NAME" || true)

if [ ! -z "$EXISTING_PRODUCTION" ]; then
    print_warning "Found existing production process, restarting..."
    pm2 restart ecosystem.config.production
elif [ ! -z "$EXISTING_NAMED" ]; then
    print_warning "Found existing named process, restarting..."
    pm2 restart "$PM2_NAME"
else
    print_warning "Starting new PM2 process: $PM2_NAME"
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.production.cjs
fi

# Save PM2 configuration
pm2 save > /dev/null 2>&1

print_status "PM2 process managed successfully"

# Show process status
echo ""
echo "Current PM2 processes:"
pm2 list

# Test the API with retry
echo ""
print_info "Testing API health endpoint..."
for i in {1..3}; do
    sleep 3
    if curl -f http://localhost:4000/health > /dev/null 2>&1; then
        print_status "API server is running and healthy!"
        HEALTH_OK=true
        break
    else
        print_warning "Health check attempt $i failed, retrying..."
        HEALTH_OK=false
    fi
done

if [ "$HEALTH_OK" != true ]; then
    print_error "API server health check failed after multiple attempts"
    print_info "Checking recent logs..."
    pm2 logs "$PM2_NAME" --lines 10 --nostream
    exit 1
fi

# Display deployment summary
echo ""
echo "======================================"
echo "  ✅ Local Deployment Completed!"
echo "======================================"
echo ""
echo "📍 API Server Details:"
echo "  • Local URL: http://localhost:4000"
echo "  • Health Check: http://localhost:4000/health"
echo "  • PM2 Process: $PM2_NAME"
echo ""
echo "🔧 Management Commands:"
echo "  • View logs: pm2 logs $PM2_NAME"
echo "  • Restart: pm2 restart $PM2_NAME"
echo "  • Stop: pm2 stop $PM2_NAME"
echo "  • Status: pm2 list"
echo ""
echo "🔄 Quick Redeploy:"
echo "  • Fast: ./scripts/deploy-api-local.sh --skip-build --skip-deps"
echo "  • Safe: ./scripts/deploy-api-local.sh"
echo ""

print_status "Local API server deployment completed successfully!"