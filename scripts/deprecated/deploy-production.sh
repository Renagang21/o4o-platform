#!/bin/bash

# O4O Platform 프로덕션 배포 스크립트
set -e

echo "🚀 O4O Platform 프로덕션 배포 시작..."

# 서버 정보
WEB_HOST="13.125.144.8"
WEB_USER="sohae21"
API_HOST="43.202.242.215"
API_USER="ubuntu"

echo "📝 배포 대상 서버:"
echo "  - Web/Admin: ${WEB_USER}@${WEB_HOST}"
echo "  - API: ${API_USER}@${API_HOST}"

# 1. 로컬 빌드
echo ""
echo "📦 로컬 빌드 시작..."

# Admin Dashboard 빌드
echo "🔨 Admin Dashboard 빌드..."
cd /home/dev/o4o-platform
npm run build:admin

# API Server 빌드
echo "🔧 API Server 빌드..."
cd apps/api-server
npm run build
cd ../..

echo "✅ 로컬 빌드 완료!"

# 2. 프로덕션 배포 안내
echo ""
echo "================================================"
echo "🚨 프로덕션 배포를 위한 수동 명령어"
echo "================================================"
echo ""
echo "📌 API 서버 배포 (500 에러 해결)"
echo "--------------------------------"
echo "1. 터미널에서 다음 명령어 실행:"
echo ""
echo "# API 서버 접속"
echo "ssh ${API_USER}@${API_HOST}"
echo ""
echo "# 프로젝트 디렉토리로 이동"
echo "cd /home/ubuntu/o4o-platform"
echo ""
echo "# 최신 코드 가져오기"
echo "git pull origin main"
echo ""
echo "# API 서버 디렉토리로 이동 및 빌드"
echo "cd apps/api-server"
echo "npm install"
echo "npm run build"
echo ""
echo "# PM2로 API 서버 재시작"
echo "pm2 restart o4o-api"
echo "pm2 logs o4o-api --lines 50"
echo ""
echo "================================================"
echo ""
echo "📌 Admin Dashboard 배포"
echo "------------------------"
echo "1. 다른 터미널에서 다음 명령어 실행:"
echo ""
echo "# 웹 서버 접속"
echo "ssh ${WEB_USER}@${WEB_HOST}"
echo ""
echo "# 프로젝트 디렉토리로 이동"
echo "cd /home/sohae21/o4o-platform"
echo ""
echo "# 최신 코드 가져오기"
echo "git pull origin main"
echo ""
echo "# Admin Dashboard 빌드"
echo "npm run build:admin"
echo ""
echo "================================================"
echo ""
echo "📍 테스트 URL:"
echo "  - Admin Dashboard: https://admin.neture.co.kr"
echo "  - API Server: https://api.neture.co.kr/api/v1/users/roles"
echo ""
echo "⚠️  주의사항:"
echo "  1. SSH 키가 설정되어 있지 않아 수동 배포가 필요합니다"
echo "  2. 각 서버에서 git pull 후 빌드를 실행해야 합니다"
echo "  3. API 서버는 PM2로 관리되므로 재시작이 필요합니다"
echo ""
echo "🔑 중요 변경사항:"
echo "  - /api/v1/users/roles 엔드포인트: requireAdmin 제거됨"
echo "  - 이제 인증된 사용자는 모두 접근 가능"
echo ""