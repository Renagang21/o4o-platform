#!/bin/bash

# 🔐 Common-Core Auth 배포 스크립트
# 목표: auth.neture.co.kr 소셜 로그인 시스템 배포

echo "======================================"
echo "🚀 Common-Core Auth 배포 시작"
echo "======================================"

# Step 1: Common-Core 클론
echo "📦 Step 1: Common-Core 소스 다운로드..."
cd /home/ubuntu/
if [ ! -d "common-core" ]; then
    git clone https://github.com/Renagang21/common-core.git
fi
cd common-core/auth/backend

# Step 2: 의존성 설치
echo "📦 Step 2: Node.js 의존성 설치..."
npm install

# Step 3: 환경설정 파일 생성
echo "⚙️ Step 3: 환경설정 파일 생성..."
cat > .env << 'EOF'
# 서버 설정
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# 데이터베이스 (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=common_core_auth
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password

# Redis (선택사항 - 없으면 메모리 세션)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 보안
JWT_SECRET=your_jwt_secret_key_here_32_chars_min
JWT_EXPIRY=24h
SESSION_SECRET=your_session_secret_key_32_chars

# OAuth 클라이언트 (실제 값으로 교체 필요)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=

# 서비스 URL
O4O_PLATFORM_URL=https://neture.co.kr
AUTH_BASE_URL=https://auth.neture.co.kr

# CORS 허용 도메인
ALLOWED_ORIGINS=https://neture.co.kr,https://api.neture.co.kr
EOF

echo "⚠️  IMPORTANT: .env 파일을 편집하여 실제 OAuth 키값을 입력하세요!"
echo "   nano .env"

# Step 4: PostgreSQL 데이터베이스 생성
echo "🗄️ Step 4: PostgreSQL 데이터베이스 설정..."
sudo -u postgres psql << EOF
CREATE DATABASE common_core_auth;
\q
EOF

# Step 5: TypeScript 빌드
echo "🔨 Step 5: TypeScript 빌드..."
npm run build

# Step 6: PM2 서비스 시작
echo "🚀 Step 6: PM2로 서비스 시작..."
pm2 stop auth-server 2>/dev/null || true
pm2 start dist/server.js --name "auth-server" -- --port 5000
pm2 save

# Step 7: nginx 설정
echo "🌐 Step 7: nginx 리버스 프록시 설정..."
sudo tee /etc/nginx/sites-available/auth.neture.co.kr > /dev/null << 'EOF'
server {
    listen 80;
    server_name auth.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF

# nginx 설정 활성화
sudo ln -sf /etc/nginx/sites-available/auth.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "======================================"
echo "✅ 배포 준비 완료!"
echo "======================================"
echo ""
echo "🔐 다음 단계:"
echo "1. .env 파일 편집: nano /home/ubuntu/common-core/auth/backend/.env"
echo "2. OAuth 키값 입력 (Google, Naver, Kakao)"
echo "3. PostgreSQL 비밀번호 설정"
echo "4. JWT_SECRET 및 SESSION_SECRET 생성"
echo ""
echo "5. DNS 전파 완료 후 SSL 인증서 발급:"
echo "   sudo certbot --nginx -d auth.neture.co.kr"
echo ""
echo "6. 서비스 확인:"
echo "   pm2 status"
echo "   pm2 logs auth-server"
echo "   curl http://localhost:5000/health"
echo ""
echo "======================================"