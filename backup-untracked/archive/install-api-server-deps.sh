#!/bin/bash

# API 서버와 관련 패키지만 설치하는 스크립트
# npm workspace 필터링을 사용하여 불필요한 의존성 설치 방지

echo "📦 API 서버 전용 의존성 설치 시작..."

# 캐시 정리 (선택사항)
echo "🧹 npm 캐시 정리 중..."
npm cache clean --force

# API 서버와 필요한 패키지만 설치
echo "📥 API 서버 및 의존 패키지 설치 중..."
pnpm install \
  --workspace=@o4o/api-server \
  --workspace=@o4o/types \
  --workspace=@o4o/utils \
  --workspace=@o4o/auth-client \
  --workspace=@o4o/crowdfunding-types \
  --include-workspace-root

echo "✅ API 서버 의존성 설치 완료!"

# 설치된 패키지 확인
echo ""
echo "📋 설치된 workspace 패키지:"
npm ls --depth=0 --workspace=@o4o/api-server

echo ""
echo "💡 제외된 패키지:"
echo "  - @o4o/ui (UI 컴포넌트)"
echo "  - @o4o/auth-context (프론트엔드 인증)"
echo "  - @o4o/shortcodes (WordPress 관련)"
echo "  - @o4o/forum-types (포럼 앱 전용)"
echo "  - @o4o/supplier-connector (공급업체 연동)"