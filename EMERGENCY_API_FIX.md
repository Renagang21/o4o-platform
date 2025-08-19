# 🚨 긴급: API 서버 복구 절차

## 현재 상황 (Critical)
- **문제**: API 서버(api.neture.co.kr) 502 Bad Gateway
- **영향**: 모든 서비스 접속 불가
- **원인**: PM2 프로세스가 실행되지 않음

## 즉시 실행 명령 (API 서버에서)

### 옵션 1: SSH 직접 접속 후 실행
```bash
# API 서버 접속 (43.202.242.215)
ssh ubuntu@43.202.242.215

# 1. 디렉토리 이동
cd /home/ubuntu/o4o-platform

# 2. 최신 코드 받기
git pull origin main

# 3. API 서버 빌드
cd apps/api-server
npm install
npm run build

# 4. PM2로 시작 (중요!)
pm2 start dist/main.js --name o4o-api \
  --env production \
  -i max \
  --merge-logs \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# 5. PM2 설정 저장
pm2 save
pm2 startup

# 6. 상태 확인
pm2 status
pm2 logs o4o-api --lines 20
```

### 옵션 2: 환경 변수와 함께 시작
```bash
# 환경 변수 설정 후 시작
cd /home/ubuntu/o4o-platform/apps/api-server

NODE_ENV=production \
PORT=3001 \
DB_HOST=localhost \
DB_PORT=5432 \
DB_USERNAME=o4o_user \
DB_PASSWORD=[실제_비밀번호] \
DB_NAME=o4o_platform \
JWT_SECRET=[실제_시크릿] \
JWT_REFRESH_SECRET=[실제_시크릿] \
pm2 start dist/main.js --name o4o-api

pm2 save
```

### 옵션 3: ecosystem 파일 사용
```bash
cd /home/ubuntu/o4o-platform

# ecosystem 파일로 시작
pm2 start ecosystem.config.apiserver.cjs --env production

# 또는 직접 설정
pm2 start apps/api-server/dist/main.js \
  --name o4o-api \
  --instances max \
  --exec-mode cluster
```

## 확인 절차

### 1. PM2 프로세스 확인
```bash
pm2 list
# o4o-api가 online 상태여야 함
```

### 2. 로그 확인
```bash
pm2 logs o4o-api --lines 50
# 에러가 없어야 함
```

### 3. 헬스체크
```bash
curl http://localhost:3001/health
# {"status":"ok"} 응답 확인
```

### 4. CORS 테스트
```bash
curl -I -X OPTIONS http://localhost:3001/api/v1/auth/login \
  -H 'Origin: https://admin.neture.co.kr' \
  -H 'Access-Control-Request-Method: POST'
# Access-Control-Allow-Origin 헤더 확인
```

### 5. 외부 접속 테스트
```bash
# 로컬에서 실행
curl https://api.neture.co.kr/health
# {"status":"ok"} 응답 확인
```

## Nginx 설정 확인 (필요시)

```bash
# Nginx 설정 확인
sudo nano /etc/nginx/sites-available/api.neture.co.kr

# 다음과 같은 설정이 있어야 함:
location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Nginx 재시작
sudo systemctl restart nginx
```

## 문제 해결이 안 될 경우

### 포트 충돌 확인
```bash
sudo lsof -i :3001
# 다른 프로세스가 사용 중이면 종료
```

### PM2 완전 재시작
```bash
pm2 kill
pm2 start apps/api-server/dist/main.js --name o4o-api
```

### 로그 상세 확인
```bash
pm2 logs o4o-api --err --lines 100
tail -f /var/log/nginx/error.log
```

## 예상 소요 시간
- 전체 복구: 3-5분
- PM2 시작: 30초
- 헬스체크: 10초

---
**긴급도**: 🔴 CRITICAL - 즉시 실행 필요