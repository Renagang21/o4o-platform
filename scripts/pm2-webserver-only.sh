#!/bin/bash
# 웹서버 전용 PM2 시작 스크립트
# API 서버 실행을 방지하고 웹서버와 어드민만 시작

echo "========================================="
echo "웹서버 전용 PM2 설정 시작"
echo "========================================="

# API 서버가 실행 중이면 중지
echo "기존 API 서버 확인 중..."
if pm2 list | grep -q "o4o-api"; then
    echo "API 서버 중지 중..."
    pm2 stop o4o-api 2>/dev/null
    pm2 delete o4o-api 2>/dev/null
    echo "✅ API 서버 제거 완료"
fi

# 기존 웹서버 프로세스도 정리
echo "기존 웹서버 프로세스 정리 중..."
pm2 delete o4o-webserver 2>/dev/null
pm2 delete o4o-admin 2>/dev/null

# 웹서버와 어드민만 시작
echo "웹서버 시작 중..."
pm2 start /usr/bin/serve --name "o4o-webserver" -- -s apps/main-site/dist -l 3000
echo "✅ 웹서버 시작 (포트 3000)"

echo "어드민 대시보드 시작 중..."
pm2 start /usr/bin/serve --name "o4o-admin" -- -s apps/admin-dashboard/dist -l 3001
echo "✅ 어드민 시작 (포트 3001)"

# PM2 설정 저장
echo "PM2 설정 저장 중..."
pm2 save
pm2 startup

echo "========================================="
echo "웹서버 환경 설정 완료!"
echo "========================================="
echo ""
echo "현재 실행 중인 서비스:"
pm2 list
echo ""
echo "⚠️  주의사항:"
echo "- API 서버(o4o-api)는 실행되지 않아야 합니다"
echo "- 포트 3000: 메인 사이트"
echo "- 포트 3001: 어드민 대시보드"
echo "========================================="