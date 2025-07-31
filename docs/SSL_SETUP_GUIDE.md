# SSL/HTTPS 정식 설정 가이드

## 서버 접속 및 작업 순서

### 1. 서버 접속
```bash
ssh ubuntu@43.202.242.215  # API 서버
ssh ubuntu@13.125.144.8   # 웹 서버
```

### 2. Nginx 설치 (아직 안 되어 있다면)
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
```

### 3. Let's Encrypt Certbot 설치
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 4. 방화벽 설정
```bash
# 필요한 포트 열기
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 5. Nginx 사이트 설정 생성

#### A. 메인 사이트 설정
```bash
sudo nano /etc/nginx/sites-available/neture
```

내용:
```nginx
# HTTP 서버 (Let's Encrypt 인증용)
server {
    listen 80;
    server_name neture.co.kr www.neture.co.kr;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 서버
server {
    listen 443 ssl;
    server_name neture.co.kr www.neture.co.kr;
    
    # SSL 인증서 (Let's Encrypt가 생성)
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 프록시 설정
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 포트 8080/8443용 설정 (ISP 차단 우회)
server {
    listen 8080;
    server_name neture.co.kr www.neture.co.kr;
    return 301 https://$server_name:8443$request_uri;
}

server {
    listen 8443 ssl;
    server_name neture.co.kr www.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### B. 관리자 사이트 설정
```bash
sudo nano /etc/nginx/sites-available/admin-neture
```

내용:
```nginx
server {
    listen 80;
    server_name admin.neture.co.kr;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name admin.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 포트 8444 HTTPS
server {
    listen 8444 ssl;
    server_name admin.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### C. API 서버 설정
```bash
sudo nano /etc/nginx/sites-available/api-neture
```

내용:
```nginx
server {
    listen 80;
    server_name api.neture.co.kr;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name api.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 포트 8445 HTTPS
server {
    listen 8445 ssl;
    server_name api.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Nginx 설정 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/neture /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin-neture /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api-neture /etc/nginx/sites-enabled/

# 기본 사이트 비활성화
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 7. Let's Encrypt SSL 인증서 발급
```bash
# 인증서 발급 (대화형)
sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr -d admin.neture.co.kr -d api.neture.co.kr

# 또는 자동 발급
sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr -d admin.neture.co.kr -d api.neture.co.kr --non-interactive --agree-tos -m your-email@example.com
```

### 8. 자동 갱신 설정
```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# Cron 작업 확인 (자동으로 설정됨)
sudo systemctl status certbot.timer
```

### 9. 애플리케이션 설정 업데이트

#### A. API 서버 CORS 설정
```bash
cd /home/ubuntu/o4o-platform/apps/api-server
nano .env.production
```

추가:
```
CORS_ORIGIN=https://neture.co.kr,https://www.neture.co.kr,https://admin.neture.co.kr,https://neture.co.kr:8443,https://www.neture.co.kr:8443,https://admin.neture.co.kr:8444
```

#### B. 프론트엔드 API URL 설정
```bash
cd /home/ubuntu/o4o-platform/apps/main-site
nano .env.production
```

추가:
```
VITE_API_URL=https://api.neture.co.kr
```

### 10. PM2로 서비스 재시작
```bash
pm2 restart all
pm2 save
```

## 접속 테스트

정상 작동 시 다음 URL로 접속 가능:
- https://neture.co.kr (표준 포트)
- https://neture.co.kr:8443 (대체 포트)
- https://admin.neture.co.kr
- https://admin.neture.co.kr:8444
- https://api.neture.co.kr
- https://api.neture.co.kr:8445

## 문제 해결

### SSL 인증서 문제
```bash
# 인증서 상태 확인
sudo certbot certificates

# 인증서 강제 갱신
sudo certbot renew --force-renewal
```

### Nginx 오류
```bash
# 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# 액세스 로그 확인
sudo tail -f /var/log/nginx/access.log
```

### 방화벽 문제
```bash
# 열린 포트 확인
sudo ufw status numbered

# AWS Security Group에서도 포트 확인 필요
```