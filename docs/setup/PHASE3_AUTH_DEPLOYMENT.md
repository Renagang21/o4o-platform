# 🔐 Phase 3: Common-Core Auth 배포 계획

**목표**: auth.neture.co.kr에서 소셜 로그인 시스템 운영
**현재 상황**: DNS 설정 완료, 전파 대기 중

---

## 📋 Auth 시스템 현황 분석

### ✅ Common-Core Auth 구조
```
/common-core/auth/backend/
├── package.json (Node.js 20+, TypeScript, Express)
├── src/
│   ├── server.ts (메인 서버)
│   ├── config/
│   │   ├── environment.ts (환경 설정)
│   │   ├── passport.ts (OAuth 설정)
│   │   └── database.ts (PostgreSQL)
│   ├── controllers/ (인증 로직)
│   ├── entities/ (User, Service, UserServiceAccess)
│   └── routes/ (auth, oauth 라우터)
└── public/ (로그인 페이지, 콜백 페이지)
```

### 🔧 기술 스택
- **Runtime**: Node.js 20+, TypeScript
- **Framework**: Express.js with Passport.js
- **Database**: TypeORM + PostgreSQL
- **Session**: Redis (선택적)
- **OAuth**: Google, Naver, Kakao
- **Security**: JWT, CORS, Helmet

---

## 🚀 배포 실행 계획

### Step 1: 서버 접속 및 Auth 시스템 설치
```bash
# o4o-webserver (13.125.144.8)에 SSH 접속
ssh ubuntu@13.125.144.8

# Common-Core Auth 시스템 클론
cd /home/ubuntu/
git clone https://github.com/Renagang21/common-core.git
cd common-core/auth/backend

# 의존성 설치
npm install
```

### Step 2: 환경 설정 파일 생성
```bash
# .env 파일 생성
cp .env.example .env  # 만약 있다면
# 또는 직접 생성
nano .env
```

#### .env 파일 내용:
```bash
# 서버 설정
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# 데이터베이스 (o4o-apiserver의 PostgreSQL 활용)
DATABASE_HOST=localhost  # 또는 o4o-apiserver IP
DATABASE_PORT=5432
DATABASE_NAME=common_core_auth
DATABASE_USER=postgres
DATABASE_PASSWORD=[실제 비밀번호]

# Redis (선택적, 없으면 메모리 세션 사용)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 보안
JWT_SECRET=[강력한-랜덤-비밀키-32자리-이상]
JWT_EXPIRY=24h
SESSION_SECRET=[세션-비밀키-32자리-이상]

# OAuth 클라이언트 (실제 값 필요)
GOOGLE_CLIENT_ID=[Google OAuth 클라이언트 ID]
GOOGLE_CLIENT_SECRET=[Google OAuth 클라이언트 Secret]
NAVER_CLIENT_ID=[Naver OAuth 클라이언트 ID]
NAVER_CLIENT_SECRET=[Naver OAuth 클라이언트 Secret]
KAKAO_CLIENT_ID=[Kakao OAuth 클라이언트 ID]
KAKAO_CLIENT_SECRET=[Kakao OAuth 클라이언트 Secret]

# 서비스 URL (프로덕션 환경)
O4O_PLATFORM_URL=https://neture.co.kr
AUTH_BASE_URL=https://auth.neture.co.kr

# CORS 허용 도메인
ALLOWED_ORIGINS=https://neture.co.kr,https://api.neture.co.kr
```

### Step 3: PostgreSQL 데이터베이스 설정
```bash
# PostgreSQL 접속 (로컬 또는 원격)
sudo -u postgres psql

# 데이터베이스 생성
CREATE DATABASE common_core_auth;
CREATE USER auth_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE common_core_auth TO auth_user;

# 연결 테스트
psql -h localhost -U auth_user -d common_core_auth
```

### Step 4: TypeScript 빌드 및 서비스 시작
```bash
# TypeScript 컴파일
npm run build

# PM2로 프로덕션 서비스 시작
pm2 start dist/server.js --name "auth-server" --port 5000

# PM2 서비스 확인
pm2 list
pm2 logs auth-server
```

### Step 5: nginx 리버스 프록시 설정
```bash
# nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/auth.neture.co.kr
```

#### nginx 설정 내용:
```nginx
server {
    listen 80;
    server_name auth.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for OAuth callbacks
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    }
}
```

```bash
# nginx 설정 활성화
sudo ln -s /etc/nginx/sites-available/auth.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: SSL 인증서 발급
```bash
# Let's Encrypt 인증서 발급
sudo certbot --nginx -d auth.neture.co.kr

# 자동 갱신 확인
sudo certbot renew --dry-run
```

---

## 🧪 테스트 절차

### DNS 전파 확인
```bash
# 전파 완료 확인 (5-10분 후)
curl -I http://auth.neture.co.kr

# 예상 결과: HTTP 200 또는 리다이렉트
```

### Auth 서비스 테스트
```bash
# 1. 기본 헬스체크
curl http://localhost:5000/health

# 2. 도메인을 통한 접근
curl https://auth.neture.co.kr/health

# 3. 로그인 페이지 확인
curl https://auth.neture.co.kr/login

# 4. OAuth 엔드포인트 확인
curl https://auth.neture.co.kr/auth/google
```

### PM2 서비스 모니터링
```bash
# 서비스 상태 확인
pm2 status
pm2 logs auth-server --lines 50

# 메모리/CPU 사용량
pm2 monit
```

---

## 🔧 OAuth 클라이언트 설정

### Google OAuth 설정
```
1. Google Cloud Console 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. OAuth 2.0 클라이언트 ID 생성
4. 승인된 리디렉션 URI:
   - https://auth.neture.co.kr/auth/google/callback
5. 클라이언트 ID와 Secret 복사
```

### Naver OAuth 설정
```
1. Naver Developers 접속
2. 애플리케이션 등록
3. 서비스 URL: https://neture.co.kr
4. Callback URL: https://auth.neture.co.kr/auth/naver/callback
5. 클라이언트 ID와 Secret 복사
```

### Kakao OAuth 설정
```
1. Kakao Developers 접속
2. 애플리케이션 생성
3. 플랫폼 설정 > Web
4. 사이트 도메인: https://neture.co.kr
5. Redirect URI: https://auth.neture.co.kr/auth/kakao/callback
6. 클라이언트 ID와 Secret 복사
```

---

## 🚨 보안 설정

### 강화된 nginx 설정
```nginx
server {
    listen 443 ssl http2;
    server_name auth.neture.co.kr;
    
    # SSL 설정
    ssl_certificate /etc/letsencrypt/live/auth.neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auth.neture.co.kr/privkey.pem;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
    
    location / {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### PM2 보안 설정
```bash
# 클러스터 모드로 시작 (가용성 향상)
pm2 start dist/server.js --name "auth-server" -i 2 --max-memory-restart 256M

# 환경변수 보안
pm2 set pm2-encrypt true
```

---

## 📊 모니터링 및 로그

### 로그 모니터링
```bash
# Auth 서버 로그
pm2 logs auth-server --lines 100 --timestamp

# nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL 로그
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### 성능 모니터링
```bash
# 시스템 리소스
htop
df -h

# 네트워크 연결
netstat -tlnp | grep :5000
netstat -tlnp | grep :443
```

---

## ✅ 완료 체크리스트

### 기본 설치 체크리스트
- [ ] SSH 접속 성공
- [ ] Common-Core Auth 소스 클론
- [ ] Node.js 의존성 설치
- [ ] .env 파일 설정
- [ ] PostgreSQL 데이터베이스 생성
- [ ] TypeScript 빌드 성공
- [ ] PM2 서비스 시작

### 도메인 및 SSL 체크리스트
- [ ] DNS 전파 확인
- [ ] nginx 리버스 프록시 설정
- [ ] nginx 설정 테스트 통과
- [ ] Let's Encrypt SSL 인증서 발급
- [ ] HTTPS 접속 성공

### OAuth 설정 체크리스트
- [ ] Google OAuth 클라이언트 생성
- [ ] Naver OAuth 클라이언트 생성
- [ ] Kakao OAuth 클라이언트 생성
- [ ] .env에 클라이언트 정보 설정
- [ ] OAuth 플로우 테스트

### 보안 및 성능 체크리스트
- [ ] 보안 헤더 적용
- [ ] Rate limiting 설정
- [ ] PM2 클러스터 모드
- [ ] 로그 모니터링 설정

---

## 🔄 다음 단계 미리보기

Phase 3 완료 후 진행할 작업:
1. **Phase 4**: API 서버 도메인 연결 (api.neture.co.kr)
2. **Phase 5**: React CMS 인증 통합 (neture.co.kr)
3. **Phase 6**: 전체 시스템 테스트

---

**🎯 목표**: https://auth.neture.co.kr에서 완전한 소셜 로그인 시스템 운영**

**⏱️ 예상 소요시간**: 30-45분 (OAuth 설정 포함)**

**🔗 성공 지표**: Google/Naver/Kakao 로그인이 정상 작동하는 인증 시스템**