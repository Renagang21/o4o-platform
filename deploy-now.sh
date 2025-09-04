#!/bin/bash
# 웹서버에서 실행할 즉시 배포 스크립트

echo "🚀 Starting immediate deployment..."

# 변수 설정
REPO_URL="https://github.com/Renagang21/o4o-platform.git"
WORK_DIR="/tmp/deploy-$(date +%s)"
TARGET_DIR="/var/www/admin.neture.co.kr"
BACKUP_DIR="/var/www/admin-backup"

# 1. 최신 코드 가져오기
echo "📥 Cloning repository..."
git clone --depth 1 "$REPO_URL" "$WORK_DIR"
cd "$WORK_DIR"

# 2. Node.js 환경 설정
echo "🔧 Setting up Node.js..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.18.0

# 3. 의존성 설치
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 4. 빌드
echo "🔨 Building packages..."
pnpm run build:packages

echo "🏗️ Building Admin Dashboard..."
cd apps/admin-dashboard
NODE_OPTIONS='--max-old-space-size=4096' \
GENERATE_SOURCEMAP=false \
VITE_API_URL=https://api.neture.co.kr \
pnpm run build

# 5. 백업
if [ -d "$TARGET_DIR" ]; then
    echo "💾 Creating backup..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$TARGET_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    ls -1dt $BACKUP_DIR/backup-* | tail -n +4 | xargs sudo rm -rf 2>/dev/null || true
fi

# 6. 배포
echo "🚀 Deploying..."
sudo rm -rf "$TARGET_DIR"/*
sudo cp -r dist/* "$TARGET_DIR"/

# 7. 캐시 버스팅
echo "{\"version\": \"$(date +%s)\", \"commit\": \"$(git rev-parse --short HEAD)\"}" | sudo tee "$TARGET_DIR/version.json" > /dev/null

# 8. 권한 설정
sudo chown -R www-data:www-data "$TARGET_DIR"
sudo chmod -R 755 "$TARGET_DIR"

# 9. Nginx 재로드
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# 10. 정리
cd /
rm -rf "$WORK_DIR"

echo "✅ Deployment complete!"
echo "🌐 Check: https://admin.neture.co.kr"