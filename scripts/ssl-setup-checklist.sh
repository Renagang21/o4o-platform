#!/bin/bash

# SSL 설정 전 체크리스트 스크립트

echo "🔍 SSL 설정 사전 체크리스트"
echo "=========================="

# 1. DNS 설정 확인
echo -e "\n1️⃣ DNS 설정 확인"
echo "도메인이 올바른 IP를 가리키는지 확인:"
echo "nslookup neture.co.kr"
echo "nslookup www.neture.co.kr"
echo "nslookup admin.neture.co.kr"
echo "nslookup api.neture.co.kr"

# 2. 현재 실행 중인 서비스 확인
echo -e "\n2️⃣ 실행 중인 서비스 포트 확인"
echo "sudo netstat -tlnp | grep -E ':3000|:3001|:4000'"

# 3. PM2 프로세스 상태
echo -e "\n3️⃣ PM2 프로세스 상태"
echo "pm2 list"

# 4. 기존 Nginx 설정 백업
echo -e "\n4️⃣ Nginx 백업 (설치되어 있는 경우)"
echo "sudo cp -r /etc/nginx /etc/nginx.backup.\$(date +%Y%m%d%H%M%S)"

# 5. 방화벽 상태 확인
echo -e "\n5️⃣ 방화벽 상태"
echo "sudo ufw status"

# 6. 디스크 공간 확인
echo -e "\n6️⃣ 디스크 공간"
echo "df -h"

# 7. 시스템 리소스 확인
echo -e "\n7️⃣ 시스템 리소스"
echo "free -m"
echo "top -bn1 | head -10"

echo -e "\n✅ 모든 확인이 완료되면 SSL 설정을 시작하세요!"