#!/bin/bash

# ============================================
# 웹서버 수동 배포 스크립트 (완전 클린 빌드)
# 사용법: ./scripts/manual-deploy-webserver.sh
# ============================================

set -e  # 에러 발생 시 중단

echo "🚀 웹서버 수동 배포 시작 (Complete Clean Build)..."
echo "================================================"

# 1. 코드 최신화
echo ""
echo "📥 [1/10] 최신 코드 가져오기..."
cd /home/ubuntu/o4o-platform
git fetch origin
git reset --hard origin/main
git pull origin main

# 2. 현재 커밋 확인
echo ""
echo "📋 [2/10] 현재 커밋 확인..."
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "현재 커밋: $CURRENT_COMMIT"
git log --oneline -3

# 3. 캐시 및 빌드 폴더 완전 삭제
echo ""
echo "🧹 [3/10] 모든 캐시 및 빌드 폴더 삭제..."
rm -rf node_modules
rm -rf apps/admin-dashboard/dist
rm -rf apps/admin-dashboard/.vite-cache
rm -rf apps/admin-dashboard/node_modules/.vite
rm -rf packages/*/dist
echo "✅ 캐시 삭제 완료"

# 4. 패키지 재설치
echo ""
echo "📦 [4/10] 패키지 재설치 (frozen-lockfile)..."
pnpm install --frozen-lockfile

# 5. 패키지 빌드
echo ""
echo "🔨 [5/10] 공유 패키지 빌드..."
pnpm run build:packages

# 6. Admin Dashboard 빌드
echo ""
echo "🏗️ [6/10] Admin Dashboard 빌드 (최적화 설정)..."
cd apps/admin-dashboard
export NODE_OPTIONS='--max-old-space-size=4096'
export GENERATE_SOURCEMAP=false
export VITE_BUILD_MINIFY=esbuild
export VITE_API_URL=https://api.neture.co.kr
pnpm run build

# 7. 빌드 결과 검증
echo ""
echo "🔍 [7/10] 빌드 결과 검증..."
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ 빌드 실패: dist 폴더가 비어있습니다"
    exit 1
fi

echo "📊 빌드된 파일 목록:"
ls -la dist/ | head -10
echo ""
echo "🔍 변경사항 확인:"
grep -r "외모\|appearance" dist/assets/*.js 2>/dev/null | head -3 || echo "⚠️ 'appearance/외모' 텍스트를 찾을 수 없음"

# 8. 웹 디렉토리로 배포
echo ""
echo "📤 [8/10] 웹 디렉토리로 배포..."

# 백업 생성
BACKUP_DIR="/var/www/admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "/var/www/admin.neture.co.kr" ]; then
    echo "💾 기존 파일 백업: $BACKUP_DIR"
    sudo cp -r /var/www/admin.neture.co.kr "$BACKUP_DIR"
fi

# 기존 파일 완전 삭제
echo "🗑️ 기존 파일 삭제..."
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo rm -rf /var/www/admin.neture.co.kr/.*  2>/dev/null || true

# 새 파일 복사
echo "📋 새 파일 복사..."
sudo cp -r dist/* /var/www/admin.neture.co.kr/

# 캐시 방지 메타 태그 추가
echo "🚫 캐시 방지 설정..."
if ! grep -q "no-cache" /var/www/admin.neture.co.kr/index.html; then
    sudo sed -i '/<head>/a \    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n    <meta http-equiv="Pragma" content="no-cache">\n    <meta http-equiv="Expires" content="0">' /var/www/admin.neture.co.kr/index.html
fi

# 권한 설정
echo "🔐 파일 권한 설정..."
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 9. Nginx 재시작 (reload가 아닌 restart)
echo ""
echo "🔄 [9/10] Nginx 완전 재시작..."
sudo systemctl restart nginx
sleep 2
sudo systemctl status nginx --no-pager | head -10

# 10. 검증 및 로그
echo ""
echo "✅ [10/10] 배포 완료 및 검증..."

# 실제 서빙되는 파일 확인
echo ""
echo "🌐 서버 응답 확인:"
curl -I https://admin.neture.co.kr 2>/dev/null | head -5

# 메인 JS 파일 해시 확인
echo ""
echo "📝 배포된 JS 파일:"
ls -la /var/www/admin.neture.co.kr/assets/index*.js 2>/dev/null | tail -2

# 최종 정보
echo ""
echo "============================================"
echo "🎉 배포 완료!"
echo "🌐 사이트: https://admin.neture.co.kr"
echo "📅 배포 시간: $(date)"
echo "📝 배포 커밋: $CURRENT_COMMIT"
echo ""
echo "⚠️ 브라우저에서 확인 방법:"
echo "  1. Ctrl+Shift+R (하드 리프레시)"
echo "  2. 개발자도구 > Network > Disable cache 체크"
echo "  3. 시크릿/프라이빗 모드에서 확인"
echo ""
echo "🔍 변경사항 확인:"
echo "  - Appearance(외모) 메뉴가 보여야 함"
echo "  - WordPress 테이블 중복 필터 제거됨"
echo "  - Products, Shortcodes 메뉴 정상 작동"
echo "============================================"

cd /home/ubuntu/o4o-platform