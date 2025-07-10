#!/bin/bash

# O4O Platform - SSL 인증서 설정 및 자동 갱신 스크립트
# Let's Encrypt를 사용하여 도메인별 SSL 인증서 발급 및 관리

set -e

# 색상 및 로그 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 도메인 목록 정의
DOMAINS=(
    "neture.co.kr"
    "www.neture.co.kr"
    "admin.neture.co.kr"
    "api.neture.co.kr"
)

# 이메일 설정 (Let's Encrypt 계정용)
EMAIL="admin@neture.co.kr"
WEBROOT="/var/www/html"

# 시스템 요구사항 확인
check_requirements() {
    log "시스템 요구사항 확인 중..."
    
    # root 권한 확인
    if [[ $EUID -ne 0 ]]; then
        error "이 스크립트는 root 권한이 필요합니다. sudo를 사용하여 실행하세요."
    fi
    
    # 운영체제 확인
    if [[ ! -f /etc/os-release ]]; then
        error "지원되지 않는 운영체제입니다."
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] && [[ "$ID" != "debian" ]]; then
        error "이 스크립트는 Ubuntu/Debian 시스템에서만 지원됩니다."
    fi
    
    log "시스템 요구사항 확인 완료 (OS: $PRETTY_NAME)"
}

# Certbot 설치
install_certbot() {
    log "Certbot 설치 중..."
    
    # 패키지 목록 업데이트
    apt-get update
    
    # Certbot 설치
    apt-get install -y certbot python3-certbot-nginx
    
    # 설치 확인
    if ! command -v certbot &> /dev/null; then
        error "Certbot 설치에 실패했습니다."
    fi
    
    log "Certbot 설치 완료"
}

# Nginx 설치 및 설정
setup_nginx() {
    log "Nginx 설치 및 기본 설정 중..."
    
    # Nginx 설치
    apt-get install -y nginx
    
    # Nginx 서비스 활성화
    systemctl enable nginx
    systemctl start nginx
    
    # 기본 웹루트 디렉토리 생성
    mkdir -p $WEBROOT
    
    # 임시 인덱스 파일 생성 (SSL 인증서 발급용)
    cat > $WEBROOT/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>O4O Platform - SSL Setup</title>
</head>
<body>
    <h1>O4O Platform SSL 설정 중...</h1>
    <p>SSL 인증서 발급이 완료되면 서비스가 시작됩니다.</p>
</body>
</html>
EOF
    
    # 기본 Nginx 설정 (SSL 발급 전)
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    root /var/www/html;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location ~ /.well-known/acme-challenge/ {
        allow all;
    }
}
EOF
    
    # Nginx 설정 테스트 및 재시작
    nginx -t
    systemctl reload nginx
    
    log "Nginx 설치 및 기본 설정 완료"
}

# 도메인별 SSL 인증서 발급
issue_ssl_certificates() {
    log "SSL 인증서 발급 시작..."
    
    # 각 도메인에 대해 인증서 발급
    for domain in "${DOMAINS[@]}"; do
        log "도메인 $domain에 대한 SSL 인증서 발급 중..."
        
        # 웹루트 방식으로 인증서 발급
        certbot certonly \
            --webroot \
            --webroot-path=$WEBROOT \
            --email=$EMAIL \
            --agree-tos \
            --non-interactive \
            --domains=$domain \
            --expand
        
        if [[ $? -eq 0 ]]; then
            log "도메인 $domain SSL 인증서 발급 완료"
        else
            error "도메인 $domain SSL 인증서 발급 실패"
        fi
    done
    
    log "모든 SSL 인증서 발급 완료"
}

# 운영환경 Nginx 설정 적용
apply_production_config() {
    log "운영환경 Nginx 설정 적용 중..."
    
    # 기존 설정 백업
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    
    # 운영환경 설정 복사
    if [[ -f "/home/ubuntu/o4o-platform/nginx/production.conf" ]]; then
        cp /home/ubuntu/o4o-platform/nginx/production.conf /etc/nginx/sites-available/production
    else
        error "운영환경 Nginx 설정 파일을 찾을 수 없습니다."
    fi
    
    # 기본 설정 비활성화
    rm -f /etc/nginx/sites-enabled/default
    
    # 운영환경 설정 활성화
    ln -sf /etc/nginx/sites-available/production /etc/nginx/sites-enabled/
    
    # 설정 테스트
    nginx -t
    
    if [[ $? -eq 0 ]]; then
        systemctl reload nginx
        log "운영환경 Nginx 설정 적용 완료"
    else
        error "Nginx 설정 테스트 실패"
    fi
}

# 자동 갱신 설정
setup_auto_renewal() {
    log "SSL 인증서 자동 갱신 설정 중..."
    
    # 갱신 테스트
    certbot renew --dry-run
    
    if [[ $? -eq 0 ]]; then
        log "SSL 인증서 자동 갱신 테스트 성공"
    else
        warn "SSL 인증서 자동 갱신 테스트 실패"
    fi
    
    # 크론탭에 자동 갱신 작업 추가
    CRON_JOB="0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
    
    # 기존 크론탭 확인
    if ! crontab -l | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        log "SSL 인증서 자동 갱신 크론탭 추가 완료"
    else
        log "SSL 인증서 자동 갱신 크론탭이 이미 설정되어 있습니다."
    fi
}

# 보안 강화 설정
enhance_security() {
    log "보안 강화 설정 적용 중..."
    
    # DH 매개변수 생성 (2048비트)
    if [[ ! -f /etc/ssl/certs/dhparam.pem ]]; then
        openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
        log "DH 매개변수 생성 완료"
    fi
    
    # Nginx 보안 설정 파일 생성
    cat > /etc/nginx/conf.d/security.conf << 'EOF'
# 보안 강화 설정
server_tokens off;
add_header X-Frame-Options SAMEORIGIN always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# SSL 보안 설정
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_dhparam /etc/ssl/certs/dhparam.pem;
EOF
    
    log "보안 강화 설정 완료"
}

# 인증서 상태 확인
check_certificates() {
    log "SSL 인증서 상태 확인 중..."
    
    for domain in "${DOMAINS[@]}"; do
        if [[ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]]; then
            expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -noout -dates | grep notAfter | cut -d= -f2)
            log "도메인 $domain: 인증서 만료일 - $expiry_date"
        else
            warn "도메인 $domain: 인증서 파일을 찾을 수 없습니다."
        fi
    done
    
    # 전체 인증서 목록 확인
    certbot certificates
}

# 방화벽 설정
setup_firewall() {
    log "방화벽 설정 중..."
    
    # UFW 활성화
    ufw --force enable
    
    # 기본 정책 설정
    ufw default deny incoming
    ufw default allow outgoing
    
    # 필요한 포트 허용
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 80
    ufw allow 443
    
    # 방화벽 상태 확인
    ufw status
    
    log "방화벽 설정 완료"
}

# 메인 실행 함수
main() {
    log "O4O Platform SSL 설정 스크립트 시작"
    
    # 실행 단계
    check_requirements
    install_certbot
    setup_nginx
    issue_ssl_certificates
    apply_production_config
    setup_auto_renewal
    enhance_security
    setup_firewall
    check_certificates
    
    log "SSL 설정 완료!"
    log "다음 단계:"
    log "1. 각 도메인에 대한 DNS 설정 확인"
    log "2. PM2로 애플리케이션 서비스 시작"
    log "3. https://neture.co.kr 접속 테스트"
    log "4. https://admin.neture.co.kr 접속 테스트"
    log "5. https://api.neture.co.kr/health 헬스체크 테스트"
}

# 스크립트 실행
main "$@"