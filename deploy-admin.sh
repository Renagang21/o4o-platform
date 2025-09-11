#!/bin/bash

# Admin Dashboard 배포 스크립트
echo "🚀 Admin Dashboard 배포 시작..."

# 1. Git Pull
echo "📥 최신 코드 가져오기..."
git pull origin main

# 2. 패키지 빌드
echo "📦 패키지 빌드..."
pnpm run build:packages

# 3. Admin Dashboard 빌드
echo "🔨 Admin Dashboard 빌드..."
pnpm run build:admin

# 4. 웹서버로 배포
echo "🌐 웹서버로 파일 복사..."
ssh sohae21@13.125.144.8 "rm -rf /home/sohae21/o4o-platform/apps/admin-dashboard/dist/*"
scp -r apps/admin-dashboard/dist/* sohae21@13.125.144.8:/home/sohae21/o4o-platform/apps/admin-dashboard/dist/

echo "✅ Admin Dashboard 배포 완료!"