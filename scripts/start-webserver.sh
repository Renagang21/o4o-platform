#!/bin/bash
# 웹서버 시작 스크립트
# API 서버 실행을 방지하고 웹서버 환경만 구동

echo "========================================="
echo "O4O 웹서버 시작"
echo "========================================="

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# API 서버가 실행 중이면 제거
echo "API 서버 상태 확인 중..."
if pm2 list | grep -q "o4o-api"; then
    echo "⚠️  API 서버가 실행 중입니다. 제거 중..."
    pm2 delete o4o-api 2>/dev/null
    pm2 save
    echo "✅ API 서버 제거 완료"
else
    echo "✅ API 서버가 실행되지 않음 (정상)"
fi

# 현재 PM2 상태 출력
echo ""
echo "현재 PM2 프로세스 상태:"
echo "----------------------------------------"
pm2 list
echo "----------------------------------------"

# 웹서버가 실행 중이 아니면 시작
if ! pm2 list | grep -q "o4o-webserver"; then
    echo "웹서버 시작 중..."
    pm2 start /usr/bin/serve --name "o4o-webserver" -- -s apps/main-site/dist -l 3000
    echo "✅ 웹서버 시작됨 (포트 3000)"
else
    echo "✅ 웹서버 이미 실행 중 (포트 3000)"
fi

# 어드민이 실행 중이 아니면 시작
if ! pm2 list | grep -q "o4o-admin"; then
    echo "어드민 대시보드 시작 중..."
    pm2 start /usr/bin/serve --name "o4o-admin" -- -s apps/admin-dashboard/dist -l 3001
    echo "✅ 어드민 시작됨 (포트 3001)"
else
    echo "✅ 어드민 이미 실행 중 (포트 3001)"
fi

# PM2 설정 저장
pm2 save

echo ""
echo "========================================="
echo "✅ 웹서버 환경 시작 완료!"
echo "========================================="
echo "접속 URL:"
echo "- 메인 사이트: http://localhost:3000"
echo "- 어드민: http://localhost:3001"
echo ""
echo "⚠️  API 서버는 별도 서버에서 실행됩니다"
echo "========================================="