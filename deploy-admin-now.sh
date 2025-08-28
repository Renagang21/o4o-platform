#!/bin/bash

# 빠른 Admin Dashboard 배포 스크립트
# 현재 빌드를 즉시 서버에 배포

set -e

echo "🚀 Admin Dashboard 빠른 배포 시작..."
echo ""

# 프로젝트 루트로 이동
cd /home/user/o4o-platform

# 1. 빌드
echo "📦 빌드 중..."
cd apps/admin-dashboard
npm run build

# 2. 빌드 해시 확인
BUILD_HASH=$(grep -oE 'index-[a-zA-Z0-9]+\.js' dist/index.html | head -1)
echo "✅ 빌드 완료: $BUILD_HASH"

# 3. GitHub에 푸시하여 자동 배포 트리거
cd /home/user/o4o-platform
echo "📤 GitHub에 푸시하여 배포 트리거..."

# package.json에 타임스탬프 추가하여 강제 트리거
TIMESTAMP=$(date +%s)
sed -i "s/\"version\": \"1.0.0\"/\"version\": \"1.0.0-deploy-$TIMESTAMP\"/" apps/admin-dashboard/package.json

# 커밋 및 푸시
git add -A
git commit -m "deploy: force deployment with build $BUILD_HASH at $(date)"
git push origin main

echo "✅ 배포 트리거 완료!"
echo ""
echo "⏰ GitHub Actions가 배포를 진행합니다 (약 4-5분 소요)"
echo ""
echo "📌 배포 상태 확인:"
echo "   https://github.com/Renagang21/o4o-platform/actions"
echo ""
echo "🔍 배포 완료 후 확인:"
echo "   https://admin.neture.co.kr"
echo "   - 로그인 후 콘텐츠 > Gutenberg Editor"
echo "   - Paragraph (Enhanced) 블록 테스트"