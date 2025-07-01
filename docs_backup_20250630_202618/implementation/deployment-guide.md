# 배포 가이드

## 📋 개요

O4O 플랫폼의 프로덕션 배포를 위한 가이드입니다. 개발 환경에서 프로덕션 환경까지의 전체 배포 프로세스를 다룹니다.

## 🏗️ 배포 아키텍처

### 시스템 구성도
```
Internet
    ↓
[ Load Balancer ]
    ↓
[ Reverse Proxy (Nginx) ]
    ↓
[ React App (Static Files) ]
    ↓
[ API Server (Node.js) ]
    ↓
[ Database (PostgreSQL) ]
    ↓
[ File Storage (S3/MinIO) ]
```

### 환경 구분
- **Development**: 개발자 로컬 환경
- **Staging**: 테스트 및 QA 환경
- **Production**: 실제 서비스 환경

## 🛠️ 사전 준비사항

### 시스템 요구사항

**서버 사양 (최소):**
- CPU: 2 Core 이상
- RAM: 4GB 이상
- Storage: 50GB 이상 (SSD 권장)
- Network: 100Mbps 이상

**서버 사양 (권장):**
- CPU: 4 Core 이상
- RAM: 8GB 이상
- Storage: 100GB 이상 (SSD)
- Network: 1Gbps

### 필요 소프트웨어
- Node.js 18.x 이상
- npm 또는 yarn
- PM2 (프로세스 관리)
- Nginx (리버스 프록시)
- PostgreSQL 15+ 또는 MySQL 8+
- Redis (세션, 캐시용)
- Git

## 🔧 환경 설정

### 1. 환경 변수 설정

**프로덕션 환경변수 (.env.production):**
```bash
# 애플리케이션 설정
NODE_ENV=production
PORT=3000
APP_NAME=O4O-Platform
APP_URL=https://o4o-platform.com

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_NAME=o4o_production
DB_USER=o4o_user
DB_PASSWORD=your_secure_password

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 설정
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# 파일 업로드 설정
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=o4o-platform-files
AWS_REGION=ap-northeast-2

# 이메일 설정
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@o4o-platform.com
SMTP_PASSWORD=your_email_password

# 결제 설정
PAYMENT_GATEWAY_KEY=your_payment_key
PAYMENT_GATEWAY_SECRET=your_payment_secret

# 로깅 설정
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 보안 설정
CORS_ORIGIN=https://o4o-platform.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 2. 데이터베이스 설정

**PostgreSQL 설치 및 설정:**
```bash
# PostgreSQL 설치 (Ubuntu)
sudo apt update
sudo apt install postgresql postgresql-contrib

# 데이터베이스 생성
sudo -u postgres createdb o4o_production
sudo -u postgres createuser o4o_user

# 사용자 권한 설정
sudo -u postgres psql
ALTER USER o4o_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_production TO o4o_user;
\q
```

**데이터베이스 스키마 적용:**
```bash
# 마이그레이션 실행
npm run migrate:production

# 초기 데이터 삽입
npm run seed:production
```

## 📦 빌드 프로세스

### 1. 프론트엔드 빌드

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -la dist/
```

**빌드 최적화 설정 (vite.config.ts):**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@heroicons/react', 'react-hot-toast'],
          store: ['zustand']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
```

### 2. 백엔드 빌드

```bash
# TypeScript 컴파일
npm run build:server

# 컴파일 결과 확인
ls -la dist/server/
```

## 🚀 배포 방법

### 1. 수동 배포

**단계별 배포 과정:**
```bash
# 1. 소스 코드 업데이트
git pull origin main

# 2. 의존성 설치
npm ci --production

# 3. 프론트엔드 빌드
npm run build

# 4. 백엔드 빌드
npm run build:server

# 5. 데이터베이스 마이그레이션
npm run migrate:production

# 6. 애플리케이션 재시작
pm2 restart o4o-platform
```

### 2. 자동 배포 (GitHub Actions)

**배포 워크플로우 (.github/workflows/deploy.yml):**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: |
        npm run build
        npm run build:server
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.6
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/o4o-platform
          git pull origin main
          npm ci --production
          npm run build
          npm run migrate:production
          pm2 restart o4o-platform
```

### 3. Docker 배포

**Dockerfile:**
```dockerfile
# 빌드 스테이지
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run build:server

# 프로덕션 스테이지
FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

COPY package*.json ./
RUN npm ci --production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: o4o_production
      POSTGRES_USER: o4o_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - db_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_redis_password
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  db_data:
```

## ⚙️ 서버 설정

### 1. Nginx 설정

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    # GZIP 압축
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 보안 헤더
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    server {
        listen 80;
        server_name o4o-platform.com www.o4o-platform.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name o4o-platform.com www.o4o-platform.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # 정적 파일 캐싱
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API 요청
        location /api/ {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # SPA 라우팅
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # SPA fallback
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 2. PM2 설정

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'o4o-platform',
    script: './dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
}
```

**PM2 명령어:**
```bash
# 애플리케이션 시작
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status

# 로그 확인
pm2 logs o4o-platform

# 재시작
pm2 restart o4o-platform

# 자동 시작 설정
pm2 startup
pm2 save
```

## 🔒 보안 설정

### 1. SSL/TLS 인증서

**Let's Encrypt 인증서 발급:**
```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d o4o-platform.com -d www.o4o-platform.com

# 자동 갱신 설정
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # 직접 애플리케이션 접근 차단
```

### 3. 애플리케이션 보안

**보안 미들웨어 설정:**
```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS 설정
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회 요청
  message: '너무 많은 요청이 발생했습니다.',
});
app.use('/api/', limiter);
```

## 📊 모니터링 및 로깅

### 1. 로그 관리

**Winston 로거 설정:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 2. 헬스 체크

```typescript
// 헬스 체크 엔드포인트
app.get('/health', async (req, res) => {
  try {
    // 데이터베이스 연결 확인
    await db.raw('SELECT 1');
    
    // Redis 연결 확인
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

### 3. 메트릭 수집

**Prometheus 메트릭:**
```typescript
import promClient from 'prom-client';

// 기본 메트릭 수집
promClient.collectDefaultMetrics();

// 커스텀 메트릭
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

// 메트릭 엔드포인트
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

## 🔄 백업 및 복구

### 1. 데이터베이스 백업

**자동 백업 스크립트:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/o4o-platform"
DB_NAME="o4o_production"

# 디렉토리 생성
mkdir -p $BACKUP_DIR

# 데이터베이스 백업
pg_dump $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# 파일 압축
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 7일 이상 된 백업 파일 삭제
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "백업 완료: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

**크론탭 설정:**
```bash
# 매일 새벽 2시 백업
0 2 * * * /path/to/backup.sh
```

### 2. 애플리케이션 백업

```bash
#!/bin/bash
# app_backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/o4o-platform"
BACKUP_DIR="/var/backups/o4o-platform"

# 애플리케이션 파일 백업
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  $APP_DIR

echo "애플리케이션 백업 완료: $BACKUP_DIR/app_backup_$DATE.tar.gz"
```

## 🚨 장애 대응

### 1. 일반적인 문제 해결

**애플리케이션이 시작되지 않는 경우:**
```bash
# 로그 확인
pm2 logs o4o-platform

# 프로세스 상태 확인
pm2 status

# 포트 사용 확인
netstat -tulpn | grep :3000

# 강제 재시작
pm2 kill
pm2 start ecosystem.config.js --env production
```

**데이터베이스 연결 오류:**
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql -h localhost -U o4o_user -d o4o_production

# 서비스 재시작
sudo systemctl restart postgresql
```

### 2. 롤백 절차

```bash
#!/bin/bash
# rollback.sh

# 이전 버전으로 롤백
git checkout HEAD~1

# 의존성 재설치
npm ci --production

# 빌드
npm run build

# 애플리케이션 재시작
pm2 restart o4o-platform

echo "롤백 완료"
```

## 📈 성능 최적화

### 1. 캐싱 전략

**Redis 캐싱:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 캐싱 미들웨어
const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

### 2. CDN 설정

**CloudFront 설정 예시:**
```json
{
  "Origins": [{
    "DomainName": "o4o-platform.com",
    "Id": "o4o-origin",
    "CustomOriginConfig": {
      "HTTPPort": 443,
      "OriginProtocolPolicy": "https-only"
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "o4o-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "cache-policy-id"
  }
}
```

---

이 가이드를 통해 O4O 플랫폼을 안정적으로 배포하고 운영할 수 있습니다.