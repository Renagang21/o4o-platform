#!/bin/bash

# Nginx 설정 배포 스크립트
# 사용법: ./scripts/deploy-nginx.sh

set -e

WEB_HOST="13.125.144.8"
WEB_USER="ubuntu"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info "Nginx 설정 배포 시작..."

# SSH 연결 테스트
if ! ssh -o ConnectTimeout=10 ${WEB_USER}@${WEB_HOST} "echo 'SSH 연결 성공'" 2>/dev/null; then
    log_error "SSH 연결 실패"
    exit 1
fi

log_info "웹서버에 Nginx 설정 배포 중..."

ssh ${WEB_USER}@${WEB_HOST} "
    # 백업 디렉토리 생성
    BACKUP_DIR=\"/etc/nginx/backup/\$(date +%Y%m%d_%H%M%S)\"
    sudo mkdir -p \"\$BACKUP_DIR\"
    
    # 현재 nginx 설정 백업
    echo '📁 백업 생성 중: \$BACKUP_DIR'
    sudo cp -r /etc/nginx/sites-available \"\$BACKUP_DIR/\" || true
    sudo cp -r /etc/nginx/sites-enabled \"\$BACKUP_DIR/\" || true
    
    # 저장소로 이동
    cd /home/ubuntu/o4o-platform
    
    # 최신 변경사항 가져오기
    echo '🔄 최신 nginx 설정 가져오기...'
    git fetch origin
    git pull origin main
    
    # nginx 설정 시스템에 복사
    echo '📋 nginx 설정 배포 중...'
    sudo cp nginx-configs/admin.neture.co.kr.conf /etc/nginx/sites-available/
    sudo cp nginx-configs/neture.co.kr.conf /etc/nginx/sites-available/ || true
    sudo cp nginx-configs/api.neture.co.kr.conf /etc/nginx/sites-available/ || true
    
    # 사이트 활성화 (심볼릭 링크 생성)
    sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/ || true
    sudo ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/ || true
    sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr.conf /etc/nginx/sites-enabled/ || true
    
    # nginx 설정 테스트
    echo '🧪 nginx 설정 테스트 중...'
    if sudo nginx -t; then
        echo '✅ Nginx 설정 테스트 통과'
        
        # nginx 재로드
        echo '🔄 nginx 재로드 중...'
        sudo systemctl reload nginx
        
        # nginx 상태 확인
        if sudo systemctl is-active --quiet nginx; then
            echo '✅ Nginx 재로드 성공!'
            echo '📅 배포 시간: \$(date)'
            echo '📝 커밋: \$(git rev-parse HEAD)'
        else
            echo '❌ Nginx 재로드 실패'
            exit 1
        fi
    else
        echo '❌ Nginx 설정 테스트 실패!'
        echo '🔙 백업으로 롤백 중...'
        sudo cp -r \"\$BACKUP_DIR/sites-available\"/* /etc/nginx/sites-available/
        sudo cp -r \"\$BACKUP_DIR/sites-enabled\"/* /etc/nginx/sites-enabled/
        sudo systemctl reload nginx
        exit 1
    fi
    
    # 오래된 백업 정리 (최근 5개만 유지)
    echo '🧹 오래된 백업 정리 중...'
    sudo find /etc/nginx/backup -type d -name \"20*\" | sort -r | tail -n +6 | sudo xargs rm -rf || true
    
    echo '🎉 Nginx 배포 완료!'
"

log_success "Nginx 설정 배포 완료!"