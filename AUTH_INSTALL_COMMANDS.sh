#!/bin/bash
# 🚀 Common-Core Auth 시스템 설치 명령어

echo "======================================"
echo "🔐 Common-Core Auth 설치 시작"
echo "======================================"

# 1. SSH 접속
echo "1️⃣ 서버 접속:"
echo "ssh ubuntu@13.125.144.8"
echo ""

# 2. Common-Core 클론
echo "2️⃣ 소스코드 다운로드:"
echo "cd /home/ubuntu/"
echo "git clone https://github.com/Renagang21/common-core.git"
echo "cd common-core/auth/backend"
echo ""

# 3. 의존성 설치
echo "3️⃣ Node.js 패키지 설치:"
echo "npm install"
echo ""

# 4. 환경설정 파일 생성
echo "4️⃣ 환경설정 파일 생성:"
echo "nano .env"
echo ""

# 5. .env 파일 내용
echo "5️⃣ .env 파일에 입력할 내용:"
cat << 'EOF'
# 서버 설정
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# 데이터베이스
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=common_core_auth
DATABASE_USER=postgres
DATABASE_PASSWORD=[PostgreSQL 비밀번호]

# JWT 보안 (openssl rand -base64 32 로 생성)
JWT_SECRET=[32자리 이상 랜덤 문자열]
JWT_EXPIRY=24h
SESSION_SECRET=[32자리 이상 랜덤 문자열]

# OAuth 클라이언트 (실제 키값 입력)
GOOGLE_CLIENT_ID=[Google OAuth Client ID]
GOOGLE_CLIENT_SECRET=[Google OAuth Client Secret]
NAVER_CLIENT_ID=[Naver Client ID]
NAVER_CLIENT_SECRET=[Naver Client Secret]
KAKAO_CLIENT_ID=[Kakao REST API Key]
KAKAO_CLIENT_SECRET=

# 서비스 URL
O4O_PLATFORM_URL=https://neture.co.kr
AUTH_BASE_URL=https://auth.neture.co.kr

# CORS
ALLOWED_ORIGINS=https://neture.co.kr,https://api.neture.co.kr
EOF

echo ""
echo "6️⃣ PostgreSQL 데이터베이스 생성:"
echo "sudo -u postgres psql"
echo "CREATE DATABASE common_core_auth;"
echo "\q"
echo ""

echo "7️⃣ TypeScript 빌드:"
echo "npm run build"
echo ""

echo "8️⃣ PM2로 서비스 시작:"
echo "pm2 start dist/server.js --name auth-server"
echo "pm2 save"
echo ""

echo "9️⃣ 서비스 확인:"
echo "pm2 status"
echo "curl http://localhost:5000/health"
echo ""

echo "======================================"
echo "✅ DNS 전파 후 nginx 설정을 진행하세요!"
echo "======================================"