#!/bin/bash

# API 서버 배포 스크립트
# 사용법: ./scripts/deploy-apiserver.sh

set -e

API_HOST="43.202.242.215"
API_USER="ubuntu"

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

log_info "API 서버 배포 시작..."

# SSH 연결 테스트
if ! ssh -o ConnectTimeout=10 ${API_USER}@${API_HOST} "echo 'SSH 연결 성공'" 2>/dev/null; then
    log_error "SSH 연결 실패"
    exit 1
fi

log_info "API 서버에 배포 중..."

ssh ${API_USER}@${API_HOST} "
    cd /home/ubuntu/o4o-platform
    
    # 최신 코드 가져오기
    git fetch origin
    git pull origin main
    
    # pnpm 설치 확인
    if ! command -v pnpm &> /dev/null; then
        echo '📦 Installing pnpm...'
        npm install -g pnpm
        export PATH=\"\$PATH:\$(npm config get prefix)/bin\"
    fi
    
    # 의존성 설치
    pnpm install --frozen-lockfile
    
    # 패키지 빌드
    pnpm run build:packages
    
    # API 서버 빌드
    cd apps/api-server
    pnpm run build
    
    # 빌드 성공 확인
    if [ ! -d \"dist\" ] || [ -z \"\$(ls -A dist)\" ]; then
        echo '❌ 빌드 실패: dist 폴더가 비어있습니다'
        exit 1
    fi
    
    echo '✅ API 서버 빌드 완료!'
    
    # 데이터베이스 마이그레이션 확인
    echo '🗄️ 데이터베이스 마이그레이션 확인...'
    if pnpm run migration:show 2>/dev/null | grep -q \"No pending migrations\"; then
        echo '📝 대기 중인 마이그레이션 없음'
    else
        echo '🔄 데이터베이스 마이그레이션 실행...'
        pnpm run migration:run
    fi
    
    # PM2 API 서버 재시작
    echo '♻️ PM2 API 서버 재시작...'
    cd ../..
    
    # PM2 프로세스 확인
    pm2 list | grep -q \"o4o-api-server\" || echo '⚠️ PM2 프로세스 o4o-api-server를 찾을 수 없음'
    
    # API 서버 재시작
    if pm2 restart ecosystem.config.apiserver.cjs 2>/dev/null; then
        echo '✅ PM2 재시작 성공'
    else
        echo '🔧 PM2 설정 파일로 시작 중...'
        pm2 start ecosystem.config.apiserver.cjs
    fi
    
    # Health check
    echo '🏥 Health check...'
    sleep 3
    
    if curl -f http://localhost:3001/health 2>/dev/null; then
        echo '✅ API 서버가 정상적으로 실행 중'
    else
        echo '⚠️ Health check 실패 - 로그 확인 필요'
        echo '📋 PM2 로그: pm2 logs o4o-api-server'
    fi
    
    echo '🎉 API 서버 배포 완료!'
    echo '🌐 Local: http://localhost:3001'
    echo '🌐 External: https://api.neture.co.kr'
    echo '📅 배포 시간: \$(date)'
    echo '📝 커밋: \$(git rev-parse HEAD)'
"

log_success "API 서버 배포 완료!"