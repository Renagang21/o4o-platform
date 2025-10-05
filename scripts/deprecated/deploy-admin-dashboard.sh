#!/bin/bash

# Admin Dashboard 배포 스크립트
# 404 에러 해결을 위한 수동 배포

set -e

echo "🚀 Admin Dashboard 배포 시작..."

# 1. 프로젝트 루트 확인
if [ ! -f "package.json" ]; then
  echo "❌ 프로젝트 루트에서 실행하세요"
  exit 1
fi

# 2. 빌드 완료 확인
if [ ! -d "apps/admin-dashboard/dist" ]; then
  echo "❌ 빌드 파일이 없습니다. 먼저 빌드를 실행하세요:"
  echo "   cd apps/admin-dashboard && npm run build"
  exit 1
fi

echo "📁 빌드 파일 확인 완료"
echo "📊 파일 수: $(find apps/admin-dashboard/dist -type f | wc -l) 개"

# 3. 기존 파일 백업 (옵션)
if [ -d "/var/www/admin.neture.co.kr" ]; then
  echo "💾 기존 파일 백업..."
  BACKUP_DIR="/var/www/backup/admin.neture.co.kr.$(date +%Y%m%d_%H%M%S)"
  sudo mkdir -p /var/www/backup
  sudo cp -r /var/www/admin.neture.co.kr "$BACKUP_DIR"
  echo "✅ 백업 완료: $BACKUP_DIR"
fi

# 4. 기존 파일 삭제
echo "🗑️ 기존 파일 삭제..."
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo rm -rf /var/www/admin.neture.co.kr/.* 2>/dev/null || true

# 5. 새 파일 배포
echo "📋 새 파일 배포..."
sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/

# 6. 권한 설정
echo "🔐 권한 설정..."
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 7. Nginx 재시작 (캐시 클리어)
echo "♻️ Nginx 캐시 클리어..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ 배포 완료!"
echo "🌐 사이트: https://admin.neture.co.kr"
echo ""
echo "📝 다음 단계:"
echo "1. 브라우저에서 Ctrl+Shift+R (하드 리프레시)"
echo "2. 개발자 도구(F12) > Network 탭에서 404 에러 확인"
echo "3. Console 탭에서 에러 메시지 확인"
echo ""
echo "⚠️ 여전히 404 에러가 발생하면:"
echo "   - 빌드 파일 해시명 확인: ls /var/www/admin.neture.co.kr/assets/*.js"
echo "   - index.html 참조 확인: grep 'script' /var/www/admin.neture.co.kr/index.html"