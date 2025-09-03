#!/bin/bash
# Fixed CI/CD installation script for pnpm

set -e

echo "🚀 Starting Fixed CI installation (pnpm)..."
echo "📍 Current directory: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 npm version: $(npm --version)"

# Check if pnpm is available (installed by GitHub Actions)
if command -v pnpm &> /dev/null; then
    echo "✅ pnpm is available: $(pnpm --version)"
else
    echo "⚠️ pnpm not found, installing globally..."
    npm install -g pnpm@latest
    echo "✅ pnpm installed: $(pnpm --version)"
fi

# Clean workspace node_modules (important for monorepo)
echo "🧹 Cleaning workspace node_modules..."
find . -name "node_modules" -type d -prune -not -path "./node_modules" -exec rm -rf {} + 2>/dev/null || true

# Check for pnpm-lock.yaml
if [ -f "pnpm-lock.yaml" ]; then
    echo "✅ Found pnpm-lock.yaml"
    LOCK_EXISTS=true
else
    echo "⚠️ pnpm-lock.yaml not found"
    LOCK_EXISTS=false
fi

# Install dependencies
echo "📦 Installing dependencies..."
if [ "$CI" = "true" ] && [ "$LOCK_EXISTS" = "true" ]; then
    echo "Using frozen-lockfile for CI..."
    pnpm install --frozen-lockfile --prefer-offline 
else
    echo "Using regular install..."
    pnpm install --prefer-offline 
fi

# Verify installation
echo "🔍 Verifying installation..."
if [ -d "node_modules" ]; then
    echo "✅ Root node_modules exists"
else
    echo "❌ Root node_modules missing!"
    exit 1
fi

# Clean workspace node_modules again (pnpm hoists to root)
echo "🧹 Final cleanup of workspace node_modules..."
for dir in apps/* packages/*; do
  if [ -d "$dir/node_modules" ]; then
    echo "  Removing $dir/node_modules"
    rm -rf "$dir/node_modules"
  fi
done

echo "✅ Fixed CI installation completed successfully!"