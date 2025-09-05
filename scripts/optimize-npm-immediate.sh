#!/bin/bash
# 즉시 적용 가능한 pnpm 최적화 스크립트

set -e

echo "⚡ pnpm 즉시 최적화 시작..."

# 1. pnpm 캐시 정리
echo "🧹 pnpm 캐시 정리 중..."
pnpm store prune

# 2. 최적화된 .npmrc 생성 (pnpm 호환)
echo "📝 .npmrc 최적화 설정 적용 (pnpm 호환)..."
cat > .npmrc << 'EOF'
# 성능 최적화
registry=https://registry.npmjs.org/
loglevel=warn
progress=false
audit=false
fund=false

# Monorepo 최적화
legacy-peer-deps=true
package-lock=true
save-exact=true

# 네트워크 최적화
fetch-retries=2
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000

# 캐시 최적화
prefer-offline=true

# Workspace 최적화
workspaces-update=false
install-links=true
EOF

# 3. 선택적 설치 함수
install_selective() {
    echo "📦 선택적 설치 옵션:"
    echo "1) Admin Dashboard만"
    echo "2) API Server만"
    echo "3) Main Site만"
    echo "4) 패키지만"
    echo "5) 전체 설치"
    read -p "선택 (1-5): " choice
    
    case $choice in
        1)
            echo "Installing Admin Dashboard..."
            pnpm install --workspace=@o4o/admin-dashboard
            ;;
        2)
            echo "Installing API Server..."
            cd apps/api-server && pnpm install && cd ../..
            ;;
        3)
            echo "Installing Main Site..."
            pnpm install --workspace=@o4o/main-site
            ;;
        4)
            echo "Installing Packages only..."
            pnpm install --workspaces --if-present --include-workspace-root=false
            ;;
        5)
            echo "Installing everything..."
            pnpm install 
            ;;
        *)
            echo "잘못된 선택"
            exit 1
            ;;
    esac
}

# 4. 실행
echo "✅ npm 최적화 설정 완료!"
echo ""
echo "다음 명령어를 실행하여 효과를 확인하세요:"
echo "  pnpm install"
echo ""
echo "또는 선택적 설치를 원하시면:"
echo "  ./scripts/optimize-npm-immediate.sh --selective"

# 선택적 설치 모드
if [[ "$1" == "--selective" ]]; then
    install_selective
fi