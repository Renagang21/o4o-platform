#!/bin/bash

# CI Build App Script
# Builds specific applications or all apps based on parameter

set -e  # Exit on error

APP_NAME=$1

# Set Node.js memory limit for builds
export NODE_OPTIONS="--max-old-space-size=4096"

echo "🚀 Starting CI build process..."
echo "📊 Node memory limit: 4GB"

# WO-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1
# 같은 runner 에서 이미 install + package build 를 끝냈다면 여기서 다시 하지 않는다.
#
#   기존 CI 경로: setup-build-env(install) → Admin dependency closure build
#                 → 이 스크립트가 build:packages **전체** + install 재실행 → Admin build
#
# `O4O_PACKAGES_PREBUILT=1` 은 이미 저장소 규약이다 — `.github/actions/setup-build-env`
# 가 package 빌드 후 설정하고 `scripts/dev.mjs` 가 같은 의미로 읽는다. 이 표식은
# **항상 install 이 선행된 뒤에만** 설정되므로 install 재실행도 함께 건너뛸 수 있다.
# 표식이 없는 standalone 실행(로컬 · 수동)은 기존 동작 그대로다.
if [ "${O4O_PACKAGES_PREBUILT:-}" = "1" ]; then
  echo "⏭️ O4O_PACKAGES_PREBUILT=1 — 같은 runner 의 install / build:packages 재실행을 건너뜁니다"
  echo ""
else
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
fi

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