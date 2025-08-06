#!/bin/bash

# Server build script for production deployment
# This script ensures a clean and stable build process

set -e  # Exit on error

echo "🚀 Starting server build process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf packages/*/dist packages/*/tsconfig.tsbuildinfo
rm -rf apps/*/dist apps/*/tsconfig.tsbuildinfo

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build packages in order
echo "📦 Building packages..."
npm run build --workspace=@o4o/types
npm run build --workspace=@o4o/utils
npm run build --workspace=@o4o/ui
npm run build --workspace=@o4o/auth-client
npm run build --workspace=@o4o/auth-context
npm run build --workspace=@o4o/crowdfunding-types
npm run build --workspace=@o4o/forum-types
npm run build --workspace=@o4o/shortcodes

# Build API server
echo "🔨 Building API server..."
npm run build --workspace=@o4o/api-server

# Build frontend apps
echo "🎨 Building frontend apps..."
npm run build --workspace=@o4o/main-site
npm run build --workspace=@o4o/admin-dashboard
npm run build --workspace=@o4o/ecommerce

echo "✅ Build completed successfully!"
echo "📊 Build summary:"
echo "  - All packages built"
echo "  - API server built"
echo "  - Frontend apps built"
echo ""
echo "Next steps:"
echo "  1. Update environment files"
echo "  2. Run migrations: npm run migration:run --workspace=@o4o/api-server"
echo "  3. Restart services with PM2"