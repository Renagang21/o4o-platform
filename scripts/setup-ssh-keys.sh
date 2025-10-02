#!/bin/bash

# SSH 키 설정 스크립트
# 제공된 SSH 키를 저장하고 배포 준비

set -e

echo "🔐 SSH 키 설정 스크립트"
echo "======================="
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# SSH 디렉토리 생성
SSH_DIR="$HOME/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

echo -e "${BLUE}SSH 키를 저장할 위치를 선택하세요:${NC}"
echo ""

# API 서버 키 설정
echo -e "${YELLOW}1. API 서버 SSH 키 (ubuntu@43.202.242.215)${NC}"
echo "   저장 위치: $SSH_DIR/o4o_api_key"
echo "   이 파일에 API 서버용 SSH 개인키를 붙여넣으세요."
echo ""

# 웹 서버 키 설정
echo -e "${YELLOW}2. 웹 서버 SSH 키 (sohae21@13.125.144.8)${NC}"
echo "   저장 위치: $SSH_DIR/o4o_web_key"
echo "   이 파일에 웹 서버용 SSH 개인키를 붙여넣으세요."
echo ""

echo -e "${BLUE}SSH 키 저장 방법:${NC}"
echo ""
echo "방법 1: 직접 편집"
echo "  vim $SSH_DIR/o4o_api_key  # API 서버 키"
echo "  vim $SSH_DIR/o4o_web_key  # 웹 서버 키"
echo ""
echo "방법 2: echo 명령 사용 (한 줄로 제공된 경우)"
echo "  echo 'SSH_KEY_CONTENT' > $SSH_DIR/o4o_api_key"
echo "  echo 'SSH_KEY_CONTENT' > $SSH_DIR/o4o_web_key"
echo ""
echo "방법 3: cat 명령 사용 (여러 줄)"
echo "  cat > $SSH_DIR/o4o_api_key << 'EOF'"
echo "  -----BEGIN RSA PRIVATE KEY-----"
echo "  [키 내용]"
echo "  -----END RSA PRIVATE KEY-----"
echo "  EOF"
echo ""

# 키 권한 설정 함수
set_key_permissions() {
    local key_file=$1
    if [ -f "$key_file" ]; then
        chmod 600 "$key_file"
        echo -e "${GREEN}✅ $key_file 권한 설정 완료${NC}"
    fi
}

# 기존 키 확인
echo -e "${BLUE}기존 SSH 키 확인:${NC}"
if [ -f "$SSH_DIR/o4o_api_key" ]; then
    echo -e "${GREEN}  ✓ API 서버 키 존재: $SSH_DIR/o4o_api_key${NC}"
    set_key_permissions "$SSH_DIR/o4o_api_key"
else
    echo -e "${YELLOW}  - API 서버 키 없음${NC}"
fi

if [ -f "$SSH_DIR/o4o_web_key" ]; then
    echo -e "${GREEN}  ✓ 웹 서버 키 존재: $SSH_DIR/o4o_web_key${NC}"
    set_key_permissions "$SSH_DIR/o4o_web_key"
else
    echo -e "${YELLOW}  - 웹 서버 키 없음${NC}"
fi
echo ""

# SSH config 설정 제안
echo -e "${BLUE}SSH config 설정 (선택사항):${NC}"
echo "다음 내용을 ~/.ssh/config에 추가하면 편리합니다:"
echo ""
cat << 'EOF'
# O4O API Server
Host o4o-api
    HostName 43.202.242.215
    User ubuntu
    IdentityFile ~/.ssh/o4o_api_key
    StrictHostKeyChecking no

# O4O Web Server
Host o4o-web
    HostName 13.125.144.8
    User sohae21
    IdentityFile ~/.ssh/o4o_web_key
    StrictHostKeyChecking no
EOF
echo ""

echo -e "${GREEN}배포 명령 예제:${NC}"
echo ""
echo "# API 서버 배포"
echo "./scripts/deploy-with-ssh.sh --api --key $SSH_DIR/o4o_api_key"
echo ""
echo "# 웹 서버 배포"
echo "./scripts/deploy-with-ssh.sh --web --key $SSH_DIR/o4o_web_key"
echo ""
echo "# SSH config 설정 후 간단한 접속"
echo "ssh o4o-api  # API 서버 접속"
echo "ssh o4o-web  # 웹 서버 접속"
echo ""

echo -e "${YELLOW}⚠️  주의사항:${NC}"
echo "- SSH 키는 개인키이므로 절대 공유하지 마세요"
echo "- 키 파일 권한은 600이어야 합니다 (자동 설정됨)"
echo "- GitHub에 업로드하지 마세요"