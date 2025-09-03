#!/bin/bash

# CI Build App Script
# Builds specific applications or all apps based on parameter

set -e  # Exit on error

APP_NAME=$1

echo "🚀 Starting CI build process..."

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
        "crowdfunding")
            echo "Building Crowdfunding components..."
            # Crowdfunding is part of admin-dashboard, build admin
            cd apps/admin-dashboard
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
            echo "Valid options: admin, storefront, api, main, crowdfunding, all"
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