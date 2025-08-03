#!/bin/bash

# CI/CD를 위한 강력한 npm install 스크립트
set -e

echo "🚀 Starting robust npm install for CI/CD..."

# 환경 변수 설정
export NODE_OPTIONS="--max-old-space-size=4096"
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false

# 1단계: 환경 정리
echo "🧹 Step 1: Cleaning environment..."
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules packages/*/node_modules
rm -rf apps/*/dist packages/*/dist
find . -name "package.json" -path "*/dist/*" -delete 2>/dev/null || true

# 2단계: 잘못된 의존성 수정
echo "🔧 Step 2: Fixing invalid dependencies..."
for pkg in $(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*"); do
    # 백업 생성
    cp "$pkg" "${pkg}.backup" 2>/dev/null || true
    
    # "2": "..." 같은 잘못된 패턴 제거
    sed -i '/"[0-9]\+":\s*"[^"]*"/d' "$pkg" 2>/dev/null || true
    
    # 빈 dependencies/devDependencies 객체 확인 및 수정
    node -e "
        const fs = require('fs');
        const path = '$pkg';
        try {
            const content = fs.readFileSync(path, 'utf8');
            const json = JSON.parse(content);
            
            // 빈 객체 확인
            if (json.dependencies && Object.keys(json.dependencies).length === 0) {
                delete json.dependencies;
            }
            if (json.devDependencies && Object.keys(json.devDependencies).length === 0) {
                delete json.devDependencies;
            }
            
            fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
        } catch (e) {
            console.error('Error processing ' + path + ':', e.message);
        }
    "
done

# 3단계: npm install 반복 시도
echo "📦 Step 3: Installing dependencies..."
MAX_RETRIES=5
RETRY_COUNT=0
INSTALL_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Attempt $RETRY_COUNT of $MAX_RETRIES..."
    
    # npm install 시도
    if npm install --no-audit --no-fund 2>&1 | tee npm-install-attempt-${RETRY_COUNT}.log; then
        # 실제 성공 여부 확인
        if npm ls --depth=0 >/dev/null 2>&1; then
            INSTALL_SUCCESS=true
            echo "✅ npm install succeeded on attempt $RETRY_COUNT"
            break
        fi
    fi
    
    # 실패 시 에러 분석 및 수정
    echo "❌ Attempt $RETRY_COUNT failed, analyzing..."
    
    # 에러 로그 분석
    ERROR_LOG="npm-install-attempt-${RETRY_COUNT}.log"
    
    if grep -q "Cannot read properties of null" "$ERROR_LOG"; then
        echo "Fixing 'Cannot read properties of null' error..."
        find . -name "package.json" -path "*/dist/*" -delete 2>/dev/null || true
    fi
    
    if grep -q "ENOENT" "$ERROR_LOG"; then
        echo "Fixing missing file errors..."
        npm cache clean --force >/dev/null 2>&1 || true
    fi
    
    if grep -q "peer dep" "$ERROR_LOG"; then
        echo "Retrying with legacy peer deps..."
        export NPM_CONFIG_LEGACY_PEER_DEPS=true
    fi
    
    # 짧은 대기
    sleep 2
done

# 4단계: 결과 확인
if [ "$INSTALL_SUCCESS" = false ]; then
    echo "❌ npm install failed after $MAX_RETRIES attempts"
    echo "Check npm-install-attempt-*.log files for details"
    exit 1
fi

# 5단계: 패키지 빌드
echo "🔨 Step 4: Building packages..."
if ! npm run build:packages; then
    echo "❌ Package build failed"
    exit 1
fi

# 6단계: PostCSS 설정 수정
echo "🎨 Step 5: Fixing PostCSS configuration..."
for config in apps/*/postcss.config.js; do
    if [ -f "$config" ]; then
        echo "export default { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } }" > "$config"
    fi
done

# 7단계: 최종 검증
echo "✔️  Step 6: Final verification..."
if npm ls --depth=0 >/dev/null 2>&1; then
    echo "✅ All dependencies installed successfully!"
    echo "✅ Environment is ready for CI/CD!"
    
    # 설치된 패키지 요약
    echo ""
    echo "📊 Installation summary:"
    echo "- Root dependencies: $(npm ls --depth=0 --json | jq '.dependencies | length' 2>/dev/null || echo 'N/A')"
    echo "- Total packages: $(find node_modules -name "package.json" | wc -l)"
    echo "- Workspaces: $(ls -d apps/*/ packages/*/ 2>/dev/null | wc -l)"
    
    exit 0
else
    echo "❌ Final verification failed"
    exit 1
fi