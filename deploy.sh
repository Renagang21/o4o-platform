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

# 4. 빌드 완료 확인
if [ ! -d "apps/admin-dashboard/dist" ]; then
  echo "❌ 빌드 실패"
  exit 1
fi

echo "✅ 빌드 완료!"
echo "📊 빌드 파일 수: $(find apps/admin-dashboard/dist -type f | wc -l) 개"

# 5. 배포 정보 출력
echo ""
echo "✅ 배포 준비 완료!"
echo "🌐 Admin Dashboard: https://admin.neture.co.kr"
echo ""
echo "📝 원격 서버 배포 방법:"
echo "1. SSH로 서버 접속: ssh user@server"
echo "2. 프로젝트 폴더로 이동: cd /home/sohae21/o4o-platform"
echo "3. 배포 실행: ./deploy-production.sh"
echo ""