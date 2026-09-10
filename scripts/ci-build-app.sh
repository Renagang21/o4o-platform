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
# WO-O4O-CI-INSTALL-LOCKFILE-DRIFT-REPRODUCIBILITY-CLOSURE-V1
# 과거에는 비-frozen `pnpm install` 이었다. 그 경우 lockfile 이 워크스페이스와
# 어긋나 있으면(예: 삭제된 서비스의 stale importer) pnpm 이 전면 재해석을 수행해
# 추적 파일 `pnpm-lock.yaml` 을 빌드 도중 말없이 고쳐 썼다.
# CI 에서는 커밋되지 않아 보이지 않고, 로컬에서는 무관한 diff 로 남는다.
# 설치가 필요한 standalone 실행은 계속 지원하되 lockfile 은 절대 갱신하지 않는다.
echo "🔗 Verifying workspace dependencies (frozen)..."
pnpm install --frozen-lockfile
echo "✅ Workspace dependencies verified"
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
        "api"|"api-server")
            echo "Building API Server..."
            cd apps/api-server
            pnpm run build
            cd ../..
            ;;
        "forum"|"ecommerce"|"signage"|"digital-signage"|"affiliate"|"vendors")
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
            echo "Valid options: admin, api, forum, ecommerce, signage/digital-signage, affiliate, vendors, all"
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