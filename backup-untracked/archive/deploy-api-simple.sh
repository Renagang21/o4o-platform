#!/bin/bash

# 간단한 API 서버 배포 스크립트
# 빌드된 파일만 서버에 동기화

set -e

# 서버 정보
SERVER="root@13.125.144.8"
REMOTE_PATH="/var/www/api-server"

echo "🚀 API 서버 간단 배포 시작"

# 1. 로컬 빌드 (이미 빌드되어 있다면 스킵)
if [ ! -d "apps/api-server/dist" ]; then
    echo "📦 빌드 시작..."
    cd apps/api-server
    pnpm install
    pnpm run build
    cd ../..
else
    echo "✅ 빌드 파일 확인 완료"
fi

# 2. 필수 파일만 서버로 동기화
echo "📤 서버로 파일 전송..."

# dist 폴더 전송
rsync -avz --delete \
    apps/api-server/dist/ \
    $SERVER:$REMOTE_PATH/dist/

# package.json 파일 전송
rsync -avz \
    apps/api-server/package.json \
    apps/api-server/package-lock.json \
    $SERVER:$REMOTE_PATH/

# 3. 서버에서 production 의존성 설치 및 실행
echo "🔧 서버에서 설정 중..."

ssh $SERVER << 'ENDSSH'
cd /var/www/api-server

# 로그 디렉토리 생성
mkdir -p logs

# production 의존성만 설치
echo "📦 Production 의존성 설치..."
pnpm install --frozen-lockfile --only=production || pnpm install --only=production

# PM2 설정 파일 생성
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/main.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      DB_HOST: 'localhost',
      DB_PORT: 3306,
      DB_USER: 'o4ouser',
      DB_PASSWORD: 'Secure@2025!',
      DB_NAME: 'o4o_production',
      JWT_SECRET: 'your-jwt-secret-key-here-change-in-production',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

# PM2로 재시작
echo "🔄 PM2로 서비스 재시작..."
pm2 delete api-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 상태 확인
sleep 3
pm2 status

# Health check
echo "🏥 Health check..."
curl -s http://localhost:4000/health || echo "⚠️  Health check 실패 - 서버 시작 중일 수 있습니다"

echo "✅ 배포 완료!"
ENDSSH

echo "🎉 배포가 완료되었습니다!"
echo ""
echo "📋 유용한 명령어:"
echo "  서버 상태: ssh $SERVER 'pm2 status'"
echo "  로그 확인: ssh $SERVER 'pm2 logs api-server'"
echo "  재시작:   ssh $SERVER 'pm2 restart api-server'"
echo "  중지:     ssh $SERVER 'pm2 stop api-server'"