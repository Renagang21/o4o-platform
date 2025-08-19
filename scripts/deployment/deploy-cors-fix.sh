#!/bin/bash
# ================================
# 프로덕션 API 서버 CORS 긴급 수정 배포
# ================================

set -e

echo "🚨 프로덕션 API 서버 CORS 긴급 수정 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 환경 변수 확인
if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ] || [ -z "$SSH_KEY" ]; then
    echo -e "${YELLOW}SSH 환경 변수가 설정되지 않았습니다. 기본값 사용...${NC}"
    SSH_HOST="43.202.242.215"
    SSH_USER="ubuntu"
fi

# Step 1: 로컬에서 빌드
echo -e "${YELLOW}1. 로컬에서 API 서버 빌드...${NC}"
cd apps/api-server
npm run build
cd ../..

# Step 2: 빌드된 파일 압축
echo -e "${YELLOW}2. 빌드 파일 압축...${NC}"
tar -czf api-server-dist.tar.gz -C apps/api-server dist

# Step 3: 서버로 전송
echo -e "${YELLOW}3. 서버로 빌드 파일 전송...${NC}"
if [ -n "$SSH_KEY" ]; then
    # GitHub Actions에서 실행
    echo "$SSH_KEY" > /tmp/deploy_key
    chmod 600 /tmp/deploy_key
    scp -o StrictHostKeyChecking=no -i /tmp/deploy_key api-server-dist.tar.gz $SSH_USER@$SSH_HOST:/tmp/
    rm /tmp/deploy_key
else
    # 로컬에서 실행
    scp api-server-dist.tar.gz $SSH_USER@$SSH_HOST:/tmp/
fi

# Step 4: 서버에서 배포 및 재시작
echo -e "${YELLOW}4. 서버에서 배포 및 재시작...${NC}"
SSH_COMMAND="ssh -o StrictHostKeyChecking=no"
if [ -n "$SSH_KEY" ]; then
    echo "$SSH_KEY" > /tmp/deploy_key
    chmod 600 /tmp/deploy_key
    SSH_COMMAND="ssh -o StrictHostKeyChecking=no -i /tmp/deploy_key"
fi

$SSH_COMMAND $SSH_USER@$SSH_HOST << 'ENDSSH'
    set -e
    
    # 백업 생성
    echo "백업 생성..."
    if [ -d "/home/ubuntu/o4o-platform/apps/api-server/dist" ]; then
        cp -r /home/ubuntu/o4o-platform/apps/api-server/dist /home/ubuntu/o4o-platform/apps/api-server/dist.backup
    fi
    
    # 새 빌드 파일 압축 해제
    echo "새 빌드 파일 배포..."
    cd /home/ubuntu/o4o-platform/apps/api-server
    tar -xzf /tmp/api-server-dist.tar.gz
    
    # PM2로 재시작
    echo "PM2로 API 서버 재시작..."
    pm2 restart o4o-api --update-env
    
    # 상태 확인
    sleep 3
    pm2 status o4o-api
    
    # 로그 확인
    echo "최근 로그:"
    pm2 logs o4o-api --lines 10 --nostream
    
    # 정리
    rm /tmp/api-server-dist.tar.gz
    
    echo "✅ 배포 완료!"
ENDSSH

# SSH 키 정리
if [ -n "$SSH_KEY" ] && [ -f "/tmp/deploy_key" ]; then
    rm /tmp/deploy_key
fi

# 로컬 정리
rm api-server-dist.tar.gz

# Step 5: CORS 테스트
echo -e "${YELLOW}5. CORS 설정 테스트...${NC}"
sleep 5

# OPTIONS 요청 테스트
echo "OPTIONS 요청 테스트:"
curl -I -X OPTIONS http://api.neture.co.kr/api/v1/auth/login \
  -H 'Origin: https://admin.neture.co.kr' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' 2>/dev/null | grep -i "access-control" || echo "CORS 헤더를 찾을 수 없습니다."

echo ""
echo -e "${GREEN}✅ CORS 수정 배포 완료!${NC}"
echo -e "${YELLOW}브라우저에서 admin.neture.co.kr 접속하여 테스트해보세요.${NC}"