# 🌐 서버 환경 구축 및 관리 가이드

## 📖 **개요**
O4O Platform의 서버 환경 설정, 배포, 모니터링을 위한 종합 가이드입니다.

## 🏗️ **서버 아키텍처**

### **현재 구성**
```
🌐 Production (neture.co.kr)
├── 📱 Web Server (AWS Lightsail)
│   ├── Main Site (React 19) - Port 3000
│   ├── Admin Dashboard - Port 3001
│   └── Nginx Reverse Proxy
├── 🔧 API Server (AWS Lightsail)
│   ├── Express.js API - Port 4000
│   ├── TypeORM + PostgreSQL
│   └── JWT Authentication
└── 🗄️ Database
    ├── PostgreSQL 15+
    ├── Connection Pooling
    └── Backup Strategy
```

### **개발 환경**
```
💻 Local Development
├── 🚫 No Docker (중요: Docker 사용 안 함)
├── 📦 Direct Node.js Installation
├── 🗄️ Local PostgreSQL
└── 🔧 PM2 Process Management
```

## ⚙️ **서버 설정 체크리스트**

### **1. 기본 서버 환경**
```bash
# Node.js 20.x 설치 확인
node --version  # v20.18.0 이상

# npm 버전 확인
npm --version   # 9.x 이상

# PostgreSQL 설치 확인
psql --version  # 15.x 이상

# PM2 글로벌 설치
npm install -g pm2
```

### **2. 환경 변수 설정**
```bash
# API Server (.env)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=o4o_platform
JWT_SECRET=your_jwt_secret
NODE_ENV=production
PORT=4000

# Main Site (.env)
VITE_API_URL=https://api.neture.co.kr
VITE_NODE_ENV=production

# Admin Dashboard (.env)
VITE_API_URL=https://api.neture.co.kr
VITE_NODE_ENV=production
```

### **3. 데이터베이스 설정**
```sql
-- PostgreSQL 데이터베이스 생성
CREATE DATABASE o4o_platform;
CREATE USER o4o_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;

-- 연결 풀링 설정
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

## 🚀 **배포 프로세스**

### **자동 배포 (GitHub Actions)**
```yaml
# .github/workflows/deploy-web.yml
name: Deploy to AWS Lightsail
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm run install:all
      - name: Build all services
        run: npm run build:all
      - name: Deploy to server
        run: ./scripts/deploy-to-lightsail.sh
```

### **수동 배포 스크립트**
```bash
#!/bin/bash
# scripts/deploy-to-lightsail.sh

echo "🚀 O4O Platform 배포 시작..."

# 1. 빌드 확인
npm run type-check:all
npm run build:all

# 2. 서버 연결 및 배포
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
  cd /var/www/o4o-platform
  git pull origin main
  npm run install:all
  npm run build:all
  pm2 restart all
  pm2 save
EOF

echo "✅ 배포 완료!"
```

## 📊 **모니터링 및 로깅**

### **PM2 프로세스 관리**
```bash
# 서비스 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status
pm2 logs

# 리스타트
pm2 restart all

# 모니터링
pm2 monit
```

### **ecosystem.config.js 설정**
```javascript
module.exports = {
  apps: [
    {
      name: 'o4o-api-server',
      script: './services/api-server/dist/server.js',
      cwd: './services/api-server',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'o4o-main-site',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: './services/main-site',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'o4o-admin-dashboard',
      script: 'serve',
      args: '-s dist -l 3001',
      cwd: './services/admin-dashboard',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### **로그 관리**
```bash
# PM2 로그
pm2 logs --lines 200

# Nginx 로그
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 애플리케이션 로그
tail -f ./logs/api-server.log
tail -f ./logs/main-site.log
```

## 🔒 **보안 설정**

### **Nginx 설정**
```nginx
# /etc/nginx/sites-available/o4o-platform
server {
    listen 80;
    server_name neture.co.kr www.neture.co.kr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name neture.co.kr www.neture.co.kr;

    ssl_certificate /etc/letsencrypt/live/neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neture.co.kr/privkey.pem;

    # Main Site
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Dashboard
    location /admin {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Server
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **방화벽 설정**
```bash
# UFW 방화벽 설정
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # Main Site (internal)
sudo ufw allow 3001  # Admin Dashboard (internal)
sudo ufw allow 4000  # API Server (internal)
sudo ufw allow 5432  # PostgreSQL (internal)
sudo ufw enable
```

## 🔧 **개발 서버 설정**

### **로컬 개발 환경**
```bash
# 1. 저장소 클론
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 2. Node.js 20 설치 (NVM 사용 권장)
nvm install 20
nvm use 20

# 3. 의존성 설치
npm run install:all

# 4. 환경 변수 설정
cp services/api-server/.env.example services/api-server/.env
cp services/main-site/.env.example services/main-site/.env
cp services/admin-dashboard/.env.example services/admin-dashboard/.env

# 5. 데이터베이스 설정
# PostgreSQL 로컬 설치 후 데이터베이스 생성

# 6. 개발 서버 시작
npm run dev:all
```

### **스마트 개발 시작**
```bash
# 의존성 체크 및 헬스체크 포함
npm run dev:smart

# 또는 개별 서비스
npm run dev:api     # API 서버만
npm run dev:web     # 웹사이트만
npm run dev:admin   # 관리자만
```

## 📈 **성능 최적화**

### **데이터베이스 최적화**
```sql
-- 인덱스 최적화
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- 쿼리 성능 분석
EXPLAIN ANALYZE SELECT * FROM products WHERE status = 'published';
```

### **애플리케이션 최적화**
```typescript
// API 응답 캐싱
app.use('/api/products', cache('5 minutes'));

// 데이터베이스 연결 풀링
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
  }
});
```

## 🚨 **트러블슈팅**

### **일반적인 문제들**

#### **1. 포트 바인딩 오류 (WSL 환경)**
```bash
# WSL에서 포트 포워딩 확인
netstat -tulpn | grep :3000

# Windows에서 포트 포워딩
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.x.x.x
```

#### **2. Node.js 버전 문제**
```bash
# 현재 버전 확인
node --version

# NVM으로 20.x 설치
nvm install 20.18.0
nvm use 20.18.0
nvm alias default 20.18.0
```

#### **3. PostgreSQL 연결 문제**
```bash
# PostgreSQL 서비스 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql -h localhost -U postgres -d o4o_platform

# 로그 확인
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### **4. PM2 프로세스 문제**
```bash
# 프로세스 재시작
pm2 restart all

# 로그 확인
pm2 logs --lines 100

# 메모리 사용량 확인
pm2 monit
```

## 📋 **일일 운영 체크리스트**

### **모니터링 체크**
- [ ] PM2 프로세스 상태 확인
- [ ] 서버 리소스 사용량 확인 (CPU, Memory, Disk)
- [ ] 데이터베이스 연결 상태 확인
- [ ] 애플리케이션 로그 검토
- [ ] Nginx 액세스/에러 로그 확인

### **보안 체크**
- [ ] SSL 인증서 만료일 확인
- [ ] 방화벽 설정 검토
- [ ] 백업 상태 확인
- [ ] 보안 업데이트 확인

### **성능 체크**
- [ ] 응답 시간 모니터링
- [ ] 데이터베이스 쿼리 성능 확인
- [ ] 메모리 누수 검사
- [ ] 디스크 공간 확인

## 🔄 **백업 및 복구**

### **자동 백업 스크립트**
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/o4o-platform"

# 데이터베이스 백업
pg_dump o4o_platform > "$BACKUP_DIR/db_backup_$DATE.sql"

# 애플리케이션 코드 백업
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" /var/www/o4o-platform

# 오래된 백업 정리 (30일 이상)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ 백업 완료: $DATE"
```

### **복구 절차**
```bash
# 1. 서비스 중지
pm2 stop all

# 2. 데이터베이스 복구
psql o4o_platform < /var/backups/o4o-platform/db_backup_YYYYMMDD_HHMMSS.sql

# 3. 애플리케이션 복구
cd /var/www
tar -xzf /var/backups/o4o-platform/app_backup_YYYYMMDD_HHMMSS.tar.gz

# 4. 의존성 재설치
cd o4o-platform
npm run install:all

# 5. 서비스 재시작
pm2 start all
```

## 📞 **긴급 연락처 및 에스컬레이션**

### **서비스 장애 시**
1. **즉시 대응**: PM2 restart, Nginx reload
2. **로그 확인**: 에러 로그 분석
3. **백업 복구**: 필요 시 최신 백업으로 복구
4. **팀 알림**: 개발팀 및 운영팀 통보

### **주요 명령어 요약**
```bash
# 서비스 관리
pm2 status                    # 상태 확인
pm2 restart all              # 전체 재시작
pm2 logs --lines 100         # 로그 확인

# 시스템 모니터링
htop                         # 리소스 사용량
df -h                        # 디스크 공간
free -m                      # 메모리 사용량

# 네트워크 확인
netstat -tulpn              # 포트 확인
curl http://localhost:3000  # 서비스 테스트
```

---

**💡 이 가이드는 O4O Platform의 안정적인 운영을 위한 필수 참고서입니다. 정기적으로 업데이트하고 팀과 공유해주세요!**