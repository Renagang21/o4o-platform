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

# Smart deployment
smart_deploy() {
    print_status "🤖 Smart deployment - analyzing changes..."
    
    # Get changed files
    CHANGED_FILES=$(git diff HEAD~1 --name-only 2>/dev/null || git diff --cached --name-only)
    
    if [ -z "$CHANGED_FILES" ]; then
        print_warning "No changes detected. Using full deployment."
        normal_deploy
        return
    fi
    
    print_status "🔍 Changed files:"
    echo "$CHANGED_FILES" | head -10
    
    # Flags for what needs to be done
    NEED_NPM_INSTALL=false
    NEED_API_BUILD=false
    NEED_MAIN_BUILD=false
    NEED_ADMIN_BUILD=false
    NEED_PACKAGES_BUILD=false
    NEED_NGINX_RELOAD=false
    DOCS_ONLY=true
    
    # Analyze changes
    while IFS= read -r file; do
        # Check for package.json changes
        if [[ "$file" == "package.json" ]] || [[ "$file" == "package-lock.json" ]]; then
            print_status "📦 Dependencies changed - will run npm install"
            NEED_NPM_INSTALL=true
            DOCS_ONLY=false
        fi
        
        # Check for package changes
        if [[ "$file" == packages/* ]]; then
            print_status "📚 Package changed: $file"
            NEED_PACKAGES_BUILD=true
            DOCS_ONLY=false
            
            # If types or utils changed, rebuild everything
            if [[ "$file" == packages/types/* ]] || [[ "$file" == packages/utils/* ]]; then
                NEED_API_BUILD=true
                NEED_MAIN_BUILD=true
                NEED_ADMIN_BUILD=true
            fi
        fi
        
        # Check for API server changes
        if [[ "$file" == apps/api-server/* ]]; then
            print_status "🔧 API server changed: $file"
            NEED_API_BUILD=true
            DOCS_ONLY=false
        fi
        
        # Check for main site changes
        if [[ "$file" == apps/main-site/* ]]; then
            print_status "🌐 Main site changed: $file"
            NEED_MAIN_BUILD=true
            DOCS_ONLY=false
        fi
        
        # Check for admin dashboard changes
        if [[ "$file" == apps/admin-dashboard/* ]]; then
            print_status "🎛️ Admin dashboard changed: $file"
            NEED_ADMIN_BUILD=true
            DOCS_ONLY=false
        fi
        
        # Check for nginx config changes
        if [[ "$file" == nginx/* ]] || [[ "$file" == *nginx*.conf ]]; then
            print_status "⚙️ Nginx config changed: $file"
            NEED_NGINX_RELOAD=true
            DOCS_ONLY=false
        fi
        
        # Check if it's not just docs
        if [[ "$file" != *.md ]] && [[ "$file" != docs/* ]] && [[ "$file" != .github/* ]]; then
            DOCS_ONLY=false
        fi
    done <<< "$CHANGED_FILES"
    
    # Execute based on analysis
    if [ "$DOCS_ONLY" = true ]; then
        print_status "⏭️ Only documentation changed - skipping deployment"
        return
    fi
    
    # Install dependencies if needed
    if [ "$NEED_NPM_INSTALL" = true ]; then
        print_status "📦 Installing dependencies..."
        npm install
    fi
    
    # Build packages if needed
    if [ "$NEED_PACKAGES_BUILD" = true ]; then
        print_status "🏗️ Building packages..."
        npm run build:packages
    fi
    
    # Run tests
    print_status "🧪 Running tests..."
    npm test || print_warning "Tests failed but continuing..."
    
    # Build and deploy API if needed
    if [ "$NEED_API_BUILD" = true ]; then
        print_status "🏗️ Building and deploying API server..."
        deploy_api
    else
        print_status "⏭️ Skipping API server - no changes detected"
    fi
    
    # Build and deploy main site if needed
    if [ "$NEED_MAIN_BUILD" = true ]; then
        print_status "🏗️ Building main site..."
        npm run build:web
        
        print_status "📤 Deploying main site..."
        rsync -avz --delete \
            apps/main-site/dist/ \
            ubuntu@13.125.144.8:/var/www/neture.co.kr/
    else
        print_status "⏭️ Skipping main site - no changes detected"
    fi
    
    # Build and deploy admin if needed
    if [ "$NEED_ADMIN_BUILD" = true ]; then
        print_status "🏗️ Building admin dashboard..."
        npm run build:admin
        
        print_status "📤 Deploying admin dashboard..."
        rsync -avz --delete \
            apps/admin-dashboard/dist/ \
            ubuntu@13.125.144.8:/var/www/admin.neture.co.kr/
    else
        print_status "⏭️ Skipping admin dashboard - no changes detected"
    fi
    
    # Set permissions if any web app was deployed
    if [ "$NEED_MAIN_BUILD" = true ] || [ "$NEED_ADMIN_BUILD" = true ]; then
        ssh ubuntu@13.125.144.8 "sudo chown -R www-data:www-data /var/www/ && sudo chmod -R 755 /var/www/"
    fi
    
    # Reload nginx if needed
    if [ "$NEED_NGINX_RELOAD" = true ]; then
        print_status "🔄 Reloading nginx configuration..."
        ssh ubuntu@13.125.144.8 "sudo nginx -t && sudo systemctl reload nginx"
    fi
    
    print_status "✅ Smart deployment complete!"
}

# Main execution
print_status "Starting deployment process..."
print_status "Target: $TARGET"

# Check deployment mode
if [[ "$TARGET" == "smart" ]]; then
    smart_deploy
elif [[ "$EMERGENCY" == "--emergency" ]]; then
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