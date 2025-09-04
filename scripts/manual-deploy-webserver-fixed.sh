#!/bin/bash

# ============================================
# 웹서버 긴급 배포 스크립트 (빌드 없음!)
# GitHub Actions 결과물을 수동으로 배포
# 사용법: ./scripts/manual-deploy-webserver-fixed.sh
# ============================================

set -e  # 에러 발생 시 중단

echo "🚨 웹서버 긴급 배포 (빌드 없음)"
echo "================================================"
echo "⚠️  경고: 이것은 긴급 스크립트입니다"
echo "📦 정상적으로는 GitHub Actions가 자동 배포합니다"
echo "================================================"

# 환경 확인
if [ ! -d "/var/www/admin.neture.co.kr" ]; then
    echo "❌ 이 스크립트는 웹서버에서만 실행 가능합니다"
    exit 1
fi

# 1. GitHub Actions 빌드 결과물 다운로드
echo ""
echo "📥 [1/4] GitHub Actions 빌드 결과물 확인..."
cd /home/ubuntu/o4o-platform

# 최신 코드 가져오기
git fetch origin
git reset --hard origin/main
git pull origin main

# Actions가 빌드한 dist 확인
if [ -d "apps/admin-dashboard/dist" ]; then
    echo "✅ dist 폴더 발견 (로컬)"
    DIST_SOURCE="apps/admin-dashboard/dist"
else
    echo "⚠️ 로컬 dist 폴더가 없습니다"
    echo ""
    echo "📦 GitHub에서 직접 다운로드 시도..."
    
    # GitHub Actions artifacts 다운로드 (API 사용)
    echo "GitHub Actions에서 최신 아티팩트를 다운로드하려면:"
    echo "1. https://github.com/Renagang21/o4o-platform/actions 방문"
    echo "2. 최신 성공한 워크플로우 클릭"
    echo "3. Artifacts 섹션에서 admin-dashboard 다운로드"
    echo "4. /tmp/admin-dist/에 압축 해제"
    echo ""
    read -p "아티팩트를 다운로드하고 압축을 해제했습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 취소됨"
        exit 1
    fi
    
    if [ -d "/tmp/admin-dist" ]; then
        DIST_SOURCE="/tmp/admin-dist"
    else
        echo "❌ /tmp/admin-dist 폴더가 없습니다"
        exit 1
    fi
fi

# 2. 빌드 내용 검증
echo ""
echo "🔍 [2/4] 빌드 내용 검증..."
echo "📊 파일 수: $(ls -1 $DIST_SOURCE/assets/*.js 2>/dev/null | wc -l) JS files"

# 변경사항 확인
echo "🔍 주요 변경사항 확인:"
grep -l "외모" $DIST_SOURCE/assets/*.js 2>/dev/null | head -1 && echo "✅ '외모' 메뉴 포함됨" || echo "⚠️ '외모' 메뉴 없음"

# 3. 백업 및 배포
echo ""
echo "📤 [3/4] 웹 디렉토리로 배포..."

# 백업
BACKUP_DIR="/var/www/admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 백업 생성: $BACKUP_DIR"
sudo cp -r /var/www/admin.neture.co.kr "$BACKUP_DIR"

# 기존 파일 삭제
echo "🗑️ 기존 파일 삭제..."
sudo rm -rf /var/www/admin.neture.co.kr/*

# 새 파일 복사
echo "📋 새 파일 복사..."
sudo cp -r $DIST_SOURCE/* /var/www/admin.neture.co.kr/

# 캐시 제어 헤더
echo "🚫 캐시 제어 설정..."
sudo tee /var/www/admin.neture.co.kr/.htaccess > /dev/null << 'EOF'
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</FilesMatch>

<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
EOF

# version.json
echo "{\"version\": \"$(date +%s)\", \"buildTime\": \"$(date)\"}" | sudo tee /var/www/admin.neture.co.kr/version.json > /dev/null

# 권한 설정
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 4. 서비스 재시작
echo ""
echo "🔄 [4/4] 서비스 재시작..."
sudo systemctl reload nginx

# 완료 메시지
echo ""
echo "============================================"
echo "✅ 긴급 배포 완료!"
echo "============================================"
echo "🌐 사이트: https://admin.neture.co.kr"
echo "📅 배포 시간: $(date)"
echo ""
echo "🔍 확인 방법:"
echo "  • Ctrl+Shift+R (강제 새로고침)"
echo "  • 시크릿 모드에서 테스트"
echo ""
echo "⚠️ 중요:"
echo "  • 이것은 긴급 방법입니다"
echo "  • 정상적으로는 GitHub Actions 사용"
echo "  • 빌드는 GitHub Actions에서만!"
echo "============================================"