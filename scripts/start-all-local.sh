#!/bin/bash

# Local Development Server Startup Script
# Starts all services locally for testing

echo "🚀 Starting O4O Platform Services Locally"
echo "========================================"

# Kill any existing processes on our ports
echo "🔧 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Start API Server
echo "🚀 Starting API Server on port 4000..."
cd apps/api-server
if [ -f "dist/main.js" ]; then
    NODE_ENV=development PORT=4000 node dist/main.js &
    API_PID=$!
    echo "✅ API Server started (PID: $API_PID)"
else
    echo "❌ API Server not built. Run: npm run build:api"
fi
cd ../..

# Start Main Site
echo "🚀 Starting Main Site on port 3000..."
cd apps/main-site
if [ -d "dist" ]; then
    npx serve -s dist -l 3000 --cors &
    MAIN_PID=$!
    echo "✅ Main Site started (PID: $MAIN_PID)"
else
    echo "❌ Main Site not built. Run: npm run build:web"
fi
cd ../..

# Start Admin Dashboard
echo "🚀 Starting Admin Dashboard on port 3001..."
cd apps/admin-dashboard
if [ -d "dist" ]; then
    npx serve -s dist -l 3001 --cors --single &
    ADMIN_PID=$!
    echo "✅ Admin Dashboard started (PID: $ADMIN_PID)"
else
    echo "❌ Admin Dashboard not built. Run: npm run build:admin"
fi
cd ../..

# Start E-commerce (if exists)
if [ -d "apps/ecommerce/dist" ]; then
    echo "🚀 Starting E-commerce on port 3002..."
    cd apps/ecommerce
    npx serve -s dist -l 3002 --cors --single &
    SHOP_PID=$!
    echo "✅ E-commerce started (PID: $SHOP_PID)"
    cd ../..
fi

# Start Forum (if exists)
if [ -d "apps/forum/dist" ]; then
    echo "🚀 Starting Forum on port 3003..."
    cd apps/forum
    npx serve -s dist -l 3003 --cors --single &
    FORUM_PID=$!
    echo "✅ Forum started (PID: $FORUM_PID)"
    cd ../..
fi

# Wait a moment for services to start
sleep 3

echo ""
echo "📋 Service Status:"
echo "=================="
echo "API Server:       http://localhost:4000"
echo "Main Site:        http://localhost:3000"
echo "Admin Dashboard:  http://localhost:3001"
[ ! -z "$SHOP_PID" ] && echo "E-commerce:       http://localhost:3002"
[ ! -z "$FORUM_PID" ] && echo "Forum:            http://localhost:3003"
echo ""
echo "✅ All services started!"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    [ ! -z "$API_PID" ] && kill $API_PID 2>/dev/null
    [ ! -z "$MAIN_PID" ] && kill $MAIN_PID 2>/dev/null
    [ ! -z "$ADMIN_PID" ] && kill $ADMIN_PID 2>/dev/null
    [ ! -z "$SHOP_PID" ] && kill $SHOP_PID 2>/dev/null
    [ ! -z "$FORUM_PID" ] && kill $FORUM_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
while true; do
    sleep 1
done