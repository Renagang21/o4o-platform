#!/bin/bash

# API 서버 최소 배포 스크립트
# 로컬에서 빌드한 후 서버에 배포

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 서버 정보
SERVER_USER="root"
SERVER_HOST="13.125.144.8"
SERVER_PATH="/var/www/api-server"
API_PORT=4000

echo -e "${GREEN}📦 API 서버 배포 시작${NC}"

# 1. 로컬에서 빌드
echo -e "${YELLOW}🔨 로컬에서 빌드 중...${NC}"
cd apps/api-server

# 의존성 설치 및 빌드
pnpm install
pnpm run build

# dist 폴더 확인
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ 빌드 실패: dist 폴더가 생성되지 않았습니다${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 빌드 완료${NC}"

# 2. 배포 준비
echo -e "${YELLOW}📤 서버에 파일 업로드 중...${NC}"

# 임시 배포 디렉토리 생성
TEMP_DIR="api-server-deploy-$(date +%Y%m%d%H%M%S)"
mkdir -p /tmp/$TEMP_DIR

# 필요한 파일들 복사
cp -r dist /tmp/$TEMP_DIR/
cp package.json /tmp/$TEMP_DIR/
cp package-lock.json /tmp/$TEMP_DIR/ 2>/dev/null || true
cp tsconfig.json /tmp/$TEMP_DIR/
cp .env.production /tmp/$TEMP_DIR/.env 2>/dev/null || echo -e "${YELLOW}⚠️  .env.production 파일이 없습니다. 서버에서 설정 필요${NC}"

# ecosystem.config.js 생성 (PM2 설정)
cat > /tmp/$TEMP_DIR/ecosystem.config.js << 'EOF'
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
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# 3. 서버로 전송
echo -e "${YELLOW}📡 서버로 파일 전송 중...${NC}"
tar -czf /tmp/$TEMP_DIR.tar.gz -C /tmp $TEMP_DIR

# SSH로 서버에 업로드 및 배포
ssh $SERVER_USER@$SERVER_HOST << REMOTE_SCRIPT
set -e

# 백업 생성
if [ -d "$SERVER_PATH" ]; then
    echo "기존 배포 백업 중..."
    sudo mv $SERVER_PATH ${SERVER_PATH}.backup.\$(date +%Y%m%d%H%M%S)
fi

# 새 디렉토리 생성
sudo mkdir -p $SERVER_PATH
cd $SERVER_PATH

# 파일 추출
sudo tar -xzf - 

# 임시 디렉토리에서 파일 이동
sudo mv $TEMP_DIR/* .
sudo rm -rf $TEMP_DIR

# 로그 디렉토리 생성
sudo mkdir -p logs

# Production 의존성만 설치
echo "Production 의존성 설치 중..."
sudo pnpm install --frozen-lockfile --only=production || sudo pnpm install --only=production

# PM2로 서비스 시작
echo "PM2로 API 서버 시작 중..."
sudo pm2 delete api-server 2>/dev/null || true
sudo pm2 start ecosystem.config.js
sudo pm2 save
sudo pm2 startup systemd -u root --hp /root || true

# 상태 확인
sleep 3
sudo pm2 status
curl -s http://localhost:$API_PORT/health || echo "Health check 실패"

echo "✅ 배포 완료!"
REMOTE_SCRIPT < /tmp/$TEMP_DIR.tar.gz

# 4. 정리
rm -rf /tmp/$TEMP_DIR /tmp/$TEMP_DIR.tar.gz

echo -e "${GREEN}🎉 API 서버 배포가 완료되었습니다!${NC}"
echo -e "${GREEN}서버 상태 확인: ssh $SERVER_USER@$SERVER_HOST 'pm2 status'${NC}"
echo -e "${GREEN}로그 확인: ssh $SERVER_USER@$SERVER_HOST 'pm2 logs api-server'${NC}"