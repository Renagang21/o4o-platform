# 🚀 O4O Platform 서버별 배포 가이드

## 📋 서버 구성 개요

O4O Platform은 세 가지 독립적인 환경으로 운영됩니다:

### 1. o4o-webserver (프론트엔드 서버)
- **역할**: Admin Dashboard, Storefront 등 프론트엔드 앱 서빙
- **포트**: 
  - Admin Dashboard: 5173
  - Storefront: 5174
- **특징**: API 서버 제외, 프론트엔드만 실행
- **설정 파일**: `ecosystem.config.webserver.cjs`

### 2. o4o-apiserver (API 서버)
- **역할**: REST API, 데이터베이스 연동, 비즈니스 로직
- **포트**: 3001
- **특징**: 프론트엔드 앱 제외, API만 실행
- **설정 파일**: `ecosystem.config.apiserver.cjs`

### 3. 로컬 개발 환경
- **역할**: 개발용 전체 스택 실행
- **특징**: 모든 서비스 포함 (API + 프론트엔드)
- **설정 파일**: `ecosystem.config.local.cjs`

---

## 🔧 서버별 초기 설정

### 공통 사전 요구사항
```bash
# Node.js 22.18.0 이상
node --version

# PM2 설치 (전역)
pnpm install -g pm2

# Git 설치 확인
git --version
```

### o4o-webserver 초기 설정
```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/o4o-platform.git
cd o4o-platform

# 2. 환경 변수 설정
cp .env.webserver.example .env
# .env 파일 편집하여 설정값 입력
nano .env

# 3. 의존성 설치
pnpm install

# 4. 패키지 빌드
npm run build:packages

# 5. PM2로 웹서버 시작
npm run pm2:start:webserver
```

### o4o-apiserver 초기 설정
```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/o4o-platform.git
cd o4o-platform

# 2. 환경 변수 설정
cp .env.apiserver.example apps/api-server/.env
# .env 파일 편집하여 DB 정보 등 설정
nano apps/api-server/.env

# 3. 의존성 설치
pnpm install

# 4. API 서버 빌드
cd apps/api-server
npm run build

# 5. 데이터베이스 마이그레이션
npm run migration:run

# 6. PM2로 API 서버 시작
cd ../..
npm run pm2:start:apiserver
```

### 로컬 개발 환경 설정
```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/o4o-platform.git
cd o4o-platform

# 2. 환경 변수 설정
cp .env.example .env.local
nano .env.local

# 3. 의존성 설치
pnpm install

# 4. 패키지 빌드
npm run build:packages

# 5. 개발 모드로 전체 스택 실행
npm run pm2:start:local
```

---

## 📝 환경 변수 설정 가이드

### o4o-webserver 환경 변수 (.env)
```env
# 서버 타입 식별
NODE_ENV=production
SERVER_TYPE=webserver

# 프론트엔드 포트 설정
ADMIN_PORT=5173
STOREFRONT_PORT=5174

# API 서버 연결 (외부 API 서버 주소)
VITE_API_URL=http://o4o-apiserver.yourdomain.com:3001

# 세션 시크릿
SESSION_SECRET=your-secure-session-secret-here

# 선택적 설정
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### o4o-apiserver 환경 변수 (apps/api-server/.env)
```env
# 서버 환경 설정
NODE_ENV=production
SERVER_TYPE=apiserver
PORT=3001
API_PREFIX=/api/v1

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=your_secure_password
DB_NAME=o4o_platform
DATABASE_SSL=false

# JWT 보안
JWT_SECRET=your-very-long-random-jwt-secret
JWT_REFRESH_SECRET=another-very-long-random-secret
JWT_EXPIRES_IN=7d

# SMTP 메일 설정
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Redis 캐시 (선택사항)
REDIS_URL=redis://localhost:6379

# AWS S3 (선택사항)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
AWS_BUCKET_NAME=o4o-assets
```

### 로컬 개발 환경 변수 (.env.local)
```env
NODE_ENV=development
SERVER_TYPE=local

# API 설정
PORT=3001
VITE_API_URL=http://localhost:3001

# 데이터베이스 (로컬)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=localpassword
DB_NAME=o4o_dev

# 개발용 JWT
JWT_SECRET=dev-jwt-secret
JWT_REFRESH_SECRET=dev-refresh-secret
```

---

## 🚀 배포 및 업데이트 절차

### o4o-webserver 업데이트
```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 의존성 업데이트
pnpm install

# 3. 패키지 재빌드
npm run build:packages

# 4. 프론트엔드 앱 빌드
npm run build:apps:frontend

# 5. PM2 재시작
npm run pm2:restart:webserver

# 6. 상태 확인
pm2 status
pm2 logs o4o-admin --lines 50
```

### o4o-apiserver 업데이트
```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 의존성 업데이트
pnpm install

# 3. API 서버 재빌드
cd apps/api-server
npm run build

# 4. 데이터베이스 마이그레이션 실행
npm run migration:run

# 5. PM2 재시작
cd ../..
npm run pm2:restart:apiserver

# 6. 상태 확인
pm2 status
pm2 logs o4o-api --lines 50
```

---

## ⚙️ PM2 관리 명령어

### 기본 관리 명령어
```bash
# 상태 확인
pm2 status
pm2 list

# 로그 보기
pm2 logs                    # 모든 로그
pm2 logs o4o-admin          # 특정 앱 로그
pm2 logs --lines 100       # 최근 100줄

# 모니터링
pm2 monit                   # 실시간 모니터링
```

### 서비스 제어
```bash
# 시작
npm run pm2:start:webserver    # 웹서버
npm run pm2:start:apiserver    # API 서버
npm run pm2:start:local        # 로컬 전체

# 중지
npm run pm2:stop:webserver     # 웹서버
npm run pm2:stop:apiserver     # API 서버
npm run pm2:stop:local         # 로컬 전체

# 재시작
npm run pm2:restart:webserver  # 웹서버
npm run pm2:restart:apiserver  # API 서버
npm run pm2:restart:local      # 로컬 전체

# 리로드 (무중단 재시작)
pm2 reload o4o-api            # API 서버 무중단 재시작
```

### PM2 시작 시 자동 실행 설정
```bash
# 현재 PM2 프로세스 저장
pm2 save

# 시스템 부팅 시 자동 시작 설정
pm2 startup systemd
# 출력된 명령어를 sudo로 실행

# 자동 시작 해제
pm2 unstartup systemd
```

---

## 🐛 트러블슈팅

### 공통 문제 해결

#### 1. 포트 충돌
```bash
# 포트 사용 확인
lsof -i :3001
lsof -i :5173

# 프로세스 종료
kill -9 [PID]
```

#### 2. 메모리 부족 (API 서버)
```bash
# 스왑 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 3. 데이터베이스 연결 실패
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql -h localhost -U o4o_user -d o4o_platform

# pg_hba.conf 확인
sudo nano /etc/postgresql/14/main/pg_hba.conf
# local all all md5 확인

# PostgreSQL 재시작
sudo systemctl restart postgresql
```

#### 4. 빌드 실패
```bash
# 캐시 및 빌드 파일 삭제
npm run clean:dist
rm -rf node_modules
npm cache clean --force

# 재설치 및 빌드
pnpm install
npm run build:packages
```

### 서버별 특수 이슈

#### o4o-webserver 이슈
- CORS 에러: API_URL 환경 변수 확인
- 정적 파일 404: 빌드 완료 여부 확인
- SSR 에러: Node.js 버전 확인

#### o4o-apiserver 이슈
- JWT 에러: JWT_SECRET 환경 변수 확인
- 마이그레이션 실패: DB 권한 확인
- 메모리 누수: PM2 메모리 제한 설정

---

## 📊 모니터링 및 로깅

### PM2 모니터링
```bash
# 실시간 모니터링
pm2 monit

# 메트릭 확인
pm2 show o4o-api
pm2 show o4o-admin

# CPU/메모리 사용량
pm2 list
```

### 로그 관리
```bash
# 로그 파일 위치
~/.pm2/logs/

# 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 헬스 체크
```bash
# API 서버 헬스 체크
curl http://localhost:3001/health

# 웹서버 상태 확인
curl http://localhost:5173
```

---

## 🔒 보안 권장사항

1. **환경 변수 보안**
   - 프로덕션 환경 변수는 별도 관리
   - `.env` 파일은 절대 Git에 커밋하지 않음
   - 강력한 JWT_SECRET 사용 (최소 32자)

2. **네트워크 보안**
   - 방화벽 설정으로 필요한 포트만 개방
   - HTTPS 사용 (Let's Encrypt 등)
   - Rate limiting 설정

3. **데이터베이스 보안**
   - 강력한 비밀번호 사용
   - 외부 접속 제한
   - 정기적 백업

4. **PM2 보안**
   - PM2 웹 인터페이스 사용 시 인증 설정
   - 로그 파일 권한 관리

---

## 📚 추가 리소스

- [PM2 공식 문서](https://pm2.keymetrics.io/)
- [Node.js 베스트 프랙티스](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL 튜닝 가이드](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)

---

## 🆘 지원 및 문의

문제가 발생하거나 도움이 필요한 경우:
1. GitHub Issues에 문제 보고
2. 로그 파일과 함께 상세한 에러 내용 제공
3. 환경 정보 (OS, Node.js 버전 등) 포함

---

*최종 업데이트: 2025년 8월*