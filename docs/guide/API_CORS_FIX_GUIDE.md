# API 서버 CORS 문제 해결 가이드

## 🔴 현재 문제
- Admin Dashboard (https://admin.neture.co.kr)에서 API (https://api.neture.co.kr)로 로그인 요청 시 CORS 에러 발생
- 에러: `No 'Access-Control-Allow-Origin' header is present on the requested resource`

## 🎯 문제 원인

1. **API 서버 미실행**: api.neture.co.kr이 실제 API 서버를 가리키지 않음
2. **잘못된 프록시 설정**: Nginx가 API 요청을 올바르게 프록시하지 못함
3. **CORS 헤더 누락**: 응답에 CORS 헤더가 포함되지 않음

## ✅ 해결 방법

### 방법 1: API 서버를 별도 포트로 실행 (권장)

#### 1. API 서버 실행 (포트 4000)
```bash
# API 서버에서
cd /home/ubuntu/o4o-platform/apps/api-server

# 환경 변수 설정
cat > .env << EOF
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=${실제_비밀번호}
DB_NAME=o4o_platform
JWT_SECRET=${실제_JWT_SECRET}
CORS_ORIGIN=https://admin.neture.co.kr,https://neture.co.kr
CORS_CREDENTIALS=true
EOF

# 빌드 및 실행
npm run build
pm2 start dist/main.js --name o4o-api -- --port 4000
pm2 save
```

#### 2. Nginx 설정 (api.neture.co.kr)
```nginx
server {
    listen 443 ssl;
    server_name api.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS 헤더 추가 (백업용)
        add_header 'Access-Control-Allow-Origin' 'https://admin.neture.co.kr' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
```

### 방법 2: 현재 서버(43.202.242.215)에서 API 실행

#### 1. Admin Dashboard 설정 수정
```javascript
// apps/admin-dashboard/.env
VITE_API_URL=http://43.202.242.215:4000
```

#### 2. API 서버 CORS 수정
```javascript
// apps/api-server/src/main.ts에 추가
const allowedOrigins = [
  // ... 기존 설정
  "http://43.202.242.215:3000",
  "http://43.202.242.215:3001",
  "https://admin.neture.co.kr",
  "https://neture.co.kr"
];
```

### 방법 3: 임시 해결책 (개발용)

#### CORS 완전 허용 (보안 주의!)
```javascript
// apps/api-server/src/main.ts
const corsOptions = {
  origin: true, // 모든 origin 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400
};
```

## 🔧 즉시 적용 가능한 수정

### API 서버 재시작 스크립트
```bash
#!/bin/bash
# fix-api-cors.sh

# API 서버 중지
pm2 stop o4o-api

# 환경 변수 업데이트
export CORS_ORIGIN="https://admin.neture.co.kr,https://neture.co.kr,http://43.202.242.215:3001"
export CORS_CREDENTIALS=true

# API 서버 재시작
cd /home/ubuntu/o4o-platform/apps/api-server
npm run build
pm2 start dist/main.js --name o4o-api --update-env
pm2 save

echo "API 서버 CORS 설정 업데이트 완료"
```

## 🎯 검증 방법

### 1. CORS 헤더 확인
```bash
curl -I -X OPTIONS https://api.neture.co.kr/api/v1/auth/login \
  -H "Origin: https://admin.neture.co.kr" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

### 2. 실제 로그인 테스트
```bash
curl -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Origin: https://admin.neture.co.kr" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@neture.co.kr","password":"admin123"}'
```

## 📝 체크리스트

- [ ] API 서버가 실제로 실행 중인가?
- [ ] api.neture.co.kr이 올바른 서버를 가리키는가?
- [ ] CORS_ORIGIN 환경변수에 admin.neture.co.kr이 포함되어 있는가?
- [ ] Nginx가 CORS 헤더를 제거하지 않는가?
- [ ] SSL 인증서가 유효한가?

## 🚨 주의사항

1. **프로덕션 환경**에서는 CORS origin을 명확히 지정
2. **credentials: true** 설정 시 반드시 특정 origin 지정
3. **Nginx와 Express 모두**에서 CORS 설정 시 중복 헤더 주의

---
*작성일: 2025년 8월 18일*