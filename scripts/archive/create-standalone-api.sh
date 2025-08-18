#!/bin/bash

# 독립 실행 가능한 API 서버 패키지 생성

echo "📦 독립 실행 가능한 API 서버 패키지 생성"

# 임시 디렉토리 생성
DEPLOY_DIR="/tmp/api-server-standalone"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# 필요한 파일 복사
echo "📂 파일 복사 중..."
cp -r apps/api-server/dist $DEPLOY_DIR/
cp apps/api-server/package.json $DEPLOY_DIR/
cp -r apps/api-server/node_modules $DEPLOY_DIR/ 2>/dev/null || true

# 내부 패키지 복사
if [ -d "packages/supplier-connector/dist" ]; then
    mkdir -p $DEPLOY_DIR/node_modules/@o4o/supplier-connector
    cp -r packages/supplier-connector/dist/* $DEPLOY_DIR/node_modules/@o4o/supplier-connector/
    cp packages/supplier-connector/package.json $DEPLOY_DIR/node_modules/@o4o/supplier-connector/
fi

# package.json 수정 (내부 의존성 제거)
cd $DEPLOY_DIR
cat package.json | grep -v "@o4o/" > package.tmp.json
mv package.tmp.json package.json

# 의존성 설치
npm install --production

# 압축
cd /tmp
tar -czf api-server-standalone.tar.gz api-server-standalone

echo "✅ 완료! /tmp/api-server-standalone.tar.gz 생성됨"
echo ""
echo "서버에 업로드 후:"
echo "tar -xzf api-server-standalone.tar.gz"
echo "cd api-server-standalone"
echo "pm2 start dist/main.js --name api-server"