#!/bin/bash

# 🚀 O4O Platform 스테이징 배포 스크립트
# GitHub Actions에서 사용되는 자동 배포 스크립트

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 확인
check_env_vars() {
    log_info "환경 변수 확인 중..."
    
    required_vars=("STAGING_HOST" "STAGING_USER" "STAGING_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "필수 환경 변수가 설정되지 않음: $var"
            exit 1
        fi
    done
    
    log_success "모든 환경 변수가 설정됨"
}

# SSH 키 설정
setup_ssh() {
    log_info "SSH 키 설정 중..."
    
    mkdir -p ~/.ssh
    echo "$STAGING_KEY" > ~/.ssh/staging_key
    chmod 600 ~/.ssh/staging_key
    
    # SSH 설정
    cat >> ~/.ssh/config << EOF
Host staging
    HostName $STAGING_HOST
    User $STAGING_USER
    IdentityFile ~/.ssh/staging_key
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
    
    log_success "SSH 키 설정 완료"
}

# 서버 연결 테스트
test_connection() {
    log_info "서버 연결 테스트 중..."
    
    if ssh staging "echo 'Connection successful'"; then
        log_success "서버 연결 성공"
    else
        log_error "서버 연결 실패"
        exit 1
    fi
}

# 빌드 아티팩트 압축
package_artifacts() {
    log_info "빌드 아티팩트 압축 중..."
    
    # 빌드 파일들을 하나의 압축 파일로 생성
    tar -czf deployment.tar.gz \
        builds/ \
        scripts/ \
        package.json \
        ecosystem.config.js \
        || {
            log_error "아티팩트 압축 실패"
            exit 1
        }
    
    log_success "아티팩트 압축 완료: deployment.tar.gz"
}

# 서버에 파일 업로드
upload_files() {
    log_info "서버에 파일 업로드 중..."
    
    # 압축 파일을 서버에 업로드
    scp deployment.tar.gz staging:/tmp/ || {
        log_error "파일 업로드 실패"
        exit 1
    }
    
    log_success "파일 업로드 완료"
}

# 서버에서 배포 실행
deploy_on_server() {
    log_info "서버에서 배포 실행 중..."
    
    ssh staging << 'EOF'
        set -e
        
        # 배포 디렉토리 설정
        DEPLOY_DIR="/var/www/o4o-platform-staging"
        BACKUP_DIR="/var/backups/o4o-platform-staging"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        
        echo "📦 배포 준비 중..."
        
        # 백업 디렉토리 생성
        mkdir -p $BACKUP_DIR
        
        # 기존 애플리케이션 백업 (존재하는 경우)
        if [ -d "$DEPLOY_DIR" ]; then
            echo "🔄 기존 애플리케이션 백업 중..."
            tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$DEPLOY_DIR" . 2>/dev/null || true
        fi
        
        # 배포 디렉토리 생성 및 권한 설정
        sudo mkdir -p $DEPLOY_DIR
        sudo chown $USER:$USER $DEPLOY_DIR
        
        # 압축 파일 해제
        echo "📂 배포 파일 압축 해제 중..."
        cd $DEPLOY_DIR
        tar -xzf /tmp/deployment.tar.gz
        
        # 빌드 파일들을 적절한 위치로 이동
        echo "📁 빌드 파일 재배치 중..."
        
        # API Server
        if [ -d "builds/build-api-server" ]; then
            mkdir -p services/api-server
            cp -r builds/build-api-server/* services/api-server/
        fi
        
        # Main Site
        if [ -d "builds/build-main-site" ]; then
            mkdir -p services/main-site
            cp -r builds/build-main-site/* services/main-site/
        fi
        
        # Admin Dashboard
        if [ -d "builds/build-admin-dashboard" ]; then
            mkdir -p services/admin-dashboard
            cp -r builds/build-admin-dashboard/* services/admin-dashboard/
        fi
        
        # 환경 변수 설정
        echo "⚙️  환경 변수 설정 중..."
        
        # API Server 환경 변수
        cat > services/api-server/.env << EOL
NODE_ENV=staging
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_staging
DB_PASSWORD=${DB_PASSWORD:-staging_password}
DB_NAME=o4o_platform_staging
JWT_SECRET=${JWT_SECRET:-staging_jwt_secret}
EOL
        
        # Main Site 환경 변수
        cat > services/main-site/.env << EOL
VITE_API_URL=http://$STAGING_HOST:4000/api
VITE_NODE_ENV=staging
EOL
        
        # Admin Dashboard 환경 변수
        cat > services/admin-dashboard/.env << EOL
VITE_API_URL=http://$STAGING_HOST:4000/api
VITE_NODE_ENV=staging
EOL
        
        # PM2 ecosystem 파일 복사
        if [ -f "ecosystem.config.js" ]; then
            cp ecosystem.config.js ecosystem.staging.config.js
            
            # 스테이징 환경에 맞게 설정 수정
            sed -i 's/"production"/"staging"/g' ecosystem.staging.config.js
            sed -i 's/3000/3100/g' ecosystem.staging.config.js  # Main Site 포트 변경
            sed -i 's/3001/3101/g' ecosystem.staging.config.js  # Admin Dashboard 포트 변경
        fi
        
        echo "✅ 파일 준비 완료"
EOF
    
    log_success "서버 파일 준비 완료"
}

# PM2로 애플리케이션 시작/재시작
restart_services() {
    log_info "서비스 재시작 중..."
    
    ssh staging << 'EOF'
        set -e
        
        DEPLOY_DIR="/var/www/o4o-platform-staging"
        cd $DEPLOY_DIR
        
        echo "🔄 PM2 서비스 관리 중..."
        
        # PM2가 설치되어 있는지 확인
        if ! command -v pm2 &> /dev/null; then
            echo "📦 PM2 설치 중..."
            npm install -g pm2
        fi
        
        # 기존 프로세스 중지 (에러 무시)
        pm2 delete o4o-staging 2>/dev/null || true
        
        # 새 프로세스 시작
        if [ -f "ecosystem.staging.config.js" ]; then
            echo "🚀 PM2로 애플리케이션 시작 중..."
            pm2 start ecosystem.staging.config.js
        else
            echo "⚠️  PM2 설정 파일이 없어 수동으로 서비스 시작..."
            
            # API Server 시작
            cd services/api-server
            pm2 start node --name "o4o-api-staging" -- server.js
            cd ../..
            
            # Static 파일 서빙을 위한 서버 시작 (serve 사용)
            npm install -g serve
            pm2 start serve --name "o4o-web-staging" -- -s services/main-site -l 3100
            pm2 start serve --name "o4o-admin-staging" -- -s services/admin-dashboard -l 3101
        fi
        
        # PM2 설정 저장
        pm2 save
        
        # PM2 상태 확인
        pm2 status
        
        echo "✅ 서비스 시작 완료"
EOF
    
    log_success "서비스 재시작 완료"
}

# 헬스 체크
health_check() {
    log_info "헬스 체크 실행 중..."
    
    # 서비스 시작 대기
    sleep 30
    
    # API 서버 헬스 체크
    if curl -f "http://$STAGING_HOST:4000/health" > /dev/null 2>&1; then
        log_success "API 서버 헬스 체크 통과"
    else
        log_warning "API 서버 헬스 체크 실패 (정상일 수 있음)"
    fi
    
    # 웹 서버 헬스 체크
    if curl -f "http://$STAGING_HOST:3100" > /dev/null 2>&1; then
        log_success "웹 서버 헬스 체크 통과"
    else
        log_warning "웹 서버 헬스 체크 실패"
    fi
    
    # 관리자 대시보드 헬스 체크
    if curl -f "http://$STAGING_HOST:3101" > /dev/null 2>&1; then
        log_success "관리자 대시보드 헬스 체크 통과"
    else
        log_warning "관리자 대시보드 헬스 체크 실패"
    fi
    
    log_success "헬스 체크 완료"
}

# 배포 결과 알림
notify_deployment() {
    log_info "배포 결과 알림 중..."
    
    ssh staging << 'EOF'
        echo "🎉 스테이징 배포 완료!"
        echo "📊 서비스 상태:"
        pm2 status
        echo ""
        echo "🔗 접속 URL:"
        echo "  - 메인 사이트: http://$STAGING_HOST:3100"
        echo "  - 관리자: http://$STAGING_HOST:3101" 
        echo "  - API: http://$STAGING_HOST:4000"
EOF
    
    log_success "배포 완료 알림 전송"
}

# 정리 작업
cleanup() {
    log_info "정리 작업 실행 중..."
    
    # 로컬 임시 파일 정리
    rm -f deployment.tar.gz
    
    # 서버 임시 파일 정리
    ssh staging "rm -f /tmp/deployment.tar.gz"
    
    log_success "정리 작업 완료"
}

# 에러 핸들링
error_handler() {
    log_error "배포 중 오류가 발생했습니다!"
    log_info "롤백을 시작합니다..."
    
    ssh staging << 'EOF'
        DEPLOY_DIR="/var/www/o4o-platform-staging"
        BACKUP_DIR="/var/backups/o4o-platform-staging"
        
        # 최신 백업 파일 찾기
        LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_*.tar.gz 2>/dev/null | head -n1)
        
        if [ -n "$LATEST_BACKUP" ]; then
            echo "🔄 최신 백업으로 롤백 중: $LATEST_BACKUP"
            cd $DEPLOY_DIR
            tar -xzf "$LATEST_BACKUP"
            pm2 restart all
            echo "✅ 롤백 완료"
        else
            echo "⚠️  사용 가능한 백업이 없습니다"
        fi
EOF
    
    cleanup
    exit 1
}

# 메인 실행 함수
main() {
    log_info "🚀 O4O Platform 스테이징 배포 시작"
    
    # 에러 트랩 설정
    trap error_handler ERR
    
    # 단계별 실행
    check_env_vars
    setup_ssh
    test_connection
    package_artifacts
    upload_files
    deploy_on_server
    restart_services
    health_check
    notify_deployment
    cleanup
    
    log_success "🎉 스테이징 배포가 성공적으로 완료되었습니다!"
    log_info "🔗 스테이징 URL: http://$STAGING_HOST:3100"
    log_info "🔗 관리자 URL: http://$STAGING_HOST:3101"
}

# 스크립트 실행
main "$@"