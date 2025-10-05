#!/bin/bash

# 원격 서버 자동 배포를 위한 스크립트
# 서버에서 직접 실행할 수 있도록 설계됨

set -e

echo "🚀 O4O Platform 원격 배포 스크립트"
echo "서버에서 이 스크립트를 실행하세요"
echo ""

# 현재 서버 확인
if [ -d "/home/ubuntu/o4o-platform" ]; then
    echo "📍 API 서버 감지됨"
    SERVER_TYPE="api"
    PROJECT_DIR="/home/ubuntu/o4o-platform"
elif [ -d "/home/sohae21/o4o-platform" ]; then
    echo "📍 웹 서버 감지됨"
    SERVER_TYPE="web"
    PROJECT_DIR="/home/sohae21/o4o-platform"
else
    echo "❌ 프로젝트 디렉토리를 찾을 수 없습니다"
    exit 1
fi

cd $PROJECT_DIR

echo "📥 최신 코드 가져오기..."
git pull origin main

if [ "$SERVER_TYPE" == "api" ]; then
    echo "🔧 API 서버 빌드 시작..."
    cd apps/api-server
    npm install
    npm run build
    
    echo "♻️ PM2 재시작..."
    pm2 restart o4o-api || pm2 start dist/main.js --name o4o-api
    
    echo "📝 로그 확인..."
    pm2 logs o4o-api --lines 20 --nostream
    
    echo "✅ API 서버 배포 완료!"
    echo "테스트: curl https://api.neture.co.kr/api/v1/users/roles -H 'Authorization: Bearer YOUR_TOKEN'"
    
elif [ "$SERVER_TYPE" == "web" ]; then
    echo "🔨 Admin Dashboard 빌드 시작..."
    npm install
    npm run build:admin
    
    echo "✅ Admin Dashboard 배포 완료!"
    echo "URL: https://admin.neture.co.kr"
fi

echo ""
echo "🎉 배포가 완료되었습니다!"