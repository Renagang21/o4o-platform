#!/bin/bash

# CI Build App Script
# Builds specific applications or all apps based on parameter

set -e  # Exit on error

APP_NAME=$1

# Set Node.js memory limit for builds
export NODE_OPTIONS="--max-old-space-size=4096"

echo "🚀 Starting CI build process..."
echo "📊 Node memory limit: 4GB"

# Build packages first (always rebuild in CI to ensure fresh build)
echo "📦 Building packages..."
pnpm run build:packages
echo "✅ Packages built successfully"
echo ""
echo "🔍 Verifying @o4o/shortcodes build..."
if [ -f "packages/shortcodes/dist/index.js" ]; then
    echo "✅ packages/shortcodes/dist/index.js exists"
    ls -lh packages/shortcodes/dist/ | head -10
else
    echo "❌ packages/shortcodes/dist/index.js NOT FOUND"
    echo "📂 Listing packages/shortcodes/:"
    ls -la packages/shortcodes/
    exit 1
fi
echo ""

# Function to build specific app
build_app() {
    local app=$1
    echo "🔨 Building app: $app"
    
    case $app in
        "admin"|"admin-dashboard")
            echo "Building Admin Dashboard..."
            # Apply CI build optimizations if config exists
            if [ -f "apps/admin-dashboard/ci.build.config" ]; then
                echo "📝 Applying CI build optimizations..."
                export $(cat apps/admin-dashboard/ci.build.config | grep -v '^#' | xargs)
            fi
            pnpm --filter=@o4o/admin-dashboard run build
            ;;
        "storefront")
            echo "Building Storefront..."
            pnpm --filter=@o4o/storefront run build
            ;;
        "api"|"api-server")
            echo "Building API Server..."
            cd apps/api-server
            pnpm run build
            cd ../..
            ;;
        "main"|"main-site")
            echo "Building Main Site..."
            cd apps/main-site
            pnpm run build
            cd ../..
            ;;
        "crowdfunding"|"forum"|"ecommerce"|"signage"|"digital-signage"|"affiliate"|"vendors")
            # All these are part of admin-dashboard
            echo "Building ${app} components (admin-dashboard module)..."
            # Apply CI build optimizations if config exists
            if [ -f "apps/admin-dashboard/ci.build.config" ]; then
                echo "📝 Applying CI build optimizations..."
                export $(cat apps/admin-dashboard/ci.build.config | grep -v '^#' | xargs)
            fi
            pnpm --filter=@o4o/admin-dashboard run build
            ;;
        "all")
            echo "Building all applications..."
            pnpm run build:apps
            ;;
        *)
            echo "⚠️ Unknown app: $app"
            echo "Valid options: admin, storefront, api, main, crowdfunding, forum, ecommerce, signage/digital-signage, affiliate, vendors, all"
            exit 1
            ;;
    esac
}

# Main execution
if [ -z "$APP_NAME" ]; then
    echo "⚠️ No app specified. Building all apps..."
    build_app "all"
else
    echo "📱 Building specific app: $APP_NAME"
    build_app "$APP_NAME"
fi

echo "✅ Build completed successfully!"
exit 0