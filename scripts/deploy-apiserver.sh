#!/bin/bash

# API 서버 배포 스크립트
# 사용법: ./scripts/deploy-apiserver.sh

set -e  # 에러 발생 시 중단

echo "🚀 API 서버 배포 시작..."

# 현재 위치 확인
if [ ! -f "package.json" ]; then
    echo "❌ 에러: 루트 디렉토리에서 실행하세요"
    exit 1
fi

# 1. 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git fetch origin
git pull origin main

# 2. 의존성 설치
echo "📦 의존성 설치..."
pnpm install --frozen-lockfile

# 3. 패키지 빌드 (API 서버에 필요한 것들)
echo "🔨 패키지 빌드..."
pnpm run build:packages

# 4. API 서버 빌드
echo "🏗️ API 서버 빌드..."
cd apps/api-server

# TypeScript 빌드
pnpm run build

# 빌드 성공 확인
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ 빌드 실패: dist 폴더가 비어있습니다"
    exit 1
fi

echo "✅ API 서버 빌드 완료!"

# 5. 데이터베이스 마이그레이션 (필요시)
echo "🗄️ 데이터베이스 마이그레이션 확인..."
if pnpm run migration:show 2>/dev/null | grep -q "No pending migrations"; then
    echo "📝 마이그레이션할 내용 없음"
else
    echo "🔄 데이터베이스 마이그레이션 실행..."
    pnpm run migration:run
fi

# 6. PM2로 API 서버 재시작
echo "♻️ PM2 API 서버 재시작..."
cd ../..

# PM2 상태 확인
pm2 list | grep -q "o4o-api-server" || echo "⚠️ PM2에 o4o-api-server가 없음"

# API 서버 재시작
if pm2 restart ecosystem.config.apiserver.cjs 2>/dev/null; then
    echo "✅ PM2로 재시작 성공"
else
    echo "🔧 PM2 설정 파일로 시작..."
    pm2 start ecosystem.config.apiserver.cjs
fi

# 7. 헬스체크
echo "🏥 헬스체크..."
sleep 3

if curl -f http://localhost:3001/health 2>/dev/null; then
    echo "✅ API 서버 정상 작동 중"
else
    echo "⚠️ 헬스체크 실패 - 로그를 확인하세요"
    echo "📋 PM2 로그: pm2 logs o4o-api-server"
fi

# 8. 배포 완료
echo ""
echo "🎉 API 서버 배포 완료!"
echo "🌐 로컬: http://localhost:3001"
echo "🌐 외부: https://api.neture.co.kr"
echo "📅 배포 시간: $(date)"
echo "📝 커밋: $(git rev-parse HEAD)"
echo ""
echo "📊 PM2 상태:"
pm2 list