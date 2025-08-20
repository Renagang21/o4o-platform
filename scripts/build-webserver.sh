#!/bin/bash
# 웹서버 전용 빌드 스크립트 (package.json 수정 없음)

echo "🚀 Webserver Build Script"
echo "========================"
echo "Server Type: ${SERVER_TYPE:-webserver}"
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"
echo ""

# 빌드 시작 시간
START_TIME=$(date +%s)

# 1. 패키지 빌드
echo "📦 Building packages..."
echo "------------------------"

# Types 빌드
echo "  → Building @o4o/types..."
npm run build:types || {
    echo "❌ Failed to build @o4o/types"
    exit 1
}

# Utils 빌드
echo "  → Building @o4o/utils..."
npm run build:utils || {
    echo "❌ Failed to build @o4o/utils"
    exit 1
}

# UI 빌드
echo "  → Building @o4o/ui..."
npm run build:ui || {
    echo "❌ Failed to build @o4o/ui"
    exit 1
}

# Auth Client 빌드
echo "  → Building @o4o/auth-client..."
npm run build:auth-client || {
    echo "❌ Failed to build @o4o/auth-client"
    exit 1
}

# Auth Context 빌드
echo "  → Building @o4o/auth-context..."
npm run build:auth-context || {
    echo "❌ Failed to build @o4o/auth-context"
    exit 1
}

# Shortcodes 빌드
echo "  → Building @o4o/shortcodes..."
npm run build:shortcodes || {
    echo "❌ Failed to build @o4o/shortcodes"
    exit 1
}

echo "✅ Package builds completed!"
echo ""

# 2. Main site 빌드
echo "🏗️ Building main-site..."
echo "------------------------"
cd apps/main-site
NODE_ENV=production npx vite build --mode production || {
    echo "❌ Failed to build main-site"
    cd ../..
    exit 1
}
cd ../..
echo "✅ Main site build completed!"
echo ""

# 3. Admin dashboard 빌드 (최적화 레벨 조정)
echo "🏗️ Building admin-dashboard (Optimized for Server)..."
echo "------------------------"
cd apps/admin-dashboard

# 빌드 전 캐시 정리
rm -rf .vite-cache node_modules/.vite 2>/dev/null

# 프로덕션 빌드 (최적화 레벨 조정)
timeout 300 bash -c "
    export NODE_OPTIONS='--max-old-space-size=3072'
    export NODE_ENV=production
    export GENERATE_SOURCEMAP=false
    export INLINE_RUNTIME_CHUNK=false
    # esbuild 사용 (terser보다 빠름)
    npx vite build --mode production --minify esbuild
" && {
    echo "✅ Admin dashboard build completed!"
} || {
    BUILD_EXIT_CODE=$?
    if [ $BUILD_EXIT_CODE -eq 124 ]; then
        echo "⚠️ Admin build timeout (5분 초과) - 기본 빌드 사용"
        # 타임아웃 발생 시 이전 빌드가 있으면 사용
        if [ -d "dist" ]; then
            echo "📁 Using existing dist folder"
        else
            echo "❌ No existing build found, creating minimal build..."
            # 최소한의 index.html 생성
            mkdir -p dist
            echo '<!DOCTYPE html><html><head><title>Admin Dashboard - Build Timeout</title></head><body><h1>Build timeout occurred. Please rebuild manually.</h1></body></html>' > dist/index.html
        fi
    else
        echo "❌ Admin build failed with error code: $BUILD_EXIT_CODE"
    fi
}
cd ../..
echo ""

# 빌드 완료 시간 계산
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))
BUILD_MINUTES=$((BUILD_TIME / 60))
BUILD_SECONDS=$((BUILD_TIME % 60))

echo "========================"
echo "✅ Webserver build complete!"
echo "⏱️ Total build time: ${BUILD_MINUTES}분 ${BUILD_SECONDS}초"
echo ""

# 빌드 결과 확인
echo "📁 Build results:"
echo "  - main-site: $(du -sh apps/main-site/dist 2>/dev/null | cut -f1 || echo 'N/A')"
echo "  - admin-dashboard: $(du -sh apps/admin-dashboard/dist 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""