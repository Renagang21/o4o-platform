#!/bin/bash

echo "📊 O4O Platform 동기화 상태 확인"
echo "=================================="

# Git 상태 확인
if [ -d "/opt/o4o-api-server/.git" ]; then
    echo "🔍 API 서버 Git 상태:"
    cd /opt/o4o-api-server
    git log --oneline -5
    echo ""
fi

if [ -d "/opt/o4o-web-servers/main-site/.git" ]; then
    echo "🔍 웹 서버 Git 상태:"
    cd /opt/o4o-web-servers/main-site
    git log --oneline -5
    echo ""
fi

# 프로세스 상태 확인
echo "🔄 실행 중인 서비스:"
pm2 list

# 로그 확인
echo "📝 최근 동기화 로그:"
tail -10 /var/log/o4o-*-sync.log 2>/dev/null || echo "로그 파일이 없습니다."