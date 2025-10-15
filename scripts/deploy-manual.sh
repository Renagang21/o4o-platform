#!/bin/bash

# Manual Deployment Script for O4O Platform
# Use this only when GitHub Actions fails or for emergency deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if running from project root
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
  print_error "Error: Must run from project root directory"
  exit 1
fi

# Display menu
echo "=========================================="
echo "  O4O Platform Manual Deployment"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This bypasses GitHub Actions"
echo "    Use only for emergency deployments"
echo ""
echo "Select deployment target:"
echo "  1) Main Site (neture.co.kr)"
echo "  2) Admin Dashboard (admin.neture.co.kr)"
echo "  3) Both (Main + Admin)"
echo "  4) Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    APP="main-site"
    DIST_PATH="apps/main-site/dist"
    REMOTE_PATH="/var/www/neture.co.kr"
    SSH_HOST="o4o-web"
    ;;
  2)
    APP="admin-dashboard"
    DIST_PATH="apps/admin-dashboard/dist"
    REMOTE_PATH="/var/www/admin.neture.co.kr"
    SSH_HOST="o4o-web"
    ;;
  3)
    echo ""
    print_info "Deploying both sites..."
    $0 <<< "1"
    $0 <<< "2"
    exit 0
    ;;
  4)
    print_info "Exiting..."
    exit 0
    ;;
  *)
    print_error "Invalid choice"
    exit 1
    ;;
esac

echo ""
print_info "Deploying: $APP"
print_warning "Remote: $REMOTE_PATH"
echo ""

# Confirm
read -p "Continue with deployment? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  print_info "Deployment cancelled"
  exit 0
fi

# Check if dist exists
if [ ! -d "$DIST_PATH" ]; then
  print_error "Build directory not found: $DIST_PATH"
  print_info "Run 'pnpm run build' first"
  exit 1
fi

# Start deployment
print_info "Starting deployment process..."

# Backup on remote
print_info "Creating backup on remote server..."
ssh $SSH_HOST "sudo cp -r $REMOTE_PATH ${REMOTE_PATH}.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Clear remote directory
print_info "Clearing remote directory..."
ssh $SSH_HOST "sudo rm -rf ${REMOTE_PATH}/*"

# Create temp directory on remote
print_info "Preparing temp directory..."
ssh $SSH_HOST "mkdir -p /tmp/manual-deploy-$APP"

# Copy files
print_info "Copying build files to remote server..."
scp -r $DIST_PATH/* $SSH_HOST:/tmp/manual-deploy-$APP/

# Move files and set permissions
print_info "Moving files to web directory..."
ssh $SSH_HOST "sudo cp -r /tmp/manual-deploy-$APP/* $REMOTE_PATH/ && \
               sudo chown -R www-data:www-data $REMOTE_PATH/ && \
               sudo chmod -R 755 $REMOTE_PATH/ && \
               rm -rf /tmp/manual-deploy-$APP"

# Reload nginx
print_info "Reloading Nginx..."
ssh $SSH_HOST "sudo systemctl reload nginx"

# Success
echo ""
print_success "Deployment completed successfully!"
print_info "Deployed: $APP"
print_info "Remote: $REMOTE_PATH"
echo ""

# Show deployed file
if [ "$APP" == "main-site" ]; then
  URL="https://neture.co.kr"
elif [ "$APP" == "admin-dashboard" ]; then
  URL="https://admin.neture.co.kr"
fi

print_success "🌐 Visit $URL to verify"
echo ""

# Check deployed file hash
DEPLOYED_HASH=$(ssh $SSH_HOST "cat $REMOTE_PATH/index.html 2>/dev/null | grep -o 'index-[^.]*\.js' | head -1" || echo "unknown")
print_info "Deployed hash: $DEPLOYED_HASH"

# Show local hash for comparison
LOCAL_HASH=$(grep -o 'index-[^.]*\.js' $DIST_PATH/index.html | head -1 || echo "unknown")
print_info "Local hash: $LOCAL_HASH"

if [ "$DEPLOYED_HASH" == "$LOCAL_HASH" ]; then
  print_success "✅ Hashes match - deployment verified"
else
  print_warning "⚠️  Hashes don't match - please verify manually"
fi
