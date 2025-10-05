#!/bin/bash

# O4O Platform 배포 스크립트
set -e

echo "🚀 O4O Platform 배포 시작..."
echo "📦 현재 브랜치: $(git branch --show-current)"

# 1. 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git pull origin main

# 2. 의존성 설치
echo "📚 의존성 설치..."
pnpm install

# 3. Admin Dashboard 빌드
echo "🔨 Admin Dashboard 빌드..."
pnpm run build:admin

# 4. API Server 빌드
echo "🔧 API Server 빌드..."
cd apps/api-server
npm run build
cd ../..

# 5. 빌드 완료 확인
if [ ! -d "apps/admin-dashboard/dist" ]; then
  echo "❌ Admin Dashboard 빌드 실패"
  exit 1
fi

if [ ! -d "apps/api-server/dist" ]; then
  echo "❌ API Server 빌드 실패"
  exit 1
fi

echo "✅ 빌드 완료!"
echo "📊 Admin Dashboard 빌드 파일: $(find apps/admin-dashboard/dist -type f | wc -l) 개"
echo "📊 API Server 빌드 파일: $(find apps/api-server/dist -type f | wc -l) 개"

# 6. 배포 정보 출력
echo ""
echo "✅ 로컬 빌드 완료!"
echo ""
echo "📋 서버 정보:"
echo "┌─────────────────────────────────────────────────────┐"
echo "│ API Server:   ubuntu@43.202.242.215                │"
echo "│ Web Server:   sohae21@13.125.144.8                 │"
echo "└─────────────────────────────────────────────────────┘"
echo ""
echo "🚀 프로덕션 배포:"
echo "  ./deploy-production.sh 실행하여 상세 가이드 확인"
echo ""
echo "📖 자세한 내용:"
echo "  DEPLOYMENT_GUIDE.md 파일 참조"
echo ""