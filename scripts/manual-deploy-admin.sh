#!/bin/bash

# 수동 배포 스크립트 - admin.neture.co.kr 즉시 배포
# 이 스크립트는 로컬에서 빌드 후 직접 서버로 배포합니다

set -e

echo "🚀 Admin Dashboard 수동 배포 시작..."
echo ""

# 1. 현재 위치 확인
if [ ! -f "package.json" ] || [ ! -d "apps/admin-dashboard" ]; then
    echo "❌ 프로젝트 루트에서 실행해주세요!"
    exit 1
fi

# 2. 빌드
echo "📦 1단계: 빌드 시작..."
cd apps/admin-dashboard

# 기존 빌드 파일 삭제
rm -rf dist

# 프로덕션 빌드
echo "빌드 중... (약 1분 소요)"
pnpm run build

# 빌드 확인
if [ ! -f "dist/index.html" ]; then
    echo "❌ 빌드 실패! dist/index.html이 없습니다."
    exit 1
fi

echo "✅ 빌드 완료!"
echo ""

# 3. 빌드 해시 확인
BUILD_HASH=$(grep -oE 'index-[a-zA-Z0-9]+\.js' dist/index.html | head -1 | sed 's/index-//;s/\.js//')
echo "📝 새 빌드 해시: $BUILD_HASH"
echo ""

# 4. 서버 정보 (환경변수 또는 직접 설정)
WEB_HOST="${WEB_HOST:-admin.neture.co.kr}"
WEB_USER="${WEB_USER:-ubuntu}"
DEPLOY_PATH="/var/www/admin.neture.co.kr"

echo "🌐 배포 대상:"
echo "   - 서버: $WEB_HOST"
echo "   - 사용자: $WEB_USER"
echo "   - 경로: $DEPLOY_PATH"
echo ""

# 5. SSH 키 확인
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "❌ SSH 키가 없습니다. GitHub Secrets의 WEB_SSH_KEY를 ~/.ssh/id_rsa로 저장해주세요."
    echo ""
    echo "또는 다음 명령으로 직접 배포할 수 있습니다:"
    echo ""
    echo "scp -r dist/* $WEB_USER@$WEB_HOST:$DEPLOY_PATH/"
    echo ""
    exit 1
fi

# 6. 배포
echo "📤 2단계: 서버로 파일 전송..."
echo "rsync 명령 실행 중..."

# rsync로 배포 (더 효율적)
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  dist/ \
  $WEB_USER@$WEB_HOST:$DEPLOY_PATH/

echo "✅ 파일 전송 완료!"
echo ""

# 7. 권한 설정
echo "🔒 3단계: 권한 설정..."
ssh -o StrictHostKeyChecking=no $WEB_USER@$WEB_HOST << EOF
  cd $DEPLOY_PATH
  find . -type f -exec chmod 644 {} \;
  find . -type d -exec chmod 755 {} \;
  echo "✅ 권한 설정 완료"
EOF

# 8. Nginx 캐시 정리 (선택사항)
echo ""
echo "🔄 4단계: Nginx 리로드..."
ssh -o StrictHostKeyChecking=no $WEB_USER@$WEB_HOST << EOF
  sudo nginx -t && sudo systemctl reload nginx
  echo "✅ Nginx 리로드 완료"
EOF

# 9. 배포 확인
echo ""
echo "🔍 5단계: 배포 확인..."
DEPLOYED_HASH=$(curl -s https://admin.neture.co.kr/ | grep -oE 'index-[a-zA-Z0-9]+\.js' | head -1 | sed 's/index-//;s/\.js//')

if [ "$DEPLOYED_HASH" = "$BUILD_HASH" ]; then
    echo "✅ 배포 성공! 새 빌드가 적용되었습니다."
    echo "   빌드 해시: $BUILD_HASH"
else
    echo "⚠️  배포는 완료되었지만 아직 반영되지 않았습니다."
    echo "   현재 해시: $DEPLOYED_HASH"
    echo "   예상 해시: $BUILD_HASH"
    echo ""
    echo "다음을 시도해보세요:"
    echo "1. 브라우저 캐시 삭제 (Ctrl+Shift+R)"
    echo "2. CDN 캐시 정리가 필요할 수 있습니다"
fi

echo ""
echo "🎉 배포 프로세스 완료!"
echo ""
echo "📌 확인 방법:"
echo "1. https://admin.neture.co.kr 접속"
echo "2. 개발자 도구 (F12) 열기"
echo "3. Network 탭에서 index-*.js 파일 확인"
echo "4. 빌드 해시가 '$BUILD_HASH'인지 확인"
echo ""
echo "💡 ParagraphTestBlock 테스트:"
echo "1. 로그인 후 콘텐츠 > Gutenberg Editor 접속"
echo "2. 'Paragraph (Enhanced)' 블록 추가"
echo "3. 텍스트 입력 및 포맷팅 도구 테스트"