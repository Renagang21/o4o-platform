# O4O Platform 서버 배포 가이드

## 서버 구성
- **웹 서버 (o4o-webserver)**: 13.125.144.8
  - Admin Dashboard, Shop 등 프론트엔드 앱
  - Nginx로 정적 파일 서빙
  
- **API 서버 (o4o-apiserver)**: 43.202.242.215
  - Node.js API 서버
  - PM2로 프로세스 관리

## 배포 방식

### 옵션 1: Git Pull 방식 (권장) ✅
빌드된 dist 폴더를 Git에 포함시켜 서버에서 pull만 하면 실행

**장점:**
- 간단한 배포 프로세스
- 버전 관리 용이
- 롤백 가능

**단점:**
- Git 저장소 크기 증가
- dist 파일이 Git에 포함됨

### 옵션 2: 서버에서 빌드
서버에서 직접 빌드 수행

**장점:**
- Git 저장소 깔끔
- 소스코드만 관리

**단점:**
- 서버 리소스 사용
- 빌드 시간 소요
- 빌드 도구 설치 필요

## .env 파일 관리 전략

### ⚠️ 중요: .env 파일은 Git에 포함하지 않음

각 서버에서 .env 파일을 별도로 관리해야 합니다:

### API 서버 (.env)
```bash
# /var/www/api-server/.env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=3lz15772779
DB_NAME=o4o_platform
JWT_SECRET=o4o-platform-jwt-secret-key-2025-production
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGIN=https://neture.co.kr,https://admin.neture.co.kr
```

### 웹 서버 앱들 (.env)
```bash
# /var/www/o4o-platform/apps/admin-dashboard/.env
VITE_API_URL=https://api.neture.co.kr
VITE_APP_NAME="O4O Admin"

# /var/www/o4o-platform/apps/shop/.env
VITE_API_URL=https://api.neture.co.kr
VITE_SHOP_NAME="O4O Shop"
```

## 배포 프로세스

### 1. 자동 배포 (스크립트 사용)
```bash
# 로컬에서 실행
./deploy-to-servers.sh
```

### 2. 수동 배포

#### API 서버 (43.202.242.215)
```bash
# SSH 접속
ssh root@43.202.242.215

# 코드 업데이트
cd /var/www/api-server
git pull origin main

# 의존성 설치 (production만)
cd apps/api-server
npm ci --only=production

# PM2 재시작
pm2 restart api-server

# 상태 확인
pm2 status
pm2 logs api-server --lines 50
```

#### 웹 서버 (13.125.144.8)
```bash
# SSH 접속
ssh root@13.125.144.8

# 코드 업데이트
cd /var/www/o4o-platform
git pull origin main

# Admin Dashboard 빌드 (필요시)
cd apps/admin-dashboard
npm ci
npm run build
sudo cp -r dist/* /var/www/admin.neture.co.kr/

# Nginx 재시작
sudo systemctl reload nginx
```

## 서버 초기 설정

### API 서버 초기 설정
```bash
# Git 클론
cd /var/www
git clone https://github.com/Renagang21/o4o-platform.git api-server
cd api-server

# .env 파일 생성 (위 내용 참조)
nano .env

# PM2 설치
pnpm install -g pm2

# 첫 실행
cd apps/api-server
npm ci --only=production
pm2 start dist/main.js --name api-server
pm2 save
pm2 startup
```

### 웹 서버 초기 설정
```bash
# Git 클론
cd /var/www
git clone https://github.com/Renagang21/o4o-platform.git

# Nginx 설정
# (이미 설정되어 있음)
```

## 모니터링 명령어

```bash
# API 서버 상태
ssh root@43.202.242.215 'pm2 status'
ssh root@43.202.242.215 'pm2 monit'

# API 로그 확인
ssh root@43.202.242.215 'pm2 logs api-server'

# 웹 서버 Nginx 상태
ssh root@13.125.144.8 'systemctl status nginx'

# API Health Check
curl https://api.neture.co.kr/health
```

## 롤백 방법

```bash
# 이전 커밋으로 롤백
git reset --hard HEAD~1
git push --force

# 서버에서
git pull origin main
pm2 restart api-server  # API 서버
```

## 주의사항

1. **절대 .env 파일을 Git에 커밋하지 마세요**
2. 각 서버의 .env는 별도로 관리
3. 배포 전 로컬에서 테스트
4. 배포 후 Health Check 확인
5. 문제 발생시 즉시 롤백