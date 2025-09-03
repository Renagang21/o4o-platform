#!/bin/bash

# pnpm install 에러를 완전히 해결할 때까지 반복하는 스크립트
echo "🔧 Starting pnpm install error fix loop..."

MAX_ATTEMPTS=10
attempt=0
success=false

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 에러 수정 함수
fix_common_errors() {
    echo -e "${YELLOW}🔍 Checking and fixing common pnpm install errors...${NC}"
    
    # 1. dist 폴더의 package.json 제거
    echo "Removing package.json files from dist folders..."
    find . -name "package.json" -path "*/dist/*" -delete 2>/dev/null
    
    # 2. 잘못된 숫자 의존성 제거
    echo "Checking for invalid numeric dependencies..."
    for pkg in $(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*"); do
        if grep -E '"[0-9]+":\s*"' "$pkg" >/dev/null 2>&1; then
            echo "Fixing invalid dependency in $pkg"
            # 백업 생성
            cp "$pkg" "${pkg}.backup"
            # "2": "..." 같은 패턴 제거
            sed -i '/"[0-9]\+":\s*"/d' "$pkg"
        fi
    done
    
    # 3. node_modules 정리
    echo "Cleaning node_modules..."
    rm -rf node_modules/.cache 2>/dev/null
    
    # 4. package-lock.json 문제 해결
    if [ -f "package-lock.json" ]; then
        echo "Checking package-lock.json integrity..."
        # 손상된 경우 재생성
        if ! npm ls >/dev/null 2>&1; then
            echo "package-lock.json seems corrupted, regenerating..."
            rm -f package-lock.json
        fi
    fi
    
    # 5. 워크스페이스 링크 문제 해결
    echo "Fixing workspace links..."
    # 모든 워크스페이스의 node_modules 심볼릭 링크 확인
    for workspace in apps/* packages/*; do
        if [ -d "$workspace" ] && [ -L "$workspace/node_modules" ]; then
            # 깨진 심볼릭 링크 제거
            if [ ! -e "$workspace/node_modules" ]; then
                echo "Removing broken symlink: $workspace/node_modules"
                rm -f "$workspace/node_modules"
            fi
        fi
    done
}

# pnpm install 시도 함수
try_npm_install() {
    echo -e "${YELLOW}🚀 Attempt $((attempt + 1))/${MAX_ATTEMPTS}: Running pnpm install...${NC}"
    
    # pnpm install 실행하고 에러 캡처
    if pnpm install 2>&1 | tee npm-install.log; then
        # 성공 확인 (실제로 성공했는지 다시 체크)
        if npm ls >/dev/null 2>&1; then
            echo -e "${GREEN}✅ pnpm install succeeded!${NC}"
            return 0
        fi
    fi
    
    # 에러 분석
    echo -e "${RED}❌ pnpm install failed. Analyzing errors...${NC}"
    
    # 특정 에러 패턴 확인 및 수정
    if grep -q "Cannot read properties of null" npm-install.log; then
        echo "Found 'Cannot read properties of null' error"
        fix_common_errors
    fi
    
    if grep -q "Invalid package name" npm-install.log; then
        echo "Found invalid package name error"
        fix_common_errors
    fi
    
    if grep -q "ENOENT" npm-install.log; then
        echo "Found missing file error"
        # 캐시 클리어
        npm cache clean --force
    fi
    
    if grep -q "peer dep" npm-install.log; then
        echo "Found peer dependency issues"
        # legacy peer deps 모드로 재시도할 준비
        export NPM_CONFIG_LEGACY_PEER_DEPS=true
    fi
    
    return 1
}

# 메인 루프
while [ $attempt -lt $MAX_ATTEMPTS ]; do
    attempt=$((attempt + 1))
    
    # 에러 수정
    fix_common_errors
    
    # pnpm install 시도
    if try_npm_install; then
        success=true
        break
    fi
    
    # 실패 시 대기
    echo -e "${YELLOW}Waiting 2 seconds before next attempt...${NC}"
    sleep 2
done

# 결과 출력
if [ "$success" = true ]; then
    echo -e "${GREEN}🎉 pnpm install completed successfully after $attempt attempts!${NC}"
    
    # 패키지 빌드
    echo -e "${YELLOW}📦 Building packages...${NC}"
    pnpm run build:packages
    
    # 최종 확인
    echo -e "${GREEN}✅ All done! Your environment is ready.${NC}"
    exit 0
else
    echo -e "${RED}❌ Failed to complete pnpm install after $MAX_ATTEMPTS attempts.${NC}"
    echo "Please check npm-install.log for details."
    echo ""
    echo "Common solutions:"
    echo "1. Delete node_modules and package-lock.json, then try again"
    echo "2. Clear npm cache: npm cache clean --force"
    echo "3. Use  flag: pnpm install "
    echo "4. Check Node.js version: node --version (should be 22.18.0)"
    exit 1
fi