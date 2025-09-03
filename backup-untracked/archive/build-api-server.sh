#!/bin/bash

# API 서버 전용 빌드 스크립트
# 필요한 패키지만 빌드하여 빌드 시간 단축

echo "🔨 API 서버 빌드 시작..."

# 1. 필요한 패키지 빌드
echo "📦 의존 패키지 빌드 중..."

# @o4o/types 빌드
echo "  - @o4o/types 빌드 중..."
pnpm run build --workspace=@o4o/types

# @o4o/utils 빌드
echo "  - @o4o/utils 빌드 중..."
pnpm run build --workspace=@o4o/utils

# @o4o/auth-client 빌드
echo "  - @o4o/auth-client 빌드 중..."
pnpm run build --workspace=@o4o/auth-client

# @o4o/crowdfunding-types 빌드
echo "  - @o4o/crowdfunding-types 빌드 중..."
pnpm run build --workspace=@o4o/crowdfunding-types

# 2. API 서버 빌드
echo "🚀 API 서버 빌드 중..."
pnpm run build --workspace=@o4o/api-server

echo "✅ API 서버 빌드 완료!"

# 빌드 결과 확인
if [ -f "apps/api-server/dist/main.js" ]; then
    echo "✅ 빌드 파일 생성 확인: apps/api-server/dist/main.js"
    echo ""
    echo "🎯 다음 명령으로 API 서버를 시작할 수 있습니다:"
    echo "  pnpm run start --workspace=@o4o/api-server"
else
    echo "❌ 빌드 실패: main.js 파일을 찾을 수 없습니다."
    exit 1
fi