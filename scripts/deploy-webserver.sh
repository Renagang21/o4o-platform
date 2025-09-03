#!/bin/bash

# 웹서버 배포 스크립트
# 사용법: ./scripts/deploy-webserver.sh

set -e  # 에러 발생 시 중단

echo "🚀 웹서버 배포 시작..."

# 현재 위치 확인
if [ ! -f "package.json" ]; then
    echo "❌ 에러: 루트 디렉토리에서 실행하세요"
    exit 1
fi

# 1. 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git fetch origin
git pull origin main

# 2. 의존성 설치
echo "📦 의존성 설치..."
pnpm install --frozen-lockfile

# 3. 패키지 빌드
echo "🔨 패키지 빌드..."
pnpm run build:packages

# 4. Admin Dashboard 빌드
echo "🏗️ Admin Dashboard 빌드..."
cd apps/admin-dashboard

# 빌드 최적화 환경 변수 설정
export NODE_OPTIONS='--max-old-space-size=4096'
export GENERATE_SOURCEMAP=false
export VITE_BUILD_MINIFY=esbuild
export VITE_API_URL=https://api.neture.co.kr

pnpm run build

# 빌드 성공 확인
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ 빌드 실패: dist 폴더가 비어있습니다"
    exit 1
fi

echo "✅ 빌드 완료!"
echo "📊 빌드 결과:"
ls -la dist/ | head -10

# 5. 웹 디렉토리로 배포
echo "📤 웹 디렉토리로 배포..."

# 백업 생성
BACKUP_DIR="/var/www/admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "/var/www/admin.neture.co.kr" ]; then
    echo "💾 기존 파일 백업: $BACKUP_DIR"
    sudo cp -r /var/www/admin.neture.co.kr "$BACKUP_DIR"
fi

# 기존 파일 삭제
sudo rm -rf /var/www/admin.neture.co.kr/*

# 새 파일 복사
echo "📋 새 파일 복사 중..."
sudo cp -r dist/* /var/www/admin.neture.co.kr/

# 권한 설정
echo "🔐 파일 권한 설정..."
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 6. Nginx 재로드
echo "🔄 Nginx 재로드..."
sudo systemctl reload nginx

# 7. 배포 완료
echo ""
echo "🎉 배포 완료!"
echo "🌐 사이트: https://admin.neture.co.kr"
echo "📅 배포 시간: $(date)"
echo "📝 커밋: $(git rev-parse HEAD)"
echo ""
echo "💡 브라우저에서 Ctrl+Shift+R로 캐시를 새로고침하세요."

cd ../../