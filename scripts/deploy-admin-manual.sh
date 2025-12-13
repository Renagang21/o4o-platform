#!/usr/bin/env bash
#
# Manual deployment script for Admin Dashboard
# Use this when GitHub Actions is not working
#
# Usage: ./scripts/deploy-admin-manual.sh [dev|prod]
#   dev  - Deploy to dev-admin.neture.co.kr
#   prod - Deploy to admin.neture.co.kr (default)
#

set -e  # Exit on error

# Parse environment argument
ENV="${1:-prod}"
if [ "$ENV" = "dev" ]; then
  TARGET_DIR="/var/www/dev-admin.neture.co.kr"
  TARGET_URL="https://dev-admin.neture.co.kr"
else
  TARGET_DIR="/var/www/admin.neture.co.kr"
  TARGET_URL="https://admin.neture.co.kr"
fi

echo "🚀 Starting manual deployment of Admin Dashboard to $ENV..."
echo "   Target: $TARGET_URL"
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "apps/admin-dashboard/package.json" ]; then
  echo "❌ Error: Not in the correct directory"
  exit 1
fi

# Check git status (skip interactive prompt in non-interactive mode)
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: You have uncommitted changes"
  if [ -t 0 ]; then
    # Interactive mode - ask user
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    # Non-interactive mode - continue with warning
    echo "ℹ️  Non-interactive mode: continuing despite uncommitted changes"
  fi
fi

# Build packages first
echo "📦 Building packages..."
pnpm run build:packages 2>&1 | grep -E "(✅|❌|Error|error|warning)" || true

# Build admin dashboard
echo "🔨 Building admin dashboard..."
cd apps/admin-dashboard
VITE_API_URL=https://api.neture.co.kr/api \
VITE_PUBLIC_APP_ORIGIN=https://neture.co.kr \
pnpm run build:prod 2>&1 | tail -20

cd ../..

# Create tarball
echo "📦 Creating deployment tarball..."
TARBALL="/tmp/admin-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf "$TARBALL" -C apps/admin-dashboard/dist .

echo "✅ Tarball created: $TARBALL"
echo ""

# Copy to web server
echo "📤 Uploading to web server..."
ssh o4o-webserver "mkdir -p /tmp/admin-deploy"
scp "$TARBALL" o4o-webserver:/tmp/admin-deploy/latest.tar.gz

# Deploy on web server
echo "🚀 Deploying on web server..."
ssh o4o-webserver << EOF
  set -e

  echo "📋 Extracting files..."
  cd /tmp/admin-deploy
  rm -rf extract
  mkdir -p extract
  tar xzf latest.tar.gz -C extract

  echo "🔍 Verifying extracted files..."
  if [ ! -f extract/version.json ]; then
    echo "❌ Error: version.json not found in tarball!"
    exit 1
  fi

  echo "📄 New version:"
  cat extract/version.json
  echo ""

  echo "💾 Backing up current deployment..."
  sudo cp -r $TARGET_DIR "${TARGET_DIR}.backup.\$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

  echo "🗑️  Clearing current deployment..."
  sudo rm -rf $TARGET_DIR/*

  echo "📦 Deploying new files..."
  sudo cp -r extract/* $TARGET_DIR/

  echo "🔧 Setting permissions..."
  sudo chown -R www-data:www-data $TARGET_DIR/
  sudo chmod -R 755 $TARGET_DIR/

  echo "🧹 Cleaning up..."
  rm -rf /tmp/admin-deploy

  echo "🔄 Reloading Nginx..."
  sudo systemctl reload nginx

  echo "✅ Deployment complete!"
  echo ""
  echo "📄 Deployed version:"
  cat $TARGET_DIR/version.json
EOF

echo ""
echo "✅ Admin Dashboard deployed successfully!"
echo "🌐 URL: $TARGET_URL"
echo ""

# Clean up local tarball
rm -f "$TARBALL"
echo "🧹 Cleaned up local tarball"
