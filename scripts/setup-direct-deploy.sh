#!/bin/bash

# ============================================
# O4O Platform 직접 배포 시스템 설정 스크립트
# 로컬에서 실행하여 서버 설정을 자동화
# ============================================

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   O4O Platform Direct Deployment Setup${NC}"
echo -e "${BLUE}================================================${NC}"

# 설정 변수
read -p "Enter server hostname (e.g., admin.neture.co.kr): " SERVER_HOST
read -p "Enter server username (e.g., ubuntu): " SERVER_USER
read -p "Enter server SSH port (default 22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}

SERVER_SSH="${SERVER_USER}@${SERVER_HOST}"

echo ""
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Server: $SERVER_SSH"
echo "  Port: $SSH_PORT"
echo ""
read -p "Is this correct? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Setup cancelled${NC}"
    exit 1
fi

# SSH 연결 테스트
echo ""
echo -e "${YELLOW}🔗 Testing SSH connection...${NC}"
if ssh -p "$SSH_PORT" "$SERVER_SSH" "echo 'SSH connection successful'"; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    exit 1
fi

# 서버에 post-receive hook 스크립트 생성
echo ""
echo -e "${YELLOW}📝 Creating post-receive hook script...${NC}"

cat << 'HOOK_SCRIPT' > /tmp/post-receive
#!/bin/bash
# Post-receive hook for O4O Platform

# 설정
WORK_TREE="/var/www/admin.neture.co.kr"
BUILD_DIR="/tmp/o4o-build-$(date +%s)"
BACKUP_DIR="/var/www/admin-backup"
LOG_FILE="/var/log/o4o-deploy.log"
MAX_BACKUPS=3

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 에러 핸들링
handle_error() {
    log "❌ ERROR: $1"
    
    # 백업에서 복원
    if [ -d "$BACKUP_DIR/latest" ]; then
        log "🔄 Rolling back to previous version..."
        rm -rf "$WORK_TREE"
        cp -r "$BACKUP_DIR/latest" "$WORK_TREE"
        sudo chown -R www-data:www-data "$WORK_TREE"
        log "✅ Rollback completed"
    fi
    
    # 정리
    rm -rf "$BUILD_DIR"
    exit 1
}

# 트랩 설정
trap 'handle_error "Unexpected error occurred"' ERR

# 시작
log "🚀 === Direct Deployment Started ==="

while read oldrev newrev ref; do
    # main 브랜치만 배포
    if [[ $ref = refs/heads/main ]]; then
        log "📥 Deploying main branch..."
        
        # 1. 코드 체크아웃
        log "📂 Checking out code..."
        git --work-tree="$BUILD_DIR" --git-dir=/var/repos/o4o-platform.git checkout -f main
        cd "$BUILD_DIR"
        
        # 커밋 정보
        COMMIT=$newrev
        COMMIT_MSG=$(git --git-dir=/var/repos/o4o-platform.git log -1 --pretty=%B $COMMIT)
        AUTHOR=$(git --git-dir=/var/repos/o4o-platform.git log -1 --pretty=%an $COMMIT)
        log "📝 Commit: ${COMMIT:0:7} - $COMMIT_MSG (by $AUTHOR)"
        
        # 2. Node.js 설정
        log "🔧 Setting up Node.js..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm use 22.18.0 || handle_error "Node.js setup failed"
        
        # 3. 의존성 설치
        log "📦 Installing dependencies..."
        pnpm install --frozen-lockfile || handle_error "Dependency installation failed"
        
        # 4. 패키지 빌드
        log "🔨 Building packages..."
        pnpm run build:packages || handle_error "Package build failed"
        
        # 5. Admin Dashboard 빌드
        log "🏗️ Building Admin Dashboard..."
        cd apps/admin-dashboard
        NODE_OPTIONS='--max-old-space-size=4096' \
        GENERATE_SOURCEMAP=false \
        VITE_API_URL=https://api.neture.co.kr \
        pnpm run build || handle_error "Admin build failed"
        
        # 6. 백업
        if [ -d "$WORK_TREE" ]; then
            log "💾 Creating backup..."
            BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
            sudo mkdir -p "$BACKUP_DIR"
            sudo cp -r "$WORK_TREE" "$BACKUP_DIR/$BACKUP_NAME"
            sudo ln -sfn "$BACKUP_DIR/$BACKUP_NAME" "$BACKUP_DIR/latest"
            
            # 오래된 백업 삭제
            BACKUP_COUNT=$(ls -1d $BACKUP_DIR/backup-* 2>/dev/null | wc -l)
            if [ $BACKUP_COUNT -gt $MAX_BACKUPS ]; then
                ls -1dt $BACKUP_DIR/backup-* | tail -n +$((MAX_BACKUPS + 1)) | sudo xargs rm -rf
            fi
        fi
        
        # 7. 배포
        log "🚀 Deploying to production..."
        sudo rm -rf "$WORK_TREE"
        sudo cp -r "$BUILD_DIR/apps/admin-dashboard/dist" "$WORK_TREE"
        
        # 캐시 버스팅
        VERSION=$(date +%s)
        echo "{\"version\": \"$VERSION\", \"commit\": \"${COMMIT:0:7}\"}" | sudo tee "$WORK_TREE/version.json" > /dev/null
        
        # 권한 설정
        sudo chown -R www-data:www-data "$WORK_TREE"
        sudo chmod -R 755 "$WORK_TREE"
        
        # 8. Nginx 재시작
        log "🔄 Reloading Nginx..."
        sudo systemctl reload nginx
        
        # 9. 정리
        rm -rf "$BUILD_DIR"
        
        log "✅ === Deployment Completed ==="
        log "🌐 https://admin.neture.co.kr"
        log "📊 Version: $VERSION"
        log "============================================"
    else
        log "⚠️ Received push to $ref, only main branch is deployed"
    fi
done
HOOK_SCRIPT

# 서버 설정 스크립트 생성
echo ""
echo -e "${YELLOW}🔧 Creating server setup script...${NC}"

cat << 'SERVER_SETUP' > /tmp/setup-server.sh
#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up Git deployment on server...${NC}"

# 1. Bare repository 생성
echo "Creating bare repository..."
sudo mkdir -p /var/repos
sudo git init --bare /var/repos/o4o-platform.git

# 2. Hook 설치
echo "Installing post-receive hook..."
sudo cp /tmp/post-receive /var/repos/o4o-platform.git/hooks/post-receive
sudo chmod +x /var/repos/o4o-platform.git/hooks/post-receive

# 3. 권한 설정
echo "Setting permissions..."
sudo chown -R $(whoami):$(whoami) /var/repos/o4o-platform.git

# 4. 로그 파일 생성
echo "Creating log file..."
sudo touch /var/log/o4o-deploy.log
sudo chown $(whoami):$(whoami) /var/log/o4o-deploy.log

# 5. 백업 디렉토리 생성
echo "Creating backup directory..."
sudo mkdir -p /var/www/admin-backup
sudo chown -R www-data:www-data /var/www/admin-backup

echo -e "${GREEN}✅ Server setup complete!${NC}"
SERVER_SETUP

# 파일 전송
echo ""
echo -e "${YELLOW}📤 Transferring files to server...${NC}"
scp -P "$SSH_PORT" /tmp/post-receive "$SERVER_SSH:/tmp/"
scp -P "$SSH_PORT" /tmp/setup-server.sh "$SERVER_SSH:/tmp/"

# 서버에서 설정 실행
echo ""
echo -e "${YELLOW}⚙️ Running setup on server...${NC}"
ssh -p "$SSH_PORT" "$SERVER_SSH" "bash /tmp/setup-server.sh"

# 로컬 Git remote 추가
echo ""
echo -e "${YELLOW}🔗 Adding production remote to local Git...${NC}"
git remote remove production 2>/dev/null || true
git remote add production "ssh://${SERVER_SSH}:${SSH_PORT}/var/repos/o4o-platform.git"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Direct Deployment Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📝 Usage:${NC}"
echo "  Deploy to production:  git push production main"
echo "  View deployment logs:  ssh $SERVER_SSH 'tail -f /var/log/o4o-deploy.log'"
echo "  Check status:          ssh $SERVER_SSH 'curl -I https://admin.neture.co.kr'"
echo ""
echo -e "${YELLOW}💡 Tip: Add these to your package.json scripts:${NC}"
echo '  "deploy": "git push production main",'
echo '  "deploy:log": "ssh '$SERVER_SSH' tail -f /var/log/o4o-deploy.log",'
echo '  "deploy:status": "ssh '$SERVER_SSH' curl -I https://admin.neture.co.kr"'
echo ""

# 정리
rm -f /tmp/post-receive /tmp/setup-server.sh