#!/bin/bash
# 배포 후 웹서버에서 실행할 스크립트
# API 서버 실행 방지 및 웹서버 환경 검증

echo "========================================="
echo "배포 후 웹서버 환경 검증"
echo "========================================="
echo "실행 시간: $(date)"
echo ""

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API 서버 실행 여부 확인
echo "1. API 서버 상태 확인..."
if pm2 list | grep -q "o4o-api"; then
    echo -e "${RED}⚠️  경고: API 서버가 실행 중입니다!${NC}"
    echo "   API 서버를 중지합니다..."
    
    pm2 stop o4o-api
    pm2 delete o4o-api
    pm2 save
    
    echo -e "${GREEN}✅ API 서버 제거 완료${NC}"
else
    echo -e "${GREEN}✅ API 서버가 실행되지 않음 (정상)${NC}"
fi

echo ""
echo "2. 웹서버 프로세스 확인..."

# 웹서버 상태 확인
WEBSERVER_STATUS="NOT_RUNNING"
ADMIN_STATUS="NOT_RUNNING"

if pm2 list | grep -q "o4o-webserver.*online"; then
    WEBSERVER_STATUS="RUNNING"
fi

if pm2 list | grep -q "o4o-admin.*online"; then
    ADMIN_STATUS="RUNNING"
fi

# 상태 출력
if [ "$WEBSERVER_STATUS" = "RUNNING" ]; then
    echo -e "${GREEN}✅ 웹서버 실행 중 (포트 3000)${NC}"
else
    echo -e "${RED}❌ 웹서버가 실행되지 않음${NC}"
    echo "   웹서버를 시작합니다..."
    pm2 start /usr/bin/serve --name "o4o-webserver" -- -s apps/main-site/dist -l 3000
    echo -e "${GREEN}✅ 웹서버 시작 완료${NC}"
fi

if [ "$ADMIN_STATUS" = "RUNNING" ]; then
    echo -e "${GREEN}✅ 어드민 실행 중 (포트 3001)${NC}"
else
    echo -e "${RED}❌ 어드민이 실행되지 않음${NC}"
    echo "   어드민을 시작합니다..."
    pm2 start /usr/bin/serve --name "o4o-admin" -- -s apps/admin-dashboard/dist -l 3001
    echo -e "${GREEN}✅ 어드민 시작 완료${NC}"
fi

echo ""
echo "3. 포트 사용 현황 확인..."

# 포트 확인
PORT_3000=$(lsof -i:3000 | grep LISTEN | wc -l)
PORT_3001=$(lsof -i:3001 | grep LISTEN | wc -l)

if [ $PORT_3000 -gt 0 ]; then
    echo -e "${GREEN}✅ 포트 3000 사용 중 (웹서버)${NC}"
else
    echo -e "${YELLOW}⚠️  포트 3000이 사용되지 않음${NC}"
fi

if [ $PORT_3001 -gt 0 ]; then
    echo -e "${GREEN}✅ 포트 3001 사용 중 (어드민)${NC}"
else
    echo -e "${YELLOW}⚠️  포트 3001이 사용되지 않음${NC}"
fi

# PM2 설정 저장
echo ""
echo "4. PM2 설정 저장..."
pm2 save
echo -e "${GREEN}✅ PM2 설정 저장 완료${NC}"

# 최종 상태 출력
echo ""
echo "========================================="
echo "최종 PM2 프로세스 상태:"
echo "========================================="
pm2 list

echo ""
echo "========================================="
echo "배포 후 검증 완료!"
echo "========================================="
echo ""
echo "서비스 접속 URL:"
echo "- 메인 사이트: https://neture.co.kr (포트 3000)"
echo "- 어드민: https://admin.neture.co.kr (포트 3001)"
echo "- API 서버: https://api.neture.co.kr (별도 서버)"
echo ""
echo -e "${YELLOW}⚠️  중요: API 서버는 이 서버에서 실행되면 안 됩니다!${NC}"
echo "========================================="

# 로그 파일에 기록
LOG_FILE="/var/log/o4o-deploy.log"
echo "[$(date)] 배포 후 검증 완료. 웹서버: $WEBSERVER_STATUS, 어드민: $ADMIN_STATUS" >> $LOG_FILE 2>/dev/null

exit 0