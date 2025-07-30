#!/bin/bash

# 포트 8080/8443 적용 스크립트
# api.neture.co.kr 접속 문제 해결을 위한 대체 포트 설정

set -e

echo "=== O4O Platform 포트 8080/8443 적용 스크립트 ==="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 서버 정보
API_SERVER="43.202.242.215"
WEB_SERVER="13.125.144.8"

echo -e "${YELLOW}주의: 이 스크립트는 각 서버에서 직접 실행해야 합니다.${NC}"
echo ""

# 현재 서버 확인
CURRENT_IP=$(hostname -I | awk '{print $1}')

if [[ "$CURRENT_IP" == *"$API_SERVER"* ]]; then
    echo -e "${GREEN}API 서버 설정을 진행합니다...${NC}"
    SERVER_TYPE="api"
elif [[ "$CURRENT_IP" == *"$WEB_SERVER"* ]]; then
    echo -e "${GREEN}웹 서버 설정을 진행합니다...${NC}"
    SERVER_TYPE="web"
else
    echo -e "${RED}알 수 없는 서버입니다. 수동으로 설정하세요.${NC}"
    exit 1
fi

# API 서버 설정
if [ "$SERVER_TYPE" = "api" ]; then
    echo "1. Nginx 설정 백업..."
    sudo cp /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-available/api.neture.co.kr.backup-$(date +%Y%m%d-%H%M%S) || true

    echo "2. 새 Nginx 설정 복사..."
    sudo cp /home/ubuntu/o4o-platform/deployment/nginx/api.neture.co.kr.conf /etc/nginx/sites-available/api.neture.co.kr

    echo "3. Nginx 설정 테스트..."
    sudo nginx -t

    echo "4. Nginx 재시작..."
    sudo systemctl reload nginx

    echo "5. API 서버 환경 변수 확인..."
    if [ -f "/home/ubuntu/o4o-platform/apps/api-server/.env.production" ]; then
        echo "   프로덕션 환경 변수 파일이 있습니다."
    else
        echo -e "${YELLOW}   주의: .env.production 파일이 없습니다. 필요시 생성하세요.${NC}"
    fi

    echo "6. PM2 재시작..."
    cd /home/ubuntu/o4o-platform
    pm2 restart api-server

    echo "7. 헬스체크..."
    sleep 5
    curl -f http://localhost:4000/api/health || echo -e "${RED}헬스체크 실패${NC}"

    echo ""
    echo -e "${GREEN}API 서버 설정 완료!${NC}"
    echo "접속 주소: https://api.neture.co.kr:8443"
fi

# 웹 서버 설정
if [ "$SERVER_TYPE" = "web" ]; then
    echo "1. Nginx 설정 백업..."
    sudo cp /etc/nginx/sites-available/neture.co.kr /etc/nginx/sites-available/neture.co.kr.backup-$(date +%Y%m%d-%H%M%S) || true
    sudo cp /etc/nginx/sites-available/admin.neture.co.kr /etc/nginx/sites-available/admin.neture.co.kr.backup-$(date +%Y%m%d-%H%M%S) || true

    echo "2. 새 Nginx 설정 복사..."
    sudo cp /home/ubuntu/o4o-platform/deployment/nginx/neture.co.kr-8080.conf /etc/nginx/sites-available/neture.co.kr
    sudo cp /home/ubuntu/o4o-platform/deployment/nginx/admin.neture.co.kr-8080.conf /etc/nginx/sites-available/admin.neture.co.kr

    echo "3. Nginx 설정 테스트..."
    sudo nginx -t

    echo "4. Nginx 재시작..."
    sudo systemctl reload nginx

    echo "5. 빌드된 파일 확인..."
    ls -la /var/www/neture.co.kr/ | head -5
    ls -la /var/www/admin.neture.co.kr/ | head -5

    echo ""
    echo -e "${GREEN}웹 서버 설정 완료!${NC}"
    echo "접속 주소:"
    echo "  - https://www.neture.co.kr:8443"
    echo "  - https://admin.neture.co.kr:8443"
fi

echo ""
echo "=== 설정 완료 ==="
echo ""
echo "다음 단계:"
echo "1. 브라우저에서 :8443 포트로 접속 테스트"
echo "2. 프론트엔드 빌드 시 .env.production 파일 사용 확인"
echo "3. DNS 설정은 변경하지 않아도 됩니다"
echo ""
echo -e "${YELLOW}주의: SSL 인증서가 :8443 포트에서 경고가 나올 수 있습니다.${NC}"