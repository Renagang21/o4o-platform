#!/bin/bash

# 메인 사이트(https://neture.co.kr) 배포 스크립트
# 사용: ./scripts/deploy-main-site.sh

set -euo pipefail

echo "🚀 메인 사이트 배포 시작..."

# 0) 루트 확인
if [ ! -f "package.json" ]; then
  echo "❌ 에러: 리포지토리 루트에서 실행하세요"
  exit 1
fi

# 1) 최신 코드 동기화
echo "📥 최신 코드 가져오기..."
git fetch origin
git pull origin main

# 2) 의존성 설치
echo "📦 의존성 설치..."
pnpm install --frozen-lockfile

# 3) 패키지 빌드 (공유 패키지)
echo "🔨 패키지 빌드..."
pnpm run build:packages

# 4) 메인 사이트 빌드
echo "🏗️ Main Site 빌드..."
pushd apps/main-site >/dev/null
export NODE_OPTIONS='--max-old-space-size=4096'
export GENERATE_SOURCEMAP=false
pnpm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
  echo "❌ 빌드 실패: apps/main-site/dist 가 비어있습니다"
  exit 1
fi

echo "✅ 빌드 완료"
echo "📊 빌드 결과:"
ls -la dist/ | head -10
popd >/dev/null

# 5) 배포 대상 디렉토리
TARGET_DIR="/var/www/neture.co.kr"

echo "📂 배포 대상: $TARGET_DIR"

# 5-1) 백업 생성
BACKUP_DIR="${TARGET_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "$TARGET_DIR" ]; then
  echo "💾 기존 파일 백업: $BACKUP_DIR"
  sudo cp -r "$TARGET_DIR" "$BACKUP_DIR"
fi

# 5-2) 기존 파일 삭제 후 복사
echo "🗑️ 기존 파일 삭제..."
sudo rm -rf "$TARGET_DIR"/* || true
sudo rm -rf "$TARGET_DIR"/.* 2>/dev/null || true

echo "📋 새 파일 복사..."
sudo mkdir -p "$TARGET_DIR"
sudo cp -r apps/main-site/dist/* "$TARGET_DIR"/

# 5-3) 캐시 제어(HTML만 no-cache, 정적 자산은 해시 기반 장기 캐시)
echo "⚙️ 캐시 정책 설정(.htaccess, Apache일 경우만 적용됨)"
if [ ! -f "$TARGET_DIR/.htaccess" ]; then
  sudo tee "$TARGET_DIR/.htaccess" > /dev/null << 'EOF'
# HTML 파일 캐싱 비활성화
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</FilesMatch>

# 해시가 포함된 정적 파일은 장기 캐싱
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
EOF
fi

# 5-4) 버전 정보 기록
echo "🧾 version.json 기록"
echo "{\"version\": \"$(date +%s)\", \"buildTime\": \"$(date)\"}" | sudo tee "$TARGET_DIR/version.json" > /dev/null

# 5-5) 권한 설정
echo "🔐 권한 설정 (www-data)"
sudo chown -R www-data:www-data "$TARGET_DIR"/
sudo chmod -R 755 "$TARGET_DIR"/

# 6) Nginx 재로드
echo "🔄 Nginx 재로드..."
sudo systemctl reload nginx || true

echo "\n🎉 배포 완료"
echo "🌐 사이트: https://neture.co.kr"
echo "📅 배포 시간: $(date)"
echo "📝 커밋: $(git rev-parse HEAD)"
echo "💡 강력 새로고침(Ctrl/Cmd+Shift+R)으로 최신 번들을 확인하세요."

