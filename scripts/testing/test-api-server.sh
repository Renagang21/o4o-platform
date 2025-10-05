#!/bin/bash

cd /home/sohae21/o4o-platform/apps/api-server

# Set environment variables
export NODE_ENV=development
export PORT=4000
export DB_HOST=localhost
export DB_PORT=5432  
export DB_NAME=o4o_platform
export DB_USERNAME=postgres
export DB_PASSWORD=localpassword
export JWT_SECRET=dev-jwt-secret-change-in-production
export JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
export EMAIL_SERVICE_ENABLED=false
export CORS_ORIGIN=https://neture.co.kr,https://admin.neture.co.kr,https://www.neture.co.kr,https://shop.neture.co.kr,https://forum.neture.co.kr
export FRONTEND_URL=https://neture.co.kr
export SESSION_SECRET=o4o-platform-session-secret-dev
export REDIS_ENABLED=false
export SESSION_SYNC_ENABLED=false

echo "Starting API server with development environment..."
node dist/main.js