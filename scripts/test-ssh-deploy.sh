#!/bin/bash

# SSH 연결 및 배포 테스트 스크립트
echo "🔍 SSH 연결 및 배포 테스트 시작..."
echo ""

# GitHub Secrets에서 설정된 값들
WEB_HOST="13.125.144.8"
WEB_USER="ubuntu"
DEPLOY_PATH="/var/www/admin.neture.co.kr"

echo "📍 대상 서버: $WEB_USER@$WEB_HOST"
echo "📁 배포 경로: $DEPLOY_PATH"
echo ""

# 현재 빌드 확인
echo "🏗️ 로컬 빌드 확인..."
if [ -d "apps/admin-dashboard/dist" ]; then
    LOCAL_HASH=$(grep -oE 'index-[a-zA-Z0-9]+\.js' apps/admin-dashboard/dist/index.html | head -1)
    echo "✅ 로컬 빌드 해시: $LOCAL_HASH"
else
    echo "❌ 로컬 빌드가 없습니다. 먼저 빌드를 실행하세요:"
    echo "   cd apps/admin-dashboard && pnpm run build"
    exit 1
fi

echo ""
echo "🌐 프로덕션 상태 확인..."
PROD_HASH=$(curl -s https://admin.neture.co.kr/ | grep -oE 'index-[a-zA-Z0-9]+\.js' | head -1)
echo "📊 현재 프로덕션 해시: $PROD_HASH"

if [ "$LOCAL_HASH" == "$PROD_HASH" ]; then
    echo "✅ 이미 최신 빌드가 배포되어 있습니다!"
    exit 0
fi

echo ""
echo "⚠️  배포가 필요합니다!"
echo ""
echo "🔐 SSH 키 확인..."
if [ -f ~/.ssh/id_rsa ]; then
    echo "✅ SSH 키 존재"
else
    echo "❌ SSH 키가 없습니다. GitHub Actions를 통해 배포하거나 SSH 키를 설정하세요."
    exit 1
fi

echo ""
echo "📤 수동 배포 명령어:"
echo "----------------------------------------"
echo "# 1. SSH 접속"
echo "ssh $WEB_USER@$WEB_HOST"
echo ""
echo "# 2. 파일 복사 (로컬에서 실행)"
echo "rsync -avz --delete apps/admin-dashboard/dist/ $WEB_USER@$WEB_HOST:$DEPLOY_PATH/"
echo ""
echo "# 3. 또는 SCP 사용"
echo "scp -r apps/admin-dashboard/dist/* $WEB_USER@$WEB_HOST:$DEPLOY_PATH/"
echo "----------------------------------------"
echo ""
echo "💡 GitHub Actions가 실패하는 경우:"
echo "1. GitHub 저장소 Settings > Secrets and variables > Actions 확인"
echo "2. WEB_HOST = $WEB_HOST"
echo "3. WEB_USER = $WEB_USER"
echo "4. WEB_SSH_KEY = (SSH 개인키 내용)"