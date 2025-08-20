#!/bin/bash
# 분할 설치 스크립트 - npm ci가 타임아웃되는 문제 해결

set -e

echo "🔧 Starting split installation process..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 먼저 루트 의존성만 설치
echo -e "${YELLOW}Step 1: Installing root dependencies...${NC}"
npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund 2>/dev/null || {
    echo "Root installation failed, trying npm install..."
    npm install --legacy-peer-deps --no-audit --no-fund
}

# 2. packages 폴더의 각 패키지 개별 설치
echo -e "${YELLOW}Step 2: Installing package dependencies...${NC}"

# Core packages
CORE_PACKAGES=("types" "utils" "ui" "auth-client" "auth-context" "crowdfunding-types" "forum-types" "shortcodes" "block-core")

for pkg in "${CORE_PACKAGES[@]}"; do
    if [ -d "packages/$pkg" ]; then
        echo "  📦 Installing @o4o/$pkg..."
        (cd "packages/$pkg" && npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund)
    fi
done

# 3. Block packages 설치
echo -e "${YELLOW}Step 3: Installing block packages...${NC}"

BLOCK_PACKAGES=("text-content" "layout-media" "interactive" "dynamic")

for pkg in "${BLOCK_PACKAGES[@]}"; do
    if [ -d "packages/blocks/$pkg" ]; then
        echo "  🧩 Installing @o4o/$pkg-blocks..."
        (cd "packages/blocks/$pkg" && npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund)
    fi
done

# 4. Apps 폴더의 각 앱 개별 설치
echo -e "${YELLOW}Step 4: Installing app dependencies...${NC}"

APPS=("api-server" "main-site" "admin-dashboard" "ecommerce" "crowdfunding" "digital-signage")

for app in "${APPS[@]}"; do
    if [ -d "apps/$app" ]; then
        echo "  🚀 Installing $app..."
        (cd "apps/$app" && npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund)
    fi
done

# 5. 포스트 설치 스크립트 실행
echo -e "${YELLOW}Step 5: Running post-install scripts...${NC}"
npm run postinstall 2>/dev/null || true

echo -e "${GREEN}✅ Split installation completed successfully!${NC}"