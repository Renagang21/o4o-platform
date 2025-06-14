#!/bin/bash

# 백엔드 배포 스크립트
echo "🚀 백엔드 배포 시작..."

# 1. 최신 코드 가져오기
cd /home/ubuntu/o4o-platform
git pull origin main

# 2. API 서버 디렉토리로 복사
cp -r services/api-server/* /home/ubuntu/o4o-simple-api/

# 3. 의존성 설치
cd /home/ubuntu/o4o-simple-api
npm install

# 4. PM2로 서버 재시작
pm2 restart o4o-api

echo "✅ 백엔드 배포 완료!" 