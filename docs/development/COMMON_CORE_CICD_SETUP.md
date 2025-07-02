# 🚀 Common-Core CI/CD 환경 구성

## 📋 필요한 CI/CD 파이프라인

### 1️⃣ GitHub Actions 워크플로우
```yaml
# .github/workflows/deploy-auth.yml
name: Deploy Auth Service to Production

on:
  push:
    branches: [ main ]
    paths:
      - 'auth/backend/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'auth/backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: auth/backend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd auth/backend
          npm ci
      
      - name: Type check
        run: |
          cd auth/backend
          npm run type-check
      
      - name: Build
        run: |
          cd auth/backend
          npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to auth.neture.co.kr
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: 13.125.144.8
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Navigate to common-core directory
            cd /home/ubuntu/common-core
            
            # Pull latest changes
            git fetch origin
            git reset --hard origin/main
            
            # Install dependencies and build
            cd auth/backend
            npm install
            npm run build
            
            # Restart PM2 service
            pm2 restart auth-server || pm2 start dist/server.js --name auth-server
            pm2 save
            
            # Check service status
            pm2 status auth-server
```

### 2️⃣ Environment Secrets 설정
```
GitHub Repository Settings > Secrets and variables > Actions

필요한 Secrets:
- SSH_PRIVATE_KEY: 서버 접속용 SSH 키
- GOOGLE_CLIENT_ID: Google OAuth ID
- GOOGLE_CLIENT_SECRET: Google OAuth Secret
- NAVER_CLIENT_ID: Naver OAuth ID
- NAVER_CLIENT_SECRET: Naver OAuth Secret
- KAKAO_CLIENT_ID: Kakao REST API Key
- JWT_SECRET: JWT 서명 키
- SESSION_SECRET: 세션 암호화 키
- DATABASE_PASSWORD: PostgreSQL 비밀번호
```

---

## 🛠️ 서버 배포 스크립트

### deploy-auth.sh
```bash
#!/bin/bash
# Common-Core Auth 서버 배포 스크립트

set -e

echo "🚀 Starting Auth Service deployment..."

# 1. Git 업데이트
cd /home/ubuntu/common-core
git fetch origin
git reset --hard origin/main

# 2. Backend 빌드
cd auth/backend
npm install
npm run build

# 3. 환경변수 업데이트 (GitHub Secrets 활용)
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=common_core_auth
DATABASE_USER=postgres
DATABASE_PASSWORD=$DATABASE_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=24h
SESSION_SECRET=$SESSION_SECRET

GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
NAVER_CLIENT_ID=$NAVER_CLIENT_ID
NAVER_CLIENT_SECRET=$NAVER_CLIENT_SECRET
KAKAO_CLIENT_ID=$KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET=

O4O_PLATFORM_URL=https://neture.co.kr
AUTH_BASE_URL=https://auth.neture.co.kr
ALLOWED_ORIGINS=https://neture.co.kr,https://api.neture.co.kr
EOF

# 4. PM2 재시작
pm2 restart auth-server || pm2 start dist/server.js --name auth-server
pm2 save

# 5. 헬스체크
sleep 5
curl -f http://localhost:5000/health || exit 1

echo "✅ Auth Service deployment completed!"
```

---

## 🔧 Package.json Scripts 추가

### auth/backend/package.json
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "deploy": "./scripts/deploy-auth.sh"
  }
}
```

---

## 🧪 테스트 환경 구성

### Jest 설정
```javascript
// auth/backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### 기본 테스트 파일
```typescript
// auth/backend/src/__tests__/health.test.ts
import request from 'supertest';
import app from '../app';

describe('Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('ok');
  });
});
```

---

## 🔐 환경변수 보안 관리

### 1. GitHub Secrets 사용
```yaml
# CI/CD에서 환경변수 주입
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
  GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
  # ... 기타 secrets
```

### 2. 서버에서 안전한 .env 관리
```bash
# .env 파일 권한 설정
chmod 600 /home/ubuntu/common-core/auth/backend/.env
chown ubuntu:ubuntu /home/ubuntu/common-core/auth/backend/.env
```

---

## 📊 모니터링 및 로깅

### PM2 Ecosystem 설정
```javascript
// auth/backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'auth-server',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/auth-error.log',
    out_file: '/var/log/pm2/auth-out.log',
    log_file: '/var/log/pm2/auth-combined.log',
    time: true
  }]
};
```

### 로그 관리
```bash
# PM2 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔄 배포 플로우

### 개발 → 프로덕션 플로우
```
1. 로컬 개발 완료
   ↓
2. Git commit & push to main
   ↓
3. GitHub Actions 자동 트리거
   ↓
4. 테스트 실행 (TypeScript, Jest)
   ↓
5. 테스트 통과 시 자동 배포
   ↓
6. 서버에서 빌드 & PM2 재시작
   ↓
7. 헬스체크 확인
   ↓
8. 배포 완료 알림
```

---

## 📋 설정 체크리스트

### GitHub Repository 설정
- [ ] SSH 키 등록 (Secrets)
- [ ] OAuth 클라이언트 정보 등록 (Secrets)
- [ ] JWT/Session 시크릿 생성 (Secrets)
- [ ] GitHub Actions 워크플로우 파일 추가

### 서버 환경 설정
- [ ] PM2 설치 및 설정
- [ ] nginx 리버스 프록시 설정
- [ ] SSL 인증서 설정
- [ ] 로그 디렉토리 생성
- [ ] 방화벽 포트 개방

### 보안 설정
- [ ] .env 파일 권한 설정
- [ ] SSH 키 보안
- [ ] OAuth 콜백 URL 화이트리스트
- [ ] CORS 설정 확인

---

**🎯 목표**: Push 한 번으로 auth.neture.co.kr 자동 배포 완성!**