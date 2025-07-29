#!/bin/bash

# O4O Platform 로컬 개발 환경 시작 스크립트

echo "🚀 O4O Platform 로컬 개발 환경 시작"
echo "===================================="

# 1. 이전 프로세스 정리
echo "1️⃣ 이전 프로세스 정리 중..."
pkill -f "npm run dev" || true
pkill -f "vite" || true
pkill -f "nodemon" || true
sleep 2

# 2. 환경 설정 파일 확인
echo "2️⃣ 환경 설정 파일 확인 중..."
if [ ! -f apps/api-server/.env ]; then
    echo "⚠️  API 서버 환경 파일이 없습니다. .env.example을 복사합니다."
    cp apps/api-server/.env.example apps/api-server/.env 2>/dev/null || echo "⚠️  .env.example 파일이 없습니다."
fi

if [ ! -f apps/admin-dashboard/.env.local ]; then
    echo "⚠️  Admin Dashboard 로컬 환경 파일이 없습니다. 생성합니다."
    cat > apps/admin-dashboard/.env.local << EOF
VITE_API_URL=http://localhost:4000
VITE_API_BASE_URL=http://localhost:4000/api
VITE_AUTH_URL=http://localhost:4000/auth
VITE_MAIN_SITE_URL=http://localhost:3000
EOF
fi

# 3. 패키지 빌드 확인
echo "3️⃣ 패키지 빌드 상태 확인 중..."
NEED_BUILD=false
for pkg in types utils ui auth-client auth-context; do
    if [ ! -d "packages/$pkg/dist" ]; then
        echo "   ❌ $pkg 빌드 필요"
        NEED_BUILD=true
    else
        echo "   ✅ $pkg 빌드됨"
    fi
done

if [ "$NEED_BUILD" = true ]; then
    echo "   📦 패키지 빌드 시작..."
    npm run build:packages
fi

# 4. API 서버 시작 (백그라운드)
echo "4️⃣ API 서버 시작 중... (포트 4000)"
cd apps/api-server
npm run dev > ../../logs/api-server.log 2>&1 &
API_PID=$!
cd ../..
echo "   PID: $API_PID"

# 5. API 서버 대기
echo "   ⏳ API 서버 시작 대기 중..."
for i in {1..10}; do
    if curl -s http://localhost:4000/api/health > /dev/null; then
        echo "   ✅ API 서버 준비 완료"
        break
    fi
    sleep 2
done

# 6. Admin Dashboard 시작 (백그라운드)
echo "5️⃣ Admin Dashboard 시작 중... (포트 3001)"
cd apps/admin-dashboard
npm run dev > ../../logs/admin-dashboard.log 2>&1 &
ADMIN_PID=$!
cd ../..
echo "   PID: $ADMIN_PID"

# 7. Main Site 시작 (백그라운드)
echo "6️⃣ Main Site 시작 중... (포트 3000)"
cd apps/main-site
npm run dev > ../../logs/main-site.log 2>&1 &
MAIN_PID=$!
cd ../..
echo "   PID: $MAIN_PID"

# 8. 프로세스 정보 저장
echo "$API_PID" > .dev-pids/api-server.pid
echo "$ADMIN_PID" > .dev-pids/admin-dashboard.pid
echo "$MAIN_PID" > .dev-pids/main-site.pid

echo ""
echo "✅ 모든 서비스가 시작되었습니다!"
echo ""
echo "📌 접속 URL:"
echo "   - Admin Dashboard: http://localhost:3001"
echo "   - Main Site: http://localhost:3000"
echo "   - API Server: http://localhost:4000"
echo ""
echo "📄 로그 확인:"
echo "   - tail -f logs/api-server.log"
echo "   - tail -f logs/admin-dashboard.log"
echo "   - tail -f logs/main-site.log"
echo ""
echo "🛑 종료하려면: ./scripts/stop-local-dev.sh"