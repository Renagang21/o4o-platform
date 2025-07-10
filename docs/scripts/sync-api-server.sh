#!/bin/bash

# API 서버 동기화 스크립트
REPO_URL="https://github.com/Renagang21/o4o-platform.git"
TARGET_DIR="/opt/o4o-api-server"
BRANCH="main"

echo "🚀 API 서버 코드 동기화 시작..."

# 디렉토리가 없으면 생성
if [ ! -d "$TARGET_DIR" ]; then
    echo "📁 새 디렉토리 생성: $TARGET_DIR"
    git clone $REPO_URL $TARGET_DIR
    cd $TARGET_DIR
else
    echo "📂 기존 디렉토리 사용: $TARGET_DIR"
    cd $TARGET_DIR
    git fetch origin
fi

# Sparse checkout 설정
git config core.sparseCheckout true

# API 서버 관련 파일만 체크아웃하도록 설정
cat > .git/info/sparse-checkout << EOF
services/api-server/
scripts/
package.json
tsconfig.json
.gitignore
README.md
EOF

# 최신 변경사항 가져오기
git checkout $BRANCH
git pull origin $BRANCH

echo "✅ API 서버 동기화 완료!"

# 의존성 설치 및 빌드
cd services/api-server
echo "📦 의존성 설치 중..."
npm install

echo "🔨 빌드 중..."
npm run build

echo "🔄 서비스 재시작..."
pm2 restart api-server || pm2 start ecosystem.config.js

echo "🎉 API 서버 배포 완료!"