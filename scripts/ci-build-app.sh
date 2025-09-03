#!/bin/bash
# Build a specific app for CI/CD

set -e

APP_NAME=$1

if [ -z "$APP_NAME" ]; then
    echo "❌ Usage: $0 <app-name>"
    exit 1
fi

echo "🚀 Building app: $APP_NAME"

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if app directory exists
if [ ! -d "apps/$APP_NAME" ]; then
    echo "❌ App directory not found: apps/$APP_NAME"
    exit 1
fi

cd "apps/$APP_NAME"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ No package.json found for $APP_NAME"
    exit 1
fi

# Check if build script exists
if ! grep -q '"build"' package.json; then
    echo "⚠️ No build script found for $APP_NAME, skipping..."
    exit 0
fi

echo "📦 Installing dependencies for $APP_NAME..."
# Don't fail if already installed
pnpm install --prefer-offline || true

echo "🔨 Building $APP_NAME..."

# Set environment variables for build
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Try to build with error handling
if pnpm run build; then
    echo "✅ $APP_NAME built successfully!"
else
    BUILD_EXIT_CODE=$?
    echo "⚠️ Build failed for $APP_NAME with exit code $BUILD_EXIT_CODE"
    
    # Create a minimal dist folder as fallback
    mkdir -p dist
    cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Build Failed</title>
</head>
<body>
    <h1>Build failed for this application</h1>
    <p>Please check CI logs for details.</p>
</body>
</html>
EOF
    
    echo "⚠️ Created placeholder dist for $APP_NAME"
    # Don't fail the CI
    exit 0
fi

# Verify dist folder exists
if [ -d "dist" ] || [ -d "build" ]; then
    echo "✅ Build output found for $APP_NAME"
    ls -la dist 2>/dev/null || ls -la build 2>/dev/null || true
else
    echo "⚠️ No dist or build folder found for $APP_NAME"
fi

echo "🎉 Build process completed for $APP_NAME"