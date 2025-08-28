#!/bin/bash

# index.html 긴급 배포 스크립트
echo "🚨 index.html 긴급 배포 시작..."
echo ""

# 로컬 index.html 확인
if [ ! -f apps/admin-dashboard/dist/index.html ]; then
    echo "❌ index.html이 없습니다. 먼저 빌드하세요!"
    exit 1
fi

# 빌드 해시 확인
LOCAL_HASH=$(grep -oE 'index-[a-zA-Z0-9]+\.js' apps/admin-dashboard/dist/index.html | head -1)
echo "📝 로컬 빌드 해시: $LOCAL_HASH"

# 현재 프로덕션 확인
PROD_HASH=$(curl -s https://admin.neture.co.kr/ | grep -oE 'index-[a-zA-Z0-9]+\.js' | head -1)
echo "📊 현재 프로덕션 해시: $PROD_HASH"

if [ "$LOCAL_HASH" == "$PROD_HASH" ]; then
    echo "✅ 이미 최신입니다!"
    exit 0
fi

echo ""
echo "⚠️  index.html 업데이트 필요!"
echo ""
echo "📤 수동 배포 명령어:"
echo "----------------------------------------"
echo "# SCP로 index.html만 복사:"
echo "scp apps/admin-dashboard/dist/index.html ubuntu@13.125.144.8:/var/www/admin.neture.co.kr/"
echo ""
echo "# 또는 전체 dist 폴더 재배포:"
echo "scp -r apps/admin-dashboard/dist/* ubuntu@13.125.144.8:/var/www/admin.neture.co.kr/"
echo ""
echo "# rsync로 전체 동기화 (권장):"
echo "rsync -avz --delete apps/admin-dashboard/dist/ ubuntu@13.125.144.8:/var/www/admin.neture.co.kr/"
echo "----------------------------------------"
echo ""
echo "💡 GitHub Actions에서 배포하려면:"
echo "1. Manual Deploy Admin Dashboard 워크플로우 재실행"
echo "2. 로그에서 rsync 결과 확인"
echo "3. index.html이 transferred files 목록에 있는지 확인"