#!/bin/bash

# 자동화 작업 시작 전 환경 안정성 확보
echo "🔄 자동화 작업 전 환경 점검 시작..."

# 1. 현재 실행 중인 개발 서버 정리
echo "📋 Step 1: 실행 중인 서버 정리"
pkill -f "vite.*3001" || true
pkill -f "node.*3001" || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# 2. 임시 파일 정리
echo "📋 Step 2: 임시 파일 정리"
cd apps/admin-dashboard
rm -f server.js *.log *-DESKTOP-*.* 2>/dev/null || true

# 3. 설정 파일 백업
echo "📋 Step 3: 중요 설정 파일 백업"
cp package.json package.json.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
cp vite.config.ts vite.config.ts.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# 4. 로컬 패키지 상태 확인
echo "📋 Step 4: 로컬 패키지 연결 상태 확인"
if [ ! -d "../../packages/auth-client" ] || [ ! -d "../../packages/auth-context" ]; then
    echo "❌ 로컬 패키지 누락 감지"
    exit 1
fi

# 5. Node 모듈 상태 확인
echo "📋 Step 5: 의존성 상태 확인"
npm ls @o4o/auth-client @o4o/auth-context --depth=0 >/dev/null 2>&1 || {
    echo "🔄 로컬 패키지 재연결..."
    npm install --no-save --silent
}

echo "✅ 자동화 작업 전 점검 완료"
echo "🔧 이제 안전하게 자동화 작업을 진행할 수 있습니다."