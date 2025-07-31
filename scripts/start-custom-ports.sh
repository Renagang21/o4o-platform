#!/bin/bash

# O4O Platform - Custom Port Startup Script
# ISP 포트 80/443 차단 우회를 위한 커스텀 포트 실행

echo "🚀 Starting O4O Platform with custom ports..."

# 환경변수 설정
export NODE_ENV=production

# API 서버 시작 (포트 8443)
echo "Starting API Server on port 8443..."
cd /home/user/o4o-platform/apps/api-server
PORT=8443 npm run start:prod &

# 메인 사이트 시작 (포트 8080)
echo "Starting Main Site on port 8080..."
cd /home/user/o4o-platform/apps/main-site
PORT=8080 npm run preview &

# 관리자 대시보드 시작 (포트 8081)
echo "Starting Admin Dashboard on port 8081..."
cd /home/user/o4o-platform/apps/admin-dashboard
PORT=8081 npm run preview &

echo "✅ All services started!"
echo ""
echo "Access URLs (after domain forwarding setup):"
echo "- Main Site: http://www.neture.co.kr (→ :8080)"
echo "- Admin: http://admin.neture.co.kr (→ :8081)"
echo "- API: http://api.neture.co.kr (→ :8443)"
echo ""
echo "Direct access (before forwarding):"
echo "- Main Site: http://your-ip:8080"
echo "- Admin: http://your-ip:8081"
echo "- API: http://your-ip:8443"