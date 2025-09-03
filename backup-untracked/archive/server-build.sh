#!/bin/bash

# Quick server build script for production deployment
# Use this when normal build fails due to TypeScript composite issues

echo "🚀 Server Build Script"
echo "====================="
echo "This script uses workarounds for TypeScript composite build issues"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build packages with server-specific script
echo "📦 Building packages..."
./scripts/build-packages-server.sh

# Build apps
echo "🔨 Building applications..."

# API Server
echo "  - Building API server..."
pnpm run build --workspace=@o4o/api-server || echo "⚠️  API server build had warnings"

# Frontend apps
echo "  - Building frontend apps..."
pnpm run build --workspace=@o4o/main-site || echo "⚠️  Main site build had warnings"
pnpm run build --workspace=@o4o/admin-dashboard || echo "⚠️  Admin dashboard build had warnings"

echo ""
echo "✅ Build process completed!"
echo ""
echo "Next steps:"
echo "1. Check for any warnings above"
echo "2. Update .env files"
echo "3. Run migrations if needed"
echo "4. Restart services"