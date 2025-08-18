#!/bin/bash
# ================================
# 긴급 CORS 문제 해결 스크립트
# ================================

echo "🚨 긴급 CORS 문제 해결 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: 현재 API 서버 상태 확인
echo -e "${YELLOW}1. API 서버 상태 확인...${NC}"
if pm2 describe o4o-api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API 서버가 PM2에서 실행 중${NC}"
else
    echo -e "${RED}❌ API 서버가 실행되지 않음${NC}"
    echo "API 서버를 먼저 시작해야 합니다."
    exit 1
fi

# Step 2: 임시 CORS 완전 허용 설정
echo -e "${YELLOW}2. 임시 CORS 설정 적용...${NC}"

# 백업 생성
cp apps/api-server/src/main.ts apps/api-server/src/main.ts.backup

# CORS 설정 수정
cat > /tmp/cors-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

const mainFile = path.join(process.cwd(), 'apps/api-server/src/main.ts');
let content = fs.readFileSync(mainFile, 'utf8');

// CORS options를 더 관대하게 수정
const newCorsOptions = `
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // 임시로 모든 origin 허용
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: '*',
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};`;

// 기존 corsOptions 찾아서 교체
content = content.replace(/const corsOptions:[\s\S]*?^};/m, newCorsOptions);

fs.writeFileSync(mainFile, content);
console.log('CORS 설정이 임시로 수정되었습니다.');
EOF

node /tmp/cors-fix.js

# Step 3: API 서버 재빌드 및 재시작
echo -e "${YELLOW}3. API 서버 재빌드 및 재시작...${NC}"
cd apps/api-server
npm run build
cd ../..

# PM2로 재시작
pm2 restart o4o-api

# Step 4: 상태 확인
echo -e "${YELLOW}4. 서버 상태 확인...${NC}"
sleep 3
pm2 status o4o-api

echo -e "${GREEN}✅ CORS 임시 수정 완료!${NC}"
echo -e "${YELLOW}⚠️  주의: 이것은 임시 해결책입니다.${NC}"
echo -e "${YELLOW}프로덕션에서는 정확한 origin을 지정해야 합니다.${NC}"

# Step 5: 테스트 명령 제공
echo ""
echo -e "${GREEN}테스트 명령:${NC}"
echo "curl -I -X OPTIONS http://43.202.242.215:4000/api/v1/auth/login \\"
echo "  -H 'Origin: https://admin.neture.co.kr' \\"
echo "  -H 'Access-Control-Request-Method: POST'"