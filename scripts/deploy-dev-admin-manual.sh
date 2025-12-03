#!/usr/bin/env bash
#
# Manual deployment script for Admin Dashboard (Development)
# Deploys to dev-admin.neture.co.kr
#
# Usage: ./scripts/deploy-dev-admin-manual.sh
#

set -e  # Exit on error

echo "🚀 Starting manual deployment of Admin Dashboard (DEVELOPMENT)..."
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "apps/admin-dashboard/package.json" ]; then
  echo "❌ Error: Not in the correct directory"
  exit 1
fi

# Check git status
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: You have uncommitted changes"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Build packages first
echo "📦 Building packages..."
pnpm run build:packages --silent 2>&1 | grep -E "(✅|❌|Error|error|warning)" || true

# Build admin dashboard
echo "🔨 Building admin dashboard (DEVELOPMENT)..."
cd apps/admin-dashboard
NODE_ENV=production \
NODE_OPTIONS='--max-old-space-size=4096' \
VITE_API_URL=https://api.neture.co.kr/api \
VITE_PUBLIC_APP_ORIGIN=https://neture.co.kr \
VITE_GIT_BRANCH=develop \
pnpm run build:prod 2>&1 | grep -E "(✅|❌|vite|built|error|warning)" | tail -20 || true

cd ../..

# Create tarball
echo "📦 Creating deployment tarball..."
TARBALL="/tmp/dev-admin-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf "$TARBALL" -C apps/admin-dashboard/dist .

echo "✅ Tarball created: $TARBALL"
echo ""

# Copy to web server
echo "📤 Uploading to web server..."
ssh o4o-web "mkdir -p /tmp/dev-admin-deploy"
scp "$TARBALL" o4o-web:/tmp/dev-admin-deploy/latest.tar.gz

# Deploy on web server
echo "🚀 Deploying on web server (dev-admin.neture.co.kr)..."
ssh o4o-web << 'EOF'
  set -e

  echo "📋 Extracting files..."
  cd /tmp/dev-admin-deploy
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
  sudo cp -r /var/www/dev-admin.neture.co.kr "/var/www/dev-admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

  echo "🗑️  Clearing current deployment..."
  sudo rm -rf /var/www/dev-admin.neture.co.kr/*

  echo "📦 Deploying new files..."
  sudo cp -r extract/* /var/www/dev-admin.neture.co.kr/

  echo "🔧 Setting permissions..."
  sudo chown -R www-data:www-data /var/www/dev-admin.neture.co.kr/
  sudo chmod -R 755 /var/www/dev-admin.neture.co.kr/

  echo "🧹 Cleaning up..."
  rm -rf /tmp/dev-admin-deploy

  echo "🔄 Reloading Nginx..."
  sudo systemctl reload nginx

  echo "✅ Deployment complete!"
  echo ""
  echo "📄 Deployed version:"
  cat /var/www/dev-admin.neture.co.kr/version.json
EOF

echo ""
echo "✅ Admin Dashboard (DEV) deployed successfully!"
echo "🌐 URL: https://dev-admin.neture.co.kr"
echo ""

# Clean up local tarball
rm -f "$TARBALL"
echo "🧹 Cleaned up local tarball"
