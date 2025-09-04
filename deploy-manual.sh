#!/bin/bash
# 수동 배포 스크립트 - 웹서버에서 실행

set -e

LOG_FILE="/var/log/o4o-deploy.log"
WORK_TREE="/var/www/admin.neture.co.kr"
BUILD_DIR="/tmp/o4o-build-$(date +%s)"
BACKUP_DIR="/var/www/admin-backup"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 === Manual Deployment Started ==="

# 1. GitHub에서 최신 코드 가져오기
log "📥 Fetching latest code from GitHub..."
git clone https://github.com/Renagang21/o4o-platform.git "$BUILD_DIR"
cd "$BUILD_DIR"

# 2. Node.js 환경 설정
log "🔧 Setting up Node.js environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.18.0

# 3. 의존성 설치
log "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 4. 패키지 빌드
log "🔨 Building packages..."
pnpm run build:packages

# 5. Admin Dashboard 빌드
log "🏗️ Building Admin Dashboard..."
cd apps/admin-dashboard
NODE_OPTIONS='--max-old-space-size=4096' \
GENERATE_SOURCEMAP=false \
VITE_API_URL=https://api.neture.co.kr \
pnpm run build

# 6. 백업 생성
if [ -d "$WORK_TREE" ]; then
    log "💾 Creating backup..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$WORK_TREE" "$BACKUP_DIR/$BACKUP_NAME"
    
    # 최근 백업 3개만 유지
    ls -1dt $BACKUP_DIR/backup-* | tail -n +4 | xargs sudo rm -rf 2>/dev/null || true
fi

# 7. 배포
log "🚀 Deploying to production..."
sudo rm -rf "$WORK_TREE"/*
sudo cp -r "$BUILD_DIR/apps/admin-dashboard/dist"/* "$WORK_TREE"/

# 캐시 버스팅을 위한 version.json
echo "{\"version\": \"$(date +%s)\", \"commit\": \"$(git rev-parse --short HEAD)\"}" | sudo tee "$WORK_TREE/version.json" > /dev/null

# 권한 설정
sudo chown -R www-data:www-data "$WORK_TREE"
sudo chmod -R 755 "$WORK_TREE"

# 8. Nginx 재로드
log "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# 9. 정리
rm -rf "$BUILD_DIR"

log "✅ === Deployment Completed Successfully ==="
log "🌐 Site: https://admin.neture.co.kr"