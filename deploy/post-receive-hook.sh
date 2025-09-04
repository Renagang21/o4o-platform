#!/bin/bash
# ============================================
# O4O Platform Auto-deployment Hook
# 이 파일을 웹서버의 /var/repos/o4o-platform.git/hooks/post-receive 에 복사
# ============================================

# 설정
WORK_TREE="/var/www/admin.neture.co.kr"
BUILD_DIR="/tmp/o4o-build-$(date +%s)"
BACKUP_DIR="/var/www/admin-backup"
LOG_FILE="/var/log/o4o-deploy.log"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 시작
log "🚀 === Auto Deployment Started ==="

while read oldrev newrev ref; do
    # main 브랜치만 배포
    if [[ $ref = refs/heads/main ]]; then
        log "📥 Received push to main branch"
        
        # 1. 코드 체크아웃
        log "📂 Extracting code..."
        git --work-tree="$BUILD_DIR" --git-dir=/var/repos/o4o-platform.git checkout -f main
        
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
        echo "{\"version\": \"$(date +%s)\", \"commit\": \"${newrev:0:7}\"}" | sudo tee "$WORK_TREE/version.json" > /dev/null
        
        # .htaccess 추가 (캐시 제어)
        cat << 'EOF' | sudo tee "$WORK_TREE/.htaccess" > /dev/null
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</FilesMatch>

<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
EOF
        
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
        log "📝 Commit: ${newrev:0:7}"
        log "============================================"
    else
        log "⚠️ Received push to $ref - skipping (only main branch is deployed)"
    fi
done