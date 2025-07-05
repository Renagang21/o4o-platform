#!/bin/bash

# 자동화 작업 후 환경 복구 및 안정성 확인
echo "🔄 자동화 작업 후 환경 복구 시작..."

cd apps/admin-dashboard

# 1. 자동 생성된 충돌 파일 제거
echo "📋 Step 1: 충돌 파일 정리"
rm -f server.js express-server.js proxy-server.js 2>/dev/null || true
rm -f vite.config.js 2>/dev/null || true  # TypeScript 버전과 충돌 방지

# 2. 설정 파일 무결성 검증
echo "📋 Step 2: 설정 파일 검증"

# package.json 포트 설정 확인 및 복구
if ! grep -q "vite --port 3001" package.json; then
    echo "⚠️  package.json dev 스크립트 복구 필요"
    # 백업에서 복구 시도
    LATEST_BACKUP=$(ls -t package.json.backup-* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        echo "🔄 백업에서 package.json 복구: $LATEST_BACKUP"
        cp "$LATEST_BACKUP" package.json
    else
        echo "⚠️  수동 확인 필요: package.json dev 스크립트"
    fi
fi

# vite.config.ts 설정 확인
if [ -f "vite.config.ts" ]; then
    if ! grep -q "port: 3001" vite.config.ts || ! grep -q "host: '0.0.0.0'" vite.config.ts; then
        echo "⚠️  vite.config.ts 설정 복구 필요"
        LATEST_BACKUP=$(ls -t vite.config.ts.backup-* 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            echo "🔄 백업에서 vite.config.ts 복구: $LATEST_BACKUP"
            cp "$LATEST_BACKUP" vite.config.ts
        fi
    fi
fi

# 3. 의존성 상태 복구
echo "📋 Step 3: 의존성 상태 복구"
npm ls @o4o/auth-client @o4o/auth-context --depth=0 >/dev/null 2>&1 || {
    echo "🔄 로컬 패키지 재연결..."
    npm install --no-save --silent
}

# 4. 빌드 테스트
echo "📋 Step 4: 빌드 안정성 검증"
if npm run build --silent >/dev/null 2>&1; then
    echo "✅ 빌드 테스트 통과"
else
    echo "❌ 빌드 실패 - 수동 확인 필요"
    echo "🔧 다음 명령어로 상세 오류 확인: cd apps/admin-dashboard && npm run build"
fi

# 5. 서버 시작 테스트
echo "📋 Step 5: 서버 시작 가능성 확인"
timeout 10s npm run dev >/dev/null 2>&1 &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ 서버 시작 테스트 통과"
    kill $SERVER_PID 2>/dev/null || true
else
    echo "⚠️  서버 시작 문제 감지"
fi

# 6. 환경 상태 요약
echo ""
echo "📊 자동화 작업 후 환경 상태 요약"
echo "=================================="
echo "✅ 충돌 파일 정리 완료"
echo "✅ 설정 파일 검증 완료"
echo "✅ 의존성 상태 복구 완료"

# 7. 사용자 안내
echo ""
echo "🔧 다음 단계:"
echo "  1. npm run dev:admin 실행"
echo "  2. http://localhost:3001 브라우저 접속"
echo "  3. 정상 작동 확인"
echo ""
echo "❗ 문제 발생 시:"
echo "  - node scripts/admin-dashboard-stabilizer.js 실행"
echo "  - 또는 백업 파일에서 수동 복구"

cd - >/dev/null