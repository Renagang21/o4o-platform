#!/bin/bash

# O4O Platform Deployment Script
# Usage: ./deploy.sh [api|web|all] [--emergency]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
TARGET=${1:-all}
EMERGENCY=${2:-}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Deploy API Server
deploy_api() {
    print_status "Deploying API server..."
    
    # Build
    print_status "Building API server..."
    npm run build:api
    
    # Create deployment package
    print_status "Creating deployment package..."
    rm -rf dist/api-deploy
    mkdir -p dist/api-deploy
    
    # Copy necessary files
    cp -r apps/api-server/dist/* dist/api-deploy/
    cp apps/api-server/package.json dist/api-deploy/
    cp apps/api-server/.env.production dist/api-deploy/.env 2>/dev/null || true
    
    # Deploy to server
    print_status "Deploying to o4o-apiserver (43.202.242.215)..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        dist/api-deploy/ ubuntu@43.202.242.215:/home/ubuntu/o4o-platform/apps/api-server/
    
    # Restart service
    ssh ubuntu@43.202.242.215 "cd /home/ubuntu/o4o-platform/apps/api-server && npm install --production && pm2 restart api-server"
    
    print_status "API server deployed successfully!"
}

# Deploy Web Apps
deploy_web() {
    print_status "Deploying web applications..."
    
    # Build all web apps
    print_status "Building web applications..."
    npm run build:web
    npm run build:admin
    
    # Deploy main site
    print_status "Deploying main site to o4o-webserver (13.125.144.8)..."
    rsync -avz --delete \
        apps/main-site/dist/ \
        ubuntu@13.125.144.8:/var/www/neture.co.kr/
    
    # Deploy admin dashboard
    print_status "Deploying admin dashboard..."
    rsync -avz --delete \
        apps/admin-dashboard/dist/ \
        ubuntu@13.125.144.8:/var/www/admin.neture.co.kr/
    
    # Set permissions
    ssh ubuntu@13.125.144.8 "sudo chown -R www-data:www-data /var/www/ && sudo chmod -R 755 /var/www/"
    
    print_status "Web applications deployed successfully!"
}

# Emergency deployment (skip tests)
emergency_deploy() {
    print_warning "EMERGENCY DEPLOYMENT MODE - Skipping tests!"
    
    if [[ "$TARGET" == "api" || "$TARGET" == "all" ]]; then
        deploy_api
    fi
    
    if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
        deploy_web
    fi
}

# Normal deployment (with tests)
normal_deploy() {
    # Run tests
    print_status "Running tests..."
    npm test
    
    # Run type checks
    print_status "Running type checks..."
    npm run type-check || print_warning "Type check failed but continuing..."
    
    # Run lint
    print_status "Running lint..."
    npm run lint || print_warning "Lint failed but continuing..."
    
    if [[ "$TARGET" == "api" || "$TARGET" == "all" ]]; then
        deploy_api
    fi
    
    if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
        deploy_web
    fi
}

# Main execution
print_status "Starting deployment process..."
print_status "Target: $TARGET"

# Check if emergency mode
if [[ "$EMERGENCY" == "--emergency" ]]; then
    emergency_deploy
else
    normal_deploy
fi

# Health checks
print_status "Running health checks..."
if [[ "$TARGET" == "api" || "$TARGET" == "all" ]]; then
    sleep 5
    curl -f https://api.neture.co.kr/api/health || print_error "API health check failed!"
fi

if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
    curl -f https://neture.co.kr || print_error "Main site health check failed!"
    curl -f https://admin.neture.co.kr || print_error "Admin site health check failed!"
fi

print_status "Deployment completed!"