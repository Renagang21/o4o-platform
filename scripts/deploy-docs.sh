#!/bin/bash

# O4O Platform Documentation Deployment Script
# 문서 파일만 웹 서버에 배포하는 간단한 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 루트
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 서버 정보
WEB_SERVER="webserver"
DOCS_PATH="/var/www/admin-dashboard/docs"

echo -e "${BLUE}📚 O4O Platform 문서 배포${NC}"
echo -e "${BLUE}================================${NC}\n"

# SSH 연결 테스트
echo -e "${BLUE}🔌 웹서버 연결 테스트...${NC}"
if ! ssh "$WEB_SERVER" "echo '연결 성공'" > /dev/null 2>&1; then
    echo -e "${RED}❌ 웹서버 SSH 연결 실패${NC}"
    echo "SSH 설정을 확인하세요: ssh $WEB_SERVER"
    exit 1
fi
echo -e "${GREEN}✅ 연결 성공${NC}\n"

# 문서 파일 복사
echo -e "${BLUE}📤 문서 파일 업로드 중...${NC}"
rsync -avz --delete \
    "$PROJECT_ROOT/docs/" \
    "$WEB_SERVER:$DOCS_PATH/" \
    --exclude='.git' \
    --exclude='node_modules'

echo -e "\n${GREEN}✅ 문서 배포 완료!${NC}"
echo -e "${BLUE}📍 배포 위치: $WEB_SERVER:$DOCS_PATH${NC}\n"
