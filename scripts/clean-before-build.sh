#!/bin/bash
# 빌드 전 불필요한 파일 정리 스크립트

echo "🧹 Cleaning before build..."
echo "==========================="
echo ""

# 정리 시작 시간
START_TIME=$(date +%s)

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 정리할 디렉토리 확인
echo "📁 Checking directories to clean..."
echo "-----------------------------------"

# 1. Node.js 캐시 정리
if [ -d "node_modules/.cache" ]; then
    SIZE=$(du -sh node_modules/.cache 2>/dev/null | cut -f1)
    echo -e "  ${YELLOW}→${NC} Removing node_modules/.cache (${SIZE})..."
    rm -rf node_modules/.cache
    echo -e "    ${GREEN}✓${NC} Cleaned"
else
    echo -e "  ${GREEN}✓${NC} node_modules/.cache not found (already clean)"
fi

# 2. Vite 캐시 정리
if [ -d "node_modules/.vite" ]; then
    SIZE=$(du -sh node_modules/.vite 2>/dev/null | cut -f1)
    echo -e "  ${YELLOW}→${NC} Removing node_modules/.vite (${SIZE})..."
    rm -rf node_modules/.vite
    echo -e "    ${GREEN}✓${NC} Cleaned"
else
    echo -e "  ${GREEN}✓${NC} node_modules/.vite not found (already clean)"
fi

# 3. 앱별 캐시 정리
echo ""
echo "🗂️ Cleaning app-specific caches..."
echo "-----------------------------------"

for app_dir in apps/*; do
    if [ -d "$app_dir" ]; then
        app_name=$(basename "$app_dir")
        
        # Vite 캐시 정리
        if [ -d "$app_dir/.vite-cache" ]; then
            SIZE=$(du -sh "$app_dir/.vite-cache" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $app_name/.vite-cache (${SIZE})..."
            rm -rf "$app_dir/.vite-cache"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
        
        # TypeScript 빌드 정보 정리
        if [ -f "$app_dir/.tsbuildinfo" ]; then
            SIZE=$(du -sh "$app_dir/.tsbuildinfo" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $app_name/.tsbuildinfo (${SIZE})..."
            rm -f "$app_dir/.tsbuildinfo"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
        
        # node_modules 내부 캐시 정리
        if [ -d "$app_dir/node_modules/.vite" ]; then
            SIZE=$(du -sh "$app_dir/node_modules/.vite" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $app_name/node_modules/.vite (${SIZE})..."
            rm -rf "$app_dir/node_modules/.vite"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
        
        if [ -d "$app_dir/node_modules/.cache" ]; then
            SIZE=$(du -sh "$app_dir/node_modules/.cache" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $app_name/node_modules/.cache (${SIZE})..."
            rm -rf "$app_dir/node_modules/.cache"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
    fi
done

# 4. 패키지별 캐시 정리
echo ""
echo "📦 Cleaning package caches..."
echo "-----------------------------"

for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ]; then
        pkg_name=$(basename "$pkg_dir")
        
        # TypeScript 빌드 정보 정리
        if [ -f "$pkg_dir/.tsbuildinfo" ]; then
            SIZE=$(du -sh "$pkg_dir/.tsbuildinfo" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $pkg_name/.tsbuildinfo (${SIZE})..."
            rm -f "$pkg_dir/.tsbuildinfo"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
        
        # 패키지 캐시 정리
        if [ -d "$pkg_dir/node_modules/.cache" ]; then
            SIZE=$(du -sh "$pkg_dir/node_modules/.cache" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $pkg_name/node_modules/.cache (${SIZE})..."
            rm -rf "$pkg_dir/node_modules/.cache"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
    fi
done

# 5. 임시 파일 정리
echo ""
echo "🗑️ Cleaning temporary files..."
echo "------------------------------"

# npm/yarn 로그 정리
if ls npm-debug.log* 1> /dev/null 2>&1; then
    echo -e "  ${YELLOW}→${NC} Removing npm debug logs..."
    rm -f npm-debug.log*
    echo -e "    ${GREEN}✓${NC} Cleaned"
fi

if ls yarn-error.log* 1> /dev/null 2>&1; then
    echo -e "  ${YELLOW}→${NC} Removing yarn error logs..."
    rm -f yarn-error.log*
    echo -e "    ${GREEN}✓${NC} Cleaned"
fi

# .DS_Store 파일 정리 (macOS)
if find . -name ".DS_Store" -type f 2>/dev/null | grep -q .; then
    COUNT=$(find . -name ".DS_Store" -type f 2>/dev/null | wc -l)
    echo -e "  ${YELLOW}→${NC} Removing ${COUNT} .DS_Store files..."
    find . -name ".DS_Store" -type f -delete 2>/dev/null
    echo -e "    ${GREEN}✓${NC} Cleaned"
fi

# 6. 선택적 정리 (dist 폴더)
echo ""
read -p "❓ Do you want to clean dist folders as well? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🏗️ Cleaning dist folders..."
    echo "---------------------------"
    
    # apps의 dist 폴더 정리
    for app_dir in apps/*/dist; do
        if [ -d "$app_dir" ]; then
            app_name=$(basename $(dirname "$app_dir"))
            SIZE=$(du -sh "$app_dir" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $app_name/dist (${SIZE})..."
            rm -rf "$app_dir"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
    done
    
    # packages의 dist 폴더 정리
    for pkg_dir in packages/*/dist; do
        if [ -d "$pkg_dir" ]; then
            pkg_name=$(basename $(dirname "$pkg_dir"))
            SIZE=$(du -sh "$pkg_dir" 2>/dev/null | cut -f1)
            echo -e "  ${YELLOW}→${NC} Removing $pkg_name/dist (${SIZE})..."
            rm -rf "$pkg_dir"
            echo -e "    ${GREEN}✓${NC} Cleaned"
        fi
    done
fi

# 정리 완료 시간 계산
END_TIME=$(date +%s)
CLEAN_TIME=$((END_TIME - START_TIME))

echo ""
echo "==========================="
echo -e "${GREEN}✅ Cleanup completed in ${CLEAN_TIME} seconds!${NC}"
echo ""

# 디스크 공간 확인
echo "💾 Disk space after cleanup:"
echo "----------------------------"
df -h . | grep -v Filesystem

echo ""
echo "📝 Note: Run 'pnpm install' if you encounter any missing dependencies after cleanup."
echo ""