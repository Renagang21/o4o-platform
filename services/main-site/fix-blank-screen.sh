#!/bin/bash

# 백지 화면 문제 해결을 위한 완전 클린 빌드 스크립트
# 실행: bash fix-blank-screen.sh

echo "🚀 O4O Platform 백지 화면 해결 시작..."
echo "=================================="

# 작업 디렉토리 확인
cd /home/ubuntu/o4o-platform/services/main-site/
echo "📍 작업 디렉토리: $(pwd)"

# 1. 모든 캐시와 빌드 파일 완전 삭제
echo ""
echo "🧹 캐시 및 빌드 파일 삭제 중..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite
rm -rf node_modules/.cache
echo "✅ 캐시 삭제 완료"

# 2. node_modules 삭제 및 재설치
echo ""
echo "📦 node_modules 재설치 중..."
rm -rf node_modules
rm -f package-lock.json
npm ci
echo "✅ 패키지 재설치 완료"

# 3. 환경변수 설정
echo ""
echo "🔧 환경변수 설정 중..."
export NODE_ENV=production
export VITE_NODE_ENV=production

# .env.production 파일 생성
cat > .env.production << EOF
NODE_ENV=production
VITE_NODE_ENV=production
VITE_API_URL=https://api.neture.co.kr
EOF
echo "✅ 환경변수 설정 완료"

# 4. 프로덕션 빌드
echo ""
echo "🏗️  프로덕션 빌드 시작..."
NODE_ENV=production npm run build

# 빌드 성공 확인
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ 빌드 성공!"
    echo ""
    echo "📊 빌드 결과:"
    ls -lah dist/
    echo ""
    echo "📦 assets 디렉토리:"
    ls -lah dist/assets/
else
    echo "❌ 빌드 실패!"
    exit 1
fi

# 5. 빌드된 파일에서 개발 모드 흔적 검사
echo ""
echo "🔍 빌드 파일 검증 중..."
if [ -f dist/assets/*.js ]; then
    JS_FILE=$(find dist/assets -name "*.js" | head -1)
    echo "검사 중인 파일: $JS_FILE"
    
    # 개발 모드 키워드 검색
    DEV_KEYWORDS=("node_modules" ".vite" "hot" "hmr" "localhost:3000")
    FOUND_ISSUES=false
    
    for keyword in "${DEV_KEYWORDS[@]}"; do
        if grep -qi "$keyword" "$JS_FILE"; then
            echo "⚠️  경고: '$keyword' 키워드 발견됨"
            FOUND_ISSUES=true
        fi
    done
    
    if [ "$FOUND_ISSUES" = false ]; then
        echo "✅ 프로덕션 빌드 검증 통과"
    fi
fi

# 6. 배포
echo ""
echo "🚀 프로덕션 배포 중..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# 7. nginx 재시작
echo ""
echo "🔄 Nginx 재시작 중..."
sudo systemctl reload nginx

# 8. 최종 확인
echo ""
echo "✨ 작업 완료!"
echo "=================================="
echo "📋 최종 체크리스트:"
echo "✅ 캐시 완전 삭제"
echo "✅ 패키지 재설치"
echo "✅ 프로덕션 빌드"
echo "✅ 파일 검증"
echo "✅ 배포 완료"
echo "✅ Nginx 재시작"
echo ""
echo "🌐 브라우저에서 확인: https://neture.co.kr"
echo ""
echo "💡 팁: 브라우저 캐시를 완전히 삭제하려면:"
echo "   - Chrome: Ctrl+Shift+R (강력 새로고침)"
echo "   - 또는 시크릿 모드에서 테스트"