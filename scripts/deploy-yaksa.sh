#!/bin/bash

# 배포 스크립트 실행 시 에러 발생하면 즉시 중단
set -e

# 로그 출력 함수
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# 서버 정보
SERVER_USER="ubuntu"
SERVER_IP="13.124.146.254"
SERVER_PATH="/var/www/html"

# 배포 시작
log "🚀 Yaksa Main Site 배포 시작"

# 1. 빌드
log "📦 프로젝트 빌드 중..."
npm build

# 2. 서버에 배포
log "📤 서버에 배포 중..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    dist/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# 3. nginx 재시작
log "🔄 nginx 재시작 중..."
ssh $SERVER_USER@$SERVER_IP "sudo systemctl reload nginx"

# 배포 완료
log "✅ 배포 완료!" 
