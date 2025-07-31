#!/bin/bash

# SSH Known Hosts Setup Script
# 이 스크립트는 SSH 연결 전에 known_hosts를 설정하여 
# "Host key verification failed" 오류를 방지합니다.

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Setting up SSH known hosts...${NC}"

# SSH 디렉토리 생성
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# known_hosts 파일 초기화
touch ~/.ssh/known_hosts
chmod 644 ~/.ssh/known_hosts

# 함수: 호스트 키 추가
add_host_key() {
    local host=$1
    local alias=$2
    
    echo -e "${YELLOW}Adding host key for: $host${NC}"
    
    # 호스트 키 스캔 (여러 포트 시도)
    for port in 22 2222; do
        if ssh-keyscan -p $port -H "$host" >> ~/.ssh/known_hosts.tmp 2>/dev/null; then
            echo -e "${GREEN}✅ Successfully scanned $host on port $port${NC}"
            break
        fi
    done
    
    # 도메인 이름으로도 추가 (별칭이 제공된 경우)
    if [ -n "$alias" ] && [ "$host" != "$alias" ]; then
        echo -e "${YELLOW}Also adding alias: $alias${NC}"
        ssh-keyscan -H "$alias" >> ~/.ssh/known_hosts.tmp 2>/dev/null || true
    fi
}

# 임시 파일 생성
> ~/.ssh/known_hosts.tmp

# API 서버 호스트 추가
if [ -n "$API_HOST" ]; then
    add_host_key "$API_HOST" "api.neture.co.kr"
fi

# 웹 서버 호스트 추가
if [ -n "$WEB_HOST" ]; then
    add_host_key "$WEB_HOST" "neture.co.kr"
    # 관리자 도메인도 추가
    ssh-keyscan -H "admin.neture.co.kr" >> ~/.ssh/known_hosts.tmp 2>/dev/null || true
fi

# IP 주소로도 추가 (제공된 경우)
if [ -n "$API_HOST_IP" ]; then
    echo -e "${YELLOW}Adding API host IP: $API_HOST_IP${NC}"
    ssh-keyscan -H "$API_HOST_IP" >> ~/.ssh/known_hosts.tmp 2>/dev/null || true
fi

if [ -n "$WEB_HOST_IP" ]; then
    echo -e "${YELLOW}Adding Web host IP: $WEB_HOST_IP${NC}"
    ssh-keyscan -H "$WEB_HOST_IP" >> ~/.ssh/known_hosts.tmp 2>/dev/null || true
fi

# 일반적인 도메인 추가 (환경 변수가 없는 경우 대비)
default_domains=(
    "api.neture.co.kr"
    "neture.co.kr"
    "admin.neture.co.kr"
)

for domain in "${default_domains[@]}"; do
    if ! grep -q "$domain" ~/.ssh/known_hosts.tmp; then
        echo -e "${YELLOW}Adding default domain: $domain${NC}"
        ssh-keyscan -H "$domain" >> ~/.ssh/known_hosts.tmp 2>/dev/null || true
    fi
done

# 중복 제거 및 최종 파일로 이동
sort -u ~/.ssh/known_hosts.tmp >> ~/.ssh/known_hosts
rm -f ~/.ssh/known_hosts.tmp

# SSH 설정 파일 생성/업데이트
if [ ! -f ~/.ssh/config ]; then
    echo -e "${GREEN}Creating SSH config...${NC}"
    cat > ~/.ssh/config << 'EOF'
Host *
    StrictHostKeyChecking no
    UserKnownHostsFile ~/.ssh/known_hosts
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ConnectTimeout 10
    TCPKeepAlive yes
    Compression yes
EOF
    chmod 600 ~/.ssh/config
fi

# 결과 출력
echo -e "${GREEN}✅ SSH known hosts setup completed${NC}"
echo -e "${GREEN}Total hosts added: $(wc -l < ~/.ssh/known_hosts)${NC}"

# 디버그 정보 (필요시)
if [ "$DEBUG" = "true" ]; then
    echo -e "${YELLOW}Known hosts content:${NC}"
    cat ~/.ssh/known_hosts
fi