# 🚨 O4O Platform 긴급 배포 실행 체크리스트

## ⏱️ 목표: 4-6시간 내 핵심 서비스 정상화

이 체크리스트는 503 에러를 빠르게 해결하고 CEO 테스트를 위한 핵심 서비스를 복구하는 최단 경로입니다.

---

## 🔴 Phase 1: API 서버 (30분)

### 1.1 서버 접속 및 환경 확인
```bash
# 서버 접속
ssh ubuntu@api.neture.co.kr

# 기존 PM2 프로세스 확인
pm2 status
pm2 stop all  # 기존 프로세스 정리

# 디렉토리 확인
cd /home/ubuntu/o4o-platform || mkdir -p /home/ubuntu/o4o-platform
```

### 1.2 코드 배포
```bash
# 코드 가져오기 (처음인 경우)
git clone https://github.com/your-repo/o4o-platform.git .

# 또는 업데이트
git fetch origin
git reset --hard origin/main

# 패키지 설치
npm install --production --prefer-offline --no-audit
```

### 1.3 환경변수 설정
```bash
# 환경변수 파일 생성
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=your_secure_password
DB_NAME=o4o_platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://neture.co.kr,https://www.neture.co.kr,https://admin.neture.co.kr

# API
API_URL=https://api.neture.co.kr
FRONTEND_URL=https://www.neture.co.kr

# Logging
LOG_LEVEL=info
EOF

# 권한 설정
chmod 600 .env.production
```

### 1.4 데이터베이스 초기화
```bash
# PostgreSQL 설치 확인
sudo apt update && sudo apt install -y postgresql

# 데이터베이스 생성
sudo -u postgres psql << 'EOF'
CREATE DATABASE IF NOT EXISTS o4o_platform;
CREATE USER IF NOT EXISTS o4o_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
\q
EOF

# 마이그레이션 실행
cd apps/api-server
npm run migration:run
cd ../..
```

### 1.5 API 서버 시작
```bash
# PM2로 API 서버 시작
pm2 start ecosystem.config.js --only api-server
pm2 save
pm2 startup  # 재부팅 시 자동 시작 설정

# 로그 확인
pm2 logs api-server --lines 50

# 헬스체크
curl http://localhost:4000/health
```

### 1.6 Nginx 설정
```bash
# Nginx 설치
sudo apt install -y nginx

# API 서버 Nginx 설정
sudo cp nginx/sites-available/api.neture.co.kr /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL 인증서 (일단 스킵하고 나중에)
# sudo certbot --nginx -d api.neture.co.kr --non-interactive --agree-tos --email admin@neture.co.kr
```

---

## 🔴 Phase 2: 메인 사이트 & 관리자 대시보드 (30분)

### 2.1 웹 서버 접속
```bash
# 새 터미널에서
ssh ubuntu@neture.co.kr

# PM2 설치
sudo npm install -g pm2 serve
```

### 2.2 메인 사이트 배포
```bash
# 디렉토리 생성
sudo mkdir -p /var/www/neture.co.kr
sudo chown ubuntu:ubuntu /var/www/neture.co.kr

# 로컬에서 빌드된 파일 업로드 (로컬 터미널에서)
scp -r apps/main-site/dist/* ubuntu@neture.co.kr:/var/www/neture.co.kr/

# 서버에서 PM2 시작
pm2 serve /var/www/neture.co.kr 3000 --name o4o-main-site --spa
pm2 save
```

### 2.3 관리자 대시보드 배포
```bash
# 디렉토리 생성
sudo mkdir -p /var/www/admin.neture.co.kr
sudo chown ubuntu:ubuntu /var/www/admin.neture.co.kr

# 로컬에서 파일 업로드
scp -r apps/admin-dashboard/dist/* ubuntu@neture.co.kr:/var/www/admin.neture.co.kr/

# PM2 시작
pm2 serve /var/www/admin.neture.co.kr 3001 --name o4o-admin-dashboard --spa
pm2 save
```

### 2.4 Nginx 설정
```bash
# 메인 사이트 Nginx
sudo tee /etc/nginx/sites-available/neture.co.kr << 'EOF'
server {
    listen 80;
    server_name neture.co.kr www.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 관리자 Nginx
sudo tee /etc/nginx/sites-available/admin.neture.co.kr << 'EOF'
server {
    listen 80;
    server_name admin.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 활성화
sudo ln -sf /etc/nginx/sites-available/neture.co.kr /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔴 Phase 3: 인증 시스템 설정 (10분)

### 3.1 Auth 도메인 프록시 설정
```bash
# auth.neture.co.kr는 API 서버로 프록시
sudo tee /etc/nginx/sites-available/auth.neture.co.kr << 'EOF'
server {
    listen 80;
    server_name auth.neture.co.kr;
    
    location / {
        proxy_pass http://api.neture.co.kr/api/auth;
        proxy_set_header Host api.neture.co.kr;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/auth.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ 빠른 검증 (5분)

### 브라우저 테스트
1. http://api.neture.co.kr/health → "API is healthy" 표시
2. http://www.neture.co.kr → 메인 페이지 로드
3. http://admin.neture.co.kr → 로그인 페이지 표시
4. http://auth.neture.co.kr → API 인증 엔드포인트 응답

### 기본 기능 테스트
```bash
# API 상태
curl http://api.neture.co.kr/health

# 메인 사이트
curl -I http://www.neture.co.kr

# 관리자
curl -I http://admin.neture.co.kr
```

---

## 🟡 Phase 4: SSL 인증서 (선택사항, 15분)

HTTPS가 필요한 경우에만:
```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# 각 도메인별 SSL
sudo certbot --nginx -d api.neture.co.kr --non-interactive --agree-tos --email admin@neture.co.kr
sudo certbot --nginx -d www.neture.co.kr -d neture.co.kr --non-interactive --agree-tos --email admin@neture.co.kr
sudo certbot --nginx -d admin.neture.co.kr --non-interactive --agree-tos --email admin@neture.co.kr
sudo certbot --nginx -d auth.neture.co.kr --non-interactive --agree-tos --email admin@neture.co.kr
```

---

## 🚨 문제 해결 Quick Fix

### 503 에러가 계속되는 경우
```bash
# 1. PM2 프로세스 확인
pm2 list
pm2 restart all

# 2. 포트 확인
sudo netstat -tlnp | grep -E '3000|3001|4000'

# 3. Nginx 에러 확인
sudo tail -f /var/log/nginx/error.log

# 4. 방화벽 확인
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### API 연결 실패
```bash
# API 서버 로그
pm2 logs api-server --lines 100

# 데이터베이스 연결 테스트
PGPASSWORD='your_secure_password' psql -h localhost -U o4o_user -d o4o_platform -c '\l'

# Redis 확인
redis-cli ping
```

---

## 📱 CEO 테스트 준비 완료 체크리스트

- [ ] ✅ api.neture.co.kr/health 접속 가능
- [ ] ✅ www.neture.co.kr 메인 페이지 표시
- [ ] ✅ admin.neture.co.kr 로그인 화면 표시
- [ ] ✅ 테스트 계정으로 로그인 가능
- [ ] ✅ 기본 네비게이션 동작
- [ ] ✅ 503 에러 해결됨

---

## 🎯 예상 소요 시간

1. API 서버: 30분 ✓
2. 메인/관리자: 30분 ✓
3. 인증 설정: 10분 ✓
4. 검증: 5분 ✓
5. SSL (선택): 15분

**총 소요시간: 1시간 15분 ~ 1시간 30분**

---

## 💡 추가 팁

1. **병렬 작업**: API 서버 설치하는 동안 다른 터미널에서 웹 서버 준비
2. **SSL은 나중에**: 일단 HTTP로 동작 확인 후 SSL 적용
3. **로그 모니터링**: `pm2 logs --lines 100` 로 실시간 확인
4. **빠른 롤백**: 문제 시 `pm2 stop all` 후 이전 버전으로

이 체크리스트를 따라하면 1-2시간 내에 핵심 서비스를 정상화할 수 있습니다.