#!/bin/bash

# CI Build App Script
# Builds specific applications or all apps based on parameter

set -e  # Exit on error

APP_NAME=$1

# Set Node.js memory limit for builds
export NODE_OPTIONS="--max-old-space-size=4096"

echo "🚀 Starting CI build process..."
echo "📊 Node memory limit: 4GB"

# Function to build packages first
build_packages() {
    echo "📦 Building packages..."
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm run build:packages || npm run build:packages
    else
        npm run build:packages
    fi
}

# Function to build specific app
build_app() {
    local app=$1
    echo "🔨 Building app: $app"
    
    case $app in
        "admin"|"admin-dashboard")
            echo "Building Admin Dashboard..."
            cd apps/admin-dashboard
            # Apply CI build optimizations
            if [ -f "ci.build.config" ]; then
                echo "📝 Applying CI build optimizations..."
                # Export environment variables from config
                export $(cat ci.build.config | grep -v '^#' | xargs)
            fi
            if [ -f "../../pnpm-lock.yaml" ]; then
                pnpm run build
            else
                npm run build
            fi
            cd ../..
            ;;
        "storefront")
            echo "Building Storefront..."
            cd apps/storefront
            if [ -f "../../pnpm-lock.yaml" ]; then
                pnpm run build
            else
                npm run build
            fi
            cd ../..
            ;;
        "api"|"api-server")
            echo "Building API Server..."
            cd apps/api-server
            if [ -f "../../pnpm-lock.yaml" ]; then
                pnpm run build
            else
                npm run build
            fi
            cd ../..
            ;;
        "main"|"main-site")
            echo "Building Main Site..."
            cd apps/main-site
            if [ -f "../../pnpm-lock.yaml" ]; then
                pnpm run build
            else
                npm run build
            fi
            cd ../..
            ;;
        "crowdfunding"|"forum"|"ecommerce"|"signage"|"digital-signage"|"affiliate"|"vendors")
            # All these are part of admin-dashboard
            echo "Building ${app} components (admin-dashboard module)..."
            cd apps/admin-dashboard
            # Apply CI build optimizations
            if [ -f "ci.build.config" ]; then
                echo "📝 Applying CI build optimizations..."
                # Export environment variables from config
                export $(cat ci.build.config | grep -v '^#' | xargs)
            fi
            if [ -f "../../pnpm-lock.yaml" ]; then
                pnpm run build
            else
                npm run build
            fi
            cd ../..
            ;;
        "all")
            echo "Building all applications..."
            if [ -f "pnpm-lock.yaml" ]; then
                pnpm run build:apps
            else
                npm run build:apps
            fi
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
    build_packages
    build_app "all"
else
    echo "📱 Building specific app: $APP_NAME"
    build_packages
    build_app "$APP_NAME"
fi

echo "✅ Build completed successfully!"
exit 0