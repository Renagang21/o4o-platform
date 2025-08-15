#!/bin/bash

# NPM 설치 오류 해결 스크립트
echo "🔧 Fixing npm installation error..."

# 1. npm 캐시 정리
echo "📦 Clearing npm cache..."
npm cache clean --force

# 2. 문제가 되는 임시 디렉토리 제거
echo "🗑️ Removing temporary directories..."
rm -rf node_modules/.uuid-*
rm -rf node_modules/.tmp-*
rm -rf node_modules/.staging

# 3. package-lock.json 제거 (선택적)
echo "🔄 Removing package-lock.json..."
rm -f package-lock.json

# 4. node_modules 완전 삭제
echo "🧹 Removing node_modules..."
rm -rf node_modules

# 5. 각 워크스페이스의 node_modules도 정리
echo "🧹 Cleaning workspace node_modules..."
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# 6. 새로 설치
echo "📥 Installing packages..."
npm install

# 7. 빌드
echo "🔨 Building packages..."
npm run build:packages

echo "✅ Fix complete!"