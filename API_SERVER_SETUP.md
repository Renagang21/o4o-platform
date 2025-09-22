# API Server Setup Guide

## Quick Start (API 서버에서 실행)

```bash
# 1. SSH로 API 서버 접속
ssh ubuntu@43.202.242.215

# 2. 배포 스크립트 실행
cd /home/ubuntu/o4o-platform
./scripts/deploy-api-production.sh
```

## Manual Setup Steps

### 1. 프로젝트 클론/업데이트
```bash
cd /home/ubuntu
# 최초 설치
git clone https://github.com/Renagang21/o4o-platform.git

# 업데이트
cd o4o-platform
git pull origin main
```

### 2. API 서버 빌드
```bash
cd apps/api-server
npm install
npm run build
```

### 3. PM2로 시작
```bash
cd /home/ubuntu/o4o-platform
pm2 start ecosystem.config.production.cjs
pm2 save
pm2 startup
```

### 4. Nginx 설정 (API 서버에서)
```bash
# /etc/nginx/sites-available/api.neture.co.kr 파일 생성
sudo nano /etc/nginx/sites-available/api.neture.co.kr
```

Nginx 설정 내용:
```nginx
# Map origin to check allowed domains
map $http_origin $cors_origin {
    default "";
    "https://neture.co.kr" $http_origin;
    "https://www.neture.co.kr" $http_origin;
    "https://admin.neture.co.kr" $http_origin;
    "https://shop.neture.co.kr" $http_origin;
    "https://forum.neture.co.kr" $http_origin;
}

server {
    listen 80;
    server_name api.neture.co.kr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.neture.co.kr;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.neture.co.kr/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # CORS headers
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Expose-Headers "Content-Length,Content-Range,X-Total-Count,X-Page-Count" always;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin $cors_origin always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
        
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    client_max_body_size 50M;
}
```

### 5. Nginx 설정 활성화
```bash
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL 인증서 설정 (필요시)
```bash
sudo certbot --nginx -d api.neture.co.kr
```

## 유용한 명령어

### PM2 관리
```bash
# 로그 보기
pm2 logs o4o-api-production

# 프로세스 재시작
pm2 restart o4o-api-production

# 프로세스 정지
pm2 stop o4o-api-production

# 프로세스 삭제
pm2 delete o4o-api-production

# 모니터링
pm2 monit
```

### 테스트
```bash
# 로컬에서 헬스체크
curl http://localhost:4000/health

# CORS 헤더 테스트
curl -H "Origin: https://admin.neture.co.kr" -I https://api.neture.co.kr/health
```

## 환경변수 설정

`ecosystem.config.production.cjs` 파일에서 다음 환경변수를 수정:

- `DB_PASSWORD`: 실제 데이터베이스 비밀번호
- `JWT_SECRET`: 실제 JWT 시크릿 (보안상 중요!)
- `JWT_REFRESH_SECRET`: 실제 리프레시 토큰 시크릿

## 트러블슈팅

### 502 Bad Gateway 오류
1. PM2 프로세스가 실행중인지 확인: `pm2 list`
2. API 서버 로그 확인: `pm2 logs o4o-api-production`
3. 포트 4000이 사용중인지 확인: `sudo netstat -nlp | grep 4000`

### CORS 오류
1. Nginx 설정 확인: `sudo nginx -t`
2. Nginx 리로드: `sudo systemctl reload nginx`
3. 브라우저 캐시 클리어 후 재시도

### 데이터베이스 연결 오류
1. PostgreSQL 상태 확인: `sudo systemctl status postgresql`
2. 데이터베이스 접속 테스트: `psql -U postgres -d o4o_platform`
3. 환경변수 확인: `pm2 env o4o-api-production`