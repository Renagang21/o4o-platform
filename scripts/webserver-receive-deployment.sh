#!/bin/bash

# ============================================
# 웹서버 배포 수신 스크립트 (빌드 없음!)
# GitHub Actions에서 빌드된 결과물을 받기만 합니다
# 사용법: ./scripts/webserver-receive-deployment.sh
# ============================================

set -e  # 에러 발생 시 중단

echo "🚀 웹서버 배포 수신 스크립트"
echo "================================================"
echo "⚠️  중요: 이 스크립트는 빌드하지 않습니다!"
echo "📦 GitHub Actions가 빌드한 결과물만 배포합니다"
echo "================================================"

# 1. 현재 상태 확인
echo ""
echo "📋 [1/3] 현재 상태 확인..."
cd /home/ubuntu/o4o-platform

# GitHub Actions 실행 확인
echo ""
echo "🔄 GitHub Actions 상태:"
echo "https://github.com/Renagang21/o4o-platform/actions"
echo ""
echo "⏳ Actions가 완료되었는지 확인하세요 (녹색 체크 표시)"
echo "   완료되지 않았다면 이 스크립트를 실행하지 마세요!"
echo ""
read -p "GitHub Actions가 완료되었습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 취소됨. GitHub Actions 완료 후 다시 실행하세요."
    exit 1
fi

# 2. 최신 코드 가져오기 (빌드 없음!)
echo ""
echo "📥 [2/3] 최신 코드 가져오기 (빌드된 dist 폴더 포함)..."
git fetch origin
git reset --hard origin/main
git pull origin main

# dist 폴더 확인
if [ ! -d "apps/admin-dashboard/dist" ]; then
    echo "❌ dist 폴더가 없습니다!"
    echo "GitHub Actions가 제대로 실행되지 않았습니다."
    echo ""
    echo "해결 방법:"
    echo "1. GitHub Actions 페이지를 확인하세요"
    echo "2. 실패한 경우: Actions를 다시 실행하세요"
    echo "3. 성공했지만 dist가 없는 경우: Actions 설정 확인 필요"
    exit 1
fi

echo "✅ dist 폴더 확인됨"
echo "📊 빌드된 파일 수: $(ls -1 apps/admin-dashboard/dist/assets/*.js 2>/dev/null | wc -l) JS files"

# 3. 웹 디렉토리로 복사
echo ""
echo "📤 [3/3] 웹 디렉토리로 배포..."

# 백업 생성
BACKUP_DIR="/var/www/admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "/var/www/admin.neture.co.kr" ]; then
    echo "💾 기존 파일 백업: $BACKUP_DIR"
    sudo cp -r /var/www/admin.neture.co.kr "$BACKUP_DIR"
    
    # 최근 백업만 유지 (3개)
    BACKUP_COUNT=$(ls -1d /var/www/admin.neture.co.kr.backup.* 2>/dev/null | wc -l)
    if [ $BACKUP_COUNT -gt 3 ]; then
        echo "🗑️ 오래된 백업 삭제..."
        ls -1dt /var/www/admin.neture.co.kr.backup.* | tail -n +4 | xargs sudo rm -rf
    fi
fi

# 기존 파일 삭제
echo "🗑️ 기존 파일 삭제..."
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo rm -rf /var/www/admin.neture.co.kr/.*  2>/dev/null || true

# 새 파일 복사 (GitHub Actions가 빌드한 파일)
echo "📋 새 파일 복사..."
sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/

# 캐시 제어 설정 추가
echo "🚫 캐시 제어 설정..."

# .htaccess 생성 (Apache용)
sudo tee /var/www/admin.neture.co.kr/.htaccess > /dev/null << 'EOF'
# HTML 파일 캐싱 비활성화
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</FilesMatch>

# JS/CSS 파일은 해시가 있으므로 장기 캐싱 가능
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
EOF

# version.json 생성
echo "{\"version\": \"$(date +%s)\", \"buildTime\": \"$(date)\"}" | sudo tee /var/www/admin.neture.co.kr/version.json > /dev/null

# 권한 설정
echo "🔐 파일 권한 설정..."
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# Nginx 재로드 (restart 대신 reload 사용)
echo "🔄 Nginx 재로드..."
sudo systemctl reload nginx

# 검증
echo ""
echo "============================================"
echo "✅ 배포 완료!"
echo "============================================"
echo "🌐 사이트: https://admin.neture.co.kr"
echo "📅 배포 시간: $(date)"
echo ""
echo "📝 배포된 버전 확인:"
DEPLOYED_HASH=$(grep -o 'index-[^.]*\.js' /var/www/admin.neture.co.kr/index.html 2>/dev/null | head -1)
echo "  배포된 JS: $DEPLOYED_HASH"
echo ""
echo "🔍 변경사항 확인 방법:"
echo "  1. 브라우저에서 Ctrl+Shift+R (강제 새로고침)"
echo "  2. 개발자도구 > Network > Disable cache 체크"
echo "  3. 시크릿/프라이빗 모드에서 확인"
echo ""
echo "⚠️ 주의사항:"
echo "  • 이 스크립트는 빌드하지 않습니다"
echo "  • GitHub Actions가 빌드한 결과물만 배포합니다"
echo "  • 빌드가 필요하면 GitHub에서 Actions를 실행하세요"
echo "============================================"