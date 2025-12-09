# O4O API Server 설정 가이드 🚀

## 서버 진단 스크립트 실행 방법

1. **서버에 SSH 접속**
```bash
ssh ubuntu@o4o-apiserver
```

2. **진단 스크립트 실행**
```bash
cd /home/ubuntu/o4o-platform
bash scripts/server-diagnosis.sh > diagnosis-report.txt
cat diagnosis-report.txt
```

## 예상되는 문제와 해결 방법

### 1. PM2 프로세스가 실행되지 않는 경우

**증상**: PM2 list에서 api-server가 없거나 stopped 상태

**해결 방법**:
```bash
cd /home/ubuntu/o4o-platform
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 서버 재시작 시 자동 시작 설정
```

### 2. 포트 4000이 리스닝되지 않는 경우

**증상**: netstat에서 4000 포트가 안 보임

**가능한 원인**:
- PM2 프로세스 미실행
- 애플리케이션 시작 오류
- 환경변수 문제

**해결 방법**:
```bash
# PM2 로그 확인
pm2 logs api-server --lines 100

# 수동으로 실행해보기
cd /home/ubuntu/o4o-platform/apps/api-server
node dist/main.js
```

### 3. SSL 인증서 문제

**증상**: SSL 인증서 확인 실패 또는 만료

**해결 방법**:
```bash
# Let's Encrypt 인증서 갱신
sudo certbot renew

# Nginx 재시작
sudo systemctl restart nginx
```

### 4. Nginx 설정 문제

**Nginx 설정 파일 생성** (없는 경우):
```bash
sudo nano /etc/nginx/sites-available/api.neture.co.kr
```

**권장 Nginx 설정**:
```nginx
server {
    listen 80;
    server_name api.neture.co.kr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.neture.co.kr;

    ssl_certificate /etc/letsencrypt/live/api.neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.neture.co.kr/privkey.pem;

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
    }
}
```

**활성화 및 테스트**:
```bash
sudo ln -s /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. PostgreSQL 연결 문제

**증상**: password authentication failed

**해결 방법**:

1. **PostgreSQL 사용자 생성**:
```bash
sudo -u postgres psql
CREATE USER o4o_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE o4o_platform OWNER o4o_user;
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
\q
```

2. **.env.production 파일 수정**:
```bash
cd /home/ubuntu/o4o-platform/apps/api-server
nano .env.production
```

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=your_secure_password
DB_NAME=o4o_platform
```

3. **PostgreSQL 연결 테스트**:
```bash
psql -h localhost -U o4o_user -d o4o_platform
```

### 6. 환경변수 문제

**.env.production 파일 생성** (없는 경우):
```bash
cd /home/ubuntu/o4o-platform/apps/api-server
cp env.example .env.production
nano .env.production
```

**필수 환경변수**:
```env
NODE_ENV=production
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=your_password
DB_NAME=o4o_platform

# JWT
JWT_SECRET=your-very-long-random-string
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://neture.co.kr
ADMIN_URL=https://admin.neture.co.kr
```

## 문제 해결 후 확인 사항

1. **API 서버 재시작**:
```bash
pm2 restart api-server
pm2 logs api-server
```

2. **로컬 테스트**:
```bash
curl http://localhost:4000/api/health
```

3. **외부 접속 테스트**:
```bash
curl https://api.neture.co.kr/api/health
```

## 추가 보안 설정

1. **방화벽 설정**:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

2. **fail2ban 설정** (선택사항):
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

---

**문의사항이 있으면 진단 결과와 함께 Claude Code에게 전달해주세요!**