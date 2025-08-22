#!/bin/bash

# SCP를 사용한 API 서버 배포 스크립트
set -e

# 서버 정보
SERVER="root@13.125.144.8"
REMOTE_PATH="/var/www/api-server"

echo "🚀 API 서버 배포 시작 (SCP 사용)"

# 1. 빌드 확인
if [ ! -d "apps/api-server/dist" ]; then
    echo "❌ dist 폴더가 없습니다. 먼저 빌드를 실행하세요."
    exit 1
fi

echo "✅ 빌드 파일 확인 완료"

# 2. 배포 패키지 생성
echo "📦 배포 패키지 생성 중..."
DEPLOY_DIR="/tmp/api-deploy-$(date +%Y%m%d%H%M%S)"
mkdir -p $DEPLOY_DIR

# 필요한 파일 복사
cp -r apps/api-server/dist $DEPLOY_DIR/
cp apps/api-server/package.json $DEPLOY_DIR/
cp apps/api-server/package-lock.json $DEPLOY_DIR/ 2>/dev/null || true
cp apps/api-server/.env.production $DEPLOY_DIR/.env 2>/dev/null || true

# PM2 설정 파일 생성
cat > $DEPLOY_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/main.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

# 3. tar로 압축
echo "📤 서버로 전송 준비 중..."
tar -czf $DEPLOY_DIR.tar.gz -C $DEPLOY_DIR .

# 4. 서버로 전송 및 배포
echo "📡 서버로 파일 전송 중..."
scp $DEPLOY_DIR.tar.gz $SERVER:/tmp/

echo "🔧 서버에서 배포 중..."
ssh $SERVER << 'ENDSSH'
set -e

# 백업 (선택적)
if [ -d "/var/www/api-server" ]; then
    echo "기존 배포 백업 중..."
    mv /var/www/api-server /var/www/api-server.backup.$(date +%Y%m%d%H%M%S)
fi

# 새 디렉토리 생성 및 압축 해제
mkdir -p /var/www/api-server
cd /var/www/api-server
tar -xzf /tmp/api-deploy-*.tar.gz
rm /tmp/api-deploy-*.tar.gz

# 로그 디렉토리 생성
mkdir -p logs

# .env 파일이 없으면 생성
if [ ! -f .env ]; then
    echo "⚠️  .env 파일 생성 중..."
    cat > .env << 'ENVFILE'
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=3lz15772779
DB_NAME=o4o_platform
JWT_SECRET=o4o-platform-jwt-secret-key-2025-production
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGIN=https://neture.co.kr,https://www.neture.co.kr,https://admin.neture.co.kr
ENVFILE
fi

# Production 의존성 설치
echo "📦 Production 의존성 설치..."
npm ci --only=production || npm install --only=production

# PM2로 서비스 시작
echo "🔄 PM2로 서비스 시작..."
pm2 delete api-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 상태 확인
sleep 3
pm2 status

# Health check
echo "🏥 Health check..."
curl -s http://localhost:4000/health || echo "⚠️  Health check 실패"

echo "✅ 서버 배포 완료!"
ENDSSH

# 5. 정리
rm -rf $DEPLOY_DIR $DEPLOY_DIR.tar.gz

echo "🎉 API 서버 배포가 완료되었습니다!"
echo ""
echo "📋 확인 명령어:"
echo "  서버 상태: ssh $SERVER 'pm2 status'"
echo "  로그 확인: ssh $SERVER 'pm2 logs api-server --lines 50'"
echo "  재시작:   ssh $SERVER 'pm2 restart api-server'"