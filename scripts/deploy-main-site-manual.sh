#!/usr/bin/env bash
#
# Manual deployment script for Main Site
# Use this when GitHub Actions is not working
#
# Usage: ./scripts/deploy-main-site-manual.sh
#

set -e  # Exit on error

echo "🚀 Starting manual deployment of Main Site..."
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "apps/main-site/package.json" ]; then
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

# Build main site
echo "🔨 Building main site..."
cd apps/main-site
NODE_ENV=production \
NODE_OPTIONS='--max-old-space-size=4096' \
GENERATE_SOURCEMAP=false \
VITE_API_URL=https://api.neture.co.kr \
pnpm run build 2>&1 | tail -20

cd ../..

# Create tarball
echo "📦 Creating deployment tarball..."
TARBALL="/tmp/main-site-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf "$TARBALL" -C apps/main-site/dist .

echo "✅ Tarball created: $TARBALL"
echo ""

# Copy to web server
echo "📤 Uploading to web server..."
ssh o4o-webserver "mkdir -p /tmp/main-site-deploy"
scp "$TARBALL" o4o-webserver:/tmp/main-site-deploy/latest.tar.gz

# Deploy on web server
echo "🚀 Deploying on web server..."
ssh o4o-webserver << 'EOF'
  set -e

  echo "📋 Extracting files..."
  cd /tmp/main-site-deploy
  rm -rf extract
  mkdir -p extract
  tar xzf latest.tar.gz -C extract

  echo "🔍 Verifying extracted files..."
  if [ ! -f extract/index.html ]; then
    echo "❌ Error: index.html not found in tarball!"
    exit 1
  fi

  echo "💾 Backing up current deployment..."
  sudo cp -r /var/www/neture.co.kr "/var/www/neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

  echo "🗑️  Clearing current deployment..."
  sudo rm -rf /var/www/neture.co.kr/*

  echo "📦 Deploying new files..."
  sudo cp -r extract/* /var/www/neture.co.kr/

  echo "🔧 Setting permissions..."
  sudo chown -R www-data:www-data /var/www/neture.co.kr/
  sudo chmod -R 755 /var/www/neture.co.kr/

  echo "🧹 Cleaning up..."
  rm -rf /tmp/main-site-deploy

  echo "🔄 Reloading Nginx..."
  sudo systemctl reload nginx

  echo "✅ Deployment complete!"
  echo ""
  echo "📄 Deployed version:"
  if [ -f /var/www/neture.co.kr/version.json ]; then
    cat /var/www/neture.co.kr/version.json
  else
    echo "No version.json found"
  fi
EOF

echo ""
echo "✅ Main Site deployed successfully!"
echo "🌐 URL: https://neture.co.kr"
echo ""

# Clean up local tarball
rm -f "$TARBALL"
echo "🧹 Cleaned up local tarball"
