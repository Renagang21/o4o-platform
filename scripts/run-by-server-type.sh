#!/bin/bash
# 서버 타입에 따라 다르게 실행하는 스크립트

echo "🔍 Server Type Detection Script"
echo "================================"

# 서버 타입 감지 (환경변수 또는 호스트명으로)
SERVER_TYPE=${SERVER_TYPE:-"unknown"}
HOSTNAME=$(hostname)

# 호스트명으로 서버 타입 자동 감지
if [ "$SERVER_TYPE" = "unknown" ]; then
    if [[ "$HOSTNAME" == *"webserver"* ]] || [[ "$HOSTNAME" == *"web"* ]]; then
        SERVER_TYPE="webserver"
        echo "📌 Detected webserver from hostname: $HOSTNAME"
    elif [[ "$HOSTNAME" == *"apiserver"* ]] || [[ "$HOSTNAME" == *"api"* ]]; then
        SERVER_TYPE="apiserver"
        echo "📌 Detected apiserver from hostname: $HOSTNAME"
    fi
fi

echo "Server Type: $SERVER_TYPE"
echo "Hostname: $HOSTNAME"
echo ""

# 서버 타입별 실행
case "$SERVER_TYPE" in
    "webserver")
        echo "🌐 Running as Web Server..."
        echo "----------------------------"
        
        # 웹서버 전용 빌드 실행
        if [ -f "scripts/build-webserver.sh" ]; then
            bash scripts/build-webserver.sh
        else
            echo "⚠️ scripts/build-webserver.sh not found"
            echo "Running standard build instead..."
            
            # 패키지만 빌드
            npm run build:packages
            
            # 프론트엔드 앱 빌드 (API 제외)
            echo "Building frontend apps only..."
            cd apps/main-site && npm run build && cd ../..
            
            # Admin 빌드 (타임아웃 적용)
            cd apps/admin-dashboard
            timeout 300 npm run build || echo "⚠️ Admin build timeout"
            cd ../..
        fi
        
        # PM2로 웹서버 시작
        if [ -f "scripts/start-pm2-webserver.sh" ]; then
            echo ""
            echo "🚀 Starting PM2 web services..."
            bash scripts/start-pm2-webserver.sh
        fi
        ;;
        
    "apiserver")
        echo "🔧 Running as API Server..."
        echo "----------------------------"
        
        # API 서버 전용 빌드
        echo "Building API server..."
        cd apps/api-server
        npm run build || {
            echo "❌ API server build failed"
            exit 1
        }
        cd ../..
        
        # API 서버 시작
        echo "Starting API server with PM2..."
        pm2 delete o4o-api 2>/dev/null
        cd apps/api-server
        pm2 start dist/main.js --name "o4o-api" \
            --max-memory-restart 1G \
            --time \
            --merge-logs \
            --log-date-format="YYYY-MM-DD HH:mm:ss Z"
        cd ../..
        
        pm2 save
        pm2 status
        ;;
        
    "local"|"development")
        echo "💻 Running as Local Development..."
        echo "-----------------------------------"
        
        # 로컬 개발 환경 - 전체 빌드
        echo "Running full build for local development..."
        npm run build
        
        # 개발 서버 시작 옵션
        echo ""
        echo "📝 To start development servers:"
        echo "  - Frontend: npm run dev"
        echo "  - API: cd apps/api-server && npm run dev"
        echo "  - PM2 (all): npm run pm2:start:local"
        ;;
        
    *)
        echo "⚠️ Unknown server type: $SERVER_TYPE"
        echo "Running default full build..."
        echo "-----------------------------------"
        
        # 기본값: 전체 빌드
        npm run build || {
            echo "❌ Build failed"
            exit 1
        }
        
        echo ""
        echo "ℹ️ To specify server type, set SERVER_TYPE environment variable:"
        echo "  export SERVER_TYPE=webserver  # For web server"
        echo "  export SERVER_TYPE=apiserver  # For API server"
        echo "  export SERVER_TYPE=local      # For local development"
        ;;
esac

echo ""
echo "✅ Server type specific execution completed!"
echo "============================================"