#!/bin/bash

# 프론트엔드 배포 스크립트
echo "🚀 프론트엔드 배포 시작..."

# 1. 최신 코드 가져오기
cd /home/ubuntu/o4o-platform
git pull origin main

# 2. 의존성 설치
cd services/main-site
npm install

# 3. 빌드
npm run build

# 4. 웹 루트로 복사
sudo cp -r dist/* /var/www/html/

# 5. Nginx 재시작
sudo systemctl restart nginx

echo "✅ 프론트엔드 배포 완료!" 