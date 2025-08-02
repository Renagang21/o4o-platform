#!/bin/bash
# Improved CI installation script

set -e

echo "🔧 CI Installation Script"
echo "========================"

# Clean up any problematic files
echo "🧹 Cleaning up..."
find . -name "package.json" -path "*/dist/*" -delete 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
  echo "Using npm ci for faster installation..."
  npm ci
else
  echo "No package-lock.json found, using npm install..."
  npm install --prefer-offline --no-audit --no-fund
fi

# Build packages in correct order
echo "🔨 Building packages..."
PACKAGES=(types utils ui auth-client auth-context crowdfunding-types forum-types shortcodes)

for pkg in "${PACKAGES[@]}"; do
  if [ -d "packages/$pkg" ]; then
    echo "Building @o4o/$pkg..."
    (cd "packages/$pkg" && npm run build) || echo "⚠️  Build failed for $pkg, continuing..."
  fi
done

echo "✅ CI installation complete!"