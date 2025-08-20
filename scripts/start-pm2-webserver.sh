#!/bin/bash
# 웹서버용 PM2 시작 스크립트 (API 서버 제외)

echo "🚀 PM2 Web Server Startup Script"
echo "================================="
echo ""

# PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing globally..."
    npm install -g pm2
fi

# serve 패키지 설치 확인 (정적 파일 서빙용)
if ! command -v serve &> /dev/null; then
    echo "📦 Installing serve package globally..."
    npm install -g serve
fi

echo "🧹 Cleaning up existing PM2 processes..."
echo "-----------------------------------------"

# API 서버 프로세스 제거 (웹서버에서는 실행하지 않음)
pm2 delete o4o-api 2>/dev/null && echo "  ✓ Removed o4o-api process"
pm2 delete o4o-api-local 2>/dev/null && echo "  ✓ Removed o4o-api-local process"

# 기존 웹 프로세스 제거
pm2 delete o4o-main-site 2>/dev/null && echo "  ✓ Removed o4o-main-site process"
pm2 delete o4o-admin 2>/dev/null && echo "  ✓ Removed o4o-admin process"
pm2 delete o4o-storefront 2>/dev/null && echo "  ✓ Removed o4o-storefront process"

echo ""
echo "🌐 Starting web services..."
echo "---------------------------"

# Main Site 시작 (포트 3000)
if [ -d "apps/main-site/dist" ]; then
    echo "  → Starting Main Site on port 3000..."
    pm2 start serve --name "o4o-main-site" \
        --interpreter none \
        -- -s apps/main-site/dist -l 3000 \
        && echo "    ✅ Main Site started successfully"
else
    echo "  ⚠️ apps/main-site/dist not found - skipping Main Site"
fi

# Admin Dashboard 시작 (포트 3002)
if [ -d "apps/admin-dashboard/dist" ]; then
    echo "  → Starting Admin Dashboard on port 3002..."
    pm2 start serve --name "o4o-admin" \
        --interpreter none \
        -- -s apps/admin-dashboard/dist -l 3002 \
        && echo "    ✅ Admin Dashboard started successfully"
else
    echo "  ⚠️ apps/admin-dashboard/dist not found - skipping Admin Dashboard"
fi

# Storefront 시작 (포트 3003) - 옵션
if [ -d "apps/storefront/dist" ]; then
    echo "  → Starting Storefront on port 3003..."
    pm2 start serve --name "o4o-storefront" \
        --interpreter none \
        -- -s apps/storefront/dist -l 3003 \
        && echo "    ✅ Storefront started successfully"
else
    echo "  ℹ️ apps/storefront/dist not found - skipping Storefront"
fi

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "📊 Current PM2 Status:"
echo "----------------------"
pm2 status

echo ""
echo "📝 Service URLs:"
echo "----------------"
echo "  🏠 Main Site:       http://localhost:3000"
echo "  👨‍💼 Admin Dashboard: http://localhost:3002"
[ -d "apps/storefront/dist" ] && echo "  🛍️ Storefront:     http://localhost:3003"

echo ""
echo "💡 Useful PM2 commands:"
echo "-----------------------"
echo "  pm2 status          # Check process status"
echo "  pm2 logs            # View all logs"
echo "  pm2 logs o4o-main-site  # View specific app logs"
echo "  pm2 restart all     # Restart all processes"
echo "  pm2 stop all        # Stop all processes"
echo "  pm2 monit           # Real-time monitoring"
echo ""

# 자동 시작 설정 (선택사항)
read -p "🔧 Do you want to configure PM2 to auto-start on system boot? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 startup
    echo "✅ PM2 startup configured. Follow the instructions above if prompted."
fi

echo ""
echo "✅ Web server startup completed!"
echo "================================="