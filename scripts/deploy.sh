#!/bin/bash

# O4O Platform Deployment Script
# Usage: ./deploy.sh [api|web|all] [--skip-build]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_SERVER="apiserver"
WEB_SERVER="webserver"
SKIP_BUILD=false

# Parse arguments
TARGET=${1:-all}
if [[ "$2" == "--skip-build" ]]; then
    SKIP_BUILD=true
fi

# Functions
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Build function
build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping build process"
        return
    fi
    
    print_status "Building project..."
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        pnpm install
    fi
    
    # Build all packages
    print_status "Building packages..."
    pnpm run build:packages || true
    
    # Build applications
    if [[ "$TARGET" == "api" ]] || [[ "$TARGET" == "all" ]]; then
        print_status "Building API server..."
        cd "$PROJECT_ROOT/apps/api-server"
        pnpm run build
    fi
    
    if [[ "$TARGET" == "web" ]] || [[ "$TARGET" == "all" ]]; then
        print_status "Building admin dashboard..."
        cd "$PROJECT_ROOT/apps/admin-dashboard"
        pnpm run build
        
        print_status "Building main site..."
        cd "$PROJECT_ROOT/apps/main-site"
        pnpm run build
    fi
    
    cd "$PROJECT_ROOT"
}

# Deploy to API server (Local)
deploy_api() {
    print_status "Deploying API server locally..."
    
    # Check if we're on the API server itself
    if [ -f "$PROJECT_ROOT/scripts/deploy-api-local.sh" ]; then
        print_status "Running local API deployment script..."
        cd "$PROJECT_ROOT"
        
        # Use skip-deps if this is a quick redeploy
        if [ "$SKIP_BUILD" = true ]; then
            ./scripts/deploy-api-local.sh --skip-build --skip-deps
        else
            ./scripts/deploy-api-local.sh --skip-deps
        fi
    else
        print_error "Local API deployment script not found"
        print_warning "Falling back to remote deployment (deprecated)..."
        
        # Legacy remote deployment (deprecated)
        print_status "Creating remote directories..."
        ssh $API_SERVER "mkdir -p ~/o4o-platform/apps/api-server ~/o4o-platform/packages" || {
            print_error "Cannot connect to API server via SSH"
            exit 1
        }
        
        # Sync API server files
        print_status "Syncing API server files..."
        rsync -avz --delete \
            --exclude 'node_modules' \
            --exclude '.env.local' \
            --exclude 'coverage' \
            --exclude '.turbo' \
            "$PROJECT_ROOT/apps/api-server/" \
            "$API_SERVER:~/o4o-platform/apps/api-server/"
        
        # Install dependencies and restart on remote
        print_status "Installing dependencies on API server..."
        ssh $API_SERVER << 'ENDSSH'
            cd ~/o4o-platform
            pnpm install --frozen-lockfile || npm install
            
            # Build if dist doesn't exist
            if [ ! -d "apps/api-server/dist" ]; then
                echo "Building API server..."
            cd apps/api-server
            pnpm run build || npm run build
            cd ~/o4o-platform
        fi
        
        # Restart PM2 process
        pm2 restart o4o-api || pm2 start apps/api-server/dist/main.js --name o4o-api
        pm2 save
        
        echo "API server deployment complete!"
ENDSSH
    
    print_status "API server deployed successfully!"
}

# Deploy to Web server
deploy_web() {
    print_status "Deploying to Web server..."
    
    # Create remote directories
    ssh $WEB_SERVER "mkdir -p ~/o4o-platform/apps/admin-dashboard/dist ~/o4o-platform/apps/main-site/dist"
    
    # Sync admin dashboard build
    if [ -d "$PROJECT_ROOT/apps/admin-dashboard/dist" ]; then
        print_status "Syncing admin dashboard..."
        rsync -avz --delete \
            "$PROJECT_ROOT/apps/admin-dashboard/dist/" \
            "$WEB_SERVER:~/o4o-platform/apps/admin-dashboard/dist/"
    else
        print_warning "Admin dashboard build not found, skipping..."
    fi
    
    # Sync main site build
    if [ -d "$PROJECT_ROOT/apps/main-site/dist" ]; then
        print_status "Syncing main site..."
        rsync -avz --delete \
            "$PROJECT_ROOT/apps/main-site/dist/" \
            "$WEB_SERVER:~/o4o-platform/apps/main-site/dist/"
    else
        print_warning "Main site build not found, skipping..."
    fi
    
    # Copy files to actual web directories with proper permissions
    ssh $WEB_SERVER << 'ENDSSH'
        # Backup existing sites
        sudo cp -r /var/www/admin.neture.co.kr /var/www/admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        sudo cp -r /var/www/neture.co.kr /var/www/neture.co.kr.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        
        # Copy admin dashboard
        if [ -d ~/o4o-platform/apps/admin-dashboard/dist ]; then
            sudo cp -r ~/o4o-platform/apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/
            sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
        fi
        
        # Copy main site
        if [ -d ~/o4o-platform/apps/main-site/dist ]; then
            sudo cp -r ~/o4o-platform/apps/main-site/dist/* /var/www/neture.co.kr/
            sudo chown -R www-data:www-data /var/www/neture.co.kr/
        fi
        
        # Restart nginx to ensure new files are served
        sudo nginx -t && sudo systemctl reload nginx
        
        # Clear any cache
        if command -v redis-cli &> /dev/null; then
            redis-cli FLUSHALL || true
        fi
        
        echo "Web server deployment complete!"
ENDSSH
    
    print_status "Web server deployed successfully!"
}

# Main execution
main() {
    print_status "Starting deployment process for: $TARGET"
    
    # Build project
    build_project
    
    # Deploy based on target
    case $TARGET in
        api)
            deploy_api
            ;;
        web)
            deploy_web
            ;;
        all)
            deploy_api
            deploy_web
            ;;
        *)
            print_error "Invalid target. Use: api, web, or all"
            exit 1
            ;;
    esac
    
    print_status "Deployment completed successfully!"
}

# Run main function
main
